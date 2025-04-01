// server/api/commission-data.get.ts

import { defineEventHandler, getQuery, createError } from 'h3'
import { eq, and, inArray, sql, gt } from 'drizzle-orm' // Added 'gt' for expiration check
import {
  studentRecords,
  documents,
  videos,
  reviewerReports,
  supervisorReports,
  commissionMembers
} from '~~/server/database/schema'
import type { DocumentRecord, VideoRecord, ReviewerReport, SupervisorReport, StudentRecord } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const logger = event.context.logger || console
  logger.info('Processing commission data request')

  const query = getQuery(event)
  const accessCode = query.code as string | undefined // Changed from token to code
  const requestedYear = parseInt(query.year as string) || null

  logger.debug('Request parameters', { requestedYear, hasAccessCode: !!accessCode })

  const db = useDB()
  const conditions = []
  let userDepartment: string | null = null

  // --- 1. Access Code Validation ---
  if (!accessCode || typeof accessCode !== 'string' || accessCode.trim() === '') {
    logger.warn('Access denied: Missing or invalid access code parameter.')
    throw createError({
      statusCode: 401, // Unauthorized
      statusMessage: 'Unauthorized: Access code is required.'
    })
  }

  logger.debug(`Validating access code: ${accessCode.substring(0, 5)}...`)
  try {
    const currentTimestamp = Math.floor(Date.now() / 1000) // Current time in seconds

    const commissionMember = await db.query.commissionMembers.findFirst({
      where: and(
        eq(commissionMembers.accessCode, accessCode), // Changed from token to accessCode
        eq(commissionMembers.isActive, 1),
        gt(commissionMembers.expiresAt, currentTimestamp) // Added expiration check
      ),
      columns: { id: true, department: true, expiresAt: true }
    })

    if (!commissionMember) {
      // Check if it's expired or invalid
      const expiredMember = await db.query.commissionMembers.findFirst({
        where: and(
          eq(commissionMembers.accessCode, accessCode),
          eq(commissionMembers.isActive, 1)
        ),
        columns: { id: true, expiresAt: true }
      })

      if (expiredMember && expiredMember.expiresAt < currentTimestamp) {
        logger.warn('Access denied: Provided access code has expired.')
        throw createError({
          statusCode: 403, // Forbidden
          statusMessage: 'Forbidden: Access code has expired.'
        })
      }
      else {
        logger.warn('Access denied: Provided access code is invalid or inactive.')
        throw createError({
          statusCode: 403, // Forbidden
          statusMessage: 'Forbidden: Invalid or inactive access code.'
        })
      }
    }

    logger.info('Access code valid and active.', {
      memberId: commissionMember.id,
      department: commissionMember.department,
      expiresAt: new Date(commissionMember.expiresAt * 1000).toISOString()
    })

    // Update last accessed timestamp
    await db.update(commissionMembers)
      .set({ lastAccessedAt: currentTimestamp })
      .where(eq(commissionMembers.id, commissionMember.id))

    userDepartment = commissionMember.department
    conditions.push(eq(studentRecords.studyProgram, userDepartment))
  }
  catch (accessError: any) {
    logger.error('Database error checking access code', { error: accessError.message })
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error checking access code.'
    })
  }

  // --- 2. Fetch Data Based on Determined Conditions ---
  try {
    let targetYear = requestedYear
    // Determine latest year for the department if no year is requested
    if (!targetYear) {
      logger.debug('No year specified, finding latest year for department:', userDepartment)
      const latestYearResult = await db
        .select({ maxYear: sql<number>`max(${studentRecords.currentYear})` })
        .from(studentRecords)
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
      .orderBy(studentRecords.studentGroup, studentRecords.studentLastname)
      .execute()

    // --- 3. Handle No Students Found ---
    if (!studentRecordsResult?.length) {
      logger.info('No students found matching final criteria')
      return {
        students: [],
        total: 0,
        year: targetYear,
        isCommissionMember: true,
        userDepartment,
        accessExpires: new Date((await db.query.commissionMembers.findFirst({
          where: eq(commissionMembers.accessCode, accessCode),
          columns: { expiresAt: true }
        }))?.expiresAt * 1000).toLocaleDateString()
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
    const studentsData = studentRecordsResult.map((student: StudentRecord) => {
      return {
        student,
        documents: documentsMap.get(student.id) || [],
        videos: videosMap.get(student.id) || [],
        reviewerReports: reviewerReportsMap.get(student.id) || [],
        supervisorReports: supervisorReportsMap.get(student.id) || []
      }
    })

    // Get the expiration date for this access code
    const accessExpires = await db.query.commissionMembers.findFirst({
      where: eq(commissionMembers.accessCode, accessCode),
      columns: { expiresAt: true }
    })

    logger.info('Response prepared successfully.')
    // --- 6. Return Final Response ---
    return {
      students: studentsData,
      total: studentRecordsResult.length,
      year: targetYear,
      isCommissionMember: true,
      userDepartment,
      accessExpires: new Date(accessExpires?.expiresAt * 1000).toLocaleDateString()
    }
  }
  catch (error: any) {
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
