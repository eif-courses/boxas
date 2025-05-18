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
    logger.warn('Unauthorized access attempt', { endpoint: 'department-head-check' })
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const userEmail = user.mail || user.email || user.userPrincipalName || user.preferred_username || ''
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

    if (isDepartmentHead) {
      logger.info('User is a department head', {
        email: userEmail,
        department: deptHeadResult[0].department,
        jobTitle: deptHeadResult[0].jobTitle
      })
    }
    else {
      logger.info('User is not a department head', { email: userEmail })
    }

    const departmentInfo = isDepartmentHead
      ? {
          department: deptHeadResult[0].department,
          jobTitle: deptHeadResult[0].jobTitle
        }
      : null

    return {
      isDepartmentHead,
      departmentInfo
    }
  }
  catch (error) {
    logger.error('Department head check error', {
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
