import { eq, isNull } from 'drizzle-orm'

import { assignmentComments } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const assignmentId = getRouterParam(event, 'id')

    if (!assignmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Assignment ID is required'
      })
    }

    const db = useDB()

    // Fetch top-level comments (comments without a parent)
    const topLevelComments = await db.select()
      .from(assignmentComments)
      .where(
        eq(assignmentComments.assignmentId, assignmentId),
        isNull(assignmentComments.parentId)
      )
      .orderBy(assignmentComments.createdDate, 'desc')

    // Fetch all replies
    const replies = await db.select()
      .from(assignmentComments)
      .where(
        eq(assignmentComments.assignmentId, assignmentId),
        isNull(assignmentComments.parentId, false) // Not null parent ID
      )
      .orderBy(assignmentComments.createdDate, 'asc')

    // Organize replies under their parent comments
    const commentsWithReplies = topLevelComments.map((comment) => {
      const commentReplies = replies.filter(reply => reply.parentId === comment.id)
      return {
        ...comment,
        replies: commentReplies
      }
    })

    return commentsWithReplies
  }
  catch (error) {
    console.error('Error fetching comments:', error)

    if (error.statusCode) {
      throw error // Re-throw custom errors
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch comments'
    })
  }
})
