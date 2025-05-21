// server/api/auth/check-department-head.get.js
import { eq, and } from 'drizzle-orm'
import { departmentHeads } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const logger = event.context.logger || console
  logger.info('Processing department head check request')

  let user

  try {
    // Attempt to get the user session explicitly
    const session = await requireUserSession(event)
    user = session.user
  }
  catch (authError) {
    logger.warn('Unauthorized access attempt', {
      endpoint: 'department-head-check',
      error: authError.message
    })
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const userEmail = user.mail || user.email || user.userPrincipalName || user.preferred_username || ''

  if (!userEmail) {
    logger.error('No email found for authenticated user')
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request - User email not found'
    })
  }

  try {
    logger.info('User authenticated', { email: userEmail })

    const db = useDB()

    logger.debug('Checking department head status', { email: userEmail })

    const deptHeadResult = await db
      .select()
      .from(departmentHeads)
      .where(
        and(
          eq(departmentHeads.email, userEmail),
          eq(departmentHeads.isActive, 1)
        )
      )
      .execute()

    const isDepartmentHead = deptHeadResult.length > 0

    // Log all data if department head is found
    if (isDepartmentHead) {
      logger.info('User is a department head', {
        email: userEmail,
        id: deptHeadResult[0].id,
        name: deptHeadResult[0].name,
        sureName: deptHeadResult[0].sureName,
        department: deptHeadResult[0].department,
        departmentEn: deptHeadResult[0].departmentEn,
        jobTitle: deptHeadResult[0].jobTitle,
        role: deptHeadResult[0].role,
        createdAt: deptHeadResult[0].createdAt
      })
    }
    else {
      logger.info('User is not a department head', { email: userEmail })
    }

    // Return all properties from the record
    const departmentInfo = isDepartmentHead ? deptHeadResult[0] : null

    return {
      isDepartmentHead,
      departmentInfo,
      user: {
        email: userEmail,
        id: user.id,
        name: user.displayName || user.name
      },
      timestamp: new Date().toISOString()
    }
  }
  catch (error) {
    logger.error('Department head check error', {
      error: error.message,
      stack: error.stack,
      userEmail
    })

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { message: error.message }
    })
  }
})
