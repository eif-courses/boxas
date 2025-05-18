<template>
  <div class="flex items-center gap-2 justify-center">
    <div>
      <PreviewSupervisorReport
        v-if="hasReport"
        :document-data="reportData"
        :form-variant="formVariant"
        :button-label="$t('view')"
        :modal-title="$t('supervisor_report')"
        @close="$emit('close')"
      />

      <EditSupervisorReportForm
        v-else
        :initial-data="initialFormData"
        :form-variant="formVariant"
        :button-label="$t('fill')"
        @save="(data) => $emit('save', row.student?.id, data)"
        @close="$emit('close')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUnixDateUtils } from '~/composables/useUnixDateUtils'

const props = defineProps({
  row: { type: Object, required: true },
  userName: { type: String, default: '' },
  formVariant: { type: String, required: true }
})

const emit = defineEmits(['save', 'close'])

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
    SUPER: report.supervisorName ?? 'N/A Supervisor',
    POS: report.supervisorPosition ?? 'N/A Position',
    DATE: formatUnixDate(report.createdDate),
    PASS: report?.isPassOrFailed ?? 0
  }
})

const initialFormData = computed(() => {
  return {
    studentRecordId: props.row.student?.id,
    DEPT: props.row.student?.department ? props.row.student.department : 'N/A Katedra',
    PROGRAM: props.row.student?.studyProgram ?? 'N/A',
    CODE: props.row.student?.programCode ?? 'N/A',
    NAME: `${props.row.student?.studentName ?? ''} ${props.row.student?.studentLastname ?? ''}`.trim(),
    TITLE: props.row.student?.finalProjectTitle ?? 'N/A',
    SUPER: props.userName ?? 'N/A',
    EXPL: '',
    OM: 0,
    SSM: 0,
    STUM: 0,
    JM: 0,
    WORK: 'Vilniaus kolegija Elektronikos ir informatikos fakultetas',
    POS: '',
    PASS: 1,
    DATE: new Date().toDateString().toString()
  }
})
</script>
