<template>
  <UCard>
    <!-- Removed the max-w-lg mx-auto class to match VideoUploader -->
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold">
          Upload ZIP File
        </h2>
        <UBadge
          v-if="success"
          color="green"
          variant="subtle"
        >
          ZIP uploaded
        </UBadge>
      </div>
    </template>

    <div class="space-y-6">
      <!-- File Input -->
      <UFormGroup
        label="Select ZIP file"
        name="zipFile"
        help="Upload your project source code as a ZIP archive"
      >
        <UInput
          ref="fileInput"
          type="file"
          accept=".zip"
          @change="handleFileUpload"
        />
      </UFormGroup>

      <!-- Upload Progress -->
      <div
        v-if="uploading"
        class="space-y-2"
      >
        <div class="flex justify-between text-sm">
          <span>Uploading...</span>
          <span>{{ uploadProgress }}%</span>
        </div>
        <UProgress
          :value="uploadProgress"
          color="primary"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between items-center">
        <!-- Status Messages -->
        <div>
          <UBadge
            v-if="success"
            color="green"
            variant="soft"
            class="mr-2"
          >
            <span class="flex items-center gap-1">
              <span class="i-heroicons-check-circle" />
              Upload successful!
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
        <UButton
          :loading="uploading"
          :disabled="uploading"
          color="primary"
          icon="i-heroicons-cloud-arrow-up"
          @click="uploadFile"
        >
          Upload
        </UButton>
      </div>
    </template>
  </UCard>
</template>

<script setup>
const fileInput = ref(null)
const uploading = ref(false)
const success = ref(false)
const errorMessage = ref('')
const uploadProgress = ref(0)

const emit = defineEmits(['zipUploaded'])

const { loggedIn, user } = useUserSession()

const handleFileUpload = () => {
  success.value = false
  errorMessage.value = ''
}

const uploadWithPresignedUrl = async (file) => {
  if (!loggedIn || !user) return

  const fileName = encodeURIComponent(file.name)

  try {
    uploading.value = true
    uploadProgress.value = 0

    // Step 1: Get presigned URL
    const presignResponse = await $fetch(`/api/blob/sign/${fileName}`, {
      method: 'GET'
    })

    if (presignResponse.error) {
      throw new Error(presignResponse.error)
    }

    const { uploadUrl, filePath, studentRecordId } = presignResponse

    if (!uploadUrl || !uploadUrl.startsWith('http')) {
      console.error('Invalid upload URL:', uploadUrl)
      throw new Error('Invalid upload URL received from server')
    }

    console.log('Uploading to:', uploadUrl.substring(0, 50) + '...')

    // Step 2: Upload directly to R2
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          uploadProgress.value = Math.round((event.loaded / event.total) * 100)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        }
        else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'))
      })

      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', file.type || 'application/zip')
      xhr.send(file)
    })

    // Step 3: Notify backend that upload is complete
    const completeResponse = await $fetch('/api/blob/complete', {
      method: 'POST',
      body: {
        fileName: file.name,
        filePath,
        fileType: file.type || 'application/zip',
        studentRecordId
      }
    })

    if (completeResponse.error) {
      throw new Error(completeResponse.error)
    }

    success.value = true
    emit('zipUploaded')
  }
  catch (error) {
    console.error('Upload error:', error)
    errorMessage.value = error.message || 'An error occurred during the upload.'
  }
  finally {
    uploading.value = false
  }
}

const uploadFile = async () => {
  if (!fileInput.value.$el.querySelector('input').files.length) {
    errorMessage.value = 'Please select a ZIP file.'
    return
  }

  const file = fileInput.value.$el.querySelector('input').files[0]
  await uploadWithPresignedUrl(file)
}
</script>
