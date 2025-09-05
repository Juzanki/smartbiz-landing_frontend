<template>
  <button @click="togglePinnedComment" class="icon-btn">
    📌 Pin
  </button>
</template>

<script setup>
import { ref } from 'vue'

const isPinnedVisible = ref(false)

function togglePinnedComment() {
  isPinnedVisible.value = !isPinnedVisible.value
  // You can emit or call a global state to show/hide pinned comment section
  console.log('Pinned comment toggled:', isPinnedVisible.value)
}
</script>

<style scoped>
.icon-btn {
  @apply bg-purple-700 hover:bg-purple-600 text-white px-3 py-1 text-sm rounded-full shadow;
}
</style>

