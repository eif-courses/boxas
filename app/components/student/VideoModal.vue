<template>
  <UModal
    v-model="isOpen"
    :prevent-close="preventClose"
  >
    <UCard
      :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }"
      class="w-full max-w-6xl"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
            {{ student?.studentGroup }}, {{ student?.studentName }}
            {{ $t('video_presentation') }}
          </h3>
          <UButton
            color="gray"
            variant="ghost"
            icon="i-heroicons-x-mark-20-solid"
            class="ml-4"
            @click="closeModal"
          />
        </div>
      </template>

      <div class="p-4">
        <div class="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
          <VideoPlayer
            v-if="video?.key"
            :video-key="video?.key"
            :content-type="video?.contentType"
            class="w-full h-full object-contain"
          />
          <video
            v-else-if="video?.url"
            controls
            class="w-full h-full object-contain"
            :src="video?.url"
          />
          <div
            v-else
            class="flex items-center justify-center h-full"
          >
            <p class="text-gray-500">
              {{ $t('video_not_available') }}
            </p>
          </div>
        </div>
        <div class="mt-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ $t('uploaded_on') }}: {{ formatDate(video?.createdAt) }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ $t('file_name') }}: {{ video?.filename }}
          </p>
        </div>
      </div>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
import { useDocumentHandling } from '~/composables/useDocumentHandling'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  video: { type: Object, default: null },
  student: { type: Object, default: null },
  preventClose: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const { formatDate } = useDocumentHandling()

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const closeModal = () => {
  isOpen.value = false
}
</script>
