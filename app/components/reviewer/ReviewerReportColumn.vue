<template>
  <div class="flex items-center gap-2 justify-center">
    <template v-if="hasReport">
      <div v-if="reviewData">
        <PreviewReviewerReport
          :review-data="reviewData"
          :form-variant="formVariant"
          :button-label="$t('view')"
        />
      </div>
    </template>
    <template v-else>
      <div v-if="initialData">
        <EditReviewerReportForm
          :form-variant="formVariant"
          :initial-data="initialFormData"
          @save="(data) => $emit('save', row.student.id, data)"
        />
        <p
          v-if="isSaving"
          class="text-xs text-gray-500 mt-1"
        >
          {{ $t('saving') }}...
        </p>
      </div>
      <div
        v-else
        class="text-xs text-gray-500"
      >
        {{ $t('loading_data') }}...
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  row: { type: Object, required: true },
  formVariant: { type: String, required: true },
  getReviewerModalData: { type: Function, required: true },
  isSaving: { type: Boolean, default: false },
  initialData: { type: Object, default: null }
})

const emit = defineEmits(['save'])

const hasReport = computed(() => {
  return props.row.reviewerReports && props.row.reviewerReports.length > 0
})

const reviewData = computed(() => {
  return props.getReviewerModalData(props.row)
})

const initialFormData = computed(() => {
  return {
    studentRecordId: props.row.student.id,
    DEPT: props.row.student?.department ? props.row.student.department : 'Taikomosios Kompiuterijos Katedra',
    PROGRAM: props.row.student?.studyProgram ?? 'N/A',
    CODE: props.row.student?.programCode ?? 'N/A',
    NAME: `${props.row.student?.studentName ?? ''} ${props.row.student?.studentLastname ?? ''}`.trim(),
    TITLE: props.row.student?.finalProjectTitle ?? 'N/A',
    REVIEWER_FULL_DETAILS: props.initialData?.REVIEWER_FULL_DETAILS || '',
    REVIEW_GOALS: props.initialData?.REVIEW_GOALS || '',
    REVIEW_THEORY: props.initialData?.REVIEW_THEORY || '',
    REVIEW_PRACTICAL: props.initialData?.REVIEW_PRACTICAL || '',
    REVIEW_THEORY_PRACTICAL_LINK: props.initialData?.REVIEW_THEORY_PRACTICAL_LINK || '',
    REVIEW_RESULTS: props.initialData?.REVIEW_RESULTS || '',
    REVIEW_PRACTICAL_SIGNIFICANCE: props.initialData?.REVIEW_PRACTICAL_SIGNIFICANCE || '',
    REVIEW_LANGUAGE: props.initialData?.REVIEW_LANGUAGE || '',
    REVIEW_PROS: props.initialData?.REVIEW_PROS || '',
    REVIEW_CONS: props.initialData?.REVIEW_CONS || '',
    REVIEW_QUESTIONS: props.initialData?.REVIEW_QUESTIONS || '',
    FINAL_GRADE: props.initialData?.FINAL_GRADE || 8
  }
})
</script>
