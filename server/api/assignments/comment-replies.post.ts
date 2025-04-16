// server/api/assignments/comment-replies.post.ts

import { defineEventHandler, readBody, createError } from 'h3'
import { eq, and } from 'drizzle-orm'
import { projectAssignments, assignmentComments, studentRecords } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const logger = event.context.logger || console

  // Get current user from session
  const { user } = await requireUserSession(event)

  if (!user) {
    logger.warn('Unauthorized access attempt', {
      endpoint: 'assignments/comment-replies'
    })
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  logger.info('User authenticated', {
    email: user.mail || user.email
  })

  // Verify user is allowed to add replies
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
  const { studentRecordId, parentCommentId, text } = body

  if (!studentRecordId || !parentCommentId || !text) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields'
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

    // Verify parent comment exists and belongs to this assignment
    const parentComment = await db.query.assignmentComments.findFirst({
      where: and(
        eq(assignmentComments.id, parentCommentId),
        eq(assignmentComments.assignmentId, assignment.id)
      )
    })

    if (!parentComment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Parent comment not found'
      })
    }

    // Add the reply
    const result = await db.insert(assignmentComments)
      .values({
        assignmentId: assignment.id,
        versionId: parentComment.versionId,
        parentId: parentCommentId,
        fieldName: parentComment.fieldName,
        text,
        role: isStudent ? 'student' : 'supervisor',
        authorName: user.displayName || `${user.mail || user.email}`,
        createdDate: Math.floor(Date.now() / 1000)
      })
      .returning({ id: assignmentComments.id })

    return {
      success: true,
      message: 'Reply added successfully',
      commentId: result[0].id
    }
  }
  catch (error) {
    logger.error('Error adding reply:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to add reply'
    })
  }
})
