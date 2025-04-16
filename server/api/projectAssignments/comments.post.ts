import { eq } from 'drizzle-orm'
import { assignmentComments, projectAssignments, projectAssignmentVersions } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { assignmentId, text, fieldName, role } = body

    if (!assignmentId || !text) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Assignment ID and comment text are required'
      })
    }
    const db = useDB()
    // Verify the assignment exists
    const [assignment] = await db.select()
      .from(projectAssignments)
      .where(eq(projectAssignments.id, assignmentId))
      .limit(1)

    if (!assignment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Assignment not found'
      })
    }

    // Get the latest version to associate the comment with
    const [latestVersion] = await db.select()
      .from(projectAssignmentVersions)
      .where(eq(projectAssignmentVersions.assignmentId, assignmentId))
      .orderBy(projectAssignmentVersions.createdDate, 'desc')
      .limit(1)

    // Get user info from auth context
    const userRole = role || event.context.auth?.role || 'student'
    const authorName = event.context.auth?.name || 'Anonymous User'

    // Insert the comment
    const newComment = await db.insert(assignmentComments)
      .values({
        assignmentId,
        versionId: latestVersion?.id,
        parentId: null, // This is a top-level comment
        fieldName: fieldName || null,
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
      comment: newComment[0]
    }
  }
  catch (error) {
    console.error('Error posting comment:', error)

    if (error.statusCode) {
      throw error // Re-throw custom errors
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to post comment'
    })
  }
})
