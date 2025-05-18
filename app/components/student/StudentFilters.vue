<template>
  <div class="flex flex-col md:flex-row md:justify-between md:items-center w-full px-4 py-3 gap-3">
    <div class="grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:items-center">
      <div class="flex items-center gap-1.5">
        <span class="text-sm leading-5 whitespace-nowrap">{{ $t('filter_record_count') }}</span>
        <USelect
          v-model="pageCountModel"
          :options="[3, 5, 10, 20, 30, 40]"
          class="w-16"
          size="xs"
          @update:model-value="value => $emit('update:pageCount', Number(value))"
        />
      </div>

      <div class="flex items-center gap-1.5">
        <span class="text-sm leading-5 whitespace-nowrap">{{ $t('year') }}</span>
        <USelect
          v-model="yearModel"
          :options="availableYears"
          class="w-22"
          size="xs"
          :placeholder="$t('latest')"
          clearable
          :loading="yearsLoading"
          @update:model-value="$emit('update:year', $event)"
        />
      </div>

      <div class="flex items-center gap-1.5">
        <span class="text-sm leading-5 whitespace-nowrap">{{ $t('group') }}</span>
        <USelect
          v-model="groupModel"
          :options="uniqueGroups"
          class="w-20 flex-grow"
          size="xs"
          :placeholder="$t('all')"
          clearable
          @update:model-value="$emit('update:group', $event)"
        />
      </div>

      <div class="flex items-center gap-1.5">
        <span class="text-sm leading-5 whitespace-nowrap"> {{ $t('study_program') }}</span>
        <USelect
          v-model="programModel"
          :options="uniquePrograms"
          class="w-28 flex-grow"
          size="xs"
          :placeholder="$t('all')"
          clearable
          @update:model-value="$emit('update:program', $event)"
        />
      </div>
    </div>

    <div class="flex flex-wrap gap-2 items-center justify-start md:justify-end mt-2 md:mt-0">
      <UButton
        icon="i-heroicons-funnel"
        color="gray"
        size="xs"
        :disabled="search === '' && !year && !group && !program"
        @click="$emit('reset')"
      >
        {{ $t('reset') }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  search: { type: String, required: true },
  year: { type: [String, Number, null], default: null },
  group: { type: String, required: true },
  program: { type: String, required: true },
  pageCount: { type: Number, required: true },
  availableYears: { type: Array, required: true },
  uniqueGroups: { type: Array, required: true },
  uniquePrograms: { type: Array, required: true },
  yearsLoading: { type: Boolean, required: true }
})

const emit = defineEmits(['update:year', 'update:group', 'update:program', 'update:pageCount', 'reset'])

const yearModel = computed({
  get: () => props.year,
  set: value => emit('update:year', value)
})

const groupModel = computed({
  get: () => props.group,
  set: value => emit('update:group', value)
})

const programModel = computed({
  get: () => props.program,
  set: value => emit('update:program', value)
})

const pageCountModel = computed({
  get: () => props.pageCount,
  set: value => emit('update:pageCount', value)
})
</script>


