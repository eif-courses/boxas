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
      v-else-if="records?.studentRecord"
      class="p-4 shadow-md"
    >
      <template #header>
        <h2 class="text-lg font-bold">
          {{ records.studentRecord.studentName }} {{ records.studentRecord.studentLastname }}
        </h2>
        <p class="text-sm text-gray-500">
          {{ records.studentRecord.studentGroup }} - {{ records.studentRecord.studyProgram }} ({{ records.studentRecord.currentYear }})
        </p>
      </template>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <p><strong>Vadovas:</strong> {{ records.studentRecord.supervisorEmail }}</p>
          <p><strong>Recenzentas:</strong> {{ records.studentRecord.reviewerEmail }}</p>
        </div>
      </div>

      <UDivider class="my-4" />

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
                    // Adjust field names based on your actual StudentRecord interface
                    NAME: records.studentRecord?.studentName +' '+records.studentRecord?.studentLastname,
                    PROGRAM: records.studentRecord?.studyProgram ?? 'N/A',
                    CODE: records.studentRecord?.programCode ?? 'N/A',
                    TITLE: records.studentRecord?.finalProjectTitle ?? 'N/A', // Example: maybe title is thesisTitle
                    DEPT: records.studentRecord?.department ?? 'Elektronikos ir informatikos fakultetas', // Provide default or get from studentRecord
                    WORK: report.supervisorWorkplace ?? 'Vilniaus kolegija Elektronikos ir informatikos fakultetas',
                    // --- Data specific to THIS report ---
                    EXPL: report.supervisorComments ?? '', // Use comments as EXPL
                    OM: report.otherMatch ?? 0,
                    SSM: report.oneMatch ?? 0,
                    STUM: report.ownMatch ?? 0,
                    JM: report.joinMatch ?? 0,
                    createdDate: formatUnixDateTime(report.createdDate), // Format the timestamp for the component

                    // --- Data that might need specific logic ---
                    // Assuming supervisor details might be on studentRecord or fetched/known elsewhere
                    SUPER: report.supervisorName ?? 'N/A Supervisor',
                    POS: report.supervisorPosition ?? 'N/A Position',
                    // Use the report's creation date, formatted, for the main 'DATE' field
                    DATE: formatUnixDate(report.createdDate)
                  }"
                  :button-label="$t('preview_supervisor_report')"
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
              <UButton
                :loading="isFetchingDocument"
                icon="i-heroicons-document-text"
                size="sm"
                color="white"
                variant="solid"
                :label="$t('reviewer_report')"
                @click="openReviewerReport(report)"
              />
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
        <!--          @click="sendStudentData(records?.videos[0], records.studentRecord)" -->
        <!--        /> -->
      </div>
      <div v-else>
        <UCard>
          <template #header>
            <h1>Įkelkite savo programinio kodo paaiškinimo vaizdą</h1>
          </template>
          <div class="upload-section">
            <form
              enctype="multipart/form-data"
              @submit.prevent="uploadVideo"
            >
              <div class="file-input">
                <label for="video-file">Select Video File</label>
                <input
                  id="video-file"
                  type="file"
                  accept="video/*"
                  required
                  @change="handleFileChange"
                >
              </div>
              <button
                type="submit"
                :disabled="isUploading"
              >
                {{ isUploading ? 'Uploading...' : 'Upload Video' }}
              </button>
            </form>
          </div>
        </UCard>
      </div>

      <div v-if="records.documents.length === 0 || records.documents.every(doc => doc.documentType !== 'ZIP')">
        <UCard>
          <template #header>
            <h1>Įkelkite savo programinio kodo ZIP archyvą</h1>
          </template>
          <ZipUploader @zip-uploaded="handleZipUpload" />
        </UCard>
        <UDivider class="p-4" />
      </div>

      <h3 class="text-lg font-semibold">
        Supervisor Reports
      </h3>
      <div v-if="records.supervisorReports.length > 0">
        <template
          v-for="report in records.supervisorReports"
          :key="report.id"
        >
          <p>{{ report }}</p>
        </template>
      </div>

      <h3 class="text-lg font-semibold">
        Reviewer Reports
      </h3>
      <div v-if="records.reviewerReports.length > 0">
        <template
          v-for="report in records.reviewerReports"
          :key="report.id"
        >
          <p>{{ report }}</p>
        </template>
      </div>

      <div v-else-if="records.documents.length === 0 && records.videos.length === 0">
        <p>Įkelkite vaizdo įrašą ir dokumentus.</p>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import 'vue-pdf-embed/dist/styles/annotationLayer.css'
import 'vue-pdf-embed/dist/styles/textLayer.css'
import ZipUploader from '~/components/ZipUploader.vue'
import type { DocumentRecord, ReviewerReport, StudentRecord, VideoRecord } from '~~/server/utils/db'
import {useUnixDateUtils} from "~/composables/useUnixDateUtils";

definePageMeta({
  middleware: ['student-access']
})

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
  studentRecord: StudentRecord
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
