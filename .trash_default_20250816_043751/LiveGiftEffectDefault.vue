<template>
  <div
    v-if="visible"
    class="fixed inset-0 flex items-center justify-center pointer-events-none z-[9999]"
  >
    <transition :name="gift.animation || 'explode'">
      <div
        key="effect"
        class="relative flex flex-col items-center justify-center space-y-4 z-[10]"
        :style="{ animationDuration: (gift.duration || 4000) + 'ms' }"
      >
        <!-- 🔊 Sound Playback -->
        <audio
          v-if="gift.sound"
          :src="gift.sound"
          autoplay
          class="hidden"
        />

        <!-- 🌠 Background Effect Layer (e.g. sparkles, trails) -->
        <img
          v-if="gift.effect"
          :src="gift.effect"
          alt="effect"
          class="absolute inset-0 w-full h-full object-contain opacity-40 blur-sm animate-spin-slow z-[1]"
        />

        <!-- 🌟 Glowing Ring -->
        <div class="relative rounded-full p-4 glow-ring z-[2]">
          <!-- 🎁 Gift Icon -->
          <img
            :src="gift.icon"
            :alt="gift.name"
            class="w-28 h-28 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] animate-gift-bounce"
          />
        </div>

        <!-- 🏷️ Gift Label -->
        <p class="text-3xl font-black text-yellow-300 tracking-wide drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)] animate-pulse z-[3]">
          {{ gift.name }}
        </p>
      </div>
    </transition>
  </div>
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useMotion } from '@vueuse/motion'
import { playGiftSound } from '@/helpers/giftHelpers'

// 📥 Props
const props = defineProps({
  gift: {
    type: Object,
    required: true,
  },
})

// 📤 Emit
const emit = defineEmits(['expired'])

// 🔁 Reactive State
const visible = ref(true)
const motionEl = ref(null)
let timeoutRef = null

// 🌀 Motion Presets (based on gift.mode)
const motionPresets = {
  center: {
    initial: { opacity: 0, scale: 0.6, filter: 'blur(6px)' },
    enter: {
      opacity: 1,
      scale: 1.05,
      filter: 'blur(0)',
      transition: { type: 'spring', stiffness: 120, damping: 12, mass: 0.4 },
    },
    leave: {
      opacity: 0,
      scale: 0.5,
      filter: 'blur(3px)',
      transition: { duration: 0.45, ease: 'easeInOut' },
    },
  },
  glow: {
    initial: { opacity: 0, scale: 0.9, filter: 'brightness(0.8)' },
    enter: {
      opacity: 1,
      scale: 1.12,
      filter: 'brightness(1.4)',
      transition: { type: 'spring', stiffness: 90, damping: 10 },
    },
    leave: {
      opacity: 0,
      scale: 0.65,
      filter: 'brightness(0.4)',
      transition: { duration: 0.5 },
    },
  },
  fullscreen: {
    initial: { opacity: 0, scale: 0.85, filter: 'blur(4px)' },
    enter: {
      opacity: 1,
      scale: 1.2,
      filter: 'blur(0) brightness(1.3)',
      transition: { type: 'spring', stiffness: 80, damping: 14 },
    },
    leave: {
      opacity: 0,
      scale: 0.6,
      filter: 'blur(3px)',
      transition: { duration: 0.6 },
    },
  },
}

// 🚀 Mount logic
onMounted(async () => {
  const mode = props.gift.mode || 'center'
  const preset = motionPresets[mode] || motionPresets.center

  // ⏯️ Start motion after DOM ready
  await nextTick()
  if (motionEl.value) {
    useMotion(motionEl, {
      initial: preset.initial,
      enter: preset.enter,
      leave: preset.leave,
    })
  }

  // 🔊 Play gift sound (if provided)
  playGiftSound(props.gift)

  // ⏱ Auto-hide after duration
  const duration = props.gift?.duration || 4000
  timeoutRef = setTimeout(() => {
    visible.value = false
    emit('expired', props.gift?.id || null)
  }, duration)
})

// 🧼 Cleanup on destroy
onBeforeUnmount(() => {
  if (timeoutRef) clearTimeout(timeoutRef)
})
</script>
<style scoped>
:root {
  --expl-speed: 1.3s;
  --boom-speed: 2.4s;
  --spark-speed: 1.8s;
  --trail-speed: 2s;
  --pulse-speed: 1.35s;
}

/* 🛑 Motion Respect (for accessibility) */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* 💥 Gift Explosion Entry */
@keyframes explodeIn {
  0%   { transform: scale(0.4) rotate(0);   opacity: 0;   filter: blur(6px) brightness(0.7); }
  50%  { transform: scale(1.5) rotate(180deg); opacity: 1; filter: blur(0) brightness(1.5); }
  100% { transform: scale(1)   rotate(360deg); opacity: 0.8; }
}
.explode-enter-active {
  animation: explodeIn var(--expl-speed) ease-out forwards;
  will-change: transform, opacity, filter;
  transform-origin: center;
}

/* 🔮 Supreme Pulse Boom Animation */
@keyframes pulseBoom {
  0%   { transform: scale(0.3);  opacity: 0;   filter: brightness(0.7) blur(6px); }
  30%  { transform: scale(1.7);  opacity: 1;   filter: brightness(2) contrast(1.4); }
  70%  { transform: scale(1.1);  opacity: 1;   filter: drop-shadow(0 0 80px rgba(255,255,255,0.6)); }
  100% { transform: scale(1);    opacity: 0;   filter: blur(3px); }
}
.ai-explosion-enter-active {
  animation: pulseBoom var(--boom-speed) ease-in-out forwards;
  transform-origin: center;
  will-change: transform, opacity, filter;
  z-index: 9999;
}

/* ✨ Sparkle-Glow Lift Up */
@keyframes sparkleRise {
  0%   { transform: translateY(40px) scale(0.6); opacity: 0; filter: brightness(0.7) blur(3px); }
  65%  { transform: translateY(-10px) scale(1.15); opacity: 1; filter: brightness(1.6); }
  100% { transform: translateY(0) scale(1); opacity: 0.85; }
}
.sparkle-glow-enter-active {
  animation: sparkleRise var(--spark-speed) ease-out forwards;
  will-change: transform, opacity, filter;
}

/* 🌠 Trail Disappear */
@keyframes fadeTrailOut {
  0%   { opacity: 1;   transform: translateY(0) scale(1);    filter: drop-shadow(0 0 10px rgba(255,255,255,0.4)); }
  60%  { opacity: 0.4; transform: translateY(-24px) scale(0.95); filter: blur(1px) brightness(1.2); }
  100% { opacity: 0;   transform: translateY(-48px) scale(0.85); filter: blur(3px); }
}
.fadeTrail-leave-active {
  animation: fadeTrailOut var(--trail-speed) ease-in-out forwards;
  will-change: transform, opacity, filter;
}

/* 💫 Radiant Pulse Ring */
@keyframes particleFlash {
  0%   { transform: scale(0.2); opacity: 0.7; }
  50%  { transform: scale(1.12); opacity: 0.3; }
  100% { transform: scale(1.6); opacity: 0; }
}
.particle-pulse::after {
  content: '';
  position: absolute;
  inset: -60%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 75%);
  animation: particleFlash var(--pulse-speed) ease-out infinite;
  pointer-events: none;
  z-index: 5;
}

/* 🎁 Gift Icon Bounce */
@keyframes giftBounce {
  0%   { transform: scale(0.85) translateY(20px); opacity: 0; }
  50%  { transform: scale(1.08) translateY(-6px); opacity: 1; }
  100% { transform: scale(1) translateY(0); }
}
.animate-gift-bounce {
  animation: giftBounce 1.4s ease-out;
}

/* 🧠 Additional Utility (optional) */
.blur-glow {
  filter: blur(3px) brightness(1.2);
  opacity: 0.85;
}
</style>

