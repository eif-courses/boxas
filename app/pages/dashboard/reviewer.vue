<script lang="ts" setup>
import type { DocumentRecord, ReviewerReport, StudentRecord, VideoRecord } from '~~/server/utils/db'
import type { ReviewerReportDataType, ReviewerReportFormData } from '~/components/EditReviewerReportForm.vue'
import { useFormUtilities } from '~/composables/useFormUtilities'

definePageMeta({
  middleware: ['teacher-access']
})

const statusMessage = ref('')
const statusError = ref(false)
const isLoading = ref(false)

const { t } = useI18n()
// Columns
const columns = [
  { key: 'studentGroup', label: t('group'), sortable: false },
  { key: 'name', label: t('fullname'), sortable: true },
  { key: 'documents', label: t('documents'), sortable: false },
  { key: 'review', label: t('reviewer_report'), sortable: false }
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
const isVideoModalOpen = ref(false)
const currentVideo = ref(null)
const currentStudentVideo = ref(null)

// Replace your sendStudentData function with this:
const openVideoModal = async (video, student) => {
  console.log('Opening video:', video, 'for student:', student)

  // Set the current video and student info
  currentVideo.value = video
  currentStudentVideo.value = student

  // If the video doesn't have a URL, fetch it
  if (video && !video.url && video.filePath) {
    try {
      const url = await getFile(video.filePath)
      if (url) {
        currentVideo.value = {
          ...video,
          url: url
        }
      }
    }
    catch (error) {
      console.error('Error fetching video URL:', error)
      useToast().add({
        title: t('error'),
        description: t('error_loading_video'),
        color: 'red'
      })
    }
  }

  // Open the modal
  isVideoModalOpen.value = true
}

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

// Interfaces

// Filters

const groupFilter = ref('')
const programFilter = ref('')
const yearFilter = ref(null)

// Reset all filters
const resetFilters = () => {
  search.value = ''
  selectedStatus.value = []
  yearFilter.value = null
  groupFilter.value = ''
  programFilter.value = ''
}

// Dynamic years from API
const { years: availableYears, isLoading: yearsLoading, error: yearsError } = useAcademicYears()

// Load all data once by year
const { data: allStudents, status, error: fetchError } = useLazyAsyncData('reviewerStudents', async () => {
  const params = new URLSearchParams()
  if (yearFilter.value) {
    params.set('year', yearFilter.value.toString())
  }

  try {
    const response = await $fetch(`/api/students/reviewer?${params.toString()}`)
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
  watch: [yearFilter],
  server: false // This is all you need
})

interface StudentRecordsResponse {
  student: StudentRecord
  documents: DocumentRecord[]
  videos: VideoRecord[]
  supervisorReports: SupervisorReport[]
  reviewerReports: ReviewerReport[]
}

// TODO continue reviewer component
const getReviewerModalData = (response: StudentRecordsResponse) => {
  if (!response.student) return null // Need student record

  // Construct the object expected by ReviewerReportModal
  return {
    STUDENT_NAME: response.student.studentName + ' ' + response.student.studentLastname,
    THESIS_TITLE: response.student.finalProjectTitle ?? 'N/A',
    FACULTY: 'Elektronikos ir informatikos fakultetas', // Or from studentRecord if available
    DEPARTMENT: response.student.department ?? 'N/A',

    // Combine reviewer details (you might get this differently from API)
    REVIEWER_FULL_DETAILS: response.student.reviewerName + ' ' + response.reviewerReports[0]?.reviewerPersonalDetails,
    REVIEWER_NAME_SIGNATURE: response.student.reviewerName ?? '', // Name for signature line

    // Map review fields from the API report object
    REVIEW_GOALS: response.reviewerReports[0]?.reviewGoals ?? undefined,
    REVIEW_THEORY: response.reviewerReports[0]?.reviewTheory ?? undefined,
    REVIEW_PRACTICAL: response.reviewerReports[0]?.reviewPractical ?? undefined,
    REVIEW_THEORY_PRACTICAL_LINK: response.reviewerReports[0]?.reviewTheoryPracticalLink ?? undefined,
    REVIEW_RESULTS: response.reviewerReports[0]?.reviewResults ?? undefined,
    REVIEW_PRACTICAL_SIGNIFICANCE: response.reviewerReports[0]?.reviewPracticalSignificance ?? undefined,
    REVIEW_LANGUAGE: response.reviewerReports[0]?.reviewLanguage ?? undefined,
    REVIEW_PROS: response.reviewerReports[0]?.reviewPros ?? undefined,
    REVIEW_CONS: response.reviewerReports[0]?.reviewCons ?? undefined,
    REVIEW_QUESTIONS: response.reviewerReports[0]?.reviewQuestions ?? undefined,
    FINAL_GRADE: response.reviewerReports[0]?.grade ?? undefined, // Assuming 'finalGrade' field exists
    REPORT_DATE: response.reviewerReports[0]?.createdDate ? new Date(response.reviewerReports[0]?.createdDate * 1000) : undefined,
    IS_SIGNED: response.reviewerReports[0]?.isSigned ?? undefined
    // Map any other necessary fields...
  }
}

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

// Reset page when filters change
watch([search, groupFilter, programFilter, pageCount], () => {
  page.value = 1
})

// --- Assume 'studentAndReviewData' holds combined data ---
// You need to fetch/construct this object containing student display info
// and any *existing* reviewer report data to pre-fill the form.
const studentAndReviewData = ref<ReviewerReportDataType>({
  // --- Example Data ---
  studentRecordId: 456, // Crucial ID
  DEPT: 'Taikomosios Kompiuterijos Katedra',
  PROGRAM: 'Kompiuterių Tinklų Administravimas',
  CODE: '6531EX005',
  NAME: 'Ona Onaitė',
  TITLE: 'Debesų Kompiuterijos Sprendimų Analizė',
  // Initial Editable Fields (could be from existing fetched report or empty)
  REVIEWER_FULL_DETAILS: 'Lekt. Petras Petraitis, VIKO EIF, lektorius',
  REVIEW_GOALS: 'Tikslai aiškūs...',
  REVIEW_THEORY: 'Teorija pakankama...',
  REVIEW_PRACTICAL: 'Praktinė dalis galėtų būti platesnė...',
  // ... other initial review fields or empty strings ...
  FINAL_GRADE: 8
})

const isParentSavingReview = ref(false)
const toast = useToast()
const handleReviewerReportSave = async (recordId: number | null, updatedData: ReviewerReportFormData) => {
  // Need studentRecordId from the initial data context
  // const recordId = studentAndReviewData.value?.studentRecordId // Get from your data source

  if (recordId === undefined || recordId === null) {
    toast.add({ title: 'Klaida', description: 'Trūksta studento įrašo ID recenzijos išsaugojimui.', color: 'red' })
    return
  }

  isParentSavingReview.value = true
  console.log(`Saving reviewer report for studentRecordId ${recordId}:`, updatedData)

  const apiPayload = {
    studentRecordId: recordId,
    ...updatedData // Spread the editable fields
    // Don't send REPORT_DATE, backend handles timestamp
  }
  delete apiPayload.REPORT_DATE // Ensure it's removed

  try {
    // --- MAKE API CALL to your Reviewer Report endpoint ---
    const { data, error } = await useFetch('/api/students/reviewer-reports', { // <<< ADJUST ENDPOINT
      method: 'POST', // Or PUT/PATCH if updating
      body: apiPayload
    })

    if (error.value) {
      console.error('Failed to save reviewer report:', error.value.statusCode, error.value.statusMessage, error.value.data)
      toast.add({ title: 'Klaida', description: error.value.data?.message || 'Nepavyko išsaugoti recenzijos.', color: 'red' })
    }
    else {
      console.log('Reviewer report saved successfully!', data.value)
      toast.add({ title: 'Pavyko', description: data.value?.message || 'Recenzija sėkmingai išsaugota.', color: 'green' })
      // TODO: Refresh data if needed
    }
  }
  catch (err) {
    console.error('Unexpected error saving reviewer report:', err)
    toast.add({ title: 'Sistemos Klaida', description: 'Įvyko netikėta klaida.', color: 'red' })
  }
  finally {
    isParentSavingReview.value = false
  }
}

const { determineFormVariant } = useFormUtilities()
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
            class="w-24 flex-grow"
            size="xs"
            :placeholder="$t('all')"
            clearable
          />
        </div>

        <div class="flex items-center gap-1.5">
          <span class="text-sm leading-5 whitespace-nowrap">{{ $t('study_program') }}</span>
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
    <UModal v-model="isVideoModalOpen">
      <UCard
        :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }"
        class="w-full max-w-6xl"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              {{ currentStudentVideo?.studentGroup }}, {{ currentStudentVideo?.studentName }}
              {{ $t('video_presentation') }}
            </h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="ml-4"
              @click="isVideoModalOpen = false"
            />
          </div>
        </template>

        <div class="p-4">
          <div class="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <VideoPlayer
              v-if="currentVideo?.key"
              :video-key="currentVideo?.key"
              :content-type="currentVideo?.contentType"
              class="w-full h-full object-contain"
            />
            <video
              v-else-if="currentVideo?.url"
              controls
              class="w-full h-full object-contain"
              :src="currentVideo?.url"
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
              {{ $t('uploaded_on') }}: {{ formatDate(currentVideo?.createdAt) }}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t('file_name') }}: {{ currentVideo?.filename }}
            </p>
          </div>
        </div>
      </UCard>
    </UModal>

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
              {{ studentObject?.studentGroup }}, {{ studentObject?.studentName }} ({{ studentObject?.currentYear }})
              recenzija
            </h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="ml-4"
              @click="isOpenReport = false"
            />
          </div>

          <div class="container mx-auto py-8 px-4">
            <h1 class="text-2xl font-bold mb-6">
              {{ studentObject?.finalProjectTitle }}
            </h1>

            <div
              v-if="isLoading"
              class="mt-4 p-4 bg-blue-100 text-blue-700"
            >
              Processing document... This may take a moment.
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

    <ClientOnly>
      <div
        v-if="status === 'pending'"
        class="p-6 text-center"
      >
        <UIcon
          name="i-heroicons-arrow-path"
          class="animate-spin h-8 w-8 mx-auto text-gray-400"
        />
        <p class="mt-2 text-sm text-gray-500">
          Loading student data...
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
        </template>

        <template #documents-data="{ row }">
          <div class="flex gap-1 justify-center">
            <UButton
              v-if="row.videos && row.videos[0]"
              icon="i-heroicons-video-camera"
              size="xs"
              color="white"
              variant="solid"
              :trailing="false"
              class="p-1 text-xs min-w-0"
              @click="openVideoModal(row.videos[0], row.student)"
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
                class="p-1 text-xs"
                @click="openDocument(doc)"
              />
            </template>
          </div>
        </template>
        <template #review-data="{ row }">
          <div class="flex justify-center">
            <template v-if="row.reviewerReports && row.reviewerReports.length > 0">
              <PreviewReviewerReport
                :review-data="getReviewerModalData(row)"
                :form-variant="determineFormVariant(row.student?.studentGroup)"
                button-label="Peržiūrėti Recenziją"
              />
            </template>
            <template v-else>
              <EditReviewerReportForm
                :form-variant="determineFormVariant(row.student?.studentGroup)"
                :initial-data="studentAndReviewData"
                @save="handleReviewerReportSave(row.student.id, $event)"
              />
            </template>
          </div>
        </template>
      </UTable>

      <!-- Fallback content for server-side rendering -->
      <template #fallback>
        <div class="p-6 text-center">
          <UIcon
            name="i-heroicons-arrow-path"
            class="animate-spin h-8 w-8 mx-auto text-gray-400"
          />
          <p class="mt-2 text-sm text-gray-500">
            Initializing...
          </p>
        </div>
      </template>
    </ClientOnly>

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
