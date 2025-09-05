<template>
  <div class="wrap">
    <!-- Header -->
    <header class="head">
      <h2 class="ttl">📊 Analytics Dashboard</h2>
      <small class="muted">{{ today }}</small>
    </header>

    <!-- Summary Cards -->
    <section class="cards">
      <article v-for="c in summaryCards" :key="c.title" class="card">
        <div class="icon">{{ c.icon }}</div>
        <h6 class="card-title">{{ c.title }}</h6>
        <p class="card-value">{{ c.value }}</p>
      </article>
    </section>

    <!-- Channel & Order Trends -->
    <h5 class="sect-title">📈 Channel & Order Trends</h5>
    <section class="grid">
      <article class="panel">
        <h6 class="panel-title">Messages Per Channel</h6>
        <ApexChart type="donut" width="100%" :options="messageChartOptions" :series="messageChartSeries" />
      </article>

      <article class="panel">
        <h6 class="panel-title">Orders Over Time</h6>
        <ApexChart type="line" width="100%" :options="orderChartOptions" :series="orderChartSeries" />
      </article>

      <article class="panel">
        <h6 class="panel-title">Weekly Growth</h6>
        <ApexChart type="area" width="100%" :options="growthChartOptions" :series="growthChartSeries" />
      </article>
    </section>

    <!-- Feedback & Conversion -->
    <h5 class="sect-title">📊 Feedback & Conversion Analysis</h5>
    <section class="grid two">
      <article class="panel">
        <h6 class="panel-title">Customer Feedback</h6>
        <ApexChart type="bar" width="100%" :options="feedbackChartOptions" :series="feedbackChartSeries" />
      </article>

      <article class="panel">
        <h6 class="panel-title">Conversion Rate</h6>
        <ApexChart type="donut" width="100%" :options="conversionChartOptions" :series="conversionChartSeries" />
      </article>
    </section>

    <!-- Sales & Messaging Trend -->
    <h5 class="sect-title">📉 Sales & Messaging Trend</h5>
    <section class="full">
      <article class="panel">
        <ApexChart type="line" width="100%" :options="salesTrendOptions" :series="salesTrendSeries" />
      </article>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ApexChart from 'vue3-apexcharts'

/* Date badge */
const today = computed(() =>
  new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
)

/* Summary */
const summaryCards = ref([
  { title: 'Total Customers',        value: '120',  icon: '👥' },
  { title: 'Messages Sent',          value: '854',  icon: '✉️' },
  { title: 'Orders Made',            value: '223',  icon: '🛒' },
  { title: 'Active Subscriptions',   value: '75',   icon: '🔄' }
])

/* Shared chart base */
const baseChart = {
  chart: { toolbar: { show: false }, foreColor: '#5b6574', fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial' },
  dataLabels: { enabled: false },
  legend: { position: 'bottom' },
  grid: { strokeDashArray: 4 },
  tooltip: { theme: 'light' },
  responsive: [
    { breakpoint: 640, options: { legend: { fontSize: '12px' } } }
  ]
}

/* Messages per channel */
const messageChartSeries = ref([400, 250, 150, 54])
const messageChartOptions = ref({
  ...baseChart,
  labels: ['WhatsApp', 'Telegram', 'SMS', 'Email'],
  colors: ['#00E396', '#775DD0', '#FEB019', '#FF4560'],
  plotOptions: { pie: { donut: { size: '72%' } } },
  stroke: { width: 0 }
})

/* Orders over time */
const orderChartSeries = ref([{ name: 'Orders', data: [10, 25, 15, 30, 20, 50, 60] }])
const orderChartOptions = ref({
  ...baseChart,
  colors: ['#008FFB'],
  stroke: { curve: 'smooth', width: 3 },
  xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  markers: { size: 0 }
})

/* Weekly growth */
const growthChartSeries = ref([{ name: 'Growth', data: [5, 10, 8, 12, 15, 20, 25] }])
const growthChartOptions = ref({
  ...baseChart,
  colors: ['#00BFFF'],
  stroke: { curve: 'smooth', width: 3 },
  xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } }
})

/* Feedback */
const feedbackChartSeries = ref([{ name: 'Ratings', data: [80, 40, 20] }])
const feedbackChartOptions = ref({
  ...baseChart,
  colors: ['#00C851', '#FFBB33', '#FF4444'],
  xaxis: { categories: ['Positive', 'Neutral', 'Negative'] },
  plotOptions: { bar: { columnWidth: '40%', borderRadius: 6 } }
})

/* Conversion */
const conversionChartSeries = ref([65, 35])
const conversionChartOptions = ref({
  ...baseChart,
  labels: ['Converted', 'Unconverted'],
  colors: ['#28a745', '#d9534f'],
  plotOptions: { pie: { donut: { size: '70%' } } },
  stroke: { width: 0 }
})

/* Sales & Messaging Trend */
const salesTrendSeries = ref([
  { name: 'Sales',    type: 'column', data: [20, 40, 35, 60, 50, 70, 90] },
  { name: 'Messages', type: 'line',   data: [200,180,220,240,260,280,300] }
])
const salesTrendOptions = ref({
  ...baseChart,
  colors: ['#17a2b8', '#6f42c1'],
  stroke: { curve: 'smooth', width: [0, 3] },
  xaxis: { categories: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
  plotOptions: { bar: { columnWidth: '42%', borderRadius: 6 } },
  fill: { opacity: [1, 1] }
})
</script>

<style scoped>
/* Tokens */
:root{
  --bg:#ffffff;
  --fg:#0f172a;
  --muted:#6b7280;
  --primary:#0A1C3D;
  --card:#ffffff;
  --ring:#e5e7eb;
  --shadow:0 10px 25px rgba(0,0,0,.06);
}

/* Wrapper */
.wrap{ max-width:1100px; margin-inline:auto; padding:16px; background:var(--bg); color:var(--fg); }

/* Header */
.head{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px; }
.ttl{ font-weight:800; font-size:1.2rem; margin:0; }
.muted{ color:var(--muted); }

/* Summary cards grid (mobile-first) */
.cards{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap:12px;
  margin: 14px 0 26px;
}
.card{
  background:var(--card); border:1px solid var(--ring);
  border-radius:16px; padding:16px; box-shadow:var(--shadow);
  text-align:center;
}
.icon{ font-size:1.6rem; }
.card-title{ margin:.4rem 0 .1rem; font-weight:700; color:#334155; }
.card-value{ margin:0; font-weight:900; font-size:1.25rem; color:#2563eb; }

/* Section titles */
.sect-title{ margin:6px 0 10px; font-weight:800; color:#111827; }

/* Panels / charts */
.grid{
  display:grid;
  grid-template-columns: 1fr;
  gap:12px;
  margin-bottom:22px;
}
.grid.two{ grid-template-columns: 1fr; }
.full{ margin-bottom:28px; }
.panel{
  background:var(--card); border:1px solid var(--ring);
  border-radius:18px; padding:16px; box-shadow:var(--shadow);
}
.panel-title{ margin:0 0 10px; font-weight:800; color:#0A1C3D; }

/* Larger screens */
@media (min-width: 720px){
  .ttl{ font-size:1.4rem; }
  .cards{ grid-template-columns: repeat(4, 1fr); }
  .grid{ grid-template-columns: repeat(3, 1fr); }
  .grid.two{ grid-template-columns: repeat(2, 1fr); }
}

/* Dark-mode friendly (optional if body has .dark) */
:global(.dark) .wrap{ --bg:#0f172a; --fg:#e5e7eb; --card:#111827; --ring:#1f2937; --muted:#94a3b8; --shadow:0 8px 20px rgba(0,0,0,.35); }
:global(.dark) .panel-title{ color:#ffd700; }
:global(.dark) .card-value{ color:#60a5fa; }
</style>
