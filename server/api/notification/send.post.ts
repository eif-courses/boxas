// server/api/webhook/send.post.ts
import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    // Get text from request body
    const { text } = await readBody(event)

    if (!text) {
      return {
        statusCode: 400,
        body: 'Missing text parameter'
      }
    }

    // The webhook URL
    const webhookUrl = 'https://webhookbot.c-toss.com/api/bot/webhooks/052488de-4a34-418f-b8f6-5ff304acc6b3'

    // Send to webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    })

    if (!response.ok) {
      throw new Error(`Webhook responded with status: ${response.status}`)
    }

    // Return success
    return {
      statusCode: 200,
      body: 'Message sent successfully'
    }
  }
  catch (error: any) {
    console.error('Error forwarding to webhook:', error)

    return {
      statusCode: 500,
      body: error.message || 'Error sending message to webhook'
    }
  }
})
