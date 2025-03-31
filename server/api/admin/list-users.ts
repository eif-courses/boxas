import { defineEventHandler, createError } from 'h3'

const TENANT_ID = process.env.AZURE_TENANT_ID
const CLIENT_ID = process.env.AZURE_CLIENT_ID
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET

export default defineEventHandler(async (event) => {
  try {
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

    // Fetch Users from Azure Entra ID
    const usersResponse = await $fetch('https://graph.microsoft.com/v1.0/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenResponse.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    return { success: true, users: usersResponse.value }
  }
  catch (error) {
    console.error('Azure Error:', error?.response?._data || error)
    throw createError({ statusCode: 500, statusMessage: error.statusMessage || 'Azure API Request Failed' })
  }
})
