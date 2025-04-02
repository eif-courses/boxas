<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">
          Upload VMA Moodle ZIP
        </h3>
        <UBadge
          v-if="uploadStatus === 'success'"
          color="green"
          variant="subtle"
        >
          Files imported
        </UBadge>
      </div>
    </template>

    <div class="space-y-4">
      <!-- File Input -->
      <UFormGroup
        label="Select ZIP File"
        name="moodleZip"
        help="Upload a ZIP containing multiple PDF files from VMA Moodle"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".zip"
          class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg p-2
                 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700
                 hover:file:bg-primary-100"
          @change="handleFileChange"
        >
      </UFormGroup>

      <!-- File Info -->
      <UAlert
        v-if="file && !isUploading"
        icon="i-heroicons-information-circle"
        color="blue"
        variant="soft"
        title="Selected File"
      >
        <p>{{ file.name }}</p>
        <p>Size: {{ formatFileSize(file.size) }}</p>
      </UAlert>

      <!-- Upload Progress -->
      <div
        v-if="isUploading"
        class="space-y-2"
      >
        <UProgress
          indeterminate
          color="primary"
        />
        <p class="text-sm text-center">
          Uploading and processing files...
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between items-center">
        <!-- Status Messages -->
        <div>
          <UBadge
            v-if="uploadStatus === 'success'"
            color="green"
            variant="soft"
            class="mr-2"
          >
            <span class="flex items-center gap-1">
              <span class="i-heroicons-check-circle" />
              {{ message }}
            </span>
          </UBadge>

          <UBadge
            v-if="uploadStatus === 'error'"
            color="red"
            variant="soft"
          >
            <span class="flex items-center gap-1">
              <span class="i-heroicons-exclamation-triangle" />
              {{ message }}
            </span>
          </UBadge>
        </div>

        <!-- Upload Button -->
        <UButton
          :loading="isUploading"
          :disabled="isUploading || !file"
          color="primary"
          icon="i-heroicons-archive-box-arrow-down"
          @click="uploadFile"
        >
          Upload
        </UButton>
      </div>
    </template>
  </UCard>
</template>

<script setup>
import { ref } from 'vue'

const fileInput = ref(null)
const file = ref(null)
const message = ref('')
const isUploading = ref(false)
const uploadStatus = ref(null) // 'success', 'error', or null

// Format file size helper
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Handle file selection
const handleFileChange = (event) => {
  const selectedFile = event.target.files[0]
  if (selectedFile) {
    file.value = selectedFile
    message.value = ''
    uploadStatus.value = null
  }
}

const uploadFile = async () => {
  if (!file.value) {
    message.value = 'Please select a ZIP file.'
    uploadStatus.value = 'error'
    return
  }

  isUploading.value = true
  uploadStatus.value = null

  const formData = new FormData()
  formData.append('file', file.value)

  const group = 'PIT22'

  try {
    const response = await fetch(`/api/students/upload/${group}`, {
      method: 'POST',
      body: formData
    })

    const result = await response.json()
    message.value = result.message || 'Upload successful!'
    uploadStatus.value = 'success'

    // Reset file input
    if (fileInput.value) {
      fileInput.value.value = null
    }
    file.value = null
  }
  catch (error) {
    message.value = 'Upload failed!'
    uploadStatus.value = 'error'
    console.error(error)
  }
  finally {
    isUploading.value = false
  }
}
</script>
