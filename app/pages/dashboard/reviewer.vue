<template>
  <div v-if="hydrated">
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
      <!-- Search Header -->
      <StudentSearchHeader
        v-model:search="search"
      />

      <!-- Filters -->
      <StudentFilters
        v-model:year="yearFilter"
        v-model:group="groupFilter"
        v-model:program="programFilter"
        v-model:page-count="pageCount"
        :search="search"
        :available-years="availableYears"
        :unique-groups="uniqueGroups"
        :unique-programs="uniquePrograms"
        :years-loading="yearsLoading"
        @reset="resetFilters"
      />

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
                {{ $t('video_presentation') }}
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
            <div class="flex justify-center">
              <!-- Video player would go here -->
              <div class="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                <VideoPlayer
                  v-if="videoObject?.key"
                  :video-key="videoObject?.key"
                  :content-type="videoObject?.contentType"
                  class="w-full h-full object-contain"
                />
                <video
                  v-else-if="videoObject?.url"
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
            </div>
          </div>
        </UCard>
      </UModal>

      <!-- Loading State -->
      <StudentLoadingState
        v-if="status === 'pending'"
        :message="$t('loading_student_data')"
      />

      <!-- Error State -->
      <ErrorState
        v-else-if="fetchError"
        :error="fetchError"
      />

      <!-- Empty State -->
      <EmptyStudentState
        v-else-if="filteredStudents.students.length === 0"
      />

      <!-- Student Table -->
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
        <!-- Group Column -->
        <template #studentGroup-data="{ row }">
          <div class="text-center w-12">
            {{ row.student.studentGroup }}
          </div>
        </template>

        <!-- Name Column -->
        <template #name-data="{ row }">
          <div class="w-60 truncate">
            {{ row.student.studentName }} {{ row.student.studentLastname }}
          </div>
        </template>

        <!-- Actions Column -->
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
          </div>
        </template>

        <!-- Status Column -->
        <template #status-data="{ row }">
          <ReviewerReportColumn
            :row="row"
            :form-variant="determineFormVariant(row.student?.studentGroup)"
            :get-reviewer-modal-data="getReviewerModalData"
            :is-saving="isParentSavingReview"
            :initial-data="initialReviewerFormData"
            @save="handleReviewerReportSave"
          />
        </template>
      </UTable>

      <!-- Footer with Pagination -->
      <template #footer>
        <StudentTablePagination
          v-model:page="page"
          :page-count="Number(pageCount)"
          :total="pageTotal"
          :from="pageFrom"
          :to="pageTo"
          :active-year="activeYear"
        />
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
// Import utility types
import type { DocumentRecord, ReviewerReport, StudentRecord, VideoRecord } from '~~/server/utils/db'
import type { ReviewerReportFormData } from '~/components/EditReviewerReportForm.vue'

// Import shared components
import StudentSearchHeader from '~/components/student/StudentSearchHeader.vue'
import StudentFilters from '~/components/student/StudentFilters.vue'
import StudentLoadingState from '~/components/student/StudentLoadingState.vue'
import ErrorState from '~/components/student/ErrorState.vue'
import EmptyStudentState from '~/components/student/EmptyStudentState.vue'
import StudentTablePagination from '~/components/student/StudentTablePagination.vue'
import ReviewerReportColumn from '~/components/reviewer/ReviewerReportColumn.vue'

// Import composables
import { useStudentTable } from '~/composables/useStudentTable'
import { useFilteredStudents } from '~/composables/useFilteredStudents'
import { useDocumentHandling } from '~/composables/useDocumentHandling'
import { useFormUtilities } from '~/composables/useFormUtilities'
import { useReviewerReports } from '~/composables/useReviewerReports'

// Set page metadata
definePageMeta({
  middleware: ['teacher-access']
})

// Get required utilities
const { user } = useUserSession()
const { determineFormVariant } = useFormUtilities()
const { t } = useI18n()

// Initialize shared state from composables
const {
  search,
  selectedStatus,
  sort,
  page,
  pageCount,
  groupFilter,
  programFilter,
  yearFilter,
  resetFilters,
  availableYears,
  yearsLoading
} = useStudentTable()

// Custom data fetching for reviewer page
const { data: allStudents, status, error: fetchError, refresh: refreshStudents } = useLazyAsyncData('reviewerStudents', async () => {
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
  server: false,
  lazy: true,
  immediate: false
})

const {
  filteredStudents,
  uniqueGroups,
  uniquePrograms,
  pageTotal,
  pageFrom,
  pageTo
} = useFilteredStudents(allStudents)

const {
  isFetchingDocument,
  openDocument
} = useDocumentHandling()

const {
  isParentSavingReview,
  getReviewerModalData,
  getInitialReviewerFormData,
  handleReviewerReportSave: saveReviewerReport
} = useReviewerReports()

// Handle saving reviewer report with refresh
const handleReviewerReportSave = (recordId, updatedData) => {
  return saveReviewerReport(recordId, updatedData, refreshStudents)
}

// Get active year (selected or from API)
const activeYear = computed(() => {
  return yearFilter.value || allStudents.value?.year || null
})

// Initial form data for new reports
const initialReviewerFormData = ref(getInitialReviewerFormData())

// Modal state
const isOpen = ref(false)
const videoObject = ref<VideoRecord | null>(null)
const studentObject = ref<StudentRecord | null>(null)

// Send student data to modal
const sendStudentData = (mVideo: VideoRecord, mStudent: StudentRecord) => {
  isOpen.value = true
  videoObject.value = mVideo
  studentObject.value = mStudent
}

// Selected rows
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

// Define columns for the table
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
    label: t('documents'),
    sortable: false
  },
  {
    key: 'status',
    label: t('reviewer_report'),
    sortable: true
  }
]

// Track selected columns (all by default)
const selectedColumns = ref(columns)
const columnsTable = computed(() =>
  columns.filter(column => selectedColumns.value.includes(column))
)
const hydrated = ref(false)
// Component initialization
onMounted(async () => {
  console.log('Reviewer component mounted')
  hydrated.value = true
  try {
    // Initialize auth store if needed
    const authStore = useAuthStore()
    if (!authStore.isInitialized) {
      await authStore.initFromSession()
    }

    // Load initial data
    await refreshStudents()
  }
  catch (error) {
    console.error('Error during component initialization:', error)
  }
})
</script>
