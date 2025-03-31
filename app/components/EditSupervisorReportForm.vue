<script setup lang="ts">
// Define a type for the data relevant to THIS form
// Include non-editable fields needed for display AND editable fields
import { computed } from 'vue'
import type { FormError } from '#ui/types'

export interface SupervisorReportDataType {
  // Display Only (from initial data)
  studentRecordId: string
  DEPT: string
  PROGRAM: string
  CODE: string
  NAME: string
  TITLE: string
  SUPER: string
  DATE: string // Original creation/report date

  // Editable Fields
  EXPL: string
  WORK: string
  OM: number | string
  SSM: number | string
  STUM: number | string
  JM: number | string
  POS: string
  PASS: number
}

// Define a type for the data that will be emitted on save
// (Only the editable fields)
export interface SupervisorReportFormData {
  EXPL: string
  WORK: string
  OM: number | string
  SSM: number | string
  STUM: number | string
  JM: number | string
  POS: string
  PASS: number
  DATE: Date | null // <<< Add DATE field, type as Date or null
}

// --- Props ---
const props = defineProps({
  // Use a different name to avoid confusion with the internal reactive state
  initialData: {
    type: Object as PropType<SupervisorReportDataType>,
    required: true
  },
  buttonLabel: {
    type: String,
    default: 'Pildyti / Redaguoti Atsiliepimą' // Default for editing
  },
  modalTitle: {
    type: String,
    default: 'Vadovo Atsiliepimo Pildymas / Redagavimas' // Default for editing
  },
  formVariant: {
    type: String as PropType<'lt' | 'en'>, // Define possible variants
    required: true // Make it required so parent MUST specify
  }
})

const isEnglishVariant = computed(() => props.formVariant === 'en')

// --- Emits ---
// Define the 'save' event that will emit the edited data
const emit = defineEmits<{
  (e: 'save', data: SupervisorReportFormData): void
}>()

// --- State ---
const isOpen = ref(false)
const isSaving = ref(false) // State for save button loading indicator

// Local reactive state for the form data. Initialize as empty.
// Use the specific FormData type.
const formData = ref<SupervisorReportFormData>({
  EXPL: '',
  WORK: '',
  OM: 0,
  SSM: 0,
  STUM: 0,
  JM: 0,
  POS: '',
  PASS: 1,
  DATE: null
})
const formattedFormDate = computed(() => {
  // Check if formData.DATE is a valid Date object
  if (!isNaN(formData.value.DATE.getTime())) {
    try {
      // Format the date from the form state
      return formData.value.DATE.toLocaleDateString('lt-LT', { // Use toLocaleDateString if time isn't needed
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
        // Or use previous options:
        // dateStyle: 'short'
      })
    }
    catch (e) {
      console.error('Error formatting form date:', e)
      return 'Invalid Date' // Fallback for formatting errors
    }
  }
  return 'N/A' // Return N/A if date is null or invalid
})
// --- Functions ---
const openModal = () => {
  // Reset form data from props every time modal opens
  formData.value = {
    EXPL: props.initialData.EXPL || '',
    WORK: props.initialData.WORK || '',
    OM: props.initialData.OM || 0,
    SSM: props.initialData.SSM || 0,
    STUM: props.initialData.STUM || 0,
    JM: props.initialData.JM || 0,
    POS: props.initialData.POS || '',
    PASS: 1,
    DATE: new Date()
  }
  isSaving.value = false // Reset saving state
  isOpen.value = true
}

const closeModal = () => {
  isOpen.value = false
}

// Validation function (optional, basic example)
const validate = (state: SupervisorReportFormData): FormError[] => {
  const errors = []
  if (!state.EXPL) errors.push({ path: 'EXPL', message: 'Atsiliepimo tekstas yra privalomas' })
  if (state.OM === null || state.OM === undefined || state.OM === '') errors.push({ path: 'OM', message: 'Privaloma nurodyti procentą' })
  if (state.SSM === null || state.SSM === undefined || state.SSM === '') errors.push({ path: 'SSM', message: 'Privaloma nurodyti procentą' })
  if (state.STUM === null || state.STUM === undefined || state.STUM === '') errors.push({ path: 'STUM', message: 'Privaloma nurodyti procentą' })
  if (state.JM === null || state.JM === undefined || state.JM === '') errors.push({ path: 'JM', message: 'Privaloma nurodyti procentą' })
  if (!state.WORK) errors.push({ path: 'WORK', message: 'Darbovietė yra privaloma' })
  if (!state.POS) errors.push({ path: 'POS', message: 'Pareigos yra privalomos' })
  if (state.PASS === null || state.PASS === undefined) {
    errors.push({ path: 'PASS', message: 'Privaloma nurodyti ar leista gintis' })
  }
  return errors
}

// Handle form submission
const handleSave = async () => {
  isSaving.value = true
  console.log('Emitting save event with data:', formData.value)
  emit('save', { ...formData.value })
  // Close modal after emitting (parent handles actual API call)
  setTimeout(() => {
    closeModal()
    isSaving.value = false
  }, 500) // Keep simulation or remove if parent controls closing
}

// Use computed properties for display-only fields from initialData
// This prevents accidental modification and keeps template cleaner
const displayData = computed(() => ({
  DEPT: props.initialData.DEPT,
  PROGRAM: props.initialData.PROGRAM,
  CODE: props.initialData.CODE,
  NAME: props.initialData.NAME,
  TITLE: props.initialData.TITLE,
  SUPER: props.initialData.SUPER
  // DATE: props.initialData.DATE // Display original date if needed
}))
const defenseOptions = [
  { value: 1, label: isEnglishVariant.value ? 'The thesis is suitable for defense at the Final Thesis Defense Committee meeting.' : 'Baigiamasis darbas tinkamas ginti Baigiamųjų darbų gynimo komisijos posėdyje.' },
  { value: 0, label: isEnglishVariant.value ? 'The thesis is not suitable for defense at the Final Thesis Defense Committee meeting due to plagiarism detection.' : 'Baigiamasis darbas netinkamas ginti Baigiamųjų darbų gynimo komisijos posėdyje dėl plagiato fakto nustatymo.' }
]

const defenseAllowedText = computed(() => {
  // Returns the correct word based on formData.PASS being 1 or 0
  return formData.value.PASS === 1 ? isEnglishVariant.value ? 'The thesis is suitable for defense at the Final Thesis Defense Committee meeting.' : 'Baigiamasis darbas tinkamas ginti Baigiamųjų darbų gynimo komisijos posėdyje.' : isEnglishVariant.value ? 'The thesis is not suitable for defense at the Final Thesis Defense Committee meeting due to plagiarism detection.' : 'Baigiamasis darbas netinkamas ginti Baigiamųjų darbų gynimo komisijos posėdyje dėl plagiato fakto nustatymo.'
})
</script>

<template>
  <div>
    <UButton
      :label="buttonLabel"
      icon="i-heroicons-pencil-square"
      size="xs"
      color="blue"
      variant="solid"
      @click="openModal"
    />

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
          header: { padding: 'p-4 sm:p-6' }
        }"
      >
        <template #header>
          <div class="flex items-center">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white truncate">
              {{ isEnglishVariant ? 'Final Thesis Supervisor\'s Review Form': 'Baigiamojo darbo vadovo atsiliepimo pildymas' }}
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
          <div class="text-right text-xs mb-10">
            <p>{{ isEnglishVariant ? 'Vilnius Kolegija Final Thesis (Projects)': 'Vilniaus kolegijos baigiamųjų darbų (projektų)' }} </p>
            <p>{{ isEnglishVariant ? 'preparation and defense procedure description': 'rengimo ir gynimo tvarkos aprašo' }}</p>
            <p class="font-semibold">
              {{ isEnglishVariant ? 'appendix 4' : '4 priedas' }}
            </p>
          </div>

          <div class="text-center uppercase font-semibold mb-10 space-y-1">
            <p>{{ isEnglishVariant ? 'Vilnius kolegija': 'Vilniaus kolegijos' }}</p>
            <p>{{ isEnglishVariant ? 'Faculty of Electronics and Informatics' : 'Elektronikos ir informatikos fakultetas' }} </p>
            <p>{{ displayData.DEPT }} {{ isEnglishVariant ? 'DEPARTMENT' : 'KATEDRA' }}</p>
          </div>

          <div class="text-center uppercase font-semibold mb-10">
            <p>
              {{ isEnglishVariant ? 'Final Thesis Supervisor\'s Review': 'Baigiamojo darbo vadovo atsiliepimas' }}
            </p>
          </div>

          <p class="mb-2">
            {{ isEnglishVariant ? 'Study program' : 'Studijų programa' }}: „{{ displayData.PROGRAM }}“, {{ isEnglishVariant ? 'state code': 'valstybinis kodas' }} {{ displayData.CODE }}
          </p>

          <div class="flex justify-between items-end mb-0">
            <span>{{ isEnglishVariant ? 'Student' : 'Studentas (-ė)' }}:</span>
            <span class="font-medium">{{ displayData.NAME }}</span>
          </div>
          <div class="text-right text-xs text-gray-500 dark:text-gray-400">
            {{ isEnglishVariant ? '(first name, last name)': '(vardas, pavardė)' }}
          </div>

          <p class="mt-4 mb-6">
            {{ isEnglishVariant ? 'Final Thesis Topic' : 'Baigiamojo darbo tema' }}: <span class="font-bold">{{ displayData.TITLE }}</span>
          </p>

          <UFormGroup
            :label="isEnglishVariant ? 'Feedback Text' : 'Atsiliepimo tekstas'"
            name="EXPL"
            required
          >
            <UTextarea
              v-model="formData.EXPL"
              :rows="6"
              :placeholder="isEnglishVariant ? 'The author\'s independence, initiative, and consistency in thesis preparation...' : 'Baigiamojo darbo autoriaus savarankiškumas, iniciatyva, darbo rengimo nuoseklumas...'"
            />
          </UFormGroup>

          <div class="mt-6 space-y-3">
            <p> {{ defenseAllowedText }} </p>

            <URadioGroup
              v-model="formData.PASS"
              :options="defenseOptions"
              :legend="isEnglishVariant ? 'Choose One:': 'Pasirinkite vieną:'"
            />

            <UFormGroup
              name="OM"
              required
            >
              <div class="flex items-center space-x-2 text-sm gap-2">
                <span>{{ isEnglishVariant ? 'The identified match with other works constitutes' : 'Nustatyta sutaptis su kitais darbais sudaro' }}</span>
                <UInput
                  v-model.number="formData.OM"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  size="xs"
                  class="w-20"
                  placeholder="0.0"
                />
                <span>{{ isEnglishVariant ? 'percent of the entire work, of which:': 'procentų viso darbo, iš jų:' }}</span>
              </div>
            </UFormGroup>

            <div class="pl-8 space-y-2 text-sm">
              <UFormGroup
                name="SSM"
                required
              >
                <div class="flex items-center space-x-2">
                  <span>{{ isEnglishVariant ? 'match with one source' : 'sutaptis su vienu šaltiniu' }} </span>
                  <UInput
                    v-model.number="formData.SSM"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    size="xs"
                    class="w-20"
                    placeholder="0.0"
                  />
                  <span>{{ isEnglishVariant ? 'percent of the entire work;': 'procentų viso darbo;' }}</span>
                </div>
              </UFormGroup>
              <UFormGroup
                name="STUM"
                required
              >
                <div class="flex items-center space-x-2">
                  <span>{{ isEnglishVariant ? 'match with other written works of the same student constitutes': 'sutaptis su kitais to paties studento studijų rašto darbais sudaro' }}</span>
                  <UInput
                    v-model.number="formData.STUM"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    size="xs"
                    class="w-20"
                    placeholder="0.0"
                  />
                  <span>{{ isEnglishVariant ? 'percent of the entire work;': 'procentų viso darbo;' }}</span>
                </div>
              </UFormGroup>
              <UFormGroup
                name="JM"
                required
              >
                <div class="flex items-center space-x-2">
                  <span>{{ isEnglishVariant ? 'match with works of other students who are authors of the same joint work constitutes': 'sutaptis su kitų studentų to paties jungtinio darbo autorių darbais sudaro' }}</span>
                  <UInput
                    v-model.number="formData.JM"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    size="xs"
                    class="w-20"
                    placeholder="0.0"
                  />
                  <span>{{ isEnglishVariant ? 'percent of the entire work.': 'procentų viso darbo.' }}</span>
                </div>
              </UFormGroup>
            </div>
          </div>

          <div class="mt-12 pt-8">
            <p class="mb-4 font-semibold">
              {{ isEnglishVariant ? 'I Confirm:' : 'Patvirtinu:' }}
            </p>
            <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between sm:space-x-4 mb-4">
              <div class="mb-1 sm:mb-0">
                <p>{{ isEnglishVariant ? 'Final Thesis Supervisor:': 'Baigiamojo darbo vadovas (-ė):' }}</p>
                <p
                  class="text-xs text-transparent select-none invisible h-8 hidden sm:block"
                  aria-hidden="true"
                />
              </div>
              <div class="text-left sm:text-right">
                <p class="font-medium">
                  {{ displayData.SUPER }}
                </p>
                <div class="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 mt-1">
                  <p>{{ isEnglishVariant ? '(first name, last name, signature)' : '(vardas, pavardė, parašas)' }}</p>
                  <!-- <div class="flex items-center justify-start sm:justify-end space-x-1"> ... </div> -->
                </div>
              </div>
            </div>

            <UFormGroup
              :label="isEnglishVariant ? 'Workplace': 'Darbovietė'"
              name="WORK"
              required
              class="mt-4"
            >
              <UInput
                v-model="formData.WORK"
                :placeholder="isEnglishVariant ? 'Enter Your Workplace...' : 'Įrašykite darbovietę...'"
              />
            </UFormGroup>

            <UFormGroup
              :label="isEnglishVariant ? 'Position' : 'Pareigos'"
              name="POS"
              required
              class="mt-4"
            >
              <UInput
                v-model="formData.POS"
                :placeholder="isEnglishVariant ? 'Enter Your Position/Duties' :'Nurodykite savo pareigas...'"
              />
            </UFormGroup>
          </div>

          <div class="mt-8 text-center">
            <p>{{ formattedFormDate }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ isEnglishVariant ? '(date)' : '(data)' }}
            </p>
          </div>

          <div class="text-right space-x-2 pt-4 border-t border-gray-200 dark:border-gray-800 mt-6">
            <UButton
              type="button"
              color="gray"
              variant="ghost"
              :label="isEnglishVariant ? 'Cancel' : 'Atšaukti'"
              :disabled="isSaving"
              icon="i-heroicons-x-mark"
              @click="closeModal"
            />

            <UButton
              type="submit"
              color="emerald"
              :label="isEnglishVariant ? 'Approve and Submit' : 'Patvirtinti ir pateikti'"
              :loading="isSaving"
              icon="i-heroicons-check-circle"
            />
          </div>
        </UForm>
      </UCard>
    </UModal>
  </div>
</template>
