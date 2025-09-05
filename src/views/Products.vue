<template>
  <div class="products container py-4 py-sm-5">
    <!-- Header + actions -->
    <div
      class="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mb-3"
    >
      <h2 class="m-0 fw-bold text-primary d-flex align-items-center gap-2">
        <span class="fs-4">🛍️</span>
        <span class="h4 m-0">Products &amp; Services</span>
        <span class="count ms-1 text-muted fw-semibold">({{ visibleProducts.length }})</span>
      </h2>

      <!-- Sticky (mobile) search + add -->
      <div class="search-wrap position-sticky top-0">
        <div class="input-group shadow-sm rounded-pill overflow-hidden">
          <span class="input-group-text border-0 bg-white ps-3 pe-0">🔎</span>
          <input
            v-model="search"
            type="search"
            class="form-control border-0"
            placeholder="Search by name or category…"
            inputmode="search"
            autocomplete="off"
            aria-label="Search products"
          />
          <button
            class="btn btn-outline-secondary border-0 px-3"
            type="button"
            @click="resetFilters"
            :disabled="!search && activeCat==='All' && sortBy==='Newest'"
            title="Reset filters"
          >
            Reset
          </button>
        </div>
      </div>
    </div>

    <!-- Chips + sort -->
    <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
      <div class="chips scrollbar-hide d-flex align-items-center gap-2">
        <button
          v-for="c in chips"
          :key="c"
          class="chip"
          :class="{ 'chip--active': activeCat===c }"
          @click="activeCat=c"
        >
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
        <button class="btn btn-success btn-sm rounded-pill d-none d-sm-inline-flex" @click="openAddModal">
          ➕ Add Product
        </button>
      </div>
    </div>

    <!-- Grid -->
    <div v-if="visibleProducts.length" class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3">
      <div v-for="product in visibleProducts" :key="product.id" class="col">
        <div class="card product-card h-100 rounded-4 border-0 shadow-sm">
          <div class="thumb">
            <img
              :src="product.image || defaultImage"
              :alt="product.name"
              @error="onImgError($event)"
            />
            <span class="badge cat-badge">{{ product.category || 'Uncategorized' }}</span>
          </div>

          <div class="card-body p-3">
            <h6 class="fw-bold text-truncate mb-1">{{ product.name }}</h6>
            <p class="text-muted small text-truncate mb-2">
              {{ product.description || '—' }}
            </p>

            <div class="d-flex align-items-center justify-content-between">
              <span class="fw-bold text-primary">${{ money(product.price) }}</span>
              <span class="stock-pill" :class="stockClass(product.stock)">
                {{ product.stock ?? 0 }} left
              </span>
            </div>
          </div>

          <div class="card-footer bg-transparent border-0 pt-0 px-3 pb-3">
            <div class="d-grid">
              <button class="btn btn-outline-primary btn-sm rounded-pill" @click="viewProduct(product.id)">
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-5">
      <div class="display-6">📦</div>
      <h5 class="fw-bold mb-1">No products available.</h5>
      <p class="text-muted mb-3">Try adding a new product.</p>
      <button class="btn btn-success rounded-pill" @click="openAddModal">➕ Add Product</button>
    </div>

    <!-- FAB (mobile) -->
    <button class="fab d-sm-none" @click="openAddModal" aria-label="Add Product">＋</button>

    <!-- Add Product Modal -->
    <div
      class="modal fade"
      id="addProductModal"
      tabindex="-1"
      aria-labelledby="addProductModalLabel"
      aria-hidden="true"
      ref="addModalEl"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-4">
          <form @submit.prevent="submitNewProduct" novalidate>
            <div class="modal-header">
              <h5 class="modal-title fw-bold" id="addProductModalLabel">Add New Product</h5>
              <button type="button" class="btn-close" @click="closeAddModal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-12">
                  <label class="form-label small">Product Name</label>
                  <input
                    v-model.trim="newProduct.name"
                    type="text"
                    class="form-control"
                    required
                    maxlength="80"
                    placeholder="e.g. Premium Hoodie"
                  />
                </div>

                <div class="col-6">
                  <label class="form-label small">Category</label>
                  <input
                    v-model.trim="newProduct.category"
                    type="text"
                    class="form-control"
                    placeholder="e.g. Clothing"
                  />
                </div>

                <div class="col-6">
                  <label class="form-label small">Price (USD)</label>
                  <input
                    v-model.number="newProduct.price"
                    type="number"
                    class="form-control"
                    inputmode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div class="col-6">
                  <label class="form-label small">Stock</label>
                  <input
                    v-model.number="newProduct.stock"
                    type="number"
                    class="form-control"
                    inputmode="numeric"
                    min="0"
                    step="1"
                    placeholder="0"
                    required
                  />
                </div>

                <div class="col-6">
                  <label class="form-label small">Image URL</label>
                  <input
                    v-model.trim="newProduct.image"
                    type="url"
                    class="form-control"
                    placeholder="https://…"
                  />
                </div>

                <div class="col-12">
                  <label class="form-label small">Short Description</label>
                  <textarea
                    v-model.trim="newProduct.description"
                    class="form-control"
                    rows="3"
                    maxlength="240"
                    placeholder="One or two lines about the product…"
                  ></textarea>
                </div>

                <div class="col-12" v-if="newProduct.image">
                  <label class="form-label small text-muted">Preview</label>
                  <div class="preview border rounded-3 p-2">
                    <img :src="newProduct.image" alt="Preview" @error="newProduct.image=''" />
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-light" @click="closeAddModal">Cancel</button>
              <button type="submit" class="btn btn-success">
                Save Product
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'

/* If Bootstrap is global on window */
const bootstrap = window.bootstrap

const router = useRouter()

const defaultImage = '/default-product.png'
const products = ref([])
const search = ref('')
const activeCat = ref('All')
const sortBy = ref('Newest')

/* Modal */
const addModalEl = ref(null)
let addModalInstance = null

/* New product */
const newProduct = ref({
  name: '',
  category: '',
  price: null,
  stock: 0,
  image: '',
  description: ''
})

/* Load from localStorage */
onMounted(() => {
  const saved = JSON.parse(localStorage.getItem('my_products') || '[]')
  products.value = saved

  // init modal
  if (bootstrap && addModalEl.value) {
    addModalInstance = new bootstrap.Modal(addModalEl.value)
  }
})

/* Chips (categories) */
const chips = computed(() => {
  const cats = Array.from(new Set(products.value.map(p => p.category).filter(Boolean))).sort()
  return ['All', ...cats]
})

/* Filters + sort */
const visibleProducts = computed(() => {
  let list = products.value.slice()

  // search
  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    )
  }

  // category
  if (activeCat.value !== 'All') {
    list = list.filter(p => (p.category || '').toLowerCase() === activeCat.value.toLowerCase())
  }

  // sort
  switch (sortBy.value) {
    case 'Price: Low → High': list.sort((a,b)=>(a.price||0)-(b.price||0)); break
    case 'Price: High → Low': list.sort((a,b)=>(b.price||0)-(a.price||0)); break
    case 'Stock: Low → High': list.sort((a,b)=>(a.stock||0)-(b.stock||0)); break
    case 'Stock: High → Low': list.sort((a,b)=>(b.stock||0)-(a.stock||0)); break
    default: list.sort((a,b)=>(b.created_at||b.id||0)-(a.created_at||a.id||0))
  }

  return list
})

/* Actions */
function resetFilters(){
  search.value=''
  activeCat.value='All'
  sortBy.value='Newest'
}
function openAddModal(){ addModalInstance?.show() }
function closeAddModal(){ addModalInstance?.hide() }

function submitNewProduct(){
  // minimal validation
  if (!newProduct.value.name || newProduct.value.price==null || newProduct.value.stock==null) return

  const prod = {
    id: Date.now(),
    created_at: Date.now(),
    ...newProduct.value
  }
  products.value.unshift(prod)
  localStorage.setItem('my_products', JSON.stringify(products.value))
  // reset form
  newProduct.value = { name:'', category:'', price:null, stock:0, image:'', description:'' }
  closeAddModal()
}

function viewProduct(id){ router.push(`/product-profile/${id}`) }

/* Utils */
function onImgError(e){ e.target.src = defaultImage }
function money(v){
  const n = Number(v || 0)
  return n.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})
}
function stockClass(n){
  const v = Number(n||0)
  if (v<=0) return 'stock--out'
  if (v<=5) return 'stock--low'
  return ''
}
</script>

<style scoped>
/* Base */
.products{ padding-left:.75rem; padding-right:.75rem; }
.count{ font-size:.95rem; }

/* Sticky search bg */
.search-wrap{ z-index:5; background:#fff; border-radius:1rem; }

/* Chips */
.chips{ overflow-x:auto; -webkit-overflow-scrolling:touch; padding-bottom:.25rem; }
.scrollbar-hide::-webkit-scrollbar{ display:none; }
.scrollbar-hide{ scrollbar-width:none; }

.chip{
  border:1px solid #e5e7eb; background:#fff; color:#111827;
  padding:.4rem .8rem; border-radius:999px; font-weight:600; font-size:.9rem;
  transition:all .2s ease; white-space:nowrap;
}
.chip:hover{ background:#f8fafc; }
.chip--active{
  background:#22c55e; border-color:#22c55e; color:#071b0f;
  box-shadow:0 6px 16px rgba(34,197,94,.35);
}

/* Sort select */
.sort-select{ min-width: 180px; }

/* Card */
.product-card{ transition:transform .18s ease, box-shadow .2s ease; }
.product-card:hover{ transform:translateY(-3px); box-shadow:0 12px 28px rgba(0,0,0,.08); }

.thumb{
  position:relative; aspect-ratio: 4/3; overflow:hidden;
  border-top-left-radius:1rem; border-top-right-radius:1rem; background:#f8fafc;
}
.thumb img{ width:100%; height:100%; object-fit:cover; transition:transform .4s ease; display:block; }
.product-card:hover .thumb img{ transform:scale(1.03); }

.cat-badge{
  position:absolute; left:.6rem; top:.6rem;
  background:rgba(255,255,255,.9); color:#111827; border:1px solid #e5e7eb;
  padding:.2rem .5rem; border-radius:999px; font-weight:700; font-size:.7rem;
}

/* Stock pill */
.stock-pill{
  background:#f1f5f9; border:1px solid #e2e8f0; color:#0f172a;
  border-radius:999px; padding:.15rem .5rem; font-weight:700; font-size:.8rem;
}
.stock--low{ background:#fff6e6; border-color:#ffd9a8; color:#8a5800; }
.stock--out{ background:#fee2e2; border-color:#fecaca; color:#991b1b; }

/* Preview */
.preview img{ width:100%; height:auto; display:block; border-radius:.5rem; }

/* FAB */
.fab{
  position:fixed; right:14px; bottom:18px; z-index:20;
  width:52px; height:52px; border-radius:50%; border:0;
  color:#071b0f; background:#22c55e; font-size:1.5rem; line-height:1;
  box-shadow:0 12px 30px rgba(0,0,0,.22);
}

/* Responsive */
@media (min-width:768px){
  .products{ padding-left:1rem; padding-right:1rem; }
  .search-wrap{ position:static; }
}
</style>
