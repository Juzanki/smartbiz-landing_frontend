<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
    <!-- App Bar -->
    <header class="sticky top-0 z-20 backdrop-blur bg-slate-900/70 border-b border-white/10">
      <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <h1 class="text-base sm:text-lg font-semibold">📣 Create Referral Campaign</h1>
        <span class="hidden sm:inline px-2.5 py-1 rounded-full text-xs bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
          Mobile First
        </span>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 py-4 space-y-4">
      <!-- Form Card -->
      <section class="rounded-2xl p-4 sm:p-6 bg-white/5 ring-1 ring-white/10">
        <form @submit.prevent="onSubmit" novalidate class="grid gap-4">
          <!-- Title -->
          <div>
            <label class="text-sm text-white/70 block mb-1">Campaign Title</label>
            <input
              v-model.trim="form.title"
              class="w-full bg-white/5 ring-1 ring-white/15 focus:ring-white/30 rounded-xl px-3 py-2 text-sm"
              placeholder="Eg. Back-to-School Promo"
              @blur="touched.title = true"
              :aria-invalid="!!errors.title"
            />
            <p v-if="errors.title && touched.title" class="mt-1 text-xs text-red-300">{{ errors.title }}</p>
          </div>

          <!-- Product Picker -->
          <div class="grid gap-2">
            <div class="flex items-center justify-between">
              <label class="text-sm text-white/70">Product to Promote</label>
              <button v-if="!loading && products.length" type="button" class="text-xs text-white/60 underline" @click="reload">Reload</button>
            </div>

            <div class="relative">
              <input
                v-model.trim="productSearch"
                type="search"
                inputmode="search"
                placeholder="Search product…"
                class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-9 py-2 text-sm placeholder:text-white/40"
              />
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">🔎</span>
              <button v-if="productSearch" @click="productSearch=''" type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">✕</button>
            </div>

            <select
              v-model="form.product_id"
              class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm"
              :disabled="loading || !filteredProducts.length"
              @blur="touched.product_id = true"
              :aria-invalid="!!errors.product_id"
            >
              <option value="" disabled>Select product</option>
              <option v-for="p in filteredProducts" :key="p.id" :value="p.id">
                {{ p.name }} — {{ fmtTZS(p.price) }}
              </option>
            </select>

            <div v-if="loading" class="h-8 bg-white/5 ring-1 ring-white/10 rounded-xl animate-pulse"></div>
            <p v-if="!loading && !products.length" class="text-xs text-white/60">No products found.</p>
            <p v-if="errors.product_id && touched.product_id" class="text-xs text-red-300">{{ errors.product_id }}</p>
          </div>

          <!-- Commission -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-sm text-white/70">Commission Rate (%)</label>
              <span class="text-xs text-white/60">{{ form.rate }}%</span>
            </div>
            <input type="range" min="1" max="50" step="1" v-model.number="form.rate" class="w-full" />
            <div class="mt-1 text-xs text-white/60">
              Per sale: <b class="text-white/90">{{ fmtTZS(perSaleCommission) }}</b>
              <span v-if="selectedProduct"> • Product: {{ selectedProduct.name }}</span>
            </div>
          </div>

          <!-- Duration & Dates -->
          <div class="grid gap-3">
            <div>
              <label class="text-sm text-white/70 block mb-1">Campaign Duration</label>
              <div class="flex gap-2 overflow-x-auto no-scrollbar">
                <button
                  v-for="d in durationChips"
                  :key="d"
                  type="button"
                  @click="form.duration = d"
                  :class="['px-3 py-1.5 rounded-full text-xs ring-1',
                           form.duration===d ? 'bg-white text-slate-900 ring-white' : 'bg-white/5 ring-white/15']">
                  {{ d }} days
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label class="text-sm text-white/70 block mb-1">Start Date</label>
                <input type="date" v-model="form.start_date" class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm"
                       @blur="touched.start_date = true" :aria-invalid="!!errors.start_date" />
                <p v-if="errors.start_date && touched.start_date" class="mt-1 text-xs text-red-300">{{ errors.start_date }}</p>
              </div>
              <div>
                <label class="text-sm text-white/70 block mb-1">End Date</label>
                <input type="date" :value="endDate" disabled class="w-full bg-white/10 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm opacity-80" />
                <p class="mt-1 text-xs text-white/50">Auto: {{ endDate }}</p>
              </div>
            </div>
          </div>

          <!-- Estimated Impact -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="rounded-xl p-3 bg-white/5 ring-1 ring-white/10">
              <p class="text-[11px] text-white/60">Commission / Sale</p>
              <p class="font-semibold">{{ fmtTZS(perSaleCommission) }}</p>
            </div>
            <div class="rounded-xl p-3 bg-white/5 ring-1 ring-white/10">
              <p class="text-[11px] text-white/60">Target Sales</p>
              <input type="number" min="0" v-model.number="targetSales" class="w-full bg-white/5 ring-1 ring-white/15 rounded-lg px-2 py-1 text-sm mt-1" />
            </div>
            <div class="rounded-xl p-3 bg-white/5 ring-1 ring-white/10">
              <p class="text-[11px] text-white/60">Potential Earnings</p>
              <p class="font-semibold">{{ fmtTZS(potentialEarnings) }}</p>
            </div>
            <div class="rounded-xl p-3 bg-white/5 ring-1 ring-white/10">
              <p class="text-[11px] text-white/60">Duration</p>
              <p class="font-semibold">{{ form.duration }} days</p>
            </div>
          </div>

          <!-- Options -->
          <div class="flex flex-wrap gap-3 items-center">
            <label class="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" v-model="form.auto_approve_referrals" />
              <span>Auto-approve referrals</span>
            </label>
            <label class="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" v-model="form.limit_region" />
              <span>Limit by region</span>
            </label>
            <input v-if="form.limit_region" v-model.trim="form.region" placeholder="e.g., Dar es Salaam"
                   class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" />
          </div>

          <!-- Actions -->
          <div class="grid sm:flex sm:justify-end gap-2">
            <button type="button" @click="saveDraft"
              class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15 text-sm">Save Draft</button>
            <button type="submit" :disabled="submitting || !isValid"
              class="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm">
              {{ submitting ? 'Launching…' : '🚀 Launch Campaign' }}
            </button>
          </div>
        </form>
      </section>

      <!-- Alerts -->
      <section v-if="success" class="rounded-2xl p-4 bg-emerald-500/15 ring-1 ring-emerald-400/30 text-emerald-200">
        {{ success }}
      </section>
      <section v-if="error" class="rounded-2xl p-4 bg-red-500/15 ring-1 ring-red-400/30 text-red-200">
        {{ error }}
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'

/** ---------- State ---------- */
const loading = ref(true)
const submitting = ref(false)
const products = ref([])
const productSearch = ref('')

const form = ref({
  title: '',
  product_id: '',
  rate: 10,
  duration: 7,
  start_date: todayISO(),          // default leo
  auto_approve_referrals: true,
  limit_region: false,
  region: ''
})

const durationChips = [7, 14, 30, 60, 90]
const success = ref('')
const error = ref('')
const touched = ref({ title: false, product_id: false, start_date: false })
const targetSales = ref(10)

/** ---------- Fetch ---------- */
onMounted(async () => {
  try {
    const res = await axios.get('/api/products/my')
    products.value = Array.isArray(res.data) ? res.data : []
  } catch (e) {
    products.value = []
    error.value = 'Failed to load products.'
  } finally {
    loading.value = false
  }
})

/** ---------- Derived ---------- */
const filteredProducts = computed(() => {
  if (!productSearch.value) return products.value
  const q = productSearch.value.toLowerCase()
  return products.value.filter(p =>
    (p.name || '').toLowerCase().includes(q)
    || String(p.price || '').toLowerCase().includes(q)
  )
})

const selectedProduct = computed(() =>
  products.value.find(p => String(p.id) === String(form.value.product_id))
)

const perSaleCommission = computed(() => {
  const price = Number(selectedProduct.value?.price || 0)
  return Math.round(price * (Number(form.value.rate || 0) / 100))
})

const potentialEarnings = computed(() => {
  return perSaleCommission.value * Number(targetSales.value || 0)
})

const endDate = computed(() => addDaysISO(form.value.start_date, Number(form.value.duration || 0)))

/** ---------- Validation ---------- */
const errors = computed(() => {
  const out = {}
  if (!form.value.title || form.value.title.length < 3) out.title = 'Title is required (min 3 chars).'
  if (!form.value.product_id) out.product_id = 'Product is required.'
  if (!form.value.start_date) out.start_date = 'Start date is required.'
  // Optional: guard for past date
  if (form.value.start_date && new Date(form.value.start_date) < startOfDay(new Date())) {
    out.start_date = 'Start date cannot be in the past.'
  }
  return out
})

const isValid = computed(() => Object.keys(errors.value).length === 0)

/** ---------- Watchers ---------- */
watch(() => form.value.duration, () => {
  // No need to set end date manually; computed handles it
})

/** ---------- Actions ---------- */
async function onSubmit() {
  touched.value = { title: true, product_id: true, start_date: true }
  if (!isValid.value) return
  submitting.value = true
  success.value = ''
  error.value = ''

  try {
    const payload = {
      ...form.value,
      end_date: endDate.value,
    }
    await axios.post('/api/campaigns/create', payload)
    success.value = 'Campaign created successfully!'
    // Reset minimal
    form.value = {
      title: '',
      product_id: '',
      rate: 10,
      duration: 7,
      start_date: todayISO(),
      auto_approve_referrals: true,
      limit_region: false,
      region: ''
    }
    targetSales.value = 10
  } catch (e) {
    error.value = e?.response?.data?.detail || 'Something went wrong.'
  } finally {
    submitting.value = false
  }
}

function saveDraft() {
  try {
    const drafts = JSON.parse(localStorage.getItem('campaign_drafts') || '[]')
    drafts.unshift({ ...form.value, saved_at: new Date().toISOString() })
    localStorage.setItem('campaign_drafts', JSON.stringify(drafts))
    success.value = 'Draft saved locally.'
    error.value = ''
  } catch {
    error.value = 'Unable to save draft.'
  }
}

function reload() {
  loading.value = true
  axios.get('/api/products/my')
    .then(res => { products.value = Array.isArray(res.data) ? res.data : [] })
    .catch(() => { error.value = 'Failed to reload products.' })
    .finally(() => { loading.value = false })
}

/** ---------- Utils ---------- */
function todayISO() {
  const d = new Date()
  d.setHours(0,0,0,0)
  return d.toISOString().slice(0,10)
}
function addDaysISO(start, days) {
  if (!start) return ''
  const d = new Date(start)
  d.setDate(d.getDate() + (Number(days) || 0))
  return d.toISOString().slice(0,10)
}
function startOfDay(d) {
  const x = new Date(d); x.setHours(0,0,0,0); return x
}
function fmtTZS(n) {
  const num = Number(n || 0)
  if (num >= 1_000_000) return `${(num/1_000_000).toFixed(num >= 10_000_000 ? 0 : 1)}M TZS`
  if (num >= 1_000) return `${(num/1_000).toFixed(num >= 10_000 ? 0 : 1)}K TZS`
  return `${num.toLocaleString('en-US')} TZS`
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar{ display:none; }
.no-scrollbar{ -ms-overflow-style:none; scrollbar-width:none; }
</style>
