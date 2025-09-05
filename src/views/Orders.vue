<template>
  <DashboardLayout>
    <div class="orders-page">

      <!-- Header + filters (mobile-first, sticky on mobile) -->
      <div class="toolbar">
        <div class="title-wrap">
          <h2 class="title">
            {{ $t?.('orders') ?? 'Orders' }}
          </h2>
          <span class="count">({{ filteredOrders.length }})</span>
        </div>

        <div class="filters">
          <div class="search">
            <input
              v-model.trim="query"
              type="search"
              inputmode="search"
              autocomplete="off"
              :placeholder="$t?.('search') ?? 'Search…'"
              aria-label="Search orders"
            />
            <button class="btn-reset" :disabled="!canReset" @click="resetFilters">Reset</button>
          </div>

          <div class="chips">
            <button
              v-for="s in statuses"
              :key="s"
              class="chip"
              :class="{ 'chip--active': statusFilter === s }"
              @click="statusFilter = s"
            >
              {{ s }}
            </button>
          </div>

          <div class="sort">
            <select v-model="sortBy" aria-label="Sort orders">
              <option value="Newest">Newest</option>
              <option value="Oldest">Oldest</option>
              <option value="Customer A→Z">Customer A→Z</option>
              <option value="Customer Z→A">Customer Z→A</option>
              <option value="Status">Status</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Intro -->
      <p class="intro">
        {{ $t?.('orders_intro') ?? 'Track and manage your recent orders here.' }}
      </p>

      <!-- Cards (mobile) -->
      <div class="cards" aria-label="Orders list (mobile)">
        <article
          v-for="o in filteredOrders"
          :key="o.id"
          class="card"
          @click="openOrder(o)"
          role="button"
          tabindex="0"
        >
          <div class="card-row">
            <div class="label">#</div>
            <div class="value">#{{ o.id }}</div>
          </div>
          <div class="card-row">
            <div class="label">{{ $t?.('customer') ?? 'Customer' }}</div>
            <div class="value">{{ o.customer }}</div>
          </div>
          <div class="card-row">
            <div class="label">{{ $t?.('product') ?? 'Product' }}</div>
            <div class="value">{{ o.product }}</div>
          </div>
          <div class="card-row">
            <div class="label">{{ $t?.('status') ?? 'Status' }}</div>
            <div class="value">
              <span class="badge" :class="badgeClass(o.status)">{{ o.status }}</span>
            </div>
          </div>
          <div class="card-row">
            <div class="label">{{ $t?.('date') ?? 'Date' }}</div>
            <div class="value muted">{{ o.date }}</div>
          </div>
        </article>
      </div>

      <!-- Table (desktop) -->
      <div class="table-wrap" aria-label="Orders table (desktop)">
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ $t?.('customer') ?? 'Customer' }}</th>
              <th>{{ $t?.('product') ?? 'Product' }}</th>
              <th>{{ $t?.('status') ?? 'Status' }}</th>
              <th>{{ $t?.('date') ?? 'Date' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in filteredOrders" :key="o.id" @click="openOrder(o)">
              <td>#{{ o.id }}</td>
              <td class="cell-ellipsis" :title="o.customer">{{ o.customer }}</td>
              <td class="cell-ellipsis" :title="o.product">{{ o.product }}</td>
              <td><span class="badge" :class="badgeClass(o.status)">{{ o.status }}</span></td>
              <td class="muted">{{ o.date }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <div v-if="!filteredOrders.length" class="empty">
        <div class="emoji">🗂️</div>
        <h4>No orders match your filters.</h4>
        <p class="muted">Try clearing the search or picking a different status.</p>
        <button class="btn-primary" @click="resetFilters">Reset Filters</button>
      </div>

    </div>
  </DashboardLayout>
</template>

<script setup>
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

/* Sample data (replace with API data when ready) */
const orders = ref([
  { id: 1, customer: 'John Doe',  product: 'Promo Pack',           status: 'Pending',    date: '2025-04-19' },
  { id: 2, customer: 'Jane Smith',product: 'AI Bot Subscription',  status: 'Completed',  date: '2025-04-18' },
  { id: 3, customer: 'Ali Mussa', product: 'SMS Package',          status: 'Processing', date: '2025-04-17' },
  { id: 4, customer: 'Maria Lee', product: 'Email Credits',        status: 'Cancelled',  date: '2025-04-16' },
])

/* Filters */
const query = ref('')
const statuses = ['All', 'Pending', 'Processing', 'Completed', 'Cancelled']
const statusFilter = ref('All')
const sortBy = ref('Newest')

const canReset = computed(() =>
  !!query.value || statusFilter.value !== 'All' || sortBy.value !== 'Newest'
)

function resetFilters(){
  query.value = ''
  statusFilter.value = 'All'
  sortBy.value = 'Newest'
}

/* Helpers */
function badgeClass(status){
  switch ((status || '').toLowerCase()){
    case 'completed':  return 'badge--success'
    case 'processing': return 'badge--info'
    case 'pending':    return 'badge--warning'
    case 'cancelled':  return 'badge--danger'
    default:           return ''
  }
}

/* Sorting helper */
function sortList(list){
  const copy = list.slice()
  switch (sortBy.value){
    case 'Oldest':
      return copy.sort((a,b) => new Date(a.date) - new Date(b.date))
    case 'Customer A→Z':
      return copy.sort((a,b) => a.customer.localeCompare(b.customer))
    case 'Customer Z→A':
      return copy.sort((a,b) => b.customer.localeCompare(a.customer))
    case 'Status':
      return copy.sort((a,b) => a.status.localeCompare(b.status))
    default: // Newest
      return copy.sort((a,b) => new Date(b.date) - new Date(a.date))
  }
}

/* Final filtered list */
const filteredOrders = computed(() => {
  let list = orders.value

  const q = query.value.toLowerCase().trim()
  if (q) {
    list = list.filter(o =>
      (o.customer || '').toLowerCase().includes(q) ||
      (o.product  || '').toLowerCase().includes(q) ||
      (o.status   || '').toLowerCase().includes(q)
    )
  }

  if (statusFilter.value !== 'All') {
    list = list.filter(o => (o.status || '').toLowerCase() === statusFilter.value.toLowerCase())
  }

  return sortList(list)
})

/* Navigate to details (change route to your real page if exists) */
function openOrder(o){
  // Example route: /orders/1
  router.push(`/orders/${o.id}`)
}
</script>

<style scoped>
/* ======= Theme tokens ======= */
:root{
  --brand:#0A1C3D;
  --text:#0f172a;
  --muted:#64748b;
  --panel:#ffffff;
  --line:#e2e8f0;
  --bg:#f8fafc;
  --gold:#ffd700;
}

/* Page */
.orders-page{
  padding: 16px;
  color: var(--text);
  background: var(--bg);
}

/* Sticky toolbar (mobile) */
.toolbar{
  position: sticky;
  top: 0;
  z-index: 5;
  background: linear-gradient(#ffffff, #ffffffcc);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid #ffffff00;
  padding: 10px 0 12px;
  margin-bottom: 8px;
}

.title-wrap{ display:flex; align-items:center; gap:.5rem; margin-bottom:.5rem; }
.title{ font-size:1.25rem; font-weight:800; color:var(--brand); margin:0; }
.count{ color:var(--muted); font-weight:700; }

.filters{ display:flex; flex-direction:column; gap:8px; }

/* Search */
.search{ display:flex; align-items:center; gap:6px; }
.search input{
  flex:1; height:40px; border-radius:12px; padding:.5rem .75rem;
  border:1px solid var(--line); outline:none; background:#fff;
}
.search input:focus{ box-shadow:0 0 0 2px #ffd70066; border-color:#ffd700; }
.btn-reset{
  height:40px; padding:0 .9rem; border-radius:12px; border:1px solid var(--line);
  background:#fff; color:var(--text); font-weight:600;
}
.btn-reset:disabled{ opacity:.5; cursor:not-allowed; }

/* Chips */
.chips{ display:flex; gap:8px; overflow:auto; -webkit-overflow-scrolling:touch; padding-bottom:2px; }
.chip{
  border:1px solid var(--line); background:#fff; color:var(--text);
  padding:.4rem .8rem; border-radius:999px; font-weight:700; font-size:.85rem;
  white-space:nowrap;
}
.chip--active{
  background:#22c55e; border-color:#22c55e; color:#052e16;
  box-shadow:0 6px 16px rgba(34,197,94,.35);
}

/* Sort */
.sort select{
  height:40px; border-radius:12px; border:1px solid var(--line);
  background:#fff; padding:0 .65rem; font-weight:600;
}

/* Intro */
.intro{ color:var(--muted); margin:12px 0 16px; }

/* Cards (shown on <768px) */
.cards{ display:grid; grid-template-columns:1fr; gap:10px; }
.card{
  background:var(--panel); border:1px solid var(--line);
  border-radius:16px; padding:12px; box-shadow:0 6px 18px rgba(0,0,0,.04);
}
.card:focus{ outline:2px solid var(--gold); outline-offset:2px; }
.card-row{ display:flex; justify-content:space-between; gap:8px; padding:6px 0; }
.label{ color:var(--muted); font-size:.85rem; }
.value{ font-weight:700; }
.value.muted{ color:var(--muted); font-weight:600; }

/* Table (hidden on <768px) */
.table-wrap{ display:none; background:var(--panel); border:1px solid var(--line); border-radius:16px; }
.table{ width:100%; border-collapse:separate; border-spacing:0; }
.table thead th{
  text-align:left; font-size:.85rem; color:var(--muted); padding:14px 12px; background:#f1f5f9;
}
.table tbody td{ padding:14px 12px; border-top:1px solid var(--line); }
.table tbody tr{ cursor:pointer; }
.table tbody tr:hover{ background:#f9fafb; }
.cell-ellipsis{
  max-width:260px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.muted{ color:var(--muted); }

/* Badges */
.badge{
  display:inline-flex; align-items:center; gap:6px;
  padding:.25rem .55rem; border-radius:999px; font-weight:800; font-size:.78rem;
}
.badge::before{ content:''; width:.45rem; height:.45rem; border-radius:50%; }
.badge--success{ background:#dcfce7; color:#065f46; }
.badge--success::before{ background:#10b981; }
.badge--info{ background:#dbeafe; color:#1e3a8a; }
.badge--info::before{ background:#3b82f6; }
.badge--warning{ background:#fef9c3; color:#854d0e; }
.badge--warning::before{ background:#f59e0b; }
.badge--danger{ background:#fee2e2; color:#991b1b; }
.badge--danger::before{ background:#ef4444; }

/* Empty */
.empty{ text-align:center; padding:48px 12px; }
.empty .emoji{ font-size:42px; margin-bottom:6px; }
.btn-primary{
  background:var(--brand); color:#fff; border:0; padding:.6rem 1rem;
  border-radius:12px; font-weight:800;
}

/* Desktop styles */
@media (min-width:768px){
  .orders-page{ padding:24px; }
  .toolbar{
    position:static; background:transparent; backdrop-filter:none; padding:0; margin-bottom:8px;
  }
  .title{ font-size:1.6rem; }
  .filters{
    flex-direction:row; align-items:center; gap:10px; margin-top:6px;
  }
  .search{ min-width:360px; }
  .cards{ display:none; }
  .table-wrap{ display:block; overflow:auto; }
}
</style>
