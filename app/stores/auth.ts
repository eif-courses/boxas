import { defineStore } from 'pinia'

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
    },
    temporaryCommissionInfo: null as null | {
      department: string
    },
    isInitialized: false
  }),
  actions: {
    async initFromSession() {
      try {
        const userSession = useUserSession()

        // Wait for session to be ready if it's loading
        // if (userSession.status.value === 'loading') {
        //   await new Promise(resolve => {
        //     const unwatch = watch(userSession.status, (newStatus) => {
        //       if (newStatus !== 'loading') {
        //         unwatch()
        //         resolve()
        //       }
        //     })
        //   })
        // }

        if (userSession.loggedIn.value && userSession.user.value) {
          await this.setUser(userSession.user.value)
        }
      }
      finally {
        // Always mark as initialized even if there was an error
        this.isInitialized = true
      }
    },

    async setUser(userData) {
      this.isInitialized = false // Reset while initializing
      this.temporaryCommissionInfo = null

      const email = userData.mail || userData.email || userData.userPrincipalName || userData.preferred_username || ''
      console.log('Resolved email:', email)

      const role = mapEmailToRole(email)
      console.log('Resolved role:', role, 'for email:', email)

      // Check if user is department head via API
      let isDepartmentHead = false
      try {
        const response = await $fetch('/api/users/is-department-head')
        isDepartmentHead = response.isDepartmentHead === true
      }
      catch (error) {
        console.error('Error checking department head status:', error)
      }

      this.user = {
        displayName: userData.displayName,
        email,
        mail: email,
        role,
        jobTitle: userData.jobTitle || null,
        isTeacher: role === 'teacher' || userData.jobTitle === 'Dėstytojas' || isDepartmentHead,
        isDepartmentHead,
        isCommission: role === 'commission',
        isStudent: role === 'student',
        isReviewer: role === 'reviewer',
        isAdmin: role === 'admin'
      }

      // Mark initialization as complete
      this.isInitialized = true
    },

    async setTemporaryCommissionAccess(code: string): Promise<boolean> {
      this.user = null
      this.temporaryCommissionInfo = null

      if (!code) return false

      try {
        const response = await $fetch('/api/users/is-commission-member', {
          method: 'GET',
          query: { code }
        })

        if (response?.isValid && response.memberInfo) {
          this.temporaryCommissionInfo = {
            department: response.memberInfo.department
          }
          return true
        }

        return false
      }
      catch (error) {
        console.error('Error validating commission token:', error)
        return false
      }
    },

    hasTeacherAccess() {
      return this.user?.isTeacher === true
    },
    hasDepartmentHeadAccess() {
      return this.user?.isDepartmentHead === true
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
      const { clear } = useUserSession()
      try { clear() }
      catch (e) { console.warn('Error clearing session', e) }
    }
  },
  getters: {
    isReady: state => state.isInitialized && !!state.user,
    getUser: state => state.user,
    isAuthenticated: state => !!state.user,
    isCommissionMemberOrHasTokenAccess: state => !!state.user?.isCommission || !!state.temporaryCommissionInfo,
    getTemporaryCommissionInfo: state => state.temporaryCommissionInfo,
    userRole: (state) => {
      if (state.user) return state.user.role || 'guest'
      if (state.temporaryCommissionInfo) return 'commission'
      return 'guest'
    }
  }
})

// ✅ Centralized role mapping logic
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
