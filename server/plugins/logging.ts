import { defineNitroPlugin } from 'nitropack/runtime'

// Define a symbol for storing timestamp to avoid TypeScript issues
const REQUEST_TIMESTAMP = Symbol('requestTimestamp')

// Define paths to be logged
const LOGGED_PATHS = [
  '/api/students/',
  '/api/auth',
  '/api/blob',
  '/api/users',
  '/api/import-csv'
]

// Helper function to check if path should be logged
function shouldLogPath(path) {
  // Skip internal KV operations
  if (path.startsWith('/api/_hub/kv/')) {
    return false
  }

  // Check if path matches any of the logged paths
  return LOGGED_PATHS.some(loggedPath => path.startsWith(loggedPath))
}

export default defineNitroPlugin((nitroApp) => {
  // Add logger to each request
  nitroApp.hooks.hook('request', async (event) => {
    // Only log specific paths
    if (!shouldLogPath(event.path)) {
      // Still add logger to context so endpoints can use it, but don't log the request
      const noopLogger = {
        info: () => Promise.resolve(),
        warn: () => Promise.resolve(),
        error: async (message, data) => {
          // Always log errors regardless of path
          console.error(`[ERROR] [${event.path}] ${message}`, data || '')
        },
        debug: () => Promise.resolve()
      }

      event.context.logger = noopLogger
      return
    }

    const requestId = crypto.randomUUID()
    event.context.requestId = requestId

    // Store timestamp using Symbol to avoid TypeScript issues
    // @ts-ignore - Using symbol property
    event[REQUEST_TIMESTAMP] = Date.now()

    // Create logger functions
    event.context.logger = {
      info: async (message: string, data?: any) => {
        const logEntry = {
          level: 'info',
          requestId,
          path: event.path,
          method: event.method,
          message,
          data,
          timestamp: new Date().toISOString()
        }

        // Store log in NuxtHub KV - using hubKV() as a function
        const kv = hubKV()
        await kv.set(`log:${Date.now()}:${requestId}`, logEntry, {
          ttl: 60 * 60 * 24 * 7 // 7 days retention
        })

        // Also log to console in development
        if (import.meta.dev) {
          console.log(`[INFO] [${requestId}] ${message}`, data || '')
        }
      },

      warn: async (message: string, data?: any) => {
        const logEntry = {
          level: 'warn',
          requestId,
          path: event.path,
          method: event.method,
          message,
          data,
          timestamp: new Date().toISOString()
        }

        // Store warning log with medium retention
        const kv = hubKV()
        await kv.set(`warn:${Date.now()}:${requestId}`, logEntry, {
          ttl: 60 * 60 * 24 * 14 // 14 days retention for warnings
        })

        // Always log warnings to console
        console.warn(`[WARN] [${requestId}] ${message}`, data || '')
      },

      error: async (message: string, data?: any) => {
        const logEntry = {
          level: 'error',
          requestId,
          path: event.path,
          method: event.method,
          message,
          data,
          timestamp: new Date().toISOString()
        }

        // Store error log with longer retention
        const kv = hubKV()
        await kv.set(`error:${Date.now()}:${requestId}`, logEntry, {
          ttl: 60 * 60 * 24 * 30 // 30 days retention for errors
        })

        // Always log errors to console
        console.error(`[ERROR] [${requestId}] ${message}`, data || '')
      },

      debug: async (message: string, data?: any) => {
        if (!import.meta.dev) return // Only log debug in development

        const logEntry = {
          level: 'debug',
          requestId,
          path: event.path,
          method: event.method,
          message,
          data,
          timestamp: new Date().toISOString()
        }

        const kv = hubKV()
        await kv.set(`debug:${Date.now()}:${requestId}`, logEntry, {
          ttl: 60 * 60 * 24 * 2 // 2 days retention for debug logs
        })

        console.log(`[DEBUG] [${requestId}] ${message}`, data || '')
      }
    }

    // Log the request
    await event.context.logger.info('Request received', {
      query: Object.fromEntries(
        Object.entries(getQuery(event)).filter(([key]) => !key.includes('password'))
      ),
      headers: Object.fromEntries([...event.headers.entries()].filter(([key]) =>
        ['user-agent', 'content-type', 'accept'].includes(key.toLowerCase())
      ))
    })
  })

  // Log response
  nitroApp.hooks.hook('beforeResponse', async (event, response) => {
    // Only log specific paths
    if (!shouldLogPath(event.path)) {
      return
    }

    if (event.context.logger) {
      // Get the stored timestamp using the symbol
      // @ts-ignore - Using symbol property
      const requestTimestamp = event[REQUEST_TIMESTAMP] || Date.now()

      // Check if response and status are available
      const statusCode = response?.statusCode || response?.status || 200

      await event.context.logger.info('Response sent', {
        status: statusCode,
        duration: Date.now() - requestTimestamp
      })
    }
  })

  // Log errors
  nitroApp.hooks.hook('error', async (error, event) => {
    // Always log errors regardless of path
    if (event.context.logger) {
      await event.context.logger.error('Request error', {
        error: error.message,
        stack: error.stack
      })
    }
  })
})
