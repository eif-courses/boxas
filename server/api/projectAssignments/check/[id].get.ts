import { eq } from 'drizzle-orm'

import { projectAssignments, studentRecords } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const studentRecordId = getRouterParam(event, 'id')

    if (!studentRecordId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Student record ID is required'
      })
    }

    const db = useDB()

    // Verify the student exists
    const [student] = await db.select()
      .from(studentRecords)
      .where(eq(studentRecords.id, parseInt(studentRecordId)))
      .limit(1)

    if (!student) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Student record not found'
      })
    }

    // Check if the student already has a project assignment
    const [assignment] = await db.select()
      .from(projectAssignments)
      .where(eq(projectAssignments.studentRecordId, parseInt(studentRecordId)))
      .limit(1)

    if (assignment) {
      return {
        exists: true,
        id: assignment.id,
        status: assignment.status
      }
    }

    return {
      exists: false
    }
  }
  catch (error) {
    console.error('Error checking project assignment:', error)

    if (error.statusCode) {
      throw error // Re-throw custom errors
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to check project assignment'
    })
  }
})
