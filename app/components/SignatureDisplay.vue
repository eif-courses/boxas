<template>
  <div>
    <h4 class="font-medium mb-1 text-sm text-gray-700 dark:text-gray-300">
      {{ label }}:
    </h4>
    <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700 min-h-[60px]">
      <p class="text-sm">
        {{ name || '-' }}
      </p>
      <div
        v-if="isSigned"
        class="mt-1 text-green-600 dark:text-green-400 text-xs flex items-center"
      >
        <UIcon
          name="i-heroicons-check-circle-20-solid"
          class="w-4 h-4 mr-1 flex-shrink-0"
        />
        {{ signedText }}
      </div>
    </div>
    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
      {{ isEnglishVariant ? '(signature) (name, surname)' : '(parašas) (vardas, pavardė)' }}
    </p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  label: { type: String, required: true },
  name: { type: String, default: '' },
  isSigned: { type: Boolean, default: false },
  signedText: { type: String, default: 'Signed' },
  formVariant: { type: String, default: 'lt' } // Or get from parent context
})

const isEnglishVariant = computed(() => props.formVariant === 'en')
</script>
