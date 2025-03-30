<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PropType } from 'vue'
import type { FormError } from '#ui/types' // Nuxt UI types

// Type for data received by the component (Display + Initial Editable)
export interface ReviewerReportDataType {
  // Needed for context/display
  studentRecordId: number
  DEPT: string
  PROGRAM: string
  CODE: string
  NAME: string // Student Name
  TITLE: string // Thesis Title

  // Initial values for editable fields (might be empty strings/defaults)
  REVIEWER_FULL_DETAILS?: string
  REVIEW_GOALS?: string
  REVIEW_THEORY?: string
  REVIEW_PRACTICAL?: string
  REVIEW_THEORY_PRACTICAL_LINK?: string
  REVIEW_RESULTS?: string
  REVIEW_PRACTICAL_SIGNIFICANCE?: string
  REVIEW_LANGUAGE?: string
  REVIEW_PROS?: string
  REVIEW_CONS?: string
  REVIEW_QUESTIONS?: string
  FINAL_GRADE?: number | string
  // Add other non-editable fields if needed for display (like original date)
  // DATE?: string;
}

// Type for data managed by the form and emitted on save
export interface ReviewerReportFormData {
  REVIEWER_FULL_DETAILS: string
  REVIEW_GOALS: string
  REVIEW_THEORY: string
  REVIEW_PRACTICAL: string
  REVIEW_THEORY_PRACTICAL_LINK: string
  REVIEW_RESULTS: string
  REVIEW_PRACTICAL_SIGNIFICANCE: string
  REVIEW_LANGUAGE: string
  REVIEW_PROS: string
  REVIEW_CONS: string
  REVIEW_QUESTIONS: string
  FINAL_GRADE: number | string
  REPORT_DATE: Date | null // Date set when form opens
}

// --- Props ---
const props = defineProps({
  initialData: {
    type: Object as PropType<ReviewerReportDataType>,
    required: true
  },
  buttonLabel: {
    type: String,
    default: 'Pildyti / Redaguoti Recenziją'
  },
  modalTitle: {
    type: String,
    default: 'Recenzijos Pildymas / Redagavimas'
  }
})

// --- Emits ---
const emit = defineEmits<{
  (e: 'save', data: ReviewerReportFormData): void
}>()

// --- State ---
const isOpen = ref(false)
const isSaving = ref(false)
const formData = ref<ReviewerReportFormData>({
  REVIEWER_FULL_DETAILS: '',
  REVIEW_GOALS: '',
  REVIEW_THEORY: '',
  REVIEW_PRACTICAL: '',
  REVIEW_THEORY_PRACTICAL_LINK: '',
  REVIEW_RESULTS: '',
  REVIEW_PRACTICAL_SIGNIFICANCE: '',
  REVIEW_LANGUAGE: '',
  REVIEW_PROS: '',
  REVIEW_CONS: '',
  REVIEW_QUESTIONS: '',
  FINAL_GRADE: '', // Initialize as empty string or default number like 0
  REPORT_DATE: null
})

// --- Computed properties ---
const formattedFormDate = computed(() => {
  if (formData.value.REPORT_DATE && !isNaN(formData.value.REPORT_DATE.getTime())) {
    try {
      return formData.value.REPORT_DATE.toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' })
    }
    catch (e) { return 'Invalid Date' }
  }
  return 'N/A'
})

// Computed for display-only data from initial props
const displayData = computed(() => ({
  DEPT: props.initialData.DEPT,
  PROGRAM: props.initialData.PROGRAM,
  CODE: props.initialData.CODE,
  NAME: props.initialData.NAME,
  TITLE: props.initialData.TITLE
  // Include any other display-only fields needed from initialData
}))

// --- Functions ---
const openModal = () => {
  formData.value = {
    REVIEWER_FULL_DETAILS: props.initialData.REVIEWER_FULL_DETAILS || '',
    REVIEW_GOALS: props.initialData.REVIEW_GOALS || '',
    REVIEW_THEORY: props.initialData.REVIEW_THEORY || '',
    REVIEW_PRACTICAL: props.initialData.REVIEW_PRACTICAL || '',
    REVIEW_THEORY_PRACTICAL_LINK: props.initialData.REVIEW_THEORY_PRACTICAL_LINK || '',
    REVIEW_RESULTS: props.initialData.REVIEW_RESULTS || '',
    REVIEW_PRACTICAL_SIGNIFICANCE: props.initialData.REVIEW_PRACTICAL_SIGNIFICANCE || '',
    REVIEW_LANGUAGE: props.initialData.REVIEW_LANGUAGE || '',
    REVIEW_PROS: props.initialData.REVIEW_PROS || '',
    REVIEW_CONS: props.initialData.REVIEW_CONS || '',
    REVIEW_QUESTIONS: props.initialData.REVIEW_QUESTIONS || '',
    FINAL_GRADE: props.initialData.FINAL_GRADE || '', // Or default to 0
    REPORT_DATE: new Date() // Set current date
  }
  isSaving.value = false
  isOpen.value = true
}

const closeModal = () => {
  isOpen.value = false
}

const validate = (state: ReviewerReportFormData): FormError[] => {
  const errors = []
  if (!state.REVIEWER_FULL_DETAILS) errors.push({ path: 'REVIEWER_FULL_DETAILS', message: 'Recenzento duomenys privalomi' })
  if (!state.REVIEW_GOALS) errors.push({ path: 'REVIEW_GOALS', message: 'Privaloma įvertinti tikslus/uždavinius' })
  if (!state.REVIEW_THEORY) errors.push({ path: 'REVIEW_THEORY', message: 'Privaloma įvertinti teorinę dalį' })
  if (!state.REVIEW_PRACTICAL) errors.push({ path: 'REVIEW_PRACTICAL', message: 'Privaloma įvertinti projektinę dalį' })
  // Add checks for other textareas if they are mandatory
  if (state.FINAL_GRADE === '' || state.FINAL_GRADE === null || state.FINAL_GRADE === undefined) {
    errors.push({ path: 'FINAL_GRADE', message: 'Galutinis įvertinimas privalomas' })
  }
  else {
    const gradeNum = Number(state.FINAL_GRADE)
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 10) {
      errors.push({ path: 'FINAL_GRADE', message: 'Įvertinimas turi būti skaičius nuo 0 iki 10' })
    }
  }
  return errors
}

const handleSave = async () => {
  isSaving.value = true
  // Ensure FINAL_GRADE is a number if it was entered as a string
  const saveData = {
    ...formData.value,
    FINAL_GRADE: Number(formData.value.FINAL_GRADE) || 0 // Convert to number, default to 0 if invalid
  }
  emit('save', saveData)
  // Close modal after emitting
  // eslint-disable-next-line @stylistic/max-statements-per-line
  setTimeout(() => { closeModal(); isSaving.value = false }, 500) // Simulate delay or wait for parent confirmation
}
</script>

<template>
  <div>
    <!-- Trigger Button -->
    <UButton
      :label="buttonLabel"
      icon="i-heroicons-pencil-square"
      size="xs"
      color="orange"
      variant="solid"
      @click="openModal"
    />

    <!-- The Modal -->
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
              aria-label="Close modal"
              @click="closeModal"
            />
          </div>
        </template>

        <!-- Document Body -> NOW A FORM -->
        <UForm
          :state="formData"
          :validate="validate"
          class="text-sm text-gray-900 dark:text-gray-100 space-y-4 font-serif"
          @submit="handleSave"
        >
          <!-- Top Right Header (Display Only) -->
          <div class="text-right text-xs mb-10">
            <p>Vilniaus kolegijos baigiamųjų darbų (projektų)</p>
            <p>rengimo ir gynimo tvarkos aprašo</p>
            <p class="font-semibold">
              5 priedas
            </p>
          </div>

          <!-- Centered Faculty/Dept (Display Only) -->
          <div class="text-center uppercase font-semibold mb-10 space-y-1">
            <p>Vilniaus kolegijos</p>
            <p>Elektronikos ir informatikos fakultetas</p>
            <p>{{ displayData.DEPT }} KATEDRA</p>
          </div>

          <!-- Centered Title (Display Only) -->
          <div class="text-center uppercase font-semibold mb-10">
            <p>Baigiamojo darbo recenzija</p>
          </div>

          <!-- Study Program Line (Display Only) -->
          <p class="mb-2">
            Studijų programa: „{{ displayData.PROGRAM }}“, valstybinis kodas {{ displayData.CODE }}
          </p>

          <!-- Student Name Line (Display Only) -->
          <div class="flex justify-between items-end mb-0">
            <span>Studentas (-ė):</span>
            <span class="font-medium">{{ displayData.NAME }}</span>
          </div>
          <div class="text-right text-xs text-gray-500 dark:text-gray-400">
            (vardas, pavardė)
          </div>

          <!-- Thesis Title Line (Display Only) -->
          <p class="mt-4 mb-6">
            Baigiamojo darbo tema: <span class="font-bold">{{ displayData.TITLE }}</span>
          </p>

          <!-- Reviewer Details -> EDITABLE -->
          <UFormGroup
            label="Recenzentas"
            name="REVIEWER_FULL_DETAILS"
            required
          >
            <UInput
              v-model="formData.REVIEWER_FULL_DETAILS"
              placeholder="Vardas, Pavardė, Darbovietė, Pareigos..."
            />
            <template #hint>
              (vardas, pavardė, darbovietė, pareigos, pedagoginis vardas, mokslinis laipsnis)
            </template>
          </UFormGroup>

          <!-- Review Criteria Section -> EDITABLE -->
          <div class="space-y-3 mt-8">
            <UFormGroup
              label="Baigiamojo darbo tikslas, uždaviniai, problemos sprendimas:"
              name="REVIEW_GOALS"
              required
            >
              <UTextarea
                v-model="formData.REVIEW_GOALS"
                :rows="3"
                placeholder="Įvertinimas..."
              />
            </UFormGroup>
            <UFormGroup
              label="Teorinės dalies vertinimas:"
              name="REVIEW_THEORY"
              required
            >
              <UTextarea
                v-model="formData.REVIEW_THEORY"
                :rows="3"
                placeholder="Įvertinimas..."
              />
            </UFormGroup>
            <UFormGroup
              label="Tiriamosios / projektinės dalies vertinimas:"
              name="REVIEW_PRACTICAL"
              required
            >
              <UTextarea
                v-model="formData.REVIEW_PRACTICAL"
                :rows="3"
                placeholder="Įvertinimas..."
              />
            </UFormGroup>
            <UFormGroup
              label="Tiriamosios / projektinės dalies ryšys su teorine dalimis:"
              name="REVIEW_THEORY_PRACTICAL_LINK"
            >
              <UTextarea
                v-model="formData.REVIEW_THEORY_PRACTICAL_LINK"
                :rows="3"
                placeholder="Įvertinimas..."
              />
            </UFormGroup>
            <UFormGroup
              label="Baigiamojo darbo rezultatai ir išvados:"
              name="REVIEW_RESULTS"
            >
              <UTextarea
                v-model="formData.REVIEW_RESULTS"
                :rows="3"
                placeholder="Įvertinimas..."
              />
            </UFormGroup>
            <UFormGroup
              label="Baigiamojo darbo praktinė reikšmė (pritaikymo galimybės):"
              name="REVIEW_PRACTICAL_SIGNIFICANCE"
            >
              <UTextarea
                v-model="formData.REVIEW_PRACTICAL_SIGNIFICANCE"
                :rows="3"
                placeholder="Įvertinimas..."
              />
            </UFormGroup>
            <UFormGroup
              label="Kalbos taisyklingumas:"
              name="REVIEW_LANGUAGE"
            >
              <UTextarea
                v-model="formData.REVIEW_LANGUAGE"
                :rows="3"
                placeholder="Įvertinimas..."
              />
            </UFormGroup>
            <UFormGroup
              label="Baigiamojo darbo privalumai:"
              name="REVIEW_PROS"
            >
              <UTextarea
                v-model="formData.REVIEW_PROS"
                :rows="3"
                placeholder="Įvertinimas..."
              />
            </UFormGroup>
            <UFormGroup
              label="Baigiamojo darbo trūkumai:"
              name="REVIEW_CONS"
            >
              <UTextarea
                v-model="formData.REVIEW_CONS"
                :rows="3"
                placeholder="Įvertinimas..."
              />
            </UFormGroup>
            <UFormGroup
              label="Klausimai darbo autoriui:"
              name="REVIEW_QUESTIONS"
            >
              <UTextarea
                v-model="formData.REVIEW_QUESTIONS"
                :rows="3"
                placeholder="Klausimai..."
              />
            </UFormGroup>
          </div>

          <!-- Final Grade -> EDITABLE -->
          <div class="mt-12 pt-8">
            <UFormGroup
              label="Baigiamojo darbo įvertinimas (dešimties balų sistemoje)"
              name="FINAL_GRADE"
              required
            >
              <div class="flex items-center space-x-4">
                <UInput
                  v-model="formData.FINAL_GRADE"
                  type="number"
                  step="1"
                  min="0"
                  max="10"
                  placeholder="0-10"
                  class="w-24"
                />
                <span class="text-xs text-gray-500 dark:text-gray-400">(įrašyti balą)</span>
              </div>
            </UFormGroup>
            <div class="mt-2 text-right text-xs text-gray-500 dark:text-gray-400">
              <p>{{ initialData.REVIEWER_NAME_SIGNATURE ?? formData.REVIEWER_FULL_DETAILS }}</p>
              <p>(vardas, pavardė, parašas)</p>
            </div>
          </div>

          <!-- Date Section (Display Date from formData) -->
          <div class="mt-8 text-center">
            <p>{{ formattedFormDate }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              (data)
            </p>
          </div>

          <!-- Footer Buttons within the UForm -->
          <div class="text-right space-x-2 pt-4 border-t border-gray-200 dark:border-gray-800 mt-6">
            <UButton
              type="button"
              color="gray"
              variant="ghost"
              label="Atšaukti"
              :disabled="isSaving"
              @click="closeModal"
            />
            <UButton
              type="submit"
              color="primary"
              label="Išsaugoti Recenziją"
              :loading="isSaving"
            />
          </div>
        </UForm>
      </UCard>
    </UModal>
  </div>
</template>
