// server/api/admin/clear-logs.ts
import { hubKV } from '@nuxthub/core/dist/runtime/kv/server/utils/kv'

export default defineEventHandler(async (event) => {
  // Check authorization
  const { user } = await requireUserSession(event)

  // TODO add only admin clear logs
  if (!user) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // Get confirmation from query parameter
  const query = getQuery(event)
  const confirmed = query.confirm === 'true'

  if (!confirmed) {
    return {
      success: false,
      message: 'Please confirm deletion by adding ?confirm=true to the URL'
    }
  }

  try {
    const kv = hubKV()

    // Delete by prefix for each log type - this is more reliable than clear()
    const prefixes = ['log:', 'error:', 'warn:', 'debug:']
    const results = {}
    let totalDeleted = 0

    // Process each log type prefix
    for (const prefix of prefixes) {
      // Get all keys with this prefix
      const keys = await kv.keys(prefix)
      results[prefix] = keys.length
      totalDeleted += keys.length

      // Delete keys in batches to avoid overwhelming the system
      const batchSize = 100
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize)
        await Promise.all(batch.map(key => kv.del(key)))
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

    // More detailed error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    throw createError({
      statusCode: 500,
      statusMessage: `Failed to clear logs: ${errorMessage}`
    })
  }
})
