<template>
  <div class="absolute top-3 left-3 text-white bg-black/60 px-3 py-1 rounded shadow">
    👁️ Viewers: {{ count }}
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const count = ref(0)

onMounted(() => {
  setInterval(() => {
    count.value = Math.floor(Math.random() * 500 + 100) // simulate viewer count
  }, 5000)
})
</script>

