export function useStudentData(role = 'supervisor') {
  console.log(`useStudentData initialized with role: ${role}`)

  // Get pagination and filter values from useStudentTable
  const { yearFilter, page, pageCount, search, groupFilter, programFilter } = useStudentTable()
  const authStore = useAuthStore()
  const authReady = computed(() => authStore.isReady)
  const toast = useToast()
  const isInitialFetchDone = ref(false)

  // Wait for auth to be ready before fetching
  const waitForAuth = () => {
    console.log('waitForAuth called, current auth status:', {
      isReady: authStore.isReady,
      isAuthenticated: authStore.isAuthenticated
    })

    return new Promise<void>((resolve, reject) => {
      if (authStore.isReady) {
        console.log('Auth is already ready')
        resolve()
        return
      }

      console.log('Watching for auth to be ready...')
      const unwatch = watch(() => authStore.isReady, (isReady) => {
        console.log('Auth ready state changed:', isReady)
        if (isReady) {
          console.log('Auth is now ready')
          unwatch()
          resolve()
        }
      }, { immediate: true })

      setTimeout(() => {
        unwatch()
        console.log('Auth timeout reached, checking authentication state')
        if (authStore.isAuthenticated) {
          console.log('Auth is authenticated despite timeout, proceeding')
          resolve()
        }
        else {
          console.error('Auth failed to initialize in time and is not authenticated')
          reject(new Error('Authentication timed out'))
        }
      }, 5000)
    })
  }

  // Determine the API endpoint based on role
  const endpoint = role === 'supervisor'
    ? '/api/students/supervisor'
    : '/api/students/department'

  console.log(`Using API endpoint: ${endpoint} for role: ${role}`)

  // Fetch student data with pagination
  const { data: allStudents, status, error: fetchError, refresh } = useLazyAsyncData(
    role === 'supervisor' ? 'supervisorStudents' : 'departmentStudents',
    async () => {
      try {
        console.log(`Starting data fetch for ${role} role`)
        await waitForAuth()

        if (!authStore.isAuthenticated) {
          console.error('Not authenticated after waiting for auth')
          throw new Error('Authentication required')
        }

        const params = new URLSearchParams()

        // Add pagination parameters
        params.set('page', page.value.toString())
        params.set('limit', pageCount.value.toString())

        // Add filter parameters
        if (yearFilter.value) {
          params.set('year', yearFilter.value.toString())
        }
        if (search.value.trim()) {
          params.set('search', search.value.trim())
        }
        if (groupFilter.value) {
          params.set('group', groupFilter.value)
        }
        if (programFilter.value) {
          params.set('program', programFilter.value)
        }

        params.set('_t', Date.now().toString())

        console.log(`Fetching from: ${endpoint}?${params.toString()}`)
        const response = await $fetch(`${endpoint}?${params.toString()}`, {
          timeout: 15000,
          retry: 1,
          retryDelay: 1000
        })

        console.log(`Data fetch successful for ${role}:`, {
          studentCount: response?.students?.length || 0,
          totalCount: response?.total || 0,
          hasError: !!response?.error
        })

        isInitialFetchDone.value = true
        return response
      }
      catch (err) {
        console.error(`Error in data fetch for ${role}:`, err)
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
      // Watch for changes in pagination and filters
      watch: [yearFilter, authReady, page, pageCount, search, groupFilter, programFilter],
      server: false,
      lazy: true,
      immediate: false
    }
  )

  // Enhanced refresh function with better logging
  const refreshStudents = async () => {
    console.log(`Refreshing students data for ${role} role`)
    try {
      await refresh()
      console.log(`Refresh complete for ${role}:`, {
        studentCount: allStudents.value?.students?.length || 0,
        status: status.value
      })
      return true
    }
    catch (error) {
      console.error(`Error refreshing ${role} data:`, error)
      return false
    }
  }

  // Refresh data with optional notification
  const refreshData = async (showNotification = true) => {
    console.log(`Manual refresh requested for ${role}`)
    try {
      const result = await refreshStudents()

      if (showNotification && result) {
        toast.add({
          title: 'Success',
          description: 'Data refreshed successfully',
          color: 'green'
        })
      }
    }
    catch (error) {
      console.error(`Error in manual refresh for ${role}:`, error)

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

  // Auto-fetch data when component is mounted
  onMounted(async () => {
    console.log(`onMounted triggered for ${role} data`)
    if (!isInitialFetchDone.value) {
      try {
        await refreshStudents()
      }
      catch (error) {
        console.error(`Error during initial data fetch for ${role}:`, error)
      }
    }
  })

  return {
    allStudents,
    status,
    fetchError,
    refreshStudents,
    activeYear,
    refreshData,
    isInitialFetchDone
  }
}
