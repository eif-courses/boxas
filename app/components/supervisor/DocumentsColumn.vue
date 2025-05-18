<template>
  <div class="flex items-center gap-1">
    <UButton
      v-if="hasVideo"
      icon="i-heroicons-video-camera"
      size="xs"
      color="white"
      variant="solid"
      :trailing="false"
      class="p-1 text-xs min-w-0"
      @click="$emit('open-video', row.videos[0], row.student)"
    />

    <template
      v-for="doc in row.documents || []"
      :key="doc.id"
    >
      <UButton
        :loading="loading"
        :icon="doc.documentType === 'PDF' ? 'i-heroicons-document-text' : 'i-heroicons-code-bracket-square'"
        size="xs"
        color="white"
        variant="solid"
        :trailing="false"
        class="p-1 text-xs min-w-0"
        @click="$emit('open-document', doc)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  row: { type: Object, required: true },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['open-video', 'open-document'])

const hasVideo = computed(() => {
  return props.row.videos && props.row.videos.length > 0
})
</script>
