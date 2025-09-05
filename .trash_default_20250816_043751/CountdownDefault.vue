<template>
  <span
    class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold backdrop-blur-md border tabular-nums select-none"
    :class="[baseToneClass, toneClass]"
    role="timer"
    aria-live="off"
    :aria-label="`ETA ${ariaText}`"
  >
    <i v-if="showIcon" class="i-tabler-clock text-base opacity-80" />
    {{ display }}
  </span>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/* Props */
const props = defineProps({
  /** Target time (ISO string, number ms, or Date) */
  eta: { type: [String, Number, Date], required: true },

  /** Refresh interval (ms) */
  refresh: { type: Number, default: 1000 },

  /** Thresholds in seconds */
  warnAtSec: { type: Number, default: 180 },   // <= 3m → warn
  dangerAtSec: { type: Number, default: 60 },  // <= 1m → danger

  /** Texts */
  arriveText: { type: String, default: 'Arriving…' },
  invalidText: { type: String, default: '—' },

  /** Formatting */
  showHours: { type: Boolean, default: true },  // use h:mm:ss when needed
  showDays: { type: Boolean, default: false },  // show d h:mm:ss when > 1d

  /** UI */
  showIcon: { type: Boolean, default: true },
})

const emit = defineEmits(['expired'])

/* State */
const now = ref(Date.now())
let timerId = null
let firedExpired = false

/* Helpers */
function parseTs(x) {
  if (x instanceof Date) return x.getTime()
  if (typeof x === 'number') return x
  const t = Date.parse(x)
  return Number.isFinite(t) ? t : NaN
}
function pad2(n) { return n < 10 ? `0${n}` : `${n}` }

/* Core computed values */
const targetMs = computed(() => parseTs(props.eta))
const remainingMs = computed(() => {
  if (!Number.isFinite(targetMs.value)) return NaN
  return Math.max(0, targetMs.value - now.value)
})
const remainingSec = computed(() =>
  Number.isFinite(remainingMs.value) ? Math.floor(remainingMs.value / 1000) : NaN
)

/* Visual state */
const state = computed(() => {
  if (!Number.isFinite(remainingSec.value)) return 'invalid'
  if (remainingSec.value <= 0) return 'arriving'
  if (remainingSec.value <= props.dangerAtSec) return 'danger'
  if (remainingSec.value <= props.warnAtSec) return 'warn'
  return 'ok'
})

/* Formatting */
const display = computed(() => {
  if (state.value === 'invalid') return props.invalidText
  if (state.value === 'arriving') return props.arriveText

  let s = remainingSec.value
  const days = Math.floor(s / 86400); s %= 86400
  const h = Math.floor(s / 3600);     s %= 3600
  const m = Math.floor(s / 60)
  const sec = s % 60

  if (props.showDays && days > 0) return `${days}d ${pad2(h)}:${pad2(m)}:${pad2(sec)}`
  if (props.showHours && h > 0)    return `${h}:${pad2(m)}:${pad2(sec)}`
  return `${m}:${pad2(sec)}`
})

const ariaText = computed(() => display.value)

/* Classes */
const baseToneClass = 'bg-white/10 border-white/10 text-white'
const toneClass = computed(() => {
  switch (state.value) {
    case 'danger':   return 'text-red-500 animate-pulse'
    case 'warn':     return 'text-yellow-400'
    case 'arriving': return 'text-green-500 animate-pulse'
    case 'invalid':  return 'text-white/60'
    default:         return ''
  }
})

/* Timer lifecycle */
function tick() {
  now.value = Date.now()
  if (!firedExpired && state.value === 'arriving') {
    firedExpired = true
    emit('expired')
  }
}
function startTimer() {
  stopTimer()
  firedExpired = remainingSec.value <= 0 // avoid duplicate emits if already past
  const rate = Math.max(250, props.refresh || 1000)
  timerId = setInterval(tick, rate)
}
function stopTimer() {
  if (timerId) { clearInterval(timerId); timerId = null }
}

onMounted(startTimer)
onBeforeUnmount(stopTimer)
watch(() => props.eta, startTimer)
</script>

<style scoped>
/* Keep numbers steady on mobile */
.tabular-nums { font-variant-numeric: tabular-nums; }

/* Slightly tighter padding on very small phones */
@media (max-width: 420px) {
  span[role="timer"] { padding: .35rem .6rem; font-size: .95rem; }
}
</style>
