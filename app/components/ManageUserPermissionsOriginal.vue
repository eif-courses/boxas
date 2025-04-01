<script setup>
import { ref, onMounted } from 'vue'

const displayName = ref('')
const email = ref('')
const password = ref('')
const successMessage = ref('')
const errorMessage = ref('')
const users = ref([]) // Array to hold the list of users

const createUser = async () => {
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const response = await $fetch('/api/admin/create-user', {
      method: 'POST',
      body: { displayName: displayName.value, email: email.value, password: password.value }
    })

    successMessage.value = `User created successfully: ${response.message}`
    displayName.value = ''
    email.value = ''
    password.value = ''

    await fetchUsers() // Fetch updated list of users after creation
  }
  catch (error) {
    errorMessage.value = error.statusMessage
  }
}

// Function to fetch the list of users
const fetchUsers = async () => {
  try {
    const response = await $fetch('/api/admin/list-users') // Endpoint to get the list of users
    users.value = response.users || [] // Update users list
  }
  catch (error) {
    console.error('Failed to fetch users:', error)
    errorMessage.value = error.statusMessage || 'Failed to fetch users'
  }
}

// Fetch users when component is mounted
onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="p-4">
    <h1 class="text-xl font-bold mb-4">
      Create Entra ID User
    </h1>

    <div class="mb-2">
      <label class="block">Display Name:</label>
      <input
        v-model="displayName"
        class="border p-2 w-full"
      >
    </div>

    <div class="mb-2">
      <label class="block">Email:</label>
      <input
        v-model="email"
        class="border p-2 w-full"
      >
    </div>

    <div class="mb-2">
      <label class="block">Password:</label>
      <input
        v-model="password"
        type="password"
        class="border p-2 w-full"
      >
    </div>

    <button
      class="bg-blue-500 text-white px-4 py-2"
      @click="createUser"
    >
      Create User
    </button>

    <p
      v-if="successMessage"
      class="text-green-600 mt-2"
    >
      {{ successMessage }}
    </p>
    <p
      v-if="errorMessage"
      class="text-red-600 mt-2"
    >
      {{ errorMessage }}
    </p>

    <h2 class="text-lg font-bold mt-6 mb-4">
      User List
    </h2>
    <ul>
      <li
        v-for="user in users"
        :key="user.id"
        class="border-b py-2"
      >
        {{ user.displayName }} ({{ user.userPrincipalName }})
      </li>
      <li
        v-if="users.length === 0"
        class="py-2"
      >
        No users found.
      </li>
    </ul>
  </div>
</template>
