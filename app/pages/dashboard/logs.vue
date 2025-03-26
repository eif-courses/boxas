<template>
  <div class="p-6">
    <UCard>
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold">
            API Logs
          </h2>
          <UButton
            color="primary"
            icon="i-heroicons-arrow-path"
            :loading="loading"
            @click="fetchLogs"
          >
            Refresh
          </UButton>
        </div>
      </template>

      <!-- Filters -->
      <div class="mb-6 flex flex-wrap gap-4">
        <UFormGroup label="Log Level">
          <USelect
            v-model="level"
            :options="[
              { label: 'All Levels', value: 'all' },
              { label: 'Info', value: 'info' },
              { label: 'Warning', value: 'warn' },
              { label: 'Error', value: 'error' },
              { label: 'Debug', value: 'debug' }
            ]"
          />
        </UFormGroup>

        <UFormGroup label="Entries per page">
          <UInput
            v-model="limit"
            type="number"
            :min="10"
            :max="100"
            class="w-24"
          />
        </UFormGroup>
      </div>

      <!-- Logs Table -->
      <UTable
        :rows="logs"
        :columns="columns"
        :loading="loading"
      >
        <template #empty-state>
          <div class="flex flex-col items-center justify-center py-6">
            <UIcon
              name="i-heroicons-document-text"
              class="text-gray-400 mb-2"
              size="xl"
            />
            <p>No logs found</p>
          </div>
        </template>

        <!-- Time column -->
        <template #timestamp-data="{ row }">
          {{ formatDate(row.timestamp) }}
        </template>

        <!-- Level column -->
        <template #level-data="{ row }">
          <UBadge
            :color="getLevelColor(row.level)"
            variant="subtle"
            size="sm"
          >
            {{ row.level }}
          </UBadge>
        </template>

        <!-- Data column -->
        <template #data-data="{ row }">
          <pre class="text-xs font-mono whitespace-pre-wrap bg-gray-50 p-2 rounded-md">{{ JSON.stringify(row.data, null, 2) }}</pre>
        </template>
      </UTable>

      <template #footer>
        <div class="flex justify-between items-center">
          <span class="text-sm text-gray-500">
            Page {{ page }} of {{ totalPages || 1 }}
          </span>
          <UPagination
            v-model="page"
            :total="totalLogs"
            :page-count="totalPages"
            :per-page="limit"
            :ui="{ wrapper: 'flex gap-1' }"
            @change="fetchLogs"
          />
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup>
const level = ref('all')
const limit = ref(25)
const page = ref(1)
const logs = ref([])
const totalLogs = ref(0)
const totalPages = ref(1)
const loading = ref(false)

const columns = [
  {
    key: 'timestamp',
    label: 'Time',
    sortable: true
  },
  {
    key: 'level',
    label: 'Level',
    sortable: true
  },
  {
    key: 'requestId',
    label: 'Request ID'
  },
  {
    key: 'path',
    label: 'Path'
  },
  {
    key: 'message',
    label: 'Message'
  },
  {
    key: 'data',
    label: 'Data'
  }
]

function getLevelColor(logLevel) {
  switch (logLevel) {
    case 'error': return 'red'
    case 'warn': return 'yellow'
    case 'debug': return 'gray'
    case 'info': return 'blue'
    default: return 'gray'
  }
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString()
}

async function fetchLogs() {
  loading.value = true
  try {
    const response = await $fetch('/api/admin/logs', {
      params: {
        level: level.value,
        limit: limit.value,
        page: page.value
      }
    })

    logs.value = response.logs
    totalLogs.value = response.total
    totalPages.value = response.pages
  }
  catch (error) {
    console.error('Failed to fetch logs:', error)
    UToast.error({
      title: 'Error',
      description: 'Failed to fetch logs'
    })
  }
  finally {
    loading.value = false
  }
}

// Refetch logs when filters change
watch([level, limit], () => {
  page.value = 1
  fetchLogs()
})

onMounted(() => {
  fetchLogs()
})
</script>
