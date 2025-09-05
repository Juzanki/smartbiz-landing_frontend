<!-- src/views/StartLiveMobile.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-b from-[#0B1220] via-[#0B1220] to-[#0F1B3A] text-white">
    <!-- Top App Bar -->
    <header class="sticky top-0 z-20 bg-gradient-to-b from-black/50 to-transparent backdrop-blur-md px-4 pt-4 pb-3 flex items-center gap-3">
      <button
        type="button"
        @click="goBack"
        aria-label="Back"
        class="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center border border-white/10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M15 18l-6-6 6-6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="flex-1">
        <h1 class="text-lg font-semibold tracking-wide">📡 Start Live Stream</h1>
        <p class="text-xs text-white/60">Tengeneza kichwa, chagua kipengele & bidhaa zako</p>
      </div>
    </header>

    <main class="px-4 pb-40">
      <!-- Eligibility / Subscription Notice -->
      <section class="mt-3">
        <div class="rounded-2xl p-4 bg-cyan-500/10 border border-cyan-400/20">
          <div class="flex items-start gap-3">
            <div class="shrink-0 h-9 w-9 rounded-xl grid place-items-center bg-cyan-500/20 border border-cyan-400/30">
              ⚠️
            </div>
            <div>
              <p class="text-sm leading-snug">
                Only users with an active <span class="font-semibold text-cyan-300">SmartBiz subscription</span> can start a Live Stream.
              </p>
              <button
                type="button"
                class="mt-2 text-xs px-3 py-1.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-medium"
              >
                View Plans
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Form Card -->
      <section class="mt-4">
        <div class="rounded-3xl p-4 bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.6)]">
          <form @submit.prevent="startLive" class="space-y-6">
            <!-- Live Title -->
            <div>
              <label class="block text-xs uppercase tracking-wide text-white/60 mb-2">Live Title</label>
              <div class="relative">
                <input
                  v-model.trim="form.title"
                  type="text"
                  :maxlength="TITLE_MAX"
                  required
                  placeholder="Mfano: Big Friday Deals 🔥"
                  class="w-full rounded-xl bg-white/8 border border-white/15 focus:(outline-none ring-2 ring-indigo-400/50 border-indigo-400/60) px-4 py-3 text-[15px] placeholder:text-white/40"
                />
                <span class="absolute right-3 bottom-2 text-[11px] text-white/40">{{ form.title.length }}/{{ TITLE_MAX }}</span>
              </div>
            </div>

            <!-- Category Pills -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-xs uppercase tracking-wide text-white/60">Category</label>
                <span class="text-[11px] text-white/40">Swipe →</span>
              </div>
              <div class="flex gap-2 overflow-x-auto no-scrollbar py-1 pr-1">
                <button
                  v-for="cat in categories"
                  :key="cat.value"
                  type="button"
                  @click="form.category = cat.value"
                  class="px-3.5 py-2 rounded-full border text-sm whitespace-nowrap transition-all"
                  :class="form.category === cat.value
                    ? 'bg-indigo-500 text-black border-indigo-400 font-medium'
                    : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'"
                >
                  {{ cat.label }}
                </button>
              </div>
            </div>

            <!-- Product Picker -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-xs uppercase tracking-wide text-white/60">Products to Show (Fly-Over)</label>
                <div class="flex items-center gap-2">
                  <button type="button" class="text-[11px] text-white/60 underline" @click="toggleSelectAll">
                    {{ allSelected ? 'Unselect all' : 'Select all' }}
                  </button>
                  <span class="text-[11px] text-white/40">Selected: {{ form.selected.length }}</span>
                </div>
              </div>

              <!-- Search -->
              <div class="mb-3">
                <div class="relative">
                  <input
                    v-model.trim="search"
                    type="search"
                    placeholder="Tafuta bidhaa..."
                    class="w-full rounded-xl bg-white/8 border border-white/15 focus:(outline-none ring-2 ring-indigo-400/50 border-indigo-400/60) px-10 py-2.5 text-[14px] placeholder:text-white/40"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="11" cy="11" r="8" stroke-width="2"/>
                    <path d="M21 21l-4.35-4.35" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </div>
              </div>

              <!-- Products Grid -->
              <div v-if="loadingProducts" class="grid grid-cols-2 gap-3">
                <div v-for="i in 4" :key="i" class="h-[84px] rounded-xl bg-white/5 animate-pulse border border-white/10"></div>
              </div>
              <div v-else>
                <div v-if="filteredProducts.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <label
                    v-for="p in filteredProducts"
                    :key="p.id"
                    class="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all p-3 flex items-center gap-3"
                  >
                    <input
                      class="peer sr-only"
                      type="checkbox"
                      :value="p.id"
                      v-model="form.selected"
                    />
                    <div class="h-10 w-10 rounded-xl grid place-items-center bg-gradient-to-br from-indigo-400/30 to-pink-400/20 border border-white/10 text-sm font-semibold">
                      {{ avatarInitials(p.name) }}
                    </div>
                    <div class="min-w-0">
                      <p class="text-[13px] truncate">{{ p.name }}</p>
                      <p class="text-[11px] text-white/50">{{ formatTZS(p.price) }}</p>
                    </div>
                    <div
                      class="ml-auto h-5 w-5 rounded-full grid place-items-center border"
                      :class="form.selected.includes(p.id)
                        ? 'bg-emerald-400 text-black border-emerald-300'
                        : 'bg-white/5 text-white/50 border-white/15'"
                    >
                      <svg v-if="form.selected.includes(p.id)" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M20 6L9 17l-5-5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                  </label>
                </div>

                <div v-else class="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-white/60 text-sm">
                  Hakuna bidhaa zimepatikana kwa utafutaji huu.
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    </main>

    <!-- Sticky Action Bar -->
    <footer class="fixed bottom-0 inset-x-0 z-30 px-4 pb-5 pt-3 bg-gradient-to-t from-black/70 via-black/40 to-transparent backdrop-blur-md">
      <div class="rounded-2xl border border-indigo-400/30 bg-indigo-500 hover:bg-indigo-400 active:scale-[0.99] transition-all">
        <button
          :disabled="submitting || !form.title.trim()"
          @click="startLive"
          class="w-full px-5 py-4 text-center font-semibold text-black disabled:(opacity-60 cursor-not-allowed)"
        >
          <span v-if="!submitting">🎥 Go Live Now</span>
          <span v-else class="inline-flex items-center gap-2">
            <svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="4"/>
            </svg>
            Starting…
          </span>
        </button>
      </div>

      <!-- Feedback Toasts -->
      <transition name="toast">
        <div v-if="message" class="mt-3 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-sm px-4 py-3">
          {{ message }}
        </div>
      </transition>
      <transition name="toast">
        <div v-if="error" class="mt-3 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-200 text-sm px-4 py-3">
          {{ error }}
        </div>
      </transition>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const TITLE_MAX = 60
const apiUrl = import.meta.env.VITE_API_URL || ''

const form = ref({
  title: '',
  category: 'fashion',
  selected: []
})

const categories = [
  { value: 'fashion', label: 'Fashion' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'training', label: 'Training' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'business', label: 'Business Pitch' }
]

const products = ref([])
const loadingProducts = ref(true)
const message = ref('')
const error = ref('')
const submitting = ref(false)
const search = ref('')

const filteredProducts = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return products.value
  return products.value.filter(p =>
    (p.name || '').toLowerCase().includes(q)
    || String(p.price || '').toLowerCase().includes(q)
  )
})

const allSelected = computed(() => {
  if (!products.value.length) return false
  return form.value.selected.length === filteredProducts.value.length && filteredProducts.value.length > 0
})

onMounted(async () => {
  await loadProducts()
})

async function loadProducts() {
  loadingProducts.value = true
  error.value = ''
  try {
    const url = apiUrl ? `${apiUrl}/api/products/my` : '/api/products/my'
    const res = await axios.get(url)
    products.value = Array.isArray(res.data) ? res.data : []
  } catch (err) {
    error.value = 'Failed to load your products.'
  } finally {
    loadingProducts.value = false
  }
}

function avatarInitials(name = '') {
  const n = name.trim()
  if (!n) return 'P'
  const words = n.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '')
  return words.join('') || n.slice(0, 2).toUpperCase()
}

function formatTZS(val) {
  const num = Number(val || 0)
  return num.toLocaleString('en-KE', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 })
}

function toggleSelectAll() {
  if (allSelected.value) {
    // unselect all visible
    form.value.selected = form.value.selected.filter(id => !filteredProducts.value.some(p => p.id === id))
  } else {
    // add all visible
    const ids = filteredProducts.value.map(p => p.id)
    const set = new Set([...form.value.selected, ...ids])
    form.value.selected = Array.from(set)
  }
}

async function startLive() {
  submitting.value = true
  message.value = ''
  error.value = ''
  try {
    const payload = { ...form.value }
    const url = apiUrl ? `${apiUrl}/api/live/start` : '/api/live/start'
    await axios.post(url, payload)
    message.value = '✅ Your live session has started successfully!'
  } catch (err) {
    error.value = err?.response?.data?.detail || '❌ Failed to start live.'
  } finally {
    submitting.value = false
  }
}

function goBack() {
  // optional: integrate with your router
  if (window.history.length > 1) window.history.back()
}
</script>

<style scoped>
/* ===== Scrollbar Hide ===== */
.no-scrollbar::-webkit-scrollbar { 
  display: none; 
}
.no-scrollbar { 
  -ms-overflow-style: none; 
  scrollbar-width: none; 
}

/* ===== Toast Transition ===== */
.toast-enter-active, 
.toast-leave-active { 
  transition: all .35s cubic-bezier(0.4, 0, 0.2, 1); 
}
.toast-enter-from, 
.toast-leave-to { 
  opacity: 0; 
  transform: translateY(8px) scale(0.97); 
}

/* ===== Digital Glow Effects ===== */
.digital-card {
  background: linear-gradient(135deg, rgba(13, 17, 23, 0.95), rgba(15, 24, 45, 0.95));
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 1.5rem;
  backdrop-filter: blur(18px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 18px rgba(99, 102, 241, 0.15);
}

/* ===== Buttons ===== */
.digital-btn {
  background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);
  color: white;
  font-weight: 600;
  border-radius: 9999px;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
  transition: all .25s ease;
}
.digital-btn:hover {
  box-shadow: 0 6px 18px rgba(99, 102, 241, 0.6);
  transform: translateY(-1px);
}
.digital-btn:active {
  transform: scale(0.97);
}

/* ===== Inputs ===== */
.digital-input {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  padding: 0.75rem 1rem;
  color: #fff;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}
.digital-input::placeholder {
  color: rgba(255,255,255,0.4);
}
.digital-input:focus {
  outline: none;
  border-color: rgba(99, 102, 241, 0.6);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
}

/* ===== Selection Cards ===== */
.product-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.25s ease;
}
.product-card:hover {
  background: rgba(255,255,255,0.08);
  transform: translateY(-1px);
}
.product-card.selected {
  border-color: rgba(16, 185, 129, 0.5);
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.3);
}

/* ===== Category Pills ===== */
.category-pill {
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.85);
  transition: all 0.25s ease;
}
.category-pill.active {
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}
.category-pill:hover {
  background: rgba(255,255,255,0.1);
}
</style>
