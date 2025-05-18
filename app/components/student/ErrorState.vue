<template>
  <div class="p-4 text-red-500">
    {{ error?.message || errorMessage }}
  </div>
</template>

<script setup lang="ts">
defineProps({
  error: { type: Object, default: null },
  errorMessage: { type: String, default: 'An error occurred' }
})
</script>
