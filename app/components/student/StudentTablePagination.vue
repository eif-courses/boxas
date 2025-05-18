<template>
  <div class="flex flex-wrap justify-between items-center">
    <div>
      <span class="text-sm leading-5">
        {{ $t('showing') }}
        <span class="font-medium">{{ from }}</span>
        {{ $t('to') }}
        <span class="font-medium">{{ to }}</span>
        {{ $t('off') }}
        <span class="font-medium">{{ total }}</span>
      </span>
      <span class="ml-2 text-sm text-gray-600">
        {{ $t('year') }} : {{ activeYear || $t('latest') }}
      </span>
    </div>

    <div class="flex items-center gap-2">
      <UButton
        v-if="showRefreshButton"
        icon="i-heroicons-arrow-path"
        color="gray"
        variant="ghost"
        size="sm"
        :loading="loading"
        @click="$emit('refresh')"
      >
        {{ $t('refresh') }}
      </UButton>

      <UPagination
        v-model="pageModel"
        :page-count="pageCount"
        :total="total"
        :ui="{
          wrapper: 'flex items-center gap-1',
          rounded: '!rounded-full min-w-[32px] justify-center',
          default: {
            activeButton: {
              variant: 'outline'
            }
          }
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  page: { type: Number, required: true },
  pageCount: { type: Number, required: true },
  total: { type: Number, required: true },
  from: { type: Number, required: true },
  to: { type: Number, required: true },
  activeYear: { type: [String, Number, null], default: null },
  loading: { type: Boolean, default: false },
  showRefreshButton: { type: Boolean, default: true }
})

const emit = defineEmits(['update:page', 'refresh'])

const pageModel = computed({
  get: () => props.page,
  set: value => emit('update:page', value)
})
</script>
