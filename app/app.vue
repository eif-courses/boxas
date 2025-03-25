<script setup lang="ts">
const { loggedIn, user, clear } = useUserSession()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const colorMode = useColorMode()
const { t, locale } = useI18n()

onMounted(() => {
  if (loggedIn.value && user.value) {
    authStore.setUser(user.value)
  }
})

watch(loggedIn, (newValue) => {
  if (!newValue) {
    navigateTo('/')
  }
  else if (user.value) {
    authStore.setUser(user.value)
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
  await router.push('/login')
}
</script>

<template>
  <UContainer class="min-h-screen flex flex-col my-4">
    <div class="mb-2 text-right">
      <UButton
        square
        variant="ghost"
        color="black"
        :icon="$colorMode.preference === 'dark' ? 'i-heroicons-moon' : 'i-heroicons-sun'"
        @click="toggleColorMode"
      />
    </div>

    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">
          <NuxtLink to="/">
            {{ $t('app_name') }}
          </NuxtLink>
        </h3>
        <UButton
          v-if="!loggedIn"
          to="/api/auth/microsoft"
          icon="i-simple-icons-microsoft"
          label="Login with Microsoft"
          color="primary"
          external
        />
        <div
          v-else
          class="flex flex-wrap sm:mx-0 gap-1"
        >
          <UButton
            v-if="authStore.hasStudentAccess()"
            :to="`/${locale}/dashboard/student`"
            icon="i-heroicons-user-group"
            :label="$t('nav_student')"
            :color="isActiveRoute('/student') ? 'primary' : 'gray'"
            variant="solid"
          />

          <UButton
            v-if="authStore.hasTeacherAccess()"
            :to="`/${locale}/dashboard/supervisor`"
            icon="i-heroicons-user-circle"
            :label="$t('nav_supervisor')"
            :color="isActiveRoute('/supervisor') ? 'primary' : 'gray'"
            variant="solid"
          />

          <UButton
            v-if="authStore.hasReviewerAccess()"
            :to="`/${locale}/dashboard/reviewer`"
            icon="i-heroicons-pencil"
            :label="$t('nav_reviewer')"
            :color="isActiveRoute('/reviewer') ? 'primary' : 'gray'"
            variant="solid"
          />

          <UButton
            v-if="authStore.hasDepartmentHeadAccess()"
            :to="`/${locale}/dashboard/department`"
            icon="i-heroicons-user-group"
            :label="$t('nav_department')"
            :color="isActiveRoute('/department') ? 'primary' : 'gray'"
            variant="solid"
          />

          <UButton
            v-if="authStore.hasDepartmentHeadAccess() || authStore.hasCommisionAccess()"
            :to="`/${locale}/dashboard/commission`"
            icon="i-heroicons-check-circle"
            :label="$t('nav_commission')"
            :color="isActiveRoute('/commission') ? 'primary' : 'gray'"
            variant="solid"
          />

          <UButton
            v-if="authStore.hasAdminAccess()"
            :to="`/${locale}/dashboard/admin`"
            icon="i-heroicons-cog"
            :label="$t('nav_admin')"
            :color="isActiveRoute('/admin') ? 'primary' : 'gray'"
            variant="solid"
          />

          <LanguageSwitcher />

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
      </template>
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
