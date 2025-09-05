<!-- src/views/CampaignAnalytics.vue -->
<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-xl font-bold">📊 Campaign Analytics</h2>

      <!-- Filters & Toggles -->
      <div class="flex items-center gap-3">
        <select v-model="filter" class="border rounded px-3 py-1.5">
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
        </select>

        <label class="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" v-model="showMessages" class="accent-indigo-600" />
          <span class="inline-flex items-center gap-1">
            <span class="h-3 w-3 inline-block rounded-sm" style="background:#6366F1"></span>
            Messages
          </span>
        </label>
        <label class="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" v-model="showCoins" class="accent-emerald-600" />
          <span class="inline-flex items-center gap-1">
            <span class="h-3 w-3 inline-block rounded-sm" style="background:#10B981"></span>
            SmartCoins
          </span>
        </label>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard title="Messages Sent" :value="summary.messages_sent" />
      <SummaryCard title="SmartCoins Used" :value="summary.smartcoins_used" />
      <SummaryCard title="SmartCoins Earned" :value="summary.smartcoins_earned" />
      <SummaryCard title="Replies" :value="summary.replies" />
    </div>

    <!-- Chart -->
    <div
      class="bg-white rounded-2xl shadow p-4 md:p-6 border border-gray-100 relative"
      @mousemove="onMouseMove"
      @mouseleave="activeIdx = null"
    >
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-semibold text-gray-700">Trend</h3>
        <span v-if="loading" class="text-xs text-gray-400">Loading…</span>
      </div>

      <div class="relative w-full h-72">
        <svg :viewBox="`0 0 ${width} ${height}`" class="w-full h-full">
          <!-- Grid -->
          <g stroke="#E5E7EB" stroke-width="1">
            <line v-for="y in 4" :key="'grid-'+y"
                  :x1="padding.left" :x2="width - padding.right"
                  :y1="yLine(y)" :y2="yLine(y)" />
          </g>

          <!-- Axes -->
          <g stroke="#9CA3AF" stroke-width="1">
            <line :x1="padding.left" :x2="width - padding.right"
                  :y1="height - padding.bottom" :y2="height - padding.bottom" />
            <line :x1="padding.left" :x2="padding.left"
                  :y1="padding.top" :y2="height - padding.bottom" />
          </g>

          <!-- X ticks -->
          <g fill="#6B7280" font-size="11" text-anchor="middle">
            <template v-for="(d,i) in xTicks" :key="'tick-'+i">
              <text :x="xAtIndex(d.i)" :y="height - padding.bottom + 18">
                {{ d.label }}
              </text>
            </template>
          </g>

          <!-- Lines -->
          <path v-if="showMessages && messagesPath"
                :d="messagesPath"
                fill="none" stroke="#6366F1" stroke-width="2.5"
                :style="{ filter: 'drop-shadow(0 0 0.5px #6366F1)' }">
            <animate attributeName="stroke-dasharray" from="0,10000" to="10000,0" dur="0.6s" fill="freeze"/>
          </path>

          <path v-if="showCoins && coinsPath"
                :d="coinsPath"
                fill="none" stroke="#10B981" stroke-width="2.5"
                :style="{ filter: 'drop-shadow(0 0 0.5px #10B981)' }">
            <animate attributeName="stroke-dasharray" from="0,10000" to="10000,0" dur="0.6s" fill="freeze"/>
          </path>

          <!-- Hover marker -->
          <g v-if="activeIdx !== null && points.length">
            <line
              :x1="xAtIndex(activeIdx)" :x2="xAtIndex(activeIdx)"
              :y1="padding.top" :y2="height - padding.bottom"
              stroke="#E5E7EB" stroke-width="1.25"
            />
            <circle v-if="showMessages"
                    :cx="xAtIndex(activeIdx)" :cy="yFor(messages[activeIdx])"
                    r="4" fill="#6366F1" />
            <circle v-if="showCoins"
                    :cx="xAtIndex(activeIdx)" :cy="yFor(coins[activeIdx])"
                    r="4" fill="#10B981" />
          </g>
        </svg>

        <!-- Tooltip -->
        <div
          v-if="tooltip"
          class="absolute text-xs bg-white shadow-lg border border-gray-100 rounded px-2 py-1 pointer-events-none"
          :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        >
          <div class="font-medium text-gray-700">{{ tooltip.date }}</div>
          <div class="text-gray-600" v-if="showMessages">Messages: <span class="font-semibold">{{ tooltip.msg }}</span></div>
          <div class="text-gray-600" v-if="showCoins">SmartCoins: <span class="font-semibold">{{ tooltip.coins }}</span></div>
        </div>
      </div>

      <!-- Empty/Error states -->
      <div v-if="!loading && !chartData.length" class="text-sm text-gray-500 mt-3">
        {{ error || 'No data to display.' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import axios from '@/utils/axios'

/** ---------- UI State ---------- */
const summary = ref({ messages_sent: 0, smartcoins_used: 0, smartcoins_earned: 0, replies: 0 })
const chartData = ref([]) // [{ date, messages_sent, smartcoins_used }]
const filter = ref('7')
const loading = ref(false)
const error = ref('')

/** ---------- Chart Controls ---------- */
const showMessages = ref(true)
const showCoins = ref(true)

/** ---------- Fetch ---------- */
async function fetchData () {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get(`/analytics/campaign-summary?days=${filter.value}`)
    summary.value = res.data?.summary ?? summary.value
    chartData.value = Array.isArray(res.data?.trend) ? res.data.trend : []
  } catch (e) {
    error.value = 'Failed to load analytics. Showing empty state.'
    chartData.value = []
  } finally {
    loading.value = false
  }
}
watch(filter, fetchData)
onMounted(fetchData)

/** ---------- Chart Math (pure SVG) ---------- */
const width = 800
const height = 300
const padding = { top: 16, right: 16, bottom: 36, left: 44 }

const innerW = computed(() => width - padding.left - padding.right)
const innerH = computed(() => height - padding.top - padding.bottom)

const messages = computed(() => chartData.value.map(d => Number(d?.messages_sent ?? 0)))
const coins = computed(() => chartData.value.map(d => Number(d?.smartcoins_used ?? 0)))
const dates = computed(() => chartData.value.map(d => String(d?.date ?? '')))

const yMax = computed(() => {
  const all = [...messages.value, ...coins.value].filter(n => Number.isFinite(n))
  return Math.max(1, ...all, 0)
})

function xAtIndex (i) {
  const n = Math.max(1, dates.value.length - 1)
  const step = innerW.value / n
  return padding.left + step * i
}
function yFor (v) {
  const ratio = v / yMax.value
  return padding.top + innerH.value * (1 - ratio)
}

function buildPath (vals) {
  if (!vals.length) return ''
  return vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAtIndex(i)} ${yFor(v)}`).join(' ')
}

const messagesPath = computed(() => buildPath(messages.value))
const coinsPath = computed(() => buildPath(coins.value))

/** X ticks (first, middle, last or upto 5 evenly spaced) */
const xTicks = computed(() => {
  const n = dates.value.length
  if (!n) return []
  const pick = n <= 5
    ? Array.from({ length: n }, (_, i) => i)
    : [0, Math.round(n * 0.25), Math.round(n * 0.5), Math.round(n * 0.75), n - 1]
  return [...new Set(pick)]
    .filter(i => i >= 0 && i < n)
    .map(i => ({ i, label: dates.value[i] }))
})

function yLine (k) {
  // 4 grid lines between top & bottom
  const t = (k - 1) / 4
  return padding.top + innerH.value * t
}

/** ---------- Hover / Tooltip ---------- */
const activeIdx = ref(null)
const tooltip = ref(null)

function onMouseMove (evt) {
  if (!dates.value.length) return
  const rect = evt.currentTarget.getBoundingClientRect()
  const x = evt.clientX - rect.left
  const clamped = Math.max(padding.left, Math.min(width - padding.right, x))
  const n = Math.max(1, dates.value.length - 1)
  const step = innerW.value / n
  const i = Math.round((clamped - padding.left) / step)
  activeIdx.value = Math.max(0, Math.min(dates.value.length - 1, i))

  const tx = xAtIndex(activeIdx.value)
  const ty = Math.min(
    yFor(messages.value[activeIdx.value] ?? 0),
    yFor(coins.value[activeIdx.value] ?? 0)
  ) - 40

  tooltip.value = {
    x: Math.min(Math.max(tx - 50, 8), rect.width - 120),
    y: Math.max(ty, 8),
    date: dates.value[activeIdx.value],
    msg: messages.value[activeIdx.value] ?? 0,
    coins: coins.value[activeIdx.value] ?? 0
  }
}
</script>

<!-- Tiny reusable summary card -->
<script setup name="SummaryCard">
defineProps({
  title: { type: String, required: true },
  value: { type: [Number, String], default: 0 }
})
</script>
<template #SummaryCard="{ title, value }">
  <div class="p-4 bg-white rounded-2xl shadow border border-gray-100">
    <h3 class="text-sm text-gray-500">{{ title }}</h3>
    <p class="mt-1 text-2xl font-bold tabular-nums">{{ value }}</p>
  </div>
</template>

<style scoped>
/* optional: nicer font rendering for the chart */
svg { shape-rendering: geometricPrecision; }
</style>
