// server/api/assignments/comments.post.ts

import { defineEventHandler, readBody, createError } from 'h3'
import { eq } from 'drizzle-orm'
import { projectAssignments, assignmentComments, studentRecords } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const logger = event.context.logger || console

  // Get current user from session
  const { user } = await requireUserSession(event)

  if (!user) {
    logger.warn('Unauthorized access attempt', {
      endpoint: 'assignments/comments'
    })
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  logger.info('User authenticated', {
    email: user.mail || user.email
  })

  // Verify user is allowed to add comments
  const isStudent = true
  const isSupervisor = false // Using isReviewer as the equivalent of supervisor per your auth store

  if (!isStudent && !isSupervisor) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: Not a student or supervisor'
    })
  }

  // Read request body
  const body = await readBody(event)
  const { studentRecordId, versionId, fieldName, text, role } = body

  if (!studentRecordId || !versionId || !fieldName || !text) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields'
    })
  }

  // Validate role matches current user
  if ((isStudent && role !== 'student') || (isSupervisor && role !== 'supervisor')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Role mismatch'
    })
  }

  try {
    // If student, verify this is their assignment (check by email)
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

    // Get the main assignment record
    const assignment = await db.query.projectAssignments.findFirst({
      where: eq(projectAssignments.studentRecordId, studentRecordId)
    })

    if (!assignment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Assignment not found'
      })
    }

    // Add the comment
    const result = await db.insert(assignmentComments)
        .values({
          assignmentId: assignment.id,
          versionId,
          fieldName,
          text,
          role: isStudent ? 'student' : 'supervisor',
          authorName: user.displayName || `${user.mail || user.email}`,
          createdDate: Math.floor(Date.now() / 1000)
        })
        .returning({ id: assignmentComments.id })

    return {
      success: true,
      message: 'Comment added successfully',
      commentId: result[0].id
    }
  }
  catch (error) {
    logger.error('Error adding comment:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to add comment'
    })
  }
})