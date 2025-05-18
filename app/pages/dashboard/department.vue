<template>
  <div>
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
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3">
        <div class="flex flex-1 w-full sm:w-auto">
          <UInput
            v-model="search"
            icon="i-heroicons-magnifying-glass-20-solid"
            :placeholder="$t('search')"
            class="w-full"
          />
        </div>
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
              class="w-20"
              size="xs"
              :placeholder="$t('all_years')"
              clearable
              :loading="yearsLoading"
            />
          </div>

          <div class="flex items-center gap-1.5">
            <span class="text-sm leading-5 whitespace-nowrap">{{ $t('group') }}</span>
            <USelect
              v-model="groupFilter"
              :options="uniqueGroups"
              class="w-24 flex-grow"
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
              class="w-24 flex-grow"
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

      <UTable
        v-if="filteredStudents.students.length > 0"
        :key="`table-${updateCounter}`"
        v-model:sort="sort"
        :rows="filteredStudents.students"
        :columns="columnsTable"
        :loading="status === 'pending' || isRefreshing"
        sort-asc-icon="i-heroicons-arrow-up"
        sort-desc-icon="i-heroicons-arrow-down"
        sort-mode="manual"
        class="w-full"
        :ui="{
          td: { base: 'whitespace-nowrap px-2 py-1' },
          th: {
            base: 'px-2 py-1',
            padding: 'px-2 py-2',
            favorite: 'w-10',
            group: 'w-16',
            name: 'w-1/4',
            topic: 'w-1/5',
            supervisor: 'w-1/5',
            reviewer: 'w-1/5',
            actions: 'w-1/6'
          },
          default: { checkbox: { color: 'primary' } }
        }"
      >
        <template #group-data="{ row }">
          <div class="text-center w-12">
            {{ row.student.studentGroup }}
          </div>
        </template>

        <template #name-data="{ row }">
          <div class="truncate font-bold">
            {{ row.student.studentName }} {{ row.student.studentLastname }}
          </div>
          <div class="truncate text-xs text-gray-600">
            {{ row.student.finalProjectTitle }}
          </div>
          <div class="truncate text-xs text-gray-500 italic">
            {{ row.student.finalProjectTitleEn }}
          </div>
        </template>

        <!-- NEW COLUMN: Topic Registration Status -->
        <template #topic-data="{ row }">
          <div class="flex flex-col gap-2">
            <!-- Status Badge in a separate row -->
            <div class="flex items-center">
              <UBadge
                v-if="row.projectTopicRegistrations && row.projectTopicRegistrations.length > 0"
                :color="getTopicStatusColor(row.projectTopicRegistrations[0].status)"
                variant="soft"
                size="xs"
                class="whitespace-nowrap min-w-[80px] text-center"
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
                class="whitespace-nowrap min-w-[80px] text-center"
              >
                {{ $t('no_topic') }}
              </UBadge>
            </div>

            <!-- Topic Registration button in a separate row -->
            <div class="flex items-center">
              <ProjectTopicRegistration
                v-if="row.projectTopicRegistrations && row.projectTopicRegistrations.length > 0"
                :key="`topic-${row.student.id}-${row.projectTopicRegistrations[0].status}-${forceRerender}`"
                :initial-data="{
                  studentRecordId: row.student.id,
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
                :user-role="'department_head'"
                :department-head-name="user?.displayName || ''"
                :user-name="user?.displayName || ''"
                :form-variant="determineFormVariant(row.student.studentGroup)"
                :icon="getTopicStatusIcon(row.projectTopicRegistrations[0].status)"
                :color="getTopicStatusColor(row.projectTopicRegistrations[0].status)"
                :variant="'solid'"
                :button-label="getTopicButtonLabel(row)"
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
          </div>
        </template>

        <template #supervisor-data="{ row }">
          <div class="truncate text-xs mb-1">
            {{ row.student.supervisorEmail }}
          </div>
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
                  PASS: row.supervisorReports[0].isPassOrFailed ?? 1,
                  SUPER: row.supervisorReports[0].supervisorName ?? 'N/A Supervisor',
                  POS: row.supervisorReports[0].supervisorPosition ?? 'N/A Position',
                  DATE: formatUnixDate(row.supervisorReports[0].createdDate)
                }"
                :button-label="$t('view')"
                :form-variant="determineFormVariant(row.student?.studentGroup)"
                :modal-title="$t('supervisor_report')"
              />
            </div>
          </template>
          <template v-else>
            <div class="flex gap-1 justify-left items-center">
              <UIcon
                name="i-heroicons-clock"
                class="w-4 h-4 text-yellow-500"
              />
              <span class="text-xs">{{ $t('not_filled') }}</span>
            </div>
          </template>
        </template>

        <template #reviewer-data="{ row }">
          <div class="truncate text-xs mb-1">
            {{ row.student.reviewerName }}
          </div>
          <template v-if="row.reviewerReports && row.reviewerReports.length > 0">
            <div v-if="getReviewerModalData(row)">
              <PreviewReviewerReport
                :review-data="getReviewerModalData(row)"
                :form-variant="determineFormVariant(row.student?.studentGroup)"
                :button-label="t('view')"
              />
            </div>
          </template>
          <template v-else>
            <div class="flex gap-1 justify-left items-center">
              <UIcon
                name="i-heroicons-clock"
                class="w-4 h-4 text-yellow-500"
              />
              <span class="text-xs">{{ $t('not_filled') }}</span>
            </div>
          </template>
        </template>

        <template #actions-data="{ row }">
          <div class="flex items-center justify-center gap-1 w-[max-content] flex-nowrap">
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
        </template>
      </UTable>

      <div
        v-if="status === 'pending' || isRefreshing"
        class="p-6 text-center"
      >
        <UIcon
          name="i-heroicons-arrow-path"
          class="animate-spin h-8 w-8 mx-auto text-gray-400"
        />
        <p class="mt-2 text-sm text-gray-500">
          {{ isRefreshing ? 'Refreshing data...' : 'Loading student data...' }}
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
          No students found matching your criteria
        </p>
      </div>

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
          </div>

          <div class="flex items-center gap-2">
            <UButton
              v-if="allStudents.value?.students?.length > 0"
              icon="i-heroicons-arrow-path"
              color="gray"
              variant="ghost"
              size="sm"
              :loading="isRefreshing"
              @click="refreshData"
            >
              Refresh
            </UButton>

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
        </div>
      </template>
    </UCard>

    <UModal
      v-model="isOpen"
      prevent-close
    >
      <!-- Video modal content goes here (commented out in original) -->
    </UModal>
  </div>
</template>

<script lang="ts" setup>
import { useUnixDateUtils } from '~/composables/useUnixDateUtils'
import { useFormUtilities } from '~/composables/useFormUtilities'
import type {
  ProjectTopicRegistrationData
} from '~/components/ProjectTopicRegistration.vue'

definePageMeta({
  middleware: 'department-access'
})
const forceRerender = ref(0)
const { t } = useI18n()

const { getReviewerModalData } = useReviewerReports()

// Updated columns array to include the topic column
const columns = [
  {
    key: 'group',
    label: t('group'),
    sortable: false
  },
  {
    key: 'name',
    label: t('fullname'),
    sortable: true
  },
  {
    key: 'topic', // New column for topic status
    label: t('final_project_topic'),
    sortable: true
  },

  {
    key: 'actions',
    label: t('documents'),
    sortable: false
  },
  {
    key: 'reviewer',
    label: t('reviewer'),
    sortable: true
  },
  {
    key: 'supervisor',
    label: t('supervisor'),
    sortable: true
  }

]

const selectedColumns = ref(columns)
const columnsTable = computed(() => columns.filter(column => selectedColumns.value.includes(column)))

const isRefreshing = ref(false)

const toast = useToast()

const updateCounter = ref(0)

// Use the same function for the refresh button
async function refreshData() {
  if (isRefreshing.value) return

  isRefreshing.value = true
  try {
    const queryParams = new URLSearchParams()
    if (yearFilter.value) {
      queryParams.set('year', yearFilter.value.toString())
    }

    const response = await $fetch(`/api/students/department?${queryParams.toString()}`)
    allStudents.value = response

    // Increment counter to force UI refresh
    updateCounter.value++

    toast.add({
      title: 'Data refreshed',
      description: 'Student data has been updated',
      icon: 'i-heroicons-check-circle',
      color: 'green',
      timeout: 2000
    })
  }
  catch (error) {
    console.error('Error refreshing data:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to refresh data',
      icon: 'i-heroicons-exclamation-triangle',
      color: 'red',
      timeout: 5000
    })
  }
  finally {
    isRefreshing.value = false
  }
}

// Add helper functions for topic status (copied from supervisor view)
const getTopicStatusLabel = (status) => {
  switch (status) {
    case 'submitted':
      return t('submitted')
    case 'approved':
      return t('approved')
    case 'needs_revision':
      return t('needs_revision')
    case 'head_approved':
      return t('head_approved')
    case 'draft':
      return t('draft')
    default:
      return t('unknown')
  }
}

const getTopicStatusTooltip = (status) => {
  switch (status) {
    case 'submitted':
      return t('topic_submitted_tooltip')
    case 'approved':
      return t('topic_approved_tooltip')
    case 'needs_revision':
      return t('topic_needs_revision_tooltip')
    case 'head_approved':
      return t('topic_head_approved_tooltip')
    case 'draft':
      return t('topic_draft_tooltip')
    default:
      return ''
  }
}

const getTopicStatusColor = (status) => {
  switch (status) {
    case 'submitted':
      return 'blue'
    case 'approved':
      return 'blue'
    case 'needs_revision':
      return 'orange'
    case 'head_approved':
      return 'green'
    case 'draft':
      return 'gray'
    default:
      return 'gray'
  }
}

const search = ref('')
const selectedStatus = ref([])

const sort = ref({ column: 'id', direction: 'asc' as const })
const page = ref(1)
const pageCount = ref(10)

// Modal state
const isOpen = ref(false)
const videoObject = ref(null)
const studentObject = ref(null)
const isFetchingDocument = ref(false)

const sendStudentData = (mVideo, mStudent) => {
  isOpen.value = true
  videoObject.value = mVideo
  studentObject.value = mStudent
}

async function getFile(fileName) {
  try {
    const response = await $fetch(`/api/blob/get/${fileName}`)
    if (response?.url) {
      return response.url
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

const openDocument = async (doc) => {
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

const groupFilter = ref('')
const programFilter = ref('')
const yearFilter = ref(null)

const resetFilters = () => {
  search.value = ''
  selectedStatus.value = []
  yearFilter.value = null
  groupFilter.value = ''
  programFilter.value = ''
}

// Dynamic years from API
const { years: availableYears, isLoading: yearsLoading, error: yearsError } = useAcademicYears()

// The API call is already using the department endpoint, no need to change
const { data: allStudents, status, error: fetchError } = useLazyAsyncData('allStudents', async () => {
  const queryParams = new URLSearchParams()
  if (yearFilter.value) {
    queryParams.set('year', yearFilter.value.toString())
  }

  try {
    const response = await $fetch(`/api/students/department?${queryParams.toString()}`)
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

const filteredStudents = computed(() => {
  if (!allStudents.value?.students) {
    return { students: [], total: 0 }
  }

  let result = [...allStudents.value.students]

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
        || (student.reviewerName || '').toLowerCase().includes(searchTerm)
        || (student.supervisorEmail || '').toLowerCase().includes(searchTerm)
      )
    })
  }

  if (groupFilter.value) {
    result = result.filter(item => item.student.studentGroup === groupFilter.value)
  }

  if (programFilter.value) {
    result = result.filter(item => item.student.studyProgram === programFilter.value)
  }

  result.sort((a, b) => {
    let valA, valB

    if (sort.value.column === 'name') {
      valA = `${a.student.studentName} ${a.student.studentLastname}`.toLowerCase()
      valB = `${b.student.studentName} ${b.student.studentLastname}`.toLowerCase()
    }
    else if (sort.value.column === 'topic') {
      // Sort by topic status
      const getTopicValue = (item) => {
        if (!item.projectTopicRegistrations || item.projectTopicRegistrations.length === 0) {
          return 0 // No topic
        }
        // Order: approved (3), submitted (2), needs_revision (1), head_approved (0)
        const status = item.projectTopicRegistrations[0].status
        switch (status) {
          case 'approved':
            return 3
          case 'submitted':
            return 2
          case 'needs_revision':
            return 1
          case 'head_approved':
            return 0
          default:
            return -1
        }
      }

      valA = getTopicValue(a)
      valB = getTopicValue(b)
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

  const totalCount = result.length
  const startIndex = (page.value - 1) * pageCount.value
  const paginatedResult = result.slice(startIndex, startIndex + pageCount.value)

  return {
    students: paginatedResult,
    total: totalCount
  }
})

const uniqueGroups = computed(() => {
  if (!allStudents.value?.students) return []
  return [...new Set(allStudents.value.students.map(s => s.student.studentGroup))]
})

const uniquePrograms = computed(() => {
  if (!allStudents.value?.students) return []
  return [...new Set(allStudents.value.students.map(s => s.student.studyProgram))]
})

const pageTotal = computed(() => filteredStudents.value?.total || 0)
const pageFrom = computed(() => (page.value - 1) * Number(pageCount.value) + 1)
const pageTo = computed(() => Math.min(page.value * Number(pageCount.value), pageTotal.value))

watch(pageCount, (newValue) => {
  if (typeof newValue === 'string') {
    pageCount.value = Number(newValue)
  }
})

watch([search, groupFilter, programFilter, pageCount], () => {
  page.value = 1
})

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
        userRole: 'department_head'
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
    case 'head_approved':
      return t('view')
    default:
      return t('edit')
  }
}
const getTopicStatusIcon = (status) => {
  switch (status) {
    case 'submitted':
      return 'i-heroicons-document-check'
    case 'approved':
      return 'i-heroicons-check-circle'
    case 'needs_revision':
      return 'i-heroicons-exclamation-circle'
    case 'rejected':
      return 'i-heroicons-x-circle'
    case 'head_approved':
      return 'i-heroicons-eye'
    case 'draft':
      return 'i-heroicons-pencil-square'
    default:
      return 'i-heroicons-document'
  }
}
const handleInitialData = (data) => {
  // Update the currentStudentId and currentStudentData when the component initializes
  if (data && data.studentRecordId) {
    currentStudentId.value = data.studentRecordId
    currentStudentData.value = { ...data } // Create a copy to avoid reference issues
    console.log('Set current student data:', currentStudentData.value)
  }
}

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

    // Create the API payload with all required fields
    const apiPayload = {
      studentRecordId: formData.studentRecordId,
      TITLE: formData.TITLE,
      TITLE_EN: formData.TITLE_EN,
      PROBLEM: formData.PROBLEM,
      OBJECTIVE: formData.OBJECTIVE,
      TASKS: formData.TASKS,
      COMPLETION_DATE: formData.COMPLETION_DATE,
      SUPERVISOR: formData.SUPERVISOR,
      status: formData.status,
      REGISTRATION_DATE: formData.REGISTRATION_DATE
    }

    console.log('Sending API payload:', apiPayload)

    // Make the API call
    const response = await $fetch('/api/students/project-topics', {
      method: 'POST',
      body: apiPayload
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
      authorRole: 'department_head',
      authorName: t('department_head'),
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
const { user } = useUserSession()
const currentStudentId = ref<number | null>(null)
const currentStudentData = ref<ProjectTopicRegistrationData | null>(null)

const { formatUnixDate, formatUnixDateTime } = useUnixDateUtils()

const { determineFormVariant } = useFormUtilities()
</script>
