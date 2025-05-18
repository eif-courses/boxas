// composables/useFilteredStudents.ts
/**
 * Composable for filtering and paginating student data
 */
export function useFilteredStudents(allStudents) {
  const { search, sort, page, pageCount, groupFilter, programFilter } = useStudentTable()

  const filteredStudents = computed(() => {
    if (!allStudents.value?.students) {
      return { students: [], total: 0 }
    }

    let result = [...allStudents.value.students]

    // Apply search filter
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
          || (student.finalProjectTitle || '').toLowerCase().includes(searchTerm)
          || (student.reviewerName || '').toLowerCase().includes(searchTerm)
          || (student.supervisorEmail || '').toLowerCase().includes(searchTerm)
        )
      })
    }

    // Apply group filter
    if (groupFilter.value) {
      result = result.filter(item => item.student.studentGroup === groupFilter.value)
    }

    // Apply program filter
    if (programFilter.value) {
      result = result.filter(item => item.student.studyProgram === programFilter.value)
    }

    // Apply sorting
    result.sort((a, b) => {
      let valA, valB

      if (sort.value.column === 'name') {
        valA = `${a.student.studentName} ${a.student.studentLastname}`.toLowerCase()
        valB = `${b.student.studentName} ${b.student.studentLastname}`.toLowerCase()
      }
      else if (sort.value.column === 'topic' || sort.value.column === 'actions') {
        // Sort by topic status
        const getTopicValue = (item) => {
          if (!item.projectTopicRegistrations || item.projectTopicRegistrations.length === 0) {
            return 0 // No topic
          }
          // Order: approved (3), submitted (2), needs_revision (1), head_approved (0)
          const status = item.projectTopicRegistrations[0].status
          switch (status) {
            case 'approved': return 3
            case 'submitted': return 2
            case 'needs_revision': return 1
            case 'head_approved': return 0
            default: return -1
          }
        }

        valA = getTopicValue(a)
        valB = getTopicValue(b)
      }
      else if (sort.value.column === 'status') {
        // Sort by report status
        const getReportValue = (item) => {
          // Has report and is signed (2), has report but unsigned (1), no report (0)
          if (!item.supervisorReports || item.supervisorReports.length === 0) {
            return 0
          }
          return item.supervisorReports[0].isSigned ? 2 : 1
        }

        valA = getReportValue(a)
        valB = getReportValue(b)
      }
      else {
        // Default sort by ID
        valA = a.student.id
        valB = b.student.id
      }

      // Apply sort direction
      if (sort.value.direction === 'asc') {
        return valA > valB ? 1 : -1
      }
      else {
        return valA < valB ? 1 : -1
      }
    })

    // Apply pagination
    const totalCount = result.length
    const startIndex = (page.value - 1) * pageCount.value
    const paginatedResult = result.slice(startIndex, startIndex + pageCount.value)

    return {
      students: paginatedResult,
      total: totalCount
    }
  })

  // Get unique values for dropdowns
  const uniqueGroups = computed(() => {
    if (!allStudents.value?.students) return []
    return [...new Set(allStudents.value.students.map(s => s.student.studentGroup))]
  })

  const uniquePrograms = computed(() => {
    if (!allStudents.value?.students) return []
    return [...new Set(allStudents.value.students.map(s => s.student.studyProgram))]
  })

  // Pagination calculations
  const pageTotal = computed(() => filteredStudents.value?.total || 0)
  const pageFrom = computed(() => (page.value - 1) * Number(pageCount.value) + 1)
  const pageTo = computed(() => Math.min(page.value * Number(pageCount.value), pageTotal.value))

  return {
    filteredStudents,
    uniqueGroups,
    uniquePrograms,
    pageTotal,
    pageFrom,
    pageTo
  }
}
