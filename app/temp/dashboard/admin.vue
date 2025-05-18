<script setup lang="ts">
import { ManageUserPermissions, ImportYearlyPlannedData, LogsViewer } from '#components'

const { t } = useI18n()

const items = [{
  label: t('import_data'),
  icon: 'i-heroicons-information-circle',
  component: markRaw(ImportYearlyPlannedData)
}, {
  label: t('manage_users'),
  icon: 'i-heroicons-arrow-down-tray',
  component: markRaw(ManageUserPermissions)
}, {
  label: t('logs'),
  icon: 'i-heroicons-document-text',
  component: markRaw(LogsViewer)
}]
</script>

<template>
  <div class="p-4">
    <UTabs
      :items="items"
      :default-index="0"
    >
      <template #item="{ item }">
        <component :is="item.component" />
      </template>
    </UTabs>
  </div>
</template>
