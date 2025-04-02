<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">
          {{ title }}
        </h3>
        <UBadge
          v-if="videos.length > 0"
          color="green"
          variant="subtle"
        >
          {{ videos.length }} {{ videos.length === 1 ? 'video' : 'videos' }} uploaded
        </UBadge>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Video Selector - Using standard HTML input -->
      <UFormGroup
        v-if="!isUploading"
        label="Select Video File"
        name="videoFile"
        help="Select a video explaining your code"
      >
        <input
          ref="fileInput"
          type="file"
          accept="video/*"
          class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg p-2
                 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700
                 hover:file:bg-primary-100"
          @change="handleFileChange"
        >
      </UFormGroup>

      <!-- File Info -->
      <UAlert
        v-if="selectedFile && !isUploading"
        icon="i-heroicons-information-circle"
        color="blue"
        variant="soft"
        title="Selected File"
      >
        <p>Name: {{ selectedFile.name }}</p>
        <p>Size: {{ formatFileSize(selectedFile.size) }}</p>
        <p>Type: {{ selectedFile.type }}</p>
      </UAlert>

      <!-- Upload Progress -->
      <div
        v-if="isUploading"
        class="space-y-2"
      >
        <div class="flex justify-between text-sm">
          <span>Uploading {{ selectedFile?.name }}...</span>
          <span>{{ progress }}%</span>
        </div>
        <UProgress
          :value="progress"
          color="primary"
        />
      </div>

      <!-- Processing State -->
      <UAlert
        v-if="isProcessing"
        icon="i-heroicons-clock"
        color="orange"
        variant="soft"
        title="Processing Video"
      >
        <p>Your video is being processed. This may take a moment.</p>
      </UAlert>
    </div>

    <template #footer>
      <div class="flex justify-between items-center">
        <!-- Status Messages -->
        <div>
          <UBadge
            v-if="successMessage"
            color="green"
            variant="soft"
            class="mr-2"
          >
            <span class="flex items-center gap-1">
              <span class="i-heroicons-check-circle" />
              {{ successMessage }}
            </span>
          </UBadge>

          <UBadge
            v-if="errorMessage"
            color="red"
            variant="soft"
          >
            <span class="flex items-center gap-1">
              <span class="i-heroicons-exclamation-triangle" />
              {{ errorMessage }}
            </span>
          </UBadge>
        </div>

        <!-- Upload Button -->
        <div>
          <UButton
            :loading="isUploading || isProcessing"
            :disabled="buttonDisabled"
            color="primary"
            icon="i-heroicons-video-camera"
            @click="uploadVideo"
          >
            Upload Video
          </UButton>
        </div>
      </div>
    </template>
  </UCard>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Upload Video Explanation'
  }
})

const emit = defineEmits(['video-uploaded'])

// Refs
const fileInput = ref(null)
const selectedFile = ref(null)
const isUploading = ref(false)
const isProcessing = ref(false)
const progress = ref(0)
const successMessage = ref('')
const errorMessage = ref('')
const videos = ref([])

// Computed property for button disabled state with detailed checks
const buttonDisabled = computed(() => {
  const noFileSelected = !selectedFile.value
  const isCurrentlyUploading = isUploading.value
  const isCurrentlyProcessing = isProcessing.value

  console.log('Button disabled check:', {
    noFileSelected,
    isCurrentlyUploading,
    isCurrentlyProcessing,
    selectedFileValue: selectedFile.value
  })

  return noFileSelected || isCurrentlyUploading || isCurrentlyProcessing
})

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Format dates
const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

// Handle file selection with better debugging
const handleFileChange = (event) => {
  console.log('File change event fired', event)

  try {
    if (event.target && event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0]
      console.log('File selected:', file.name, file.size, file.type)

      // Manual cloning of File object to ensure reactivity
      selectedFile.value = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        // We need to keep the actual file for uploading
        _file: file
      }

      // Store the raw file for upload
      selectedFile.value._rawFile = file

      console.log('selectedFile value set:', selectedFile.value)
      errorMessage.value = ''
      successMessage.value = ''
    }
    else {
      console.warn('No file in event or empty file list', event)
    }
  }
  catch (error) {
    console.error('Error in handleFileChange:', error)
  }
}

// Upload video with progress tracking
const uploadVideo = async () => {
  console.log('Upload button clicked, selectedFile:', selectedFile.value)

  if (!selectedFile.value || !selectedFile.value._rawFile) {
    errorMessage.value = 'Please select a video file first.'
    return
  }

  try {
    isUploading.value = true
    progress.value = 0
    errorMessage.value = ''
    successMessage.value = ''

    const file = selectedFile.value._rawFile
    console.log('Starting upload with file:', file.name)

    // Step 1: Get pre-signed URLs
    const response = await fetch('/api/students/videos/get-upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to get upload URL: ${response.status}`)
    }

    const { data } = await response.json()
    const { uploadUrl, viewUrl, key } = data
    console.log('Got pre-signed URL:', uploadUrl.substring(0, 50) + '...')

    // Step 2: Upload directly to R2 using pre-signed URL with progress tracking
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          progress.value = Math.round((event.loaded / event.total) * 100)
          console.log('Upload progress:', progress.value + '%')
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('XHR upload completed successfully')
          resolve()
        }
        else {
          console.error('XHR upload failed with status:', xhr.status, xhr.statusText)
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`))
        }
      })

      xhr.addEventListener('error', () => {
        console.error('XHR upload failed with network error')
        reject(new Error('Upload failed due to network error'))
      })

      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    })

    // Step 3: Register the successful upload
    console.log('Upload to R2 successful, registering upload')
    isUploading.value = false
    isProcessing.value = true

    const registerResponse = await fetch('/api/students/videos/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key,
        filename: file.name,
        contentType: file.type,
        size: file.size,
        url: viewUrl
      })
    })

    if (!registerResponse.ok) {
      throw new Error(`Failed to register upload: ${registerResponse.status}`)
    }

    // Handle success
    const result = await registerResponse.json()
    console.log('Registration successful:', result)
    successMessage.value = 'Video uploaded successfully!'

    // Reset form
    if (fileInput.value) {
      fileInput.value.value = null
    }
    selectedFile.value = null

    // Refresh video list
    await fetchVideos()

    // Emit event
    emit('video-uploaded', result)
  }
  catch (error) {
    console.error('Error during upload process:', error)
    errorMessage.value = error.message || 'An error occurred during upload.'
  }
  finally {
    isUploading.value = false
    isProcessing.value = false
  }
}

// Fetch videos for the current user
const fetchVideos = async () => {
  try {
    console.log('Fetching videos list')
    const response = await fetch('/api/students/videos/list')

    if (!response.ok) {
      throw new Error('Failed to fetch videos')
    }

    const result = await response.json()
    videos.value = result.videos || []
    console.log('Fetched videos:', videos.value.length)
  }
  catch (error) {
    console.error('Error fetching videos:', error)
  }
}

// Initialize component
onMounted(() => {
  console.log('VideoUploader component mounted')
  fetchVideos()
})
</script>
