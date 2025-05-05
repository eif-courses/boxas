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
          <UBadge
            v-if="assignmentData?.status"
            :color="getStatusColor(assignmentData.status)"
            variant="soft"
            class="text-xs"
          >
            {{ getStatusLabel(assignmentData.status) }}
          </UBadge>
        </div>
      </template>

      <!-- Assignment Section -->
      <div class="mb-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">
            {{ $t('assignment') || 'Baigiamojo darbo užduotis' }}
          </h3>
          <div class="flex items-center gap-2">
            <!-- New Project Assignment Button -->
            <UButton
              icon="i-heroicons-document-text"
              :color="hasProjectAssignment ? 'primary' : 'gray'"
              @click="openProjectAssignment"
            >
              {{ hasProjectAssignment ? ($t('edit_project_assignment') || 'Redaguoti užduotį') : ($t('create_project_assignment') || 'Sukurti užduotį') }}
            </UButton>

            <StudentProjectForm
              ref="projectForm"
              :student-record-id="records.student.id"
              :form-variant="determineFormVariant(records.student?.studentGroup)"
              :student-name="records.student?.studentName + ' ' + records.student?.studentLastname"
              :student-group="records.student?.studentGroup"
              :button-color="assignmentData?.status === 'revision_requested' ? 'warning'
                : assignmentData?.status === 'submitted' && isSupervisor ? 'warning'
                  : !assignmentData ? 'primary' : 'white'"
              :button-icon="!assignmentData ? 'i-heroicons-document-plus'
                : assignmentData?.status === 'revision_requested' ? 'i-heroicons-pencil'
                  : assignmentData?.status === 'submitted' && isSupervisor ? 'i-heroicons-clipboard-document-check'
                    : 'i-heroicons-document-text'"
              :button-label="!assignmentData ? (isStudent ? $t('create_assignment') || 'Sukurti užduotį' : $t('view_assignment') || 'Peržiūrėti užduotį')
                : assignmentData?.status === 'revision_requested' ? $t('update_assignment') || 'Atnaujinti užduotį'
                  : assignmentData?.status === 'submitted' && isSupervisor ? $t('review_assignment') || 'Peržiūrėti užduotį'
                    : $t('view_assignment') || 'Peržiūrėti užduotį'"
              @updated="handleAssignmentUpdated"
              @approved="handleAssignmentApproved"
            />
          </div>
        </div>

        <!-- Assignment Summary Card (if available) -->
        <div
          v-if="assignmentData"
          class="bg-gray-50 p-4 rounded-md border border-gray-200"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">
                {{ $t('project_title') || 'Baigiamojo darbo tema' }}:
              </p>
              <p class="font-medium">
                {{ assignmentData.title || 'N/A' }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-600">
                {{ $t('supervisor') || 'Vadovas' }}:
              </p>
              <p class="font-medium">
                {{ assignmentData.supervisor || 'N/A' }}
              </p>
            </div>
          </div>

          <div class="mt-3">
            <p class="text-sm text-gray-600">
              {{ $t('project_objective') || 'Darbo tikslas' }}:
            </p>
            <p class="text-sm mt-1">
              {{ truncateText(assignmentData.objective, 150) }}
            </p>
          </div>

          <div class="mt-3 text-xs text-gray-500 flex justify-between">
            <span>{{ $t('last_updated') || 'Paskutinį kartą atnaujinta' }}: {{ formatDate(assignmentData.lastUpdated) }}</span>
            <span
              v-if="assignmentData.status === 'approved'"
              class="flex items-center text-green-600"
            >
              <UIcon
                name="i-heroicons-check-circle"
                class="w-4 h-4 mr-1"
              />
              {{ $t('approved') || 'Patvirtinta' }}
            </span>
          </div>
        </div>

        <!-- No Assignment Message with Direct Create Button -->
        <div
          v-else
          class="bg-gray-50 p-4 rounded-md border border-gray-200 text-center"
        >
          <p class="text-gray-600">
            {{ $t('no_assignment_yet') || 'Užduotis dar nesukurta' }}
          </p>
          <div
            v-if="isStudent"
            class="mt-4"
          >
            <p class="text-sm text-gray-500 mb-3">
              {{ $t('create_assignment_prompt') || 'Sukurkite užduotį paspausdami mygtuką žemiau' }}
            </p>
            <UButton
              color="primary"
              icon="i-heroicons-document-plus"
              @click="startCreateAssignment"
            >
              {{ $t('create_assignment') || 'Sukurti užduotį' }}
            </UButton>
          </div>
        </div>
      </div>
      <UDivider />

      <!-- Documents Section - UPDATED for better UX -->
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

      <!-- Video Section - UPDATED for better UX -->
      <div>
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">
            {{ $t('video_presentation') || 'Vaizdo pristatymas' }}
          </h3>

          <!-- Video Upload Button - ALWAYS VISIBLE for students -->
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

      <!-- Source Code Upload Modal - NEW -->
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

      <!-- Project Assignment Modal -->
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
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import ZipUploader from '~/components/ZipUploader.vue'
import ProjectAssignmentForm from '~/components/ProjectAssignmentForm.vue'
import PreviewSupervisorReport from '~/components/PreviewSupervisorReport.vue'
import PreviewReviewerReport from '~/components/PreviewReviewerReport.vue'
import VideoUploader from '~/components/VideoUploader.vue'
import VideoPlayer from '~/components/VideoPlayer.vue'
import type { DocumentRecord, ReviewerReport, StudentRecord, VideoRecord, SupervisorReport } from '~~/server/utils/db'
import { useUnixDateUtils } from '~/composables/useUnixDateUtils'
import { useFormUtilities } from '~/composables/useFormUtilities'
import { useReviewerReports } from '~/composables/useReviewerReports'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: ['student-access']
})

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

// User role state
const userStore = useAuthStore()
const isStudent = ref(true) // For production, use: computed(() => userStore.isStudent)
const isSupervisor = ref(false) // For production, use: computed(() => userStore.isTeacher)

// UI state
const openDocumentUploader = ref(false)
const openVideoUploader = ref(false)
const openSourceCodeUploader = ref(false) // New ref for source code uploader
const isFetchingDocument = ref(false)

// Project Assignment state
const showProjectAssignmentModal = ref(false)
const projectAssignmentId = ref(null)
const hasProjectAssignment = ref(false)

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

const { data: records, error, refresh, status } = useFetch<StudentRecordsResponse>('/api/students/get-documents')

// Assignment data
const assignmentData = ref(null)

// Fetch assignment data
const fetchAssignmentData = async () => {
  try {
    if (!records.value?.student?.id) return

    const response = await fetch(`/api/assignments/${records.value.student.id}/summary`)
    if (response.ok) {
      const data = await response.json()
      assignmentData.value = data.assignment || null

      // Check if we have a project assignment
      await checkProjectAssignment()
    }
  }
  catch (error) {
    console.error('Error fetching assignment data:', error)
  }
}

// Check if we have a project assignment
const checkProjectAssignment = async () => {
  try {
    if (!records.value?.student?.id) return

    // This would be your endpoint to check for project assignment
    const response = await fetch(`/api/projectAssignments/check/${records.value.student.id}`)
    if (response.ok) {
      const data = await response.json()
      if (data && data.exists) {
        hasProjectAssignment.value = true
        projectAssignmentId.value = data.id
      }
      else {
        hasProjectAssignment.value = false
        projectAssignmentId.value = null
      }
    }
  }
  catch (error) {
    console.error('Error checking project assignment:', error)
    hasProjectAssignment.value = false
  }
}

// Open project assignment modal
const openProjectAssignment = async () => {
  if (!hasProjectAssignment.value) {
    // Create a new assignment
    try {
      const response = await fetch('/api/projectAssignments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentRecordId: records.value?.student?.id,
          studentGroup: records.value?.student?.studentGroup
        })
      })

      if (response.ok) {
        const data = await response.json()
        projectAssignmentId.value = data.id
        hasProjectAssignment.value = true
      }
    }
    catch (error) {
      console.error('Error creating project assignment:', error)
      return
    }
  }

  showProjectAssignmentModal.value = true
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

const truncateText = (text, maxLength) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Assignment event handlers
const handleAssignmentUpdated = async () => {
  await fetchAssignmentData()
  await refresh() // Refresh the main data
}

const handleAssignmentApproved = async () => {
  await fetchAssignmentData()
  await refresh() // Refresh the main data

  // Show success notification if available
  useToast().add({
    title: t('success') || 'Sėkmingai',
    description: t('assignment_approved_success') || 'Užduotis sėkmingai patvirtinta',
    color: 'green'
  })
}

// Project Assignment event handlers
const handleProjectAssignmentSaved = async () => {
  useToast().add({
    title: t('success') || 'Sėkmingai',
    description: t('project_assignment_saved') || 'Užduotis sėkmingai išsaugota',
    color: 'green'
  })
  await fetchAssignmentData()
}

const handleProjectAssignmentSubmitted = async () => {
  useToast().add({
    title: t('success') || 'Sėkmingai',
    description: t('project_assignment_submitted') || 'Užduotis sėkmingai pateikta vadovui',
    color: 'green'
  })
  showProjectAssignmentModal.value = false
  await fetchAssignmentData()
}

const projectForm = ref(null)

// Method to programmatically start assignment creation
const startCreateAssignment = () => {
  if (projectForm.value) {
    projectForm.value.openModal()
    projectForm.value.createNewAssignment()
  }
}

const getStatusColor = (status) => {
  switch (status) {
    case 'draft': return 'gray'
    case 'submitted': return 'blue'
    case 'revision_requested': return 'yellow'
    case 'approved': return 'green'
    default: return 'gray'
  }
}

const getStatusLabel = (status) => {
  switch (status) {
    case 'draft':
      return t('draft') || 'Juodraštis'
    case 'submitted':
      return t('submitted') || 'Pateikta'
    case 'revision_requested':
      return t('revision_requested') || 'Reikia taisyti'
    case 'approved':
      return t('approved') || 'Patvirtinta'
    default:
      return ''
  }
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
    description: records.videos.length > 0
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

// Function to create a new project assignment if needed
const createProjectAssignment = async () => {
  if (!records.value?.student?.id) return null

  try {
    const response = await fetch('/api/projectAssignments/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        studentRecordId: records.value.student.id,
        studentGroup: records.value.student.studentGroup
      })
    })

    if (response.ok) {
      const data = await response.json()
      return data.id
    }
    else {
      console.error('Failed to create project assignment')
      return null
    }
  }
  catch (error) {
    console.error('Error creating project assignment:', error)
    return null
  }
}

// Fetch assignment data when component mounts
onMounted(async () => {
  // For production use, uncomment these lines:
  // isStudent.value = userStore.isStudent
  // isSupervisor.value = userStore.isTeacher

  if (records.value?.student) {
    await fetchAssignmentData()
  }
})

// Watch for records changes to fetch assignment data
watch(() => records.value?.student, async (newVal) => {
  if (newVal) {
    await fetchAssignmentData()
  }
})
</script>
