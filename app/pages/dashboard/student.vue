<template>
  <div>
    <div v-if="status === 'pending'">
      <UCard class="p-4 shadow-md">
        <div class="flex justify-center items-center py-12">
          <UIcon
            name="i-heroicons-arrow-path"
            class="animate-spin h-8 w-8 text-primary-500"
          />
          <span class="ml-2">Kraunama...</span>
        </div>
      </UCard>
    </div>
    <div v-else-if="error">
      <UCard class="p-4 shadow-md bg-red-50">
        <p class="text-red-500 font-medium">
          {{ error.message }}
        </p>
        <UButton
          class="mt-4"
          icon="i-heroicons-arrow-path"
          @click="refresh"
        >
          Bandyti dar kartą
        </UButton>
      </UCard>
    </div>

    <UCard
      v-else-if="records?.student"
      class="p-4 shadow-md"
    >
      <template #header>
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-lg font-bold">
              {{ records.student.studentName }} {{ records.student.studentLastname }}
            </h2>
            <p class="text-sm text-gray-500">
              {{ records.student.studentGroup }} - {{ records.student.studyProgram }}
              ({{ records.student.currentYear }})
            </p>
          </div>
        </div>`
      </template>

      <!-- Assignment Section -->
      <div class="mb-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">
            {{ $t('assignment') || 'Baigiamojo darbo užduotis' }}
          </h3>
          <div class="flex items-center gap-2">
            <!-- Topic Registration Button -->
            <ProjectTopicRegistration
              :initial-data="topicData"
              user-role="student"
              :user-name="getUserFullName"
              form-variant="lt"
              :button-label="getTopicButtonLabel"
              @save="handleSaveRegistration"
              @comment="handleComment"
              @status-change="handleStatusChange"
              @mark-read="handleMarkAsRead"
              @success="handleSuccess"
            />
          </div>
        </div>
      </div>
      <UDivider />

      <!-- Documents Section -->
      <div class="mb-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">
            {{ $t('documents') || 'Dokumentai' }}
          </h3>

          <!-- Document Upload Button (for students only) -->
          <div class="flex gap-2">
            <UButton
              v-if="isStudent && !hasFinalDocument"
              icon="i-heroicons-document-text"
              size="sm"
              color="primary"
              @click="openDocumentUploader = true"
            >
              {{ $t('upload_document') || 'Įkelti dokumentą' }}
            </UButton>

            <!-- Source Code Upload Button - ALWAYS VISIBLE for students -->
            <UButton
              v-if="isStudent"
              icon="i-heroicons-code-bracket-square"
              size="sm"
              :color="getSourceCodeDocument() ? 'indigo' : 'primary'"
              :variant="getSourceCodeDocument() ? 'outline' : 'solid'"
              @click="openSourceCodeUploader = true"
            >
              {{ getSourceCodeDocument() ? ($t('update_source_code') || 'Atnaujinti kodą') : ($t('upload_source_code') || 'Įkelti kodą') }}
            </UButton>
          </div>
        </div>

        <!-- Document List -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Final Document Card -->
          <UCard
            v-if="getFinalDocument()"
            class="bg-gray-50"
          >
            <div class="flex items-center">
              <UIcon
                name="i-heroicons-document-text"
                class="h-8 w-8 text-primary-500 mr-3"
              />
              <div class="flex-1">
                <h4 class="font-medium">
                  {{ $t('final_project') || 'Baigiamasis darbas' }}
                </h4>
                <p class="text-xs text-gray-500">
                  {{ formatDate(getFinalDocument().createdDate) }}
                </p>
              </div>
              <UButton
                :loading="isFetchingDocument"
                icon="i-heroicons-eye"
                size="xs"
                color="primary"
                variant="ghost"
                @click="openDocument(getFinalDocument())"
              />
            </div>
          </UCard>

          <!-- Source Code Card -->
          <UCard
            v-if="getSourceCodeDocument()"
            class="bg-gray-50"
          >
            <div class="flex items-center">
              <UIcon
                name="i-heroicons-code-bracket-square"
                class="h-8 w-8 text-indigo-500 mr-3"
              />
              <div class="flex-1">
                <h4 class="font-medium">
                  {{ $t('source_code') || 'Išeities kodas' }}
                </h4>
                <p class="text-xs text-gray-500">
                  {{ formatDate(getSourceCodeDocument().createdDate) }}
                </p>
              </div>
              <div class="flex gap-2">
                <UButton
                  :loading="isFetchingDocument"
                  icon="i-heroicons-arrow-down-tray"
                  size="xs"
                  color="indigo"
                  variant="ghost"
                  :title="$t('download_source_code') || 'Atsisiųsti išeities kodą'"
                  @click="openDocument(getSourceCodeDocument())"
                />
                <UButton
                  v-if="isStudent"
                  icon="i-heroicons-pencil"
                  size="xs"
                  color="indigo"
                  variant="ghost"
                  :title="$t('update_source_code') || 'Atnaujinti išeities kodą'"
                  @click="openSourceCodeUploader = true"
                />
              </div>
            </div>
          </UCard>

          <!-- No Documents Message -->
          <UCard
            v-if="!getFinalDocument() && !getSourceCodeDocument() && !isStudent"
            class="bg-gray-50 border border-dashed border-gray-300"
          >
            <div class="text-center py-4">
              <UIcon
                name="i-heroicons-document-plus"
                class="h-8 w-8 text-gray-400 mx-auto mb-2"
              />
              <p class="text-sm text-gray-600">
                {{ $t('no_documents_uploaded') || 'Nėra įkeltų dokumentų' }}
              </p>
            </div>
          </UCard>
        </div>
      </div>

      <UDivider />

      <!-- Reports Section -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold mb-4">
          {{ $t('reports') || 'Ataskaitos' }}
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Supervisor Report Card -->
          <UCard
            v-if="records.supervisorReports && records.supervisorReports.length > 0"
            class="bg-gray-50"
          >
            <div class="flex items-center">
              <UIcon
                name="i-heroicons-clipboard-document-check"
                class="h-8 w-8 text-green-500 mr-3"
              />
              <div class="flex-1">
                <h4 class="font-medium">
                  {{ $t('supervisor_report') || 'Vadovo ataskaita' }}
                </h4>
                <p class="text-xs text-gray-500">
                  {{ formatDate(records.supervisorReports[0].createdDate) }}
                </p>
              </div>
              <PreviewSupervisorReport
                :document-data="getSupervisorReportData(records.supervisorReports[0])"
                :button-label="$t('view') || 'Peržiūrėti'"
                :form-variant="determineFormVariant(records.student?.studentGroup)"
                :modal-title="$t('supervisor_report') || 'Vadovo ataskaita'"
              />
            </div>
          </UCard>

          <!-- Supervisor Report Not Available -->
          <UCard
            v-else
            class="bg-gray-50 border border-dashed border-gray-300"
          >
            <div class="flex items-center">
              <UIcon
                name="i-heroicons-clipboard-document"
                class="h-8 w-8 text-gray-400 mr-3"
              />
              <div class="flex-1">
                <h4 class="font-medium">
                  {{ $t('supervisor_report') || 'Vadovo ataskaita' }}
                </h4>
                <p class="text-xs text-gray-500">
                  {{ $t('not_available_yet') || 'Dar nepateikta' }}
                </p>
              </div>
              <UButton
                disabled
                icon="i-heroicons-eye"
                size="xs"
                color="gray"
                variant="ghost"
              />
            </div>
          </UCard>

          <!-- Reviewer Report Card -->
          <UCard
            v-if="records.reviewerReports && records.reviewerReports.length > 0"
            class="bg-gray-50"
          >
            <div class="flex items-center">
              <UIcon
                name="i-heroicons-clipboard-document-list"
                class="h-8 w-8 text-orange-500 mr-3"
              />
              <div class="flex-1">
                <h4 class="font-medium">
                  {{ $t('reviewer_report') || 'Recenzento ataskaita' }}
                </h4>
                <p class="text-xs text-gray-500">
                  {{ formatDate(records.reviewerReports[0].createdDate) }}
                </p>
              </div>
              <div v-if="getReviewerModalData(records)">
                <PreviewReviewerReport
                  :review-data="getReviewerModalData(records)"
                  :form-variant="determineFormVariant(records.student?.studentGroup)"
                  :button-label="$t('view') || 'Peržiūrėti'"
                />
              </div>
            </div>
          </UCard>

          <!-- Reviewer Report Not Available -->
          <UCard
            v-else
            class="bg-gray-50 border border-dashed border-gray-300"
          >
            <div class="flex items-center">
              <UIcon
                name="i-heroicons-clipboard-document"
                class="h-8 w-8 text-gray-400 mr-3"
              />
              <div class="flex-1">
                <h4 class="font-medium">
                  {{ $t('reviewer_report') || 'Recenzento ataskaita' }}
                </h4>
                <p class="text-xs text-gray-500">
                  {{ $t('not_available_yet') || 'Dar nepateikta' }}
                </p>
              </div>
              <UButton
                disabled
                icon="i-heroicons-eye"
                size="xs"
                color="gray"
                variant="ghost"
              />
            </div>
          </UCard>
        </div>
      </div>

      <UDivider />

      <!-- Video Section -->
      <div>
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">
            {{ $t('video_presentation') || 'Vaizdo pristatymas' }}
          </h3>

          <!-- Video Upload Button -->
          <UButton
            v-if="isStudent"
            icon="i-heroicons-video-camera"
            size="sm"
            :color="records.videos.length > 0 ? 'orange' : 'primary'"
            :variant="records.videos.length > 0 ? 'outline' : 'solid'"
            @click="openVideoUploader = true"
          >
            {{ records.videos.length > 0 ? ($t('update_video') || 'Atnaujinti vaizdo įrašą') : ($t('upload_video') || 'Įkelti vaizdo įrašą') }}
          </UButton>
        </div>

        <!-- Video Player -->
        <div
          v-if="records.videos.length > 0"
          class="bg-gray-50 rounded-md overflow-hidden"
        >
          <VideoPlayer
            :video-key="records.videos[0].key"
            :content-type="records.videos[0].contentType"
            class="w-full aspect-video"
          />
          <div class="p-3 flex justify-between items-center">
            <div>
              <h4 class="font-medium">
                {{ records.videos[0].filename }}
              </h4>
              <p class="text-xs text-gray-500">
                {{ formatDate(records.videos[0].createdAt) }}
              </p>
            </div>
            <UButton
              v-if="isStudent"
              icon="i-heroicons-pencil"
              size="sm"
              color="orange"
              variant="ghost"
              :title="$t('replace_video') || 'Pakeisti įrašą'"
              @click="openVideoUploader = true"
            >
              {{ $t('replace_video') || 'Pakeisti įrašą' }}
            </UButton>
          </div>
        </div>

        <!-- No Video Message -->
        <div
          v-else
          class="bg-gray-50 p-6 rounded-md border border-dashed border-gray-300 text-center"
        >
          <UIcon
            name="i-heroicons-video-camera"
            class="h-10 w-10 text-gray-400 mx-auto mb-2"
          />
          <p class="text-gray-600">
            {{ $t('no_video_uploaded') || 'Nėra įkelto vaizdo įrašo' }}
          </p>
          <p
            v-if="isStudent"
            class="text-sm text-gray-500 mt-2"
          >
            {{ $t('upload_video_prompt') || 'Įkelkite vaizdo įrašą, kuriame pristatomas jūsų darbas' }}
          </p>

          <div
            v-if="isStudent"
            class="mt-4"
          >
            <VideoUploader
              title="Įkelkite savo programinio kodo paaiškinimo vaizdą"
              @video-uploaded="handleVideoUploadSuccess"
            />
          </div>
        </div>
      </div>

      <!-- Document Upload Modal -->
      <UModal v-model="openDocumentUploader">
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              {{ $t('upload_final_document') || 'Įkelti baigiamąjį darbą' }}
            </h3>
          </template>

          <div class="p-4">
            <p class="mb-4 text-sm text-gray-600">
              {{ $t('upload_document_instructions') || 'Pasirinkite PDF failą su jūsų baigiamuoju darbu' }}
            </p>

            <ZipUploader @document-uploaded="handleDocumentUpload" />
          </div>

          <template #footer>
            <div class="flex justify-end">
              <UButton
                color="gray"
                variant="ghost"
                @click="openDocumentUploader = false"
              >
                {{ $t('cancel') || 'Atšaukti' }}
              </UButton>
            </div>
          </template>
        </UCard>
      </UModal>

      <!-- Source Code Upload Modal -->
      <UModal v-model="openSourceCodeUploader">
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              {{ getSourceCodeDocument() ? ($t('update_source_code') || 'Atnaujinti išeities kodą') : ($t('upload_source_code') || 'Įkelti išeities kodą') }}
            </h3>
          </template>

          <div class="p-4">
            <p class="mb-4 text-sm text-gray-600">
              {{ $t('upload_source_code_instructions') || 'Pasirinkite ZIP failą su jūsų programos išeities kodu' }}
            </p>

            <ZipUploader @zip-uploaded="handleZipUpload" />
          </div>

          <template #footer>
            <div class="flex justify-end">
              <UButton
                color="gray"
                variant="ghost"
                @click="openSourceCodeUploader = false"
              >
                {{ $t('cancel') || 'Atšaukti' }}
              </UButton>
            </div>
          </template>
        </UCard>
      </UModal>

      <!-- Video Upload Modal -->
      <UModal v-model="openVideoUploader">
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              {{ records.videos.length > 0 ? ($t('update_video_presentation') || 'Atnaujinti vaizdo pristatymą') : ($t('upload_video_presentation') || 'Įkelti vaizdo pristatymą') }}
            </h3>
          </template>

          <div class="p-4">
            <p class="mb-4 text-sm text-gray-600">
              {{ records.videos.length > 0
                ? ($t('update_video_instructions') || 'Pasirinkite naują vaizdo įrašą, kuris pakeis dabartinį pristatymą')
                : ($t('upload_video_instructions') || 'Pasirinkite vaizdo įrašą su jūsų darbo pristatymu') }}
            </p>

            <VideoUploader
              :title="records.videos.length > 0 ? 'Atnaujinti vaizdo įrašą' : ''"
              @video-uploaded="handleVideoUploadSuccess"
            />
          </div>

          <template #footer>
            <div class="flex justify-end">
              <UButton
                color="gray"
                variant="ghost"
                @click="openVideoUploader = false"
              >
                {{ $t('cancel') || 'Atšaukti' }}
              </UButton>
            </div>
          </template>
        </UCard>
      </UModal>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ZipUploader from '~/components/ZipUploader.vue'
import PreviewSupervisorReport from '~/components/PreviewSupervisorReport.vue'
import PreviewReviewerReport from '~/components/PreviewReviewerReport.vue'
import VideoUploader from '~/components/VideoUploader.vue'
import VideoPlayer from '~/components/VideoPlayer.vue'
import type { DocumentRecord, ReviewerReport, StudentRecord, VideoRecord, SupervisorReport } from '~~/server/utils/db'
import { useUnixDateUtils } from '~/composables/useUnixDateUtils'
import { useFormUtilities } from '~/composables/useFormUtilities'
import { useReviewerReports } from '~/composables/useReviewerReports'
import { useAuthStore } from '~/stores/auth'
import { useProjectTopic } from '~/composables/useProjectTopic'
import type {
  ProjectTopicRegistrationFormData,
  ProjectTopicRegistrationData,
  TopicComment
} from '~/components/ProjectTopicRegistration.vue'

definePageMeta({
  middleware: ['student-access']
})

// UI state
const openDocumentUploader = ref(false)
const openVideoUploader = ref(false)
const openSourceCodeUploader = ref(false)
const isFetchingDocument = ref(false)
const isSubmitting = ref(false)
const notificationMessage = ref('')
const showNotification = ref(false)

const { t } = useI18n()

// User role state
const userStore = useAuthStore()
const isStudent = computed(() => userStore.isStudent)
// const isSupervisor = computed(() => userStore.isTeacher)

// Utility composables
const { formatUnixDate, formatUnixDateTime } = useUnixDateUtils()
const { determineFormVariant } = useFormUtilities()
const { getReviewerModalData } = useReviewerReports()

// Fetch student data
interface StudentRecordsResponse {
  student: StudentRecord
  documents: DocumentRecord[]
  videos: VideoRecord[]
  supervisorReports: SupervisorReport[]
  reviewerReports: ReviewerReport[]
  assignment?: {
    id: number
    title: string
    titleEn: string
    objective: string
    supervisor: string
    isSigned: number
    assignmentDate: number
    lastUpdated: number
    status: string
  }
}

const { data: records, refresh, status } = useFetch<StudentRecordsResponse>('/api/students/get-documents')

// Get user's full name from records
const getUserFullName = computed(() => {
  if (!records.value?.student) return 'Student'
  return `${records.value.student.studentName} ${records.value.student.studentLastname}`
})

// Get button label based on topic status
const getTopicButtonLabel = computed(() => {
  if (!topicData.value || !topicData.value.status || topicData.value.status === 'draft') {
    return t('register_topic') || 'Registruoti temą'
  }
  return t('edit_topic') || 'Redaguoti temą'
})

// Topic data for student
const {
  isLoading,
  error,
  topicData,
  fetchTopicRegistration,
  saveTopicRegistration,
  addComment,
  changeStatus,
  markCommentAsRead
} = useProjectTopic()

// Initialize topic data for student
const initializeTopicData = () => {
  if (!records.value?.student) return

  const student = records.value.student

  if (!topicData.value) {
    // Create initial topic data object with student information
    topicData.value = {
      studentRecordId: student.id,
      GROUP: student.studentGroup || '',
      NAME: `${student.studentName} ${student.studentLastname}`,
      TITLE: '',
      TITLE_EN: '',
      PROBLEM: '',
      OBJECTIVE: '',
      TASKS: '',
      COMPLETION_DATE: null,
      SUPERVISOR: '',
      IS_REGISTERED: 0,
      status: 'draft',
      comments: []
    }
  }
}

// Handler for saving topic registration
const handleSaveRegistration = async (data: ProjectTopicRegistrationFormData) => {
  isSubmitting.value = true

  try {
    // Make sure we have the studentRecordId
    if (!records.value?.student) {
      throw new Error('Student record not found')
    }

    // Create or update topic based on whether we have an id
    await saveTopicRegistration({
      ...data,
      // Merge with student ID
      studentRecordId: records.value.student.id
    })

    // Refresh topic data after save
    await fetchTopicRegistration(records.value.student.id)

    // Show success message
    useToast().add({
      title: t('success') || 'Sėkmingai',
      description: t('topic_saved_success') || 'Tema sėkmingai išsaugota',
      color: 'green'
    })
  }
  catch (err: any) {
    console.error('Error saving topic:', err)

    // Show error message
    useToast().add({
      title: t('error') || 'Klaida',
      description: err.message || (t('topic_save_error') || 'Nepavyko išsaugoti temos'),
      color: 'red'
    })
  }
  finally {
    isSubmitting.value = false
  }
}

// Handler for comments
const handleComment = async (comment: TopicComment) => {
  try {
    await addComment(comment)

    // Refresh data
    await fetchTopicRegistration(records.value?.student.id)

    // Show success message
    useToast().add({
      title: t('success') || 'Sėkmingai',
      description: t('comment_added') || 'Komentaras pridėtas',
      color: 'green'
    })
  }
  catch (err: any) {
    console.error('Error adding comment:', err)

    // Show error message
    useToast().add({
      title: t('error') || 'Klaida',
      description: err.message || (t('comment_error') || 'Nepavyko pridėti komentaro'),
      color: 'red'
    })
  }
}

// Handler for status changes
const handleStatusChange = async (status: string) => {
  try {
    await changeStatus(status)

    // Refresh data
    await fetchTopicRegistration(records.value?.student.id)

    // Show success message
    useToast().add({
      title: t('success') || 'Sėkmingai',
      description: t('status_updated') || 'Būsena atnaujinta',
      color: 'green'
    })
  }
  catch (err: any) {
    console.error('Error changing status:', err)

    // Show error message
    useToast().add({
      title: t('error') || 'Klaida',
      description: err.message || (t('status_update_error') || 'Nepavyko atnaujinti būsenos'),
      color: 'red'
    })
  }
}

// Handler for marking comments as read
const handleMarkAsRead = async (commentId: number) => {
  try {
    await markCommentAsRead(commentId)
  }
  catch (err: any) {
    console.error('Error marking comment as read:', err)
  }
}

// Handler for success
const handleSuccess = async () => {
  // Refresh data after any success
  if (records.value?.student) {
    await fetchTopicRegistration(records.value.student.id)
  }
}

// Document helpers
const getFinalDocument = () => {
  if (!records.value?.documents) return null
  return records.value.documents.find(doc => doc.documentType === 'PDF')
}

const getSourceCodeDocument = () => {
  if (!records.value?.documents) return null
  return records.value.documents.find(doc => doc.documentType === 'ZIP')
}

const hasFinalDocument = computed(() => !!getFinalDocument())

// Utility functions
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A'
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

// Get supervisor report data for preview component
const getSupervisorReportData = (report: SupervisorReport) => {
  const student = records.value?.student

  if (!student || !report) return null

  return {
    // Data from main student record
    NAME: `${student.studentName} ${student.studentLastname}`,
    PROGRAM: student.studyProgram || 'N/A',
    CODE: student.programCode || 'N/A',
    TITLE: student.finalProjectTitle || 'N/A',
    DEPT: student.department || 'Elektronikos ir informatikos fakultetas',
    WORK: report.supervisorWorkplace || 'Vilniaus kolegija Elektronikos ir informatikos fakultetas',
    // Data specific to THIS report
    EXPL: report.supervisorComments || '',
    OM: report.otherMatch || 0,
    SSM: report.oneMatch || 0,
    STUM: report.ownMatch || 0,
    JM: report.joinMatch || 0,
    createdDate: formatUnixDateTime(report.createdDate),
    PASS: report.isPassOrFailed || 1,
    // Supervisor details
    SUPER: report.supervisorName || 'N/A Supervisor',
    POS: report.supervisorPosition || 'N/A Position',
    DATE: formatUnixDate(report.createdDate)
  }
}

const handleDocumentUpload = async () => {
  console.log('Document uploaded successfully')
  openDocumentUploader.value = false
  await refresh()

  // Show success notification
  useToast().add({
    title: t('success') || 'Sėkmingai',
    description: t('document_uploaded_success') || 'Dokumentas sėkmingai įkeltas',
    color: 'green'
  })
}

const handleZipUpload = async () => {
  console.log('ZIP file uploaded successfully')
  openSourceCodeUploader.value = false
  await refresh()

  // Show success notification
  useToast().add({
    title: t('success') || 'Sėkmingai',
    description: getSourceCodeDocument()
      ? (t('source_code_updated_success') || 'Išeities kodas sėkmingai atnaujintas')
      : (t('source_code_uploaded_success') || 'Išeities kodas sėkmingai įkeltas'),
    color: 'green'
  })
}

const handleVideoUploadSuccess = async (result) => {
  console.log('Video uploaded successfully:', result)
  openVideoUploader.value = false
  await refresh()

  // Show success notification
  useToast().add({
    title: t('success') || 'Sėkmingai',
    description: records.value?.videos.length > 0
      ? (t('video_updated_success') || 'Vaizdo įrašas sėkmingai atnaujintas')
      : (t('video_uploaded_success') || 'Vaizdo įrašas sėkmingai įkeltas'),
    color: 'green'
  })
}

// File handling
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

// Initialization and lifecycle hooks
onMounted(async () => {
  // For production use, uncomment these lines:
  // isStudent.value = userStore.isStudent
  // isSupervisor.value = userStore.isTeacher

  // Wait for records to be loaded
  if (records.value?.student) {
    try {
      // Try to fetch the existing topic registration
      await fetchTopicRegistration(records.value.student.id)

      // If no topic was found, initialize with default values
      if (!topicData.value) {
        initializeTopicData()
      }
    }
    catch (err) {
      console.error('Error fetching topic registration:', err)
      // Initialize with default values if fetch fails
      initializeTopicData()
    }
  }
})

// Watch for records changes to initialize topic data
watch(() => records.value?.student, async (newVal) => {
  if (newVal) {
    try {
      // Try to fetch existing topic registration
      await fetchTopicRegistration(newVal.id)

      // If no topic found, initialize default data
      if (!topicData.value) {
        initializeTopicData()
      }
    }
    catch (err) {
      console.error('Error fetching topic registration:', err)
      // Initialize default data if fetch fails
      initializeTopicData()
    }
  }
})
</script>
