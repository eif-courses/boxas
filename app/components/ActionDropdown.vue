<template>
  <UDropdown
    :items="formattedActions"
    :popper="{ placement: 'bottom-end' }"
    :ui="{ container: `min-w-[${minWidth}px]` }"
  >
    <UButtonGroup
      :class="`w-[${buttonWidth}px]`"
      :size="size"
      orientation="horizontal"
    >
      <UButton
        :label="mainActionLabel"
        :icon="mainActionIcon"
        :color="mainActionColor"
        class="w-full text-left"
        @click.stop="handleMainButtonClick"
      />
      <UButton
        :icon="dropdownIcon"
        :color="dropdownColor"
      />
    </UButtonGroup>
  </UDropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface Action {
  label: string
  icon?: string
  click: () => void
  disabled?: boolean
}

interface Props {
  mainActionLabel: string
  mainActionIcon?: string // Added icon for main button
  mainAction?: () => void
  actions: Action[]
  mainActionColor?: string
  dropdownColor?: string
  dropdownIcon?: string
  buttonWidth?: number
  minWidth?: number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  mainActionColor: 'white',
  dropdownColor: 'gray',
  dropdownIcon: 'i-heroicons-chevron-down-20-solid',
  buttonWidth: 150,
  minWidth: 150,
  size: 'xs'
})

// Format actions in the structure expected by UDropdown (array of arrays)
const formattedActions = computed(() => {
  return [props.actions.map(action => ({
    label: action.label,
    icon: action.icon,
    disabled: action.disabled,
    click: action.click
  }))]
})

function handleMainButtonClick() {
  if (props.mainAction) {
    props.mainAction()
  }
}
</script>
