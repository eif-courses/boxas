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
      :ui="{ width: 'sm:max-w-5xl' }"
    >
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800', body: { padding: 'p-0' }, header: { padding: 'p-4 sm:p-6' } }">
        <!-- Header with status badge and notification indicator -->
        <template #header>
          <div class="flex items-center">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white truncate">
              {{ isEnglishVariant ? 'Final Project Topic Registration' : 'Baigiamojo Darbo Temos Registravimo Lapas' }}
            </h3>
            <UBadge
              v-if="formData.status"
              :color="formData.status === 'approved' ? 'green' : formData.status === 'rejected' ? 'red' : formData.status === 'needs_revision' ? 'orange' : 'blue'"
              class="ml-3"
            >
              {{ statusLabels[formData.status] }}
            </UBadge>
            <UBadge
              v-if="hasUnreadComments"
              color="red"
              variant="solid"
              class="ml-2"
            >
              {{ unreadCommentsCount }}
            </UBadge>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              size="sm"
              square
              class="ml-auto"
              @click="closeModal"
            />
          </div>
        </template>

        <div class="flex">
          <!-- Main Form (75% width) -->
          <div class="w-3/4 p-6 sm:p-10 border-r border-gray-200 dark:border-gray-700">
            <UForm
              :state="formData"
              :validate="validate"
              class="text-sm text-gray-900 dark:text-gray-100 space-y-4 font-serif"
              @submit="handleSave"
            >
              <!-- Header Section -->
              <div class="text-center uppercase font-semibold mb-6 space-y-1">
                <p>{{ isEnglishVariant ? 'Vilnius Kolegija Higher Education Institution' : 'Vilniaus kolegija' }}</p>
                <p>{{ isEnglishVariant ? 'Faculty of Electronics and Informatics' : 'Elektronikos ir informatikos fakultetas' }}</p>
              </div>
              <div class="text-center uppercase font-semibold mb-8">
                <p>{{ isEnglishVariant ? 'Final Project Topic Registration Form' : 'Baigiamojo darbo temos registravimo lapas' }}</p>
              </div>

              <!-- Student Info -->
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

              <!-- Form Fields with Comment Buttons -->
              <UFormGroup
                :label="isEnglishVariant ? 'Supervisor:' : 'Baigiamojo darbo vadovas(-ė):'"
                name="SUPERVISOR"
                required
                class="relative group"
              >
                <div class="flex">
                  <UInput
                    v-model="formData.SUPERVISOR"
                    :disabled="!canEdit"
                    :placeholder="isEnglishVariant ? 'Enter supervisor name' : 'Įveskite vadovo vardą ir pavardę'"
                    class="flex-grow"
                  />
                  <UButton
                    v-if="canComment"
                    size="xs"
                    color="amber"
                    variant="soft"
                    icon="i-heroicons-chat-bubble-left-right"
                    class="ml-2"
                    :class="hasCommentsIndicator('SUPERVISOR')"
                    @click="selectFieldForComment('SUPERVISOR')"
                  />
                </div>
              </UFormGroup>

              <div class="border-t border-gray-200 dark:border-gray-800 pt-4 my-4">
                <p class="font-medium mb-2">
                  {{ isEnglishVariant ? 'Final Project Topic:' : 'Baigiamojo darbo tema:' }}
                </p>
              </div>

              <!-- Title Fields -->
              <UFormGroup
                :label="isEnglishVariant ? 'In Lithuanian:' : 'Lietuvių kalba:'"
                name="TITLE"
                required
                class="relative group"
              >
                <div class="flex">
                  <UInput
                    v-model="formData.TITLE"
                    :disabled="!canEdit"
                    :placeholder="isEnglishVariant ? 'Enter final project title in Lithuanian' : 'Įveskite baigiamojo darbo temą lietuvių kalba'"
                    class="flex-grow"
                  />
                  <UButton
                    v-if="canComment"
                    size="xs"
                    color="amber"
                    variant="soft"
                    icon="i-heroicons-chat-bubble-left-right"
                    class="ml-2"
                    :class="hasCommentsIndicator('TITLE')"
                    @click="selectFieldForComment('TITLE')"
                  />
                </div>
              </UFormGroup>

              <UFormGroup
                :label="isEnglishVariant ? 'In English:' : 'Anglų kalba:'"
                name="TITLE_EN"
                required
                class="relative group"
              >
                <div class="flex">
                  <UInput
                    v-model="formData.TITLE_EN"
                    :disabled="!canEdit"
                    :placeholder="isEnglishVariant ? 'Enter final project title in English' : 'Įveskite baigiamojo darbo temą anglų kalba'"
                    class="flex-grow"
                  />
                  <UButton
                    v-if="canComment"
                    size="xs"
                    color="amber"
                    variant="soft"
                    icon="i-heroicons-chat-bubble-left-right"
                    class="ml-2"
                    :class="hasCommentsIndicator('TITLE_EN')"
                    @click="selectFieldForComment('TITLE_EN')"
                  />
                </div>
              </UFormGroup>

              <!-- Date Field -->
              <UFormGroup
                :label="isEnglishVariant ? 'Project Completion Date:' : 'Baigiamojo darbo baigimo data:'"
                name="COMPLETION_DATE"
                class="relative group"
              >
                <div class="flex">
                  <UInput
                    v-model="formData.COMPLETION_DATE"
                    type="date"
                    :disabled="!canEdit"
                    :placeholder="isEnglishVariant ? 'Select completion date' : 'Pasirinkite baigimo datą'"
                    class="flex-grow"
                  />
                  <UButton
                    v-if="canComment"
                    size="xs"
                    color="amber"
                    variant="soft"
                    icon="i-heroicons-chat-bubble-left-right"
                    class="ml-2"
                    :class="hasCommentsIndicator('COMPLETION_DATE')"
                    @click="selectFieldForComment('COMPLETION_DATE')"
                  />
                </div>
              </UFormGroup>

              <!-- Text Areas -->
              <UFormGroup
                :label="isEnglishVariant ? 'Final Project Problem:' : 'Baigiamojo darbo problema:'"
                name="PROBLEM"
                required
                class="relative group"
              >
                <div class="flex">
                  <UTextarea
                    v-model="formData.PROBLEM"
                    :rows="3"
                    :disabled="!canEdit"
                    :placeholder="isEnglishVariant ? 'Describe the problem that the project will address' : 'Aprašykite problemą, kurią spręs baigiamasis darbas'"
                    class="flex-grow"
                  />
                  <UButton
                    v-if="canComment"
                    size="xs"
                    color="amber"
                    variant="soft"
                    icon="i-heroicons-chat-bubble-left-right"
                    class="ml-2 h-8 mt-1"
                    :class="hasCommentsIndicator('PROBLEM')"
                    @click="selectFieldForComment('PROBLEM')"
                  />
                </div>
              </UFormGroup>

              <UFormGroup
                :label="isEnglishVariant ? 'Final Project Objective:' : 'Baigiamojo darbo tikslas:'"
                name="OBJECTIVE"
                required
                class="relative group"
              >
                <div class="flex">
                  <UTextarea
                    v-model="formData.OBJECTIVE"
                    :rows="3"
                    :disabled="!canEdit"
                    :placeholder="isEnglishVariant ? 'A brief, clear, one-sentence description focused on what will be achieved' : 'Trumpas, aiškus, nusakomas vienu sakiniu, orientuotas į tai, kas bus pasiekta'"
                    class="flex-grow"
                  />
                  <UButton
                    v-if="canComment"
                    size="xs"
                    color="amber"
                    variant="soft"
                    icon="i-heroicons-chat-bubble-left-right"
                    class="ml-2 h-8 mt-1"
                    :class="hasCommentsIndicator('OBJECTIVE')"
                    @click="selectFieldForComment('OBJECTIVE')"
                  />
                </div>
              </UFormGroup>

              <UFormGroup
                :label="isEnglishVariant ? 'Preliminary Tasks and Content Plan:' : 'Preliminarūs baigiamojo darbo uždaviniai ir turinio planas:'"
                name="TASKS"
                required
                class="relative group"
              >
                <div class="flex">
                  <UTextarea
                    v-model="formData.TASKS"
                    :rows="5"
                    :disabled="!canEdit"
                    :placeholder="isEnglishVariant ? 'List preliminary tasks and outline the content plan' : 'Išvardinkite preliminarius uždavinius ir turinio planą'"
                    class="flex-grow"
                  />
                  <UButton
                    v-if="canComment"
                    size="xs"
                    color="amber"
                    variant="soft"
                    icon="i-heroicons-chat-bubble-left-right"
                    class="ml-2 h-8 mt-1"
                    :class="hasCommentsIndicator('TASKS')"
                    @click="selectFieldForComment('TASKS')"
                  />
                </div>
              </UFormGroup>

              <!-- Signature Lines -->
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

              <!-- Department Head Line -->
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

              <!-- Status Change (for supervisors) -->
              <!-- Status Change (for supervisors) -->
              <div
                v-if="canChangeStatus && formData.status === 'submitted'"
                class="border-t border-gray-200 dark:border-gray-800 pt-4 mt-6"
              >
                <h4 class="font-medium mb-2">
                  {{ isEnglishVariant ? 'Review Decision:' : 'Peržiūros sprendimas:' }}
                </h4>
                <div class="flex items-center space-x-3">
                  <UButton
                    color="green"
                    size="sm"
                    icon="i-heroicons-check-circle"
                    @click="handleStatusChange('approved')"
                  >
                    {{ isEnglishVariant ? 'Approve' : 'Patvirtinti' }}
                  </UButton>
                  <UButton
                    color="amber"
                    size="sm"
                    icon="i-heroicons-exclamation-triangle"
                    @click="handleStatusChange('needs_revision')"
                  >
                    {{ isEnglishVariant ? 'Needs Revision' : 'Reikia taisymų' }}
                  </UButton>
                </div>
                <p class="mt-2 text-xs text-gray-500">
                  {{ isEnglishVariant ? 'Please review the topic registration and approve it or request revisions.' : 'Peržiūrėkite temos registraciją ir patvirtinkite ją arba paprašykite pataisymų.' }}
                </p>
              </div>

              <!-- Additional section for when status is "needs_revision" -->
              <div
                v-if="canChangeStatus && formData.status === 'needs_revision'"
                class="border-t border-gray-200 dark:border-gray-800 pt-4 mt-6"
              >
                <h4 class="font-medium mb-2">
                  {{ isEnglishVariant ? 'After Revisions:' : 'Po pataisymų:' }}
                </h4>
                <div class="flex items-center space-x-3">
                  <UButton
                    color="green"
                    size="sm"
                    icon="i-heroicons-check-circle"
                    @click="handleStatusChange('approved')"
                  >
                    {{ isEnglishVariant ? 'Approve' : 'Patvirtinti' }}
                  </UButton>
                  <UButton
                    color="amber"
                    size="sm"
                    icon="i-heroicons-exclamation-triangle"
                    @click="handleStatusChange('needs_revision')"
                  >
                    {{ isEnglishVariant ? 'Still Needs Revision' : 'Vis dar reikia taisymų' }}
                  </UButton>
                </div>
                <p class="mt-2 text-xs text-gray-500">
                  {{ isEnglishVariant ? 'After revisions, you can approve the topic or request additional revisions if needed.' : 'Po pataisymų galite patvirtinti temą arba paprašyti papildomų pataisymų, jei reikia.' }}
                </p>
              </div>

              <!-- Error Message -->
              <div
                v-if="isError"
                class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md mb-4"
              >
                <p>{{ errorMessage || (isEnglishVariant ? 'Error saving topic registration' : 'Klaida išsaugant temos registraciją') }}</p>
              </div>

              <!-- Form Buttons -->
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
                  v-if="canEdit"
                  type="submit"
                  color="primary"
                  :label="isEnglishVariant ? 'Save Registration' : 'Išsaugoti registraciją'"
                  :loading="isSaving"
                />
                <UButton
                  v-if="props.userRole === 'student' && (!formData.status || formData.status === 'draft')"
                  type="button"
                  color="green"
                  :label="isEnglishVariant ? 'Submit for Review' : 'Pateikti peržiūrai'"
                  :loading="isSaving"
                  @click="handleStatusChange('submitted')"
                />
              </div>
            </UForm>
          </div>

          <!-- Comments Panel (MS Word style sidebar) - 25% width -->
          <div
            class="w-1/4 bg-gray-50 dark:bg-gray-800 p-4 overflow-y-auto comment-panel transition-colors duration-300"
            :class="{ 'bg-amber-50 dark:bg-amber-900/30': highlightCommentPanel }"
            style="max-height: 80vh;"
          >
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-base font-medium">
                {{ isEnglishVariant ? 'Comments' : 'Komentarai' }}
              </h3>
              <UButton
                v-if="selectedField !== 'general' || newCommentMode !== 'reply'"
                size="xs"
                color="gray"
                variant="ghost"
                :icon="selectedField ? 'i-heroicons-x-mark' : 'i-heroicons-chat-bubble-left-right'"
                @click="selectedField ? cancelComment() : selectFieldForComment('general')"
              >
                {{ selectedField ? (isEnglishVariant ? 'Cancel' : 'Atšaukti') : (isEnglishVariant ? 'Add Comment' : 'Pridėti komentarą') }}
              </UButton>
            </div>

            <!-- Comment Form -->
            <div
              v-if="selectedField"
              class="mb-4 bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 comment-form"
            >
              <div class="mb-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                <div>
                  <span v-if="selectedField !== 'general'">
                    {{ isEnglishVariant ? 'Commenting on:' : 'Komentuojate:' }}
                    <span class="font-medium">{{ getFieldLabel(selectedField) }}</span>
                  </span>
                  <span v-else>{{ isEnglishVariant ? 'General comment' : 'Bendras komentaras' }}</span>
                </div>
                <div v-if="replyToComment">
                  <span>{{ isEnglishVariant ? 'Replying to:' : 'Atsakote:' }} {{ replyToComment.authorName }}</span>
                </div>
              </div>

              <UTextarea
                v-model="newComment"
                :rows="3"
                :placeholder="replyToComment ? (isEnglishVariant ? 'Write a reply...' : 'Parašykite atsakymą...') : (isEnglishVariant ? 'Write a comment...' : 'Parašykite komentarą...')"
                class="mb-2"
              />

              <div class="flex justify-between">
                <UButton
                  size="xs"
                  color="gray"
                  variant="ghost"
                  @click="cancelComment()"
                >
                  {{ isEnglishVariant ? 'Cancel' : 'Atšaukti' }}
                </UButton>
                <UButton
                  size="xs"
                  color="primary"
                  :disabled="!newComment.trim()"
                  @click="addComment()"
                >
                  {{ replyToComment ? (isEnglishVariant ? 'Post Reply' : 'Paskelbti atsakymą') : (isEnglishVariant ? 'Post Comment' : 'Paskelbti komentarą') }}
                </UButton>
              </div>
            </div>

            <!-- Filter Dropdown -->
            <div
              v-if="!selectedField"
              class="mb-4"
            >
              <USelect
                v-model="commentFilter"
                :options="[
                  { value: 'all', label: isEnglishVariant ? 'All Comments' : 'Visi komentarai' },
                  { value: 'unread', label: isEnglishVariant ? 'Unread Comments' : 'Neskaityti komentarai' },
                  ...fieldFilterOptions
                ]"
                size="sm"
              />
            </div>

            <!-- Empty State -->
            <div
              v-if="!selectedField && filteredComments.length === 0"
              class="text-center py-4 text-gray-500 dark:text-gray-400"
            >
              {{ isEnglishVariant ? 'No comments yet' : 'Kol kas komentarų nėra' }}
            </div>

            <!-- Comments List -->
            <div class="space-y-4">
              <div
                v-for="thread in filteredComments"
                :key="thread.id"
                class="bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden"
              >
                <!-- Parent Comment -->
                <div
                  class="p-3"
                  :class="{ 'bg-amber-50 dark:bg-amber-900/20': thread.unread && thread.authorRole !== props.userRole }"
                >
                  <!-- Field Label -->
                  <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {{ getFieldLabel(thread.fieldName || 'general') }}
                  </div>

                  <!-- Author and Date -->
                  <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-1">
                      <span
                        class="text-xs font-medium"
                        :class="{
                          'text-green-600 dark:text-green-400': thread.authorRole === 'student',
                          'text-blue-600 dark:text-blue-400': thread.authorRole === 'supervisor',
                          'text-purple-600 dark:text-purple-400': thread.authorRole === 'department_head'
                        }"
                      >
                        {{ thread.authorName }}
                      </span>
                      <UBadge
                        v-if="thread.unread && thread.authorRole !== props.userRole"
                        color="red"
                        size="xs"
                        variant="solid"
                        class="mr-1"
                      >
                        {{ isEnglishVariant ? 'New' : 'Naujas' }}
                      </UBadge>
                    </div>
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      {{ formatDate(thread.createdAt) }}
                    </span>
                  </div>

                  <!-- Comment Content -->
                  <p class="text-sm mb-2">
                    {{ thread.commentText }}
                  </p>

                  <!-- Actions -->
                  <div class="flex justify-end">
                    <UButton
                      v-if="canComment"
                      size="xs"
                      color="gray"
                      variant="ghost"
                      @click="startReply(thread)"
                    >
                      {{ isEnglishVariant ? 'Reply' : 'Atsakyti' }}
                    </UButton>
                    <UButton
                      v-if="thread.unread && thread.authorRole !== props.userRole"
                      size="xs"
                      color="gray"
                      variant="ghost"
                      @click="markAsRead(thread)"
                    >
                      {{ isEnglishVariant ? 'Mark as Read' : 'Žymėti kaip skaitytą' }}
                    </UButton>
                  </div>
                </div>

                <!-- Reply Separator -->
                <div
                  v-if="thread.replies && thread.replies.length > 0"
                  class="border-t border-gray-100 dark:border-gray-600"
                />

                <!-- Replies -->
                <div v-if="thread.replies && thread.replies.length > 0">
                  <div
                    v-for="reply in thread.replies"
                    :key="reply.id"
                    class="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700"
                    :class="{ 'bg-amber-50 dark:bg-amber-900/20': reply.unread && reply.authorRole !== props.userRole }"
                  >
                    <!-- Reply Author and Date -->
                    <div class="flex justify-between items-start mb-1">
                      <div class="flex items-center gap-1">
                        <span
                          class="text-xs font-medium"
                          :class="{
                            'text-green-600 dark:text-green-400': reply.authorRole === 'student',
                            'text-blue-600 dark:text-blue-400': reply.authorRole === 'supervisor',
                            'text-purple-600 dark:text-purple-400': reply.authorRole === 'department_head'
                          }"
                        >
                          {{ reply.authorName }}
                        </span>
                        <UBadge
                          v-if="reply.unread && reply.authorRole !== props.userRole"
                          color="red"
                          size="xs"
                          variant="solid"
                          class="mr-1"
                        >
                          {{ isEnglishVariant ? 'New' : 'Naujas' }}
                        </UBadge>
                      </div>
                      <span class="text-xs text-gray-500 dark:text-gray-400">
                        {{ formatDate(reply.createdAt) }}
                      </span>
                    </div>

                    <!-- Reply Content -->
                    <p class="text-sm mb-1">
                      {{ reply.commentText }}
                    </p>

                    <!-- Mark Read Button -->
                    <div
                      v-if="reply.unread && reply.authorRole !== props.userRole"
                      class="flex justify-end"
                    >
                      <UButton
                        size="xs"
                        color="gray"
                        variant="ghost"
                        @click="markAsRead(reply)"
                      >
                        {{ isEnglishVariant ? 'Mark as Read' : 'Žymėti kaip skaitytą' }}
                      </UButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PropType } from 'vue'
import type { FormError } from '#ui/types' // Nuxt UI types

// Type for comments
export interface TopicComment {
  id?: number
  topicRegistrationId?: number
  fieldName?: string // Optional: which field the comment is about
  commentText: string
  authorRole: 'student' | 'supervisor' | 'department_head'
  authorName: string
  createdAt?: number | Date
  parentCommentId?: number | null
  unread?: boolean // New field to track if comment has been read
  replies?: TopicComment[] // For organizing comments as threads
}

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

  // Added fields for workflow
  status?: 'draft' | 'submitted' | 'needs_revision' | 'approved' | 'rejected'
  comments?: TopicComment[]
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
  status: string // Added for workflow status
}

// --- Props ---
const props = defineProps({
  initialData: {
    type: Object as PropType<ProjectTopicRegistrationData>,
    required: true
  },
  userRole: {
    type: String as PropType<'student' | 'supervisor' | 'department_head'>,
    default: 'student'
  },
  userName: {
    type: String,
    default: ''
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
    type: String as PropType<'lt' | 'en'>,
    required: true
  }
})

const isEnglishVariant = computed(() => props.formVariant === 'en')

// --- Emits ---
const emit = defineEmits<{
  (e: 'save', data: ProjectTopicRegistrationFormData): void
  (e: 'comment', comment: TopicComment): void
  (e: 'status-change', status: string): void
  (e: 'success'): void
  (e: 'mark-read', commentId: number): void // New emit for marking comments as read
}>()

// --- State ---
const isOpen = ref(false)
const isSaving = ref(false)
const isError = ref(false)
const errorMessage = ref('')
const newComment = ref('')
const selectedField = ref<string | null>(null)
const replyToComment = ref<TopicComment | null>(null)
const newCommentMode = ref<'new' | 'reply'>('new')
const commentFilter = ref('all') // 'all', 'unread', or a specific field name

const formData = ref<ProjectTopicRegistrationFormData>({
  TITLE: '',
  TITLE_EN: '',
  PROBLEM: '',
  OBJECTIVE: '',
  TASKS: '',
  COMPLETION_DATE: null,
  SUPERVISOR: '',
  REGISTRATION_DATE: null,
  status: 'draft'
})

// Computed for display-only data from initial props
const displayData = computed(() => ({
  GROUP: props.initialData.GROUP,
  NAME: props.initialData.NAME,
  status: props.initialData.status || 'draft'
}))

// Process comments into a hierarchical structure with parent and replies
const processedComments = computed(() => {
  if (!props.initialData.comments) return []

  // Group replies with their parent comments
  const commentThreads: TopicComment[] = []
  const replyMap: Record<number, TopicComment[]> = {}

  // First, group replies by parent
  props.initialData.comments.forEach((comment) => {
    if (comment.parentCommentId) {
      if (!replyMap[comment.parentCommentId]) {
        replyMap[comment.parentCommentId] = []
      }
      replyMap[comment.parentCommentId].push(comment)
    }
    else {
      commentThreads.push({ ...comment, replies: [] })
    }
  })

  // Then, attach replies to parent comments
  commentThreads.forEach((thread) => {
    if (thread.id && replyMap[thread.id]) {
      thread.replies = replyMap[thread.id]
    }
  })

  // Sort parent comments by creation date (newest first)
  return commentThreads.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return dateB - dateA
  })
})

// Filtered comments based on the selected filter
const filteredComments = computed(() => {
  if (commentFilter.value === 'all') {
    return processedComments.value
  }
  else if (commentFilter.value === 'unread') {
    return processedComments.value.filter((thread) => {
      // Include thread if the thread itself is unread or any of its replies are unread
      const threadUnread = thread.unread && thread.authorRole !== props.userRole
      const hasUnreadReplies = thread.replies?.some(
        reply => reply.unread && reply.authorRole !== props.userRole
      )
      return threadUnread || hasUnreadReplies
    })
  }
  else {
    // Filter by field name
    return processedComments.value.filter(thread => thread.fieldName === commentFilter.value)
  }
})

// Options for field filters in dropdown
const fieldFilterOptions = computed(() => {
  // Get unique field names from comments
  const fields = new Set<string>()
  processedComments.value.forEach((comment) => {
    if (comment.fieldName) {
      fields.add(comment.fieldName)
    }
  })

  // Convert to options array
  return Array.from(fields).map(field => ({
    value: field,
    label: getFieldLabel(field)
  }))
})

// Check if there are unread comments for the current user
const hasUnreadComments = computed(() => {
  if (!props.initialData.comments) return false

  return props.initialData.comments.some(comment =>
    comment.unread && comment.authorRole !== props.userRole
  )
})

// Count of unread comments
const unreadCommentsCount = computed(() => {
  if (!props.initialData.comments) return 0

  return props.initialData.comments.filter(comment =>
    comment.unread && comment.authorRole !== props.userRole
  ).length
})

// Computed for status labels based on language
const statusLabels = computed(() => {
  if (isEnglishVariant.value) {
    return {
      draft: 'Draft',
      submitted: 'Submitted',
      needs_revision: 'Needs Revision',
      approved: 'Approved',
      rejected: 'Rejected'
    }
  }
  return {
    draft: 'Juodraštis',
    submitted: 'Pateikta',
    needs_revision: 'Reikia taisymų',
    approved: 'Patvirtinta',
    rejected: 'Atmesta'
  }
})

// Check if user can edit the form
const canEdit = computed(() => {
  // Students can edit if status is draft or needs_revision
  if (props.userRole === 'student') {
    return !formData.value.status || formData.value.status === 'draft' || formData.value.status === 'needs_revision'
  }

  // Supervisors and department heads can edit status and add comments
  // but not the form content directly
  return false
})

// Check if user can add comments
const canComment = computed(() => {
  return true // All users can comment
})

// Check if user can change status
const canChangeStatus = computed(() => {
  return props.userRole === 'supervisor' || props.userRole === 'department_head'
})

// Available status changes based on current status and role
const availableStatusChanges = computed(() => {
  if (props.userRole === 'student') {
    if (!formData.value.status || formData.value.status === 'draft') {
      return [{ value: 'submitted', label: statusLabels.value.submitted }]
    }
    return []
  }

  if (props.userRole === 'supervisor' || props.userRole === 'department_head') {
    if (formData.value.status === 'submitted') {
      return [
        { value: 'needs_revision', label: statusLabels.value.needs_revision },
        { value: 'approved', label: statusLabels.value.approved },
        { value: 'rejected', label: statusLabels.value.rejected }
      ]
    }
    if (formData.value.status === 'needs_revision') {
      return [
        { value: 'approved', label: statusLabels.value.approved },
        { value: 'rejected', label: statusLabels.value.rejected }
      ]
    }
  }

  return []
})

const formatDate = (timestamp: number | Date | undefined) => {
  if (!timestamp) return ''

  const date = typeof timestamp === 'number'
    ? new Date(timestamp * 1000)
    : timestamp

  return date.toLocaleDateString(
    isEnglishVariant.value ? 'en-US' : 'lt-LT',
    { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  )
}

// Get a human-readable label for field names
const getFieldLabel = (field: string): string => {
  const labels: Record<string, string> = {
    SUPERVISOR: isEnglishVariant.value ? 'Supervisor' : 'Vadovas',
    TITLE: isEnglishVariant.value ? 'Title (LT)' : 'Tema (LT)',
    TITLE_EN: isEnglishVariant.value ? 'Title (EN)' : 'Tema (EN)',
    PROBLEM: isEnglishVariant.value ? 'Problem' : 'Problema',
    OBJECTIVE: isEnglishVariant.value ? 'Objective' : 'Tikslas',
    TASKS: isEnglishVariant.value ? 'Tasks' : 'Uždaviniai',
    COMPLETION_DATE: isEnglishVariant.value ? 'Completion Date' : 'Baigimo data',
    general: isEnglishVariant.value ? 'General' : 'Bendras'
  }

  return labels[field] || field
}

// Check if a field has comments and return appropriate CSS classes
const hasCommentsIndicator = (fieldName: string): string => {
  if (!props.initialData.comments) return ''

  const hasComments = props.initialData.comments.some(comment =>
    comment.fieldName === fieldName && !comment.parentCommentId
  )

  // Check for unread comments for this field (that aren't from the current user)
  const hasUnread = props.initialData.comments.some(comment =>
    comment.fieldName === fieldName
    && comment.unread
    && comment.authorRole !== props.userRole
  )

  if (hasUnread) {
    return 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
  }

  if (hasComments) {
    return 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50'
  }

  return ''
}

const openModal = () => {
  formData.value = {
    TITLE: props.initialData.TITLE || '',
    TITLE_EN: props.initialData.TITLE_EN || '',
    PROBLEM: props.initialData.PROBLEM || '',
    OBJECTIVE: props.initialData.OBJECTIVE || '',
    TASKS: props.initialData.TASKS || '',
    COMPLETION_DATE: props.initialData.COMPLETION_DATE || null,
    SUPERVISOR: props.initialData.SUPERVISOR || '',
    REGISTRATION_DATE: new Date(), // Set current date
    status: props.initialData.status || 'draft'
  }
  isSaving.value = false
  isOpen.value = true
  newComment.value = ''
  selectedField.value = null
  replyToComment.value = null
  newCommentMode.value = 'new'
  commentFilter.value = 'all'
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
      SUPERVISOR: formData.value.SUPERVISOR,
      status: formData.value.status
      // REGISTRATION_DATE is handled by the server
    }

    // First emit save for potential additional handling
    emit('save', formData.value)

    // Then post to API - using your existing endpoint
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

const highlightCommentPanel = ref(false)

const focusCommentSection = () => {
  // Highlight effect for visual cue
  highlightCommentPanel.value = true
  setTimeout(() => {
    highlightCommentPanel.value = false
  }, 1000)

  setTimeout(() => {
    // Find comment section by class
    const commentPanel = document.querySelector('.comment-panel')
    const commentForm = document.querySelector('.comment-form')

    if (commentPanel && commentForm) {
      // Scroll the comment form into view
      commentForm.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 100)
}

const selectFieldForComment = (fieldName: string) => {
  selectedField.value = fieldName
  newCommentMode.value = 'new'
  replyToComment.value = null
  newComment.value = ''

  focusCommentSection()
}

const startReply = (comment: TopicComment) => {
  selectedField.value = comment.fieldName || 'general'
  replyToComment.value = comment
  newCommentMode.value = 'reply'
  newComment.value = ''

  focusCommentSection()
}

const cancelComment = () => {
  selectedField.value = null
  replyToComment.value = null
  newComment.value = ''
}

const addComment = () => {
  if (!newComment.value.trim()) return

  const comment: TopicComment = {
    fieldName: selectedField.value || undefined,
    commentText: newComment.value,
    authorRole: props.userRole,
    authorName: props.userName,
    parentCommentId: replyToComment.value?.id,
    unread: true // Mark new comments as unread for others
  }

  emit('comment', comment)

  newComment.value = ''
  selectedField.value = null
  replyToComment.value = null
}

const markAsRead = (comment: TopicComment) => {
  if (comment.id) {
    emit('mark-read', comment.id)
  }
}

const handleStatusChange = async (newStatus: string) => {
  try {
    // First update UI to give immediate feedback
    formData.value.status = newStatus

    // Add confirmation prompt if desired
    let message = ''
    switch (newStatus) {
      case 'approved':
        message = isEnglishVariant.value
          ? 'Are you sure you want to approve this topic?'
          : 'Ar tikrai norite patvirtinti šią temą?'
        break
      case 'needs_revision':
        message = isEnglishVariant.value
          ? 'Are you sure you want to request revisions for this topic?'
          : 'Ar tikrai norite paprašyti pataisymų šiai temai?'
        break
      case 'rejected':
        message = isEnglishVariant.value
          ? 'Are you sure you want to reject this topic?'
          : 'Ar tikrai norite atmesti šią temą?'
        break
    }

    // Optional: You could add a confirmation dialog here
    // if (!window.confirm(message)) {
    //   // Revert status if user cancels
    //   formData.value.status = props.initialData.status || 'draft';
    //   return;
    // }

    // Emit the status change for parent component to handle
    emit('status-change', newStatus)

    // If you handle the API call directly from this component,
    // make sure to wait for it to complete before showing success message
    // const response = await ...

    // Show success message
    // You can use a toast notification library if available
    // toast.add({
    //   title: isEnglishVariant.value ? 'Success' : 'Pavyko',
    //   description: isEnglishVariant.value
    //     ? `Topic status updated to ${statusLabels.value[newStatus]}`
    //     : `Temos būsena pakeista į ${statusLabels.value[newStatus]}`,
    //   color: 'green'
    // });
  }
  catch (error) {
    // Revert UI status on error
    formData.value.status = props.initialData.status || 'draft'

    console.error('Error updating topic status:', error)
    // Show error message
    // toast.add({
    //   title: isEnglishVariant.value ? 'Error' : 'Klaida',
    //   description: error.message || (isEnglishVariant.value
    //     ? 'Failed to update topic status'
    //     : 'Nepavyko atnaujinti temos būsenos'),
    //   color: 'red'
    // });
  }
}
</script>
