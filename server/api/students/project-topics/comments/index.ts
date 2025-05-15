// server/api/students/project-topics/comments/index.post.ts
import { topicRegistrationComments } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const {
    topicRegistrationId,
    fieldName,
    commentText,
    authorRole,
    authorName,
    parentCommentId
  } = body

  if (!topicRegistrationId || !commentText || !authorRole || !authorName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required parameters'
    })
  }

  try {
    const db = useDB()
    const now = Math.floor(Date.now() / 1000)

    // Define the insert values with proper types
    const insertValues = {
      topicRegistrationId: Number(topicRegistrationId),
      fieldName: fieldName || null,
      commentText: String(commentText),
      authorRole: String(authorRole),
      authorName: String(authorName),
      parentCommentId: parentCommentId ? Number(parentCommentId) : null,
      createdAt: now,
      unread: 1 // Use 1 for true in SQLite
    }

    const result = await db.insert(topicRegistrationComments)
      .values(insertValues)
      .returning()

    return {
      success: true,
      message: 'Comment added successfully',
      comment: result[0]
    }
  }
  catch (error) {
    console.error('Error adding comment:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to add comment'
    })
  }
})
