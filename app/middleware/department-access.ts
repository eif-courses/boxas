export default defineNuxtRouteMiddleware(async (to, from) => {
  try {
    const authStore = useAuthStore()
    console.log('Department middleware starting - auth state:', {
      isInitialized: authStore.isInitialized,
      isAuthenticated: authStore.isAuthenticated,
      hasDeptAccess: authStore.hasDepartmentHeadAccess(),
      email: authStore.user?.email || 'none'
    })

    // ✅ Exit early if this is server-side
    if (!import.meta.client) {
      console.log('Skipping department middleware role checks during SSR')
      return
    }

    // Initialize auth store if needed
    if (!authStore.isInitialized) {
      console.log('Auth not initialized, initializing...')
      await authStore.initFromSession()

      // Wait for readiness
      if (!authStore.isReady) {
        console.log('Waiting for auth store to become ready...')
        await new Promise((resolve) => {
          const stop = watch(() => authStore.isReady, (ready) => {
            if (ready) {
              stop()
              resolve(undefined)
            }
          })
        })
        console.log('Auth store is now ready')
      }
    }

    // Fallback session check
    if (!authStore.isAuthenticated) {
      const { loggedIn, user } = useUserSession()
      console.log('User session in department middleware:', {
        loggedIn: loggedIn.value,
        hasUser: !!user.value,
        email: user.value?.email || 'none'
      })

      if (loggedIn.value && user.value) {
        console.log('Setting user in auth store from session...')
        await authStore.setUser(user.value)

        // Wait again if needed
        if (!authStore.isReady) {
          console.log('Waiting for auth store to become ready after setUser...')
          await new Promise((resolve) => {
            const stop = watch(() => authStore.isReady, (ready) => {
              if (ready) {
                stop()
                resolve(undefined)
              }
            })
          })
        }
      }
      else {
        console.warn('No active user session found, redirecting to login')
        return navigateTo('/login')
      }
    }

    // ✅ DEPARTMENT ACCESS CHECK (client-only)
    if (authStore.hasDepartmentHeadAccess()) {
      console.log('Access granted: department head')
      return
    }

    console.warn('Access not yet verified, forcing API check...')
    const apiCheckResult = await authStore.checkDepartmentHeadStatus(true)

    if (apiCheckResult) {
      console.log('Department head access granted after API check')
      return
    }

    // Try full refresh
    console.warn('Still no access, refreshing user...')
    await authStore.refreshUser()

    if (authStore.hasDepartmentHeadAccess()) {
      console.log('Department head access granted after refresh')
      return
    }

    console.warn('Final denial: user does not have department head access', {
      email: authStore.user?.email || 'none',
      isDepartmentHead: authStore.user?.isDepartmentHead,
      hasDepInfo: !!authStore.user?.departmentInfo
    })

    return navigateTo({
      path: '/access-denied',
      query: {
        from: to.fullPath,
        reason: 'department_access'
      }
    })
  }
  catch (error) {
    console.error('Department middleware error:', error)
    return navigateTo({
      path: '/error',
      query: { message: encodeURIComponent(error.message || 'Authentication error') }
    })
  }
})
