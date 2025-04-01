import jwt from 'jsonwebtoken'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  //const body = await readBody(event)

  // if (!body.role || !body.userId) {
  //   throw createError({ statusCode: 400, statusMessage: 'Missing role or userId' })
  // }

  const config = useRuntimeConfig()
  const SECRET_KEY = config.JWT_SECRET

  // Extract `sign` method from `jsonwebtoken`
  const { sign } = jwt

  const token = sign(
    { userId: 'body.userId', role: 'body.role' },
    SECRET_KEY,
    { expiresIn: '24h' } // Set expiration
  )

  return { link: `${config.public.APP_URL}/temporary-access?token=${token}` }
})
