<!-- src/components/LiveViewersBadge.vue -->
<template>
  <!-- draggable, safe-area aware overlay -->
  <aside
    ref="badge"
    :style="posStyle"
    :class="[
      'fixed z-50 select-none',
      minimized ? 'opacity-85' : 'opacity-100'
    ]"
    @pointerdown="onPointerDown"
    @click="onTap"
  >
    <!-- collapsed dot when minimized -->
    <button
      v-if="minimized"
      class="rounded-full px-3 py-2 bg-black/70 dark:bg-white/10 text-white text-xs shadow backdrop-blur flex items-center gap-1 active:scale-95"
      aria-label="Expand viewers"
    >
      <span class="live-dot" aria-hidden="true"></span>
      <span class="font-semibold">{{ compact(displayCount) }}</span>
    </button>

    <!-- expanded pill -->
    <div
      v-else
      class="rounded-xl bg-black/65 dark:bg-white/10 text-white shadow backdrop-blur px-3 py-2 w-[min(92vw,280px)]"
      role="status"
      aria-live="polite"
    >
      <!-- header row -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="live-dot" :class="online ? 'bg-red-500' : 'bg-gray-400'" aria-hidden="true"></span>
          <span class="text-[11px] uppercase tracking-wide opacity-80">Live</span>
          <span v-if="!online" class="text-[11px] opacity-70">• Offline</span>
        </div>

        <!-- controls -->
        <div class="flex items-center gap-1">
          <button class="ctrl-btn" :title="online ? 'Pause updates' : 'Resume updates'" @click.stop="togglePause">
            <span v-if="paused">▶️</span><span v-else>⏸️</span>
          </button>
          <button class="ctrl-btn" title="Copy viewers" @click.stop="copy(String(targetCount))">📋</button>
          <button class="ctrl-btn" title="Minimize" @click.stop="minimized = true">▾</button>
        </div>
      </div>

      <!-- numbers -->
      <div class="mt-1 flex items-end justify-between">
        <div>
          <div class="text-lg font-bold leading-none">{{ compact(displayCount) }}</div>
          <div class="text-[11px] opacity-80">Viewers</div>
        </div>

        <div class="text-right">
          <div class="text-sm font-semibold" :class="delta >= 0 ? 'text-emerald-300' : 'text-rose-300'">
            <span v-if="delta > 0">▲</span><span v-else-if="delta < 0">▼</span><span v-else>▪</span>
            {{ Math.abs(delta) }}
          </div>
          <div class="text-[11px] opacity-80">Δ since last</div>
        </div>
      </div>

      <!-- sparkline -->
      <svg v-if="history.length > 1" viewBox="0 0 100 28" class="mt-2 w-full h-7">
        <defs>
          <linearGradient id="sgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="white" stop-opacity="0.45"></stop>
            <stop offset="100%" stop-color="white" stop-opacity="0.05"></stop>
          </linearGradient>
        </defs>
        <path :d="sparkPath" fill="url(#sgrad)"></path>
        <path :d="sparkLine" fill="none" stroke="white" stroke-width="1.4"></path>
      </svg>

      <!-- meta -->
      <div class="mt-1 flex items-center justify-between text-[11px] opacity-85">
        <span>Peak: <strong>{{ compact(peak) }}</strong></span>
        <span>{{ updatedAt }}</span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'

/**
 * Props
 * - If wsUrl provided, listens for JSON messages like { viewers: 1234 }
 * - Otherwise simulates counts between min..max every pollMs
 */
const props = defineProps<{
  wsUrl?: string
  pollMs?: number
  simulate?: boolean
  min?: number
  max?: number
  start?: number
  draggable?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}>()

/* Defaults (mobile-first) */
const pollMs = computed(() => props.pollMs ?? 5000)
const simulate = computed(() => props.simulate ?? !props.wsUrl)
const rangeMin = computed(() => props.min ?? 100)
const rangeMax = computed(() => props.max ?? 500)
const start = computed(() => props.start ?? rangeMin.value)
const position = computed(() => props.position ?? 'top-left')
const draggable = computed(() => props.draggable ?? true)

/* State */
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const paused = ref(false)
const minimized = ref(false)

const targetCount = ref(start.value)
const displayCount = ref(start.value)
const lastCount = ref(start.value)
const delta = ref(0)
const peak = ref(start.value)
const history = ref<number[]>([start.value])
const updatedAt = ref('—')

/* Animation */
let raf: number | null = null

/* Poll / WS handles */
let timer: number | null = null
let ws: WebSocket | null = null

/* Drag state */
const badge = ref<HTMLElement | null>(null)
const pos = ref<{ x: number; y: number } | null>(null)
const dragging = ref(false)
const dragStart = ref<{ x: number; y: number } | null>(null)

/* Safe-area padding */
const safePad = { top: 12, left: 12, right: 12, bottom: 12 } // extra beyond safe-area

/* Position style (with safe-area awareness) */
const posStyle = computed(() => {
  const saved = readPos() // {x,y} if user dragged
  if (saved) return { left: saved.x + 'px', top: saved.y + 'px' }

  const topInset = 'calc(env(safe-area-inset-top, 0px) + 0.75rem)'
  const leftInset = 'calc(env(safe-area-inset-left, 0px) + 0.75rem)'
  const rightInset = 'calc(env(safe-area-inset-right, 0px) + 0.75rem)'
  const bottomInset = 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)'

  switch (position.value) {
    case 'top-right': return { top: topInset, right: rightInset }
    case 'bottom-left': return { bottom: bottomInset, left: leftInset }
    case 'bottom-right': return { bottom: bottomInset, right: rightInset }
    default: return { top: topInset, left: leftInset }
  }
})

/* Sparkline paths */
const sparkLine = computed(() => {
  const arr = history.value.slice(-24)
  if (arr.length < 2) return ''
  const min = Math.min(...arr), max = Math.max(...arr)
  const rng = Math.max(1, max - min)
  return arr.map((v, i) => {
    const x = (i / (arr.length - 1)) * 100
    const y = 4 + (1 - (v - min) / rng) * 20
    return (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2)
  }).join(' ')
})
const sparkPath = computed(() => {
  const line = sparkLine.value
  if (!line) return ''
  return `${line} L100 28 L0 28 Z`
})

/* Lifecycle */
onMounted(() => {
  // animate ticker
  tick()

  // visibility pause for battery-friendliness
  document.addEventListener('visibilitychange', onVis)
  window.addEventListener?.('online', () => online.value = true)
  window.addEventListener?.('offline', () => online.value = false)

  // start source
  startSource()

  // restore minimized state if user collapsed earlier
  minimized.value = localStorage.getItem('lvb_min') === '1'
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  stopSource()
  document.removeEventListener('visibilitychange', onVis)
})

/* Source control */
function startSource() {
  if (simulate.value) {
    timer = window.setInterval(() => {
      if (paused.value) return
      pushCount(rand(rangeMin.value, rangeMax.value))
    }, pollMs.value) as unknown as number
  } else if (props.wsUrl) {
    ws = new WebSocket(props.wsUrl)
    ws.addEventListener('message', e => {
      if (paused.value) return
      try {
        const data = JSON.parse(e.data || '{}')
        if (typeof data.viewers === 'number') pushCount(data.viewers)
      } catch {}
    })
  }
}

function stopSource() {
  if (timer) { clearInterval(timer); timer = null }
  if (ws) { try { ws.close() } catch {} ws = null }
}

function onVis() {
  const hidden = document.hidden
  paused.value = hidden || paused.value
}

/* Count updates */
function pushCount(n: number) {
  n = Math.max(0, Math.round(n))
  lastCount.value = targetCount.value
  targetCount.value = n
  delta.value = n - lastCount.value
  peak.value = Math.max(peak.value, n)
  history.value.push(n)
  updatedAt.value = new Date().toLocaleTimeString()
}

/* Smooth number animation (eases toward target) */
function tick() {
  const cur = displayCount.value
  const target = targetCount.value
  const step = Math.max(1, Math.ceil(Math.abs(target - cur) * 0.12))
  if (cur !== target) {
    displayCount.value = cur + (cur < target ? step : -step)
  }
  raf = requestAnimationFrame(tick)
}

/* Utilities */
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function compact(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}
async function copy(t: string) {
  try { await navigator.clipboard.writeText(t) } catch {}
}

function togglePause() { paused.value = !paused.value }

/* Tap & drag */
function onTap() {
  if (dragging.value) return // ignore click after drag
  // toggle minimize / expand
  if (minimized.value) {
    minimized.value = false
  }
}
watch(minimized, v => localStorage.setItem('lvb_min', v ? '1' : '0'))

function onPointerDown(e: PointerEvent) {
  if (!draggable.value) return
  const el = badge.value
  if (!el) return
  dragging.value = false
  const rect = el.getBoundingClientRect()
  dragStart.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  pos.value = { x: rect.left, y: rect.top }

  el.setPointerCapture(e.pointerId)
  el.addEventListener('pointermove', onPointerMove)
  el.addEventListener('pointerup', onPointerUp)
}
function onPointerMove(e: PointerEvent) {
  const el = badge.value
  if (!el || !dragStart.value) return
  const nx = e.clientX - dragStart.value.x
  const ny = e.clientY - dragStart.value.y
  // clamp within viewport
  const maxX = window.innerWidth - el.offsetWidth - safePad.right
  const maxY = window.innerHeight - el.offsetHeight - safePad.bottom
  const clampedX = Math.max(safePad.left, Math.min(nx, maxX))
  const clampedY = Math.max(safePad.top, Math.min(ny, maxY))
  el.style.left = clampedX + 'px'
  el.style.top = clampedY + 'px'
  el.style.right = 'auto'
  el.style.bottom = 'auto'
  dragging.value = true
}
function onPointerUp(e: PointerEvent) {
  const el = badge.value
  if (!el) return
  el.releasePointerCapture(e.pointerId)
  el.removeEventListener('pointermove', onPointerMove)
  el.removeEventListener('pointerup', onPointerUp)
  // persist position if user dragged
  if (dragging.value) {
    const rect = el.getBoundingClientRect()
    savePos({ x: rect.left, y: rect.top })
    // slight snap opacity feedback
    el.animate?.([{ opacity: .9 }, { opacity: 1 }], { duration: 140 })
  }
  setTimeout(() => dragging.value = false, 0)
}

const POS_KEY = 'lvb_pos_v1'
function savePos(p: { x: number; y: number }) { localStorage.setItem(POS_KEY, JSON.stringify(p)) }
function readPos(): { x: number; y: number } | null {
  try { const j = localStorage.getItem(POS_KEY); return j ? JSON.parse(j) : null } catch { return null }
}
</script>

<style scoped>
.live-dot {
  width: 10px; height: 10px; border-radius: 999px; background: #ef4444;
  box-shadow: 0 0 0 0 rgba(239,68,68,.6);
  animation: live-pulse 1.4s ease-out infinite;
}
@keyframes live-pulse {
  0% { box-shadow: 0 0 0 0 rgba(239,68,68,.45) }
  70% { box-shadow: 0 0 0 8px rgba(239,68,68,0) }
  100% { box-shadow: 0 0 0 0 rgba(239,68,68,0) }
}
.ctrl-btn {
  @apply text-white/90 hover:text-white text-xs px-1 py-0.5 rounded-lg hover:bg-white/10 active:scale-95;
}

/* Respect reduced motion */
:global(.reduced-motion) .live-dot { animation: none !important; }
</style>
