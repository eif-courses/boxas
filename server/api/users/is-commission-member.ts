// server/api/commission/check.get.ts

import { defineEventHandler, getQuery, createError } from 'h3'
import { eq, and, gt } from 'drizzle-orm'
import { commissionMembers } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const logger = event.context.logger || console // Use logger if available
  logger.info('Processing commission member access check request')

  // --- 1. Get Access Code from Query Parameters ---
  const query = getQuery(event)
  const accessCode = query.code as string | undefined // Get access code from query

  // --- 2. Validate Input ---
  if (!accessCode || typeof accessCode !== 'string' || accessCode.trim() === '') {
    logger.warn('Access check request missing or invalid code query parameter.')
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Missing or invalid access code parameter.'
    })
  }
  logger.debug(`Checking database for access code: ${accessCode.substring(0, 5)}...`) // Log first few chars

  // --- 3. Database Check ---
  const db = useDB()
  try {
    logger.debug('Querying commission member status by access code')
    const currentTimestamp = Math.floor(Date.now() / 1000) // Current time in seconds

    // Use findFirst as access code should be unique
    const commissionMember = await db.query.commissionMembers.findFirst({
      where: and(
        eq(commissionMembers.accessCode, accessCode), // Check against the accessCode column
        eq(commissionMembers.isActive, 1), // Ensure member is active
        gt(commissionMembers.expiresAt, currentTimestamp) // Check if not expired
      ),
      columns: {
        id: true,
        department: true,
        expiresAt: true
      }
    })

    const isValidAndActive = !!commissionMember

    if (isValidAndActive) {
      logger.info('Provided access code corresponds to an active commission member.', {
        memberId: commissionMember.id,
        department: commissionMember.department
      })

      // Update last accessed timestamp
      await db.update(commissionMembers)
        .set({ lastAccessedAt: currentTimestamp })
        .where(eq(commissionMembers.id, commissionMember.id))

      // Calculate remaining validity time
      const remainingSeconds = commissionMember.expiresAt - currentTimestamp
      const remainingDays = Math.ceil(remainingSeconds / (60 * 60 * 24))

      // Return success and member info
      return {
        isValid: true,
        memberInfo: {
          department: commissionMember.department,
          expiresIn: `${remainingDays} day${remainingDays !== 1 ? 's' : ''}`
        }
      }
    }
    else {
      // Check if the access code exists but is expired
      const expiredMember = await db.query.commissionMembers.findFirst({
        where: and(
          eq(commissionMembers.accessCode, accessCode),
          eq(commissionMembers.isActive, 1)
          // Only checking if it exists but is expired
        ),
        columns: {
          id: true,
          expiresAt: true
        }
      })

      if (expiredMember && expiredMember.expiresAt < currentTimestamp) {
        logger.info('Provided access code has expired.')
        return {
          isValid: false,
          error: 'expired',
          memberInfo: null
        }
      }
      else {
        logger.info('Provided access code is invalid or corresponds to an inactive member.')
        return {
          isValid: false,
          error: 'invalid',
          memberInfo: null
        }
      }
    }
  }
  catch (error: any) {
    logger.error('Database error during commission member access check:', {
      codePrefix: accessCode.substring(0, 5),
      error: error.message,
      stack: error.stack
    })
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error while checking commission access.'
    })
  }
})
