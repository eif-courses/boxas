<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ZipUploader from '~/components/ZipUploader.vue'
import PreviewSupervisorReport from '~/components/PreviewSupervisorReport.vue'
import VideoUploader from '~/components/VideoUploader.vue'
import VideoPlayer from '~/components/VideoPlayer.vue'
import EditSupervisorReportForm from '~/components/EditSupervisorReportForm.vue'
import type { DocumentRecord, ReviewerReport, StudentRecord, VideoRecord, SupervisorReport } from '~~/server/utils/db'
import { useUnixDateUtils } from '~/composables/useUnixDateUtils'
import { useFormUtilities } from '~/composables/useFormUtilities'
import { useReviewerReports } from '~/composables/useReviewerReports'
import { useAuthStore } from '~/stores/auth'
import { useProjectTopic } from '~/composables/useProjectTopic'
import { useUserSession } from '~/composables/useUserSession'
import type { TopicComment, ProjectTopicRegistrationData, ProjectTopicRegistrationFormData } from '~/components/ProjectTopicRegistration.vue'

definePageMeta({
  middleware: ['teacher-access']
})

const { formatUnixDate, formatUnixDateTime } = useUnixDateUtils()
const { determineFormVariant } = useFormUtilities()

const { user } = useUserSession()

const statusMessage = ref('')
const statusError = ref(false)
const isLoading = ref(false)
const isSaving = ref(false)

const { t } = useI18n()

// Modal states
const isOpen = ref(false)
const isOpenReport = ref(false)
const showTopicModal = ref(false)
const videoObject = ref<VideoRecord | null>(null)
const studentObject = ref<StudentRecord | null>(null)
const isFetchingDocument = ref(false)

// Selected topic data for the modal
const selectedTopicData = ref<ProjectTopicRegistrationData | null>(null)

// Topic status helpers
const topicStatuses = [
  { value: 'draft', label: t('draft') || 'Juodraštis' },
  { value: 'submitted', label: t('submitted') || 'Pateikta' },
  { value: 'needs_revision', label: t('needs_revision') || 'Reikia taisymų' },
  { value: 'approved', label: t('approved') || 'Patvirtinta' },
  { value: 'rejected', label: t('rejected') || 'Atmesta' }
]

// Get status color
const getTopicStatusColor = (status: string): string => {
  switch (status) {
    case 'draft': return 'gray'
    case 'submitted': return 'blue'
    case 'needs_revision': return 'orange'
    case 'approved': return 'green'
    case 'rejected': return 'red'
    default: return 'gray'
  }
}

// Get status label
const getTopicStatusLabel = (status: string): string => {
  const statusObj = topicStatuses.find(s => s.value === status)
  return statusObj ? statusObj.label : status
}

// Check for unread comments in a topic
const hasUnreadComments = (topic: any): boolean => {
  if (!topic || !topic.comments) return false

  return topic.comments.some(comment =>
    comment.unread && comment.authorRole !== 'supervisor'
  )
}

// Count unread comments
const getUnreadCommentsCount = (topic: any): number => {
  if (!topic || !topic.comments) return 0

  return topic.comments.filter(comment =>
    comment.unread && comment.authorRole !== 'supervisor'
  ).length
}

// Table configuration
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
    key: 'topic',
    label: t('topic_status') || 'Temos būsena',
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

// Selection handling
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

// Filters
const search = ref('')
const selectedStatus = ref([])
const sort = ref({ column: 'id', direction: 'asc' as const })
const page = ref(1)
const pageCount = ref(10)
const groupFilter = ref('')
const programFilter = ref('')
const yearFilter = ref(null)
const topicStatusFilter = ref('')

// Reset all filters
const resetFilters = () => {
  search.value = ''
  selectedStatus.value = []
  yearFilter.value = null
  groupFilter.value = ''
  programFilter.value = ''
  topicStatusFilter.value = ''
}

// Use topic management composable
const {
  isLoading: topicLoading,
  error: topicError,
  topicData,
  fetchTopicRegistration,
  saveTopicRegistration,
  addComment,
  changeStatus,
  markCommentAsRead
} = useProjectTopic()

// Data loading
const { years: availableYears, isLoading: yearsLoading, error: yearsError } = useAcademicYears()

// Load students data with topics
const { data: allStudents, status, error: fetchError } = useLazyAsyncData('allStudents', async () => {
  const params = new URLSearchParams()
  if (yearFilter.value) {
    params.set('year', yearFilter.value.toString())
  }

  try {
    const response = await $fetch(`/api/students/supervisor?${params.toString()}`)
    return response
  }
  catch (err) {
    console.error('Error fetching student data:', err)
    throw err
  }
}, {
  default: () => ({
    students: [],
    total: 0,
    year: null
  }),
  watch: [yearFilter]
})

// Active year
const activeYear = computed(() => {
  return yearFilter.value || allStudents.value?.year || null
})

// Filter students based on criteria
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

  // Apply topic status filter
  if (topicStatusFilter.value) {
    result = result.filter(item =>
      item.topic && item.topic.status === topicStatusFilter.value
    )
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

// Get unique values for dropdowns
const uniqueGroups = computed(() => {
  if (!allStudents.value?.students) return []
  return [...new Set(allStudents.value.students.map(s => s.student.studentGroup))]
})

const uniquePrograms = computed(() => {
  if (!allStudents.value?.students) return []
  return [...new Set(allStudents.value.students.map(s => s.student.studyProgram))]
})

// Pagination calculations
const pageTotal = computed(() => filteredStudents.value?.total || 0)
const pageFrom = computed(() => (page.value - 1) * Number(pageCount.value) + 1)
const pageTo = computed(() => Math.min(page.value * Number(pageCount.value), pageTotal.value))

// Watch for page size changes
watch(pageCount, (newValue) => {
  if (typeof newValue === 'string') {
    pageCount.value = Number(newValue)
  }
})

// Reset page when filters change
watch([search, groupFilter, programFilter, topicStatusFilter, pageCount], () => {
  page.value = 1
})

// Handle video/student data display
const sendStudentData = (mVideo: VideoRecord, mStudent: StudentRecord) => {
  isOpen.value = true
  videoObject.value = mVideo
  studentObject.value = mStudent
}

// Open topic registration modal
const openTopicModal = async (row: any) => {
  try {
    if (row.student?.id) {
      // Check if student has a topic
      if (row.topic) {
        // Fetch the latest topic details
        await fetchTopicRegistration(row.student.id)

        // If no topic data was fetched, use the one from the table
        if (!topicData.value && row.topic) {
          selectedTopicData.value = {
            id: row.topic.id,
            studentRecordId: row.student.id,
            GROUP: row.student.studentGroup || '',
            NAME: `${row.student.studentName} ${row.student.studentLastname}`,
            TITLE: row.topic.title || '',
            TITLE_EN: row.topic.titleEn || '',
            PROBLEM: row.topic.problem || '',
            OBJECTIVE: row.topic.objective || '',
            TASKS: row.topic.tasks || '',
            COMPLETION_DATE: row.topic.completionDate || null,
            SUPERVISOR: row.topic.supervisor || '',
            status: row.topic.status || 'draft',
            comments: row.topic.comments || []
          }
        }
        else {
          // Use the fetched data
          selectedTopicData.value = topicData.value
        }
      }
      else {
        // No topic yet
        useToast().add({
          title: t('information') || 'Informacija',
          description: t('student_has_no_topic') || 'Studentas dar neturi registruotos temos',
          color: 'blue'
        })
        return
      }

      showTopicModal.value = true
    }
    else {
      useToast().add({
        title: t('error') || 'Klaida',
        description: t('student_not_found') || 'Studentas nerastas',
        color: 'red'
      })
    }
  }
  catch (err) {
    console.error('Error opening topic:', err)
    useToast().add({
      title: t('error') || 'Klaida',
      description: t('failed_to_load_topic') || 'Nepavyko užkrauti temos',
      color: 'red'
    })
  }
}

// Handle topic actions
const handleTopicSave = async (data: ProjectTopicRegistrationFormData) => {
  try {
    if (!selectedTopicData.value) return

    isSaving.value = true

    await saveTopicRegistration({
      ...data,
      studentRecordId: selectedTopicData.value.studentRecordId
    })

    useToast().add({
      title: t('success') || 'Sėkmingai',
      description: t('topic_saved') || 'Tema išsaugota',
      color: 'green'
    })

    // Refresh data
    await refreshNuxtData('allStudents')
  }
  catch (err) {
    console.error('Error saving topic:', err)
    useToast().add({
      title: t('error') || 'Klaida',
      description: t('failed_to_save_topic') || 'Nepavyko išsaugoti temos',
      color: 'red'
    })
  }
  finally {
    isSaving.value = false
  }
}

// Handle topic comment
const handleTopicComment = async (comment: TopicComment) => {
  try {
    isSaving.value = true

    await addComment(comment)

    useToast().add({
      title: t('success') || 'Sėkmingai',
      description: t('comment_added') || 'Komentaras pridėtas',
      color: 'green'
    })

    // Refresh data to show the new comment
    if (selectedTopicData.value) {
      await fetchTopicRegistration(selectedTopicData.value.studentRecordId)
      selectedTopicData.value = topicData.value
    }
  }
  catch (err) {
    console.error('Error adding comment:', err)
    useToast().add({
      title: t('error') || 'Klaida',
      description: t('failed_to_add_comment') || 'Nepavyko pridėti komentaro',
      color: 'red'
    })
  }
  finally {
    isSaving.value = false
  }
}

// Handle topic status change
const handleTopicStatusChange = async (status: string) => {
  try {
    if (!selectedTopicData.value) return

    isSaving.value = true

    await changeStatus(status)

    useToast().add({
      title: t('success') || 'Sėkmingai',
      description: t('status_updated') || 'Būsena atnaujinta',
      color: 'green'
    })

    // Refresh data
    await refreshNuxtData('allStudents')

    // Close modal if approved or rejected
    if (status === 'approved' || status === 'rejected') {
      showTopicModal.value = false
    }
  }
  catch (err) {
    console.error('Error changing status:', err)
    useToast().add({
      title: t('error') || 'Klaida',
      description: t('failed_to_update_status') || 'Nepavyko atnaujinti būsenos',
      color: 'red'
    })
  }
  finally {
    isSaving.value = false
  }
}

// Handle marking comments as read
const handleMarkCommentAsRead = async (commentId: number) => {
  try {
    await markCommentAsRead(commentId)

    // Refresh topic data
    if (selectedTopicData.value) {
      await fetchTopicRegistration(selectedTopicData.value.studentRecordId)
      selectedTopicData.value = topicData.value
    }
  }
  catch (err) {
    console.error('Error marking comment as read:', err)
  }
}

// Handle success
const handleSuccess = async () => {
  // Refresh data
  await refreshNuxtData('allStudents')
}

// Handle file operations
async function getFile(fileName: string) {
  try {
    const response = await $fetch(`/api/blob/get/${fileName}`)
    if (response?.url) {
      return response.url
    }
    throw new Error('Invalid response from server')
  }
  catch (error) {
    console.error('Error fetching file URL:', error)
    return ''
  }
}

const openDocument = async (doc: DocumentRecord) => {
  if (!doc) return

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

// Supervisor report handling
const isParentSaving = ref(false)
const toast = useToast()

const handleReportSave = async (recordId: number | null, updatedData: any) => {
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

  const apiPayload = {
    studentRecordId: recordId,
    EXPL: updatedData.EXPL,
    WORK: updatedData.WORK,
    OM: updatedData.OM,
    SSM: updatedData.SSM,
    STUM: updatedData.STUM,
    JM: updatedData.JM,
    POS: updatedData.POS,
    PASS: updatedData.PASS
  }

  try {
    const { data, error } = await useFetch('/api/students/supervisor-reports', {
      method: 'POST',
      body: apiPayload
    })

    if (error.value) {
      console.error('Failed to save report:', error.value.statusCode, error.value.statusMessage, error.value.data)
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

// On mount
onMounted(async () => {
  // Initial loading of data if needed
  console.log('Supervisor page mounted')
})
</script>

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

        <!-- Topic Status Filter -->
        <div class="flex items-center gap-1.5">
          <span class="text-sm leading-5 whitespace-nowrap">{{ $t('topic_status') }}</span>
          <USelect
            v-model="topicStatusFilter"
            :options="topicStatuses"
            option-attribute="label"
            value-attribute="value"
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
          :disabled="search === '' && selectedStatus.length === 0 && !yearFilter && !groupFilter && !programFilter && !topicStatusFilter"
          @click="resetFilters"
        >
          {{ $t('reset') }}
        </UButton>
      </div>
    </div>

    <!-- Topic Registration Modal -->
    <UModal
      v-if="selectedTopicData"
      v-model="showTopicModal"
      prevent-close
    >
      <UCard
        :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }"
        class="w-full max-w-6xl"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              {{ selectedTopicData.GROUP }}, {{ selectedTopicData.NAME }} - {{ $t('final_project_topic') || 'Baigiamojo darbo tema' }}
            </h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="ml-4"
              @click="showTopicModal = false"
            />
          </div>
        </template>

        <div class="p-0">
          <ProjectTopicRegistration
            :initial-data="selectedTopicData"
            user-role="supervisor"
            :user-name="user?.displayName || 'Supervisor'"
            form-variant="lt"
            :button-label="$t('review_topic') || 'Peržiūrėti temą'"
            @save="handleTopicSave"
            @comment="handleTopicComment"
            @status-change="handleTopicStatusChange"
            @mark-read="handleMarkCommentAsRead"
            @success="handleSuccess"
          />
        </div>
      </UCard>
    </UModal>

    <!-- Video Preview Modal -->
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
          <div
            v-if="videoObject"
            class="w-full"
          >
            <VideoPlayer
              :video-key="videoObject.key"
              :content-type="videoObject.contentType"
              class="w-full aspect-video"
            />
          </div>
          <div
            v-else
            class="text-center p-4 text-gray-500"
          >
            {{ $t('video_not_available') || 'Vaizdo įrašas nepasiekiamas' }}
          </div>
        </div>
      </UCard>
    </UModal>

    <!-- Supervisor Report Modal -->
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
              {{ $t('processing_document') || 'Apdorojamas dokumentas... Tai gali užtrukti.' }}
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

    <div
      v-if="status === 'pending'"
      class="p-6 text-center"
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin h-8 w-8 mx-auto text-gray-400"
      />
      <p class="mt-2 text-sm text-gray-500">
        {{ $t('loading_student_data') || 'Kraunami studentų duomenys...' }}
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
        {{ $t('no_students_found') || 'Nerasta studentų pagal pasirinktus kriterijus' }}
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
        <div class="w-60 truncate">
          {{ row.student.studentName }} {{ row.student.studentLastname }}
        </div>
        <div class="text-xs font-300">
          {{ row.student.finalProjectTitle || ($t('no_title') || 'Nėra temos pavadinimo') }}
        </div>
      </template>

      <template #topic-data="{ row }">
        <div class="flex items-center gap-2">
          <template v-if="row.topic">
            <div class="flex items-center">
              <!-- Status badge based on topic status -->
              <UBadge
                :color="getTopicStatusColor(row.topic.status)"
                class="mr-2"
              >
                {{ getTopicStatusLabel(row.topic.status) }}
              </UBadge>

              <!-- Button to review topic -->
              <UButton
                size="xs"
                color="primary"
                variant="soft"
                icon="i-heroicons-pencil-square"
                @click="openTopicModal(row)"
              >
                {{ $t('review') || 'Peržiūrėti' }}
              </UButton>

              <!-- Unread comments indicator -->
              <UBadge
                v-if="hasUnreadComments(row.topic)"
                color="red"
                variant="solid"
                class="ml-2"
              >
                {{ getUnreadCommentsCount(row.topic) }}
              </UBadge>
            </div>
          </template>
          <template v-else>
            <UBadge color="gray">
              {{ $t('no_topic') || 'Nėra temos' }}
            </UBadge>
          </template>
        </div>
      </template>

      <template #actions-data="{ row }">
        <div class="flex items-center justify-center gap-1 w-[max-content] flex-nowrap">
          <UButton
            v-if="row.videos && row.videos[0]"
            icon="i-heroicons-video-camera"
            size="xs"
            color="white"
            variant="solid"
            label="Vaizdo"
            :trailing="false"
            class="p-1 text-xs"
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
              :label="doc.documentType === 'PDF' ? 'PDF' : 'ZIP'"
              :trailing="false"
              class="p-1 text-xs"
              @click="openDocument(doc)"
            />
          </template>

          <template v-if="row.supervisorReports && row.supervisorReports.length > 0">
            <div>
              <PreviewSupervisorReport
                :document-data="{
                  NAME: row.student?.studentName +' '+row.student?.studentLastname,
                  PROGRAM: row.student?.studyProgram ?? 'N/A',
                  CODE: row.student?.programCode ?? 'N/A',
                  TITLE: row.student?.finalProjectTitle ?? 'N/A',
                  DEPT: row.student?.department ?? 'Elektronikos ir informatikos fakultetas',
                  WORK: row.supervisorReports[0].supervisorWorkplace ?? 'Vilniaus kolegija Elektronikos ir informatikos fakultetas',
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
                button-label="Pildyti Atsiliepimą"
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
