// /server/api/blob/presign/[pathname].js
import { z } from 'zod'
import { AwsClient } from 'aws4fetch'
import { eq, desc } from 'drizzle-orm'
import { studentRecords } from '~~/server/database/schema'

export default eventHandler(async (event) => {
  const logger = event.context.logger || console
  logger.info('Processing presigned URL request')

  const { user } = await requireUserSession(event)
  if (!user) {
    logger.warn('Unauthorized access attempt')
    throw createError({ statusCode: 403, message: 'Access denied: User not authenticated' })
  }

  try {
    // Validate and get pathname
    const { pathname } = await getValidatedRouterParams(event, z.object({
      pathname: z.string().min(1)
    }).parse)
    const decodedPathname = decodeURIComponent(pathname)

    // Get student record (same as your existing code)
    const email = user.mail || user.email || user.userPrincipalName || user.preferred_username || ''

    const latestRecord = await useDB()
      .select()
      .from(studentRecords)
      .where(eq(studentRecords.studentEmail, email))
      .orderBy(desc(studentRecords.currentYear))
      .limit(1)
      .execute()

    if (latestRecord.length === 0) {
      throw new Error('No records found for the specified user email.')
    }

    const record = latestRecord[0]
    const {
      studyProgram, department, studentGroup,
      currentYear, studentName, studentLastname,
      id: studentRecordId
    } = record

    // Construct path and get credentials
    const fullPath = `${currentYear}/${department}/${studyProgram}/${studentGroup}/${studentName} ${studentLastname}/${decodedPathname}`

    const blob = hubBlob()
    const { accountId, bucketName, ...credentials } = await blob.createCredentials({
      permission: 'object-read-write',
      pathnames: [fullPath]
    })

    // Generate presigned URL
    const client = new AwsClient(credentials)
    const endpoint = new URL(fullPath, `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`)

    logger.debug('Constructed R2 endpoint', { endpoint: endpoint.href })

    const { url: uploadUrl } = await client.sign(endpoint, {
      method: 'PUT',
      aws: { signQuery: true }
    })

    logger.info('Presigned URL generated', {
      urlLength: uploadUrl.length,
      url: uploadUrl.substring(0, 100) + '...' // Log part of URL for debugging
    })

    // Return the URL and path info to the client
    return {
      uploadUrl,
      filePath: fullPath,
      studentRecordId
    }
  }
  catch (error) {
    logger.error('Error generating presigned URL', {
      error: error.message,
      stack: error.stack
    })
    return { error: error.message || 'Failed to generate upload URL.' }
  }
})
