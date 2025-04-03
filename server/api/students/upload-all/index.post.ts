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
    throw createError({ statusCode: 403, message: 'Access denied: User not authenticated' })
  }

  // Get force upload parameter (optional)
  const query = getQuery(event)
  const forceUpload = query.force === 'true'

  // Get latest year
  const latestYearRecord = await useDB()
    .select({ year: studentRecords.currentYear })
    .from(studentRecords)
    .orderBy(desc(studentRecords.currentYear))
    .limit(1)
    .then(rows => rows[0])

  const latestYear = latestYearRecord?.year || new Date().getFullYear()
  logger.info('Using academic year', { year: latestYear })

  // Read uploaded ZIP files
  const form = await readMultipartFormData(event)
  const files = form?.filter(field => field.name === 'file')

  if (!files || files.length === 0) {
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
    year: latestYear
  })

  const results = {
    matched: 0,
    unmatched: 0,
    processed: 0,
    skipped: 0,
    uploaded: 0
  }

  for (const file of files) {
    logger.info('Processing ZIP file', {
      filename: file.filename
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

      // Process each entry in the ZIP file
      for (const [path, fileData] of Object.entries(zipEntries)) {
        // Only process PDFs
        if (!path.endsWith('.pdf')) continue

        results.processed++

        // Extract folder name (contains student name in Moodle format)
        const pathParts = path.split('/')
        if (pathParts.length < 2) {
          results.unmatched++
          continue
        }

        // Handle Moodle format which typically looks like: "Name Surname_123456_assignsubmission_file"
        const folderWithStudent = pathParts[1] || ''
        // Extract name before first underscore (Moodle format)
        let extractedFullName = ''

        if (folderWithStudent.includes('_')) {
          extractedFullName = folderWithStudent.split('_')[0].trim()
        }
        else {
          // If no underscore, use the whole folder name (might be just the name)
          extractedFullName = folderWithStudent.trim()
        }

        if (!extractedFullName) {
          results.unmatched++
          continue
        }

        // Use the improved matching function with better Lithuanian character support
        const matchedStudent = findStudentByName(students, extractedFullName)

        if (matchedStudent) {
          logger.info('Student match found', {
            extractedName: extractedFullName,
            studentName: `${matchedStudent.studentName} ${matchedStudent.studentLastname}`,
            group: matchedStudent.studentGroup
          })

          const documentPath = `${matchedStudent.currentYear}/${matchedStudent.department}/${matchedStudent.studyProgram}/${matchedStudent.studentGroup}/${matchedStudent.studentName} ${matchedStudent.studentLastname}/`
          const pdfFileName = path.split('/').pop()
          const fullFilePath = documentPath + pdfFileName

          // Check if this document already exists (skip this check if forceUpload is true)
          if (!forceUpload) {
            const existingDoc = await useDB()
              .select({ id: documents.id })
              .from(documents)
              .where(eq(documents.filePath, fullFilePath))
              .limit(1)

            if (existingDoc && existingDoc.length > 0) {
              logger.info('Document already exists, skipping', {
                filePath: fullFilePath
              })
              results.matched++
              results.skipped++
              continue
            }
          }

          results.matched++

          try {
            // Generate presigned URL and upload
            const presignedUrl = await generatePresignedUrl(fullFilePath)
            await uploadToR2(presignedUrl, fileData)

            // Add record to database
            await useDB().insert(documents).values({
              documentType: 'PDF',
              filePath: fullFilePath,
              uploadedDate: Date.now(),
              studentRecordId: matchedStudent.id
            })

            results.uploaded++
            logger.info('Document uploaded successfully', {
              filePath: fullFilePath
            })
          }
          catch (uploadError) {
            logger.error('Upload failed for file', {
              filePath: fullFilePath,
              error: uploadError.message
            })
          }
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
        error: error.message
      })
      throw createError({ statusCode: 500, message: 'ZIP processing failed' })
    }
  }

  logger.info('ZIP processing completed', {
    totalProcessed: results.processed,
    totalMatched: results.matched,
    totalUploaded: results.uploaded,
    totalUnmatched: results.unmatched,
    totalSkipped: results.skipped
  })

  return {
    success: true,
    message: `ZIP processed. Matched: ${results.matched} (${results.skipped} skipped), Uploaded: ${results.uploaded}, Unmatched: ${results.unmatched}`,
    stats: results
  }
})

// Improved matching function with better Lithuanian character support - minimal logging
function findStudentByName(students, extractedFullName) {
  // Normalize extracted full name - remove extra spaces, normalize case
  extractedFullName = extractedFullName.trim().toLowerCase()

  // Normalize special characters (replace Lithuanian characters with Latin equivalents if needed)
  const normalizeChars = (text) => {
    return text
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[šŠ]/g, 's')
      .replace(/[žŽ]/g, 'z')
      .replace(/[čČ]/g, 'c')
      .replace(/[ąĄ]/g, 'a')
      .replace(/[ęĘ]/g, 'e')
      .replace(/[įĮ]/g, 'i')
      .replace(/[ųŲ]/g, 'u')
      .replace(/[ėĖ]/g, 'e')
      .replace(/\s+/g, ' ') // Normalize spaces
  }

  const normalizedExtractedName = normalizeChars(extractedFullName)

  // Try matches with both original and normalized names
  for (const student of students) {
    const dbFullName = `${student.studentName} ${student.studentLastname}`.trim().toLowerCase()
    const dbReversedName = `${student.studentLastname} ${student.studentName}`.trim().toLowerCase()

    const normalizedDbFullName = normalizeChars(dbFullName)
    const normalizedDbReversedName = normalizeChars(dbReversedName)

    // Check both original and normalized versions
    if (dbFullName === extractedFullName
      || dbReversedName === extractedFullName
      || normalizedDbFullName === normalizedExtractedName
      || normalizedDbReversedName === normalizedExtractedName) {
      return student
    }

    // Check for name with middle initial (e.g., "John A Smith" vs "John Smith")
    const nameParts = extractedFullName.split(' ')
    if (nameParts.length > 2) {
      // Remove middle parts/initials and try matching again
      const simplifiedName = [nameParts[0], nameParts[nameParts.length - 1]].join(' ')
      const normalizedSimplifiedName = normalizeChars(simplifiedName)

      if (dbFullName === simplifiedName || normalizedDbFullName === normalizedSimplifiedName) {
        return student
      }
    }

    // Check if format is first initial + last name (e.g., "D.Mackevičius")
    if (extractedFullName.includes('.')) {
      const initial = extractedFullName.charAt(0).toUpperCase()
      const lastNamePart = extractedFullName.substring(extractedFullName.indexOf('.') + 1).trim().toLowerCase()
      const normalizedLastNamePart = normalizeChars(lastNamePart)

      const studentFirstName = student.studentName.toLowerCase()
      const studentLastName = student.studentLastname.toLowerCase()
      const normalizedStudentLastName = normalizeChars(studentLastName)

      // Match initial and last name (case insensitive)
      if (studentFirstName.charAt(0).toUpperCase() === initial
        && (studentLastName === lastNamePart || normalizedStudentLastName === normalizedLastNamePart)) {
        return student
      }
    }

    // If name has spaces, try direct matching with first/last name parts
    if (extractedFullName.includes(' ')) {
      const nameParts = extractedFullName.split(' ')
      const firstName = nameParts[0].trim().toLowerCase()
      const lastName = nameParts.slice(1).join(' ').trim().toLowerCase()

      const normalizedFirstName = normalizeChars(firstName)
      const normalizedLastName = normalizeChars(lastName)

      const studentFirstName = student.studentName.toLowerCase()
      const studentLastName = student.studentLastname.toLowerCase()
      const normalizedStudentFirstName = normalizeChars(studentFirstName)
      const normalizedStudentLastName = normalizeChars(studentLastName)

      if ((studentFirstName === firstName && studentLastName === lastName)
        || (normalizedStudentFirstName === normalizedFirstName && normalizedStudentLastName === normalizedLastName)) {
        return student
      }
    }
  }

  // Try fuzzy matching as a last resort
  // This checks for high similarity even with some character differences
  const bestMatch = students.reduce((best, student) => {
    const dbFullName = `${student.studentName} ${student.studentLastname}`.trim().toLowerCase()
    const dbReversedName = `${student.studentLastname} ${student.studentName}`.trim().toLowerCase()

    // Calculate similarity scores
    const similarityFull = calculateSimilarity(extractedFullName, dbFullName)
    const similarityReversed = calculateSimilarity(extractedFullName, dbReversedName)
    const maxSimilarity = Math.max(similarityFull, similarityReversed)

    if (maxSimilarity >= 0.85 && maxSimilarity > best.similarity) {
      return { student, similarity: maxSimilarity }
    }
    return best
  }, { student: null, similarity: 0 })

  if (bestMatch.student) {
    return bestMatch.student
  }

  return null
}

// Simple Levenshtein distance-based similarity score (0-1)
function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1.0

  const len1 = str1.length
  const len2 = str2.length

  if (len1 === 0 || len2 === 0) return 0.0

  // Calculate Levenshtein distance
  const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0))

  for (let i = 0; i <= len1; i++) matrix[i][0] = i
  for (let j = 0; j <= len2; j++) matrix[0][j] = j

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  const distance = matrix[len1][len2]
  const maxLen = Math.max(len1, len2)
  return 1 - (distance / maxLen)
}

// Function to generate a presigned URL for uploading to R2 - minimal logging
async function generatePresignedUrl(filePath) {
  const blob = hubBlob()

  const { accountId, bucketName, ...credentials } = await blob.createCredentials({
    permission: 'object-read-write',
    pathnames: [filePath]
  })

  const client = new AwsClient(credentials)
  const endpoint = new URL(`https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${filePath}`)

  const { url } = await client.sign(endpoint, {
    method: 'PUT',
    aws: { signQuery: true }
  })

  return url
}

// Function to upload the PDF data to R2 using the presigned URL - minimal logging
async function uploadToR2(presignedUrl, fileData) {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/pdf'
    },
    body: fileData
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText} (${response.status})`)
  }

  return true
}
