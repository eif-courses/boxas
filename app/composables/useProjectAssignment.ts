import { ref, computed } from 'vue'

export const useProjectAssignment = (assignmentId) => {
  // State
  const assignment = ref(null)
  const comments = ref([])
  const versions = ref([])
  const loading = ref(false)
  const saving = ref(false)
  const submitting = ref(false)
  const error = ref(null)
  const language = ref('lt')

  // Form data structure based on Lithuanian and English documents
  const emptyForm = {
    id: null,
    studentRecordId: null,
    status: 'draft',
    isSigned: 0,
    studentGroup: '',
    finalProjectTitle: '',
    finalProjectTitleEn: '',
    objective: '',
    objectiveEn: '',
    tasks: '',
    tasksEn: '',
    tools: '',
    toolsEn: '',
    createdDate: null,
    lastUpdated: null
  }

  const formData = ref({ ...emptyForm })

  // Computed properties
  const isLoading = computed(() => loading.value)
  const isSaving = computed(() => saving.value)
  const isSubmitting = computed(() => submitting.value)
  const hasError = computed(() => !!error.value)
  const errorMessage = computed(() => error.value)
  const currentLanguage = computed(() => language.value)

  // Status-related computed properties
  const isStatusDraft = computed(() => formData.value.status === 'draft')
  const isStatusSubmitted = computed(() => formData.value.status === 'submitted')
  const isStatusRevisionRequested = computed(() => formData.value.status === 'revision_requested')
  const isStatusApproved = computed(() => formData.value.status === 'approved')

  // Status color for UI
  const statusColor = computed(() => {
    switch (formData.value.status) {
      case 'draft': return 'gray' // Using standard color names
      case 'submitted': return 'blue'
      case 'revision_requested': return 'yellow'
      case 'approved': return 'green'
      default: return 'gray'
    }
  })

  // Methods

  // Toggle language between Lithuanian and English
  const toggleLanguage = () => {
    language.value = language.value === 'lt' ? 'en' : 'lt'
  }

  // Fetch assignment data
  const fetchAssignment = async () => {
    loading.value = true
    error.value = null

    try {
      const { data } = await useFetch(`/api/projectAssignments/${assignmentId}/summary`)
      if (data.value) {
        assignment.value = data.value
        formData.value = {
          ...emptyForm,
          ...data.value
        }
      }
      return data.value
    }
    catch (err) {
      error.value = 'Failed to load assignment data'
      console.error('Error fetching assignment:', err)
      return null
    }
    finally {
      loading.value = false
    }
  }

  // Fetch comments for the assignment
  const fetchComments = async () => {
    try {
      const { data } = await useFetch(`/api/projectAssignments/${assignmentId}/comments`)
      if (data.value) {
        comments.value = data.value
      }
      return data.value
    }
    catch (err) {
      console.error('Error fetching comments:', err)
      return []
    }
  }

  // Fetch version history
  const fetchVersions = async () => {
    try {
      const { data } = await useFetch(`/api/projectAssignments/${assignmentId}/versions`)
      if (data.value) {
        versions.value = data.value
      }
      return data.value
    }
    catch (err) {
      console.error('Error fetching versions:', err)
      return []
    }
  }

  // Save the current form state
  const saveAssignment = async (comment = 'Saved form data') => {
    saving.value = true
    error.value = null

    try {
      const { data, error: apiError } = await useFetch('/api/projectAssignments/save', {
        method: 'POST',
        body: {
          assignmentId: assignmentId,
          versionData: formData.value,
          comment: comment
        }
      })

      if (apiError.value) throw new Error(apiError.value.message)

      // Refresh versions after saving
      await fetchVersions()
      return true
    }
    catch (err) {
      error.value = 'Failed to save assignment'
      console.error('Error saving assignment:', err)
      return false
    }
    finally {
      saving.value = false
    }
  }

  // Update assignment status
  const updateStatus = async (newStatus) => {
    submitting.value = true
    error.value = null

    try {
      const { data, error: apiError } = await useFetch('/api/projectAssignments/update-status', {
        method: 'POST',
        body: {
          assignmentId: assignmentId,
          status: newStatus
        }
      })

      if (apiError.value) throw new Error(apiError.value.message)

      // Update local status
      formData.value.status = newStatus
      return true
    }
    catch (err) {
      error.value = `Failed to update status to ${newStatus}`
      console.error('Error updating status:', err)
      return false
    }
    finally {
      submitting.value = false
    }
  }

  // Submit assignment (student)
  const submitAssignment = () => updateStatus('submitted')

  // Approve assignment (supervisor)
  const approveAssignment = () => updateStatus('approved')

  // Request revision (supervisor)
  const requestRevision = () => updateStatus('revision_requested')

  // Load a specific version
  const loadVersion = (versionData) => {
    try {
      const parsedData = typeof versionData === 'string' ? JSON.parse(versionData) : versionData

      // Update form data while preserving current status
      const currentStatus = formData.value.status
      formData.value = {
        ...formData.value,
        ...parsedData,
        status: currentStatus // Keep current status
      }

      return true
    }
    catch (err) {
      error.value = 'Failed to load version'
      console.error('Error loading version:', err)
      return false
    }
  }

  // Initialize data
  const initialize = async () => {
    await fetchAssignment()
    await fetchComments()
    await fetchVersions()
  }

  // Reset form data
  const resetForm = () => {
    formData.value = { ...emptyForm }
  }

  return {
    // State
    assignment,
    comments,
    versions,
    formData,
    language,

    // Computed
    isLoading,
    isSaving,
    isSubmitting,
    hasError,
    errorMessage,
    currentLanguage,
    isStatusDraft,
    isStatusSubmitted,
    isStatusRevisionRequested,
    isStatusApproved,
    statusColor,

    // Methods
    toggleLanguage,
    fetchAssignment,
    fetchComments,
    fetchVersions,
    saveAssignment,
    updateStatus,
    submitAssignment,
    approveAssignment,
    requestRevision,
    loadVersion,
    initialize,
    resetForm
  }
}
