<template>
  <div class="video-player">
    <!-- Video player with source when URL is available -->
    <video
      v-if="videoSrc"
      ref="videoElement"
      controls
      preload="metadata"
      :class="className"
      @error="handleVideoError"
      @loadeddata="loading = false"
    >
      <source
        :src="videoSrc"
        :type="contentType"
      >
      Your browser does not support the video tag.
    </video>

    <!-- Loading state -->
    <div
      v-else-if="loading"
      class="video-player-loading"
    >
      <div class="flex items-center space-x-4">
        <USkeleton
          class="h-12 w-12"
          :ui="{ rounded: 'rounded-full' }"
        />
        <div class="space-y-2">
          <USkeleton class="h-4 w-[250px]" />
          <USkeleton class="h-4 w-[200px]" />
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
      <p class="text-red-600 dark:text-red-400 text-center">
        {{ error }}
      </p>
      <UButton
        color="red"
        size="sm"
        class="mt-3"
        @click="fetchVideoUrl"
      >
        {{ $t('retry') || 'Retry' }}
      </UButton>
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
import { ref, onMounted, watch } from 'vue'

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
  }
})

const videoElement = ref(null)
const videoSrc = ref(props.videoUrl)
const loading = ref(true)
const error = ref(null)

// Handle video error events
const handleVideoError = (e) => {
  console.error('Video error event:', e)
  error.value = 'Failed to load video. The file may be corrupted or inaccessible.'
  loading.value = false
}

// Fetch video URL from the server
const fetchVideoUrl = async () => {
  // Reset state
  loading.value = true
  error.value = null
  videoSrc.value = null

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
    }
    else {
      throw new Error('No video URL returned from server')
    }
  }
  catch (err) {
    console.error('Error fetching video URL:', err)
    error.value = err.message || 'Failed to load video'
  }
  finally {
    // If we got a URL, loading will be set to false in the loadeddata event
    // Otherwise, set it to false here
    if (!videoSrc.value) {
      loading.value = false
    }
  }
}

// Watch for changes in props
watch(() => props.videoUrl, (newUrl) => {
  if (newUrl) {
    videoSrc.value = newUrl
    loading.value = false
    error.value = null
  }
  else if (props.videoKey) {
    // If URL is cleared but we have a key, fetch again
    fetchVideoUrl()
  }
  else {
    // No URL and no key
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
</style>
