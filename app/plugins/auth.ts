export default defineNuxtPlugin(async (nuxtApp) => {
  console.log('Auth plugin executing')

  // Initialize auth on app startup
  const authStore = useAuthStore()

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
    }
  }

  // Register a handler for route changes to ensure auth is ready
  nuxtApp.hook('page:start', async () => {
    console.log('Page navigation started, checking auth')
    if (!authStore.isInitialized) {
      console.log('Auth not initialized during navigation, initializing...')
      await authStore.initFromSession()
    }
  })
})
