<template>
  <div
    v-if="visible"
    ref="root"
    :class="rootClasses"
    :style="rootStyle"
    role="button"
    tabindex="0"
    :aria-label="ariaLabel"
    @click="handleClick"
    @keydown.enter.space.prevent="handleClick"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
  >
    <!-- Live dot / status -->
    <span class="live-dot" :class="statusClass" aria-hidden="true"></span>

    <!-- Label + sub -->
    <div class="min-w-0">
      <div class="text-[11px] font-extrabold leading-4 tracking-wide uppercase">
        <span v-if="status==='live'">Live Now</span>
        <span v-else-if="status==='scheduled'">Starts in {{ countdownText }}</span>
        <span v-else-if="status==='ended'">Ended {{ endedAgo }}</span>
        <span v-else>Offline</span>
      </div>

      <div class="text-[11px] opacity-90 truncate" aria-live="polite">
        <template v-if="status==='live'">
          {{ compact(viewers) }} watching
        </template>
        <template v-else>
          {{ title }}
        </template>
      </div>
    </div>

    <!-- Viewers pill (live only) -->
    <div v-if="status==='live'" class="viewers">
      👀 {{ compact(viewers) }}
    </div>

    <!-- Rank / badge (optional) -->
    <div v-if="rank" class="rank">🔥 #{{ rank }}</div>

    <!-- Ripple effects -->
    <span
      v-for="r in ripples"
      :key="r.id"
      class="ripple"
      :style="{ left: r.x+'px', top: r.y+'px' }"
      aria-hidden="true"
    />

    <!-- Confetti when going live -->
    <span
      v-for="c in confetti"
      :key="c.id"
      class="confetti"
      :style="{ left: c.x+'%', top: c.y+'%', transform:`scale(${c.s})` }"
      aria-hidden="true"
    >{{ c.e }}</span>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

/** PROPS */
const props = defineProps({
  live:        { type: Boolean, default: false },
  title:       { type: String,  default: 'Join the live' },
  viewers:     { type: Number,  default: 0 },
  scheduledAt: { type: [Number, String, Date], default: null }, // future start
  endedAt:     { type: [Number, String, Date], default: null }, // past end
  variant:     { type: String,  default: 'pill' }, // 'pill' | 'fab' | 'chip'
  size:        { type: String,  default: 'md' },   // 'sm' | 'md' | 'lg'
  position:    { type: String,  default: 'top-right' }, // 'inline' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  rank:        { type: Number,  default: 0 },
  interactive: { type: Boolean, default: true },
  visible:     { type: Boolean, default: true },
})

/** EMITS */
const emit = defineEmits(['open','peek'])

/** STATE */
const root = ref(null)
const ripples = ref([])
const confetti = ref([])
let pressTimer = null
let tick = null

/** TIME & STATUS */
const now = ref(Date.now())
function toMs(v){ if (!v) return null; return (v instanceof Date) ? v.getTime() : +new Date(v) }
const startMs = computed(() => toMs(props.scheduledAt))
const endMs   = computed(() => toMs(props.endedAt))

const status = computed(() => {
  if (props.live) return 'live'
  if (startMs.value && startMs.value > now.value) return 'scheduled'
  if (endMs.value && endMs.value <= now.value) return 'ended'
  if (startMs.value && startMs.value <= now.value && !props.live) return 'ended'
  return 'offline'
})

const countdownText = computed(() => {
  if (!startMs.value) return 'soon'
  const diff = Math.max(0, startMs.value - now.value)
  const s = Math.floor(diff/1000)
  const m = Math.floor(s/60)
  const h = Math.floor(m/60)
  if (h) return `${h}h ${m%60}m`
  if (m) return `${m}m ${s%60}s`
  return `${s}s`
})

const endedAgo = computed(() => {
  const t = endMs.value || startMs.value || now.value
  const diff = Math.max(1, Math.floor((now.value - t)/1000))
  if (diff < 60) return `${diff}s`
  const m = Math.floor(diff/60); if (m < 60) return `${m}m`
  const h = Math.floor(m/60);    if (h < 24) return `${h}h`
  const d = Math.floor(h/24);    return `${d}d`
})

/** INTERVAL for countdown */
onMounted(() => { tick = setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => { clearInterval(tick) })

/** CONFETTI when transitioning to live */
let lastStatus = status.value
watch(status, (cur) => {
  if (lastStatus !== 'live' && cur === 'live') {
    burstConfetti()
    vibrate(20)
  }
  lastStatus = cur
})

/** CLASSES & STYLES */
const rootClasses = computed(() => {
  const base = [
    'relative select-none text-white',
    'shadow-2xl border border-white/15 backdrop-blur',
    'active:scale-[0.98] transition-transform duration-150',
    props.interactive ? 'cursor-pointer' : 'cursor-default'
  ]
  const shape = ({
    pill: 'rounded-full px-3 py-2 flex items-center gap-3',
    chip: 'rounded-xl px-3 py-2 flex items-center gap-3',
    fab:  'rounded-full w-14 h-14 grid place-items-center'
  }[props.variant]) || 'rounded-full px-3 py-2 flex items-center gap-3'

  const theme = (props.variant === 'fab')
    ? 'bg-gradient-to-b from-rose-500 to-red-600'
    : 'bg-gradient-to-b from-red-600 to-pink-600'

  const size = ({
    sm: 'text-[11px]',
    md: 'text-[12px]',
    lg: 'text-sm'
  }[props.size]) || 'text-[12px]'

  const positioning = (props.position === 'inline')
    ? ''
    : 'fixed z-[9998]'

  return [base, shape, theme, size, positioning].join(' ')
})

const rootStyle = computed(() => {
  if (props.position === 'inline') return {}
  const safeT = 'calc(env(safe-area-inset-top,0px) + 10px)'
  const safeB = 'calc(env(safe-area-inset-bottom,0px) + 10px)'
  const side  = 'calc(env(safe-area-inset-right,0px) + 10px)'
  const sideL = 'calc(env(safe-area-inset-left,0px) + 10px)'
  const posMap = {
    'top-right':    { top: safeT, right: side },
    'top-left':     { top: safeT, left: sideL },
    'bottom-right': { bottom: safeB, right: side },
    'bottom-left':  { bottom: safeB, left: sideL },
  }
  return posMap[props.position] || {}
})

const statusClass = computed(() =>
  status.value === 'live'
    ? 'bg-red-400 live-pulse'
    : status.value === 'scheduled'
      ? 'bg-amber-300'
      : status.value === 'ended'
        ? 'bg-slate-300'
        : 'bg-slate-400'
)

const ariaLabel = computed(() => {
  switch (status.value) {
    case 'live': return `Live now, ${props.viewers} watching. Tap to join`
    case 'scheduled': return `Starts in ${countdownText.value}. Tap to set reminder`
    case 'ended': return `Stream ended ${endedAgo.value} ago`
    default: return 'Stream offline'
  }
})

/** VIEWERS & UTILS */
function compact(n){
  if (n >= 1e9) return (n/1e9).toFixed(1)+'B'
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M'
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K'
  return String(n)
}

/** INTERACTIONS */
function vibrate(ms=12){ try { navigator.vibrate?.(ms) } catch {} }
let longPressFired = false
function handleClick(e){
  if (!props.interactive) return
  if (longPressFired) { longPressFired = false; return }
  addRipple(e)
  vibrate(10)
  emit('open')
}
function onPointerDown(e){
  if (!props.interactive) return
  addRipple(e)
  longPressFired = false
  pressTimer = setTimeout(() => {
    longPressFired = true
    vibrate(20)
    emit('peek')
  }, 600)
}
function onPointerUp(){
  if (pressTimer){ clearTimeout(pressTimer); pressTimer = null }
}
function onPointerCancel(){
  if (pressTimer){ clearTimeout(pressTimer); pressTimer = null }
}

/** Ripple effect */
let rippleId = 0
function addRipple(e){
  const el = root.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = (e.clientX ?? rect.right - 12) - rect.left
  const y = (e.clientY ?? rect.bottom - 12) - rect.top
  const id = ++rippleId
  ripples.value.push({ id, x, y })
  setTimeout(() => { ripples.value = ripples.value.filter(r => r.id !== id) }, 500)
}

/** Confetti on go-live */
function burstConfetti(){
  const emojis = ['✨','🎉','💥','🌟','🔥']
  for (let i=0;i<12;i++){
    const id = 'c'+i+Math.random()
    confetti.value.push({ id, e: emojis[i%emojis.length], x: 50+(Math.random()-0.5)*60, y: 40+(Math.random()-0.5)*40, s: .8+Math.random()*1 })
    setTimeout(() => confetti.value = confetti.value.filter(c => c.id !== id), 800 + i*20)
  }
}
</script>

<style scoped>
/* Live dot + pulse */
.live-dot {
  width: 10px; height: 10px; border-radius: 9999px;
  margin-right: 8px; box-shadow: 0 0 0 0 rgba(255,255,255,.3);
}
.live-pulse { animation: pulse 1.3s infinite; }
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(239,68,68,.5) }
  70% { box-shadow: 0 0 0 10px rgba(239,68,68,0) }
  100% { box-shadow: 0 0 0 0 rgba(239,68,68,0) }
}

/* Viewers pill */
.viewers {
  margin-left: 8px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 9999px;
  background: rgba(255,255,255,.15);
  border: 1px solid rgba(255,255,255,.25);
  backdrop-filter: blur(6px);
}

/* Rank tag */
.rank {
  margin-left: 8px;
  padding: 2px 6px;
  font-size: 10px;
  border-radius: 9999px;
  background: linear-gradient(180deg, rgba(250,204,21,.6), rgba(251,146,60,.6));
  border: 1px solid rgba(255,255,255,.25);
}

/* Ripple */
.ripple {
  position: absolute; pointer-events: none;
  height: 10px; width: 10px; border-radius: 9999px; background: rgba(255,255,255,.6);
  transform: translate(-50%,-50%) scale(0);
  animation: ripple .5s ease-out forwards;
}
@keyframes ripple { to { transform: translate(-50%,-50%) scale(8); opacity: 0 } }

/* Confetti */
.confetti {
  position: absolute; pointer-events: none; font-size: 16px; opacity: .96;
  animation: conf-pop .75s ease-out forwards;
}
@keyframes conf-pop {
  from { transform: translateY(6px) scale(.8); opacity: .0 }
  to   { transform: translateY(-16px) scale(1.1); opacity: 0 }
}
</style>
