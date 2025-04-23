<!-- components/CollapsibleSection.vue -->
<template>
  <div class="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden mb-3">
    <button
      type="button"
      class="flex items-center justify-between w-full px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 focus:outline-none focus-visible:ring focus-visible:ring-primary-500 focus-visible:ring-opacity-75 transition-colors duration-150"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <!-- Slot for custom header content -->
      <slot name="header">
        <!-- Default header -->
        <span>{{ title }}</span>
        <div class="flex items-center gap-2">
          <UBadge
            v-if="badgeCount !== undefined && Number(badgeCount) > 0"
            size="xs"
            color="gray"
          >
            {{ badgeCount }}
          </UBadge>
          <UIcon
            name="i-heroicons-chevron-down-20-solid"
            class="w-4 h-4 transform transition-transform duration-200 flex-shrink-0"
            :class="{ '-rotate-180': isOpen }"
          />
        </div>
      </slot>
    </button>

    <!-- Collapsible Content Area -->
    <div
      v-show="isOpen"
      class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/30"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// Added lang="ts"
import { ref } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Details'
  },
  badgeCount: {
    type: [String, Number],
    default: undefined
  },
  initiallyOpen: {
    type: Boolean,
    default: false
  }
})

const isOpen = ref(props.initiallyOpen)

const toggle = () => {
  isOpen.value = !isOpen.value
}

defineExpose({ toggle, isOpen })
</script>
