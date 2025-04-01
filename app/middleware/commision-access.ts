// middleware/commission-access.ts
import { useAuthStore } from '~/stores/auth' // Adjust path

export default defineNuxtRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore()
  const token = to.query.code as string | undefined // Get token from URL query ?token=...

  console.log('Commission Access Middleware: Path=', to.path, 'Token=', token ? token.substring(0, 5) + '...' : 'None')

  // --- Priority 1: Check for Token Access ---
  let hasAccessViaToken = false
  if (token) {
    console.log('Token found, attempting to set temporary access...')
    hasAccessViaToken = await authStore.setTemporaryCommissionAccess(token)
    if (hasAccessViaToken) {
      console.log('Temporary commission access granted via token.')
      // Token is valid, allow access based on token
      return // <-- Allow navigation
    }
    else {
      console.log('Token validation failed.')
      // Optional: Redirect to an "invalid token" page or just fall through
      // return navigateTo('/invalid-token');
      // Or let it fall through to check session login
    }
  }

  // --- Priority 2: Check for Logged-in Session Access ---
  // If no valid token was provided OR token check failed, check the regular session
  // Initialize from session if no user OR no token access granted
  // if (!authStore.user && !authStore.temporaryCommissionInfo) {
  //   console.log('No token access, checking session...')
  //   const { loggedIn, user } = useUserSession()
  //   if (loggedIn.value && user.value) {
  //     console.log('Session found, initializing auth store...')
  //     // Await setUser to ensure roles are potentially fetched/set
  //     await authStore.setUser(user.value)
  //   }
  //   else {
  //     console.log('No active session found.')
  //   }
  // }

  // --- Final Access Check ---
  // Now check if the user has access either via logged-in role OR the temporary token
  if (authStore.hasCommissionAccess()) {
    console.log('Access granted (either session role or previous token validation).')
    return // Allow navigation
  }

  // --- No Access ---
  console.log('Access Denied. Redirecting to unauthorized.')
  // Clear any potentially invalid temporary state if we got here
  authStore.temporaryCommissionInfo = null
  // Redirect to unauthorized page or login page
  // Consider redirecting based on whether a token was attempted:
  // if (token) return navigateTo('/invalid-token-or-unauthorized');
  return navigateTo('/unauthorized') // Or your login page: return navigateTo('/login?callbackUrl=' + to.fullPath);
})
