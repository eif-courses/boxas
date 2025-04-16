import { defineEventHandler, getRouterParam, createError } from 'h3'
import { eq } from 'drizzle-orm'
import { projectAssignments, assignmentComments } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const logger = event.context.logger || console

  // Get student record ID from route
  const studentRecordId = parseInt(getRouterParam(event, 'id') || '', 10)
  if (isNaN(studentRecordId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid student record ID'
    })
  }

  try {
    // Get the main assignment record
    const assignment = await db.query.projectAssignments.findFirst({
      where: eq(projectAssignments.studentRecordId, studentRecordId)
    })

    if (!assignment) {
      return {
        success: true,
        comments: []
      }
    }

    // Get all comments for this assignment
    const commentsList = await db.query.assignmentComments.findMany({
      where: eq(assignmentComments.assignmentId, assignment.id),
      orderBy: [
        { column: assignmentComments.fieldName, order: 'asc' },
        { column: assignmentComments.createdDate, order: 'asc' }
      ]
    })

    // Format the comments
    const formattedComments = commentsList.map(comment => ({
      id: comment.id,
      assignmentId: comment.assignmentId,
      versionId: comment.versionId,
      parentId: comment.parentId,
      fieldName: comment.fieldName,
      text: comment.text,
      role: comment.role,
      authorName: comment.authorName,
      createdDate: comment.createdDate
    }))

    return {
      success: true,
      comments: formattedComments
    }
  }
  catch (error) {
    logger.error('Error fetching assignment comments:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch assignment comments'
    })
  }
})
