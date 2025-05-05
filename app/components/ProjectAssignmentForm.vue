<!-- components/ProjectAssignmentForm.vue -->
<template>
  <div class="px-2 py-4">
    <!-- Loading state -->
    <div
      v-if="isLoading"
      class="flex justify-center items-center py-16"
    >
      <div class="text-center">
        <UIcon
          name="i-heroicons-arrow-path"
          class="animate-spin h-8 w-8 mx-auto text-gray-400 dark:text-gray-500"
        />
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Loading assignment data...
        </p>
      </div>
      <!-- Optional: Use multiple skeletons if preferred -->
      <!-- <USkeleton class="h-32 w-full" /> -->
    </div>

    <!-- Error state -->
    <UAlert
      v-else-if="hasError"
      color="red"
      variant="soft"
      title="Error Loading Data"
    >
      <template #description>
        {{ errorMessage || (language === 'lt' ? 'Įvyko klaida gaunant užduoties duomenis.' : 'An error occurred fetching assignment data.') }}
        <UButton
          color="red"
          variant="link"
          size="xs"
          class="ml-2"
          @click="fetchAssignment"
        >
          Retry
        </UButton>
      </template>
    </UAlert>

    <!-- Form Content -->
    <div
      v-else
      class="space-y-6"
    >
      <!-- Status Banner -->
      <UAlert
        :color="getStatusColor(formData.status)"
        variant="soft"
        class="mb-4"
      >
        <div>
          <h3 class="font-medium">
            {{ getStatusText(formData.status) }}
          </h3>
          <p class="text-sm mt-1">
            {{ getStatusDescription(formData.status) }}
          </p>
        </div>
      </UAlert>

      <!-- Version selector and language controls -->
      <div class="flex flex-wrap justify-between items-center gap-2 mb-4">
        <div
          v-if="versions.length > 0"
          class="flex items-center gap-2"
        >
          <UIcon
            name="i-heroicons-clock"
            class="text-gray-500"
          />
          <USelect
            v-model="selectedVersionId"
            :options="versionOptions"
            :placeholder="language === 'lt' ? 'Pasirinkti versiją' : 'Select version'"
            value-attribute="value"
            option-attribute="label"
            size="sm"
            class="w-60"
            @update:model-value="handleVersionChange"
          />
        </div>
        <div
          v-else
          class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
        >
          <UIcon name="i-heroicons-no-symbol" />
          <span>{{ language === 'lt' ? 'Versijų nėra' : 'No versions available' }}</span>
        </div>

        <div>
          <UButton
            v-if="language === 'lt'"
            variant="outline"
            size="sm"
            @click="switchToEnglish"
          >
            Switch to English
          </UButton>
          <UButton
            v-else
            variant="outline"
            size="sm"
            @click="switchToLithuanian"
          >
            Perjungti į lietuvių k.
          </UButton>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end gap-2 mb-4">
        <div v-if="isStudentRole">
          <UButton
            v-if="canSubmit"
            color="primary"
            icon="i-heroicons-paper-airplane"
            :loading="isSubmitting"
            @click="submitAssignment"
          >
            {{ language === 'lt' ? 'Pateikti' : 'Submit' }}
          </UButton>
          <!-- Save button moved inside UForm -->
        </div>
        <div
          v-if="isSupervisorRole"
          class="flex gap-2"
        >
          <UButton
            v-if="canApprove"
            color="green"
            icon="i-heroicons-check"
            :loading="isApproving"
            @click="approveAssignment"
          >
            {{ language === 'lt' ? 'Patvirtinti' : 'Approve' }}
          </UButton>
          <UButton
            v-if="canRequestRevision"
            color="amber"
            icon="i-heroicons-arrow-path"
            :loading="isRequestingRevision"
            @click="requestRevision"
          >
            {{ language === 'lt' ? 'Prašyti pataisymų' : 'Request revision' }}
          </UButton>
        </div>
      </div>

      <UForm
        :state="formData"
        @submit.prevent="saveAssignment"
      >
        <!-- Student Group (Display Only) -->
        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
          <UFormGroup :label="language === 'lt' ? 'Grupė' : 'Group'">
            <UInput
              :model-value="formData.studentGroup"
              disabled
            />
          </UFormGroup>
        </div>

        <!-- Title Section with Comments -->
        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
          <UFormGroup :label="language === 'lt' ? 'Baigiamojo darbo tema' : 'Final Project Title'">
            <UInput
              v-if="language === 'lt'"
              v-model="formData.finalProjectTitle"
              :placeholder="language === 'lt' ? 'Baigiamojo darbo temos pavadinimas' : 'Final Project Title'"
              :disabled="!isStudentInputEnabled"
            />
            <UInput
              v-else
              v-model="formData.finalProjectTitleEn"
              placeholder="Final Project Title"
              :disabled="!isStudentInputEnabled"
            />
          </UFormGroup>

          <CollapsibleSection
            v-if="showComments && hasCommentsForField(language === 'lt' ? 'finalProjectTitle' : 'finalProjectTitleEn')"
            class="mt-3"
          >
            <template #header>
              <span class="text-sm font-medium">{{ language === 'lt' ? 'Komentarai' : 'Comments' }}</span>
              <div class="flex items-center gap-2">
                <UBadge
                  size="xs"
                  color="gray"
                >
                  {{ getCommentsForField(language === 'lt' ? 'finalProjectTitle' : 'finalProjectTitleEn').length }}
                </UBadge>
              </div>
            </template>
            <SectionComments
              :field-name="language === 'lt' ? 'finalProjectTitle' : 'finalProjectTitleEn'"
              :comments="getCommentsForField(language === 'lt' ? 'finalProjectTitle' : 'finalProjectTitleEn')"
              :user-role="userRole"
              :assignment-id="Number(assignmentId)"
              :student-record-id="formData.studentRecordId ?? undefined"
              @comment-added="fetchComments"
            />
          </CollapsibleSection>

          <div
            v-else-if="showComments && !hasCommentsForField(language === 'lt' ? 'finalProjectTitle' : 'finalProjectTitleEn')"
            class="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3"
          >
            <h4 class="text-xs font-medium mb-2">
              {{ language === 'lt' ? 'Pridėti komentarą:' : 'Add Comment:' }}
            </h4>
            <SectionComments
              :field-name="language === 'lt' ? 'finalProjectTitle' : 'finalProjectTitleEn'"
              :comments="[]"
              :user-role="userRole"
              :assignment-id="Number(assignmentId)"
              :show-only-form="true"
              :student-record-id="formData.studentRecordId ?? undefined"
              @comment-added="fetchComments"
            />
          </div>
        </div>

        <!-- Objective Section with Comments -->
        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
          <UFormGroup :label="language === 'lt' ? 'Baigiamojo darbo tikslas' : 'Final Project Objective'">
            <UTextarea
              v-if="language === 'lt'"
              v-model="formData.objective"
              :placeholder="language === 'lt' ? 'Trumpas, aiškus...' : 'Brief, clear objective...'"
              :disabled="!isStudentInputEnabled"
              :rows="3"
            />
            <UTextarea
              v-else
              v-model="formData.objectiveEn"
              placeholder="A brief, clear, one-sentence description..."
              :disabled="!isStudentInputEnabled"
              :rows="3"
            />
          </UFormGroup>

          <CollapsibleSection
            v-if="showComments && hasCommentsForField(language === 'lt' ? 'objective' : 'objectiveEn')"
            class="mt-3"
          >
            <template #header>
              <span class="text-sm font-medium">{{ language === 'lt' ? 'Komentarai' : 'Comments' }}</span>
              <div class="flex items-center gap-2">
                <UBadge
                  size="xs"
                  color="gray"
                >
                  {{ getCommentsForField(language === 'lt' ? 'objective' : 'objectiveEn').length }}
                </UBadge>
              </div>
            </template>
            <SectionComments
              :field-name="language === 'lt' ? 'objective' : 'objectiveEn'"
              :comments="getCommentsForField(language === 'lt' ? 'objective' : 'objectiveEn')"
              :user-role="userRole"
              :assignment-id="Number(assignmentId)"
              :student-record-id="formData.studentRecordId ?? undefined"
              @comment-added="fetchComments"
            />
          </CollapsibleSection>

          <div
            v-else-if="showComments && !hasCommentsForField(language === 'lt' ? 'objective' : 'objectiveEn')"
            class="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3"
          >
            <h4 class="text-xs font-medium mb-2">
              {{ language === 'lt' ? 'Pridėti komentarą:' : 'Add Comment:' }}
            </h4>
            <SectionComments
              :field-name="language === 'lt' ? 'objective' : 'objectiveEn'"
              :comments="[]"
              :user-role="userRole"
              :assignment-id="Number(assignmentId)"
              :show-only-form="true"
              :student-record-id="formData.studentRecordId ?? undefined"
              @comment-added="fetchComments"
            />
          </div>
        </div>

        <!-- Tasks Section with Comments -->
        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
          <UFormGroup :label="language === 'lt' ? 'Baigiamojo darbo uždaviniai' : 'Final Project Tasks'">
            <UTextarea
              v-if="language === 'lt'"
              v-model="formData.tasks"
              :placeholder="language === 'lt' ? 'Išvardinti preliminarius uždavinius...' : 'List the preliminary tasks...'"
              :disabled="!isStudentInputEnabled"
              :rows="5"
            />
            <UTextarea
              v-else
              v-model="formData.tasksEn"
              placeholder="List preliminary tasks that will help achieve the objective"
              :disabled="!isStudentInputEnabled"
              :rows="5"
            />
          </UFormGroup>
          <CollapsibleSection
            v-if="showComments && hasCommentsForField(language === 'lt' ? 'tasks' : 'tasksEn')"
            class="mt-3"
          >
            <template #header>
              <span class="text-sm font-medium">{{ language === 'lt' ? 'Komentarai' : 'Comments' }}</span>
              <div class="flex items-center gap-2">
                <UBadge
                  size="xs"
                  color="gray"
                >
                  {{ getCommentsForField(language === 'lt' ? 'tasks' : 'tasksEn').length }}
                </UBadge>
              </div>
            </template>
            <SectionComments
              :field-name="language === 'lt' ? 'tasks' : 'tasksEn'"
              :comments="getCommentsForField(language === 'lt' ? 'tasks' : 'tasksEn')"
              :user-role="userRole"
              :assignment-id="Number(assignmentId)"
              :student-record-id="formData.studentRecordId ?? undefined"
              @comment-added="fetchComments"
            />
          </CollapsibleSection>
          <div
            v-else-if="showComments && !hasCommentsForField(language === 'lt' ? 'tasks' : 'tasksEn')"
            class="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3"
          >
            <h4 class="text-xs font-medium mb-2">
              {{ language === 'lt' ? 'Pridėti komentarą:' : 'Add Comment:' }}
            </h4>
            <SectionComments
              :field-name="language === 'lt' ? 'tasks' : 'tasksEn'"
              :comments="[]"
              :user-role="userRole"
              :assignment-id="Number(assignmentId)"
              :show-only-form="true"
              :student-record-id="formData.studentRecordId ?? undefined"
              @comment-added="fetchComments"
            />
          </div>
        </div>

        <!-- Tools Section with Comments -->
        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
          <UFormGroup :label="language === 'lt' ? 'Baigiamojo darbo realizavimo priemonės' : 'Tools for Final Project Implementation'">
            <UTextarea
              v-if="language === 'lt'"
              v-model="formData.tools"
              :placeholder="language === 'lt' ? 'Išvardyti įrankius...' : 'List the tools...'"
              :disabled="!isStudentInputEnabled"
              :rows="3"
            />
            <UTextarea
              v-else
              v-model="formData.toolsEn"
              placeholder="List the tools and technologies..."
              :disabled="!isStudentInputEnabled"
              :rows="3"
            />
          </UFormGroup>
          <CollapsibleSection
            v-if="showComments && hasCommentsForField(language === 'lt' ? 'tools' : 'toolsEn')"
            class="mt-3"
          >
            <template #header>
              <span class="text-sm font-medium">{{ language === 'lt' ? 'Komentarai' : 'Comments' }}</span>
              <div class="flex items-center gap-2">
                <UBadge
                  size="xs"
                  color="gray"
                >
                  {{ getCommentsForField(language === 'lt' ? 'tools' : 'toolsEn').length }}
                </UBadge>
              </div>
            </template>
            <SectionComments
              :field-name="language === 'lt' ? 'tools' : 'toolsEn'"
              :comments="getCommentsForField(language === 'lt' ? 'tools' : 'toolsEn')"
              :user-role="userRole"
              :assignment-id="Number(assignmentId)"
              :student-record-id="formData.studentRecordId ?? undefined"
              @comment-added="fetchComments"
            />
          </CollapsibleSection>
          <div
            v-else-if="showComments && !hasCommentsForField(language === 'lt' ? 'tools' : 'toolsEn')"
            class="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3"
          >
            <h4 class="text-xs font-medium mb-2">
              {{ language === 'lt' ? 'Pridėti komentarą:' : 'Add Comment:' }}
            </h4>
            <SectionComments
              :field-name="language === 'lt' ? 'tools' : 'toolsEn'"
              :comments="[]"
              :user-role="userRole"
              :assignment-id="Number(assignmentId)"
              :show-only-form="true"
              :student-record-id="formData.studentRecordId ?? undefined"
              @comment-added="fetchComments"
            />
          </div>
        </div>

        <!-- General Comments Section -->
        <div
          v-if="showComments"
          class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6"
        >
          <h3 class="font-medium mb-3">
            {{ language === 'lt' ? 'Bendri komentarai' : 'General Comments' }}
          </h3>
          <SectionComments
            :field-name="null"
            :comments="getCommentsForField(null)"
            :user-role="userRole"
            :assignment-id="Number(assignmentId)"
            :student-record-id="formData.studentRecordId ?? undefined"
            @comment-added="fetchComments"
          />
        </div>

        <!-- Form save button (Moved outside specific role check, controlled by canSave) -->
        <div
          v-if="canSave"
          class="flex justify-end mt-4"
        >
          <UButton
            type="submit"
            color="primary"
            :loading="isSaving"
          >
            {{ language === 'lt' ? 'Išsaugoti' : 'Save' }}
          </UButton>
        </div>
      </UForm>
    </div>
  </div>
</template>

<script setup lang="ts">
// <<< --- Ensure lang="ts" is present --- <<<
import { ref, computed, onMounted, watch } from 'vue'
// Import types if needed by SectionComments or other parts
import SectionComments from './SectionComments.vue'
import CollapsibleSection from './CollapsibleSection.vue' // <<< IMPORTED
import { useAuthStore } from '~/stores/auth' // Assuming auth store exists
import { useToast } from '#imports' // Correct import for useToast

// --- Define Interfaces ---
interface FormData {
  id: number | null
  studentRecordId: number | null
  status: string // e.g., 'draft', 'submitted', 'revision_requested', 'approved', 'error'
  isSigned: number // 0 or 1
  studentGroup: string
  finalProjectTitle: string
  finalProjectTitleEn: string
  objective: string
  objectiveEn: string
  tasks: string
  tasksEn: string
  tools: string
  toolsEn: string
  createdDate: number | null // Unix timestamp (seconds)
  lastUpdated: number | null // Unix timestamp (seconds)
}

interface Version {
  id: number
  assignmentId: number
  versionData: string // JSON string representation of FormData subset
  comment: string | null
  // createdBy?: 'student' | 'supervisor'; // Add if your API provides this
  createdDate: number // Unix timestamp (seconds)
}

// --- Props ---
const props = defineProps({
  assignmentId: {
    type: [String, Number], // Allow string 'new' or number ID
    required: true
  }
})

// --- Emits ---
const emit = defineEmits(['saved', 'submitted', 'approved', 'revisionRequested', 'created'])

// --- Composables ---
const toast = useToast()
const authStore = useAuthStore()

// --- Language handling ---
// TODO: Consider deriving initial language from user profile or browser settings
const language = ref<'lt' | 'en'>('lt')
const switchToEnglish = () => language.value = 'en'
const switchToLithuanian = () => language.value = 'lt'

// --- User Role ---
// Ensure your authStore correctly provides 'student', 'teacher', 'department-head', etc.
// console.log('role: ' + authStore.userRole)

const userRole = computed<'student' | 'supervisor' | string>(() => {
  const role = authStore.userRole
  return role === 'teacher' ? 'supervisor' : role
})

// const userRole = computed<'student' | 'teacher' | string>(() => authStore.userRole) // Using string as fallback
const isStudentRole = computed(() => userRole.value === 'student')
const isSupervisorRole = computed(() => ['teacher', 'department-head', 'supervisor'].includes(userRole.value))

// --- UI State ---
const isLoading = ref(true)
const isSaving = ref(false)
const isSubmitting = ref(false)
const isApproving = ref(false)
const isRequestingRevision = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const selectedVersionId = ref<number | null>(null)

// --- Data ---
const initialFormData: FormData = {
  id: null,
  studentRecordId: null,
  status: 'draft',
  isSigned: 0,
  studentGroup: '',
  finalProjectTitle: '',
  finalProjectTitleEn: '',
  objective: '',
  objectiveEn: '',
  tasks: '',
  tasksEn: '',
  tools: '',
  toolsEn: '',
  createdDate: null,
  lastUpdated: null
}
const formData = ref<FormData>({ ...initialFormData })
const comments = ref<Comment[]>([]) // Use your actual Comment type
const versions = ref<Version[]>([])

// --- Version Options ---
const versionOptions = computed(() => {
  if (!Array.isArray(versions.value)) return []
  return versions.value.map(version => ({
    value: version.id,
    label: `${formatDate(version.createdDate)} - ${version.comment || (language.value === 'lt' ? 'Nėra komentaro' : 'No comment')}`
    // createdBy: version.createdBy // Optionally add creator if available
  }))
})

// --- Computed Properties for Button/Input Logic ---
const isStudentInputEnabled = computed(() => {
  // Student can edit if it's their role AND the status allows it
  return isStudentRole.value && ['draft', 'revision_requested'].includes(formData.value.status)
})
const canSave = computed(() => isStudentInputEnabled.value) // Can save if inputs are enabled
const canSubmit = computed(() => isStudentInputEnabled.value) // Can submit if inputs are enabled
const canApprove = computed(() => isSupervisorRole.value && formData.value.status === 'submitted')
const canRequestRevision = computed(() => isSupervisorRole.value && formData.value.status === 'submitted')

// --- Show Comments Logic ---
const showComments = computed(() => {
  // Always show comment sections if supervisor (they can always add)
  if (isSupervisorRole.value) return true
  // Show for student if revision requested or if comments exist
  const hasAnyComments = Array.isArray(comments.value) && comments.value.length > 0
  const viewingRevisionRequested = formData.value.status === 'revision_requested'
  return hasAnyComments || viewingRevisionRequested
})

// Check if a specific field has comments
const hasCommentsForField = (fieldName: string | null): boolean => {
  return getCommentsForField(fieldName).length > 0
}

// Get comments for a specific field
const getCommentsForField = (fieldName: string | null): Comment[] => {
  return Array.isArray(comments.value)
    ? comments.value.filter(comment => comment.fieldName === fieldName)
    : []
}

// --- API Fetching ---
const fetchAssignment = async () => {
  isLoading.value = true
  hasError.value = false
  errorMessage.value = ''
  console.log(`Fetching assignment for ID: ${props.assignmentId}`)
  try {
    const isNew = props.assignmentId === 'new'
    const currentId = isNew ? null : Number(props.assignmentId)

    if (isNew || isNaN(currentId as number)) {
      console.log('New assignment or invalid ID, using defaults.')
      formData.value = { ...initialFormData, status: 'draft' }
      comments.value = []
      versions.value = []
      selectedVersionId.value = null
      isLoading.value = false
      return
    }

    // Fetch summary which includes latest version data merged
    const response = await $fetch(`/api/projectAssignments/${currentId}/summary`)
    console.log('Fetched assignment summary:', response)

    if (response && typeof response === 'object') {
      // Ensure essential IDs are preserved from the base response before merging potentially older version data
      const baseData = {
        id: response.id ?? null,
        studentRecordId: response.studentRecordId ?? null,
        status: response.status ?? 'draft',
        createdDate: response.createdDate ?? null,
        lastUpdated: response.lastUpdated ?? null,
        isSigned: response.isSigned ?? 0,
        studentGroup: response.studentGroup ?? ''
      }
      // Merge response into a clean initial state, then merge base data back
      formData.value = { ...initialFormData, ...response, ...baseData }
      // Ensure status has a valid default if fetch somehow returns null status
      if (!formData.value.status) formData.value.status = 'draft'
    }
    else {
      throw new Error('Invalid data returned from summary endpoint.')
    }
    // Fetch related data in parallel
    await Promise.all([fetchComments(), fetchVersions()])
  }
  catch (error: any) {
    console.error('Error fetching assignment summary:', error)
    hasError.value = true
    errorMessage.value = error?.data?.message || (language.value === 'lt'
      ? 'Nepavyko įkelti užduoties duomenų.'
      : 'Failed to load assignment data.')
    formData.value.status = 'error' // Indicate error state
  }
  finally {
    isLoading.value = false
  }
}

const fetchComments = async () => {
  const currentId = Number(props.assignmentId)
  if (props.assignmentId === 'new' || isNaN(currentId)) { comments.value = []; return }
  try {
    const { data } = await useFetch(`/api/projectAssignments/${currentId}/comments`)
    comments.value = data.value
    console.log('Fetched comments:', comments.value?.length)
  }
  catch (error: any) {
    console.error('Error fetching comments:', error)
    comments.value = [] // Reset on error
    toast.add({ title: 'Klaida', description: error.data?.message || 'Nepavyko įkelti komentarų.', color: 'red' })
  }
}

const fetchVersions = async () => {
  const currentId = Number(props.assignmentId)
  if (props.assignmentId === 'new' || isNaN(currentId)) { versions.value = []; selectedVersionId.value = null; return }
  try {
    const { data } = await useFetch(`/api/projectAssignments/${currentId}/versions`)
    versions.value = data.value

    console.log('Fetched versions:', versions.value?.length)

    if (versions.value?.length > 0) {
      const selectedExists = versions.value.some(v => v.id === selectedVersionId.value)
      // Default to latest ONLY if nothing selected OR selected doesn't exist anymore
      if (selectedVersionId.value === null || !selectedExists) {
        selectedVersionId.value = versions.value[0].id
        console.log('Defaulting selectedVersionId to latest:', selectedVersionId.value)
        // Don't automatically load data here, fetchAssignment already loaded latest initially
      }
      else {
        console.log(`Keeping selected version: ${selectedVersionId.value}`)
      }
    }
    else {
      selectedVersionId.value = null // No versions available
    }
  }
  catch (error: any) {
    console.error('Error fetching versions:', error)
    versions.value = []
    selectedVersionId.value = null
    toast.add({ title: 'Klaida', description: error.data?.message || 'Nepavyko įkelti versijų istorijos.', color: 'red' })
  }
}

// --- Version Loading ---
const handleVersionChange = (versionIdValue: number | string | null) => {
  const versionId = Number(versionIdValue) // Ensure number
  if (isNaN(versionId) || !versions.value) return
  const version = versions.value.find(v => v.id === versionId)
  if (version) {
    loadVersion(version)
  }
}

const loadVersion = (version: Version) => {
  console.log('Loading version:', version.id)
  try {
    if (!version.versionData) {
      console.warn('Selected version has no versionData.')
      toast.add({ title: 'Info', description: 'Pasirinkta versija neturi išsaugotų duomenų.', color: 'blue' })
      return
    }
    const versionData = JSON.parse(version.versionData)
    console.log('Parsed version data:', versionData)

    // Preserve essential state from the current formData
    const preservedState = {
      id: formData.value.id,
      studentRecordId: formData.value.studentRecordId,
      status: formData.value.status,
      createdDate: formData.value.createdDate,
      isSigned: formData.value.isSigned,
      studentGroup: formData.value.studentGroup,
      lastUpdated: formData.value.lastUpdated // Preserve lastUpdated too maybe?
    }

    // Reconstruct: start with defaults, add version data, add preserved state
    formData.value = {
      ...initialFormData, // Start clean
      ...versionData, // Add historical data
      ...preservedState // Ensure current state essentials override history
    }

    console.log('Form data after loading version:', formData.value)

    toast.add({
      title: language.value === 'lt' ? 'Versija įkelta' : 'Version loaded',
      description: `${language.value === 'lt' ? 'Versija' : 'Version'} (${formatDate(version.createdDate)}) ${language.value === 'lt' ? 'sėkmingai įkelta' : 'loaded successfully'}`,
      color: 'blue'
    })
  }
  catch (error: any) {
    console.error('Error parsing or loading version:', error)
    toast.add({ title: 'Klaida', description: error.data?.message || 'Nepavyko įkelti versijos duomenų.', color: 'red' })
  }
}

// --- Status Helpers ---
const getStatusText = (status: string): string => {
  switch (status) {
    case 'draft': return language.value === 'lt' ? 'Juodraštis' : 'Draft'
    case 'submitted': return language.value === 'lt' ? 'Pateikta' : 'Submitted'
    case 'revision_requested': return language.value === 'lt' ? 'Reikia pataisymų' : 'Revision Requested'
    case 'approved': return language.value === 'lt' ? 'Patvirtinta' : 'Approved'
    case 'error': return language.value === 'lt' ? 'Klaida įkeliant' : 'Loading Error'
    default: return language.value === 'lt' ? 'Nežinoma' : 'Unknown'
  }
}
const getStatusDescription = (status: string): string => {
  switch (status) {
    case 'draft': return language.value === 'lt' ? 'Užpildykite formą ir pateikite vadovui.' : 'Complete the form and submit.'
    case 'submitted': return language.value === 'lt' ? 'Pateikta vadovui peržiūrėti.' : 'Submitted for supervisor review.'
    case 'revision_requested': return language.value === 'lt' ? 'Vadovas paprašė pataisymų. Žr. komentarus.' : 'Supervisor requested revisions. See comments.'
    case 'approved': return language.value === 'lt' ? 'Vadovas patvirtino užduotį.' : 'Supervisor approved the assignment.'
    case 'error': return language.value === 'lt' ? 'Nepavyko įkelti duomenų.' : 'Failed to load data.'
    default: return ''
  }
}
const getStatusColor = (status: string): string => {
  // Ensure you have 'cool' or your configured gray in app.config.ts
  const grayColor = useAppConfig().ui?.gray || 'cool'
  switch (status) {
    case 'draft': return grayColor
    case 'submitted': return 'primary'
    case 'revision_requested': return 'amber'
    case 'approved': return 'green'
    case 'error': return 'red'
    default: return grayColor
  }
}

// --- Date Formatting ---
const formatDate = (timestamp: number | undefined | null): string => {
  if (timestamp === undefined || timestamp === null) return 'N/A'
  try {
    return new Date(timestamp * 1000).toLocaleString(language.value === 'lt' ? 'lt-LT' : 'en-US', {
      dateStyle: 'short', timeStyle: 'short'
    })
  }
  catch (e) { return 'Invalid Date' }
}

// --- Actions ---
const saveAssignment = async () => {
  if (!canSave.value) { console.warn('Save denied.'); return }
  isSaving.value = true
  console.log('Saving assignment data:', formData.value)
  try {
    // Extract only the fields that constitute the version data
    const versionDataToSave = {
      finalProjectTitle: formData.value.finalProjectTitle,
      finalProjectTitleEn: formData.value.finalProjectTitleEn,
      objective: formData.value.objective,
      objectiveEn: formData.value.objectiveEn,
      tasks: formData.value.tasks,
      tasksEn: formData.value.tasksEn,
      tools: formData.value.tools,
      toolsEn: formData.value.toolsEn
      // DO NOT include status, id, studentRecordId etc. here
    }

    const payload = {
      assignmentId: props.assignmentId === 'new' ? null : Number(props.assignmentId),
      versionData: versionDataToSave, // Send only the editable form fields
      comment: language.value === 'lt' ? 'Pakeitimai išsaugoti' : 'Changes saved'
    }
    console.log('Save Payload:', payload)

    const response = await $fetch<{ assignmentId?: number, newVersionId?: number }>('/api/projectAssignments/save', {
      method: 'POST',
      body: payload
    })
    console.log('Save response:', response)

    if (props.assignmentId === 'new' && response?.assignmentId) {
      console.log('New assignment created with ID:', response.assignmentId)
      emit('created', response.assignmentId) // Notify parent about creation
    }
    else {
      emit('saved') // Notify parent of save for existing
    }

    toast.add({ title: 'Išsaugota', description: 'Pakeitimai sėkmingai išsaugoti.', color: 'green' })

    // Refresh versions AND select the newly created version
    await fetchVersions()
    if (response?.newVersionId && versions.value.some(v => v.id === response.newVersionId)) {
      selectedVersionId.value = response.newVersionId // Select the version just saved
      console.log('Selected newly saved version:', selectedVersionId.value)
    }
    else if (versions.value.length > 0) {
      // Fallback to latest if newVersionId wasn't returned or found
      selectedVersionId.value = versions.value[0].id
    }
  }
  catch (error: any) {
    console.error('Error saving assignment:', error)
    toast.add({ title: 'Klaida', description: error.data?.message || 'Nepavyko išsaugoti.', color: 'red' })
  }
  finally {
    isSaving.value = false
  }
}

const submitAssignment = async () => {
  if (!canSubmit.value) { console.warn('Submit denied.'); return }
  isSubmitting.value = true
  console.log('Submitting assignment:', props.assignmentId)
  try {
    // OPTIONAL: Consider saving latest changes before submitting
    // await saveAssignment();
    // if (isSaving.value) { isSubmitting.value = false; return; } // Bail if save failed

    await $fetch('/api/projectAssignments/update-status', {
      method: 'POST',
      body: { assignmentId: Number(props.assignmentId), status: 'submitted', currentRole: userRole }
    })
    formData.value.status = 'submitted' // Update local state immediately
    emit('submitted')
    toast.add({ title: 'Pateikta', description: 'Užduotis sėkmingai pateikta.', color: 'green' })
  }
  catch (error: any) {
    console.error('Error submitting assignment:', error)
    toast.add({ title: 'Klaida', description: error.data?.message || 'Nepavyko pateikti.', color: 'red' })
  }
  finally {
    isSubmitting.value = false
  }
}

const approveAssignment = async () => {
  if (!canApprove.value) { console.warn('Approve denied.'); return }
  isApproving.value = true
  console.log('Approving assignment:', props.assignmentId)

  const payload = {
    assignmentId: Number(props.assignmentId),
    status: 'approved',
    currentRole: userRole.value ?? userRole
  }

  try {
    await $fetch('/api/projectAssignments/update-status', {
      method: 'POST',
      body: payload
    })
    formData.value.status = 'approved'
    emit('approved')
    toast.add({ title: 'Patvirtinta', description: 'Užduotis sėkmingai patvirtinta.', color: 'green' })
  }
  catch (error: any) {
    console.error('Error approving assignment:', error)
    toast.add({ title: 'Klaida', description: error.data?.message || 'Nepavyko patvirtinti.', color: 'red' })
  }
  finally {
    isApproving.value = false
  }
}

const requestRevision = async () => {
  if (!canRequestRevision.value) { console.warn('Request revision denied.'); return }
  isRequestingRevision.value = true
  console.log('Requesting revision for assignment:', props.assignmentId)
  try {
    await $fetch('/api/projectAssignments/update-status', {
      method: 'POST',
      body: { assignmentId: Number(props.assignmentId), status: 'revision_requested', currentRole: userRole }
    })
    formData.value.status = 'revision_requested'
    emit('revisionRequested')
    toast.add({ title: 'Paprašyta taisyti', description: 'Prašymas pataisyti išsiųstas.', color: 'yellow' })
  }
  catch (error: any) {
    console.error('Error requesting revision:', error)
    toast.add({ title: 'Klaida', description: error.data?.message || 'Nepavyko paprašyti taisyti.', color: 'red' })
  }
  finally {
    isRequestingRevision.value = false
  }
}

// --- Lifecycle & Watchers ---
onMounted(() => {
  console.log('Assignment Form Mounted. Assignment ID:', props.assignmentId)
  fetchAssignment()
})

watch(() => props.assignmentId, (newId, oldId) => {
  // Prevent refetch if ID hasn't actually changed (e.g., during HMR)
  if (newId !== oldId && newId !== undefined && newId !== null) {
    console.log(`Assignment ID prop changed from ${oldId} to ${newId}. Refetching...`)
    selectedVersionId.value = null // Reset version selection
    fetchAssignment() // Refetch all data for the new assignment
  }
}, { immediate: false }) // Don't run immediately
</script>

<style scoped>
.pb-24 {
  padding-bottom: 6rem; /* Space for sticky footer */
}
</style>
