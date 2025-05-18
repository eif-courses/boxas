import { defineEventHandler, readBody, createError } from 'h3'
import { eq } from 'drizzle-orm'
import { supervisorReports } from '~~/server/database/schema' // Adjust path to your schema
// Optional: Import your request payload type
// Optional: Import session utils if needed for authorization
// import { requireUserSession } from '#auth' // Or getServerSession
export interface SaveSupervisorReportPayload {
  studentRecordId: number // Crucial identifier
  EXPL: string
  WORK: string
  OM: number | string
  SSM: number | string
  STUM: number | string
  JM: number | string
  POS: string
  PASS: number // Should be 0 or 1
  // Note: We don't need DATE from the form, createdDate is handled by DB
  // If 'isSigned' needs to be set from the form, add it here.
}
export default defineEventHandler(async (event) => {
  const db = useDB()
  const logger = event.context.logger || console // Use logger if available

  // --- 1. Authorization (Placeholder - Implement!) ---
  // Ensure the user is logged in and has permission to submit/update reports.
  // This might involve checking if the logged-in user is the assigned supervisor
  // for the given studentRecordId.
  // const session = await requireUserSession(event)
  // if (!isUserAuthorized(session.user, requestBody.studentRecordId)) { // Replace with actual check
  //   throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  // }
  // --- ---
  const { user } = await requireUserSession(event)

  if (!user) {
    logger.warn('Unauthorized access attempt', {
      endpoint: 'commission-data'
    })
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const userEmail = user.mail || user.email || user.userPrincipalName || user.preferred_username || ''
  logger.info('User authenticated', {
    email: userEmail
  })

  // --- 2. Read and Validate Request Body ---
  let requestBody: SaveSupervisorReportPayload
  try {
    requestBody = await readBody<SaveSupervisorReportPayload>(event)
  }
  catch (error: any) {
    logger.error('Failed to read request body:', error)
    throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
  }

  // Basic validation (Add more specific checks as needed)
  if (requestBody.studentRecordId === undefined || requestBody.studentRecordId === null) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required field: studentRecordId' })
  }
  if (requestBody.EXPL === undefined || requestBody.EXPL === null) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required field: EXPL (supervisorComments)' })
  }
  if (requestBody.PASS !== 0 && requestBody.PASS !== 1) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid value for PASS (isPassOrFailed), must be 0 or 1' })
  }
  // Add checks for WORK, POS, OM, SSM, STUM, JM if they are strictly required

  logger.info(`Received request to save/update supervisor report for studentRecordId: ${requestBody.studentRecordId}`)

  // --- 3. Map Payload to Database Columns ---
  // Prepare data, converting types if necessary (e.g., ensuring numbers for real fields)
  const reportData = {
    supervisorComments: requestBody.EXPL,
    supervisorWorkplace: requestBody.WORK || '', // Use default if missing/empty
    supervisorPosition: requestBody.POS || '', // Use default if missing/empty
    isPassOrFailed: requestBody.PASS, // Should be 0 or 1
    otherMatch: Number(requestBody.OM) || 0, // Convert to number, default 0
    oneMatch: Number(requestBody.SSM) || 0, // Convert to number, default 0
    ownMatch: Number(requestBody.STUM) || 0, // Convert to number, default 0
    joinMatch: Number(requestBody.JM) || 0, // Convert to number, default 0
    supervisorName: user?.displayName || '', // Where does this come from? Session user? Needs clarification.
    isSigned: 1// Does the form submit this? Defaults to 0 in schema.
    // createdDate: Handled by DB default on insert, not updated here.
  }

  try {
    // --- 4. Check if Report Exists ---
    logger.debug(`Checking for existing report with studentRecordId: ${requestBody.studentRecordId}`)
    const existingReport = await db.query.supervisorReports.findFirst({
      where: eq(supervisorReports.studentRecordId, requestBody.studentRecordId),
      columns: { // Only select the ID, it's enough to check existence
        id: true
      }
    })

    let savedReportId: number | null = null

    if (existingReport) {
      // --- 5a. Update Existing Report ---
      logger.info(`Updating existing supervisor report (ID: ${existingReport.id})`)
      await db.update(supervisorReports)
        .set(reportData)
        .where(eq(supervisorReports.id, existingReport.id)) // Update by primary key
        .execute() // Use execute() for SQLite update/insert without returning
      savedReportId = existingReport.id
      logger.info(`Successfully updated report ID: ${savedReportId}`)
      event.node.res.statusCode = 200 // OK
    }
    else {
      // --- 5b. Insert New Report ---
      logger.info('No existing report found, inserting new supervisor report.')
      // Ensure supervisorName is set - Example: Get from session or another source
      const supervisorNameFromAuth = user.displayName // TODO: Replace with actual logic (e.g., session.user.name)

      const insertResult = await db.insert(supervisorReports)
        .values({
          studentRecordId: requestBody.studentRecordId,
          supervisorName: supervisorNameFromAuth, // TODO: Set this appropriately!
          ...reportData
          // isSigned defaults to 0 in schema
          // createdDate defaults to now() in schema
        })
      // .returning({ id: supervisorReports.id }) // .returning() often NOT supported well by default SQLite drivers like better-sqlite3
        .execute() // Use execute()

      // Since .returning might not work reliably, we might query again if ID is needed
      // Or just trust the insert worked if no error was thrown.
      // For now, let's assume success if no error.
      logger.info(`Successfully inserted new report for studentRecordId: ${requestBody.studentRecordId}`)
      // If you need the ID, you might need to query:
      // const newReport = await db.query.supervisorReports.findFirst({ where: eq(supervisorReports.studentRecordId, requestBody.studentRecordId), columns: { id: true } });
      // savedReportId = newReport?.id ?? null;

      // event.node.res.statusCode = 201 // Created
    }

    // --- 6. Return Success Response ---
    return {
      success: true,
      message: existingReport ? 'Report updated successfully.' : 'Report created successfully.'
      // reportId: savedReportId // Optionally return the ID if retrieved
    }
  }
  catch (error: any) {
    logger.error('Database error saving/updating supervisor report:', {
      studentRecordId: requestBody.studentRecordId,
      error: error.message,
      stack: error.stack // Log stack in dev/debug
    })
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save supervisor report due to a database error.'
    })
  }
})
