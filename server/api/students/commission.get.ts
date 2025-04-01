// server/api/commission-data.get.ts

import { defineEventHandler, getQuery, createError } from 'h3'
import { eq, and, inArray, sql } from 'drizzle-orm' // Removed 'desc' as using sql.max
import {
  studentRecords,
  documents,
  videos,
  reviewerReports,
  supervisorReports,
  commissionMembers // Only need commissionMembers schema now
} from '~~/server/database/schema' // Adjust path
// Assuming schema files export the correct table types (e.g., Documents, Videos etc.)
import type { DocumentRecord, VideoRecord, ReviewerReport, SupervisorReport, StudentRecord } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const logger = event.context.logger || console
  logger.info('Processing commission data request (TOKEN ONLY)')

  const query = getQuery(event)
  const token = query.token as string | undefined
  const requestedYear = parseInt(query.year as string) || null
  // Department filter from query is generally NOT needed/advised for token access,
  // as the token should dictate the department. Keep for potential admin override?
  // const departmentFilterFromQuery = query.department as string | null;

  logger.debug('Request parameters', { requestedYear, hasToken: !!token })

  const db = useDB()
  const conditions = []
  let userDepartment: string | null = null // Department derived ONLY from token

  // --- 1. Token Validation ---
  if (!token || typeof token !== 'string' || token.trim() === '') {
    logger.warn('Access denied: Missing or invalid token query parameter.')
    throw createError({
      statusCode: 401, // Unauthorized
      statusMessage: 'Unauthorized: Access token is required.'
    })
  }

  logger.debug(`Validating token: ${token.substring(0, 5)}...`)
  try {
    const commissionMember = await db.query.commissionMembers.findFirst({
      where: and(
        eq(commissionMembers.token, token),
        eq(commissionMembers.isActive, 1)
      ),
      columns: { id: true, department: true }
    })

    if (!commissionMember) {
      logger.warn('Access denied: Provided token is invalid or inactive.')
      throw createError({
        statusCode: 403, // Forbidden
        statusMessage: 'Forbidden: Invalid or inactive access token.'
      })
    }

    logger.info('Token valid and active.', { tokenId: commissionMember.id, department: commissionMember.department })
    userDepartment = commissionMember.department // Department comes ONLY from token record
    conditions.push(eq(studentRecords.department, userDepartment))
  }
  catch (tokenError: any) {
    logger.error('Database error checking token', { error: tokenError.message })
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error checking access token.'
    })
  }

  // --- Optional: Apply explicit department filter from query ---
  // Use with caution. Should this token be allowed to see other departments?
  // if (departmentFilterFromQuery && userDepartment !== departmentFilterFromQuery) {
  //   logger.info('Overriding department filter based on query parameter (Admin/Special Token?).', { original: userDepartment, new: departmentFilterFromQuery });
  //   conditions = conditions.filter(cond => JSON.stringify(cond).indexOf('"field":"department"') === -1);
  //   conditions.push(eq(studentRecords.department, departmentFilterFromQuery));
  //   userDepartment = departmentFilterFromQuery; // Update effective department
  // }
  // --- ---

  // --- 2. Fetch Data Based on Determined Conditions ---
  try {
    let targetYear = requestedYear
    // Determine latest year for the department if no year is requested
    if (!targetYear) {
      logger.debug('No year specified, finding latest year for department:', userDepartment)
      const latestYearResult = await db
        .select({ maxYear: sql<number>`max(${studentRecords.currentYear})` })
        .from(studentRecords)
      // Conditions array will contain the department filter at this point
        .where(and(...conditions))
        .limit(1)
        .execute()

      // Default to current year if no records found for that department
      targetYear = latestYearResult?.[0]?.maxYear ?? new Date().getFullYear()
      logger.info('Latest year determined', { targetYear })
    }

    // Add final year condition
    conditions.push(eq(studentRecords.currentYear, targetYear))

    logger.debug('Fetching student records with final conditions', { conditions, targetYear })
    const studentRecordsResult = await db.select()
      .from(studentRecords)
      .where(and(...conditions))
      .orderBy(studentRecords.studentGroup, studentRecords.studentLastname) // Example Order
      .execute()

    // --- 3. Handle No Students Found ---
    if (!studentRecordsResult?.length) {
      logger.info('No students found matching final criteria')
      return {
        students: [],
        total: 0,
        year: targetYear,
        // isDepartmentHead: false, // No longer relevant without session
        isCommissionMember: true, // Access was granted via token
        userDepartment // The department the token is valid for
      }
    }

    // --- 4. Fetch Related Data ---
    const studentRecordIds = studentRecordsResult.map(sr => sr.id)
    logger.debug(`Fetching related data for ${studentRecordIds.length} students...`)

    const [documentsResult, videosResult, reviewerReportsResult, supervisorReportsResult]
        = await Promise.all([
          db.select().from(documents).where(inArray(documents.studentRecordId, studentRecordIds)).execute().catch(() => []),
          db.select().from(videos).where(inArray(videos.studentRecordId, studentRecordIds)).execute().catch(() => []),
          db.select().from(reviewerReports).where(inArray(reviewerReports.studentRecordId, studentRecordIds)).execute().catch(() => []),
          db.select().from(supervisorReports).where(inArray(supervisorReports.studentRecordId, studentRecordIds)).execute().catch(() => [])
        ])
    logger.info(`Related data fetched: Docs(${documentsResult.length}), Videos(${videosResult.length}), RevRep(${reviewerReportsResult.length}), SupRep(${supervisorReportsResult.length})`)

    // --- 5. Organize Data (Map related data to students) ---
    logger.debug('Organizing related data by student')

    // Create lookup maps for efficient grouping
    const documentsMap = new Map<number, DocumentRecord[]>()
    documentsResult.forEach((doc) => {
      const list = documentsMap.get(doc.studentRecordId) || []
      list.push(doc)
      documentsMap.set(doc.studentRecordId, list)
    })

    const videosMap = new Map<number, VideoRecord[]>()
    videosResult.forEach((video) => {
      const list = videosMap.get(video.studentRecordId) || []
      list.push(video)
      videosMap.set(video.studentRecordId, list)
    })

    const reviewerReportsMap = new Map<number, ReviewerReport[]>()
    reviewerReportsResult.forEach((report) => {
      const list = reviewerReportsMap.get(report.studentRecordId) || []
      list.push(report)
      reviewerReportsMap.set(report.studentRecordId, list)
    })

    const supervisorReportsMap = new Map<number, SupervisorReport[]>()
    supervisorReportsResult.forEach((report) => {
      const list = supervisorReportsMap.get(report.studentRecordId) || []
      list.push(report)
      supervisorReportsMap.set(report.studentRecordId, list)
    })

    // Map student records and attach related data using the maps
    const studentsData = studentRecordsResult.map((student: StudentRecord) => { // Explicit type
      return {
        student, // The main student record object
        documents: documentsMap.get(student.id) || [], // Get docs from map or empty array
        videos: videosMap.get(student.id) || [], // Get videos from map or empty array
        reviewerReports: reviewerReportsMap.get(student.id) || [], // Get reviewer reports or empty
        supervisorReports: supervisorReportsMap.get(student.id) || [] // Get supervisor reports or empty
      }
    })
    // --- End Data Organization ---

    logger.info('Response prepared successfully.')
    // --- 6. Return Final Response ---
    return {
      students: studentsData,
      total: studentRecordsResult.length,
      year: targetYear,
      // isDepartmentHead: false, // Not relevant without session
      isCommissionMember: true, // Access was via token
      userDepartment // The department filter that was applied
    }
  }
  catch (error: any) {
    // Catch errors from year determination, student fetch, or related data fetch
    logger.error('Error fetching or processing commission data:', {
      error: error.message,
      stack: error.stack
    })
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error while fetching commission data.'
    })
  }
})
