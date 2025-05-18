<script setup>
import { useRoute, useFetch } from '#app'

definePageMeta({
  middleware: ['commision-access']
})

const route = useRoute()
const token = route.query.token

const { data, error } = await useFetch(`/api/admin/validate-temp-token?token=${token}`)

if (error.value) {
  console.error('Access Denied:', error.value)
}
</script>

<template>
  <div>
    <h1 v-if="data?.success">
      Welcome! Temporary Access Granted 🎉
    </h1>
    <p
      v-else
      class="text-red-500"
    >
      Access Denied ❌
    </p>
  </div>
</template>
