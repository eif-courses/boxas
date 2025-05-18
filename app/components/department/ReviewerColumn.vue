<template>
  <div>
    <div class="truncate text-xs mb-1">
      {{ row.student.reviewerName }}
    </div>
    <template v-if="hasReview">
      <div v-if="reviewerData">
        <PreviewReviewerReport
          :review-data="reviewerData"
          :form-variant="formVariant"
          :button-label="$t('view')"
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
const props = defineProps({
  row: { type: Object, required: true },
  formVariant: { type: String, required: true },
  getReviewerModalData: { type: Function, required: true }
})

const hasReview = computed(() => {
  return props.row.reviewerReports && props.row.reviewerReports.length > 0
})

const reviewerData = computed(() => {
  return props.getReviewerModalData(props.row)
})
</script>
