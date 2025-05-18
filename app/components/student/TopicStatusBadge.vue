<template>
  <div class="flex items-center">
    <UBadge
      v-if="hasTopic"
      :color="statusColor"
      variant="soft"
      size="xs"
      class="whitespace-nowrap min-w-[80px] text-center"
      :ui="{
        base: 'inline-flex items-center rounded-md cursor-help justify-center',
        tooltip: { base: 'z-50 px-2 py-1 rounded text-xs' }
      }"
      :tooltips="{ content: tooltip }"
    >
      {{ label }}
    </UBadge>
    <UBadge
      v-else
      color="gray"
      variant="soft"
      size="xs"
      class="whitespace-nowrap min-w-[80px] text-center"
    >
      {{ $t('no_topic') }}
    </UBadge>
  </div>
</template>

<script setup lang="ts">
import { useTopicStatusUtils } from '~/composables/useTopicStatusUtils'

const props = defineProps({
  status: { type: String, default: '' },
  hasTopic: { type: Boolean, default: false }
})

const { getTopicStatusLabel, getTopicStatusTooltip, getTopicStatusColor } = useTopicStatusUtils()

const label = computed(() => getTopicStatusLabel(props.status))
const tooltip = computed(() => getTopicStatusTooltip(props.status))
const statusColor = computed(() => getTopicStatusColor(props.status))
</script>
