<template>
  <div>
    <div v-if="status === 'pending'">
      Loading...
    </div>
    <div v-else-if="error">
      <p class="text-red-500">
        {{ error.message }}
      </p>
    </div>

    <UCard
      v-else-if="records?.student"
      class="p-4 shadow-md"
    >
      <EditAssignmentReportForm
        :initial-data="initialAssignmentData"
        form-variant="lt"
        @save="handleSave"
        @success="handleSuccess"
      />

      <PreviewAssignmentReport
        :student-record-id="2"
        form-variant="lt"
        button-label="View Assignment"
      />

      <template #header>
        <h2 class="text-lg font-bold">
          {{ records.student.studentName }} {{ records.student.studentLastname }}
        </h2>
        <p class="text-sm text-gray-500">
          {{ records.student.studentGroup }} - {{ records.student.studyProgram }}
          ({{ records.student.currentYear }})
        </p>
      </template>

      <h3 class="text-lg font-semibold">
        Dokumentai
      </h3>
      <div class="flex gap-2 flex-wrap">
        <template v-if="records.documents.length > 0">
          <template
            v-for="doc in records.documents"
            :key="doc.id"
          >
            <UButton
              v-if="doc.documentType === 'PDF'"
              :loading="isFetchingDocument"
              icon="i-heroicons-document-text"
              size="sm"
              color="white"
              variant="solid"
              :label="$t('final_project')"
              @click="openDocument(doc)"
            />

            <UButton
              v-else-if="doc.documentType === 'ZIP'"
              :loading="isFetchingDocument"
              icon="i-heroicons-code-bracket-square"
              size="sm"
              color="white"
              variant="solid"
              :label="$t('source_code')"
              @click="openDocument(doc)"
            />
          </template>
          <div
            v-if="records && records.supervisorReports && records.supervisorReports.length > 0"
            class="space-y-4"
          >
            <template
              v-for="report in records.supervisorReports"
              :key="report.id"
            >
              <div>
                <PreviewSupervisorReport
                  :document-data="{
                    // --- Data from main student record ---
                    // Adjust field names based on your actual student interface
                    NAME: records.student?.studentName +' '+records.student?.studentLastname,
                    PROGRAM: records.student?.studyProgram ?? 'N/A',
                    CODE: records.student?.programCode ?? 'N/A',
                    TITLE: records.student?.finalProjectTitle ?? 'N/A', // Example: maybe title is thesisTitle
                    DEPT: records.student?.department ?? 'Elektronikos ir informatikos fakultetas', // Provide default or get from student
                    WORK: report.supervisorWorkplace ?? 'Vilniaus kolegija Elektronikos ir informatikos fakultetas',
                    // --- Data specific to THIS report ---
                    EXPL: report.supervisorComments ?? '', // Use comments as EXPL
                    OM: report.otherMatch ?? 0,
                    SSM: report.oneMatch ?? 0,
                    STUM: report.ownMatch ?? 0,
                    JM: report.joinMatch ?? 0,
                    createdDate: formatUnixDateTime(report.createdDate), // Format the timestamp for the component
                    PASS: report.isPassOrFailed ?? 1,
                    // --- Data that might need specific logic ---
                    // Assuming supervisor details might be on student or fetched/known elsewhere
                    SUPER: report.supervisorName ?? 'N/A Supervisor',
                    POS: report.supervisorPosition ?? 'N/A Position',
                    // Use the report's creation date, formatted, for the main 'DATE' field
                    DATE: formatUnixDate(report.createdDate)
                  }"
                  :button-label="$t('preview_supervisor_report')"
                  :form-variant="determineFormVariant(records.student?.studentGroup)"
                  :modal-title="$t('supervisor_report')"
                />
              </div>
            </template>
          </div>
          <template v-else>
            <UButton
              disabled
              icon="i-heroicons-document-text"
              size="sm"
              color="white"
              variant="solid"
              :label="$t('supervisor_report_not_ready')"
            />
          </template>

          <template v-if="records.reviewerReports.length > 0">
            <template
              v-for="report in records.reviewerReports"
              :key="report.id"
            >
              <div v-if="getReviewerModalData(records)">
                <PreviewReviewerReport
                  :review-data="getReviewerModalData(records)"
                  :form-variant="determineFormVariant(records.student?.studentGroup)"
                  button-label="Peržiūrėti Recenziją"
                />
              </div>
            </template>
          </template>
          <template v-else>
            <UButton
              disabled
              icon="i-heroicons-document-text"
              size="sm"
              color="white"
              variant="solid"
              :label="$t('reviewer_report_not_ready')"
            />
          </template>
        </template>
        <p
          v-if="isFetchingDocument"
          class="text-gray-500"
        >
          Dokumentas kraunamas...
        </p>
      </div>

      <UDivider class="my-4" />

      <h3 class="text-lg font-semibold">
        Vaizdo įrašas
      </h3>
      <div v-if="records.videos.length > 0">
        <div
          v-if="videos.length > 0"
          class="videos-list"
        >
          <div
            v-for="video in videos"
            :key="video.id"
            class="video-item"
          >
            <VideoPlayer
              :video-key="video.key"
              :content-type="video.contentType"
              class="video-player"
            />
            <div class="video-info">
              <h3>{{ video.filename }}</h3>
              <p>Uploaded: {{ formatDate(video.createdAt) }}</p>
            </div>
          </div>
        </div>

        <!--        <UButton -->
        <!--          icon="i-heroicons-video-camera" -->
        <!--          size="sm" -->
        <!--          color="white" -->
        <!--          variant="solid" -->
        <!--          label="Peržiūrėti vaizdo įrašą" -->
        <!--          @click="sendStudentData(records?.videos[0], records.student)" -->
        <!--        /> -->
      </div>
      <div v-else>
        <VideoUploader
          title="Įkelkite savo programinio kodo paaiškinimo vaizdą"
          @video-uploaded="handleVideoUploadSuccess"
        />
      </div>

      <div v-if="records.documents.length === 0 || records.documents.every(doc => doc.documentType !== 'ZIP')">
        <ZipUploader @zip-uploaded="handleZipUpload" />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import ZipUploader from '~/components/ZipUploader.vue'
import type { DocumentRecord, ReviewerReport, StudentRecord, VideoRecord } from '~~/server/utils/db'
import { useUnixDateUtils } from '~/composables/useUnixDateUtils'
import { useFormUtilities } from '~/composables/useFormUtilities'

definePageMeta({
  middleware: ['student-access']
})

const initialAssignmentData = {
  studentRecordId: 2,
  GROUP: 'PI21A',
  NAME: 'Student Name',
  // Optional initial values
  TITLE: 'Existing title if editing'
  // ...other fields
}

const handleSave = (data) => {
  // Do anything with the form data before it's sent to API
  console.log('Form data:', data)
}

const handleSuccess = () => {
  // Refresh other components or show notification
  // toast.success('Assignment saved successfully')
  // refreshData()
}

const isLoading = ref(true)
const page = ref(null)
const pageCount = ref(null)
const pdfSource = ref('https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf')
const showAllPages = ref(true)

const isOpen = ref(false)
const { formatUnixDate, formatUnixDateTime } = useUnixDateUtils()

// --- Reactive Data Object ---
// This would typically come from an API call or props
const documentData = ref({
  DEPT: 'Informacinių Sistemų Katedra',
  PROGRAM: 'Programų Sistemos',
  CODE: '6531EX001',
  NAME: 'Vardenis Pavardenis',
  TITLE: 'Interaktyvios Web Aplikacijos Kūrimas su Nuxt 3',
  EXPL: 'Studentas pademonstravo puikias analitines bei programavimo žinias. Darbas atitinka visus reikalavimus, teorinė dalis išsami, praktinė dalis veikianti ir inovatyvi.',
  OM: 5.2,
  SSM: 1.8,
  STUM: 0.5,
  JM: 0,
  SUPER: 'Doc. Dr. Jonas Jonaitis',
  POS: 'Docentas',
  DATE: new Date().toLocaleDateString('lt-LT') // Format date for Lithuanian locale
})

// Watch for changes to showAllPages
watch(showAllPages, () => {
  page.value = showAllPages.value ? null : 1
})

// Event handlers
const handleDocumentLoad = ({ numPages }) => {
  pageCount.value = numPages
}

const handleDocumentRender = () => {
  isLoading.value = false
}

const handlePasswordRequest = ({ callback, isWrongPassword }) => {
  callback(prompt(
    isWrongPassword ? 'Enter password again' : 'Enter password'
  ))
}

// const isOpen = ref(false)
// const videoObject = ref<VideoRecord | null>(null)
// const studentObject = ref<StudentRecord | null>(null)
const isFetchingDocument = ref(false)
// const hasVideos = ref(false)

const videos = ref([])
const isUploading = ref(false)
const selectedFile = ref(null)

// Format dates
const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

// Handle file selection
const handleFileChange = (event) => {
  selectedFile.value = event.target.files[0]
}

// Upload video
async function uploadVideo() {
  try {
    // Step 1: Get pre-signed URLs
    const response = await fetch('/api/students/videos/get-upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename: selectedFile.value.name,
        contentType: selectedFile.value.type
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to get upload URL: ${response.status}`)
    }

    const { data } = await response.json()
    const { uploadUrl, viewUrl, key } = data

    // Step 2: Upload directly to R2 using pre-signed URL
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: selectedFile.value,
      headers: {
        'Content-Type': selectedFile.value.type
      }
    })

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`)
    }

    // Step 3: Register the successful upload
    const registerResponse = await fetch('/api/students/videos/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key,
        filename: selectedFile.value.name,
        contentType: selectedFile.value.type,
        size: selectedFile.value.size,
        url: viewUrl
      })
    })

    if (!registerResponse.ok) {
      throw new Error(`Failed to register upload: ${registerResponse.status}`)
    }

    // Handle success
    const result = await registerResponse.json()
    console.log('Upload completed successfully:', result)

    // Do something with the result...
  }
  catch (error) {
    console.error('Error during upload process:', error)
    // Handle error...
  }
}

// Fetch videos for the current user
const fetchVideos = async () => {
  try {
    const response = await fetch('/api/students/videos/list')

    if (!response.ok) {
      throw new Error('Failed to fetch videos')
    }

    const result = await response.json()
    videos.value = result.videos || []
  }
  catch (error) {
    console.error('Error fetching videos:', error)
  }
}
const { determineFormVariant } = useFormUtilities()
// Fetch videos on component mount
onMounted(() => {
  fetchVideos()
})

// const sendStudentData = (mVideo: Video, mStudent: StudentRecord) => {
//   isOpen.value = true
//   videoObject.value = mVideo
//   studentObject.value = mStudent
// }

// definePageMeta({ middleware: 'auth' })

// Define the structure of the complete API response
interface StudentRecordsResponse {
  student: StudentRecord
  documents: DocumentRecord[]
  videos: VideoRecord[]
  supervisorReports: SupervisorReport[]
  reviewerReports: ReviewerReport[]
}

const { data: records, error, refresh, status } = useFetch<StudentRecordsResponse>('/api/students/get-documents')

// const { data: records, error, pending } = await useFetch<StudentRecordsResponse>('/api/students/get-documents')

// Initialize a reactive variable for the student record
// const studentRecord = computed(() => records.value?.studentRecord || {})

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

const reportObjInModal = ref()

const openSupervisorReport = async (report: SupervisorReport) => {
  reportObjInModal.value = report
  isOpen.value = true

  // TODO NEED TO IMPLEMENT
  console.log(report)
}
const openReviewerReport = async (report: ReviewerReport) => {
  // TODO NEED TO IMPLEMENT
  console.log(report)
}
const handleZipUpload = async () => {
  console.log('ZIP file uploaded successfully.')
  await refresh()
}

const openModalWithData = (report: SupervisorReport) => {
  // In a real app, you might fetch/receive data here and update documentData.value
  // For this example, we'll just use the predefined data
  // documentData.value = { ...data }; // Uncomment and adapt if fetching data
  reportObjInModal.value = report
  isOpen.value = true
}
const handleVideoUploadSuccess = async (result) => {
  console.log('Video uploaded successfully:', result)
  // Refresh the student data to show the new video
  await refresh()
  // Refresh the videos list
  await fetchVideos()
}
const { getReviewerModalData } = useReviewerReports()
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  padding: 16px;
  box-shadow: 0 2px 8px 4px rgba(0, 0, 0, 0.1);
  background-color: #555;
  color: #ddd;
}

.app-header > * {
  display: flex;
  align-items: center;
  gap: 4px;
}

.app-content {
  padding: 24px 16px;
}

.vue-pdf-embed {
  margin: 0 auto;
}

.vue-pdf-embed__page {
  margin-bottom: 8px;
  box-shadow: 0 2px 8px 4px rgba(0, 0, 0, 0.1);
}

pre {
  line-height: 1.6;
}
</style>
