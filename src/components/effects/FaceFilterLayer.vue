<template>
  <transition name="filter-fade" mode="out-in">
    <div
      v-if="filterVisible"
      class="absolute inset-0 z-10 pointer-events-none flex items-center justify-center overflow-hidden"
    >
      <!-- 🌟 Dynamic Filter Layer -->
      <img
        :src="currentFilter"
        alt="Face Filter"
        class="max-w-[60vw] max-h-[60vh] sm:max-w-[40vw] sm:max-h-[40vh] object-contain 
               animate-magical-float drop-shadow-[0_0_25px_rgba(255,255,255,0.9)]"
      />

      <!-- ✨ Extra Aura Effect -->
      <div
        class="absolute w-[80vw] h-[80vw] rounded-full bg-gradient-to-r from-purple-500/40 via-pink-500/30 to-blue-400/40 
               blur-3xl animate-energy-pulse"
      ></div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// Dynamic filter images (customize as needed)
const filters = [
  '/filters/crown.png',
  '/filters/magic-orb.png',
  '/filters/future-mask.png',
  '/filters/galaxy-ring.png'
]

const filterVisible = ref(true)
const currentFilter = ref(filters[0])

// Randomize filter every few seconds
onMounted(() => {
  let index = 0
  setInterval(() => {
    index = (index + 1) % filters.length
    currentFilter.value = filters[index]
  }, 5000) // change every 5s
})
</script>

<style scoped>
/* 🌌 Magical floating animation */
@keyframes magical-float {
  0% {
    transform: scale(0.9) translateY(5px) rotate(0deg);
    opacity: 0.85;
  }
  50% {
    transform: scale(1.05) translateY(-5px) rotate(2deg);
    opacity: 1;
  }
  100% {
    transform: scale(0.9) translateY(5px) rotate(0deg);
    opacity: 0.85;
  }
}
.animate-magical-float {
  animation: magical-float 4s ease-in-out infinite;
}

/* 💠 Energy aura pulse */
@keyframes energy-pulse {
  0% {
    transform: scale(0.8);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.4;
  }
}
.animate-energy-pulse {
  animation: energy-pulse 3.5s ease-in-out infinite;
}

/* ✨ Smooth fade for filter change */
.filter-fade-enter-active,
.filter-fade-leave-active {
  transition: opacity 0.6s ease;
}
.filter-fade-enter-from,
.filter-fade-leave-to {
  opacity: 0;
}
</style>
