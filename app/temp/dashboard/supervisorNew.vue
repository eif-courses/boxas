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
    <VideoModal
      v-model="isVideoModalOpen"
      :video="currentVideo"
      :student="currentStudentVideo"
    />

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
      :responsive="true"
      :ui="{
        wrapper: 'overflow-x-auto',
        td: {
          base: 'whitespace-nowrap px-2 py-2'
        },
        default: { checkbox: { color: 'primary' } },
        th: {
          base: 'px-2 py-1',
          padding: 'px-2 py-2',
          studentGroup: 'w-16',
          name: 'w-1/4',
          topic: 'w-1/4',
          documents: 'w-16',
          status: 'w-1/4'
        }
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

      <!-- Topic Column -->
      <template #topic-data="{ row }">
        <SupervisorTopicColumn
          :row="row"
          :user-name="user?.displayName || ''"
          :form-variant="determineFormVariant(row.student.studentGroup)"
          :force-rerender="forceRerender"
          @init="handleInitialData"
          @save="handleTopicSave"
          @comment="handleTopicComment"
          @status-change="handleTopicStatusChange"
          @mark-read="handleMarkCommentRead"
          @success="refreshStudents"
        />
      </template>

      <!-- Documents Column -->
      <template #documents-data="{ row }">
        <DocumentsColumn
          :row="row"
          :loading="isFetchingDocument"
          @open-video="openVideoModal"
          @open-document="openDocument"
        />
      </template>

      <!-- Supervisor Report Column -->
      <template #status-data="{ row }">
        <SupervisorReportColumn
          :row="row"
          :user-name="user?.displayName || ''"
          :form-variant="determineFormVariant(row.student?.studentGroup)"
          @save="handleReportSave"
          @close="reportFormData = null"
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
</template>

<script setup lang="ts">
// Import utility types

// Import role-specific components
import StudentSearchHeader from '~/components/student/StudentSearchHeader.vue'
import StudentFilters from '~/components/student/StudentFilters.vue'
import VideoModal from '~/components/student/VideoModal.vue'
import StudentLoadingState from '~/components/student/StudentLoadingState.vue'
import ErrorState from '~/components/student/ErrorState.vue'
import EmptyStudentState from '~/components/student/EmptyStudentState.vue'
import StudentTablePagination from '~/components/student/StudentTablePagination.vue'
import SupervisorTopicColumn from '~/components/supervisor/SupervisorTopicColumn.vue'
import DocumentsColumn from '~/components/supervisor/DocumentsColumn.vue'
import SupervisorReportColumn from '~/components/supervisor/SupervisorReportColumn.vue'

// Import composables
import { useStudentTable } from '~/composables/useStudentTable'
import { useStudentData } from '~/composables/useStudentData'
import { useFilteredStudents } from '~/composables/useFilteredStudents'
import { useTopicManagement } from '~/composables/useTopicManagement'
import { useDocumentHandling } from '~/composables/useDocumentHandling'
import { useSupervisorReports } from '~/composables/useSupervisorReports'
import { useFormUtilities } from '~/composables/useFormUtilities'

// Set page metadata
definePageMeta({
  middleware: 'teacher-access'
})

// Get shared session data
const { user } = useUserSession()
const { determineFormVariant } = useFormUtilities()

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
  forceRerender,
  resetFilters,
  availableYears,
  yearsLoading
} = useStudentTable()

const {
  allStudents,
  status,
  fetchError,
  refreshStudents,
  activeYear
} = useStudentData('supervisor')

const {
  filteredStudents,
  uniqueGroups,
  uniquePrograms,
  pageTotal,
  pageFrom,
  pageTo
} = useFilteredStudents(allStudents)

const {
  currentStudentId,
  currentStudentData,
  handleInitialData,
  handleTopicSave,
  handleTopicComment,
  handleTopicStatusChange,
  handleMarkCommentRead
} = useTopicManagement(refreshStudents, 'supervisor')

const {
  isFetchingDocument,
  isVideoModalOpen,
  currentVideo,
  currentStudentVideo,
  openVideoModal,
  openDocument
} = useDocumentHandling()

const { handleReportSave } = useSupervisorReports(refreshStudents)

// Define columns for the table
const columns = [
  {
    key: 'studentGroup',
    label: 'Group',
    sortable: false
  },
  {
    key: 'name',
    label: 'Full Name',
    sortable: true
  },
  {
    key: 'topic',
    label: 'Final Project Topic',
    sortable: true
  },
  {
    key: 'documents',
    label: 'Documents',
    sortable: false
  },
  {
    key: 'status',
    label: 'Supervisor Report',
    sortable: true
  }
]

// Track selected columns (all by default)
const selectedColumns = ref(columns)
const columnsTable = computed(() =>
  columns.filter(column => selectedColumns.value.includes(column))
)

// Track selected rows
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

// Miscellaneous variables
const reportFormData = ref(null)
const supervisorReportData = ref(null)

// Component initialization
onMounted(async () => {
  console.log('Component mounted')
  const isInitialLoad = ref(true)

  try {
    // Initialize auth store if needed
    const authStore = useAuthStore()
    if (!authStore.isInitialized) {
      await authStore.initFromSession()
    }

    // Initial data load
    if (isInitialLoad.value) {
      await refreshStudents()
      isInitialLoad.value = false
    }
  }
  catch (error) {
    console.error('Error during component initialization:', error)
  }
})
</script>
