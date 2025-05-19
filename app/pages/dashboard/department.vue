<template>
  <div v-if="authStore.isReady && hydrated">
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

      <!-- Student Table -->
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
        <!-- Group Column -->
        <template #group-data="{ row }">
          <div class="text-center w-12">
            {{ row.student.studentGroup }}
          </div>
        </template>

        <!-- Name Column -->
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

        <!-- Topic Column -->
        <template #topic-data="{ row }">
          <div class="flex flex-col gap-2">
            <!-- Status Badge -->
            <TopicStatusBadge
              :status="row.projectTopicRegistrations?.[0]?.status"
              :has-topic="row.projectTopicRegistrations && row.projectTopicRegistrations.length > 0"
            />

            <!-- Topic Registration button -->
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
                @success="refreshStudents"
              />
            </div>
          </div>
        </template>

        <!-- Documents Column -->
        <template #actions-data="{ row }">
          <DocumentsColumn
            :row="row"
            :loading="isFetchingDocument"
            @open-video="sendStudentData"
            @open-document="openDocument"
          />
        </template>

        <!-- Reviewer Column -->
        <template #reviewer-data="{ row }">
          <ReviewerColumn
            :row="row"
            :form-variant="determineFormVariant(row.student?.studentGroup)"
            :get-reviewer-modal-data="getReviewerModalData"
          />
        </template>

        <!-- Supervisor Column -->
        <template #supervisor-data="{ row }">
          <SupervisorColumn
            :row="row"
            :form-variant="determineFormVariant(row.student?.studentGroup)"
          />
        </template>
      </UTable>

      <!-- Loading State -->
      <StudentLoadingState
        v-if="status === 'pending' || isRefreshing"
        :message="isRefreshing ? 'Refreshing data...' : 'Loading student data...'"
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

      <!-- Footer with Pagination -->
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
              {{ $t('refresh') }}
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
      <!-- Video modal content goes here -->
    </UModal>
  </div>
</template>

<script setup lang="ts">
// Import utility types
import type { StudentRecord } from '~~/server/utils/db'
import type { ProjectTopicRegistrationData } from '~/components/ProjectTopicRegistration.vue'

// Import shared components
import StudentSearchHeader from '~/components/student/StudentSearchHeader.vue'
import StudentFilters from '~/components/student/StudentFilters.vue'
import TopicStatusBadge from '~/components/student/TopicStatusBadge.vue'
import StudentLoadingState from '~/components/student/StudentLoadingState.vue'
import ErrorState from '~/components/student/ErrorState.vue'
import EmptyStudentState from '~/components/student/EmptyStudentState.vue'
import DocumentsColumn from '~/components/supervisor/DocumentsColumn.vue'
import ReviewerColumn from '~/components/department/ReviewerColumn.vue'
import SupervisorColumn from '~/components/department/SupervisorColumn.vue'

// Import composables
import { useStudentTable } from '~/composables/useStudentTable'
import { useStudentData } from '~/composables/useStudentData'
import { useFilteredStudents } from '~/composables/useFilteredStudents'
import { useTopicManagement } from '~/composables/useTopicManagement'
import { useDocumentHandling } from '~/composables/useDocumentHandling'
import { useTopicStatusUtils } from '~/composables/useTopicStatusUtils'
import { useFormUtilities } from '~/composables/useFormUtilities'
import { useReviewerReports } from '~/composables/useReviewerReports'

// Set page metadata
definePageMeta({
  middleware: 'department-access'
})

// Get required utilities
const { user } = useUserSession()
const { determineFormVariant } = useFormUtilities()
const { getReviewerModalData } = useReviewerReports()
const { t } = useI18n()
const toast = useToast()

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
  isRefreshing,
  resetFilters,
  availableYears,
  yearsLoading
} = useStudentTable()

const {
  allStudents,
  status,
  fetchError,
  refreshStudents,
  activeYear,
  refreshData
} = useStudentData('department')

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
} = useTopicManagement(refreshStudents, 'department_head')

const {
  isFetchingDocument,
  openDocument,
  getFile
} = useDocumentHandling()

const {
  getTopicButtonLabel,
  getTopicStatusColor,
  getTopicStatusIcon
} = useTopicStatusUtils()

// Modal state
const isOpen = ref(false)
const videoObject = ref(null)
const studentObject = ref(null)
const updateCounter = ref(0)

// Send student data to modal
const sendStudentData = (mVideo, mStudent) => {
  isOpen.value = true
  videoObject.value = mVideo
  studentObject.value = mStudent
}

// Define columns for the table
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
    key: 'topic',
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

// Track selected columns (all by default)
const selectedColumns = ref(columns)
const columnsTable = computed(() =>
  columns.filter(column => selectedColumns.value.includes(column))
)
const authStore = useAuthStore()
const hydrated = ref(false)

onMounted(async () => {
  hydrated.value = true
  // Ensure auth is initialized before checking access
  if (!authStore.isInitialized || !authStore.isReady) {
    console.log('Waiting for auth to be ready on page mount...')
    await new Promise((resolve) => {
      const stop = watch(() => authStore.isReady, (ready) => {
        if (ready) {
          stop()
          resolve(undefined)
        }
      })
    })
  }

  // Check department head access again as a safety net
  if (!authStore.hasDepartmentHeadAccess()) {
    console.log('Department head access not detected, refreshing user data...')
    await authStore.refreshUser()

    if (!authStore.hasDepartmentHeadAccess()) {
      console.warn('Still cannot access department head functionality after refresh')
    }
    else {
      console.log('Department head access confirmed after refresh')
    }
  }
})
</script>
