<template>
  <div class="products-page container py-4 py-sm-5">
    <!-- Heading + actions -->
    <div class="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mb-3">
      <h2 class="m-0 fw-bold text-primary d-flex align-items-center gap-2">
        <span class="fs-4">🛍️</span>
        <span class="h4 m-0">Products &amp; Services</span>
      </h2>

      <!-- Sticky search (mobile) -->
      <div class="search-wrap position-sticky top-0">
        <div class="input-group shadow-sm rounded-pill overflow-hidden">
          <span class="input-group-text bg-white border-0 pe-0 ps-3">🔎</span>
          <input
            v-model="search"
            type="search"
            class="form-control border-0"
            placeholder="Search by name or category…"
            autocomplete="off"
            inputmode="search"
            aria-label="Search products"
          />
          <button class="btn btn-outline-secondary border-0 px-3" type="button" @click="clearFilters" :disabled="!search && activeCat==='All' && sortBy==='Newest'">
            Reset
          </button>
        </div>
      </div>
    </div>

    <!-- Chips + sort -->
    <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
      <div class="chips scrollbar-hide d-flex align-items-center gap-2">
        <button v-for="c in chips" :key="c" class="chip" :class="{ 'chip--active': activeCat===c }" @click="activeCat=c">
          {{ c }}
        </button>
      </div>

      <div class="ms-auto d-flex align-items-center gap-2">
        <select v-model="sortBy" class="form-select form-select-sm sort-select">
          <option>Newest</option>
          <option>Price: Low → High</option>
          <option>Price: High → Low</option>
          <option>Stock: Low → High</option>
          <option>Stock: High → Low</option>
        </select>
        <button class="btn btn-primary btn-sm rounded-pill d-none d-sm-inline-flex" @click="goAdd">＋ Add Product</button>
      </div>
    </div>

    <!-- Skeletons -->
    <div v-if="loading" class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3">
      <div v-for="i in 8" :key="i" class="col">
        <div class="card card-skeleton rounded-4">
          <div class="sk-img"></div>
          <div class="p-3">
            <div class="sk-line w-75 mb-2"></div>
            <div class="sk-line w-50 mb-3"></div>
            <div class="d-flex gap-2">
              <div class="sk-pill flex-fill"></div>
              <div class="sk-pill" style="width:80px"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Grid -->
    <div v-else>
      <div v-if="visibleProducts.length" class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3">
        <div v-for="p in visibleProducts" :key="p.id" class="col">
          <div class="card product-card h-100 rounded-4 border-0 shadow-sm">
            <div class="product-thumb">
              <img :src="p.image || defaultImage" :alt="p.name" @error="onImgError($event)" />
              <span class="badge cat-badge">{{ p.category || 'Uncategorized' }}</span>
            </div>

            <div class="card-body p-3">
              <h6 class="fw-bold text-truncate mb-1">{{ p.name }}</h6>
              <p class="text-muted small text-truncate mb-2">{{ p.description || '—' }}</p>

              <div class="d-flex align-items-center justify-content-between">
                <div class="price">
                  <span class="fw-bold text-primary">${{ formatMoney(p.price) }}</span>
                </div>
                <span class="stock-pill" :class="stockClass(p.stock)">{{ p.stock }} pcs</span>
              </div>
            </div>

            <div class="card-footer bg-transparent border-0 pt-0 px-3 pb-3">
              <div class="d-grid gap-2">
                <button class="btn btn-outline-primary btn-sm rounded-pill" @click="viewProduct(p.id)">View</button>
                <button class="btn btn-outline-secondary btn-sm rounded-pill" @click="editProduct(p.id)">Edit</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else class="empty text-center py-5">
        <div class="emoji">📦</div>
        <h5 class="fw-bold mb-1">No products available.</h5>
        <p class="text-muted mb-3">Try adding a new product.</p>
        <button class="btn btn-primary rounded-pill" @click="goAdd">＋ Add Product</button>
      </div>
    </div>

    <!-- FAB for mobile -->
    <button class="fab d-sm-none" @click="goAdd" aria-label="Add Product">＋</button>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const defaultImage = '/icons/product-placeholder.png' // weka icon ndogo / public
const products = ref([])
const loading = ref(true)

/* Search (debounced) */
const search = ref('')
const debounced = ref('')
let t
watch(search, (v) => {
  clearTimeout(t)
  t = setTimeout(() => (debounced.value = v.trim().toLowerCase()), 250)
})

/* Category chips + sort */
const activeCat = ref('All')
const sortBy = ref('Newest')

const chips = computed(() => {
  const cats = Array.from(new Set(products.value.map(p => p.category).filter(Boolean))).sort()
  return ['All', ...cats]
})

/* Load demo/local storage */
onMounted(() => {
  const demo = JSON.parse(localStorage.getItem('my_products')) || []
  // simulate async
  setTimeout(() => {
    products.value = demo
    loading.value = false
  }, 350)
})

/* Filters + sort */
const visibleProducts = computed(() => {
  let list = products.value.slice()

  // search
  const q = debounced.value
  if (q) {
    list = list.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    )
  }

  // category
  if (activeCat.value !== 'All') {
    list = list.filter(p => (p.category || '').toLowerCase() === activeCat.value.toLowerCase())
  }

  // sort
  switch (sortBy.value) {
    case 'Price: Low → High':
      list.sort((a,b) => (a.price || 0) - (b.price || 0)); break
    case 'Price: High → Low':
      list.sort((a,b) => (b.price || 0) - (a.price || 0)); break
    case 'Stock: Low → High':
      list.sort((a,b) => (a.stock || 0) - (b.stock || 0)); break
    case 'Stock: High → Low':
      list.sort((a,b) => (b.stock || 0) - (a.stock || 0)); break
    default: // Newest (assumes id/time ascending)
      list.sort((a,b) => (b.created_at || b.id || 0) - (a.created_at || a.id || 0))
  }

  return list
})

/* Actions */
function clearFilters() {
  search.value = ''
  debounced.value = ''
  activeCat.value = 'All'
  sortBy.value = 'Newest'
}
function goAdd(){ router.push('/products/new') }
function viewProduct(id){ router.push(`/products/${id}`) }
function editProduct(id){ router.push(`/products/${id}/edit`) }

/* Utils */
function onImgError(e){ e.target.src = defaultImage }
function stockClass(n){
  if ((n ?? 0) <= 0) return 'stock--out'
  if (n <= 5) return 'stock--low'
  return ''
}
function formatMoney(v){
  const n = Number(v || 0)
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
/* ---------- Mobile-first polish ---------- */
.products-page{ padding-left:.75rem; padding-right:.75rem; }

/* Sticky search background to avoid transparency flicker */
.search-wrap{ z-index:5; background:#fff; border-radius:1rem; }

/* Chips row */
.chips{ overflow-x:auto; -webkit-overflow-scrolling:touch; padding-bottom:.25rem; }
.scrollbar-hide::-webkit-scrollbar{ display:none; }
.scrollbar-hide{ scrollbar-width:none; }

.chip{
  border:1px solid #e5e7eb;
  background:#fff;
  color:#111827;
  padding:.4rem .8rem;
  border-radius:999px;
  font-weight:600;
  font-size:.9rem;
  transition:all .2s ease;
  white-space:nowrap;
}
.chip:hover{ background:#f8fafc; }
.chip--active{
  background:#ffd700;
  border-color:#ffd700;
  color:#181829;
  box-shadow:0 6px 16px rgba(255,215,0,.35);
}

/* Sort select */
.sort-select{ min-width: 180px; }

/* Product card */
.product-card{ transition: transform .18s ease, box-shadow .2s ease; }
.product-card:hover{ transform: translateY(-3px); box-shadow:0 12px 28px rgba(0,0,0,.08); }

.product-thumb{
  position:relative;
  aspect-ratio: 4 / 3;
  overflow:hidden;
  border-top-left-radius:1rem;
  border-top-right-radius:1rem;
  background:#f8fafc;
}
.product-thumb img{
  width:100%; height:100%; object-fit:cover; display:block;
  transition: transform .4s ease;
}
.product-card:hover .product-thumb img{ transform: scale(1.03); }

.cat-badge{
  position:absolute; left:.6rem; top:.6rem;
  background: rgba(255,255,255,.9);
  color:#111827; border:1px solid #e5e7eb;
  padding:.2rem .5rem; border-radius: 999px;
  font-weight:700; font-size:.7rem;
}

/* Stock pill */
.stock-pill{
  background:#f1f5f9;
  border:1px solid #e2e8f0;
  color:#0f172a;
  border-radius:999px;
  padding:.15rem .5rem;
  font-weight:700;
  font-size:.8rem;
}
.stock--low{ background:#fff6e6; border-color:#ffd9a8; color:#8a5800; }
.stock--out{ background:#fee2e2; border-color:#fecaca; color:#991b1b; }

/* Empty */
.empty .emoji{ font-size:2.6rem; }

/* FAB (mobile) */
.fab{
  position:fixed; right:14px; bottom:18px; z-index:20;
  width:52px; height:52px; border-radius:50%;
  border:0; color:#0b1220; background:#ffd700;
  box-shadow: 0 12px 30px rgba(0,0,0,.22);
  font-size:1.5rem; line-height:1;
}

/* Skeletons */
.card-skeleton{ overflow:hidden; }
@keyframes shimmer{ 0%{background-position:-200% 0} 100%{background-position:200% 0} }
.sk-img, .sk-line, .sk-pill{
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%);
  background-size:400% 100%; animation:shimmer 1.2s infinite;
  border-radius:.5rem;
}
.sk-img{ aspect-ratio:4/3; }
.sk-line{ height:12px; }
.sk-pill{ height:28px; border-radius:999px; }

/* Responsive tweaks */
@media (min-width:576px){ .search-wrap{ top:.25rem; } }
@media (min-width:768px){
  .products-page{ padding-left:1rem; padding-right:1rem; }
  .search-wrap{ position:static; }
}
</style>
