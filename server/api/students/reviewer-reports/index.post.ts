// server/api/reviewer-reports.post.ts

import { defineEventHandler, readBody, createError } from 'h3'
import { eq, sql } from 'drizzle-orm' // Import eq and sql
import { reviewerReports } from '~~/server/database/schema' // Adjust path

// import { requireUserSession } from '#auth'; // If using auth

export interface SaveReviewerReportPayload {
  studentRecordId: number // Crucial identifier
  REVIEWER_FULL_DETAILS: string
  REVIEW_GOALS: string
  REVIEW_THEORY: string
  REVIEW_PRACTICAL: string
  REVIEW_THEORY_PRACTICAL_LINK: string
  REVIEW_RESULTS: string
  REVIEW_PRACTICAL_SIGNIFICANCE?: string | null // Optional based on schema
  REVIEW_LANGUAGE: string
  REVIEW_PROS: string
  REVIEW_CONS: string
  REVIEW_QUESTIONS: string
  FINAL_GRADE: number | string // Will be converted to number
  // isSigned is handled by DB default or separate logic
  // REPORT_DATE from form isn't used, DB uses createdDate
}
export default defineEventHandler(async (event) => {
  const db = useDB()
  const logger = event.context.logger || console

  // --- 1. Authorization (Placeholder - Implement!) ---
  // Ensure the user is authorized (e.g., is the assigned reviewer or admin)
  // const session = await requireUserSession(event);
  // if (!isUserAuthorizedForReview(session.user, requestBody.studentRecordId)) {
  //   throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  // }
  // --- ---

  // --- 2. Read and Validate Request Body ---
  let requestBody: SaveReviewerReportPayload
  try {
    requestBody = await readBody<SaveReviewerReportPayload>(event)
  }
  catch (error: any) {
    logger.error('Failed to read request body:', error)
    throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
  }

  if (requestBody.studentRecordId === undefined || requestBody.studentRecordId === null) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required field: studentRecordId' })
  }
  // Add more validation for required text fields if necessary
  const grade = Number(requestBody.FINAL_GRADE)
  if (isNaN(grade) || grade < 0 || grade > 10) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid value for FINAL_GRADE, must be a number between 0 and 10' })
  }

  logger.info(`Received request to save/update reviewer report for studentRecordId: ${requestBody.studentRecordId}`)

  // --- 3. Map Payload to Database Columns ---
  const reportData = {
    reviewerPersonalDetails: requestBody.REVIEWER_FULL_DETAILS || '',
    grade: grade, // Use the validated number
    reviewGoals: requestBody.REVIEW_GOALS || '',
    reviewTheory: requestBody.REVIEW_THEORY || '',
    reviewPractical: requestBody.REVIEW_PRACTICAL || '',
    reviewTheoryPracticalLink: requestBody.REVIEW_THEORY_PRACTICAL_LINK || '',
    reviewResults: requestBody.REVIEW_RESULTS || '',
    reviewPracticalSignificance: requestBody.REVIEW_PRACTICAL_SIGNIFICANCE || null, // Allow null if optional
    reviewLanguage: requestBody.REVIEW_LANGUAGE || '',
    reviewPros: requestBody.REVIEW_PROS || '',
    reviewCons: requestBody.REVIEW_CONS || '',
    reviewQuestions: requestBody.REVIEW_QUESTIONS || ''
    // isSigned: ?? // Handle separately if needed, defaults to 0
    // createdDate: Handled by DB default on insert
  }

  try {
    // --- 4. Check if Report Exists ---
    logger.debug(`Checking for existing reviewer report with studentRecordId: ${requestBody.studentRecordId}`)
    const existingReport = await db.query.reviewerReports.findFirst({
      where: eq(reviewerReports.studentRecordId, requestBody.studentRecordId),
      columns: { id: true } // Only need ID
    })

    let savedReportId: number | null = null

    if (existingReport) {
      // --- 5a. Update Existing Report ---
      logger.info(`Updating existing reviewer report (ID: ${existingReport.id})`)
      // NOTE: We typically don't update createdDate
      await db.update(reviewerReports)
        .set(reportData) // Set all mapped fields
        .where(eq(reviewerReports.id, existingReport.id))
        .execute()
      savedReportId = existingReport.id
      logger.info(`Successfully updated reviewer report ID: ${savedReportId}`)
      event.node.res.statusCode = 200 // OK
    }
    else {
      // --- 5b. Insert New Report ---
      logger.info('No existing reviewer report found, inserting new.')
      const insertResult = await db.insert(reviewerReports)
        .values({
          studentRecordId: requestBody.studentRecordId,
          ...reportData
          // isSigned defaults to 0 in schema
          // createdDate defaults to now() in schema
        })
        .execute() // Use execute()

      // Assuming success if no error, retrieving ID might require another query
      logger.info(`Successfully inserted new reviewer report for studentRecordId: ${requestBody.studentRecordId}`)
      event.node.res.statusCode = 201 // Created
    }

    // --- 6. Return Success Response ---
    return {
      success: true,
      message: existingReport ? 'Reviewer report updated successfully.' : 'Reviewer report created successfully.'
      // reportId: savedReportId // Optionally return ID
    }
  }
  catch (error: any) {
    logger.error('Database error saving/updating reviewer report:', {
      studentRecordId: requestBody.studentRecordId,
      error: error.message,
      stack: error.stack
    })
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save reviewer report due to a database error.'
    })
  }
})
