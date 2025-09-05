<template>
  <!-- Overlay container -->
  <transition-group
    name="gift"
    tag="div"
    class="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
    :style="{ paddingBottom: 'env(safe-area-inset-bottom)' }"
    aria-live="polite" aria-atomic="true" role="status"
  >
    <div
      v-for="gift in visible"
      :key="gift._key"
      class="absolute inset-0 flex items-center justify-center"
    >
      <!-- Auto scale on small phones -->
      <div
        class="relative flex flex-col items-center justify-center space-y-3 will-change-transform"
        :style="{
          transform: mobileScale,
          animationDuration: (gift.duration || 6000) + 'ms'
        }"
      >
        <!-- “Wings” glow behind -->
        <span
          class="pointer-events-none absolute -inset-12 rounded-[48px] blur-3xl"
          :style="{ background: wingGradient(gift) }"
        />

        <!-- Optional background effect layer -->
        <img
          v-if="gift.effect"
          :src="gift.effect"
          alt=""
          class="absolute inset-0 w-full h-full object-contain opacity-30 animate-spin-slow pointer-events-none z-[1]"
          :style="{ animationDuration: (gift.duration || 6000) + 'ms' }"
        />

        <!-- Main media -->
        <component
          :is="gift.video ? 'video' : 'img'"
          :src="gift.video || gift.icon"
          class="relative z-[2] object-contain rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl bg-black/20
                 drop-shadow-[0_20px_60px_rgba(0,0,0,.45)]"
          :class="gift.video ? 'w-[18rem] sm:w-[22rem] md:w-[28rem]' : 'w-36 sm:w-44 md:w-60'"
          v-bind="gift.video ? { autoplay: true, loop: false, muted: true, playsinline: true } : {}"
          :style="giftStyle(gift)"
        />

        <!-- Progress ring (for premium/large gifts) -->
        <svg
          v-if="showRing(gift)"
          class="absolute -top-3 -right-3 w-10 h-10 z-[3]"
          viewBox="0 0 36 36" fill="none"
          :style="ringStyle(gift)"
        >
          <circle cx="18" cy="18" r="16" stroke="rgba(255,255,255,.25)" stroke-width="3"/>
          <circle
            cx="18" cy="18" r="16"
            :stroke="ringStroke(gift)"
            stroke-width="3" stroke-linecap="round"
            :style="{ strokeDasharray: '100,100', strokeDashoffset: 100 }"
            class="ring-progress"
          />
        </svg>

        <!-- Gift name -->
        <div
          v-if="gift.name"
          class="z-[3] px-5 py-2 rounded-full text-white font-extrabold text-lg tracking-wide shadow-md backdrop-blur-md
                 bg-gradient-to-r from-black/70 via-black/40 to-black/70 border border-white/10"
        >
          {{ gift.name }}
        </div>

        <!-- Micro confetti (CSS only, cheap) -->
        <div v-if="gift.confetti !== false" class="absolute inset-0 z-[1] pointer-events-none">
          <i v-for="n in 12" :key="n" class="confetti" :style="confettiStyle(n, gift)"></i>
        </div>
      </div>
    </div>
  </transition-group>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'

type Gift = {
  id: string | number
  timestamp: number
  icon?: string
  name?: string
  video?: string
  effect?: string
  sound?: string
  duration?: number          // ms
  animation?: string         // preset key
  tier?: 'common'|'rare'|'epic'|'legendary'
  confetti?: boolean
}

const props = withDefaults(defineProps<{
  gifts: Gift[]
  maxConcurrent?: number     // visible at once
  mobileScaleMin?: number    // min scale on tiny screens
  enableHaptics?: boolean
  enableSound?: boolean
}>(), {
  maxConcurrent: 2,
  mobileScaleMin: 0.82,
  enableHaptics: true,
  enableSound: true
})

/* ----- User-activation gate (prevents vibration/audio errors) ----- */
const userActivated = ref(false)
function markActivated(){ userActivated.value = true }
onMounted(() => {
  const opts: AddEventListenerOptions = { once: true, passive: true }
  window.addEventListener('pointerdown', markActivated, opts)
  window.addEventListener('touchstart', markActivated, opts as any)
  window.addEventListener('click', markActivated, opts)
  window.addEventListener('keydown', markActivated, opts)
})

/* Reduced motion / visibility */
const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
const isVisible = () => document.visibilityState === 'visible'

/* Autoscale (reactive) */
const vw = ref(typeof window !== 'undefined' ? window.innerWidth : 390)
const mobileScale = computed(()=> {
  const w = Math.min(vw.value, 420)
  const s = Math.max(props.mobileScaleMin, Math.min(1, w / 390))
  return `scale(${s})`
})

/* Internal queue + visible */
const queue = ref<Gift[]>([])
const visible = ref<(Gift & {_key:string; _t0:number})[]>([])
const played = new Set<string>()

/* Sound / haptics limiter */
let lastSoundAt = 0
function playSound(src?: string){
  if (!src || !props.enableSound) return
  // Browser blocks autoplay without gesture; respect user activation & tab visibility
  const active = userActivated.value || (navigator as any).userActivation?.isActive
  if (!active || !isVisible()) return

  const now = performance.now()
  if (now - lastSoundAt < 200) return // throttle
  lastSoundAt = now
  try {
    const a = new Audio(src)
    a.volume = 0.9
    // .play() can still reject; swallow errors
    a.play().catch(()=>{})
  } catch {}
}
function haptic(ms=10){
  if (!props.enableHaptics || prefersReduced) return
  try{
    const can = 'vibrate' in navigator
    const active = userActivated.value || (navigator as any).userActivation?.isActive
    if (can && active && isVisible()) (navigator as any).vibrate(ms)
  }catch{}
}

/* Enqueue on gifts change */
watch(()=> props.gifts, (list) => {
  for (const g of list) {
    const key = `${g.id}-${g.timestamp}`
    if ([...queue.value, ...visible.value].some(x => (x.id+'-'+x.timestamp) === key)) continue
    queue.value.push(g)
  }
  pump()
}, { deep: true, immediate: true })

/* Pump from queue respecting maxConcurrent */
const MAX = computed(()=> props.maxConcurrent!)
function pump(){
  while (visible.value.length < MAX.value && queue.value.length){
    const g = queue.value.shift()!
    const _key = `${g.id}-${g.timestamp}`
    const dur = g.duration ?? 6000
    visible.value.push({ ...g, _key, _t0: performance.now() })
    if (!played.has(_key)) { playSound(g.sound); haptic(); played.add(_key) }
    // auto-remove
    window.setTimeout(()=>{
      visible.value = visible.value.filter(v => v._key !== _key)
      pump()
    }, dur + 180) // small buffer
  }
}

/* Resize observer for mobileScale recalculation */
function onResize(){ vw.value = window.innerWidth }
onMounted(()=> window.addEventListener('resize', onResize, { passive: true }))
onBeforeUnmount(()=> window.removeEventListener('resize', onResize))

/* ---------- UI helpers ---------- */
function wingGradient(g: Gift){
  switch (g.tier){
    case 'legendary': return 'radial-gradient(60% 60% at 50% 50%, rgba(251,191,36,.35), rgba(168,85,247,.25) 60%, rgba(59,130,246,.18))'
    case 'epic':      return 'radial-gradient(60% 60% at 50% 50%, rgba(147,51,234,.30), rgba(59,130,246,.22))'
    case 'rare':      return 'radial-gradient(60% 60% at 50% 50%, rgba(20,184,166,.28), rgba(99,102,241,.18))'
    default:          return 'radial-gradient(60% 60% at 50% 50%, rgba(255,255,255,.16), rgba(99,102,241,.12))'
  }
}

/* Attach animation preset via style */
function giftStyle(g: Gift){
  const name = (g.animation || 'explode') as string
  return {
    animationName: animName(name),
    animationDuration: (g.duration ?? 6000)+'ms',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'both'
  }
}
function animName(key: string){
  switch (key) {
    case 'float-up':    return 'float-up'
    case 'orbit-flip':  return 'orbit-flip'
    case 'spiral':      return 'spiral-spark'
    case 'flame':       return 'flame-rise'
    case 'drive':       return 'drive-in'
    case 'crown':       return 'crown-zoom'
    case 'shine':       return 'shine-rise'
    case 'explode':
    default:            return 'fade-scale'
  }
}

/* Progress ring */
function showRing(g: Gift){ return (g.tier === 'epic' || g.tier === 'legendary') }
function ringStroke(g: Gift){ return g.tier === 'legendary' ? '#f59e0b' : '#22d3ee' }
function ringStyle(g: Gift){
  const t = (g.duration ?? 6000)
  return { animation: `ring ${t}ms linear forwards` }
}

/* Confetti style (cheap) */
function confettiStyle(n: number, g: Gift){
  const left = 10 + ((n*83)%80)  // spread
  const delay = (n*73)%400
  const hue = g.tier === 'legendary' ? (n*35)%360 : (n*19)%360
  return {
    left: left+'%',
    top: '-6%',
    background: `hsl(${hue} 90% 60%)`,
    animationDelay: delay+'ms'
  }
}
</script>

<style scoped>
/* Base transitions for group */
.gift-enter-active,.gift-leave-active{ transition: opacity .35s ease, transform .35s ease }
.gift-enter-from,.gift-leave-to{ opacity: 0; transform: scale(.96) }

/* Slow spin for optional effect layer */
@keyframes spin-slow{ from{ transform: rotate(0) } to{ transform: rotate(360deg) } }
.animate-spin-slow{ animation: spin-slow 12s linear infinite }

/* Preset animations (GPU-friendly transforms) */
@keyframes float-up{
  0%{ opacity:0; transform: translate3d(0,60px,0) scale(.85) rotate(-6deg); filter: blur(3px) brightness(.9) }
  70%{ opacity:1; transform: translate3d(0,-8px,0) scale(1.06); filter: blur(0) brightness(1.1) }
  100%{ transform: translate3d(0,0,0) scale(1); filter: none }
}
@keyframes orbit-flip{
  0%{ transform: perspective(800px) rotateY(0deg) scale(.7); opacity:0 }
  50%{ transform: perspective(800px) rotateY(180deg) scale(1.15); opacity:1; filter: drop-shadow(0 0 15px rgba(255,255,255,.25)) }
  100%{ transform: perspective(800px) rotateY(360deg) scale(1); opacity:0 }
}
@keyframes spiral-spark{
  0%{ transform: scale(.4) rotate(0deg); opacity:0; filter: brightness(.7) blur(2px) }
  60%{ transform: scale(1.35) rotate(180deg); opacity:1; filter: brightness(1.35) }
  100%{ transform: scale(1) rotate(360deg); opacity:0 }
}
@keyframes flame-rise{
  0%{ transform: translate3d(0,40px,0) scale(.85) skewY(-3deg); opacity:0; filter:hue-rotate(60deg) blur(1px) }
  60%{ transform: translate3d(0,-12px,0) scale(1.08); opacity:1; filter:none }
  100%{ transform: translate3d(0,0,0) scale(1); opacity:0 }
}
@keyframes drive-in{
  0%{ transform: translate3d(-120%,0,0) scale(.85) rotate(-10deg); opacity:0 }
  60%{ transform: translate3d(10%,0,0) scale(1.15) rotate(3deg); opacity:1 }
  100%{ transform: translate3d(0,0,0) scale(1); opacity:0 }
}
@keyframes crown-zoom{
  0%{ transform: scale(.5) rotate(0); opacity:0; filter: drop-shadow(0 0 10px rgba(255,215,0,.35)) }
  50%{ transform: scale(1.35) rotate(18deg); opacity:1; filter: drop-shadow(0 0 36px gold) }
  100%{ transform: scale(1) rotate(0); opacity:0 }
}
@keyframes shine-rise{
  0%{ opacity:0; transform: translate3d(0,50px,0) scale(.85); filter: brightness(.8) blur(2px) }
  60%{ opacity:1; transform: translate3d(0,-10px,0) scale(1.08); filter: brightness(1.4) }
  100%{ opacity:0; transform: translate3d(0,0,0) scale(1) }
}
@keyframes fade-scale{
  0%{ transform: scale(.4); opacity:0 }
  50%{ transform: scale(1.2); opacity:1 }
  100%{ transform: scale(1); opacity:0 }
}

/* Progress ring (CSS animation drives strokeDashoffset 100 -> 0) */
@keyframes ring { from{ stroke-dashoffset: 100 } to{ stroke-dashoffset: 0 } }
.ring-progress{ animation: ring 6s linear forwards }

/* Confetti pieces */
.confetti{
  position:absolute; width:6px; height:10px; transform-origin:center;
  border-radius:2px; opacity:.95;
  animation: confettiFall 1200ms ease-in forwards;
}
@keyframes confettiFall{
  0%{ transform: translate3d(0,0,0) rotate(0deg) }
  100%{ transform: translate3d(0,140px,0) rotate(220deg); opacity: 0 }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce){
  .animate-spin-slow{ animation: none !important }
  *{ animation-duration: .01ms !important; animation-iteration-count: 1 !important }
}
</style>
