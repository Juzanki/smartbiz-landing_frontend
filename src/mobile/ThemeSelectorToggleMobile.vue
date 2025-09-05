<template>
  <button @click="emit('open')" class="icon-btn">
    🎨 Theme
  </button>
</template>

<script setup>
const emit = defineEmits(['open'])
</script>

<style scoped>
.icon-btn {
  @apply bg-purple-700 hover:bg-purple-600 text-white px-3 py-1 text-sm rounded-full shadow;
}
</style>

