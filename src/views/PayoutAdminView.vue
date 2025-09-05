<template>
  <div class="pa-shell min-h-screen px-4 py-5 md:px-6">
    <!-- Header -->
    <header class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center text-white shadow-md">💸</div>
        <div>
          <h1 class="text-xl font-extrabold text-slate-900 md:text-2xl">Referral Payouts</h1>
          <p class="text-slate-500 text-sm">Review, approve & export partner commissions.</p>
        </div>
      </div>

      <!-- Right controls -->
      <div class="flex items-center gap-2">
        <button class="pa-btn pa-btn--ghost hidden md:inline-flex" @click="exportCSV" :disabled="loading || filtered.length===0">⬇️ Export CSV</button>
        <span class="pa-pill">Admin Panel</span>
      </div>
    </header>

    <!-- Search + Filters -->
    <section class="mt-4 space-y-3">
      <label class="relative w-full">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M13.036 14.45a7 7 0 1 1 1.414-1.414l3.258 3.257a1 1 0 0 1-1.414 1.415l-3.258-3.258ZM14 9a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z" clip-rule="evenodd"/>
        </svg>
        <input
          v-model="search"
          type="search"
          placeholder="Search promoter, buyer, product…"
          class="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-[15px] shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
        />
      </label>

      <div class="flex flex-wrap gap-2">
        <button v-for="s in statusChips" :key="s.key" @click="status=s.key" :class="['pa-chip', status===s.key && 'pa-chip--active']">
          <span class="mr-1">{{ s.emoji }}</span>{{ s.label }}
        </button>

        <span class="mx-1 hidden md:inline-block text-slate-300">|</span>

        <button v-for="d in dateChips" :key="d.key" @click="dateRange=d.key" :class="['pa-chip', dateRange===d.key && 'pa-chip--active']">
          <span class="mr-1">{{ d.emoji }}</span>{{ d.label }}
        </button>

        <div class="ml-auto flex gap-2">
          <button class="pa-btn pa-btn--ghost" @click="refresh" :disabled="loading">↻ Refresh</button>
          <button class="pa-btn pa-btn--ghost" v-if="hasAnyFilter" @click="resetFilters">Reset</button>
        </div>
      </div>
    </section>

    <!-- KPIs -->
    <section class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="pa-kpi">
        <p class="pa-kpi__label">Pending</p>
        <p class="pa-kpi__value">{{ stats.pending }}</p>
      </div>
      <div class="pa-kpi">
        <p class="pa-kpi__label">Approved</p>
        <p class="pa-kpi__value">{{ stats.approved }}</p>
      </div>
      <div class="pa-kpi">
        <p class="pa-kpi__label">Pending Amount</p>
        <p class="pa-kpi__value">{{ formatTZS(stats.pendingAmount) }}</p>
      </div>
      <div class="pa-kpi">
        <p class="pa-kpi__label">Paid This Month</p>
        <p class="pa-kpi__value">{{ formatTZS(stats.monthPaid) }}</p>
      </div>
    </section>

    <!-- Mobile Cards -->
    <section class="mt-4 space-y-3 md:hidden">
      <article v-for="r in filtered" :key="r.id" class="pa-card">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-slate-900 truncate">{{ r.product }}</h3>
              <span :class="['pa-badge', r.status==='paid' ? 'pa-badge--green' : 'pa-badge--amber']">{{ r.status }}</span>
            </div>
            <p class="text-sm text-slate-600 truncate"><strong>Promoter:</strong> {{ r.promoter }}</p>
            <p class="text-sm text-slate-600 truncate"><strong>Buyer:</strong> {{ r.buyer }}</p>
          </div>
          <div class="text-right">
            <p class="font-extrabold text-slate-900">{{ formatTZS(r.amount) }}</p>
            <p class="text-xs text-slate-500">{{ formatDate(r.date) }}</p>
          </div>
        </div>

        <div class="mt-3 grid grid-cols-3 gap-2">
          <button class="pa-btn" @click="toggleSelect(r.id)">
            <span v-if="selected.has(r.id)">☑ Selected</span>
            <span v-else>☐ Select</span>
          </button>
          <button class="pa-btn pa-btn--ok" v-if="r.status!=='paid'" @click="markPaid(r.id)">Mark Paid</button>
          <button class="pa-btn pa-btn--ghost" v-else disabled>Paid</button>
          <button class="pa-btn pa-btn--ghost" @click="copySlip(r)">Copy Slip</button>
        </div>
      </article>

      <p v-if="!loading && filtered.length===0" class="text-center text-slate-500 py-6">No payouts.</p>
      <p v-if="loading" class="text-center text-slate-400 py-6">Loading…</p>
    </section>

    <!-- Desktop Table -->
    <section class="mt-5 hidden md:block">
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="px-3 py-3"><input type="checkbox" :checked="allVisibleSelected" @change="toggleSelectAll"/></th>
              <th class="px-3 py-3 text-left">Promoter</th>
              <th class="px-3 py-3 text-left">Product</th>
              <th class="px-3 py-3 text-left">Buyer</th>
              <th class="px-3 py-3 text-right">Amount</th>
              <th class="px-3 py-3 text-left">Date</th>
              <th class="px-3 py-3 text-left">Status</th>
              <th class="px-4 py-3 text-right pr-5">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in filtered" :key="r.id" class="border-t border-slate-100 hover:bg-slate-50/70">
              <td class="px-3 py-3"><input type="checkbox" :checked="selected.has(r.id)" @change="toggleSelect(r.id)"/></td>
              <td class="px-3 py-3 font-semibold text-slate-900">{{ r.promoter }}</td>
              <td class="px-3 py-3">{{ r.product }}</td>
              <td class="px-3 py-3">{{ r.buyer }}</td>
              <td class="px-3 py-3 text-right font-bold">{{ formatTZS(r.amount) }}</td>
              <td class="px-3 py-3 text-slate-600">{{ formatDate(r.date) }}</td>
              <td class="px-3 py-3">
                <span :class="['pa-badge', r.status==='paid' ? 'pa-badge--green' : 'pa-badge--amber']">{{ r.status }}</span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="inline-flex gap-2">
                  <button class="pa-btn pa-btn--ok" v-if="r.status!=='paid'" @click="markPaid(r.id)">Mark Paid</button>
                  <button class="pa-btn pa-btn--ghost" v-else disabled>Paid</button>
                  <button class="pa-btn pa-btn--ghost" @click="copySlip(r)">Copy Slip</button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && filtered.length===0">
              <td colspan="8" class="px-4 py-6 text-center text-slate-500">No payouts.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Pagination / Load more (simple) -->
    <div class="mt-4 flex justify-center">
      <button class="pa-btn" v-if="hasMore && !loading" @click="loadMore">Load more</button>
      <p v-if="loading" class="text-slate-400 text-sm">Loading…</p>
    </div>

    <!-- Sticky bulk bar (mobile & desktop) -->
    <transition name="slide-up">
      <div v-if="selected.size" class="pa-bulk">
        <p class="font-semibold">{{ selected.size }} selected &middot; {{ formatTZS(sumSelected) }}</p>
        <div class="flex gap-2">
          <button class="pa-btn pa-btn--ghost" @click="clearSelection">Clear</button>
          <button class="pa-btn pa-btn--ok" @click="markSelectedPaid" :disabled="bulkWorking">✅ Mark Selected Paid</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toastification'

const toast = useToast?.() ?? { success: console.log, error: console.error, info: console.log }

/* ---------- State ---------- */
const loading = ref(false)
const bulkWorking = ref(false)
const payouts = ref([])          // all items loaded so far
const page = ref(1)
const pageSize = 25
const hasMore = ref(false)

const search = ref('')
const status = ref('pending')    // all | pending | paid
const dateRange = ref('30')      // 7 | 30 | all

const selected = ref(new Set())

/* ---------- API ---------- */
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'
const LIST_URL = (st) => `${API_BASE}/api/payouts${st && st!=='all' ? `/${st}` : ''}`
const PAY_URL = (id) => `${API_BASE}/api/payouts/pay/${id}`
const PAY_BULK_URL = `${API_BASE}/api/payouts/pay/bulk`
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` })

onMounted(refresh)

async function refresh () {
  payouts.value = []
  page.value = 1
  selected.value = new Set()
  await fetchPage()
}

async function fetchPage () {
  loading.value = true
  try {
    // Prefer /api/payouts?status=...&page=...
    const url = `${API_BASE}/api/payouts`
    const params = { status: status.value, page: page.value, limit: pageSize }
    let res
    try {
      res = await axios.get(url, { params, headers: authHeader() })
    } catch {
      // Fallback to /api/payouts/<status>
      res = await axios.get(LIST_URL(status.value), { params: { page: page.value, limit: pageSize }, headers: authHeader() })
    }

    const rows = Array.isArray(res.data?.items) ? res.data.items
                : Array.isArray(res.data) ? res.data
                : []

    // Normalize
    const normalized = rows.map(r => ({
      id: r.id,
      promoter: r.promoter ?? r.partner ?? '—',
      product: r.product ?? r.sku ?? '—',
      buyer: r.buyer ?? r.customer ?? '—',
      amount: Number(r.amount ?? 0),
      date: r.date ?? r.created_at ?? new Date().toISOString(),
      status: (r.status ?? 'pending').toLowerCase()
    }))

    payouts.value = payouts.value.concat(normalized)
    // hasMore: try meta.total or length==pageSize
    const total = res.data?.total ?? res.data?.count
    hasMore.value = typeof total === 'number' ? payouts.value.length < total : normalized.length === pageSize
  } catch (e) {
    toast.error(e?.response?.data?.detail ?? 'Failed to load payouts.')
  } finally {
    loading.value = false
  }
}

async function loadMore () {
  if (!hasMore.value || loading.value) return
  page.value += 1
  await fetchPage()
}

async function markPaid (id) {
  try {
    await axios.post(PAY_URL(id), {}, { headers: authHeader() })
    // optimistic
    const i = payouts.value.findIndex(p => p.id === id)
    if (i > -1) payouts.value[i].status = 'paid'
    selected.value.delete(id)
    toast.success('Marked as paid.')
  } catch (e) {
    toast.error('Failed to mark paid.')
  }
}

async function markSelectedPaid () {
  if (!selected.value.size) return
  bulkWorking.value = true
  const ids = [...selected.value]
  try {
    // Try bulk endpoint, fall back to one-by-one
    try {
      await axios.post(PAY_BULK_URL, { ids }, { headers: authHeader() })
    } catch {
      await Promise.all(ids.map(id => axios.post(PAY_URL(id), {}, { headers: authHeader() })))
    }
    payouts.value = payouts.value.map(p => (selected.value.has(p.id) ? { ...p, status: 'paid' } : p))
    selected.value.clear()
    toast.success('Selected payouts marked as paid.')
  } catch (e) {
    toast.error('Bulk update failed.')
  } finally {
    bulkWorking.value = false
  }
}

/* ---------- Derivations ---------- */
const statusChips = [
  { key: 'pending', label: 'Pending', emoji: '🟡' },
  { key: 'paid', label: 'Paid', emoji: '🟢' },
  { key: 'all', label: 'All', emoji: '⚪' }
]
const dateChips = [
  { key: '7', label: 'Last 7d', emoji: '🗓️' },
  { key: '30', label: 'Last 30d', emoji: '📆' },
  { key: 'all', label: 'All Time', emoji: '♾️' }
]

const hasAnyFilter = computed(() => status.value!=='all' || dateRange.value!=='all' || search.value.trim()!=='')
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const cutoff = dateRange.value==='all'
    ? 0
    : Date.now() - Number(dateRange.value) * 24 * 60 * 60 * 1000

  return payouts.value.filter(p => {
    if (status.value !== 'all' && p.status !== status.value) return false
    if (dateRange.value !== 'all' && new Date(p.date).getTime() < cutoff) return false
    if (!q) return true
    return (p.promoter?.toLowerCase().includes(q) ||
            p.product?.toLowerCase().includes(q) ||
            p.buyer?.toLowerCase().includes(q))
  })
})

const stats = computed(() => {
  const pending = payouts.value.filter(p => p.status==='pending')
  const paidM   = payouts.value.filter(p => p.status==='paid' && new Date(p.date).getMonth() === new Date().getMonth())
  return {
    pending: pending.length,
    approved: payouts.value.filter(p => p.status==='paid').length,
    pendingAmount: pending.reduce((a,b)=>a+b.amount,0),
    monthPaid: paidM.reduce((a,b)=>a+b.amount,0)
  }
})

const sumSelected = computed(() =>
  payouts.value.filter(p => selected.value.has(p.id)).reduce((a,b)=>a+b.amount,0)
)
const allVisibleSelected = computed(() =>
  filtered.value.length>0 && filtered.value.every(p => selected.value.has(p.id))
)

/* ---------- UI helpers ---------- */
function resetFilters(){ status.value='all'; dateRange.value='all'; search.value='' }
function toggleSelect (id) {
  const s = new Set(selected.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selected.value = s
}
function toggleSelectAll () {
  const s = new Set(selected.value)
  const allSel = allVisibleSelected.value
  filtered.value.forEach(p => { if (allSel) s.delete(p.id); else s.add(p.id) })
  selected.value = s
}
function clearSelection(){ selected.value = new Set() }

function formatTZS (n=0) {
  const v = Number(n||0)
  return `TZS ${v.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`
}
function formatDate (d) {
  const dt = new Date(d)
  return dt.toLocaleString()
}
async function copySlip (r) {
  const line = `${r.id} • ${r.promoter} • ${r.product} • ${formatTZS(r.amount)} • ${formatDate(r.date)}`
  try {
    await navigator.clipboard.writeText(line)
    toast.success('Copied payout slip.')
  } catch { toast.info(line) }
}

/* Export CSV of currently filtered items */
function exportCSV () {
  const rows = [['ID','Promoter','Product','Buyer','Amount(TZS)','Date','Status']]
    .concat(filtered.value.map(r => [
      r.id, r.promoter, r.product, r.buyer, r.amount, new Date(r.date).toISOString(), r.status
    ]))
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `payouts_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
/* Soft paper background */
.pa-shell{
  background:
    radial-gradient(900px 450px at -10% -20%, rgba(245,158,11,.08), transparent 60%),
    radial-gradient(700px 400px at 120% 10%, rgba(59,130,246,.08), transparent 60%),
    #f7fafc;
}

/* Pills & chips */
.pa-pill{
  border:1px solid #fde68a; background:#fffbeb; color:#b45309;
  padding:.35rem .6rem; border-radius:999px; font-size:.75rem; font-weight:800;
}

.pa-chip{
  border:1px solid #e5e7eb; background:#fff; color:#0f172a;
  padding:.45rem .8rem; border-radius:999px; font-size:.8rem; font-weight:700; white-space:nowrap; transition:.2s ease;
}
.pa-chip--active{ border-color:#2563eb; background:#eff6ff; color:#1d4ed8; box-shadow:0 6px 18px -12px rgba(37,99,235,.45) }

/* KPI */
.pa-kpi{
  border:1px solid #e7e9ef; border-radius:16px; background:linear-gradient(180deg,#ffffff,#fbfdff);
  padding:12px 14px; box-shadow:0 10px 24px -20px rgba(0,0,0,.35)
}
.pa-kpi__label{ font-size:.72rem; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:.4px }
.pa-kpi__value{ font-size:1.05rem; font-weight:900; color:#0f172a }

/* Cards */
.pa-card{
  border:1px solid #e7e9ef; border-radius:16px; background:linear-gradient(180deg,#ffffff,#fbfdff);
  padding:12px; box-shadow:0 10px 24px -20px rgba(0,0,0,.35)
}

/* Badges */
.pa-badge{
  display:inline-flex; align-items:center; gap:.35rem; font-size:.72rem; font-weight:800; padding:.2rem .5rem; border-radius:999px; text-transform:uppercase; letter-spacing:.4px
}
.pa-badge--green{ background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0 }
.pa-badge--amber{ background:#fffbeb; color:#92400e; border:1px solid #fde68a }

/* Buttons */
.pa-btn{
  border:1px solid #e5e7eb; background:#fff; color:#0f172a; padding:.5rem .7rem; border-radius:.7rem; font-weight:800; font-size:.82rem;
  transition:.2s ease; box-shadow:0 6px 18px -16px rgba(0,0,0,.25)
}
.pa-btn:hover{ transform:translateY(-1px); background:#f8fafc }
.pa-btn--ok{ color:#065f46; border-color:#10b981; background:#ecfdf5 }
.pa-btn--ghost{ background:#f8fafc; color:#334155; border-color:#e5e7eb }

/* Bulk sticky bar */
.pa-bulk{
  position:fixed; left:0; right:0; bottom:0; z-index:40;
  display:flex; align-items:center; justify-content:space-between; gap:10px;
  padding:10px 14px; background:#111827; color:#fff; box-shadow:0 -10px 30px -20px rgba(0,0,0,.5)
}
.slide-up-enter-from, .slide-up-leave-to{ transform:translateY(100%); opacity:0 }
.slide-up-enter-active, .slide-up-leave-active{ transition:all .22s ease }
</style>
