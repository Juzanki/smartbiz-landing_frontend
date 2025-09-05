<template>
  <div class="absolute top-4 right-4 bg-white/80 text-black p-3 rounded shadow w-80 z-20">
    <h4 class="font-bold mb-2">🤖 AI Summary</h4>
    <p>{{ summary }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const summary = ref('Loading summary...')

onMounted(() => {
  // TODO: Fetch summary from AI endpoint or socket update
  summary.value = '🔥 Trending: EcoCup is gaining popularity!'
})
</script>

