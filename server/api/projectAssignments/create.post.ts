import { eq } from 'drizzle-orm'

import { projectAssignments, projectAssignmentVersions, studentRecords } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { studentRecordId, studentGroup } = body

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
      .where(eq(studentRecords.id, studentRecordId))
      .limit(1)

    if (!student) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Student record not found'
      })
    }

    // Check if the student already has a project assignment
    const [existingAssignment] = await db.select()
      .from(projectAssignments)
      .where(eq(projectAssignments.studentRecordId, studentRecordId))
      .limit(1)

    if (existingAssignment) {
      return {
        id: existingAssignment.id,
        message: 'Project assignment already exists'
      }
    }

    // Create a new project assignment
    const timestamp = Math.floor(Date.now() / 1000) // Current timestamp in seconds

    const newAssignment = await db.insert(projectAssignments)
      .values({
        studentRecordId,
        status: 'draft',
        isSigned: 0,
        createdDate: timestamp,
        lastUpdated: timestamp
      })
      .returning()

    if (!newAssignment || newAssignment.length === 0) {
      throw new Error('Failed to create assignment')
    }

    // Create an initial empty version
    const emptyFormData = {
      studentGroup: studentGroup || '',
      finalProjectTitle: '',
      finalProjectTitleEn: '',
      objective: '',
      objectiveEn: '',
      tasks: '',
      tasksEn: '',
      tools: '',
      toolsEn: ''
    }

    await db.insert(projectAssignmentVersions)
      .values({
        assignmentId: newAssignment[0].id,
        createdBy: 'student',
        comment: 'Initial version',
        versionData: JSON.stringify(emptyFormData),
        createdDate: timestamp
      })

    return {
      success: true,
      id: newAssignment[0].id,
      message: 'New project assignment created'
    }
  }
  catch (error) {
    console.error('Error creating project assignment:', error)

    if (error.statusCode) {
      throw error // Re-throw custom errors
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create project assignment'
    })
  }
})
