import { eq } from 'drizzle-orm'
import { projectAssignments, projectAssignmentVersions, studentRecords } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const assignmentId = getRouterParam(event, 'id')

    if (!assignmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Assignment ID is required'
      })
    }
    const db = useDB()
    // Get the assignment
    const [assignment] = await db.select()
      .from(projectAssignments)
      .where(eq(projectAssignments.id, assignmentId))
      .limit(1)

    if (!assignment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Assignment not found'
      })
    }

    // Get the student record information
    const [studentRecord] = await db.select()
      .from(studentRecords)
      .where(eq(studentRecords.id, assignment.studentRecordId))
      .limit(1)

    if (!studentRecord) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Student record not found'
      })
    }

    // Get the latest version to get the form data
    const [latestVersion] = await db.select()
      .from(projectAssignmentVersions)
      .where(eq(projectAssignmentVersions.assignmentId, assignmentId))
      .orderBy(projectAssignmentVersions.createdDate, 'desc')
      .limit(1)

    let formData = {}
    if (latestVersion) {
      try {
        // Parse the version data (stored as JSON string)
        formData = JSON.parse(latestVersion.versionData)
      }
      catch (err) {
        console.error('Error parsing version data:', err)
      }
    }

    // Combine all data into a summary
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

      // Form data from the latest version
      ...formData
    }

    return summary
  }
  catch (error) {
    console.error('Error fetching assignment summary:', error)

    if (error.statusCode) {
      throw error // Re-throw custom errors
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch assignment summary'
    })
  }
})
