// server/api/assignments/[id]/summary.get.ts

import { defineEventHandler, getRouterParam, createError } from 'h3'
import { eq, desc } from 'drizzle-orm'
import { projectAssignments, projectAssignmentVersions } from '~~/server/database/schema'

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
        assignment: null
      }
    }

    // Get the latest version
    const latestVersion = await db.query.projectAssignmentVersions.findFirst({
      where: eq(projectAssignmentVersions.assignmentId, assignment.id),
      orderBy: [desc(projectAssignmentVersions.createdDate)]
    })

    if (!latestVersion) {
      return {
        success: true,
        assignment: {
          id: assignment.id,
          status: assignment.status,
          isSigned: assignment.isSigned,
          lastUpdated: assignment.lastUpdated,
          createdDate: assignment.createdDate
        }
      }
    }

    // Parse version data
    const versionData = JSON.parse(latestVersion.versionData)

    // Format the response
    return {
      success: true,
      assignment: {
        id: assignment.id,
        status: assignment.status,
        isSigned: assignment.isSigned,
        lastUpdated: assignment.lastUpdated,
        createdDate: assignment.createdDate,
        title: versionData.TITLE,
        titleEn: versionData.TITLE_EN,
        objective: versionData.OBJECTIVE,
        supervisor: versionData.SUPERVISOR,
        latestVersionId: latestVersion.id,
        latestVersionDate: latestVersion.createdDate
      }
    }
  }
  catch (error) {
    logger.error('Error fetching assignment summary:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch assignment summary'
    })
  }
})
