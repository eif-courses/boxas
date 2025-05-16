<template>
  <UCard
    class="w-full"
    :ui="{
      base: '',
      ring: '',
      divide: 'divide-y divide-gray-200 dark:divide-gray-700',
      header: { padding: 'px-4 py-5' },
      body: { padding: '', base: 'divide-y divide-gray-200 dark:divide-gray-700' },
      footer: { padding: 'p-4' }
    }"
  >
    <div class="flex items-center justify-between gap-3 px-4 py-3">
      <UInput
        v-model="search"
        icon="i-heroicons-magnifying-glass-20-solid"
        class="w-full"
        :placeholder="$t('search')"
      />
    </div>

    <div class="flex flex-col md:flex-row md:justify-between md:items-center w-full px-4 py-3 gap-3">
      <div class="grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:items-center">
        <div class="flex items-center gap-1.5">
          <span class="text-sm leading-5 whitespace-nowrap">{{ $t('filter_record_count') }}</span>
          <USelect
            v-model="pageCount"
            :options="[3, 5, 10, 20, 30, 40]"
            class="w-16"
            size="xs"
            @update:model-value="value => pageCount = Number(value)"
          />
        </div>

        <div class="flex items-center gap-1.5">
          <span class="text-sm leading-5 whitespace-nowrap">{{ $t('year') }}</span>
          <USelect
            v-model="yearFilter"
            :options="availableYears"
            class="w-22"
            size="xs"
            :placeholder="$t('latest')"
            clearable
            :loading="yearsLoading"
          />
        </div>

        <div class="flex items-center gap-1.5">
          <span class="text-sm leading-5 whitespace-nowrap">{{ $t('group') }}</span>
          <USelect
            v-model="groupFilter"
            :options="uniqueGroups"
            class="w-20 flex-grow"
            size="xs"
            :placeholder="$t('all')"
            clearable
          />
        </div>

        <div class="flex items-center gap-1.5">
          <span class="text-sm leading-5 whitespace-nowrap"> {{ $t('study_program') }}</span>
          <USelect
            v-model="programFilter"
            :options="uniquePrograms"
            class="w-28 flex-grow"
            size="xs"
            :placeholder="$t('all')"
            clearable
          />
        </div>
      </div>

      <div class="flex flex-wrap gap-2 items-center justify-start md:justify-end mt-2 md:mt-0">
        <UButton
          icon="i-heroicons-funnel"
          color="gray"
          size="xs"
          :disabled="search === '' && selectedStatus.length === 0 && !yearFilter && !groupFilter && !programFilter"
          @click="resetFilters"
        >
          {{ $t('reset') }}
        </UButton>
      </div>
    </div>

    <!-- Video Modal -->
    <UModal
      v-model="isOpen"
      prevent-close
    >
      <UCard
        :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }"
        class="w-full max-w-6xl"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              {{ studentObject?.studentGroup }}, {{ studentObject?.studentName }} ({{ studentObject?.currentYear }})
              pristatomasis vaizdo įrašas
            </h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="ml-4"
              @click="isOpen = false"
            />
          </div>
        </template>

        <div class="p-4">
          <div class="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <video
              v-if="videoObject?.url"
              controls
              class="w-full h-full object-contain"
              :src="videoObject?.url"
            />
            <div
              v-else
              class="flex items-center justify-center h-full"
            >
              <p class="text-gray-500">
                {{ $t('video_not_available') }}
              </p>
            </div>
          </div>
          <div class="mt-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t('uploaded_on') }}: {{ formatDate(videoObject?.createdAt) }}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t('file_name') }}: {{ videoObject?.filename }}
            </p>
          </div>
        </div>
      </UCard>
    </UModal>

    <!-- Report Modal -->
    <UModal
      v-model="isOpenReport"
      prevent-close
    >
      <UCard
        :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }"
        class="w-full max-w-6xl"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              {{ studentObject?.studentGroup }}, {{ studentObject?.studentName }} ({{ studentObject?.currentYear }}),
              {{ studentObject?.studyProgram }}
            </h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="ml-4"
              @click="isOpenReport = false"
            />
          </div>

          <div class="container mx-auto py-4 px-4">
            <div
              v-if="isLoading"
              class="mt-4 p-4 bg-blue-100 text-blue-700"
            >
              {{ $t('processing_document') }}
            </div>

            <div
              v-if="statusMessage"
              class="mt-4 p-4"
              :class="statusError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'"
            >
              {{ statusMessage }}
            </div>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Project Topic Registration Modal -->
    <UModal
      v-model="showProjectTopicModal"
      size="xl"
    >
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            {{ $t('topic_registration') }}
          </h3>
        </template>

        <div class="p-0">
          <ProjectTopicRegistration
            v-if="currentStudentData"
            :initial-data="currentStudentData"
            :user-role="'supervisor'"
            :user-name="user?.displayName || ''"
            :form-variant="determineFormVariant(currentStudentData.GROUP)"
            button-label=""
            @save="handleTopicSave"
            @comment="handleTopicComment"
            @status-change="handleTopicStatusChange"
            @mark-read="handleMarkCommentRead"
            @success="handleTopicSuccess"
          />
        </div>
      </UCard>
    </UModal>

    <div
      v-if="status === 'pending'"
      class="p-6 text-center"
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin h-8 w-8 mx-auto text-gray-400"
      />
      <p class="mt-2 text-sm text-gray-500">
        {{ $t('loading_student_data') }}
      </p>
    </div>

    <div
      v-else-if="fetchError"
      class="p-4 text-red-500"
    >
      {{ fetchError.message }}
    </div>

    <div
      v-else-if="filteredStudents.students.length === 0"
      class="p-6 text-center"
    >
      <UIcon
        name="i-heroicons-document-magnifying-glass"
        class="h-10 w-10 mx-auto text-gray-400"
      />
      <p class="mt-2 text-gray-500">
        {{ $t('no_students_found') }}
      </p>
    </div>

    <UTable
      v-else
      v-model:sort="sort"
      :rows="filteredStudents.students"
      :columns="columnsTable"
      :loading="status === 'pending'"
      sort-asc-icon="i-heroicons-arrow-up"
      sort-desc-icon="i-heroicons-arrow-down"
      sort-mode="manual"
      class="w-full"
      :ui="{
        td: { base: 'whitespace-nowrap px-2 py-1' },
        th: { base: 'px-2 py-1' },
        default: { checkbox: { color: 'primary' } }
      }"
      @select="select"
    >
      <template #studentGroup-data="{ row }">
        <div class="text-center w-12">
          {{ row.student.studentGroup }}
        </div>
      </template>

      <template #name-data="{ row }">
        <div class="flex items-center">
          <div>
            <div class="w-60 truncate">
              {{ row.student.studentName }} {{ row.student.studentLastname }}
            </div>
            <div class="text-xs font-300 text-gray-500">
              {{ row.student.finalProjectTitle || $t('no_title') }}
            </div>
          </div>
        </div>
      </template>

      <template #actions-data="{ row }">
        <div class="flex items-center justify-center gap-1 w-[max-content] flex-nowrap">
          <!-- Project Topic Registration Button -->
          <UButton
            v-if="row.projectTopicRegistrations && row.projectTopicRegistrations.length > 0"
            :icon="getTopicStatusIcon(row.projectTopicRegistrations[0].status)"
            size="xs"
            :color="getTopicStatusColor(row.projectTopicRegistrations[0].status)"
            variant="solid"
            :label="$t('topic')"
            :trailing="false"
            class="p-1 text-xs"
            @click="openProjectTopic(row)"
          />

          <UButton
            v-else
            icon="i-heroicons-document-plus"
            size="xs"
            color="gray"
            variant="solid"
            :label="$t('topic')"
            :trailing="false"
            class="p-1 text-xs"
            @click="openProjectTopic(row)"
          />

          <!-- Video Button -->
          <UButton
            v-if="row.videos && row.videos[0]"
            icon="i-heroicons-video-camera"
            size="xs"
            color="white"
            variant="solid"
            :label="$t('video')"
            :trailing="false"
            class="p-1 text-xs"
            @click="sendStudentData(row.videos[0], row.student)"
          />

          <!-- Documents Buttons -->
          <template
            v-for="doc in row.documents || []"
            :key="doc.id"
          >
            <UButton
              :loading="isFetchingDocument"
              :icon="doc.documentType === 'PDF' ? 'i-heroicons-document-text' : 'i-heroicons-code-bracket-square'"
              size="xs"
              color="white"
              variant="solid"
              :label="doc.documentType"
              :trailing="false"
              class="p-1 text-xs"
              @click="openDocument(doc)"
            />
          </template>

          <!-- Supervisor Report Buttons -->
          <template v-if="row.supervisorReports && row.supervisorReports.length > 0">
            <div>
              <PreviewSupervisorReport
                :document-data="{
                  NAME: row.student?.studentName +' '+row.student?.studentLastname,
                  PROGRAM: row.student?.studyProgram ?? 'N/A',
                  CODE: row.student?.programCode ?? 'N/A',
                  TITLE: row.student?.finalProjectTitle ?? 'N/A',
                  DEPT: row.student?.department ?? 'Elektronikos ir informatikos fakultetas',
                  WORK: row.student?.supervisorWorkplace ?? 'Vilniaus kolegija Elektronikos ir informatikos fakultetas',
                  EXPL: row.supervisorReports[0].supervisorComments ?? '',
                  OM: row.supervisorReports[0].otherMatch ?? 0,
                  SSM: row.supervisorReports[0].oneMatch ?? 0,
                  STUM: row.supervisorReports[0].ownMatch ?? 0,
                  JM: row.supervisorReports[0].joinMatch ?? 0,
                  createdDate: formatUnixDateTime(row.supervisorReports[0].createdDate),
                  SUPER: row.supervisorReports[0].supervisorName ?? 'N/A Supervisor',
                  POS: row.supervisorReports[0].supervisorPosition ?? 'N/A Position',
                  DATE: formatUnixDate(row.supervisorReports[0].createdDate),
                  PASS: row.supervisorReports[0]?.isPassOrFailed ?? 0
                }"
                :form-variant="determineFormVariant(row.student?.studentGroup)"
                :button-label="$t('preview_supervisor_report')"
                :modal-title="$t('supervisor_report')"
              />
            </div>
          </template>
          <template v-else>
            <div>
              <EditSupervisorReportForm
                :initial-data="{
                  studentRecordId: row.student?.id,
                  DEPT: row.student?.department ? row.student.department : 'N/A Katedra',
                  PROGRAM: row.student?.studyProgram ?? 'N/A',
                  CODE: row.student?.programCode ?? 'N/A',
                  NAME: `${row.student?.studentName ?? ''} ${row.student?.studentLastname ?? ''}`.trim(),
                  TITLE: row.student?.finalProjectTitle ?? 'N/A',
                  SUPER: user?.displayName ?? 'N/A',
                  EXPL: '',
                  OM: 0,
                  SSM: 0,
                  STUM: 0,
                  JM: 0,
                  WORK: 'Vilniaus kolegija Elektronikos ir informatikos fakultetas',
                  POS: '',
                  PASS: 1,
                  DATE: new Date().toDateString().toString()
                }"
                :form-variant="determineFormVariant(row.student?.studentGroup)"
                :button-label="$t('fill_supervisor_report')"
                @save="handleReportSave(row.student?.id ?? null, $event)"
              />
            </div>
          </template>
        </div>
      </template>

      <template #status-data="{ row }">
        <div class="flex items-center gap-2 justify-center">
          <template v-if="row.supervisorReports && row.supervisorReports.length > 0">
            <UIcon
              name="i-heroicons-check-circle"
              class="w-5 h-5 text-green-500"
            />
            <span>{{ $t('report_filled') }}</span>

            <!-- Signed/Unsigned Indicator -->
            <UBadge
              v-if="row.supervisorReports[0].isSigned"
              color="green"
              variant="soft"
              size="xs"
            >
              {{ $t('signed') }}
            </UBadge>
            <UBadge
              v-else
              color="gray"
              variant="soft"
              size="xs"
            >
              {{ $t('unsigned') }}
            </UBadge>
          </template>
          <template v-else>
            <UIcon
              name="i-heroicons-clock"
              class="w-5 h-5 text-amber-400"
            />
            <span>{{ $t('report_not_filled') }}</span>
          </template>
        </div>
      </template>
    </UTable>

    <template #footer>
      <div class="flex flex-wrap justify-between items-center">
        <div>
          <span class="text-sm leading-5">
            {{ $t('showing') }}
            <span class="font-medium">{{ pageFrom }}</span>
            {{ $t('to') }}
            <span class="font-medium">{{ pageTo }}</span>
            {{ $t('off') }}
            <span class="font-medium">{{ pageTotal }}</span>
          </span>
          <span class="ml-2 text-sm text-gray-600">
            {{ $t('year') }} : {{ activeYear || $t('latest') }}
          </span>
        </div>

        <UPagination
          v-model="page"
          :page-count="Number(pageCount)"
          :total="pageTotal"
          :ui="{
            wrapper: 'flex items-center gap-1',
            rounded: '!rounded-full min-w-[32px] justify-center',
            default: {
              activeButton: {
                variant: 'outline'
              }
            }
          }"
        />
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { StudentRecord } from '~~/server/utils/db'
import type { SupervisorReportFormData } from '~/components/EditSupervisorReportForm.vue'
import { useFormUtilities } from '~/composables/useFormUtilities'
import type { TopicComment, ProjectTopicRegistrationData, ProjectTopicRegistrationFormData } from '~/components/ProjectTopicRegistration.vue'

definePageMeta({
  middleware: ['teacher-access']
})

const { formatUnixDate, formatUnixDateTime } = useUnixDateUtils()

const { user } = useUserSession()
// Determine the form variant based on the student group
const { determineFormVariant } = useFormUtilities()
const statusMessage = ref('')
const statusError = ref(false)
const isLoading = ref(false)

const { t } = useI18n()

// Project Topic Registration Modal
const showProjectTopicModal = ref(false)
const currentStudentData = ref<ProjectTopicRegistrationData | null>(null)
const currentStudentId = ref<number | null>(null)

const columns = [
  {
    key: 'studentGroup',
    label: t('group'),
    sortable: false
  },
  {
    key: 'name',
    label: t('fullname'),
    sortable: true
  },
  {
    key: 'actions',
    label: t('actions'),
    sortable: false
  },
  {
    key: 'status',
    label: t('supervisor_report'),
    sortable: true
  }
]

const selectedColumns = ref(columns)
const columnsTable = computed(() => columns.filter(column => selectedColumns.value.includes(column)))

// Selected Rows
const selectedRows = ref([])

function select(row) {
  const index = selectedRows.value.findIndex(item => item.id === row.id)
  if (index === -1) {
    selectedRows.value.push(row)
  }
  else {
    selectedRows.value.splice(index, 1)
  }
}

const search = ref('')
const selectedStatus = ref([])

// Pagination - Make sure these are all number types
const sort = ref({ column: 'id', direction: 'asc' as const })
const page = ref(1)
const pageCount = ref(10) // Initialize as number

// Modal state
const isOpen = ref(false)
const isOpenReport = ref(false)
const videoObject = ref<VideoRecord | null>(null)
const studentObject = ref<StudentRecord | null>(null)
const isFetchingDocument = ref(false)

const sendStudentData = (mVideo: VideoRecord, mStudent: StudentRecord) => {
  isOpen.value = true
  videoObject.value = mVideo
  studentObject.value = mStudent
}

const openProjectTopic = (row) => {
  currentStudentId.value = row.student.id

  // Prepare the data for the topic registration form
  let topicData: ProjectTopicRegistrationData = {
    studentRecordId: row.student.id,
    GROUP: row.student.studentGroup,
    NAME: `${row.student.studentName} ${row.student.studentLastname}`
  }

  // If student has a topic registration, populate the form with that data
  if (row.projectTopicRegistrations && row.projectTopicRegistrations.length > 0) {
    const registration = row.projectTopicRegistrations[0]
    topicData = {
      ...topicData,
      TITLE: registration.title,
      TITLE_EN: registration.titleEn,
      PROBLEM: registration.problem,
      OBJECTIVE: registration.objective,
      TASKS: registration.tasks,
      COMPLETION_DATE: registration.completionDate,
      SUPERVISOR: registration.supervisor,
      status: registration.status,
      comments: registration.comments || []
    }
  }

  currentStudentData.value = topicData
  showProjectTopicModal.value = true
}

// Handle topic registration form actions
const handleTopicSave = async (formData: ProjectTopicRegistrationFormData) => {
  try {
    const response = await $fetch('/api/students/project-topics', {
      method: 'POST',
      body: {
        studentRecordId: currentStudentId.value,
        ...formData
      }
    })

    toast.add({
      title: t('success'),
      description: t('topic_saved_successfully'),
      color: 'green'
    })

    // Refresh data after save
    await refreshNuxtData('allStudents')
  }
  catch (error) {
    toast.add({
      title: t('error'),
      description: error.message || t('error_saving_topic'),
      color: 'red'
    })
  }
}

const handleTopicComment = async (comment: TopicComment) => {
  try {
    // Get the actual topic registration ID
    let topicRegistrationId: number | null = null

    // First, check if we already have the ID in the current student data
    // This assumes currentStudentData might have the id property directly set
    if (currentStudentData.value && 'id' in currentStudentData.value) {
      topicRegistrationId = currentStudentData.value.id
    }

    // If we don't have it, fetch it using the appropriate endpoint
    if (!topicRegistrationId && currentStudentId.value) {
      try {
        // Use the endpoint you mentioned with the correct query parameter
        const response = await $fetch(`/api/students/project-topics`, {
          params: {
            studentRecordId: currentStudentId.value
          }
        })

        if (response && response.topic && response.topic.id) {
          topicRegistrationId = response.topic.id

          // Update the currentStudentData with the fetched data for future use
          if (currentStudentData.value) {
            currentStudentData.value.id = topicRegistrationId
          }
        }
      }
      catch (fetchError) {
        console.error('Error fetching topic registration:', fetchError)
      }
    }

    // If we still don't have a topic registration ID, we can't add a comment
    if (!topicRegistrationId) {
      toast.add({
        title: t('error'),
        description: t('no_topic_registration_found'),
        color: 'red'
      })
      return
    }

    const payload = {
      topicRegistrationId: topicRegistrationId,
      fieldName: comment.fieldName || 'general',
      commentText: comment.commentText,
      authorRole: 'supervisor',
      authorName: user?.displayName || t('supervisor'),
      parentCommentId: comment.parentCommentId || null
    }

    console.log('Sending comment payload:', payload)

    const response = await $fetch('/api/students/project-topics/comments', {
      method: 'POST',
      body: payload
    })

    toast.add({
      title: t('success'),
      description: t('comment_added_successfully'),
      color: 'green'
    })

    // Refresh data after commenting
    await refreshNuxtData('allStudents')

    // Return the response in case the caller needs it
    return response
  }
  catch (error) {
    console.error('Error adding comment:', error)
    toast.add({
      title: t('error'),
      description: error.message || t('error_adding_comment'),
      color: 'red'
    })
    throw error // Re-throw to allow caller to handle if needed
  }
}
const handleTopicStatusChange = async (newStatus: string) => {
  try {
    // Validate that we have a topic registration ID
    if (!currentStudentData.value?.id) {
      // If we don't have the ID yet, try to fetch the topic first
      const topicResponse = await $fetch('/api/students/project-topics', {
        params: {
          studentRecordId: currentStudentId.value
        }
      })

      if (topicResponse?.topic?.id) {
        currentStudentData.value = {
          ...currentStudentData.value,
          id: topicResponse.topic.id
        }
      }
      else {
        toast.add({
          title: t('error'),
          description: t('topic_not_found'),
          color: 'red'
        })
        return
      }
    }

    // Now we should have the topic ID
    const topicId = currentStudentData.value.id

    // Call the status update endpoint
    const response = await $fetch(`/api/students/project-topics/${topicId}/status`, {
      method: 'POST',
      body: {
        status: newStatus,
        userRole: 'supervisor' // Send the role of the current user
      }
    })

    // Update the local status
    if (currentStudentData.value) {
      currentStudentData.value.status = newStatus
    }

    toast.add({
      title: t('success'),
      description: t('status_updated_successfully'),
      color: 'green'
    })

    // Refresh data after status change
    await refreshNuxtData('allStudents')

    return response
  }
  catch (error) {
    console.error('Error updating topic status:', error)
    toast.add({
      title: t('error'),
      description: error.message || t('error_updating_status'),
      color: 'red'
    })
  }
}
const handleMarkCommentRead = async (commentId: number) => {
  try {
    await $fetch(`/api/students/project-topics/comments/${commentId}/mark-read`, {
      method: 'PUT'
    })

    // Refresh data after marking comment as read
    await refreshNuxtData('allStudents')
  }
  catch (error) {
    console.error('Error marking comment as read:', error)
  }
}

const handleTopicSuccess = () => {
  showProjectTopicModal.value = false
  refreshNuxtData('allStudents')
}

const getTopicStatusIcon = (status) => {
  switch (status) {
    case 'submitted': return 'i-heroicons-document-text'
    case 'approved': return 'i-heroicons-check-circle'
    case 'needs_revision': return 'i-heroicons-exclamation-circle'
    case 'rejected': return 'i-heroicons-x-circle'
    default: return 'i-heroicons-document'
  }
}

// Helper function to get color for topic status
const getTopicStatusColor = (status) => {
  switch (status) {
    case 'submitted': return 'blue'
    case 'approved': return 'green'
    case 'needs_revision': return 'amber'
    case 'rejected': return 'red'
    default: return 'gray'
  }
}

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('lt-LT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

async function getFile(fileName) {
  try {
    const response = await $fetch(`/api/blob/get/${fileName}`)
    if (response?.url) {
      return response.url // Return the temporary access URL
    }
    else {
      throw new Error('Invalid response from server')
    }
  }
  catch (error) {
    console.error('Error fetching file URL:', error)
    return ''
  }
}

const openDocument = async (doc: DocumentRecord) => {
  isFetchingDocument.value = true

  const fileUrl = await getFile(doc.filePath)

  isFetchingDocument.value = false

  if (fileUrl) {
    if (doc.documentType === 'PDF') {
      window.open(fileUrl, '_blank')
    }
    else if (doc.documentType === 'ZIP') {
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = doc.filePath.split('/').pop() || 'download.zip'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
}

// Filters
const groupFilter = ref('')
const programFilter = ref('')
const yearFilter = ref(null)

const debouncedRefresh = useDebounceFn(() => {
  console.log('Debounced refresh triggered')
  refreshNuxtData('allStudents')
}, 500)

// Reset all filters
const resetFilters = () => {
  search.value = ''
  selectedStatus.value = []
  yearFilter.value = null
  groupFilter.value = ''
  programFilter.value = ''
}

// In your component
const authStore = useAuthStore()
const authReady = computed(() => authStore.isReady)

// Use composable to wait for auth
const waitForAuth = () => {
  return new Promise<void>((resolve, reject) => {
    // If already ready, resolve immediately
    if (authStore.isReady) {
      console.log('Auth is already ready')
      resolve()
      return
    }

    console.log('Waiting for auth to be ready...')

    // Otherwise, watch for changes with immediate check
    const unwatch = watch(() => authStore.isReady, (isReady) => {
      if (isReady) {
        console.log('Auth became ready')
        unwatch()
        resolve()
      }
    }, { immediate: true })

    // Set a timeout just in case
    setTimeout(() => {
      unwatch()
      console.warn('Auth initialization timed out after 5 seconds')

      // Instead of silently resolving, check the state
      if (authStore.isAuthenticated) {
        console.log('Auth is authenticated despite timeout, proceeding')
        resolve()
      }
      else {
        console.error('Auth failed to initialize in time and is not authenticated')
        reject(new Error('Authentication timed out'))
      }
    }, 5000)
  })
}

// Dynamic years from API
const { years: availableYears, isLoading: yearsLoading, error: yearsError } = useAcademicYears()

// Load all data once by year
// Modify your data fetching
const { data: allStudents, status, error: fetchError } = useLazyAsyncData(
  'allStudents',
  async () => {
    try {
      console.log('Starting data fetch, waiting for auth...')
      // Wait for auth to be ready before fetching
      await waitForAuth()

      console.log('Auth ready, checking authentication...')
      if (!authStore.isAuthenticated) {
        console.error('Not authenticated after waiting for auth')
        throw new Error('Authentication required')
      }

      console.log('Proceeding with API call')
      // Add cache busting to prevent cached error responses
      const params = new URLSearchParams()
      if (yearFilter.value) {
        params.set('year', yearFilter.value.toString())
      }
      // Add timestamp to prevent caching
      params.set('_t', Date.now().toString())

      console.log(`Fetching from: /api/students/supervisor?${params.toString()}`)
      const response = await $fetch(`/api/students/supervisor?${params.toString()}`, {
        // Add timeout to prevent hanging requests
        timeout: 15000,
        // Add retry logic
        retry: 1,
        retryDelay: 1000
      })

      console.log('API call successful:', !!response)
      return response
    }
    catch (err) {
      console.error('Error in data fetch:', err)
      // For auth errors, throw to prevent retries
      if (err.message === 'Authentication required' || err.message === 'Authentication timed out') {
        throw err
      }

      // For other errors, return empty data
      console.warn('Returning empty data due to error')
      return {
        students: [],
        total: 0,
        year: null,
        error: err.message
      }
    }
  },
  {
    default: () => ({
      students: [],
      total: 0,
      year: null
    }),
    watch: [yearFilter, authReady],
    // Add these options to control refetching
    server: false, // Don't run on server
    lazy: true, // Only fetch when needed
    immediate: false // Don't fetch immediately
  }
)
// Get the active year (either selected or from API)
const activeYear = computed(() => {
  return yearFilter.value || allStudents.value?.year || null
})

// Client-side filtering
const filteredStudents = computed(() => {
  if (!allStudents.value?.students) {
    return { students: [], total: 0 }
  }

  let result = [...allStudents.value.students]

  // Apply search filter
  if (search.value.trim()) {
    const searchTerm = search.value.toLowerCase().trim()
    result = result.filter((item) => {
      const student = item.student
      return (
        (student.studentName || '').toLowerCase().includes(searchTerm)
        || (student.studentLastname || '').toLowerCase().includes(searchTerm)
        || (student.studentEmail || '').toLowerCase().includes(searchTerm)
        || (student.studentNumber || '').toLowerCase().includes(searchTerm)
        || (student.studentGroup || '').toLowerCase().includes(searchTerm)
        || (student.studyProgram || '').toLowerCase().includes(searchTerm)
        || (student.finalProjectTitle || '').toLowerCase().includes(searchTerm)
      )
    })
  }

  // Apply group filter
  if (groupFilter.value) {
    result = result.filter(item => item.student.studentGroup === groupFilter.value)
  }

  // Apply program filter
  if (programFilter.value) {
    result = result.filter(item => item.student.studyProgram === programFilter.value)
  }

  // Apply sorting
  result.sort((a, b) => {
    let valA, valB

    if (sort.value.column === 'name') {
      valA = `${a.student.studentName} ${a.student.studentLastname}`.toLowerCase()
      valB = `${b.student.studentName} ${b.student.studentLastname}`.toLowerCase()
    }
    else {
      valA = a.student.id
      valB = b.student.id
    }

    if (sort.value.direction === 'asc') {
      return valA > valB ? 1 : -1
    }
    else {
      return valA < valB ? 1 : -1
    }
  })

  // Apply pagination
  const totalCount = result.length
  const startIndex = (page.value - 1) * pageCount.value
  const paginatedResult = result.slice(startIndex, startIndex + pageCount.value)

  return {
    students: paginatedResult,
    total: totalCount
  }
})

// Get unique values for dropdowns from all data
const uniqueGroups = computed(() => {
  if (!allStudents.value?.students) return []
  return [...new Set(allStudents.value.students.map(s => s.student.studentGroup))]
})

const uniquePrograms = computed(() => {
  if (!allStudents.value?.students) return []
  return [...new Set(allStudents.value.students.map(s => s.student.studyProgram))]
})

// Client-side pagination calculations
const pageTotal = computed(() => filteredStudents.value?.total || 0)
const pageFrom = computed(() => (page.value - 1) * Number(pageCount.value) + 1)
const pageTo = computed(() => Math.min(page.value * Number(pageCount.value), pageTotal.value))

// Make sure pageCount is always a number
watch(pageCount, (newValue) => {
  if (typeof newValue === 'string') {
    pageCount.value = Number(newValue)
  }
})

watch(yearFilter, () => {
  console.log('Year filter changed:', yearFilter.value)
  page.value = 1
  debouncedRefresh()
})
// Reset page when filters change
watch([search, groupFilter, programFilter, pageCount], () => {
  page.value = 1
})

const isParentSaving = ref(false)
const toast = useToast()

const handleReportSave = async (recordId: number | null, updatedData: SupervisorReportFormData) => {
  // --- 1. Input Validation ---
  if (recordId === undefined || recordId === null) {
    console.error('handleReportSave called without a valid recordId!')
    toast.add({ title: 'Klaida', description: 'Trūksta studento įrašo ID.', color: 'red' })
    return
  }
  if (!updatedData) {
    console.error('handleReportSave called without updatedData!')
    toast.add({ title: 'Klaida', description: 'Negauti formos duomenys.', color: 'red' })
    return
  }

  isParentSaving.value = true
  console.log(`Parent received data for studentRecordId ${recordId}:`, updatedData)

  // --- 2. Construct API Payload ---
  const apiPayload = {
    studentRecordId: recordId,
    EXPL: updatedData.EXPL || '',
    WORK: updatedData.WORK || 'Vilniaus kolegija Elektronikos ir informatikos fakultetas',
    OM: updatedData.OM ?? 0,
    SSM: updatedData.SSM ?? 0,
    STUM: updatedData.STUM ?? 0,
    JM: updatedData.JM ?? 0,
    POS: updatedData.POS || '',
    PASS: updatedData.PASS ? 1 : 0
  }

  // --- 3. Make the API Call ---
  try {
    const { data, error } = await useFetch('/api/students/supervisor-reports', {
      method: 'POST',
      body: apiPayload
    })

    if (error.value) {
      console.error('Failed to save report:', error.value)
      toast.add({
        title: 'Klaida',
        description: error.value.data?.message || error.value.statusMessage || 'Nepavyko išsaugoti atsiliepimo.',
        color: 'red'
      })
    }
    else {
      console.log('Report saved successfully!', data.value)
      toast.add({
        title: 'Pavyko',
        description: data.value?.message || 'Atsiliepimas sėkmingai išsaugotas.',
        color: 'green'
      })

      // Refresh the main student list data
      await refreshNuxtData('allStudents')
    }
  }
  catch (err) {
    console.error('Unexpected error during report save fetch:', err)
    toast.add({ title: 'Sistemos Klaida', description: 'Įvyko netikėta klaida bandant išsaugoti.', color: 'red' })
  }
  finally {
    isParentSaving.value = false
  }
}

onMounted(async () => {
  console.log('Component mounted')

  // Set a flag to track initialization
  const isInitialLoad = ref(true)

  try {
    // Manually initialize auth store if needed
    if (!authStore.isInitialized) {
      console.log('Initializing auth store from component')
      await authStore.initFromSession()
    }

    // Now we can safely refresh the data
    if (isInitialLoad.value) {
      console.log('Initial data load')
      await refreshNuxtData('allStudents')
      isInitialLoad.value = false
    }
  }
  catch (error) {
    console.error('Error during component initialization:', error)
  }
})
</script>
