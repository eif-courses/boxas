// composables/useReviewerReports.ts
/**
 * Composable for handling reviewer reports
 */
export function useReviewerReports() {
  const isParentSavingReview = ref(false)
  const toast = useToast()

  /**
   * Extracts reviewer report data from a student record
   */
  const getReviewerModalData = (response) => {
    if (!response.student) return null // Need student record

    // If there's no reviewer report, return null
    if (!response.reviewerReports || response.reviewerReports.length === 0) {
      return null
    }

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
    }
  }

  /**
   * Get initial reviewer report form data for a new report
   */
  const getInitialReviewerFormData = () => {
    return {
      REVIEWER_FULL_DETAILS: '',
      REVIEW_GOALS: '',
      REVIEW_THEORY: '',
      REVIEW_PRACTICAL: '',
      REVIEW_THEORY_PRACTICAL_LINK: '',
      REVIEW_RESULTS: '',
      REVIEW_PRACTICAL_SIGNIFICANCE: '',
      REVIEW_LANGUAGE: '',
      REVIEW_PROS: '',
      REVIEW_CONS: '',
      REVIEW_QUESTIONS: '',
      FINAL_GRADE: 8
    }
  }

  /**
   * Handle saving a reviewer report
   */
  const handleReviewerReportSave = async (recordId, updatedData, refreshCallback) => {
    if (recordId === undefined || recordId === null) {
      toast.add({
        title: 'Klaida',
        description: 'Trūksta studento įrašo ID recenzijos išsaugojimui.',
        color: 'red'
      })
      return
    }

    isParentSavingReview.value = true
    console.log(`Saving reviewer report for studentRecordId ${recordId}:`, updatedData)

    const apiPayload = {
      studentRecordId: recordId,
      ...updatedData // Spread the editable fields
    }
    delete apiPayload.REPORT_DATE // Ensure it's removed

    try {
      const { data, error } = await useFetch('/api/students/reviewer-reports', {
        method: 'POST',
        body: apiPayload
      })

      if (error.value) {
        console.error('Failed to save reviewer report:', error.value)
        toast.add({
          title: 'Klaida',
          description: error.value.data?.message || 'Nepavyko išsaugoti recenzijos.',
          color: 'red'
        })
      }
      else {
        console.log('Reviewer report saved successfully!', data.value)
        toast.add({
          title: 'Pavyko',
          description: data.value?.message || 'Recenzija sėkmingai išsaugota.',
          color: 'green'
        })

        // Refresh data if callback provided
        if (refreshCallback && typeof refreshCallback === 'function') {
          await refreshCallback()
        }
      }
    }
    catch (err) {
      console.error('Unexpected error saving reviewer report:', err)
      toast.add({
        title: 'Sistemos Klaida',
        description: 'Įvyko netikėta klaida.',
        color: 'red'
      })
    }
    finally {
      isParentSavingReview.value = false
    }
  }

  return {
    isParentSavingReview,
    getReviewerModalData,
    getInitialReviewerFormData,
    handleReviewerReportSave
  }
}
