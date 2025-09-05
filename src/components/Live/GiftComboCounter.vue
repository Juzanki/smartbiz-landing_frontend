<template>
  <transition name="combo-pop">
    <div
      v-if="visible && count > 1"
      class="fixed left-1/2 -translate-x-1/2 z-[999]"
      :style="wrapStyle"
      role="status"
      aria-live="polite"
    >
      <!-- Banner -->
      <div
        class="combo-banner bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 text-white font-extrabold rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2"
        :class="['animate-pulse-soft', bumpClass]"
        @animationend="bumpClass = ''"
      >
        <span class="text-xl md:text-2xl">🔥</span>
        <span class="sr-only">Combo count</span>
        <span class="combo-text">COMBO x{{ prettyCount }}</span>
      </div>

      <!-- Streak meter -->
      <div class="streak-wrap">
        <div class="streak-bar" :style="{ width: progressPct + '%' }"></div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, computed } from 'vue'

/* ===== Props ===== */
const props = defineProps({
  comboCount: { type: Number, required: true },   // existing
  autoHideMs: { type: Number, default: 2500 },    // optional
  anchor: { type: String, default: 'top' },       // 'top' | 'center'
  soundSrc: { type: String, default: '' },        // optional sfx on bump
})

/* ===== State ===== */
const visible = ref(false)
const count = ref(0)
const hideTimer = ref(null)
const meterTimer = ref(null)
const timeLeft = ref(0) // ms left for meter
const bumpClass = ref('')

/* ===== Computed ===== */
const prettyCount = computed(() => {
  const n = count.value
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/,'') + 'M'
  if (n >= 1000)    return (n / 1000).toFixed(1).replace(/\.0$/,'') + 'K'
  return n
})

const progressPct = computed(() => {
  if (!props.autoHideMs) return 100
  return Math.max(0, Math.min(100, (timeLeft.value / props.autoHideMs) * 100))
})

const wrapStyle = computed(() => {
  const top = props.anchor === 'center'
    ? 'calc(50vh - 48px)'
    : 'max(env(safe-area-inset-top, 0px) + 12px, 10px)'
  return {
    top,
    // responsive max width for small phones
    maxWidth: 'min(92vw, 520px)'
  }
})

/* ===== Effects ===== */
function playSfx() {
  if (!props.soundSrc) return
  try {
    const a = new Audio(props.soundSrc)
    a.volume = 0.6
    a.play().catch(()=>{})
  } catch {}
}
function haptic() {
  try { navigator.vibrate?.(6) } catch {}
}

function startMeter() {
  clearTimeout(hideTimer.value)
  clearInterval(meterTimer.value)
  timeLeft.value = props.autoHideMs
  // countdown @ 60fps-ish
  const start = performance.now()
  meterTimer.value = setInterval(() => {
    const elapsed = performance.now() - start
    timeLeft.value = Math.max(0, props.autoHideMs - elapsed)
    if (timeLeft.value <= 0) {
      clearInterval(meterTimer.value)
    }
  }, 1000/30)
  hideTimer.value = setTimeout(() => {
    visible.value = false
    count.value = 0
  }, props.autoHideMs)
}

/* ⏱ Watch comboCount & show when > 1 */
watch(() => props.comboCount, (newCount, oldCount) => {
  if (newCount > 1) {
    const increased = newCount > (oldCount ?? 0)
    count.value = newCount
    visible.value = true
    startMeter()
    if (increased) {
      bumpClass.value = 'combo-bump'
      haptic()
      playSfx()
    }
  } else {
    // hide if combo reset
    visible.value = false
    count.value = 0
  }
})

onBeforeUnmount(() => {
  clearTimeout(hideTimer.value)
  clearInterval(meterTimer.value)
})
</script>

<style scoped>
/* ===== Mobile-first sizing ===== */
.combo-banner{
  padding: clamp(8px, 2.2vw, 12px) clamp(16px, 4.8vw, 24px);
  font-size: clamp(16px, 4.5vw, 24px);
  line-height: 1;
  box-shadow:
    0 8px 24px rgba(0,0,0,.35),
    0 0 24px rgba(234,88,12,.25),
    0 0 48px rgba(236,72,153,.18);
  border: 1px solid rgba(255,255,255,.22);
}

/* Text glow (legible on bright gradients) */
.combo-text{
  text-shadow:
    0 1px 2px rgba(0,0,0,.25),
    0 0 10px rgba(255,255,255,.25);
}

/* Soft pulse (energy) */
@keyframes pulseSoft{
  0%,100%{ transform: scale(1) }
  50%{ transform: scale(1.035) }
}
.animate-pulse-soft{
  animation: pulseSoft 2.2s ease-in-out infinite;
}

/* Bump on increase */
@keyframes comboBump{
  0%{ transform: scale(.9) translateY(-4px); filter: brightness(1.1) }
  60%{ transform: scale(1.12) translateY(0); filter: brightness(1.15) }
  100%{ transform: scale(1) }
}
.combo-bump{ animation: comboBump .38s cubic-bezier(.2,.9,.2,1) }

/* Streak meter (auto-hide progress) */
.streak-wrap{
  height: 4px;
  background: rgba(255,255,255,.15);
  border-radius: 9999px;
  overflow: hidden;
  margin: 8px auto 0;
  width: 80%;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.12);
}
.streak-bar{
  height: 100%;
  background: linear-gradient(90deg,#34d399,#22d3ee,#a78bfa);
  filter: drop-shadow(0 0 8px rgba(52,211,153,.5));
  transition: width .1s linear;
  will-change: width;
}

/* Enter transition */
@keyframes comboPop {
  0% { transform: scale(.6) translateY(-10px); opacity: 0; }
  60% { transform: scale(1.15) translateY(0); opacity: 1; }
  100% { transform: scale(1); }
}
.combo-pop-enter-active { animation: comboPop .5s ease-out; }

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .animate-pulse-soft, .combo-bump{ animation-duration: 1ms !important; }
  .streak-bar{ transition: none !important; }
}
</style>
