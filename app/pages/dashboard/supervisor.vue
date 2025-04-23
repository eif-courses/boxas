<script lang="ts" setup>
import type { StudentRecord } from '~~/server/utils/db'
import type { SupervisorReportFormData } from '~/components/EditSupervisorReportForm.vue'
import { useFormUtilities } from '~/composables/useFormUtilities'

definePageMeta({
  middleware: ['teacher-access']
})

const { formatUnixDate, formatUnixDateTime } = useUnixDateUtils()

const { user } = useUserSession()

const statusMessage = ref('')
const statusError = ref(false)
const isLoading = ref(false)

const { t } = useI18n()

// Project Assignment Modal
const showProjectAssignmentModal = ref(false)
const projectAssignmentId = ref(null)
const currentStudentId = ref(null)
const hasProjectAssignment = ref(false)

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

// Project Assignment functions
const openProjectAssignment = async (student) => {
  currentStudentId.value = student.id

  console.log(student.id)

  // Check if the student already has a project assignment
  try {
    const { data } = await useFetch(`/api/projectAssignments/check/${student.id}`)
    if (data.value && data.value.id) {
      projectAssignmentId.value = data.value.id
      hasProjectAssignment.value = true
    }
    else {
      projectAssignmentId.value = student.id // Pass student ID when creating new
      hasProjectAssignment.value = false
    }
    showProjectAssignmentModal.value = true
  }
  catch (error) {
    console.error('Error checking project assignment:', error)
    toast.add({
      title: 'Klaida',
      description: 'Nepavyko patikrinti projekto užduoties būsenos.',
      color: 'red'
    })
  }
}

const handleProjectAssignmentSaved = () => {
  toast.add({
    title: 'Pavyko',
    description: 'Projekto užduotis išsaugota.',
    color: 'green'
  })
}

const handleProjectAssignmentSubmitted = () => {
  toast.add({
    title: 'Pavyko',
    description: 'Projekto užduotis pateikta.',
    color: 'green'
  })
  showProjectAssignmentModal.value = false
  refreshNuxtData('allStudents') // Refresh data
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
const { data: allStudents, status, error: fetchError } = useLazyAsyncData('allStudents', async () => {
  // Use the yearFilter if provided, otherwise send the request without a year parameter
  // This will trigger our backend to find the latest year
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
  watch: [yearFilter] // Only reload when year filter changes
})

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

const isParentSaving = ref(false)
const toast = useToast()
const handleReportSave = async (recordId: number | null, updatedData: SupervisorReportFormData) => {
  // --- 1. Input Validation ---
  if (recordId === undefined || recordId === null) { // Check against null too
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
    studentRecordId: recordId, // Use the ID passed from the template
    EXPL: updatedData.EXPL,
    WORK: updatedData.WORK,
    OM: updatedData.OM,
    SSM: updatedData.SSM,
    STUM: updatedData.STUM,
    JM: updatedData.JM,
    POS: updatedData.POS,
    PASS: updatedData.PASS
  }

  // --- 3. Make the API Call ---
  try {
    // --- CORRECTED ENDPOINT ---
    const { data, error } = await useFetch('/api/students/supervisor-reports', { // Should match supervisor-reports.post.ts
      method: 'POST',
      body: apiPayload
    })

    if (error.value) {
      console.error('Failed to save report:', error.value.statusCode, error.value.statusMessage, error.value.data)
      toast.add({ // Uncommented toast
        title: 'Klaida',
        description: error.value.data?.message || error.value.statusMessage || 'Nepavyko išsaugoti atsiliepimo.',
        color: 'red'
      })
    }
    else {
      console.log('Report saved successfully!', data.value)
      toast.add({ // Uncommented toast
        title: 'Pavyko',
        description: data.value?.message || 'Atsiliepimas sėkmingai išsaugotas.',
        color: 'green'
      })
      // TODO: Add data refresh logic here if needed
      await refreshNuxtData('allStudents') // Refresh the main student list data
    }
  }
  catch (err) {
    console.error('Unexpected error during report save fetch:', err)
    toast.add({ title: 'Sistemos Klaida', description: 'Įvyko netikėta klaida bandant išsaugoti.', color: 'red' }) // Uncommented toast
  }
  finally {
    isParentSaving.value = false
  }
}

const previewStudentRecordObject = ref(null)

const isPreviewOpen = ref(false)

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
          Modal tekstas
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

    <!-- New Project Assignment Modal -->
    <UModal
      v-model="showProjectAssignmentModal"
      size="xl"
    >
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            {{ hasProjectAssignment ? ($t('edit_project_assignment') || 'Redaguoti užduotį') : ($t('create_project_assignment') || 'Sukurti užduotį') }}
          </h3>
        </template>

        <div class="p-0">
          <!-- Embed the Project Assignment Form component here -->
          <ProjectAssignmentForm
            v-if="projectAssignmentId"
            :assignment-id="projectAssignmentId"
            @saved="handleProjectAssignmentSaved"
            @submitted="handleProjectAssignmentSubmitted"
          />
        </div>

        <template #footer>
          <div class="flex justify-end">
            <UButton
              color="gray"
              variant="ghost"
              @click="showProjectAssignmentModal = false"
            >
              {{ $t('close') || 'Uždaryti' }}
            </UButton>
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
        <div class="text-xs font-300">
          ({{ row.student.finalProjectTitle }})
        </div>
      </template>

      <template #actions-data="{ row }">
        <div class="flex items-center justify-center gap-1 w-[max-content] flex-nowrap">
          <!-- Project Assignment Button -->
          <UButton
            icon="i-heroicons-clipboard-document-list"
            size="xs"
            color="white"
            variant="solid"
            label="Užduotis"
            :trailing="false"
            class="p-1 text-xs"
            @click="openProjectAssignment(row.student)"
          />

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
                  // --- Data from main student record ---
                  // Adjust field names based on your actual StudentRecord interface
                  NAME: row.student?.studentName +' '+row.student?.studentLastname,
                  PROGRAM: row.student?.studyProgram ?? 'N/A',
                  CODE: row.student?.programCode ?? 'N/A',
                  TITLE: row.student?.finalProjectTitle ?? 'N/A', // Example: maybe title is thesisTitle
                  DEPT: row.student?.department ?? 'Elektronikos ir informatikos fakultetas', // Provide default or get from studentRecord
                  WORK: row.student?.supervisorWorkplace ?? 'Vilniaus kolegija Elektronikos ir informatikos fakultetas',
                  // --- Data specific to THIS report ---
                  EXPL: row.supervisorReports[0].supervisorComments ?? '', // Use comments as EXPL
                  OM: row.supervisorReports[0].otherMatch ?? 0,
                  SSM: row.supervisorReports[0].oneMatch ?? 0,
                  STUM: row.supervisorReports[0].ownMatch ?? 0,
                  JM: row.supervisorReports[0].joinMatch ?? 0,
                  createdDate: formatUnixDateTime(row.supervisorReports[0].createdDate), // Format the timestamp for the component

                  // --- Data that might need specific logic ---
                  // Assuming supervisor details might be on studentRecord or fetched/known elsewhere
                  SUPER: row.supervisorReports[0].supervisorName ?? 'N/A Supervisor',
                  POS: row.supervisorReports[0].supervisorPosition ?? 'N/A Position',
                  // Use the report's creation date, formatted, for the main 'DATE' field
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
    <UModal
      v-model="isPreviewOpen"
      :overlay="false"
    >
      <div class="p-4">
        <code>{{ previewStudentRecordObject }}</code>
      </div>
    </UModal>
  </UCard>
</template>
