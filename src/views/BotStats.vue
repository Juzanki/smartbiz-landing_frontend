<!-- src/views/BotOverviewMobile.vue -->
<template>
  <div class="app">
    <!-- Sticky App Bar -->
    <header class="appbar">
      <div class="title">
        <h1>Bot Overview</h1>
        <p>Bot: <strong>{{ botName }}</strong></p>
      </div>

      <div class="chips">
        <button :class="['chip', range==='7d' && 'active']" @click="setRange('7d')">7 days</button>
        <button :class="['chip', range==='30d' && 'active']" @click="setRange('30d')">30 days</button>
      </div>
    </header>

    <main class="pad">
      <!-- Stat Summary -->
      <section class="stats">
        <div class="stat-card">
          <div class="k">Responses</div>
          <div class="v">{{ stats.total_responses.toLocaleString() }}</div>
        </div>
        <div class="stat-card ok">
          <div class="k">Successes</div>
          <div class="v">{{ stats.successes.toLocaleString() }}</div>
        </div>
        <div class="stat-card bad">
          <div class="k">Errors</div>
          <div class="v">{{ stats.errors.toLocaleString() }}</div>
        </div>
        <div class="stat-card warn">
          <div class="k">Leads</div>
          <div class="v">{{ stats.leads.toLocaleString() }}</div>
        </div>
      </section>

      <!-- Activity Chart -->
      <section class="card">
        <div class="card-head">
          <h2 class="card-title">Usage Trend ({{ rangeLabel }})</h2>
          <div class="legend">
            <span class="dot primary"></span> Messages
          </div>
        </div>

        <div class="chart-wrap">
          <VueApexCharts
            width="100%"
            height="250"
            type="line"
            :options="chartOptions"
            :series="chartSeries"
          />
        </div>
      </section>

      <!-- Integrations -->
      <section class="card">
        <h2 class="card-title">Integrations</h2>
        <ul class="integrations">
          <li v-for="(integration, i) in integrations" :key="i" class="int-item">
            <span class="int-name">{{ integration.platform }}</span>
            <span class="badge" :class="badgeClass(integration.status)">{{ integration.status }}</span>
          </li>
        </ul>
      </section>

      <!-- Actions -->
      <section class="cta-block">
        <button class="btn ghost" @click="refresh">Refresh</button>
        <button class="btn primary" @click="goToIntegrations">View Integrations</button>
      </section>
    </main>

    <!-- Sticky Footer Bar -->
    <footer class="footerbar">
      <div class="bar">
        <div class="sum">
          <span class="label">Today</span>
          <strong class="val">{{ todayCount.toLocaleString() }} messages</strong>
        </div>
        <button class="cta" @click="goToLogs">View Logs</button>
      </div>

      <transition name="toast"><div v-if="msg" class="toast ok">{{ msg }}</div></transition>
      <transition name="toast"><div v-if="err" class="toast bad">{{ err }}</div></transition>
    </footer>
  </div>
</template>

<script setup>
/**
 * Mobile-first Bot Overview (ApexCharts)
 * - Replaces Recharts with vue3-apexcharts (native for Vue)
 * - Dark themed, smooth line, mobile-optimized
 */
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import VueApexCharts from 'vue3-apexcharts'

const route = useRoute()
const router = useRouter()
const botId = route.params.id || 1
const botName = 'Assistant Mary'

const range = ref('7d') // '7d' | '30d'
const msg = ref('')
const err = ref('')

const stats = ref({
  total_responses: 1240,
  successes: 1105,
  errors: 135,
  leads: 342
})

const weeklyStats = ref([
  { day: 'Saturday', messages: 100 },
  { day: 'Sunday', messages: 180 },
  { day: 'Monday', messages: 220 },
  { day: 'Tuesday', messages: 170 },
  { day: 'Wednesday', messages: 260 },
  { day: 'Thursday', messages: 200 },
  { day: 'Friday', messages: 210 }
])

const monthlyStats = ref(Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  messages: 120 + Math.round(Math.sin(i / 3) * 40) + Math.floor(Math.random() * 30)
})))

const integrations = ref([
  { platform: 'WhatsApp',     status: 'Connected' },
  { platform: 'Instagram DM', status: 'Pending' },
  { platform: 'Telegram Bot', status: 'Connected' }
])

const todayCount = computed(() => {
  const list = range.value === '7d' ? weeklyStats.value : monthlyStats.value
  const last = list[list.length - 1]
  return last?.messages || 0
})
const rangeLabel = computed(() => (range.value === '7d' ? 'Last week' : 'Last 30 days'))

function setRange(r) { range.value = r }

function badgeClass(s) {
  const k = String(s || '').toLowerCase()
  if (k.includes('connect')) return 'ok'
  if (k.includes('pending')) return 'warn'
  return 'bad'
}
function goToIntegrations() { router.push(`/bots/integration/${botId}`) }
function goToLogs() { router.push(`/bots/logs/${botId}`) }
function refresh() {
  msg.value = 'Stats refreshed.'
  setTimeout(()=> msg.value='', 1800)
}

/* --- Chart (ApexCharts) --- */
const chartData = computed(() => range.value === '7d' ? weeklyStats.value : monthlyStats.value)

const chartSeries = computed(() => [
  {
    name: 'Messages',
    data: chartData.value.map(d => d.messages)
  }
])

const chartOptions = computed(() => ({
  chart: {
    type: 'line',
    toolbar: { show: false },
    zoom: { enabled: false },
    foreColor: '#e5e7eb',
    animations: { easing: 'easeinout', speed: 400 }
  },
  theme: { mode: 'dark' },
  stroke: { curve: 'smooth', width: 3 },
  grid: {
    borderColor: 'rgba(255,255,255,.12)',
    strokeDashArray: 4,
    padding: { left: 8, right: 8 }
  },
  markers: { size: 0 },
  tooltip: {
    theme: 'dark',
    x: { show: false },
    y: { formatter: (val) => `${val} messages` }
  },
  colors: ['#6366F1'],
  xaxis: {
    categories: chartData.value.map(d => d.day),
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { rotate: -45, style: { colors: '#9CA3AF' } }
  },
  yaxis: {
    min: 0,
    forceNiceScale: true,
    decimalsInFloat: 0,
    labels: { style: { colors: '#9CA3AF' } }
  }
}))
</script>

<style scoped>
/* ===== App background (digital gradient) ===== */
.app{
  min-height:100vh;
  background:
    radial-gradient(900px 480px at 90% -10%, #2e2a8a 0%, rgba(46,42,138,0) 60%),
    radial-gradient(800px 420px at -10% 0%, #6b21a8 0%, rgba(107,33,168,0) 55%),
    linear-gradient(180deg,#0a0f22 0%, #0b1633 100%);
  color:#fff; display:flex; flex-direction:column;
}

/* ===== App Bar ===== */
.appbar{
  position:sticky; top:0; z-index:20;
  display:grid; grid-template-columns: 1fr auto; align-items:center; gap:.75rem;
  padding:1rem .95rem .75rem;
  background:linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,0));
  backdrop-filter: blur(12px);
}
.title h1{ margin:0; font-size:1.05rem; font-weight:900; letter-spacing:.2px }
.title p{ margin:.15rem 0 0; font-size:.72rem; color:rgba(255,255,255,.75) }
.chips{ display:inline-flex; gap:.4rem; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); padding:.25rem; border-radius:999px }
.chip{
  border:none; border-radius:999px; padding:.4rem .7rem; font-weight:900; color:#fff; background:transparent;
}
.chip.active{
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee); color:#000; box-shadow:0 6px 18px rgba(99,102,241,.35)
}

/* ===== Layout ===== */
.pad{ padding: .75rem .95rem 8.2rem } /* leave room for sticky footer */

/* ===== Stat Summary ===== */
.stats{
  display:grid; gap:.7rem;
  grid-template-columns:repeat(2, minmax(0,1fr));
  margin-bottom:.8rem;
}
.stat-card{
  border-radius:1rem; padding:.8rem .9rem;
  background:linear-gradient(135deg, rgba(255,255,255,.07), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.14); backdrop-filter: blur(14px);
}
.stat-card.ok{ box-shadow:0 8px 24px rgba(16,185,129,.18); border-color:rgba(16,185,129,.35) }
.stat-card.bad{ box-shadow:0 8px 24px rgba(244,63,94,.18); border-color:rgba(244,63,94,.35) }
.stat-card.warn{ box-shadow:0 8px 24px rgba(245,158,11,.18); border-color:rgba(245,158,11,.35) }
.k{ font-size:.78rem; color:rgba(255,255,255,.8) }
.v{ font-size:1.1rem; font-weight:900 }

/* ===== Card ===== */
.card{
  border-radius:1.25rem; padding:1rem; margin-bottom:.8rem;
  background:linear-gradient(135deg, rgba(255,255,255,.07), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.14); backdrop-filter: blur(16px);
  box-shadow: 0 12px 40px rgba(0,0,0,.45);
}
.card-head{
  display:flex; align-items:center; justify-content:space-between; gap:.75rem; margin-bottom:.5rem
}
.card-title{ margin:0; font-size:1rem; font-weight:900 }
.legend{ font-size:.82rem; color:rgba(255,255,255,.85); display:inline-flex; align-items:center; gap:.35rem }
.dot{ height:10px; width:10px; border-radius:999px; display:inline-block }
.dot.primary{ background:#6366F1 }

/* ===== Chart wrap ===== */
.chart-wrap{ width:100%; height:250px }

/* ===== Integrations ===== */
.integrations{ list-style:none; padding:0; margin:0; display:grid; gap:.45rem }
.int-item{
  display:flex; align-items:center; justify-content:space-between;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
  border-radius:.9rem; padding:.6rem .8rem;
}
.int-name{ font-weight:800 }
.badge{
  padding:.18rem .55rem; border-radius:.6rem; font-size:.78rem; border:1px solid;
}
.badge.ok{ color:#b8f3d8; border-color:#2dd4bf; background:rgba(45,212,191,.12) }
.badge.warn{ color:#fde68a; border-color:#f59e0b; background:rgba(245,158,11,.12) }
.badge.bad{ color:#ffc9d2; border-color:#f43f5e; background:rgba(244,63,94,.12) }

/* ===== CTA block ===== */
.cta-block{ display:flex; gap:.6rem; flex-wrap:wrap }
.btn{
  flex:1; border-radius:.9rem; padding:.7rem; font-weight:900; border:1px solid transparent; color:#fff; text-align:center
}
.btn.ghost{ background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.16) }
.btn.primary{ background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee); color:#000; box-shadow:0 8px 24px rgba(99,102,241,.35) }

/* ===== Sticky Footer ===== */
.footerbar{
  position:fixed; left:0; right:0; bottom:0; z-index:30;
  padding:.75rem .95rem 1rem;
  background:linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.6) 40%, rgba(0,0,0,.85) 100%);
  backdrop-filter: blur(12px);
}
.bar{
  display:flex; align-items:center; gap:.8rem;
  border-radius:1rem; padding:.7rem .75rem;
  background:linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
  border:1px solid rgba(255,255,255,.14);
}
.sum{ display:flex; flex-direction:column }
.label{ font-size:.78rem; color:rgba(255,255,255,.8) }
.val{ font-weight:900 }
.cta{
  margin-left:auto; min-width:140px; border:none; border-radius:999px; padding:.9rem 1rem; font-weight:900;
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee); color:#000;
  box-shadow:0 8px 24px rgba(99,102,241,.35);
}

/* ===== Toasts ===== */
.toast{
  margin-top:.6rem; border-radius:1rem; padding:.75rem .9rem; font-size:.9rem; border:1px solid; text-align:center;
}
.toast.ok{ background:rgba(16,185,129,.14); border-color:rgba(16,185,129,.35); color:#b8f3d8 }
.toast.bad{ background:rgba(244,63,94,.14); border-color:rgba(244,63,94,.35); color:#ffc9d2 }
.toast-enter-active,.toast-leave-active{ transition: all .25s ease }
.toast-enter-from,.toast-leave-to{ opacity:0; transform: translateY(6px) }

/* Small devices */
@media (max-width: 380px){
  .cta{ min-width:130px; padding:.8rem .9rem }
}
</style>
