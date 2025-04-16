// server/api/assignments/save.post.ts

import { defineEventHandler, readBody, createError } from 'h3'
import { eq } from 'drizzle-orm'
import { projectAssignments, projectAssignmentVersions, studentRecords } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const logger = event.context.logger || console

  // Get current user from session
  const { user } = await requireUserSession(event)

  if (!user) {
    logger.warn('Unauthorized access attempt', {
      endpoint: 'assignments/save'
    })
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  logger.info('User authenticated', {
    email: user.mail || user.email
  })

  // Verify user is allowed to save this assignment (student or supervisor)
  const isStudent = true
  const isSupervisor = false // Using isReviewer as supervisor per your auth store

  if (!isStudent && !isSupervisor) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: Not a student or supervisor'
    })
  }

  // Read request body
  const body = await readBody(event)
  const { studentRecordId, data, comment, status = 'draft' } = body

  if (!studentRecordId || !data || !comment) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields'
    })
  }

  try {
    // If student, verify this is their assignment
    if (isStudent) {
      const studentEmail = user.mail || user.email
      const student = await db.query.studentRecords.findFirst({
        where: eq(studentRecords.id, studentRecordId)
      })

      if (!student || student.studentEmail !== studentEmail) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Forbidden: Not your assignment'
        })
      }
    }

    // If supervisor, verify they are assigned to this student
    if (isSupervisor) {
      const supervisorEmail = user.mail || user.email
      const student = await db.query.studentRecords.findFirst({
        where: eq(studentRecords.id, studentRecordId)
      })

      if (!student || student.supervisorEmail !== supervisorEmail) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Forbidden: Not assigned to this student'
        })
      }
    }

    // If initial student data is missing, get it from the database
    if (!data.GROUP || !data.NAME) {
      const student = await db.query.studentRecords.findFirst({
        where: eq(studentRecords.id, studentRecordId)
      })

      if (student) {
        data.GROUP = data.GROUP || student.studentGroup
        data.NAME = data.NAME || `${student.studentName} ${student.studentLastname}`
      }
    }

    // Check if assignment exists
    let assignmentId
    let existingAssignment = await db.query.projectAssignments.findFirst({
      where: eq(projectAssignments.studentRecordId, studentRecordId)
    })

    // Start a transaction
    await db.transaction(async (tx) => {
      // Create or update assignment
      if (existingAssignment) {
        // Update assignment status
        await tx.update(projectAssignments)
            .set({ status, lastUpdated: Math.floor(Date.now() / 1000) })
            .where(eq(projectAssignments.id, existingAssignment.id))

        assignmentId = existingAssignment.id
      } else {
        // Create new assignment
        const result = await tx.insert(projectAssignments)
            .values({
              studentRecordId,
              status,
              createdDate: Math.floor(Date.now() / 1000),
              lastUpdated: Math.floor(Date.now() / 1000)
            })
            .returning({ id: projectAssignments.id })

        assignmentId = result[0].id
      }

      // Create new version
      await tx.insert(projectAssignmentVersions)
          .values({
            assignmentId,
            createdBy: isStudent ? 'student' : 'supervisor',
            comment,
            versionData: JSON.stringify(data),
            createdDate: Math.floor(Date.now() / 1000)
          })
    })

    // If this is a student's first submission, also update the student record
    if (isStudent && data.TITLE && (!existingAssignment || existingAssignment.status === 'draft')) {
      // Update the student record with the thesis title
      await db.update(studentRecords)
          .set({
            finalProjectTitle: data.TITLE,
            finalProjectTitleEn: data.TITLE_EN || ''
          })
          .where(eq(studentRecords.id, studentRecordId))
    }

    return {
      success: true,
      message: 'Assignment saved successfully',
      assignmentId
    }
  } catch (error) {
    logger.error('Error saving assignment:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save assignment'
    })
  }
})