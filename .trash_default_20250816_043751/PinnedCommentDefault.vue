<template>
  <div v-if="message" class="absolute top-20 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black px-4 py-2 rounded shadow-lg z-30 text-sm font-bold">
    📌 {{ message }}
  </div>
</template>

<script setup>
defineProps({
  message: String
})
</script>

