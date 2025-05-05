import { ref } from 'vue'
import { useFetch } from '#app'

export function useEmailNotifications() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastSentEmail = ref<null | {
    to: string
    subject: string
    timestamp: Date
  }>(null)

  async function sendEmail({
    to,
    subject,
    body,
    isHtml = true
  }: {
    to: string
    subject: string
    body: string
    isHtml?: boolean
  }) {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await useFetch('/api/email/send', {
        method: 'POST',
        body: {
          to,
          subject,
          body,
          isHtml
        }
      })

      if (fetchError.value) {
        throw new Error(
          fetchError.value.data?.message
          || fetchError.value.statusMessage
          || 'Failed to send email'
        )
      }

      // Update last sent email details
      lastSentEmail.value = {
        to,
        subject,
        timestamp: new Date()
      }

      return data.value
    }
    catch (err: any) {
      error.value = err.message || 'Failed to send email'
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  // Helper method to send a notification for specific events
  async function sendNotification(emailAddress: string, templateName: string, params: Record<string, any> = {}) {
    // You could extend this to use different templates
    let subject = ''
    let body = ''

    switch (templateName) {
      case 'welcome':
        subject = 'Welcome to our platform'
        body = `<h1>Welcome ${params.name || 'User'}!</h1>
                <p>Thank you for joining our platform. We're excited to have you on board.</p>`
        break
      case 'password-reset':
        subject = 'Password Reset Request'
        body = `<h1>Password Reset</h1>
                <p>Click <a href="${params.resetLink}">here</a> to reset your password.</p>
                <p>If you didn't request this, please ignore this email.</p>`
        break
        // Add more templates as needed
      default:
        subject = params.subject || 'Notification'
        body = params.body || 'This is a notification from our platform.'
    }

    return sendEmail({
      to: emailAddress,
      subject,
      body,
      isHtml: true
    })
  }

  return {
    isLoading,
    error,
    lastSentEmail,
    sendEmail,
    sendNotification
  }
}
