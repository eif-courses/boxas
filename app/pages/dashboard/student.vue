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
          <template v-if="records.supervisorReports.length > 0">
            <template
              v-for="report in records.supervisorReports"
              :key="report.id"
            >
              <UButton
                :loading="isFetchingDocument"
                icon="i-heroicons-document-text"
                size="sm"
                color="white"
                variant="solid"
                :label="$t('supervisor_report')"
                @click="openSupervisorReport(report)"
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

  <div>
    <UButton
      label="Open Wide Modal"
      @click="isOpen = true"
    />

    <UModal
      v-model="isOpen"
      prevent-close
      :ui="{ width: 'sm:max-w-4xl' }"
    >
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              {{ $t('supervisor_report') }}
            </h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="-my-1"
              @click="isOpen = false"
            />
          </div>
        </template>

        <div class="p-4">
          {{ reportObjInModal.createdDate }}
          <div class="h-32 bg-gray-200 dark:bg-gray-700 rounded mt-4 animate-pulse" /> <!-- Example placeholder -->
        </div>
      </UCard>
    </UModal>
  </div>

  <div>
    <UButton
      label="Rodyti dokumentą (DOCX Stilius)"
      @click="openModalWithData"
    />

    <UModal
      v-if="reportObjInModal"
      v-model="isOpen"
      prevent-close
      :ui="{
        width: 'sm:max-w-4xl' // Increased width for better layout
        // We might need to control modal panel padding if card padding isn't enough
        // or conflicts, but let's start with card padding.
      }"
    >
      <UCard
        :ui="{
          ring: '',
          divide: 'divide-y divide-gray-100 dark:divide-gray-800',
          // Give ample padding for the content layout
          body: { padding: 'p-6 sm:p-10' }, // Increased padding
          header: { padding: 'p-4 sm:p-6' }
        }"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Vadovo Atsiliepimas (Peržiūra)
            </h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="-my-1"
              @click="isOpen = false"
            />
          </div>
        </template>

        <!-- Document Body - Using divs and Tailwind for layout -->
        <div class="text-sm text-gray-900 dark:text-gray-100 space-y-4 font-serif">
          <!-- Top Right Header -->
          <div class="text-right text-xs mb-10">
            <p>Vilniaus kolegijos baigiamųjų darbų (projektų)</p>
            <p>rengimo ir gynimo tvarkos aprašo</p>
            <p class="font-semibold">
              4 priedas
            </p>
          </div>

          <!-- Centered Faculty/Dept -->
          <div class="text-center uppercase font-semibold mb-10 space-y-1">
            <p>Vilniaus kolegijos</p>
            <p>Elektronikos ir informatikos fakultetas</p>
            <p>{{ documentData.DEPT }}</p>
          </div>

          <!-- Centered Title -->
          <div class="text-center uppercase font-semibold mb-10">
            <p>Baigiamojo darbo vadovo atsiliepimas</p>
          </div>

          <!-- Study Program Line -->
          <p class="mb-2">
            Studijų programa: „{{ documentData.PROGRAM }}“, valstybinis kodas {{ documentData.CODE }}
          </p>

          <!-- Student Name Line (using flexbox for alignment) -->
          <div class="flex justify-between items-end mb-0">
            <span>Studentas (-ė):</span>
            <span class="font-medium">{{ documentData.NAME }}</span>
          </div>
          <div class="text-right text-xs text-gray-500 dark:text-gray-400 -mt-1">
            (vardas, pavardė)
          </div>

          <!-- Thesis Title Line -->
          <p class="mt-4 mb-6">
            Baigiamojo darbo tema: <span class="font-bold">{{ documentData.TITLE }}</span>
          </p>

          <!-- Explanation Paragraph -->
          <p class="mt-6 mb-6 text-justify">
            {{ documentData.EXPL }}
          </p>

          <!-- Suitability & Plagiarism -->
          <div class="mt-6 space-y-2">
            <p>Baigiamasis darbas tinkamas ginti Baigiamųjų darbų gynimo komisijos posėdyje.</p>
            <p>Nustatyta sutaptis su kitais darbais sudaro {{ documentData.OM }} procentų viso darbo, iš jų:</p>
            <div class="pl-8 space-y-1 text-sm">
              <p>sutaptis su vienu šaltiniu – {{ documentData.SSM }} procentų viso darbo;</p>
              <p>sutaptis su kitais to paties studento studijų rašto darbais sudaro {{ documentData.STUM }} procentų viso darbo;</p>
              <p>sutaptis su kitų studentų to paties jungtinio darbo autorių darbais sudaro {{ documentData.JM }} procentų viso darbo.</p>
            </div>
          </div>

          <!-- Supervisor Section (using grid for better alignment control) -->
          <div class="mt-12 pt-8">
            <p class="mb-4 font-semibold">
              Patvirtinu:
            </p>

            <div class="flex items-end space-x-4 sm:space-x-8">
              <div class="flex-shrink-0">
                <p>Baigiamojo darbo vadovas:</p>
                <p
                  class="text-xs text-transparent select-none invisible h-4"
                  aria-hidden="true"
                />
              </div>

              <div class="flex-grow text-center px-2">
                <div class="border-b border-gray-400 dark:border-gray-600 min-h-[1.5em] mb-1 flex items-center justify-center text-gray-500 dark:text-gray-400 italic text-xs space-x-1">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="w-3 h-3 text-green-500"
                  />
                  <span>Signed Electronically</span>
                  <UIcon
                    name="i-heroicons-clock"
                    class="w-3 h-3"
                  />
                  <span> {{ reportObjInModal.createdDate }}</span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  (parašas)
                </p>
              </div>

              <div class="flex-shrink-0 text-right">
                <p class="font-medium">
                  {{ documentData.SUPER }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  (vardas, pavardė)
                </p>
              </div>
            </div>

            <div class="mt-4 text-center">
              <p>Vilniaus kolegija Elektronikos ir informatikos fakultetas</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                (darbovietė)
              </p>
            </div>

            <div class="mt-4 text-center">
              <p>{{ documentData.POS }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                (pareigos)
              </p>
            </div>
          </div>

          <!-- Date Section -->
          <div class="mt-8 text-center">
            <p>{{ documentData.DATE }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              (data)
            </p>
          </div>
        </div>

        <template #footer>
          <div class="text-right">
            <UButton
              label="Uždaryti"
              @click="isOpen = false"
            />
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import 'vue-pdf-embed/dist/styles/annotationLayer.css'
import 'vue-pdf-embed/dist/styles/textLayer.css'
import ZipUploader from '~/components/ZipUploader.vue'
import type { DocumentRecord, ReviewerReport, StudentRecord, VideoRecord } from '~~/server/utils/db'

definePageMeta({
  middleware: ['student-access']
})

const isLoading = ref(true)
const page = ref(null)
const pageCount = ref(null)
const pdfSource = ref('https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf')
const showAllPages = ref(true)

const isOpen = ref(false)

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
