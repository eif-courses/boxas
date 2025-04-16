<template>
  <div class="space-y-6">
    <h2 class="text-xl font-semibold">
      {{ $t('versions.title') }}
    </h2>

    <p
      v-if="!versions.length"
      class="text-center text-gray-500 py-6"
    >
      {{ $t('versions.empty') }}
    </p>

    <UTable
      v-else
      :rows="versions"
      :columns="columns"
      hover
      @select="onVersionSelect"
    >
      <template #version-cell="{ row }">
        <div class="flex items-center gap-2">
          <UBadge
            v-if="row.createdBy === 'student'"
            color="green"
          >
            {{ $t('role.student') }}
          </UBadge>
          <UBadge
            v-else
            color="blue"
          >
            {{ $t('role.supervisor') }}
          </UBadge>
          <span class="font-semibold">#{{ row.id }}</span>
        </div>
      </template>

      <template #date-cell="{ row }">
        <div>
          {{ formatDate(row.createdDate) }}
        </div>
      </template>

      <template #comment-cell="{ row }">
        <div class="max-w-md truncate">
          {{ row.comment || $t('versions.noComment') }}
        </div>
      </template>

      <template #actions-cell="{ row }">
        <UTooltip :text="$t('versions.viewThisVersion')">
          <UButton
            color="primary"
            variant="ghost"
            icon="i-heroicons-eye"
            size="sm"
            @click="selectVersion(row)"
          />
        </UTooltip>
        <UTooltip :text="$t('versions.compareWithCurrent')">
          <UButton
            color="info"
            variant="ghost"
            icon="i-heroicons-arrows-right-left"
            size="sm"
            @click="compareVersion(row)"
          />
        </UTooltip>
      </template>
    </UTable>

    <!-- Version Diff Modal -->
    <UModal
      v-model="showDiffModal"
      :title="$t('versions.comparing')"
    >
      <div class="space-y-4">
        <div class="mb-4 p-3 bg-gray-50 rounded-lg">
          <p class="font-medium">
            {{ $t('versions.versionInfo') }}
          </p>
          <div class="mt-2 text-sm grid grid-cols-2 gap-4">
            <div>
              <span class="text-gray-500">{{ $t('versions.versionDate') }}:</span>
              {{ selectedVersion ? formatDate(selectedVersion.createdDate) : '' }}
            </div>
            <div>
              <span class="text-gray-500">{{ $t('versions.createdBy') }}:</span>
              <UBadge
                v-if="selectedVersion?.createdBy === 'student'"
                color="green"
                size="sm"
              >
                {{ $t('role.student') }}
              </UBadge>
              <UBadge
                v-else-if="selectedVersion"
                color="blue"
                size="sm"
              >
                {{ $t('role.supervisor') }}
              </UBadge>
            </div>
            <div class="col-span-2">
              <span class="text-gray-500">{{ $t('versions.versionComment') }}:</span>
              {{ selectedVersion?.comment || $t('versions.noComment') }}
            </div>
          </div>
        </div>

        <div
          v-for="(diff, field) in versionDiffs"
          :key="field"
          class="border rounded-lg overflow-hidden"
        >
          <div class="bg-gray-100 px-4 py-2 font-medium">
            {{ getFieldLabel(field) }}
          </div>
          <div class="p-4">
            <div
              v-if="diff.previous !== diff.current"
              class="grid grid-cols-2 gap-4"
            >
              <div>
                <p class="text-sm text-gray-500 mb-1">
                  {{ $t('versions.previous') }}
                </p>
                <div class="bg-red-50 p-2 rounded whitespace-pre-wrap">
                  {{ diff.previous || $t('versions.empty') }}
                </div>
              </div>
              <div>
                <p class="text-sm text-gray-500 mb-1">
                  {{ $t('versions.current') }}
                </p>
                <div class="bg-green-50 p-2 rounded whitespace-pre-wrap">
                  {{ diff.current || $t('versions.empty') }}
                </div>
              </div>
            </div>
            <div
              v-else
              class="text-gray-500 italic"
            >
              {{ $t('versions.noChanges') }}
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-between w-full">
          <UButton
            color="gray"
            @click="showDiffModal = false"
          >
            {{ $t('versions.close') }}
          </UButton>
          <UButton
            color="primary"
            @click="loadSelectedVersion"
          >
            {{ $t('versions.loadThisVersion') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps({
  assignmentId: {
    type: [String, Number],
    required: true
  },
  versions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['version-selected'])

const showDiffModal = ref(false)
const selectedVersion = ref(null)
const currentVersion = ref(null)
const versionDiffs = ref({})

// Table configuration
const columns = ref([
  {
    key: 'version',
    label: t('versions.versionNumber'),
    sortable: false
  },
  {
    key: 'date',
    label: t('versions.date'),
    sortable: true
  },
  {
    key: 'comment',
    label: t('versions.comment'),
    sortable: false
  },
  {
    key: 'actions',
    label: t('versions.actions'),
    sortable: false
  }
])

// Format date
const formatDate = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleString()
}

// Field labels
const fieldLabels = {
  finalProjectTitle: t('assignment.finalProjectTitle') + ' (LT)',
  finalProjectTitleEn: t('assignment.finalProjectTitle') + ' (EN)',
  objective: t('assignment.objective') + ' (LT)',
  objectiveEn: t('assignment.objective') + ' (EN)',
  tasks: t('assignment.tasks') + ' (LT)',
  tasksEn: t('assignment.tasks') + ' (EN)',
  tools: t('assignment.tools') + ' (LT)',
  toolsEn: t('assignment.tools') + ' (EN)'
}

// Get field label
const getFieldLabel = (field) => {
  return fieldLabels[field] || field
}

// Select a version to view
const selectVersion = (version) => {
  try {
    const versionData = JSON.parse(version.versionData)
    emit('version-selected', version.versionData)

    useToast().add({
      title: t('success.title'),
      description: t('versions.versionLoaded'),
      color: 'green'
    })
  }
  catch (error) {
    useToast().add({
      title: t('error.title'),
      description: t('error.parseVersion'),
      color: 'red'
    })
    console.error('Error parsing version data:', error)
  }
}

// Compare a version with current
const compareVersion = (version) => {
  selectedVersion.value = version

  // Get current version (latest one)
  currentVersion.value = props.versions[0]

  try {
    const prevData = JSON.parse(version.versionData)
    const currData = props.versions[0] ? JSON.parse(props.versions[0].versionData) : {}

    // Build diff object
    versionDiffs.value = {}

    // Fields to compare
    const fieldsToCompare = [
      'finalProjectTitle',
      'finalProjectTitleEn',
      'objective',
      'objectiveEn',
      'tasks',
      'tasksEn',
      'tools',
      'toolsEn'
    ]

    fieldsToCompare.forEach((field) => {
      versionDiffs.value[field] = {
        previous: prevData[field],
        current: currData[field]
      }
    })

    showDiffModal.value = true
  }
  catch (error) {
    useToast().add({
      title: t('error.title'),
      description: t('error.compareVersions'),
      color: 'red'
    })
    console.error('Error comparing versions:', error)
  }
}

// Load the currently selected version
const loadSelectedVersion = () => {
  if (selectedVersion.value) {
    selectVersion(selectedVersion.value)
    showDiffModal.value = false
  }
}

// Handle row selection
const onVersionSelect = (row) => {
  selectVersion(row)
}

// Watch for changes in the versions prop to update table columns with translated labels
watch(() => t('versions.versionNumber'), () => {
  columns.value = [
    {
      key: 'version',
      label: t('versions.versionNumber'),
      sortable: false
    },
    {
      key: 'date',
      label: t('versions.date'),
      sortable: true
    },
    {
      key: 'comment',
      label: t('versions.comment'),
      sortable: false
    },
    {
      key: 'actions',
      label: t('versions.actions'),
      sortable: false
    }
  ]
})
</script>
