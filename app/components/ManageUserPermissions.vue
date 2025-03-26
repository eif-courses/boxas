<template>
  <UDropdown
    :items="actions"
    :popper="{ placement: 'bottom-end' }"
    :ui="{ container: 'min-w-[150px]' }"
  >
    <UButtonGroup
      class="w-[150px]"
      size="xs"
      orientation="horizontal"
    >
      <UButton
        label="Action"
        color="white"
        class="w-full text-left"
        @click.stop="handleMainAction"
      />
      <UButton
        icon="i-heroicons-chevron-down-20-solid"
        color="gray"
      />
    </UButtonGroup>
  </UDropdown>
</template>

<script setup lang="ts">
// Wrap your actions in an array to match the expected DropdownItem[][] type
const actions = [
  [
    {
      label: 'Edit',
      icon: 'i-heroicons-pencil-square',
      click: () => handleEdit()
    },
    {
      label: 'Duplicate',
      icon: 'i-heroicons-document-duplicate',
      click: () => handleDuplicate()
    },
    {
      label: 'Archive',
      icon: 'i-heroicons-archive-box',
      click: () => handleArchive()
    },
    {
      label: 'Delete',
      icon: 'i-heroicons-trash',
      click: () => handleDelete()
    }
  ]
]

function handleMainAction() {
  // Handle the main button action
  console.log('Main action clicked')
}

function handleEdit() {
  console.log('Edit action clicked')
}

function handleDuplicate() {
  console.log('Duplicate action clicked')
}

function handleArchive() {
  console.log('Archive action clicked')
}

function handleDelete() {
  console.log('Delete action clicked')
}
</script>
