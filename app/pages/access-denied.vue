<!-- pages/access-denied.vue -->
<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4">
    <UCard class="max-w-md w-full">
      <template #header>
        <div class="flex items-center">
          <UIcon
            name="i-heroicons-shield-exclamation"
            class="text-red-500 w-6 h-6 mr-2"
          />
          <h1 class="text-xl font-semibold">
            {{ $t('access_denied') }}
          </h1>
        </div>
      </template>

      <div class="p-4">
        <p class="mb-4">
          {{ messageText }}
        </p>
        <p class="text-sm text-gray-600 mb-6">
          {{ $t('contact_admin_for_access') }}
        </p>

        <div class="flex justify-between">
          <UButton
            color="gray"
            @click="goToDashboard"
          >
            {{ $t('go_to_dashboard') }}
          </UButton>

          <UButton
            color="primary"
            @click="navigateTo('/login')"
          >
            {{ $t('login_as_different_user') }}
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup>
const route = useRoute()
const authStore = useAuthStore()
const { t } = useI18n()

// Determine the appropriate message based on the reason or path
const messageText = computed(() => {
  // Check if we have a specific reason in the query
  const reason = route.query.reason || ''
  const fromPath = route.query.from || ''

  if (reason === 'department_access' || fromPath.includes('/department')) {
    return t('department_access_required')
  }
  else if (reason === 'teacher_access' || fromPath.includes('/supervisor')) {
    return t('teacher_access_required')
  }
  else if (reason === 'reviewer_access' || fromPath.includes('/reviewer')) {
    return t('reviewer_access_required')
  }
  else if (reason === 'student_access' || fromPath.includes('/student')) {
    return t('student_access_required')
  }
  else if (reason === 'commission_access' || fromPath.includes('/commission')) {
    return t('commission_access_required')
  }
  else if (reason === 'admin_access' || fromPath.includes('/admin')) {
    return t('admin_access_required')
  }

  // Default message
  return t('insufficient_permissions')
})

// Check if the user can go to dashboard, otherwise go to login
const goToDashboard = () => {
  if (authStore.isAuthenticated) {
    navigateTo('/dashboard')
  }
  else {
    navigateTo('/login')
  }
}
</script>
