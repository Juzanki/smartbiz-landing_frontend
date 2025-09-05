<template>
  <DashboardLayout>
    <div class="p-4 sm:p-6 space-y-4 sm:space-y-6 relative text-white">
      <!-- App Bar -->
      <header class="sticky top-0 z-20 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 backdrop-blur border-b border-white/10
                     bg-gradient-to-r from-slate-900/70 via-slate-900/60 to-slate-900/70">
        <div class="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div class="min-w-0">
            <h2 class="text-lg sm:text-2xl font-extrabold bg-gradient-to-r from-sky-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent truncate">
              🧐 Live Drone Monitor
            </h2>
            <p class="text-[11px] sm:text-xs text-white/60">AI-Powered • Real-Time Telemetry</p>
          </div>
          <div class="flex items-center gap-2">
            <button @click="toggleMute"
                    class="px-2.5 py-1.5 rounded-lg text-xs ring-1 ring-white/15 bg-white/10 hover:bg-white/15">
              {{ muted ? '🔇 Muted' : '🔊 Sound On' }}
            </button>
            <button @click="manualRefresh"
                    class="px-2.5 py-1.5 rounded-lg text-xs ring-1 ring-white/15 bg-white/10 hover:bg-white/15"
                    :disabled="loading">
              🔄 Refresh
            </button>
          </div>
        </div>

        <!-- Controls -->
        <div class="max-w-6xl mx-auto mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div class="relative col-span-2 sm:col-span-2">
            <input v-model.trim="query" type="search" inputmode="search" placeholder="Search drone/product/location…"
                   class="w-full rounded-xl pl-9 pr-3 py-2 text-sm bg-white/5 ring-1 ring-white/15 placeholder:text-white/40">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 opacity-60">🔎</span>
          </div>
          <select v-model="statusFilter"
                  class="rounded-xl px-3 py-2 text-sm bg-white/5 ring-1 ring-white/15">
            <option value="">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in-transit">In-Transit</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
          </select>
          <select v-model="sortBy"
                  class="rounded-xl px-3 py-2 text-sm bg-white/5 ring-1 ring-white/15">
            <option value="eta">Sort: ETA (soonest)</option>
            <option value="status">Sort: Status</option>
            <option value="drone">Sort: Drone ID</option>
            <option value="recent">Sort: Recent</option>
          </select>
          <div class="hidden sm:flex items-center justify-end text-xs text-white/70">
            <span class="px-2 py-1 rounded bg-white/5 ring-1 ring-white/10">Active: {{ missions.length }}</span>
          </div>
        </div>
      </header>

      <!-- AI ribbon -->
      <div class="ai-badge">
        🤖 AI: Monitoring altitude, route health & battery trends…
      </div>

      <!-- Empty state -->
      <div v-if="!loading && !filtered.length" class="text-center py-16">
        <img src="/ai/ai-drone-idle.gif" class="w-40 mx-auto opacity-80 mb-4" alt="Idle AI" />
        <p class="text-gray-300 text-base">No active drone missions</p>
        <p class="text-xs text-sky-400 mt-1">AI is on standby, awaiting the next flight plan…</p>
      </div>

      <!-- Skeletons -->
      <div v-if="loading && !missions.length" class="grid sm:grid-cols-2 gap-3">
        <div v-for="i in 4" :key="i" class="h-24 rounded-2xl bg-white/5 ring-1 ring-white/10 animate-pulse"></div>
      </div>

      <!-- Mobile cards -->
      <section class="grid sm:hidden gap-3" v-if="filtered.length">
        <article v-for="m in filtered" :key="m.id"
                 class="rounded-2xl p-4 bg-white/5 ring-1 ring-white/10">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-semibold truncate">
                {{ m.drone_id }} • {{ m.product_name }}
              </p>
              <p class="text-xs text-white/70 truncate">📍 {{ m.destination }}</p>
              <p class="text-[11px] text-white/50 truncate">📡 {{ m.signal || '—' }} • 🔋 {{ m.battery ?? '—' }}%</p>
            </div>
            <span :class="badgeClass(m.status)" class="px-2 py-0.5 rounded text-[11px] font-bold uppercase"
                  role="status" :aria-label="`status ${m.status}`">
              {{ m.status }}
            </span>
          </div>
          <div class="mt-3 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="opacity-70">ETA</span>
              <Countdown :eta="m.eta"/>
            </div>
            <div class="flex items-center gap-2">
              <button @click="viewMission(m.id)" class="underline opacity-90">Details</button>
              <button v-if="m.status==='in-transit'" @click="ping(m.id)" class="underline opacity-90">Ping</button>
            </div>
          </div>
        </article>
      </section>

      <!-- Desktop table -->
      <div v-if="filtered.length" class="hidden sm:block overflow-auto rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl bg-white/5">
        <table class="min-w-full text-sm text-white font-mono tracking-wide">
          <thead class="bg-gradient-to-r from-sky-700 to-indigo-800 text-white uppercase text-xs sticky top-0">
            <tr>
              <th class="px-4 py-3 text-left">Drone</th>
              <th class="px-4 py-3 text-left">Product</th>
              <th class="px-4 py-3 text-left">📍 Location</th>
              <th class="px-4 py-3 text-left">🔋/📡</th>
              <th class="px-4 py-3 text-left">⚙️ Status</th>
              <th class="px-4 py-3 text-left">⏳ ETA</th>
              <th class="px-4 py-3 text-left"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in filtered" :key="m.id" class="border-t border-white/10 hover:bg-white/5 transition-all duration-200">
              <td class="px-4 py-3">{{ m.drone_id }}</td>
              <td class="px-4 py-3">{{ m.product_name }}</td>
              <td class="px-4 py-3">{{ m.destination }}</td>
              <td class="px-4 py-3 text-white/80">
                🔋 {{ m.battery ?? '—' }}% • 📡 {{ m.signal || '—' }}
              </td>
              <td class="px-4 py-3">
                <span :class="badgeClass(m.status)" class="font-bold px-3 py-1 rounded-full text-xs">{{ m.status }}</span>
              </td>
              <td class="px-4 py-3"><Countdown :eta="m.eta" /></td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <button @click="viewMission(m.id)" class="underline opacity-90">Details</button>
                  <button v-if="m.status==='in-transit'" @click="ping(m.id)" class="underline opacity-90">Ping</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Legend -->
      <div class="flex flex-wrap gap-2 text-[11px] text-white/70">
        <span class="px-2 py-0.5 rounded bg-amber-500/20 ring-1 ring-amber-400/30 text-amber-100">In-Transit</span>
        <span class="px-2 py-0.5 rounded bg-emerald-500/20 ring-1 ring-emerald-400/30 text-emerald-100">Delivered</span>
        <span class="px-2 py-0.5 rounded bg-red-500/20 ring-1 ring-red-400/30 text-red-100">Failed</span>
        <span class="px-2 py-0.5 rounded bg-sky-500/20 ring-1 ring-sky-400/30 text-sky-100">Scheduled</span>
        <span class="px-2 py-0.5 rounded bg-white/10 ring-1 ring-white/15">Other</span>
      </div>

      <!-- Toast -->
      <div v-if="toast" class="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-sm">
        {{ toast }}
      </div>
    </div>
  </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import Countdown from '@/components/Countdown.vue'

/* ---- Sounds (public assets) ---- */
const sDelivered = new Audio('/assets/sounds/delivered.mp3')
const sFailed    = new Audio('/assets/sounds/failed.mp3')
const muted = ref(false)
function toggleMute(){ muted.value = !muted.value }

/* ---- State ---- */
const missions = ref([])
const previousStatuses = ref({})
const loading = ref(true)
const toast = ref('')

/* Filters / sort */
const query = ref('')
const statusFilter = ref('')
const sortBy = ref('eta') // eta | status | drone | recent

/* SSE / polling */
let es = null
let pollId = 0
let pollMs = 20000
let backoff = 1

/* ---- Fetch ---- */
async function fetchMissions() {
  try {
    const token = localStorage.getItem('access_token')
    const { data } = await axios.get('/drones/missions', {
      headers: { Authorization: `Bearer ${token}` }
    })

    // alerts on status change
    data.forEach(m => {
      const prev = previousStatuses.value[m.id]
      if (prev && prev !== m.status) {
        if (!muted.value) {
          if (m.status === 'delivered') sDelivered.play().catch(()=>{})
          if (m.status === 'failed') sFailed.play().catch(()=>{})
        }
        if (navigator.vibrate) navigator.vibrate(80)
      }
      previousStatuses.value[m.id] = m.status
    })

    missions.value = data
    loading.value = false
    backoff = 1
  } catch (err) {
    loading.value = false
    backoff = Math.min(4, backoff * 2) // up to 4x
    showToast('Network issue. Using slower refresh.')
  }
}

/* ---- Live updates via SSE, fallback to polling ---- */
function startSSE() {
  try {
    const token = localStorage.getItem('access_token')
    es = new EventSource(`/drones/missions/stream?token=${encodeURIComponent(token||'')}`)
    es.onmessage = (ev) => {
      const payload = JSON.parse(ev.data || '[]')
      if (!Array.isArray(payload)) return
      payload.forEach(m => {
        const prev = previousStatuses.value[m.id]
        if (prev && prev !== m.status && !muted.value) {
          if (m.status === 'delivered') sDelivered.play().catch(()=>{})
          if (m.status === 'failed') sFailed.play().catch(()=>{})
          if (navigator.vibrate) navigator.vibrate(80)
        }
        previousStatuses.value[m.id] = m.status
      })
      missions.value = payload
      loading.value = false
    }
    es.onerror = () => {
      stopSSE()
      startPolling()
    }
  } catch {
    startPolling()
  }
}
function stopSSE(){ if (es) { es.close(); es = null } }

function startPolling(){
  clearInterval(pollId)
  pollId = setInterval(fetchMissions, pollMs * backoff)
}
function stopPolling(){ clearInterval(pollId); pollId = 0 }

function manualRefresh(){
  loading.value = !missions.value.length
  fetchMissions()
}

/* ---- UI helpers ---- */
function badgeClass(status){
  return {
    'in-transit': 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/30',
    'delivered':  'bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/30',
    'failed':     'bg-red-500/20 text-red-100 ring-1 ring-red-400/30',
    'scheduled':  'bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/30'
  }[status] || 'bg-white/10 ring-1 ring-white/15'
}

function ping(id){
  // lightweight ping action (optimistic)
  showToast(`Ping sent to drone ${id}`)
}

function viewMission(id){
  // route to detail page if you have it
  // this.$router.push(`/drones/${id}`)
  showToast(`Open details for ${id}`)
}

function showToast(msg){ toast.value = msg; setTimeout(()=> toast.value='', 1200) }

/* ---- Filtering / Sorting ---- */
const filtered = computed(() => {
  let arr = [...missions.value]
  const q = (query.value || '').toLowerCase()
  if (q) {
    arr = arr.filter(m =>
      String(m.drone_id).toLowerCase().includes(q) ||
      (m.product_name || '').toLowerCase().includes(q) ||
      (m.destination || '').toLowerCase().includes(q)
    )
  }
  if (statusFilter.value) arr = arr.filter(m => m.status === statusFilter.value)

  if (sortBy.value === 'eta') {
    arr.sort((a,b) => (Number(a.eta)||Infinity) - (Number(b.eta)||Infinity))
  } else if (sortBy.value === 'status') {
    const order = { 'in-transit': 0, 'scheduled': 1, 'delivered': 2, 'failed': 3 }
    arr.sort((a,b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))
  } else if (sortBy.value === 'drone') {
    arr.sort((a,b) => String(a.drone_id).localeCompare(String(b.drone_id)))
  } else {
    // recent (assuming larger id is newer)
    arr.sort((a,b) => Number(b.id) - Number(a.id))
  }
  return arr
})

/* ---- Lifecycle ---- */
onMounted(async () => {
  await fetchMissions()
  startSSE() // try SSE first, fallback handled in onerror
})
onBeforeUnmount(() => {
  stopSSE()
  stopPolling()
})
</script>

<style scoped>
/* Table aesthetic (desktop) */
table {
  background: linear-gradient(to bottom right, rgba(15,23,42,.85), rgba(30,41,59,.9));
  backdrop-filter: blur(10px);
  border-radius: 1rem;
  overflow: hidden;
}
th { white-space: nowrap; border-bottom: 1px solid rgba(255,255,255,.1); }
td { border-top: 1px solid rgba(255,255,255,.08); }

/* AI badge */
.ai-badge {
  position: absolute; top: .5rem; right: 1rem;
  font-size: .7rem; padding: .25rem .6rem; border-radius: 9999px;
  background: linear-gradient(135deg, #7e22ce, #0f172a);
  border: 1px solid rgba(255,255,255,.1);
  box-shadow: 0 6px 24px rgba(0,0,0,.2);
  animation: floaty 2.2s ease-in-out infinite;
}
@keyframes floaty { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-3px) } }

/* Row hover */
tr { transition: all .25s ease; }
tr:hover { background-color: rgba(255,255,255,.05); }
</style>
