import { eq, desc } from 'drizzle-orm'
import { defineEventHandler, getRouterParam, createError } from 'h3'
import {
  projectAssignments,
  projectAssignmentVersions,
  studentRecords
} from '~~/server/database/schema' // Adjust path if needed

export default defineEventHandler(async (event) => {
  const logger = event.context.logger || console // Use logger if available
  logger.info('Fetching assignment summary...')

  try {
    const assignmentIdParam = getRouterParam(event, 'id')
    logger.debug(`Received assignmentId parameter: ${assignmentIdParam}`)

    if (!assignmentIdParam) {
      logger.warn('Assignment ID parameter is missing')
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Assignment ID is required'
      })
    }

    const assignmentId = parseInt(assignmentIdParam, 10)
    if (isNaN(assignmentId)) {
      logger.warn(`Invalid Assignment ID parameter (not a number): ${assignmentIdParam}`)
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Assignment ID must be a number'
      })
    }

    logger.debug(`Parsed assignmentId: ${assignmentId}`)
    const db = useDB()

    // --- Get the assignment ---
    logger.debug(`Fetching project assignment with ID: ${assignmentId}`)
    const assignment = await db.query.projectAssignments.findFirst({
      where: eq(projectAssignments.id, assignmentId)
    })

    if (!assignment) {
      logger.warn(`Assignment not found with ID: ${assignmentId}`)
      throw createError({
        statusCode: 404,
        statusMessage: 'Assignment not found'
      })
    }
    // --- At this point, we know 'assignment' exists and assignment.studentRecordId SHOULD have a value ---
    if (assignment.studentRecordId === null || assignment.studentRecordId === undefined) {
      // Defensive check in case schema allows null, although unlikely for a foreign key like this
      logger.error(`Inconsistency: Assignment ID ${assignmentId} has null studentRecordId!`)
      throw createError({ statusCode: 500, statusMessage: 'Assignment data is inconsistent (missing student link).' })
    }
    logger.debug('Assignment found:', assignment)

    // --- Get the student record information ---
    logger.debug(`Fetching student record with ID: ${assignment.studentRecordId}`)
    const studentRecord = await db.query.studentRecords.findFirst({
      // --- FIX: Ensure the value passed is treated as number ---
      // Since we checked assignment and studentRecordId above, it's safe to use.
      // No explicit cast should be needed if schema is correct, but this makes it robust.
      where: eq(studentRecords.id, Number(assignment.studentRecordId))
      // --- End Fix ---
    })

    if (!studentRecord) {
      logger.error(`Inconsistency: Student record not found for assignment ID ${assignmentId}, studentRecordId ${assignment.studentRecordId}`)
      throw createError({
        statusCode: 404,
        statusMessage: 'Student record associated with the assignment not found'
      })
    }
    logger.debug('Student record found:', studentRecord)

    // --- Get the latest version ---
    logger.debug(`Fetching latest version for assignment ID: ${assignmentId}`)
    const latestVersion = await db.query.projectAssignmentVersions.findFirst({
      where: eq(projectAssignmentVersions.assignmentId, assignmentId), // ID already parsed
      orderBy: desc(projectAssignmentVersions.createdDate)
    })

    let formData = {}
    if (latestVersion && latestVersion.versionData) {
      logger.debug('Latest version found, parsing versionData')
      try {
        formData = JSON.parse(latestVersion.versionData)
        logger.debug('Version data parsed successfully')
      }
      catch (err: any) {
        logger.error('Error parsing versionData JSON:', { error: err.message, versionId: latestVersion.id, assignmentId: assignmentId })
        // Decide: proceed without formData or throw error? Proceeding for now.
      }
    }
    else {
      logger.debug('No latest version or versionData found')
    }

    // --- Combine all data into a summary ---
    logger.debug('Combining data into summary object')
    const summary = {
      // Assignment properties
      id: assignment.id,
      status: assignment.status,
      isSigned: assignment.isSigned,
      createdDate: assignment.createdDate,
      lastUpdated: assignment.lastUpdated,

      // Student record properties
      studentRecordId: studentRecord.id,
      studentGroup: studentRecord.studentGroup,
      studentName: studentRecord.studentName,
      studentLastname: studentRecord.studentLastname,
      studentEmail: studentRecord.studentEmail,
      studentNumber: studentRecord.studentNumber,
      supervisorEmail: studentRecord.supervisorEmail,
      finalProjectTitle: studentRecord.finalProjectTitle,
      finalProjectTitleEn: studentRecord.finalProjectTitleEn,
      department: studentRecord.department,
      studyProgram: studentRecord.studyProgram,
      programCode: studentRecord.programCode,
      currentYear: studentRecord.currentYear,

      // Form data from the latest version
      ...formData
    }

    logger.info(`Assignment summary fetched successfully for ID: ${assignmentId}`)
    return summary
  }
  catch (error: any) {
    logger.error('Error fetching assignment summary:', {
      error: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    })

    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch assignment summary due to an internal error.'
    })
  }
})
