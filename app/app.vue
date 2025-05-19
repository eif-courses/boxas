<script setup lang="ts">
const { loggedIn, user, clear } = useUserSession()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const colorMode = useColorMode()
const { t, locale } = useI18n()

const redirectBasedOnRole = async () => {
  // Debug logs to help troubleshoot
  console.log('Current role checks:', {
    admin: authStore.hasAdminAccess(),
    departmentHead: authStore.hasDepartmentHeadAccess(),
    teacher: authStore.hasTeacherAccess(),
    reviewer: authStore.hasReviewerAccess(),
    student: authStore.hasStudentAccess()
  })

  // Redirect based on role hierarchy
  // if (authStore.hasAdminAccess()) {
  //   console.log('Redirecting to admin dashboard')
  //   return navigateTo(`/${locale.value}/dashboard/admin`)
  // }
  // else if (authStore.hasDepartmentHeadAccess()) {
  //   console.log('Redirecting to department dashboard')
  //   return navigateTo(`/${locale.value}/dashboard/department`)
  // }
  // else if (authStore.hasTeacherAccess()) {
  //   console.log('Redirecting to supervisor dashboard')
  //   return navigateTo(`/${locale.value}/dashboard/supervisor`)
  // }
  // else if (authStore.hasReviewerAccess()) {
  //   console.log('Redirecting to reviewer dashboard')
  //   return navigateTo(`/${locale.value}/dashboard/reviewer`)
  // }
  // else if (authStore.hasStudentAccess()) {
  //   console.log('Redirecting to student dashboard')
  //   return navigateTo(`/${locale.value}/dashboard/student`)
  // }
  // // Default fallback if no specific role is detected
  // else {
  //   console.log('No specific role found, redirecting to general dashboard')
  //   return navigateTo(`/${locale.value}/dashboard`)
  // }
}

onMounted(async () => {
  console.log('Mounted, loggedIn:', loggedIn.value, 'user:', !!user.value)

  if (loggedIn.value && user.value) {
    try {
      await authStore.setUser(user.value)
      console.log('User set in authStore, checking for redirect')

      // Updated condition to also check for project-assignments path
      if (!route.path.includes('/dashboard') && !route.path.includes('/project-assignments')) {
        console.log('Not on dashboard or project assignments, redirecting based on role')
        await redirectBasedOnRole()
      }
    }
    catch (error) {
      console.error('Error in onMounted redirect:', error)
    }
  }
})

watch(loggedIn, async (newValue, oldValue) => {
  console.log('loggedIn changed:', oldValue, '->', newValue)

  if (!newValue) {
    console.log('User logged out, navigating to home')
    navigateTo('/')
  }
  else if (user.value) {
    try {
      console.log('User logged in, setting user in authStore')
      await authStore.setUser(user.value)

      // Don't redirect if already on project-assignments path
      if (!route.path.includes('/project-assignments')) {
        console.log('Redirecting after login')
        await redirectBasedOnRole()
      }
    }
    catch (error) {
      console.error('Error in loggedIn watcher:', error)
    }
  }
})

// Watch for user changes
watch(user, (newValue) => {
  if (newValue) {
    authStore.setUser(newValue)
  }
})

const getRoleDisplay = (user) => {
  if (!user) return ''

  const roles = []

  if (user.isTeacher) {
    roles.push('Teacher')
  }

  if (user.isDepartmentHead) {
    roles.push('Department Head')
  }

  if (user.role === 'admin') {
    roles.push('Admin')
  }

  return roles.join(' & ')
}

function toggleColorMode() {
  colorMode.preference = colorMode.preference === 'dark' ? 'light' : 'dark'
}

useHead({
  htmlAttrs: { lang: 'en' },
  link: [{ rel: 'icon', href: '/icon.png' }]
})

useSeoMeta({
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  title: 'Atidone',
  description:
      'A Nuxt demo hosted with edge-side rendering, authentication and queyring a Cloudflare D1 database',
  ogImage: '/social-image.png',
  twitterImage: '/social-image.png',
  twitterCard: 'summary_large_image'
})

const isActiveRoute = (path) => {
  return route.path.includes(path)
}

const logout = async () => {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  }
  catch (error) {
    console.error('Logout error:', error)
  }

  authStore.clearUser()
  await clear()
  await router.push('/')
}
</script>

<template>
  <UContainer class="min-h-screen flex flex-col my-4">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <!-- Left: Logo and App Name -->
      <div class="flex items-center">
        <NuxtLink
          to="/"
          class="flex items-center gap-3"
        >
          <img
            src="/VIKO_LOGO_ELEKTR_H_LT.png"
            alt="VIKO Elektronikos ir informatikos fakultetas"
            class="h-12 w-auto"
          >
          <div class="h-8 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block" />
          <span class="text-xl font-medium ml-3 hidden sm:block">{{ $t('app_name') }}</span>
        </NuxtLink>
      </div>

      <!-- Right: Theme Toggle -->
      <div>
        <UButton
          square
          variant="ghost"
          color="black"
          :icon="$colorMode.preference === 'dark' ? 'i-heroicons-moon' : 'i-heroicons-sun'"
          class="ml-2"
          @click="toggleColorMode"
        />
      </div>
    </div>

    <!-- Main Card -->
    <UCard>
      <template #header>
        <ClientOnly>
          <div
            v-if="authStore.isReady && loggedIn"
            class="flex flex-wrap sm:mx-0 gap-2"
          >
            <!-- Student -->
            <UButton
              v-if="authStore.hasStudentAccess()"
              :to="`/${locale}/dashboard/student`"
              icon="i-heroicons-user-group"
              :label="$t('nav_student')"
              :color="isActiveRoute('/student') ? 'primary' : 'gray'"
              variant="solid"
            />

            <!-- Teacher -->
            <UButton
              v-if="authStore.hasTeacherAccess()"
              :to="`/${locale}/dashboard/supervisor`"
              icon="i-heroicons-user-circle"
              :label="$t('nav_supervisor')"
              :color="isActiveRoute('/supervisor') ? 'primary' : 'gray'"
              variant="solid"
            />

            <!-- Reviewer -->
            <UButton
              v-if="authStore.hasReviewerAccess() || authStore.hasDepartmentHeadAccess()"
              :to="`/${locale}/dashboard/reviewer`"
              icon="i-heroicons-pencil"
              :label="$t('nav_reviewer')"
              :color="isActiveRoute('/reviewer') ? 'primary' : 'gray'"
              variant="solid"
            />

            <!-- Department Head -->
            <UButton
              v-if="authStore.hasDepartmentHeadAccess()"
              :to="`/${locale}/dashboard/department`"
              icon="i-heroicons-user-group"
              :label="$t('nav_department')"
              :color="isActiveRoute('/department') ? 'primary' : 'gray'"
              variant="solid"
            />

            <!-- Admin -->
            <UButton
              v-if="authStore.hasAdminAccess() || authStore.hasDepartmentHeadAccess()"
              :to="`/${locale}/dashboard/admin`"
              icon="i-heroicons-cog"
              :label="$t('nav_admin')"
              :color="isActiveRoute('/admin') ? 'primary' : 'gray'"
              variant="solid"
            />

            <!-- Language Switcher -->
            <LanguageSwitcher />

            <!-- User Info + Logout -->
            <div
              v-if="user"
              class="flex items-center gap-2 ml-2"
            >
              <div class="flex items-center gap-2">
                <div class="text-sm hidden sm:block">
                  {{ user.mail || user.email || user.displayName }}
                  <div
                    v-if="authStore.user"
                    class="text-xs text-gray-500"
                  >
                    {{ getRoleDisplay(authStore.user) }}
                  </div>
                </div>
              </div>
              <UButton
                color="gray"
                variant="solid"
                :label="$t('logout')"
                icon="i-heroicons-arrow-left-on-rectangle"
                @click="logout"
              />
            </div>
          </div>
        </ClientOnly>
      </template>

      <!-- Page content -->
      <NuxtLoadingIndicator />
      <NuxtPage />
    </UCard>

    <footer class="text-center mt-2" />
  </UContainer>

  <UNotifications />
</template>

<style lang="postcss">
body {
  @apply font-sans text-gray-950 bg-gray-50 dark:bg-gray-950 dark:text-gray-50;
}
</style>
