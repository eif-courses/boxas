// server/api/email/send.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { getGraphToken } from '~~/server/utils/msalClient' // Adjust path if necessary
import { useRuntimeConfig } from '#imports'

// Define expected body structure
interface EmailPayload {
  to: string | string[]
  subject: string
  body: string
  isHtml?: boolean
  cc?: string | string[]
  bcc?: string | string[]
}

export default defineEventHandler(async (event) => {
  // Inject logger if available via context, otherwise use console
  const logger = event.context.logger || console
  const config = useRuntimeConfig(event)
  logger.info('Processing send email request via MS Graph...')

  let payload: EmailPayload
  try {
    payload = await readBody<EmailPayload>(event)
    logger.debug('Request body parsed successfully.', { keys: Object.keys(payload) })
  }
  catch (error: any) {
    logger.error('Failed to read email request body:', error)
    throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' })
  }

  const { to, subject, body, isHtml = true, cc, bcc } = payload

  // --- Validate required fields ---
  if (!to || !subject || !body) {
    logger.warn('Email request missing required fields (to, subject, body).')
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields: to, subject, body' })
  }
  if (!config.azureAppMailUserId) {
    logger.error('Configuration Error: Sending User ID/UPN (NUXT_AZURE_APP_MAIL_USER_ID) is not configured.')
    throw createError({ statusCode: 500, statusMessage: 'Email sending configuration is incomplete.' })
  }
  logger.info(`Attempting to send email FROM '${config.azureAppMailUserId}' TO '${Array.isArray(to) ? to.join(', ') : to}'`)

  try {
    // --- 1. Get Access Token for Graph API ---
    logger.debug('Acquiring Graph API token...')
    const accessToken = await getGraphToken() // Call the utility function

    // --- DETAILED LOGGING & VALIDATION ---
    if (!accessToken || typeof accessToken !== 'string' || accessToken.trim().length === 0) {
      logger.error('!!! CRITICAL: getGraphToken returned an invalid token!', { tokenValue: accessToken })
      throw createError({ statusCode: 500, statusMessage: 'Internal error: Failed to retrieve valid access token from MSAL.' })
    }
    const tokenPreview = `${accessToken.substring(0, 10)}...${accessToken.substring(accessToken.length - 5)}`
    logger.debug(`Graph API token received in handler. Length: ${accessToken.length}, Preview: ${tokenPreview}`)
    // --- END LOGGING ---

    // --- 2. Construct Email Message Payload for Graph ---
    const formatRecipients = (recipients: string | string[] | undefined) => {
      if (!recipients) return []
      const list = Array.isArray(recipients) ? recipients : [recipients]
      // Add basic email validation or sanitization if needed
      return list.filter(email => email && typeof email === 'string' && email.includes('@')) // Basic check
        .map(email => ({ emailAddress: { address: email.trim() } }))
    }

    const toRecipients = formatRecipients(to)
    if (toRecipients.length === 0) {
      logger.warn('No valid \'to\' recipients after formatting.')
      throw createError({ statusCode: 400, statusMessage: 'Invalid or missing "to" email address.' })
    }

    const mail = {
      message: {
        subject: subject,
        body: {
          contentType: isHtml ? 'HTML' : 'Text',
          content: body
        },
        toRecipients: toRecipients,
        ccRecipients: formatRecipients(cc),
        bccRecipients: formatRecipients(bcc)
      },
      saveToSentItems: 'true'
    }

    // --- 3. Call MS Graph API SendMail Endpoint ---
    const sendingUserId = config.azureAppMailUserId // Read from config
    const graphApiUrl = `https://graph.microsoft.com/v1.0/users/${sendingUserId}/sendMail`
    logger.info(`Calling MS Graph API: POST ${graphApiUrl}`)

    // Log headers being sent (excluding token value in production if possible)
    const headersToSend = {
      'Authorization': `Bearer ${accessToken}`, // Critical Header
      'Content-Type': 'application/json'
    }
    logger.debug('Sending request with headers:', {
      'Authorization': `Bearer ${tokenPreview}`, // Log only preview
      'Content-Type': headersToSend['Content-Type']
    })

    // Use $fetch
    await $fetch(graphApiUrl, {
      method: 'POST',
      headers: headersToSend, // Use the headers object
      body: mail
    })

    logger.info('Email sent successfully via MS Graph.', { recipientCount: toRecipients.length })
    return { success: true, message: 'Email sent successfully via MS Graph API.' }
  }
  catch (error: any) {
    // Log details from H3/FetchError or MSAL error
    logger.error('MS Graph API send mail error caught in handler:', {
      statusCode: error.response?.status || error.statusCode || 500,
      statusMessage: error.statusMessage,
      message: error.data?.error?.message || error.message, // Prioritize Graph message
      graphErrorData: error.data, // Log the full Graph error data if available
      stack: error.stack // Optional: log stack in dev
    })

    const graphErrorMessage = error.data?.error?.message || 'Failed to send email via Graph API.'
    // Use status code from the error if it's an H3 error, otherwise default to 500
    const statusCode = error.statusCode || error.response?.status || 500

    throw createError({
      statusCode: statusCode >= 400 && statusCode < 500 ? statusCode : 500,
      statusMessage: statusCode === 401
        ? 'Unauthorized: Token invalid or permissions missing.'
        : statusCode === 403
          ? 'Forbidden: Check API permissions or ApplicationAccessPolicy.'
          : 'Failed to send email.',
      data: { message: graphErrorMessage }
    })
  }
})
