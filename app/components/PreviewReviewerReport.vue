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

        <div class="text-sm text-gray-900 dark:text-gray-100 space-y-4 font-serif">
          <div class="text-right text-xs mb-10">
            <p>{{ isEnglishVariant ? 'Vilnius Kolegija Final Thesis (Projects)' : 'Vilniaus kolegijos baigiamųjų darbų (projektų)' }}</p>
            <p>{{ isEnglishVariant ? 'preparation and defense procedure description' : 'rengimo ir gynimo tvarkos aprašo' }}</p>
            <p class="font-semibold">
              {{ isEnglishVariant ? 'Appendix 5' : '5 priedas' }}
            </p>
          </div>

          <div class="text-center uppercase font-semibold mb-6 space-y-1">
            <p>{{ isEnglishVariant ? 'Vilnius Kolegija' : 'Vilniaus kolegija' }}</p>
            <div class="flex justify-center items-center gap-x-2">
              <span>{{ reviewData?.FACULTY ?? (isEnglishVariant ? 'Faculty of Electronics and Informatics' : 'Elektronikos ir informatikos fakultetas') }}</span>
            </div>
            <div class="flex justify-center items-center gap-x-2">
              <span>{{ reviewData?.DEPARTMENT }} {{ isEnglishVariant ? 'Department' : 'Katedra' }}</span>
            </div>
          </div>

          <div class="text-center uppercase font-semibold mb-10">
            <p>{{ isEnglishVariant ? 'Final Thesis Review' : 'Baigiamojo darbo recenzija' }}</p>
          </div>

          <div class="space-y-1 mb-8">
            <div class="grid grid-cols-[max-content_1fr] gap-x-4 items-end">
              <span class="text-right">{{ isEnglishVariant ? 'Final Thesis Topic' : 'Baigiamojo darbo tema' }}</span>
              <div class="border-b border-dotted border-gray-400 min-h-[1.4em] px-2 flex items-end">
                <span class="font-medium">{{ reviewData?.THESIS_TITLE }}</span>
              </div>
            </div>

            <div class="grid grid-cols-[max-content_1fr] gap-x-4 items-end pt-2">
              <span class="text-right">{{ isEnglishVariant ? 'Author of Final Thesis' : 'Baigiamojo darbo autorius' }}</span>
              <div class="border-b border-dotted border-gray-400 min-h-[1.4em] px-2 flex items-end">
                <span class="font-medium">{{ reviewData?.STUDENT_NAME }}</span>
              </div>
            </div>
            <div class="grid grid-cols-[max-content_1fr] gap-x-4">
              <span />
              <p class="text-xs text-gray-500 dark:text-gray-400 text-right">
                {{ isEnglishVariant ? '(first name, last name)' : '(vardas, pavardė)' }}
              </p>
            </div>

            <div class="grid grid-cols-[max-content_1fr] gap-x-4 items-end mt-2">
              <span class="text-right">{{ isEnglishVariant ? 'Reviewer' : 'Recenzentas' }}</span>
              <div class="border-b border-dotted border-gray-400 min-h-[1.4em] px-2 flex items-end">
                <span class="font-medium text-xs">{{ reviewData?.REVIEWER_FULL_DETAILS }}</span>
              </div>
            </div>
            <div class="grid grid-cols-[max-content_1fr] gap-x-4">
              <span />
              <p class="text-xs text-gray-500 dark:text-gray-400 text-right">
                {{ isEnglishVariant ? '(name, surname, workplace, position, pedagogical title, academic degree)' : '(vardas, pavardė, darbovietė, pareigos, pedagoginis vardas, mokslinis laipsnis)' }}
              </p>
            </div>
          </div>

          <div class="space-y-3 mt-8">
            <p><span class="font-medium">{{ isEnglishVariant ? 'Purpose, objectives, problem solving of the final thesis:' : 'Baigiamojo darbo tikslas, uždaviniai, problemos sprendimas:' }}</span> {{ reviewData?.REVIEW_GOALS ?? (isEnglishVariant ? 'Not entered' : 'Neįvesta') }}</p>
            <p><span class="font-medium">{{ isEnglishVariant ? 'Evaluation of the theoretical part:' : 'Teorinės dalies vertinimas:' }}</span> {{ reviewData?.REVIEW_THEORY ?? (isEnglishVariant ? 'Not entered' : 'Neįvesta') }}</p>
            <p><span class="font-medium">{{ isEnglishVariant ? 'Evaluation of the research / project part:' : 'Tiriamosios / projektinės dalies vertinimas:' }}</span> {{ reviewData?.REVIEW_PRACTICAL ?? (isEnglishVariant ? 'Not entered' : 'Neįvesta') }}</p>
            <p><span class="font-medium">{{ isEnglishVariant ? 'Link between the research / project part and the theoretical part:' : 'Tiriamosios / projektinės dalies ryšys su teorine dalimis:' }}</span> {{ reviewData?.REVIEW_THEORY_PRACTICAL_LINK ?? (isEnglishVariant ? 'Not entered' : 'Neįvesta') }}</p>
            <p><span class="font-medium">{{ isEnglishVariant ? 'Results and conclusions of the final thesis:' : 'Baigiamojo darbo rezultatai ir išvados:' }}</span> {{ reviewData?.REVIEW_RESULTS ?? (isEnglishVariant ? 'Not entered' : 'Neįvesta') }}</p>
            <p><span class="font-medium">{{ isEnglishVariant ? 'Practical significance of the final thesis (application possibilities):' : 'Baigiamojo darbo praktinė reikšmė (pritaikymo galimybės):' }}</span> {{ reviewData?.REVIEW_PRACTICAL_SIGNIFICANCE ?? (isEnglishVariant ? 'Not entered' : 'Neįvesta') }}</p>
            <p><span class="font-medium">{{ isEnglishVariant ? 'Language correctness:' : 'Kalbos taisyklingumas:' }}</span> {{ reviewData?.REVIEW_LANGUAGE ?? (isEnglishVariant ? 'Not entered' : 'Neįvesta') }}</p>
            <p><span class="font-medium">{{ isEnglishVariant ? 'Advantages of the final thesis:' : 'Baigiamojo darbo privalumai:' }}</span> {{ reviewData?.REVIEW_PROS ?? (isEnglishVariant ? 'Not entered' : 'Neįvesta') }}</p>
            <p><span class="font-medium">{{ isEnglishVariant ? 'Disadvantages of the final thesis:' : 'Baigiamojo darbo trūkumai:' }}</span> {{ reviewData?.REVIEW_CONS ?? (isEnglishVariant ? 'Not entered' : 'Neįvesta') }}</p>
            <p><span class="font-medium">{{ isEnglishVariant ? 'Questions for the author of the thesis:' : 'Klausimai darbo autoriui:' }}</span> {{ reviewData?.REVIEW_QUESTIONS ?? (isEnglishVariant ? 'Not entered' : 'Neįvesta') }}</p>
          </div>

          <div class="mt-12 pt-8">
            <div class="grid grid-cols-[max-content_1fr_max-content] gap-x-4 items-end">
              <span>{{ isEnglishVariant ? 'Final thesis evaluation (ten-point system)' : 'Baigiamojo darbo įvertinimas (dešimties balų sistemoje)' }}</span>
              <div class="border-b border-dotted border-gray-400 min-h-[1.4em] px-2 flex items-center justify-center">
                <span class="font-bold text-lg">{{ reviewData?.FINAL_GRADE ?? '--' }}</span>
              </div>
              <div class="border-b border-dotted border-gray-400 min-h-[1.4em] px-2 w-48 flex items-end justify-center">
                <span class="font-medium text-sm">{{ reviewData?.REVIEWER_NAME_SIGNATURE }}</span>
              </div>
            </div>

            <div class="grid grid-cols-[max-content_1fr_max-content] gap-x-4">
              <span />
              <p class="text-xs text-center text-gray-500 dark:text-gray-400 pl-2">
                {{ isEnglishVariant ? '(enter)' : '(įrašyti)' }}
              </p>
              <div class="text-right text-xs text-gray-500 dark:text-gray-400 pl-2">
                <p>{{ isEnglishVariant ? '(name, surname, signature)' : '(vardas, pavardė, parašas)' }}</p>
                <div
                  v-if="reviewData?.IS_SIGNED === 1"
                  class="flex items-center justify-end space-x-1 mt-0.5"
                >
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="w-3 h-3 text-green-500"
                  />
                  <span>{{ isEnglishVariant ? 'Signed Electronically' : 'Pasirašyta elektroniniu būdu' }}</span>

                  <span v-if="reviewData?.REPORT_DATE">, {{ formattedDate(reviewData.REPORT_DATE) }}</span>
                </div>
              </div>
            </div>

            <div class="mt-4 text-right text-xs">
              {{ isEnglishVariant ? 'Date' : 'Data' }}: {{ formattedDate(reviewData?.REPORT_DATE) }}
            </div>
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

// Define the expected structure for the combined review data
interface ReviewerDataType {
  STUDENT_NAME: string
  THESIS_TITLE: string
  FACULTY?: string
  DEPARTMENT: string
  REVIEWER_FULL_DETAILS: string
  REVIEWER_NAME_SIGNATURE?: string
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
  REPORT_DATE?: string | Date | number // Allow multiple input types for date
  IS_SIGNED?: number // 0 or 1
  // Display Only from student record
  PROGRAM?: string
  CODE?: string
}

// Define component props
const props = defineProps({
  reviewData: {
    type: Object as PropType<ReviewerDataType | null>, // Allow null if data might be loading
    required: false, // Change to false if it can be null initially
    default: null
  },
  buttonLabel: {
    type: String,
    default: 'Rodyti Recenziją'
  },
  modalTitle: {
    type: String,
    default: 'Baigiamojo Darbo Recenzija (Peržiūra)'
  },
  formVariant: {
    type: String as PropType<'lt' | 'en'>,
    required: true
  }
})

const isEnglishVariant = computed(() => props.formVariant === 'en')

const isOpen = ref(false)

const openModal = () => { isOpen.value = true }
const closeModal = () => { isOpen.value = false }

// Robust Date Formatting Function
const formattedDate = (dateInput: string | Date | number | undefined | null): string => {
  if (!dateInput) return 'N/A'
  try {
    const dateObj = new Date(dateInput)
    if (isNaN(dateObj.getTime())) return 'Invalid Date'
    const locale = isEnglishVariant.value ? 'en-US' : 'lt-LT'
    return dateObj.toLocaleString(locale, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    })
  }
  catch (e) {
    console.error('Error formatting date:', e, 'Input:', dateInput)
    return typeof dateInput === 'string' || typeof dateInput === 'number' ? String(dateInput) : 'Formatting Error'
  }
}
</script>
