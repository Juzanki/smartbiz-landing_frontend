<template>
  <button @click="emit('open')" class="icon-btn">
    🏆 Leaderboard
  </button>
</template>

<script setup>
const emit = defineEmits(['open'])
</script>

<style scoped>
.icon-btn {
  @apply bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-1 text-sm rounded-full shadow;
}
</style>

