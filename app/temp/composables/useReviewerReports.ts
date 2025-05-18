// composables/useReviewerReports.ts
import { ref } from 'vue'

export const useReviewerReports = (baseUrl = '/api/students/reviewer-reports') => {
  const isLoading = ref(false)
  const error = ref(null)

  /**
     * Create a new reviewer report
     */
  const createReport = async (reportData) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch(baseUrl, {
        method: 'POST',
        body: reportData
      })

      if (!response.success) {
        throw new Error(response.message || 'Failed to create reviewer report')
      }

      return response.data
    }
    catch (err) {
      console.error('Error creating reviewer report:', err)
      error.value = err
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  /**
     * Get a reviewer report by ID
     */
  const getReportById = async (id) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch(`${baseUrl}/${id}`, {
        method: 'GET'
      })

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch reviewer report')
      }

      return response.data
    }
    catch (err) {
      console.error(`Error fetching reviewer report ${id}:`, err)
      error.value = err
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  /**
     * Update an existing reviewer report
     */
  const updateReport = async (id, updateData) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch(`${baseUrl}/${id}`, {
        method: 'PUT',
        body: updateData
      })

      if (!response.success) {
        throw new Error(response.message || 'Failed to update reviewer report')
      }

      return response.data
    }
    catch (err) {
      console.error(`Error updating reviewer report ${id}:`, err)
      error.value = err
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  /**
     * Delete a reviewer report
     */
  const deleteReport = async (id) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch(`${baseUrl}/${id}`, {
        method: 'DELETE'
      })

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete reviewer report')
      }

      return true
    }
    catch (err) {
      console.error(`Error deleting reviewer report ${id}:`, err)
      error.value = err
      return false
    }
    finally {
      isLoading.value = false
    }
  }

  /**
     * Get all reviewer reports for a student
     */
  const getReportsByStudentId = async (studentId) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch(baseUrl, {
        method: 'GET',
        params: {
          studentRecordId: studentId
        }
      })

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch reviewer reports')
      }

      return response.data
    }
    catch (err) {
      console.error(`Error fetching reviewer reports for student ${studentId}:`, err)
      error.value = err
      return []
    }
    finally {
      isLoading.value = false
    }
  }
  interface StudentRecordsResponse {
    student: StudentRecord
    documents: DocumentRecord[]
    videos: VideoRecord[]
    supervisorReports: SupervisorReport[]
    reviewerReports: ReviewerReport[]
  }

  const getReviewerModalData = (response: StudentRecordsResponse) => {
    if (!response.student) return null // Need student record

    // Construct the object expected by ReviewerReportModal
    return {
      STUDENT_NAME: response.student.studentName + ' ' + response.student.studentLastname,
      THESIS_TITLE: response.student.finalProjectTitle ?? 'N/A',
      FACULTY: 'Elektronikos ir informatikos fakultetas', // Or from studentRecord if available
      DEPARTMENT: response.student.department ?? 'N/A',

      // Combine reviewer details (you might get this differently from API)
      REVIEWER_FULL_DETAILS: response.student.reviewerName + ' ' + response.reviewerReports[0]?.reviewerPersonalDetails,
      REVIEWER_NAME_SIGNATURE: response.student.reviewerName ?? '', // Name for signature line

      // Map review fields from the API report object
      REVIEW_GOALS: response.reviewerReports[0]?.reviewGoals ?? undefined,
      REVIEW_THEORY: response.reviewerReports[0]?.reviewTheory ?? undefined,
      REVIEW_PRACTICAL: response.reviewerReports[0]?.reviewPractical ?? undefined,
      REVIEW_THEORY_PRACTICAL_LINK: response.reviewerReports[0]?.reviewTheoryPracticalLink ?? undefined,
      REVIEW_RESULTS: response.reviewerReports[0]?.reviewResults ?? undefined,
      REVIEW_PRACTICAL_SIGNIFICANCE: response.reviewerReports[0]?.reviewPracticalSignificance ?? undefined,
      REVIEW_LANGUAGE: response.reviewerReports[0]?.reviewLanguage ?? undefined,
      REVIEW_PROS: response.reviewerReports[0]?.reviewPros ?? undefined,
      REVIEW_CONS: response.reviewerReports[0]?.reviewCons ?? undefined,
      REVIEW_QUESTIONS: response.reviewerReports[0]?.reviewQuestions ?? undefined,
      FINAL_GRADE: response.reviewerReports[0]?.grade ?? undefined, // Assuming 'finalGrade' field exists
      REPORT_DATE: response.reviewerReports[0]?.createdDate ? new Date(response.reviewerReports[0]?.createdDate * 1000) : undefined,
      IS_SIGNED: response.reviewerReports[0]?.isSigned ?? undefined
      // Map any other necessary fields...
    }
  }
  return {
    isLoading,
    error,
    createReport,
    getReportById,
    updateReport,
    deleteReport,
    getReportsByStudentId,
    getReviewerModalData
  }
}
