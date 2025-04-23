import { eq } from 'drizzle-orm'
import { projectAssignments } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { assignmentId, status, currentRole } = body

    if (!assignmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Assignment ID is required'
      })
    }

    const db = useDB()

    if (!['draft', 'submitted', 'revision_requested', 'approved'].includes(status)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid status value'
      })
    }

    // Validate permissions based on role and current status
    const userRole = currentRole || 'student'

    // Get current assignment data
    const [currentAssignment] = await db.select()
      .from(projectAssignments)
      .where(eq(projectAssignments.id, assignmentId))
      .limit(1)

    if (!currentAssignment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Assignment not found'
      })
    }

    // Status transition rules
    const validTransitions = {
      student: {
        draft: ['submitted'],
        revision_requested: ['submitted']
      },
      supervisor: {
        submitted: ['approved', 'revision_requested']
      }
    }

    // Safe accessor function to avoid TypeScript issues with indexing
    function getAllowedTransitions(
      role: string,
      currentStatus: string
    ): string[] {
      const roleTransitions = validTransitions[role as keyof typeof validTransitions]
      return roleTransitions?.[currentStatus as keyof typeof roleTransitions] || []
    }

    const allowedTransitions = getAllowedTransitions(userRole, currentAssignment.status)

    if (!allowedTransitions.includes(status)) {
      throw createError({
        statusCode: 403,
        statusMessage: `Not allowed to change status from ${currentAssignment.status} to ${status} as ${userRole}`
      })
    }

    // Update the assignment status
    await db.update(projectAssignments)
      .set({
        status: status,
        lastUpdated: Math.floor(Date.now() / 1000) // Current timestamp in seconds
      })
      .where(eq(projectAssignments.id, assignmentId))

    return {
      success: true,
      status: status
    }
  }
  catch (error) {
    console.error('Error updating assignment status:', error)

    if (error.statusCode) {
      throw error // Re-throw custom errors
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update assignment status'
    })
  }
})
