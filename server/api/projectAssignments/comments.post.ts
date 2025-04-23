import { eq, desc, and } from 'drizzle-orm' // <<< Import desc and and
import { defineEventHandler, readBody, createError } from 'h3' // <<< Added getRouterParam just in case, though not used here as ID comes from body
import {
  assignmentComments,
  projectAssignments,
  projectAssignmentVersions,
  studentRecords // <<< Import studentRecords schema
} from '~~/server/database/schema' // Adjust path if needed

// Define the expected request body structure
interface CommentPayload {
  assignmentId: number | string // Allow string initially, parse later
  text: string
  fieldName?: string | null
  parentId?: number | null // Add parentId for replies
}

export default defineEventHandler(async (event) => {
  const logger = event.context.logger || console
  logger.info('Posting new assignment comment...')

  try {
    // --- 1. Get User Session ---
    const session = await requireUserSession(event) // Ensures user is logged in
    const userEmail = session.user?.mail?.toLowerCase() // Get user's email (lowercase for comparison)
    const authorName = session.user?.displayName || session.user?.name || 'N/A User' // Get user's name

    if (!userEmail) {
      // Should ideally not happen if requireUserSession works, but good check
      logger.error('User session is missing email address.')
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized: User email missing.' })
    }
    logger.debug(`User authenticated: ${authorName} (${userEmail})`)

    // --- 2. Read and Validate Body ---
    let body: CommentPayload
    try {
      body = await readBody<CommentPayload>(event)
    }
    catch (err: any) {
      logger.error('Error reading request body:', err)
      throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
    }

    const { text, fieldName, parentId } = body // Extract parentId
    const { assignmentId: assignmentIdInput } = body

    // --- 3. Validate Input Data ---
    if (assignmentIdInput === undefined || assignmentIdInput === null || text === undefined || text === null || text.trim() === '') {
      logger.warn('Missing required fields: assignmentId or text')
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Assignment ID and comment text are required'
      })
    }
    // Optional: Validate parentId if provided
    let numericParentId: number | null = null
    if (parentId !== undefined && parentId !== null) {
      numericParentId = parseInt(String(parentId), 10)
      if (isNaN(numericParentId)) {
        logger.warn(`Invalid Parent ID provided (not a number): ${parentId}`)
        throw createError({ statusCode: 400, statusMessage: 'Bad Request: Parent ID must be a number.' })
      }
    }

    // --- 4. Parse and Validate assignmentId ---
    const assignmentId = parseInt(String(assignmentIdInput), 10)
    if (isNaN(assignmentId)) {
      logger.warn(`Invalid Assignment ID provided (not a number): ${assignmentIdInput}`)
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Assignment ID must be a number'
      })
    }
    logger.debug(`Parsed assignmentId: ${assignmentId}`)

    const db = useDB()

    // --- 5. Verify Assignment and Fetch Student Record in one go ---
    logger.debug(`Verifying assignment ${assignmentId} and fetching student record...`)
    // Use db.query for potentially easier joins/relations if defined, or manual select
    const assignmentWithStudent = await db.select({
      assignmentId: projectAssignments.id,
      studentRecordId: projectAssignments.studentRecordId, // Needed for parentId check if applicable
      studentEmail: studentRecords.studentEmail,
      supervisorEmail: studentRecords.supervisorEmail
    })
      .from(projectAssignments)
      .leftJoin(studentRecords, eq(projectAssignments.studentRecordId, studentRecords.id))
      .where(eq(projectAssignments.id, assignmentId))
      .limit(1)
      .execute() // Use execute() to get the result array

    const assignmentData = assignmentWithStudent[0] // Get the first (and only) result

    if (!assignmentData) {
      logger.warn(`Assignment not found with ID: ${assignmentId}`)
      throw createError({
        statusCode: 404,
        statusMessage: 'Assignment not found'
      })
    }
    if (!assignmentData.studentEmail && !assignmentData.supervisorEmail) {
      logger.error(`Inconsistency: Student record emails not found for assignment ID ${assignmentId}`)
      throw createError({ statusCode: 500, statusMessage: 'Assignment data inconsistent (missing student details).' })
    }
    logger.debug(`Assignment ${assignmentId} verified. Student Email: ${assignmentData.studentEmail}, Supervisor Email: ${assignmentData.supervisorEmail}`)

    // --- 6. Determine Role & Authorize ---
    let userRole: 'student' | 'supervisor' | null = null

    if (userEmail === assignmentData.studentEmail?.toLowerCase()) {
      userRole = 'student'
    }
    else if (userEmail === assignmentData.supervisorEmail?.toLowerCase()) {
      userRole = 'supervisor'
    }

    if (!userRole) {
      logger.warn(`Authorization Failed: User ${userEmail} is not the student or supervisor for assignment ${assignmentId}.`)
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: You are not authorized to comment on this assignment.' })
    }
    logger.debug(`User role determined as: ${userRole}`)

    // --- 7. Verify Parent Comment Exists (if replying) ---
    if (numericParentId !== null) {
      logger.debug(`Verifying parent comment ID: ${numericParentId}`)
      const parentComment = await db.query.assignmentComments.findFirst({
        where: and(
          eq(assignmentComments.id, numericParentId),
          eq(assignmentComments.assignmentId, assignmentId) // Ensure parent belongs to same assignment
        ),
        columns: { id: true }
      })
      if (!parentComment) {
        logger.warn(`Parent comment not found or does not belong to this assignment: Parent ID ${numericParentId}, Assignment ID ${assignmentId}`)
        throw createError({ statusCode: 404, statusMessage: 'Parent comment not found.' })
      }
      logger.debug(`Parent comment ${numericParentId} verified.`)
    }

    // --- 8. Get the latest version (Still optional, but needed if versionId is required) ---
    logger.debug(`Fetching latest version for assignment ID: ${assignmentId}`)
    const latestVersion = await db.query.projectAssignmentVersions.findFirst({
      where: eq(projectAssignmentVersions.assignmentId, assignmentId),
      orderBy: desc(projectAssignmentVersions.createdDate) // <<< Corrected orderBy
    })
    logger.debug(`Latest version ID: ${latestVersion?.id ?? 'None found'}`)

    // --- 9. Insert the comment ---
    logger.debug('Inserting comment into database')
    const nowTimestamp = Math.floor(Date.now() / 1000)

    const insertedResult = await db.insert(assignmentComments)
      .values({
        assignmentId: assignmentId, // Use parsed number
        versionId: latestVersion?.id ?? null, // Associate with latest version or null
        parentId: numericParentId, // Use parsed numeric parent ID or null
        fieldName: fieldName || null,
        text: text,
        role: userRole, // Role determined above
        authorName: authorName, // Name from session
        createdDate: nowTimestamp
      })
      .returning() // Attempt to get inserted row

    if (!insertedResult || insertedResult.length === 0) {
      // Handle potential .returning() failure (as before)
      logger.error('Failed to retrieve inserted comment using .returning().')
      throw createError({ statusCode: 500, statusMessage: 'Failed to retrieve comment after insertion.' })
    }
    const newComment = insertedResult[0]
    logger.info(`Comment inserted successfully with ID: ${newComment.id}`)

    // --- 10. Update the assignment's last updated timestamp ---
    logger.debug(`Updating lastUpdated timestamp for assignment ID: ${assignmentId}`)
    await db.update(projectAssignments)
      .set({ lastUpdated: nowTimestamp })
      .where(eq(projectAssignments.id, assignmentId))

    // --- 11. Return Success Response ---
    return {
      success: true,
      comment: newComment // Return the full comment object
    }
  }
  catch (error: any) {
    logger.error('Error posting comment:', {
      error: error.message,
      statusCode: error.statusCode,
      stack: error.stack // Log stack only in non-production maybe
    })

    // Re-throw known H3 errors
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      throw error
    }

    // Throw generic 500 for unexpected/DB errors
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to post comment due to an internal server error.'
    })
  }
})
