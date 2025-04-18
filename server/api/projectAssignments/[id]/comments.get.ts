import { eq, isNull, isNotNull, and, desc, asc } from 'drizzle-orm' // <<< Import helpers
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { assignmentComments } from '~~/server/database/schema' // Adjust path if needed

export default defineEventHandler(async (event) => {
  const logger = event.context.logger || console
  logger.info('Fetching assignment comments...')

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

    // --- Fetch top-level comments (comments without a parent) ---
    logger.debug(`Fetching top-level comments for assignment ID: ${assignmentId}`)
    const topLevelComments = await db.select()
      .from(assignmentComments)
      .where(
        // --- FIX 3: Combine conditions with and() ---
        and(
          eq(assignmentComments.assignmentId, assignmentId), // Use parsed ID
          isNull(assignmentComments.parentId) // Correct usage of isNull
        )
        // --- End Fix 3 ---
      )
    // --- FIX 5: Use desc() helper ---
      .orderBy(desc(assignmentComments.createdDate))
    // --- End Fix 5 ---
    logger.debug(`Found ${topLevelComments.length} top-level comments`)

    // --- Fetch all replies (comments *with* a parent) ---
    logger.debug(`Fetching replies for assignment ID: ${assignmentId}`)
    const replies = await db.select()
      .from(assignmentComments)
      .where(
        // --- FIX 3: Combine conditions with and() ---
        and(
          eq(assignmentComments.assignmentId, assignmentId), // Use parsed ID
          // --- FIX 4: Use isNotNull ---
          isNotNull(assignmentComments.parentId) // Check if parentId is NOT NULL
          // --- End Fix 4 ---
        )
        // --- End Fix 3 ---
      )
    // --- FIX 5: Use asc() helper ---
      .orderBy(asc(assignmentComments.createdDate)) // Fetch replies in chronological order
    // --- End Fix 5 ---
    logger.debug(`Found ${replies.length} replies`)

    // --- Organize replies under their parent comments ---
    logger.debug('Organizing replies into nested structure')
    // Create a map for faster lookup of replies by parentId
    const repliesMap = new Map<number, typeof replies>() // Type the map value
    replies.forEach((reply) => {
      if (reply.parentId === null) return // Should not happen based on query, but safe check
      const parentReplies = repliesMap.get(reply.parentId) || []
      parentReplies.push(reply)
      repliesMap.set(reply.parentId, parentReplies)
    })

    // Map top-level comments and attach replies from the map
    const commentsWithReplies = topLevelComments.map((comment) => {
      return {
        ...comment,
        replies: repliesMap.get(comment.id) || [] // Get replies from map or empty array
      }
    })
    logger.info('Successfully fetched and organized comments with replies')

    return commentsWithReplies // Return the nested structure
  }
  catch (error: any) {
    logger.error('Error fetching assignment comments:', {
      assignmentIdParam: getRouterParam(event, 'id'),
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
      statusMessage: 'Failed to fetch comments due to an internal error.'
    })
  }
})
