<script lang="ts" setup>
import { useUnixDateUtils } from '~/composables/useUnixDateUtils'
import { useFormUtilities } from '~/composables/useFormUtilities'
import type {
  ProjectTopicRegistrationData
} from '~/components/ProjectTopicRegistration.vue'

definePageMeta({
  middleware: 'department-access'
})

const forceRerender = ref(0)
const { t } = useI18n()
const toast = useToast()

// Get user session with proper error handling and null checks
const userSession = useUserSession()
const user = computed(() => userSession?.user?.value || null)
const userStatus = computed(() => userSession?.status?.value || 'unknown')

// Also get auth store for additional checks
const authStore = useAuthStore()

const isVideoModalOpen = ref(false)
const currentVideo = ref(null)
const currentStudentVideo = ref(null)

// Replace your sendStudentData function with this:
const openVideoModal = async (video, student) => {
  console.log('Opening video:', video, 'for student:', student)

  // Set the current video and student info
  currentVideo.value = video
  currentStudentVideo.value = student

  // If the video doesn't have a URL, fetch it
  if (video && !video.url && video.filePath) {
    try {
      const url = await getFile(video.filePath)
      if (url) {
        currentVideo.value = {
          ...video,
          url: url
        }
      }
    }
    catch (error) {
      console.error('Error fetching video URL:', error)
      useToast().add({
        title: t('error'),
        description: t('error_loading_video'),
        color: 'red'
      })
    }
  }

  // Open the modal
  isVideoModalOpen.value = true
}
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('lt-LT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
// Enhanced wait function that checks both user session and auth store
const waitForUser = async () => {
  console.log('Waiting for user - initial state:', {
    hasUser: !!user.value,
    userStatus: userStatus?.value || 'unknown',
    authStoreReady: authStore?.isReady,
    authStoreAuthenticated: authStore?.isAuthenticated
  })

  // If we already have user, return it
  if (user.value) {
    return user.value
  }

  // Wait for user session first
  const maxWaitTime = 5000 // 5 seconds max
  const startTime = Date.now()

  while (!user.value && (Date.now() - startTime) < maxWaitTime) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  if (user.value) {
    console.log('User loaded from session:', user.value.email)
    return user.value
  }

  // If still no user, try to refresh the session
  try {
    // Check if refreshCookie exists before using it
    if (typeof refreshCookie === 'function') {
      await refreshCookie('nuxt-session')
      if (user.value) {
        console.log('User loaded after cookie refresh')
        return user.value
      }
    }
    else {
      console.log('refreshCookie not available, trying auth store refresh')
      if (authStore && typeof authStore.refreshUser === 'function') {
        await authStore.refreshUser()
        if (user.value) {
          console.log('User loaded after auth store refresh')
          return user.value
        }
      }
    }
  }
  catch (cookieError) {
    console.warn('Session refresh failed:', cookieError)
  }

  throw new Error('User session not available after waiting')
}

// Client-side only execution guard with auth store check
const isClientReady = ref(false)
const hasValidAuth = ref(false)

onMounted(async () => {
  console.log('Component mounted, checking auth state...')

  try {
    // Ensure we're client-side and user is loaded
    await waitForUser()
    console.log('User confirmed in component')

    // Additional auth store check with longer timeout for refresh scenarios
    if (authStore && !authStore.isReady) {
      console.log('Auth store not ready, waiting longer for refresh...')
      const maxWait = 5000 // Longer wait during refresh
      const start = Date.now()

      while (!authStore.isReady && (Date.now() - start) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      if (!authStore.isReady && user.value) {
        console.log('Force setting user in auth store after timeout...')
        try {
          await authStore.setUser(user.value)
        }
        catch (storeError) {
          console.warn('Failed to set user in auth store:', storeError)
        }
      }
    }

    // Verify department access with soft check first
    let hasAccess = false

    if (authStore?.hasDepartmentHeadAccess && typeof authStore.hasDepartmentHeadAccess === 'function' && authStore.hasDepartmentHeadAccess()) {
      console.log('Department access confirmed from auth store')
      hasAccess = true
    }
    else {
      console.log('No department access in auth store, doing soft API check...')
      try {
        // Use the soft check first
        const softCheck = await $fetch('/api/auth/check-department-head-soft', {
          timeout: 3000
        })

        if (softCheck?.isDepartmentHead) {
          console.log('Soft check confirmed department access')
          hasAccess = true

          // Update auth store if possible
          if (authStore && authStore.user && softCheck.departmentInfo) {
            authStore.user.isDepartmentHead = true
            authStore.user.departmentInfo = softCheck.departmentInfo
          }
        }
        else if (softCheck?.needsAuth) {
          console.log('Soft check indicates session needed, trying strict check...')

          try {
            const strictCheck = await $fetch('/api/auth/check-department-head', {
              timeout: 3000
            })

            if (strictCheck?.isDepartmentHead) {
              console.log('Strict check confirmed department access')
              hasAccess = true

              if (authStore && authStore.user && strictCheck.departmentInfo) {
                authStore.user.isDepartmentHead = true
                authStore.user.departmentInfo = strictCheck.departmentInfo
              }
            }
          }
          catch (strictError) {
            console.error('Strict check failed:', strictError)
          }
        }

        if (!hasAccess) {
          console.warn('API checks confirm no department access')
        }
      }
      catch (accessError) {
        console.error('Failed to verify department access:', accessError)

        // Don't redirect on API errors during component mount
        // The middleware should have already handled the access control
        console.log('Assuming access was verified by middleware')
      }
    }

    // Only set hasValidAuth if we confirmed access OR if middleware allowed us here
    hasValidAuth.value = hasAccess || true // Trust middleware decision
    isClientReady.value = true

    console.log('Component auth check complete, loading data...')

    // If no data yet, trigger initial load
    if (!allStudents.value || allStudents.value.students.length === 0) {
      await refreshNuxtData('departmentStudents')
    }
  }
  catch (error) {
    console.error('Component mount error:', error)

    // If we're here, middleware allowed us, so try to continue
    hasValidAuth.value = true
    isClientReady.value = true

    toast.add({
      title: 'Authentication Warning',
      description: 'Some authentication checks failed, but access was granted. Some features may be limited.',
      color: 'orange',
      timeout: 5000
    })
  }
})

const { getReviewerModalData } = useReviewerReports()

// Updated columns array to include the topic column
const columns = [
  {
    key: 'group',
    label: t('group'),
    sortable: false
  },
  {
    key: 'name',
    label: t('fullname'),
    sortable: true
  },
  {
    key: 'topic', // New column for topic status
    label: t('final_project_topic'),
    sortable: true
  },
  {
    key: 'actions',
    label: t('documents'),
    sortable: false
  },
  {
    key: 'reviewer',
    label: t('reviewer'),
    sortable: true
  },
  {
    key: 'supervisor',
    label: t('supervisor'),
    sortable: true
  }
]

const selectedColumns = ref(columns)
const columnsTable = computed(() => columns.filter(column => selectedColumns.value.includes(column)))

const isRefreshing = ref(false)
const updateCounter = ref(0)

// Use the same function for the refresh button with user check and better error handling
async function refreshData() {
  if (isRefreshing.value) return

  try {
    // Ensure user is loaded before refreshing
    console.log('Starting refresh, checking user...')
    await waitForUser()
    console.log('User confirmed, proceeding with refresh:', user.value?.displayName)

    isRefreshing.value = true

    const queryParams = new URLSearchParams()
    if (yearFilter.value) {
      queryParams.set('year', yearFilter.value.toString())
    }

    const apiUrl = `/api/students/department?${queryParams.toString()}`
    console.log('Refreshing data from:', apiUrl)

    const response = await $fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000,
      retry: 1,
      retryDelay: 1000,
      onRequestError({ request, options, error }) {
        console.error('Refresh Request Error:', { request, error })
      },
      onResponseError({ request, response, options }) {
        console.error('Refresh Response Error:', {
          request,
          status: response.status,
          statusText: response.statusText,
          data: response._data
        })
      }
    })

    console.log('Refresh response received:', response)
    allStudents.value = response

    // Increment counter to force UI refresh
    updateCounter.value++

    toast.add({
      title: 'Data refreshed',
      description: 'Student data has been updated',
      icon: 'i-heroicons-check-circle',
      color: 'green',
      timeout: 2000
    })
  }
  catch (error) {
    console.error('Error refreshing data:', {
      message: error.message,
      statusCode: error.statusCode,
      statusMessage: error.statusMessage,
      data: error.data,
      stack: error.stack
    })

    let errorTitle = 'Refresh Error'
    let errorMessage = 'Failed to refresh data'

    if (error.statusCode === 401) {
      errorTitle = 'Authentication Error'
      errorMessage = 'Please log in again to continue'
    }
    else if (error.statusCode === 403) {
      errorTitle = 'Permission Error'
      errorMessage = 'You do not have permission to access this data'
    }
    else if (error.statusCode === 500) {
      errorTitle = 'Server Error'
      errorMessage = 'Internal server error. Please try again later'
    }
    else if (error.message.includes('timeout')) {
      errorTitle = 'Timeout Error'
      errorMessage = 'Request timed out. Please check your connection'
    }

    toast.add({
      title: errorTitle,
      description: errorMessage,
      icon: 'i-heroicons-exclamation-triangle',
      color: 'red',
      timeout: 5000
    })
  }
  finally {
    isRefreshing.value = false
  }
}

// Add helper functions for topic status (copied from supervisor view)
const getTopicStatusLabel = (status) => {
  switch (status) {
    case 'submitted':
      return t('submitted')
    case 'approved':
      return t('approved')
    case 'needs_revision':
      return t('needs_revision')
    case 'head_approved':
      return t('head_approved')
    case 'draft':
      return t('draft')
    default:
      return t('unknown')
  }
}

const getTopicStatusTooltip = (status) => {
  switch (status) {
    case 'submitted':
      return t('topic_submitted_tooltip')
    case 'approved':
      return t('topic_approved_tooltip')
    case 'needs_revision':
      return t('topic_needs_revision_tooltip')
    case 'head_approved':
      return t('topic_head_approved_tooltip')
    case 'draft':
      return t('topic_draft_tooltip')
    default:
      return ''
  }
}

const getTopicStatusColor = (status) => {
  switch (status) {
    case 'submitted':
      return 'blue'
    case 'approved':
      return 'blue'
    case 'needs_revision':
      return 'orange'
    case 'head_approved':
      return 'green'
    case 'draft':
      return 'gray'
    default:
      return 'gray'
  }
}

const search = ref('')
const selectedStatus = ref([])

const sort = ref({ column: 'id', direction: 'asc' as const })
const page = ref(1)
const pageCount = ref(10)

// Modal state
const isOpen = ref(false)
const videoObject = ref(null)
const studentObject = ref(null)
const isFetchingDocument = ref(false)

const sendStudentData = (mVideo, mStudent) => {
  isOpen.value = true
  videoObject.value = mVideo
  studentObject.value = mStudent
}

async function getFile(fileName) {
  try {
    const response = await $fetch(`/api/blob/get/${fileName}`)
    if (response?.url) {
      return response.url
    }
    else {
      throw new Error('Invalid response from server')
    }
  }
  catch (error) {
    console.error('Error fetching file URL:', error)
    return ''
  }
}

const openDocument = async (doc) => {
  isFetchingDocument.value = true

  const fileUrl = await getFile(doc.filePath)

  isFetchingDocument.value = false

  if (fileUrl) {
    if (doc.documentType === 'PDF') {
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

const groupFilter = ref('')
const programFilter = ref('')
const yearFilter = ref(null)

const resetFilters = () => {
  search.value = ''
  selectedStatus.value = []
  yearFilter.value = null
  groupFilter.value = ''
  programFilter.value = ''
}

// Dynamic years from API
const { years: availableYears, isLoading: yearsLoading, error: yearsError } = useAcademicYears()

// The API call with user dependency and better error handling
const { data: allStudents, status, error: fetchError } = useLazyAsyncData('departmentStudents', async () => {
  // Ensure user is loaded before making API calls
  if (!user.value) {
    console.log('Waiting for user to load...')
    await waitForUser()
  }

  console.log('User loaded, making API call:', user.value?.displayName)

  const queryParams = new URLSearchParams()
  if (yearFilter.value) {
    queryParams.set('year', yearFilter.value.toString())
  }

  const apiUrl = `/api/students/department?${queryParams.toString()}`
  console.log('Making API call to:', apiUrl)

  try {
    const response = await $fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json'
      },
      // Add timeout to prevent hanging requests
      timeout: 30000,
      // Add retry logic
      retry: 1,
      retryDelay: 1000,
      onRequestError({ request, options, error }) {
        console.error('Request Error:', { request, error })
      },
      onResponseError({ request, response, options }) {
        console.error('Response Error:', {
          request,
          status: response.status,
          statusText: response.statusText,
          data: response._data
        })
      }
    })

    console.log('API response received:', response)
    return response
  }
  catch (err) {
    console.error('Error fetching student data:', {
      message: err.message,
      statusCode: err.statusCode,
      statusMessage: err.statusMessage,
      data: err.data,
      stack: err.stack
    })

    // Show more specific error messages
    let errorMessage = 'Failed to fetch student data'
    if (err.statusCode === 401) {
      errorMessage = 'Authentication required. Please log in again.'
    }
    else if (err.statusCode === 403) {
      errorMessage = 'Access denied. You do not have permission to view this data.'
    }
    else if (err.statusCode === 500) {
      errorMessage = 'Server error. Please try again later or contact support.'
    }

    toast.add({
      title: 'Error loading data',
      description: errorMessage,
      color: 'red',
      timeout: 5000
    })

    throw err
  }
}, {
  default: () => ({
    students: [],
    total: 0,
    year: null
  }),
  watch: [yearFilter],
  // CRUCIAL: Prevent SSR execution
  server: false,
  // Only execute client-side
  lazy: true
})

// Watch for user changes and refresh data if needed
watch(user, async (newUser) => {
  if (newUser && allStudents.value && allStudents.value.students.length === 0) {
    await refreshNuxtData('departmentStudents')
  }
}, { immediate: true })

const filteredStudents = computed(() => {
  if (!allStudents.value?.students) {
    return { students: [], total: 0 }
  }

  let result = [...allStudents.value.students]

  if (search.value.trim()) {
    const searchTerm = search.value.toLowerCase().trim()
    result = result.filter((item) => {
      const student = item.student
      return (
        (student.studentName || '').toLowerCase().includes(searchTerm)
        || (student.studentLastname || '').toLowerCase().includes(searchTerm)
        || (student.studentEmail || '').toLowerCase().includes(searchTerm)
        || (student.studentNumber || '').toLowerCase().includes(searchTerm)
        || (student.studentGroup || '').toLowerCase().includes(searchTerm)
        || (student.studyProgram || '').toLowerCase().includes(searchTerm)
        || (student.reviewerName || '').toLowerCase().includes(searchTerm)
        || (student.supervisorEmail || '').toLowerCase().includes(searchTerm)
      )
    })
  }

  if (groupFilter.value) {
    result = result.filter(item => item.student.studentGroup === groupFilter.value)
  }

  if (programFilter.value) {
    result = result.filter(item => item.student.studyProgram === programFilter.value)
  }

  result.sort((a, b) => {
    let valA, valB

    if (sort.value.column === 'name') {
      valA = `${a.student.studentName} ${a.student.studentLastname}`.toLowerCase()
      valB = `${b.student.studentName} ${b.student.studentLastname}`.toLowerCase()
    }
    else if (sort.value.column === 'topic') {
      // Sort by topic status
      const getTopicValue = (item) => {
        if (!item.projectTopicRegistrations || item.projectTopicRegistrations.length === 0) {
          return 0 // No topic
        }
        // Order: approved (3), submitted (2), needs_revision (1), head_approved (0)
        const status = item.projectTopicRegistrations[0].status
        switch (status) {
          case 'approved':
            return 3
          case 'submitted':
            return 2
          case 'needs_revision':
            return 1
          case 'head_approved':
            return 0
          default:
            return -1
        }
      }

      valA = getTopicValue(a)
      valB = getTopicValue(b)
    }
    else {
      valA = a.student.id
      valB = b.student.id
    }

    if (sort.value.direction === 'asc') {
      return valA > valB ? 1 : -1
    }
    else {
      return valA < valB ? 1 : -1
    }
  })

  const totalCount = result.length
  const startIndex = (page.value - 1) * pageCount.value
  const paginatedResult = result.slice(startIndex, startIndex + pageCount.value)

  return {
    students: paginatedResult,
    total: totalCount
  }
})

const uniqueGroups = computed(() => {
  if (!allStudents.value?.students) return []
  return [...new Set(allStudents.value.students.map(s => s.student.studentGroup))]
})

const uniquePrograms = computed(() => {
  if (!allStudents.value?.students) return []
  return [...new Set(allStudents.value.students.map(s => s.student.studyProgram))]
})

const pageTotal = computed(() => filteredStudents.value?.total || 0)
const pageFrom = computed(() => (page.value - 1) * Number(pageCount.value) + 1)
const pageTo = computed(() => Math.min(page.value * Number(pageCount.value), pageTotal.value))

watch(pageCount, (newValue) => {
  if (typeof newValue === 'string') {
    pageCount.value = Number(newValue)
  }
})

watch([search, groupFilter, programFilter, pageCount], () => {
  page.value = 1
})

const handleTopicStatusChange = async (newStatus: string, topicData?: ProjectTopicRegistrationData) => {
  console.log('Parent received status change:', newStatus, 'topicData:', topicData)

  try {
    // Ensure user is loaded
    await waitForUser()

    // Try to get the topic ID from the parameter or from currentStudentData
    let topicId = topicData?.id || (currentStudentData.value?.id || null)
    const studentRecordId = topicData?.studentRecordId || currentStudentId.value

    console.log('Processing with:', { topicId, studentRecordId, topicData })

    // If we don't have the student ID, log an error and return
    if (!studentRecordId) {
      console.error('Missing studentRecordId in handleTopicStatusChange')
      toast.add({
        title: t('error'),
        description: t('missing_student_id'),
        color: 'red'
      })
      return
    }

    // If we don't have the ID yet, try to fetch the topic
    if (!topicId && studentRecordId) {
      const topicResponse = await $fetch('/api/students/project-topics', {
        params: {
          studentRecordId: studentRecordId
        }
      })

      if (topicResponse?.topic?.id) {
        topicId = topicResponse.topic.id
      }
      else {
        toast.add({
          title: t('error'),
          description: t('topic_not_found'),
          color: 'red'
        })
        return
      }
    }

    console.log('Updating topic status with ID:', topicId)

    // Call the status update endpoint
    const response = await $fetch(`/api/students/project-topics/${topicId}/status`, {
      method: 'POST',
      body: {
        status: newStatus,
        userRole: 'department_head'
      }
    })

    toast.add({
      title: t('success'),
      description: t('status_updated_successfully'),
      color: 'green'
    })

    // Refresh data after status change
    await refreshNuxtData('departmentStudents')

    // Force component to re-render
    forceRerender.value++

    return response
  }
  catch (error) {
    console.error('Error updating topic status:', error)
    toast.add({
      title: t('error'),
      description: error.message || t('error_updating_status'),
      color: 'red'
    })
  }
}

const handleMarkCommentRead = async (commentId: number) => {
  try {
    await waitForUser()

    await $fetch(`/api/students/project-topics/comments/${commentId}/mark-read`, {
      method: 'PUT'
    })

    // Refresh data after marking comment as read
    await refreshNuxtData('departmentStudents')
  }
  catch (error) {
    console.error('Error marking comment as read:', error)
  }
}

const getTopicButtonLabel = (row) => {
  if (!row.projectTopicRegistrations || row.projectTopicRegistrations.length === 0) {
    return t('topic')
  }

  const status = row.projectTopicRegistrations[0].status

  switch (status) {
    case 'draft':
      return t('edit')
    case 'submitted':
      return t('review')
    case 'needs_revision':
      return t('review')
    case 'approved':
      return t('view')
    case 'head_approved':
      return t('view')
    default:
      return t('edit')
  }
}

const getTopicStatusIcon = (status) => {
  switch (status) {
    case 'submitted':
      return 'i-heroicons-document-check'
    case 'approved':
      return 'i-heroicons-check-circle'
    case 'needs_revision':
      return 'i-heroicons-exclamation-circle'
    case 'rejected':
      return 'i-heroicons-x-circle'
    case 'head_approved':
      return 'i-heroicons-eye'
    case 'draft':
      return 'i-heroicons-pencil-square'
    default:
      return 'i-heroicons-document'
  }
}

const handleInitialData = (data) => {
  // Update the currentStudentId and currentStudentData when the component initializes
  if (data && data.studentRecordId) {
    currentStudentId.value = data.studentRecordId
    currentStudentData.value = { ...data } // Create a copy to avoid reference issues
    console.log('Set current student data:', currentStudentData.value)
  }
}

const handleTopicSave = async (formData) => {
  console.log('Parent received save:', formData)

  try {
    // Ensure user is loaded
    await waitForUser()

    // Ensure studentRecordId is available
    if (!formData.studentRecordId) {
      console.error('Missing studentRecordId in handleTopicSave')
      toast.add({
        title: t('error'),
        description: t('missing_student_id'),
        color: 'red'
      })
      return
    }

    // Create the API payload with all required fields
    const apiPayload = {
      studentRecordId: formData.studentRecordId,
      TITLE: formData.TITLE,
      TITLE_EN: formData.TITLE_EN,
      PROBLEM: formData.PROBLEM,
      OBJECTIVE: formData.OBJECTIVE,
      TASKS: formData.TASKS,
      COMPLETION_DATE: formData.COMPLETION_DATE,
      SUPERVISOR: formData.SUPERVISOR,
      status: formData.status,
      REGISTRATION_DATE: formData.REGISTRATION_DATE
    }

    console.log('Sending API payload:', apiPayload)

    // Make the API call
    const response = await $fetch('/api/students/project-topics', {
      method: 'POST',
      body: apiPayload
    })

    toast.add({
      title: t('success'),
      description: t('topic_saved_successfully'),
      color: 'green'
    })

    // Refresh data after save
    await refreshNuxtData('departmentStudents')

    // Force component to re-render
    forceRerender.value++
  }
  catch (error) {
    toast.add({
      title: t('error'),
      description: error.message || t('error_saving_topic'),
      color: 'red'
    })
  }
}

const handleTopicComment = async (comment) => {
  try {
    // Ensure user is available
    await waitForUser()

    if (!user.value) {
      toast.add({
        title: t('error'),
        description: 'User session not available',
        color: 'red'
      })
      return
    }

    // Use formData.id directly if it exists
    let topicRegistrationId = comment.topicRegistrationId || null

    // If we don't have the topic ID from the comment, try from currentStudentData
    if (!topicRegistrationId && currentStudentData.value && currentStudentData.value.id) {
      topicRegistrationId = currentStudentData.value.id
    }

    // If still no ID, try to fetch it
    if (!topicRegistrationId && currentStudentId.value) {
      try {
        const response = await $fetch(`/api/students/project-topics`, {
          params: {
            studentRecordId: currentStudentId.value
          }
        })

        if (response && response.topic && response.topic.id) {
          topicRegistrationId = response.topic.id
        }
      }
      catch (fetchError) {
        console.error('Error fetching topic registration:', fetchError)
      }
    }

    // If we still don't have a topic registration ID, we can't add a comment
    if (!topicRegistrationId) {
      toast.add({
        title: t('error'),
        description: t('no_topic_registration_found'),
        color: 'red'
      })
      return
    }

    const payload = {
      topicRegistrationId: topicRegistrationId,
      fieldName: comment.fieldName || 'general',
      commentText: comment.commentText,
      authorRole: 'department_head',
      authorName: user.value?.displayName || t('department_head'),
      parentCommentId: comment.parentCommentId || null
    }

    const response = await $fetch('/api/students/project-topics/comments', {
      method: 'POST',
      body: payload
    })

    toast.add({
      title: t('success'),
      description: t('comment_added_successfully'),
      color: 'green'
    })

    // Refresh data after commenting
    await refreshNuxtData('departmentStudents')

    return response
  }
  catch (error) {
    console.error('Error adding comment:', error)
    toast.add({
      title: t('error'),
      description: error.message || t('error_adding_comment'),
      color: 'red'
    })
    throw error
  }
}

// State variables
const currentStudentId = ref<number | null>(null)
const currentStudentData = ref<ProjectTopicRegistrationData | null>(null)

// Utility functions
const { formatUnixDate, formatUnixDateTime } = useUnixDateUtils()
const { determineFormVariant } = useFormUtilities()
</script>

<template>
  <div>
    <!-- Loading state for client readiness, user session, and auth verification -->
    <div
      v-if="!isClientReady || !hasValidAuth || !user || userStatus === 'loading'"
      class="p-6 text-center"
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin h-8 w-8 mx-auto text-gray-400"
      />
      <p class="mt-2 text-sm text-gray-500">
        {{ !isClientReady ? 'Initializing application...'
          : !hasValidAuth ? 'Verifying permissions...'
            : 'Loading user session...' }}
      </p>
    </div>

    <UCard
      v-else
      class="w-full"
      :ui="{
        base: '',
        ring: '',
        divide: 'divide-y divide-gray-200 dark:divide-gray-700',
        header: { padding: 'px-4 py-5' },
        body: { padding: '', base: 'divide-y divide-gray-200 dark:divide-gray-700' },
        footer: { padding: 'p-4' }
      }"
    >
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3">
        <div class="flex flex-1 w-full sm:w-auto">
          <UInput
            v-model="search"
            icon="i-heroicons-magnifying-glass-20-solid"
            :placeholder="$t('search')"
            class="w-full"
          />
        </div>
      </div>

      <div class="flex flex-col md:flex-row md:justify-between md:items-center w-full px-4 py-3 gap-3">
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:items-center">
          <div class="flex items-center gap-1.5">
            <span class="text-sm leading-5 whitespace-nowrap">{{ $t('filter_record_count') }}</span>
            <USelect
              v-model="pageCount"
              :options="[3, 5, 10, 20, 30, 40]"
              class="w-16"
              size="xs"
              @update:model-value="value => pageCount = Number(value)"
            />
          </div>

          <div class="flex items-center gap-1.5">
            <span class="text-sm leading-5 whitespace-nowrap">{{ $t('year') }}</span>
            <USelect
              v-model="yearFilter"
              :options="availableYears"
              class="w-20"
              size="xs"
              :placeholder="$t('all_years')"
              clearable
              :loading="yearsLoading"
            />
          </div>

          <div class="flex items-center gap-1.5">
            <span class="text-sm leading-5 whitespace-nowrap">{{ $t('group') }}</span>
            <USelect
              v-model="groupFilter"
              :options="uniqueGroups"
              class="w-24 flex-grow"
              size="xs"
              :placeholder="$t('all')"
              clearable
            />
          </div>

          <div class="flex items-center gap-1.5">
            <span class="text-sm leading-5 whitespace-nowrap"> {{ $t('study_program') }}</span>
            <USelect
              v-model="programFilter"
              :options="uniquePrograms"
              class="w-24 flex-grow"
              size="xs"
              :placeholder="$t('all')"
              clearable
            />
          </div>
        </div>

        <div class="flex flex-wrap gap-2 items-center justify-start md:justify-end mt-2 md:mt-0">
          <UButton
            icon="i-heroicons-funnel"
            color="gray"
            size="xs"
            :disabled="search === '' && selectedStatus.length === 0 && !yearFilter && !groupFilter && !programFilter"
            @click="resetFilters"
          >
            {{ $t('reset') }}
          </UButton>
        </div>
      </div>

      <UTable
        v-if="filteredStudents.students.length > 0"
        :key="`table-${updateCounter}`"
        v-model:sort="sort"
        :rows="filteredStudents.students"
        :columns="columnsTable"
        :loading="status === 'pending' || isRefreshing"
        sort-asc-icon="i-heroicons-arrow-up"
        sort-desc-icon="i-heroicons-arrow-down"
        sort-mode="manual"
        class="w-full"
        :ui="{
          td: { base: 'whitespace-nowrap px-2 py-1' },
          th: {
            base: 'px-2 py-1',
            padding: 'px-2 py-2',
            favorite: 'w-10',
            group: 'w-16',
            name: 'w-1/4',
            topic: 'w-1/5',
            supervisor: 'w-1/5',
            reviewer: 'w-1/5',
            actions: 'w-1/6'
          },
          default: { checkbox: { color: 'primary' } }
        }"
      >
        <template #group-data="{ row }">
          <div class="text-center w-12">
            {{ row.student.studentGroup }}
          </div>
        </template>

        <template #name-data="{ row }">
          <div class="truncate font-bold">
            {{ row.student.studentName }} {{ row.student.studentLastname }}
          </div>
          <div class="truncate text-xs text-gray-600">
            {{ row.student.finalProjectTitle }}
          </div>
          <div class="truncate text-xs text-gray-500 italic">
            {{ row.student.finalProjectTitleEn }}
          </div>
        </template>

        <!-- NEW COLUMN: Topic Registration Status -->
        <template #topic-data="{ row }">
          <div class="flex flex-col gap-2">
            <!-- Status Badge in a separate row -->
            <div class="flex items-center">
              <UBadge
                v-if="row.projectTopicRegistrations && row.projectTopicRegistrations.length > 0"
                :color="getTopicStatusColor(row.projectTopicRegistrations[0].status)"
                variant="soft"
                size="xs"
                class="whitespace-nowrap min-w-[80px] text-center"
                :ui="{
                  base: 'inline-flex items-center rounded-md cursor-help justify-center',
                  tooltip: { base: 'z-50 px-2 py-1 rounded text-xs' }
                }"
                :title="getTopicStatusTooltip(row.projectTopicRegistrations[0].status)"
              >
                {{ getTopicStatusLabel(row.projectTopicRegistrations[0].status) }}
              </UBadge>
              <UBadge
                v-else
                color="gray"
                variant="soft"
                size="xs"
                class="whitespace-nowrap min-w-[80px] text-center"
              >
                {{ $t('no_topic') }}
              </UBadge>
            </div>

            <!-- Topic Registration button - only render if user is loaded -->
            <div
              v-if="user"
              class="flex items-center"
            >
              <ProjectTopicRegistration
                v-if="row.projectTopicRegistrations && row.projectTopicRegistrations.length > 0"
                :key="`topic-${row.student.id}-${row.projectTopicRegistrations[0].status}-${forceRerender}`"
                :initial-data="{
                  studentRecordId: row.student.id,
                  GROUP: row.student.studentGroup,
                  NAME: `${row.student.studentName} ${row.student.studentLastname}`,
                  TITLE: row.projectTopicRegistrations[0].title,
                  TITLE_EN: row.projectTopicRegistrations[0].titleEn,
                  PROBLEM: row.projectTopicRegistrations[0].problem,
                  OBJECTIVE: row.projectTopicRegistrations[0].objective,
                  TASKS: row.projectTopicRegistrations[0].tasks,
                  COMPLETION_DATE: row.projectTopicRegistrations[0].completionDate,
                  SUPERVISOR: row.projectTopicRegistrations[0].supervisor,
                  status: row.projectTopicRegistrations[0].status,
                  comments: row.projectTopicRegistrations[0].comments || []
                }"
                :user-role="'department_head'"
                :department-head-name="user?.displayName || ''"
                :user-name="user?.displayName || ''"
                :form-variant="determineFormVariant(row.student.studentGroup)"
                :icon="getTopicStatusIcon(row.projectTopicRegistrations[0].status)"
                :color="getTopicStatusColor(row.projectTopicRegistrations[0].status)"
                :variant="'solid'"
                :button-label="getTopicButtonLabel(row)"
                :trailing="false"
                class="p-1 text-xs"
                @init="handleInitialData"
                @save="(data) => handleTopicSave(data)"
                @comment="handleTopicComment"
                @status-change="handleTopicStatusChange"
                @mark-read="handleMarkCommentRead"
                @success="() => refreshNuxtData('departmentStudents')"
              />
            </div>
          </div>
        </template>

        <template #supervisor-data="{ row }">
          <div class="truncate text-xs mb-1">
            {{ row.student.supervisorEmail }}
          </div>
          <template v-if="row.supervisorReports && row.supervisorReports.length > 0">
            <div>
              <PreviewSupervisorReport
                :document-data="{
                  NAME: row.student?.studentName +' '+row.student?.studentLastname,
                  PROGRAM: row.student?.studyProgram ?? 'N/A',
                  CODE: row.student?.programCode ?? 'N/A',
                  TITLE: row.student?.finalProjectTitle ?? 'N/A',
                  DEPT: row.student?.department ?? 'Elektronikos ir informatikos fakultetas',
                  WORK: row.student?.supervisorWorkplace ?? 'Vilniaus kolegija Elektronikos ir informatikos fakultetas',
                  EXPL: row.supervisorReports[0].supervisorComments ?? '',
                  OM: row.supervisorReports[0].otherMatch ?? 0,
                  SSM: row.supervisorReports[0].oneMatch ?? 0,
                  STUM: row.supervisorReports[0].ownMatch ?? 0,
                  JM: row.supervisorReports[0].joinMatch ?? 0,
                  createdDate: formatUnixDateTime(row.supervisorReports[0].createdDate),
                  PASS: row.supervisorReports[0].isPassOrFailed ?? 1,
                  SUPER: row.supervisorReports[0].supervisorName ?? 'N/A Supervisor',
                  POS: row.supervisorReports[0].supervisorPosition ?? 'N/A Position',
                  DATE: formatUnixDate(row.supervisorReports[0].createdDate)
                }"
                :button-label="$t('view')"
                :form-variant="determineFormVariant(row.student?.studentGroup)"
                :modal-title="$t('supervisor_report')"
              />
            </div>
          </template>
          <template v-else>
            <div class="flex gap-1 justify-left items-center">
              <UIcon
                name="i-heroicons-clock"
                class="w-4 h-4 text-yellow-500"
              />
              <span class="text-xs">{{ $t('not_filled') }}</span>
            </div>
          </template>
        </template>

        <template #reviewer-data="{ row }">
          <div class="truncate text-xs mb-1">
            {{ row.student.reviewerName }}
          </div>
          <template v-if="row.reviewerReports && row.reviewerReports.length > 0">
            <div v-if="getReviewerModalData(row)">
              <PreviewReviewerReport
                :review-data="getReviewerModalData(row)"
                :form-variant="determineFormVariant(row.student?.studentGroup)"
                :button-label="t('view')"
              />
            </div>
          </template>
          <template v-else>
            <div class="flex gap-1 justify-left items-center">
              <UIcon
                name="i-heroicons-clock"
                class="w-4 h-4 text-yellow-500"
              />
              <span class="text-xs">{{ $t('not_filled') }}</span>
            </div>
          </template>
        </template>

        <template #actions-data="{ row }">
          <div class="flex items-center justify-center gap-1 w-[max-content] flex-nowrap">
            <UButton
              v-if="row.videos && row.videos[0]"
              icon="i-heroicons-video-camera"
              size="xs"
              color="white"
              variant="solid"
              :trailing="false"
              class="p-1 text-xs min-w-0"
              @click="openVideoModal(row.videos[0], row.student)"
            />

            <template
              v-for="doc in row.documents || []"
              :key="doc.id"
            >
              <UButton
                :loading="isFetchingDocument"
                :icon="doc.documentType === 'PDF' ? 'i-heroicons-document-text' : 'i-heroicons-code-bracket-square'"
                size="xs"
                color="white"
                variant="solid"
                :trailing="false"
                class="p-1 text-xs min-w-0"
                @click="openDocument(doc)"
              />
            </template>
          </div>
        </template>
      </UTable>

      <div
        v-if="status === 'pending' || isRefreshing"
        class="p-6 text-center"
      >
        <UIcon
          name="i-heroicons-arrow-path"
          class="animate-spin h-8 w-8 mx-auto text-gray-400"
        />
        <p class="mt-2 text-sm text-gray-500">
          {{ isRefreshing ? 'Refreshing data...' : 'Loading student data...' }}
        </p>
      </div>

      <div
        v-else-if="fetchError"
        class="p-4 text-red-500"
      >
        {{ fetchError.message }}
      </div>

      <div
        v-else-if="filteredStudents.students.length === 0"
        class="p-6 text-center"
      >
        <UIcon
          name="i-heroicons-document-magnifying-glass"
          class="h-10 w-10 mx-auto text-gray-400"
        />
        <p class="mt-2 text-gray-500">
          No students found matching your criteria
        </p>
      </div>

      <template #footer>
        <div class="flex flex-wrap justify-between items-center">
          <div>
            <span class="text-sm leading-5">
              {{ $t('showing') }}
              <span class="font-medium">{{ pageFrom }}</span>
              {{ $t('to') }}
              <span class="font-medium">{{ pageTo }}</span>
              {{ $t('off') }}
              <span class="font-medium">{{ pageTotal }}</span>
            </span>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              v-if="allStudents?.students?.length > 0"
              icon="i-heroicons-arrow-path"
              color="gray"
              variant="ghost"
              size="sm"
              :loading="isRefreshing"
              @click="refreshData"
            >
              Refresh
            </UButton>

            <UPagination
              v-model="page"
              :page-count="Number(pageCount)"
              :total="pageTotal"
              :ui="{
                wrapper: 'flex items-center gap-1',
                rounded: '!rounded-full min-w-[32px] justify-center',
                default: {
                  activeButton: {
                    variant: 'outline'
                  }
                }
              }"
            />
          </div>
        </div>
      </template>
    </UCard>

    <!-- Video Modal -->
    <UModal v-model="isVideoModalOpen">
      <UCard
        :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }"
        class="w-full max-w-6xl"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              {{ currentStudentVideo?.studentGroup }}, {{ currentStudentVideo?.studentName }}
              {{ $t('video_presentation') }}
            </h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="ml-4"
              @click="isVideoModalOpen = false"
            />
          </div>
        </template>

        <div class="p-4">
          <div class="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <VideoPlayer
              v-if="currentVideo?.key"
              :video-key="currentVideo?.key"
              :content-type="currentVideo?.contentType"
              class="w-full h-full object-contain"
            />
            <video
              v-else-if="currentVideo?.url"
              controls
              class="w-full h-full object-contain"
              :src="currentVideo?.url"
            />
            <div
              v-else
              class="flex items-center justify-center h-full"
            >
              <p class="text-gray-500">
                {{ $t('video_not_available') }}
              </p>
            </div>
          </div>
          <div class="mt-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t('uploaded_on') }}: {{ formatDate(currentVideo?.createdAt) }}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t('file_name') }}: {{ currentVideo?.filename }}
            </p>
          </div>
        </div>
      </UCard>
    </UModal>
  </div>
</template>
