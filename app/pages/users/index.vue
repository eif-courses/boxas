<!-- pages/users/index.vue -->
<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">
      User Management
    </h1>

    <!-- Create User Form -->
    <div class="bg-white p-4 rounded shadow mb-6">
      <h2 class="text-xl font-semibold mb-3">
        Create New User
      </h2>
      <form @submit.prevent="createUser">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block mb-1">Display Name</label>
            <input
              v-model="newUser.displayName"
              required
              class="border p-2 w-full rounded"
            >
          </div>
          <div>
            <label class="block mb-1">Email (UPN)</label>
            <input
              v-model="newUser.userPrincipalName"
              required
              type="email"
              class="border p-2 w-full rounded"
            >
          </div>
          <div>
            <label class="block mb-1">Initial Password</label>
            <input
              v-model="newUser.password"
              required
              type="password"
              minlength="8"
              class="border p-2 w-full rounded"
            >
          </div>
        </div>
        <button
          type="submit"
          class="bg-blue-500 text-white px-4 py-2 rounded mt-4"
        >
          Create User
        </button>
      </form>
    </div>

    <!-- Users List -->
    <div class="bg-white p-4 rounded shadow">
      <h2 class="text-xl font-semibold mb-3">
        Existing Users
      </h2>

      <div
        v-if="loading"
        class="text-center py-4"
      >
        Loading users...
      </div>

      <table
        v-else
        class="w-full"
      >
        <thead>
          <tr class="bg-gray-100">
            <th class="text-left p-2">
              Name
            </th>
            <th class="text-left p-2">
              Email
            </th>
            <th class="text-right p-2">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in users"
            :key="user.id"
            class="border-b"
          >
            <td class="p-2">
              {{ user.displayName }}
            </td>
            <td class="p-2">
              {{ user.userPrincipalName }}
            </td>
            <td class="p-2 text-right">
              <button
                class="text-red-500 hover:text-red-700"
                @click="confirmDelete(user)"
              >
                Delete
              </button>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td
              colspan="3"
              class="text-center py-4"
            >
              No users found
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white p-6 rounded max-w-md w-full">
        <h3 class="text-lg font-semibold mb-3">
          Confirm Deletion
        </h3>
        <p>Are you sure you want to delete user <b>{{ userToDelete?.displayName }}</b>?</p>
        <p class="text-red-500 mt-2 text-sm">
          This action cannot be undone.
        </p>
        <div class="flex justify-end gap-3 mt-4">
          <button
            class="px-4 py-2 border rounded"
            @click="showDeleteModal = false"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 bg-red-500 text-white rounded"
            @click="deleteUser"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const users = ref([])
const loading = ref(true)
const newUser = ref({
  displayName: '',
  userPrincipalName: '',
  password: ''
})
const showDeleteModal = ref(false)
const userToDelete = ref(null)

// Fetch users on page load
onMounted(async () => {
  await fetchUsers()
})

async function fetchUsers() {
  loading.value = true
  try {
    users.value = await $fetch('/api/users')
  }
  catch (error) {
    console.error('Error fetching users:', error)
  }
  finally {
    loading.value = false
  }
}

async function createUser() {
  try {
    await $fetch('/api/users', {
      method: 'POST',
      body: newUser.value
    })

    // Reset form and refresh list
    newUser.value = {
      displayName: '',
      userPrincipalName: '',
      password: ''
    }

    await fetchUsers()
  }
  catch (error) {
    console.error('Error creating user:', error)
    alert('Failed to create user: ' + (error.statusMessage || error.message))
  }
}

function confirmDelete(user) {
  userToDelete.value = user
  showDeleteModal.value = true
}

async function deleteUser() {
  try {
    await $fetch(`/api/users/${userToDelete.value.id}`, {
      method: 'DELETE'
    })

    showDeleteModal.value = false
    userToDelete.value = null

    await fetchUsers()
  }
  catch (error) {
    console.error('Error deleting user:', error)
    alert('Failed to delete user: ' + (error.statusMessage || error.message))
  }
}
</script>
