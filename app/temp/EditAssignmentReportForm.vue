<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PropType } from 'vue'
import type { FormError } from '#ui/types' // Nuxt UI types

// Type for data received by the component
export interface ProjectTopicRegistrationData {
  // Needed for context/display
  studentRecordId: number
  GROUP: string
  NAME: string // Student Name

  // Initial values for editable fields
  TITLE?: string
  TITLE_EN?: string
  PROBLEM?: string
  OBJECTIVE?: string
  TASKS?: string
  COMPLETION_DATE?: string | Date
  SUPERVISOR?: string
  IS_REGISTERED?: number // 0 or 1
}

// Type for data managed by the form and emitted on save
export interface ProjectTopicRegistrationFormData {
  TITLE: string
  TITLE_EN: string
  PROBLEM: string
  OBJECTIVE: string
  TASKS: string
  COMPLETION_DATE: Date | string | null
  SUPERVISOR: string
  REGISTRATION_DATE: Date | null // Date set when form opens
}

// --- Props ---
const props = defineProps({
  initialData: {
    type: Object as PropType<ProjectTopicRegistrationData>,
    required: true
  },
  buttonLabel: {
    type: String,
    default: 'Registruoti / Redaguoti Temą'
  },
  modalTitle: {
    type: String,
    default: 'Baigiamojo Darbo Temos Registravimas'
  },
  formVariant: {
    type: String as PropType<'lt' | 'en'>, // Define possible variants
    required: true
  }
})
const isEnglishVariant = computed(() => props.formVariant === 'en')

// --- Emits ---
const emit = defineEmits<{
  (e: 'save', data: ProjectTopicRegistrationFormData): void
  (e: 'success'): void
}>()

// --- State ---
const isOpen = ref(false)
const isSaving = ref(false)
const isError = ref(false)
const errorMessage = ref('')
const formData = ref<ProjectTopicRegistrationFormData>({
  TITLE: '',
  TITLE_EN: '',
  PROBLEM: '',
  OBJECTIVE: '',
  TASKS: '',
  COMPLETION_DATE: null,
  SUPERVISOR: '',
  REGISTRATION_DATE: null
})

// --- Computed properties ---
const formattedFormDate = computed(() => {
  if (formData.value.REGISTRATION_DATE && !isNaN(new Date(formData.value.REGISTRATION_DATE).getTime())) {
    try {
      return new Date(formData.value.REGISTRATION_DATE).toLocaleDateString(
        isEnglishVariant.value ? 'en-US' : 'lt-LT',
        { year: 'numeric', month: 'long', day: 'numeric' }
      )
    }
    catch (e) { return 'Invalid Date' }
  }
  return 'N/A'
})

// Computed for display-only data from initial props
const displayData = computed(() => ({
  GROUP: props.initialData.GROUP,
  NAME: props.initialData.NAME
}))

// --- Functions ---
const openModal = () => {
  formData.value = {
    TITLE: props.initialData.TITLE || '',
    TITLE_EN: props.initialData.TITLE_EN || '',
    PROBLEM: props.initialData.PROBLEM || '',
    OBJECTIVE: props.initialData.OBJECTIVE || '',
    TASKS: props.initialData.TASKS || '',
    COMPLETION_DATE: props.initialData.COMPLETION_DATE || null,
    SUPERVISOR: props.initialData.SUPERVISOR || '',
    REGISTRATION_DATE: new Date() // Set current date
  }
  isSaving.value = false
  isOpen.value = true
}

const closeModal = () => {
  isOpen.value = false
}

const validate = (state: ProjectTopicRegistrationFormData): FormError[] => {
  const errors = []
  if (!state.TITLE) errors.push({ path: 'TITLE', message: isEnglishVariant.value ? 'Topic Title is required' : 'Baigiamojo darbo tema privaloma' })
  if (!state.TITLE_EN) errors.push({ path: 'TITLE_EN', message: isEnglishVariant.value ? 'English Title is required' : 'Tema anglų kalba privaloma' })
  if (!state.PROBLEM) errors.push({ path: 'PROBLEM', message: isEnglishVariant.value ? 'Project Problem is required' : 'Baigiamojo darbo problema privaloma' })
  if (!state.OBJECTIVE) errors.push({ path: 'OBJECTIVE', message: isEnglishVariant.value ? 'Project Objective is required' : 'Baigiamojo darbo tikslas privalomas' })
  if (!state.TASKS) errors.push({ path: 'TASKS', message: isEnglishVariant.value ? 'Preliminary Tasks and Plan are required' : 'Preliminarūs uždaviniai ir planas privalomi' })
  if (!state.SUPERVISOR) errors.push({ path: 'SUPERVISOR', message: isEnglishVariant.value ? 'Supervisor is required' : 'Vadovas privalomas' })
  return errors
}

const handleSave = async () => {
  isSaving.value = true
  isError.value = false
  errorMessage.value = ''

  try {
    // Map data for API consumption
    const payload = {
      studentRecordId: props.initialData.studentRecordId,
      TITLE: formData.value.TITLE,
      TITLE_EN: formData.value.TITLE_EN,
      PROBLEM: formData.value.PROBLEM,
      OBJECTIVE: formData.value.OBJECTIVE,
      TASKS: formData.value.TASKS,
      COMPLETION_DATE: formData.value.COMPLETION_DATE,
      SUPERVISOR: formData.value.SUPERVISOR
      // REGISTRATION_DATE is handled by the server
    }

    // First emit save for potential additional handling
    emit('save', formData.value)

    // Then post to API
    const response = await fetch('/api/students/project-topics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.statusMessage || `Error: ${response.status}`)
    }

    const result = await response.json()

    // Close modal and reset states
    closeModal()
    emit('success')
  }
  catch (error: any) {
    isError.value = true
    errorMessage.value = error.message || 'Failed to save topic registration'
    console.error('Error saving project topic registration:', error)
  }
  finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div>
    <UButton
      :label="buttonLabel"
      icon="i-heroicons-pencil-square"
      size="xs"
      color="orange"
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
              {{ isEnglishVariant ? 'Final Project Topic Registration' : 'Baigiamojo Darbo Temos Registravimo Lapas' }}
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

        <UForm
          :state="formData"
          :validate="validate"
          class="text-sm text-gray-900 dark:text-gray-100 space-y-4 font-serif"
          @submit="handleSave"
        >
          <div class="text-center uppercase font-semibold mb-6 space-y-1">
            <p>{{ isEnglishVariant ? 'Vilnius Kolegija Higher Education Institution' : 'Vilniaus kolegija' }}</p>
            <p>{{ isEnglishVariant ? 'Faculty of Electronics and Informatics' : 'Elektronikos ir informatikos fakultetas' }}</p>
          </div>

          <div class="text-center uppercase font-semibold mb-8">
            <p>{{ isEnglishVariant ? 'Final Project Topic Registration Form' : 'Baigiamojo darbo temos registravimo lapas' }}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <UFormGroup
              :label="isEnglishVariant ? 'Student:' : 'Studentas(-ė):'"
              class="mb-0"
            >
              <p class="py-2 font-medium">
                {{ displayData.NAME }}
              </p>
            </UFormGroup>

            <UFormGroup
              :label="isEnglishVariant ? 'Academic Group:' : 'Akademinė grupė:'"
              class="mb-0"
            >
              <p class="py-2 font-medium">
                {{ displayData.GROUP }}
              </p>
            </UFormGroup>
          </div>

          <UFormGroup
            :label="isEnglishVariant ? 'Supervisor:' : 'Baigiamojo darbo vadovas(-ė):'"
            name="SUPERVISOR"
            required
          >
            <UInput
              v-model="formData.SUPERVISOR"
              :placeholder="isEnglishVariant ? 'Enter supervisor name' : 'Įveskite vadovo vardą ir pavardę'"
            />
          </UFormGroup>

          <div class="border-t border-gray-200 dark:border-gray-800 pt-4 my-4">
            <p class="font-medium mb-2">
              {{ isEnglishVariant ? 'Final Project Topic:' : 'Baigiamojo darbo tema:' }}
            </p>
          </div>

          <UFormGroup
            :label="isEnglishVariant ? 'In Lithuanian:' : 'Lietuvių kalba:'"
            name="TITLE"
            required
          >
            <UInput
              v-model="formData.TITLE"
              :placeholder="isEnglishVariant ? 'Enter final project title in Lithuanian' : 'Įveskite baigiamojo darbo temą lietuvių kalba'"
            />
          </UFormGroup>

          <UFormGroup
            :label="isEnglishVariant ? 'In English:' : 'Anglų kalba:'"
            name="TITLE_EN"
            required
          >
            <UInput
              v-model="formData.TITLE_EN"
              :placeholder="isEnglishVariant ? 'Enter final project title in English' : 'Įveskite baigiamojo darbo temą anglų kalba'"
            />
          </UFormGroup>

          <UFormGroup
            :label="isEnglishVariant ? 'Project Completion Date:' : 'Baigiamojo darbo baigimo data:'"
            name="COMPLETION_DATE"
          >
            <UInput
              v-model="formData.COMPLETION_DATE"
              type="date"
              :placeholder="isEnglishVariant ? 'Select completion date' : 'Pasirinkite baigimo datą'"
            />
          </UFormGroup>

          <UFormGroup
            :label="isEnglishVariant ? 'Final Project Problem:' : 'Baigiamojo darbo problema:'"
            name="PROBLEM"
            required
          >
            <UTextarea
              v-model="formData.PROBLEM"
              :rows="3"
              :placeholder="isEnglishVariant ? 'Describe the problem that the project will address' : 'Aprašykite problemą, kurią spręs baigiamasis darbas'"
            />
          </UFormGroup>

          <UFormGroup
            :label="isEnglishVariant ? 'Final Project Objective:' : 'Baigiamojo darbo tikslas:'"
            name="OBJECTIVE"
            required
          >
            <UTextarea
              v-model="formData.OBJECTIVE"
              :rows="3"
              :placeholder="isEnglishVariant ? 'A brief, clear, one-sentence description focused on what will be achieved' : 'Trumpas, aiškus, nusakomas vienu sakiniu, orientuotas į tai, kas bus pasiekta'"
            />
          </UFormGroup>

          <UFormGroup
            :label="isEnglishVariant ? 'Preliminary Tasks and Content Plan:' : 'Preliminarūs baigiamojo darbo uždaviniai ir turinio planas:'"
            name="TASKS"
            required
          >
            <UTextarea
              v-model="formData.TASKS"
              :rows="5"
              :placeholder="isEnglishVariant ? 'List preliminary tasks and outline the content plan' : 'Išvardinkite preliminarius uždavinius ir turinio planą'"
            />
          </UFormGroup>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 border-t border-gray-200 dark:border-gray-800 pt-6">
            <div>
              <p class="mb-2">
                {{ isEnglishVariant ? 'Student:' : 'Studentas(-ė):' }}
              </p>
              <div class="border-b border-dashed border-gray-300 dark:border-gray-700 h-6 mb-1" />
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ isEnglishVariant ? '(signature) (name, surname)' : '(parašas) (vardas, pavardė)' }}
              </p>
            </div>

            <div>
              <p class="mb-2">
                {{ isEnglishVariant ? 'Final Project Supervisor:' : 'Baigiamojo darbo vadovas(-ė):' }}
              </p>
              <div class="border-b border-dashed border-gray-300 dark:border-gray-700 h-6 mb-1" />
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ isEnglishVariant ? '(signature) (name, surname)' : '(parašas) (vardas, pavardė)' }}
              </p>
            </div>
          </div>

          <div class="mt-6">
            <p class="mb-2">
              {{ isEnglishVariant ? 'Topic registered:' : 'Tema užregistruota:' }}
            </p>
            <div class="flex items-end gap-2">
              <div class="border-b border-dashed border-gray-300 dark:border-gray-700 h-6 w-48" />
              <p class="mr-2 whitespace-nowrap">
                {{ isEnglishVariant ? 'Department Head' : 'katedros vedėjas(-a)' }}
              </p>
              <div class="border-b border-dashed border-gray-300 dark:border-gray-700 h-6 flex-grow" />
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ isEnglishVariant ? '(signature, date) (name, surname)' : '(parašas, data) (vardas, pavardė)' }}
            </p>
          </div>

          <div
            v-if="isError"
            class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md mb-4"
          >
            <p>{{ errorMessage || (isEnglishVariant ? 'Error saving topic registration' : 'Klaida išsaugant temos registraciją') }}</p>
          </div>

          <div class="text-right space-x-2 pt-4 border-t border-gray-200 dark:border-gray-800 mt-8">
            <UButton
              type="button"
              color="gray"
              variant="ghost"
              :label="isEnglishVariant ? 'Cancel' : 'Atšaukti'"
              :disabled="isSaving"
              @click="closeModal"
            />
            <UButton
              type="submit"
              color="primary"
              :label="isEnglishVariant ? 'Register Topic' : 'Registruoti temą'"
              :loading="isSaving"
            />
          </div>
        </UForm>
      </UCard>
    </UModal>
  </div>
</template>
