<template>
  <DashboardLayout>
    <div class="sd-shell px-4 py-5 md:px-6">
      <!-- Header -->
      <header class="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 grid place-items-center text-white shadow-md">🚀</div>
          <div>
            <h2 class="text-xl md:text-2xl font-extrabold text-slate-900">Smart Atmospheric Deployment</h2>
            <p class="text-slate-500 text-sm">Auto-suggest products by city, weather & time window.</p>
          </div>
        </div>

        <!-- Export / Help (optional top-right) -->
        <div class="mt-3 md:mt-0 flex items-center gap-2">
          <button class="sd-btn sd-btn--ghost hidden sm:inline-flex" @click="showTips = !showTips">❔ Tips</button>
        </div>
      </header>

      <!-- Tips banner -->
      <transition name="fade">
        <div v-if="showTips" class="mt-3 sd-tip">
          💡 Try presets below or tap “Use my location” for targeted suggestions.
        </div>
      </transition>

      <!-- Search + Actions -->
      <section class="mt-4 space-y-3">
        <div class="flex flex-col sm:flex-row gap-2">
          <label class="relative flex-1">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M13.036 14.45a7 7 0 1 1 1.414-1.414l3.258 3.257a1 1 0 0 1-1.414 1.415l-3.258-3.258ZM14 9a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z" clip-rule="evenodd"/>
            </svg>
            <input
              v-model.trim="city"
              type="search"
              inputmode="search"
              autocomplete="off"
              placeholder="Enter city / location (e.g., Dodoma)"
              class="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-[15px] shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              aria-label="City or location"
            />
          </label>

          <div class="flex gap-2">
            <button class="sd-btn sd-btn--ghost" @click="useMyLocation" :disabled="geoLoading">
              <span v-if="geoLoading">📍 Locating…</span>
              <span v-else>📍 Use my location</span>
            </button>
            <button class="sd-btn sd-btn--primary" :disabled="!canFetch || loading" @click="fetchSuggestions">
              <span v-if="loading">Getting…</span>
              <span v-else>Get Suggestions</span>
            </button>
          </div>
        </div>

        <!-- Preset cities -->
        <div class="flex flex-wrap gap-2">
          <button v-for="c in presets" :key="c" class="sd-chip" @click="setCity(c)">{{ c }}</button>
        </div>
      </section>

      <!-- Error -->
      <p v-if="error" class="mt-3 sd-error" role="alert">{{ error }}</p>

      <!-- Empty state -->
      <section v-if="!loading && !error && products.length === 0" class="sd-empty">
        <div class="sd-empty-card">
          <div class="text-4xl">🛰️</div>
          <h3 class="font-bold text-slate-800 mt-1">No suggestions yet</h3>
          <p class="text-slate-500 text-sm">Search a city or use location to see recommended products & deploy fast.</p>
        </div>
      </section>

      <!-- Loading skeletons -->
      <section v-if="loading" class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="n in 6" :key="n" class="sd-card sd-skel">
          <div class="sd-skel-line w-2/3"></div>
          <div class="sd-skel-line w-1/2"></div>
          <div class="sd-skel-line w-full"></div>
          <div class="sd-skel-line w-5/6"></div>
          <div class="sd-skel-chip"></div>
          <div class="sd-skel-chip"></div>
          <div class="sd-skel-btn"></div>
        </div>
      </section>

      <!-- Results (cards) -->
      <section v-if="!loading && products.length" class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <article v-for="p in products" :key="p.id" class="sd-card">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h4 class="font-bold text-slate-900 text-base truncate">{{ p.name }}</h4>
              <p class="text-sm text-slate-600 line-clamp-2 mt-1">{{ p.description }}</p>
            </div>
            <div class="text-right">
              <p class="font-extrabold text-slate-900">{{ formatTZS(p.price) }}</p>
              <span class="sd-badge mt-1 capitalize">{{ p.weather_type || '—' }}</span>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <span class="sd-chip sd-chip--muted">⏰ {{ p.preferred_time_start }}–{{ p.preferred_time_end }}</span>
            <span class="sd-chip sd-chip--muted">🏙️ {{ city || '—' }}</span>
          </div>

          <div class="mt-3 flex gap-2">
            <button
              class="sd-btn sd-btn--primary flex-1"
              :disabled="deployingId === p.id"
              @click="dispatchDrone(p.id)"
            >
              <span v-if="deployingId === p.id">Deploying…</span>
              <span v-else>Deploy Now</span>
            </button>
            <button class="sd-btn sd-btn--ghost" @click="copyBrief(p)">Copy Brief</button>
          </div>
        </article>
      </section>

      <!-- Sticky bottom bar (shows city summary) -->
      <transition name="slide-up">
        <div v-if="products.length && !loading" class="sd-sticky">
          <div class="truncate">
            <strong>{{ products.length }}</strong> suggestions for <strong>{{ city }}</strong>
          </div>
          <div class="flex gap-2">
            <button class="sd-btn sd-btn--ghost" @click="products = []">Clear</button>
            <button class="sd-btn" @click="scrollTop">↑ Top</button>
          </div>
        </div>
      </transition>
    </div>
  </DashboardLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'

/* ---------- State ---------- */
const city = ref('')
const products = ref([])
const loading = ref(false)
const error = ref('')
const showTips = ref(true)
const deployingId = ref(null)

const geoLoading = ref(false)
const lat = ref(null)
const lng = ref(null)

const presets = ['Dodoma', 'Dar es Salaam', 'Arusha', 'Mwanza', 'Mbeya']

/* ---------- Derived ---------- */
const canFetch = computed(() => city.value.trim().length > 0 || (lat.value !== null && lng.value !== null))

/* ---------- Config ---------- */
const API_BASE = import.meta.env?.VITE_API_BASE ?? 'http://localhost:8000'

/* ---------- Actions ---------- */
function setCity(c) {
  city.value = c
  lat.value = null
  lng.value = null
}

async function useMyLocation() {
  if (!navigator.geolocation) {
    error.value = 'Geolocation is not supported by this browser.'
    return
  }
  error.value = ''
  geoLoading.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      lat.value = pos.coords.latitude
      lng.value = pos.coords.longitude
      if (!city.value) city.value = 'Current Location'
      geoLoading.value = false
    },
    () => {
      error.value = 'Unable to fetch your location.'
      geoLoading.value = false
    },
    { enableHighAccuracy: true, timeout: 8000 }
  )
}

async function fetchSuggestions() {
  if (!canFetch.value) return
  loading.value = true
  error.value = ''
  products.value = []
  try {
    const token = localStorage.getItem('access_token')
    // Prefer query params, support both city or lat/lng
    const params = {}
    if (lat.value !== null && lng.value !== null) {
      params.lat = lat.value
      params.lng = lng.value
    } else if (city.value.trim()) {
      params.city = city.value.trim()
    }

    // Works with /deploy/now?city=... (your original) and gracefully with params object
    const res = await axios.get(`${API_BASE}/deploy/now`, {
      params,
      headers: { Authorization: `Bearer ${token}` }
    })

    const arr = Array.isArray(res.data) ? res.data : (res.data?.items ?? [])
    products.value = arr.map(x => ({
      id: x.id,
      name: x.name ?? x.title ?? 'Unnamed Product',
      description: x.description ?? '—',
      price: Number(x.price ?? 0),
      weather_type: (x.weather_type ?? x.weather ?? 'general').toLowerCase(),
      preferred_time_start: x.preferred_time_start ?? '08:00',
      preferred_time_end: x.preferred_time_end ?? '18:00'
    }))
  } catch (e) {
    error.value = e?.response?.data?.detail || 'Failed to load suggestions.'
  } finally {
    loading.value = false
  }
}

async function dispatchDrone(productId) {
  const token = localStorage.getItem('access_token')
  deployingId.value = productId
  try {
    await axios.post(`${API_BASE}/drone/dispatch/${productId}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    // Small success pulse on the card (we’ll just clear the loader)
    alert('Drone dispatched successfully!')
  } catch (e) {
    alert('Failed to dispatch drone.')
  } finally {
    deployingId.value = null
  }
}

function copyBrief(p) {
  const brief = [
    `PRODUCT: ${p.name}`,
    `PRICE: ${formatTZS(p.price)}`,
    `CITY: ${city.value || '—'}`,
    `WEATHER: ${p.weather_type}`,
    `WINDOW: ${p.preferred_time_start}-${p.preferred_time_end}`
  ].join(' • ')
  navigator.clipboard?.writeText(brief).then(() => {
    // optional UX—silent
  })
}

function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/* ---------- Utils ---------- */
function formatTZS(n = 0) {
  const v = Number(n || 0)
  return `TZS ${v.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`
}
</script>

<style scoped>
/* Shell background (soft glows) */
.sd-shell{
  background:
    radial-gradient(800px 400px at -10% -20%, rgba(59,130,246,.06), transparent 60%),
    radial-gradient(600px 350px at 120% 10%, rgba(99,102,241,.06), transparent 60%),
    #f7fafc;
}

/* Tips */
.sd-tip{
  border:1px solid #e5e7eb; background:#ffffff; border-radius:16px; padding:.65rem .8rem;
  box-shadow:0 10px 24px -20px rgba(0,0,0,.25); color:#0f172a; font-weight:600; font-size:.9rem;
}

/* Chips */
.sd-chip{
  border:1px solid #e5e7eb; background:#fff; color:#0f172a;
  padding:.45rem .8rem; border-radius:999px; font-size:.8rem; font-weight:700; white-space:nowrap; transition:.2s ease;
}
.sd-chip:hover{ background:#f8fafc }
.sd-chip--muted{ background:#f8fafc; color:#334155; border-color:#e5e7eb }

/* Buttons */
.sd-btn{
  border:1px solid #e5e7eb; background:#fff; color:#0f172a; padding:.55rem .85rem; border-radius:.9rem; font-weight:800; font-size:.85rem;
  transition:.2s ease; box-shadow:0 6px 18px -16px rgba(0,0,0,.25)
}
.sd-btn:hover{ transform:translateY(-1px) }
.sd-btn--primary{ background:#2563eb; color:#fff; border-color:#2563eb; box-shadow:0 10px 22px -14px rgba(37,99,235,.45) }
.sd-btn--primary:disabled{ opacity:.7 }
.sd-btn--ghost{ background:#f8fafc; color:#334155; border-color:#e5e7eb }

/* Cards */
.sd-card{
  border:1px solid #e7e9ef; border-radius:18px; background:linear-gradient(180deg,#ffffff,#fbfdff);
  padding:14px; box-shadow:0 10px 24px -20px rgba(0,0,0,.35)
}

/* Badges */
.sd-badge{
  display:inline-flex; align-items:center; gap:.35rem; font-size:.72rem; font-weight:800; padding:.2rem .5rem; border-radius:999px; text-transform:uppercase; letter-spacing:.4px;
  background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;
}

/* Empty */
.sd-empty{ display:grid; place-items:center; padding:36px 0 }
.sd-empty-card{ text-align:center; background:#fff; border:1px solid #e5e7eb; border-radius:18px; padding:18px 16px; max-width:520px; width:100%; box-shadow:0 10px 24px -20px rgba(0,0,0,.25) }

/* Error */
.sd-error{
  border:1px solid #fecaca; background:#fff1f2; color:#991b1b; padding:.6rem .8rem; border-radius:12px; font-weight:700;
}

/* Sticky bottom */
.sd-sticky{
  position:fixed; left:0; right:0; bottom:0; z-index:40;
  display:flex; align-items:center; justify-content:space-between; gap:10px;
  padding:10px 14px; background:#111827; color:#fff; box-shadow:0 -10px 30px -20px rgba(0,0,0,.5)
}

/* Skeletons */
.sd-skel{ position:relative; overflow:hidden; }
.sd-skel::after{
  content:""; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(0,0,0,.04),transparent); animation:sd-shine 1.2s infinite;
}
.sd-skel-line{ height:12px; background:#eef2f7; border-radius:999px; margin:.35rem 0 }
.sd-skel-chip{ height:24px; width:90px; background:#eef2f7; border-radius:999px; margin-top:.35rem }
.sd-skel-btn{ height:38px; width:130px; background:#eef2f7; border-radius:12px; margin-top:.6rem }
@keyframes sd-shine{ 0%{ transform:translateX(-100%) } 100%{ transform:translateX(100%) } }

/* Small helpers */
.line-clamp-2{
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
}

/* Transitions */
.fade-enter-from,.fade-leave-to{ opacity:0 }
.fade-enter-active,.fade-leave-active{ transition:opacity .18s ease }
.slide-up-enter-from,.slide-up-leave-to{ transform:translateY(100%); opacity:0 }
.slide-up-enter-active,.slide-up-leave-active{ transition:all .22s ease }
</style>
