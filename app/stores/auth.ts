// stores/authStore.ts
import { defineStore } from 'pinia'

// Interface for department head info
interface DepartmentHeadInfo {
  id: number
  email: string
  name: string
  sureName: string
  department: string
  departmentEn: string
  jobTitle: string
  role: number
  isActive: number
  createdAt: number | null
}

// Persistence helpers - defining the functions missing in your code
const DEPARTMENT_HEAD_STORAGE_KEY = 'department_head_data'

// Save department head data to localStorage
function saveDepartmentHeadData(email: string, isDepartmentHead: boolean, departmentInfo: DepartmentHeadInfo | null) {
  try {
    localStorage.setItem(DEPARTMENT_HEAD_STORAGE_KEY, JSON.stringify({
      email,
      isDepartmentHead,
      departmentInfo,
      timestamp: Date.now()
    }))
    console.log('Saved department head data to localStorage')
  }
  catch (e) {
    console.warn('Failed to save department head data:', e)
  }
}

// Load department head data from localStorage (with email validation and expiry check)
function loadDepartmentHeadData(email: string) {
  try {
    const stored = localStorage.getItem(DEPARTMENT_HEAD_STORAGE_KEY)
    if (!stored) return null

    const data = JSON.parse(stored)

    // Validate data matches current user and isn't too old (24 hours max)
    const isExpired = Date.now() - (data.timestamp || 0) > 24 * 60 * 60 * 1000
    const isValidUser = data.email === email

    if (isExpired) {
      console.log('Stored department head data expired, removing')
      localStorage.removeItem(DEPARTMENT_HEAD_STORAGE_KEY)
      return null
    }

    if (!isValidUser) {
      console.log('Stored department head data not for current user')
      return null
    }

    console.log('Loaded valid department head data from storage')
    return data
  }
  catch (e) {
    console.warn('Error loading department head data:', e)
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as null | {
      displayName: string
      email: string
      role: string
      mail?: string
      jobTitle: string | null
      isTeacher: boolean
      isDepartmentHead: boolean
      isCommission: boolean
      isStudent: boolean
      isReviewer: boolean
      isAdmin: boolean
      departmentInfo?: DepartmentHeadInfo | null // Store all dept head properties
    },
    temporaryCommissionInfo: null as null | {
      department: string
    },
    isInitialized: false,
    isReady: false, // Explicit isReady flag
    isInitializing: false // Flag to prevent concurrent initializations
  }),

  actions: {
    async initFromSession() {
      // Prevent concurrent initialization
      if (this.isInitializing) {
        console.log('Auth initialization already in progress, waiting...')
        await new Promise((resolve) => {
          const unwatch = watch(() => this.isInitializing, (initializing) => {
            if (!initializing) {
              unwatch()
              resolve(undefined)
            }
          })
        })
        return
      }

      this.isInitializing = true
      console.log('Starting auth initialization')

      try {
        const userSession = useUserSession()
        console.log('User session state:', {
          loggedIn: userSession.loggedIn.value,
          hasUser: !!userSession.user.value
        })

        // Wait for session to be ready if it's loading
        if (userSession.status && userSession.status.value === 'loading') {
          console.log('Waiting for user session to be ready...')
          await new Promise((resolve) => {
            const unwatch = watch(userSession.status, (newStatus) => {
              if (newStatus !== 'loading') {
                unwatch()
                resolve(undefined)
              }
            })
          })
        }

        if (userSession.loggedIn.value && userSession.user.value) {
          console.log('User is logged in, setting user data')
          await this.setUser(userSession.user.value)
        }
        else {
          console.log('No active user session found')
          this.user = null
        }
      }
      catch (error) {
        console.error('Error during auth initialization:', error)
        this.user = null
      }
      finally {
        // Always mark as initialized even if there was an error
        this.isInitialized = true
        this.isReady = true
        this.isInitializing = false
        console.log('Auth initialization completed, state:', {
          isInitialized: this.isInitialized,
          isAuthenticated: this.isAuthenticated,
          hasDeptAccess: this.hasDepartmentHeadAccess(),
          email: this.user?.email || 'none'
        })
      }
    },

    async setUser(userData) {
      console.log('Setting user data:', userData)
      this.isReady = false // Reset ready state while updating

      const email = userData.mail || userData.email || userData.userPrincipalName || userData.preferred_username || ''
      console.log('Resolved email:', email)

      const role = mapEmailToRole(email)
      console.log('Resolved role:', role, 'for email:', email)

      // Set basic user data immediately so UI can render something
      this.user = {
        displayName: userData.displayName,
        email,
        mail: email,
        role,
        jobTitle: userData.jobTitle || null,
        isTeacher: role === 'teacher' || userData.jobTitle === 'Dėstytojas',
        isDepartmentHead: false, // Will be updated after check
        departmentInfo: null, // Will be updated after check
        isCommission: role === 'commission',
        isStudent: role === 'student',
        isReviewer: role === 'reviewer',
        isAdmin: role === 'admin'
      }

      // Pre-fill from local storage while API call is pending
      const storedDeptData = loadDepartmentHeadData(email)
      if (storedDeptData && storedDeptData.isDepartmentHead) {
        console.log('Pre-filling department head data from storage')
        this.user.isDepartmentHead = true
        this.user.departmentInfo = storedDeptData.departmentInfo
        this.user.isTeacher = this.user.isTeacher || true
      }

      // Check if user is department head via API
      try {
        console.log('Checking department head status via API for email:', email)
        const response = await $fetch('/api/users/is-department-head', {
          timeout: 10000, // 10s
          retry: 2
        })
        console.log('Department head API response:', response)

        // Extract values from API response
        const isDepartmentHead = response.isDepartmentHead === true
        const departmentInfo = response.departmentInfo || null

        // Update the user with department head info
        if (this.user) {
          this.user.isDepartmentHead = isDepartmentHead
          this.user.departmentInfo = departmentInfo
          // Also ensure teacher status is updated based on department head status
          this.user.isTeacher = this.user.isTeacher || isDepartmentHead
        }

        // Save to local storage if department head
        if (isDepartmentHead && departmentInfo) {
          saveDepartmentHeadData(email, true, departmentInfo)
        }

        console.log('Updated user with department head status:', {
          isDepartmentHead,
          hasDepInfo: !!departmentInfo,
          department: departmentInfo?.department || 'N/A'
        })
      }
      catch (error) {
        console.error('Error checking department head status:', error)

        // If API call failed but we have stored data, keep using it
        // (We already pre-filled above, so no need to set again)
        if (storedDeptData && storedDeptData.isDepartmentHead) {
          console.log('API call failed, using cached department head data')
        }
      }

      // Mark as ready after all data is set
      this.isReady = true
      console.log('User set successfully:', {
        displayName: this.user.displayName,
        email: this.user.email,
        isDepartmentHead: this.user.isDepartmentHead,
        hasDepInfo: !!this.user.departmentInfo,
        department: this.user.departmentInfo?.department || 'N/A'
      })
    },

    async setTemporaryCommissionAccess(code: string): Promise<boolean> {
      this.user = null
      this.temporaryCommissionInfo = null
      this.isReady = false

      if (!code) {
        this.isReady = true
        return false
      }

      try {
        const response = await $fetch('/api/users/is-commission-member', {
          method: 'GET',
          query: { code }
        })

        if (response?.isValid && response.memberInfo) {
          this.temporaryCommissionInfo = {
            department: response.memberInfo.department
          }
          this.isReady = true
          return true
        }

        this.isReady = true
        return false
      }
      catch (error) {
        console.error('Error validating commission token:', error)
        this.isReady = true
        return false
      }
    },

    async refreshUser() {
      console.log('Explicitly refreshing user data')
      this.isReady = false

      try {
        // Try to get fresh user session first
        const userSession = useUserSession()
        let userUpdated = false

        // If we have an active session, use that data
        if (userSession.loggedIn.value && userSession.user.value) {
          await this.setUser(userSession.user.value)
          userUpdated = true
        }
        else {
          // Otherwise try to get fresh user data from API
          try {
            const response = await $fetch('/api/auth/microsoft')
            if (response && response.user) {
              await this.setUser(response.user)
              userUpdated = true
            }
          }
          catch (apiError) {
            console.warn('API user refresh failed:', apiError)
          }
        }

        // If user update succeeded but we don't have department head status,
        // explicitly check it to ensure it's not missed
        if (userUpdated && this.user && !this.user.isDepartmentHead) {
          await this.checkDepartmentHeadStatus(true) // Force API call
        }

        // If no user data available, clear user
        if (!userUpdated) {
          console.warn('No user data available from session or API')
          this.clearUser()
        }

        return userUpdated
      }
      catch (error) {
        console.error('Error refreshing user data:', error)
        this.clearUser()
        return false
      }
      finally {
        this.isReady = true
      }
    },

    async checkDepartmentHeadStatus(forceApiCall = false) {
      if (!this.user || !this.user.email) {
        console.warn('Cannot check department head status - no user or email')
        return false
      }

      const email = this.user.email
      console.log('Checking department head status for:', email)

      // First try to use stored data if not forcing API call
      if (!forceApiCall) {
        const storedData = loadDepartmentHeadData(email)
        if (storedData && storedData.isDepartmentHead) {
          console.log('Using cached department head data:', storedData.departmentInfo?.department)

          // Update user with stored data
          if (this.user) {
            this.user.isDepartmentHead = true
            this.user.departmentInfo = storedData.departmentInfo
            this.user.isTeacher = this.user.isTeacher || true
          }

          return true
        }
      }

      // If no stored data or forcing API call, try API
      try {
        console.log('Checking department head status via API')
        const response = await $fetch('/api/users/is-department-head', {
          timeout: 5000,
          retry: 1
        })
        console.log('[checkDepartmentHeadStatus] API response:', response)

        const isDepartmentHead = response.isDepartmentHead === true
        const departmentInfo = response.departmentInfo || null

        console.log('Department head API result:', { isDepartmentHead, dept: departmentInfo?.department || 'N/A' })

        // Update user object
        if (this.user) {
          this.user.isDepartmentHead = isDepartmentHead
          this.user.departmentInfo = departmentInfo
          this.user.isTeacher = this.user.isTeacher || isDepartmentHead
        }

        // Save to storage if successful
        if (isDepartmentHead && departmentInfo) {
          saveDepartmentHeadData(email, true, departmentInfo)
        }

        return isDepartmentHead
      }
      catch (error) {
        console.error('Error checking department head status via API:', error)

        // Final fallback - check stored data if we haven't already
        if (forceApiCall) {
          const storedData = loadDepartmentHeadData(email)
          if (storedData && storedData.isDepartmentHead) {
            console.log('API failed, falling back to stored department head data')

            // Update user with stored data
            if (this.user) {
              this.user.isDepartmentHead = true
              this.user.departmentInfo = storedData.departmentInfo
              this.user.isTeacher = this.user.isTeacher || true
            }

            return true
          }
        }

        return false
      }
    },

    hasTeacherAccess() {
      return this.user?.isTeacher === true
    },

    hasDepartmentHeadAccess() {
      // Enhanced department head check with better logging
      const isDepartmentHead = this.user?.isDepartmentHead === true
      const hasDepartmentInfo = !!this.user?.departmentInfo

      // Log basic check result
      console.log('Checking department head access:', {
        email: this.user?.email || 'none',
        isDepartmentHead,
        hasDepartmentInfo,
        department: this.user?.departmentInfo?.department || 'N/A'
      })

      // If we have the role, return true immediately
      if (isDepartmentHead) {
        return true
      }

      // If we have a user email but no department head status,
      // check if we have stored data that says they're a department head
      if (this.user?.email && !isDepartmentHead) {
        const storedData = loadDepartmentHeadData(this.user.email)
        if (storedData && storedData.isDepartmentHead) {
          console.log('Found department head status in localStorage')

          // Update user object to prevent future checks
          if (this.user) {
            this.user.isDepartmentHead = true
            this.user.departmentInfo = storedData.departmentInfo
            this.user.isTeacher = this.user.isTeacher || true
          }

          return true
        }
      }

      return false
    },

    hasCommissionAccess() {
      return this.user?.isCommission === true || !!this.temporaryCommissionInfo
    },

    hasStudentAccess() {
      return this.user?.isStudent === true
    },

    hasReviewerAccess() {
      return this.user?.isReviewer === true
    },

    hasAdminAccess() {
      return this.user?.isAdmin === true
    },

    clearUser() {
      console.log('Clearing user data')
      this.user = null
      this.temporaryCommissionInfo = null

      // Don't clear department head storage here - keep it for next login
      // if it's the same user

      const { clear } = useUserSession()
      try {
        clear()
      }
      catch (e) {
        console.warn('Error clearing session', e)
      }
      this.isReady = true
    }
  },

  getters: {
    isAuthenticated: state => !!state.user,
    getUser: state => state.user,
    isCommissionMemberOrHasTokenAccess: state => !!state.user?.isCommission || !!state.temporaryCommissionInfo,
    getTemporaryCommissionInfo: state => state.temporaryCommissionInfo,
    userRole: (state) => {
      if (state.user) return state.user.role || 'guest'
      if (state.temporaryCommissionInfo) return 'commission'
      return 'guest'
    }
  }
})

// Centralized role mapping logic
function mapEmailToRole(email: string): string {
  const normalized = email.toLowerCase()

  if (normalized.includes('admin@')) return 'admin'
  if (normalized.includes('super@')) return 'admin'
  if (normalized.includes('head@')) return 'department-head'
  if (normalized.includes('teacher@')) return 'teacher'
  if (normalized.includes('student@')) return 'student'

  if (normalized.endsWith('@eif.viko.lt') && !normalized.includes('penworld')) return 'teacher'
  if (normalized.endsWith('@viko.lt')) return 'teacher'

  // Fallback for unknown Microsoft accounts in your org
  if (normalized.endsWith('@baigiamieji.onmicrosoft.com')) return 'reviewer'

  if (
    normalized === 'student@baigiamieji.onmicrosoft.com'
    || normalized.endsWith('@stud.viko.lt')
    || normalized.includes('penworld@eif.viko.lt')
  ) return 'student'

  // Fallback
  return 'reviewer'
}
