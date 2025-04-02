import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { unzip } from 'fflate'
import { eq, desc } from 'drizzle-orm'
import { AwsClient } from 'aws4fetch'
import { documents, studentRecords } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  logger.info('Processing ZIP upload request (all groups)')

  const { user } = await requireUserSession(event)
  if (!user) {
    logger.error('Unauthorized access attempt', {
      endpoint: 'zip-upload-all'
    })
    throw createError({ statusCode: 403, message: 'Access denied: User not authenticated' })
  }

  logger.info('User authenticated', { email: user.mail })

  // Get latest year
  logger.debug('Finding latest academic year')
  const latestYearRecord = await useDB()
    .select({ year: studentRecords.currentYear })
    .from(studentRecords)
    .orderBy(desc(studentRecords.currentYear))
    .limit(1)
    .then(rows => rows[0])

  const latestYear = latestYearRecord?.year || new Date().getFullYear()
  logger.info('Using academic year', { year: latestYear })

  // Read uploaded ZIP files
  logger.debug('Reading uploaded files')
  const form = await readMultipartFormData(event)
  const files = form?.filter(field => field.name === 'file')

  if (!files || files.length === 0) {
    logger.warn('No files uploaded')
    throw createError({ statusCode: 400, message: 'No ZIP files uploaded' })
  }

  // Load all students for the latest year (without group filter)
  const students = await useDB()
    .select({
      id: studentRecords.id,
      currentYear: studentRecords.currentYear,
      studyProgram: studentRecords.studyProgram,
      department: studentRecords.department,
      studentGroup: studentRecords.studentGroup,
      studentName: studentRecords.studentName,
      studentLastname: studentRecords.studentLastname
    })
    .from(studentRecords)
    .where(eq(studentRecords.currentYear, latestYear))

  logger.info('Student records loaded', {
    count: students.length,
    year: latestYear,
    groups: [...new Set(students.map(s => s.studentGroup))].join(', ')
  })

  const results = {
    matched: 0,
    unmatched: 0,
    processed: 0
  }

  // The rest of your processing logic remains the same
  for (const file of files) {
    logger.info('Processing ZIP file', {
      filename: file.filename,
      size: file.data.length
    })

    try {
      // Use fflate to unzip the file (browser-compatible)
      const zipEntries = await new Promise((resolve, reject) => {
        unzip(new Uint8Array(file.data), (err, data) => {
          if (err) {
            reject(new Error(`Failed to unzip file: ${err.message}`))
          }
          else {
            resolve(data)
          }
        })
      })

      logger.debug('ZIP file contents', {
        entriesCount: Object.keys(zipEntries).length
      })

      // Rest of your ZIP processing code remains the same
      for (const [path, fileData] of Object.entries(zipEntries)) {
        // Only process PDFs
        if (!path.endsWith('.pdf')) continue

        results.processed++
        logger.debug('Processing PDF entry', {
          path: path,
          size: fileData.length
        })

        // Extract folder name (contains student name in Moodle format)
        const pathParts = path.split('/')
        if (pathParts.length < 2) {
          logger.warn('Unexpected path structure', { path })
          results.unmatched++
          continue
        }

        const folderWithStudent = pathParts[1] || ''
        // Extract name before first underscore (Moodle format)
        const extractedFullName = folderWithStudent.split('_')[0].trim()

        if (!extractedFullName) {
          logger.warn('Invalid extracted student name', { path })
          results.unmatched++
          continue
        }

        // Use the same matching function
        const matchedStudent = findStudentByName(students, extractedFullName, logger)

        if (matchedStudent) {
          logger.info('Student match found', {
            extractedName: extractedFullName,
            studentName: `${matchedStudent.studentName} ${matchedStudent.studentLastname}`,
            group: matchedStudent.studentGroup
          })

          results.matched++

          const documentPath = `${matchedStudent.currentYear}/${matchedStudent.department}/${matchedStudent.studyProgram}/${matchedStudent.studentGroup}/${matchedStudent.studentName} ${matchedStudent.studentLastname}/`
          const pdfFileName = path.split('/').pop()

          const presignedUrl = await generatePresignedUrl(documentPath + pdfFileName, logger)
          await uploadToR2(presignedUrl, fileData, logger)

          await useDB().insert(documents).values({
            documentType: 'PDF',
            filePath: documentPath + pdfFileName,
            uploadedDate: Date.now(),
            studentRecordId: matchedStudent.id
          })

          logger.info('Document processed successfully', {
            studentId: matchedStudent.id,
            filePath: documentPath + pdfFileName
          })
        }
        else {
          logger.warn('No matching student found', { extractedName: extractedFullName })
          results.unmatched++
        }
      }
    }
    catch (error) {
      logger.error('Error processing ZIP file', {
        filename: file.filename,
        error: error.message,
        stack: error.stack
      })
      throw createError({ statusCode: 500, message: 'ZIP processing failed' })
    }
  }

  logger.info('ZIP processing completed', {
    totalProcessed: results.processed,
    totalMatched: results.matched,
    totalUnmatched: results.unmatched,
    successRate: results.processed > 0 ? Math.round((results.matched / results.processed) * 100) : 0
  })

  return {
    success: true,
    message: 'ZIP processed successfully',
    stats: results
  }
})

// Improved matching function with normalization
function findStudentByName(students, extractedFullName, logger) {
  // Normalize extracted full name - remove extra spaces, normalize case
  extractedFullName = extractedFullName.trim().toLowerCase()

  logger.debug('Starting name matching', {
    extractedName: extractedFullName,
    studentsCount: students.length
  })

  // Try direct matches first with normalized names
  for (const student of students) {
    const dbFullName = `${student.studentName} ${student.studentLastname}`.trim().toLowerCase()
    const dbReversedName = `${student.studentLastname} ${student.studentName}`.trim().toLowerCase()

    // Debug compare
    logger.debug('Comparing names', {
      extractedName: extractedFullName,
      dbName: dbFullName,
      dbReversedName
    })

    // Exact match (case insensitive)
    if (dbFullName === extractedFullName || dbReversedName === extractedFullName) {
      logger.debug('Exact match found', { matchType: 'exact' })
      return student
    }

    // Check for name with middle initial (e.g., "John A Smith" vs "John Smith")
    const nameParts = extractedFullName.split(' ')
    if (nameParts.length > 2) {
      // Remove middle parts/initials and try matching again
      const simplifiedName = [nameParts[0], nameParts[nameParts.length - 1]].join(' ')
      logger.debug('Trying simplified name match', {
        simplified: simplifiedName
      })
      if (dbFullName === simplifiedName) {
        logger.debug('Simplified name match found', { matchType: 'simplified' })
        return student
      }
    }
  }

  // Check if format is first initial + last name (e.g., "D.Mackevičius")
  if (extractedFullName.includes('.')) {
    const initial = extractedFullName.charAt(0).toUpperCase()
    const lastNamePart = extractedFullName.substring(extractedFullName.indexOf('.') + 1).trim().toLowerCase()

    logger.debug('Trying initial + lastname match', {
      initial,
      lastNamePart
    })

    for (const student of students) {
      const studentFirstName = student.studentName.toLowerCase()
      const studentLastName = student.studentLastname.toLowerCase()

      // Match initial and last name (case insensitive)
      if (studentFirstName.charAt(0).toUpperCase() === initial
        && studentLastName.toLowerCase() === lastNamePart) {
        logger.debug('Initial + lastname match found', { matchType: 'initial' })
        return student
      }
    }
  }

  // If name has spaces, try direct matching with first/last name parts
  if (extractedFullName.includes(' ')) {
    const nameParts = extractedFullName.split(' ')
    const firstName = nameParts[0].trim().toLowerCase()
    const lastName = nameParts.slice(1).join(' ').trim().toLowerCase()

    logger.debug('Trying firstname + lastname match', {
      firstName,
      lastName
    })

    for (const student of students) {
      const studentFirstName = student.studentName.toLowerCase()
      const studentLastName = student.studentLastname.toLowerCase()

      if (studentFirstName === firstName && studentLastName === lastName) {
        logger.debug('Firstname + lastname match found', { matchType: 'parts' })
        return student
      }
    }
  }

  logger.debug('No match found using any method')
  return null
}

// Function to generate a presigned URL for uploading to R2
async function generatePresignedUrl(filePath, logger) {
  logger.debug('Generating presigned URL', { path: filePath })

  const blob = hubBlob()

  const { accountId, bucketName, ...credentials } = await blob.createCredentials({
    permission: 'object-read-write',
    pathnames: [filePath]
  })

  logger.debug('R2 credentials obtained', {
    bucketName,
    path: filePath
  })

  const client = new AwsClient(credentials)
  const endpoint = new URL(`https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${filePath}`)

  const { url } = await client.sign(endpoint, {
    method: 'PUT',
    aws: { signQuery: true }
  })

  logger.debug('Presigned URL generated')

  return url
}

// Function to upload the PDF data to R2 using the presigned URL
// Update the upload function for Uint8Array
async function uploadToR2(presignedUrl, fileData, logger) {
  try {
    logger.debug('Uploading file to R2', {
      fileSize: fileData.length
    })

    const response = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf'
      },
      body: fileData
    })

    if (!response.ok) {
      logger.error('R2 upload failed', {
        status: response.status,
        statusText: response.statusText
      })
      throw new Error(`Upload failed: ${response.statusText} (${response.status})`)
    }

    logger.debug('File uploaded successfully')
    return true
  }
  catch (error) {
    logger.error('Error uploading to R2', {
      error: error.message,
      stack: error.stack
    })
    throw error
  }
}
