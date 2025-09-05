<template>
  <button @click="emit('open')" class="icon-btn">
    🎯 Goal
  </button>
</template>

<script setup>
const emit = defineEmits(['open'])
</script>

<style scoped>
.icon-btn {
  @apply bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-1 text-sm rounded-full shadow;
}
</style>

