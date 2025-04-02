<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">
          Import University Data
        </h3>
        <UBadge
          v-if="importStatus === 'success'"
          color="green"
          variant="subtle"
        >
          Data imported
        </UBadge>
      </div>
    </template>

    <div class="space-y-4">
      <!-- File Input -->
      <UFormGroup
        label="Select CSV File"
        name="csvFile"
        help="Upload a CSV file containing university data"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".csv"
          class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg p-2
                 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700
                 hover:file:bg-primary-100"
          @change="handleFileChange"
        >
      </UFormGroup>

      <!-- File Info -->
      <UAlert
        v-if="selectedFile && !isImporting"
        icon="i-heroicons-information-circle"
        color="blue"
        variant="soft"
        title="Selected File"
      >
        <p>{{ selectedFile.name }}</p>
        <p>Size: {{ formatFileSize(selectedFile.size) }}</p>
      </UAlert>

      <!-- Import Progress -->
      <div
        v-if="isImporting"
        class="space-y-2"
      >
        <UProgress
          indeterminate
          color="primary"
        />
        <p class="text-sm text-center">
          Importing data, please wait...
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between items-center">
        <!-- Status Messages -->
        <div>
          <UBadge
            v-if="importStatus === 'success'"
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
            v-if="importStatus === 'error'"
            color="red"
            variant="soft"
          >
            <span class="flex items-center gap-1">
              <span class="i-heroicons-exclamation-triangle" />
              {{ message }}
            </span>
          </UBadge>
        </div>

        <!-- Import Button -->
        <UButton
          :loading="isImporting"
          :disabled="isImporting || !selectedFile"
          color="primary"
          icon="i-heroicons-arrow-up-tray"
          @click="uploadCSV"
        >
          Import Data
        </UButton>
      </div>
    </template>
  </UCard>
</template>

<script setup>
import { ref } from 'vue'

const fileInput = ref(null)
const selectedFile = ref(null)
const message = ref('')
const isImporting = ref(false)
const importStatus = ref(null) // 'success', 'error', or null

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
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    message.value = ''
    importStatus.value = null
  }
}

// Upload the CSV file
async function uploadCSV() {
  if (!selectedFile.value) {
    message.value = 'Please select a CSV file first.'
    importStatus.value = 'error'
    return
  }

  isImporting.value = true
  importStatus.value = null

  const formData = new FormData()
  formData.append('file', selectedFile.value)

  try {
    const { data, error } = await useFetch('/api/import-csv', {
      method: 'POST',
      body: formData
    })

    if (error.value) {
      throw new Error(`Error: ${error.value.message || 'Unknown error'}`)
    }

    if (data.value) {
      message.value = data.value.message || 'File uploaded successfully!'
      importStatus.value = 'success'

      // Reset file input
      if (fileInput.value) {
        fileInput.value.value = null
      }
      selectedFile.value = null
    }
    else {
      message.value = 'No response data available.'
      importStatus.value = 'error'
    }
  }
  catch (error) {
    console.error('Error uploading CSV:', error)
    message.value = 'Failed to upload CSV: ' + (error.message || 'Unknown error occurred.')
    importStatus.value = 'error'
  }
  finally {
    isImporting.value = false
  }
}
</script>
