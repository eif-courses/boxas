// server/api/auth/check-department-head-soft.get.js
// This is a more tolerant version for middleware checks that won't throw 401
import { eq, and } from 'drizzle-orm'
import { departmentHeads } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const logger = event.context.logger || console
  logger.info('Processing soft department head check request')

  try {
    // Use getUserSession instead of requireUserSession to avoid 401 errors
    const session = await getUserSession(event)
    const user = session?.user

    if (!user) {
      logger.info('No user session found during soft check')
      return {
        isDepartmentHead: false,
        error: 'No session available',
        needsAuth: true
      }
    }

    const userEmail = user.mail || user.email || user.userPrincipalName || user.preferred_username || ''

    if (!userEmail) {
      logger.warn('No email found for user during soft check')
      return {
        isDepartmentHead: false,
        error: 'No user email found',
        needsAuth: false
      }
    }

    logger.info('User found during soft check', { email: userEmail })

    const db = useDB()

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
      logger.info('User confirmed as department head (soft check)', {
        email: userEmail,
        department: deptHeadResult[0].department
      })

      return {
        isDepartmentHead: true,
        departmentInfo: deptHeadResult[0],
        user: {
          email: userEmail,
          id: user.id
        }
      }
    }
    else {
      logger.info('User is not a department head (soft check)', { email: userEmail })

      return {
        isDepartmentHead: false,
        user: {
          email: userEmail,
          id: user.id
        }
      }
    }
  }
  catch (error) {
    logger.error('Soft department head check error', {
      error: error.message,
      stack: error.stack
    })

    // Return structured error instead of throwing
    return {
      isDepartmentHead: false,
      error: error.message,
      internalError: true
    }
  }
})
