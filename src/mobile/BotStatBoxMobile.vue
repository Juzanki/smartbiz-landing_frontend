<template>
  <div :class="['p-4 rounded-lg text-center', bgClass]">
    <div :class="['text-base font-semibold', textColorClass]">{{ label }}</div>
    <div :class="['text-2xl font-bold', valueColorClass]">{{ value }}</div>
  </div>
</template>

<script setup>
const props = defineProps({
  label: String,
  value: [String, Number],
  color: {
    type: String,
    default: 'indigo' // can be: green, red, yellow, indigo etc.
  }
})

const bgClass = `bg-${props.color}-100 dark:bg-${props.color}-800`
const textColorClass = `text-${props.color}-800 dark:text-white`
const valueColorClass = `text-${props.color}-900 dark:text-white`
</script>

