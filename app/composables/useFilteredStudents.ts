// composables/useFilteredStudents.ts
import { useStudentTable } from '~/composables/useStudentTable'

/**
 * Composable for filtering and paginating student data
 * Now handles server-side pagination
 */
export function useFilteredStudents(allStudents) {
  const { search, sort, page, pageCount, groupFilter, programFilter } = useStudentTable()

  // Since filtering and pagination are now handled server-side,
  // we mainly just pass through the data and handle sorting if needed
  const filteredStudents = computed(() => {
    if (!allStudents.value?.students) {
      return { students: [], total: 0 }
    }

    const result = [...allStudents.value.students]

    // Apply client-side sorting if needed (server might not handle all sort cases)
    if (sort.value.column) {
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
    }

    // Return the data with total from server (for server-side pagination)
    return {
      students: result,
      total: allStudents.value.total || result.length
    }
  })

  // Get unique values for dropdowns - these should come from the complete dataset
  // You might want to fetch these separately from the server for better UX
  const uniqueGroups = computed(() => {
    if (!allStudents.value?.students) return []
    return [...new Set(allStudents.value.students.map(s => s.student.studentGroup))]
  })

  const uniquePrograms = computed(() => {
    if (!allStudents.value?.students) return []
    return [...new Set(allStudents.value.students.map(s => s.student.studyProgram))]
  })

  // Pagination calculations for server-side pagination
  const pageTotal = computed(() => allStudents.value?.total || 0)
  const pageFrom = computed(() => {
    const total = pageTotal.value
    if (total === 0) return 0
    return (page.value - 1) * Number(pageCount.value) + 1
  })
  const pageTo = computed(() => {
    const total = pageTotal.value
    const from = pageFrom.value
    if (total === 0 || from === 0) return 0
    return Math.min(page.value * Number(pageCount.value), total)
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
