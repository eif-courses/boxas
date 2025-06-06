export default defineNuxtRouteMiddleware(async (to, from) => {
  try {
    const authStore = useAuthStore()
    console.log('Middleware starting - auth state:', authStore.isAuthenticated)

    // Initialize auth store from session if needed
    if (!authStore.isAuthenticated) {
      const { loggedIn, user } = useUserSession()
      console.log('User session in middleware:', { loggedIn: loggedIn.value, hasUser: !!user.value })

      if (loggedIn.value && user.value) {
        console.log('Setting user in auth store...')
        // CRITICAL: Actually wait for the setUser promise to complete
        await authStore.setUser(user.value)
        console.log('Auth store fully initialized')
      }
      else {
        console.warn('No active user session found')
      }
    }

    // Check access rights after auth is fully initialized
    if (!authStore.hasTeacherAccess() && !authStore.hasDepartmentHeadAccess()) {
      console.warn('Access denied - redirecting to unauthorized')
      return navigateTo('/unauthorized')
    }

    console.log('Middleware completed successfully')
  }
  catch (error) {
    console.error('Middleware error:', error)
    return navigateTo('/error?message=' + encodeURIComponent(error.message || 'Authentication error'))
  }
})
