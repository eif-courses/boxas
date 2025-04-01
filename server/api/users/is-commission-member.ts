// server/api/commission/check.get.ts  // Example path - use GET for checks

import { defineEventHandler, getQuery, createError } from 'h3'
import { eq, and } from 'drizzle-orm'
import { commissionMembers } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  const logger = event.context.logger || console // Use logger if available
  logger.info('Processing commission member token check request')

  // --- 1. Get Token from Query Parameters ---
  const query = getQuery(event)
  const tokenToCheck = query.token as string | undefined // Get token from query

  // --- 2. Validate Input ---
  if (!tokenToCheck || typeof tokenToCheck !== 'string' || tokenToCheck.trim() === '') {
    logger.warn('Token check request missing or invalid token query parameter.')
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Missing or invalid token query parameter.'
    })
  }
  // Be cautious about logging sensitive tokens in production environments
  logger.debug(`Checking database for token: ${tokenToCheck.substring(0, 5)}...`) // Log first few chars

  // --- 3. Database Check ---
  const db = useDB()
  try {
    logger.debug('Querying commission member status by token')
    // Use findFirst as token should be unique
    const commissionMember = await db.query.commissionMembers.findFirst({
      where: and(
        eq(commissionMembers.token, tokenToCheck), // Check against the token column
        eq(commissionMembers.isActive, 1) // Ensure member is active
      ),
      columns: { // Select only the necessary columns
        id: true,
        department: true
        // Add other fields you might want to return if valid
      }
    })

    const isValidAndActive = !!commissionMember // Convert result to boolean

    if (isValidAndActive) {
      logger.info('Provided token corresponds to an active commission member.', {
        tokenId: commissionMember.id, // Log ID instead of token
        department: commissionMember.department
      })
      // Return success and potentially some non-sensitive info
      return {
        isValid: true,
        memberInfo: { // Return useful info associated with the token
          department: commissionMember.department
          // Add other fields if needed
        }
      }
    }
    else {
      // Token not found or member is inactive
      logger.info('Provided token is invalid or corresponds to an inactive member.')
      // Return failure status
      return {
        isValid: false,
        memberInfo: null // Explicitly null
      }
    }
  }
  catch (error: any) {
    logger.error('Database error during commission member token check:', {
      tokenPrefix: tokenToCheck.substring(0, 5), // Log prefix for correlation
      error: error.message,
      stack: error.stack // Important for debugging
    })
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error while checking commission status.'
      // Avoid exposing detailed DB errors to the client
    })
  }
})
