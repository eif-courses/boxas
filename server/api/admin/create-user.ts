import { defineEventHandler, readBody, createError } from 'h3'

const TENANT_ID = process.env.AZURE_TENANT_ID
const CLIENT_ID = process.env.AZURE_CLIENT_ID
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET

export default defineEventHandler(async (event) => {
  try {
    // Read request body
    const { displayName, email, password } = await readBody(event)

    // Validate required fields
    if (!displayName || !email || !password) {
      throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
    }

    // Fetch Access Token from Azure Entra ID
    const tokenResponse = await $fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      })
    })

    if (!tokenResponse.access_token) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to retrieve access token' })
    }

    // Create User in Azure Entra ID
    const userResponse = await $fetch('https://graph.microsoft.com/v1.0/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenResponse.access_token}`,
        'Content-Type': 'application/json'
      },
      body: {
        accountEnabled: true,
        displayName,
        mailNickname: email.split('@')[0],
        userPrincipalName: email,
        passwordProfile: {
          forceChangePasswordNextSignIn: true,
          password
        }
      }
    })

    return { success: true, message: `User created: ${userResponse.userPrincipalName}`, userId: userResponse.id }
  }
  catch (error) {
    console.error('Azure Error:', error?.response?._data || error)
    throw createError({ statusCode: 500, statusMessage: error.statusMessage || 'Azure API Request Failed' })
  }
})
