<template>
  <div>
    <div class="truncate text-xs mb-1">
      {{ row.student.supervisorEmail }}
    </div>
    <template v-if="hasReport">
      <div>
        <PreviewSupervisorReport
          :document-data="reportData"
          :button-label="$t('view')"
          :form-variant="formVariant"
          :modal-title="$t('supervisor_report')"
        />
      </div>
    </template>
    <template v-else>
      <div class="flex gap-1 justify-left items-center">
        <UIcon
          name="i-heroicons-clock"
          class="w-4 h-4 text-yellow-500"
        />
        <span class="text-xs">{{ $t('not_filled') }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useUnixDateUtils } from '~/composables/useUnixDateUtils'

const props = defineProps({
  row: { type: Object, required: true },
  formVariant: { type: String, required: true }
})

const { formatUnixDate, formatUnixDateTime } = useUnixDateUtils()

const hasReport = computed(() => {
  return props.row.supervisorReports && props.row.supervisorReports.length > 0
})

const reportData = computed(() => {
  if (!hasReport.value) return {}

  const report = props.row.supervisorReports[0]

  return {
    NAME: props.row.student?.studentName + ' ' + props.row.student?.studentLastname,
    PROGRAM: props.row.student?.studyProgram ?? 'N/A',
    CODE: props.row.student?.programCode ?? 'N/A',
    TITLE: props.row.student?.finalProjectTitle ?? 'N/A',
    DEPT: props.row.student?.department ?? 'Elektronikos ir informatikos fakultetas',
    WORK: props.row.student?.supervisorWorkplace ?? 'Vilniaus kolegija Elektronikos ir informatikos fakultetas',
    EXPL: report.supervisorComments ?? '',
    OM: report.otherMatch ?? 0,
    SSM: report.oneMatch ?? 0,
    STUM: report.ownMatch ?? 0,
    JM: report.joinMatch ?? 0,
    createdDate: formatUnixDateTime(report.createdDate),
    PASS: report.isPassOrFailed ?? 1,
    SUPER: report.supervisorName ?? 'N/A Supervisor',
    POS: report.supervisorPosition ?? 'N/A Position',
    DATE: formatUnixDate(report.createdDate)
  }
})
</script>
