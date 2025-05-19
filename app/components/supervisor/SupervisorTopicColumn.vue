<template>
  <div class="flex flex-col gap-2">
    <!-- Status Badge -->
    <TopicStatusBadge
      :status="topicStatus"
      :has-topic="hasTopic"
    />

    <!-- Topic Registration button -->
    <div class="flex items-center">
      <ProjectTopicRegistration
        v-if="hasTopic"
        :key="`topic-${studentId}-${topicStatus}-${forceRerender}`"
        :initial-data="topicData"
        user-role="supervisor"
        :user-name="userName"
        :form-variant="formVariant"
        :icon="getTopicStatusIcon(topicStatus)"
        :color="getTopicStatusColor(topicStatus)"
        variant="solid"
        :button-label="buttonLabel"
        :trailing="false"
        class="p-1 text-xs"
        @init="$emit('init', $event)"
        @save="$emit('save', $event)"
        @comment="$emit('comment', $event)"
        @status-change="$emit('status-change', $event)"
        @mark-read="$emit('mark-read', $event)"
        @success="$emit('success')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTopicStatusUtils } from '~/composables/useTopicStatusUtils'
import TopicStatusBadge from '~/components/student/TopicStatusBadge.vue';

const props = defineProps({
  row: { type: Object, required: true },
  userName: { type: String, default: '' },
  formVariant: { type: String as PropType<'lt' | 'en'>, required: true },
  forceRerender: { type: Number, required: true }
})

const emit = defineEmits(['init', 'save', 'comment', 'status-change', 'mark-read', 'success'])

const { getTopicStatusIcon, getTopicStatusColor, getTopicButtonLabel } = useTopicStatusUtils()

const hasTopic = computed(() => {
  return props.row.projectTopicRegistrations && props.row.projectTopicRegistrations.length > 0
})

const topicStatus = computed(() => {
  return hasTopic.value ? props.row.projectTopicRegistrations[0].status : ''
})

const studentId = computed(() => props.row.student.id)

const buttonLabel = computed(() => getTopicButtonLabel(props.row))

const topicData = computed<ProjectTopicRegistrationData>(() => {
  if (!hasTopic.value) {
    // Return a default object that satisfies the ProjectTopicRegistrationData interface
    return {
      studentRecordId: props.row.student.id,
      GROUP: props.row.student.studentGroup || '',
      NAME: `${props.row.student.studentName || ''} ${props.row.student.studentLastname || ''}`
      // Other fields are optional so they can be undefined
    } as ProjectTopicRegistrationData
  }

  const registration = props.row.projectTopicRegistrations[0]

  return {
    studentRecordId: props.row.student.id,
    GROUP: props.row.student.studentGroup,
    NAME: `${props.row.student.studentName} ${props.row.student.studentLastname}`,
    TITLE: registration.title,
    TITLE_EN: registration.titleEn,
    PROBLEM: registration.problem,
    OBJECTIVE: registration.objective,
    TASKS: registration.tasks,
    COMPLETION_DATE: registration.completionDate,
    SUPERVISOR: registration.supervisor,
    status: registration.status as 'draft' | 'submitted' | 'needs_revision' | 'approved' | 'head_approved',
    comments: registration.comments || []
  }
})
</script>
