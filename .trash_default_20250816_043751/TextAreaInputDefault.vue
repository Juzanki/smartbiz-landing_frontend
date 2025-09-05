<template>
  <div>
    <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{{ label }}</label>
    <textarea
      :placeholder="placeholder"
      :rows="rows"
      v-model="modelValue"
      class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      required
    ></textarea>
  </div>
</template>

<script setup>
defineProps({
  label: String,
  placeholder: String,
  rows: {
    type: Number,
    default: 4
  },
  modelValue: String
})
defineEmits(['update:modelValue'])
</script>

