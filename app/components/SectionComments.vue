<template>
  <div class="space-y-4">
    <!-- Comment List -->
    <div
      v-if="Array.isArray(comments) && comments.length > 0 && !showOnlyForm"
      class="space-y-3"
    >
      <div
        v-for="comment in sortedComments"
        :key="comment.id"
        class="bg-gray-100 dark:bg-gray-700 p-3 rounded-md"
      >
        <div class="flex justify-between items-start mb-2">
          <div class="flex items-center gap-2">
            <UAvatar
              :alt="comment.authorName"
              size="sm"
            />
            <div>
              <p class="font-medium text-sm">
                {{ comment.authorName }}
                <UBadge
                  v-if="comment.role === 'supervisor'"
                  color="blue"
                  size="xs"
                  class="ml-1"
                >
                  {{ language === 'lt' ? 'Vadovas' : 'Supervisor' }}
                </UBadge>
                <UBadge
                  v-else-if="comment.role === 'student'"
                  color="green"
                  size="xs"
                  class="ml-1"
                >
                  {{ language === 'lt' ? 'Studentas' : 'Student' }}
                </UBadge>
              </p>
              <p class="text-xs text-gray-500">
                {{ formatDate(comment.createdDate) }}
              </p>
            </div>
          </div>

          <!-- Reply button (only for root comments that don't have a parentId) -->
          <UButton
            v-if="!comment.parentId && canAddComments"
            size="xs"
            variant="ghost"
            color="gray"
            @click="toggleReplyForm(comment.id)"
          >
            {{ language === 'lt' ? 'Atsakyti' : 'Reply' }}
          </UButton>
        </div>

        <p class="text-sm whitespace-pre-wrap">
          {{ comment.text }}
        </p>

        <!-- Reply form for this comment -->
        <div
          v-if="replyingToCommentId === comment.id"
          class="mt-3 pl-4 border-l-2 border-gray-300 dark:border-gray-500"
        >
          <UTextarea
            v-model="replyText"
            :placeholder="language === 'lt' ? 'Rašyti atsakymą...' : 'Write a reply...'"
            rows="2"
            class="mb-2"
          />
          <div class="flex justify-end gap-2">
            <UButton
              size="xs"
              color="gray"
              variant="ghost"
              @click="cancelReply"
            >
              {{ language === 'lt' ? 'Atšaukti' : 'Cancel' }}
            </UButton>
            <UButton
              size="xs"
              color="primary"
              :loading="isSubmittingReply"
              :disabled="!replyText.trim()"
              @click="submitReply"
            >
              {{ language === 'lt' ? 'Atsakyti' : 'Reply' }}
            </UButton>
          </div>
        </div>

        <!-- Replies to this comment -->
        <div
          v-if="getRepliesForComment(comment.id).length > 0"
          class="mt-3 pl-4 border-l-2 border-gray-300 dark:border-gray-500 space-y-3"
        >
          <div
            v-for="reply in getRepliesForComment(comment.id)"
            :key="reply.id"
            class="bg-gray-200 dark:bg-gray-600 p-2 rounded-md"
          >
            <div class="flex items-center gap-2 mb-1">
              <UAvatar
                :alt="reply.authorName"
                size="xs"
              />
              <div>
                <p class="font-medium text-xs">
                  {{ reply.authorName }}
                  <UBadge
                    v-if="reply.role === 'supervisor'"
                    color="blue"
                    size="xs"
                    class="ml-1"
                  >
                    {{ language === 'lt' ? 'Vadovas' : 'Supervisor' }}
                  </UBadge>
                  <UBadge
                    v-else-if="reply.role === 'student'"
                    color="green"
                    size="xs"
                    class="ml-1"
                  >
                    {{ language === 'lt' ? 'Studentas' : 'Student' }}
                  </UBadge>
                </p>
                <p class="text-xs text-gray-500">
                  {{ formatDate(reply.createdDate) }}
                </p>
              </div>
            </div>
            <p class="text-sm whitespace-pre-wrap">
              {{ reply.text }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Comment Form -->
    <div v-if="canAddComments">
      <UTextarea
        v-model="newComment"
        :placeholder="language === 'lt' ? 'Rašyti komentarą...' : 'Write a comment...'"
        rows="2"
        class="mb-2"
      />
      <div class="flex justify-end">
        <UButton
          size="sm"
          color="primary"
          :loading="isSubmitting"
          :disabled="!newComment.trim()"
          @click="submitComment"
        >
          {{ language === 'lt' ? 'Komentuoti' : 'Comment' }}
        </UButton>
      </div>
    </div>

    <!-- No Comments Message -->
    <div
      v-else-if="!showOnlyForm"
      class="text-center text-gray-500 py-2"
    >
      <p class="text-sm">
        {{ language === 'lt' ? 'Komentarų nėra' : 'No comments' }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  fieldName: {
    type: String,
    default: null
  },
  comments: {
    type: Array,
    default: () => []
  },
  userRole: {
    type: String,
    required: true
  },
  assignmentId: {
    type: [String, Number],
    required: true
  },
  showOnlyForm: {
    type: Boolean,
    default: false
  },
  // Make studentRecordId optional with default
  studentRecordId: {
    type: [String, Number, Object],
    default: undefined
  },
  // Add versionId prop if needed by your API
  versionId: {
    type: [String, Number],
    default: undefined
  }
})

const emit = defineEmits(['comment-added'])

// Language state
const { t } = useI18n()
const language = ref('lt')

// Form state
const newComment = ref('')
const isSubmitting = ref(false)

// Reply state
const replyingToCommentId = ref(null)
const replyText = ref('')
const isSubmittingReply = ref(false)

// Toggle reply form
const toggleReplyForm = (commentId) => {
  if (replyingToCommentId.value === commentId) {
    replyingToCommentId.value = null
    replyText.value = ''
  }
  else {
    replyingToCommentId.value = commentId
    replyText.value = ''
  }
}

// Cancel reply
const cancelReply = () => {
  replyingToCommentId.value = null
  replyText.value = ''
}

// Get the parent comment's versionId for reply
const getParentCommentVersionId = (parentId) => {
  if (!Array.isArray(props.comments)) return undefined

  const parentComment = props.comments.find(c => c.id === parentId)
  return parentComment ? parentComment.versionId : undefined
}

// Submit reply
const submitReply = async () => {
  if (!replyText.value.trim() || !replyingToCommentId.value) return

  isSubmittingReply.value = true

  try {
    // Create payload matching the server expectations
    const payload = {
      studentRecordId: props.studentRecordId, // The API expects studentRecordId
      parentCommentId: replyingToCommentId.value, // The API expects parentCommentId
      text: replyText.value.trim(),
      role: props.userRole
    }

    // Log the payload for debugging
    console.log('Submitting reply with payload:', payload)

    // Use useFetch
    const { data, error } = await useFetch('/api/assignments/comment-replies', {
      method: 'POST',
      body: payload
    })

    if (error.value) {
      console.error('Reply submission failed:', error.value)
      throw new Error(error.value.message || 'Failed to add reply')
    }

    // Clear the form
    replyText.value = ''
    replyingToCommentId.value = null

    // Notify parent to refresh comments
    emit('comment-added')

    // Show notification
    useToast().add({
      title: language.value === 'lt' ? 'Atsakymas pridėtas' : 'Reply added',
      description: language.value === 'lt' ? 'Jūsų atsakymas sėkmingai pridėtas' : 'Your reply was successfully added',
      color: 'green'
    })
  }
  catch (error) {
    console.error('Error adding reply:', error)

    useToast().add({
      title: language.value === 'lt' ? 'Klaida' : 'Error',
      description: language.value === 'lt' ? 'Nepavyko pridėti atsakymo' : 'Failed to add reply',
      color: 'red'
    })
  }
  finally {
    isSubmittingReply.value = false
  }
}

// Get replies for a specific comment
const getRepliesForComment = (commentId) => {
  // Make sure commentId is compared as a string to handle both string and number IDs
  const commentIdStr = String(commentId)
  return Array.isArray(props.comments)
    ? props.comments.filter(comment => comment.parentId && String(comment.parentId) === commentIdStr)
        .sort((a, b) => a.createdDate - b.createdDate) // Sort oldest to newest for replies
    : []
}

// Computed
const canAddComments = computed(() => {
  return props.userRole === 'student' || props.userRole === 'supervisor'
})

// Filter root comments (those without parentId)
const rootComments = computed(() => {
  return Array.isArray(props.comments)
    ? props.comments.filter(comment => !comment.parentId)
    : []
})

const sortedComments = computed(() => {
  // Sort only the root comments by date (newest first)
  return [...rootComments.value].sort((a, b) => b.createdDate - a.createdDate)
})

// Format date
const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown date'
  return new Date(timestamp * 1000).toLocaleString()
}

// Submit comment
const submitComment = async () => {
  if (!newComment.value.trim()) return

  isSubmitting.value = true

  try {
    const payload = {
      assignmentId: props.assignmentId,
      fieldName: props.fieldName,
      text: newComment.value.trim(),
      role: props.userRole,
      versionId: props.versionId || 1 // Use prop versionId or default
    }

    // Log the payload for debugging
    console.log('Submitting comment with payload:', payload)

    // Use useFetch instead of fetch
    const { data, error } = await useFetch('/api/projectAssignments/comments', {
      method: 'POST',
      body: payload
    })

    if (error.value) {
      console.error('Comment submission failed:', error.value)
      throw new Error(error.value.message || 'Failed to add comment')
    }

    // Clear the form
    newComment.value = ''

    // Notify parent
    emit('comment-added')

    // Show notification
    useToast().add({
      title: language.value === 'lt' ? 'Komentaras pridėtas' : 'Comment added',
      description: language.value === 'lt' ? 'Jūsų komentaras sėkmingai pridėtas' : 'Your comment was successfully added',
      color: 'green'
    })
  }
  catch (error) {
    console.error('Error adding comment:', error)

    useToast().add({
      title: language.value === 'lt' ? 'Klaida' : 'Error',
      description: language.value === 'lt' ? 'Nepavyko pridėti komentaro' : 'Failed to add comment',
      color: 'red'
    })
  }
  finally {
    isSubmitting.value = false
  }
}
</script>
