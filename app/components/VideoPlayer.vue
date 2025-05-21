<template>
  <div class="video-player">
    <!-- Video player with source when URL is available and format is supported -->
    <video
      v-if="videoSrc && isFormatSupported && !showDownloadFallback"
      ref="videoElement"
      controls
      preload="metadata"
      :class="className"
      @error="handleVideoError"
      @loadeddata="handleVideoLoaded"
      @canplay="handleCanPlay"
    >
      <source
        :src="videoSrc"
        :type="effectiveContentType"
      >
      <!-- Try alternative content types for better compatibility -->
      <source
        v-if="contentType.includes('avi')"
        :src="videoSrc"
        type="video/x-msvideo"
      >
      <source
        v-if="contentType.includes('avi')"
        :src="videoSrc"
        type="video/avi"
      >
      <!-- Fallback to MP4 -->
      <source
        :src="videoSrc"
        type="video/mp4"
      >
      {{ $t('video_not_supported_browser') || 'Your browser does not support the video tag.' }}
    </video>

    <!-- Format not supported - show download option -->
    <div
      v-else-if="videoSrc && (showDownloadFallback || !isFormatSupported)"
      class="video-player-unsupported"
    >
      <div class="flex flex-col items-center justify-center h-full p-6 text-center">
        <UIcon
          name="i-heroicons-video-camera-slash"
          class="h-16 w-16 text-gray-400 mb-4"
        />
        <h3 class="text-lg font-semibold text-gray-900 mb-2">
          {{ $t('video_format_not_supported') || 'Video format not supported' }}
        </h3>
        <p class="text-gray-600 mb-2">
          {{ getFormatMessage() }}
        </p>
        <p class="text-sm text-gray-500 mb-6">
          {{ $t('download_to_play_locally') || 'Download the video to play it with your preferred video player.' }}
        </p>

        <div class="space-y-3">
          <UButton
            color="primary"
            size="lg"
            @click="downloadVideo"
          >
            <UIcon
              name="i-heroicons-arrow-down-tray"
              class="mr-2"
            />
            {{ $t('download_video') || 'Download Video' }}
          </UButton>

          <UButton
            v-if="!hasTriedAllFormats"
            color="gray"
            variant="ghost"
            size="sm"
            @click="tryForcePlay"
          >
            {{ $t('try_play_anyway') || 'Try to play anyway' }}
          </UButton>
        </div>

        <!-- Show video file info -->
        <div class="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-600">
          <div class="grid grid-cols-2 gap-2">
            <div><strong>{{ $t('file_type') || 'Type' }}:</strong></div>
            <div>{{ contentType }}</div>
            <div><strong>{{ $t('file_size') || 'Size' }}:</strong></div>
            <div>{{ formatFileSize(fileSize) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div
      v-else-if="loading"
      class="video-player-loading"
    >
      <div class="flex flex-col items-center space-y-4">
        <USkeleton
          class="h-12 w-12"
          :ui="{ rounded: 'rounded-full' }"
        />
        <div class="space-y-2 text-center">
          <USkeleton class="h-4 w-[250px]" />
          <USkeleton class="h-4 w-[200px]" />
          <p class="text-sm text-gray-400 mt-2">
            {{ $t('loading_video') || 'Loading video...' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="video-player-error flex flex-col items-center justify-center"
    >
      <UIcon
        name="i-heroicons-exclamation-circle"
        class="h-12 w-12 text-red-500 mb-2"
      />
      <p class="text-red-600 dark:text-red-400 text-center mb-4">
        {{ error }}
      </p>
      <div class="space-x-2">
        <UButton
          color="red"
          size="sm"
          @click="fetchVideoUrl"
        >
          {{ $t('retry') || 'Retry' }}
        </UButton>
        <UButton
          v-if="videoSrc"
          color="gray"
          variant="ghost"
          size="sm"
          @click="downloadVideo"
        >
          {{ $t('download_instead') || 'Download Instead' }}
        </UButton>
      </div>
    </div>

    <!-- No video state -->
    <div
      v-else
      class="video-player-loading flex items-center justify-center"
    >
      <p class="text-gray-500">
        {{ $t('video_not_available') || 'Video not available.' }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  videoKey: {
    type: String,
    default: null
  },
  videoUrl: {
    type: String,
    default: null
  },
  contentType: {
    type: String,
    default: 'video/mp4'
  },
  className: {
    type: String,
    default: ''
  },
  filename: {
    type: String,
    default: ''
  },
  fileSize: {
    type: Number,
    default: 0
  }
})

const videoElement = ref(null)
const videoSrc = ref(props.videoUrl)
const loading = ref(true)
const error = ref(null)
const showDownloadFallback = ref(false)
const hasTriedAllFormats = ref(false)

// Check if the video format is supported by the browser
const isFormatSupported = computed(() => {
  if (!import.meta.client) return true // Assume supported on server

  const video = document.createElement('video')
  const type = effectiveContentType.value

  // Check primary type
  const canPlay = video.canPlayType(type)
  if (canPlay === 'probably' || canPlay === 'maybe') {
    return true
  }

  // For AVI files, try alternative MIME types
  if (type.includes('avi') || props.filename.toLowerCase().endsWith('.avi')) {
    const aviTypes = [
      'video/x-msvideo',
      'video/avi',
      'video/msvideo',
      'video/x-ms-video'
    ]

    return aviTypes.some((aviType) => {
      const result = video.canPlayType(aviType)
      return result === 'probably' || result === 'maybe'
    })
  }

  return false
})

// Get the most appropriate content type
const effectiveContentType = computed(() => {
  const originalType = props.contentType

  // If we have a proper content type, use it
  if (originalType && originalType !== 'application/octet-stream') {
    return originalType
  }

  // Determine from filename extension
  const filename = props.filename.toLowerCase()
  if (filename.endsWith('.avi')) {
    return 'video/x-msvideo'
  }
  else if (filename.endsWith('.mp4')) {
    return 'video/mp4'
  }
  else if (filename.endsWith('.webm')) {
    return 'video/webm'
  }
  else if (filename.endsWith('.mov')) {
    return 'video/quicktime'
  }

  return originalType || 'video/mp4'
})

// Get user-friendly format message
const getFormatMessage = () => {
  const type = effectiveContentType.value.toLowerCase()

  if (type.includes('avi')) {
    return 'AVI format is not supported by most web browsers. This is a common limitation.'
  }
  else if (type.includes('wmv')) {
    return 'WMV format is not supported by modern web browsers.'
  }
  else if (type.includes('mov')) {
    return 'MOV format may have limited browser support.'
  }

  return 'This video format is not supported by your browser.'
}

// Format file size for display
const formatFileSize = (bytes) => {
  if (!bytes) return 'Unknown'

  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'

  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

// Handle video error events
const handleVideoError = (e) => {
  console.error('Video error event:', e)

  const video = e.target
  let errorMessage = 'Failed to load video.'

  if (video.error) {
    switch (video.error.code) {
      case video.error.MEDIA_ERR_ABORTED:
        errorMessage = 'Video loading was aborted.'
        break
      case video.error.MEDIA_ERR_NETWORK:
        errorMessage = 'Network error while loading video.'
        break
      case video.error.MEDIA_ERR_DECODE:
        errorMessage = 'Video format not supported or file is corrupted.'
        showDownloadFallback.value = true
        break
      case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
        errorMessage = 'Video format not supported by browser.'
        showDownloadFallback.value = true
        break
    }
  }

  // For unsupported formats, show download option instead of error
  if (showDownloadFallback.value) {
    error.value = null
    loading.value = false
  }
  else {
    error.value = errorMessage
    loading.value = false
  }
}

// Handle successful video load
const handleVideoLoaded = () => {
  console.log('Video loaded successfully')
  loading.value = false
  error.value = null
  showDownloadFallback.value = false
}

// Handle when video can start playing
const handleCanPlay = () => {
  loading.value = false
  error.value = null
}

// Try to force play with different content type
const tryForcePlay = () => {
  hasTriedAllFormats.value = true
  showDownloadFallback.value = false

  // Force reload with different approach
  if (videoElement.value) {
    videoElement.value.load()
  }
}

// Download video file
const downloadVideo = () => {
  if (videoSrc.value) {
    const link = document.createElement('a')
    link.href = videoSrc.value
    link.download = props.filename || 'video'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// Fetch video URL from the server
const fetchVideoUrl = async () => {
  // Reset state
  loading.value = true
  error.value = null
  videoSrc.value = null
  showDownloadFallback.value = false

  // If there's no key, we can't fetch anything
  if (!props.videoKey) {
    loading.value = false
    return
  }

  try {
    console.log('Fetching video URL for key:', props.videoKey)

    // Using your existing API endpoint
    const response = await fetch(`/api/students/videos/url/${props.videoKey}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch video URL: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.url) {
      console.log('Successfully loaded video URL')
      videoSrc.value = data.url

      // Check format support after getting URL
      if (!isFormatSupported.value) {
        console.warn('Video format may not be supported:', effectiveContentType.value)
        showDownloadFallback.value = true
        loading.value = false
      }
    }
    else {
      throw new Error('No video URL returned from server')
    }
  }
  catch (err) {
    console.error('Error fetching video URL:', err)
    error.value = err.message || 'Failed to load video'
    loading.value = false
  }
}

// Watch for changes in props
watch(() => props.videoUrl, (newUrl) => {
  if (newUrl) {
    videoSrc.value = newUrl
    loading.value = false
    error.value = null
    showDownloadFallback.value = !isFormatSupported.value
  }
  else if (props.videoKey) {
    fetchVideoUrl()
  }
  else {
    videoSrc.value = null
    loading.value = false
  }
})

watch(() => props.videoKey, (newKey) => {
  if (newKey && !props.videoUrl) {
    fetchVideoUrl()
  }
})

// Initialize on mount
onMounted(() => {
  // If URL is directly provided, use it
  if (props.videoUrl) {
    videoSrc.value = props.videoUrl
    loading.value = false

    // Check if format is supported
    if (!isFormatSupported.value) {
      showDownloadFallback.value = true
    }
  }
  // Otherwise fetch URL based on key
  else if (props.videoKey) {
    fetchVideoUrl()
  }
  // No URL or key available
  else {
    loading.value = false
  }
})
</script>

<style scoped>
.video-player {
  width: 100%;
  position: relative;
  aspect-ratio: 16/9;
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
}

.video-player video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-player-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #111;
  color: #fff;
}

.video-player-error {
  display: flex;
  width: 100%;
  height: 100%;
  background-color: #1a0505;
  color: #fff;
  padding: 1rem;
}

.video-player-unsupported {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
