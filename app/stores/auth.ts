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
      // Add other info returned by your /api/commission/check endpoint if needed
    }
  }),
  actions: {
    // Initialize from session
    initFromSession() {
      const { user } = useUserSession()
      if (user.value) {
        this.setUser(user.value)
      }
    },

    async setUser(userData) {
      this.temporaryCommissionInfo = null

      let role = 'teacher' // Default role

      // Use mail or email property (whichever is available)
      const email = userData.mail || userData.email || ''

      // Determine base role from email domain
      if (email.includes('@stud.viko.lt') || email.includes('penworld@eif.viko.lt')) {
        role = 'student'
      }
      else if ((email.includes('@eif.viko.lt') || email.includes('@viko.lt')) && !email.includes('penworld@eif.viko.lt')) {
        role = 'teacher'
      }
      else if ((email.includes('baigiamieji.onmicrosoft.com') && !email.includes('admin@baigiamieji.onmicrosoft.com'))) {
        role = 'reviewer'
      }
      else if (email.includes('admin@baigiamieji.onmicrosoft.com')) {
        role = 'admin'
      }

      // Check if user is a department head by querying the API
      let isDepartmentHead = false

      try {
        // Call the department head check API
        const response = await $fetch('/api/users/is-department-head', {
          method: 'GET'
        })

        // Update the department head status from the response
        isDepartmentHead = response.isDepartmentHead === true
      }
      catch (error) {
        console.error('Error checking department head status:', error)
        // Default to false if there's an error
        isDepartmentHead = false
      }

      // Create the user object with all needed properties
      this.user = {
        displayName: userData.displayName,
        email: email,
        mail: email, // Ensure mail property is always set
        role: role,
        jobTitle: userData.jobTitle || null,
        isTeacher: role === 'teacher' || userData.jobTitle === 'Dėstytojas' || isDepartmentHead,
        isDepartmentHead: isDepartmentHead,
        isCommission: role === 'commission',
        isStudent: role === 'student',
        isReviewer: role === 'reviewer',
        isAdmin: role === 'admin'
      }
    },
    // --- ADDED: Action to attempt setting temporary access via token ---
    async setTemporaryCommissionAccess(code: string): Promise<boolean> {
      // Clear existing user/temp access first
      this.user = null
      this.temporaryCommissionInfo = null

      if (!code) {
        console.warn('Attempted to set temporary access with empty token.')
        return false
      }

      console.log('Attempting to validate commission token...')
      try {
        // Call your token validation endpoint
        const response = await $fetch('/api/users/is-commission-member', { // Use your GET endpoint
          method: 'GET',
          query: { code } // Pass token as query parameter
        })

        if (response && response.isValid && response.memberInfo) {
          console.log('Token is valid. Setting temporary commission access.', response.memberInfo)
          // Store the relevant info returned by the API
          this.temporaryCommissionInfo = {
            department: response.memberInfo.department
            // Store other relevant info if needed
          }
          return true // Indicate success
        }
        else {
          console.log('Token is invalid or inactive.')
          this.temporaryCommissionInfo = null // Ensure it's cleared
          return false // Indicate failure
        }
      }
      catch (error) {
        console.error('Error validating commission token:', error)
        this.temporaryCommissionInfo = null // Clear on error
        return false // Indicate failure
      }
    },

    hasTeacherAccess() {
      return this.user?.isTeacher === true
    },
    hasDepartmentHeadAccess() {
      return this.user?.isDepartmentHead === true
    },
    hasCommissionAccess() {
      // User has access if they are logged in as commission OR have temporary access set
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

    // Clear user data on logout
    clearUser() {
      this.user = null
      this.temporaryCommissionInfo = null // <<< Also clear temporary access
      const { clear } = useUserSession()
      try { clear() }
      catch (e) { console.warn('Error clearing session', e) }
    }
  },
  getters: {
    // Get current user
    // getUser: state => state.user,
    //
    // // Check if user is authenticated
    // isAuthenticated: state => !!state.user,
    //
    // // Get user's primary role
    // userRole: state => state.user?.role || 'guest'
    getUser: state => state.user,
    isAuthenticated: state => !!state.user, // Based on logged-in user only
    // --- ADDED: Getter to check if *any* commission access exists ---
    isCommissionMemberOrHasTokenAccess: state => !!state.user?.isCommission || !!state.temporaryCommissionInfo,
    // --- ADDED: Getter for temporary info ---
    getTemporaryCommissionInfo: state => state.temporaryCommissionInfo,
    userRole: (state) => { // Role prioritizes logged-in user
      if (state.user) return state.user.role || 'guest'
      if (state.temporaryCommissionInfo) return 'commission' // Assign a role for token access
      return 'guest'
    }

  }
})
