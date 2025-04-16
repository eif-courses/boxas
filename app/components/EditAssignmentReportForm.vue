<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PropType } from 'vue'
import type { FormError } from '#ui/types' // Nuxt UI types

// Type for data received by the component (Display + Initial Editable)
export interface ProjectAssignmentDataType {
  // Needed for context/display
  studentRecordId: number
  GROUP: string
  NAME: string // Student Name

  // Initial values for editable fields (might be empty strings/defaults)
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
  ASSIGNMENT_DATE?: string | Date | number
  IS_SIGNED?: number // 0 or 1
}

// Type for data managed by the form and emitted on save
export interface ProjectAssignmentFormData {
  TITLE: string
  TITLE_EN: string
  OBJECTIVE: string
  TASKS: string
  IMPLEMENTATION_TOOLS: string
  DEFENSE_DATE: Date | string | null
  DEPARTMENT_HEAD: string
  SUPERVISOR: string
  ADVISERS_TECHNICAL: string[]
  ADVISER_ENGLISH: string
  ASSIGNMENT_DATE: Date | null // Date set when form opens
}

// --- Props ---
const props = defineProps({
  initialData: {
    type: Object as PropType<ProjectAssignmentDataType>,
    required: true
  },
  buttonLabel: {
    type: String,
    default: 'Pildyti / Redaguoti Užduotį'
  },
  modalTitle: {
    type: String,
    default: 'Baigiamojo Darbo Užduoties Pildymas / Redagavimas'
  },
  formVariant: {
    type: String as PropType<'lt' | 'en'>, // Define possible variants
    required: true // Make it required so parent MUST specify
  }
})
const isEnglishVariant = computed(() => props.formVariant === 'en')

// --- Emits ---
const emit = defineEmits<{
  (e: 'save', data: ProjectAssignmentFormData): void
  (e: 'success'): void
}>()

// --- State ---
const isOpen = ref(false)
const isSaving = ref(false)
const isError = ref(false)
const errorMessage = ref('')
const formData = ref<ProjectAssignmentFormData>({
  TITLE: '',
  TITLE_EN: '',
  OBJECTIVE: '',
  TASKS: '',
  IMPLEMENTATION_TOOLS: '',
  DEFENSE_DATE: null,
  DEPARTMENT_HEAD: 'Justinas Zailskas', // Default department head
  SUPERVISOR: '',
  ADVISERS_TECHNICAL: ['', ''], // Two empty adviser slots by default
  ADVISER_ENGLISH: isEnglishVariant.value ? 'Jūratė Helsvig' : 'Milda Kiškytė', // Default based on language
  ASSIGNMENT_DATE: null
})

// --- Computed properties ---
const formattedFormDate = computed(() => {
  if (formData.value.ASSIGNMENT_DATE && !isNaN(new Date(formData.value.ASSIGNMENT_DATE).getTime())) {
    try {
      return new Date(formData.value.ASSIGNMENT_DATE).toLocaleDateString(
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
    OBJECTIVE: props.initialData.OBJECTIVE || '',
    TASKS: props.initialData.TASKS || '',
    IMPLEMENTATION_TOOLS: props.initialData.IMPLEMENTATION_TOOLS || '',
    DEFENSE_DATE: props.initialData.DEFENSE_DATE || null,
    DEPARTMENT_HEAD: 'Justinas Zailskas', // Default department head
    SUPERVISOR: props.initialData.SUPERVISOR || '',
    ADVISERS_TECHNICAL: props.initialData.ADVISERS_TECHNICAL || ['', ''],
    ADVISER_ENGLISH: isEnglishVariant.value ? 'Jūratė Helsvig' : 'Milda Kiškytė',
    ASSIGNMENT_DATE: new Date() // Set current date
  }
  isSaving.value = false
  isOpen.value = true
}

const closeModal = () => {
  isOpen.value = false
}

const validate = (state: ProjectAssignmentFormData): FormError[] => {
  const errors = []
  if (!state.TITLE) errors.push({ path: 'TITLE', message: isEnglishVariant.value ? 'Final Project Title is required' : 'Baigiamojo darbo tema privaloma' })
  if (!state.TITLE_EN) errors.push({ path: 'TITLE_EN', message: isEnglishVariant.value ? 'English Title is required' : 'Tema anglų kalba privaloma' })
  if (!state.OBJECTIVE) errors.push({ path: 'OBJECTIVE', message: isEnglishVariant.value ? 'Project Objective is required' : 'Baigiamojo darbo tikslas privalomas' })
  if (!state.TASKS) errors.push({ path: 'TASKS', message: isEnglishVariant.value ? 'Project Tasks are required' : 'Baigiamojo darbo uždaviniai privalomi' })
  if (!state.IMPLEMENTATION_TOOLS) errors.push({ path: 'IMPLEMENTATION_TOOLS', message: isEnglishVariant.value ? 'Implementation Tools are required' : 'Realizavimo priemonės privalomos' })
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
      OBJECTIVE: formData.value.OBJECTIVE,
      TASKS: formData.value.TASKS,
      IMPLEMENTATION_TOOLS: formData.value.IMPLEMENTATION_TOOLS,
      DEFENSE_DATE: formData.value.DEFENSE_DATE,
      DEPARTMENT_HEAD: formData.value.DEPARTMENT_HEAD,
      SUPERVISOR: formData.value.SUPERVISOR,
      ADVISERS_TECHNICAL: formData.value.ADVISERS_TECHNICAL,
      ADVISER_ENGLISH: formData.value.ADVISER_ENGLISH
      // ASSIGNMENT_DATE is handled by the server
    }

    // First emit save for potential additional handling
    emit('save', formData.value)

    // Then post to API
    const response = await fetch('/api/students/project-assignments', {
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
    errorMessage.value = error.message || 'Failed to save assignment'
    console.error('Error saving project assignment:', error)
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
              {{ isEnglishVariant ? 'Final Project Assignment' : 'Baigiamojo Darbo Užduotis' }}
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

          <div class="border border-gray-300 dark:border-gray-700 p-4 mb-8">
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

          <div class="text-center uppercase font-semibold mb-8">
            <p>{{ isEnglishVariant ? 'Final Project Assignment' : 'Baigiamojo darbo užduotis' }}</p>
          </div>

          <p class="mb-6">
            {{ isEnglishVariant ? 'Given to undergraduate' : 'Skirta' }}
            <span class="font-medium">{{ displayData.NAME }}</span>
            {{ isEnglishVariant ? 'of group' : 'grupės' }}
            <span class="font-medium">{{ displayData.GROUP }}</span>
            {{ isEnglishVariant ? 'on' : '' }}
            {{ formattedFormDate }}.
          </p>

          <UFormGroup
            :label="isEnglishVariant ? 'Final Project Title:' : 'Baigiamojo darbo tema:'"
            name="TITLE"
            required
          >
            <UInput
              v-model="formData.TITLE"
              :placeholder="isEnglishVariant ? 'Enter final project title' : 'Įveskite baigiamojo darbo temą'"
            />
          </UFormGroup>

          <UFormGroup
            :label="isEnglishVariant ? 'Final Project Title in English:' : 'Baigiamojo darbo tema anglų kalba:'"
            name="TITLE_EN"
            required
          >
            <UInput
              v-model="formData.TITLE_EN"
              :placeholder="isEnglishVariant ? 'Enter final project title in English' : 'Įveskite baigiamojo darbo temą anglų kalba'"
            />
          </UFormGroup>

          <UFormGroup
            :label="isEnglishVariant ? 'The Objective of the Final Project:' : 'Baigiamojo darbo tikslas:'"
            name="OBJECTIVE"
            required
          >
            <UTextarea
              v-model="formData.OBJECTIVE"
              :rows="3"
              :placeholder="isEnglishVariant ? 'A brief, clear, one-sentence description focused on the software being developed. For example: Create, update...' : 'Trumpas, aiškus, nusakomas vienu sakiniu, orientuotas į kuriamą programinę įrangą: Pvz.: Sukurti, atnaujinti...'"
            />
          </UFormGroup>

          <UFormGroup
            :label="isEnglishVariant ? 'Final Project Tasks:' : 'Baigiamojo darbo uždaviniai:'"
            name="TASKS"
            required
          >
            <UTextarea
              v-model="formData.TASKS"
              :rows="4"
              :placeholder="isEnglishVariant ? 'List preliminary tasks that will help achieve the objective. The tasks should clearly define the functionality of the software being developed.' : 'Išvardinti preliminarius uždavinius, kurie padės pasiekti tikslą. Uždaviniai turi aiškiai apibrėžti kuriamos programinės įrangos funkcionalumą.'"
            />
          </UFormGroup>

          <UFormGroup
            :label="isEnglishVariant ? 'Tools for Final Project Implementation:' : 'Baigiamojo darbo realizavimo priemonės:'"
            name="IMPLEMENTATION_TOOLS"
            required
          >
            <UTextarea
              v-model="formData.IMPLEMENTATION_TOOLS"
              :rows="3"
              :placeholder="isEnglishVariant ? 'List the tools and technologies that will be used in the development of the software. For example: Visual Studio, .NET Core, SQL Server, ReactJS, GitHub.' : 'Išvardyti įrankius ir technologijas, kurie bus naudojami kuriant programinę įrangą. Pvz. Visual Studio, .NET Core, SQL Server, ReactJS, GitHub.'"
            />
          </UFormGroup>

          <p class="mt-6 mb-4">
            {{ isEnglishVariant ? 'Final project will be defended in the meeting of Software Development department on' : 'Baigiamasis darbas bus ginamas Programinės įrangos katedros posėdyje' }}
            <UFormGroup
              name="DEFENSE_DATE"
              class="inline-block ml-2"
            >
              <UInput
                v-model="formData.DEFENSE_DATE"
                :placeholder="isEnglishVariant ? 'January 7, 2025' : '2025 m. sausio mėn. 6 d.'"
              />
            </UFormGroup>
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div>
              <p class="mb-2">
                {{ isEnglishVariant ? 'Undergraduate' : 'Pasirinkite' }}
              </p>
              <div class="border-b border-dashed border-gray-300 dark:border-gray-700 h-6 mb-1" />
              <p class="text-xs text-gray-500 dark:text-gray-400 text-center">
                {{ isEnglishVariant ? '(signature) (name, surname)' : '(parašas) (vardas, pavardė)' }}
              </p>
            </div>

            <UFormGroup
              :label="isEnglishVariant ? 'Supervisor' : 'Baigiamojo darbo vadovas'"
              name="SUPERVISOR"
              required
            >
              <UInput
                v-model="formData.SUPERVISOR"
                :placeholder="isEnglishVariant ? 'Enter supervisor name' : 'Įveskite vadovo vardą ir pavardę'"
              />
              <template #hint>
                <p class="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {{ isEnglishVariant ? '(signature) (name, surname)' : '(parašas) (vardas, pavardė)' }}
                </p>
              </template>
            </UFormGroup>
          </div>

          <div class="mt-8">
            <p class="mb-2">
              {{ isEnglishVariant ? 'Verified by:' : 'Patvirtinta:' }}
            </p>
            <UFormGroup
              :label="isEnglishVariant ? 'Head of Software Development Department' : 'Programinės įrangos katedros vedėjas'"
              name="DEPARTMENT_HEAD"
            >
              <UInput
                v-model="formData.DEPARTMENT_HEAD"
                :placeholder="isEnglishVariant ? 'Enter department head name' : 'Įveskite katedros vedėjo vardą ir pavardę'"
              />
              <template #hint>
                <p class="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {{ isEnglishVariant ? '(signature) (name, surname)' : '(parašas) (vardas, pavardė)' }}
                </p>
              </template>
            </UFormGroup>
          </div>

          <div class="mt-6">
            <p class="mb-3">
              {{ isEnglishVariant ? 'Advisers for Technical Affairs:' : 'Baigiamojo darbo konsultantai:' }}
            </p>
            <div class="space-y-4">
              <div
                v-for="(_, index) in formData.ADVISERS_TECHNICAL"
                :key="index"
              >
                <div class="border-b border-dashed border-gray-300 dark:border-gray-700 h-6 mb-1" />
                <UInput
                  v-model="formData.ADVISERS_TECHNICAL[index]"
                  :placeholder="isEnglishVariant ? 'Enter adviser name (optional)' : 'Įveskite konsultanto vardą ir pavardę (neprivaloma)'"
                  class="mt-1"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                  {{ isEnglishVariant ? '(signature) (name, surname)' : '(parašas) (vardas, pavardė)' }}
                </p>
              </div>
            </div>
          </div>

          <div class="mt-6">
            <p class="mb-3">
              {{ isEnglishVariant ? 'Adviser for English Language:' : 'Anglų kalbos konsultantė:' }}
            </p>
            <div class="border-b border-dashed border-gray-300 dark:border-gray-700 h-6 mb-1" />
            <UFormGroup
              name="ADVISER_ENGLISH"
            >
              <UInput
                v-model="formData.ADVISER_ENGLISH"
                :placeholder="isEnglishVariant ? 'Enter English language adviser name' : 'Įveskite anglų kalbos konsultanto vardą ir pavardę'"
              />
              <template #hint>
                <p class="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {{ isEnglishVariant ? '(signature) (name, surname)' : '(parašas) (vardas, pavardė)' }}
                </p>
              </template>
            </UFormGroup>
          </div>

          <div
            v-if="isError"
            class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md mb-4"
          >
            <p>{{ errorMessage || (isEnglishVariant ? 'Error saving assignment' : 'Klaida išsaugant užduotį') }}</p>
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
              :label="isEnglishVariant ? 'Save Assignment' : 'Išsaugoti užduotį'"
              :loading="isSaving"
            />
          </div>
        </UForm>
      </UCard>
    </UModal>
  </div>
</template>
