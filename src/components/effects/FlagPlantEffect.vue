<template>
  <transition name="fade-slide">
    <div
      v-if="visible"
      class="fixed inset-0 z-[9999] pointer-events-none overflow-hidden select-none"
    >
      <!-- 🌌 Sky Beam Background (dynamic tech light) -->
      <div
        class="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/50 animate-bg-pulse"
      ></div>

      <!-- 🌠 Hero Entering from Space -->
      <img
        v-if="heroStage === 'falling'"
        :src="fallImage"
        class="absolute w-[50vw] max-w-[200px] h-auto left-1/2 -translate-x-1/2 top-[-150px] animate-hero-drop z-[2]"
        alt="Falling Hero"
      />

      <!-- 🗻 Hero Landed -->
      <div
        v-if="heroStage === 'landed'"
        class="absolute bottom-[15vh] left-1/2 -translate-x-1/2 flex flex-col items-center z-[3]"
      >
        <!-- 🚩 Dynamic Flags -->
        <div class="flex gap-3 mb-3 animate-flag-wave">
          <img v-for="flag in flags" :key="flag" :src="flag" class="w-12 h-12 rounded-full shadow-xl" />
        </div>

        <!-- 🦸 Hero Pose -->
        <img
          :src="poseImage"
          class="w-[40vw] max-w-[140px] h-auto drop-shadow-2xl animate-glow-burst"
          alt="Hero Pose"
        />

        <!-- ⚡ Tech Sparks -->
        <div class="absolute -top-6 w-24 h-24 bg-cyan-400/30 rounded-full blur-2xl animate-pulse"></div>
      </div>

      <!-- 🌄 Landing Glow -->
      <div
        class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60vw] h-[15vh] rounded-full bg-gradient-to-t from-yellow-400/40 to-transparent blur-2xl z-[1]"
      ></div>

      <!-- ✨ Particles -->
      <LiveGiftParticles :intensity="mobileMode ? 15 : 30" />
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import LiveGiftParticles from './LiveGiftParticles.vue'

const props = defineProps({
  fallImage: { type: String, default: '/effects/hero-fall.png' },
  poseImage: { type: String, default: '/effects/hero-pose.png' },
  flags: {
    type: Array,
    default: () => ['/flags/tanzania.png', '/flags/smartbiz.png']
  },
  duration: { type: Number, default: 6000 }
})

const visible = ref(true)
const heroStage = ref('falling')

// 📱 Detect mobile mode
const mobileMode = computed(() => window.innerWidth <= 768)

onMounted(() => {
  setTimeout(() => { heroStage.value = 'landed' }, 1800)
  setTimeout(() => { visible.value = false }, props.duration)
})
</script>

<style scoped>
/* 🎯 Responsive Animations */
@keyframes heroDrop {
  0% {
    top: -150px;
    transform: translateX(-50%) scale(0.8) rotate(0deg);
    opacity: 0.7;
    filter: blur(2px);
  }
  70% {
    top: 60%;
    transform: translateX(-50%) scale(1.2) rotate(15deg);
    opacity: 1;
  }
  100% {
    top: 75%;
    transform: translateX(-50%) scale(1) rotate(0deg);
    filter: blur(0);
  }
}
.animate-hero-drop {
  animation: heroDrop 1.8s cubic-bezier(0.19, 1, 0.22, 1) forwards;
}

@keyframes flagWave {
  0%, 100% { transform: rotate(-3deg) }
  50% { transform: rotate(3deg) }
}
.animate-flag-wave {
  animation: flagWave 1.8s ease-in-out infinite;
}

@keyframes glowBurst {
  0% {
    opacity: 0.4;
    filter: brightness(0.8) drop-shadow(0 0 8px gold);
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    filter: brightness(1.5) drop-shadow(0 0 30px gold);
    transform: scale(1.05);
  }
  100% {
    filter: drop-shadow(0 0 15px gold);
    transform: scale(1);
  }
}
.animate-glow-burst {
  animation: glowBurst 2.5s ease-out forwards;
}

/* 🌌 Background light movement */
@keyframes bgPulse {
  0%, 100% { opacity: 0.7 }
  50% { opacity: 1 }
}
.animate-bg-pulse {
  animation: bgPulse 5s ease-in-out infinite;
}

/* 🎬 Transition fade */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 1s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
}
</style>
