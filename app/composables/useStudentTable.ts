// composables/useStudentTable.ts
/**
 * Core composable for student table data management
 */
export function useStudentTable() {
  const search = ref('')
  const selectedStatus = ref([])
  const sort = ref({ column: 'id', direction: 'asc' as const })
  const page = ref(1)
  const pageCount = ref(10)
  const groupFilter = ref('')
  const programFilter = ref('')
  const yearFilter = ref(null)
  const forceRerender = ref(0)
  const isRefreshing = ref(false)

  // Reset all filters
  const resetFilters = () => {
    search.value = ''
    selectedStatus.value = []
    yearFilter.value = null
    groupFilter.value = ''
    programFilter.value = ''
  }

  // Dynamic years from API
  const { years: availableYears, isLoading: yearsLoading, error: yearsError } = useAcademicYears()

  // Watch for filter changes to reset pagination
  watch([search, groupFilter, programFilter, pageCount], () => {
    page.value = 1
  })

  // Make sure pageCount is always a number
  watch(pageCount, (newValue) => {
    if (typeof newValue === 'string') {
      pageCount.value = Number(newValue)
    }
  })

  return {
    search,
    selectedStatus,
    sort,
    page,
    pageCount,
    groupFilter,
    programFilter,
    yearFilter,
    forceRerender,
    isRefreshing,
    resetFilters,
    availableYears,
    yearsLoading,
    yearsError
  }
}
