<template>
  <div class="container-fluid py-4">
    <!-- Page Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="fw-bold text-primary d-flex align-items-center gap-2">
        <i class="bi bi-bar-chart-line-fill"></i> {{ $t("analytics") }}
      </h2>

      <div class="d-flex align-items-center gap-2">
        <select v-model="selectedRange" class="form-select w-auto" aria-label="Select range">
          <option value="today">Today</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="custom">Custom Range</option>
        </select>

        <!-- Custom range inputs -->
        <div v-if="selectedRange === 'custom'" class="d-flex align-items-center gap-2">
          <input type="date" class="form-control" v-model="customStart" :max="customEnd || today"
                 aria-label="Start date" />
          <span class="text-muted">—</span>
          <input type="date" class="form-control" v-model="customEnd" :min="customStart" :max="today"
                 aria-label="End date" />
          <button class="btn btn-outline-primary" @click="applyCustomRange" :disabled="!customStart || !customEnd">
            Apply
          </button>
        </div>
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="row g-4 mb-4">
      <div class="col-md-4" v-for="stat in stats" :key="stat.title">
        <div class="card shadow-sm rounded-3 border-0 h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="bg-primary bg-opacity-10 text-primary rounded-circle p-3 fs-4">
              {{ stat.icon }}
            </div>
            <div class="flex-grow-1">
              <h6 class="mb-1 text-muted text-uppercase small">{{ $t(stat.title) }}</h6>
              <div class="d-flex align-items-baseline justify-content-between">
                <h4 class="fw-bold mb-0">{{ stat.value }}</h4>
                <small
                  class="ms-3"
                  :class="stat.delta >= 0 ? 'text-success' : 'text-danger'">
                  <i :class="stat.delta >= 0 ? 'bi bi-arrow-up-right' : 'bi bi-arrow-down-right'"></i>
                  {{ Math.abs(stat.delta) }}%
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Analytics Chart -->
    <div class="card shadow-sm border-0 rounded-3">
      <div class="card-body">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h5 class="card-title fw-bold text-primary mb-0 d-flex align-items-center gap-2">
            <i class="bi bi-graph-up-arrow"></i> {{ $t('activity_trend') }}
          </h5>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-secondary" @click="refreshData">
              <i class="bi bi-arrow-repeat me-1"></i> Refresh
            </button>
            <button class="btn btn-outline-secondary" @click="exportChartPng" :disabled="!chartReady">
              <i class="bi bi-image me-1"></i> Export PNG
            </button>
            <button class="btn btn-outline-primary" @click="exportCsv" :disabled="!chartReady">
              <i class="bi bi-download me-1"></i> Export CSV
            </button>
          </div>
        </div>

        <div style="height: 420px">
          <canvas ref="chartEl" aria-label="Activity chart" role="img"></canvas>
        </div>

        <p v-if="!chartReady" class="text-muted small mt-3">
          <i class="bi bi-hourglass-split me-1"></i> Preparing chart…
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'

/**
 * Why dynamic import?
 * - Prevents bundlers from choking on 'chart.js/auto' during SSR/CI if deps are missing.
 * - Lets us register only when needed.
 */
let ChartJS = null
let chartInstance = null

const chartEl = ref(null)
const chartReady = ref(false)

const selectedRange = ref('7days')
const customStart = ref('')
const customEnd = ref('')

// For the date inputs’ max= attribute (today)
const today = new Date().toISOString().slice(0, 10)

const stats = ref([
  { title: 'messages_sent', value: '5,320', delta: 4.2, icon: '✉️' },
  { title: 'active_users', value: '1,287', delta: -1.8, icon: '👥' },
  { title: 'conversion_rate', value: '7.4%', delta: 0.9, icon: '⚡' },
])

/* ---------------------- Helpers ---------------------- */
const formatLabel = (d) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit' }).format(d)

function daysBetween(start, end) {
  const out = []
  const cur = new Date(start)
  const stop = new Date(end)
  while (cur <= stop) {
    out.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

function getPresetRange(rangeKey) {
  const end = new Date()
  const start = new Date()
  if (rangeKey === 'today') {
    // keep same day
  } else if (rangeKey === '7days') {
    start.setDate(end.getDate() - 6)
  } else if (rangeKey === '30days') {
    start.setDate(end.getDate() - 29)
  } else {
    // custom handled elsewhere
  }
  return { start, end }
}

/* Create labels based on current selection */
const labels = computed(() => {
  if (selectedRange.value === 'custom' && customStart.value && customEnd.value) {
    const ds = daysBetween(new Date(customStart.value), new Date(customEnd.value))
    return ds.map(formatLabel)
  }
  const { start, end } = getPresetRange(selectedRange.value)
  return daysBetween(start, end).map(formatLabel)
})

/* Mock dataset generator (replace with real API data later) */
function generateSeries(n) {
  // nice gentle trend with noise
  const out = []
  let base = 400 + Math.random() * 200
  for (let i = 0; i < n; i++) {
    base += (Math.random() - 0.45) * 40
    out.push(Math.max(0, Math.round(base)))
  }
  return out
}

const dataset = computed(() => generateSeries(labels.value.length))

/* ---------------------- Chart Logic ---------------------- */
async function ensureChartJs() {
  if (!ChartJS) {
    const mod = await import('chart.js')
    // Register everything we might need
    mod.Chart.register(...mod.registerables)
    ChartJS = mod.Chart
  }
}

function destroyChart() {
  chartInstance?.destroy()
  chartInstance = null
}

async function renderChart() {
  chartReady.value = false
  await ensureChartJs()
  destroyChart()
  const ctx = chartEl.value.getContext('2d')

  chartInstance = new ChartJS(ctx, {
    type: 'line',
    data: {
      labels: labels.value,
      datasets: [
        {
          label: 'Messages',
          data: dataset.value,
          fill: true,
          tension: 0.35,
          backgroundColor: 'rgba(13,110,253,0.12)',
          borderColor: '#0d6efd',
          pointBackgroundColor: '#0d6efd',
          pointRadius: 3,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          labels: { color: '#6c757d' }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#6c757d' },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#6c757d',
            callback: (v) => v.toLocaleString()
          },
          grid: { color: '#e9ecef' }
        }
      }
    }
  })

  chartReady.value = true
}

function applyCustomRange() {
  // Simply triggers computed -> watcher -> renderChart
  if (customStart.value && customEnd.value) {
    // normalize if user inverted
    if (new Date(customStart.value) > new Date(customEnd.value)) {
      const tmp = customStart.value
      customStart.value = customEnd.value
      customEnd.value = tmp
    }
    // re-render will be triggered by watcher
  }
}

function refreshData() {
  // new random data (in a real app, fetch fresh API data)
  renderChart()
}

/* ---------------------- Exporters ---------------------- */
function exportCsv() {
  if (!chartInstance) return
  const labelsArr = chartInstance.data.labels || []
  const dataArr = (chartInstance.data.datasets?.[0]?.data || []).map(String)

  let csv = 'label,value\n'
  for (let i = 0; i < labelsArr.length; i++) {
    // Basic CSV escaping
    const l = `"${String(labelsArr[i]).replace(/"/g, '""')}"`
    const v = `"${String(dataArr[i]).replace(/"/g, '""')}"`
    csv += `${l},${v}\n`
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `analytics_${selectedRange.value}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function exportChartPng() {
  if (!chartInstance) return
  const url = chartInstance.toBase64Image('image/png', 1)
  const a = document.createElement('a')
  a.href = url
  a.download = 'activity_chart.png'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/* ---------------------- Lifecycle ---------------------- */
onMounted(() => {
  renderChart()
})

onBeforeUnmount(() => {
  destroyChart()
})

watch([selectedRange, customStart, customEnd], () => {
  // Avoid rendering on half-filled custom range
  if (selectedRange.value === 'custom' && (!customStart.value || !customEnd.value)) return
  renderChart()
})
</script>

<style scoped>
.card {
  background: #fff;
}
</style>
