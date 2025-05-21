<template>
  <div class="file-uploader">
    <!-- Drag and Drop Area -->
    <div
      class="border-2 border-dashed rounded-lg p-4 text-center transition duration-150"
      :class="{
        'border-indigo-300 bg-indigo-50': isDragging && type === 'zip',
        'border-primary-300 bg-primary-50': isDragging && type === 'pdf',
        'border-gray-300 hover:border-gray-400': !isDragging
      }"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <div
        v-if="uploading"
        class="py-4"
      >
        <UIcon
          name="i-heroicons-arrow-path"
          class="animate-spin h-8 w-8 mx-auto mb-3"
          :class="{ 'text-indigo-500': type === 'zip', 'text-primary-500': type === 'pdf' }"
        />
        <p class="text-sm">
          {{ $t('uploading') || 'Įkeliama...' }} ({{ Math.round(uploadProgress) }}%)
        </p>
        <UProgress
          class="mt-2"
          :value="uploadProgress"
          :color="type === 'zip' ? 'indigo' : 'primary'"
          size="sm"
        />
      </div>

      <template v-else>
        <UIcon
          :name="type === 'zip' ? 'i-heroicons-archive-box' : 'i-heroicons-document-text'"
          class="h-10 w-10 mx-auto mb-2"
          :class="{ 'text-indigo-500': type === 'zip', 'text-primary-500': type === 'pdf' }"
        />

        <p class="mb-2 text-sm font-medium">
          {{ dragDropText }}
        </p>
        <p class="text-xs text-gray-500 mb-3">
          {{ helperText }}
        </p>

        <UButton
          as="label"
          :color="type === 'zip' ? 'indigo' : 'primary'"
          :icon="type === 'zip' ? 'i-heroicons-archive-box' : 'i-heroicons-document-text'"
          size="sm"
          class="cursor-pointer"
        >
          {{ $t('select_file') || 'Pasirinkite failą' }}
          <input
            type="file"
            class="hidden"
            :accept="fileAccept"
            @change="handleFileSelect"
          >
        </UButton>
      </template>
    </div>

    <!-- Selected File Preview -->
    <div
      v-if="selectedFile && !uploading"
      class="mt-3 p-2 bg-gray-50 rounded flex items-center"
    >
      <UIcon
        :name="fileIcon"
        class="h-5 w-5 mr-2"
        :class="{ 'text-indigo-500': type === 'zip', 'text-primary-500': type === 'pdf' }"
      />
      <div class="flex-1 truncate text-sm">
        {{ selectedFile.name }}
        <span class="text-xs text-gray-500 ml-2">
          ({{ formatFileSize(selectedFile.size) }})
        </span>
      </div>
      <div class="flex gap-2">
        <UButton
          icon="i-heroicons-x-mark"
          color="gray"
          variant="ghost"
          size="xs"
          @click="clearFile"
        />
        <UButton
          icon="i-heroicons-arrow-up-tray"
          :color="type === 'zip' ? 'indigo' : 'primary'"
          size="xs"
          @click="uploadFile"
        >
          {{ $t('upload') || 'Įkelti' }}
        </UButton>
      </div>
    </div>

    <!-- Success/Error Messages -->
    <div
      v-if="success || errorMessage"
      class="mt-3"
    >
      <UBadge
        v-if="success"
        color="green"
        variant="soft"
        class="w-full"
      >
        <span class="flex items-center gap-1">
          <span class="i-heroicons-check-circle" />
          {{ type === 'zip' ? 'Išeities kodas sėkmingai įkeltas!' : 'Dokumentas sėkmingai įkeltas!' }}
        </span>
      </UBadge>
      <UBadge
        v-if="errorMessage"
        color="red"
        variant="soft"
        class="w-full"
      >
        <span class="flex items-center gap-1">
          <span class="i-heroicons-exclamation-triangle" />
          {{ errorMessage }}
        </span>
      </UBadge>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const props = defineProps({
  // Type of uploader: 'zip', 'pdf', or 'recommendation'
  type: {
    type: String,
    default: 'zip',
    validator: value => ['zip', 'pdf', 'recommendation'].includes(value)
  },
  // Max file size in MB
  maxSize: {
    type: Number,
    default: 50 // 50MB
  },
  // Custom title text
  title: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'document-uploaded',
  'zip-uploaded',
  'upload-start',
  'upload-progress',
  'upload-error'
])

const { t } = useI18n()
const { loggedIn, user } = useUserSession()

// State
const selectedFile = ref(null)
const isDragging = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const errorMessage = ref('')
const success = ref(false)

// Computed properties
const fileAccept = computed(() => {
  return props.type === 'zip'
    ? '.zip,.rar,.7z'
    : '.pdf'
})

const fileIcon = computed(() => {
  return props.type === 'zip'
    ? 'i-heroicons-archive-box'
    : 'i-heroicons-document-text'
})

const dragDropText = computed(() => {
  if (props.title) return props.title

  return props.type === 'zip'
    ? (t('drag_drop_zip') || 'Tempkite ZIP failą čia')
    : (t('drag_drop_pdf') || 'Tempkite PDF dokumentą čia')
})

const helperText = computed(() => {
  return props.type === 'zip'
    ? (t('zip_format_help') || `ZIP formatas, maks. ${props.maxSize}MB`)
    : (t('pdf_format_help') || `PDF formatas, maks. ${props.maxSize}MB`)
})

// Methods
const handleDragOver = (event) => {
  // Check if any of the dragged files is acceptable
  const hasAcceptableFile = Array.from(event.dataTransfer.items).some((item) => {
    if (item.kind === 'file') {
      const file = item.getAsFile()
      const fileName = file.name.toLowerCase()

      if (props.type === 'zip') {
        return fileName.endsWith('.zip')
          || fileName.endsWith('.rar')
          || fileName.endsWith('.7z')
      }
      else {
        return fileName.endsWith('.pdf')
      }
    }
    return false
  })

  // Only prevent default (show drop indicator) if there's at least one acceptable file
  if (hasAcceptableFile) {
    isDragging.value = true
    event.preventDefault()
  }
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = (event) => {
  isDragging.value = false

  if (event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0]
    validateAndSetFile(file)
  }
}

const handleFileSelect = (event) => {
  if (event.target.files.length > 0) {
    const file = event.target.files[0]
    validateAndSetFile(file)
  }
}

const validateAndSetFile = (file) => {
  errorMessage.value = ''
  success.value = false

  // Check file type
  const fileName = file.name.toLowerCase()
  let isValidType = false

  if (props.type === 'zip') {
    isValidType = fileName.endsWith('.zip')
      || fileName.endsWith('.rar')
      || fileName.endsWith('.7z')

    if (!isValidType) {
      errorMessage.value = t('invalid_zip_format') || 'Netinkamas failo formatas. Įkelkite ZIP, RAR arba 7Z failą.'
      return
    }
  }
  else {
    isValidType = fileName.endsWith('.pdf')

    if (!isValidType) {
      errorMessage.value = t('invalid_pdf_format') || 'Netinkamas failo formatas. Įkelkite PDF failą.'
      return
    }
  }

  // Check file size
  const maxSizeBytes = props.maxSize * 1024 * 1024
  if (file.size > maxSizeBytes) {
    errorMessage.value = t('file_too_large', { maxSize: props.maxSize })
      || `Failas per didelis. Maksimalus dydis: ${props.maxSize}MB.`
    return
  }

  selectedFile.value = file
}

const clearFile = () => {
  selectedFile.value = null
  errorMessage.value = ''
  success.value = false
}

const uploadFile = async () => {
  if (!selectedFile.value) {
    errorMessage.value = props.type === 'zip'
      ? 'Pasirinkite ZIP failą.'
      : 'Pasirinkite PDF dokumentą.'
    return
  }

  await uploadWithPresignedUrl(selectedFile.value)
}

const uploadWithPresignedUrl = async (file) => {
  if (!loggedIn || !user) {
    errorMessage.value = 'Prisijungimas būtinas.'
    return
  }

  errorMessage.value = ''
  success.value = false

  try {
    emit('upload-start')
    uploading.value = true
    uploadProgress.value = 0

    const fileName = encodeURIComponent(file.name)

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
          emit('upload-progress', uploadProgress.value)
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
      xhr.setRequestHeader('Content-Type', file.type || (props.type === 'zip' ? 'application/zip' : 'application/pdf'))
      xhr.send(file)
    })

    // Step 3: Notify backend that upload is complete
    const completeResponse = await $fetch('/api/blob/complete', {
      method: 'POST',
      body: {
        fileName: file.name,
        filePath,
        fileType: file.type || (props.type === 'zip' ? 'application/zip' : 'application/pdf'),
        studentRecordId
      }
    })

    if (completeResponse.error) {
      throw new Error(completeResponse.error)
    }

    success.value = true

    // Emit the appropriate event based on file type
    const eventName = props.type === 'zip' ? 'zip-uploaded' : 'document-uploaded'
    emit(eventName, { file: selectedFile.value, type: props.type })

    // Clear the file selection after successful upload
    setTimeout(() => {
      selectedFile.value = null
      success.value = false
    }, 3000)
  }
  catch (error) {
    console.error('Upload error:', error)
    errorMessage.value = error.message || 'An error occurred during the upload.'
    emit('upload-error', error)
  }
  finally {
    uploading.value = false
  }
}

// Utility functions
const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<style scoped>
.file-uploader {
  width: 100%;
}
</style>
