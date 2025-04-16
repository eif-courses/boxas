const getStatusColor = (status) => {
switch (status) {
case 'draft': return 'default';
case 'submitted': return 'primary';
case 'revision_requested': return 'warning';
case 'approved': return 'success';
default: return 'default';
}
};<template>
  <div>
    <UContainer class="py-8">
      <!-- Loading state -->
      <div
        v-if="isLoading"
        class="flex justify-center items-center py-16"
      >
        <USkeleton class="h-32 w-full" />
      </div>

      <!-- Error state -->
      <UAlert
        v-else-if="hasError"
        color="red"
        title="Error"
        :description="errorMessage"
      />

      <!-- Main content -->
      <template v-else>
        <UCard>
          <!-- Header with controls -->
          <div class="flex justify-between items-center mb-6">
            <div>
              <h1 class="text-2xl font-bold">
                {{ language === 'lt' ? 'Baigiamojo darbo užduotis' : 'Final Project Assignment' }}
              </h1>
              <p class="text-gray-500">
                {{ formData.studentGroup }} - {{ formData.studentName }} {{ formData.studentLastname }}
              </p>
            </div>

            <div class="flex gap-2">
              <!-- Language toggle -->
              <UButton
                color="gray"
                icon="i-heroicons-language"
                @click="toggleLanguage"
              >
                {{ language === 'lt' ? 'EN' : 'LT' }}
              </UButton>

              <!-- Student actions -->
              <template v-if="userRole === 'student'">
                <UButton
                  v-if="isStatusDraft || isStatusRevisionRequested"
                  color="primary"
                  icon="i-heroicons-paper-airplane"
                  :loading="isSubmitting"
                  @click="submitForm"
                >
                  {{ language === 'lt' ? 'Pateikti' : 'Submit' }}
                </UButton>
              </template>

              <!-- Supervisor actions -->
              <template v-if="userRole === 'supervisor' && isStatusSubmitted">
                <UButton
                  color="success"
                  icon="i-heroicons-check"
                  :loading="isSubmitting"
                  @click="approveForm"
                >
                  {{ language === 'lt' ? 'Patvirtinti' : 'Approve' }}
                </UButton>

                <UButton
                  color="warning"
                  icon="i-heroicons-arrow-path"
                  :loading="isSubmitting"
                  @click="requestFormRevision"
                >
                  {{ language === 'lt' ? 'Prašyti pataisymų' : 'Request revision' }}
                </UButton>
              </template>

              <!-- Save button (for all editable states) -->
              <UButton
                v-if="canEdit"
                color="primary"
                icon="i-heroicons-document-check"
                :loading="isSaving"
                @click="saveForm"
              >
                {{ language === 'lt' ? 'Išsaugoti' : 'Save' }}
              </UButton>
            </div>
          </div>

          <!-- Status badge -->
          <UAlert
            :color="statusColor"
            class="mb-6"
            :title="getStatusText(formData.status)"
          >
            {{ getStatusDescription(formData.status) }}
          </UAlert>

          <!-- Tabs -->
          <UTabs
            :items="tabs"
            :model-value="Number(activeTabIndex)"
            @update:model-value="onTabChange"
          >
            <template #item="{ item }">
              <div class="p-4">
                <!-- Form tab -->
                <div v-if="item.key === 'form'">
                  <UForm
                    :state="formData"
                    @submit.prevent="saveForm"
                  >
                    <div class="grid grid-cols-1 gap-6">
                      <!-- Group -->
                      <UFormGroup :label="language === 'lt' ? 'Grupė' : 'Group'">
                        <UInput
                          v-model="formData.studentGroup"
                          disabled
                        />
                      </UFormGroup>

                      <!-- Title -->
                      <UFormGroup :label="language === 'lt' ? 'Baigiamojo darbo tema' : 'Final Project Title'">
                        <UInput
                          v-if="language === 'lt'"
                          v-model="formData.finalProjectTitle"
                          :placeholder="language === 'lt' ? 'Baigiamojo darbo temos pavadinimas' : 'Final Project Title'"
                          :disabled="!canEdit"
                        />
                        <UInput
                          v-else
                          v-model="formData.finalProjectTitleEn"
                          placeholder="Final Project Title"
                          :disabled="!canEdit"
                        />
                      </UFormGroup>

                      <!-- Objective -->
                      <UFormGroup :label="language === 'lt' ? 'Baigiamojo darbo tikslas' : 'Final Project Objective'">
                        <UTextarea
                          v-if="language === 'lt'"
                          v-model="formData.objective"
                          :placeholder="language === 'lt' ? 'Trumpas, aiškus, nusakomas vienu sakiniu, orientuotas į kuriamą programinę įrangą' : 'Brief, clear objective described in one sentence'"
                          :disabled="!canEdit"
                          :rows="3"
                        />
                        <UTextarea
                          v-else
                          v-model="formData.objectiveEn"
                          placeholder="A brief, clear, one-sentence description focused on the software being developed"
                          :disabled="!canEdit"
                          :rows="3"
                        />
                      </UFormGroup>

                      <!-- Tasks -->
                      <UFormGroup :label="language === 'lt' ? 'Baigiamojo darbo uždaviniai' : 'Final Project Tasks'">
                        <UTextarea
                          v-if="language === 'lt'"
                          v-model="formData.tasks"
                          :placeholder="language === 'lt' ? 'Išvardinti preliminarius uždavinius, kurie padės pasiekti tikslą' : 'List the preliminary tasks that will help achieve the objective'"
                          :disabled="!canEdit"
                          :rows="5"
                        />
                        <UTextarea
                          v-else
                          v-model="formData.tasksEn"
                          placeholder="List preliminary tasks that will help achieve the objective"
                          :disabled="!canEdit"
                          :rows="5"
                        />
                      </UFormGroup>

                      <!-- Tools -->
                      <UFormGroup :label="language === 'lt' ? 'Baigiamojo darbo realizavimo priemonės' : 'Tools for Final Project Implementation'">
                        <UTextarea
                          v-if="language === 'lt'"
                          v-model="formData.tools"
                          :placeholder="language === 'lt' ? 'Išvardyti įrankius ir technologijas, kurie bus naudojami kuriant programinę įrangą' : 'List the tools and technologies that will be used in development'"
                          :disabled="!canEdit"
                          :rows="3"
                        />
                        <UTextarea
                          v-else
                          v-model="formData.toolsEn"
                          placeholder="List the tools and technologies that will be used in the development of the software"
                          :disabled="!canEdit"
                          :rows="3"
                        />
                      </UFormGroup>

                      <!-- Form actions -->
                      <div
                        v-if="canEdit"
                        class="flex justify-end"
                      >
                        <UButton
                          type="submit"
                          color="primary"
                          :loading="isSaving"
                        >
                          {{ language === 'lt' ? 'Išsaugoti' : 'Save' }}
                        </UButton>
                      </div>
                    </div>
                  </UForm>
                </div>

                <!-- Comments tab -->
                <div v-else-if="item.key === 'comments'">
                  <CommentSection
                    :assignment-id="assignmentId"
                    :comments="comments"
                    :user-role="userRole"
                    @comment-added="fetchComments"
                  />
                </div>

                <!-- Versions tab -->
                <div v-else-if="item.key === 'versions'">
                  <VersionHistory
                    :versions="versions"
                    :assignment-id="assignmentId"
                    @version-selected="loadVersion"
                  />
                </div>
              </div>
            </template>
          </UTabs>
        </UCard>
      </template>
    </UContainer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectAssignment } from '~/composables/useProjectAssignment'
import CommentSection from '~/components/CommentSection.vue'
import VersionHistory from '~/components/VersionHistory.vue'

// Setup route and router
const route = useRoute()
const router = useRouter()

// Get assignment ID from route
const assignmentId = computed(() => route.params.id)

// Set user role (in a real app, this would come from authentication)
const userRole = ref('student') // Or 'supervisor'

// Initialize assignment state with composable
const {
  formData,
  comments,
  versions,
  language,
  isLoading,
  isSaving,
  isSubmitting,
  hasError,
  errorMessage,
  statusColor,
  isStatusDraft,
  isStatusSubmitted,
  isStatusRevisionRequested,
  isStatusApproved,
  toggleLanguage,
  fetchAssignment,
  fetchComments,
  fetchVersions,
  saveAssignment,
  submitAssignment,
  approveAssignment,
  requestRevision,
  loadVersion,
  initialize
} = useProjectAssignment(assignmentId)

// Active tab
const activeTab = ref('form')
const activeTabIndex = computed(() => {
  const index = tabs.value.findIndex(tab => tab.key === activeTab.value)
  return index >= 0 ? index : 0
})

// Handle tab change
const onTabChange = (index) => {
  activeTab.value = tabs.value[index].key
}

// Computed: Can the current user edit the form?
const canEdit = computed(() => {
  if (userRole.value === 'student') {
    return isStatusDraft.value || isStatusRevisionRequested.value
  }
  return userRole.value === 'supervisor'
})

// Tabs configuration
const tabs = computed(() => [
  {
    key: 'form',
    label: language.value === 'lt' ? 'Forma' : 'Form',
    icon: 'i-heroicons-document-text'
  },
  {
    key: 'comments',
    label: language.value === 'lt' ? 'Komentarai' : 'Comments',
    icon: 'i-heroicons-chat-bubble-left-text'
  },
  {
    key: 'versions',
    label: language.value === 'lt' ? 'Versijos' : 'Versions',
    icon: 'i-heroicons-clock'
  }
])

// Helper functions for status text translation
const getStatusText = (status) => {
  if (language.value === 'lt') {
    switch (status) {
      case 'draft': return 'Juodraštis'
      case 'submitted': return 'Pateiktas'
      case 'revision_requested': return 'Reikia pataisymų'
      case 'approved': return 'Patvirtintas'
      default: return 'Nežinoma būsena'
    }
  }
  else {
    switch (status) {
      case 'draft': return 'Draft'
      case 'submitted': return 'Submitted'
      case 'revision_requested': return 'Revision Requested'
      case 'approved': return 'Approved'
      default: return 'Unknown status'
    }
  }
}

const getStatusDescription = (status) => {
  if (language.value === 'lt') {
    switch (status) {
      case 'draft': return 'Užpildykite formą ir pateikite vadovui peržiūrėti.'
      case 'submitted': return 'Forma pateikta vadovui peržiūrėti.'
      case 'revision_requested': return 'Vadovas paprašė atlikti pataisymus. Peržiūrėkite komentarus.'
      case 'approved': return 'Vadovas patvirtino užduotį. Forma užbaigta.'
      default: return ''
    }
  }
  else {
    switch (status) {
      case 'draft': return 'Complete the form and submit it for supervisor review.'
      case 'submitted': return 'Form submitted for supervisor review.'
      case 'revision_requested': return 'Supervisor has requested revisions. Please check the comments.'
      case 'approved': return 'Supervisor has approved the assignment. Form is complete.'
      default: return ''
    }
  }
}

// Form actions
const saveForm = async () => {
  const success = await saveAssignment(language.value === 'lt' ? 'Forma išsaugota' : 'Form saved')
  if (success) {
    useToast().add({
      title: language.value === 'lt' ? 'Sėkmingai išsaugota' : 'Successfully saved',
      description: language.value === 'lt' ? 'Forma sėkmingai išsaugota' : 'Form successfully saved',
      color: 'green'
    })
  }
}

const submitForm = async () => {
  // First save the form
  await saveForm()

  // Then submit it
  const success = await submitAssignment()
  if (success) {
    useToast().add({
      title: language.value === 'lt' ? 'Sėkmingai pateikta' : 'Successfully submitted',
      description: language.value === 'lt' ? 'Forma sėkmingai pateikta vadovui' : 'Form successfully submitted to supervisor',
      color: 'green'
    })
  }
}

const approveForm = async () => {
  const success = await approveAssignment()
  if (success) {
    useToast().add({
      title: language.value === 'lt' ? 'Patvirtinta' : 'Approved',
      description: language.value === 'lt' ? 'Užduotis sėkmingai patvirtinta' : 'Assignment successfully approved',
      color: 'green'
    })
  }
}

const requestFormRevision = async () => {
  const success = await requestRevision()
  if (success) {
    useToast().add({
      title: language.value === 'lt' ? 'Pataisymai' : 'Revision Requested',
      description: language.value === 'lt' ? 'Prašymas atlikti pataisymus išsiųstas studentui' : 'Revision request sent to student',
      color: 'orange'
    })
  }
}

// Initialize on mount
onMounted(() => {
  initialize()
})

// Watch for language changes to update UI text
watch(language, () => {
  // This triggers a UI update for translated text
})
</script>
