// server/api/pdf/signed-url.get.ts
import { z } from 'zod'
import { AwsClient } from 'aws4fetch'

interface CachedCredentials {
  credentials: {
    accessKeyId: string
    secretAccessKey: string
    sessionToken?: string
  }
  accountId: string
  bucketName: string
  expiresAt: number
}

const credentialsCache: Map<string, CachedCredentials> = new Map()

export default eventHandler(async (event) => {
  // Get logger from event context
  const logger = event.context.logger || console

  logger.info('Processing signed URL request')

  try {
    // Use getQuery instead of getValidatedRouterParams since parameters are in the query string
    const query = getQuery(event)

    // Validate the query parameters using Zod
    const validationSchema = z.object({
      pathname: z.string().min(1),
      mode: z.enum(['download', 'view']).default('view')
    })

    // Validate the query parameters
    const { pathname, mode } = validationSchema.parse(query)

    const { user } = await requireUserSession(event)
    if (!user) {
      logger.warn('Unauthorized access attempt', {
        endpoint: 'signed-url'
      })
      throw createError({ statusCode: 403, message: 'Access denied: User not authenticated' })
    }
    const userEmail = user.mail || user.email || user.userPrincipalName || user.preferred_username || ''

    logger.info('User authenticated', {
      email: userEmail,
      pathname: pathname,
      mode: mode
    })

    // Decode pathname in case special characters are causing issues
    const decodedPathname = decodeURIComponent(pathname)
    logger.debug('Decoded pathname', {
      original: pathname,
      decoded: decodedPathname
    })

    const currentTime = Date.now()

    let cached = credentialsCache.get(decodedPathname)
    let cacheStatus = 'miss'

    if (!cached || currentTime >= cached.expiresAt) {
      logger.debug('Cache miss or expired credentials', {
        path: decodedPathname,
        isCached: !!cached,
        expired: cached ? 'yes' : 'n/a',
        timeRemaining: cached ? (cached.expiresAt - currentTime) : 'n/a'
      })

      const blob = hubBlob()
      logger.debug('Requesting new credentials from R2')

      const { accountId, bucketName, ...credentials } = await blob.createCredentials({
        permission: 'object-read-only',
        pathnames: [decodedPathname]
      })

      // Cache the new credentials with an expiration time
      cached = {
        credentials,
        accountId,
        bucketName,
        expiresAt: currentTime + 60 * 60 * 1000 // Assume 1-hour validity
      }

      credentialsCache.set(decodedPathname, cached)
      logger.info('New credentials cached', {
        path: decodedPathname,
        expiresIn: '1 hour',
        cacheSize: credentialsCache.size
      })

      cacheStatus = 'new'
    }
    else {
      logger.debug('Using cached credentials', {
        path: decodedPathname,
        expiresIn: Math.floor((cached.expiresAt - currentTime) / 1000) + ' seconds'
      })

      cacheStatus = 'hit'
    }

    // Use cached credentials
    const client = new AwsClient(cached.credentials)

    // Create headers for Content-Disposition based on mode
    const queryParams = new URLSearchParams()

    // For S3/R2 we need to use query parameters instead of headers
    // Set content type
    queryParams.set('response-content-type', 'application/pdf')

    // For view mode, set inline disposition to prevent download
    if (mode === 'view') {
      const filename = pathname.split('/').pop() || 'document.pdf'
      queryParams.set('response-content-disposition', `inline; filename="${filename}"`)
    }
    else {
      const filename = pathname.split('/').pop() || 'document.pdf'
      queryParams.set('response-content-disposition', `attachment; filename="${filename}"`)
    }

    // Use the bucketName and accountId from the cached credentials
    const endpoint = new URL(
      `https://${cached.bucketName}.${cached.accountId}.r2.cloudflarestorage.com/${decodedPathname}`
    )

    // Add the queryParams to the endpoint
    endpoint.search = queryParams.toString()

    logger.debug('Generated endpoint', {
      endpoint: endpoint.toString(),
      bucketName: cached.bucketName,
      mode: mode
    })

    const signedRequest = await client.sign(endpoint, {
      method: 'GET',
      aws: { signQuery: true }
    })

    logger.info('Generated signed URL successfully', {
      path: decodedPathname,
      cacheStatus,
      urlLength: signedRequest.url.length,
      mode: mode
    })

    // Log this access for auditing
    await logDocumentAccess({
      user: userEmail,
      document: decodedPathname,
      mode: mode,
      timestamp: new Date().toISOString(),
      ip: getRequestIP(event) || 'unknown'
    })

    return { url: signedRequest.url }
  }
  catch (error) {
    logger.error('Error generating signed URL', {
      error: error.message,
      stack: error.stack
    })

    if (error.errors) {
      throw createError({
        statusCode: 400,
        message: `Invalid request parameters: ${JSON.stringify(error.errors)}`
      })
    }

    throw createError({ statusCode: 500, message: 'Internal Server Error' })
  }
})

// Helper function to log document access
async function logDocumentAccess(accessData) {
  // Implement logging to your database or logging service
  console.log('Document access:', accessData)
  // In a real implementation, you would store this in a database
}
