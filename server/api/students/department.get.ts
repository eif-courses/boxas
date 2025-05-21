import { eq, and, inArray, desc } from 'drizzle-orm'
import { studentRecords, documents, videos, reviewerReports, supervisorReports, departmentHeads, projectTopicRegistrations, topicRegistrationComments } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  logger.info('Processing department head data request', {
    method: event.node.req.method,
    url: event.node.req.url,
    userAgent: event.node.req.headers['user-agent'],
    timestamp: new Date().toISOString()
  })

  try {
    // IMPROVED: Better session handling with proper error catching
    let user
    try {
      const session = await requireUserSession(event)
      user = session?.user

      if (!user) {
        logger.warn('No user found in session')
        throw new Error('No user in session')
      }
    }
    catch (authError) {
      logger.error('Authentication failed:', {
        error: authError.message,
        stack: authError.stack
      })
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Please log in again',
        data: { requireAuth: true }
      })
    }

    // Extract user email with better fallback handling
    const userEmail = user.mail || user.email || user.userPrincipalName || user.preferred_username || ''

    if (!userEmail) {
      logger.error('No email found for authenticated user:', {
        userKeys: Object.keys(user || {}),
        userId: user?.id || 'unknown'
      })
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request - User email not found',
        data: { userInfo: 'missing' }
      })
    }

    logger.info('User authenticated successfully', {
      email: userEmail,
      userId: user.id || 'unknown'
    })

    // Parse query parameters with validation
    const query = getQuery(event)
    const requestedYear = query.year ? parseInt(query.year as string) : null
    const departmentFilter = query.department as string || null

    // Validate year if provided
    if (query.year && (isNaN(requestedYear) || requestedYear < 2000 || requestedYear > 2030)) {
      logger.warn('Invalid year parameter provided:', query.year)
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid year parameter'
      })
    }

    logger.debug('Request parameters validated', {
      requestedYear,
      departmentFilter,
      query
    })

    // Initialize database connection with error handling
    let db
    try {
      db = useDB()
      if (!db) {
        throw new Error('Database connection failed')
      }
    }
    catch (dbError) {
      logger.error('Database connection error:', dbError)
      throw createError({
        statusCode: 503,
        statusMessage: 'Database unavailable'
      })
    }

    const conditions = []

    // Check if the user is a department head with better error handling
    logger.debug('Checking department head status', { email: userEmail })

    let deptHeadResult
    try {
      deptHeadResult = await db.select()
        .from(departmentHeads)
        .where(
          and(
            eq(departmentHeads.email, userEmail),
            eq(departmentHeads.isActive, 1)
          )
        )
        .execute()
    }
    catch (deptError) {
      logger.error('Error checking department head status:', {
        error: deptError.message,
        email: userEmail
      })
      throw createError({
        statusCode: 500,
        statusMessage: 'Error verifying department access'
      })
    }

    const isDepartmentHead = deptHeadResult && deptHeadResult.length > 0

    if (isDepartmentHead) {
      const userDepartment = deptHeadResult[0].department
      logger.info('User confirmed as department head', {
        email: userEmail,
        department: userDepartment
      })

      // Department head sees their department's students
      conditions.push(eq(studentRecords.department, userDepartment))
    }
    else {
      logger.info('User is regular supervisor', { email: userEmail })

      // Regular supervisor - only see their own students
      conditions.push(eq(studentRecords.supervisorEmail, userEmail))
    }

    // Add additional department filter if provided
    if (departmentFilter) {
      logger.debug('Applying additional department filter', { departmentFilter })

      // Validate department filter
      if (typeof departmentFilter !== 'string' || departmentFilter.length > 100) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid department filter'
        })
      }

      conditions.push(eq(studentRecords.department, departmentFilter))
    }

    // Determine the year to use
    let latestYear = requestedYear
    if (!latestYear) {
      logger.debug('No year specified, finding latest year from database')

      try {
        const latestYearResult = await db
          .select({ maxYear: studentRecords.currentYear })
          .from(studentRecords)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(studentRecords.currentYear))
          .limit(1)
          .execute()

        latestYear = latestYearResult.length > 0 ? latestYearResult[0].maxYear : null

        logger.info('Latest year determined from database', { latestYear })
      }
      catch (yearError) {
        logger.warn('Error determining latest year, using current year:', yearError.message)
        latestYear = new Date().getFullYear()
      }
    }

    // Add year filter if we have a year
    if (latestYear) {
      logger.debug('Applying year filter', { year: latestYear })
      conditions.push(eq(studentRecords.currentYear, latestYear))
    }

    // Fetch student records with comprehensive error handling
    logger.debug('Fetching student records with conditions', {
      conditionsCount: conditions.length,
      year: latestYear
    })

    let studentRecordsResult
    try {
      studentRecordsResult = await db.select()
        .from(studentRecords)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .execute()
    }
    catch (studentsError) {
      logger.error('Error fetching student records:', {
        error: studentsError.message,
        stack: studentsError.stack
      })
      throw createError({
        statusCode: 500,
        statusMessage: 'Error fetching student data'
      })
    }

    // Handle empty results
    if (!studentRecordsResult || studentRecordsResult.length === 0) {
      logger.info('No students found matching criteria', {
        year: latestYear,
        isDepartmentHead,
        department: isDepartmentHead ? deptHeadResult[0].department : null,
        departmentFilter,
        userEmail
      })

      return {
        students: [],
        total: 0,
        year: latestYear,
        isDepartmentHead,
        message: 'No students found for the specified criteria'
      }
    }

    logger.info('Student records retrieved successfully', {
      count: studentRecordsResult.length,
      year: latestYear,
      isDepartmentHead
    })

    // Extract student record IDs for related data queries
    const studentRecordIds = studentRecordsResult.map(sr => sr.id)

    if (studentRecordIds.length === 0) {
      logger.warn('No valid student record IDs found')
      return {
        students: [],
        total: 0,
        year: latestYear,
        isDepartmentHead
      }
    }

    logger.debug('Fetching related data for students', {
      studentCount: studentRecordIds.length,
      sampleIds: studentRecordIds.slice(0, 3)
    })

    // Fetch all related data with improved error handling and fallbacks
    try {
      logger.debug('Starting bulk data fetch operations')

      // First batch: Core student data
      const [documentsResult, videosResult, reviewerReportsResult, supervisorReportsResult, topicRegistrationsResult] = await Promise.allSettled([
        // Documents query with fallback
        db.select().from(documents)
          .where(inArray(documents.studentRecordId, studentRecordIds))
          .execute()
          .catch(async (err) => {
            logger.warn('Bulk documents fetch failed, using individual queries', { error: err.message })
            const results = await Promise.allSettled(
              studentRecordIds.map(id =>
                db.select().from(documents)
                  .where(eq(documents.studentRecordId, id))
                  .execute()
              )
            )
            return results
              .filter(result => result.status === 'fulfilled')
              .map(result => result.value)
              .flat()
          }),

        // Videos query with fallback
        db.select().from(videos)
          .where(inArray(videos.studentRecordId, studentRecordIds))
          .execute()
          .catch(async (err) => {
            logger.warn('Bulk videos fetch failed, using individual queries', { error: err.message })
            const results = await Promise.allSettled(
              studentRecordIds.map(id =>
                db.select().from(videos)
                  .where(eq(videos.studentRecordId, id))
                  .execute()
              )
            )
            return results
              .filter(result => result.status === 'fulfilled')
              .map(result => result.value)
              .flat()
          }),

        // Reviewer reports query with fallback
        db.select().from(reviewerReports)
          .where(inArray(reviewerReports.studentRecordId, studentRecordIds))
          .execute()
          .catch(async (err) => {
            logger.warn('Bulk reviewer reports fetch failed, using individual queries', { error: err.message })
            const results = await Promise.allSettled(
              studentRecordIds.map(id =>
                db.select().from(reviewerReports)
                  .where(eq(reviewerReports.studentRecordId, id))
                  .execute()
              )
            )
            return results
              .filter(result => result.status === 'fulfilled')
              .map(result => result.value)
              .flat()
          }),

        // Supervisor reports query with fallback
        db.select().from(supervisorReports)
          .where(inArray(supervisorReports.studentRecordId, studentRecordIds))
          .execute()
          .catch(async (err) => {
            logger.warn('Bulk supervisor reports fetch failed, using individual queries', { error: err.message })
            const results = await Promise.allSettled(
              studentRecordIds.map(id =>
                db.select().from(supervisorReports)
                  .where(eq(supervisorReports.studentRecordId, id))
                  .execute()
              )
            )
            return results
              .filter(result => result.status === 'fulfilled')
              .map(result => result.value)
              .flat()
          }),

        // Project topic registrations query with fallback
        db.select().from(projectTopicRegistrations)
          .where(inArray(projectTopicRegistrations.studentRecordId, studentRecordIds))
          .execute()
          .catch(async (err) => {
            logger.warn('Bulk project topic registrations fetch failed, using individual queries', { error: err.message })
            const results = await Promise.allSettled(
              studentRecordIds.map(id =>
                db.select().from(projectTopicRegistrations)
                  .where(eq(projectTopicRegistrations.studentRecordId, id))
                  .execute()
              )
            )
            return results
              .filter(result => result.status === 'fulfilled')
              .map(result => result.value)
              .flat()
          })
      ])

      // Extract results with error handling
      const docs = documentsResult.status === 'fulfilled' ? documentsResult.value : []
      const vids = videosResult.status === 'fulfilled' ? videosResult.value : []
      const reviewerReps = reviewerReportsResult.status === 'fulfilled' ? reviewerReportsResult.value : []
      const supervisorReps = supervisorReportsResult.status === 'fulfilled' ? supervisorReportsResult.value : []
      const topicRegs = topicRegistrationsResult.status === 'fulfilled' ? topicRegistrationsResult.value : []

      // Log any failed operations
      if (documentsResult.status === 'rejected') {
        logger.error('Documents fetch completely failed:', documentsResult.reason)
      }
      if (videosResult.status === 'rejected') {
        logger.error('Videos fetch completely failed:', videosResult.reason)
      }
      if (reviewerReportsResult.status === 'rejected') {
        logger.error('Reviewer reports fetch completely failed:', reviewerReportsResult.reason)
      }
      if (supervisorReportsResult.status === 'rejected') {
        logger.error('Supervisor reports fetch completely failed:', supervisorReportsResult.reason)
      }
      if (topicRegistrationsResult.status === 'rejected') {
        logger.error('Topic registrations fetch completely failed:', topicRegistrationsResult.reason)
      }

      // Fetch comments for topic registrations if we have any
      let comments = []
      if (topicRegs && topicRegs.length > 0) {
        const topicRegistrationIds = topicRegs.map(tr => tr.id).filter(Boolean)

        if (topicRegistrationIds.length > 0) {
          try {
            comments = await db.select().from(topicRegistrationComments)
              .where(inArray(topicRegistrationComments.topicRegistrationId, topicRegistrationIds))
              .execute()
          }
          catch (commentsError) {
            logger.warn('Failed to fetch topic comments, using individual queries', { error: commentsError.message })

            try {
              const commentResults = await Promise.allSettled(
                topicRegistrationIds.map(id =>
                  db.select().from(topicRegistrationComments)
                    .where(eq(topicRegistrationComments.topicRegistrationId, id))
                    .execute()
                )
              )

              comments = commentResults
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value)
                .flat()
            }
            catch (individualCommentsError) {
              logger.error('Individual comments fetch also failed:', individualCommentsError.message)
              comments = []
            }
          }
        }
      }

      logger.info('Related data fetched successfully', {
        documentsCount: docs.length,
        videosCount: vids.length,
        reviewerReportsCount: reviewerReps.length,
        supervisorReportsCount: supervisorReps.length,
        topicRegistrationsCount: topicRegs.length,
        commentsCount: comments.length
      })

      // Create lookup maps for efficient data organization
      logger.debug('Creating data lookup maps')

      const documentsMap = new Map()
      const videosMap = new Map()
      const reviewerReportsMap = new Map()
      const supervisorReportsMap = new Map()
      const topicRegistrationsMap = new Map()
      const topicCommentsMap = new Map()

      // Populate lookup maps with error protection
      try {
        docs.forEach((doc) => {
          if (doc && doc.studentRecordId) {
            if (!documentsMap.has(doc.studentRecordId)) {
              documentsMap.set(doc.studentRecordId, [])
            }
            documentsMap.get(doc.studentRecordId).push(doc)
          }
        })

        vids.forEach((video) => {
          if (video && video.studentRecordId) {
            if (!videosMap.has(video.studentRecordId)) {
              videosMap.set(video.studentRecordId, [])
            }
            videosMap.get(video.studentRecordId).push(video)
          }
        })

        reviewerReps.forEach((report) => {
          if (report && report.studentRecordId) {
            if (!reviewerReportsMap.has(report.studentRecordId)) {
              reviewerReportsMap.set(report.studentRecordId, [])
            }
            reviewerReportsMap.get(report.studentRecordId).push(report)
          }
        })

        supervisorReps.forEach((report) => {
          if (report && report.studentRecordId) {
            if (!supervisorReportsMap.has(report.studentRecordId)) {
              supervisorReportsMap.set(report.studentRecordId, [])
            }
            supervisorReportsMap.get(report.studentRecordId).push(report)
          }
        })

        topicRegs.forEach((registration) => {
          if (registration && registration.studentRecordId) {
            if (!topicRegistrationsMap.has(registration.studentRecordId)) {
              topicRegistrationsMap.set(registration.studentRecordId, [])
            }
            topicRegistrationsMap.get(registration.studentRecordId).push(registration)
          }
        })

        // Group comments by topic registration ID
        comments.forEach((comment) => {
          if (comment && comment.topicRegistrationId) {
            if (!topicCommentsMap.has(comment.topicRegistrationId)) {
              topicCommentsMap.set(comment.topicRegistrationId, [])
            }
            topicCommentsMap.get(comment.topicRegistrationId).push(comment)
          }
        })

        logger.debug('Lookup maps created successfully')
      }
      catch (mapError) {
        logger.error('Error creating lookup maps:', mapError.message)
        // Continue with empty maps rather than failing
      }

      // Attach comments to their respective topic registrations
      try {
        for (const [studentId, registrations] of topicRegistrationsMap.entries()) {
          if (registrations && Array.isArray(registrations)) {
            registrations.forEach((registration) => {
              if (registration && registration.id) {
                registration.comments = topicCommentsMap.get(registration.id) || []
              }
            })
          }
        }
        logger.debug('Comments attached to topic registrations')
      }
      catch (attachError) {
        logger.error('Error attaching comments to registrations:', attachError.message)
      }

      // Organize final student data structure
      logger.debug('Organizing final student data structure')

      const studentsData = studentRecordsResult
        .filter(student => student && student.id) // Ensure valid student records
        .map((student) => {
          try {
            return {
              student,
              documents: documentsMap.get(student.id) || [],
              videos: videosMap.get(student.id) || [],
              reviewerReports: reviewerReportsMap.get(student.id) || [],
              supervisorReports: supervisorReportsMap.get(student.id) || [],
              projectTopicRegistrations: topicRegistrationsMap.get(student.id) || []
            }
          }
          catch (studentMapError) {
            logger.error('Error mapping student data:', {
              studentId: student.id,
              error: studentMapError.message
            })
            // Return minimal student data if mapping fails
            return {
              student,
              documents: [],
              videos: [],
              reviewerReports: [],
              supervisorReports: [],
              projectTopicRegistrations: []
            }
          }
        })

      logger.info('Final response prepared successfully', {
        studentCount: studentsData.length,
        year: latestYear,
        isDepartmentHead,
        department: isDepartmentHead ? deptHeadResult[0].department : null,
        userEmail
      })

      return {
        students: studentsData,
        total: studentRecordsResult.length,
        year: latestYear,
        isDepartmentHead,
        department: isDepartmentHead ? deptHeadResult[0].department : null,
        timestamp: new Date().toISOString()
      }
    }
    catch (fetchError) {
      logger.error('Critical error during data fetch operations:', {
        error: fetchError.message,
        stack: fetchError.stack,
        studentCount: studentRecordIds.length
      })

      // Return minimal response instead of complete failure
      return {
        students: studentRecordsResult.map(student => ({
          student,
          documents: [],
          videos: [],
          reviewerReports: [],
          supervisorReports: [],
          projectTopicRegistrations: []
        })),
        total: studentRecordsResult.length,
        year: latestYear,
        isDepartmentHead,
        error: 'Partial data - some related information may be missing'
      }
    }
  }
  catch (error) {
    logger.error('Critical error in department data endpoint:', {
      error: error.message,
      statusCode: error.statusCode,
      stack: error.stack,
      url: event.node.req.url,
      method: event.node.req.method,
      timestamp: new Date().toISOString()
    })

    // Determine appropriate error response
    const statusCode = error.statusCode || 500
    const isClientError = statusCode >= 400 && statusCode < 500

    throw createError({
      statusCode,
      statusMessage: isClientError ? error.statusMessage : 'Internal Server Error',
      data: {
        message: isClientError ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && {
          originalError: error.message,
          stack: error.stack
        })
      }
    })
  }
})
