import { eq } from 'drizzle-orm'
import { projectAssignmentVersions } from '~~/server/database/schema'

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
    // Get all versions for this assignment, ordered by most recent first
    const versions = await db.select()
      .from(projectAssignmentVersions)
      .where(eq(projectAssignmentVersions.assignmentId, assignmentId))
      .orderBy(projectAssignmentVersions.createdDate, 'desc')

    return versions
  }
  catch (error) {
    console.error('Error fetching versions:', error)

    if (error.statusCode) {
      throw error // Re-throw custom errors
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch versions'
    })
  }
})
