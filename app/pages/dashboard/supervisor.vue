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
      :responsive="true"
      :ui="{
        wrapper: 'overflow-x-auto',
        td: { base: 'whitespace-nowrap px-2 py-1' },
        th: { base: 'px-2 py-1' },
        default: { checkbox: { color: 'primary' } },
        th: {
          base: 'px-2 py-1',
          padding: 'px-2 py-2',
          studentGroup: 'w-16',
          name: 'w-1/3',
          actions: 'w-1/3',
          status: 'w-1/3'
        }
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

      <!-- Replace your actions-data template with this improved version -->
      <template #actions-data="{ row }">
        <!-- Topic Status and Button with improved visual design -->
        <div
          class="flex items-center flex-wrap gap-1 justify-start"
          style="min-width: 160px;"
        >
          <!-- Topic Status and Button -->
          <div class="flex items-center mr-2">
            <!-- Status Badge -->
            <UBadge
              v-if="row.projectTopicRegistrations && row.projectTopicRegistrations.length > 0"
              :color="getTopicStatusColor(row.projectTopicRegistrations[0].status)"
              variant="soft"
              size="xs"
              class="mr-1 whitespace-nowrap min-w-[80px] text-center"
              :ui="{
                base: 'inline-flex items-center rounded-md cursor-help justify-center',
                tooltip: { base: 'z-50 px-2 py-1 rounded text-xs' }
              }"
              :tooltips="{ content: getTopicStatusTooltip(row.projectTopicRegistrations[0].status) }"
            >
              {{ getTopicStatusLabel(row.projectTopicRegistrations[0].status) }}
            </UBadge>
            <UBadge
              v-else
              color="gray"
              variant="soft"
              size="xs"
              class="mr-1 whitespace-nowrap min-w-[80px] text-center"
            >
              {{ $t('no_topic') }}
            </UBadge>

            <!-- FIXED ProjectTopicRegistration component usage -->
            <ProjectTopicRegistration
              v-if="row.projectTopicRegistrations && row.projectTopicRegistrations.length > 0"
              :key="`topic-${row.student.id}-${row.projectTopicRegistrations[0].status}-${forceRerender}`"
              :initial-data="{
                studentRecordId: row.student.id,
                id: row.projectTopicRegistrations[0].id, // Make sure to include id
                GROUP: row.student.studentGroup,
                NAME: `${row.student.studentName} ${row.student.studentLastname}`,
                TITLE: row.projectTopicRegistrations[0].title,
                TITLE_EN: row.projectTopicRegistrations[0].titleEn,
                PROBLEM: row.projectTopicRegistrations[0].problem,
                OBJECTIVE: row.projectTopicRegistrations[0].objective,
                TASKS: row.projectTopicRegistrations[0].tasks,
                COMPLETION_DATE: row.projectTopicRegistrations[0].completionDate,
                SUPERVISOR: row.projectTopicRegistrations[0].supervisor,
                status: row.projectTopicRegistrations[0].status,
                comments: row.projectTopicRegistrations[0].comments || []
              }"
              :user-role="'supervisor'"
              :user-name="user?.displayName || ''"
              :form-variant="determineFormVariant(row.student.studentGroup)"
              :icon="getTopicStatusIcon(row.projectTopicRegistrations[0].status)"
              :color="getTopicStatusColor(row.projectTopicRegistrations[0].status)"
              :variant="'solid'"
              :label="getTopicButtonLabel(row)"
              :trailing="false"
              class="p-1 text-xs"
              @init="handleInitialData"
              @save="(data) => handleTopicSave(data)"
              @comment="handleTopicComment"
              @status-change="handleTopicStatusChange"
              @mark-read="handleMarkCommentRead"
              @success="() => refreshNuxtData('allStudents')"
            />
          </div>

          <!-- Document Buttons in a single row -->
          <div class="flex items-center gap-1">
            <UButton
              v-if="row.videos && row.videos[0]"
              icon="i-heroicons-video-camera"
              size="xs"
              color="white"
              variant="solid"
              :trailing="false"
              class="p-1 text-xs min-w-0"
              @click="sendStudentData(row.videos[0], row.student)"
            />

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
                :trailing="false"
                class="p-1 text-xs min-w-0"
                @click="openDocument(doc)"
              />
            </template>
          </div>
        </div>
      </template>

      `
      <template #status-data="{ row }">
        <div class="flex items-center gap-2 justify-center">
          <div>
            <PreviewSupervisorReport
              v-if="row.supervisorReports && row.supervisorReports.length > 0"
              :document-data="{
                NAME: row.student?.studentName + ' ' + row.student?.studentLastname,
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
              :form-variant="determineFormVariant(studentObject?.studentGroup)"
              :button-label="$t('view')"
              :modal-title="$t('supervisor_report')"
              @close="supervisorReportData = null"
            />

            <EditSupervisorReportForm
              v-else
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
              :form-variant="determineFormVariant(studentObject?.studentGroup)"
              button-label="Pildyti"
              @save="handleReportSave(reportFormData.studentRecordId, $event)"
              @close="reportFormData = null"
            />
          </div>
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
import type {
  TopicComment,
  ProjectTopicRegistrationData,
  ProjectTopicRegistrationFormData
} from '~/components/ProjectTopicRegistration.vue'

definePageMeta({
  middleware: ['teacher-access']
})

const handleInitialData = (data) => {
  // Update the currentStudentId and currentStudentData when the component initializes
  if (data && data.studentRecordId) {
    currentStudentId.value = data.studentRecordId
    currentStudentData.value = { ...data } // Create a copy to avoid reference issues
    console.log('Set current student data:', currentStudentData.value)
  }
}

// MISSING REFS: adding the missing refs for supervisor report data
const supervisorReportData = ref(null)
const reportFormData = ref(null)

const { formatUnixDate, formatUnixDateTime } = useUnixDateUtils()

const { user } = useUserSession()
// Determine the form variant based on the student group
const { determineFormVariant } = useFormUtilities()
// const statusMessage = ref('')
// const statusError = ref(false)
// const isLoading = ref(false)

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
    label: t('documents_and_topic'),
    sortable: true // Make this sortable
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
const sort = ref({ column: 'id', direction: 'asc' as const })
const page = ref(1)
const pageCount = ref(10)
const isOpen = ref(false)
const videoObject = ref<VideoRecord | null>(null)
const studentObject = ref<StudentRecord | null>(null)
const isFetchingDocument = ref(false)

const sendStudentData = (mVideo: VideoRecord, mStudent: StudentRecord) => {
  isOpen.value = true
  videoObject.value = mVideo
  studentObject.value = mStudent
}

// Handle topic registration form actions
// Similarly, update handleTopicSave to properly handle the studentRecordId
const handleTopicSave = async (formData) => {
  console.log('Parent received save:', formData)

  try {
    // Ensure studentRecordId is available
    if (!formData.studentRecordId) {
      console.error('Missing studentRecordId in handleTopicSave')
      toast.add({
        title: t('error'),
        description: t('missing_student_id'),
        color: 'red'
      })
      return
    }

    // Use the studentRecordId from the formData
    const response = await $fetch('/api/students/project-topics', {
      method: 'POST',
      body: {
        studentRecordId: formData.studentRecordId,
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

    // Force component to re-render
    forceRerender.value++
  }
  catch (error) {
    toast.add({
      title: t('error'),
      description: error.message || t('error_saving_topic'),
      color: 'red'
    })
  }
}
// Update the handleTopicComment function to get the topic ID more reliably:
const handleTopicComment = async (comment) => {
  try {
    // Use formData.id directly if it exists
    let topicRegistrationId = comment.topicRegistrationId || null

    // If we don't have the topic ID from the comment, try from currentStudentData
    if (!topicRegistrationId && currentStudentData.value && currentStudentData.value.id) {
      topicRegistrationId = currentStudentData.value.id
    }

    // If still no ID, try to fetch it
    if (!topicRegistrationId && currentStudentId.value) {
      try {
        const response = await $fetch(`/api/students/project-topics`, {
          params: {
            studentRecordId: currentStudentId.value
          }
        })

        if (response && response.topic && response.topic.id) {
          topicRegistrationId = response.topic.id
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

    return response
  }
  catch (error) {
    console.error('Error adding comment:', error)
    toast.add({
      title: t('error'),
      description: error.message || t('error_adding_comment'),
      color: 'red'
    })
    throw error
  }
}
const forceRerender = ref(0)
// Update the handleTopicStatusChange similarly:
const handleTopicStatusChange = async (newStatus: string, topicData?: ProjectTopicRegistrationData) => {
  console.log('Parent received status change:', newStatus, 'topicData:', topicData)

  try {
    // Try to get the topic ID from the parameter or from currentStudentData
    let topicId = topicData?.id || (currentStudentData.value?.id || null)
    const studentRecordId = topicData?.studentRecordId || currentStudentId.value

    console.log('Processing with:', { topicId, studentRecordId, topicData })

    // If we don't have the student ID, log an error and return
    if (!studentRecordId) {
      console.error('Missing studentRecordId in handleTopicStatusChange')
      toast.add({
        title: t('error'),
        description: t('missing_student_id'),
        color: 'red'
      })
      return
    }

    // If we don't have the ID yet, try to fetch the topic
    if (!topicId && studentRecordId) {
      const topicResponse = await $fetch('/api/students/project-topics', {
        params: {
          studentRecordId: studentRecordId
        }
      })

      if (topicResponse?.topic?.id) {
        topicId = topicResponse.topic.id
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

    console.log('Updating topic status with ID:', topicId)

    // Call the status update endpoint
    const response = await $fetch(`/api/students/project-topics/${topicId}/status`, {
      method: 'POST',
      body: {
        status: newStatus,
        userRole: 'supervisor'
      }
    })

    toast.add({
      title: t('success'),
      description: t('status_updated_successfully'),
      color: 'green'
    })

    // Refresh data after status change
    await refreshNuxtData('allStudents')

    // Force component to re-render
    forceRerender.value++

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

// Add this helper function to your script section to get contextual button labels
const getTopicButtonLabel = (row) => {
  if (!row.projectTopicRegistrations || row.projectTopicRegistrations.length === 0) {
    return t('topic')
  }

  const status = row.projectTopicRegistrations[0].status

  switch (status) {
    case 'draft':
      return t('edit')
    case 'submitted':
      return t('review')
    case 'needs_revision':
      return t('review')
    case 'approved':
      return t('view')
    case 'rejected':
      return t('view')
    default:
      return t('edit')
  }
}

// Add or improve this helper function for better status labels
const getTopicStatusLabel = (status) => {
  switch (status) {
    case 'submitted':
      return t('submitted')
    case 'approved':
      return t('approved')
    case 'needs_revision':
      return t('needs_revision')
    case 'rejected':
      return t('rejected')
    case 'draft':
      return t('draft')
    default:
      return t('unknown')
  }
}

// Improve this helper function for better tooltips
const getTopicStatusTooltip = (status) => {
  switch (status) {
    case 'submitted':
      return t('topic_submitted_tooltip')
    case 'approved':
      return t('topic_approved_tooltip')
    case 'needs_revision':
      return t('topic_needs_revision_tooltip')
    case 'rejected':
      return t('topic_rejected_tooltip')
    case 'draft':
      return t('topic_draft_tooltip')
    default:
      return ''
  }
}

// Update status colors to be more distinct
const getTopicStatusColor = (status) => {
  switch (status) {
    case 'submitted':
      return 'blue'
    case 'approved':
      return 'green'
    case 'needs_revision':
      return 'orange'
    case 'rejected':
      return 'red'
    case 'draft':
      return 'gray'
    default:
      return 'gray'
  }
}

// Update status icons to be more intuitive
const getTopicStatusIcon = (status) => {
  switch (status) {
    case 'submitted':
      return 'i-heroicons-clock'
    case 'approved':
      return 'i-heroicons-check-circle'
    case 'needs_revision':
      return 'i-heroicons-exclamation-circle'
    case 'rejected':
      return 'i-heroicons-x-circle'
    case 'draft':
      return 'i-heroicons-pencil-square'
    default:
      return 'i-heroicons-document'
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

  // Apply sorting with enhanced column options
  result.sort((a, b) => {
    let valA, valB

    if (sort.value.column === 'actions') {
      // Sort by topic status
      const getTopicValue = (item) => {
        if (!item.projectTopicRegistrations || item.projectTopicRegistrations.length === 0) {
          return 0 // No topic
        }
        // Order: approved (3), submitted (2), needs_revision (1), rejected (0)
        const status = item.projectTopicRegistrations[0].status
        switch (status) {
          case 'approved':
            return 3
          case 'submitted':
            return 2
          case 'needs_revision':
            return 1
          case 'rejected':
            return 0
          default:
            return -1
        }
      }

      valA = getTopicValue(a)
      valB = getTopicValue(b)
    }
    else if (sort.value.column === 'status') {
      // Sort by report status
      const getReportValue = (item) => {
        // Has report and is signed (2), has report but unsigned (1), no report (0)
        if (!item.supervisorReports || item.supervisorReports.length === 0) {
          return 0
        }
        return item.supervisorReports[0].isSigned ? 2 : 1
      }

      valA = getReportValue(a)
      valB = getReportValue(b)
    }
    else if (sort.value.column === 'name') {
      // Name sort
      valA = `${a.student.studentName} ${a.student.studentLastname}`.toLowerCase()
      valB = `${b.student.studentName} ${b.student.studentLastname}`.toLowerCase()
    }
    else {
      // Default sort by ID
      valA = a.student.id
      valB = b.student.id
    }

    // Apply sort direction
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
