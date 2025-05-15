<!-- components/LogsViewer.vue -->
<template>
  <div class="p-6">
    <UCard>
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold">
            API Logs
          </h2>
          <div class="flex gap-2">
            <UButton
                color="primary"
                icon="i-heroicons-arrow-path"
                :loading="loading"
                @click="fetchLogs"
            >
              Refresh
            </UButton>

            <UPopover>
              <UButton
                  color="red"
                  variant="soft"
              >
                Clear Logs
              </UButton>

              <template #panel>
                <div class="p-4 max-w-xs">
                  <p class="mb-3">
                    Are you sure you want to delete all logs? This action cannot be undone.
                  </p>
                  <div class="flex justify-end gap-2">
                    <UButton
                        variant="ghost"
                        @click="closePopover"
                    >
                      Cancel
                    </UButton>
                    <UButton
                        color="red"
                        @click="clearAllLogs"
                    >
                      Delete All
                    </UButton>
                  </div>
                </div>
              </template>
            </UPopover>
          </div>
        </div>
      </template>

      <!-- Improved Filters -->
      <div class="mb-6 bg-gray-50 p-4 rounded-lg">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-medium text-lg">Filters</h3>
          <UButton size="sm" @click="toggleAdvancedFilters">
            {{ showAdvancedFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters' }}
          </UButton>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                :max="500"
                class="w-full"
            />
          </UFormGroup>
        </div>

        <div v-if="showAdvancedFilters">
          <div class="border-t border-gray-200 pt-4 mt-2">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormGroup label="Client Filter">
                <UInput
                    v-model="clientFilter"
                    placeholder="Filter by client (user-agent)..."
                />
              </UFormGroup>

              <UFormGroup label="Path Filter">
                <UInput
                    v-model="pathFilter"
                    placeholder="Filter by API path..."
                />
              </UFormGroup>

              <UFormGroup label="Request ID Filter">
                <UInput
                    v-model="requestIdFilter"
                    placeholder="Filter by request ID..."
                />
              </UFormGroup>

              <UFormGroup label="Method Filter">
                <USelect
                    v-model="methodFilter"
                    :options="[
                    { label: 'All Methods', value: '' },
                    { label: 'GET', value: 'GET' },
                    { label: 'POST', value: 'POST' },
                    { label: 'PUT', value: 'PUT' },
                    { label: 'DELETE', value: 'DELETE' },
                    { label: 'PATCH', value: 'PATCH' }
                  ]"
                />
              </UFormGroup>
            </div>

            <div class="flex justify-end mt-4">
              <UButton
                  color="primary"
                  @click="applyClientSideFilters"
                  :disabled="loading"
              >
                Apply Filters
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Filters -->
      <div class="mb-4 flex gap-2 flex-wrap">
        <UButton
            size="sm"
            :color="quickFilter === 'all' ? 'primary' : 'gray'"
            @click="setQuickFilter('all')"
        >
          All
        </UButton>
        <UButton
            size="sm"
            :color="quickFilter === 'errors' ? 'red' : 'gray'"
            @click="setQuickFilter('errors')"
        >
          Errors Only
        </UButton>
        <UButton
            size="sm"
            :color="quickFilter === 'warnings' ? 'yellow' : 'gray'"
            @click="setQuickFilter('warnings')"
        >
          Warnings Only
        </UButton>
        <UButton
            size="sm"
            :color="quickFilter === 'info' ? 'blue' : 'gray'"
            @click="setQuickFilter('info')"
        >
          Info Only
        </UButton>
        <UButton
            size="sm"
            :color="quickFilter === 'debug' ? 'gray' : 'gray'"
            @click="setQuickFilter('debug')"
        >
          Debug Only
        </UButton>
      </div>

      <!-- Logs Table -->
      <UTable
          :rows="filteredLogs"
          :columns="columns"
          :loading="loading"
          :ui="{
          td: {
            base: 'p-2 align-middle [&:has([role=button])]:p-0'
          }
        }"
      >
        <template #empty-state>
          <div class="flex flex-col items-center justify-center py-6">
            <UIcon
                name="i-heroicons-document-text"
                class="text-gray-400 mb-2"
                size="xl"
            />
            <p>No logs found{{ activeFilters ? ' matching the current filters' : '' }}</p>
          </div>
        </template>

        <!-- Time column -->
        <template #timestamp-data="{ row }">
          <div class="flex flex-col">
            <span>{{ formatDate(row.timestamp) }}</span>
            <span class="text-xs text-gray-500">{{ formatTime(row.timestamp) }}</span>
          </div>
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

        <!-- Request ID column with copy button -->
        <template #requestId-data="{ row }">
          <div class="flex items-center gap-1">
            <span class="font-mono text-xs truncate max-w-32">{{ row.requestId }}</span>
            <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-clipboard"
                size="xs"
                @click="copyToClipboard(row.requestId)"
                :title="'Copy request ID: ' + row.requestId"
            />
            <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-funnel"
                size="xs"
                @click="setRequestIdFilter(row.requestId)"
                title="Filter by this request ID"
            />
          </div>
        </template>

        <!-- Path column -->
        <template #path-data="{ row }">
          <div class="flex items-center">
            <span class="truncate max-w-48">{{ row.path }}</span>
            <UButton
                v-if="row.method"
                :color="getMethodColor(row.method)"
                size="xs"
                class="ml-1"
            >
              {{ row.method }}
            </UButton>
          </div>
        </template>

        <!-- Message column -->
        <template #message-data="{ row }">
          <div class="flex items-center justify-between">
            <span class="truncate max-w-full">{{ row.message }}</span>
            <UButton
                v-if="!row.expanded"
                color="gray"
                variant="ghost"
                icon="i-heroicons-chevron-down"
                size="xs"
                @click="expandRow(row)"
            />
            <UButton
                v-else
                color="gray"
                variant="ghost"
                icon="i-heroicons-chevron-up"
                size="xs"
                @click="collapseRow(row)"
            />
          </div>
        </template>

        <!-- Data column -->
        <template #data-data="{ row }">
          <div v-if="!row.expanded && row.data" class="flex items-center justify-between">
            <div class="cursor-pointer" @click="expandRow(row)">
              <UBadge color="gray" size="sm">View Data</UBadge>
            </div>
          </div>
          <pre v-else-if="row.data" class="text-xs font-mono whitespace-pre-wrap bg-gray-50 p-2 rounded-md overflow-auto max-h-64">{{ formatData(row.data) }}</pre>
          <span v-else class="text-gray-400 text-xs">No data</span>
        </template>

        <!-- Row expansion -->
        <template #expanded-row="{ row }">
          <div class="p-4 bg-gray-50">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p class="font-medium mb-1">Request ID:</p>
                <p class="font-mono text-sm">{{ row.requestId }}</p>
              </div>
              <div>
                <p class="font-medium mb-1">Time:</p>
                <p>{{ formatDateTime(row.timestamp) }}</p>
              </div>
              <div>
                <p class="font-medium mb-1">Path:</p>
                <p>{{ row.path }}</p>
              </div>
              <div>
                <p class="font-medium mb-1">Method:</p>
                <p>{{ row.method }}</p>
              </div>
            </div>

            <div class="mb-4">
              <p class="font-medium mb-1">Message:</p>
              <p>{{ row.message }}</p>
            </div>

            <div v-if="row.data">
              <p class="font-medium mb-1">Data:</p>
              <pre class="text-xs font-mono whitespace-pre-wrap bg-white p-3 rounded-md border overflow-x-auto max-h-96">{{ formatData(row.data) }}</pre>
            </div>

            <div class="mt-4 flex gap-2">
              <UButton
                  size="sm"
                  color="gray"
                  @click="copyLogEntry(row)"
                  icon="i-heroicons-clipboard-document"
              >
                Copy Log Entry
              </UButton>
              <UButton
                  size="sm"
                  color="blue"
                  @click="setRequestIdFilter(row.requestId)"
                  icon="i-heroicons-funnel"
              >
                Filter by Request ID
              </UButton>
            </div>
          </div>
        </template>
      </UTable>

      <template #footer>
        <div class="flex justify-between items-center">
          <span class="text-sm text-gray-500">
            Showing {{ filteredLogs.length ? ((page - 1) * limit) + 1 : 0 }} - {{ Math.min(page * limit, totalLogs) }} of {{ totalLogs || 0 }} logs
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
import { ref, computed, watch, onMounted } from 'vue'

// Basic state
const level = ref('all')
const limit = ref(100)
const page = ref(1)
const logs = ref([])
const totalLogs = ref(0)
const totalPages = ref(1)
const loading = ref(false)
const toast = useToast()

// Advanced filters UI state
const showAdvancedFilters = ref(false)

// Client-side filters (not sent to the API)
const clientFilter = ref('')
const pathFilter = ref('')
const requestIdFilter = ref('')
const methodFilter = ref('')
const quickFilter = ref('all')

// A computed property to track if any filters are active
const activeFilters = computed(() => {
  return clientFilter.value || pathFilter.value || requestIdFilter.value || methodFilter.value
})

// Filtered logs (client-side filtering)
const filteredLogs = computed(() => {
  if (!activeFilters.value) {
    return logs.value
  }

  return logs.value.filter(log => {
    // Apply client filter (for user-agent)
    if (clientFilter.value && log.data?.headers) {
      const userAgent = log.data.headers['user-agent']
      if (!userAgent || !userAgent.toLowerCase().includes(clientFilter.value.toLowerCase())) {
        return false
      }
    }

    // Apply path filter
    if (pathFilter.value && !log.path?.toLowerCase().includes(pathFilter.value.toLowerCase())) {
      return false
    }

    // Apply request ID filter
    if (requestIdFilter.value && log.requestId !== requestIdFilter.value) {
      return false
    }

    // Apply method filter
    if (methodFilter.value && log.method !== methodFilter.value) {
      return false
    }

    return true
  })
})

// Table configuration
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

// Helper functions
function getLevelColor(logLevel) {
  switch (logLevel) {
    case 'error': return 'red'
    case 'warn': return 'yellow'
    case 'debug': return 'gray'
    case 'info': return 'blue'
    default: return 'gray'
  }
}

function getMethodColor(method) {
  switch (method?.toUpperCase()) {
    case 'GET': return 'green'
    case 'POST': return 'blue'
    case 'PUT': return 'yellow'
    case 'DELETE': return 'red'
    case 'PATCH': return 'purple'
    default: return 'gray'
  }
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleDateString()
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString()
}

function formatDateTime(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString()
}

function formatData(data) {
  if (!data) return ''
  try {
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  } catch (e) {
    return '[Error formatting data]'
  }
}

// Row expansion functionality
function expandRow(row) {
  row.expanded = true
}

function collapseRow(row) {
  row.expanded = false
}

// Filter functionality
function toggleAdvancedFilters() {
  showAdvancedFilters.value = !showAdvancedFilters.value
}

function applyClientSideFilters() {
  // No need to fetch from server, just apply the client side filters
  // This will trigger the filteredLogs computed property
  toast.add({
    title: 'Filters Applied',
    description: 'Client-side filters have been applied',
    timeout: 2000
  })
}

function resetFilters() {
  level.value = 'all'
  clientFilter.value = ''
  pathFilter.value = ''
  requestIdFilter.value = ''
  methodFilter.value = ''
  quickFilter.value = 'all'
  showAdvancedFilters.value = false
  page.value = 1
  fetchLogs()
}

function setQuickFilter(filter) {
  quickFilter.value = filter

  // Reset client-side filters
  clientFilter.value = ''
  pathFilter.value = ''
  requestIdFilter.value = ''
  methodFilter.value = ''

  // Set the level based on the quick filter
  switch (filter) {
    case 'errors':
      level.value = 'error'
      break
    case 'warnings':
      level.value = 'warn'
      break
    case 'info':
      level.value = 'info'
      break
    case 'debug':
      level.value = 'debug'
      break
    default:
      // 'all' - reset level
      level.value = 'all'
      break
  }

  // Fetch logs with new level filter
  page.value = 1
  fetchLogs()
}

function setRequestIdFilter(requestId) {
  // Set request ID filter
  requestIdFilter.value = requestId

  // Show advanced filters if they're hidden
  showAdvancedFilters.value = true

  // Apply the filter
  applyClientSideFilters()

  toast.add({
    title: 'Filter Applied',
    description: `Showing logs for request ID: ${requestId}`,
    timeout: 3000
  })
}

// Clipboard functionality
function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
  toast.add({
    title: 'Copied to clipboard',
    description: 'Text copied to clipboard successfully',
    timeout: 2000
  })
}

function copyLogEntry(log) {
  const logText = JSON.stringify(log, null, 2)
  navigator.clipboard.writeText(logText)
  toast.add({
    title: 'Copied to clipboard',
    description: 'Log entry copied to clipboard successfully',
    timeout: 2000
  })
}

// Main data fetching
async function fetchLogs() {
  loading.value = true
  try {
    // Only use the server-side filters (level, limit, page)
    const params = {
      level: level.value,
      limit: parseInt(limit.value),
      page: page.value
    }

    const response = await $fetch('/api/admin/logs', { params })

    // Add expanded property to each log
    logs.value = (response.logs || []).map(log => ({
      ...log,
      expanded: false
    }))

    totalLogs.value = response.total || 0
    totalPages.value = response.pages || 1
  }
  catch (error) {
    console.error('Failed to fetch logs:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to fetch logs',
      color: 'red'
    })
  }
  finally {
    loading.value = false
  }
}

// Clear logs functionality
async function clearAllLogs() {
  try {
    await $fetch('/api/admin/clear-logs?confirm=true')

    // Refresh logs after clearing
    logs.value = []
    totalLogs.value = 0
    totalPages.value = 1

    toast.add({
      title: 'Success',
      description: 'All logs have been cleared',
      color: 'green'
    })
    // Close the popover
    closePopover()
  }
  catch (error) {
    console.error('Failed to clear logs:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to clear logs',
      color: 'red'
    })
  }
}

// Popover control
const popoverRef = ref(null)
function closePopover() {
  popoverRef.value?.close()
}

// Watchers and lifecycle hooks
watch([level, limit], () => {
  page.value = 1
  fetchLogs()
})

onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.max-h-64 {
  max-height: 16rem;
}

.max-h-96 {
  max-height: 24rem;
}

.max-w-32 {
  max-width: 8rem;
}

.max-w-48 {
  max-width: 12rem;
}
</style>