import { hubKV } from '@nuxthub/core/dist/runtime/kv/server/utils/kv'

export default defineEventHandler(async (event) => {
  // Check authorization
  const { user } = await requireUserSession(event)

  if (!user) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // Confirm deletion request
  const query = getQuery(event)
  if (query.confirm !== 'true') {
    return {
      success: false,
      message: 'Please confirm deletion by adding ?confirm=true to the URL'
    }
  }

  try {
    const kv = hubKV()
    const prefixes = ['log:', 'error:', 'warn:', 'debug:']
    const results = {}
    let totalDeleted = 0

    // Function to safely delete a key with retry mechanism
    async function safeDelete(key) {
      let retries = 3
      while (retries--) {
        try {
          await kv.del(key)
          return
        }
        catch (error) {
          if (error.message.includes('Too many API requests')) {
            await new Promise(resolve => setTimeout(resolve, 500)) // Delay before retry
          }
          else {
            throw error // Re-throw unknown errors
          }
        }
      }
    }

    // Process each log type
    for (const prefix of prefixes) {
      const keys = await kv.keys(prefix)
      results[prefix] = keys.length
      totalDeleted += keys.length

      // Delete keys in controlled batches
      const batchSize = 50
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize)
        for (const key of batch) {
          await safeDelete(key)
        }
        await new Promise(resolve => setTimeout(resolve, 200)) // Delay after each batch
      }
    }

    return {
      success: true,
      message: `Successfully deleted ${totalDeleted} log entries`,
      deleted: results
    }
  }
  catch (error) {
    console.error('Failed to clear logs:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to clear logs: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
})
