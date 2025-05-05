// composables/useTeamsNotification.ts
import { ref } from 'vue'

export interface NotificationPayload {
  message: string
  title?: string
  color?: string
  details?: Record<string, any>
}

export interface NotificationResponse {
  success: boolean
  message: string
}

export const useTeamsNotification = () => {
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const lastResponse = ref<NotificationResponse | null>(null)

  /**
     * Send a notification to Microsoft Teams via webhook
     */
  const sendNotification = async (payload: NotificationPayload): Promise<NotificationResponse> => {
    isLoading.value = true
    error.value = null

    try {
      // Call our API endpoint that handles the Teams webhook
      const response = await $fetch<NotificationResponse>('/api/notification/send', {
        method: 'POST',
        body: payload
      })

      lastResponse.value = response
      return response
    }
    catch (err: any) {
      error.value = err
      const errorMessage = err.data?.message || err.message || 'Failed to send notification'
      const errorResponse = {
        success: false,
        message: errorMessage
      }
      lastResponse.value = errorResponse
      return errorResponse
    }
    finally {
      isLoading.value = false
    }
  }

  /**
     * Send a simple text-only notification
     */
  const sendSimpleNotification = (message: string, title?: string) => {
    return sendNotification({ message, title })
  }

  /**
     * Send an error notification (red color)
     */
  const sendErrorNotification = (message: string, title = 'Error', details?: Record<string, any>) => {
    return sendNotification({
      message,
      title,
      color: 'FF0000',
      details
    })
  }

  /**
     * Send a success notification (green color)
     */
  const sendSuccessNotification = (message: string, title = 'Success', details?: Record<string, any>) => {
    return sendNotification({
      message,
      title,
      color: '008000',
      details
    })
  }

  /**
     * Send a warning notification (yellow color)
     */
  const sendWarningNotification = (message: string, title = 'Warning', details?: Record<string, any>) => {
    return sendNotification({
      message,
      title,
      color: 'FFA500',
      details
    })
  }

  return {
    sendNotification,
    sendSimpleNotification,
    sendErrorNotification,
    sendSuccessNotification,
    sendWarningNotification,
    isLoading,
    error,
    lastResponse
  }
}
