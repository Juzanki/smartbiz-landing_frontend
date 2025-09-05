<template>
  <div class="w-full">
    <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
      {{ label }}
    </label>
    <input
      :type="type"
      :placeholder="placeholder"
      v-model="modelValue"
      class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  label: String,
  placeholder: String,
  type: {
    type: String,
    default: 'text'
  },
  modelValue: String
})

const emit = defineEmits(['update:modelValue'])

watch(() => props.modelValue, (newVal) => {
  emit('update:modelValue', newVal)
})
</script>

