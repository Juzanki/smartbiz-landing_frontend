<template>
  <div v-if="visible" class="fixed inset-0 z-[9997] pointer-events-none overflow-hidden">
    <div
      v-for="(particle, index) in particles"
      :key="index"
      :class="[
        'absolute w-2 h-2 rounded-full opacity-80 blur-sm',
        particle.class
      ]"
      :style="particle.style"
    />
  </div>
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const visible = ref(true)
const particles = ref([])
let timeoutRef = null

// 🎨 Styles (gradients & classes)
const particleStyles = [
  'bg-gradient-to-br from-pink-400 via-white to-blue-500',
  'bg-gradient-to-br from-yellow-300 via-pink-300 to-fuchsia-500',
  'bg-gradient-to-br from-cyan-300 via-white to-indigo-400',
  'bg-gradient-to-br from-purple-400 to-pink-400',
  'bg-white/80',
  'bg-orange-300',
]

// 🌀 Animations
const animationClasses = [
  'animate-particle-fall',
  'animate-particle-drift',
  'animate-particle-twirl',
]

// 🧪 Generate Particles
function createParticles(count = 40) {
  const result = []

  for (let i = 0; i < count; i++) {
    const size = Math.random() * 6 + 4
    const left = Math.random() * 100
    const delay = Math.random() * 0.5
    const duration = 2 + Math.random() * 2
    const style = {
      left: `${left}%`,
      top: '-10px',
      width: `${size}px`,
      height: `${size}px`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`
    }

    const particle = {
      style,
      class: `${animationClasses[Math.floor(Math.random() * animationClasses.length)]} ${particleStyles[Math.floor(Math.random() * particleStyles.length)]}`
    }

    result.push(particle)
  }

  particles.value = result
}

onMounted(() => {
  createParticles()

  timeoutRef = setTimeout(() => {
    visible.value = false
  }, 4000)
})

onBeforeUnmount(() => {
  if (timeoutRef) clearTimeout(timeoutRef)
})
</script>
<style scoped>
/* 🌟 Particle Fall - Straight Down */
@keyframes particle-fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(120vh) rotate(720deg);
    opacity: 0;
  }
}
.animate-particle-fall {
  animation-name: particle-fall;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
}

/* 🌬️ Particle Drift - Sway Left & Right */
@keyframes particle-drift {
  0% {
    transform: translateX(0) translateY(0) rotate(0deg);
    opacity: 1;
  }
  50% {
    transform: translateX(-30px) translateY(60vh) rotate(180deg);
    opacity: 0.8;
  }
  100% {
    transform: translateX(30px) translateY(120vh) rotate(360deg);
    opacity: 0;
  }
}
.animate-particle-drift {
  animation-name: particle-drift;
  animation-timing-function: ease-in-out;
  animation-fill-mode: forwards;
}

/* 🔄 Particle Twirl - Spiral-like Drop */
@keyframes particle-twirl {
  0% {
    transform: scale(0.8) rotate(0deg) translateY(0);
    opacity: 1;
  }
  100% {
    transform: scale(1.2) rotate(1080deg) translateY(120vh);
    opacity: 0;
  }
}
.animate-particle-twirl {
  animation-name: particle-twirl;
  animation-timing-function: ease-in-out;
  animation-fill-mode: forwards;
}

/* 🌫️ Base Particle Styling (can be extended with Tailwind) */
.particle {
  position: absolute;
  border-radius: 9999px;
  will-change: transform, opacity;
  pointer-events: none;
  filter: blur(1px);
}
</style>

