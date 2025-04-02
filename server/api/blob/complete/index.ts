import { documents } from '~~/server/database/schema'

export default eventHandler(async (event) => {
  const logger = event.context.logger || console
  logger.info('Processing upload completion')

  const { user } = await requireUserSession(event)
  if (!user) {
    throw createError({ statusCode: 403, message: 'Access denied: User not authenticated' })
  }

  try {
    // Get data from request body
    const { fileName, filePath, fileType, studentRecordId } = await readBody(event)

    if (!fileName || !filePath || !studentRecordId) {
      throw new Error('Missing required data')
    }

    // Insert document metadata into the database
    const documentType = fileName.split('.').pop()?.toUpperCase() || 'FILE'
    const timestamp = Math.floor(new Date().getTime() / 1000)

    await useDB().insert(documents).values({
      documentType: documentType,
      filePath: filePath,
      uploadedDate: timestamp,
      studentRecordId: studentRecordId
    })

    logger.info('Document metadata saved successfully', {
      filePath,
      documentType
    })

    return { success: true, message: 'File metadata saved successfully.' }
  }
  catch (error) {
    logger.error('Error completing upload', {
      error: error.message,
      stack: error.stack
    })
    return { error: error.message || 'Failed to save file metadata.' }
  }
})
