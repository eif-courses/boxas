import { hubKV } from '@nuxthub/core/dist/runtime/kv/server/utils/kv'

export default defineEventHandler(async (event) => {
  // Check authorization (implement your own auth logic)
  const { user } = await requireUserSession(event)

  if (!user) { // TODO add admin check
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const query = getQuery(event)
  const level = (query.level as string) || 'all'
  const limit = parseInt(query.limit as string) || 100
  const page = parseInt(query.page as string) || 1

  const kv = hubKV()

  // Get log keys with prefix filter
  let keys = []
  if (level === 'all') {
    // Get all logs (info, error, debug, warn)
    const infoKeys = await kv.keys('log:')
    const warnKeys = await kv.keys('warn:')
    const errorKeys = await kv.keys('error:')
    const debugKeys = await kv.keys('debug:')
    keys = [...infoKeys, ...warnKeys, ...errorKeys, ...debugKeys]
  }
  else {
    // Convert level to prefix
    const prefix = level === 'info' ? 'log:' : `${level}:`

    // Filter by specific level
    keys = await kv.keys(prefix)
  }

  // Sort by timestamp (newest first)
  keys.sort().reverse()

  // Paginate
  const startIndex = (page - 1) * limit
  const paginatedKeys = keys.slice(startIndex, startIndex + limit)

  // Retrieve log entries
  const logs = []
  for (const key of paginatedKeys) {
    const logEntry = await kv.get(key)
    if (logEntry) {
      logs.push(logEntry)
    }
  }

  return {
    total: keys.length,
    page,
    pages: Math.ceil(keys.length / limit),
    logs
  }
})
