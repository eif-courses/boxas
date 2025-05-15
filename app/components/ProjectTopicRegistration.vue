<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PropType } from 'vue'
import type { FormError } from '#ui/types' // Nuxt UI types

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
    type: String as PropType<'lt' | 'en'>, // Define possible variants
    required: true
  }
})
const isEnglishVariant = computed(() => props.formVariant === 'en')

// --- Emits ---
const emit = defineEmits<{
  (e: 'save', data: ProjectTopicRegistrationFormData): void
  (e: 'comment', comment: TopicComment): void
  (e: 'status-change', status: string): void
  (e: 'success'): void
}>()

// --- State ---
const isOpen = ref(false)
const isSaving = ref(false)
const isError = ref(false)
const errorMessage = ref('')
const newComment = ref('')
const selectedField = ref<string | null>(null)
const showComments = ref(false)

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

// --- Computed properties ---
const formattedFormDate = computed(() => {
  if (formData.value.REGISTRATION_DATE && !isNaN(new Date(formData.value.REGISTRATION_DATE).getTime())) {
    try {
      return new Date(formData.value.REGISTRATION_DATE).toLocaleDateString(
        isEnglishVariant.value ? 'en-US' : 'lt-LT',
        { year: 'numeric', month: 'long', day: 'numeric' }
      )
    }
    catch (e) { return 'Invalid Date' }
  }
  return 'N/A'
})

// Computed for display-only data from initial props
const displayData = computed(() => ({
  GROUP: props.initialData.GROUP,
  NAME: props.initialData.NAME,
  status: props.initialData.status || 'draft'
}))

// Computed for filtering comments by field
const commentsByField = computed(() => {
  if (!props.initialData.comments) return {}

  const grouped: Record<string, TopicComment[]> = {}
  props.initialData.comments.forEach((comment) => {
    const field = comment.fieldName || 'general'
    if (!grouped[field]) {
      grouped[field] = []
    }
    grouped[field].push(comment)
  })
  return grouped
})

// Get general comments (not tied to specific fields)
const generalComments = computed(() => {
  return commentsByField.value['general'] || []
})

// Helper to format timestamps
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

// Available status changes based on current status and role
const availableStatusChanges = computed(() => {
  if (props.userRole === 'student') {
    if (!formData.value.status || formData.value.status === 'draft') {
      return [{ value: 'submitted', label: statusLabels.value.submitted }]
    }
    return []
  }

  if (props.userRole === 'supervisor' || props.userRole === 'department_head') {
    if (formData.value.status === 'submitted') {
      return [
        { value: 'needs_revision', label: statusLabels.value.needs_revision },
        { value: 'approved', label: statusLabels.value.approved },
        { value: 'rejected', label: statusLabels.value.rejected }
      ]
    }
    if (formData.value.status === 'needs_revision') {
      return [
        { value: 'approved', label: statusLabels.value.approved },
        { value: 'rejected', label: statusLabels.value.rejected }
      ]
    }
  }

  return []
})

// --- Functions ---
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
  selectedField.value = null
}

const closeModal = () => {
  isOpen.value = false
}

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

const handleSave = async () => {
  isSaving.value = true
  isError.value = false
  errorMessage.value = ''

  try {
    // Map data for API consumption
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
      // REGISTRATION_DATE is handled by the server
    }

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

const handleAddComment = () => {
  if (!newComment.value.trim()) return

  const comment: TopicComment = {
    fieldName: selectedField.value || undefined,
    commentText: newComment.value,
    authorRole: props.userRole,
    authorName: props.userName
  }

  emit('comment', comment)

  // Clear the comment field
  newComment.value = ''
  selectedField.value = null
}

const handleStatusChange = (newStatus: string) => {
  formData.value.status = newStatus
  emit('status-change', newStatus)
}

const selectFieldForComment = (fieldName: string) => {
  selectedField.value = fieldName
  showComments.value = true
}
</script>

<template>
  <div>
    <UButton
      :label="buttonLabel"
      icon="i-heroicons-pencil-square"
      size="xs"
      color="orange"
      variant="solid"
      @click="openModal"
    />

    <UModal
      v-model="isOpen"
      prevent-close
      :ui="{ width: 'sm:max-w-4xl' }"
    >
      <UCard
        :ui="{
          ring: '',
          divide: 'divide-y divide-gray-100 dark:divide-gray-800',
          body: { padding: 'p-6 sm:p-10' },
          header: { padding: 'p-4 sm:p-6' }
        }"
      >
        <template #header>
          <div class="flex items-center">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white truncate">
              {{ isEnglishVariant ? 'Final Project Topic Registration' : 'Baigiamojo Darbo Temos Registravimo Lapas' }}
            </h3>
            <!-- Status Badge -->
            <UBadge
              v-if="formData.status"
              :color="formData.status === 'approved' ? 'green' : formData.status === 'rejected' ? 'red' : formData.status === 'needs_revision' ? 'orange' : 'blue'"
              class="ml-3"
            >
              {{ statusLabels[formData.status] }}
            </UBadge>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              size="sm"
              square
              class="ml-auto flex-shrink-0 text-gray-500 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-700 dark:hover:text-red-400 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500 dark:focus-visible:ring-red-400"
              aria-label="Close modal"
              @click="closeModal"
            />
          </div>
        </template>

        <UForm
          :state="formData"
          :validate="validate"
          class="text-sm text-gray-900 dark:text-gray-100 space-y-4 font-serif"
          @submit="handleSave"
        >
          <div class="text-center uppercase font-semibold mb-6 space-y-1">
            <p>{{ isEnglishVariant ? 'Vilnius Kolegija Higher Education Institution' : 'Vilniaus kolegija' }}</p>
            <p>{{ isEnglishVariant ? 'Faculty of Electronics and Informatics' : 'Elektronikos ir informatikos fakultetas' }}</p>
          </div>

          <div class="text-center uppercase font-semibold mb-8">
            <p>{{ isEnglishVariant ? 'Final Project Topic Registration Form' : 'Baigiamojo darbo temos registravimo lapas' }}</p>
          </div>

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

          <!-- Supervisor field with comment functionality -->
          <UFormGroup
            :label="isEnglishVariant ? 'Supervisor:' : 'Baigiamojo darbo vadovas(-ė):'"
            name="SUPERVISOR"
            required
            class="relative group"
          >
            <div class="flex">
              <UInput
                v-model="formData.SUPERVISOR"
                :disabled="!canEdit"
                :placeholder="isEnglishVariant ? 'Enter supervisor name' : 'Įveskite vadovo vardą ir pavardę'"
                class="flex-grow"
              />
              <UButton
                v-if="canComment"
                size="xs"
                color="gray"
                variant="ghost"
                icon="i-heroicons-chat-bubble-left-right"
                class="ml-2"
                @click="selectFieldForComment('SUPERVISOR')"
              />
            </div>
            <div
              v-if="commentsByField['SUPERVISOR'] && commentsByField['SUPERVISOR'].length > 0"
              class="mt-2"
            >
              <div
                v-for="comment in commentsByField['SUPERVISOR']"
                :key="comment.id"
                class="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded my-1"
              >
                <div class="font-semibold">
                  {{ comment.authorName }} ({{ comment.authorRole }}) - {{ formatDate(comment.createdAt) }}
                </div>
                <div>{{ comment.commentText }}</div>
              </div>
            </div>
          </UFormGroup>

          <div class="border-t border-gray-200 dark:border-gray-800 pt-4 my-4">
            <p class="font-medium mb-2">
              {{ isEnglishVariant ? 'Final Project Topic:' : 'Baigiamojo darbo tema:' }}
            </p>
          </div>

          <!-- Title field with comment functionality -->
          <UFormGroup
            :label="isEnglishVariant ? 'In Lithuanian:' : 'Lietuvių kalba:'"
            name="TITLE"
            required
            class="relative group"
          >
            <div class="flex">
              <UInput
                v-model="formData.TITLE"
                :disabled="!canEdit"
                :placeholder="isEnglishVariant ? 'Enter final project title in Lithuanian' : 'Įveskite baigiamojo darbo temą lietuvių kalba'"
                class="flex-grow"
              />
              <UButton
                v-if="canComment"
                size="xs"
                color="gray"
                variant="ghost"
                icon="i-heroicons-chat-bubble-left-right"
                class="ml-2"
                @click="selectFieldForComment('TITLE')"
              />
            </div>
            <div
              v-if="commentsByField['TITLE'] && commentsByField['TITLE'].length > 0"
              class="mt-2"
            >
              <div
                v-for="comment in commentsByField['TITLE']"
                :key="comment.id"
                class="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded my-1"
              >
                <div class="font-semibold">
                  {{ comment.authorName }} ({{ comment.authorRole }}) - {{ formatDate(comment.createdAt) }}
                </div>
                <div>{{ comment.commentText }}</div>
              </div>
            </div>
          </UFormGroup>

          <!-- English Title field with comment functionality -->
          <UFormGroup
            :label="isEnglishVariant ? 'In English:' : 'Anglų kalba:'"
            name="TITLE_EN"
            required
            class="relative group"
          >
            <div class="flex">
              <UInput
                v-model="formData.TITLE_EN"
                :disabled="!canEdit"
                :placeholder="isEnglishVariant ? 'Enter final project title in English' : 'Įveskite baigiamojo darbo temą anglų kalba'"
                class="flex-grow"
              />
              <UButton
                v-if="canComment"
                size="xs"
                color="gray"
                variant="ghost"
                icon="i-heroicons-chat-bubble-left-right"
                class="ml-2"
                @click="selectFieldForComment('TITLE_EN')"
              />
            </div>
            <div
              v-if="commentsByField['TITLE_EN'] && commentsByField['TITLE_EN'].length > 0"
              class="mt-2"
            >
              <div
                v-for="comment in commentsByField['TITLE_EN']"
                :key="comment.id"
                class="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded my-1"
              >
                <div class="font-semibold">
                  {{ comment.authorName }} ({{ comment.authorRole }}) - {{ formatDate(comment.createdAt) }}
                </div>
                <div>{{ comment.commentText }}</div>
              </div>
            </div>
          </UFormGroup>

          <!-- Completion Date field with comment functionality -->
          <UFormGroup
            :label="isEnglishVariant ? 'Project Completion Date:' : 'Baigiamojo darbo baigimo data:'"
            name="COMPLETION_DATE"
            class="relative group"
          >
            <div class="flex">
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
                color="gray"
                variant="ghost"
                icon="i-heroicons-chat-bubble-left-right"
                class="ml-2"
                @click="selectFieldForComment('COMPLETION_DATE')"
              />
            </div>
            <div
              v-if="commentsByField['COMPLETION_DATE'] && commentsByField['COMPLETION_DATE'].length > 0"
              class="mt-2"
            >
              <div
                v-for="comment in commentsByField['COMPLETION_DATE']"
                :key="comment.id"
                class="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded my-1"
              >
                <div class="font-semibold">
                  {{ comment.authorName }} ({{ comment.authorRole }}) - {{ formatDate(comment.createdAt) }}
                </div>
                <div>{{ comment.commentText }}</div>
              </div>
            </div>
          </UFormGroup>

          <!-- Problem field with comment functionality -->
          <UFormGroup
            :label="isEnglishVariant ? 'Final Project Problem:' : 'Baigiamojo darbo problema:'"
            name="PROBLEM"
            required
            class="relative group"
          >
            <div class="flex">
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
                color="gray"
                variant="ghost"
                icon="i-heroicons-chat-bubble-left-right"
                class="ml-2 h-8 mt-1"
                @click="selectFieldForComment('PROBLEM')"
              />
            </div>
            <div
              v-if="commentsByField['PROBLEM'] && commentsByField['PROBLEM'].length > 0"
              class="mt-2"
            >
              <div
                v-for="comment in commentsByField['PROBLEM']"
                :key="comment.id"
                class="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded my-1"
              >
                <div class="font-semibold">
                  {{ comment.authorName }} ({{ comment.authorRole }}) - {{ formatDate(comment.createdAt) }}
                </div>
                <div>{{ comment.commentText }}</div>
              </div>
            </div>
          </UFormGroup>

          <!-- Objective field with comment functionality -->
          <UFormGroup
            :label="isEnglishVariant ? 'Final Project Objective:' : 'Baigiamojo darbo tikslas:'"
            name="OBJECTIVE"
            required
            class="relative group"
          >
            <div class="flex">
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
                color="gray"
                variant="ghost"
                icon="i-heroicons-chat-bubble-left-right"
                class="ml-2 h-8 mt-1"
                @click="selectFieldForComment('OBJECTIVE')"
              />
            </div>
            <div
              v-if="commentsByField['OBJECTIVE'] && commentsByField['OBJECTIVE'].length > 0"
              class="mt-2"
            >
              <div
                v-for="comment in commentsByField['OBJECTIVE']"
                :key="comment.id"
                class="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded my-1"
              >
                <div class="font-semibold">
                  {{ comment.authorName }} ({{ comment.authorRole }}) - {{ formatDate(comment.createdAt) }}
                </div>
                <div>{{ comment.commentText }}</div>
              </div>
            </div>
          </UFormGroup>

          <!-- Tasks field with comment functionality -->
          <UFormGroup
            :label="isEnglishVariant ? 'Preliminary Tasks and Content Plan:' : 'Preliminarūs baigiamojo darbo uždaviniai ir turinio planas:'"
            name="TASKS"
            required
            class="relative group"
          >
            <div class="flex">
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
                color="gray"
                variant="ghost"
                icon="i-heroicons-chat-bubble-left-right"
                class="ml-2 h-8 mt-1"
                @click="selectFieldForComment('TASKS')"
              />
            </div>
            <div
              v-if="commentsByField['TASKS'] && commentsByField['TASKS'].length > 0"
              class="mt-2"
            >
              <div
                v-for="comment in commentsByField['TASKS']"
                :key="comment.id"
                class="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded my-1"
              >
                <div class="font-semibold">
                  {{ comment.authorName }} ({{ comment.authorRole }}) - {{ formatDate(comment.createdAt) }}
                </div>
                <div>{{ comment.commentText }}</div>
              </div>
            </div>
          </UFormGroup>

          <!-- Comments Section -->
          <div class="border-t border-gray-200 dark:border-gray-800 pt-4 my-4">
            <div class="flex justify-between items-center">
              <h4 class="font-medium">
                {{ isEnglishVariant ? 'General Comments' : 'Bendri komentarai' }}
              </h4>
              <UButton
                size="xs"
                color="gray"
                variant="soft"
                :icon="showComments ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                @click="showComments = !showComments"
              >
                {{ showComments ? (isEnglishVariant ? 'Hide Comments' : 'Slėpti komentarus') : (isEnglishVariant ? 'Show Comments' : 'Rodyti komentarus') }}
              </UButton>
            </div>

            <div
              v-if="showComments"
              class="mt-4"
            >
              <div
                v-if="generalComments.length > 0"
                class="mb-4"
              >
                <div
                  v-for="comment in generalComments"
                  :key="comment.id"
                  class="p-3 bg-gray-50 dark:bg-gray-800 rounded mb-2"
                >
                  <div class="font-semibold">
                    {{ comment.authorName }} ({{ comment.authorRole }}) - {{ formatDate(comment.createdAt) }}
                  </div>
                  <div>{{ comment.commentText }}</div>
                </div>
              </div>

              <div
                v-if="canComment"
                class="mt-3"
              >
                <div class="flex">
                  <UTextarea
                    v-model="newComment"
                    :rows="2"
                    :placeholder="selectedField ? `${isEnglishVariant ? 'Comment on' : 'Komentaras apie'} ${selectedField}...` : isEnglishVariant ? 'Add a general comment...' : 'Pridėti bendrą komentarą...'"
                    class="flex-grow"
                  />
                </div>
                <div class="flex justify-between mt-2">
                  <div
                    v-if="selectedField"
                    class="text-sm text-gray-500"
                  >
                    {{ isEnglishVariant ? `Commenting on: ${selectedField}` : `Komentuojate: ${selectedField}` }}
                    <UButton
                      size="xs"
                      color="gray"
                      variant="soft"
                      @click="selectedField = null"
                    >
                      {{ isEnglishVariant ? 'Clear' : 'Išvalyti' }}
                    </UButton>
                  </div>
                  <UButton
                    color="primary"
                    size="sm"
                    :disabled="!newComment.trim()"
                    class="ml-auto"
                    @click="handleAddComment"
                  >
                    {{ isEnglishVariant ? 'Add Comment' : 'Pridėti komentarą' }}
                  </UButton>
                </div>
              </div>
            </div>
          </div>

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

          <!-- Status Change Section (for supervisors and department heads) -->
          <div
            v-if="canChangeStatus && availableStatusChanges.length > 0"
            class="border-t border-gray-200 dark:border-gray-800 pt-4 mt-6"
          >
            <h4 class="font-medium mb-2">
              {{ isEnglishVariant ? 'Change Status:' : 'Keisti būseną:' }}
            </h4>
            <div class="flex items-center space-x-3">
              <USelect
                v-model="formData.status"
                :options="availableStatusChanges"
                option-attribute="label"
                value-attribute="value"
                class="w-48"
              />
              <UButton
                color="primary"
                size="sm"
                @click="handleStatusChange(formData.status)"
              >
                {{ isEnglishVariant ? 'Update Status' : 'Atnaujinti būseną' }}
              </UButton>
            </div>
          </div>

          <div
            v-if="isError"
            class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md mb-4"
          >
            <p>{{ errorMessage || (isEnglishVariant ? 'Error saving topic registration' : 'Klaida išsaugant temos registraciją') }}</p>
          </div>

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
      </UCard>
    </UModal>
  </div>
</template>
