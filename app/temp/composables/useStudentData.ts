// composables/useStudentData.ts
/**
 * Composable for fetching and managing student data
 */
export function useStudentData(role = 'supervisor') {
  const { yearFilter } = useStudentTable()
  const authStore = useAuthStore()
  const authReady = computed(() => authStore.isReady)
  const toast = useToast()

  // Wait for auth to be ready before fetching
  const waitForAuth = () => {
    return new Promise<void>((resolve, reject) => {
      if (authStore.isReady) {
        resolve()
        return
      }

      const unwatch = watch(() => authStore.isReady, (isReady) => {
        if (isReady) {
          unwatch()
          resolve()
        }
      }, { immediate: true })

      setTimeout(() => {
        unwatch()
        if (authStore.isAuthenticated) {
          resolve()
        }
        else {
          reject(new Error('Authentication timed out'))
        }
      }, 5000)
    })
  }

  // Determine the API endpoint based on role
  const endpoint = role === 'supervisor' ? '/api/students/supervisor' : '/api/students/department'

  // Fetch student data
  const { data: allStudents, status, error: fetchError, refresh } = useLazyAsyncData(
    'allStudents',
    async () => {
      try {
        await waitForAuth()

        if (!authStore.isAuthenticated) {
          throw new Error('Authentication required')
        }

        const params = new URLSearchParams()
        if (yearFilter.value) {
          params.set('year', yearFilter.value.toString())
        }
        params.set('_t', Date.now().toString())

        const response = await $fetch(`${endpoint}?${params.toString()}`, {
          timeout: 15000,
          retry: 1,
          retryDelay: 1000
        })

        return response
      }
      catch (err) {
        console.error('Error in data fetch:', err)
        if (err.message === 'Authentication required' || err.message === 'Authentication timed out') {
          throw err
        }

        return {
          students: [],
          total: 0,
          year: null,
          error: err.message
        }
      }
    },
    {
      default: () => ({
        students: [],
        total: 0,
        year: null
      }),
      watch: [yearFilter, authReady],
      server: false,
      lazy: true,
      immediate: false
    }
  )

  // Refresh data with optional notification
  const refreshData = async (showNotification = true) => {
    try {
      await refresh()

      if (showNotification) {
        toast.add({
          title: 'Success',
          description: 'Data refreshed successfully',
          color: 'green'
        })
      }
    }
    catch (error) {
      console.error('Error refreshing data:', error)

      if (showNotification) {
        toast.add({
          title: 'Error',
          description: 'Failed to refresh data',
          color: 'red'
        })
      }
    }
  }

  // Get active year (selected or from API)
  const activeYear = computed(() => {
    return yearFilter.value || allStudents.value?.year || null
  })

  return {
    allStudents,
    status,
    fetchError,
    refreshStudents: refresh,
    activeYear,
    refreshData
  }
}
