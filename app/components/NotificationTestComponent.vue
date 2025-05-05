<script setup>
import { ref } from 'vue'
import { useSimpleWebhook } from '~/composables/useSimpleWebhook'

const message = ref('')
const { sendMessage, isLoading, error, lastResponse } = useSimpleWebhook()

// Function to handle form submission
const submitMessage = async () => {
  if (!message.value.trim()) return

  const success = await sendMessage(message.value)
  if (success) {
    message.value = '' // Clear message after successful send
  }
}

// For direct notification without user input
const notifyTeams = async () => {
  await sendMessage('User completed their profile update')
}
</script>

<template>
  <div class="webhook-test p-4 max-w-md mx-auto">
    <h2 class="text-xl font-bold mb-4">
      Test Webhook
    </h2>

    <form
      class="space-y-4"
      @submit.prevent="submitMessage"
    >
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
        <textarea
          v-model="message"
          rows="3"
          class="block w-full border border-gray-300 rounded-md shadow-sm p-2"
          placeholder="Enter message to send to webhook"
          required
        />
      </div>

      <button
        type="submit"
        class="bg-blue-500 text-white px-4 py-2 rounded-md w-full"
        :disabled="isLoading || !message.trim()"
      >
        {{ isLoading ? 'Sending...' : 'Send to Webhook' }}
      </button>
    </form>

    <!-- Status display -->
    <div
      v-if="lastResponse"
      class="mt-4 p-3 bg-green-100 text-green-800 rounded-md"
    >
      Message sent successfully!
    </div>

    <div
      v-if="error"
      class="mt-4 p-3 bg-red-100 text-red-800 rounded-md"
    >
      {{ error.message }}
    </div>
  </div>
</template>
