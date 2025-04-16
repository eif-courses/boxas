import { eq } from 'drizzle-orm'

import { projectAssignments, projectAssignmentVersions } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { assignmentId, versionData, comment = '' } = body

    if (!assignmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Assignment ID is required'
      })
    }

    const db = useDB()
    // Make sure the assignmentId is a number
    const assignmentIdNumber = Number(assignmentId)
    if (isNaN(assignmentIdNumber)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid assignment ID'
      })
    }

    // Get current timestamp
    const now = Math.floor(Date.now() / 1000)

    // Check if the assignment exists
    const [existingAssignment] = await db.select()
      .from(projectAssignments)
      .where(eq(projectAssignments.id, assignmentIdNumber))
      .limit(1)

    if (!existingAssignment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Assignment not found'
      })
    }

    // Update assignment's last updated timestamp
    await db.update(projectAssignments)
      .set({
        lastUpdated: now
      })
      .where(eq(projectAssignments.id, assignmentIdNumber))

    // Create a new version with the form data
    let processedVersionData = versionData

    // If versionData is an object, stringify it
    if (typeof versionData === 'object' && versionData !== null) {
      processedVersionData = JSON.stringify(versionData)
    }

    // Make sure we have a string
    if (typeof processedVersionData !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid version data format'
      })
    }

    // Get user role from context or default to student
    const userRole = event.context.auth?.role || 'student'

    // Insert the new version
    const newVersion = await db.insert(projectAssignmentVersions)
      .values({
        assignmentId: assignmentIdNumber,
        createdBy: userRole,
        comment: comment || '',
        versionData: processedVersionData,
        createdDate: now
      })
      .returning()

    return {
      success: true,
      version: newVersion[0]
    }
  }
  catch (error) {
    console.error('Error saving assignment:', error)

    // Check if it's already a handled error
    if (error.statusCode) {
      throw error
    }

    // Otherwise create a generic error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save assignment'
    })
  }
})
