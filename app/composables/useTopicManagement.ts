// composables/useTopicManagement.ts
/**
 * Composable for managing project topics
 */
export function useTopicManagement(refreshFunction, role = 'supervisor') {
  const toast = useToast()
  const { t } = useI18n()
  const { user } = useUserSession()
  const forceRerender = ref(0)

  // Current student data for topic management
  const currentStudentId = ref(null)
  const currentStudentData = ref(null)

  // Initialize student data
  const handleInitialData = (data) => {
    if (data && data.studentRecordId) {
      currentStudentId.value = data.studentRecordId
      currentStudentData.value = { ...data }
    }
  }

  // Save topic data
  const handleTopicSave = async (formData) => {
    try {
      if (!formData.studentRecordId) {
        toast.add({
          title: t('error'),
          description: t('missing_student_id'),
          color: 'red'
        })
        return
      }

      const response = await $fetch('/api/students/project-topics', {
        method: 'POST',
        body: {
          studentRecordId: formData.studentRecordId,
          ...formData
        }
      })

      toast.add({
        title: t('success'),
        description: t('topic_saved_successfully'),
        color: 'green'
      })

      await refreshFunction()
      forceRerender.value++

      return response
    }
    catch (error) {
      toast.add({
        title: t('error'),
        description: error.message || t('error_saving_topic'),
        color: 'red'
      })
    }
  }

  // Add comment to a topic
  const handleTopicComment = async (comment) => {
    try {
      let topicRegistrationId = comment.topicRegistrationId || null

      if (!topicRegistrationId && currentStudentData.value?.id) {
        topicRegistrationId = currentStudentData.value.id
      }

      if (!topicRegistrationId && currentStudentId.value) {
        try {
          const response = await $fetch(`/api/students/project-topics`, {
            params: {
              studentRecordId: currentStudentId.value
            }
          })

          if (response?.topic?.id) {
            topicRegistrationId = response.topic.id
          }
        }
        catch (fetchError) {
          console.error('Error fetching topic registration:', fetchError)
        }
      }

      if (!topicRegistrationId) {
        toast.add({
          title: t('error'),
          description: t('no_topic_registration_found'),
          color: 'red'
        })
        return
      }

      const payload = {
        topicRegistrationId,
        fieldName: comment.fieldName || 'general',
        commentText: comment.commentText,
        authorRole: role,
        authorName: user?.displayName || t(role),
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

      await refreshFunction()

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

  // Change topic status
  const handleTopicStatusChange = async (newStatus, topicData) => {
    try {
      let topicId = topicData?.id || (currentStudentData.value?.id || null)
      const studentRecordId = topicData?.studentRecordId || currentStudentId.value

      if (!studentRecordId) {
        toast.add({
          title: t('error'),
          description: t('missing_student_id'),
          color: 'red'
        })
        return
      }

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

      const response = await $fetch(`/api/students/project-topics/${topicId}/status`, {
        method: 'POST',
        body: {
          status: newStatus,
          userRole: role
        }
      })

      toast.add({
        title: t('success'),
        description: t('status_updated_successfully'),
        color: 'green'
      })

      await refreshFunction()
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

  // Mark comment as read
  const handleMarkCommentRead = async (commentId) => {
    try {
      await $fetch(`/api/students/project-topics/comments/${commentId}/mark-read`, {
        method: 'PUT'
      })

      await refreshFunction()
    }
    catch (error) {
      console.error('Error marking comment as read:', error)
    }
  }

  return {
    forceRerender,
    currentStudentId,
    currentStudentData,
    handleInitialData,
    handleTopicSave,
    handleTopicComment,
    handleTopicStatusChange,
    handleMarkCommentRead
  }
}
