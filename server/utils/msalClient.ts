// server/utils/msalClient.ts
import type { Configuration } from '@azure/msal-node'
import { ConfidentialClientApplication, LogLevel } from '@azure/msal-node'
import { useRuntimeConfig } from '#imports' // Nuxt helper

let confidentialClientApplication: ConfidentialClientApplication | null = null

function getMsalClient(): ConfidentialClientApplication {
  const logger = (globalThis as any)?.event?.context?.logger || console // Try to get request logger

  if (!confidentialClientApplication) {
    logger.info('Initializing MSAL Confidential Client Application...')
    const config = useRuntimeConfig() // Access environment variables

    const msalConfig: Configuration = {
      auth: {
        clientId: config.azureAppClientId || '',
        authority: `https://login.microsoftonline.com/${config.azureAppTenantId || ''}`,
        clientSecret: config.azureAppClientSecret || ''
      },
      system: {
        loggerOptions: {
          logLevel: process.env.NODE_ENV === 'development' ? LogLevel.Verbose : LogLevel.Warning, // Keep verbose for debugging for now
          loggerCallback(loglevel, message, containsPii) {
            // Use Nuxt logger if available, otherwise console
            const reqLogger = (globalThis as any)?.event?.context?.logger || console
            const logFunc = reqLogger[LogLevel[loglevel].toLowerCase()] || reqLogger.log || console.log
            // Avoid logging PII in production unless explicitly allowed
            if (!containsPii || process.env.NODE_ENV === 'development') {
              logFunc(`MSAL Internal: ${message}`)
            }
          },
          piiLoggingEnabled: process.env.NODE_ENV === 'development'
        }
      }
    }

    // Basic validation
    if (!msalConfig.auth.clientId || !msalConfig.auth.clientSecret || !(config.azureAppTenantId)) {
      logger.error('FATAL: Missing Azure App Registration credentials for MSAL (Client ID, Secret, Tenant ID). Check runtime config/environment variables.')
      // Log loaded values (MASK SECRET in production logs if possible)
      logger.debug(`Loaded MSAL Config - ClientID: ${msalConfig.auth.clientId}, TenantID: ${config.azureAppTenantId}, Secret Present: ${!!msalConfig.auth.clientSecret}`)
      throw new Error('Missing or incomplete MSAL configuration.')
    }

    confidentialClientApplication = new ConfidentialClientApplication(msalConfig)
    logger.info('MSAL Confidential Client Application initialized successfully.')
  }
  return confidentialClientApplication
}

export async function getGraphToken(): Promise<string> {
  const logger = (globalThis as any)?.event?.context?.logger || console
  const client = getMsalClient()
  const config = useRuntimeConfig()

  if (!config.azureAppClientId) {
    logger.error('Configuration Error: Azure App Client ID not found in runtime config.')
    throw new Error('Azure App Client ID not configured.')
  }

  const tokenRequest = {
    scopes: ['https://graph.microsoft.com/.default'] // Correct scope for client credentials
  }

  logger.info('MSAL: Attempting to acquire token via client credentials...')
  try {
    const response = await client.acquireTokenByClientCredential(tokenRequest)

    if (!response || !response.accessToken) {
      logger.error('MSAL: Failed to acquire token. Response missing access token.', { responseDetails: response }) // Log details if available
      throw new Error('Failed to acquire Graph token: No access token received.')
    }

    // --- DETAILED LOGGING ---
    const tokenValue = response.accessToken
    const tokenPreview = tokenValue ? `${tokenValue.substring(0, 10)}...${tokenValue.substring(tokenValue.length - 5)}` : 'N/A'
    logger.info(`MSAL: Acquired token successfully. Length: ${tokenValue?.length ?? 'N/A'}, Preview: ${tokenPreview}`)
    // --- END LOGGING ---

    return tokenValue // Return the actual token
  }
  catch (error: any) {
    logger.error('MSAL: Error during acquireTokenByClientCredential', {
      errorCode: error.errorCode,
      errorMessage: error.errorMessage,
      subError: error.subError
      // stack: error.stack // Optionally log stack in dev
    })
    throw new Error(`Failed to acquire Graph token: ${error.errorMessage || error}`)
  }
}
