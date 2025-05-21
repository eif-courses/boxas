// composables/useFilteredStudents.ts
import { useStudentTable } from '~/composables/useStudentTable'

/**
 * Composable for handling server-side paginated and filtered student data
 */
export function useFilteredStudents(allStudents) {
  // `allStudents` is now the direct response from the API, e.g.,
  // { students: [...], totalItems: X, currentPage: Y, ... }

  const { page, pageCount } = useStudentTable()

  const filteredStudents = computed(() => {
    // Client-side filtering, sorting, and pagination are removed.
    // The data is already filtered, sorted, and paginated by the server.
    return {
      students: allStudents.value?.students || [], // Students for the current page from API
      total: allStudents.value?.totalItems || 0 // Total items matching filters on server
    }
  })

  // Get unique values for dropdowns from the current page's data
  const uniqueGroups = computed(() => {
    if (!allStudents.value?.students || allStudents.value.students.length === 0) return []
    return [...new Set(allStudents.value.students.map(item => item.student.studentGroup))].filter(Boolean)
  })

  const uniquePrograms = computed(() => {
    if (!allStudents.value?.students || allStudents.value.students.length === 0) return []
    return [...new Set(allStudents.value.students.map(item => item.student.studyProgram))].filter(Boolean)
  })

  // Pagination calculations based on server-provided total and current page settings
  const pageTotal = computed(() => allStudents.value?.totalItems || 0)

  const pageFrom = computed(() => {
    if (!allStudents.value?.totalItems || allStudents.value.totalItems === 0) return 0
    return (page.value - 1) * pageCount.value + 1
  })

  const pageTo = computed(() => {
    if (!allStudents.value?.totalItems || allStudents.value.totalItems === 0) return 0
    return Math.min(page.value * pageCount.value, allStudents.value.totalItems)
  })

  return {
    filteredStudents,
    uniqueGroups,
    uniquePrograms,
    pageTotal,
    pageFrom,
    pageTo
  }
}
