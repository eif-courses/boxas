<!-- pages/error.vue -->
<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4">
    <UCard class="max-w-md w-full">
      <template #header>
        <div class="flex items-center">
          <UIcon
            name="i-heroicons-exclamation-triangle"
            class="text-red-500 w-6 h-6 mr-2"
          />
          <h1 class="text-xl font-semibold">
            {{ $t('error_occurred') }}
          </h1>
        </div>
      </template>

      <div class="p-4">
        <p class="mb-4">
          {{ errorMessage || $t('general_error_message') }}
        </p>

        <div class="flex justify-between">
          <UButton
            color="gray"
            @click="goBack"
          >
            {{ $t('go_back') }}
          </UButton>

          <UButton
            color="primary"
            @click="navigateTo('/dashboard')"
          >
            {{ $t('go_to_dashboard') }}
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup>
const route = useRoute()
const errorMessage = computed(() => route.query.message || null)

const goBack = () => {
  window.history.length > 1 ? window.history.back() : navigateTo('/dashboard')
}
</script>
