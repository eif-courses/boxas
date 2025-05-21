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
    const { fileName, filePath, fileType, studentRecordId, documentType: requestedType } = await readBody(event)

    if (!fileName || !filePath || !studentRecordId) {
      throw new Error('Missing required data')
    }

    // Determine document type - either use the one from request or derive from file extension
    let documentType = requestedType || fileName.split('.').pop()?.toUpperCase() || 'FILE'

    // If document is a PDF, check if it's a recommendation
    if (documentType === 'PDF' && filePath.toLowerCase().includes('recommendation')) {
      documentType = 'RECOMMENDATION'
    }

    // Special handling for recommendation files
    if (requestedType === 'RECOMMENDATION') {
      documentType = 'RECOMMENDATION'
    }

    const timestamp = Math.floor(new Date().getTime() / 1000)

    // Check if document of this type already exists for this student
    const existingDocs = await useDB()
      .select()
      .from(documents)
      .where(sql`student_record_id = ${studentRecordId} AND document_type = ${documentType}`)
      .execute()

    // If the document already exists, update it
    if (existingDocs.length > 0) {
      await useDB()
        .update(documents)
        .set({
          filePath: filePath,
          uploadedDate: timestamp
        })
        .where(sql`id = ${existingDocs[0].id}`)
        .execute()

      logger.info('Document metadata updated successfully', {
        id: existingDocs[0].id,
        filePath,
        documentType
      })
    }
    else {
      // Otherwise insert a new document
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
    }

    return {
      success: true,
      message: 'File metadata saved successfully.',
      documentType
    }
  }
  catch (error) {
    logger.error('Error completing upload', {
      error: error.message,
      stack: error.stack
    })
    return { error: error.message || 'Failed to save file metadata.' }
  }
})
