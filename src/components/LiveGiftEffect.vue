<template>
  <!-- Root container sits above UI, safe-area aware -->
  <div
    v-if="visible && current"
    class="fixed inset-0 z-[9999] flex items-center justify-center"
    :style="safeArea"
    role="status"
    aria-live="polite"
  >
    <!-- Backdrop clicks = skip -->
    <div class="absolute inset-0 pointer-events-auto" @click="dismiss('tap')"></div>

    <!-- Effect stack (pointer events enabled only on card) -->
    <transition :name="current.animation || 'explode'">
      <div
        key="effect"
        ref="cardEl"
        class="relative z-10 pointer-events-auto select-none"
        :style="cardStyle"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
        @touchstart.passive
      >
        <!-- ✖ Skip (big hit area) -->
        <button
          class="absolute -top-4 -right-4 h-12 w-12 grid place-items-center rounded-full
                 bg-black/50 text-white text-xl border border-white/20 shadow-lg"
          @click.stop="dismiss('btn')"
          aria-label="Dismiss gift"
        >✖</button>

        <!-- 🔊 Sound (HTML fallback) -->
        <audio v-if="current.sound && !muted" :src="current.sound" autoplay class="hidden"></audio>

        <!-- 🌠 BG effect (lightweight) -->
        <img
          v-if="!dataSaver && current.effect"
          :src="current.effect"
          alt=""
          class="absolute -inset-10 w-[120%] h-[120%] object-contain opacity-40 blur-sm animate-spin-slow -z-10"
          :style="{ animationDuration: (quality==='low' ? 18 : 12) + 's' }"
        />

        <!-- Core circle with tier glow -->
        <div class="relative grid place-items-center">
          <!-- Progress ring (SVG for perf) -->
          <svg
            class="absolute -inset-2"
            :width="ringBox" :height="ringBox"
            viewBox="0 0 120 120" aria-hidden="true"
          >
            <defs>
              <linearGradient :id="gradId" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" :stop-color="palette[0]" />
                <stop offset="100%" :stop-color="palette[1]" />
              </linearGradient>
            </defs>
            <!-- track -->
            <circle cx="60" cy="60" r="50"
                    :stroke="trackColor" stroke-width="6" fill="none" opacity="0.35" />
            <!-- progress -->
            <circle cx="60" cy="60" r="50"
                    :stroke="`url(#${gradId})`" stroke-width="6" fill="none"
                    stroke-linecap="round"
                    :style="{ strokeDasharray: circ, strokeDashoffset: dashOffset }"
                    transform="rotate(-90 60 60)" />
          </svg>

          <!-- Glow ring -->
          <div class="tier-glow glow-ring" :class="tierClass"></div>

          <!-- 🎁 Icon -->
          <img
            :src="current.icon" :alt="current.name"
            class="w-[28vw] max-w-[112px] h-auto object-contain drop-shadow-[0_0_20px_rgba(255,255,255,.55)]
                   animate-gift-bounce"
            @error="onImgError"
          />
        </div>

        <!-- Label + meta -->
        <div class="mt-3 text-center">
          <p class="gift-label text-2xl md:text-3xl">{{ current.name }}</p>
          <p v-if="current.meta?.amount" class="coin-value">
            <span>🪙</span> +{{ current.meta.amount }} {{ current.meta.unit || 'Coins' }}
          </p>
          <p v-if="showHint" class="mt-1 text-[11px] text-white/80">
            Tap to skip · long-press to pause · swipe to dismiss
          </p>
        </div>

        <!-- Confetti (emoji) -->
        <span
          v-for="c in confetti"
          :key="c.id"
          class="confetti"
          :style="{ left: c.x+'%', top: c.y+'%', transform:`scale(${c.s})` }"
        >{{ c.e }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
// Optional motion: if present, tun it; otherwise we degrade gracefully
let useMotion = null
try { const mod = await import('@vueuse/motion'); useMotion = mod.useMotion } catch (_) {}

const props = defineProps({
  gift: { type: Object, default: null },     // One-off gift (optional). Use API for queue multi.
  autoPlayProp: { type: Boolean, default: true },
  quality: { type: String, default: 'auto' }, // auto | low | high
  muted: { type: Boolean, default: false },
  dataSaver: { type: Boolean, default: false },
})

const emit = defineEmits(['expired','shown','dismissed','error'])

/* ------- State & Queue ------- */
const queue = ref([])            // queued gifts
const current = ref(props.gift)  // playing gift
const visible = ref(!!current.value)
const paused = ref(false)
const progress = ref(0)          // 0..1
const startTs = ref(0)
const durationMs = ref(4000)
let rafId = null
let longPressTimer = null

/* ------- Sizing / Mobile-first ------- */
const scale = ref(1)
function measure(){
  const vw = Math.min(window.innerWidth, 480) // tune for phone
  scale.value = Math.max(.85, Math.min(1.15, vw / 360))
}
onMounted(() => { measure(); window.addEventListener('resize', measure, { passive: true }) })
onBeforeUnmount(() => window.removeEventListener('resize', measure))

/* ------- Ring ------- */
const ringBox = 140
const circ = 2 * Math.PI * 50
const dashOffset = computed(() => (1 - progress.value) * circ)
const trackColor = '#ffffff'
const gradId = 'giftGrad_' + Math.random().toString(36).slice(2,7)
const palette = computed(() => tierPalette(current.value?.tier))

/* ------- Styles ------- */
const safeArea = { padding: 'max(env(safe-area-inset-top,0px),10px) max(env(safe-area-inset-right,0px),10px) max(env(safe-area-inset-bottom,0px),10px) max(env(safe-area-inset-left,0px),10px)' }
const cardStyle = computed(() => ({
  transform: `translate(${drag.dx}px, ${drag.dy}px) scale(${scale.value})`,
  transition: drag.dragging ? 'none' : 'transform .16s ease, opacity .16s ease',
}))

/* ------- Tier visuals ------- */
function tierPalette(t){
  return ({
    Lite: ['#e5e7eb','#ffffff'],
    Rare: ['#22d3ee','#60a5fa'],
    Epic: ['#a78bfa','#ec4899'],
    Legendary: ['#f59e0b','#ef4444'],
    Mythic: ['#ec4899','#06b6d4'],
    Supreme: ['#06b6d4','#7c3aed'],
  }[t] || ['#ffffff','#fef08a'])
}
const tierClass = computed(() => ({
  Lite: 'ring-lite', Rare: 'ring-rare', Epic: 'ring-epic',
  Legendary: 'ring-leg', Mythic: 'ring-myth', Supreme: 'ring-sup'
}[current.value?.tier] || 'ring-lite'))

/* ------- Confetti ------- */
const confetti = ref([])
function burstConfetti(){
  if (props.dataSaver) return
  const level = current.value?.tier || 'Lite'
  const n = (props.quality==='low' ? 6 : props.quality==='high' ? 18 : {Lite:8,Rare:10,Epic:12,Legendary:14,Mythic:16,Supreme:18}[level] || 10)
  const emojis = ['🪙','🎉','✨','💎','🌟']
  for (let i=0;i<n;i++){
    const id = 'c'+i+Math.random()
    confetti.value.push({ id, e: emojis[Math.floor(Math.random()*emojis.length)], x: 50+(Math.random()-0.5)*60, y: 50+(Math.random()-0.5)*30, s: 0.8+Math.random()*0.9 })
    setTimeout(() => confetti.value = confetti.value.filter(x => x.id!==id), 700 + i*18)
  }
}

/* ------- Haptics & Audio fallback ------- */
function vibrate(ms=14){ try { navigator.vibrate?.(ms) } catch {} }
function beep(){
  if (props.muted) return
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)()
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.type='sine'; o.frequency.value = 660; g.gain.value=.001
    o.connect(g); g.connect(ctx.destination)
    o.start(); g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + .12); o.stop(ctx.currentTime+.13)
  } catch {}
}

/* ------- Play / Queue logic ------- */
function play(gift){
  if (!gift) return
  current.value = normalizeGift(gift)
  durationMs.value = current.value.duration || 4000
  progress.value = 0
  visible.value = true
  startTs.value = performance.now()
  runMotion()
  if (!gift.sound) beep()
  vibrate(tierVibe(current.value.tier))
  burstConfetti()
  emit('shown', current.value.id || null)
  loop()
}
function enqueue(gift){ queue.value.push(normalizeGift(gift)); if (!current.value) next() }
function next(){
  if (queue.value.length){ play(queue.value.shift()) }
  else { stop() }
}
function stop(){
  cancelAnimationFrame(rafId); rafId = null
  visible.value = false
  current.value = null
}

/* Normalize input */
function normalizeGift(g){
  return {
    id: g.id || 'gift_'+Math.random().toString(36).slice(2,7),
    name: g.name || 'Special Gift',
    icon: g.icon,
    effect: g.effect || '',
    sound: g.sound || '',
    duration: g.duration || 4000,
    tier: g.tier || 'Lite',
    mode: g.mode || 'center',
    animation: g.animation || 'explode',
    meta: g.meta || {}
  }
}

/* RAF progress */
function loop(now){
  if (!current.value) return
  if (!paused.value){
    const elapsed = (now ?? performance.now()) - startTs.value
    progress.value = Math.min(1, elapsed / durationMs.value)
    if (progress.value >= 1) {
      const id = current.value.id || null
      emit('expired', id)
      next()
      return
    }
  }
  rafId = requestAnimationFrame(loop)
}

/* Optional motion */
const cardEl = ref(null)
async function runMotion(){
  await nextTick()
  if (!useMotion || !cardEl.value) return
  const mode = current.value?.mode || 'center'
  const presets = {
    center: { initial:{ opacity:0, scale:.6, filter:'blur(6px)' }, enter:{ opacity:1, scale:1.06, filter:'blur(0)', transition:{ type:'spring', stiffness:120, damping:12 }}, leave:{ opacity:0, scale:.5, filter:'blur(3px)', transition:{ duration:.45 }} },
    glow:   { initial:{ opacity:0, scale:.9, filter:'brightness(.8)' }, enter:{ opacity:1, scale:1.12, filter:'brightness(1.35)', transition:{ type:'spring', stiffness:90, damping:10 }}, leave:{ opacity:0, scale:.65, filter:'brightness(.4)', transition:{ duration:.5 }} },
    fullscreen:{ initial:{ opacity:0, scale:.85, filter:'blur(4px)' }, enter:{ opacity:1, scale:1.2, filter:'blur(0) brightness(1.15)', transition:{ type:'spring', stiffness:80, damping:14 }}, leave:{ opacity:0, scale:.6, filter:'blur(3px)', transition:{ duration:.6 }} },
  }
  try {
    useMotion(cardEl, presets[mode] || presets.center)
  } catch {}
}

/* Public API */
function clear(){ queue.value = []; stop() }
function pause(){ paused.value = true }
function resume(){
  if (!paused.value) return
  paused.value = false
  // Shift timeline so remaining time continues
  startTs.value = performance.now() - progress.value * durationMs.value
}
defineExpose({ enqueue, play, clear, pause, resume })

/* ------- Gestures (swipe + long-press pause) ------- */
const drag = reactive({ dragging:false, dx:0, dy:0, sx:0, sy:0 })
function onPointerDown(e){
  drag.dragging = true; drag.sx = e.clientX; drag.sy = e.clientY; drag.dx=0; drag.dy=0
  longPressTimer = setTimeout(() => { paused.value = !paused.value }, 550)
}
function onPointerMove(e){
  if (!drag.dragging) return
  drag.dx = e.clientX - drag.sx
  drag.dy = e.clientY - drag.sy
}
function onPointerUp(){
  if (longPressTimer){ clearTimeout(longPressTimer); longPressTimer = null }
  if (!drag.dragging) return
  drag.dragging = false
  const commit = Math.hypot(drag.dx, drag.dy) > 56
  if (commit) dismiss('swipe')
  drag.dx=0; drag.dy=0
}
function onPointerCancel(){ drag.dragging=false; drag.dx=drag.dy=0 }
function dismiss(src='dismiss'){
  if (!current.value) return
  const id = current.value.id || null
  emit('dismissed', { id, by: src })
  next()
}

/* ------- Utilities ------- */
const showHint = ref(true)
setTimeout(() => (showHint.value=false), 1800)
function onImgError(e){ e.target.style.opacity = .5 }
function tierVibe(t){ return ({ Lite:8, Rare:12, Epic:16, Legendary:18, Mythic:20, Supreme:24 }[t] || 10) }

/* ------- Props reactivity ------- */
watch(() => props.gift, (g) => {
  if (!g) return
  if (current.value) enqueue(g)
  else if (props.autoPlayProp) play(g)
}, { deep: true, immediate: true })

/* Visibility pause */
function onVis(){ if (document.hidden) pause(); else resume() }
onMounted(() => document.addEventListener('visibilitychange', onVis))
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVis))

/* Reduced motion */
const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
if (prefersReduced) { // soften effects
  // lower confetti later counts by flipping quality to low
}
</script>

<style scoped>
/* Accessibility: respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}

/* Spin bg */
@keyframes spin { to { transform: rotate(360deg) } }
.animate-spin-slow { animation: spin 12s linear infinite; opacity: .35; filter: blur(1px) brightness(1.08); }

/* Explode */
@keyframes explodeIn {
  0% { transform: scale(.4) rotate(0); opacity: 0; filter: blur(6px) brightness(.7); }
  50%{ transform: scale(1.5) rotate(180deg); opacity: 1; filter: blur(0) brightness(1.5); }
  100%{ transform: scale(1) rotate(360deg); opacity: .9; }
}
.explode-enter-active { animation: explodeIn 1.1s ease-out both; will-change: transform, opacity, filter; }

/* Gift bounce */
@keyframes giftBounce {
  0% { transform: scale(.85) translateY(20px); opacity: 0; }
  50%{ transform: scale(1.08) translateY(-6px); opacity: 1; }
  100%{ transform: scale(1) translateY(0); }
}
.animate-gift-bounce { animation: giftBounce 1.2s ease-out; will-change: transform, opacity; }

/* Glow ring base */
.glow-ring {
  position: absolute;
  inset: -20px;
  border-radius: 9999px;
  pointer-events: none;
}
.tier-glow {
  box-shadow:
    0 0 22px rgba(255,255,255,.18),
    0 0 68px rgba(255,255,255,.12),
    inset 0 0 48px rgba(255,255,255,.08);
  backdrop-filter: blur(10px);
}
/* Tier tints */
.ring-lite { box-shadow: 0 0 26px rgba(255,255,255,.25), 0 0 80px rgba(255,255,255,.12), inset 0 0 60px rgba(255,255,255,.08); }
.ring-rare { box-shadow: 0 0 26px rgba(34,211,238,.35), 0 0 90px rgba(96,165,250,.20), inset 0 0 60px rgba(34,211,238,.15); }
.ring-epic { box-shadow: 0 0 30px rgba(167,139,250,.35), 0 0 100px rgba(236,72,153,.20), inset 0 0 70px rgba(167,139,250,.18); }
.ring-leg  { box-shadow: 0 0 34px rgba(245,158,11,.35), 0 0 110px rgba(239,68,68,.22), inset 0 0 80px rgba(245,158,11,.2); }
.ring-myth { box-shadow: 0 0 36px rgba(236,72,153,.35), 0 0 120px rgba(6,182,212,.24), inset 0 0 90px rgba(236,72,153,.22); }
.ring-sup  { box-shadow: 0 0 38px rgba(6,182,212,.36), 0 0 130px rgba(124,58,237,.26), inset 0 0 100px rgba(6,182,212,.22); }

/* Emoji confetti */
.confetti {
  position: absolute; pointer-events: none; font-size: 20px; opacity: .96;
  animation: conf-pop .75s ease-out forwards;
}
@keyframes conf-pop {
  from { transform: translateY(6px) scale(.8); opacity: .0 }
  to   { transform: translateY(-18px) scale(1.1); opacity: 0 }
}

/* Helpers */
.gift-label {
  background: linear-gradient(90deg,#fff,#ffe579,#fff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 6px rgba(255,255,255,.15);
}
.coin-value {
  display:flex; align-items:center; justify-content:center; gap:.35rem;
  color: gold; font-weight: 800; text-shadow: 0 1px 4px rgba(0,0,0,.5);
}
</style>
