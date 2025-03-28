<template>
  <div class="pdf-viewer">
    <div class="pdf-controls">
      <div class="control-group">
        <button
          class="control-btn"
          :disabled="currentPage <= 1 || viewMode === 'all'"
          @click="prevPage"
        >
          Previous
        </button>
        <div
          v-if="viewMode === 'single'"
          class="page-info"
        >
          <span>Page</span>
          <input
            v-model.number="currentPage"
            type="number"
            min="1"
            :max="pageCount"
            :disabled="viewMode === 'all'"
            @change="validatePage"
          >
          <span v-if="pageCount > 0">of {{ pageCount }}</span>
          <span v-else>loading...</span>
        </div>
        <button
          class="control-btn"
          :disabled="currentPage >= pageCount || viewMode === 'all'"
          @click="nextPage"
        >
          Next
        </button>
      </div>

      <div class="view-mode-toggle">
        <button
          class="mode-btn"
          :class="{ active: viewMode === 'single' }"
          @click="setViewMode('single')"
        >
          Single Page
        </button>
        <button
          class="mode-btn"
          :class="{ active: viewMode === 'all' }"
          @click="setViewMode('all')"
        >
          All Pages
        </button>
      </div>
    </div>

    <div class="pdf-container">
      <ClientOnly>
        <!-- Single page mode -->
        <VuePdfEmbed
          v-if="viewMode === 'single'"
          :source="source"
          :page="currentPage"
          annotation-layer
          text-layer
          class="pdf-embed"
          image-resources-path="https://unpkg.com/pdfjs-dist/web/images/"
          @loaded="onPdfLoaded"
        />

        <!-- All pages mode -->
        <VuePdfEmbed
          v-else
          :source="source"
          annotation-layer
          text-layer
          class="pdf-embed"
          image-resources-path="https://unpkg.com/pdfjs-dist/web/images/"
          @loaded="onPdfLoaded"
        />
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import VuePdfEmbed from 'vue-pdf-embed'

// Import optional styles if needed
// import 'vue-pdf-embed/dist/styles/annotationLayer.css'
// import 'vue-pdf-embed/dist/styles/textLayer.css'

const props = defineProps<{
  source: string
}>()

// Basic state
const currentPage = ref(1)
const pageCount = ref(0)
const viewMode = ref('single') // 'single' or 'all'

// Event handlers
const onPdfLoaded = (pdfDocument: any) => {
  pageCount.value = pdfDocument.numPages
  console.log(`PDF loaded with ${pageCount.value} pages`)
}

const prevPage = () => {
  if (currentPage.value > 1 && viewMode.value === 'single') {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < pageCount.value && viewMode.value === 'single') {
    currentPage.value++
  }
}

const validatePage = () => {
  // Ensure page is within valid range
  if (currentPage.value < 1) {
    currentPage.value = 1
  }
  else if (currentPage.value > pageCount.value && pageCount.value > 0) {
    currentPage.value = pageCount.value
  }
}

const setViewMode = (mode: 'single' | 'all') => {
  viewMode.value = mode
}
</script>

<style scoped>
.pdf-viewer {
  width: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.pdf-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 15px;
}

.control-btn {
  padding: 6px 12px;
  background-color: #ffffff;
  border: 1px solid #cccccc;
  border-radius: 4px;
  cursor: pointer;
}

.control-btn:hover:not(:disabled) {
  background-color: #f0f0f0;
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-info input {
  width: 50px;
  text-align: center;
  padding: 4px;
  border: 1px solid #cccccc;
  border-radius: 4px;
}

.view-mode-toggle {
  display: flex;
  gap: 5px;
}

.mode-btn {
  padding: 6px 12px;
  background-color: #ffffff;
  border: 1px solid #cccccc;
  border-radius: 4px;
  cursor: pointer;
}

.mode-btn:hover {
  background-color: #f0f0f0;
}

.mode-btn.active {
  background-color: #e6f7ff;
  border-color: #1890ff;
  color: #1890ff;
}

.pdf-container {
  width: 100%;
  height: 600px;
  overflow-y: auto;
}

.pdf-embed {
  width: 100%;
}
</style>
