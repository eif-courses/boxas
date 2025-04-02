<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">
          Upload Moodle ZIP Files
        </h3>
        <UBadge
          v-if="uploadStatus === 'success'"
          color="green"
          variant="subtle"
        >
          Files processed
        </UBadge>
      </div>
    </template>

    <div class="space-y-4">
      <!-- File Input - Multiple allowed -->
      <UFormGroup
        label="Select ZIP Files"
        name="moodleZips"
        help="Upload one or more ZIP files from VMA Moodle. Files will be matched to the latest academic year."
      >
        <input
          ref="fileInput"
          type="file"
          accept=".zip"
          multiple
          class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg p-2
                 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700
                 hover:file:bg-primary-100"
          @change="handleFileChange"
        >
      </UFormGroup>

      <!-- Selected Files List -->
      <div
        v-if="files.length > 0 && !isUploading"
        class="space-y-2"
      >
        <UAlert
          icon="i-heroicons-information-circle"
          color="blue"
          variant="soft"
          title="Selected Files"
        >
          <ul class="list-disc pl-5 space-y-1">
            <li
              v-for="(file, index) in files"
              :key="index"
            >
              {{ file.name }} ({{ formatFileSize(file.size) }})
            </li>
          </ul>
        </UAlert>
      </div>

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
          Uploading and processing files. This may take a while for large ZIP files...
        </p>
      </div>

      <!-- Results Summary -->
      <UAlert
        v-if="processingResults && uploadStatus === 'success'"
        icon="i-heroicons-document-check"
        color="green"
        variant="soft"
        title="Processing Results"
      >
        <div class="grid grid-cols-3 gap-4 mt-2">
          <div class="text-center">
            <div class="font-semibold text-lg">
              {{ processingResults.processed }}
            </div>
            <div class="text-sm text-gray-600">
              Files Processed
            </div>
          </div>
          <div class="text-center">
            <div class="font-semibold text-lg">
              {{ processingResults.matched }}
            </div>
            <div class="text-sm text-gray-600">
              Students Matched
            </div>
          </div>
          <div class="text-center">
            <div class="font-semibold text-lg">
              {{ processingResults.unmatched }}
            </div>
            <div class="text-sm text-gray-600">
              Unmatched Files
            </div>
          </div>
        </div>
      </UAlert>
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
          :disabled="isUploading || files.length === 0"
          color="primary"
          icon="i-heroicons-archive-box-arrow-down"
          @click="uploadFiles"
        >
          Process Files
        </UButton>
      </div>
    </template>
  </UCard>
</template>

<script setup>
import { ref } from 'vue'

const fileInput = ref(null)
const files = ref([])
const message = ref('')
const isUploading = ref(false)
const uploadStatus = ref(null) // 'success', 'error', or null
const processingResults = ref(null)

// Format file size helper
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Handle file selection - supports multiple files
const handleFileChange = (event) => {
  const selectedFiles = event.target.files
  if (selectedFiles && selectedFiles.length > 0) {
    // Convert FileList to array for easier handling
    files.value = Array.from(selectedFiles)
    message.value = ''
    uploadStatus.value = null
    processingResults.value = null
  }
}

const uploadFiles = async () => {
  if (files.value.length === 0) {
    message.value = 'Please select at least one ZIP file.'
    uploadStatus.value = 'error'
    return
  }

  isUploading.value = true
  uploadStatus.value = null
  message.value = ''
  processingResults.value = null

  let totalProcessed = 0
  let totalMatched = 0
  let totalUnmatched = 0

  for (const file of files.value) {
    try {
      const formData = new FormData()
      formData.append('file', file)

      // Use a generic 'all' endpoint or modify your backend to handle without group
      const response = await fetch('/api/students/upload-all', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Upload failed')
      }

      // Aggregate results from all files
      totalProcessed += result.stats.processed || 0
      totalMatched += result.stats.matched || 0
      totalUnmatched += result.stats.unmatched || 0
    }
    catch (error) {
      message.value = `Error processing ${file.name}: ${error.message}`
      uploadStatus.value = 'error'
      console.error('Upload error:', error)
      isUploading.value = false
      return // Stop processing on error
    }
  }

  // Store aggregated results
  processingResults.value = {
    processed: totalProcessed,
    matched: totalMatched,
    unmatched: totalUnmatched
  }

  // Build success message
  const successRate = totalProcessed > 0
    ? Math.round((totalMatched / totalProcessed) * 100)
    : 0

  message.value = `Successfully processed ${totalProcessed} files, matched ${totalMatched} students (${successRate}%)`
  uploadStatus.value = 'success'

  // Reset form on success
  if (fileInput.value) {
    fileInput.value.value = null
  }
  files.value = []

  isUploading.value = false
}
</script>
