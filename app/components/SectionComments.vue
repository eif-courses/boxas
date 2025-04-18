<template>
  <div class="space-y-4">
    <!-- Comment List -->
    <div
      v-if="comments.length > 0 && !showOnlyForm"
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
        </div>
        <p class="text-sm whitespace-pre-wrap">
          {{ comment.text }}
        </p>
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
  }
})

const emit = defineEmits(['comment-added'])

// Language state
const { t } = useI18n()
const language = ref('lt')

// Form state
const newComment = ref('')
const isSubmitting = ref(false)

// Computed
const canAddComments = computed(() => {
  return props.userRole === 'student' || props.userRole === 'supervisor'
})

const sortedComments = computed(() => {
  return [...props.comments].sort((a, b) => b.createdDate - a.createdDate)
})

// Format date
const formatDate = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleString()
}

// Submit comment
const submitComment = async () => {
  if (!newComment.value.trim()) return

  isSubmitting.value = true

  try {
    const response = await fetch('/api/projectAssignments/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assignmentId: props.assignmentId,
        fieldName: props.fieldName,
        text: newComment.value.trim(),
        role: props.userRole // Pass the role from props
      })
    })

    if (!response.ok) {
      throw new Error(await response.text())
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
