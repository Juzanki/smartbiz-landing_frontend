<template>
  <div class="customers-page container py-4 py-sm-5">
    <!-- Heading + Actions (mobile-first stack) -->
    <div class="topbar d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mb-3">
      <h2 class="m-0 fw-bold text-primary d-flex align-items-center gap-2">
        <span class="fs-4">👥</span>
        <span class="h4 h-sm-3 m-0">Customers</span>
      </h2>

      <!-- Sticky search on mobile -->
      <div class="search-wrap position-sticky top-0">
        <div class="input-group shadow-sm rounded-pill overflow-hidden">
          <span class="input-group-text bg-white border-0 pe-0 ps-3">🔍</span>
          <input
            v-model="search"
            type="search"
            class="form-control border-0"
            placeholder="Search name, platform, tag…"
            aria-label="Search customers"
            autocomplete="off"
            inputmode="search"
          />
          <button
            class="btn btn-outline-secondary border-0 px-3"
            type="button"
            @click="resetFilters"
            :disabled="!search && activeFilter==='All'"
          >
            Reset
          </button>
        </div>
      </div>
    </div>

    <!-- Quick filters (chips) -->
    <div class="chips scrollbar-hide d-flex align-items-center gap-2 mb-3">
      <button
        v-for="p in chips"
        :key="p"
        class="chip"
        :class="{ 'chip--active': activeFilter === p }"
        type="button"
        @click="activeFilter = p"
      >
        {{ p }}
      </button>
    </div>

    <!-- Loading skeletons -->
    <div v-if="loading" class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
      <div v-for="i in 6" :key="i" class="col">
        <div class="card card-skeleton rounded-4 p-3">
          <div class="sk-icon mb-3"></div>
          <div class="sk-line w-50 mb-2"></div>
          <div class="sk-line w-25 mb-3"></div>
          <div class="d-flex gap-2">
            <div class="sk-pill flex-fill"></div>
            <div class="sk-pill flex-fill"></div>
            <div class="sk-pill flex-fill"></div>
          </div>
          <div class="sk-btn mt-3"></div>
        </div>
      </div>
    </div>

    <!-- Customer grid -->
    <div v-else>
      <div
        v-if="filteredCustomers.length"
        class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3"
      >
        <div
          v-for="c in filteredCustomers"
          :key="c.id"
          class="col"
        >
          <div class="card customer-card h-100 rounded-4 border-0 shadow-sm">
            <div class="card-body text-center p-3 p-sm-4">
              <!-- Platform icon in a soft circle -->
              <div class="platform-badge mx-auto mb-2">
                <span class="platform-emoji">{{ c.platformIcon }}</span>
              </div>

              <!-- Name + tag -->
              <h5 class="fw-bold mb-1 text-truncate">{{ c.name }}</h5>
              <p class="text-muted small mb-3">
                {{ c.platform }}
                <span class="badge tag ms-2" v-if="c.tag">{{ c.tag }}</span>
              </p>

              <!-- Stats pills (wrap nicely on mobile) -->
              <div class="d-flex flex-wrap justify-content-center gap-2">
                <div class="stat-pill">
                  <span class="stat-title">Last Msg</span>
                  <span class="stat-value text-truncate">{{ c.lastMessage }}</span>
                </div>
                <div class="stat-pill">
                  <span class="stat-title">Orders</span>
                  <span class="stat-value">{{ c.totalOrders }}</span>
                </div>
                <div class="stat-pill">
                  <span class="stat-title">Loyalty</span>
                  <span class="stat-value">{{ c.loyaltyPoints }} pts</span>
                </div>
              </div>
            </div>

            <div class="card-footer bg-transparent border-0 p-3 pt-0">
              <div class="d-grid gap-2">
                <button class="btn btn-outline-primary rounded-pill" @click="viewCustomer(c.id)">
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-5">
        <div class="empty-icon">🗂️</div>
        <h5 class="fw-bold mb-1">No customers found</h5>
        <p class="text-muted mb-3">Try a different search or filter.</p>
        <button class="btn btn-primary rounded-pill" @click="resetFilters">Clear Filters</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

/* ---------------- Data ---------------- */
const customers = ref([])
const loading = ref(true)

/* Search (debounced) */
const search = ref('')
const debounced = ref('')
let t
watch(search, (v) => {
  clearTimeout(t)
  t = setTimeout(() => (debounced.value = v.trim().toLowerCase()), 250)
})

/* Quick filter chips */
const chips = ['All', 'WhatsApp', 'Telegram', 'SMS', 'Email']
const activeFilter = ref('All')

/* Fetch demo customers (replace with API later) */
onMounted(() => {
  const demo = JSON.parse(localStorage.getItem('my_customers')) || [
    { id: 1, name: 'John Doe',  platform: 'WhatsApp', platformIcon: '📱', lastMessage: 'Need assistance',             totalOrders: 5, loyaltyPoints: 120, tag: 'VIP' },
    { id: 2, name: 'Jane Smith',platform: 'Telegram', platformIcon: '✈️', lastMessage: 'Interested in your product',  totalOrders: 2, loyaltyPoints: 40,  tag: 'New' },
    { id: 3, name: 'Ali Khan',  platform: 'SMS',      platformIcon: '📲', lastMessage: 'Order delivered',              totalOrders: 8, loyaltyPoints: 200, tag: 'Frequent' }
  ]
  // simulate load
  setTimeout(() => {
    customers.value = demo
    loading.value = false
  }, 400)
})

/* Computed filter */
const filteredCustomers = computed(() => {
  const q = debounced.value
  const f = activeFilter.value
  return customers.value.filter(c => {
    const matchQ =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.platform.toLowerCase().includes(q) ||
      (c.tag && c.tag.toLowerCase().includes(q))
    const matchF = f === 'All' || c.platform.toLowerCase() === f.toLowerCase()
    return matchQ && matchF
  })
})

/* Actions */
function resetFilters() {
  search.value = ''
  debounced.value = ''
  activeFilter.value = 'All'
}
function viewCustomer(id) {
  router.push(`/customer-profile/${id}`)
}
</script>

<style scoped>
/* ---------- mobile-first polish ---------- */
.customers-page{
  /* little breathing room on very small screens */
  padding-left: .75rem;
  padding-right: .75rem;
}

/* Sticky search on mobile (sits below any app header) */
.search-wrap{
  z-index: 5;
  background: linear-gradient(#fff, #fff);
  border-radius: 1rem;
  margin-top: .25rem;
}

/* Chips row */
.chips{
  overflow-x: auto;
  padding-bottom: .25rem;
  -webkit-overflow-scrolling: touch;
}
.scrollbar-hide::-webkit-scrollbar{ display:none; }
.scrollbar-hide{ scrollbar-width: none; }

.chip{
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #111827;
  padding: .4rem .8rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: .9rem;
  transition: all .2s ease;
  white-space: nowrap;
}
.chip:hover{ background:#f8fafc; }
.chip--active{
  background:#ffd700;
  border-color:#ffd700;
  color:#181829;
  box-shadow: 0 6px 16px rgba(255,215,0,.35);
}

/* Card look */
.customer-card{
  transition: transform .18s ease, box-shadow .2s ease;
}
.customer-card:hover{
  transform: translateY(-3px);
  box-shadow: 0 12px 28px rgba(0,0,0,.08);
}

/* Platform avatar */
.platform-badge{
  width: 56px; height: 56px;
  border-radius: 50%;
  display: grid; place-items: center;
  background: #f1f5f9;
  box-shadow: inset 0 0 0 2px #e2e8f0;
}
.platform-emoji{ font-size: 1.35rem; }

/* Tag badge */
.tag{
  background: linear-gradient(135deg, #fff6b7, #fddb92);
  color:#111827;
  border-radius: 999px;
  padding: .15rem .5rem;
  font-weight: 700;
}

/* Stats pills */
.stat-pill{
  background:#f8fafc;
  border:1px solid #eef2f7;
  border-radius: .75rem;
  padding:.4rem .6rem;
  min-width: 90px;
  max-width: 160px;
}
.stat-title{
  display:block;
  font-size:.72rem;
  color:#6b7280;
  line-height:1.1;
}
.stat-value{
  display:block;
  font-weight:700;
  font-size:.9rem;
  color:#111827;
}

/* Empty state */
.empty-icon{
  font-size: 2.75rem;
  margin-bottom:.35rem;
}

/* ---------- Skeletons ---------- */
.card-skeleton{
  background: #fff;
  border:1px solid #f1f5f9;
}
@keyframes shimmer{
  0% { background-position: -200% 0; }
  100%{ background-position: 200% 0; }
}
.sk-icon, .sk-line, .sk-pill, .sk-btn{
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%);
  background-size: 400% 100%;
  animation: shimmer 1.2s infinite;
  border-radius: .5rem;
}
.sk-icon{ width:56px; height:56px; border-radius:50%; margin-inline:auto; }
.sk-line{ height:12px; }
.sk-pill{ height:28px; border-radius: 999px; }
.sk-btn{ height:36px; border-radius: 999px; }

/* ---------- Responsive niceties ---------- */
@media (min-width: 576px){
  .search-wrap{ top: .25rem; }
}
@media (min-width: 768px){
  .customers-page{ padding-left: 1rem; padding-right: 1rem; }
  .search-wrap{ position: static; }
}
</style>
