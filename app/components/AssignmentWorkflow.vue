<template>
  <div>
    <!-- Open modal button (Managed by parent, but included for context) -->
    <UButton
      :icon="buttonIcon"
      :size="buttonSize"
      :color="buttonColor"
      :variant="buttonVariant"
      :label="buttonLabel || (isEnglishVariant ? 'View Assignment' : 'Peržiūrėti užduotį')"
      @click="openModal"
    />

    <!-- The Modal -->
    <UModal
      v-model="isOpen"
      size="4xl"
      prevent-close
    >
      <UCard :ui="{ divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex justify-between items-center">
            <!-- Title & Status Badge -->
            <h3 class="text-lg font-semibold">
              {{ isEnglishVariant ? 'Final Project Assignment' : 'Baigiamojo darbo užduotis' }}
              <UBadge
                v-if="currentStatus"
                :color="getStatusColor(currentStatus)"
                class="ml-2"
                variant="subtle"
              >
                {{ getStatusLabel(currentStatus) }}
              </UBadge>
            </h3>

            <!-- Controls: Version Selector & Close Button -->
            <div class="flex items-center gap-2">
              <USelectMenu
                v-if="versions.length > 1"
                v-model="selectedVersionId"
                :options="versionOptions"
                value-attribute="value"
                option-attribute="label"
                size="sm"
                class="w-64"
                :placeholder="$t('select_version') || 'Select version'"
              >
                <template #label>
                  {{ selectedVersionLabel || ($t('select_version') || 'Select version') }}
                </template>
              </USelectMenu>
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-x-mark-20-solid"
                @click="closeModal"
              />
            </div>
          </div>
        </template>

        <!-- === Modal Content States === -->

        <!-- 1. Loading State -->
        <div
          v-if="isLoading"
          class="flex justify-center items-center p-12"
        >
          <UIcon
            name="i-heroicons-arrow-path"
            class="animate-spin h-8 w-8 text-primary-500"
          />
        </div>

        <!-- 2. Error State -->
        <div
          v-else-if="error"
          class="p-6 text-center text-red-500"
        >
          <UIcon
            name="i-heroicons-exclamation-circle"
            class="h-10 w-10 mx-auto mb-2"
          />
          <p>{{ error }}</p>
          <UButton
            color="red"
            class="mt-4"
            @click="fetchData"
          >
            {{ $t('try_again') }}
          </UButton>
        </div>

        <!-- 3. Edit Mode (Highest priority after loading/error) -->
        <div
          v-else-if="mode === 'edit'"
          class="p-4 space-y-6"
        >
          <UForm
            :state="editFormData"
            :validate="validateEditForm"
            @submit="saveAssignment"
          >
            <div class="space-y-4">
              <!-- Title -->
              <UFormGroup
                :label="$t('final_project_title')"
                name="TITLE"
                required
              >
                <UInput v-model="editFormData.TITLE" />
              </UFormGroup>
              <!-- English title -->
              <UFormGroup
                :label="$t('final_project_title_en')"
                name="TITLE_EN"
                required
              >
                <UInput v-model="editFormData.TITLE_EN" />
              </UFormGroup>
              <!-- Objective -->
              <UFormGroup
                :label="$t('project_objective')"
                name="OBJECTIVE"
                required
              >
                <UTextarea
                  v-model="editFormData.OBJECTIVE"
                  :placeholder="$t('objective_placeholder')"
                  autoresize
                />
              </UFormGroup>
              <!-- Tasks -->
              <UFormGroup
                :label="$t('project_tasks')"
                name="TASKS"
                required
              >
                <UTextarea
                  v-model="editFormData.TASKS"
                  :placeholder="$t('tasks_placeholder')"
                  rows="5"
                  autoresize
                />
              </UFormGroup>
              <!-- Tools -->
              <UFormGroup
                :label="$t('implementation_tools')"
                name="IMPLEMENTATION_TOOLS"
                required
              >
                <UTextarea
                  v-model="editFormData.IMPLEMENTATION_TOOLS"
                  :placeholder="$t('tools_placeholder')"
                  autoresize
                />
              </UFormGroup>
              <!-- Supervisor -->
              <UFormGroup
                :label="$t('supervisor')"
                name="SUPERVISOR"
                required
              >
                <UInput v-model="editFormData.SUPERVISOR" />
                <!-- TODO: Replace with supervisor lookup/select component -->
              </UFormGroup>
              <!-- Version comment -->
              <UFormGroup
                :label="$t('version_comment')"
                name="versionComment"
                required
              >
                <UTextarea
                  v-model="editFormData.versionComment"
                  :placeholder="$t('version_comment_placeholder')"
                  autoresize
                />
              </UFormGroup>
            </div>

            <!-- Edit Mode Actions -->
            <div class="flex justify-end space-x-2 pt-4 mt-6 border-t border-gray-200 dark:border-gray-700">
              <UButton
                type="button"
                color="gray"
                variant="ghost"
                @click="cancelEdit"
              >
                {{ $t('cancel') }}
              </UButton>
              <UButton
                type="submit"
                color="primary"
                :loading="isSaving"
                icon="i-heroicons-check-20-solid"
              >
                {{ $t('save_draft') }}
              </UButton>
            </div>
          </UForm>
        </div>

        <!-- 4. Empty State (No versions, not loading, not editing) -->
        <div
          v-else-if="versions.length === 0"
          class="p-6 text-center"
        >
          <UIcon
            name="i-heroicons-document-plus-20-solid"
            class="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-500"
          />
          <h3 class="text-lg font-medium mb-2">
            {{ isEnglishVariant ? 'No assignment created yet' : 'Užduotis dar nesukurta' }}
          </h3>
          <p class="text-gray-500 dark:text-gray-400 mb-4">
            {{ isEnglishVariant ? 'Start by creating an assignment.' : 'Pradėkite sukurdami užduotį.' }}
          </p>
          <!-- Button for student to initiate creation -->
          <UButton
            v-if="isStudent"
            color="primary"
            @click="createNewAssignment"
          >
            {{ isEnglishVariant ? 'Create Assignment' : 'Sukurti užduotį' }}
          </UButton>
          <!-- Message for supervisor -->
          <p
            v-else
            class="text-sm text-gray-500 dark:text-gray-400 mt-2"
          >
            {{ $t('waiting_for_student_assignment') || 'Laukiama, kol studentas sukurs užduotį' }}
          </p>
        </div>

        <!-- 5. View Mode (Default content view when versions exist and not editing) -->
        <div
          v-else-if="currentVersion && mode === 'view'"
          class="p-4"
        >
          <!-- Version Info Bar -->
          <div class="mb-6 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md border border-gray-200 dark:border-gray-700">
            <div class="flex justify-between items-center gap-4">
              <div>
                <span class="text-sm font-medium">{{ formatVersionLabel(currentVersion) }}</span>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatDate(currentVersion.createdDate) }}
                </p>
              </div>
              <div
                v-if="currentVersion.comment"
                class="text-sm text-gray-600 dark:text-gray-300 max-w-md text-right flex-shrink-0"
              >
                <span class="font-medium">{{ $t('version_comment') }}:</span> {{ currentVersion.comment }}
              </div>
            </div>
          </div>

          <!-- Assignment Content -->
          <div class="space-y-6">
            <!-- Header (Simulated) -->
            <div class="text-center mb-8">
              <p class="font-semibold uppercase">
                {{ isEnglishVariant ? 'VILNIUS KOLEGIJA / University of Applied Sciences' : 'VILNIAUS KOLEGIJA' }}
              </p>
              <p class="font-semibold uppercase">
                {{ isEnglishVariant ? 'FACULTY OF ELECTRONICS AND INFORMATICS' : 'ELEKTRONIKOS IR INFORMATIKOS FAKULTETAS' }}
              </p>
              <p class="font-semibold text-lg mt-6 uppercase">
                {{ isEnglishVariant ? 'FINAL PROJECT ASSIGNMENT' : 'BAIGIAMOJO DARBO UŽDUOTIS' }}
              </p>
            </div>

            <!-- Student Info -->
            <p>
              {{ isEnglishVariant ? 'Given to undergraduate' : 'Skirta' }}
              <strong>{{ currentAssignmentData?.NAME || '...' }}</strong>
              {{ isEnglishVariant ? 'of group' : 'grupės' }}
              <strong>{{ currentAssignmentData?.GROUP || '...' }}</strong>
              {{ formatAssignmentDate(currentAssignmentData?.ASSIGNMENT_DATE) }}
            </p>

            <!-- Fields & Comments -->
            <div class="space-y-4">
              <!-- Changed grid to space-y for better flow -->
              <!-- Title -->
              <AssignmentFieldDisplay
                :label="$t('final_project_title')"
                :value="currentAssignmentData?.TITLE"
                field-name="TITLE"
                :is-supervisor="isSupervisor"
                :status="currentStatus"
                :comments="getCommentsForField('TITLE')"
                :can-reply="canReplyToComments"
                @open-comment="openCommentInput"
                @reply="addCommentReply"
              />
              <!-- Title EN -->
              <AssignmentFieldDisplay
                :label="$t('final_project_title_en')"
                :value="currentAssignmentData?.TITLE_EN"
                field-name="TITLE_EN"
                :is-supervisor="isSupervisor"
                :status="currentStatus"
                :comments="getCommentsForField('TITLE_EN')"
                :can-reply="canReplyToComments"
                @open-comment="openCommentInput"
                @reply="addCommentReply"
              />
              <!-- Objective -->
              <AssignmentFieldDisplay
                :label="$t('project_objective')"
                :value="currentAssignmentData?.OBJECTIVE"
                field-name="OBJECTIVE"
                :is-supervisor="isSupervisor"
                :status="currentStatus"
                :comments="getCommentsForField('OBJECTIVE')"
                :can-reply="canReplyToComments"
                @open-comment="openCommentInput"
                @reply="addCommentReply"
              />
              <!-- Tasks -->
              <AssignmentFieldDisplay
                :label="$t('project_tasks')"
                :value="currentAssignmentData?.TASKS"
                field-name="TASKS"
                :is-supervisor="isSupervisor"
                :status="currentStatus"
                :comments="getCommentsForField('TASKS')"
                :can-reply="canReplyToComments"
                :preformatted="true"
                @open-comment="openCommentInput"
                @reply="addCommentReply"
              />
              <!-- Tools -->
              <AssignmentFieldDisplay
                :label="$t('implementation_tools')"
                :value="currentAssignmentData?.IMPLEMENTATION_TOOLS"
                field-name="IMPLEMENTATION_TOOLS"
                :is-supervisor="isSupervisor"
                :status="currentStatus"
                :comments="getCommentsForField('IMPLEMENTATION_TOOLS')"
                :can-reply="canReplyToComments"
                @open-comment="openCommentInput"
                @reply="addCommentReply"
              />
              <!-- Defense Date -->
              <AssignmentFieldDisplay
                :label="$t('defense_date')"
                :value="currentAssignmentData?.DEFENSE_DATE || (isEnglishVariant ? 'January 7, 2025' : '2025 m. sausio mėn. 6 d.')"
                field-name="DEFENSE_DATE"
                :is-supervisor="false"
                :status="currentStatus"
              />
            </div>

            <!-- Signatures -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
              <SignatureDisplay
                :label="$t('undergraduate')"
                :name="currentAssignmentData?.NAME"
                :is-signed="assignmentApprovedByStudent"
                :signed-text="isEnglishVariant ? 'Submitted / Approved' : 'Pateikta / Patvirtinta'"
              />
              <SignatureDisplay
                :label="$t('supervisor')"
                :name="currentAssignmentData?.SUPERVISOR"
                :is-signed="assignmentApprovedBySupervisor"
                :signed-text="isEnglishVariant ? 'Approved' : 'Patvirtinta'"
              />
            </div>

            <!-- Floating Comment Input Area -->
            <div
              v-if="activeCommentField"
              class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-md border border-blue-200 dark:border-blue-700 sticky bottom-0 shadow-md"
            >
              <h4 class="font-medium mb-2 text-blue-800 dark:text-blue-200">
                {{ $t('add_comment_for_field', { field: getFieldLabel(activeCommentField) }) }}
              </h4>
              <UTextarea
                v-model="newComment"
                :placeholder="$t('type_your_comment')"
                rows="3"
                class="mb-3"
              />
              <div class="flex justify-end gap-2">
                <UButton
                  color="gray"
                  variant="ghost"
                  @click="cancelComment"
                >
                  {{ $t('cancel') }}
                </UButton>
                <UButton
                  color="primary"
                  :loading="isSavingComment"
                  @click="submitFieldComment"
                >
                  {{ $t('save_comment') }}
                </UButton>
              </div>
            </div>
          </div> <!-- End View Mode Content -->

          <!-- === View Mode Actions === -->
          <div class="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
            <!-- Student actions -->
            <div
              v-if="isStudent && currentStatus !== 'approved'"
              class="flex justify-between items-center"
            >
              <UButton
                v-if="canEditAssignment"
                color="primary"
                variant="outline"
                icon="i-heroicons-pencil-square-20-solid"
                @click="startEditing"
              >
                {{ $t('edit_assignment') }}
              </UButton>
              <div v-else /> <!-- Placeholder -->
              <div class="space-x-2">
                <UButton
                  v-if="canSubmitForReview"
                  color="emerald"
                  :loading="isSubmitting"
                  icon="i-heroicons-paper-airplane-20-solid"
                  @click="submitForReview"
                >
                  {{ $t('submit_for_review') }}
                </UButton>
                <UButton
                  v-else-if="currentStatus === 'submitted'"
                  color="blue"
                  :disabled="true"
                  icon="i-heroicons-clock-20-solid"
                >
                  {{ $t('submitted_waiting_review') }}
                </UButton>
              </div>
            </div>

            <!-- Supervisor actions -->
            <div
              v-if="isSupervisor && currentStatus === 'submitted'"
              class="flex justify-between items-center"
            >
              <UButton
                color="warning"
                :loading="isSubmitting"
                icon="i-heroicons-arrow-uturn-left-20-solid"
                @click="returnForRevision"
              >
                {{ $t('return_for_revision') }}
              </UButton>
              <UButton
                color="success"
                :loading="isSubmitting"
                icon="i-heroicons-check-badge-20-solid"
                @click="approveAssignment"
              >
                {{ $t('approve_assignment') }}
              </UButton>
            </div>

            <!-- Approved state -->
            <div
              v-if="currentStatus === 'approved'"
              class="flex justify-center text-green-600 dark:text-green-400 items-center font-medium"
            >
              <UIcon
                name="i-heroicons-check-circle-20-solid"
                class="w-5 h-5 mr-2"
              />
              {{ $t('assignment_approved') }}
            </div>

            <!-- Close button (always in footer for view mode) -->
            <div
              v-if="!isStudent && !isSupervisor || currentStatus === 'approved' || (isSupervisor && currentStatus !== 'submitted') || (isStudent && currentStatus === 'submitted')"
              class="mt-4 flex justify-end"
            >
              <UButton
                color="gray"
                variant="ghost"
                @click="closeModal"
              >
                {{ $t('close') }}
              </UButton>
            </div>
          </div>
        </div> <!-- End View Mode wrapper -->
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FormError } from '@nuxt/ui/dist/runtime/types'
import { useAuthStore } from '~/stores/auth' // Adjust path
import FieldCommentSection from '~/components/FieldCommentSection.vue' // Adjust path
import AssignmentFieldDisplay from '~/components/AssignmentFieldDisplay.vue' // New Helper Component
import SignatureDisplay from '~/components/SignatureDisplay.vue' // New Helper Component

// Component props
const props = defineProps({
  studentRecordId: { type: Number, required: true },
  formVariant: { type: String, default: 'lt', validator: (v: string) => ['lt', 'en'].includes(v) },
  studentName: { type: String, default: '' },
  studentGroup: { type: String, default: '' },
  // Props for the trigger button (passed from parent)
  buttonLabel: { type: String, default: '' },
  buttonIcon: { type: String, default: 'i-heroicons-document-text' },
  buttonSize: { type: String, default: 'sm' },
  buttonColor: { type: String, default: 'white' },
  buttonVariant: { type: String, default: 'solid' }
})

// Emits
const emit = defineEmits(['updated', 'approved'])

// Dependencies
const { t } = useI18n()
const userStore = useAuthStore()
const toast = useToast()

// User roles
const isStudent = computed(() => userStore.isStudent)
const isSupervisor = computed(() => userStore.isTeacher) // Map teacher role to supervisor

// Component state
const isOpen = ref(false)
const isLoading = ref(false)
const error = ref<string | null>(null)
const mode = ref<'view' | 'edit'>('view')
const versions = ref<any[]>([])
const selectedVersionId = ref<number | null>(null)
const comments = ref<any[]>([])
const currentStatus = ref<string | null>(null) // 'draft', 'submitted', 'revision_requested', 'approved'

// Form state
const isSaving = ref(false)
const isSubmitting = ref(false)
const isSavingComment = ref(false)
const activeCommentField = ref<string | null>(null)
const newComment = ref('')

// Edit form data structure
interface EditFormData {
  TITLE: string; TITLE_EN: string; OBJECTIVE: string; TASKS: string
  IMPLEMENTATION_TOOLS: string; DEFENSE_DATE: string; SUPERVISOR: string
  versionComment: string; NAME: string; GROUP: string; ASSIGNMENT_DATE?: number
}

// Edit form data reactive ref
const editFormData = ref<EditFormData>({
  TITLE: '', TITLE_EN: '', OBJECTIVE: '', TASKS: '', IMPLEMENTATION_TOOLS: '',
  DEFENSE_DATE: '', SUPERVISOR: '', versionComment: '', NAME: '', GROUP: '', ASSIGNMENT_DATE: undefined
})

// Computed properties
const isEnglishVariant = computed(() => props.formVariant === 'en')

const currentVersion = computed(() => {
  if (!selectedVersionId.value) return null
  // Find version, ensure versions array is newest first if needed
  return versions.value.find(v => v.id === selectedVersionId.value) ?? null
})

const currentAssignmentData = computed(() => currentVersion.value?.data ?? null)

const versionOptions = computed(() => {
  return [...versions.value] // Ensure we have a mutable copy
    .sort((a, b) => b.createdDate - a.createdDate) // Sort newest first
    .map((v, index, arr) => ({
      label: formatVersionLabel(v, true, arr.length - index), // Calculate version number based on sorted array
      value: v.id
    }))
})

// Computed property for selected version label in USelectMenu
const selectedVersionLabel = computed(() => {
  const selectedOption = versionOptions.value.find(opt => opt.value === selectedVersionId.value)
  return selectedOption?.label || null
})

const canEditAssignment = computed(() => isStudent.value && ['draft', 'revision_requested'].includes(currentStatus.value ?? ''))
const canSubmitForReview = computed(() => isStudent.value && ['draft', 'revision_requested'].includes(currentStatus.value ?? ''))
const canReplyToComments = computed(() => (isStudent.value || isSupervisor.value) && currentStatus.value !== 'approved')
const assignmentApprovedByStudent = computed(() => ['submitted', 'approved'].includes(currentStatus.value ?? ''))
const assignmentApprovedBySupervisor = computed(() => currentStatus.value === 'approved')

// --- Methods ---

const openModal = async () => {
  isOpen.value = true
  mode.value = 'view' // Always start in view mode when opening
  await fetchData()
}

const closeModal = () => {
  isOpen.value = false
  // Reset transient state if desired
  error.value = null
  activeCommentField.value = null
  newComment.value = ''
  // Keep versions/comments/status as they are unless a full refresh is needed on next open
}

const fetchData = async () => {
  isLoading.value = true
  error.value = null
  // Don't reset versions here if we want to keep the dropdown populated while loading new comments/status
  // versions.value = []
  // comments.value = []

  try {
    // API should return versions sorted newest first
    const response = await $fetch<{ versions: any[], comments: any[], status: string }>(`/api/assignments/${props.studentRecordId}/versions`)

    versions.value = response.versions || []
    comments.value = response.comments || []
    currentStatus.value = response.status || (versions.value.length > 0 ? 'draft' : null) // Infer draft if versions exist but no status

    // Select the latest version if not already selected or if selection is invalid
    if (versions.value.length > 0 && (!selectedVersionId.value || !versions.value.some(v => v.id === selectedVersionId.value))) {
      selectedVersionId.value = versions.value[0].id // Assumes API returns newest first
    }
    else if (versions.value.length === 0) {
      selectedVersionId.value = null
    }
  }
  catch (err: any) {
    console.error('Error fetching assignment data:', err)
    error.value = err.data?.message || err.message || t('error_fetching_assignment')
    toast.add({ title: t('error'), description: error.value, color: 'red' })
  }
  finally {
    isLoading.value = false
  }
}

const createNewAssignment = () => {
  mode.value = 'edit' // Switch to edit mode
  resetEditForm() // Clear form

  // Pre-fill known student data and defaults
  editFormData.value.NAME = props.studentName || t('unknown_student')
  editFormData.value.GROUP = props.studentGroup || t('unknown_group')
  editFormData.value.DEFENSE_DATE = isEnglishVariant.value ? 'January 7, 2025' : '2025 m. sausio mėn. 6 d.' // Example default
  editFormData.value.versionComment = t('initial_draft_comment')
  editFormData.value.ASSIGNMENT_DATE = Math.floor(Date.now() / 1000)
}

const startEditing = () => {
  if (!currentAssignmentData.value) return

  mode.value = 'edit'
  resetEditForm()

  // Populate form with data from the currently selected version
  editFormData.value = {
    ...editFormData.value, // Keep NAME/GROUP potentially
    TITLE: currentAssignmentData.value.TITLE || '',
    TITLE_EN: currentAssignmentData.value.TITLE_EN || '',
    OBJECTIVE: currentAssignmentData.value.OBJECTIVE || '',
    TASKS: currentAssignmentData.value.TASKS || '',
    IMPLEMENTATION_TOOLS: currentAssignmentData.value.IMPLEMENTATION_TOOLS || '',
    DEFENSE_DATE: currentAssignmentData.value.DEFENSE_DATE || (isEnglishVariant.value ? 'January 7, 2025' : '2025 m. sausio mėn. 6 d.'),
    SUPERVISOR: currentAssignmentData.value.SUPERVISOR || '',
    NAME: currentAssignmentData.value.NAME || props.studentName || '',
    GROUP: currentAssignmentData.value.GROUP || props.studentGroup || '',
    ASSIGNMENT_DATE: currentAssignmentData.value.ASSIGNMENT_DATE,
    versionComment: '' // Require new comment for edits
  }
}

const cancelEdit = () => {
  // If canceling creation (no versions exist), stay empty? Or close? Let's go back to view (which will show empty state)
  mode.value = 'view'
  resetEditForm()
  // If versions existed, fetchData might be needed if data could have changed, but likely not needed for simple cancel
}

const resetEditForm = () => {
  editFormData.value = {
    TITLE: '', TITLE_EN: '', OBJECTIVE: '', TASKS: '', IMPLEMENTATION_TOOLS: '',
    DEFENSE_DATE: '', SUPERVISOR: '', versionComment: '', NAME: '', GROUP: '', ASSIGNMENT_DATE: undefined
  }
}

const validateEditForm = (state: EditFormData): FormError[] => {
  const errors: FormError[] = []
  if (!state.TITLE.trim()) errors.push({ path: 'TITLE', message: t('validation_required') })
  if (!state.TITLE_EN.trim()) errors.push({ path: 'TITLE_EN', message: t('validation_required') })
  if (!state.OBJECTIVE.trim()) errors.push({ path: 'OBJECTIVE', message: t('validation_required') })
  if (!state.TASKS.trim()) errors.push({ path: 'TASKS', message: t('validation_required') })
  if (!state.IMPLEMENTATION_TOOLS.trim()) errors.push({ path: 'IMPLEMENTATION_TOOLS', message: t('validation_required') })
  if (!state.SUPERVISOR.trim()) errors.push({ path: 'SUPERVISOR', message: t('validation_required') })
  if (!state.versionComment.trim()) errors.push({ path: 'versionComment', message: t('validation_required') })
  return errors
}

const saveAssignment = async () => {
  isSaving.value = true
  error.value = null
  try {
    const { versionComment, ...assignmentData } = editFormData.value // Separate comment

    const payload = {
      studentRecordId: props.studentRecordId,
      data: assignmentData,
      comment: versionComment,
      status: 'draft' // Saving always results in a draft
    }

    await $fetch('/api/assignments/save', { method: 'POST', body: payload })
    toast.add({ title: t('success'), description: t('assignment_saved_draft'), color: 'green' })

    await fetchData() // Refresh to get the new version list, comments, status
    mode.value = 'view' // Go back to view mode, showing the newly created draft
    emit('updated')
  }
  catch (err: any) {
    console.error('Error saving assignment:', err)
    error.value = err.data?.message || err.message || t('error_saving_assignment')
    toast.add({ title: t('error'), description: error.value, color: 'red' })
  }
  finally {
    isSaving.value = false
  }
}

const updateStatus = async (newStatus: string) => {
  if (!selectedVersionId.value) {
    toast.add({ title: t('error'), description: t('error_no_version_selected'), color: 'red' })
    return
  }

  isSubmitting.value = true
  error.value = null
  try {
    const payload = {
      studentRecordId: props.studentRecordId,
      versionId: selectedVersionId.value,
      status: newStatus
    }
    await $fetch('/api/assignments/update-status', { method: 'POST', body: payload })

    let successMessage = t('status_updated_success') // Generic success
    switch (newStatus) {
      case 'submitted': successMessage = t('assignment_submitted_success'); break
      case 'revision_requested': successMessage = t('assignment_returned_success'); break
      case 'approved': successMessage = t('assignment_approved_success'); break
    }
    toast.add({ title: t('success'), description: successMessage, color: 'green' })

    await fetchData() // Refresh status, comments, versions might change

    emit('updated')
    if (newStatus === 'approved') {
      emit('approved')
    }
  }
  catch (err: any) {
    console.error(`Error updating status to ${newStatus}:`, err)
    error.value = err.data?.message || err.message || t('error_updating_status')
    toast.add({ title: t('error'), description: error.value, color: 'red' })
  }
  finally {
    isSubmitting.value = false
  }
}

// Specific status update wrappers
const submitForReview = () => updateStatus('submitted')
const returnForRevision = () => updateStatus('revision_requested')
const approveAssignment = () => updateStatus('approved')

// --- Comment Methods ---
const openCommentInput = (fieldName: string) => {
  activeCommentField.value = fieldName
  newComment.value = ''
}

const cancelComment = () => {
  activeCommentField.value = null
  newComment.value = ''
}

const submitFieldComment = async () => {
  if (!activeCommentField.value || !newComment.value.trim() || !selectedVersionId.value) return

  isSavingComment.value = true
  try {
    const payload = {
      studentRecordId: props.studentRecordId,
      versionId: selectedVersionId.value, // Comment is associated with a version
      fieldName: activeCommentField.value,
      text: newComment.value,
      role: isSupervisor.value ? 'supervisor' : 'student'
    }
    await $fetch('/api/assignments/comments', { method: 'POST', body: payload })
    toast.add({ title: t('success'), description: t('comment_added_success'), color: 'green' })
    await fetchComments() // Refresh just the comments
    cancelComment() // Close input
  }
  catch (err: any) {
    console.error('Error adding comment:', err)
    toast.add({ title: t('error'), description: err.data?.message || t('error_adding_comment'), color: 'red' })
  }
  finally {
    isSavingComment.value = false
  }
}

const addCommentReply = async (replyData: { parentId: number | string, text: string }) => {
  isSavingComment.value = true // Indicate saving state (maybe FieldCommentSection should handle its own?)
  try {
    const payload = {
      studentRecordId: props.studentRecordId,
      parentCommentId: replyData.parentId,
      text: replyData.text,
      role: isSupervisor.value ? 'supervisor' : 'student'
    }
    await $fetch('/api/assignments/comment-replies', { method: 'POST', body: payload })
    toast.add({ title: t('success'), description: t('reply_added_success'), color: 'green' })
    await fetchComments() // Refresh comments to show the reply
  }
  catch (err: any) {
    console.error('Error adding comment reply:', err)
    toast.add({ title: t('error'), description: err.data?.message || t('error_adding_reply'), color: 'red' })
  }
  finally {
    isSavingComment.value = false
  }
}

const fetchComments = async () => {
  // If comments are always included in the /versions fetch, this might not be needed
  // otherwise, implement a specific API call
  try {
    const response = await $fetch<{ comments: any[] }>(`/api/assignments/${props.studentRecordId}/comments`)
    comments.value = response.comments || []
  }
  catch (err) {
    console.error('Error refreshing comments:', err)
    // Avoid overwriting main error state?
  }
}

// --- Comment Helpers ---
const getCommentsForField = (fieldName: string) => {
  // Filter top-level comments for the field and selected version *if comments are version-specific*
  // Or just filter by fieldName if comments span versions (current implementation assumes this)
  const fieldComments = comments.value.filter(c => c.fieldName === fieldName && !c.parentId)

  // Add replies
  return fieldComments.map(comment => ({
    ...comment,
    replies: comments.value
      .filter(reply => reply.parentId === comment.id)
      .sort((a, b) => a.createdAt - b.createdAt) // Sort replies
  })).sort((a, b) => a.createdAt - b.createdAt) // Sort top-level comments
}

const hasCommentForField = (fieldName: string): boolean => {
  return comments.value.some(c => c.fieldName === fieldName && !c.parentId)
}

// --- Utility & Formatting ---
const formatDate = (timestamp: number | string | Date | undefined): string => {
  if (!timestamp) return '-'
  try {
    const date = new Date(typeof timestamp === 'string' ? timestamp : Number(timestamp) * 1000)
    return date.toLocaleString(isEnglishVariant.value ? 'en-CA' : 'lt-LT', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }
  catch (e) { return 'Invalid Date' }
}

const formatAssignmentDate = (timestamp: number | string | Date | undefined): string => {
  if (!timestamp) return t('assignment_date_default')
  try {
    const date = new Date(typeof timestamp === 'string' ? timestamp : Number(timestamp) * 1000)
    return date.toLocaleDateString(isEnglishVariant.value ? 'en-CA' : 'lt-LT', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  }
  catch (e) { return 'Invalid Date' }
}

const formatVersionLabel = (version: any, includeDate = true, versionNumber?: number): string => {
  if (!version) return ''
  // Version number calculation relies on the versions array being sorted newest first
  const vNum = versionNumber ?? (versions.value.findIndex(v => v.id === version.id) + 1) // +1 because findIndex is 0-based
  const authorRole = version.createdByRole === 'supervisor' ? 'supervisor' : 'student' // Assuming role info from API
  const authorType = t(authorRole) || authorRole // Translate role

  let label = `V${vNum} (${authorType})`
  if (includeDate && version.createdDate) {
    label += ` - ${formatDate(version.createdDate)}`
  }
  return label
}

const getStatusColor = (status: string | null): string => {
  switch (status) {
    case 'draft': return 'gray'; case 'submitted': return 'blue'
    case 'revision_requested': return 'orange'; case 'approved': return 'green'
    default: return 'gray'
  }
}

const getStatusLabel = (status: string | null): string => {
  switch (status) {
    case 'draft': return t('status_draft'); case 'submitted': return t('status_submitted')
    case 'revision_requested': return t('status_revision_requested'); case 'approved': return t('status_approved')
    default: return t('status_unknown')
  }
}

const getFieldLabel = (fieldName: string | null): string => {
  if (!fieldName) return ''
  const labels: Record<string, string> = {
    TITLE: t('final_project_title'), TITLE_EN: t('final_project_title_en'),
    OBJECTIVE: t('project_objective'), TASKS: t('project_tasks'),
    IMPLEMENTATION_TOOLS: t('implementation_tools')
  }
  return labels[fieldName] || fieldName
}

// --- Watchers ---
watch(selectedVersionId, (newId, oldId) => {
  if (newId !== oldId) {
    // When version changes, ensure comments are relevant (if they are version-specific)
    // and reset comment input state
    cancelComment()
    // Potentially call fetchComments() if comments ARE version-specific and not included in versions fetch
  }
})
</script>

<style scoped>
/* Add specific styles for AssignmentWorkflow if needed */
</style>
