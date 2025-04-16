<template>
  <div class="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3 space-y-3">
    <div
      v-for="comment in fieldComments"
      :key="comment.id"
      class="comment-thread"
    >
      <!-- Main comment -->
      <div
        :class="['p-2 rounded-md text-sm',
                 comment.role === 'supervisor'
                   ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800'
                   : 'bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800']"
      >
        <div class="flex items-start">
          <!-- Author Badge -->
          <UBadge
            :color="comment.role === 'supervisor' ? 'blue' : 'purple'"
            variant="subtle"
            size="xs"
            class="mr-2 mt-0.5 flex-shrink-0 font-mono"
          >
            {{ comment.role === 'supervisor' ? 'S' : 'U' }}
          </UBadge>

          <!-- Comment Content -->
          <div class="flex-1">
            <div class="flex justify-between items-center">
              <p class="text-xs font-medium text-gray-800 dark:text-gray-200">
                {{ comment.authorName || (comment.role === 'supervisor' ? $t('supervisor') : $t('student')) }}
              </p>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatDate(comment.createdAt || comment.createdDate) }}
              </span>
            </div>
            <p class="mt-1 text-gray-700 dark:text-gray-300">
              {{ comment.text }}
            </p>

            <!-- Reply Button -->
            <button
              v-if="canReply && replyingTo !== comment.id"
              class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mt-1 font-medium"
              @click="startReply(comment.id)"
            >
              {{ $t('reply') || 'Reply' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Reply form -->
      <div
        v-if="replyingTo === comment.id"
        class="ml-8 mt-2 pl-2 border-l-2 border-gray-200 dark:border-gray-700"
      >
        <UTextarea
          v-model="replyText"
          rows="2"
          :placeholder="$t('type_your_reply') || 'Type your reply...'"
          class="text-sm mb-1"
          autoresize
        />
        <div class="flex justify-end space-x-2 mt-1">
          <UButton
            size="xs"
            color="gray"
            variant="ghost"
            @click="cancelReply"
          >
            {{ $t('cancel') || 'Cancel' }}
          </UButton>
          <UButton
            size="xs"
            color="primary"
            :loading="isSubmittingReply"
            @click="submitReply(comment.id)"
          >
            {{ $t('reply') || 'Reply' }}
          </UButton>
        </div>
      </div>

      <!-- Replies -->
      <div
        v-if="comment.replies && comment.replies.length > 0"
        class="ml-8 mt-2 space-y-2 pl-2 border-l-2 border-gray-200 dark:border-gray-700"
      >
        <div
          v-for="reply in comment.replies"
          :key="reply.id"
          :class="['p-2 rounded-md text-sm',
                   reply.role === 'supervisor'
                     ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800'
                     : 'bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800']"
        >
          <div class="flex items-start">
            <UBadge
              :color="reply.role === 'supervisor' ? 'blue' : 'purple'"
              variant="subtle"
              size="xs"
              class="mr-2 mt-0.5 flex-shrink-0 font-mono"
            >
              {{ reply.role === 'supervisor' ? 'S' : 'U' }}
            </UBadge>
            <div class="flex-1">
              <div class="flex justify-between items-center">
                <p class="text-xs font-medium text-gray-800 dark:text-gray-200">
                  {{ reply.authorName || (reply.role === 'supervisor' ? $t('supervisor') : $t('student')) }}
                </p>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatDate(reply.createdAt || reply.createdDate) }}
                </span>
              </div>
              <p class="mt-1 text-gray-700 dark:text-gray-300">
                {{ reply.text }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue'

// Define Props
interface Comment {
  id: number | string
  text: string
  role: 'student' | 'supervisor'
  authorName?: string
  createdAt?: number | string | Date
  createdDate?: number | string | Date
  parentId?: number | string | null
  replies?: Comment[]
}

const props = defineProps({
  fieldComments: {
    type: Array as () => Comment[],
    required: true
  },
  canReply: {
    type: Boolean,
    default: false
  }
})

// Define Emits
const emit = defineEmits<{
  (e: 'reply', payload: { parentId: number | string, text: string }): void
}>()

// Component State
const replyText = ref('')
const replyingTo = ref<string | number | null>(null)
const isSubmittingReply = ref(false)

// Methods
const startReply = (commentId: string | number) => {
  replyingTo.value = commentId
  replyText.value = ''
}

const cancelReply = () => {
  replyingTo.value = null
  replyText.value = ''
}

const submitReply = async (commentId: string | number) => {
  if (!replyText.value.trim()) return

  isSubmittingReply.value = true
  try {
    emit('reply', {
      parentId: commentId,
      text: replyText.value
    })
    cancelReply()
  }
  catch (error) {
    console.error('Error submitting reply:', error)
  }
  finally {
    isSubmittingReply.value = false
  }
}

// Utility function for formatting dates
const formatDate = (timestamp: number | string | Date | undefined): string => {
  if (!timestamp) return ''
  try {
    const date = new Date(typeof timestamp === 'string' ? timestamp : Number(timestamp) * 1000)
    return date.toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short'
    })
  }
  catch (e) {
    console.error('Date formatting error:', e)
    return 'Invalid Date'
  }
}
</script>

<style scoped>
.comment-thread + .comment-thread {
  margin-top: 0.75rem;
}
</style>
