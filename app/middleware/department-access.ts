export default defineNuxtRouteMiddleware(async (to, from) => {
  try {
    console.log('Department middleware starting', {
      path: to.path,
      fromPath: from?.path,
      isClient: import.meta.client,
      timestamp: new Date().toISOString()
    })

    // ✅ Always skip during SSR
    if (!import.meta.client) {
      console.log('Skipping department middleware during SSR')
      return
    }

    // Get both auth store and user session
    const authStore = useAuthStore()
    const { loggedIn, user } = useUserSession()

    console.log('Initial auth state:', {
      authStoreInitialized: authStore.isInitialized,
      authStoreAuthenticated: authStore.isAuthenticated,
      authStoreReady: authStore.isReady,
      sessionLoggedIn: loggedIn.value,
      hasSessionUser: !!user.value,
      sessionUserEmail: user.value?.email || 'none'
    })

    // ✅ STEP 1: Wait for user session to be available first
    if (!loggedIn.value || !user.value) {
      console.log('No user session found, waiting for session...')

      // Wait longer for session to load during refresh (especially important)
      const maxSessionWait = 3000 // 3 seconds for session
      const sessionStart = Date.now()

      while ((!loggedIn.value || !user.value) && (Date.now() - sessionStart) < maxSessionWait) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // Check again after waiting
      if (!loggedIn.value || !user.value) {
        console.log('Still no user session after waiting, redirecting to login')
        return navigateTo('/login')
      }
    }

    console.log('User session confirmed:', {
      email: user.value?.email,
      hasUser: !!user.value
    })

    // ✅ STEP 2: Initialize auth store if needed
    if (!authStore.isInitialized) {
      console.log('Auth store not initialized, initializing from session...')

      try {
        await authStore.initFromSession()
        console.log('Auth store initialized from session')
      }
      catch (initError) {
        console.error('Failed to initialize auth store:', initError)

        // Try setting user directly from session
        if (user.value) {
          console.log('Attempting to set user directly in auth store...')
          await authStore.setUser(user.value)
        }
      }
    }

    // ✅ STEP 3: Wait for auth store to be ready
    if (!authStore.isReady) {
      console.log('Auth store not ready, waiting...')

      // Wait for auth store to become ready with timeout
      const maxWaitTime = 2000 // 2 seconds for auth store
      const startTime = Date.now()

      while (!authStore.isReady && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      if (!authStore.isReady) {
        console.log('Auth store not ready after timeout, forcing user set...')

        // Force set user from session
        if (user.value) {
          try {
            await authStore.setUser(user.value)
            console.log('User set in auth store successfully')
          }
          catch (setUserError) {
            console.error('Failed to set user in auth store:', setUserError)
          }
        }
      }
    }

    console.log('Auth store state after initialization:', {
      isInitialized: authStore.isInitialized,
      isAuthenticated: authStore.isAuthenticated,
      isReady: authStore.isReady,
      hasUser: !!authStore.user,
      userEmail: authStore.user?.email
    })

    // ✅ STEP 4: Ensure user is authenticated in auth store
    if (!authStore.isAuthenticated && user.value) {
      console.log('Auth store not authenticated but session exists, setting user...')
      await authStore.setUser(user.value)
    }

    // ✅ STEP 5: Check department head access
    let hasDeptAccess = false

    // First check if already determined
    if (authStore.hasDepartmentHeadAccess()) {
      console.log('Department access confirmed from auth store')
      hasDeptAccess = true
    }
    else {
      console.log('No department access in auth store, checking API...')

      // API check with proper error handling for session issues
      try {
        // First try the soft check that won't throw 401
        console.log('Trying soft department check...')
        let apiResult = await $fetch('/api/auth/check-department-head-soft', {
          timeout: 5000,
          retry: 1
        })

        if (apiResult?.isDepartmentHead) {
          console.log('Department access confirmed via soft API check')
          hasDeptAccess = true

          // Update auth store with the API result
          if (authStore.user && apiResult.departmentInfo) {
            console.log('Updating auth store with department info')
            authStore.user.isDepartmentHead = true
            authStore.user.departmentInfo = apiResult.departmentInfo
          }
        }
        else if (apiResult?.needsAuth) {
          console.log('Soft check indicates auth needed, trying strict check...')

          // Session might be ready now, try the strict check
          try {
            apiResult = await $fetch('/api/auth/check-department-head', {
              timeout: 3000
            })

            if (apiResult?.isDepartmentHead) {
              console.log('Department access confirmed via strict API check')
              hasDeptAccess = true

              if (authStore.user && apiResult.departmentInfo) {
                authStore.user.isDepartmentHead = true
                authStore.user.departmentInfo = apiResult.departmentInfo
              }
            }
          }
          catch (strictError) {
            console.error('Strict API check failed:', strictError)
          }
        }
        else {
          console.log('API confirmed user is not a department head')
        }
      }
      catch (apiError) {
        console.error('API check failed:', {
          status: apiError.statusCode,
          message: apiError.message
        })

        // If it's a 401, the session might not be ready yet - wait and retry once
        if (apiError.statusCode === 401) {
          console.log('Got 401, session might not be ready. Waiting and retrying...')

          await new Promise(resolve => setTimeout(resolve, 1000))

          try {
            const retryResult = await $fetch('/api/auth/check-department-head', {
              timeout: 3000
            })

            if (retryResult?.isDepartmentHead) {
              console.log('Department access confirmed via API retry')
              hasDeptAccess = true

              if (authStore.user && retryResult.departmentInfo) {
                authStore.user.isDepartmentHead = true
                authStore.user.departmentInfo = retryResult.departmentInfo
              }
            }
          }
          catch (retryError) {
            console.error('API retry also failed:', retryError)
          }
        }

        // If still no access after API attempts, try refreshing auth store
        if (!hasDeptAccess) {
          try {
            console.log('API failed, trying user refresh...')
            await authStore.refreshUser()

            if (authStore.hasDepartmentHeadAccess()) {
              console.log('Department access confirmed after refresh')
              hasDeptAccess = true
            }
          }
          catch (refreshError) {
            console.error('User refresh also failed:', refreshError)
          }
        }
      }
    }

    // ✅ STEP 6: Final decision
    if (hasDeptAccess) {
      console.log('✅ Department access granted')
      return
    }

    // ✅ FINAL: Access denied
    console.warn('❌ Access denied - user does not have department head privileges', {
      userEmail: authStore.user?.email || user.value?.email || 'unknown',
      isDepartmentHead: authStore.user?.isDepartmentHead,
      hasDepartmentInfo: !!authStore.user?.departmentInfo,
      authStoreReady: authStore.isReady,
      sessionActive: loggedIn.value
    })

    return navigateTo({
      path: '/access-denied',
      query: {
        from: to.fullPath,
        reason: 'department_access',
        timestamp: Date.now()
      }
    })
  }
  catch (error) {
    console.error('❌ Department middleware error:', {
      message: error.message,
      stack: error.stack,
      path: to.path
    })

    return navigateTo({
      path: '/error',
      query: {
        message: encodeURIComponent(error.message || 'Authentication error'),
        from: to.fullPath
      }
    })
  }
})
