// composables/useSimpleWebhook.ts
import { ref } from 'vue'

export const useSimpleWebhook = () => {
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const lastResponse = ref<any>(null)

  /**
     * Send a simple text notification to the webhook
     */
  const sendMessage = async (text: string): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      // Call our local API endpoint instead of the webhook directly
      const response = await fetch('/api/notification/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      })

      if (!response.ok) {
        throw new Error(`Error sending webhook: ${response.status} ${response.statusText}`)
      }

      lastResponse.value = await response.text() || 'Message sent successfully'
      return true
    }
    catch (err: any) {
      error.value = err
      console.error('Webhook error:', err)
      return false
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    sendMessage,
    isLoading,
    error,
    lastResponse
  }
}
