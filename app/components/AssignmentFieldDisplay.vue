<!-- components/AssignmentFieldDisplay.vue -->
<template>
  <div class="mb-4">
    <!-- Field Label -->
    <div class="flex items-center justify-between">
      <h4 class="font-medium text-gray-700 dark:text-gray-300">
        {{ label }}:
        <span
          v-if="comments && comments.length > 0"
          class="inline-flex items-center ml-2 text-xs text-blue-600 dark:text-blue-400"
        >
          <UIcon
            name="i-heroicons-chat-bubble-left-20-solid"
            class="w-4 h-4 mr-1"
          />
          {{ comments.length }}
        </span>
      </h4>

      <!-- Comment Button (for supervisor) -->
      <UButton
        v-if="isSupervisor && canComment && status === 'submitted'"
        size="xs"
        color="primary"
        variant="ghost"
        icon="i-heroicons-chat-bubble-left-20-solid"
        @click="$emit('open-comment', fieldName)"
      >
        {{ $t('add_comment') }}
      </UButton>
    </div>

    <!-- Field Value -->
    <div class="mt-1 p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
      <div
        v-if="preformatted"
        class="whitespace-pre-wrap text-sm"
      >
        {{ value || '-' }}
      </div>
      <div
        v-else
        class="text-sm"
      >
        {{ value || '-' }}
      </div>
    </div>

    <!-- Comments Section -->
    <FieldCommentSection
      v-if="comments && comments.length > 0"
      :field-comments="comments"
      :can-reply="canReply"
      @reply="(data) => $emit('reply', data)"
    />
  </div>
</template>

<script setup lang="ts">
// Define props
const props = defineProps({
  label: { type: String, required: true },
  value: { type: String, default: '' },
  fieldName: { type: String, required: true },
  isSupervisor: { type: Boolean, default: false },
  status: { type: String, default: 'draft' },
  comments: { type: Array, default: () => [] },
  canReply: { type: Boolean, default: false },
  preformatted: { type: Boolean, default: false }
})

// Define emits
defineEmits(['open-comment', 'reply'])

// Computed properties
const canComment = computed(() => {
  // Supervisor can comment on submitted assignments
  return props.status === 'submitted' || props.status === 'revision_requested'
})
</script>
