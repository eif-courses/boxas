<template>
  <div class="relative">
    <div
      v-if="!isEditing"
      class="text-xs font-300 cursor-pointer group"
      @click="startEditing"
    >
      ({{ displayValue }})
      <UIcon
        name="i-heroicons-pencil"
        class="w-3 h-3 ml-1 invisible group-hover:visible inline-block"
      />
    </div>

    <div
      v-else
      class="flex items-center"
    >
      <UInput
        ref="inputRef"
        v-model="editValue"
        size="xs"
        class="!min-w-[240px]"
        :placeholder="placeholder"
        :loading="isLoading"
        :disabled="isLoading"
        @keyup.enter="saveEdit"
        @keyup.esc="cancelEdit"
      />
      <div class="flex ml-2">
        <UButton
          size="xs"
          color="emerald"
          variant="outline"
          :icon="isLoading ? 'i-heroicons-arrow-path' : 'i-heroicons-check'"
          :class="{ 'animate-spin': isLoading, 'mr-1': true }"
          :disabled="isLoading"
          @click="saveEdit"
        />
        <UButton
          size="xs"
          color="rose"
          variant="outline"
          icon="i-heroicons-x-mark"
          :disabled="isLoading"
          @click="cancelEdit"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'

const props = defineProps({
  value: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Enter title...'
  },
  row: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:value', 'save'])

const isEditing = ref(false)
const isLoading = ref(false)
const editValue = ref('')
const inputRef = ref(null)
const displayValue = computed(() => props.value || 'No title')

function startEditing() {
  editValue.value = props.value
  isEditing.value = true
  focusInput()
}

function focusInput() {
  // Focus the input after the next DOM update cycle
  nextTick(() => {
    // Try more direct approach first
    if (inputRef.value?.$el) {
      // For Nuxt UI components
      const input = inputRef.value.$el.querySelector('input')
      if (input) {
        input.focus()
        input.select() // Optionally select all text
        return
      }
    }

    // Fallback to accessing the component directly
    if (inputRef.value?.focus) {
      inputRef.value.focus()
    }
  })
}

async function saveEdit() {
  if (editValue.value !== props.value) {
    isLoading.value = true

    try {
      // Use await with emit to handle potential async save operations
      Promise.resolve(emit('save', {
        studentId: props.row.id,
        finalProjectTitle: editValue.value
      }))

      // Immediately update the local value for optimistic UI
      emit('update:value', editValue.value)
      isEditing.value = false

      // Optional: Success toast
      // const toast = useToast()
      // toast.add({
      //   title: 'Success',
      //   description: 'Title successfully updated',
      //   color: 'green'
      // })
    }
    catch (error) {
      console.error('Error saving title:', error)

      // Error toast
      // const toast = useToast()
      // toast.add({
      //   title: 'Error',
      //   description: 'Failed to update title',
      //   color: 'red'
      // })
    }
    finally {
      isLoading.value = false
    }
  }
  else {
    // No changes, just close the edit mode
    isEditing.value = false
  }
}

function cancelEdit() {
  editValue.value = props.value
  isEditing.value = false
}

watch(isEditing, (newValue) => {
  if (newValue) {
    focusInput()
  }
})
</script>
