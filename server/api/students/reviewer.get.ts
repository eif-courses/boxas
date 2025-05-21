import { eq, and, inArray, desc } from 'drizzle-orm'
import { studentRecords, documents, videos, reviewerReports } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  logger.info('Processing reviewer student data request')

  try {
    // Step 1: Authentication with detailed logging
    logger.debug('Attempting user authentication')

    let user
    try {
      const sessionResult = await requireUserSession(event)
      user = sessionResult.user
    }
    catch (authError) {
      logger.error('Authentication failed', {
        error: authError.message,
        stack: authError.stack
      })
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication failed',
        data: { message: 'Please log in to access this resource' }
      })
    }

    if (!user) {
      logger.warn('No user in session')
      throw createError({
        statusCode: 401,
        statusMessage: 'No user session found'
      })
    }

    // Step 2: Extract user email with fallbacks
    const userEmail = user.mail || user.email || user.userPrincipalName || user.preferred_username || ''

    if (!userEmail) {
      logger.error('No email found for user', { user })
      throw createError({
        statusCode: 400,
        statusMessage: 'User email not found in session'
      })
    }

    logger.info('User authenticated successfully', {
      email: userEmail,
      userKeys: Object.keys(user)
    })

    // Step 3: Parse query parameters
    const query = getQuery(event)
    const requestedYear = query.year ? parseInt(query.year as string) : null

    logger.debug('Request parameters parsed', {
      requestedYear,
      rawYear: query.year,
      allQueryParams: query
    })

    // Step 4: Database connection with error handling
    let db
    try {
      db = useDB()
      logger.debug('Database connection established')
    }
    catch (dbError) {
      logger.error('Database connection failed', {
        error: dbError.message,
        stack: dbError.stack
      })
      throw createError({
        statusCode: 503,
        statusMessage: 'Database connection failed',
        data: { message: 'Unable to connect to database' }
      })
    }

    // Step 5: Build query conditions
    const conditions = []
    conditions.push(eq(studentRecords.reviewerEmail, userEmail))

    logger.debug('Query conditions built', {
      reviewerEmail: userEmail,
      conditionCount: conditions.length
    })

    // Step 6: Determine year to use
    let latestYear = requestedYear
    if (!latestYear) {
      logger.debug('No year specified, finding latest year for reviewer')

      try {
        const latestYearResult = await db
          .select({ maxYear: studentRecords.currentYear })
          .from(studentRecords)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(studentRecords.currentYear))
          .limit(1)
          .execute()

        latestYear = latestYearResult.length > 0 ? latestYearResult[0].maxYear : null

        logger.info('Latest year query completed', {
          latestYear,
          resultCount: latestYearResult.length,
          result: latestYearResult
        })
      }
      catch (yearError) {
        logger.error('Error finding latest year', {
          error: yearError.message,
          stack: yearError.stack
        })
        // Don't throw here, just log and continue with null year
        latestYear = null
      }
    }

    // Step 7: Add year filter if we have a year
    if (latestYear) {
      conditions.push(eq(studentRecords.currentYear, latestYear))
      logger.debug('Year filter added', { year: latestYear })
    }
    else {
      logger.warn('No year available for filtering - this might return no results')
    }

    // Step 8: Fetch student records
    logger.debug('Fetching student records with conditions')

    let studentRecordsResult
    try {
      const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions)
      logger.debug('Where clause built', { conditionCount: conditions.length })

      studentRecordsResult = await db.select()
        .from(studentRecords)
        .where(whereClause)
        .execute()

      logger.info('Student records query completed', {
        count: studentRecordsResult?.length || 0,
        year: latestYear,
        reviewerEmail: userEmail
      })
    }
    catch (queryError) {
      logger.error('Error fetching student records', {
        error: queryError.message,
        stack: queryError.stack,
        year: latestYear,
        reviewerEmail: userEmail
      })
      throw createError({
        statusCode: 500,
        statusMessage: 'Database query failed',
        data: { message: 'Error fetching student records' }
      })
    }

    // Step 9: Handle empty results
    if (!studentRecordsResult?.length) {
      logger.info('No students found for reviewer', {
        year: latestYear,
        reviewerEmail: userEmail
      })

      return {
        students: [],
        total: 0,
        year: latestYear,
        debug: {
          reviewerEmail: userEmail,
          searchedYear: latestYear,
          message: 'No students assigned to this reviewer'
        }
      }
    }

    // Step 10: Fetch related data
    const studentRecordIds = studentRecordsResult.map(sr => sr.id)

    logger.info('Fetching related data', {
      studentCount: studentRecordIds.length,
      studentIds: studentRecordIds
    })

    try {
      const [documentsResult, videosResult, reviewerReportsResult] = await Promise.all([
        // Documents
        db.select().from(documents)
          .where(inArray(documents.studentRecordId, studentRecordIds))
          .execute()
          .catch(async (err) => {
            logger.warn('Bulk documents fetch failed, trying individual queries', {
              error: err.message
            })
            const results = await Promise.all(
              studentRecordIds.map(id =>
                db.select().from(documents)
                  .where(eq(documents.studentRecordId, id))
                  .execute()
              )
            )
            return results.flat()
          }),

        // Videos
        db.select().from(videos)
          .where(inArray(videos.studentRecordId, studentRecordIds))
          .execute()
          .catch(async (err) => {
            logger.warn('Bulk videos fetch failed, trying individual queries', {
              error: err.message
            })
            const results = await Promise.all(
              studentRecordIds.map(id =>
                db.select().from(videos)
                  .where(eq(videos.studentRecordId, id))
                  .execute()
              )
            )
            return results.flat()
          }),

        // Reviewer Reports
        db.select().from(reviewerReports)
          .where(inArray(reviewerReports.studentRecordId, studentRecordIds))
          .execute()
          .catch(async (err) => {
            logger.warn('Bulk reviewer reports fetch failed, trying individual queries', {
              error: err.message
            })
            const results = await Promise.all(
              studentRecordIds.map(id =>
                db.select().from(reviewerReports)
                  .where(eq(reviewerReports.studentRecordId, id))
                  .execute()
              )
            )
            return results.flat()
          })
      ])

      logger.info('Related data fetched successfully', {
        documentsCount: documentsResult.length,
        videosCount: videosResult.length,
        reportsCount: reviewerReportsResult.length
      })

      // Step 11: Organize data by student
      const documentsMap = new Map()
      const videosMap = new Map()
      const reviewerReportsMap = new Map()

      // Create lookup maps
      documentsResult.forEach((doc) => {
        if (!documentsMap.has(doc.studentRecordId)) {
          documentsMap.set(doc.studentRecordId, [])
        }
        documentsMap.get(doc.studentRecordId).push(doc)
      })

      videosResult.forEach((video) => {
        if (!videosMap.has(video.studentRecordId)) {
          videosMap.set(video.studentRecordId, [])
        }
        videosMap.get(video.studentRecordId).push(video)
      })

      reviewerReportsResult.forEach((report) => {
        if (!reviewerReportsMap.has(report.studentRecordId)) {
          reviewerReportsMap.set(report.studentRecordId, [])
        }
        reviewerReportsMap.get(report.studentRecordId).push(report)
      })

      // Step 12: Build final response
      const studentsData = studentRecordsResult.map(student => ({
        student,
        documents: documentsMap.get(student.id) || [],
        videos: videosMap.get(student.id) || [],
        reviewerReports: reviewerReportsMap.get(student.id) || []
      }))

      logger.info('Response prepared successfully', {
        studentCount: studentsData.length,
        year: latestYear,
        reviewerEmail: userEmail
      })

      return {
        students: studentsData,
        total: studentRecordsResult.length,
        year: latestYear
      }
    }
    catch (fetchError) {
      logger.error('Error fetching related data', {
        error: fetchError.message,
        stack: fetchError.stack,
        studentRecordIds
      })
      throw createError({
        statusCode: 500,
        statusMessage: 'Error fetching related data',
        data: { message: fetchError.message }
      })
    }
  }
  catch (error) {
    // Final error handler
    logger.error('Unhandled error in reviewer API', {
      error: error.message,
      stack: error.stack,
      statusCode: error.statusCode
    })

    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error
    }

    // Otherwise create a generic error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: {
        message: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }
    })
  }
})
