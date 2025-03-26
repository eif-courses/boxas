import { eq, and } from 'drizzle-orm'
import { commissionMembers } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  logger.info('Processing commission member check request')

  try {
    const { user } = await requireUserSession(event)

    if (!user) {
      logger.warn('Unauthorized access attempt', {
        endpoint: 'commission-member-check'
      })
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    logger.info('User authenticated', {
      email: user.mail
    })

    const db = useDB()

    // Check if the user is a commission member
    logger.debug('Checking commission member status', {
      email: user.mail
    })

    const commissionResult = await db.select()
      .from(commissionMembers)
      .where(
        and(
          eq(commissionMembers.email, user.mail),
          eq(commissionMembers.isActive, 1)
        )
      )
      .execute()

    const isCommissionMember = commissionResult.length > 0

    if (isCommissionMember) {
      logger.info('User is a commission member', {
        email: user.mail,
        department: commissionResult[0].department,
        jobTitle: commissionResult[0].jobTitle
      })
    }
    else {
      logger.info('User is not a commission member', {
        email: user.mail
      })
    }

    // If they are a commission member, also return the department information
    const commissionInfo = isCommissionMember
      ? {
          department: commissionResult[0].department,
          jobTitle: commissionResult[0].jobTitle
        }
      : null

    return {
      isCommissionMember,
      commissionInfo
    }
  }
  catch (error) {
    logger.error('Commission member check error', {
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
