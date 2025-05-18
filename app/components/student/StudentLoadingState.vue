<template>
  <div class="p-6 text-center">
    <UIcon
      name="i-heroicons-arrow-path"
      class="animate-spin h-8 w-8 mx-auto text-gray-400"
    />
    <p class="mt-2 text-sm text-gray-500">
      {{ message }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps({
  message: {
    type: String,
    default: 'Loading...'
  }
})
</script>
