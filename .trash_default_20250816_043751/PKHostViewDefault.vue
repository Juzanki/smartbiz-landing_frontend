<template>
  <div class="relative w-full h-screen bg-black flex justify-between items-center px-2 py-4 space-x-2">
    <!-- 🎥 Main Host Video -->
    <div class="w-1/2 h-full relative rounded-xl overflow-hidden border border-white/10 shadow-lg">
      <video ref="mainHostRef" class="w-full h-full object-cover" autoplay playsinline muted></video>
      <div class="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-3 py-1 rounded">
        👑 {{ mainHost.name }} — {{ mainHost.viewers }} 👀
      </div>
    </div>

    <!-- 🎥 Co-Host Video -->
    <div class="w-1/2 h-full relative rounded-xl overflow-hidden border border-white/10 shadow-lg">
      <video ref="coHostRef" class="w-full h-full object-cover" autoplay playsinline muted></video>
      <div class="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-3 py-1 rounded">
        🎤 {{ coHost.name }} — {{ coHost.viewers }} 👀
      </div>
    </div>

    <!-- ⏱️ Countdown or Battle Stats Overlay (Optional) -->
    <div class="absolute top-4 left-1/2 -translate-x-1/2 bg-pink-600 text-white px-6 py-2 rounded-full font-bold shadow-lg">
      🔥 PK Battle: {{ countdown }}s left!
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// Placeholder references for <video> elements
const mainHostRef = ref(null)
const coHostRef = ref(null)

// Simulated host data (can be dynamic from props or API)
const mainHost = ref({
  name: 'Host A',
  viewers: '1.2K',
})

const coHost = ref({
  name: 'Host B',
  viewers: '980',
})

// Simulated PK countdown
const countdown = ref(120)
let timer = null

onMounted(() => {
  timer = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    } else {
      clearInterval(timer)
    }
  }, 1000)
})
</script>

<style scoped>
/* You can improve or replace this with UnoCSS classes */
</style>

