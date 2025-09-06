<!-- src/components/UserBillingView.vue -->
<template>
  <section class="p-4 sm:p-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-2 mb-3">
      <h1 class="text-xl sm:text-2xl font-bold text-blue-900 dark:text-white">Billing History</h1>
      <button
        class="px-3 py-2 rounded-lg bg-gray-900 text-white dark:bg-white dark:text-black text-xs font-medium active:scale-95"
        @click="exportCsv"
        aria-label="Export CSV"
      >
        Export CSV
      </button>
    </div>

    <!-- Filters (thumb-reach horizontal on mobile) -->
    <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-2 mb-3">
      <div class="relative min-w-[56%] sm:min-w-[280px]">
        <input
          v-model="q"
          type="search"
          inputmode="search"
          placeholder="Search plan, method, invoice…"
          class="w-full rounded-xl bg-gray-100 dark:bg-white/10 px-10 py-2 text-sm outline-none focus:ring-2 ring-blue-600/60"
          aria-label="Search invoices"
        />
        <svg class="w-4 h-4 absolute left-3 top-2.5 opacity-60" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M13.78 12.72a6 6 0 1 0-1.06 1.06l3.25 3.25a.75.75 0 1 0 1.06-1.06l-3.25-3.25zM12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" clip-rule="evenodd"/>
        </svg>
      </div>

      <select v-model="method" class="chip-select" aria-label="Payment method filter">
        <option value="">All methods</option>
        <option v-for="m in methods" :key="m" :value="m">{{ m }}</option>
      </select>

      <select v-model="status" class="chip-select" aria-label="Status filter">
        <option value="">All status</option>
        <option value="paid">Paid</option>
        <option value="refunded">Refunded</option>
        <option value="failed">Failed</option>
      </select>

      <input v-model="from" type="date" class="chip-select" :max="to || undefined" aria-label="From date"/>
      <input v-model="to" type="date" class="chip-select" :min="from || undefined" aria-label="To date"/>
    </div>

    <!-- Summary -->
    <div class="flex flex-wrap items-center gap-3 mb-3 text-xs sm:text-sm text-gray-600 dark:text-white/70">
      <span aria-live="polite"><strong>{{ visibleCount }}</strong> invoices shown</span>
      <span>•</span>
      <span>Total: <strong>{{ fmtCurrency(totalVisible) }}</strong></span>
      <span class="ml-auto hidden sm:inline">Updated: {{ lastUpdated }}</span>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="'sk'+i" class="rounded-2xl overflow-hidden border border-black/5 dark:border-white/10">
        <div class="h-16 bg-gray-200 dark:bg-white/10 animate-pulse"></div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!paged.length" class="text-center py-10 text-gray-500 dark:text-white/60">
      <div class="text-3xl mb-2">🧾</div>
      <p class="text-sm">No invoices match your filters.</p>
    </div>

    <!-- Mobile cards (primary) -->
    <div v-else class="grid gap-3 sm:hidden">
      <article
        v-for="b in paged"
        :key="'m-'+b.id"
        class="rounded-xl bg-white dark:bg-[#0b0b10] border border-gray-200 dark:border-white/10 p-4"
      >
        <div class="flex items-center justify-between">
          <div class="font-semibold text-gray-900 dark:text-white">{{ b.plan }}</div>
          <StatusPill :status="b.status" />
        </div>
        <div class="text-xs text-gray-500 dark:text-white/60 mt-0.5">
          {{ fmtDate(b.date) }} • {{ b.method }}
        </div>
        <div class="text-lg font-bold text-blue-900 dark:text-white mt-2">
          {{ fmtCurrency(b.amount) }}
        </div>
        <div class="flex items-center gap-2 mt-3">
          <button class="btn-secondary flex-1" @click="downloadInvoice(b)">Download</button>
          <button class="btn-primary" @click="openSheet(b)">Details</button>
        </div>
      </article>
    </div>

    <!-- Desktop table -->
    <div class="hidden sm:block bg-white dark:bg-[#0b0b10] rounded-xl shadow border border-gray-200 dark:border-white/10 overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/70 uppercase text-left">
          <tr>
            <Th head="Date"    :k="'date'"    :sortKey="sortKey" :sortDir="sortDir" @sort="setSort" />
            <Th head="Plan"    :k="'plan'"    :sortKey="sortKey" :sortDir="sortDir" @sort="setSort" />
            <Th head="Amount"  :k="'amount'"  :sortKey="sortKey" :sortDir="sortDir" @sort="setSort" />
            <Th head="Method"  :k="'method'"  :sortKey="sortKey" :sortDir="sortDir" @sort="setSort" />
            <Th head="Status"  :k="'status'"  :sortKey="sortKey" :sortDir="sortDir" @sort="setSort" />
            <th class="px-6 py-3">Invoice</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in paged" :key="'d-'+b.id" class="border-t text-gray-800 dark:text-white/85">
            <td class="px-6 py-4 whitespace-nowrap">{{ fmtDate(b.date) }}</td>
            <td class="px-6 py-4">{{ b.plan }}</td>
            <td class="px-6 py-4 font-semibold">{{ fmtCurrency(b.amount) }}</td>
            <td class="px-6 py-4">{{ b.method }}</td>
            <td class="px-6 py-4"><StatusPill :status="b.status" /></td>
            <td class="px-6 py-4">
              <button class="text-blue-700 dark:text-blue-300 hover:underline" @click="downloadInvoice(b)">Download</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && allFiltered.length" class="flex items-center justify-between mt-4 text-sm">
      <div class="flex items-center gap-2">
        <span class="text-gray-600 dark:text-white/70">Rows:</span>
        <select v-model.number="perPage" class="chip-select" aria-label="Rows per page">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn-secondary" :disabled="page===1" @click="page--">Prev</button>
        <span class="text-gray-600 dark:text-white/70">Page {{ page }} / {{ totalPages }}</span>
        <button class="btn-secondary" :disabled="page===totalPages" @click="page++">Next</button>
      </div>
    </div>

    <!-- Details Bottom Sheet -->
    <div v-if="sheetOpen" class="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Invoice details">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeSheet"></div>
      <div class="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white dark:bg-[#0b0b10] shadow-2xl">
        <div class="mx-auto w-full max-w-2xl p-4">
          <div class="flex items-center gap-2 mb-2">
            <button @click="closeSheet" class="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10" aria-label="Close">✖</button>
            <h4 class="text-sm font-semibold">Invoice #{{ active?.invoiceNo || active?.id }}</h4>
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-white/80">
            <div><span class="text-gray-500 dark:text-white/60">Date:</span> {{ fmtDate(active!.date) }}</div>
            <div><span class="text-gray-500 dark:text-white/60">Plan:</span> {{ active!.plan }}</div>
            <div><span class="text-gray-500 dark:text-white/60">Amount:</span> {{ fmtCurrency(active!.amount) }}</div>
            <div><span class="text-gray-500 dark:text-white/60">Method:</span> {{ active!.method }}</div>
            <div class="flex items-center gap-2">
              <span class="text-gray-500 dark:text-white/60">Status:</span>
              <StatusPill :status="active!.status" />
            </div>
            <div><span class="text-gray-500 dark:text-white/60">Period:</span> {{ active!.period || '—' }}</div>
          </div>

          <div class="flex items-center gap-2 mt-4">
            <button class="btn-primary flex-1" @click="downloadInvoice(active!)">Download</button>
            <button class="btn-secondary" @click="copyText(active!.invoiceNo ? String(active!.invoiceNo) : String(active!.id))">Copy ID</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, defineComponent, h } from 'vue'

type Bill = {
  id: number | string
  date: string
  plan: string
  amount: number
  method: string
  status: 'paid' | 'refunded' | 'failed'
  invoiceNo?: string | number
  invoiceUrl?: string
  period?: string
}

const lastUpdated = ref(new Date().toLocaleString())
const loading = ref(true)
const q = ref('')
const method = ref<string>('')      // filter
const status = ref<string>('')      // filter
const from = ref<string>('')        // filter
const to = ref<string>('')          // filter

const sortKey = ref<'date' | 'plan' | 'amount' | 'method' | 'status'>('date')
const sortDir = ref<'asc' | 'desc'>('desc')

const page = ref(1)
const perPage = ref(10)

const sheetOpen = ref(false)
const active = ref<Bill | null>(null)

const methods = ['M-PESA', 'PayPal', 'Card'] as const

// Demo dataset (replace with API later)
const all = ref<Bill[]>([
  { id: 1, date: '2025-03-01', plan: 'Pro Plan', amount: 30, method: 'PayPal', status: 'paid',    invoiceNo: 'INV-0001', period: 'Mar 2025' },
  { id: 2, date: '2025-02-01', plan: 'Pro Plan', amount: 30, method: 'M-PESA', status: 'paid',    invoiceNo: 'INV-0000', period: 'Feb 2025' },
  { id: 3, date: '2025-01-01', plan: 'Pro Plan', amount: 30, method: 'Card',   status: 'refunded',invoiceNo: 'INV-9999', period: 'Jan 2025' },
  { id: 4, date: '2024-12-01', plan: 'Pro Plan', amount: 30, method: 'M-PESA', status: 'failed',  invoiceNo: 'INV-9998', period: 'Dec 2024' },
])

onMounted(async () => {
  await new Promise(r => setTimeout(r, 400)) // Simulate initial load
  loading.value = false
  lastUpdated.value = new Date().toLocaleString()
})

/* ------------ Filters + Sorting + Paging ------------ */
const allFiltered = computed(() => {
  const term = q.value.trim().toLowerCase()
  const fromMs = from.value ? new Date(from.value).getTime() : -Infinity
  const toMs = to.value ? (new Date(to.value).getTime() + 86_400_000 - 1) : Infinity // inclusive end-of-day

  const collator = new Intl.Collator(undefined, { sensitivity: 'accent', numeric: false })

  return all.value
    .filter(b => {
      const d = new Date(b.date + 'T00:00:00').getTime()
      if (d < fromMs || d > toMs) return false
      if (method.value && b.method !== method.value) return false
      if (status.value && b.status !== status.value) return false
      if (!term) return true
      return [
        b.plan, b.method, String(b.invoiceNo ?? ''), b.status
      ].join(' ').toLowerCase().includes(term)
    })
    .sort((a, b) => {
      const dir = sortDir.value === 'asc' ? 1 : -1
      let va: any = a[sortKey.value], vb: any = b[sortKey.value]
      if (sortKey.value === 'date') { va = +new Date(a.date); vb = +new Date(b.date) }
      else if (sortKey.value === 'amount') { va = Number(a.amount); vb = Number(b.amount) }
      else { return collator.compare(String(va), String(vb)) * dir || (String(a.id).localeCompare(String(b.id)) * dir) }
      return va > vb ? dir : va < vb ? -dir : 0
    })
})

watch([q, method, status, from, to, sortKey, sortDir, perPage], () => { page.value = 1 })

const totalPages = computed(() => Math.max(1, Math.ceil(allFiltered.value.length / perPage.value)))
const paged = computed(() => {
  const start = (page.value - 1) * perPage.value
  return allFiltered.value.slice(start, start + perPage.value)
})
const totalVisible = computed(() => allFiltered.value.reduce((s, b) => s + (b.status === 'paid' ? b.amount : 0), 0))
const visibleCount = computed(() => allFiltered.value.length)

/* ------------ Actions ------------ */
function setSort(k: typeof sortKey.value) {
  if (sortKey.value === k) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = k
    sortDir.value = k === 'date' ? 'desc' : 'asc'
  }
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', currencyDisplay: 'symbol', minimumFractionDigits: 2 }).format(n)
}
function fmtDate(s: string) {
  const d = new Date(s + 'T00:00:00')
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(d)
}

function exportCsv() {
  const rows = [['Invoice','Date','Plan','Amount','Method','Status','Period']]
  allFiltered.value.forEach(b => rows.push([
    String(b.invoiceNo ?? b.id), b.date, b.plan, String(b.amount), b.method, b.status, b.period || ''
  ]))
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'billing_history.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function downloadInvoice(b: Bill) {
  if (b.invoiceUrl && b.invoiceUrl !== '#') {
    window.open(b.invoiceUrl, '_blank', 'noopener')
    return
  }
  // printable fallback
  const html = `
  <!doctype html><html><head>
    <meta charset="utf-8"><title>Invoice ${b.invoiceNo ?? b.id}</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;padding:24px;color:#111}
      .card{max-width:640px;margin:auto;border:1px solid #ddd;border-radius:12px;padding:24px}
      h1{margin:0 0 8px;font-size:20px}
      .muted{color:#666;font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      td{padding:8px 0;border-top:1px solid #eee}
      .right{text-align:right}
      .status{padding:4px 8px;border-radius:999px;font-size:12px;display:inline-block}
      .paid{background:#e6f7ee;color:#096a2e}
      .refunded{background:#fff7e6;color:#b45309}
      .failed{background:#fde8e8;color:#9b1c1c}
      @media print {.print-hide{display:none}}
    </style></head><body>
    <div class="card">
      <h1>Invoice ${b.invoiceNo ?? b.id}</h1>
      <div class="muted">Date: ${fmtDate(b.date)} • Period: ${b.period || '—'}</div>
      <div class="muted">Method: ${b.method} • Plan: ${b.plan}</div>
      <div class="muted">Status:
        <span class="status ${b.status}">${b.status.toUpperCase()}</span>
      </div>
      <table>
        <tr><td>Description</td><td class="right">${b.plan}</td></tr>
        <tr><td>Amount</td><td class="right">${fmtCurrency(b.amount)}</td></tr>
        <tr><td>Total</td><td class="right"><strong>${fmtCurrency(b.amount)}</strong></td></tr>
      </table>
      <p class="muted" style="margin-top:16px">Thank you for your business.</p>
      <button class="print-hide" onclick="window.print()">Print / Save as PDF</button>
    </div>
  </body></html>`
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `invoice-${b.invoiceNo ?? b.id}.html`
  a.click()
  URL.revokeObjectURL(url)
}

function openSheet(b: Bill) { active.value = b; sheetOpen.value = true }
function closeSheet() { sheetOpen.value = false }

async function copyText(t: string) {
  try { await navigator.clipboard.writeText(t) } catch {}
}

/* ---------- Inline sub-components (render functions) ---------- */
const Th = defineComponent({
  name: 'Th',
  props: { head: String, k: String, sortKey: String, sortDir: String },
  emits: ['sort'],
  setup(props, { emit }) {
    const isActive = () => props.k === props.sortKey
    const aria = () => isActive() ? (props.sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
    return () => h('th',
      {
        class: 'px-6 py-3 cursor-pointer select-none',
        'aria-sort': aria(),
        onClick: () => emit('sort', props.k)
      },
      [
        h('span', { class:'inline-flex items-center gap-1' }, [
          props.head as any,
          isActive()
            ? h('svg', { class:'w-3 h-3 opacity-70', viewBox:'0 0 20 20', fill:'currentColor', 'aria-hidden':'true' }, [
                h('path', { d: props.sortDir === 'asc' ? 'M10 5l5 6H5l5-6z' : 'M10 15l-5-6h10l-5 6z' })
              ])
            : null
        ])
      ]
    )
  }
})

const StatusPill = defineComponent({
  name: 'StatusPill',
  props: { status: String },
  setup(props){
    const cls = () => {
      switch (props.status) {
        case 'paid':     return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        case 'refunded': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
        case 'failed':   return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        default:         return 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white/70'
      }
    }
    return () => h('span', { class:['px-2 py-0.5 rounded-full text-[11px] font-semibold', cls()] }, (props.status || '—').toUpperCase())
  }
})
</script>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }

.chip-select {
  @apply rounded-xl bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white
         px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-600/60;
}

.btn-primary {
  @apply h-10 px-4 rounded-xl bg-blue-700 text-white text-sm font-medium active:scale-95 disabled:opacity-50;
}
.btn-secondary {
  @apply h-10 px-3 rounded-xl bg-gray-100 dark:bg-white/10 text-sm text-gray-800 dark:text-white active:scale-95 disabled:opacity-50;
}

/* Safe-area padding for phones with notches */
@supports(padding:max(0px)) {
  section { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
}
</style>
