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
      :ui="{ width: 'sm:max-w-3xl' }"
    >
      <UCard
        :ui="{
          ring: '',
          divide: 'divide-y divide-gray-100 dark:divide-gray-800',
          body: { padding: 'p-6 sm:p-10' },
          header: {
            padding: 'p-4 sm:p-6'
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
              :aria-label="isEnglishVariant ? 'Close modal' : 'Uždaryti modalą'"
              @click="closeModal"
            />
          </div>
        </template>

        <div class="text-sm text-gray-900 dark:text-gray-100 space-y-4 font-serif">
          <div class="text-right text-xs mb-10">
            <p>{{ isEnglishVariant ? 'Vilnius Kolegija Final Thesis (Projects)' : 'Vilniaus kolegijos baigiamųjų darbų (projektų)' }}</p>
            <p>{{ isEnglishVariant ? 'preparation and defense procedure description' : 'rengimo ir gynimo tvarkos aprašo' }}</p>
            <p class="font-semibold">
              {{ isEnglishVariant ? 'Appendix 4' : '4 priedas' }}
            </p>
          </div>

          <div class="text-center uppercase font-semibold mb-10 space-y-1">
            <p>{{ isEnglishVariant ? 'Vilnius Kolegija' : 'Vilniaus kolegijos' }}</p>
            <p>{{ isEnglishVariant ? 'Faculty of Electronics and Informatics' : 'Elektronikos ir informatikos fakultetas' }}</p>

            <p>{{ documentData.DEPT }} {{ isEnglishVariant ? 'DEPARTMENT' : 'KATEDRA' }}</p>
          </div>

          <div class="text-center uppercase font-semibold mb-10">
            <p>{{ isEnglishVariant ? 'Final Thesis Supervisor\'s Review' : 'Baigiamojo darbo vadovo atsiliepimas' }}</p>
          </div>

          <p class="mb-2">
            {{ isEnglishVariant ? 'Study program' : 'Studijų programa' }}: „{{ documentData.PROGRAM }}“, {{ isEnglishVariant ? 'state code' : 'valstybinis kodas' }} {{ documentData.CODE }}
          </p>

          <div class="flex justify-between items-end mb-0">
            <span>{{ isEnglishVariant ? 'Student' : 'Studentas (-ė)' }}:</span>
            <span class="font-medium">{{ documentData.NAME }}</span>
          </div>
          <div class="text-right text-xs text-gray-500 dark:text-gray-400">
            {{ isEnglishVariant ? '(first name, last name)' : '(vardas, pavardė)' }}
          </div>

          <p class="mt-4 mb-6">
            {{ isEnglishVariant ? 'Final Thesis Topic' : 'Baigiamojo darbo tema' }}: <span class="font-bold">{{ documentData.TITLE }}</span>
          </p>

          <p class="mt-6 [text-indent:3rem] text-justify">
            {{ documentData.EXPL }}
          </p>

          <div class="mt-6 space-y-2">
            <template v-if="documentData.PASS === 1">
              <p>{{ isEnglishVariant ? 'The final thesis is suitable for defense at the Final Thesis Defense Committee meeting.' : 'Baigiamasis darbas tinkamas ginti Baigiamųjų darbų gynimo komisijos posėdyje.' }}</p>
            </template>
            <template v-if="documentData.PASS === 0">
              <p>{{ isEnglishVariant ? 'The final thesis is not suitable for defense at the Final Thesis Defense Committee meeting due to the fact of plagiarism.' : 'Baigiamasis darbas netinkamas ginti Baigiamųjų darbų gynimo komisijos posėdyje dėl plagiato fakto nustatymo.' }}</p>
            </template>

            <p>{{ isEnglishVariant ? 'The identified match with other works constitutes' : 'Nustatyta sutaptis su kitais darbais sudaro' }} {{ documentData.OM }} {{ isEnglishVariant ? 'percent of the entire work, of which' : 'procentų viso darbo, iš jų' }}:</p>
            <div class="[text-indent:3rem] space-y-1 text-sm">
              <p>{{ isEnglishVariant ? 'match with one source' : 'sutaptis su vienu šaltiniu' }} – {{ documentData.SSM }} {{ isEnglishVariant ? 'percent of the entire work' : 'procentų viso darbo' }};</p>
              <p>{{ isEnglishVariant ? 'match with other written works of the same student constitutes' : 'sutaptis su kitais to paties studento studijų rašto darbais sudaro' }} {{ documentData.STUM }} {{ isEnglishVariant ? 'percent of the entire work' : 'procentų viso darbo' }};</p>
              <p>{{ isEnglishVariant ? 'match with works of other students who are authors of the same joint work constitutes' : 'sutaptis su kitų studentų to paties jungtinio darbo autorių darbais sudaro' }} {{ documentData.JM }} {{ isEnglishVariant ? 'percent of the entire work' : 'procentų viso darbo' }}.</p>
            </div>
          </div>

          <div class="mt-12 pt-8">
            <p class="mb-4 font-semibold">
              {{ isEnglishVariant ? 'I Confirm' : 'Patvirtinu' }}:
            </p>

            <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between sm:space-x-4">
              <div class="mb-1 sm:mb-0">
                <p>{{ isEnglishVariant ? 'Final Thesis Supervisor' : 'Baigiamojo darbo vadovas (-ė)' }}:</p>
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
                  <p>{{ isEnglishVariant ? '(first name, last name, signature)' : '(vardas, pavardė, parašas)' }}</p>
                  <div class="flex items-center justify-start sm:justify-end space-x-1">
                    <UIcon
                      name="i-heroicons-check-circle"
                      class="w-3 h-3 text-green-500"
                    />
                    <span>{{ isEnglishVariant ? 'Signed Electronically' : 'Pasirašyta elektroniniu būdu' }}</span>
                    <span v-if="documentData.DATE">, {{ formattedDate(documentData.DATE) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-4 text-center">
              <p>{{ documentData.WORK }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ isEnglishVariant ? '(workplace)' : '(darbovietė)' }}
              </p>
            </div>
            <div class="mt-4 text-center">
              <p>{{ documentData.POS }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ isEnglishVariant ? '(position)' : '(pareigos)' }}
              </p>
            </div>
          </div>

          <div class="mt-8 text-center">
            <p>{{ formattedDate(documentData.DATE) }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ isEnglishVariant ? '(date)' : '(data)' }}
            </p>
          </div>
        </div>

        <template #footer>
          <div class="text-right">
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

interface DocumentDataType {
  DEPT: string
  PROGRAM: string
  CODE: string
  NAME: string
  TITLE: string
  EXPL: string
  WORK: string
  OM: number | string
  SSM: number | string
  STUM: number | string
  JM: number | string
  SUPER: string
  POS: string
  DATE: string | Date | number // Allow Date object or timestamp number
  createdDate?: string | Date | number
  PASS: number
}

// Define the component's props
const props = defineProps({
  documentData: {
    type: Object as PropType<DocumentDataType>,
    required: true
  },
  buttonLabel: {
    type: String,
    default: 'Rodyti dokumentą (DOCX Stilius)'
  },
  modalTitle: {
    type: String,
    default: 'Vadovo Atsiliepimas (Peržiūra)'
  },
  formVariant: {
    type: String as PropType<'lt' | 'en'>,
    required: true
  }
})

const isEnglishVariant = computed(() => props.formVariant === 'en')

const isOpen = ref(false)

const openModal = () => {
  isOpen.value = true
}
const closeModal = () => {
  isOpen.value = false
}

// --- ADDED: Robust Date Formatting Function ---
const formattedDate = (dateInput: string | Date | number | undefined | null): string => {
  if (!dateInput) return 'N/A' // Handle null or undefined

  try {
    const dateObj = new Date(dateInput)
    // Check if the date is valid after conversion
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date' // Handle cases where input couldn't be parsed
    }

    // Choose locale based on variant
    const locale = isEnglishVariant.value ? 'en-US' : 'lt-LT'

    // Format date and time
    return dateObj.toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false // Use 24-hour format if preferred
    })
  }
  catch (e) {
    console.error('Error formatting date:', e, 'Input:', dateInput)
    // Fallback: try to return the input as string if it's not already an object
    return typeof dateInput === 'string' || typeof dateInput === 'number' ? String(dateInput) : 'Formatting Error'
  }
}
</script>
