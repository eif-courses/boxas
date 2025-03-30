<template>
  <div>
    <!-- Trigger Button -->
    <UButton
      :label="buttonLabel"
      icon="i-heroicons-document-text"
      size="xs"
      color="white"
      variant="solid"
      @click="openModal"
    />

    <!-- The Modal -->
    <UModal
      v-model="isOpen"
      prevent-close
      :ui="{ width: 'sm:max-w-3xl' }"
    >
      <UCard
        :ui="{
          ring: '',
          divide: 'divide-y divide-gray-100 dark:divide-gray-800',
          body: { padding: 'p-6 sm:p-10' },
          header: {
            padding: 'p-4 sm:p-6' // Padding applied to the header container
          }
        }"
      >
        <template #header>
          <div class="flex items-center">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white truncate">
              {{ modalTitle }}
            </h3>

            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              size="sm"
              square
              class="ml-auto flex-shrink-0 text-gray-500 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-700 dark:hover:text-red-400 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500 dark:focus-visible:ring-red-400"
              aria-label="Close modal"
              @click="closeModal"
            />
          </div>
        </template>

        <div class="text-sm text-gray-900 dark:text-gray-100 space-y-4 font-serif">
          <div class="text-right text-xs mb-10">
            <p>{{ $t('supervisor_top_right_first') }}</p>
            <p>{{ $t('supervisor_top_right_second') }}</p>
            <p class="font-semibold">
              {{ $t('supervisor_top_right_third') }}
            </p>
          </div>

          <div class="text-center uppercase font-semibold mb-10 space-y-1">
            <p>{{ $t('supervisor_center_first') }}</p>
            <p>{{ $t('supervisor_center_second') }}</p>
            <p>{{ documentData.DEPT }} {{ $t('supervisor_center_third') }}</p>
          </div>

          <div class="text-center uppercase font-semibold mb-10">
            <p>{{ $t('supervisor_center_title') }}</p>
          </div>

          <p class="mb-2">
            {{ $t('supervisor_program_line_first') }}: „{{ documentData.PROGRAM }}“, {{ $t('supervisor_program_line_second') }} {{ documentData.CODE }}
          </p>

          <!-- Student Name Line -->
          <div class="flex justify-between items-end mb-0">
            <span>{{ $t('supervisor_student_name') }}:</span>
            <span class="font-medium">{{ documentData.NAME }}</span>
          </div>
          <div class="text-right text-xs text-gray-500 dark:text-gray-400">
           {{ $t('supervisor_name_surname') }}
          </div>

          <p class="mt-4 mb-6">
            {{ $t('supervisor_final_project_title') }}: <span class="font-bold">{{ documentData.TITLE }}</span>
          </p>

          <p class="mt-6 [text-indent:3rem] text-justify">
            {{ documentData.EXPL }}
          </p>

          <div class="mt-6 space-y-2">
            <template v-if="documentData.PASS === 1">
              <p>{{ $t('supervisor_plagiarism_first') }}</p>
            </template>
            <template v-if="documentData.PASS === 0">
              <p>{{ $t('supervisor_plagiarism_second') }}</p>
            </template>

            <p>{{ $t('supervisor_plagiarism_third') }} {{ documentData.OM }} {{ $t('supervisor_plagiarism_fourth') }}:</p>
            <div class="[text-indent:3rem] space-y-1 text-sm">
              <p>{{ $t('supervisor_plagiarism_fifth') }} – {{ documentData.SSM }} {{ $t('supervisor_plagiarism_eight') }};</p>
              <p>{{ $t('supervisor_plagiarism_sixth') }} {{ documentData.STUM }} {{ $t('supervisor_plagiarism_eight') }};</p>
              <p>{{ $t('supervisor_plagiarism_seventh') }} {{ documentData.JM }} {{ $t('supervisor_plagiarism_eight') }}.</p>
            </div>
          </div>

          <!-- Supervisor Section -->
          <div class="mt-12 pt-8">
            <p class="mb-4 font-semibold">
              {{ $t('supervisor_section_first') }}:
            </p>

            <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between sm:space-x-4">
              <div class="mb-1 sm:mb-0">
                <p>{{ $t('supervisor_section_second') }}:</p>

                <p
                  class="text-xs text-transparent select-none invisible h-8 hidden sm:block"
                  aria-hidden="true"
                />
              </div>

              <div class="text-left sm:text-right">
                <p class="font-medium">
                  {{ documentData.SUPER }}
                </p>

                <div class="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 mt-1">
                  <p> {{ $t('supervisor_name_surname_signature') }}</p>
                  <div class="flex items-center justify-start sm:justify-end space-x-1">
                    <UIcon
                      name="i-heroicons-check-circle"
                      class="w-3 h-3 text-green-500"
                    />
                    <span>{{ $t('signed_electronically') }}</span>
                    <span>, {{ new Date(documentData.DATE).getTime() }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-4 text-center">
              <p>{{ documentData.WORK }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ $t('supervisor_workplace') }}
              </p>
            </div>
            <div class="mt-4 text-center">
              <p>{{ documentData.POS }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ $t('supervisor_position') }}
              </p>
            </div>
          </div>

          <div class="mt-8 text-center">
            <p>{{ documentData.DATE }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ $t('supervisor_date') }}
            </p>
          </div>
        </div>

        <template #footer>
          <div class="text-right">
            <UButton
              color="red"
              :label="$t('modal_close')"
              @click="closeModal"
            />
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PropType } from 'vue'

// Define the expected structure of the document data object
// Adjust field types (string, number, Date) as needed based on your actual data
interface DocumentDataType {
  DEPT: string
  PROGRAM: string
  CODE: string
  NAME: string
  TITLE: string
  EXPL: string
  WORK: string
  OM: number | string // Allow number or string for percentages
  SSM: number | string
  STUM: number | string
  JM: number | string
  SUPER: string
  POS: string
  DATE: string // Could be string or Date
  createdDate?: string | Date
  PASS: number
  // Assuming createdDate comes with the data now
  // Add any other fields if necessary
}

// Define the component's props
const props = defineProps({
  // The main data object for the document
  documentData: {
    type: Object as PropType<DocumentDataType>,
    required: true // This component likely requires the data to function
  },
  // Optional prop for the button label
  buttonLabel: {
    type: String,
    default: 'Rodyti dokumentą (DOCX Stilius)'
  },
  // Optional prop for the modal title
  modalTitle: {
    type: String,
    default: 'Vadovo Atsiliepimas (Peržiūra)'
  }
  // Optional prop to control initial visibility or external control
  // Note: Using v-model on the component instance is often cleaner for external control
  // modelValue: {
  //   type: Boolean,
  //   default: false
  // }
})

// Define emits if using v-model for external control
// const emit = defineEmits(['update:modelValue'])

// Internal state for controlling the modal visibility
const isOpen = ref(false)

// Function to open the modal
const openModal = () => {
  isOpen.value = true
}

// Function to close the modal
const closeModal = () => {
  isOpen.value = false
}

// Helper computed property for formatted date (optional, but good practice)
const formattedCreatedDate = computed(() => {
  if (!props.documentData.createdDate) return 'N/A'
  try {
    // Attempt to format, adjust options as needed
    return new Date(props.documentData.createdDate).toLocaleString('lt-LT', {
      dateStyle: 'short',
      timeStyle: 'short'
    })
  }
  catch (e) {
    // Fallback if date is invalid or already a string
    return String(props.documentData.createdDate)
  }
})
</script>
