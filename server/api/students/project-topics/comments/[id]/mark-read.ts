// server/api/students/project-topics/comments/[id]/mark-read.post.ts
import { eq } from 'drizzle-orm'
import { topicRegistrationComments } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing comment ID'
    })
  }

  try {
    const db = useDB()

    // Check if the comment exists
    const comment = await db.query.topicRegistrationComments.findFirst({
      where: eq(topicRegistrationComments.id, id)
    })

    if (!comment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Comment not found'
      })
    }

    // Mark as read
    await db.update(topicRegistrationComments)
      .set({ unread: false })
      .where(eq(topicRegistrationComments.id, id))

    return {
      success: true,
      message: 'Comment marked as read'
    }
  }
  catch (error) {
    console.error('Error marking comment as read:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to mark comment as read'
    })
  }
})
