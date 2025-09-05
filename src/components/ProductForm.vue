<!-- 📁 src/components/ProductFormPro.vue -->
<template>
  <div class="relative max-w-xl mx-auto bg-white dark:bg-[#0b1020] rounded-2xl border border-black/10 dark:border-white/10 shadow p-4 sm:p-5"
       :style="safeArea"
       role="dialog" aria-label="Product form">
    <header class="flex items-center justify-between">
      <h3 class="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
        {{ editing ? 'Edit Product' : 'Add New Product or Service' }}
      </h3>
      <span v-if="dirty" class="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" title="Unsaved changes"></span>
    </header>

    <!-- Tips / errors -->
    <transition name="fade">
      <div v-if="error" class="mt-2 text-[12px] rounded-lg px-3 py-2 bg-rose-600/15 text-rose-700 dark:text-rose-200 border border-rose-600/30">
        ⛔ {{ error }}
      </div>
    </transition>
    <transition name="fade">
      <div v-if="queued" class="mt-2 text-[12px] rounded-lg px-3 py-2 bg-amber-500/15 text-amber-800 dark:text-amber-100 border border-amber-500/30">
        ⚠️ You’re offline — we queued your save. It’ll sync when back online.
      </div>
    </transition>

    <!-- 🧱 Form -->
    <form @submit.prevent="onSubmit" class="mt-3 grid gap-3">
      <!-- Basics -->
      <div class="grid gap-2">
        <label class="label" :for="ids.name">Name<span class="req">*</span></label>
        <input :id="ids.name" v-model.trim="form.name" class="input" placeholder="e.g., Smart Mug / Web Design Service" required
               :aria-invalid="!!v.name"/>
        <p v-if="v.name" class="hint-err">{{ v.name }}</p>
      </div>

      <div class="grid gap-2">
        <label class="label" :for="ids.desc">Description</label>
        <textarea :id="ids.desc" v-model.trim="form.description" class="input min-h-[88px]" placeholder="Short description..."></textarea>
      </div>

      <!-- Type -->
      <div class="flex items-center gap-3">
        <label class="label">Type</label>
        <label class="chip" :class="!form.is_service && 'chip-active'">
          <input type="radio" class="sr-only" v-model="form.is_service" :value="false" />
          Product
        </label>
        <label class="chip" :class="form.is_service && 'chip-active'">
          <input type="radio" class="sr-only" v-model="form.is_service" :value="true" />
          Service
        </label>
      </div>

      <!-- Category -->
      <div class="grid gap-2">
        <label class="label" :for="ids.category">Category</label>
        <div class="flex gap-2">
          <input :id="ids.category" v-model.trim="form.category" class="input flex-1" list="cat-suggest" placeholder="e.g., Accessories / Consulting" />
          <datalist id="cat-suggest">
            <option v-for="c in suggestions" :key="c" :value="c" />
          </datalist>
        </div>
        <div class="flex flex-wrap gap-2">
          <button v-for="c in suggestions.slice(0,6)" :key="c" type="button" class="tag" @click="form.category = c">{{ c }}</button>
        </div>
      </div>

      <!-- SKU & Stock -->
      <div class="grid grid-cols-2 gap-3">
        <div class="grid gap-2">
          <label class="label" :for="ids.sku">SKU</label>
          <div class="flex gap-2">
            <input :id="ids.sku" v-model.trim="form.sku" class="input flex-1" placeholder="Auto or custom" />
            <button type="button" class="btn-ghost" @click="genSku">Generate</button>
          </div>
        </div>

        <div class="grid gap-2" v-if="!form.is_service">
          <label class="label" :for="ids.stock">Stock</label>
          <input :id="ids.stock" v-model.number="form.stock" type="number" min="0" class="input" placeholder="0" :aria-invalid="!!v.stock" />
          <p v-if="v.stock" class="hint-err">{{ v.stock }}</p>
        </div>
      </div>

      <!-- Pricing -->
      <div class="grid grid-cols-2 gap-3">
        <div class="grid gap-2">
          <label class="label" :for="ids.price">Price<span class="req">*</span></label>
          <div class="flex items-center gap-2">
            <select v-model="currency" class="input w-24">
              <option>TZS</option><option>USD</option><option>KES</option><option>ZAR</option>
            </select>
            <input :id="ids.price" v-model.number="form.price" type="number" min="0" step="0.01" class="input flex-1" placeholder="0.00" required :aria-invalid="!!v.price"/>
          </div>
          <p v-if="v.price" class="hint-err">{{ v.price }}</p>
        </div>

        <div class="grid gap-2">
          <label class="label" :for="ids.cost">Cost</label>
          <input :id="ids.cost" v-model.number="form.cost" type="number" min="0" step="0.01" class="input" placeholder="0.00" />
        </div>
      </div>

      <!-- Discount & Margin -->
      <div class="grid grid-cols-2 gap-3">
        <div class="grid gap-2">
          <label class="label" :for="ids.discount">Discount %</label>
          <input :id="ids.discount" v-model.number="form.discountPct" type="number" min="0" max="95" step="1" class="input" placeholder="e.g., 10" />
          <p class="hint text-[11px]">Final: <b>{{ displayCurrency(finalPrice) }}</b></p>
        </div>
        <div class="grid gap-2">
          <label class="label">Margin</label>
          <div class="input grid place-items-center font-semibold">
            {{ marginDisplay }}
          </div>
        </div>
      </div>

      <!-- Media -->
      <div class="grid gap-2">
        <label class="label">Images</label>
        <div
          class="border border-dashed border-slate-300 dark:border-white/15 rounded-xl p-3 text-center text-[12px] text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5"
          @dragover.prevent
          @drop.prevent="onDrop"
        >
          <input ref="fileInput" type="file" multiple accept="image/*" class="hidden" @change="onPick" />
          <button type="button" class="btn-soft" @click="fileInput?.click()">Upload</button>
          <span class="ml-2">or drag & drop (max 5)</span>
        </div>

        <div v-if="images.length" class="mt-2 grid grid-cols-4 gap-2">
          <div v-for="(img, i) in images" :key="img.id" class="relative group">
            <img :src="img.url" class="h-20 w-full object-cover rounded-lg border border-black/10 dark:border-white/10" alt="" />
            <button type="button" class="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white text-xs hidden group-hover:grid place-items-center"
                    @click="removeImg(img.id)">✖</button>
            <div class="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1 rounded">#{{ i+1 }}</div>
          </div>
        </div>
      </div>

      <!-- Advanced -->
      <details class="mt-1">
        <summary class="cursor-pointer text-[13px] text-slate-600 dark:text-slate-300">Advanced options</summary>
        <div class="mt-2 grid gap-2">
          <label class="label" :for="ids.tags">Tags</label>
          <input :id="ids.tags" v-model.trim="form.tags" class="input" placeholder="comma,separated,tags" />
          <label class="label" :for="ids.unit">Unit</label>
          <input :id="ids.unit" v-model.trim="form.unit" class="input" placeholder="e.g., pcs/hr" />
          <label class="label flex items-center gap-2">
            <input type="checkbox" v-model="form.taxable" class="h-4 w-4" /> Taxable
          </label>
          <div v-if="form.taxable" class="grid grid-cols-2 gap-3">
            <div class="grid gap-2">
              <label class="label" :for="ids.tax">Tax %</label>
              <input :id="ids.tax" v-model.number="form.taxRate" type="number" min="0" max="50" step="0.5" class="input"/>
            </div>
            <div class="grid gap-2">
              <label class="label">With Tax</label>
              <div class="input grid place-items-center">
                {{ displayCurrency(withTax(finalPrice)) }}
              </div>
            </div>
          </div>
        </div>
      </details>

      <!-- Spacer for sticky bar -->
      <div class="h-16"></div>

      <!-- Sticky action bar (mobile-first) -->
      <div class="fixed left-0 right-0 bottom-0 z-50 px-3 pb-3">
        <div class="max-w-xl mx-auto rounded-2xl bg-white/80 dark:bg-black/60 backdrop-blur border border-black/10 dark:border-white/10 p-2 flex items-center gap-2">
          <button type="button" class="btn-soft flex-1" @click="onCancel">Cancel</button>
          <button type="button" class="btn-soft" @click="saveDraft">Save Draft</button>
          <button type="submit" class="btn-primary" :disabled="submitting">
            <span v-if="!submitting">{{ editing ? 'Update' : 'Save' }}</span>
            <span v-else class="inline-flex items-center gap-2"><span class="spinner"></span>Saving…</span>
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'

/* 🔐 Headers helper */
const authHeaders = () => ({ Authorization: 'Bearer ' + (localStorage.getItem('access_token') || '') })

/* 🧭 Safe-area for phones with notches */
const safeArea = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }

/* 📦 Props-like defaults (back-compat via loadProduct) */
const editing = ref(false)
const submitting = ref(false)
const error = ref('')
const queued = ref(false)
const currency = ref('TZS') // default; you can bind to your store

/* 🧾 Form state */
const form = reactive({
  id: null,
  name: '',
  description: '',
  price: 0,
  cost: 0,
  discountPct: 0,
  stock: 0,
  sku: '',
  is_service: false,
  category: '',
  tags: '',
  unit: '',
  taxable: false,
  taxRate: 18
})

/* 💾 Draft autosave */
const dirty = ref(false)
watch(form, () => { dirty.value = true; localStorage.setItem('product_draft', JSON.stringify(form)) }, { deep: true })

/* 📸 Images (data URLs for preview) */
const images = ref([]) // [{id,url}]
const fileInput = ref(null)
function onPick(e){ addFiles(e.target.files); e.target.value='' }
function onDrop(e){ addFiles(e.dataTransfer.files) }
function addFiles(list){
  const files = Array.from(list || [])
  for (const f of files.slice(0, Math.max(0, 5 - images.value.length))) {
    if (!/^image\//.test(f.type)) continue
    const id = Math.random().toString(36).slice(2,8)
    const reader = new FileReader()
    reader.onload = () => images.value.push({ id, url: reader.result })
    reader.readAsDataURL(f)
  }
}
function removeImg(id){ images.value = images.value.filter(i => i.id !== id) }

/* 🧠 Suggestions */
const suggestions = ref(['Accessories','Bags','Consulting','Design','Development','Marketing','Services','Education'])

/* 🧮 Pricing helpers */
const finalPrice = computed(() => {
  const p = Number(form.price || 0)
  const d = Math.min(95, Math.max(0, Number(form.discountPct || 0)))
  return +(p * (1 - d/100)).toFixed(2)
})
const marginDisplay = computed(() => {
  const p = finalPrice.value
  const c = Number(form.cost || 0)
  if (!p || !c) return '—'
  const m = ((p - c) / (p || 1)) * 100
  return `${m.toFixed(1)}%`
})
function withTax(v){
  return form.taxable ? +(v * (1 + (Number(form.taxRate || 0)/100))).toFixed(2) : v
}
function displayCurrency(amount){
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.value }).format(amount) }
  catch { return `${currency.value} ${amount}` }
}

/* ✅ Validation */
const v = reactive({ name:'', price:'', stock:'' })
function validate(){
  v.name  = form.name?.trim() ? '' : 'Name is required.'
  v.price = Number(form.price) >= 0 ? '' : 'Price must be ≥ 0.'
  v.stock = form.is_service || Number(form.stock) >= 0 ? '' : 'Stock must be ≥ 0.'
  return !(v.name || v.price || v.stock)
}

/* 🔢 SKU */
function genSku(){
  const base = (form.name || 'ITEM').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0,6)
  const tail = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(2,6)
  form.sku = `${base}-${tail}`
}

/* 🔁 Load for editing (keeps API compat) */
function loadProduct(product){
  Object.assign(form, {
    id: product?.id ?? null,
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product?.price ?? 0,
    cost: product?.cost ?? 0,
    discountPct: product?.discountPct ?? 0,
    stock: product?.stock ?? 0,
    sku: product?.sku ?? '',
    is_service: !!product?.is_service,
    category: product?.category ?? '',
    tags: product?.tags ?? '',
    unit: product?.unit ?? '',
    taxable: !!product?.taxable,
    taxRate: product?.taxRate ?? 18
  })
  editing.value = true
  dirty.value = false
  images.value = (product?.images || []).map((u) => ({ id: Math.random().toString(36).slice(2,8), url: u }))
}
defineExpose({ loadProduct })

/* 🚀 Submit */
async function onSubmit(){
  error.value = ''; queued.value = false
  if (!validate()) return
  submitting.value = true
  const payload = toPayload()

  try {
    if (!navigator.onLine) throw new Error('offline')

    if (editing.value) {
      await axios.put(`/products/${form.id}`, payload, { headers: authHeaders() })
    } else {
      await axios.post('/products', payload, { headers: authHeaders() })
    }

    afterSave()
  } catch (e) {
    if (String(e?.message).includes('offline') || e?.code === 'ERR_NETWORK') {
      queueRequest(editing.value ? 'PUT' : 'POST', editing.value ? `/products/${form.id}` : '/products', payload)
      queued.value = true
      afterSave(/*silent*/true)
    } else {
      error.value = e?.response?.data?.detail || e?.message || 'Failed to save.'
    }
  } finally {
    submitting.value = false
  }
}

/* 🧱 Payload builder */
function toPayload(){
  return {
    id: form.id,
    name: form.name?.trim(),
    description: form.description?.trim(),
    price: Number(form.price || 0),
    cost: Number(form.cost || 0),
    discountPct: Number(form.discountPct || 0),
    stock: form.is_service ? 0 : Number(form.stock || 0),
    is_service: !!form.is_service,
    category: form.category?.trim(),
    sku: form.sku?.trim(),
    unit: form.unit?.trim(),
    tags: form.tags?.trim(),
    taxable: !!form.taxable,
    taxRate: Number(form.taxRate || 0),
    images: images.value.map(i => i.url),
    currency: currency.value,
  }
}

/* 🧰 Offline queue (best-effort) */
function queueRequest(method, url, body){
  const q = JSON.parse(localStorage.getItem('pending_requests') || '[]')
  q.push({ id: Date.now(), method, url, body })
  localStorage.setItem('pending_requests', JSON.stringify(q))
}

/* ✅ After save */
function afterSave(silent=false){
  localStorage.removeItem('product_draft')
  dirty.value = false
  if (!silent) toast('✅ Saved successfully')
  emit('refresh')
  onCancel()
}

/* 🔔 Tiny toast */
function toast(msg){
  try {
    // eslint-disable-next-line no-alert
    console.info(msg)
  } catch {}
}

/* 💾 Save draft manually */
function saveDraft(){
  localStorage.setItem('product_draft', JSON.stringify(form))
  toast('💾 Draft saved')
}

/* ❌ Cancel & reset */
const emit = defineEmits(['close','refresh'])
function onCancel(){
  resetForm()
  emit('close')
}
function resetForm(){
  editing.value = false
  Object.assign(form, {
    id:null, name:'', description:'', price:0, cost:0, discountPct:0,
    stock:0, sku:'', is_service:false, category:'', tags:'', unit:'',
    taxable:false, taxRate:18
  })
  images.value = []
  error.value = ''
}

/* 🧬 Restore draft (if any) */
onMounted(() => {
  try {
    const draft = JSON.parse(localStorage.getItem('product_draft') || 'null')
    if (draft && !editing.value) Object.assign(form, draft)
  } catch {}
})

/* 🆔 Ids for a11y */
const ids = {
  name: 'name-' + rnd(),
  desc: 'desc-' + rnd(),
  category: 'cat-' + rnd(),
  sku: 'sku-' + rnd(),
  stock: 'stock-' + rnd(),
  price: 'price-' + rnd(),
  cost: 'cost-' + rnd(),
  discount: 'discount-' + rnd(),
  unit: 'unit-' + rnd(),
  tags: 'tags-' + rnd(),
  tax: 'tax-' + rnd(),
}
function rnd(){ return Math.random().toString(36).slice(2,7) }
</script>

<style scoped>
/* Inputs */
.label { @apply text-[12px] font-semibold text-slate-700 dark:text-slate-200; }
.req { @apply text-rose-600 ml-0.5; }
.input { @apply h-11 px-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm; }
.hint { @apply text-[11px] text-slate-500 dark:text-slate-400; }
.hint-err { @apply text-[11px] text-rose-600 dark:text-rose-300; }

/* Buttons */
.btn-primary { @apply h-11 px-4 rounded-xl font-semibold bg-gradient-to-b from-blue-600 to-indigo-700 text-white shadow active:translate-y-[1px]; }
.btn-soft { @apply h-11 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/10 text-slate-800 dark:text-white active:translate-y-[1px]; }
.btn-ghost { @apply h-11 px-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 text-slate-800 dark:text-white active:translate-y-[1px]; }

/* Chips */
.chip { @apply h-9 px-3 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 text-sm font-semibold; }
.chip-active { @apply bg-indigo-600 text-white border-indigo-600; }

/* Tags */
.tag { @apply h-7 px-3 rounded-full text-[11px] bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-black/10 dark:border-white/10; }

/* Spinner */
.spinner { width:16px;height:16px;border-radius:9999px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;animation:spin 1s linear infinite }
@keyframes spin { to { transform: rotate(360deg) } }

/* Transitions */
.fade-enter-active,.fade-leave-active { transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to { opacity: 0 }
</style>
