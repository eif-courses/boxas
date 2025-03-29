<template>
  <div>
    <!-- Trigger Button -->
    <UButton
      :label="buttonLabel"
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
        <!-- Modal Header (Using the working flex/ml-auto version) -->
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

        <!-- Document Body -->
        <div class="text-sm text-gray-900 dark:text-gray-100 space-y-4 font-serif">
          <!-- Top Right Header -->
          <div class="text-right text-xs mb-10">
            <p>Vilniaus kolegijos baigiamųjų darbų (projektų)</p>
            <p>rengimo ir gynimo tvarkos aprašo</p>
            <p class="font-semibold">
              5 priedas
            </p> {/* Note: Priedas 5 now */}
          </div>

          <!-- Centered Faculty/Dept with dots -->
          <div class="text-center uppercase font-semibold mb-6 space-y-1">
            <p>Vilniaus kolegija</p>
            <div class="flex justify-center items-center gap-x-2">
              <span class="border-b border-dotted border-gray-400 w-24" /> {/* Dotted line */}
              <span>{{ reviewData.FACULTY ?? 'Elektronikos ir informatikos fakultetas' }}</span>
              <span class="border-b border-dotted border-gray-400 w-24" /> {/* Dotted line */}
            </div>
            <div class="flex justify-center items-center gap-x-2">
              <span class="border-b border-dotted border-gray-400 w-32" /> {/* Dotted line */}
              <span>{{ reviewData.DEPARTMENT }} Katedra</span>
              <span class="border-b border-dotted border-gray-400 w-32" /> {/* Dotted line */}
            </div>
          </div>

          <!-- Centered Title -->
          <div class="text-center uppercase font-semibold mb-10">
            <p>Baigiamojo darbo recenzija</p>
          </div>

          <!-- Info Section using Grid -->
          <div class="space-y-1 mb-8">
            <!-- Row 1: Tema -->
            <div class="grid grid-cols-[max-content_1fr] gap-x-4 items-end">
              <span class="text-right">Baigiamojo darbo tema</span>
              <div class="border-b border-dotted border-gray-400 min-h-[1.4em] px-2 flex items-end">
                <span class="font-medium">{{ reviewData.THESIS_TITLE }}</span>
              </div>
            </div>

            <!-- Row 2: Autorius -->
            <div class="grid grid-cols-[max-content_1fr] gap-x-4 items-end">
              <span class="text-right">Baigiamojo darbo autorius</span>
              <div class="border-b border-dotted border-gray-400 min-h-[1.4em] px-2 flex items-end">
                <span class="font-medium">{{ reviewData.STUDENT_NAME }}</span>
              </div>
            </div>
            <div class="grid grid-cols-[max-content_1fr] gap-x-4">
              <span /> {/* Empty cell for alignment */}
              <p class="text-xs text-gray-500 dark:text-gray-400 pl-2">
                (vardas, pavardė)
              </p>
            </div>

            <!-- Row 3: Recenzentas -->
            <div class="grid grid-cols-[max-content_1fr] gap-x-4 items-end mt-2">
              <span class="text-right">Recenzentas</span>
              <div class="border-b border-dotted border-gray-400 min-h-[1.4em] px-2 flex items-end">
                <span class="font-medium text-xs">{{ reviewData.REVIEWER_FULL_DETAILS }}</span>
              </div>
            </div>
            <div class="grid grid-cols-[max-content_1fr] gap-x-4">
              <span /> {/* Empty cell for alignment */}
              <p class="text-xs text-gray-500 dark:text-gray-400 pl-2">
                (vardas, pavardė, darbovietė, pareigos, pedagoginis vardas, mokslinis laipsnis)
              </p>
            </div>
          </div>

          <!-- Review Criteria Section -->
          <div class="space-y-3 mt-8">
            <p><span class="font-medium">Baigiamojo darbo tikslas, uždaviniai, problemos sprendimas:</span> {{ reviewData.REVIEW_GOALS ?? 'Neįvesta' }}</p>
            <p><span class="font-medium">Teorinės dalies vertinimas:</span> {{ reviewData.REVIEW_THEORY ?? 'Neįvesta' }}</p>
            <p><span class="font-medium">Tiriamosios / projektinės dalies vertinimas:</span> {{ reviewData.REVIEW_PRACTICAL ?? 'Neįvesta' }}</p>
            <p><span class="font-medium">Tiriamosios / projektinės dalies ryšys su teorine dalimis:</span> {{ reviewData.REVIEW_THEORY_PRACTICAL_LINK ?? 'Neįvesta' }}</p>
            <p><span class="font-medium">Baigiamojo darbo rezultatai ir išvados:</span> {{ reviewData.REVIEW_RESULTS ?? 'Neįvesta' }}</p>
            <p><span class="font-medium">Baigiamojo darbo praktinė reikšmė (pritaikymo galimybės):</span> {{ reviewData.REVIEW_PRACTICAL_SIGNIFICANCE ?? 'Neįvesta' }}</p>
            <p><span class="font-medium">Kalbos taisyklingumas:</span> {{ reviewData.REVIEW_LANGUAGE ?? 'Neįvesta' }}</p>
            <p><span class="font-medium">Baigiamojo darbo privalumai:</span> {{ reviewData.REVIEW_PROS ?? 'Neįvesta' }}</p>
            <p><span class="font-medium">Baigiamojo darbo trūkumai:</span> {{ reviewData.REVIEW_CONS ?? 'Neįvesta' }}</p>
            <p><span class="font-medium">Klausimai darbo autoriui:</span> {{ reviewData.REVIEW_QUESTIONS ?? 'Neįvesta' }}</p>
          </div>

          <!-- Final Grade / Signature Section -->
          <div class="mt-12 pt-8">
            <div class="grid grid-cols-[max-content_1fr_max-content] gap-x-4 items-end">
              {/* Column 1: Label */}
              <span>Baigiamojo darbo įvertinimas (dešimties balų sistemoje)</span>

              {/* Column 2: Grade line */}
              <div class="border-b border-dotted border-gray-400 min-h-[1.4em] px-2 flex items-center justify-center">
                <span class="font-bold text-lg">{{ reviewData.FINAL_GRADE ?? '--' }}</span>
              </div>

              {/* Column 3: Signature Line - Empty or placeholder */}
              <div class="border-b border-dotted border-gray-400 min-h-[1.4em] px-2 w-48 flex items-end justify-center">
                <span class="font-medium text-sm italic">{{ reviewData.REVIEWER_NAME_SIGNATURE }}</span>
              </div>
            </div>

            <div class="grid grid-cols-[max-content_1fr_max-content] gap-x-4">
              {/* Column 1 */}
              <span />
              {/* Column 2: Sub-label for grade */}
              <p class="text-xs text-center text-gray-500 dark:text-gray-400 pl-2">
                (įrašyti)
              </p>
              {/* Column 3: Sub-label for signature */}
              <p class="text-xs text-right text-gray-500 dark:text-gray-400 pl-2">
                (vardas, pavardė, parašas)
              </p>
            </div>

            <!-- Date (Optional - Add if needed) -->
            <div class="mt-4 text-right text-xs">
              Data: {{ formattedReportDate }}
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <template #footer>
          <div class="text-right">
            <UButton
              color="red"
              label="Uždaryti"
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
  // From StudentRecord
  STUDENT_NAME: string
  THESIS_TITLE: string
  FACULTY?: string // Optional: Can be hardcoded if always the same
  DEPARTMENT: string

  // From ReviewerReport / Reviewer Info
  REVIEWER_FULL_DETAILS: string // Combined name, workplace, titles etc.
  REVIEWER_NAME_SIGNATURE?: string // Name for the signature line

  // From ReviewerReport Content (Add fields as needed based on your API)
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
  FINAL_GRADE?: number | string // The grade itself
  REPORT_DATE?: string | Date // Date of the review report

  // Add other fields from your API response as necessary
}

// Define component props
const props = defineProps({
  reviewData: {
    type: Object as PropType<ReviewerDataType>,
    required: true
  },
  buttonLabel: {
    type: String,
    default: 'Rodyti Recenziją'
  },
  modalTitle: {
    type: String,
    default: 'Baigiamojo Darbo Recenzija (Peržiūra)'
  }
})

// Modal visibility state
const isOpen = ref(false)

const openModal = () => {
  isOpen.value = true
}

const closeModal = () => {
  isOpen.value = false
}

// Optional: Computed property for formatted date
const formattedReportDate = computed(() => {
  if (!props.reviewData.REPORT_DATE) return 'N/A'
  try {
    return new Date(props.reviewData.REPORT_DATE).toLocaleDateString('lt-LT')
  }
  catch (e) {
    return String(props.reviewData.REPORT_DATE)
  }
})

// Helper for dotted lines (can adjust length)
const dottedLine = '.'.repeat(80) // Adjust count for desired length
