<template>
  <!-- Single floating gift toast -->
  <transition :name="animName" mode="out-in">
    <div
      v-if="visible"
      :key="gift?.id"
      class="gift-wrap pointer-events-none"
      :style="wrapStyle"
      role="status"
      aria-live="polite"
    >
      <!-- 🌟 Aura / effect -->
      <div
        v-if="gift?.effect"
        class="effect-aura animate-spin-slow"
        :style="{ backgroundImage: `url(${gift.effect})` }"
      ></div>

      <!-- 🔊 Sound (played from JS with autoplay fallback) -->
      <audio
        v-if="gift?.sound"
        ref="audioEl"
        :src="gift.sound"
        preload="auto"
        playsinline
        class="hidden"
      ></audio>

      <!-- 🎁 Icon -->
      <img
        :src="gift?.icon"
        :alt="gift?.name || 'Gift'"
        class="icon gift-glow"
        decoding="async"
        @error="onImgError"
      />

      <!-- 💬 Message -->
      <p class="msg">
        {{ leadingEmoji }} {{ senderName }} sent a {{ gift?.name || 'gift' }}!
      </p>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, computed, nextTick } from 'vue'

/**
 * Props
 * gift: { id, icon, name, animation?, duration?, sound?, effect?, sender?, volume? }
 */
const props = defineProps({
  gift: { type: Object, required: true },
  /** umbali kutoka chini (px), safe-area itaongezwa juu yake */
  bottomOffset: { type: Number, default: 88 },
  /** 0..N, hutengeneza “wave” ndogo ili toasts zisigongane */
  stackIndex:   { type: Number, default: 0 },
  /** on/off haptics */
  haptics:      { type: Boolean, default: true },
  /** onyesha emoji ya mwanzo */
  leadingEmoji: { type: String, default: '🎁' }
})

const visible  = ref(true)
let hideTimer  = null
const audioEl  = ref(null)

const senderName = computed(() => props.gift?.sender || 'Someone')
const animName   = computed(() => props.gift?.animation || 'fly')

/* Safe-area + stacking + duration */
const wrapStyle = computed(() => {
  const dur = (props.gift?.duration ?? 2500) + 'ms'
  const xShift = (props.stackIndex % 3 - 1) * 26 // -26, 0, +26
  return {
    '--dur': dur,
    bottom: `calc(${props.bottomOffset}px + env(safe-area-inset-bottom, 0px))`,
    transform: `translateX(calc(-50% + ${xShift}px))`,
    zIndex: 50 + props.stackIndex
  }
})

/* Show & auto-hide */
function showGift(){
  visible.value = true
  clearTimeout(hideTimer)

  // Haptics
  if (props.haptics && navigator?.vibrate) {
    try { navigator.vibrate(12) } catch {}
  }

  // Play sound (autoplay-safe)
  nextTick(playSound)

  const duration = props.gift?.duration ?? 3000
  hideTimer = setTimeout(() => { visible.value = false }, duration)
}

/* Sound with user-gesture fallback (iOS/Android) */
async function playSound(){
  const el = audioEl.value
  if (!el) return
  try {
    el.currentTime = 0
    el.volume = Math.min(1, Math.max(0, Number(props.gift?.volume ?? 0.9)))
    await el.play()
  } catch {
    // Autoplay blocked; retry after first tap anywhere
    const kick = () => { el.play().catch(()=>{}); window.removeEventListener('pointerdown', kick, { once:true }) }
    window.addEventListener('pointerdown', kick, { once:true })
  }
}

function onImgError(e){ e.target.src = '/gifts/placeholder.png' }

/* React to gift changes */
watch(() => props.gift, g => { if (g) showGift() }, { immediate:true, deep:true })

onBeforeUnmount(() => { clearTimeout(hideTimer) })
</script>

<style scoped>
/* --- Layout (mobile-first) --- */
.gift-wrap{
  position: fixed;
  left: 50%;
  /* bottom set via style (safe-area aware) */
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .5rem;
  animation-duration: var(--dur, 2500ms);
}

/* Icon sizing responsive via clamp */
.icon{
  width: clamp(56px, 22vw, 96px);
  height: clamp(56px, 22vw, 96px);
  object-fit: contain;
  filter: drop-shadow(0 6px 18px rgba(0,0,0,.45));
  will-change: transform, filter;
}
.msg{
  font-size: clamp(12px, 3.5vw, 14px);
  color: #fff;
  background: rgba(0,0,0,.55);
  border: 1px solid rgba(255,255,255,.14);
  padding: .35rem .75rem;
  border-radius: 9999px;
  backdrop-filter: blur(6px);
  box-shadow: 0 4px 12px rgba(0,0,0,.35);
}

/* Aura */
.effect-aura{
  position: absolute;
  width: clamp(8rem, 36vw, 11rem);
  height: clamp(8rem, 36vw, 11rem);
  top: -1.5rem; left: 50%; transform: translateX(-50%);
  background-size: cover; background-position: center;
  border-radius: 9999px; opacity: .75; filter: blur(1px);
  z-index: -1;
}

/* Glow + pulse */
.gift-glow{
  animation: glowGift 1.6s ease-in-out infinite alternate, shimmerPulse 2.2s ease-in-out infinite alternate;
}
@keyframes glowGift{
  from{ filter: drop-shadow(0 0 10px #facc15) brightness(1.12); transform: scale(1) }
  to  { filter: drop-shadow(0 0 28px #fde047) brightness(1.28); transform: scale(1.06) }
}
@keyframes shimmerPulse{ 0%{opacity:.95} 50%{opacity:1} 100%{opacity:.95} }

/* Default animation: fly */
.fly-enter-from, .fly-leave-to { opacity:0; transform: translateY(60px) scale(.86) rotate(-4deg); }
.fly-enter-active, .fly-leave-active { transition: all .6s cubic-bezier(.23,1,.32,1); }

/* Extras you can choose via gift.animation */
.quantum-pop-enter-active { animation: quantumPop 2.0s ease-in-out both; }
@keyframes quantumPop{
  0%{ transform: scale(.3); opacity:0; filter: blur(8px) }
  45%{ transform: scale(1.32); opacity:1; filter: blur(0) }
  100%{ transform: scale(1); opacity:0; filter: brightness(1.5) }
}
.orbit-flip-enter-active { animation: orbitFlip 2.6s ease-in-out both; }
@keyframes orbitFlip{
  0%{ transform: rotateY(0) scale(.88); opacity:0; filter: brightness(.65) }
  55%{ transform: rotateY(360deg) scale(1.12); opacity:1; filter: brightness(1.1) }
  100%{ transform: rotateY(720deg) scale(1); opacity:0; filter: blur(1px) }
}

/* Slow spin helper */
.animate-spin-slow{ animation: spinSlow 8s linear infinite; }
@keyframes spinSlow{ to{ transform: rotate(360deg) } }

/* Motion reduction */
@media (prefers-reduced-motion: reduce){
  .gift-glow, .animate-spin-slow{ animation: none !important; }
  .fly-enter-active, .fly-leave-active,
  .quantum-pop-enter-active, .orbit-flip-enter-active{
    animation-duration: .01ms !important; transition-duration: .01ms !important;
  }
}
</style>
