<template>
  <div>
    <!-- Debug Section - Remove after fixing -->
    <div
      v-if="showDebug"
      class="debug-info bg-yellow-100 p-4 mb-4 border rounded"
    >
      <h4 class="font-bold mb-2">
        🐛 Debug Information:
      </h4>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p><strong>isStudent:</strong> {{ isStudent }}</p>
          <p><strong>User role:</strong> {{ userStore.user?.role }}</p>
          <p><strong>User authenticated:</strong> {{ userStore.isAuthenticated }}</p>
          <p><strong>User data:</strong> {{ !!userStore.user }}</p>
        </div>
        <div>
          <p><strong>Records loaded:</strong> {{ !!records }}</p>
          <p><strong>Student data:</strong> {{ !!records?.student }}</p>
          <p><strong>Has source code:</strong> {{ !!getSourceCodeDocument() }}</p>
          <p><strong>Has final doc:</strong> {{ hasFinalDocument }}</p>
        </div>
      </div>
      <UButton
        size="xs"
        color="gray"
        class="mt-2"
        @click="showDebug = false"
      >
        Hide Debug
      </UButton>
    </div>

    <div v-if="status === 'pending'">
      <UCard class="p-4 shadow-md">
        <div class="flex justify-center items-center py-12">
          <UIcon
            name="i-heroicons-arrow-path"
            class="animate-spin h-8 w-8 text-primary-500"
          />
          <span class="ml-2">Kraunama...</span>
        </div>
      </UCard>
    </div>

    <div v-else-if="error">
      <UCard class="p-4 shadow-md bg-red-50">
        <p class="text-red-500 font-medium">
          {{ error.message }}
        </p>
        <UButton
          class="mt-4"
          icon="i-heroicons-arrow-path"
          @click="refresh"
        >
          Bandyti dar kartą
        </UButton>
      </UCard>
    </div>

    <UCard
      v-else-if="records?.student"
      class="p-4 shadow-md"
    >
      <template #header>
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-lg font-bold">
              {{ records.student.studentName }} {{ records.student.studentLastname }}
            </h2>
            <p class="text-sm text-gray-500">
              {{ records.student.studentGroup }} - {{ records.student.studyProgram }}
              ({{ records.student.currentYear }})
            </p>
          </div>
          <UButton
            size="xs"
            color="gray"
            variant="ghost"
            @click="showDebug = true"
          >
            🐛 Debug
          </UButton>
        </div>
      </template>

      <!-- Assignment Section with Status and Workflow -->
      <div class="mb-8">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">
            {{ $t('assignment') || 'Baigiamojo darbo užduotis' }}
          </h2>
        </div>

        <!-- Topic Registration Card -->
        <UCard class="border border-gray-200 hover:border-green-300 transition duration-200">
          <div class="flex gap-4">
            <!-- Icon -->
            <div class="flex-shrink-0">
              <div class="w-12 h-12 flex items-center justify-center rounded-lg bg-green-50 text-green-500">
                <UIcon
                  name="i-heroicons-clipboard-document-check"
                  class="h-7 w-7"
                />
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-1">
                    {{ safeTopicData.TITLE || $t('topic_not_registered') || 'Tema neregistruota' }}
                    <span
                      v-if="safeTopicData.TITLE_EN"
                      class="text-gray-500 font-normal italic text-sm ml-1"
                    >
                      ({{ safeTopicData.TITLE_EN }})
                    </span>
                  </h3>

                  <p
                    v-if="safeTopicData.SUPERVISOR"
                    class="text-sm text-gray-600 mb-1"
                  >
                    <span class="font-medium">{{ $t('supervisor') || 'Vadovas' }}:</span>
                    {{ safeTopicData.SUPERVISOR }}
                  </p>

                  <div class="flex items-center mt-2 mb-4">
                    <UIcon
                      name="i-heroicons-clock"
                      class="h-4 w-4 text-gray-500 mr-1"
                    />
                    <span class="text-xs text-gray-500">
                      {{ safeTopicData.COMPLETION_DATE
                        ? formatDate(safeTopicData.COMPLETION_DATE)
                        : ($t('completion_date_not_set') || 'Pabaigos data nenustatyta') }}
                    </span>
                  </div>
                </div>

                <!-- Status Badge -->
                <div class="flex items-center">
                  <UBadge
                    :color="getTopicStatusColor(safeTopicData.status)"
                    variant="subtle"
                    class="flex items-center gap-1"
                  >
                    <UIcon
                      :name="getTopicStatusIcon(safeTopicData.status)"
                      class="h-4 w-4"
                    />
                    {{ getTopicStatusText(safeTopicData.status) }}
                  </UBadge>
                </div>
              </div>

              <!-- Topic Description (Collapsed/Expandable) -->
              <UAccordion
                :items="[{
                  label: showTopicDetails ? ($t('hide_details') || 'Slėpti detales') : ($t('show_details') || 'Rodyti detales'),
                  slot: 'topic-details',
                  defaultOpen: showTopicDetails
                }]"
                @update:model-value="(val) => showTopicDetails = val.length > 0"
              >
                <template #topic-details>
                  <div class="bg-gray-50 p-3 rounded-md border border-gray-100 mt-2 text-sm space-y-3">
                    <div v-if="safeTopicData.PROBLEM">
                      <h4 class="text-xs uppercase font-semibold text-gray-500 mb-1">
                        {{ $t('problem') || 'Problema' }}
                      </h4>
                      <p class="text-gray-700">
                        {{ safeTopicData.PROBLEM }}
                      </p>
                    </div>

                    <div v-if="safeTopicData.OBJECTIVE">
                      <h4 class="text-xs uppercase font-semibold text-gray-500 mb-1">
                        {{ $t('objective') || 'Tikslas' }}
                      </h4>
                      <p class="text-gray-700">
                        {{ safeTopicData.OBJECTIVE }}
                      </p>
                    </div>

                    <div v-if="safeTopicData.TASKS">
                      <h4 class="text-xs uppercase font-semibold text-gray-500 mb-1">
                        {{ $t('tasks') || 'Uždaviniai' }}
                      </h4>
                      <p class="text-gray-700 whitespace-pre-line">
                        {{ safeTopicData.TASKS }}
                      </p>
                    </div>
                  </div>
                </template>
              </UAccordion>

              <!-- Approval Workflow -->
              <div class="border-t border-gray-100 pt-4 mt-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <div
                      v-if="safeTopicData.comments?.length"
                      class="flex items-center"
                    >
                      <UButton
                        size="xs"
                        color="orange"
                        variant="soft"
                        class="pointer-events-none"
                      >
                        <UIcon
                          name="i-heroicons-chat-bubble-left-right"
                          class="mr-1 h-3.5 w-3.5"
                        />
                        {{ safeTopicData.comments.length }} {{ safeTopicData.comments.length === 1 ? 'komentaras' : 'komentarai' }}
                      </UButton>
                    </div>
                  </div>

                  <!-- Topic Registration/Edit Button -->
                  <ClientOnly>
                    <div>
                      <ProjectTopicRegistration
                        class="project-topic-registration-button"
                        :initial-data="safeTopicData"
                        user-role="student"
                        :user-name="getUserFullName"
                        form-variant="lt"
                        :button-label="getTopicButtonLabel"
                        @save="handleSaveRegistration"
                        @comment="handleComment"
                        @status-change="handleStatusChange"
                        @mark-read="handleMarkAsRead"
                        @success="handleSuccess"
                      />
                    </div>
                    <template #fallback>
                      <div class="h-8 w-32 bg-gray-200 rounded animate-pulse" />
                    </template>
                  </ClientOnly>
                </div>
              </div>

              <!-- Approval Workflow Indicators -->
              <div class="mt-4 border-t border-gray-100 pt-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-6">
                    <!-- Student Step -->
                    <div class="flex flex-col items-center">
                      <div
                        class="w-8 h-8 rounded-full flex items-center justify-center"
                        :class="[
                          safeTopicData.status === 'draft' ? 'bg-blue-100 text-blue-600'
                          : 'bg-green-100 text-green-600'
                        ]"
                      >
                        <UIcon
                          :name="safeTopicData.status === 'draft' ? 'i-heroicons-pencil' : 'i-heroicons-check'"
                          class="h-4 w-4"
                        />
                      </div>
                      <span class="text-xs mt-1 text-gray-600">Studentas</span>
                    </div>

                    <!-- Connector -->
                    <div class="h-0.5 w-6 bg-gray-200" />

                    <!-- Supervisor Step -->
                    <div class="flex flex-col items-center">
                      <div
                        class="w-8 h-8 rounded-full flex items-center justify-center"
                        :class="[
                          safeTopicData.status === 'pending_supervisor' ? 'bg-blue-100 text-blue-600'
                          : (safeTopicData.status === 'approved' || safeTopicData.status === 'head_approved') ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                        ]"
                      >
                        <UIcon
                          :name="safeTopicData.status === 'pending_supervisor' ? 'i-heroicons-clock'
                            : (safeTopicData.status === 'approved' || safeTopicData.status === 'head_approved') ? 'i-heroicons-check'
                              : 'i-heroicons-user'"
                          class="h-4 w-4"
                        />
                      </div>
                      <span class="text-xs mt-1 text-gray-600">Vadovas</span>
                    </div>

                    <!-- Connector -->
                    <div class="h-0.5 w-6 bg-gray-200" />

                    <!-- Department Head Step -->
                    <div class="flex flex-col items-center">
                      <div
                        class="w-8 h-8 rounded-full flex items-center justify-center"
                        :class="[
                          safeTopicData.status === 'pending_department' ? 'bg-blue-100 text-blue-600'
                          : safeTopicData.status === 'head_approved' ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                        ]"
                      >
                        <UIcon
                          :name="safeTopicData.status === 'pending_department' ? 'i-heroicons-clock'
                            : safeTopicData.status === 'head_approved' ? 'i-heroicons-check'
                              : 'i-heroicons-user'"
                          class="h-4 w-4"
                        />
                      </div>
                      <span class="text-xs mt-1 text-gray-600">Katedros ved.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <UDivider />

      <!-- Documents Section with Status Indicators -->
      <div class="mb-8">
        <h2 class="text-xl font-bold mb-4">
          {{ $t('documents') || 'Dokumentai' }}
        </h2>

        <!-- Document Cards -->
        <!-- Document Cards with SSR-friendly conditionals -->
        <!-- Document Cards with SSR-safe conditionals -->
        <div class="space-y-4">
          <!-- Source Code Card with Inline Upload -->
          <UCard class="border border-gray-200 hover:border-indigo-300 transition duration-200">
            <div class="flex gap-4">
              <!-- Left Icon -->
              <div class="flex-shrink-0">
                <div class="w-12 h-12 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                  <UIcon
                    name="i-heroicons-code-bracket-square"
                    class="h-7 w-7"
                  />
                </div>
              </div>

              <!-- Content -->
              <div class="flex-1">
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-1">
                      {{ $t('source_code', 'Išeities kodas') }}
                    </h3>

                    <p class="text-sm text-gray-500 mb-4">
                      <template v-if="getSourceCodeDocument()">
                        {{ formatDate(getSourceCodeDocument()?.createdDate) }}
                      </template>
                      <template v-else>
                        {{ $t('no_source_code_yet', 'Išeities kodas dar neįkeltas') }}
                      </template>
                    </p>
                  </div>

                  <!-- Status Badge -->
                  <UBadge
                    :color="getSourceCodeDocument() ? 'green' : 'orange'"
                    variant="subtle"
                  >
                    <span class="flex items-center gap-1">
                      <UIcon :name="getSourceCodeDocument() ? 'i-heroicons-check-circle' : 'i-heroicons-clock'" />
                      {{ getSourceCodeDocument() ? $t('uploaded', 'Įkelta') : $t('missing', 'Trūksta') }}
                    </span>
                  </UBadge>
                </div>

                <!-- Actions - Always render container, hide with CSS if needed -->
                <div class="action-buttons-container">
                  <ClientOnly>
                    <template v-if="getSourceCodeDocument()">
                      <div class="flex gap-2">
                        <UButton
                          :loading="isFetchingDocument"
                          icon="i-heroicons-arrow-down-tray"
                          size="sm"
                          color="indigo"
                          :title="$t('download_source_code', 'Atsisiųsti išeities kodą')"
                          @click="openDocument(getSourceCodeDocument())"
                        >
                          {{ $t('download', 'Atsisiųsti') }}
                        </UButton>

                        <UButton
                          v-if="isStudentAuthenticated"
                          icon="i-heroicons-arrow-up-tray"
                          size="sm"
                          color="indigo"
                          variant="outline"
                          @click="showSourceCodeUpload = !showSourceCodeUpload"
                        >
                          {{ $t('update_source_code', 'Atnaujinti kodą') }}
                        </UButton>
                      </div>
                    </template>
                    <template v-else-if="isStudentAuthenticated">
                      <div class="flex gap-2">
                        <UButton
                          icon="i-heroicons-arrow-up-tray"
                          size="sm"
                          color="indigo"
                          @click="showSourceCodeUpload = true"
                        >
                          {{ $t('upload_source_code', 'Įkelti kodą') }}
                        </UButton>
                      </div>
                    </template>
                    <template #fallback>
                      <div class="h-8 w-32 bg-gray-200 rounded animate-pulse" />
                    </template>
                  </ClientOnly>
                </div>

                <!-- Inline Upload Form - Server-side safe -->
                <template v-if="showSourceCodeUpload">
                  <div class="mt-4">
                    <div class="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <p
                        v-if="!getSourceCodeDocument()"
                        class="text-sm text-gray-600 mb-4"
                      >
                        {{ $t('upload_source_code_prompt', 'Įkelkite išeities kodą ZIP formate') }}
                      </p>
                      <p
                        v-else
                        class="text-sm text-gray-600 mb-4"
                      >
                        {{ $t('update_source_code_prompt', 'Pasirinkite naują ZIP failą, kuris pakeis dabartinį kodą') }}
                      </p>

                      <ClientOnly>
                        <FileUploader
                          type="zip"
                          @zip-uploaded="handleZipUploadInline"
                        />
                        <template #fallback>
                          <div class="h-20 bg-gray-200 rounded animate-pulse" />
                        </template>
                      </ClientOnly>

                      <div
                        v-if="getSourceCodeDocument()"
                        class="mt-3 flex justify-end"
                      >
                        <UButton
                          size="sm"
                          color="gray"
                          variant="ghost"
                          @click="showSourceCodeUpload = false"
                        >
                          {{ $t('cancel', 'Atšaukti') }}
                        </UButton>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </UCard>

          <!-- Final Document Card with Inline Upload -->
          <UCard class="border border-gray-200 hover:border-primary-300 transition duration-200">
            <div class="flex gap-4">
              <!-- Left Icon -->
              <div class="flex-shrink-0">
                <div class="w-12 h-12 flex items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                  <UIcon
                    name="i-heroicons-document-text"
                    class="h-7 w-7"
                  />
                </div>
              </div>

              <!-- Content -->
              <div class="flex-1">
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-1">
                      {{ $t('final_project', 'Baigiamasis darbas') }}
                    </h3>

                    <p class="text-sm text-gray-500 mb-4">
                      <template v-if="getFinalDocument()">
                        {{ formatDate(getFinalDocument()?.createdDate) }}
                      </template>
                      <template v-else>
                        {{ $t('no_document_yet', 'Dokumentas dar neįkeltas') }}
                      </template>
                    </p>
                  </div>

                  <!-- Status Badge -->
                  <UBadge
                    :color="getFinalDocument() ? 'green' : 'orange'"
                    variant="subtle"
                  >
                    <span class="flex items-center gap-1">
                      <UIcon :name="getFinalDocument() ? 'i-heroicons-check-circle' : 'i-heroicons-clock'" />
                      {{ getFinalDocument() ? $t('uploaded', 'Įkelta') : $t('missing', 'Trūksta') }}
                    </span>
                  </UBadge>
                </div>

                <!-- Actions -->
                <div class="action-buttons-container">
                  <ClientOnly>
                    <template v-if="getFinalDocument()">
                      <div class="flex gap-2">
                        <UButton
                          :loading="isFetchingDocument"
                          icon="i-heroicons-eye"
                          size="sm"
                          color="primary"
                          @click="openDocument(getFinalDocument())"
                        >
                          {{ $t('view', 'Peržiūrėti') }}
                        </UButton>

                        <UButton
                          v-if="isStudentAuthenticated"
                          icon="i-heroicons-arrow-up-tray"
                          size="sm"
                          color="primary"
                          variant="outline"
                          @click="showDocumentUpload = !showDocumentUpload"
                        >
                          {{ $t('update_document', 'Atnaujinti dokumentą') }}
                        </UButton>
                      </div>
                    </template>
                    <template v-else-if="isStudentAuthenticated">
                      <div class="flex gap-2">
                        <UButton
                          icon="i-heroicons-arrow-up-tray"
                          size="sm"
                          color="primary"
                          @click="showDocumentUpload = true"
                        >
                          {{ $t('upload_document', 'Įkelti dokumentą') }}
                        </UButton>
                      </div>
                    </template>
                    <template #fallback>
                      <div class="h-8 w-32 bg-gray-200 rounded animate-pulse" />
                    </template>
                  </ClientOnly>
                </div>

                <!-- Inline Upload Form -->
                <template v-if="showDocumentUpload">
                  <div class="mt-4">
                    <div class="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <p
                        v-if="!getFinalDocument()"
                        class="text-sm text-gray-600 mb-4"
                      >
                        {{ $t('upload_document_prompt', 'Įkelkite baigiamąjį darbą PDF formate') }}
                      </p>
                      <p
                        v-else
                        class="text-sm text-gray-600 mb-4"
                      >
                        {{ $t('update_document_prompt', 'Pasirinkite naują PDF failą, kuris pakeis dabartinį dokumentą') }}
                      </p>

                      <ClientOnly>
                        <FileUploader
                          type="pdf"
                          @document-uploaded="handleDocumentUploadInline"
                        />
                        <template #fallback>
                          <div class="h-20 bg-gray-200 rounded animate-pulse" />
                        </template>
                      </ClientOnly>

                      <div
                        v-if="getFinalDocument()"
                        class="mt-3 flex justify-end"
                      >
                        <UButton
                          size="sm"
                          color="gray"
                          variant="ghost"
                          @click="showDocumentUpload = false"
                        >
                          {{ $t('cancel', 'Atšaukti') }}
                        </UButton>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </UCard>

          <!-- Company Recommendation Card with Inline Upload -->
          <UCard class="border border-gray-200 hover:border-emerald-300 transition duration-200">
            <div class="flex gap-4">
              <!-- Left Icon -->
              <div class="flex-shrink-0">
                <div class="w-12 h-12 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
                  <UIcon
                    name="i-heroicons-building-office-2"
                    class="h-7 w-7"
                  />
                </div>
              </div>

              <!-- Content -->
              <div class="flex-1">
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-1">
                      {{ $t('company_recommendation', 'Įmonės rekomendacija') }}
                    </h3>

                    <p class="text-sm text-gray-500 mb-4">
                      <template v-if="getCompanyRecommendation()">
                        {{ formatDate(getCompanyRecommendation()?.createdDate) }}
                      </template>
                      <template v-else>
                        {{ $t('no_recommendation_yet', 'Rekomendacija dar neįkelta') }}
                      </template>
                    </p>
                  </div>

                  <!-- Status Badge -->
                  <UBadge
                    :color="getCompanyRecommendation() ? 'green' : 'orange'"
                    variant="subtle"
                  >
                    <span class="flex items-center gap-1">
                      <UIcon :name="getCompanyRecommendation() ? 'i-heroicons-check-circle' : 'i-heroicons-clock'" />
                      {{ getCompanyRecommendation() ? $t('uploaded', 'Įkelta') : $t('missing', 'Trūksta') }}
                    </span>
                  </UBadge>
                </div>

                <!-- Actions -->
                <div class="action-buttons-container">
                  <ClientOnly>
                    <template v-if="getCompanyRecommendation()">
                      <div class="flex gap-2">
                        <UButton
                          :loading="isFetchingDocument"
                          icon="i-heroicons-eye"
                          size="sm"
                          color="emerald"
                          @click="openDocument(getCompanyRecommendation())"
                        >
                          {{ $t('view', 'Peržiūrėti') }}
                        </UButton>

                        <UButton
                          v-if="isStudentAuthenticated"
                          icon="i-heroicons-arrow-up-tray"
                          size="sm"
                          color="emerald"
                          variant="outline"
                          @click="showRecommendationUpload = !showRecommendationUpload"
                        >
                          {{ $t('update_recommendation', 'Atnaujinti rekomendaciją') }}
                        </UButton>
                      </div>
                    </template>
                    <template v-else-if="isStudentAuthenticated">
                      <div class="flex gap-2">
                        <UButton
                          icon="i-heroicons-arrow-up-tray"
                          size="sm"
                          color="emerald"
                          @click="showRecommendationUpload = true"
                        >
                          {{ $t('upload_recommendation', 'Įkelti rekomendaciją') }}
                        </UButton>
                      </div>
                    </template>
                    <template #fallback>
                      <div class="h-8 w-32 bg-gray-200 rounded animate-pulse" />
                    </template>
                  </ClientOnly>
                </div>

                <!-- Inline Upload Form -->
                <template v-if="showRecommendationUpload">
                  <div class="mt-4">
                    <div class="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <p
                        v-if="!getCompanyRecommendation()"
                        class="text-sm text-gray-600 mb-4"
                      >
                        {{ $t('upload_recommendation_prompt', 'Įkelkite įmonės rekomendaciją PDF formate') }}
                      </p>
                      <p
                        v-else
                        class="text-sm text-gray-600 mb-4"
                      >
                        {{ $t('update_recommendation_prompt', 'Pasirinkite naują PDF failą, kuris pakeis dabartinę rekomendaciją') }}
                      </p>

                      <ClientOnly>
                        <FileUploader
                          type="recommendation"
                          @recommendation-uploaded="handleRecommendationUploadInline"
                        />
                        <template #fallback>
                          <div class="h-20 bg-gray-200 rounded animate-pulse" />
                        </template>
                      </ClientOnly>

                      <div
                        v-if="getCompanyRecommendation()"
                        class="mt-3 flex justify-end"
                      >
                        <UButton
                          size="sm"
                          color="gray"
                          variant="ghost"
                          @click="showRecommendationUpload = false"
                        >
                          {{ $t('cancel', 'Atšaukti') }}
                        </UButton>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <UDivider />

      <!-- Reports Section -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold mb-4">
          {{ $t('reports') || 'Ataskaitos' }}
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Supervisor Report Card -->
          <UCard
            v-if="records.supervisorReports && records.supervisorReports.length > 0"
            class="bg-gray-50"
          >
            <div class="flex items-center">
              <UIcon
                name="i-heroicons-clipboard-document-check"
                class="h-8 w-8 text-green-500 mr-3"
              />
              <div class="flex-1">
                <h4 class="font-medium">
                  {{ $t('supervisor_report') || 'Vadovo ataskaita' }}
                </h4>
                <p class="text-xs text-gray-500">
                  {{ formatDate(records.supervisorReports[0].createdDate) }}
                </p>
              </div>
              <PreviewSupervisorReport
                :document-data="getSupervisorReportData(records.supervisorReports[0])"
                :button-label="$t('view') || 'Peržiūrėti'"
                :form-variant="determineFormVariant(records.student?.studentGroup)"
                :modal-title="$t('supervisor_report') || 'Vadovo ataskaita'"
              />
            </div>
          </UCard>

          <!-- Supervisor Report Not Available -->
          <UCard
            v-else
            class="bg-gray-50 border border-dashed border-gray-300"
          >
            <div class="flex items-center">
              <UIcon
                name="i-heroicons-clipboard-document"
                class="h-8 w-8 text-gray-400 mr-3"
              />
              <div class="flex-1">
                <h4 class="font-medium">
                  {{ $t('supervisor_report') || 'Vadovo ataskaita' }}
                </h4>
                <p class="text-xs text-gray-500">
                  {{ $t('not_available_yet') || 'Dar nepateikta' }}
                </p>
              </div>
              <UButton
                disabled
                icon="i-heroicons-eye"
                size="xs"
                color="gray"
                variant="ghost"
              />
            </div>
          </UCard>

          <!-- Reviewer Report Card -->
          <UCard
            v-if="records.reviewerReports && records.reviewerReports.length > 0"
            class="bg-gray-50"
          >
            <div class="flex items-center">
              <UIcon
                name="i-heroicons-clipboard-document-list"
                class="h-8 w-8 text-orange-500 mr-3"
              />
              <div class="flex-1">
                <h4 class="font-medium">
                  {{ $t('reviewer_report') || 'Recenzento ataskaita' }}
                </h4>
                <p class="text-xs text-gray-500">
                  {{ formatDate(records.reviewerReports[0].createdDate) }}
                </p>
              </div>
              <div v-if="getReviewerModalData(records)">
                <PreviewReviewerReport
                  :review-data="getReviewerModalData(records)"
                  :form-variant="determineFormVariant(records.student?.studentGroup)"
                  :button-label="$t('view') || 'Peržiūrėti'"
                />
              </div>
            </div>
          </UCard>

          <!-- Reviewer Report Not Available -->
          <UCard
            v-else
            class="bg-gray-50 border border-dashed border-gray-300"
          >
            <div class="flex items-center">
              <UIcon
                name="i-heroicons-clipboard-document"
                class="h-8 w-8 text-gray-400 mr-3"
              />
              <div class="flex-1">
                <h4 class="font-medium">
                  {{ $t('reviewer_report') || 'Recenzento ataskaita' }}
                </h4>
                <p class="text-xs text-gray-500">
                  {{ $t('not_available_yet') || 'Dar nepateikta' }}
                </p>
              </div>
              <UButton
                disabled
                icon="i-heroicons-eye"
                size="xs"
                color="gray"
                variant="ghost"
              />
            </div>
          </UCard>
        </div>
      </div>

      <UDivider />

      <!-- Video Section -->
      <!-- Updated Video Section for Student.vue -->
      <div>
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">
            {{ $t('video_presentation') || 'Vaizdo pristatymas' }}
          </h3>

          <!-- Video Upload Button -->
          <ClientOnly>
            <UButton
              v-if="isStudentAuthenticated"
              icon="i-heroicons-video-camera"
              size="sm"
              :color="records.videos?.length > 0 ? 'orange' : 'primary'"
              :variant="records.videos?.length > 0 ? 'outline' : 'solid'"
              @click="openVideoUploader = true"
            >
              {{ records.videos?.length > 0 ? ($t('update_video') || 'Atnaujinti vaizdo įrašą') : ($t('upload_video') || 'Įkelti vaizdo įrašą') }}
            </UButton>
            <template #fallback>
              <div class="h-8 w-32 bg-gray-200 rounded animate-pulse" />
            </template>
          </ClientOnly>
        </div>

        <!-- Video Player with Enhanced Support -->
        <div
          v-if="records.videos?.length > 0"
          class="bg-gray-50 rounded-md overflow-hidden"
        >
          <!-- Enhanced Video Player with AVI support and download fallback -->
          <VideoPlayer
            :video-key="records.videos[0].key"
            :content-type="records.videos[0].contentType"
            :filename="records.videos[0].filename"
            :file-size="records.videos[0].size"
            class="w-full aspect-video"
          />

          <!-- Video Info Panel -->
          <div class="p-3 flex justify-between items-center border-t border-gray-200">
            <div>
              <h4 class="font-medium">
                {{ records.videos[0].filename }}
              </h4>
              <div class="flex items-center gap-4 text-xs text-gray-500 mt-1">
                <span>{{ formatDate(records.videos[0].createdAt) }}</span>
                <span>{{ records.videos[0].contentType }}</span>
                <span v-if="records.videos[0].size">{{ formatFileSize(records.videos[0].size) }}</span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <!-- Direct Download Button -->
              <UButton
                icon="i-heroicons-arrow-down-tray"
                size="sm"
                color="gray"
                variant="ghost"
                :title="$t('download_video') || 'Atsisiųsti vaizdo įrašą'"
                @click="downloadVideoFile"
              >
                {{ $t('download') || 'Atsisiųsti' }}
              </UButton>

              <!-- Replace Button -->
              <ClientOnly>
                <UButton
                  v-if="isStudentAuthenticated"
                  icon="i-heroicons-pencil"
                  size="sm"
                  color="orange"
                  variant="ghost"
                  :title="$t('replace_video') || 'Pakeisti įrašą'"
                  @click="openVideoUploader = true"
                >
                  {{ $t('replace_video') || 'Pakeisti įrašą' }}
                </UButton>
              </ClientOnly>
            </div>
          </div>
        </div>

        <!-- No Video Message -->
        <div
          v-else
          class="bg-gray-50 p-6 rounded-md border border-dashed border-gray-300 text-center"
        >
          <UIcon
            name="i-heroicons-video-camera"
            class="h-10 w-10 text-gray-400 mx-auto mb-2"
          />
          <p class="text-gray-600">
            {{ $t('no_video_uploaded') || 'Nėra įkelto vaizdo įrašo' }}
          </p>
          <p
            v-if="isStudentAuthenticated"
            class="text-sm text-gray-500 mt-2"
          >
            {{ $t('upload_video_prompt') || 'Įkelkite vaizdo įrašą, kuriame pristatomas jūsų darbas' }}
          </p>

          <ClientOnly>
            <div
              v-if="isStudentAuthenticated"
              class="mt-4"
            >
              <VideoUploader
                title="Įkelkite savo programinio kodo paaiškinimo vaizdą"
                @video-uploaded="handleVideoUploadSuccess"
              />
            </div>
          </ClientOnly>
        </div>
      </div>

      <!-- Video Upload Modal with Format Information -->
      <UModal v-model="openVideoUploader">
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              {{ records.videos?.length > 0 ? ($t('update_video_presentation') || 'Atnaujinti vaizdo pristatymą') : ($t('upload_video_presentation') || 'Įkelti vaizdo pristatymą') }}
            </h3>
          </template>

          <div class="p-4">
            <p class="mb-4 text-sm text-gray-600">
              {{ records.videos?.length > 0
                ? ($t('update_video_instructions') || 'Pasirinkite naują vaizdo įrašą, kuris pakeis dabartinį pristatymą')
                : ($t('upload_video_instructions') || 'Pasirinkite vaizdo įrašą su jūsų darbo pristatymu') }}
            </p>

            <!-- Format Information -->
            <div class="mb-4 p-4 bg-blue-50 rounded-md">
              <h4 class="font-medium text-blue-900 mb-2">
                <UIcon
                  name="i-heroicons-information-circle"
                  class="inline mr-1"
                />
                {{ $t('video_format_info') || 'Vaizdo formatų informacija' }}
              </h4>
              <div class="text-sm text-blue-800 space-y-1">
                <p><strong>{{ $t('recommended_formats') || 'Rekomenduojami formatai:' }}</strong> MP4, WebM</p>
                <p><strong>{{ $t('supported_formats') || 'Palaikomi formatai:' }}</strong> MP4, WebM, MOV</p>
                <p><strong>{{ $t('limited_support') || 'Ribotas palaikymas:' }}</strong> AVI, WMV (bus galima atsisiųsti)</p>
              </div>
            </div>

            <VideoUploader
              :title="records.videos?.length > 0 ? 'Atnaujinti vaizdo įrašą' : ''"
              @video-uploaded="handleVideoUploadSuccess"
            />
          </div>

          <template #footer>
            <div class="flex justify-end">
              <UButton
                color="gray"
                variant="ghost"
                @click="openVideoUploader = false"
              >
                {{ $t('cancel') || 'Atšaukti' }}
              </UButton>
            </div>
          </template>
        </UCard>
      </UModal>
    </UCard>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '~/stores/auth'
import { useFormUtilities } from '~/composables/useFormUtilities'
import { useReviewerReports } from '~/composables/useReviewerReports'
import { useUnixDateUtils } from '~/composables/useUnixDateUtils'
import { useProjectTopic } from '~/composables/useProjectTopic'
import FileUploader from '~/components/FileUploader.vue'

// UI state
const openVideoUploader = ref(false)
const isFetchingDocument = ref(false)
const isSubmitting = ref(false)
const showDebug = ref(false)
const showForceButton = ref(false)
const showTopicDetails = ref(false)
const showSourceCodeUpload = ref(false)
const showDocumentUpload = ref(false)
const showRecommendationUpload = ref(false)

const { t } = useI18n()

// User role state
const userStore = useAuthStore()

// Enhanced authentication checks
const isStudent = computed(() => {
  const result = userStore.isStudent
  if (import.meta.client) {
    console.log('isStudent computed:', result, 'from userStore:', userStore.user?.role)
  }
  return result
})

// Alternative authentication check
const isStudentAuthenticated = computed(() => {
  const user = userStore.user
  const isAuth = userStore.isAuthenticated
  const role = user?.role
  const result = isAuth && role === 'student'

  if (import.meta.client) {
    console.log('isStudentAuthenticated:', {
      user: !!user,
      isAuth,
      role,
      result
    })
  }

  return result
})

// Format file size utility
const formatFileSize = (bytes) => {
  if (!bytes) return 'N/A'

  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'

  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

// Download video file directly
const downloadVideoFile = async () => {
  if (!records.value?.videos?.[0]) return

  try {
    const video = records.value.videos[0]

    // Get the video URL
    const response = await $fetch(`/api/students/videos/url/${video.key}`)

    if (response?.url) {
      // Create download link
      const link = document.createElement('a')
      link.href = response.url
      link.download = video.filename || 'video'
      link.target = '_blank'

      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Show success message
      useToast().add({
        title: t('success') || 'Sėkmingai',
        description: t('video_download_started') || 'Vaizdo įrašo atsisiuntimas pradėtas',
        color: 'green'
      })
    }
    else {
      throw new Error('Video URL not available')
    }
  }
  catch (error) {
    console.error('Error downloading video:', error)

    useToast().add({
      title: t('error') || 'Klaida',
      description: t('video_download_failed') || 'Nepavyko atsisiųsti vaizdo įrašo',
      color: 'red'
    })
  }
}

// Debug function for auth issues
const handleAuthIssue = () => {
  if (import.meta.client) {
    console.log('=== AUTH DEBUG ===')
    console.log('UserStore:', JSON.parse(JSON.stringify(userStore)))
    console.log('User:', userStore.user)
    console.log('isAuthenticated:', userStore.isAuthenticated)
    console.log('isStudent:', userStore.isStudent)
    console.log('==================')
  }

  showForceButton.value = true

  useToast().add({
    title: 'Auth Debug',
    description: 'Check console for auth details. Force button enabled.',
    color: 'orange'
  })
}

// Utility composables
const { formatUnixDate, formatUnixDateTime } = useUnixDateUtils()
const { determineFormVariant } = useFormUtilities()
const { getReviewerModalData } = useReviewerReports()

// Fetch student data
const { data: records, refresh, status, error } = useFetch('/api/students/get-documents')

// Get user's full name from records
const getUserFullName = computed(() => {
  if (!records.value?.student) return 'Student'
  return `${records.value.student.studentName} ${records.value.student.studentLastname}`
})

// Topic data for student
const {
  isLoading,
  error: topicError,
  topicData,
  fetchTopicRegistration,
  saveTopicRegistration,
  addComment,
  changeStatus,
  markCommentAsRead
} = useProjectTopic()

// Ensure topicData is never null
const safeTopicData = computed(() => {
  return topicData.value || {
    studentRecordId: records.value?.student?.id || null,
    GROUP: records.value?.student?.studentGroup || '',
    NAME: records.value?.student ? `${records.value.student.studentName} ${records.value.student.studentLastname}` : '',
    TITLE: '',
    TITLE_EN: '',
    PROBLEM: '',
    OBJECTIVE: '',
    TASKS: '',
    COMPLETION_DATE: null,
    SUPERVISOR: '',
    IS_REGISTERED: 0,
    status: 'draft',
    comments: []
  }
})

// Get button label based on topic status
const getTopicButtonLabel = computed(() => {
  const currentTopic = topicData.value || safeTopicData.value
  if (!currentTopic || !currentTopic.status || currentTopic.status === 'draft') {
    return t('register_topic') || 'Registruoti temą'
  }
  return t('edit_topic') || 'Redaguoti temą'
})

// Helper function to get company recommendation document
const getCompanyRecommendation = () => {
  if (!records.value?.documents) return null
  return records.value.documents.find(doc => doc.documentType === 'RECOMMENDATION')
}

// Initialize topic data with default values to prevent null props
const initializeTopicData = () => {
  if (!records.value?.student) return

  const student = records.value.student

  // Always ensure topicData has a valid object
  if (!topicData.value) {
    topicData.value = {
      studentRecordId: student.id,
      GROUP: student.studentGroup || '',
      NAME: `${student.studentName} ${student.studentLastname}`,
      TITLE: '',
      TITLE_EN: '',
      PROBLEM: '',
      OBJECTIVE: '',
      TASKS: '',
      COMPLETION_DATE: null,
      SUPERVISOR: '',
      IS_REGISTERED: 0,
      status: 'draft',
      comments: []
    }
  }
}

// Handler for saving topic registration
const handleSaveRegistration = async (data) => {
  isSubmitting.value = true

  try {
    // Make sure we have the studentRecordId
    if (!records.value?.student) {
      throw new Error('Student record not found')
    }

    // Create or update topic based on whether we have an id
    await saveTopicRegistration({
      ...data,
      // Merge with student ID
      studentRecordId: records.value.student.id
    })

    // Refresh topic data after save
    await fetchTopicRegistration(records.value.student.id)

    // Show success message
    useToast().add({
      title: t('success') || 'Sėkmingai',
      description: t('topic_saved_success') || 'Tema sėkmingai išsaugota',
      color: 'green'
    })
  }
  catch (err) {
    if (import.meta.client) {
      console.error('Error saving topic:', err)
    }

    // Show error message
    useToast().add({
      title: t('error') || 'Klaida',
      description: err.message || (t('topic_save_error') || 'Nepavyko išsaugoti temos'),
      color: 'red'
    })
  }
  finally {
    isSubmitting.value = false
  }
}

// Handler for comments
const handleComment = async (comment) => {
  try {
    await addComment(comment)

    // Refresh data
    await fetchTopicRegistration(records.value?.student.id)

    // Show success message
    useToast().add({
      title: t('success') || 'Sėkmingai',
      description: t('comment_added') || 'Komentaras pridėtas',
      color: 'green'
    })
  }
  catch (err) {
    if (import.meta.client) {
      console.error('Error adding comment:', err)
    }

    // Show error message
    useToast().add({
      title: t('error') || 'Klaida',
      description: err.message || (t('comment_error') || 'Nepavyko pridėti komentaro'),
      color: 'red'
    })
  }
}

// Handler for status changes
const handleStatusChange = async (status) => {
  try {
    await changeStatus(status)

    // Refresh data
    await fetchTopicRegistration(records.value?.student.id)

    // Show success message
    useToast().add({
      title: t('success') || 'Sėkmingai',
      description: t('status_updated') || 'Būsena atnaujinta',
      color: 'green'
    })
  }
  catch (err) {
    if (import.meta.client) {
      console.error('Error changing status:', err)
    }

    // Show error message
    useToast().add({
      title: t('error') || 'Klaida',
      description: err.message || (t('status_update_error') || 'Nepavyko atnaujinti būsenos'),
      color: 'red'
    })
  }
}

// Handler for marking comments as read
const handleMarkAsRead = async (commentId) => {
  try {
    await markCommentAsRead(commentId)
  }
  catch (err) {
    if (import.meta.client) {
      console.error('Error marking comment as read:', err)
    }
  }
}

// Handler for success
const handleSuccess = async () => {
  // Refresh data after any success
  if (records.value?.student) {
    await fetchTopicRegistration(records.value.student.id)
  }
}

// Document helpers
const getFinalDocument = () => {
  if (!records.value?.documents) return null
  return records.value.documents.find(doc => doc.documentType === 'PDF')
}

const getSourceCodeDocument = () => {
  if (!records.value?.documents) return null
  return records.value.documents.find(doc => doc.documentType === 'ZIP')
}

const hasFinalDocument = computed(() => !!getFinalDocument())

// Utility functions
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A'
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

// Get supervisor report data for preview component
const getSupervisorReportData = (report) => {
  const student = records.value?.student

  if (!student || !report) return null

  return {
    // Data from main student record
    NAME: `${student.studentName} ${student.studentLastname}`,
    PROGRAM: student.studyProgram || 'N/A',
    CODE: student.programCode || 'N/A',
    TITLE: student.finalProjectTitle || 'N/A',
    DEPT: student.department || 'Elektronikos ir informatikos fakultetas',
    WORK: report.supervisorWorkplace || 'Vilniaus kolegija Elektronikos ir informatikos fakultetas',
    // Data specific to THIS report
    EXPL: report.supervisorComments || '',
    OM: report.otherMatch || 0,
    SSM: report.oneMatch || 0,
    STUM: report.ownMatch || 0,
    JM: report.joinMatch || 0,
    createdDate: formatUnixDateTime(report.createdDate),
    PASS: report.isPassOrFailed || 1,
    // Supervisor details
    SUPER: report.supervisorName || 'N/A Supervisor',
    POS: report.supervisorPosition || 'N/A Position',
    DATE: formatUnixDate(report.createdDate)
  }
}

// Inline upload handlers
const handleZipUploadInline = async (result) => {
  if (import.meta.client) {
    console.log('ZIP file uploaded successfully', result)
  }

  // Close the inline upload form
  showSourceCodeUpload.value = false

  // Refresh data
  await refresh()

  // Show success notification
  useToast().add({
    title: t('success') || 'Sėkmingai',
    description: getSourceCodeDocument()
      ? (t('source_code_updated_success') || 'Išeities kodas sėkmingai atnaujintas')
      : (t('source_code_uploaded_success') || 'Išeities kodas sėkmingai įkeltas'),
    color: 'green'
  })
}

const handleDocumentUploadInline = async (result) => {
  if (import.meta.client) {
    console.log('Document uploaded successfully', result)
  }

  // Close the inline upload form
  showDocumentUpload.value = false

  // Refresh data
  await refresh()

  // Show success notification
  useToast().add({
    title: t('success') || 'Sėkmingai',
    description: getFinalDocument()
      ? (t('document_updated_success') || 'Dokumentas sėkmingai atnaujintas')
      : (t('document_uploaded_success') || 'Dokumentas sėkmingai įkeltas'),
    color: 'green'
  })
}

const handleRecommendationUploadInline = async (result) => {
  if (import.meta.client) {
    console.log('Recommendation document uploaded successfully', result)
  }

  // Close the inline upload form
  showRecommendationUpload.value = false

  // Refresh data
  await refresh()

  // Show success notification
  useToast().add({
    title: t('success') || 'Sėkmingai',
    description: getCompanyRecommendation()
      ? (t('recommendation_updated_success') || 'Rekomendacija sėkmingai atnaujinta')
      : (t('recommendation_uploaded_success') || 'Rekomendacija sėkmingai įkelta'),
    color: 'green'
  })
}

// Handler for video upload
const handleVideoUploadSuccess = async (result) => {
  if (import.meta.client) {
    console.log('Video uploaded successfully:', result)
  }
  openVideoUploader.value = false
  await refresh()

  // Show success notification
  useToast().add({
    title: t('success') || 'Sėkmingai',
    description: records.value?.videos?.length > 0
      ? (t('video_updated_success') || 'Vaizdo įrašas sėkmingai atnaujintas')
      : (t('video_uploaded_success') || 'Vaizdo įrašas sėkmingai įkeltas'),
    color: 'green'
  })
}

// File handling
async function getFile(fileName) {
  try {
    const response = await $fetch(`/api/blob/get/${fileName}`)
    if (response?.url) {
      return response.url
    }
    throw new Error('Invalid response from server')
  }
  catch (error) {
    if (import.meta.client) {
      console.error('Error fetching file URL:', error)
    }
    return ''
  }
}

const openDocument = async (doc) => {
  if (!doc || !import.meta.client) return

  isFetchingDocument.value = true

  const fileUrl = await getFile(doc.filePath)

  isFetchingDocument.value = false

  if (fileUrl) {
    if (doc.documentType === 'PDF' || doc.documentType === 'RECOMMENDATION') {
      window.open(fileUrl, '_blank')
    }
    else if (doc.documentType === 'ZIP') {
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = doc.filePath.split('/').pop() || 'download.zip'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
}

// Helper functions for topic status display
const getTopicStatusColor = (status) => {
  switch (status) {
    case 'draft': return 'blue'
    case 'submitted': return 'blue'
    case 'approved': return 'blue'
    case 'pending_department': return 'purple'
    case 'head_approved': return 'green'
    case 'needs_revisio': return 'orange'
    default: return 'gray'
  }
}

const getTopicStatusIcon = (status) => {
  switch (status) {
    case 'draft': return 'i-heroicons-pencil-square'
    case 'submitted':
    case 'pending_department': return 'i-heroicons-clock'
    case 'approved':
    case 'head_approved': return 'i-heroicons-check-badge'
    case 'needs_revision': return 'i-heroicons-x-circle'
    default: return 'i-heroicons-question-mark-circle'
  }
}

const getTopicStatusText = (status) => {
  switch (status) {
    case 'draft': return t('draft') || 'Juodraštis'
    case 'submitted': return t('pending_supervisor') || 'Laukiama vadovo'
    case 'approved': return t('approved_supervisor') || 'Patvirtinta vadovo'
    case 'pending_department': return t('pending_department') || 'Laukiama katedros'
    case 'head_approved': return t('approved_final') || 'Patvirtinta'
    case 'needs_revision': return t('needs_revision') || 'Reikia pataisymų'
    default: return t('unknown') || 'Nežinoma'
  }
}

// Debug and monitoring functions
const logAuthState = () => {
  if (import.meta.client) {
    console.log('=== AUTHENTICATION STATE ===')
    console.log('userStore.user:', userStore.user)
    console.log('userStore.isAuthenticated:', userStore.isAuthenticated)
    console.log('userStore.isStudent:', userStore.isStudent)
    console.log('isStudent computed:', isStudent.value)
    console.log('isStudentAuthenticated computed:', isStudentAuthenticated.value)
    console.log('============================')
  }
}

const checkButtonVisibility = () => {
  if (import.meta.client) {
    console.log('=== BUTTON VISIBILITY CHECK ===')
    console.log('isStudentAuthenticated:', isStudentAuthenticated.value)
    console.log('hasFinalDocument:', hasFinalDocument.value)
    console.log('getSourceCodeDocument():', !!getSourceCodeDocument())
    console.log('records?.student:', !!records.value?.student)
    console.log('===============================')
  }
}

// Watchers for debugging (client-side only)
watch(() => userStore.user, (newUser, oldUser) => {
  if (import.meta.client) {
    console.log('👤 User changed:', { old: oldUser, new: newUser })
    if (newUser && newUser.role === 'student') {
      console.log('✅ Student authenticated successfully')
      showDebug.value = false // Auto-hide debug when working
    }
  }
}, { immediate: true, deep: true })

watch(() => userStore.isAuthenticated, (newAuth) => {
  if (import.meta.client) {
    console.log('🔐 Authentication status changed:', newAuth)
  }
}, { immediate: true })

watch(() => isStudentAuthenticated.value, (newValue) => {
  if (import.meta.client) {
    console.log('🎓 Student authentication changed:', newValue)
    checkButtonVisibility()
  }
}, { immediate: true })

// Reset expanded sections when data refreshes
watch(() => records.value, () => {
  // Auto-close upload forms when files are successfully uploaded
  if (getSourceCodeDocument()) {
    showSourceCodeUpload.value = false
  }
  if (getFinalDocument()) {
    showDocumentUpload.value = false
  }
  if (getCompanyRecommendation()) {
    showRecommendationUpload.value = false
  }
})

// Also close expanded sections if user authentication changes
watch(() => isStudentAuthenticated.value, (newValue) => {
  if (!newValue) {
    showSourceCodeUpload.value = false
    showDocumentUpload.value = false
    showRecommendationUpload.value = false
  }
})

// Enhanced error handling
const handleError = (error, context = '') => {
  if (import.meta.client) {
    console.error(`Error in ${context}:`, error)
  }

  useToast().add({
    title: t('error') || 'Klaida',
    description: error.message || t('unexpected_error') || 'Netikėta klaida',
    color: 'red'
  })
}

// Enhanced refresh function
const enhancedRefresh = async () => {
  try {
    if (import.meta.client) {
      console.log('🔄 Refreshing data...')
    }
    await refresh()

    if (records.value?.student) {
      await fetchTopicRegistration(records.value.student.id)
    }

    if (import.meta.client) {
      console.log('✅ Data refreshed successfully')
    }
  }
  catch (err) {
    handleError(err, 'refresh')
  }
}

// Initialization and lifecycle hooks
onMounted(async () => {
  if (import.meta.client) {
    console.log('🚀 Component mounted')

    // Initial auth state logging
    logAuthState()

    // Show debug panel if there are issues
    setTimeout(() => {
      if (!isStudentAuthenticated.value && records.value?.student) {
        console.warn('⚠️ Authentication issue detected, showing debug panel')
        showDebug.value = true
      }
    }, 3000)

    // Check button visibility after everything loads
    setTimeout(checkButtonVisibility, 1000)
  }

  // Wait for records to be loaded
  if (records.value?.student) {
    try {
      if (import.meta.client) {
        console.log('📚 Loading topic registration...')
      }
      // Try to fetch the existing topic registration
      await fetchTopicRegistration(records.value.student.id)

      // If no topic was found, initialize with default values
      if (!topicData.value) {
        initializeTopicData()
      }
    }
    catch (err) {
      if (import.meta.client) {
        console.error('Error fetching topic registration:', err)
      }
      // Initialize with default values if fetch fails
      initializeTopicData()
    }
  }
})

// Watch for records changes to initialize topic data
watch(() => records.value?.student, async (newVal) => {
  if (newVal) {
    if (import.meta.client) {
      console.log('📊 Student records updated:', newVal)
    }

    try {
      // Try to fetch existing topic registration
      await fetchTopicRegistration(newVal.id)

      // If no topic found, initialize default data
      if (!topicData.value) {
        initializeTopicData()
      }
    }
    catch (err) {
      if (import.meta.client) {
        console.error('Error fetching topic registration:', err)
      }
      // Initialize default data if fetch fails
      initializeTopicData()
    }
  }
})

// Auto-refresh every 30 seconds to check for auth changes (client-side only)
let refreshInterval

onMounted(() => {
  if (import.meta.client) {
    refreshInterval = setInterval(() => {
      if (!isStudentAuthenticated.value && records.value?.student) {
        console.log('🔄 Auto-checking auth state...')
        logAuthState()
      }
    }, 30000)
  }
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

// Provide methods for external debugging
const debugMethods = {
  logAuthState,
  checkButtonVisibility,
  refresh: enhancedRefresh,
  toggleDebug: () => {
    showDebug.value = !showDebug.value
  }
}

// Make debug methods available in production for troubleshooting (client-side only)
if (import.meta.client && import.meta.dev) {
  window.debugStudentComponent = debugMethods
}

// Expose for parent components
defineExpose({
  refresh: enhancedRefresh,
  debugMethods
})
</script>
