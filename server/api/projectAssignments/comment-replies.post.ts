import { eq } from 'drizzle-orm'
import { assignmentComments, projectAssignments } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { assignmentId, parentId, text, role } = body

    // Validate required fields
    if (!assignmentId || !parentId || !text) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Assignment ID, parent comment ID, and reply text are required'
      })
    }

    const db = useDB()

    // Verify the parent comment exists
    const parentCommentResult = await db.select()
      .from(assignmentComments)
      .where(eq(assignmentComments.id, parentId))
      .limit(1)

    if (!parentCommentResult || parentCommentResult.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Parent comment not found'
      })
    }

    const parent = parentCommentResult[0]

    // Get user info
    const userRole = role || event.context.auth?.role || 'student'
    const authorName = event.context.auth?.name || 'Anonymous User'

    // Log payload for debugging
    console.log('Creating reply comment with:', {
      assignmentId,
      versionId: parent.versionId,
      parentId,
      fieldName: parent.fieldName,
      text,
      role: userRole,
      authorName
    })

    // Insert the reply
    const newReply = await db.insert(assignmentComments)
      .values({
        assignmentId,
        versionId: parent.versionId,
        parentId,
        fieldName: parent.fieldName,
        text,
        role: userRole,
        authorName,
        createdDate: Math.floor(Date.now() / 1000)
      })
      .returning()

    // Update the assignment's lastUpdated timestamp
    await db.update(projectAssignments)
      .set({ lastUpdated: Math.floor(Date.now() / 1000) })
      .where(eq(projectAssignments.id, assignmentId))

    return {
      success: true,
      reply: newReply[0]
    }
  }
  catch (error: any) {
    console.error('Error posting reply:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to post reply'
    })
  }
})
