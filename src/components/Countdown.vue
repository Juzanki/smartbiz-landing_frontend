<template>
  <!-- CHIP / TEXT VARIANT -->
  <span
    v-if="variant !== 'ring'"
    class="inline-flex items-center gap-2 font-semibold tabular-nums"
    :class="[chipClass, toneClass]"
    role="timer"
    aria-live="off"
    :aria-label="`ETA ${readableCountdown}`"
  >
    <i v-if="showIcon" class="i-tabler-clock text-base opacity-80" />
    {{ displayText }}
  </span>

  <!-- RING VARIANT -->
  <div
    v-else
    class="relative inline-grid place-items-center"
    role="timer"
    aria-live="off"
    :style="{ width: sizePx, height: sizePx }"
  >
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="block">
      <!-- track -->
      <circle
        :cx="center" :cy="center" :r="r"
        class="opacity-20"
        :stroke="trackColor"
        :stroke-width="stroke"
        fill="none"
      />
      <!-- progress -->
      <circle
        :cx="center" :cy="center" :r="r"
        :stroke="ringColor"
        :stroke-width="stroke"
        fill="none"
        stroke-linecap="round"
        :style="{
          strokeDasharray: dash,
          strokeDashoffset: dashOffset,
          transform: 'rotate(-90deg)',
          transformOrigin: '50% 50%',
          transition: 'stroke-dashoffset .3s linear'
        }"
      />
    </svg>
    <span class="absolute text-sm font-bold tabular-nums" :class="toneClass">
      {{ compactCenter }}
    </span>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/* ---------- Props ---------- */
const props = defineProps({
  /** Target time (ISO string / Date / ms number) */
  eta: { type: [String, Number, Date], required: true },

  /** Visual variant: 'chip' | 'text' | 'ring' */
  variant: { type: String, default: 'chip' },

  /** Optional start time (enables progress % for ring) */
  start: { type: [String, Number, Date], default: null },

  /** Refresh rate (ms) */
  refresh: { type: Number, default: 1000 },

  /** Thresholds (seconds) */
  warnAtSec: { type: Number, default: 180 },   // ≤ 3m = yellow
  dangerAtSec: { type: Number, default: 60 },  // ≤ 1m = red

  /** Texts */
  arriveText: { type: String, default: 'Arriving…' },
  invalidText: { type: String, default: '—' },

  /** Formatting toggles */
  showHours: { type: Boolean, default: true },
  showDays: { type: Boolean, default: false },
  showIcon: { type: Boolean, default: true },

  /** Chip styling */
  chip: { type: Boolean, default: true },

  /** Ring config */
  size: { type: Number, default: 48 },
  stroke: { type: Number, default: 4 },
})

/* ---------- Time helpers ---------- */
const now = ref(Date.now())
let timerId = null

function parseTs(x) {
  if (x instanceof Date) return x.getTime()
  if (typeof x === 'number') return x
  const t = Date.parse(x)
  return Number.isFinite(t) ? t : NaN
}

const targetMs = computed(() => parseTs(props.eta))
const startMs  = computed(() => props.start ? parseTs(props.start) : NaN)

const remainingMs = computed(() => {
  if (!Number.isFinite(targetMs.value)) return NaN
  return Math.max(0, targetMs.value - now.value)
})

const totalMs = computed(() => {
  if (!Number.isFinite(startMs.value) || !Number.isFinite(targetMs.value)) return NaN
  return Math.max(0, targetMs.value - startMs.value)
})

function tick() {
  now.value = Date.now()
}

/* Start/stop interval safely */
function startInterval() {
  stopInterval()
  const rate = Math.max(250, props.refresh || 1000)
  timerId = setInterval(tick, rate)
}
function stopInterval() {
  if (timerId) { clearInterval(timerId); timerId = null }
}

onMounted(startInterval)
onBeforeUnmount(stopInterval)
watch(() => props.eta, startInterval)

/* ---------- Formatting ---------- */
function pad2(n) { return n < 10 ? `0${n}` : `${n}` }

const state = computed(() => {
  if (!Number.isFinite(remainingMs.value)) return 'invalid'
  const sec = Math.floor(remainingMs.value / 1000)
  if (sec <= 0) return 'arriving'
  if (sec <= props.dangerAtSec) return 'danger'
  if (sec <= props.warnAtSec) return 'warn'
  return 'ok'
})

const formatted = computed(() => {
  if (state.value === 'invalid') return props.invalidText
  if (state.value === 'arriving') return props.arriveText

  let ms = remainingMs.value
  let s = Math.floor(ms / 1000)

  const days = Math.floor(s / 86400); s %= 86400
  const h = Math.floor(s / 3600);     s %= 3600
  const m = Math.floor(s / 60)
  const sec = s % 60

  if (props.showDays && days > 0) {
    return `${days}d ${pad2(h)}:${pad2(m)}:${pad2(sec)}`
  }
  if (props.showHours && (h > 0)) {
    return `${h}:${pad2(m)}:${pad2(sec)}`
  }
  // mm:ss
  return `${m}:${pad2(sec)}`
})

/* Center label for the ring: keep compact */
const compactCenter = computed(() => {
  if (state.value !== 'ok' && state.value !== 'warn' && state.value !== 'danger') return '00:00'
  let ms = remainingMs.value
  let s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600); s %= 3600
  const m = Math.floor(s / 60);   const sec = s % 60
  return h > 0 ? `${h}:${pad2(m)}` : `${m}:${pad2(sec)}`
})

/* Public display text */
const displayText = computed(() => formatted.value)
const readableCountdown = computed(() => formatted.value)

/* ---------- Classes / tones ---------- */
const toneClass = computed(() => {
  switch (state.value) {
    case 'danger':  return 'text-red-500 animate-pulse'
    case 'warn':    return 'text-yellow-400'
    case 'arriving':return 'text-green-500 animate-pulse'
    case 'invalid': return 'text-white/60'
    default:        return 'text-white'
  }
})
const chipClass = computed(() =>
  props.variant === 'chip'
    ? 'rounded-full bg-white/10 px-3 py-1.5 border border-white/10 backdrop-blur-md'
    : ''
)

/* ---------- Ring math ---------- */
const center = computed(() => props.size / 2)
const r = computed(() => Math.max(0, props.size / 2 - props.stroke / 2))
const circumference = computed(() => 2 * Math.PI * r.value)
const dash = computed(() => `${circumference.value}px`)
const progress = computed(() => {
  if (!Number.isFinite(totalMs.value) || totalMs.value === 0) return 1 - (remainingMs.value ? 0 : 1)
  return 1 - (remainingMs.value / totalMs.value)
})
const dashOffset = computed(() => {
  const p = Math.min(1, Math.max(0, progress.value))
  return `${(1 - p) * circumference.value}px`
})
const ringColor = computed(() => {
  switch (state.value) {
    case 'danger':  return '#ef4444' // red-500
    case 'warn':    return '#f59e0b' // amber-500
    case 'arriving':return '#22c55e' // green-500
    default:        return '#60a5fa' // blue-400
  }
})
const trackColor = '#ffffff'
const sizePx = computed(() => `${props.size}px`)
</script>

<style scoped>
/* Use tabular numbers so time doesn’t jiggle on phones */
.tabular-nums { font-variant-numeric: tabular-nums; }

/* Small mobile niceties */
@media (max-width: 480px) {
  span[role="timer"].rounded-full { padding: 0.35rem 0.6rem; font-size: .95rem; }
}
</style>
