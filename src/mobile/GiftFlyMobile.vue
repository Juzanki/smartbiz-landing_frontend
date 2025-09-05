<template>
  <transition :name="gift?.animation || 'fly'" mode="out-in">
    <div
      v-if="visible"
      :key="gift?.id"
      class="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center space-y-2 pointer-events-none"
      :style="{ animationDuration: (gift?.duration || 2500) + 'ms' }"
    >
      <!-- 🌟 Extra Effect Background -->
      <div
        v-if="gift?.effect"
        class="absolute -z-10 w-40 h-40 bg-cover bg-center rounded-full opacity-70 animate-spin-slow"
        :style="{ backgroundImage: `url(${gift.effect})` }"
      ></div>

      <!-- 🔊 Sound -->
      <audio
        v-if="gift?.sound"
        :src="gift.sound"
        autoplay
        muted
        playsinline
        class="hidden"
      ></audio>

      <!-- 🎁 Gift Icon -->
      <img
        :src="gift?.icon"
        :alt="gift?.name || 'Gift'"
        role="img"
        class="w-24 h-24 object-contain drop-shadow-xl gift-glow"
      />

      <!-- 💬 Gift Message -->
      <p class="text-white text-sm font-semibold bg-black/60 px-3 py-1 rounded-full backdrop-blur shadow-md">
        🎁 {{ gift?.sender || 'Someone' }} sent a {{ gift?.name }}!
      </p>
    </div>
  </transition>
</template>
<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  gift: {
    type: Object,
    required: true // { icon, name, animation?, duration?, sound?, effect?, sender? }
  }
})

const visible = ref(true)
let timeoutId = null

// ⏱️ Handle showing & auto-hide gift
const showGift = () => {
  visible.value = true
  clearTimeout(timeoutId)

  const duration = props.gift?.duration || 3000
  timeoutId = setTimeout(() => {
    visible.value = false
  }, duration)
}

// 🔄 React to gift changes
watch(
  () => props.gift,
  (newGift) => {
    if (newGift) showGift()
  },
  { immediate: true, deep: true }
)

// 🧹 Clean up on unmount
onBeforeUnmount(() => {
  clearTimeout(timeoutId)
})
</script>
<style scoped>
/* 🌈 Universal Gift Glow – Shimmer & Pulse */
.gift-glow {
  animation: glowGift 1.8s ease-in-out infinite alternate,
             shimmerPulse 2.4s ease-in-out infinite alternate;
}
@keyframes glowGift {
  from {
    filter: drop-shadow(0 0 10px #facc15) brightness(1.15);
    transform: scale(1);
  }
  to {
    filter: drop-shadow(0 0 30px #fde047) brightness(1.3);
    transform: scale(1.08);
  }
}
@keyframes shimmerPulse {
  0% { opacity: 0.95; }
  50% { opacity: 1; }
  100% { opacity: 0.95; }
}

/* 📦 Default Fly Animation (slide-up & zoom) */
.fly-enter-from,
.fly-leave-to {
  opacity: 0;
  transform: translateY(60px) scale(0.85) rotate(-5deg);
}
.fly-enter-active,
.fly-leave-active {
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}

/* 💥 Quantum Pop Effect (Explosion Style) */
.quantum-pop-enter-active {
  animation: quantumPop 2.8s ease-in-out;
}
@keyframes quantumPop {
  0% {
    transform: scale(0.3);
    opacity: 0;
    filter: blur(8px);
  }
  50% {
    transform: scale(1.4);
    opacity: 1;
    filter: blur(0);
  }
  100% {
    transform: scale(1);
    opacity: 0;
    filter: brightness(2);
  }
}

/* 🪐 Orbit Flip Effect (Mythic-tier magic swirl) */
.orbit-flip-enter-active {
  animation: orbitFlip 4s ease-in-out;
}
@keyframes orbitFlip {
  0% {
    transform: rotateY(0deg) scale(0.85);
    opacity: 0;
    filter: brightness(0.5);
  }
  50% {
    transform: rotateY(360deg) scale(1.15);
    opacity: 1;
    filter: brightness(1.2);
  }
  100% {
    transform: rotateY(720deg) scale(1);
    opacity: 0;
    filter: blur(1px);
  }
}

/* 🔁 Spin Effect (for background like aura/rings) */
.animate-spin-slow {
  animation: spinSlow 8s linear infinite;
}
@keyframes spinSlow {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>

