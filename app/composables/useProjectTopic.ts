// composables/useProjectTopic.ts
import { ref, computed } from 'vue'
import type { TopicComment, ProjectTopicRegistrationData, ProjectTopicRegistrationFormData } from '~/components/ProjectTopicRegistration.vue'

export function useProjectTopic() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const topicData = ref<ProjectTopicRegistrationData | null>(null)

  // Fetch topic registration for a student
  const fetchTopicRegistration = async (studentRecordId: number) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`/api/students/project-topics?studentRecordId=${studentRecordId}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.statusMessage || `Error: ${response.status}`)
      }

      const result = await response.json()

      // Map the API data to component expected format
      if (result.topic) {
        topicData.value = mapApiToComponentFormat(result.topic)
      }
      else {
        // Return null if no topic exists yet (instead of creating an empty one)
        // This will allow the component to distinguish between "no topic" and "has a topic"
        topicData.value = null
      }

      return topicData.value
    }
    catch (err: any) {
      error.value = err.message || 'Failed to fetch topic registration'
      console.error('Error fetching topic registration:', err)
      // Re-throw the error to allow the component to handle it
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  // Save topic registration
  const saveTopicRegistration = async (data: ProjectTopicRegistrationFormData & { studentRecordId: number }) => {
    isLoading.value = true
    error.value = null

    try {
      // Map from component format to API format - now using data.studentRecordId directly
      const payload = {
        studentRecordId: data.studentRecordId,
        TITLE: data.TITLE,
        TITLE_EN: data.TITLE_EN,
        PROBLEM: data.PROBLEM,
        OBJECTIVE: data.OBJECTIVE,
        TASKS: data.TASKS,
        COMPLETION_DATE: data.COMPLETION_DATE,
        SUPERVISOR: data.SUPERVISOR,
        status: data.status
      }

      // Determine if this is a create or update operation
      // Use topicData.value?.id to check if there's an existing topic
      const isUpdate = topicData.value && topicData.value.id
      const url = isUpdate
        ? `/api/students/project-topics/${topicData.value.id}`
        : '/api/students/project-topics'

      const method = isUpdate ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method: method,
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

      // Update the topicData with new values after save
      if (result.topic) {
        topicData.value = mapApiToComponentFormat(result.topic)
      }

      return result
    }
    catch (err: any) {
      error.value = err.message || 'Failed to save topic registration'
      console.error('Error saving topic registration:', err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  // Add a comment
  const addComment = async (comment: TopicComment) => {
    isLoading.value = true
    error.value = null

    try {
      // Make sure we have a topicRegistrationId
      if (!topicData.value?.id) {
        throw new Error('No topic registration ID available')
      }

      const payload = {
        topicRegistrationId: topicData.value.id,
        fieldName: comment.fieldName,
        commentText: comment.commentText,
        authorRole: comment.authorRole,
        authorName: comment.authorName,
        parentCommentId: comment.parentCommentId
      }

      const response = await fetch('/api/students/project-topics/comments', {
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

      // Refresh topic data to get updated comments
      await fetchTopicRegistration(topicData.value.studentRecordId)

      return result
    }
    catch (err: any) {
      error.value = err.message || 'Failed to add comment'
      console.error('Error adding comment:', err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  // Change topic status
  const changeStatus = async (status: string) => {
    isLoading.value = true
    error.value = null

    try {
      // Make sure we have a topicRegistrationId
      if (!topicData.value?.id) {
        throw new Error('No topic registration ID available')
      }

      const payload = {
        status,
        userRole: 'student' // You would replace this with the actual user role
      }

      const response = await fetch(`/api/students/project-topics/${topicData.value.id}/status`, {
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

      // Update local data
      if (topicData.value) {
        topicData.value.status = status
      }

      return result
    }
    catch (err: any) {
      error.value = err.message || 'Failed to change status'
      console.error('Error changing status:', err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  // Mark comment as read
  const markCommentAsRead = async (commentId: number) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`/api/students/project-topics/comments/${commentId}/mark-read`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.statusMessage || `Error: ${response.status}`)
      }

      const result = await response.json()

      // Update local data - mark this comment as read
      if (topicData.value?.comments) {
        const comment = topicData.value.comments.find(c => c.id === commentId)
        if (comment) {
          comment.unread = false
        }
      }

      return result
    }
    catch (err: any) {
      error.value = err.message || 'Failed to mark comment as read'
      console.error('Error marking comment as read:', err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  // Helper function to map API format to component format
  const mapApiToComponentFormat = (apiData: any): ProjectTopicRegistrationData => {
    return {
      id: apiData.id,
      studentRecordId: apiData.studentRecordId,
      GROUP: apiData.group || '', // Add fallback for missing fields
      NAME: apiData.studentName || '',
      TITLE: apiData.title || '',
      TITLE_EN: apiData.titleEn || '',
      PROBLEM: apiData.problem || '',
      OBJECTIVE: apiData.objective || '',
      TASKS: apiData.tasks || '',
      COMPLETION_DATE: apiData.completionDate || null,
      SUPERVISOR: apiData.supervisor || '',
      IS_REGISTERED: apiData.isRegistered || 0,
      status: apiData.status || 'draft',
      comments: apiData.comments || []
    }
  }

  return {
    isLoading,
    error,
    topicData,
    fetchTopicRegistration,
    saveTopicRegistration,
    addComment,
    changeStatus,
    markCommentAsRead
  }
}
