<template>
  <span
    :class="[
      'inline-block text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide',
      badgeClass
    ]"
  >
    {{ name }}
  </span>
</template>

<script setup>
const props = defineProps({
  name: {
    type: String,
    required: true
  }
})

const badgeClass = {
  BasicBot: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white',
  ProBot: 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-white',
  EliteBot: 'bg-purple-100 text-purple-800 dark:bg-purple-700 dark:text-white',
  CustomBot: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-white'
}[props.name] || 'bg-indigo-100 text-indigo-800 dark:bg-indigo-700 dark:text-white'
</script>

