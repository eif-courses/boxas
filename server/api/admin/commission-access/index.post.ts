// server/api/admin/commission-access.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { commissionMembers } from '~~/server/database/schema'
import { generateAccessCode } from '~~/server/utils/accessCodeGenerator'

export default defineEventHandler(async (event) => {
  const logger = event.context.logger || console
  logger.info('Creating commission member access')

  // 1. Verify admin permissions (using your existing auth system)
  // This depends on how your authentication works
  // if (!isAdmin(event)) {
  //   throw createError({
  //     statusCode: 403,
  //     statusMessage: 'Forbidden: Admin access required'
  //   })
  // }

  // 2. Read request body
  const body = await readBody(event)
  const { department, durationDays = 7 } = body

  if (!department) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Department is required'
    })
  }

  // 3. Generate access code
  const accessCode = generateAccessCode(department)

  // 4. Calculate expiration timestamp (current time + duration in days)
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = now + (durationDays * 24 * 60 * 60)

  // 5. Insert into database
  const db = useDB()
  try {
    const result = await db.insert(commissionMembers).values({
      accessCode,
      department,
      isActive: 1,
      expiresAt,
      createdAt: now
    }).returning({ id: commissionMembers.id, accessCode: commissionMembers.accessCode })

    logger.info('Commission access created successfully', {
      memberId: result[0].id,
      department,
      expiresAt: new Date(expiresAt * 1000).toISOString()
    })

    // 6. Return the created access information
    return {
      success: true,
      access: {
        id: result[0].id,
        accessCode: result[0].accessCode,
        department,
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        url: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard/commission?code=${result[0].accessCode}`
      }
    }
  }
  catch (error: any) {
    logger.error('Error creating commission access', {
      error: error.message,
      department
    })
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create commission access'
    })
  }
})
