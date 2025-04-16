import { eq } from 'drizzle-orm'
import { assignmentComments, projectAssignments } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { assignmentId, parentId, text, role } = body

    if (!assignmentId || !parentId || !text) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Assignment ID, parent comment ID, and reply text are required'
      })
    }
    const db = useDB()
    // Verify the parent comment exists
    const [parentComment] = await db.select()
      .from(assignmentComments)
      .where(eq(assignmentComments.id, parentId))
      .limit(1)

    if (!parentComment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Parent comment not found'
      })
    }

    // Get user info from auth context
    const userRole = role || event.context.auth?.role || 'student'
    const authorName = event.context.auth?.name || 'Anonymous User'

    // Insert the reply comment
    const newReply = await db.insert(assignmentComments)
      .values({
        assignmentId,
        versionId: parentComment.versionId,
        parentId, // Link to parent comment
        fieldName: parentComment.fieldName, // Inherit field name from parent
        text,
        role: userRole,
        authorName,
        createdDate: Math.floor(Date.now() / 1000)
      })
      .returning()

    // Update the assignment's last updated timestamp
    await db.update(projectAssignments)
      .set({ lastUpdated: Math.floor(Date.now() / 1000) })
      .where(eq(projectAssignments.id, assignmentId))

    return {
      success: true,
      reply: newReply[0]
    }
  }
  catch (error) {
    console.error('Error posting reply:', error)

    if (error.statusCode) {
      throw error // Re-throw custom errors
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to post reply'
    })
  }
})
