// plugins/auth.ts - Replace your entire plugin with this:

export default defineNuxtPlugin(async (nuxtApp) => {
  console.log('Auth plugin executing')

  const authStore = useAuthStore()
  const router = useRouter()

  // Only initialize on client-side to avoid SSR issues
  if (import.meta.client) {
    // Wait for hydration to complete
    await nextTick()

    // Only initialize if not already done
    if (!authStore.isInitialized) {
      try {
        console.log('Initializing auth store from plugin')
        await authStore.initFromSession()
        console.log('Auth initialization complete in plugin')
      }
      catch (error) {
        console.error('Failed to initialize auth in plugin:', error)
        // Still mark as initialized to prevent hanging
        authStore.isInitialized = true
        authStore.isReady = true
      }
    }

    // Register global navigation guard (only on client)
    router.beforeEach(async (to, from, next) => {
      console.log(`Route navigation: ${from.path} -> ${to.path}`)

      // Skip auth check for public routes
      const publicRoutes = ['/login', '/access-denied', '/error', '/unauthorized']
      if (publicRoutes.some(route => to.path.startsWith(route))) {
        console.log('Navigating to public route, skipping auth check')
        return next()
      }

      // Ensure auth is initialized
      if (!authStore.isInitialized) {
        console.log('Auth not initialized during navigation, initializing...')
        try {
          await authStore.initFromSession()
        }
        catch (error) {
          console.error('Auth initialization failed during navigation:', error)
          // Mark as initialized anyway to prevent infinite loops
          authStore.isInitialized = true
          authStore.isReady = true
        }
      }

      // Wait for auth to be ready before checking access
      let attempts = 0
      while (!authStore.isReady && attempts < 50) { // Max 5 seconds wait
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }

      // Check authentication for protected routes
      if (to.path.startsWith('/dashboard')) {
        console.log('Protected route detected, checking authentication')

        if (!authStore.isAuthenticated) {
          console.warn('Authentication required for', to.path)
          return next('/login')
        }

        // Check for department head access specifically
        if (to.path.includes('/department') && !authStore.hasDepartmentHeadAccess()) {
          console.warn('Department head access required but not available')
          return next({
            path: '/access-denied',
            query: { from: to.fullPath, reason: 'department_access' }
          })
        }

        // Additional role-based checks for other routes
        if (to.path.includes('/supervisor') && !authStore.hasTeacherAccess()) {
          console.warn('Teacher access required but not available')
          return next({
            path: '/access-denied',
            query: { from: to.fullPath, reason: 'teacher_access' }
          })
        }

        if (to.path.includes('/reviewer') && !authStore.hasReviewerAccess()) {
          console.warn('Reviewer access required but not available')
          return next({
            path: '/access-denied',
            query: { from: to.fullPath, reason: 'reviewer_access' }
          })
        }
      }

      // Continue normal navigation
      next()
    })

    // Register a handler for route changes to ensure auth is ready
    nuxtApp.hook('page:start', async () => {
      console.log('Page navigation started, checking auth')
      if (!authStore.isInitialized && import.meta.client) {
        console.log('Auth not initialized during navigation, initializing...')
        try {
          await authStore.initFromSession()
        }
        catch (error) {
          console.warn('Auth initialization failed on page start:', error)
        }
      }
    })
  }
})
