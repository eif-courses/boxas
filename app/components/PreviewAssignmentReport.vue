<template>
  <div>
    <UButton
      :label="buttonLabel"
      icon="i-heroicons-document-text"
      size="xs"
      color="white"
      variant="solid"
      @click="openModal"
    />

    <UModal
      v-model="isOpen"
      prevent-close
      :ui="{ width: 'sm:max-w-4xl' }"
    >
      <UCard
        :ui="{
          ring: '',
          divide: 'divide-y divide-gray-100 dark:divide-gray-800',
          body: { padding: 'p-6 sm:p-10' },
          header: { padding: 'p-4 sm:p-6' }
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
              :aria-label="isEnglishVariant ? 'Close modal' : 'Uždaryti modalą'"
              @click="closeModal"
            />
          </div>
        </template>

        <div
          v-if="isLoading"
          class="p-16 flex justify-center items-center"
        >
          <UIcon
            name="i-heroicons-arrow-path"
            class="animate-spin h-8 w-8 text-primary-500"
          />
        </div>

        <div
          v-else-if="isError"
          class="p-8 text-center text-red-600 dark:text-red-400"
        >
          <UIcon
            name="i-heroicons-exclamation-triangle"
            class="h-10 w-10 mx-auto mb-4"
          />
          <p>{{ errorMessage || (isEnglishVariant ? 'Failed to load project assignment' : 'Nepavyko įkelti baigiamojo darbo užduoties') }}</p>
          <UButton
            color="primary"
            size="sm"
            class="mt-4"
            :label="isEnglishVariant ? 'Try Again' : 'Bandyti dar kartą'"
            @click="fetchAssignmentData"
          />
        </div>

        <div
          v-else-if="!assignmentData"
          class="p-8 text-center text-gray-500 dark:text-gray-400"
        >
          <UIcon
            name="i-heroicons-document"
            class="h-10 w-10 mx-auto mb-4"
          />
          <p>{{ isEnglishVariant ? 'No project assignment found' : 'Baigiamojo darbo užduotis nerasta' }}</p>
        </div>

        <div
          v-else
          class="text-sm text-gray-900 dark:text-gray-100 space-y-4 font-serif"
        >
          <div class="text-center uppercase font-semibold mb-6 space-y-1">
            <p>{{ isEnglishVariant ? 'Vilnius Kolegija Higher Education Institution' : 'Vilniaus kolegija' }}</p>
            <p>{{ isEnglishVariant ? 'Faculty of Electronics and Informatics' : 'Elektronikos ir informatikos fakultetas' }}</p>
          </div>

          <div class="border border-gray-300 dark:border-gray-700 p-4 mb-6">
            <div class="text-center mb-2 font-semibold">
              {{ isEnglishVariant ? 'VERIFIED BY' : 'TVIRTINU' }}
            </div>
            <div class="text-center mb-2">
              {{ isEnglishVariant ? 'Vice Dean of Faculty of Electronics and Informatics' : 'Elektronikos ir informatikos fakulteto prodekanė' }}
            </div>
            <div class="text-center mb-2">
              ________________ dr. Laura Gžegoževskė
            </div>
            <div class="text-center">
              {{ isEnglishVariant ? 'October 31, 2024' : '2024 m. spalio mėn. 31 d.' }}
            </div>
          </div>

          <div class="text-center uppercase font-semibold mb-6">
            <p>{{ isEnglishVariant ? 'Final Project Assignment' : 'Baigiamojo darbo užduotis' }}</p>
          </div>

          <p class="mb-6">
            {{ isEnglishVariant ? 'Given to undergraduate' : 'Skirta' }}
            <span class="font-medium">{{ assignmentData?.NAME }}</span>
            {{ isEnglishVariant ? 'of group' : 'grupės' }}
            <span class="font-medium">{{ assignmentData?.GROUP }}</span>
            {{ isEnglishVariant ? 'on' : '' }}
            {{ formattedDate(assignmentData?.ASSIGNMENT_DATE) }}.
          </p>

          <div class="space-y-4 mt-6">
            <div class="grid grid-cols-[max-content_1fr] gap-x-4 items-start">
              <span class="font-medium">{{ isEnglishVariant ? 'Final Project Title:' : 'Baigiamojo darbo tema:' }}</span>
              <span>{{ assignmentData?.TITLE ?? (isEnglishVariant ? 'Not entered' : 'Neįvesta') }}</span>
            </div>

            <div class="grid grid-cols-[max-content_1fr] gap-x-4 items-start">
              <span class="font-medium">{{ isEnglishVariant ? 'Final Project Title in English:' : 'Baigiamojo darbo tema anglų kalba:' }}</span>
              <span>{{ assignmentData?.TITLE_EN ?? (isEnglishVariant ? 'Not entered' : 'Neįvesta') }}</span>
            </div>

            <div class="grid grid-cols-[max-content_1fr] gap-x-4 items-start">
              <span class="font-medium">{{ isEnglishVariant ? 'The Objective of the Final Project:' : 'Baigiamojo darbo tikslas:' }}</span>
              <span>{{ assignmentData?.OBJECTIVE ?? (isEnglishVariant ? 'Not entered' : 'Neįvesta') }}</span>
            </div>

            <div class="grid grid-cols-[max-content_1fr] gap-x-4 items-start">
              <span class="font-medium">{{ isEnglishVariant ? 'Final Project Tasks:' : 'Baigiamojo darbo uždaviniai:' }}</span>
              <span style="white-space: pre-line">{{ assignmentData?.TASKS ?? (isEnglishVariant ? 'Not entered' : 'Neįvesta') }}</span>
            </div>

            <div class="grid grid-cols-[max-content_1fr] gap-x-4 items-start">
              <span class="font-medium">{{ isEnglishVariant ? 'Tools for Final Project Implementation:' : 'Baigiamojo darbo realizavimo priemonės:' }}</span>
              <span>{{ assignmentData?.IMPLEMENTATION_TOOLS ?? (isEnglishVariant ? 'Not entered' : 'Neįvesta') }}</span>
            </div>
          </div>

          <p class="mt-6">
            {{ isEnglishVariant ? 'Final project will be defended in the meeting of Software Development department on' : 'Baigiamasis darbas bus ginamas Programinės įrangos katedros posėdyje' }}
            <span class="font-medium">{{ assignmentData?.DEFENSE_DATE ?? (isEnglishVariant ? 'date not specified' : 'data nenurodyta') }}</span>.
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 border-t border-gray-200 dark:border-gray-800 pt-4">
            <div>
              <p class="mb-2 font-medium">
                {{ isEnglishVariant ? 'Undergraduate:' : 'Studentas:' }}
              </p>
              <div class="border-b border-dotted border-gray-400 min-h-[1.4em] mb-1 px-2">
                <span>{{ assignmentData?.NAME }}</span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ isEnglishVariant ? '(signature) (name, surname)' : '(parašas) (vardas, pavardė)' }}
              </p>
            </div>

            <div>
              <p class="mb-2 font-medium">
                {{ isEnglishVariant ? 'Supervisor:' : 'Baigiamojo darbo vadovas:' }}
              </p>
              <div class="border-b border-dotted border-gray-400 min-h-[1.4em] mb-1 px-2">
                <span>{{ assignmentData?.SUPERVISOR ?? (isEnglishVariant ? 'Not specified' : 'Nenurodytas') }}</span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ isEnglishVariant ? '(signature) (name, surname)' : '(parašas) (vardas, pavardė)' }}
              </p>
            </div>
          </div>

          <div class="mt-6 border-t border-gray-200 dark:border-gray-800 pt-4">
            <p class="mb-2 font-medium">
              {{ isEnglishVariant ? 'Verified by:' : 'Patvirtinta:' }}
            </p>
            <p class="font-medium">
              {{ isEnglishVariant ? 'Head of Software Development Department:' : 'Programinės įrangos katedros vedėjas:' }}
            </p>
            <div class="border-b border-dotted border-gray-400 min-h-[1.4em] mb-1 px-2">
              <span>{{ assignmentData?.DEPARTMENT_HEAD ?? 'Justinas Zailskas' }}</span>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ isEnglishVariant ? '(signature) (name, surname)' : '(parašas) (vardas, pavardė)' }}
            </p>
          </div>

          <div class="mt-6 border-t border-gray-200 dark:border-gray-800 pt-4">
            <p class="mb-3 font-medium">
              {{ isEnglishVariant ? 'Advisers for Technical Affairs:' : 'Baigiamojo darbo konsultantai:' }}
            </p>
            <div class="space-y-4">
              <div
                v-for="(adviser, index) in (assignmentData?.ADVISERS_TECHNICAL || ['', ''])"
                :key="index"
                class="mb-2"
              >
                <div class="border-b border-dotted border-gray-400 min-h-[1.4em] mb-1 px-2">
                  <span>{{ adviser || (isEnglishVariant ? 'Not specified' : 'Nenurodytas') }}</span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ isEnglishVariant ? '(signature) (name, surname)' : '(parašas) (vardas, pavardė)' }}
                </p>
              </div>
            </div>
          </div>

          <div class="mt-6 border-t border-gray-200 dark:border-gray-800 pt-4">
            <p class="mb-3 font-medium">
              {{ isEnglishVariant ? 'Adviser for English Language:' : 'Anglų kalbos konsultantė:' }}
            </p>
            <div class="border-b border-dotted border-gray-400 min-h-[1.4em] mb-1 px-2">
              <span>{{ assignmentData?.ADVISER_ENGLISH || (isEnglishVariant ? 'Jūratė Helsvig' : 'Milda Kiškytė') }}</span>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ isEnglishVariant ? '(signature) (name, surname)' : '(parašas) (vardas, pavardė)' }}
            </p>
          </div>

          <div
            v-if="assignmentData?.IS_SIGNED === 1"
            class="mt-4 flex items-center justify-end space-x-1"
          >
            <UIcon
              name="i-heroicons-check-circle"
              class="w-4 h-4 text-green-500"
            />
            <span>{{ isEnglishVariant ? 'Signed Electronically' : 'Pasirašyta elektroniniu būdu' }}</span>
            <span v-if="assignmentData?.ASSIGNMENT_DATE">, {{ formattedDate(assignmentData.ASSIGNMENT_DATE) }}</span>
          </div>
        </div> <!-- End of v-else block -->

        <template #footer>
          <div class="text-right">
            <UButton
              v-if="isError"
              color="primary"
              :label="isEnglishVariant ? 'Try Again' : 'Bandyti dar kartą'"
              class="mr-2"
              @click="fetchAssignmentData"
            />
            <UButton
              color="red"
              :label="isEnglishVariant ? 'Close' : 'Uždaryti'"
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

// Define the expected structure for the assignment data
interface ProjectAssignmentDataType {
  NAME: string
  GROUP: string
  TITLE?: string
  TITLE_EN?: string
  OBJECTIVE?: string
  TASKS?: string
  IMPLEMENTATION_TOOLS?: string
  DEFENSE_DATE?: string | Date
  DEPARTMENT_HEAD?: string
  SUPERVISOR?: string
  ADVISERS_TECHNICAL?: string[]
  ADVISER_ENGLISH?: string
  ASSIGNMENT_DATE?: string | Date | number // Allow multiple input types for date
  IS_SIGNED?: number // 0 or 1
}

// Define component props
const props = defineProps({
  studentRecordId: {
    type: Number,
    required: true
  },
  assignmentData: {
    type: Object as PropType<ProjectAssignmentDataType | null>,
    required: false,
    default: null
  },
  buttonLabel: {
    type: String,
    default: 'Rodyti Užduotį'
  },
  modalTitle: {
    type: String,
    default: 'Baigiamojo Darbo Užduotis (Peržiūra)'
  },
  formVariant: {
    type: String as PropType<'lt' | 'en'>,
    required: true
  }
})

const isEnglishVariant = computed(() => props.formVariant === 'en')

const isOpen = ref(false)
const isLoading = ref(false)
const isError = ref(false)
const errorMessage = ref('')
const assignmentData = ref<ProjectAssignmentDataType | null>(props.assignmentData)

// Fetch assignment data from the API
const fetchAssignmentData = async () => {
  if (!props.studentRecordId) return

  // If we already have data, use it
  if (props.assignmentData) {
    assignmentData.value = props.assignmentData
    return
  }

  isLoading.value = true
  isError.value = false
  errorMessage.value = ''

  try {
    const response = await fetch(`/api/students/project-assignments/${props.studentRecordId}`)

    if (!response.ok) {
      if (response.status === 404) {
        // Not found is normal, no need for error state
        assignmentData.value = null
        return
      }

      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.statusMessage || `Error ${response.status}`)
    }

    const data = await response.json()
    assignmentData.value = data
  }
  catch (error: any) {
    isError.value = true
    errorMessage.value = error.message || 'Failed to load assignment data'
    console.error('Error loading project assignment:', error)
  }
  finally {
    isLoading.value = false
  }
}

const openModal = async () => {
  await fetchAssignmentData()
  isOpen.value = true
}

const closeModal = () => { isOpen.value = false }

// Robust Date Formatting Function
const formattedDate = (dateInput: string | Date | number | undefined | null): string => {
  if (!dateInput) return 'N/A'
  try {
    const dateObj = new Date(dateInput)
    if (isNaN(dateObj.getTime())) return 'Invalid Date'

    if (isEnglishVariant.value) {
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
    else {
      return dateObj.toLocaleDateString('lt-LT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }
  catch (e) {
    console.error('Error formatting date:', e, 'Input:', dateInput)
    return typeof dateInput === 'string' || typeof dateInput === 'number' ? String(dateInput) : 'Formatting Error'
  }
}
</script>
