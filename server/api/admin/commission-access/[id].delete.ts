// server/api/admin/commission-access/[id].delete.ts
import { defineEventHandler, createError } from 'h3'
import { eq } from 'drizzle-orm'
import { commissionMembers } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const logger = event.context.logger || console

  // Get ID from route params
  const id = event.context.params.id
  if (!id || isNaN(Number(id))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid ID'
    })
  }

  // Verify admin permissions
  // if (!isAdmin(event)) {
  //   throw createError({
  //     statusCode: 403,
  //     statusMessage: 'Forbidden: Admin access required'
  //   })
  // }

  logger.info(`Revoking commission access with ID: ${id}`)

  const db = useDB()
  try {
    // Set isActive = 0 instead of deleting
    await db.update(commissionMembers)
      .set({ isActive: 0 })
      .where(eq(commissionMembers.id, Number(id)))

    return {
      success: true,
      message: 'Access revoked successfully'
    }
  }
  catch (error: any) {
    logger.error(`Error revoking commission access with ID: ${id}`, {
      error: error.message
    })
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to revoke access'
    })
  }
})
