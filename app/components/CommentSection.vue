<template>
  <div class="mt-4 border-t border-gray-200 pt-4">
    <h4 class="font-medium text-sm mb-3">
      {{ fieldName ? $t('comments.fieldComments') : $t('comments.generalComments') }}
    </h4>

    <!-- Comments list -->
    <div
      v-if="comments.length"
      class="space-y-3 mb-4"
    >
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="p-3 bg-white rounded-md shadow-sm"
      >
        <div class="flex justify-between items-start">
          <div>
            <p class="font-semibold text-sm">
              {{ comment.authorName }}
              <UBadge
                v-if="comment.role === 'supervisor'"
                size="xs"
                color="blue"
              >
                {{ $t('role.supervisor') }}
              </UBadge>
              <UBadge
                v-else
                size="xs"
                color="green"
              >
                {{ $t('role.student') }}
              </UBadge>
            </p>
            <p class="text-xs text-gray-500">
              {{ formatDate(comment.createdDate) }}
            </p>
          </div>
          <UButton
            v-if="shouldShowReplyButton(comment)"
            size="xs"
            color="gray"
            variant="ghost"
            @click="startReply(comment.id)"
          >
            {{ $t('comments.reply') }}
          </UButton>
        </div>

        <p class="mt-2 text-sm whitespace-pre-wrap">
          {{ comment.text }}
        </p>

        <!-- Reply form -->
        <div
          v-if="replyingTo === comment.id"
          class="mt-4 pl-4 border-l-2 border-gray-200"
        >
          <UFormGroup :label="$t('comments.yourReply')">
            <UTextarea
              v-model="replyText"
              :placeholder="$t('comments.replyPlaceholder')"
              :rows="2"
              autofocus
            />
          </UFormGroup>
          <div class="flex justify-end gap-2 mt-2">
            <UButton
              size="sm"
              color="gray"
              @click="cancelReply"
            >
              {{ $t('comments.cancel') }}
            </UButton>
            <UButton
              type="submit"
              size="sm"
              color="primary"
              :loading="replying"
              @click="postReply(comment.id)"
            >
              {{ $t('comments.postReply') }}
            </UButton>
          </div>
        </div>

        <!-- Replies -->
        <div
          v-if="comment.replies && comment.replies.length"
          class="mt-4 pl-4 border-l-2 border-gray-200 space-y-3"
        >
          <div
            v-for="reply in comment.replies"
            :key="reply.id"
            class="p-2 bg-gray-50 rounded-md"
          >
            <div class="flex justify-between items-start">
              <div>
                <p class="font-semibold text-sm">
                  {{ reply.authorName }}
                  <UBadge
                    v-if="reply.role === 'supervisor'"
                    size="xs"
                    color="blue"
                  >
                    {{ $t('role.supervisor') }}
                  </UBadge>
                  <UBadge
                    v-else
                    size="xs"
                    color="green"
                  >
                    {{ $t('role.student') }}
                  </UBadge>
                </p>
                <p class="text-xs text-gray-500">
                  {{ formatDate(reply.createdDate) }}
                </p>
              </div>
            </div>
            <p class="mt-1 text-sm whitespace-pre-wrap">
              {{ reply.text }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add new comment -->
    <div>
      <UFormGroup :label="$t('comments.newComment')">
        <UTextarea
          v-model="commentText"
          :placeholder="$t('comments.placeholder')"
          :rows="2"
        />
      </UFormGroup>
      <div class="flex justify-end mt-2">
        <UButton
          color="primary"
          :loading="submitting"
          :disabled="!commentText.trim()"
          @click="postComment"
        >
          {{ $t('comments.post') }}
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  fieldName: {
    type: String,
    default: null // null means general comments, otherwise field-specific
  },
  comments: {
    type: Array,
    default: () => []
  },
  userRole: {
    type: String,
    default: 'student' // 'student' or 'supervisor'
  },
  assignmentId: {
    type: [String, Number],
    required: true
  }
})

const emit = defineEmits(['comment-added'])

const { t } = useI18n()

// State
const commentText = ref('')
const replyText = ref('')
const submitting = ref(false)
const replying = ref(false)
const replyingTo = ref(null)

// Format date function
const formatDate = (timestamp) => {
  if (!timestamp) return ''

  const date = new Date(timestamp * 1000)
  return date.toLocaleString()
}

// Should show reply button (don't show reply to your own comment)
const shouldShowReplyButton = (comment) => {
  // If you're a supervisor, you can reply to student comments
  if (props.userRole === 'supervisor' && comment.role === 'student') {
    return true
  }

  // If you're a student, you can reply to supervisor comments
  if (props.userRole === 'student' && comment.role === 'supervisor') {
    return true
  }

  return false
}

// Start replying to a comment
const startReply = (commentId) => {
  replyingTo.value = commentId
  replyText.value = ''
}

// Cancel reply
const cancelReply = () => {
  replyingTo.value = null
  replyText.value = ''
}

// Post a new comment
const postComment = async () => {
  if (!commentText.value.trim()) return

  submitting.value = true

  try {
    await useFetch('/api/projectAssignments/comments', {
      method: 'POST',
      body: {
        assignmentId: props.assignmentId,
        fieldName: props.fieldName,
        text: commentText.value,
        role: props.userRole
      }
    })

    // Reset form
    commentText.value = ''

    // Notify parent to refresh comments
    emit('comment-added')
  }
  catch (error) {
    console.error('Error posting comment:', error)

    useToast().add({
      title: t('error.title'),
      description: t('error.postComment'),
      color: 'red'
    })
  }
  finally {
    submitting.value = false
  }
}

// Post a reply to a comment
const postReply = async (parentId) => {
  if (!replyText.value.trim()) return

  replying.value = true

  try {
    await useFetch('/api/projectAssignments/comment-replies', {
      method: 'POST',
      body: {
        assignmentId: props.assignmentId,
        parentId: parentId,
        text: replyText.value,
        role: props.userRole
      }
    })

    // Reset form
    replyText.value = ''
    replyingTo.value = null

    // Notify parent to refresh comments
    emit('comment-added')
  }
  catch (error) {
    console.error('Error posting reply:', error)

    useToast().add({
      title: t('error.title'),
      description: t('error.postReply'),
      color: 'red'
    })
  }
  finally {
    replying.value = false
  }
}
</script>
