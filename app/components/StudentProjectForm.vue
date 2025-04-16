<template>
  <div class="student-project-form">
    <!-- Form Button/Trigger -->
    <UButton
      :icon="getButtonIcon()"
      :size="buttonSize"
      :color="getButtonColor()"
      :variant="buttonVariant"
      :label="getButtonLabel()"
      @click="openModal"
    />

    <!-- Main Modal -->
    <UModal
      v-model="isOpen"
      size="4xl"
      prevent-close
    >
      <UCard :ui="{ divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <!-- Header -->
        <template #header>
          <div class="flex justify-between items-center">
            <!-- Title & Status Badge -->
            <h3 class="text-lg font-semibold">
              {{ isEnglish ? 'Final Project Assignment' : 'Baigiamojo darbo užduotis' }}
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
            {{ $t('try_again') || 'Try Again' }}
          </UButton>
        </div>

        <!-- 3. Edit Mode -->
        <div
          v-else-if="mode === 'edit'"
          class="p-4 space-y-6"
        >
          <UForm
            :state="formData"
            :validate="validateForm"
            @submit="saveAssignment"
          >
            <div class="space-y-4">
              <!-- Title -->
              <UFormGroup
                :label="$t('final_project_title') || 'Final Project Title'"
                name="TITLE"
                required
              >
                <UInput v-model="formData.TITLE" />
              </UFormGroup>

              <!-- English title -->
              <UFormGroup
                :label="$t('final_project_title_en') || 'Final Project Title (English)'"
                name="TITLE_EN"
                required
              >
                <UInput v-model="formData.TITLE_EN" />
              </UFormGroup>

              <!-- Objective -->
              <UFormGroup
                :label="$t('project_objective') || 'Project Objective'"
                name="OBJECTIVE"
                required
              >
                <UTextarea
                  v-model="formData.OBJECTIVE"
                  :placeholder="$t('objective_placeholder') || 'Describe the main objective of your project...'"
                  autoresize
                />
              </UFormGroup>

              <!-- Tasks -->
              <UFormGroup
                :label="$t('project_tasks') || 'Project Tasks'"
                name="TASKS"
                required
              >
                <UTextarea
                  v-model="formData.TASKS"
                  :placeholder="$t('tasks_placeholder') || 'List the main tasks of your project...'"
                  rows="5"
                  autoresize
                />
              </UFormGroup>

              <!-- Tools -->
              <UFormGroup
                :label="$t('implementation_tools') || 'Implementation Tools'"
                name="IMPLEMENTATION_TOOLS"
                required
              >
                <UTextarea
                  v-model="formData.IMPLEMENTATION_TOOLS"
                  :placeholder="$t('tools_placeholder') || 'List technologies and tools used in your project...'"
                  autoresize
                />
              </UFormGroup>

              <!-- Supervisor -->
              <UFormGroup
                :label="$t('supervisor') || 'Supervisor'"
                name="SUPERVISOR"
                required
              >
                <UInput v-model="formData.SUPERVISOR" />
              </UFormGroup>

              <!-- Version comment -->
              <UFormGroup
                :label="$t('version_comment') || 'Version Comment'"
                name="versionComment"
                required
              >
                <UTextarea
                  v-model="formData.versionComment"
                  :placeholder="$t('version_comment_placeholder') || 'Describe the changes in this version...'"
                  autoresize
                />
              </UFormGroup>
            </div>

            <!-- Form Actions -->
            <div class="flex justify-end space-x-2 pt-4 mt-6 border-t border-gray-200 dark:border-gray-700">
              <UButton
                type="button"
                color="gray"
                variant="ghost"
                @click="cancelEdit"
              >
                {{ $t('cancel') || 'Cancel' }}
              </UButton>
              <UButton
                type="submit"
                color="primary"
                :loading="isSaving"
                icon="i-heroicons-check-20-solid"
              >
                {{ $t('save_draft') || 'Save Draft' }}
              </UButton>
            </div>
          </UForm>
        </div>

        <!-- 4. Empty State (No versions) -->
        <div
          v-else-if="versions.length === 0"
          class="p-6 text-center"
        >
          <UIcon
            name="i-heroicons-document-plus-20-solid"
            class="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-500"
          />
          <h3 class="text-lg font-medium mb-2">
            {{ isEnglish ? 'No assignment created yet' : 'Užduotis dar nesukurta' }}
          </h3>
          <p class="text-gray-500 dark:text-gray-400 mb-4">
            {{ isEnglish ? 'Start by creating an assignment.' : 'Pradėkite sukurdami užduotį.' }}
          </p>

          <!-- Button for student to initiate creation -->
          <UButton
            v-if="isStudent"
            color="primary"
            @click="createNewAssignment"
          >
            {{ isEnglish ? 'Create Assignment' : 'Sukurti užduotį' }}
          </UButton>

          <!-- Message for supervisor -->
          <p
            v-else
            class="text-sm text-gray-500 dark:text-gray-400 mt-2"
          >
            {{ $t('waiting_for_student_assignment') || 'Waiting for student to create assignment' }}
          </p>
        </div>

        <!-- 5. View Mode -->
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
                <span class="font-medium">{{ $t('version_comment') || 'Comment' }}:</span> {{ currentVersion.comment }}
              </div>
            </div>
          </div>

          <!-- Assignment Content -->
          <div class="space-y-6">
            <!-- Header (Simulated) -->
            <div class="text-center mb-8">
              <p class="font-semibold uppercase">
                {{ isEnglish ? 'VILNIUS KOLEGIJA / University of Applied Sciences' : 'VILNIAUS KOLEGIJA' }}
              </p>
              <p class="font-semibold uppercase">
                {{ isEnglish ? 'FACULTY OF ELECTRONICS AND INFORMATICS' : 'ELEKTRONIKOS IR INFORMATIKOS FAKULTETAS' }}
              </p>
              <p class="font-semibold text-lg mt-6 uppercase">
                {{ isEnglish ? 'FINAL PROJECT ASSIGNMENT' : 'BAIGIAMOJO DARBO UŽDUOTIS' }}
              </p>
            </div>

            <!-- Student Info -->
            <p>
              {{ isEnglish ? 'Given to undergraduate' : 'Skirta' }}
              <strong>{{ currentAssignmentData?.NAME || '...' }}</strong>
              {{ isEnglish ? 'of group' : 'grupės' }}
              <strong>{{ currentAssignmentData?.GROUP || '...' }}</strong>
              {{ formatAssignmentDate(currentAssignmentData?.ASSIGNMENT_DATE) }}
            </p>

            <!-- Fields & Comments -->
            <div class="space-y-4">
              <!-- Project Fields -->
              <ProjectField
                :label="$t('final_project_title') || 'Final Project Title'"
                :value="currentAssignmentData?.TITLE"
                field-name="TITLE"
                :is-supervisor="isSupervisor"
                :status="currentStatus"
                :comments="getCommentsForField('TITLE')"
                :can-reply="canReplyToComments"
                @open-comment="openCommentInput"
                @reply="addCommentReply"
              />

              <ProjectField
                :label="$t('final_project_title_en') || 'Final Project Title (English)'"
                :value="currentAssignmentData?.TITLE_EN"
                field-name="TITLE_EN"
                :is-supervisor="isSupervisor"
                :status="currentStatus"
                :comments="getCommentsForField('TITLE_EN')"
                :can-reply="canReplyToComments"
                @open-comment="openCommentInput"
                @reply="addCommentReply"
              />

              <ProjectField
                :label="$t('project_objective') || 'Project Objective'"
                :value="currentAssignmentData?.OBJECTIVE"
                field-name="OBJECTIVE"
                :is-supervisor="isSupervisor"
                :status="currentStatus"
                :comments="getCommentsForField('OBJECTIVE')"
                :can-reply="canReplyToComments"
                @open-comment="openCommentInput"
                @reply="addCommentReply"
              />

              <ProjectField
                :label="$t('project_tasks') || 'Project Tasks'"
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

              <ProjectField
                :label="$t('implementation_tools') || 'Implementation Tools'"
                :value="currentAssignmentData?.IMPLEMENTATION_TOOLS"
                field-name="IMPLEMENTATION_TOOLS"
                :is-supervisor="isSupervisor"
                :status="currentStatus"
                :comments="getCommentsForField('IMPLEMENTATION_TOOLS')"
                :can-reply="canReplyToComments"
                @open-comment="openCommentInput"
                @reply="addCommentReply"
              />

              <ProjectField
                :label="$t('defense_date') || 'Defense Date'"
                :value="currentAssignmentData?.DEFENSE_DATE || (isEnglish ? 'January 7, 2025' : '2025 m. sausio mėn. 6 d.')"
                field-name="DEFENSE_DATE"
                :is-supervisor="false"
                :status="currentStatus"
              />
            </div>

            <!-- Signatures -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
              <div>
                <h4 class="font-medium mb-1 text-sm text-gray-700 dark:text-gray-300">
                  {{ $t('undergraduate') || 'Student' }}:
                </h4>
                <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700 min-h-[60px]">
                  <p class="text-sm">
                    {{ currentAssignmentData?.NAME || '-' }}
                  </p>
                  <div
                    v-if="assignmentApprovedByStudent"
                    class="mt-1 text-green-600 dark:text-green-400 text-xs flex items-center"
                  >
                    <UIcon
                      name="i-heroicons-check-circle-20-solid"
                      class="w-4 h-4 mr-1 flex-shrink-0"
                    />
                    {{ isEnglish ? 'Submitted / Approved' : 'Pateikta / Patvirtinta' }}
                  </div>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ isEnglish ? '(signature) (name, surname)' : '(parašas) (vardas, pavardė)' }}
                </p>
              </div>

              <div>
                <h4 class="font-medium mb-1 text-sm text-gray-700 dark:text-gray-300">
                  {{ $t('supervisor') || 'Supervisor' }}:
                </h4>
                <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700 min-h-[60px]">
                  <p class="text-sm">
                    {{ currentAssignmentData?.SUPERVISOR || '-' }}
                  </p>
                  <div
                    v-if="assignmentApprovedBySupervisor"
                    class="mt-1 text-green-600 dark:text-green-400 text-xs flex items-center"
                  >
                    <UIcon
                      name="i-heroicons-check-circle-20-solid"
                      class="w-4 h-4 mr-1 flex-shrink-0"
                    />
                    {{ isEnglish ? 'Approved' : 'Patvirtinta' }}
                  </div>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ isEnglish ? '(signature) (name, surname)' : '(parašas) (vardas, pavardė)' }}
                </p>
              </div>
            </div>

            <!-- Comment Input Area -->
            <div
              v-if="activeCommentField"
              class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-md border border-blue-200 dark:border-blue-700 sticky bottom-0 shadow-md"
            >
              <h4 class="font-medium mb-2 text-blue-800 dark:text-blue-200">
                {{ $t('add_comment_for_field', { field: getFieldLabel(activeCommentField) }) || `Comment on ${getFieldLabel(activeCommentField)}` }}
              </h4>
              <UTextarea
                v-model="newComment"
                :placeholder="$t('type_your_comment') || 'Type your comment here...'"
                rows="3"
                class="mb-3"
              />
              <div class="flex justify-end gap-2">
                <UButton
                  color="gray"
                  variant="ghost"
                  @click="cancelComment"
                >
                  {{ $t('cancel') || 'Cancel' }}
                </UButton>
                <UButton
                  color="primary"
                  :loading="isSavingComment"
                  @click="submitFieldComment"
                >
                  {{ $t('save_comment') || 'Save Comment' }}
                </UButton>
              </div>
            </div>
          </div>

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
                {{ $t('edit_assignment') || 'Edit Assignment' }}
              </UButton>
              <div v-else />

              <div class="space-x-2">
                <UButton
                  v-if="canSubmitForReview"
                  color="emerald"
                  :loading="isSubmitting"
                  icon="i-heroicons-paper-airplane-20-solid"
                  @click="submitForReview"
                >
                  {{ $t('submit_for_review') || 'Submit for Review' }}
                </UButton>
                <UButton
                  v-else-if="currentStatus === 'submitted'"
                  color="blue"
                  :disabled="true"
                  icon="i-heroicons-clock-20-solid"
                >
                  {{ $t('submitted_waiting_review') || 'Waiting for Review' }}
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
                {{ $t('return_for_revision') || 'Return for Revision' }}
              </UButton>
              <UButton
                color="success"
                :loading="isSubmitting"
                icon="i-heroicons-check-badge-20-solid"
                @click="approveAssignment"
              >
                {{ $t('approve_assignment') || 'Approve Assignment' }}
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
              {{ $t('assignment_approved') || 'Assignment Approved' }}
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
                {{ $t('close') || 'Close' }}
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, defineProps, defineEmits } from 'vue'
import type { FormError } from '@nuxt/ui/dist/runtime/types'
import { useAuthStore } from '~/stores/auth' // Adjust path as needed

// Import UI helper components
const ProjectField = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: String, default: '' },
    fieldName: { type: String, required: true },
    isSupervisor: { type: Boolean, default: false },
    status: { type: String, default: 'draft' },
    comments: { type: Array, default: () => [] },
    canReply: { type: Boolean, default: false },
    preformatted: { type: Boolean, default: false }
  },
  emits: ['open-comment', 'reply'],
  setup(props, { emit }) {
    const canComment = computed(() => {
      return props.isSupervisor
        && (props.status === 'submitted' || props.status === 'revision_requested')
    })

    return () => h('div', { class: 'mb-4' }, [
      // Field Label with comment count
      h('div', { class: 'flex items-center justify-between' }, [
        h('h4', { class: 'font-medium text-gray-700 dark:text-gray-300' }, [
          `${props.label}:`,
          props.comments?.length > 0
            ? h('span', {
                class: 'inline-flex items-center ml-2 text-xs text-blue-600 dark:text-blue-400'
              }, [
                h(resolveComponent('UIcon'), {
                  name: 'i-heroicons-chat-bubble-left-20-solid',
                  class: 'w-4 h-4 mr-1'
                }),
                props.comments.length
              ])
            : null
        ]),

        // Comment button for supervisor
        canComment.value
          ? h(resolveComponent('UButton'), {
              size: 'xs',
              color: 'primary',
              variant: 'ghost',
              icon: 'i-heroicons-chat-bubble-left-20-solid',
              onClick: () => emit('open-comment', props.fieldName)
            }, {
              default: () => 'Add Comment'
            })
          : null
      ]),

      // Field Value display
      h('div', {
        class: 'mt-1 p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700'
      }, [
        props.preformatted
          ? h('div', { class: 'whitespace-pre-wrap text-sm' }, props.value || '-')
          : h('div', { class: 'text-sm' }, props.value || '-')
      ]),

      // Comments section
      props.comments?.length > 0
        ? h(resolveComponent('FieldCommentSection'), {
            fieldComments: props.comments,
            canReply: props.canReply,
            onReply: data => emit('reply', data)
          })
        : null
    ])
  }
})

// Component props
const props = defineProps({
  studentRecordId: { type: Number, required: true },
  formVariant: { type: String, default: 'lt', validator: (v: string) => ['lt', 'en'].includes(v) },
  studentName: { type: String, default: '' },
  studentGroup: { type: String, default: '' },
  // Button props
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

// Localization helper
const isEnglish = computed(() => props.formVariant === 'en')

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

// Form data structure
interface FormDataType {
  TITLE: string
  TITLE_EN: string
  OBJECTIVE: string
  TASKS: string
  IMPLEMENTATION_TOOLS: string
  DEFENSE_DATE: string
  SUPERVISOR: string
  versionComment: string
  NAME: string
  GROUP: string
  ASSIGNMENT_DATE?: number
}

// Form data
const formData = ref<FormDataType>({
  TITLE: '', TITLE_EN: '', OBJECTIVE: '', TASKS: '', IMPLEMENTATION_TOOLS: '',
  DEFENSE_DATE: '', SUPERVISOR: '', versionComment: '', NAME: '', GROUP: ''
})

// Computed properties
const currentVersion = computed(() => {
  if (!selectedVersionId.value) return null
  return versions.value.find(v => v.id === selectedVersionId.value) ?? null
})

const currentAssignmentData = computed(() => currentVersion.value?.data ?? null)

const versionOptions = computed(() => {
  return [...versions.value]
    .sort((a, b) => b.createdDate - a.createdDate)
    .map((v, index, arr) => ({
      label: formatVersionLabel(v, true, arr.length - index),
      value: v.id
    }))
})

const selectedVersionLabel = computed(() => {
  const selectedOption = versionOptions.value.find(opt => opt.value === selectedVersionId.value)
  return selectedOption?.label || null
})

// Workflow state computed properties
const canEditAssignment = computed(() =>
  isStudent.value && ['draft', 'revision_requested'].includes(currentStatus.value ?? ''))

const canSubmitForReview = computed(() =>
  isStudent.value && ['draft', 'revision_requested'].includes(currentStatus.value ?? ''))

const canReplyToComments = computed(() =>
  (isStudent.value || isSupervisor.value) && currentStatus.value !== 'approved')

const assignmentApprovedByStudent = computed(() =>
  ['submitted', 'approved'].includes(currentStatus.value ?? ''))

const assignmentApprovedBySupervisor = computed(() =>
  currentStatus.value === 'approved')

// === Methods ===

// Modal management
const openModal = async () => {
  isOpen.value = true
  mode.value = 'view' // Always start in view mode
  await fetchData()
}

const closeModal = () => {
  isOpen.value = false
  error.value = null
  activeCommentField.value = null
  newComment.value = ''
}

// Data fetching
const fetchData = async () => {
  isLoading.value = true
  error.value = null

  try {
    const response = await $fetch<{ versions: any[], comments: any[], status: string }>(
      `/api/assignments/${props.studentRecordId}/versions`
    )

    versions.value = response.versions || []
    comments.value = response.comments || []
    currentStatus.value = response.status || (versions.value.length > 0 ? 'draft' : null)

    // Select latest version if not already selected
    if (versions.value.length > 0 && (!selectedVersionId.value
      || !versions.value.some(v => v.id === selectedVersionId.value))) {
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

// Form management
const createNewAssignment = () => {
  mode.value = 'edit'
  resetForm()

  // Pre-fill known student data
  formData.value.NAME = props.studentName || t('unknown_student')
  formData.value.GROUP = props.studentGroup || t('unknown_group')
  formData.value.DEFENSE_DATE = isEnglish.value
    ? 'January 7, 2025'
    : '2025 m. sausio mėn. 6 d.'
  formData.value.versionComment = t('initial_draft_comment') || 'Initial draft'
  formData.value.ASSIGNMENT_DATE = Math.floor(Date.now() / 1000)
}

const startEditing = () => {
  if (!currentAssignmentData.value) return

  mode.value = 'edit'
  resetForm()

  // Populate form with data from the currently selected version
  formData.value = {
    ...formData.value, // Keep defaults
    TITLE: currentAssignmentData.value.TITLE || '',
    TITLE_EN: currentAssignmentData.value.TITLE_EN || '',
    OBJECTIVE: currentAssignmentData.value.OBJECTIVE || '',
    TASKS: currentAssignmentData.value.TASKS || '',
    IMPLEMENTATION_TOOLS: currentAssignmentData.value.IMPLEMENTATION_TOOLS || '',
    DEFENSE_DATE: currentAssignmentData.value.DEFENSE_DATE
      || (isEnglish.value ? 'January 7, 2025' : '2025 m. sausio mėn. 6 d.'),
    SUPERVISOR: currentAssignmentData.value.SUPERVISOR || '',
    NAME: currentAssignmentData.value.NAME || props.studentName || '',
    GROUP: currentAssignmentData.value.GROUP || props.studentGroup || '',
    ASSIGNMENT_DATE: currentAssignmentData.value.ASSIGNMENT_DATE,
    versionComment: '' // Require new comment for edits
  }
}

const cancelEdit = () => {
  mode.value = 'view'
  resetForm()
}

const resetForm = () => {
  formData.value = {
    TITLE: '', TITLE_EN: '', OBJECTIVE: '', TASKS: '', IMPLEMENTATION_TOOLS: '',
    DEFENSE_DATE: '', SUPERVISOR: '', versionComment: '', NAME: '', GROUP: '',
    ASSIGNMENT_DATE: undefined
  }
}

const validateForm = (state: FormDataType): FormError[] => {
  const errors: FormError[] = []

  if (!state.TITLE.trim())
    errors.push({ path: 'TITLE', message: t('validation_required') || 'This field is required' })

  if (!state.TITLE_EN.trim())
    errors.push({ path: 'TITLE_EN', message: t('validation_required') || 'This field is required' })

  if (!state.OBJECTIVE.trim())
    errors.push({ path: 'OBJECTIVE', message: t('validation_required') || 'This field is required' })

  if (!state.TASKS.trim())
    errors.push({ path: 'TASKS', message: t('validation_required') || 'This field is required' })

  if (!state.IMPLEMENTATION_TOOLS.trim())
    errors.push({ path: 'IMPLEMENTATION_TOOLS', message: t('validation_required') || 'This field is required' })

  if (!state.SUPERVISOR.trim())
    errors.push({ path: 'SUPERVISOR', message: t('validation_required') || 'This field is required' })

  if (!state.versionComment.trim())
    errors.push({ path: 'versionComment', message: t('validation_required') || 'This field is required' })

  return errors
}

const saveAssignment = async () => {
  isSaving.value = true
  error.value = null

  try {
    const { versionComment, ...assignmentData } = formData.value

    const payload = {
      studentRecordId: props.studentRecordId,
      data: assignmentData,
      comment: versionComment,
      status: 'draft' // Saving always results in a draft
    }

    await $fetch('/api/assignments/save', {
      method: 'POST',
      body: payload
    })

    toast.add({
      title: t('success') || 'Success',
      description: t('assignment_saved_draft') || 'Assignment saved as draft',
      color: 'green'
    })

    await fetchData() // Refresh data
    mode.value = 'view' // Return to view mode
    emit('updated')
  }
  catch (err: any) {
    console.error('Error saving assignment:', err)
    error.value = err.data?.message || err.message || t('error_saving_assignment')
    toast.add({ title: t('error') || 'Error', description: error.value, color: 'red' })
  }
  finally {
    isSaving.value = false
  }
}

// Status update functions
const updateStatus = async (newStatus: string) => {
  if (!selectedVersionId.value) {
    toast.add({
      title: t('error') || 'Error',
      description: t('error_no_version_selected') || 'No version selected',
      color: 'red'
    })
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

    await $fetch('/api/assignments/update-status', {
      method: 'POST',
      body: payload
    })

    let successMessage = t('status_updated_success') || 'Status updated successfully'

    switch (newStatus) {
      case 'submitted':
        successMessage = t('assignment_submitted_success') || 'Assignment submitted successfully'
        break
      case 'revision_requested':
        successMessage = t('assignment_returned_success') || 'Assignment returned for revision'
        break
      case 'approved':
        successMessage = t('assignment_approved_success') || 'Assignment approved successfully'
        break
    }

    toast.add({
      title: t('success') || 'Success',
      description: successMessage,
      color: 'green'
    })

    await fetchData() // Refresh data

    emit('updated')
    if (newStatus === 'approved') {
      emit('approved')
    }
  }
  catch (err: any) {
    console.error(`Error updating status to ${newStatus}:`, err)
    error.value = err.data?.message || err.message || t('error_updating_status')
    toast.add({ title: t('error') || 'Error', description: error.value, color: 'red' })
  }
  finally {
    isSubmitting.value = false
  }
}

// Status update wrappers
const submitForReview = () => updateStatus('submitted')
const returnForRevision = () => updateStatus('revision_requested')
const approveAssignment = () => updateStatus('approved')

// Comment management
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
      versionId: selectedVersionId.value,
      fieldName: activeCommentField.value,
      text: newComment.value,
      role: isSupervisor.value ? 'supervisor' : 'student'
    }

    await $fetch('/api/assignments/comments', {
      method: 'POST',
      body: payload
    })

    toast.add({
      title: t('success') || 'Success',
      description: t('comment_added_success') || 'Comment added successfully',
      color: 'green'
    })

    await fetchComments()
    cancelComment()
  }
  catch (err: any) {
    console.error('Error adding comment:', err)
    toast.add({
      title: t('error') || 'Error',
      description: err.data?.message || t('error_adding_comment') || 'Error adding comment',
      color: 'red'
    })
  }
  finally {
    isSavingComment.value = false
  }
}

const addCommentReply = async (replyData: { parentId: number | string, text: string }) => {
  isSavingComment.value = true

  try {
    const payload = {
      studentRecordId: props.studentRecordId,
      parentCommentId: replyData.parentId,
      text: replyData.text,
      role: isSupervisor.value ? 'supervisor' : 'student'
    }

    await $fetch('/api/assignments/comment-replies', {
      method: 'POST',
      body: payload
    })

    toast.add({
      title: t('success') || 'Success',
      description: t('reply_added_success') || 'Reply added successfully',
      color: 'green'
    })

    await fetchComments()
  }
  catch (err: any) {
    console.error('Error adding comment reply:', err)
    toast.add({
      title: t('error') || 'Error',
      description: err.data?.message || t('error_adding_reply') || 'Error adding reply',
      color: 'red'
    })
  }
  finally {
    isSavingComment.value = false
  }
}

const fetchComments = async () => {
  try {
    const response = await $fetch<{ comments: any[] }>(`/api/assignments/${props.studentRecordId}/comments`)
    comments.value = response.comments || []
  }
  catch (err) {
    console.error('Error refreshing comments:', err)
  }
}

// Comment helpers
const getCommentsForField = (fieldName: string) => {
  // Filter top-level comments for the field
  const fieldComments = comments.value.filter(c => c.fieldName === fieldName && !c.parentId)

  // Add replies
  return fieldComments.map(comment => ({
    ...comment,
    replies: comments.value
      .filter(reply => reply.parentId === comment.id)
      .sort((a, b) => a.createdAt - b.createdAt)
  })).sort((a, b) => a.createdAt - b.createdAt)
}

// UI & Button helpers
const getButtonLabel = () => {
  if (props.buttonLabel) return props.buttonLabel

  if (!currentStatus.value) {
    return isStudent.value
      ? (t('create_assignment') || 'Create Assignment')
      : (t('view_assignment') || 'View Assignment')
  }

  return t('view_assignment') || 'View Assignment'
}

const getButtonColor = () => {
  if (props.buttonColor) return props.buttonColor

  if (!currentStatus.value && isStudent.value) {
    return 'primary'
  }

  if (currentStatus.value === 'submitted' && isSupervisor.value) {
    return 'warning'
  }

  if (currentStatus.value === 'revision_requested' && isStudent.value) {
    return 'warning'
  }

  return 'white'
}

const getButtonIcon = () => {
  if (props.buttonIcon) return props.buttonIcon

  if (!currentStatus.value && isStudent.value) {
    return 'i-heroicons-plus'
  }

  if (currentStatus.value === 'submitted' && isSupervisor.value) {
    return 'i-heroicons-clipboard-document-check'
  }

  if (currentStatus.value === 'revision_requested' && isStudent.value) {
    return 'i-heroicons-pencil'
  }

  return 'i-heroicons-document-text'
}

// Status helpers
const getStatusColor = (status: string | null): string => {
  switch (status) {
    case 'draft': return 'gray'
    case 'submitted': return 'blue'
    case 'revision_requested': return 'orange'
    case 'approved': return 'green'
    default: return 'gray'
  }
}

const getStatusLabel = (status: string | null): string => {
  switch (status) {
    case 'draft':
      return t('status_draft') || 'Draft'
    case 'submitted':
      return t('status_submitted') || 'Submitted'
    case 'revision_requested':
      return t('status_revision_requested') || 'Revision Requested'
    case 'approved':
      return t('status_approved') || 'Approved'
    default:
      return ''
  }
}

// Formatting helpers
const formatDate = (timestamp: number | string | Date | undefined): string => {
  if (!timestamp) return '-'
  try {
    const date = new Date(typeof timestamp === 'string' ? timestamp : Number(timestamp) * 1000)
    return date.toLocaleString(isEnglish.value ? 'en-CA' : 'lt-LT', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }
  catch (e) { return 'Invalid Date' }
}

const formatAssignmentDate = (timestamp: number | string | Date | undefined): string => {
  if (!timestamp) return t('assignment_date_default') || 'Date not specified'
  try {
    const date = new Date(typeof timestamp === 'string' ? timestamp : Number(timestamp) * 1000)
    return date.toLocaleDateString(isEnglish.value ? 'en-CA' : 'lt-LT', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  }
  catch (e) { return 'Invalid Date' }
}

const formatVersionLabel = (version: any, includeDate = true, versionNumber?: number): string => {
  if (!version) return ''
  const vNum = versionNumber ?? (versions.value.findIndex(v => v.id === version.id) + 1)
  const authorRole = version.createdByRole === 'supervisor' ? 'supervisor' : 'student'
  const authorType = t(authorRole) || authorRole

  let label = `V${vNum} (${authorType})`
  if (includeDate && version.createdDate) {
    label += ` - ${formatDate(version.createdDate)}`
  }
  return label
}

const getFieldLabel = (fieldName: string | null): string => {
  if (!fieldName) return ''
  const labels: Record<string, string> = {
    TITLE: t('final_project_title') || 'Final Project Title',
    TITLE_EN: t('final_project_title_en') || 'Final Project Title (English)',
    OBJECTIVE: t('project_objective') || 'Project Objective',
    TASKS: t('project_tasks') || 'Project Tasks',
    IMPLEMENTATION_TOOLS: t('implementation_tools') || 'Implementation Tools'
  }
  return labels[fieldName] || fieldName
}

// Watchers
watch(selectedVersionId, (newId, oldId) => {
  if (newId !== oldId) {
    // Reset comment state when version changes
    cancelComment()
  }
})
</script>
