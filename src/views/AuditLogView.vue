<!-- src/views/AuditLogHistory.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 to-gray-950 text-white p-5 sm:p-8">
    <!-- Header -->
    <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
      <h1 class="text-xl sm:text-2xl font-extrabold text-cyan-400 flex items-center gap-2">
        📜 Audit Log History
      </h1>

      <div class="flex items-center gap-2">
        <button class="btn ghost" @click="refresh" :disabled="loading">🔄 Refresh</button>
        <button class="btn" @click="exportCSV" :disabled="!logs.length">⬇️ Export CSV</button>
      </div>
    </header>

    <!-- Controls -->
    <section class="space-y-3">
      <div class="flex flex-col sm:flex-row gap-2">
        <input
          v-model.trim="q"
          type="search"
          inputmode="search"
          placeholder="Search user, action, target…"
          class="inp flex-1"
          aria-label="Search audit logs"
        />
        <select v-model="itemsPerPage" class="inp w-full sm:w-36" aria-label="Items per page">
          <option :value="10">10 / page</option>
          <option :value="20">20 / page</option>
          <option :value="50">50 / page</option>
        </select>
      </div>

      <div class="chips" role="tablist" aria-label="Action filters">
        <button
          v-for="c in actionFilters"
          :key="c.key"
          class="chip"
          :class="{ active: selectedAction === c.key }"
          @click="selectedAction = c.key"
          role="tab"
          :aria-selected="selectedAction === c.key"
        >
          {{ c.label }}
        </button>
      </div>

      <div class="grid grid-cols-2 sm:flex sm:items-center gap-2">
        <label class="sr-only" for="start">From</label>
        <input id="start" v-model="dateStart" type="date" class="inp" />
        <label class="sr-only" for="end">To</label>
        <input id="end" v-model="dateEnd" type="date" class="inp" />
        <button class="btn ghost sm:ml-2" @click="clearDates" :disabled="!dateStart && !dateEnd">Clear dates</button>
      </div>
    </section>

    <!-- Error -->
    <p v-if="error" class="mt-3 alert" role="alert">{{ error }}</p>

    <!-- Empty -->
    <section v-if="!loading && !error && !filteredLogs.length" class="empty">
      <div class="empty-card">
        <div class="text-4xl">🛰️</div>
        <h3 class="font-bold text-slate-100 mt-1">No audit logs found</h3>
        <p class="text-slate-400 text-sm">Adjust your filters or try a different search.</p>
      </div>
    </section>

    <!-- Loading skeletons (mobile) -->
    <section v-if="loading" class="mt-4 grid gap-3 sm:hidden">
      <div v-for="n in 6" :key="n" class="card skel">
        <div class="skel-line w-2/3"></div>
        <div class="skel-line w-1/2"></div>
        <div class="skel-line w-full"></div>
        <div class="skel-chip"></div>
      </div>
    </section>

    <!-- Mobile: cards -->
    <section v-if="!loading && paginatedLogs.length" class="mt-4 grid gap-3 sm:hidden">
      <article v-for="(log, i) in paginatedLogs" :key="log.id" class="card">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-xs text-slate-400">#{{ (currentPage - 1) * itemsPerPage + i + 1 }}</div>
            <h4 class="font-bold text-white truncate">{{ log.action }}</h4>
            <p class="text-slate-300 text-sm mt-1 break-words">{{ log.target }}</p>
          </div>
          <span class="badge" :style="badgeStyle(log.action)">{{ log.action }}</span>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <div class="text-slate-400">User ID</div>
            <div class="font-mono">{{ log.user_id }}</div>
          </div>
          <div class="text-right">
            <div class="text-slate-400">Time</div>
            <div class="italic text-slate-300">{{ formatDate(log.timestamp) }}</div>
          </div>
        </div>

        <div class="mt-3 flex items-center gap-2">
          <button class="btn ghost" @click="copyRow(log)">Copy</button>
          <button class="btn ghost" @click="viewJson(log)">JSON</button>
        </div>
      </article>
    </section>

    <!-- Desktop: table -->
    <div v-if="!loading && paginatedLogs.length" class="mt-4 overflow-x-auto rounded-xl border border-cyan-800/40 bg-white/5 shadow-lg hidden sm:block">
      <table class="min-w-full text-sm text-left text-white divide-y divide-gray-700">
        <thead class="bg-cyan-800/30 text-cyan-300 uppercase text-xs tracking-wider">
          <tr>
            <th class="px-4 py-3">#</th>
            <th class="px-4 py-3">User ID</th>
            <th class="px-4 py-3">Action</th>
            <th class="px-4 py-3">Target</th>
            <th class="px-4 py-3">Timestamp</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-800">
          <tr v-for="(log, i) in paginatedLogs" :key="log.id" class="hover:bg-white/5 transition">
            <td class="px-4 py-3">{{ (currentPage - 1) * itemsPerPage + i + 1 }}</td>
            <td class="px-4 py-3"><span class="inline-block px-2 py-1 bg-cyan-700/40 text-xs rounded-md font-mono">{{ log.user_id }}</span></td>
            <td class="px-4 py-3"><span class="badge" :style="badgeStyle(log.action)">{{ log.action }}</span></td>
            <td class="px-4 py-3 break-words">{{ log.target }}</td>
            <td class="px-4 py-3 text-gray-300 italic">{{ formatDate(log.timestamp) }}</td>
            <td class="px-4 py-3 text-right">
              <div class="inline-flex gap-2">
                <button class="btn ghost" @click="copyRow(log)">Copy</button>
                <button class="btn ghost" @click="viewJson(log)">JSON</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <nav v-if="totalPages > 1" class="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <div class="text-sm text-gray-300">Page {{ currentPage }} of {{ totalPages }}</div>
      <div class="flex items-center gap-2">
        <button class="btn ghost" @click="currentPage--" :disabled="currentPage === 1">Prev</button>
        <button class="btn ghost" @click="currentPage++" :disabled="currentPage === totalPages">Next</button>
      </div>
    </nav>

    <!-- JSON drawer -->
    <transition name="fade">
      <div v-if="jsonView" class="drawer" @click.self="jsonView = null">
        <div class="drawer-card">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-bold">Audit Row (JSON)</h3>
            <button class="btn ghost" @click="jsonView = null">Close</button>
          </div>
          <pre class="code">{{ jsonView }}</pre>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'

const logs = ref([])
const loading = ref(false)
const error = ref('')

const q = ref('')
const selectedAction = ref('all')
const dateStart = ref('')
const dateEnd = ref('')

const currentPage = ref(1)
const itemsPerPage = ref(10)
const jsonView = ref(null)

const actionFilters = [
  { key: 'all',     label: 'All' },
  { key: 'create',  label: 'Create' },
  { key: 'update',  label: 'Update' },
  { key: 'delete',  label: 'Delete' },
  { key: 'login',   label: 'Login' },
  { key: 'logout',  label: 'Logout' },
  { key: 'export',  label: 'Export' }
]

const ACTION_COLORS = {
  create:  { bg: '#10b9811a', fg: '#10b981', br: '#10b98133' },
  update:  { bg: '#3b82f61a', fg: '#3b82f6', br: '#3b82f633' },
  delete:  { bg: '#ef44441a', fg: '#ef4444', br: '#ef444433' },
  login:   { bg: '#f59e0b1a', fg: '#f59e0b', br: '#f59e0b33' },
  logout:  { bg: '#8b5cf61a', fg: '#8b5cf6', br: '#8b5cf633' },
  export:  { bg: '#14b8a61a', fg: '#14b8a6', br: '#14b8a633' },
  default: { bg: '#64748b1a', fg: '#94a3b8', br: '#94a3b833' }
}

function badgeStyle(action = '') {
  const key = String(action).toLowerCase()
  const c = ACTION_COLORS[key] || ACTION_COLORS.default
  return { background: c.bg, color: c.fg, border: `1px solid ${c.br}` }
}

onMounted(refresh)

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get('/api/admin/audit', {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    })
    logs.value = Array.isArray(res.data) ? res.data : (res.data?.items ?? [])
  } catch (e) {
    error.value = e?.response?.data?.detail || 'Failed to load audit logs.'
  } finally {
    loading.value = false
  }
}

function formatDate(ts) {
  const d = new Date(ts)
  return isNaN(d.getTime()) ? String(ts) : d.toLocaleString()
}

const filteredLogs = computed(() => {
  const needle = q.value.toLowerCase()
  const from = dateStart.value ? new Date(dateStart.value).getTime() : -Infinity
  const to   = dateEnd.value ? (new Date(dateEnd.value).getTime() + 24*3600*1000 - 1) : Infinity
  const actionKey = selectedAction.value

  return logs.value.filter(row => {
    const t = new Date(row.timestamp).getTime()
    if (isNaN(t) || t < from || t > to) return false
    if (actionKey !== 'all' && String(row.action).toLowerCase() !== actionKey) return false
    if (!needle) return true
    return [row.user_id, row.action, row.target]
      .map(v => String(v ?? '').toLowerCase())
      .some(v => v.includes(needle))
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredLogs.value.length / itemsPerPage.value)))

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredLogs.value.slice(start, start + itemsPerPage.value)
})

watch([filteredLogs, itemsPerPage], () => {
  if (currentPage.value > totalPages.value) currentPage.value = 1
})

function clearDates() {
  dateStart.value = ''
  dateEnd.value = ''
}

function copyRow(row) {
  const out = JSON.stringify(row, null, 2)
  navigator.clipboard?.writeText(out)
}

function viewJson(row) {
  jsonView.value = JSON.stringify(row, null, 2)
}

function exportCSV() {
  const rows = filteredLogs.value
  if (!rows.length) return
  const headers = ['id','user_id','action','target','timestamp']
  const esc = v => `"${String(v ?? '').replace(/"/g,'""')}"`
  const body = rows.map(r => headers.map(h => esc(r[h])).join(',')).join('\n')
  const csv = [headers.join(','), body].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit_logs_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
/* Inputs & buttons (mobile-first) */
.inp{
  border:1px solid rgba(148,163,184,.35);
  background:rgba(15,23,42,.4);
  color:#e5e7eb;
  border-radius:14px;
  padding:.65rem .9rem;
  outline:none;
  width:100%;
}
.inp:focus{ border-color:#22d3ee; box-shadow:0 0 0 3px rgba(34,211,238,.15) }

.btn{
  border:1px solid rgba(148,163,184,.35);
  background:linear-gradient(180deg,rgba(15,23,42,.9),rgba(2,6,23,.9));
  color:#e5e7eb; border-radius:12px; padding:.55rem .9rem; font-weight:800; font-size:.85rem;
  transition:transform .16s ease, box-shadow .16s ease, background .16s ease;
  box-shadow:0 10px 22px -16px rgba(0,0,0,.5)
}
.btn:hover{ transform:translateY(-1px) }
.btn:disabled{ opacity:.6 }
.btn.ghost{ background:rgba(255,255,255,.06) }

/* Chips */
.chips{ display:flex; gap:.5rem; overflow:auto; padding:.2rem .1rem; scrollbar-width:none }
.chips::-webkit-scrollbar{ display:none }
.chip{
  border:1px solid rgba(34,211,238,.25);
  background:rgba(8,145,178,.15);
  color:#a5f3fc; border-radius:999px; padding:.35rem .75rem; font-weight:800; font-size:.78rem; white-space:nowrap;
}
.chip.active{ background:#06b6d4; color:#002f33; border-color:#06b6d4 }

/* Cards */
.card{
  border:1px solid rgba(148,163,184,.15);
  background:linear-gradient(180deg,rgba(2,6,23,.8),rgba(15,23,42,.85));
  border-radius:16px; padding:14px;
  box-shadow:0 10px 28px -20px rgba(0,0,0,.6)
}

/* Badge */
.badge{
  display:inline-flex; align-items:center; padding:.18rem .5rem; border-radius:999px; font-weight:900; font-size:.72rem; text-transform:uppercase; letter-spacing:.3px;
}

/* Alerts & empty */
.alert{
  border:1px solid #fecaca; background:#7f1d1d; color:#fff; padding:.6rem .8rem; border-radius:12px; font-weight:700;
}
.empty{ display:grid; place-items:center; padding:32px 0 }
.empty-card{
  text-align:center; border:1px solid rgba(148,163,184,.15); background:rgba(2,6,23,.6);
  border-radius:18px; padding:18px 16px; max-width:520px; width:100%;
  box-shadow:0 10px 24px -20px rgba(0,0,0,.5)
}

/* Drawer */
.drawer{
  position:fixed; inset:0; background:rgba(0,0,0,.6); display:grid; place-items:end; padding:0; z-index:50;
}
.drawer-card{
  width:100%; max-height:70vh; overflow:auto; background:#0b1220; color:#e5e7eb; padding:16px; border-top-left-radius:16px; border-top-right-radius:16px; border:1px solid rgba(148,163,184,.2)
}
.code{ white-space:pre-wrap; font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:.85rem }

/* Skeletons */
.skel{ position:relative; overflow:hidden }
.skel::after{
  content:""; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent);
  animation:shine 1.2s infinite;
}
.skel-line{ height:12px; background:#0f172a; border-radius:999px; margin:.35rem 0 }
.skel-chip{ height:24px; width:90px; background:#0f172a; border-radius:999px; margin-top:.35rem }
@keyframes shine{ 0%{ transform:translateX(-100%) } 100%{ transform:translateX(100%) } }

/* Utilities */
.sr-only{ position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); border:0 }
.fade-enter-from,.fade-leave-to{ opacity:0 }
.fade-enter-active,.fade-leave-active{ transition:opacity .18s ease }
::-webkit-scrollbar{ height:8px }
::-webkit-scrollbar-thumb{ background: rgba(45,212,191,.3); border-radius:4px }
</style>
