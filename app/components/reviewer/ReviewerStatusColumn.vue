<template>
  <div class="flex items-center gap-2 justify-center">
    <template v-if="hasReport">
      <UIcon
        name="i-heroicons-check-circle"
        class="w-5 h-5 text-green-500"
      />
      <span>{{ $t('report_filled') }}</span>
    </template>
    <template v-else>
      <UIcon
        name="i-heroicons-clock"
        class="w-5 h-5 text-yellow-500"
      />
      <span>{{ $t('report_not_filled') }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  row: { type: Object, required: true }
})

const hasReport = computed(() => {
  return props.row.reviewerReports && props.row.reviewerReports.length > 0
})
</script>
