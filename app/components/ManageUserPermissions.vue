<template>
  <div>
    <h2 class="text-xl font-bold mb-4">
      Commission Access Management
    </h2>

    <!-- Create New Access -->
    <UCard class="mb-6">
      <template #header>
        <h3 class="text-lg font-medium">
          Create New Access Code
        </h3>
      </template>

      <div class="space-y-4">
        <UFormGroup label="Department">
          <USelect
            v-model="newAccess.department"
            :options="departmentOptions"
            placeholder="Select department"
          />
        </UFormGroup>

        <UFormGroup label="Duration (days)">
          <UInput
            v-model="newAccess.durationDays"
            type="number"
            min="1"
            max="30"
          />
        </UFormGroup>

        <UButton
          color="primary"
          :loading="isCreating"
          @click="createAccess"
        >
          Generate Access Code
        </UButton>
      </div>
    </UCard>

    <!-- Success Message -->
    <UAlert
      v-if="createdAccess"
      class="mb-6"
      color="green"
      icon="i-heroicons-check-circle"
      title="Access Code Created"
      :close-button="{ icon: 'i-heroicons-x-mark', color: 'gray', variant: 'ghost' }"
    >
      <div class="mt-2">
        <p><strong>Access Code:</strong> {{ createdAccess.accessCode }}</p>
        <p><strong>Department:</strong> {{ createdAccess.department }}</p>
        <p><strong>Expires:</strong> {{ new Date(createdAccess.expiresAt).toLocaleString() }}</p>
        <div class="mt-3">
          <p class="font-medium">
            Share this URL with commission members:
          </p>
          <div class="flex mt-1 gap-2">
            <UInput
              v-model="createdAccess.url"
              readonly
              class="flex-1"
            />
            <UButton
              icon="i-heroicons-clipboard"
              color="gray"
              @click="copyToClipboard(createdAccess.url)"
            >
              Copy
            </UButton>
          </div>
        </div>
      </div>
    </UAlert>

    <!-- Existing Codes List -->
    <UCard>
      <template #header>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-medium">
            Active Access Codes
          </h3>
          <UButton
            size="sm"
            icon="i-heroicons-arrow-path"
            color="gray"
            @click="fetchAccessCodes"
          >
            Refresh
          </UButton>
        </div>
      </template>

      <UTable
        :rows="accessCodes"
        :columns="columns"
        :loading="isLoading"
      >
        <template #department-data="{ row }">
          {{ row.department }}
        </template>

        <template #accessCode-data="{ row }">
          <div class="font-mono">
            {{ row.accessCode }}
          </div>
        </template>

        <template #expires-data="{ row }">
          <UBadge
            :color="isExpiringSoon(row.expiresAt) ? 'amber' : 'green'"
          >
            {{ new Date(row.expiresAt).toLocaleDateString() }}
          </UBadge>
        </template>

        <template #actions-data="{ row }">
          <div class="flex space-x-2">
            <UButton
              icon="i-heroicons-clipboard-document"
              size="xs"
              color="gray"
              @click="copyToClipboard(`${appUrl}/dashboard/commission?code=${row.accessCode}`)"
            >
              Copy URL
            </UButton>

            <UButton
              icon="i-heroicons-trash"
              size="xs"
              color="red"
              @click="deactivateAccess(row.id)"
            >
              Revoke
            </UButton>
          </div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const appUrl = useRuntimeConfig().public.appUrl || 'http://localhost:3000'
const toast = useToast()

// Department options (replace with your actual departments)
const departmentOptions = [
  'Programų sistemos',
  'Elektronikos inžinerija',
  'Kompiuterių inžinerija',
  'Informacijos sistemos',
  'Programinės įrangos testavimas'
]

// Form data
const newAccess = ref({
  department: '',
  durationDays: 7
})

const createdAccess = ref(null)
const isCreating = ref(false)

// Table data
const isLoading = ref(true)
const accessCodes = ref([])
const columns = [
  { key: 'department', label: 'Department' },
  { key: 'accessCode', label: 'Access Code' },
  { key: 'expires', label: 'Expires' },
  { key: 'actions', label: 'Actions' }
]

// Check if access code expires within 24 hours
function isExpiringSoon(expiresAt: string): boolean {
  const expiresTime = new Date(expiresAt).getTime()
  const now = Date.now()
  const oneDayMs = 24 * 60 * 60 * 1000

  return expiresTime - now < oneDayMs
}

// Copy to clipboard helper
function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  toast.add({
    title: 'Copied!',
    description: 'URL copied to clipboard',
    icon: 'i-heroicons-clipboard-document-check',
    color: 'green',
    timeout: 2000
  })
}

// Create new access code
async function createAccess() {
  if (!newAccess.value.department) {
    toast.add({
      title: 'Error',
      description: 'Please select a department',
      icon: 'i-heroicons-exclamation-triangle',
      color: 'red'
    })
    return
  }

  isCreating.value = true

  try {
    const response = await $fetch('/api/admin/commission-access', {
      method: 'POST',
      body: newAccess.value
    })

    createdAccess.value = response.access

    // Reset form
    newAccess.value = {
      department: '',
      durationDays: 7
    }

    // Refresh list
    fetchAccessCodes()

    toast.add({
      title: 'Success',
      description: 'Access code created successfully',
      icon: 'i-heroicons-check-circle',
      color: 'green'
    })
  }
  catch (error) {
    console.error('Error creating access:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to create access code',
      icon: 'i-heroicons-x-circle',
      color: 'red'
    })
  }
  finally {
    isCreating.value = false
  }
}

// Fetch existing access codes
async function fetchAccessCodes() {
  isLoading.value = true

  try {
    const response = await $fetch('/api/admin/commission-access')
    accessCodes.value = response.accessCodes
  }
  catch (error) {
    console.error('Error fetching access codes:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to load access codes',
      icon: 'i-heroicons-x-circle',
      color: 'red'
    })
  }
  finally {
    isLoading.value = false
  }
}

// Deactivate/revoke access
async function deactivateAccess(id: number) {
  try {
    await $fetch(`/api/admin/commission-access/${id}`, {
      method: 'DELETE'
    })

    // Remove from list or refresh
    fetchAccessCodes()

    toast.add({
      title: 'Success',
      description: 'Access revoked successfully',
      icon: 'i-heroicons-check-circle',
      color: 'green'
    })
  }
  catch (error) {
    console.error('Error revoking access:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to revoke access',
      icon: 'i-heroicons-x-circle',
      color: 'red'
    })
  }
}

// Fetch data on component mount
onMounted(() => {
  fetchAccessCodes()
})
</script>
