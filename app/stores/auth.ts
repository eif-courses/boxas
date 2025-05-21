// stores/authStore.ts
import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

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

// VueUse reactive localStorage with automatic expiry and validation
const departmentHeadStorage = useLocalStorage('department_head_data', null, {
  serializer: {
    read: (value: string) => {
      try {
        const data = JSON.parse(value)
        // Check if data is expired (24 hours)
        const isExpired = Date.now() - (data.timestamp || 0) > 24 * 60 * 60 * 1000
        return isExpired ? null : data
      }
      catch {
        return null
      }
    },
    write: (value: any) => JSON.stringify(value)
  }
})

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
      departmentInfo?: DepartmentHeadInfo | null
    },
    temporaryCommissionInfo: null as null | {
      department: string
    },
    isInitialized: false,
    isReady: false,
    isInitializing: false
  }),

  actions: {
    async initFromSession() {
      if (this.isInitializing) {
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

        // Wait for session if loading
        if (userSession.status?.value === 'loading') {
          await new Promise((resolve) => {
            const unwatch = watch(userSession.status, (status) => {
              if (status !== 'loading') {
                unwatch()
                resolve(undefined)
              }
            })
          })
        }

        if (userSession.loggedIn.value && userSession.user.value) {
          await this.setUser(userSession.user.value)
        }
        else {
          this.user = null
        }
      }
      catch (error) {
        console.error('Auth initialization error:', error)
        this.user = null
      }
      finally {
        this.isInitialized = true
        this.isReady = true
        this.isInitializing = false
      }
    },

    // stores/authStore.ts - Replace your setUser method with this:

    async setUser(userData) {
      console.log('Setting user data:', userData)
      this.isReady = false

      const email = userData.mail || userData.email || userData.userPrincipalName || userData.preferred_username || ''
      const role = mapEmailToRole(email)

      // Set basic user data
      this.user = {
        displayName: userData.displayName,
        email,
        mail: email,
        role,
        jobTitle: userData.jobTitle || null,
        isTeacher: role === 'teacher' || userData.jobTitle === 'Dėstytojas',
        isDepartmentHead: false,
        departmentInfo: null,
        isCommission: role === 'commission',
        isStudent: role === 'student',
        isReviewer: role === 'reviewer',
        isAdmin: role === 'admin'
      }

      // Load cached department head data first
      const cachedData = this.getCachedDepartmentData(email)
      if (cachedData?.isDepartmentHead) {
        this.user.isDepartmentHead = true
        this.user.departmentInfo = cachedData.departmentInfo
        this.user.isTeacher = true
      }

      // Only make API call on client-side and when session is properly established
      if (import.meta.client) {
        try {
          // Wait a bit to ensure session is established
          await new Promise(resolve => setTimeout(resolve, 100))

          // Check if we actually have a valid session before making the API call
          const { loggedIn, status } = useUserSession()

          if (!loggedIn.value || status.value === 'loading') {
            console.log('Session not ready, skipping department head check')
            this.isReady = true
            return
          }

          const response = await $fetch('/api/auth/check-department-head', {
            timeout: 10000,
            retry: 2,
            onRequestError({ error }) {
              console.warn('Department head check request error:', error)
            },
            onResponseError({ response }) {
              console.warn('Department head check response error:', response.status, response.statusText)
            }
          })

          if (response.isDepartmentHead && this.user) {
            this.user.isDepartmentHead = true
            this.user.departmentInfo = response.departmentInfo
            this.user.isTeacher = true
            this.saveDepartmentData(email, true, response.departmentInfo)
          }
        }
        catch (error) {
          console.warn('Department head check failed:', error.message || error)

          // If it's a 401/403 error, don't treat it as a failure - just use cached data
          if (error.statusCode === 401 || error.statusCode === 403) {
            console.log('Authentication error during department head check, using cached data only')
          }

          // Don't throw the error - let the app continue working
        }
      }
      else {
        console.log('Server-side execution, skipping department head API check')
      }

      this.isReady = true
    },

    // Also update your checkDepartmentHeadStatus method:
    async checkDepartmentHeadStatus(forceApiCall = false) {
      if (!this.user?.email) return false

      const email = this.user.email

      // Use cached data unless forcing API call
      if (!forceApiCall) {
        const cachedData = this.getCachedDepartmentData(email)
        if (cachedData?.isDepartmentHead) {
          this.user.isDepartmentHead = true
          this.user.departmentInfo = cachedData.departmentInfo
          this.user.isTeacher = true
          return true
        }
      }

      // Only make API call on client side
      if (import.meta.server) {
        console.log('Server-side execution, using cached data only')
        return this.user.isDepartmentHead
      }

      // API call (client-side only)
      try {
        // Ensure session is ready
        const { loggedIn, status } = useUserSession()

        if (!loggedIn.value || status.value === 'loading') {
          console.log('Session not ready for department head check')
          return this.user.isDepartmentHead
        }

        const response = await $fetch('/api/auth/check-department-head', {
          timeout: 5000,
          retry: 1
        })

        const isDeptHead = response.isDepartmentHead
        if (this.user) {
          this.user.isDepartmentHead = isDeptHead
          this.user.departmentInfo = response.departmentInfo
          this.user.isTeacher = this.user.isTeacher || isDeptHead
        }

        if (isDeptHead) {
          this.saveDepartmentData(email, true, response.departmentInfo)
        }

        return isDeptHead
      }
      catch (error) {
        console.warn('Department head API check failed:', error.message || error)

        // Final fallback to cached data
        const cachedData = this.getCachedDepartmentData(email)
        if (cachedData?.isDepartmentHead && this.user) {
          this.user.isDepartmentHead = true
          this.user.departmentInfo = cachedData.departmentInfo
          this.user.isTeacher = true
          return true
        }

        return this.user?.isDepartmentHead || false
      }
    },

    async refreshUser() {
      this.isReady = false
      try {
        const userSession = useUserSession()

        if (userSession.loggedIn.value && userSession.user.value) {
          await this.setUser(userSession.user.value)
          return true
        }

        this.clearUser()
        return false
      }
      catch (error) {
        console.error('User refresh error:', error)
        this.clearUser()
        return false
      }
      finally {
        this.isReady = true
      }
    },
    getCachedDepartmentData(email: string) {
      const data = departmentHeadStorage.value
      return (data?.email === email) ? data : null
    },

    saveDepartmentData(email: string, isDepartmentHead: boolean, departmentInfo: DepartmentHeadInfo | null) {
      departmentHeadStorage.value = {
        email,
        isDepartmentHead,
        departmentInfo,
        timestamp: Date.now()
      }
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
        console.error('Commission validation error:', error)
        this.isReady = true
        return false
      }
    },

    // Access control methods
    hasTeacherAccess() {
      return this.user?.isTeacher === true
    },

    hasDepartmentHeadAccess() {
      const isDeptHead = this.user?.isDepartmentHead === true

      if (isDeptHead) return true

      // Check cached data as fallback
      if (this.user?.email) {
        const cachedData = this.getCachedDepartmentData(this.user.email)
        if (cachedData?.isDepartmentHead && this.user) {
          this.user.isDepartmentHead = true
          this.user.departmentInfo = cachedData.departmentInfo
          this.user.isTeacher = true
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
      this.user = null
      this.temporaryCommissionInfo = null
      departmentHeadStorage.value = null

      try {
        const { clear } = useUserSession()
        clear()
      }
      catch (e) {
        console.warn('Session clear error:', e)
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

// Centralized role mapping
function mapEmailToRole(email: string): string {
  const normalized = email.toLowerCase()

  if (normalized.includes('admin@')) return 'admin'
  if (normalized.includes('super@')) return 'admin'
  if (normalized.includes('head@')) return 'department-head'
  if (normalized.includes('teacher@')) return 'teacher'
  if (normalized.includes('student@')) return 'student'

  if (normalized.endsWith('@eif.viko.lt') && !normalized.includes('penworld')) return 'teacher'
  if (normalized.endsWith('@viko.lt')) return 'teacher'
  if (normalized.endsWith('@baigiamieji.onmicrosoft.com')) return 'reviewer'

  if (
    normalized === 'student@baigiamieji.onmicrosoft.com'
    || normalized.endsWith('@stud.viko.lt')
    || normalized.includes('penworld@eif.viko.lt')
  ) return 'student'

  return 'reviewer'
}
