<template>
  <div class="text-center space-y-6">
    <!-- Logo or system name could go here -->
    <h1 class="text-2xl font-bold">
      Thesis Management System
    </h1>

    <p class="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
      Welcome to the university thesis management portal. Please sign in with your university credentials to access the system.
    </p>

    <!-- Attractive sign-in button -->
    <UButton
      to="/api/auth/microsoft"
      icon="i-simple-icons-microsoft"
      label="Sign in with Microsoft"
      size="xl"
      color="primary"
      class="mx-auto mt-4 px-6 transform hover:scale-105 transition-all shadow-md"
      external
    />

    <!-- Short description of system features -->
    <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto text-left">
      <div class="flex flex-col items-center p-4">
        <div class="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3 mb-3">
          <span class="i-heroicons-document-text text-blue-600 dark:text-blue-400 w-6 h-6" />
        </div>
        <h3 class="font-medium mb-1">
          Manage Theses
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 text-center">
          Upload, organize and track thesis documents throughout the review process
        </p>
      </div>

      <div class="flex flex-col items-center p-4">
        <div class="rounded-full bg-purple-100 dark:bg-purple-900/30 p-3 mb-3">
          <span class="i-heroicons-user-group text-purple-600 dark:text-purple-400 w-6 h-6" />
        </div>
        <h3 class="font-medium mb-1">
          Collaborate
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 text-center">
          Connect students with supervisors and reviewers in one platform
        </p>
      </div>

      <div class="flex flex-col items-center p-4">
        <div class="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3 mb-3">
          <span class="i-heroicons-chart-bar text-amber-600 dark:text-amber-400 w-6 h-6" />
        </div>
        <h3 class="font-medium mb-1">
          Track Progress
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 text-center">
          Monitor review status and receive notifications on important updates
        </p>
      </div>
    </div>

    <!-- Footer note -->
    <p class="text-xs text-gray-400 dark:text-gray-500 mt-8">
      For support, please contact <a
        href="mailto:support@university.edu"
        class="text-primary-500 hover:underline"
      >support@university.edu</a>
    </p>
  </div>
</template>

<script setup lang="ts">
// No complex logic needed for this page, just the login button
</script>
