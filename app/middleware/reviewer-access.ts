// middleware/reviewer-access.ts
export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip on server-side rendering to avoid auth issues
  if (import.meta.server) {
    return
  }

  try {
    console.log('🔍 Reviewer access middleware running')

    // Wait for client-side hydration
    await nextTick()

    const authStore = useAuthStore()

    // Initialize auth store from session if needed
    if (!authStore.isAuthenticated) {
      const { loggedIn, user } = useUserSession()

      console.log('Auth state:', { loggedIn: loggedIn.value, hasUser: !!user.value })

      if (loggedIn.value && user.value) {
        try {
          // Await the setUser promise to ensure roles are set before proceeding
          await authStore.setUser(user.value)
          console.log('✅ User set in auth store')
        }
        catch (error) {
          console.error('❌ Error setting user in auth store:', error)
          useToast().add({
            title: 'Authentication Error',
            description: 'Failed to initialize user session',
            color: 'red'
          })
          return navigateTo('/login')
        }
      }
      else {
        console.log('❌ No user session found')
        useToast().add({
          title: 'Please Log In',
          description: 'You need to be logged in to access this page',
          color: 'orange'
        })
        return navigateTo('/login')
      }
    }

    // Now we can safely check access rights
    if (!authStore.hasReviewerAccess()) {
      console.warn('❌ User does not have reviewer access')

      // Log user roles for debugging
      const userRoles = authStore.user?.roles || []
      console.log('User roles:', userRoles)

      useToast().add({
        title: 'Access Denied',
        description: 'You do not have permission to access the reviewer area',
        color: 'red'
      })

      return navigateTo('/unauthorized')
    }

    console.log('✅ Reviewer access granted')
  }
  catch (error) {
    console.error('❌ Error in reviewer-access middleware:', error)

    useToast().add({
      title: 'System Error',
      description: 'An error occurred while checking permissions',
      color: 'red'
    })

    // On error, redirect to login to be safe
    return navigateTo('/login')
  }
})
