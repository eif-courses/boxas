import { eq, desc } from 'drizzle-orm' // <<< Import 'desc'
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { projectAssignmentVersions } from '~~/server/database/schema' // Adjust path if needed

export default defineEventHandler(async (event) => {
  const logger = event.context.logger || console
  logger.info('Fetching assignment versions...')

  try {
    const assignmentIdParam = getRouterParam(event, 'id')
    logger.debug(`Received assignmentId parameter: ${assignmentIdParam}`)

    if (!assignmentIdParam) {
      logger.warn('Assignment ID parameter is missing')
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Assignment ID is required'
      })
    }

    // --- FIX 1: Convert param to number ---
    const assignmentId = parseInt(assignmentIdParam, 10)
    if (isNaN(assignmentId)) {
      logger.warn(`Invalid Assignment ID parameter (not a number): ${assignmentIdParam}`)
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Assignment ID must be a number'
      })
    }
    // --- End Fix 1 ---

    logger.debug(`Parsed assignmentId: ${assignmentId}`)
    const db = useDB()

    // Get all versions for this assignment, ordered by most recent first
    logger.debug(`Fetching all versions for assignment ID: ${assignmentId}`)
    const versions = await db.select()
      .from(projectAssignmentVersions)
    // --- Use the parsed numeric assignmentId ---
      .where(eq(projectAssignmentVersions.assignmentId, assignmentId))
    // --- FIX 2: Use desc() helper ---
      .orderBy(desc(projectAssignmentVersions.createdDate)) // Correct orderBy syntax
    // --- End Fix 2 ---

    logger.info(`Found ${versions.length} versions for assignment ID: ${assignmentId}`)
    return versions // Return the array of versions
  }
  catch (error: any) {
    logger.error('Error fetching assignment versions:', {
      assignmentIdParam: getRouterParam(event, 'id'), // Log original param for context
      error: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    })

    // Re-throw H3 errors
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      throw error
    }

    // Throw generic 500
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch assignment versions due to an internal error.'
    })
  }
})
