<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
    <!-- App Bar -->
    <header class="sticky top-0 z-20 backdrop-blur bg-slate-900/70 border-b border-white/10">
      <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <h1 class="text-base sm:text-lg font-semibold">🧾 Orders</h1>
        <div class="hidden sm:flex items-center gap-2">
          <button @click="exportCSV" class="px-3 py-1.5 rounded-xl bg-white/10 ring-1 ring-white/15 text-xs hover:bg-white/15">
            Export CSV
          </button>
        </div>
      </div>

      <!-- Filters row -->
      <div class="max-w-6xl mx-auto px-4 pb-3 space-y-2">
        <div class="flex gap-2">
          <div class="relative flex-1">
            <input
              v-model.trim="q"
              type="search"
              inputmode="search"
              placeholder="🔍 Search customer, status…"
              class="w-full bg-white/5 ring-1 ring-white/15 focus:ring-white/30 rounded-xl pl-9 pr-8 py-2 text-sm placeholder:text-white/40"
              aria-label="Search orders"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">🔎</span>
            <button v-if="q" @click="q=''" class="absolute right-2 top-1/2 -translate-y-1/2 text-white/50">✕</button>
          </div>

          <select v-model="sortBy" class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm">
            <option value="dateDesc">Newest</option>
            <option value="dateAsc">Oldest</option>
            <option value="amountDesc">Amount ↑</option>
            <option value="amountAsc">Amount ↓</option>
            <option value="nameAsc">Name A–Z</option>
          </select>
        </div>

        <!-- Status chips -->
        <div class="flex gap-2 overflow-x-auto no-scrollbar">
          <button
            v-for="s in statuses"
            :key="s.value"
            @click="toggleStatus(s.value)"
            :class="[
              'px-3 py-1.5 rounded-full text-xs ring-1 whitespace-nowrap',
              activeStatuses.includes(s.value)
                ? 'bg-white text-slate-900 ring-white'
                : 'bg-white/5 text-white/80 ring-white/15 hover:bg-white/10'
            ]"
          >
            {{ s.label }}
          </button>
          <button v-if="activeStatuses.length" @click="activeStatuses=[]"
                  class="px-3 py-1.5 rounded-full text-xs bg-white/5 text-white/70 ring-1 ring-white/15">
            Reset
          </button>
        </div>

        <!-- Amount & Date filters -->
        <div class="grid sm:grid-cols-3 gap-2">
          <div class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-xs">
            <label class="block text-white/60 mb-1">Min Amount (USD)</label>
            <input type="number" min="0" v-model.number="minAmount" class="w-full bg-transparent outline-none" />
          </div>
          <div class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-xs">
            <label class="block text-white/60 mb-1">From Date</label>
            <input type="date" v-model="fromDate" class="w-full bg-transparent outline-none" />
          </div>
          <div class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-xs">
            <label class="block text-white/60 mb-1">To Date</label>
            <input type="date" v-model="toDate" class="w-full bg-transparent outline-none" />
          </div>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-6xl mx-auto px-4 py-4">
      <!-- Mobile cards -->
      <section class="grid gap-3 sm:hidden">
        <template v-if="loading">
          <div v-for="i in 6" :key="'s'+i" class="rounded-2xl p-4 bg-white/5 ring-1 ring-white/10 animate-pulse h-24"></div>
        </template>

        <template v-else-if="paged.length === 0">
          <div class="text-center p-6 rounded-2xl bg-white/5 ring-1 ring-white/10">
            <h3 class="font-semibold mb-1">No orders found</h3>
            <p class="text-white/70 text-sm">Try different filters or clear search.</p>
            <button @click="resetAll" class="mt-3 px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-sm">Reset Filters</button>
          </div>
        </template>

        <article
          v-for="o in paged"
          :key="'m'+o.id"
          class="rounded-2xl p-4 bg-white/5 ring-1 ring-white/10"
        >
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-semibold">{{ o.customerName }}</h3>
              <p class="text-xs text-white/60">{{ formatDate(o.orderDate) }}</p>
            </div>
            <span :class="['px-2 py-1 rounded text-[11px] font-semibold', statusBadge(o.status)]">{{ o.status }}</span>
          </div>
          <div class="mt-2 flex items-center justify-between">
            <p class="text-sm text-white/70">Amount</p>
            <p class="text-base font-semibold">{{ formatUSD(o.amount) }}</p>
          </div>
          <div class="mt-3 flex gap-2">
            <button @click="viewOrder(o.id)" class="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 ring-1 ring-white/15 text-xs">View Details</button>
            <button @click="copySummary(o)" class="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/25 ring-1 ring-emerald-400/30 text-emerald-100 text-xs">Copy Summary</button>
          </div>
        </article>

        <button v-if="hasMore && !loading" @click="page++" class="w-full mt-1 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-sm">Load more</button>
      </section>

      <!-- Desktop table -->
      <section class="hidden sm:block">
        <div class="overflow-hidden rounded-2xl ring-1 ring-white/10 bg-white/5">
          <table class="min-w-full text-sm">
            <thead class="bg-white/5 text-white/70">
              <tr>
                <th class="text-left px-4 py-3">Customer</th>
                <th class="text-right px-4 py-3">Amount</th>
                <th class="text-right px-4 py-3">Status</th>
                <th class="text-right px-4 py-3">Order Date</th>
                <th class="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr v-if="loading">
                <td colspan="5" class="px-4 py-6">
                  <div class="h-5 bg-white/10 rounded animate-pulse"></div>
                </td>
              </tr>
              <tr v-else-if="paged.length === 0">
                <td colspan="5" class="px-4 py-6 text-white/70">No orders match your filters.</td>
              </tr>

              <tr
                v-for="o in paged"
                :key="'d'+o.id"
                class="border-t border-white/10 hover:bg-white/5"
              >
                <td class="px-4 py-3 font-medium">{{ o.customerName }}</td>
                <td class="px-4 py-3 text-right font-semibold">{{ formatUSD(o.amount) }}</td>
                <td class="px-4 py-3 text-right">
                  <span :class="['px-2 py-1 rounded text-[11px] font-semibold', statusBadge(o.status)]">{{ o.status }}</span>
                </td>
                <td class="px-4 py-3 text-right text-white/80">{{ formatDate(o.orderDate) }}</td>
                <td class="px-4 py-3 text-right">
                  <button @click="viewOrder(o.id)" class="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 ring-1 ring-white/15 text-xs mr-2">View</button>
                  <button @click="copySummary(o)" class="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/25 ring-1 ring-emerald-400/30 text-emerald-100 text-xs">Copy</button>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="hasMore && !loading" class="p-3 border-t border-white/10 flex justify-center">
            <button @click="page++" class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15 text-sm">Load more</button>
          </div>
        </div>

        <div class="mt-3 flex items-center justify-between text-xs text-white/60">
          <div>Total: <b class="text-white/90">{{ filtered.length }}</b> orders • Amount: <b class="text-white/90">{{ formatUSD(totalAmount) }}</b></div>
          <button @click="exportCSV" class="px-3 py-1.5 rounded-xl bg-white/10 ring-1 ring-white/15 hover:bg-white/15">Export CSV</button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

/** --- State --- */
const loading = ref(true)
const orders = ref([])
const q = ref('')
const sortBy = ref('dateDesc')
const activeStatuses = ref([]) // ['Paid','Pending','Cancelled']
const minAmount = ref(0)
const fromDate = ref('')
const toDate = ref('')
const page = ref(1)
const pageSize = 20

/** --- Demo / Fetch --- */
onMounted(() => {
  const demo = JSON.parse(localStorage.getItem('my_orders')) || [
    { id: 1, customerName: 'John Doe', amount: 150, status: 'Paid',     orderDate: '2025-04-20' },
    { id: 2, customerName: 'Jane Smith', amount: 80,  status: 'Pending',  orderDate: '2025-04-22' },
    { id: 3, customerName: 'Ali Khan',  amount: 220, status: 'Cancelled', orderDate: '2025-04-24' },
    { id: 4, customerName: 'Maryam A.', amount: 120, status: 'Paid',     orderDate: '2025-05-01' },
    { id: 5, customerName: 'Peter P.',  amount: 45,  status: 'Pending',  orderDate: '2025-05-03' },
  ]
  orders.value = demo
  loading.value = false
})

/** --- Filters/Sort --- */
const statuses = [
  { label: 'All', value: 'ALL' },
  { label: 'Paid', value: 'Paid' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Cancelled', value: 'Cancelled' }
]

function toggleStatus(val) {
  if (val === 'ALL') { activeStatuses.value = []; return }
  const idx = activeStatuses.value.indexOf(val)
  if (idx >= 0) activeStatuses.value.splice(idx, 1)
  else activeStatuses.value.push(val)
  page.value = 1
}

const filtered = computed(() => {
  let arr = [...orders.value]

  // search
  if (q.value) {
    const term = q.value.toLowerCase()
    arr = arr.filter(o =>
      o.customerName.toLowerCase().includes(term) ||
      o.status.toLowerCase().includes(term)
    )
  }

  // status
  if (activeStatuses.value.length) {
    arr = arr.filter(o => activeStatuses.value.includes(o.status))
  }

  // amount
  if (minAmount.value > 0) {
    arr = arr.filter(o => Number(o.amount || 0) >= Number(minAmount.value))
  }

  // date range
  if (fromDate.value) {
    const from = new Date(fromDate.value).getTime()
    arr = arr.filter(o => new Date(o.orderDate).getTime() >= from)
  }
  if (toDate.value) {
    const to = new Date(toDate.value).getTime()
    arr = arr.filter(o => new Date(o.orderDate).getTime() <= to)
  }

  // sort
  arr.sort((a, b) => {
    if (sortBy.value === 'dateDesc') return new Date(b.orderDate) - new Date(a.orderDate)
    if (sortBy.value === 'dateAsc')  return new Date(a.orderDate) - new Date(b.orderDate)
    if (sortBy.value === 'amountDesc') return (b.amount ?? 0) - (a.amount ?? 0)
    if (sortBy.value === 'amountAsc')  return (a.amount ?? 0) - (b.amount ?? 0)
    if (sortBy.value === 'nameAsc') return a.customerName.localeCompare(b.customerName)
    return 0
  })

  return arr
})

const paged = computed(() => filtered.value.slice(0, page.value * pageSize))
const hasMore = computed(() => filtered.value.length > paged.value.length)
const totalAmount = computed(() => filtered.value.reduce((s, x) => s + Number(x.amount || 0), 0))

/** --- Actions --- */
function resetAll() {
  q.value = ''
  activeStatuses.value = []
  minAmount.value = 0
  fromDate.value = ''
  toDate.value = ''
  sortBy.value = 'dateDesc'
  page.value = 1
}

function viewOrder(id) {
  router.push(`/order-profile/${id}`)
}

async function copySummary(o) {
  const text = `Order #${o.id} • ${o.customerName} • ${formatUSD(o.amount)} • ${o.status} • ${formatDate(o.orderDate)}`
  try { await navigator.clipboard.writeText(text) } catch {}
}

function exportCSV() {
  const rows = [
    ['ID','Customer','Amount(USD)','Status','Order Date'],
    ...filtered.value.map(o => [o.id, o.customerName, o.amount, o.status, o.orderDate])
  ]
  const csv = rows.map(r => r.map(cell =>
    `"${String(cell).replaceAll('"','""')}"`
  ).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'orders.csv'; a.click()
  URL.revokeObjectURL(url)
}

/** --- UI helpers --- */
function statusBadge(s) {
  if (s === 'Paid') return 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30'
  if (s === 'Pending') return 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/30'
  if (s === 'Cancelled') return 'bg-red-500/20 text-red-200 ring-1 ring-red-400/30'
  return 'bg-white/10 text-white/80 ring-1 ring-white/15'
}
function formatUSD(n) {
  const num = Number(n || 0)
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}
function formatDate(d) {
  const dt = new Date(d)
  if (isNaN(dt)) return d || '—'
  return dt.toLocaleDateString()
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar{ display:none; }
.no-scrollbar{ -ms-overflow-style:none; scrollbar-width:none; }
</style>
