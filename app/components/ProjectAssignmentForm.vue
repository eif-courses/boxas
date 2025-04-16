<template>
  <div class="px-2 py-4">
    <!-- Loading state -->
    <div
      v-if="isLoading"
      class="flex justify-center items-center py-16"
    >
      <USkeleton class="h-32 w-full" />
    </div>

    <!-- Error state -->
    <UAlert
      v-else-if="hasError"
      color="red"
      title="Error"
      :description="errorMessage"
    />

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

      <!-- Debug info - remove in production -->
      <div class="text-xs text-gray-500 p-2 bg-gray-50 rounded mb-2">
        User Role: {{ userRole }}, Can Edit: {{ canEdit }}, Status: {{ formData.status }}
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-between items-center">
        <div class="flex gap-2">
          <UButton
            v-if="language === 'lt'"
            variant="outline"
            @click="switchToEnglish"
          >
            Switch to English
          </UButton>
          <UButton
            v-else
            variant="outline"
            @click="switchToLithuanian"
          >
            Perjungti į lietuvių k.
          </UButton>
        </div>

        <div class="flex gap-2">
          <!-- Student buttons -->
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
            <UButton
              v-if="canSave"
              color="primary"
              icon="i-heroicons-document-check"
              :loading="isSaving"
              @click="saveAssignment"
            >
              {{ language === 'lt' ? 'Išsaugoti' : 'Save' }}
            </UButton>
          </div>

          <!-- Supervisor buttons -->
          <div v-if="isSupervisorRole">
            <UButton
              v-if="canApprove"
              color="success"
              icon="i-heroicons-check"
              :loading="isApproving"
              @click="approveAssignment"
            >
              {{ language === 'lt' ? 'Patvirtinti' : 'Approve' }}
            </UButton>
            <UButton
              v-if="canRequestRevision"
              color="warning"
              icon="i-heroicons-arrow-path"
              :loading="isRequestingRevision"
              @click="requestRevision"
            >
              {{ language === 'lt' ? 'Prašyti pataisymų' : 'Request revision' }}
            </UButton>
          </div>
        </div>
      </div>

      <UForm
        :state="formData"
        @submit.prevent="saveAssignment"
      >
        <!-- Student Group -->
        <div class="bg-gray-50 p-4 rounded-lg mb-6">
          <UFormGroup :label="language === 'lt' ? 'Grupė' : 'Group'">
            <UInput
              v-model="formData.studentGroup"
              disabled
            />
          </UFormGroup>
        </div>

        <!-- Title Section with Comments -->
        <div class="bg-gray-50 p-4 rounded-lg mb-6">
          <UFormGroup :label="language === 'lt' ? 'Baigiamojo darbo tema' : 'Final Project Title'">
            <UInput
              v-if="language === 'lt'"
              v-model="formData.finalProjectTitle"
              :placeholder="language === 'lt' ? 'Baigiamojo darbo temos pavadinimas' : 'Final Project Title'"
              :disabled="!isStudentRole"
            />
            <UInput
              v-else
              v-model="formData.finalProjectTitleEn"
              placeholder="Final Project Title"
              :disabled="!isStudentRole"
            />
          </UFormGroup>

          <!-- Comments for this section -->
          <SectionComments
            v-if="showComments"
            :field-name="language === 'lt' ? 'finalProjectTitle' : 'finalProjectTitleEn'"
            :comments="getCommentsForField(language === 'lt' ? 'finalProjectTitle' : 'finalProjectTitleEn')"
            :user-role="userRole"
            :assignment-id="assignmentId"
            @comment-added="fetchComments"
          />
        </div>

        <!-- Objective Section with Comments -->
        <div class="bg-gray-50 p-4 rounded-lg mb-6">
          <UFormGroup :label="language === 'lt' ? 'Baigiamojo darbo tikslas' : 'Final Project Objective'">
            <UTextarea
              v-if="language === 'lt'"
              v-model="formData.objective"
              :placeholder="language === 'lt' ? 'Trumpas, aiškus, nusakomas vienu sakiniu, orientuotas į kuriamą programinę įrangą' : 'Brief, clear objective described in one sentence'"
              :disabled="!isStudentRole"
              :rows="3"
            />
            <UTextarea
              v-else
              v-model="formData.objectiveEn"
              placeholder="A brief, clear, one-sentence description focused on the software being developed"
              :disabled="!isStudentRole"
              :rows="3"
            />
          </UFormGroup>

          <!-- Comments for this section -->
          <SectionComments
            v-if="showComments"
            :field-name="language === 'lt' ? 'objective' : 'objectiveEn'"
            :comments="getCommentsForField(language === 'lt' ? 'objective' : 'objectiveEn')"
            :user-role="userRole"
            :assignment-id="assignmentId"
            @comment-added="fetchComments"
          />
        </div>

        <!-- Tasks Section with Comments -->
        <div class="bg-gray-50 p-4 rounded-lg mb-6">
          <UFormGroup :label="language === 'lt' ? 'Baigiamojo darbo uždaviniai' : 'Final Project Tasks'">
            <UTextarea
              v-if="language === 'lt'"
              v-model="formData.tasks"
              :placeholder="language === 'lt' ? 'Išvardinti preliminarius uždavinius, kurie padės pasiekti tikslą' : 'List the preliminary tasks that will help achieve the objective'"
              :disabled="!isStudentRole"
              :rows="5"
            />
            <UTextarea
              v-else
              v-model="formData.tasksEn"
              placeholder="List preliminary tasks that will help achieve the objective"
              :disabled="!isStudentRole"
              :rows="5"
            />
          </UFormGroup>

          <!-- Comments for this section -->
          <SectionComments
            v-if="showComments"
            :field-name="language === 'lt' ? 'tasks' : 'tasksEn'"
            :comments="getCommentsForField(language === 'lt' ? 'tasks' : 'tasksEn')"
            :user-role="userRole"
            :assignment-id="assignmentId"
            @comment-added="fetchComments"
          />
        </div>

        <!-- Tools Section with Comments -->
        <div class="bg-gray-50 p-4 rounded-lg mb-6">
          <UFormGroup :label="language === 'lt' ? 'Baigiamojo darbo realizavimo priemonės' : 'Tools for Final Project Implementation'">
            <UTextarea
              v-if="language === 'lt'"
              v-model="formData.tools"
              :placeholder="language === 'lt' ? 'Išvardyti įrankius ir technologijas, kurie bus naudojami kuriant programinę įrangą' : 'List the tools and technologies that will be used in development'"
              :disabled="!isStudentRole"
              :rows="3"
            />
            <UTextarea
              v-else
              v-model="formData.toolsEn"
              placeholder="List the tools and technologies that will be used in the development of the software"
              :disabled="!isStudentRole"
              :rows="3"
            />
          </UFormGroup>

          <!-- Comments for this section -->
          <SectionComments
            v-if="showComments"
            :field-name="language === 'lt' ? 'tools' : 'toolsEn'"
            :comments="getCommentsForField(language === 'lt' ? 'tools' : 'toolsEn')"
            :user-role="userRole"
            :assignment-id="assignmentId"
            @comment-added="fetchComments"
          />
        </div>

        <!-- General Comments Section -->
        <div
          v-if="showComments"
          class="bg-gray-50 p-4 rounded-lg mb-6"
        >
          <h3 class="font-medium mb-3">
            {{ language === 'lt' ? 'Bendri komentarai' : 'General Comments' }}
          </h3>
          <SectionComments
            :field-name="null"
            :comments="getCommentsForField(null)"
            :user-role="userRole"
            :assignment-id="assignmentId"
            @comment-added="fetchComments"
          />
        </div>

        <!-- Form save button (for students in editable states) -->
        <div
          v-if="isStudentRole"
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

      <!-- Version History Drawer -->
      <UButton
        v-if="versions.length > 1"
        variant="ghost"
        color="gray"
        icon="i-heroicons-clock"
        @click="showVersionHistory = true"
      >
        {{ language === 'lt' ? 'Versijų istorija' : 'Version History' }}
      </UButton>

      <USlideover v-model="showVersionHistory">
        <UCard>
          <template #header>
            <h3 class="text-xl font-semibold">
              {{ language === 'lt' ? 'Versijų istorija' : 'Version History' }}
            </h3>
          </template>

          <div class="p-4">
            <UTable
              :rows="versions"
              :columns="versionColumns"
              hover
              @select="onVersionSelect"
            >
              <template #version-cell="{ row }">
                <div class="flex items-center gap-2">
                  <UBadge
                    v-if="row.createdBy === 'student'"
                    color="green"
                  >
                    {{ language === 'lt' ? 'Studentas' : 'Student' }}
                  </UBadge>
                  <UBadge
                    v-else
                    color="blue"
                  >
                    {{ language === 'lt' ? 'Vadovas' : 'Supervisor' }}
                  </UBadge>
                  <span class="font-semibold">#{{ row.id }}</span>
                </div>
              </template>

              <template #date-cell="{ row }">
                <div>
                  {{ formatDate(row.createdDate) }}
                </div>
              </template>

              <template #comment-cell="{ row }">
                <div class="max-w-md truncate">
                  {{ row.comment || (language === 'lt' ? 'Nėra komentaro' : 'No comment') }}
                </div>
              </template>

              <template #actions-cell="{ row }">
                <UTooltip :text="language === 'lt' ? 'Peržiūrėti šią versiją' : 'View this version'">
                  <UButton
                    color="primary"
                    variant="ghost"
                    icon="i-heroicons-eye"
                    size="sm"
                    @click="loadVersion(row)"
                  />
                </UTooltip>
              </template>
            </UTable>
          </div>

          <template #footer>
            <div class="flex justify-end">
              <UButton
                color="gray"
                @click="showVersionHistory = false"
              >
                {{ language === 'lt' ? 'Uždaryti' : 'Close' }}
              </UButton>
            </div>
          </template>
        </UCard>
      </USlideover>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SectionComments from './SectionComments.vue'
import { useAuthStore } from '~/stores/auth'

const props = defineProps({
  assignmentId: {
    type: [String, Number],
    required: true
  }
})

const emit = defineEmits(['saved', 'submitted'])

// User and language state
const { t } = useI18n()
const language = ref('lt')
const switchToEnglish = () => language.value = 'en'
const switchToLithuanian = () => language.value = 'lt'

// Force student role for now - You can remove this hardcoding once roles work correctly
//const userRole = ref('student')
const userRole = ref('supervisor')


// Create simplified role checks to avoid complex computed property issues
const isStudentRole = computed(() => userRole.value === 'student')
const isSupervisorRole = computed(() => userRole.value === 'supervisor')

// UI state
const isLoading = ref(true)
const isSaving = ref(false)
const isSubmitting = ref(false)
const isApproving = ref(false)
const isRequestingRevision = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const showVersionHistory = ref(false)

// Data
const formData = ref({
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
})

const comments = ref([])
const versions = ref([])

// Computed properties - simplified
const canEdit = computed(() => {
  // Always allow students to edit in most cases
  // We're now controlling this directly in the template inputs
  return true
})

const canSave = computed(() => {
  return isStudentRole.value
})

const canSubmit = computed(() => {
  if (isStudentRole.value) {
    return ['draft', 'revision_requested'].includes(formData.value.status)
  }
  return false
})

const canApprove = computed(() => {
  if (isSupervisorRole.value) {
    return formData.value.status === 'submitted'
  }
  return false
})

const canRequestRevision = computed(() => {
  if (isSupervisorRole.value) {
    return formData.value.status === 'submitted'
  }
  return false
})

const showComments = computed(() => {
  // Show comments if there are any, or if supervisor is viewing a submitted form
  return comments.value.length > 0
    || (isSupervisorRole.value && formData.value.status === 'submitted')
})

// Version history columns
const versionColumns = computed(() => [
  {
    key: 'version',
    label: language.value === 'lt' ? 'Versija' : 'Version'
  },
  {
    key: 'date',
    label: language.value === 'lt' ? 'Data' : 'Date'
  },
  {
    key: 'comment',
    label: language.value === 'lt' ? 'Komentaras' : 'Comment'
  },
  {
    key: 'actions',
    label: language.value === 'lt' ? 'Veiksmai' : 'Actions'
  }
])

// Fetch assignment data
const fetchAssignment = async () => {
  isLoading.value = true
  hasError.value = false

  try {
    // Check if this is a new assignment (no data exists yet)
    const isNewAssignment = props.assignmentId === 'new'

    if (isNewAssignment) {
      console.log('This is a new assignment - using defaults')

      // For new assignments, we don't need to fetch anything
      // Just use the default form data values
      isLoading.value = false
      return
    }

    // For existing assignments, fetch the data
    const { data } = await useFetch(`/api/projectAssignments/${props.assignmentId}/summary`)

    console.log('Fetched assignment data:', data.value)

    if (data.value) {
      // Update form data with values from the server
      formData.value = {
        ...formData.value, // Preserve defaults
        ...data.value // Override with server data
      }
    }

    await fetchComments()
    await fetchVersions()
  }
  catch (error) {
    console.error('Error fetching assignment:', error)
    hasError.value = true
    errorMessage.value = language.value === 'lt'
      ? 'Nepavyko įkelti užduoties duomenų'
      : 'Failed to load assignment data'
  }
  finally {
    isLoading.value = false
  }
}

// Fetch comments
const fetchComments = async () => {
  try {
    const { data } = await useFetch(`/api/projectAssignments/${props.assignmentId}/comments`)

    if (data.value) {
      comments.value = data.value
    }
  }
  catch (error) {
    console.error('Error fetching comments:', error)
  }
}

// Fetch versions
const fetchVersions = async () => {
  try {
    const { data } = await useFetch(`/api/projectAssignments/${props.assignmentId}/versions`)

    if (data.value) {
      versions.value = data.value
    }
  }
  catch (error) {
    console.error('Error fetching versions:', error)
  }
}

// Get comments for a specific field
const getCommentsForField = (fieldName) => {
  return comments.value.filter(comment => comment.fieldName === fieldName)
}

// Save the assignment
const saveAssignment = async () => {
  if (!canSave.value) return

  isSaving.value = true

  try {
    const response = await fetch('/api/projectAssignments/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assignmentId: props.assignmentId,
        versionData: formData.value,
        comment: language.value === 'lt' ? 'Išsaugota' : 'Saved'
      })
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }

    // Notify parent about save
    emit('saved')

    // Show notification
    useToast().add({
      title: language.value === 'lt' ? 'Sėkmingai išsaugota' : 'Successfully saved',
      description: language.value === 'lt' ? 'Užduotis sėkmingai išsaugota' : 'Assignment successfully saved',
      color: 'green'
    })

    // Refresh versions
    await fetchVersions()
  }
  catch (error) {
    console.error('Error saving assignment:', error)

    useToast().add({
      title: language.value === 'lt' ? 'Klaida' : 'Error',
      description: language.value === 'lt' ? 'Nepavyko išsaugoti užduoties' : 'Failed to save assignment',
      color: 'red'
    })
  }
  finally {
    isSaving.value = false
  }
}

// Submit the assignment
const submitAssignment = async () => {
  if (!canSubmit.value) return

  // First save the changes
  await saveAssignment()

  isSubmitting.value = true

  try {
    const response = await fetch('/api/projectAssignments/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assignmentId: props.assignmentId,
        status: 'submitted'
      })
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }

    // Update local status
    formData.value.status = 'submitted'

    // Notify parent
    emit('submitted')

    // Show notification
    useToast().add({
      title: language.value === 'lt' ? 'Sėkmingai pateikta' : 'Successfully submitted',
      description: language.value === 'lt' ? 'Užduotis sėkmingai pateikta vadovui' : 'Assignment successfully submitted to supervisor',
      color: 'green'
    })
  }
  catch (error) {
    console.error('Error submitting assignment:', error)

    useToast().add({
      title: language.value === 'lt' ? 'Klaida' : 'Error',
      description: language.value === 'lt' ? 'Nepavyko pateikti užduoties' : 'Failed to submit assignment',
      color: 'red'
    })
  }
  finally {
    isSubmitting.value = false
  }
}

// Approve the assignment (for supervisors)
const approveAssignment = async () => {
  if (!canApprove.value) return

  isApproving.value = true

  try {
    const response = await fetch('/api/projectAssignments/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assignmentId: props.assignmentId,
        status: 'approved'
      })
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }

    // Update local status
    formData.value.status = 'approved'

    // Show notification
    useToast().add({
      title: language.value === 'lt' ? 'Sėkmingai patvirtinta' : 'Successfully approved',
      description: language.value === 'lt' ? 'Užduotis sėkmingai patvirtinta' : 'Assignment successfully approved',
      color: 'green'
    })
  }
  catch (error) {
    console.error('Error approving assignment:', error)

    useToast().add({
      title: language.value === 'lt' ? 'Klaida' : 'Error',
      description: language.value === 'lt' ? 'Nepavyko patvirtinti užduoties' : 'Failed to approve assignment',
      color: 'red'
    })
  }
  finally {
    isApproving.value = false
  }
}

// Request revision (for supervisors)
const requestRevision = async () => {
  if (!canRequestRevision.value) return

  isRequestingRevision.value = true

  try {
    const response = await fetch('/api/projectAssignments/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assignmentId: props.assignmentId,
        status: 'revision_requested'
      })
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }

    // Update local status
    formData.value.status = 'revision_requested'

    // Show notification
    useToast().add({
      title: language.value === 'lt' ? 'Prašymas atnaujinti' : 'Revision requested',
      description: language.value === 'lt' ? 'Prašymas atlikti pataisymus sėkmingai išsiųstas' : 'Revision request sent successfully',
      color: 'yellow'
    })
  }
  catch (error) {
    console.error('Error requesting revision:', error)

    useToast().add({
      title: language.value === 'lt' ? 'Klaida' : 'Error',
      description: language.value === 'lt' ? 'Nepavyko paprašyti pataisymų' : 'Failed to request revision',
      color: 'red'
    })
  }
  finally {
    isRequestingRevision.value = false
  }
}

// Version history functions
const formatDate = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleString()
}

const onVersionSelect = (row) => {
  loadVersion(row)
}

const loadVersion = (version) => {
  try {
    const versionData = JSON.parse(version.versionData)

    // Update form data with the version data
    // but keep the current status
    const currentStatus = formData.value.status

    formData.value = {
      ...versionData,
      status: currentStatus // Keep the current status
    }

    // Close the slideover
    showVersionHistory.value = false

    // Show notification
    useToast().add({
      title: language.value === 'lt' ? 'Versija įkelta' : 'Version loaded',
      description: language.value === 'lt' ? 'Pasirinkta versija sėkmingai įkelta' : 'Selected version loaded successfully',
      color: 'blue'
    })
  }
  catch (error) {
    console.error('Error loading version:', error)

    useToast().add({
      title: language.value === 'lt' ? 'Klaida' : 'Error',
      description: language.value === 'lt' ? 'Nepavyko įkelti versijos' : 'Failed to load version',
      color: 'red'
    })
  }
}

// Status helpers
const getStatusText = (status) => {
  switch (status) {
    case 'draft':
      return language.value === 'lt' ? 'Juodraštis' : 'Draft'
    case 'submitted':
      return language.value === 'lt' ? 'Pateikta' : 'Submitted'
    case 'revision_requested':
      return language.value === 'lt' ? 'Reikia pataisymų' : 'Revision Requested'
    case 'approved':
      return language.value === 'lt' ? 'Patvirtinta' : 'Approved'
    default:
      return language.value === 'lt' ? 'Nežinoma būsena' : 'Unknown Status'
  }
}

const getStatusDescription = (status) => {
  switch (status) {
    case 'draft':
      return language.value === 'lt'
        ? 'Užpildykite formą ir pateikite vadovui peržiūrėti'
        : 'Complete the form and submit it for supervisor review'
    case 'submitted':
      return language.value === 'lt'
        ? 'Forma pateikta vadovui peržiūrėti'
        : 'Form submitted for supervisor review'
    case 'revision_requested':
      return language.value === 'lt'
        ? 'Vadovas paprašė atlikti pataisymus. Peržiūrėkite komentarus'
        : 'Supervisor has requested revisions. Please check the comments'
    case 'approved':
      return language.value === 'lt'
        ? 'Vadovas patvirtino užduotį. Forma užbaigta'
        : 'Supervisor has approved the assignment. Form is complete'
    default:
      return ''
  }
}

const getStatusColor = (status) => {
  switch (status) {
    case 'draft': return 'gray'
    case 'submitted': return 'primary'
    case 'revision_requested': return 'warning'
    case 'approved': return 'success'
    default: return 'gray'
  }
}

// Log initial state for debugging
onMounted(() => {
  console.log('Component mounted - Assignment ID:', props.assignmentId)
  console.log('Current user role:', userRole.value)
  console.log('Initial form state:', formData.value)
  fetchAssignment()
})

// Watch for language changes to update computed props
watch(language, () => {
  // Force update of computed properties that depend on language
})
</script>
