// server/api/admin/commission-access.get.ts - Fix for the ordering issue
import { defineEventHandler, createError } from 'h3'
import { eq, and, gt, desc } from 'drizzle-orm' // Import desc separately
import { commissionMembers } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const logger = event.context.logger || console
  logger.info('Fetching active commission access codes')

  // Verify admin permissions (using your existing auth system)
  // if (!isAdmin(event)) {
  //   throw createError({
  //     statusCode: 403,
  //     statusMessage: 'Forbidden: Admin access required'
  //   })
  // }

  const db = useDB()
  try {
    const currentTimestamp = Math.floor(Date.now() / 1000)

    const activeCodes = await db.select({
      id: commissionMembers.id,
      accessCode: commissionMembers.accessCode,
      department: commissionMembers.department,
      expiresAt: commissionMembers.expiresAt,
      createdAt: commissionMembers.createdAt,
      lastAccessedAt: commissionMembers.lastAccessedAt
    })
      .from(commissionMembers)
      .where(
        and(
          eq(commissionMembers.isActive, 1),
          gt(commissionMembers.expiresAt, currentTimestamp)
        )
      )
      .orderBy(desc(commissionMembers.createdAt)) // Use desc() function instead of method

    // Transform timestamps to ISO strings for frontend
    const formattedCodes = activeCodes.map(code => ({
      ...code,
      expiresAt: new Date(code.expiresAt * 1000).toISOString(),
      createdAt: new Date(code.createdAt * 1000).toISOString(),
      lastAccessedAt: code.lastAccessedAt ? new Date(code.lastAccessedAt * 1000).toISOString() : null
    }))

    return {
      accessCodes: formattedCodes
    }
  }
  catch (error: any) {
    logger.error('Error fetching commission access codes', {
      error: error.message
    })
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch commission access codes'
    })
  }
})
