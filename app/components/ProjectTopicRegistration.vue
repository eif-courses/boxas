<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { PropType } from 'vue'
import type { ButtonColor, ButtonVariant, FormError } from '#ui/types' // Nuxt UI types

// Type for comments
export interface TopicComment {
  id?: number
  topicRegistrationId?: number
  fieldName?: string // Optional: which field the comment is about
  commentText: string
  authorRole: 'student' | 'supervisor' | 'department_head'
  authorName: string
  createdAt?: number | Date
  parentCommentId?: number | null
  unread?: boolean // New field to track if comment has been read
  replies?: TopicComment[] // For organizing comments as threads
}

// Type for data received by the component
export interface ProjectTopicRegistrationData {
  // Needed for context/display
  studentRecordId: number
  GROUP: string
  NAME: string // Student Name

  // Initial values for editable fields
  TITLE?: string
  TITLE_EN?: string
  PROBLEM?: string
  OBJECTIVE?: string
  TASKS?: string
  COMPLETION_DATE?: string | Date
  SUPERVISOR?: string
  IS_REGISTERED?: number // 0 or 1

  // Added fields for workflow
  status?: 'draft' | 'submitted' | 'needs_revision' | 'approved' | 'rejected'
  comments?: TopicComment[]
}

// Type for data managed by the form and emitted on save
export interface ProjectTopicRegistrationFormData {
  TITLE: string
  TITLE_EN: string
  PROBLEM: string
  OBJECTIVE: string
  TASKS: string
  COMPLETION_DATE: Date | string | null
  SUPERVISOR: string
  REGISTRATION_DATE: Date | null // Date set when form opens
  status: string // Added for workflow status
}

// --- Props ---
const props = defineProps({
  initialData: {
    type: Object as PropType<ProjectTopicRegistrationData>,
    required: true
  },
  userRole: {
    type: String as PropType<'student' | 'supervisor' | 'department_head'>,
    default: 'student'
  },
  userName: {
    type: String,
    default: ''
  },
  buttonLabel: {
    type: String,
    default: 'Registruoti / Redaguoti Temą'
  },
  modalTitle: {
    type: String,
    default: 'Baigiamojo Darbo Temos Registravimas'
  },
  formVariant: {
    type: String as PropType<'lt' | 'en'>,
    required: true
  },
  color: {
    type: String as PropType<ButtonColor>,
    default: 'primary'
  },
  variant: {
    type: String as PropType<ButtonVariant>,
    default: 'solid'
  },
  icon: {
    type: String,
    default: 'i-heroicons-pencil-square'
  },
  trailing: {
    type: Boolean,
    default: false
  }
})

const isEnglishVariant = computed(() => props.formVariant === 'en')

// --- Emits ---
const emit = defineEmits<{
  (e: 'init', data: ProjectTopicRegistrationData): void
  (e: 'save', data: ProjectTopicRegistrationFormData): void
  (e: 'comment', comment: TopicComment): void
  (e: 'status-change', status: string, topicData?: ProjectTopicRegistrationData): void // Added topicData
  (e: 'success'): void
  (e: 'mark-read', commentId: number): void
}>()

// --- State ---
const isOpen = ref(false)
const isSaving = ref(false)
const isError = ref(false)
const errorMessage = ref('')
const newComment = ref('')
const activeCommentField = ref<string | null>(null)
const replyToComment = ref<TopicComment | null>(null)
const highlightCommentPanel = ref(false)
const popoverPosition = ref({})

const formData = ref<ProjectTopicRegistrationFormData>({
  TITLE: '',
  TITLE_EN: '',
  PROBLEM: '',
  OBJECTIVE: '',
  TASKS: '',
  COMPLETION_DATE: null,
  SUPERVISOR: '',
  REGISTRATION_DATE: null,
  status: 'draft'
})

// Computed for display-only data from initial props
const displayData = computed(() => ({
  GROUP: props.initialData.GROUP,
  NAME: props.initialData.NAME,
  status: props.initialData.status || 'draft'
}))

// Process comments into a hierarchical structure with parent and replies
const processedComments = computed(() => {
  if (!props.initialData.comments) return []

  // Group replies with their parent comments
  const commentThreads: TopicComment[] = []
  const replyMap: Record<number, TopicComment[]> = {}

  // First, group replies by parent
  props.initialData.comments.forEach((comment) => {
    if (comment.parentCommentId) {
      if (!replyMap[comment.parentCommentId]) {
        replyMap[comment.parentCommentId] = []
      }
      replyMap[comment.parentCommentId].push(comment)
    }
    else {
      commentThreads.push({ ...comment, replies: [] })
    }
  })

  // Then, attach replies to parent comments
  commentThreads.forEach((thread) => {
    if (thread.id && replyMap[thread.id]) {
      thread.replies = replyMap[thread.id]
    }
  })

  // Sort parent comments by creation date (newest first)
  return commentThreads.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return dateB - dateA
  })
})

// Get comments for a specific field
const getFieldComments = (fieldName: string) => {
  if (!props.initialData.comments) return []

  if (fieldName === 'general') {
    return processedComments.value.filter(comment =>
      !comment.fieldName || comment.fieldName === 'general'
    )
  }

  return processedComments.value.filter(comment =>
    comment.fieldName === fieldName
  )
}

// Count comments for a specific field (including replies)
const getFieldCommentCount = (fieldName: string): number => {
  if (!props.initialData.comments) return 0

  let count = 0

  // For general comments, count comments with no field or 'general' field
  if (fieldName === 'general') {
    // Count parent comments
    count = props.initialData.comments.filter(comment =>
      (!comment.fieldName || comment.fieldName === 'general') && !comment.parentCommentId
    ).length

    // Count replies to general comments
    const generalCommentIds = props.initialData.comments
      .filter(comment => (!comment.fieldName || comment.fieldName === 'general') && !comment.parentCommentId)
      .map(comment => comment.id)

    count += props.initialData.comments.filter(comment =>
      comment.parentCommentId && generalCommentIds.includes(comment.parentCommentId)
    ).length
  }
  // For specific fields
  else {
    // Count parent comments for this field
    count = props.initialData.comments.filter(comment =>
      comment.fieldName === fieldName && !comment.parentCommentId
    ).length

    // Count replies to comments for this field
    const fieldCommentIds = props.initialData.comments
      .filter(comment => comment.fieldName === fieldName && !comment.parentCommentId)
      .map(comment => comment.id)

    count += props.initialData.comments.filter(comment =>
      comment.parentCommentId && fieldCommentIds.includes(comment.parentCommentId)
    ).length
  }

  return count
}

// Check if there are unread comments for the current user
const hasUnreadComments = computed(() => {
  if (!props.initialData.comments) return false

  return props.initialData.comments.some(comment =>
    comment.unread && comment.authorRole !== props.userRole
  )
})

// Count of unread comments
const unreadCommentsCount = computed(() => {
  if (!props.initialData.comments) return 0

  return props.initialData.comments.filter(comment =>
    comment.unread && comment.authorRole !== props.userRole
  ).length
})

// Computed for status labels based on language
const statusLabels = computed(() => {
  if (isEnglishVariant.value) {
    return {
      draft: 'Draft',
      submitted: 'Submitted',
      needs_revision: 'Needs Revision',
      approved: 'Approved',
      rejected: 'Rejected'
    }
  }
  return {
    draft: 'Juodraštis',
    submitted: 'Pateikta',
    needs_revision: 'Reikia taisymų',
    approved: 'Patvirtinta',
    rejected: 'Atmesta'
  }
})

// Check if user can edit the form
const canEdit = computed(() => {
  // Students can edit if status is draft or needs_revision
  if (props.userRole === 'student') {
    return !formData.value.status || formData.value.status === 'draft' || formData.value.status === 'needs_revision'
  }

  // Supervisors and department heads can edit status and add comments
  // but not the form content directly
  return false
})

// Check if user can add comments
const canComment = computed(() => {
  return true // All users can comment
})

// Check if user can change status
const canChangeStatus = computed(() => {
  return props.userRole === 'supervisor' || props.userRole === 'department_head'
})

// Check if a field has comments and return appropriate CSS classes
const hasCommentsIndicator = (fieldName: string): string => {
  if (!props.initialData.comments) return ''

  const hasComments = props.initialData.comments.some(comment =>
    comment.fieldName === fieldName && !comment.parentCommentId
  )

  // Check for unread comments for this field (that aren't from the current user)
  const hasUnread = props.initialData.comments.some(comment =>
    comment.fieldName === fieldName
    && comment.unread
    && comment.authorRole !== props.userRole
  )

  if (hasUnread) {
    return 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
  }

  if (hasComments) {
    return 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50'
  }

  return ''
}

// Get a human-readable label for field names
const getFieldLabel = (field: string): string => {
  const labels: Record<string, string> = {
    SUPERVISOR: isEnglishVariant.value ? 'Supervisor' : 'Vadovas',
    TITLE: isEnglishVariant.value ? 'Title (LT)' : 'Tema (LT)',
    TITLE_EN: isEnglishVariant.value ? 'Title (EN)' : 'Tema (EN)',
    PROBLEM: isEnglishVariant.value ? 'Problem' : 'Problema',
    OBJECTIVE: isEnglishVariant.value ? 'Objective' : 'Tikslas',
    TASKS: isEnglishVariant.value ? 'Tasks' : 'Uždaviniai',
    COMPLETION_DATE: isEnglishVariant.value ? 'Completion Date' : 'Baigimo data',
    general: isEnglishVariant.value ? 'General' : 'Bendras'
  }

  return labels[field] || field
}

// Format date for display
const formatDate = (timestamp: number | Date | undefined) => {
  if (!timestamp) return ''

  const date = typeof timestamp === 'number'
    ? new Date(timestamp * 1000)
    : timestamp

  return date.toLocaleDateString(
    isEnglishVariant.value ? 'en-US' : 'lt-LT',
    { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  )
}

// Modal functions
const openModal = () => {
  formData.value = {
    TITLE: props.initialData.TITLE || '',
    TITLE_EN: props.initialData.TITLE_EN || '',
    PROBLEM: props.initialData.PROBLEM || '',
    OBJECTIVE: props.initialData.OBJECTIVE || '',
    TASKS: props.initialData.TASKS || '',
    COMPLETION_DATE: props.initialData.COMPLETION_DATE || null,
    SUPERVISOR: props.initialData.SUPERVISOR || '',
    REGISTRATION_DATE: new Date(), // Set current date
    status: props.initialData.status || 'draft'
  }
  isSaving.value = false
  isOpen.value = true
  newComment.value = ''
  activeCommentField.value = null
  replyToComment.value = null
}

const closeModal = () => {
  isOpen.value = false
  activeCommentField.value = null
}

// Form validation
const validate = (state: ProjectTopicRegistrationFormData): FormError[] => {
  const errors = []
  if (!state.TITLE) errors.push({ path: 'TITLE', message: isEnglishVariant.value ? 'Topic Title is required' : 'Baigiamojo darbo tema privaloma' })
  if (!state.TITLE_EN) errors.push({ path: 'TITLE_EN', message: isEnglishVariant.value ? 'English Title is required' : 'Tema anglų kalba privaloma' })
  if (!state.PROBLEM) errors.push({ path: 'PROBLEM', message: isEnglishVariant.value ? 'Project Problem is required' : 'Baigiamojo darbo problema privaloma' })
  if (!state.OBJECTIVE) errors.push({ path: 'OBJECTIVE', message: isEnglishVariant.value ? 'Project Objective is required' : 'Baigiamojo darbo tikslas privalomas' })
  if (!state.TASKS) errors.push({ path: 'TASKS', message: isEnglishVariant.value ? 'Preliminary Tasks and Plan are required' : 'Preliminarūs uždaviniai ir planas privalomi' })
  if (!state.SUPERVISOR) errors.push({ path: 'SUPERVISOR', message: isEnglishVariant.value ? 'Supervisor is required' : 'Vadovas privalomas' })
  return errors
}

// Save form data
// Similarly, modify your handleSave function to ensure studentRecordId is included
const handleSave = async () => {
  isSaving.value = true
  isError.value = false
  errorMessage.value = ''

  try {
    // Make sure studentRecordId is explicitly included
    const payload = {
      studentRecordId: props.initialData.studentRecordId,
      TITLE: formData.value.TITLE,
      TITLE_EN: formData.value.TITLE_EN,
      PROBLEM: formData.value.PROBLEM,
      OBJECTIVE: formData.value.OBJECTIVE,
      TASKS: formData.value.TASKS,
      COMPLETION_DATE: formData.value.COMPLETION_DATE,
      SUPERVISOR: formData.value.SUPERVISOR,
      status: formData.value.status
    }

    console.log('Saving with payload:', payload)

    // First emit save for potential additional handling
    emit('save', formData.value)

    // Then post to API - using your existing endpoint
    const response = await fetch('/api/students/project-topics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.statusMessage || `Error: ${response.status}`)
    }

    const result = await response.json()

    // Close modal and reset states
    closeModal()
    emit('success')
  }
  catch (error: any) {
    isError.value = true
    errorMessage.value = error.message || 'Failed to save topic registration'
    console.error('Error saving project topic registration:', error)
  }
  finally {
    isSaving.value = false
  }
}

// Comment Popover Functions
const toggleCommentPopover = (fieldName: string, event: MouseEvent) => {
  if (activeCommentField.value === fieldName) {
    activeCommentField.value = null
  }
  else {
    // Calculate position based on the click event
    const button = event.target as HTMLElement
    const buttonRect = button.getBoundingClientRect()
    const modalContainer = button.closest('.p-6, .p-10') as HTMLElement
    const modalRect = modalContainer?.getBoundingClientRect() || document.body.getBoundingClientRect()

    // Position to the right of the button by default
    let left = buttonRect.right + 10 - modalRect.left
    let top = buttonRect.top - 100 - modalRect.top // Show a bit above the button

    // Check if this would go outside the viewport
    const modalWidth = modalRect.width
    const popoverWidth = 320 // Set a fixed width for the popover

    if (left + popoverWidth > modalWidth - 20) {
      // Position to the left instead if near right edge
      left = buttonRect.left - popoverWidth - 10 - modalRect.left

      // If still goes off screen on the left, just center it
      if (left < 0) {
        left = Math.max(20, (modalWidth - popoverWidth) / 2)
      }
    }

    // Make sure the popover isn't positioned too high
    if (top < 0) {
      top = buttonRect.bottom + 10 - modalRect.top
    }

    popoverPosition.value = {
      top: `${top}px`,
      left: `${left}px`,
      width: `${popoverWidth}px`,
      maxHeight: '80vh'
    }

    activeCommentField.value = fieldName
    newComment.value = ''
    replyToComment.value = null

    // Highlight effect to draw attention
    highlightCommentPanel.value = true
    setTimeout(() => {
      highlightCommentPanel.value = false
    }, 500)
  }
}

const closeCommentPopover = () => {
  activeCommentField.value = null
  newComment.value = ''
  replyToComment.value = null
}

// Handle replies
const startReply = (comment: TopicComment) => {
  replyToComment.value = comment
  newComment.value = ''

  // Focus the textarea
  nextTick(() => {
    const textarea = document.querySelector('.comment-popover textarea')
    if (textarea instanceof HTMLTextAreaElement) {
      textarea.focus()
    }
  })
}

const cancelReply = () => {
  replyToComment.value = null
  newComment.value = ''
}

// Add a comment
const addComment = () => {
  if (!newComment.value.trim() || !activeCommentField.value) return

  const comment: TopicComment = {
    fieldName: activeCommentField.value,
    commentText: newComment.value,
    authorRole: props.userRole,
    authorName: props.userName,
    parentCommentId: replyToComment.value?.id,
    unread: true // Mark new comments as unread for others
  }

  emit('comment', comment)

  // Reset form
  newComment.value = ''
  replyToComment.value = null
}

// Mark a comment as read
const markAsRead = (comment: TopicComment) => {
  if (comment.id) {
    emit('mark-read', comment.id)
  }
}

// Handle status changes
const handleStatusChange = async (newStatus: string) => {
  try {
    // First update UI to give immediate feedback
    formData.value.status = newStatus

    // Log the data being passed to help with debugging
    console.log('Status change:', {
      newStatus,
      studentRecordId: props.initialData.studentRecordId,
      topicData: props.initialData
    })

    // Emit the status change for parent component to handle
    // Pass the complete props.initialData object to ensure studentRecordId is included
    emit('status-change', newStatus, props.initialData)
  }
  catch (error) {
    // Revert UI status on error
    formData.value.status = props.initialData.status || 'draft'
    console.error('Error updating topic status:', error)
  }
}

// Close popover when clicking outside
const handleOutsideClick = (event: MouseEvent) => {
  // Only process if a popover is open
  if (!activeCommentField.value) return

  // Check if click is outside the popover and the comment buttons
  const popover = document.querySelector('.comment-popover')
  if (!popover) return

  // Get all comment buttons
  const commentButtons = document.querySelectorAll('[icon*="chat-bubble"]')

  // Check if click is within the popover
  if (popover.contains(event.target as Node)) return

  // Check if click is on a comment button
  for (const button of commentButtons) {
    if (button.contains(event.target as Node)) {
      return
    }
  }

  // If click is outside both, close the popover
  closeCommentPopover()
}

// Setup and cleanup event listeners
onMounted(() => {
  if (props.initialData) {
    emit('init', props.initialData)
  }
  document.addEventListener('click', handleOutsideClick)
})

// Also emit when initialData changes
watch(() => props.initialData, (newData) => {
  if (newData) {
    emit('init', newData)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<template>
  <div>
    <UButton
      :label="buttonLabel"
      :icon="icon"
      size="xs"
      :color="color"
      :variant="variant"
      :trailing="trailing"
      @click="openModal"
    />

    <!--    <UButton -->
    <!--      :label="buttonLabel" -->
    <!--      icon="i-heroicons-pencil-square" -->
    <!--      size="xs" -->
    <!--      :color="formData.status === 'approved' ? 'green' : formData.status === 'rejected' ? 'red' : formData.status === 'needs_revision' ? 'orange' : 'blue'" -->
    <!--      variant="solid" -->
    <!--      @click="openModal" -->
    <!--    /> -->

    <UModal
      v-model="isOpen"
      prevent-close
      :ui="{ width: 'sm:max-w-5xl' }"
    >
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800', body: { padding: 'p-0' }, header: { padding: 'p-4 sm:p-6' } }">
        <!-- Header with status badge and notification indicator -->
        <template #header>
          <div class="flex items-center">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white truncate">
              {{ isEnglishVariant ? 'Final Project Topic Registration' : 'Baigiamojo Darbo Temos Registravimo Lapas' }}
            </h3>
            <UBadge
              v-if="formData.status"
              :color="formData.status === 'approved' ? 'green' : formData.status === 'rejected' ? 'red' : formData.status === 'needs_revision' ? 'orange' : 'blue'"
              class="ml-3"
            >
              {{ statusLabels[formData.status] }}
            </UBadge>
            <UBadge
              v-if="hasUnreadComments"
              color="red"
              variant="solid"
              class="ml-2"
            >
              {{ unreadCommentsCount }}
            </UBadge>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              size="sm"
              square
              class="ml-auto"
              @click="closeModal"
            />
          </div>
          <div class="flex">
            <!-- Main Form (full width by default) -->
            <div
              class="relative w-full p-6 sm:p-10 transition-all duration-300"
            >
              <UForm
                :state="formData"
                :validate="validate"
                class="text-sm text-gray-900 dark:text-gray-100 space-y-4 font-serif"
                @submit="handleSave"
              >
                <!-- Header Section -->
                <div class="text-center uppercase font-semibold mb-6 space-y-1">
                  <p>{{ isEnglishVariant ? 'Vilnius Kolegija Higher Education Institution' : 'Vilniaus kolegija' }}</p>
                  <p>{{ isEnglishVariant ? 'Faculty of Electronics and Informatics' : 'Elektronikos ir informatikos fakultetas' }}</p>
                </div>

                <div class="text-center uppercase font-semibold mb-8">
                  <p>{{ isEnglishVariant ? 'Final Project Topic Registration Form' : 'Baigiamojo darbo temos registravimo lapas' }}</p>
                </div>

                <!-- Student Info -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <UFormGroup
                    :label="isEnglishVariant ? 'Student:' : 'Studentas(-ė):'"
                    class="mb-0"
                  >
                    <p class="py-2 font-medium">
                      {{ displayData.NAME }}
                    </p>
                  </UFormGroup>
                  <UFormGroup
                    :label="isEnglishVariant ? 'Academic Group:' : 'Akademinė grupė:'"
                    class="mb-0"
                  >
                    <p class="py-2 font-medium">
                      {{ displayData.GROUP }}
                    </p>
                  </UFormGroup>
                </div>

                <!-- Form Fields with Comment Buttons -->
                <UFormGroup
                  :label="isEnglishVariant ? 'Supervisor:' : 'Baigiamojo darbo vadovas(-ė):'"
                  name="SUPERVISOR"
                  required
                  class="relative group"
                >
                  <div class="flex relative">
                    <UInput
                      v-model="formData.SUPERVISOR"
                      :disabled="!canEdit"
                      :placeholder="isEnglishVariant ? 'Enter supervisor name' : 'Įveskite vadovo vardą ir pavardę'"
                      class="flex-grow"
                    />
                    <UButton
                      v-if="canComment"
                      size="xs"
                      color="amber"
                      variant="soft"
                      class="ml-2 comment-btn relative"
                      :class="hasCommentsIndicator('SUPERVISOR')"
                      @click="toggleCommentPopover('SUPERVISOR', $event)"
                    >
                      <span class="i-heroicons-chat-bubble-left-right" />
                      <span
                        v-if="getFieldCommentCount('SUPERVISOR') > 0"
                        class="absolute -top-1 -right-1 bg-amber-500 dark:bg-amber-400 text-white dark:text-gray-900 text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium"
                      >
                        {{ getFieldCommentCount('SUPERVISOR') }}
                      </span>
                    </UButton>
                  </div>
                </UFormGroup>

                <div class="border-t border-gray-200 dark:border-gray-800 pt-4 my-4">
                  <p class="font-medium mb-2">
                    {{ isEnglishVariant ? 'Final Project Topic:' : 'Baigiamojo darbo tema:' }}
                  </p>
                </div>

                <!-- Title Fields -->
                <UFormGroup
                  :label="isEnglishVariant ? 'In Lithuanian:' : 'Lietuvių kalba:'"
                  name="TITLE"
                  required
                  class="relative group"
                >
                  <div class="flex relative">
                    <UInput
                      v-model="formData.TITLE"
                      :disabled="!canEdit"
                      :placeholder="isEnglishVariant ? 'Enter final project title in Lithuanian' : 'Įveskite baigiamojo darbo temą lietuvių kalba'"
                      class="flex-grow"
                    />
                    <UButton
                      v-if="canComment"
                      size="xs"
                      color="amber"
                      variant="soft"
                      class="ml-2 comment-btn relative"
                      :class="hasCommentsIndicator('TITLE')"
                      @click="toggleCommentPopover('TITLE', $event)"
                    >
                      <span class="i-heroicons-chat-bubble-left-right" />
                      <span
                        v-if="getFieldCommentCount('TITLE') > 0"
                        class="absolute -top-1 -right-1 bg-amber-500 dark:bg-amber-400 text-white dark:text-gray-900 text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium"
                      >
                        {{ getFieldCommentCount('TITLE') }}
                      </span>
                    </UButton>
                  </div>
                </UFormGroup>

                <UFormGroup
                  :label="isEnglishVariant ? 'In English:' : 'Anglų kalba:'"
                  name="TITLE_EN"
                  required
                  class="relative group"
                >
                  <div class="flex relative">
                    <UInput
                      v-model="formData.TITLE_EN"
                      :disabled="!canEdit"
                      :placeholder="isEnglishVariant ? 'Enter final project title in English' : 'Įveskite baigiamojo darbo temą anglų kalba'"
                      class="flex-grow"
                    />
                    <UButton
                      v-if="canComment"
                      size="xs"
                      color="amber"
                      variant="soft"
                      class="ml-2 comment-btn relative"
                      :class="hasCommentsIndicator('TITLE_EN')"
                      @click="toggleCommentPopover('TITLE_EN', $event)"
                    >
                      <span class="i-heroicons-chat-bubble-left-right" />
                      <span
                        v-if="getFieldCommentCount('TITLE_EN') > 0"
                        class="absolute -top-1 -right-1 bg-amber-500 dark:bg-amber-400 text-white dark:text-gray-900 text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium"
                      >
                        {{ getFieldCommentCount('TITLE_EN') }}
                      </span>
                    </UButton>
                  </div>
                </UFormGroup>

                <!-- Date Field -->
                <UFormGroup
                  :label="isEnglishVariant ? 'Project Completion Date:' : 'Baigiamojo darbo baigimo data:'"
                  name="COMPLETION_DATE"
                  class="relative group"
                >
                  <div class="flex relative">
                    <UInput
                      v-model="formData.COMPLETION_DATE"
                      type="date"
                      :disabled="!canEdit"
                      :placeholder="isEnglishVariant ? 'Select completion date' : 'Pasirinkite baigimo datą'"
                      class="flex-grow"
                    />
                    <UButton
                      v-if="canComment"
                      size="xs"
                      color="amber"
                      variant="soft"
                      class="ml-2 comment-btn relative"
                      :class="hasCommentsIndicator('COMPLETION_DATE')"
                      @click="toggleCommentPopover('COMPLETION_DATE', $event)"
                    >
                      <span class="i-heroicons-chat-bubble-left-right" />
                      <span
                        v-if="getFieldCommentCount('COMPLETION_DATE') > 0"
                        class="absolute -top-1 -right-1 bg-amber-500 dark:bg-amber-400 text-white dark:text-gray-900 text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium z-10"
                        style="min-width: 1.25rem; min-height: 1.25rem;"
                      >
                        {{ getFieldCommentCount('COMPLETION_DATE') }}
                      </span>
                    </UButton>
                  </div>
                </UFormGroup>

                <!-- Text Areas -->
                <UFormGroup
                  :label="isEnglishVariant ? 'Final Project Problem:' : 'Baigiamojo darbo problema:'"
                  name="PROBLEM"
                  required
                  class="relative group"
                >
                  <div class="flex relative">
                    <UTextarea
                      v-model="formData.PROBLEM"
                      :rows="3"
                      :disabled="!canEdit"
                      :placeholder="isEnglishVariant ? 'Describe the problem that the project will address' : 'Aprašykite problemą, kurią spręs baigiamasis darbas'"
                      class="flex-grow"
                    />
                    <UButton
                      v-if="canComment"
                      size="xs"
                      color="amber"
                      variant="soft"
                      class="ml-2 h-8 mt-1 comment-btn relative"
                      :class="hasCommentsIndicator('PROBLEM')"
                      @click="toggleCommentPopover('PROBLEM', $event)"
                    >
                      <span class="i-heroicons-chat-bubble-left-right" />
                      <span
                        v-if="getFieldCommentCount('PROBLEM') > 0"
                        class="absolute -top-1 -right-1 bg-amber-500 dark:bg-amber-400 text-white dark:text-gray-900 text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium"
                      >
                        {{ getFieldCommentCount('PROBLEM') }}
                      </span>
                    </UButton>
                  </div>
                </UFormGroup>

                <UFormGroup
                  :label="isEnglishVariant ? 'Final Project Objective:' : 'Baigiamojo darbo tikslas:'"
                  name="OBJECTIVE"
                  required
                  class="relative group"
                >
                  <div class="flex relative">
                    <UTextarea
                      v-model="formData.OBJECTIVE"
                      :rows="3"
                      :disabled="!canEdit"
                      :placeholder="isEnglishVariant ? 'A brief, clear, one-sentence description focused on what will be achieved' : 'Trumpas, aiškus, nusakomas vienu sakiniu, orientuotas į tai, kas bus pasiekta'"
                      class="flex-grow"
                    />
                    <UButton
                      v-if="canComment"
                      size="xs"
                      color="amber"
                      variant="soft"
                      class="ml-2 h-8 mt-1 comment-btn relative"
                      :class="hasCommentsIndicator('OBJECTIVE')"
                      @click="toggleCommentPopover('OBJECTIVE', $event)"
                    >
                      <span class="i-heroicons-chat-bubble-left-right" />
                      <span
                        v-if="getFieldCommentCount('OBJECTIVE') > 0"
                        class="absolute -top-1 -right-1 bg-amber-500 dark:bg-amber-400 text-white dark:text-gray-900 text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium"
                      >
                        {{ getFieldCommentCount('OBJECTIVE') }}
                      </span>
                    </UButton>
                  </div>
                </UFormGroup>

                <UFormGroup
                  :label="isEnglishVariant ? 'Preliminary Tasks and Content Plan:' : 'Preliminarūs baigiamojo darbo uždaviniai ir turinio planas:'"
                  name="TASKS"
                  required
                  class="relative group"
                >
                  <div class="flex relative">
                    <UTextarea
                      v-model="formData.TASKS"
                      :rows="5"
                      :disabled="!canEdit"
                      :placeholder="isEnglishVariant ? 'List preliminary tasks and outline the content plan' : 'Išvardinkite preliminarius uždavinius ir turinio planą'"
                      class="flex-grow"
                    />
                    <UButton
                      v-if="canComment"
                      size="xs"
                      color="amber"
                      variant="soft"
                      class="ml-2 h-8 mt-1 comment-btn relative"
                      :class="hasCommentsIndicator('TASKS')"
                      @click="toggleCommentPopover('TASKS', $event)"
                    >
                      <span class="i-heroicons-chat-bubble-left-right" />
                      <span
                        v-if="getFieldCommentCount('TASKS') > 0"
                        class="absolute -top-1 -right-1 bg-amber-500 dark:bg-amber-400 text-white dark:text-gray-900 text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium"
                      >
                        {{ getFieldCommentCount('TASKS') }}
                      </span>
                    </UButton>
                  </div>
                </UFormGroup>

                <!-- Signature Lines -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 border-t border-gray-200 dark:border-gray-800 pt-6">
                  <div>
                    <p class="mb-2">
                      {{ isEnglishVariant ? 'Student:' : 'Studentas(-ė):' }}
                    </p>
                    <div class="border-b border-dashed border-gray-300 dark:border-gray-700 h-6 mb-1" />
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ isEnglishVariant ? '(signature) (name, surname)' : '(parašas) (vardas, pavardė)' }}
                    </p>
                  </div>

                  <div>
                    <p class="mb-2">
                      {{ isEnglishVariant ? 'Final Project Supervisor:' : 'Baigiamojo darbo vadovas(-ė):' }}
                    </p>
                    <div class="border-b border-dashed border-gray-300 dark:border-gray-700 h-6 mb-1" />
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ isEnglishVariant ? '(signature) (name, surname)' : '(parašas) (vardas, pavardė)' }}
                    </p>
                  </div>
                </div>

                <!-- Department Head Line -->
                <div class="mt-6">
                  <p class="mb-2">
                    {{ isEnglishVariant ? 'Topic registered:' : 'Tema užregistruota:' }}
                  </p>
                  <div class="flex items-end gap-2">
                    <div class="border-b border-dashed border-gray-300 dark:border-gray-700 h-6 w-48" />
                    <p class="mr-2 whitespace-nowrap">
                      {{ isEnglishVariant ? 'Department Head' : 'katedros vedėjas(-a)' }}
                    </p>
                    <div class="border-b border-dashed border-gray-300 dark:border-gray-700 h-6 flex-grow" />
                  </div>

                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {{ isEnglishVariant ? '(signature, date) (name, surname)' : '(parašas, data) (vardas, pavardė)' }}
                  </p>
                </div>

                <!-- Status Change (for supervisors) -->
                <div
                  v-if="canChangeStatus && formData.status === 'submitted'"
                  class="border-t border-gray-200 dark:border-gray-800 pt-4 mt-6"
                >
                  <h4 class="font-medium mb-2">
                    {{ isEnglishVariant ? 'Review Decision:' : 'Peržiūros sprendimas:' }}
                  </h4>
                  <div class="flex items-center space-x-3">
                    <UButton
                      color="green"
                      size="sm"
                      icon="i-heroicons-check-circle"
                      @click="handleStatusChange('approved')"
                    >
                      {{ isEnglishVariant ? 'Approve' : 'Patvirtinti' }}
                    </UButton>
                    <UButton
                      color="amber"
                      size="sm"
                      icon="i-heroicons-exclamation-triangle"
                      @click="handleStatusChange('needs_revision')"
                    >
                      {{ isEnglishVariant ? 'Needs Revision' : 'Reikia taisymų' }}
                    </UButton>
                  </div>

                  <p class="mt-2 text-xs text-gray-500">
                    {{ isEnglishVariant ? 'Please review the topic registration and approve it or request revisions.' : 'Peržiūrėkite temos registraciją ir patvirtinkite ją arba paprašykite pataisymų.' }}
                  </p>
                </div>

                <!-- Additional section for when status is "needs_revision" -->
                <div
                  v-if="canChangeStatus && formData.status === 'needs_revision'"
                  class="border-t border-gray-200 dark:border-gray-800 pt-4 mt-6"
                >
                  <h4 class="font-medium mb-2">
                    {{ isEnglishVariant ? 'After Revisions:' : 'Po pataisymų:' }}
                  </h4>
                  <div class="flex items-center space-x-3">
                    <UButton
                      color="green"
                      size="sm"
                      icon="i-heroicons-check-circle"
                      @click="handleStatusChange('approved')"
                    >
                      {{ isEnglishVariant ? 'Approve' : 'Patvirtinti' }}
                    </UButton>
                    <UButton
                      color="amber"
                      size="sm"
                      icon="i-heroicons-exclamation-triangle"
                      @click="handleStatusChange('needs_revision')"
                    >
                      {{ isEnglishVariant ? 'Still Needs Revision' : 'Vis dar reikia taisymų' }}
                    </UButton>
                  </div>

                  <p class="mt-2 text-xs text-gray-500">
                    {{ isEnglishVariant ? 'After revisions, you can approve the topic or request additional revisions if needed.' : 'Po pataisymų galite patvirtinti temą arba paprašyti papildomų pataisymų, jei reikia.' }}
                  </p>
                </div>

                <!-- Error Message -->
                <div
                  v-if="isError"
                  class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md mb-4"
                >
                  <p>{{ errorMessage || (isEnglishVariant ? 'Error saving topic registration' : 'Klaida išsaugant temos registraciją') }}</p>
                </div>

                <!-- Form Buttons -->
                <div class="text-right space-x-2 pt-4 border-t border-gray-200 dark:border-gray-800 mt-8">
                  <UButton
                    type="button"
                    color="gray"
                    variant="ghost"
                    :label="isEnglishVariant ? 'Cancel' : 'Atšaukti'"
                    :disabled="isSaving"
                    @click="closeModal"
                  />
                  <UButton
                    v-if="canEdit"
                    type="submit"
                    color="primary"
                    :label="isEnglishVariant ? 'Save Registration' : 'Išsaugoti registraciją'"
                    :loading="isSaving"
                  />
                  <UButton
                    v-if="props.userRole === 'student' && (!formData.status || formData.status === 'draft')"
                    type="button"
                    color="green"
                    :label="isEnglishVariant ? 'Submit for Review' : 'Pateikti peržiūrai'"
                    :loading="isSaving"
                    @click="handleStatusChange('submitted')"
                  />
                </div>
              </UForm>

              <!-- Comment Popovers -->
              <div
                v-if="activeCommentField"
                class="comment-popover absolute z-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3"
                :style="popoverPosition"
              >
                <div class="flex justify-between items-center mb-2">
                  <h3 class="text-sm font-medium">
                    {{ getFieldLabel(activeCommentField) }} {{ isEnglishVariant ? 'Comments' : 'Komentarai' }}
                  </h3>
                  <UButton
                    size="xs"
                    color="gray"
                    variant="ghost"
                    icon="i-heroicons-x-mark"
                    @click="closeCommentPopover"
                  />
                </div>

                <!-- Comments list - limited height with scroll -->
                <div class="max-h-64 overflow-y-auto mb-3">
                  <div
                    v-for="comment in getFieldComments(activeCommentField)"
                    :key="comment.id"
                    class="bg-gray-50 dark:bg-gray-700/50 rounded p-2 mb-2"
                  >
                    <!-- Comment content here -->
                    <div class="flex justify-between text-xs mb-1">
                      <span
                        class="font-medium"
                        :class="{
                          'text-green-600 dark:text-green-400': comment.authorRole === 'student',
                          'text-blue-600 dark:text-blue-400': comment.authorRole === 'supervisor',
                          'text-purple-600 dark:text-purple-400': comment.authorRole === 'department_head'
                        }"
                      >{{ comment.authorName }}</span>
                      <span class="text-gray-500">{{ formatDate(comment.createdAt) }}</span>
                    </div>

                    <p class="text-sm">
                      {{ comment.commentText }}
                    </p>

                    <!-- Actions -->
                    <div class="flex justify-end mt-1">
                      <UButton
                        v-if="canComment"
                        size="xs"
                        color="gray"
                        variant="ghost"
                        @click="startReply(comment)"
                      >
                        {{ isEnglishVariant ? 'Reply' : 'Atsakyti' }}
                      </UButton>
                      <UButton
                        v-if="comment.unread && comment.authorRole !== props.userRole"
                        size="xs"
                        color="gray"
                        variant="ghost"
                        @click="markAsRead(comment)"
                      >
                        {{ isEnglishVariant ? 'Mark as Read' : 'Žymėti kaip skaitytą' }}
                      </UButton>
                    </div>

                    <!-- Replies if any -->
                    <div
                      v-if="comment.replies && comment.replies.length > 0"
                      class="pl-3 mt-2 border-l-2 border-gray-200 dark:border-gray-700"
                    >
                      <div
                        v-for="reply in comment.replies"
                        :key="reply.id"
                        class="mb-2 text-xs"
                      >
                        <div class="flex justify-between mb-1">
                          <span
                            class="font-medium"
                            :class="{
                              'text-green-600 dark:text-green-400': reply.authorRole === 'student',
                              'text-blue-600 dark:text-blue-400': reply.authorRole === 'supervisor',
                              'text-purple-600 dark:text-purple-400': reply.authorRole === 'department_head'
                            }"
                          >{{ reply.authorName }}</span>
                          <span class="text-gray-500">{{ formatDate(reply.createdAt) }}</span>
                        </div>

                        <p>
                          {{ reply.commentText }}
                        </p>

                        <!-- Mark Read Button -->
                        <div
                          v-if="reply.unread && reply.authorRole !== props.userRole"
                          class="flex justify-end mt-1"
                        >
                          <UButton
                            size="xs"
                            color="gray"
                            variant="ghost"
                            @click="markAsRead(reply)"
                          >
                            {{ isEnglishVariant ? 'Mark as Read' : 'Žymėti kaip skaitytą' }}
                          </UButton>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    v-if="getFieldComments(activeCommentField).length === 0"
                    class="text-center text-gray-500 py-2"
                  >
                    {{ isEnglishVariant ? 'No comments yet' : 'Kol kas komentarų nėra' }}
                  </div>
                </div>

                <!-- Comment form at the bottom of the popover -->
                <div class="bg-gray-50 dark:bg-gray-700 rounded p-2">
                  <UTextarea
                    v-model="newComment"
                    :rows="2"
                    :placeholder="replyToComment
                      ? (isEnglishVariant ? 'Write a reply...' : 'Parašykite atsakymą...')
                      : (isEnglishVariant ? 'Write a comment...' : 'Parašykite komentarą...')"
                    class="mb-2 text-sm"
                  />

                  <div class="flex justify-between">
                    <UButton
                      v-if="replyToComment"
                      size="xs"
                      color="gray"
                      variant="ghost"
                      @click="cancelReply"
                    >
                      {{ isEnglishVariant ? 'Cancel' : 'Atšaukti' }}
                    </UButton>
                    <UButton
                      size="xs"
                      color="primary"
                      :disabled="!newComment.trim()"
                      @click="addComment"
                    >
                      {{ isEnglishVariant ? 'Post' : 'Paskelbti' }}
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<style scoped>
.comment-popover {
  transition: opacity 0.2s ease;
  animation: fadeIn 0.2s ease;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.comment-btn {
  position: relative;
}

/* Ensure badge has proper styling regardless of parent button class */
.comment-btn .absolute {
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  font-size: 0.7rem;
  min-width: 1rem;
  min-height: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f59e0b !important; /* Amber-500 */
  color: white !important;
}

/* Dark mode adjustment */
.dark .comment-btn .absolute {
  background-color: #fbbf24 !important; /* Amber-400 */
  color: #1f2937 !important; /* Gray-800 */
}

/* Animation for buttons with unread comments */
.bg-red-100.comment-btn .absolute,
.bg-amber-100.comment-btn .absolute,
.bg-red-900\/30.comment-btn .absolute,
.bg-amber-900\/30.comment-btn .absolute {
  animation: pulse 1.5s infinite;
}

/* Pulse animation */
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* Dark mode support */
:root {
  --border-color: #e5e7eb;
}

.dark {
  --border-color: #374151;
}
</style>
