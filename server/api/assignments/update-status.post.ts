// server/api/assignments/update-status.post.ts

import { defineEventHandler, readBody, createError } from 'h3'
import { eq } from 'drizzle-orm'
import { projectAssignments, studentRecords } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const logger = event.context.logger || console

  // Get current user from session
  const { user } = await requireUserSession(event)

  if (!user) {
    logger.warn('Unauthorized access attempt', {
      endpoint: 'assignments/update-status'
    })
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  logger.info('User authenticated', {
    email: user.mail || user.email
  })

  // Read request body
  const body = await readBody(event)
  const { studentRecordId, versionId, status } = body

  if (!studentRecordId || !status) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields'
    })
  }

  // Validate status
  const validStatuses = ['draft', 'submitted', 'revision_requested', 'approved']
  if (!validStatuses.includes(status)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid status'
    })
  }

  // Verify user is allowed to update this status
  const isStudent = true
  const isSupervisor = false // Using isReviewer as supervisor per your auth store

  // Check permissions based on status transition
  if (isStudent) {
    // Students can only submit their own assignments
    if (status !== 'submitted') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Students can only submit assignments'
      })
    }

    // Verify this is the student's assignment by email
    const studentEmail = user.mail || user.email
    const student = await db.query.studentRecords.findFirst({
      where: eq(studentRecords.id, studentRecordId)
    })

    if (!student || student.studentEmail !== studentEmail) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Not your assignment'
      })
    }
  }
  else if (isSupervisor) {
    // Supervisors can request revisions or approve
    if (status !== 'revision_requested' && status !== 'approved') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Supervisors can only request revisions or approve assignments'
      })
    }

    // Verify supervisor is assigned to this student
    const supervisorEmail = user.mail || user.email
    const student = await db.query.studentRecords.findFirst({
      where: eq(studentRecords.id, studentRecordId)
    })

    if (!student || student.supervisorEmail !== supervisorEmail) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Not assigned to this student'
      })
    }
  }
  else {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: Not a student or supervisor'
    })
  }

  try {
    // Update assignment status
    const assignment = await db.query.projectAssignments.findFirst({
      where: eq(projectAssignments.studentRecordId, studentRecordId)
    })

    if (!assignment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Assignment not found'
      })
    }

    // Update status
    await db.update(projectAssignments)
      .set({
        status,
        lastUpdated: Math.floor(Date.now() / 1000),
        isSigned: status === 'approved' ? 1 : 0
      })
      .where(eq(projectAssignments.id, assignment.id))

    return {
      success: true,
      message: 'Assignment status updated successfully'
    }
  }
  catch (error) {
    logger.error('Error updating assignment status:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update assignment status'
    })
  }
})
