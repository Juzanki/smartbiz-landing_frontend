<!-- src/components/UserAnalyticsView.vue -->
<template>
  <section class="p-4 sm:p-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-2 mb-4">
      <div class="min-w-0">
        <h1 class="text-xl sm:text-2xl font-bold text-blue-900 dark:text-white">Analytics Overview</h1>
        <p class="text-xs text-gray-500 dark:text-white/60">Updated: <span aria-live="polite">{{ lastUpdated }}</span></p>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="refresh"
          :title="loading ? 'Refreshing…' : 'Refresh'"
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10"
          aria-label="Refresh"
        >
          <svg class="w-5 h-5" :class="loading && !reducedMotion ? 'animate-spin' : ''" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M3.3 10a6.7 6.7 0 1 1 2 4.74l1.4-1.4A4.7 4.7 0 1 0 5.3 10H3.3zM10 16.7c-1.8 0-3.45-.73-4.64-1.92l-1.41 1.41A8.7 8.7 0 1 0 10 1.3v2a6.7 6.7 0 1 1 0 13.4z"/>
          </svg>
        </button>
        <button
          @click="exportCsv"
          class="px-3 py-2 rounded-lg bg-gray-900 text-white dark:bg-white dark:text-black text-xs font-medium active:scale-95"
          aria-label="Export CSV"
        >
          Export CSV
        </button>
      </div>
    </div>

    <!-- Filters (thumb-reach on mobile) -->
    <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-2 mb-3" role="tablist" aria-label="Date range">
      <button
        v-for="r in ranges" :key="r.key" @click="range = r.key"
        class="px-3 h-9 rounded-full text-sm whitespace-nowrap"
        :class="range===r.key
          ? 'bg-blue-700 text-white'
          : 'bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white'"
        role="tab" :aria-selected="String(range===r.key)"
      >
        {{ r.label }}
      </button>
    </div>

    <!-- Summary cards: horizontal rail on mobile, grid on md+ -->
    <div class="md:grid md:grid-cols-3 gap-4 md:gap-6 mb-6">
      <div
        class="flex md:hidden gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-1 px-1 pb-1"
        role="listbox" aria-label="Summary"
      >
        <SummaryCard
          v-for="c in cards" :key="c.label" class="snap-start min-w-[220px]" :card="c"
        />
      </div>

      <SummaryCard
        v-for="c in cards" :key="c.label"
        class="hidden md:block"
        :card="c"
      />
    </div>

    <!-- Chart panel -->
    <div class="bg-white dark:bg-[#0b0b10] p-4 sm:p-6 rounded-xl shadow border border-gray-200 dark:border-white/10">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-base sm:text-lg font-semibold text-blue-900 dark:text-white">User Activity</h2>
        <span class="text-xs text-gray-500 dark:text-white/60">{{ prettyRangeLabel }}</span>
      </div>

      <div v-if="loading" class="animate-pulse">
        <div class="h-40 rounded-xl bg-gray-200 dark:bg:white/10 dark:bg-white/10"></div>
      </div>

      <canvas
        v-else
        ref="canvasRef"
        class="w-full h-40 sm:h-56"
        aria-label="User Activity Chart"
        role="img"
      ></canvas>

      <!-- Mini legend -->
      <div class="flex flex-wrap gap-3 mt-3 text-xs text-gray-600 dark:text-white/70" aria-live="polite">
        <div class="flex items-center gap-1">
          <span class="inline-block w-3 h-3 rounded-sm bg-current"></span> Active Users
        </div>
        <div>Avg: <strong>{{ fmtNumber(stats.avg) }}</strong></div>
        <div>Peak: <strong>{{ fmtNumber(stats.max) }}</strong></div>
        <div>Min: <strong>{{ fmtNumber(stats.min) }}</strong></div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch, defineComponent, PropType } from 'vue'

/* ---------------- Types ---------------- */
type Point = { date: string; value: number }
type CardT = { label: string; value: string | number; delta?: number; trend?: 'up'|'down'|'flat'; series?: number[] }

/* ---------------- Ranges ---------------- */
const ranges = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
] as const
type RangeKey = typeof ranges[number]['key']

/* ---------------- State ---------------- */
const range = ref<RangeKey>('30d')
const loading = ref(true)
const lastUpdated = ref(new Date().toLocaleString())
const reducedMotion = ref<boolean>(matchMediaSafe('(prefers-reduced-motion: reduce)')?.matches ?? false)

/* ---------------- Series + Canvas ---------------- */
const series = ref<Point[]>([]) // most recent last
const canvasRef = ref<HTMLCanvasElement | null>(null)
let resizeObs: ResizeObserver | null = null
let rAF: number | null = null
let themeMQ: MediaQueryList | null = null
let motionMQ: MediaQueryList | null = null

/* ---------------- Lifecycle ---------------- */
onMounted(async () => {
  await simulateLoad()
  draw()
  observeResize()
  // redraw when theme changes
  themeMQ = matchMediaSafe('(prefers-color-scheme: dark)')
  themeMQ?.addEventListener?.('change', draw)
  // reduced motion watcher
  motionMQ = matchMediaSafe('(prefers-reduced-motion: reduce)')
  motionMQ?.addEventListener?.('change', (e: MediaQueryListEvent) => reducedMotion.value = e.matches)
  // keyboard left/right to switch ranges
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  resizeObs?.disconnect()
  if (rAF) cancelAnimationFrame(rAF)
  themeMQ?.removeEventListener?.('change', draw)
  motionMQ?.removeEventListener?.('change', () => {})
  window.removeEventListener('keydown', onKey)
})

watch(range, () => nextTickDraw())

/* ---------------- Data load (demo) ---------------- */
async function simulateLoad() {
  loading.value = true
  await sleep(450)                      // skeleton state
  series.value = generateDemo(120)      // 120 days
  loading.value = false
  lastUpdated.value = new Date().toLocaleString()
}

/* ---------------- Computed ---------------- */
const sliced = computed(() => {
  const take = range.value === '7d' ? 7 : range.value === '30d' ? 30 : 90
  return series.value.slice(-take)
})

const stats = computed(() => {
  const arr = sliced.value.map(p => p.value)
  const sum = arr.reduce((a,b)=>a+b,0)
  const avg = arr.length ? sum / arr.length : 0
  const min = arr.length ? Math.min(...arr) : 0
  const max = arr.length ? Math.max(...arr) : 0
  return { avg, min, max, last: arr[arr.length-1] ?? 0, first: arr[0] ?? 0 }
})

const growthPct = computed(() => {
  const { first, last } = stats.value
  if (!first) return 0
  return ((last - first) / first) * 100
})

const bounceRate = computed(() => {
  // Demo: inversely related to avg users
  const v = Math.max(10, 60 - (stats.value.avg / 50))
  return Math.round(v)
})

const cards = computed<CardT[]>(() => [
  {
    label: 'Active Users',
    value: fmtNumber(stats.value.last),
    delta: Math.round(growthPct.value * 10) / 10,
    trend: growthPct.value > 0.5 ? 'up' : growthPct.value < -0.5 ? 'down' : 'flat',
    series: sliced.value.map(p=>p.value).slice(-14)
  },
  {
    label: 'Monthly Growth',
    value: `${Math.round(growthPct.value*10)/10}%`,
    delta: Math.round((growthPct.value - 0) * 10) / 10,
    trend: growthPct.value >= 0 ? 'up' : 'down',
    series: sliced.value.map(p=>p.value).slice(-14)
  },
  {
    label: 'Bounce Rate',
    value: `${bounceRate.value}%`,
    delta: -Math.round((growthPct.value/8)*10)/10,
    trend: bounceRate.value <= 35 ? 'up' : 'down',
    series: sliced.value.map(p=>p.value).slice(-14)
  }
])

const prettyRangeLabel = computed(() => {
  const a = sliced.value[0]?.date
  const b = sliced.value[sliced.value.length-1]?.date
  return a && b ? `${a} → ${b}` : ''
})

/* ---------------- Chart (vanilla Canvas) ---------------- */
function nextTickDraw() {
  if (rAF) cancelAnimationFrame(rAF)
  rAF = requestAnimationFrame(draw)
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = Math.max(1, window.devicePixelRatio || 1)
  const parent = canvas.parentElement!
  const rect = parent.getBoundingClientRect()
  const width = Math.floor(rect.width)
  const height = Math.max(180, Math.floor(rect.height))

  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // background
  const dark = matchMediaSafe('(prefers-color-scheme: dark)')?.matches ?? false
  ctx.fillStyle = dark ? '#0b0b10' : '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // axes baseline
  ctx.strokeStyle = dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)'
  ctx.lineWidth = 1
  const pad = 16
  ctx.beginPath()
  ctx.moveTo(pad, height - pad)
  ctx.lineTo(width - pad, height - pad)
  ctx.stroke()

  // data
  const data = sliced.value.map(p => p.value)
  if (!data.length) return
  const min = Math.min(...data)
  const max = Math.max(...data)
  const rng = Math.max(1, max - min)

  // gradient line color
  const grad = ctx.createLinearGradient(0, 0, 0, height)
  grad.addColorStop(0, dark ? '#7dd3fc' : '#1e3a8a')
  grad.addColorStop(1, dark ? '#a78bfa' : '#2563eb')

  // area
  ctx.beginPath()
  data.forEach((v, i) => {
    const x = pad + (i/(data.length-1)) * (width - pad*2)
    const y = pad + (1 - (v - min)/rng) * (height - pad*2)
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
  })
  ctx.lineTo(width - pad, height - pad)
  ctx.lineTo(pad, height - pad)
  ctx.closePath()
  ctx.fillStyle = dark ? 'rgba(167,139,250,.12)' : 'rgba(37,99,235,.10)'
  ctx.fill()

  // line
  ctx.beginPath()
  data.forEach((v, i) => {
    const x = pad + (i/(data.length-1)) * (width - pad*2)
    const y = pad + (1 - (v - min)/rng) * (height - pad*2)
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
  })
  ctx.strokeStyle = grad
  ctx.lineWidth = 2
  ctx.stroke()

  // last point dot
  const last = data.length - 1
  const lx = pad + (last/(data.length-1)) * (width - pad*2)
  const ly = pad + (1 - (data[last] - min)/rng) * (height - pad*2)
  ctx.beginPath()
  ctx.arc(lx, ly, 3, 0, Math.PI*2)
  ctx.fillStyle = dark ? '#a78bfa' : '#1e3a8a'
  ctx.fill()
}

/* ---------------- Actions ---------------- */
async function refresh() {
  if (loading.value) return
  loading.value = true
  await sleep(400)
  // Append a new point to simulate fresh data
  const next = series.value[series.value.length-1]?.value ?? 120
  const jitter = Math.max(20, Math.round(next + (Math.random()*14-7)))
  const today = new Date()
  today.setDate(today.getDate()+1)
  series.value.push({ date: fmtDate(today), value: jitter })
  loading.value = false
  lastUpdated.value = new Date().toLocaleString()
  nextTickDraw()
}

function exportCsv() {
  const rows = [['Date','Active Users']]
  sliced.value.forEach(p => rows.push([p.date, String(p.value)]))
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `analytics_${range.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ---------------- Utilities ---------------- */
function fmtNumber(n: number) {
  return new Intl.NumberFormat().format(Math.round(n))
}
function fmtDate(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth()+1).padStart(2,'0')
  const dd = String(d.getDate()).padStart(2,'0')
  return `${yyyy}-${mm}-${dd}`
}
function generateDemo(days: number): Point[] {
  const out: Point[] = []
  const start = new Date()
  start.setDate(start.getDate() - (days-1))
  let base = 100 + Math.random()*40
  for (let i=0; i<days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate()+i)
    base += Math.random()*10 - 5 // wander
    const value = Math.round(Math.max(30, base + Math.sin(i/6)*12 + (i%13===0?12:0)))
    out.push({ date: fmtDate(d), value })
  }
  return out
}
function observeResize() {
  const el = canvasRef.value?.parentElement
  if (!el) return
  resizeObs = new ResizeObserver(() => nextTickDraw())
  resizeObs.observe(el)
}
function matchMediaSafe(q: string){ try { return window.matchMedia?.(q) ?? null } catch { return null } }
function onKey(e: KeyboardEvent){
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const idx = ranges.findIndex(r => r.key === range.value)
    const next = e.key === 'ArrowRight' ? Math.min(idx+1, ranges.length-1) : Math.max(idx-1, 0)
    range.value = ranges[next].key
  }
}
function sleep(ms:number){ return new Promise(r => setTimeout(r, ms)) }

/* ---------------- Inline component: SummaryCard ---------------- */
const SummaryCard = defineComponent({
  name: 'SummaryCard',
  props: {
    card: { type: Object as PropType<CardT>, required: true }
  },
  methods: {
    buildLine(arr: number[]) {
      const min = Math.min(...arr), max = Math.max(...arr)
      const rng = Math.max(1, max - min)
      let d = ''
      arr.forEach((v, i) => {
        const x = (i/(arr.length-1))*100
        const y = 4 + (1 - (v-min)/rng) * 20
        d += (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2) + ' '
      })
      return d.trim()
    }
  },
  computed: {
    badgeCls(): string {
      const t = (this.card?.trend || 'flat') as 'up'|'down'|'flat'
      return t==='up' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
           : t==='down' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
           : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white/70'
    }
  },
  template: `
  <div class="bg-white dark:bg-[#0b0b10] rounded-xl shadow p-4 border border-gray-200 dark:border-white/10">
    <div class="flex items-start justify-between">
      <h2 class="text-xs sm:text-sm text-gray-600 dark:text-white/70">{{ card.label }}</h2>
      <span v-if="card.delta !== undefined"
            :class="['px-1.5 py-0.5 rounded text-[10px] font-semibold', badgeCls]">
        <span v-if="card.trend==='up'">▲</span>
        <span v-else-if="card.trend==='down'">▼</span>
        <span v-else>▪</span>
        {{ card.delta }}%
      </span>
    </div>
    <p class="mt-1 text-xl sm:text-2xl font-semibold text-blue-900 dark:text-white">{{ card.value }}</p>

    <svg v-if="card.series && card.series.length" viewBox="0 0 100 28" class="mt-2 w-full h-7">
      <defs>
        <linearGradient id="sgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.35"></stop>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0.05"></stop>
        </linearGradient>
      </defs>
      <path :d="buildLine(card.series) + ' L100 28 L0 28 Z'" fill="url(#sgrad)"></path>
      <path :d="buildLine(card.series)" fill="none" stroke="currentColor" stroke-width="1.5"></path>
    </svg>
  </div>
  `
})
</script>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }

@media (prefers-reduced-motion: reduce) {
  .animate-spin { animation: none !important; }
  .active\:scale-95:active { transform: none !important; }
}
</style>
