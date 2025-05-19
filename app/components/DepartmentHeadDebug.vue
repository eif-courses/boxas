<!-- DepartmentHeadDebug.vue -->
<template>
  <div>
    <!-- Debug panel - only shown when enabled -->
    <Teleport
      v-if="debugMode"
      to="body"
    >
      <div class="fixed bottom-0 right-0 p-4 bg-white border border-gray-300 shadow-lg w-96 z-50 text-black overflow-auto max-h-[80vh]">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold text-lg">
            Auth Debug
          </h3>
          <UButton
            icon="i-heroicons-x-mark"
            size="xs"
            color="gray"
            variant="ghost"
            @click="debugMode = false"
          />
        </div>

        <div class="text-xs">
          <div class="mb-3">
            <div class="font-bold">
              Authentication:
            </div>
            <div class="pl-2">
              <div>Is Authenticated: {{ authStore.isAuthenticated }}</div>
              <div>Is Ready: {{ authStore.isReady }}</div>
              <div>Is Initialized: {{ authStore.isInitialized }}</div>
              <div>Email: {{ authStore.user?.email || 'none' }}</div>
            </div>
          </div>

          <div class="mb-3">
            <div class="font-bold">
              Department Head Info:
            </div>
            <div class="pl-2">
              <div>Is Department Head: {{ authStore.user?.isDepartmentHead || false }}</div>
              <div>Has Department Info: {{ !!authStore.user?.departmentInfo }}</div>
              <div>Department: {{ authStore.user?.departmentInfo?.department || 'N/A' }}</div>
              <div>Role: {{ authStore.user?.role || 'none' }}</div>
            </div>
          </div>

          <div class="mb-3">
            <div class="font-bold">
              Local Storage:
            </div>
            <div class="pl-2">
              <div>Has Stored Data: {{ hasStoredData }}</div>
              <div
                v-if="hasStoredData"
                class="whitespace-pre text-xxs"
              >
                {{ JSON.stringify(storedData, null, 2) }}
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 flex flex-col gap-2">
          <UButton
            size="sm"
            color="blue"
            :loading="checkingDeptHead"
            @click="checkDepartmentHead"
          >
            Check Department Head API
          </UButton>
          <UButton
            size="sm"
            color="green"
            :loading="refreshingUser"
            @click="refreshUser"
          >
            Refresh User Data
          </UButton>
          <UButton
            size="sm"
            color="red"
            @click="clearStoredData"
          >
            Clear Stored Department Data
          </UButton>
        </div>
      </div>
    </Teleport>

    <!-- Debug toggle button - always visible if enabled -->
    <UButton
      v-if="isDevMode && !debugMode"
      size="xs"
      variant="ghost"
      color="gray"
      icon="i-heroicons-bug-ant"
      class="fixed bottom-4 right-4 opacity-50 hover:opacity-100 z-50"
      @click="debugMode = true"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Determine if we're in dev mode
const isDevMode = ref(false)
onMounted(() => {
  // Check for dev mode or debug flag in URL
  isDevMode.value = process.env.NODE_ENV === 'development'
    || window.location.search.includes('debug=true')
})

// Debug state
const debugMode = ref(false)
const checkingDeptHead = ref(false)
const refreshingUser = ref(false)
const authStore = useAuthStore()
const toast = useToast()

// Get stored data for display
const storedData = computed(() => {
  try {
    const data = localStorage.getItem('department_head_data')
    return data ? JSON.parse(data) : null
  }
  catch (e) {
    return null
  }
})

const hasStoredData = computed(() => !!storedData.value)

// Debug functions
async function checkDepartmentHead() {
  checkingDeptHead.value = true
  try {
    const result = await authStore.checkDepartmentHeadStatus(true) // Force API call
    toast.info(`Department head check: ${result ? 'Access granted' : 'Access denied'}`)
  }
  catch (error) {
    console.error('Department head check error:', error)
    toast.error('Department head check failed')
  }
  finally {
    checkingDeptHead.value = false
  }
}

async function refreshUser() {
  refreshingUser.value = true
  try {
    await authStore.refreshUser()
    toast.success('User refreshed')
  }
  catch (error) {
    console.error('User refresh error:', error)
    toast.error('User refresh failed')
  }
  finally {
    refreshingUser.value = false
  }
}

function clearStoredData() {
  localStorage.removeItem('department_head_data')
  toast.warning('Department head data cleared from storage')
}

// Enable debug mode if URL has ?debug=true
onMounted(() => {
  if (window.location.search.includes('debug=true')) {
    debugMode.value = true
  }
})
</script>

<style scoped>
.text-xxs {
  font-size: 0.625rem;
}
</style>
