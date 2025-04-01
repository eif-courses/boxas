import jwt from 'jsonwebtoken'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  if (!query.token) {
    throw createError({ statusCode: 400, statusMessage: 'Missing token' })
  }

  const config = useRuntimeConfig()
  const SECRET_KEY = config.JWT_SECRET

  try {
    // Extract `verify` method from `jsonwebtoken`
    const { verify } = jwt

    const payload = verify(query.token, SECRET_KEY)

    return { success: true, user: payload }
  }
  catch (error) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired token' })
  }
})
