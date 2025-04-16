import { defineEventHandler, getRouterParam, createError } from 'h3'
import { eq, desc } from 'drizzle-orm'
import { projectAssignments, projectAssignmentVersions, assignmentComments } from '~~/server/database/schema'

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

    // Get all versions
    const assignmentVersions = await db.query.projectAssignmentVersions.findMany({
      where: assignment ? eq(projectAssignmentVersions.assignmentId, assignment.id) : undefined,
      orderBy: [desc(projectAssignmentVersions.createdDate)]
    })

    // Get all comments
    const commentsList = await db.query.assignmentComments.findMany({
      where: assignment ? eq(assignmentComments.assignmentId, assignment.id) : undefined,
      orderBy: [desc(assignmentComments.createdDate)]
    })

    // Format the response
    const formattedVersions = assignmentVersions.map(version => ({
      id: version.id,
      assignmentId: version.assignmentId,
      createdBy: version.createdBy,
      comment: version.comment,
      createdDate: version.createdDate,
      data: JSON.parse(version.versionData)
    }))

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
      status: assignment?.status || 'draft',
      versions: formattedVersions,
      comments: formattedComments
    }
  }
  catch (error) {
    logger.error('Error fetching assignment versions:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch assignment versions'
    })
  }
})
