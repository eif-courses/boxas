import { eq, and, or, ilike, inArray, desc, asc, sql } from 'drizzle-orm'
import { studentRecords, documents, videos, reviewerReports, supervisorReports, departmentHeads, projectTopicRegistrations, topicRegistrationComments } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  logger.info('Processing department head data request')

  try {
    const { user } = await requireUserSession(event)

    if (!user) {
      logger.warn('Unauthorized access attempt', {
        endpoint: 'department-data'
      })
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
    const userEmail = user.mail || user.email || user.userPrincipalName || user.preferred_username || ''
    logger.info('User authenticated', {
      email: userEmail
    })

    const query = getQuery(event)
    const requestedYear = parseInt(query.year as string) || null
    const departmentFilter = query.department as string || null // Existing filter
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 10
    const sortBy = query.sortBy as string || 'studentLastname' // Default sort
    const sortOrder = query.sortOrder as string === 'desc' ? 'desc' : 'asc'
    const search = query.search as string || ''
    const group = query.group as string || ''
    const program = query.program as string || ''

    logger.debug('Request parameters', {
      requestedYear,
      departmentFilter,
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      group,
      program,
      query
    })

    const db = useDB()
    const conditions = []

    // First, check if the user is a department head
    logger.debug('Checking if user is a department head', {
      email: userEmail
    })

    const deptHeadResult = await db.select()
      .from(departmentHeads)
      .where(
        and(
          eq(departmentHeads.email, userEmail),
          eq(departmentHeads.isActive, 1)
        )
      )
      .execute()

    const isDepartmentHead = deptHeadResult.length > 0

    if (isDepartmentHead) {
      logger.info('User is a department head', {
        email: userEmail,
        department: deptHeadResult[0].department
      })

      // If they are a department head, filter by their department
      conditions.push(eq(studentRecords.department, deptHeadResult[0].department))
    }
    else {
      logger.info('User is a regular supervisor', {
        email: userEmail
      })

      // Regular supervisor - only see their own students
      conditions.push(eq(studentRecords.supervisorEmail, userEmail))
    }

    // Add department filter if explicitly provided in the query
    if (departmentFilter) {
      logger.debug('Applying additional department filter', {
        departmentFilter
      })
      conditions.push(eq(studentRecords.department, departmentFilter))
    }

    // Year filter: Determine latest year if not specified
    let latestYear = requestedYear
    if (!latestYear) {
      logger.debug('No year specified, finding latest year based on initial conditions')
      // Temporarily create base conditions for latest year query
      const baseConditionsForYear = []
      if (isDepartmentHead) {
        baseConditionsForYear.push(eq(studentRecords.department, deptHeadResult[0].department))
      }
      else {
        baseConditionsForYear.push(eq(studentRecords.supervisorEmail, userEmail))
      }
      if (departmentFilter) { // Also consider department filter if present
        baseConditionsForYear.push(eq(studentRecords.department, departmentFilter))
      }

      const latestYearResult = await db
        .select({ maxYear: studentRecords.currentYear })
        .from(studentRecords)
        .where(baseConditionsForYear.length > 0 ? and(...baseConditionsForYear) : undefined)
        .orderBy(desc(studentRecords.currentYear))
        .limit(1)
        .execute()
      latestYear = latestYearResult.length > 0 ? latestYearResult[0].maxYear : null
      logger.info('Latest year determined', { latestYear })
    }

    if (latestYear) {
      conditions.push(eq(studentRecords.currentYear, latestYear))
      logger.debug('Applied year filter', { year: latestYear })
    }

    // Search filter
    if (search) {
      const searchLower = `%${search.toLowerCase()}%`
      conditions.push(
        or(
          ilike(studentRecords.studentName, searchLower),
          ilike(studentRecords.studentLastname, searchLower),
          ilike(studentRecords.studentEmail, searchLower),
          ilike(studentRecords.finalProjectTitle, searchLower),
          ilike(studentRecords.studentGroup, searchLower),
          ilike(studentRecords.studyProgram, searchLower)
        )
      )
      logger.debug('Applied search filter', { search })
    }

    // Group filter
    if (group) {
      conditions.push(eq(studentRecords.studentGroup, group))
      logger.debug('Applied group filter', { group })
    }

    // Program filter
    if (program) {
      conditions.push(eq(studentRecords.studyProgram, program))
      logger.debug('Applied program filter', { program })
    }

    const combinedConditions = conditions.length > 0 ? and(...conditions) : undefined

    // Count total items
    logger.debug('Fetching total student count with all filters')
    const totalItemsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(studentRecords)
      .where(combinedConditions)
      .execute()

    const totalItems = totalItemsResult[0]?.count || 0
    logger.info('Total items count determined', { totalItems, year: latestYear, isDepartmentHead })

    if (totalItems === 0) {
      logger.info('No students found matching all criteria', {
        year: latestYear,
        isDepartmentHead,
        department: isDepartmentHead ? deptHeadResult[0].department : null,
        departmentFilter,
        search,
        group,
        program
      })
      return {
        students: [],
        totalItems: 0,
        currentPage: page,
        totalPages: 0,
        itemsPerPage: limit,
        year: latestYear,
        isDepartmentHead
      }
    }

    // Sorting
    let sortColumn
    switch (sortBy) {
      case 'name': // Assuming name refers to lastname
        sortColumn = studentRecords.studentLastname
        break
      case 'finalProjectTitle':
        sortColumn = studentRecords.finalProjectTitle
        break
      case 'studentGroup':
        sortColumn = studentRecords.studentGroup
        break
      case 'studentEmail':
        sortColumn = studentRecords.studentEmail
        break
      case 'studyProgram':
        sortColumn = studentRecords.studyProgram
        break
      case 'supervisorName': // Assuming supervisor name is available or needs joining
        sortColumn = studentRecords.supervisorName // Adjust if actual column name is different
        break
      default:
        sortColumn = studentRecords.studentLastname
    }
    const orderedColumn = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)
    logger.debug('Sorting parameters', { sortBy, sortOrder })

    // Apply all conditions, sorting, and pagination for student records
    logger.debug('Fetching paginated student records')
    const studentRecordsResult = await db.select()
      .from(studentRecords)
      .where(combinedConditions)
      .orderBy(orderedColumn)
      .offset((page - 1) * limit)
      .limit(limit)
      .execute()

    if (!studentRecordsResult?.length) {
      logger.info('No students found for the current page', {
        page,
        limit,
        year: latestYear,
        isDepartmentHead
      })
      return {
        students: [],
        totalItems, // Still return totalItems
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        itemsPerPage: limit,
        year: latestYear,
        isDepartmentHead
      }
    }

    logger.info('Student records found for page', {
      count: studentRecordsResult.length,
      page,
      limit,
      year: latestYear,
      isDepartmentHead
    })

    // Extract student record IDs
    const studentRecordIds = studentRecordsResult.map(sr => sr.id)

    logger.debug('Fetching related data for students', {
      studentCount: studentRecordIds.length
    })

    // Run all queries in parallel (bulk fetch all related data at once)
    try {
      logger.debug('Attempting bulk data fetch with inArray')

      // First batch of queries: documents, videos, reviewer reports, supervisor reports, and topic registrations
      const [documentsResult, videosResult, reviewerReportsResult, supervisorReportsResult, topicRegistrationsResult]
          = await Promise.all([
            // Try to use inArray for bulk fetching, which should be much faster
            db.select().from(documents)
              .where(inArray(documents.studentRecordId, studentRecordIds))
              .execute()
              .catch((err) => {
                logger.warn('Bulk documents fetch failed, falling back to individual queries', {
                  error: err.message
                })
                return Promise.all(
                  studentRecordIds.map(id =>
                    db.select().from(documents)
                      .where(eq(documents.studentRecordId, id))
                      .execute()
                  )
                ).then(results => results.flat())
              }),

            db.select().from(videos)
              .where(inArray(videos.studentRecordId, studentRecordIds))
              .execute()
              .catch((err) => {
                logger.warn('Bulk videos fetch failed, falling back to individual queries', {
                  error: err.message
                })
                return Promise.all(
                  studentRecordIds.map(id =>
                    db.select().from(videos)
                      .where(eq(videos.studentRecordId, id))
                      .execute()
                  )
                ).then(results => results.flat())
              }),

            db.select().from(reviewerReports)
              .where(inArray(reviewerReports.studentRecordId, studentRecordIds))
              .execute()
              .catch((err) => {
                logger.warn('Bulk reviewer reports fetch failed, falling back to individual queries', {
                  error: err.message
                })
                return Promise.all(
                  studentRecordIds.map(id =>
                    db.select().from(reviewerReports)
                      .where(eq(reviewerReports.studentRecordId, id))
                      .execute()
                  )
                ).then(results => results.flat())
              }),

            db.select().from(supervisorReports)
              .where(inArray(supervisorReports.studentRecordId, studentRecordIds))
              .execute()
              .catch((err) => {
                logger.warn('Bulk supervisor reports fetch failed, falling back to individual queries', {
                  error: err.message
                })
                return Promise.all(
                  studentRecordIds.map(id =>
                    db.select().from(supervisorReports)
                      .where(eq(supervisorReports.studentRecordId, id))
                      .execute()
                  )
                ).then(results => results.flat())
              }),

            // Query for project topic registrations
            db.select().from(projectTopicRegistrations)
              .where(inArray(projectTopicRegistrations.studentRecordId, studentRecordIds))
              .execute()
              .catch((err) => {
                logger.warn('Bulk project topic registrations fetch failed, falling back to individual queries', {
                  error: err.message
                })
                return Promise.all(
                  studentRecordIds.map(id =>
                    db.select().from(projectTopicRegistrations)
                      .where(eq(projectTopicRegistrations.studentRecordId, id))
                      .execute()
                  )
                ).then(results => results.flat())
              })
          ])

      // Now that we have topic registrations, we can fetch comments separately
      let commentsResult = []
      if (topicRegistrationsResult && topicRegistrationsResult.length > 0) {
        const topicRegistrationIds = topicRegistrationsResult.map(tr => tr.id)

        commentsResult = await db.select().from(topicRegistrationComments)
          .where(inArray(topicRegistrationComments.topicRegistrationId, topicRegistrationIds))
          .execute()
          .catch((err) => {
            logger.warn('Bulk topic comments fetch failed, falling back to individual queries', {
              error: err.message
            })
            return Promise.all(
              topicRegistrationsResult.map(tr =>
                db.select().from(topicRegistrationComments)
                  .where(eq(topicRegistrationComments.topicRegistrationId, tr.id))
                  .execute()
              )
            ).then(results => results.flat())
          })
      }

      logger.info('Related data fetched successfully', {
        documentsCount: documentsResult.length,
        videosCount: videosResult.length,
        reviewerReportsCount: reviewerReportsResult.length,
        supervisorReportsCount: supervisorReportsResult.length,
        topicRegistrationsCount: topicRegistrationsResult.length,
        commentsCount: commentsResult.length
      })

      // Group data by student with an optimized approach
      logger.debug('Organizing related data by student')

      const documentsMap = new Map()
      const videosMap = new Map()
      const reviewerReportsMap = new Map()
      const supervisorReportsMap = new Map()
      const topicRegistrationsMap = new Map()
      const topicCommentsMap = new Map()

      // Create lookup maps for faster access
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

      supervisorReportsResult.forEach((report) => {
        if (!supervisorReportsMap.has(report.studentRecordId)) {
          supervisorReportsMap.set(report.studentRecordId, [])
        }
        supervisorReportsMap.get(report.studentRecordId).push(report)
      })

      // Map project topic registrations
      topicRegistrationsResult.forEach((registration) => {
        if (!topicRegistrationsMap.has(registration.studentRecordId)) {
          topicRegistrationsMap.set(registration.studentRecordId, [])
        }
        topicRegistrationsMap.get(registration.studentRecordId).push(registration)
      })

      // Group comments by topic registration ID
      commentsResult.forEach((comment) => {
        if (!topicCommentsMap.has(comment.topicRegistrationId)) {
          topicCommentsMap.set(comment.topicRegistrationId, [])
        }
        topicCommentsMap.get(comment.topicRegistrationId).push(comment)
      })

      // Attach comments to their respective topic registrations
      for (const [studentId, registrations] of topicRegistrationsMap.entries()) {
        registrations.forEach((registration) => {
          // Add comments to each registration
          registration.comments = topicCommentsMap.get(registration.id) || []
        })
      }

      // Map the data using the lookup maps
      const studentsData = studentRecordsResult.map((student) => {
        return {
          student,
          documents: documentsMap.get(student.id) || [],
          videos: videosMap.get(student.id) || [],
          reviewerReports: reviewerReportsMap.get(student.id) || [],
          supervisorReports: supervisorReportsMap.get(student.id) || [],
          projectTopicRegistrations: topicRegistrationsMap.get(student.id) || []
        }
      })

      logger.info('Response prepared successfully', {
        studentCount: studentsData.length,
        year: latestYear,
        isDepartmentHead,
        department: isDepartmentHead ? deptHeadResult[0].department : null
      })

      const totalPages = Math.ceil(totalItems / limit)

      logger.info('Response prepared successfully', {
        studentCount: studentsData.length,
        totalItems,
        currentPage: page,
        totalPages,
        itemsPerPage: limit,
        year: latestYear,
        isDepartmentHead,
        department: isDepartmentHead ? deptHeadResult[0].department : null
      })

      return {
        students: studentsData,
        totalItems,
        currentPage: page,
        totalPages,
        itemsPerPage: limit,
        year: latestYear,
        isDepartmentHead
      }
    }
    catch (fetchError) {
      logger.error('Error fetching related data', {
        error: fetchError.message,
        stack: fetchError.stack
      })
      throw fetchError
    }
  }
  catch (error) {
    logger.error('Error processing department data request', {
      error: error.message,
      stack: error.stack
    })

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { message: error.message }
    })
  }
})
