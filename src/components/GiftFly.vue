<template>
  <!-- Single floating gift toast (stack-aware) -->
  <transition :name="animName" mode="out-in">
    <div
      v-if="visible"
      :key="gift?.id"
      class="gift-wrap pointer-events-none"
      :style="wrapStyle"
      role="status"
      aria-live="polite"
    >
      <!-- ✨ Aura / effect bg -->
      <div
        v-if="gift?.effect"
        class="effect-aura animate-spin-slow"
        :style="{ backgroundImage: `url(${gift.effect})` }"
      ></div>

      <!-- 🎆 Canvas particles -->
      <canvas v-show="particlesOn" ref="canvasEl" class="particles"></canvas>

      <!-- 🔊 Sound (best-effort; iOS friendly) -->
      <audio
        v-if="gift?.sound"
        ref="audioEl"
        :src="gift.sound"
        class="hidden"
        preload="auto"
        playsinline
      ></audio>

      <!-- 🎁 Icon -->
      <img
        ref="imgEl"
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
 * - gift: { id, name, icon, sound?, effect?, animation?, duration?, sender?, volume?, particles? }
 * - stackIndex: 0..N for horizontal staggering
 * - bottomOffset: px from bottom (safe-area-aware)
 * - leadingEmoji: override leading emoji
 * - haptics: enable vibrate
 */
const props = defineProps({
  gift: { type: Object, required: true },
  stackIndex: { type: Number, default: 0 },
  bottomOffset: { type: Number, default: 96 },
  leadingEmoji: { type: String, default: '🎁' },
  haptics: { type: Boolean, default: true }
})

const visible = ref(true)
let hideTimer = null

/* ---- A11y / text ---- */
const senderName = computed(() => props.gift?.sender || 'Someone')

/* ---- Animation name (with fallback) ---- */
const animName = computed(() => props.gift?.animation || 'fly')

/* ---- Safe-area aware positioning + stack offset ---- */
const wrapStyle = computed(() => {
  const xShift = (props.stackIndex % 3 - 1) * 28 // -28, 0, +28px wave
  const z = 50 + props.stackIndex
  const dur = (props.gift?.duration ?? 2500) + 'ms'
  return {
    '--dur': dur,
    transform: `translateX(calc(-50% + ${xShift}px))`,
    bottom: `calc(${props.bottomOffset}px + env(safe-area-inset-bottom, 0px))`,
    zIndex: z
  }
})

/* ---- Media / particles refs ---- */
const audioEl = ref(null)
const imgEl = ref(null)
const canvasEl = ref(null)
const particlesOn = ref(false)
let rafId = 0, confetti = []

/* ---- Show/hide handling ---- */
function showGift() {
  visible.value = true
  clearTimeout(hideTimer)

  // schedule hide
  const duration = props.gift?.duration ?? 3000
  hideTimer = setTimeout(() => (visible.value = false), duration)

  // haptics
  if (props.haptics && navigator?.vibrate) {
    try { navigator.vibrate(12) } catch {}
  }

  // play sound (safely)
  nextTick(playSound)

  // start particles if enabled
  if (props.gift?.particles !== false) startParticles()
}

/* ---- Sound logic: volume & autoplay fallback ---- */
async function playSound() {
  if (!audioEl.value || !props.gift?.sound) return
  try {
    audioEl.value.currentTime = 0
    audioEl.value.volume = clamp(Number(props.gift?.volume ?? 0.9), 0, 1)
    await audioEl.value.play()
  } catch {
    // Autoplay blocked; retry quietly on next user gesture
    const kick = () => {
      audioEl.value.play().catch(()=>{})
      window.removeEventListener('pointerdown', kick, { once: true })
    }
    window.addEventListener('pointerdown', kick, { once: true })
  }
}

/* ---- Particles (tiny confetti) ---- */
function startParticles() {
  const el = canvasEl.value
  if (!el) return
  const ctx = el.getContext('2d')
  const width = 140, height = 120
  el.width = width; el.height = height

  // seed
  const colors = ['#22d3ee','#fde047','#f472b6','#60a5fa','#34d399']
  confetti = Array.from({ length: 18 }, () => ({
    x: width/2 + rand(-20,20),
    y: height/2 + rand(-8,8),
    r: rand(2,4),
    c: colors[Math.floor(Math.random()*colors.length)],
    vx: rand(-1.6, 1.6),
    vy: rand(-2.2, -0.8),
    rot: rand(0, Math.PI*2),
    vr: rand(-0.2, 0.2)
  }))
  particlesOn.value = true

  const start = performance.now()
  const duration = Math.min(2200, props.gift?.duration ?? 2200)

  const step = (t) => {
    const dt = 16 / 1000
    ctx.clearRect(0,0,width,height)
    confetti.forEach(p => {
      p.vy += 0.06 // gravity
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.c
      ctx.fillRect(-p.r, -p.r, p.r*2, p.r*2)
      ctx.restore()
    })
    if (t - start < duration) rafId = requestAnimationFrame(step)
    else {
      particlesOn.value = false
      ctx.clearRect(0,0,width,height)
    }
  }
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(step)
}

/* ---- Image robustness ---- */
function onImgError(e){
  e.target.src = '/gifts/placeholder.png'
}

/* ---- Utils ---- */
function rand(min, max){ return Math.random()*(max-min)+min }
function clamp(n, a, b){ return Math.min(b, Math.max(a, n)) }

/* ---- React to gift changes ---- */
watch(() => props.gift, (g) => { if (g) showGift() }, { immediate: true, deep: true })

/* ---- Cleanup ---- */
onBeforeUnmount(() => {
  clearTimeout(hideTimer)
  cancelAnimationFrame(rafId)
})
</script>

<style scoped>
/* Root container (mobile-first, center bottom) */
.gift-wrap{
  position: fixed;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .5rem;
  pointer-events: none;
  animation-duration: var(--dur, 2500ms);
}

/* Aura (effect) */
.effect-aura{
  position: absolute; inset: auto;
  width: 10rem; height: 10rem;
  top: -2.5rem; left: 50%; transform: translateX(-50%);
  background-size: cover; background-position: center;
  opacity: .75; border-radius: 9999px; filter: blur(1px);
  z-index: -1;
}

/* Particles canvas */
.particles{
  position: absolute;
  top: -1.25rem; left: 50%; transform: translateX(-50%);
  pointer-events: none;
}

/* Icon & message */
.icon{ width: 6rem; height: 6rem; object-fit: contain; filter: drop-shadow(0 6px 18px rgba(0,0,0,.5)); will-change: transform, filter; }
.msg{
  font-size: .875rem;
  color: #fff;
  background: color-mix(in oklab, #000 60%, transparent);
  border: 1px solid rgba(255,255,255,.14);
  padding: .35rem .75rem;
  border-radius: 9999px;
  backdrop-filter: blur(6px);
  box-shadow: 0 4px 12px rgba(0,0,0,.35);
}

/* Gift Glow */
.gift-glow {
  animation: glowGift 1.8s ease-in-out infinite alternate, shimmerPulse 2.4s ease-in-out infinite alternate;
}
@keyframes glowGift {
  from { filter: drop-shadow(0 0 10px #facc15) brightness(1.15); transform: scale(1); }
  to   { filter: drop-shadow(0 0 32px #fde047) brightness(1.3);  transform: scale(1.06); }
}
@keyframes shimmerPulse { 0%{opacity:.95} 50%{opacity:1} 100%{opacity:.95} }

/* Default: fly (slide-up & zoom) */
.fly-enter-from, .fly-leave-to { opacity:0; transform: translateY(60px) scale(.85) rotate(-5deg); }
.fly-enter-active, .fly-leave-active { transition: all .6s cubic-bezier(.23,1,.32,1); }

/* Quantum Pop (boom) */
.quantum-pop-enter-active { animation: quantumPop 2.2s ease-in-out both; }
@keyframes quantumPop {
  0% { transform: scale(.3); opacity:0; filter: blur(8px); }
  45% { transform: scale(1.35); opacity:1; filter: blur(0); }
  100% { transform: scale(1); opacity:0; filter: brightness(1.6); }
}

/* Orbit Flip (mythic swirl) */
.orbit-flip-enter-active { animation: orbitFlip 2.8s ease-in-out both; }
@keyframes orbitFlip {
  0% { transform: rotateY(0) scale(.85); opacity:0; filter: brightness(.6); }
  55% { transform: rotateY(360deg) scale(1.15); opacity:1; filter: brightness(1.15); }
  100% { transform: rotateY(720deg) scale(1); opacity:0; filter: blur(1px); }
}

/* Rise Bounce (new) */
.rise-bounce-enter-active { animation: riseBounce 1.8s cubic-bezier(.22,1,.36,1) both; }
@keyframes riseBounce {
  0% { transform: translateY(40px) scale(.9); opacity:0 }
  60%{ transform: translateY(-6px) scale(1.02); opacity:1 }
  100%{ transform: translateY(0) scale(1); opacity:0 }
}

/* Shooting Star (new) */
.shoot-enter-active { animation: shoot 1.6s ease-out both; }
@keyframes shoot {
  0% { transform: translate(-50%,50px) scale(.8) rotate(-8deg); opacity:0 }
  40%{ transform: translate(-50%,-10px) scale(1) rotate(0); opacity:1 }
  100%{ transform: translate(-50%,-30px) scale(1.05) rotate(4deg); opacity:0 }
}

/* Slow spin helper */
.animate-spin-slow { animation: spinSlow 8s linear infinite; }
@keyframes spinSlow { to { transform: rotate(360deg) } }

/* Motion-safe: reduce heavy animations */
@media (prefers-reduced-motion: reduce) {
  .gift-glow, .animate-spin-slow { animation: none !important; }
  .fly-enter-active, .fly-leave-active,
  .quantum-pop-enter-active, .orbit-flip-enter-active,
  .rise-bounce-enter-active, .shoot-enter-active {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
</style>
