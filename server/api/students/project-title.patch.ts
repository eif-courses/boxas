import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { studentRecords } from '~~/server/database/schema'

// Define validation schema with Zod
const updateProjectTitleSchema = z.object({
  id: z.number().int().positive(),
  finalProjectTitle: z.string().trim().max(255)
})

export default defineEventHandler(async (event) => {
  // Get logger from event context or fallback to console
  const logger = event.context.logger || console

  try {
    logger.info('Processing project title update request')

    const db = useDB()
    const body = await readBody(event)

    logger.debug('Request body', { body })

    // Validate request body with Zod
    const validatedData = updateProjectTitleSchema.safeParse(body)

    if (!validatedData.success) {
      logger.error('Validation error', {
        errors: validatedData.error.format()
      })

      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid data',
        data: validatedData.error.format()
      })
    }

    const { id, finalProjectTitle } = validatedData.data

    logger.info('Updating project title', {
      studentId: id,
      title: finalProjectTitle
    })

    // Update the record in the database
    const result = await db
      .update(studentRecords)
      .set({ finalProjectTitle })
      .where(eq(studentRecords.id, id))
      .returning({ id: studentRecords.id })

    if (!result.length) {
      logger.error('Student record not found', { id })

      throw createError({
        statusCode: 404,
        statusMessage: 'Student record not found'
      })
    }

    logger.info('Project title updated successfully', {
      studentId: id
    })

    return {
      success: true,
      message: 'Final project title updated successfully',
      data: result[0]
    }
  }
  catch (error) {
    logger.error('Error updating final project title', {
      error: error.message,
      stack: error.stack,
      statusCode: error.statusCode
    })

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'An error occurred while updating the final project title'
    })
  }
})
