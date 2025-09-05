<template>
  <div class="min-h-[100dvh] text-slate-800" :class="themeClasses.app">
    <!-- App Bar -->
    <header class="sticky top-0 z-30 backdrop-blur border-b" :class="themeClasses.header">
      <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <h1 class="text-base sm:text-lg font-semibold">📍 Places Map</h1>

        <div class="hidden sm:flex items-center gap-2">
          <div class="flex gap-1 rounded-xl p-1" :class="themeClasses.segment">
            <button
              v-for="opt in themes"
              :key="opt.value"
              @click="setTheme(opt.value)"
              class="px-2.5 py-1 rounded-lg text-xs"
              :class="theme===opt.value ? themeClasses.segmentActive : themeClasses.segmentIdle"
            >
              {{ opt.label }}
            </button>
          </div>

          <button @click="fitAll" class="px-3 py-1.5 rounded-xl text-xs" :class="themeClasses.ghostBtn">
            Fit to markers
          </button>
        </div>
      </div>

      <!-- Search row -->
      <div class="max-w-6xl mx-auto px-4 pb-3">
        <div class="relative">
          <input
            v-model.trim="query"
            @input="debouncedSearch"
            type="search"
            inputmode="search"
            placeholder="Search street/address… (e.g., Posta, Kariakoo)"
            class="w-full rounded-xl pl-9 pr-24 py-2 text-sm"
            :class="themeClasses.input"
            aria-label="Search places"
          />
          <span class="absolute left-3 top-1/2 -translate-y-1/2 opacity-60">🔎</span>

          <button
            @click="useMyLocation"
            class="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-xs"
            :class="themeClasses.ghostBtn"
          >
            My location
          </button>

          <!-- Results dropdown -->
          <div
            v-if="resultsOpen && suggestions.length"
            class="absolute mt-2 w-full max-h-64 overflow-auto rounded-xl shadow-xl z-40"
            :class="themeClasses.dropdown"
          >
            <button
              v-for="s in suggestions"
              :key="s.place_id"
              @click="pickSuggestion(s)"
              class="w-full text-left px-3 py-2 text-sm"
              :class="themeClasses.dropdownItem"
            >
              <div class="font-medium">{{ s.address_line1 }}</div>
              <div class="text-xs opacity-70">{{ s.address_line2 }}</div>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Map -->
    <main class="max-w-6xl mx-auto px-0 sm:px-4">
      <div class="relative">
        <div
          id="map"
          class="w-full rounded-none sm:rounded-2xl"
          :class="themeClasses.mapRing"
          :style="{ height: mapHeight }"
        ></div>

        <!-- Floating controls (mobile) -->
        <div class="absolute bottom-24 right-3 sm:right-4 flex flex-col gap-2 z-20">
          <button @click="useMyLocation" class="px-3 py-2 rounded-xl text-xs" :class="themeClasses.ghostBtn">📡 Locate</button>
          <button @click="toggleThemeQuick" class="px-3 py-2 rounded-xl text-xs" :class="themeClasses.ghostBtn">
            {{ theme==='dark' ? '☀️' : '🌙' }}
          </button>
          <button @click="fitAll" class="px-3 py-2 rounded-xl text-xs" :class="themeClasses.ghostBtn">⤢ Fit</button>
        </div>
      </div>

      <!-- Bottom sheet: Saved places -->
      <section class="mt-3 sm:mt-4 px-4 sm:px-0">
        <div class="rounded-2xl p-4" :class="themeClasses.card">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-semibold">Saved Places</h2>
            <div class="text-xs opacity-70">{{ saved.length }} places</div>
          </div>

          <div v-if="!saved.length" class="text-xs opacity-70 mt-2">
            Long‑press on the map to add a marker, then **Save** from the popup.
          </div>

          <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <article
              v-for="m in saved"
              :key="m.id"
              class="rounded-xl p-3 flex flex-col gap-2"
              :class="themeClasses.cardSoft"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-medium truncate">{{ m.title || 'Untitled place' }}</p>
                  <p class="text-[11px] opacity-70 truncate">
                    {{ m.subtitle || `${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}` }}
                  </p>
                </div>
                <span class="text-[11px] px-2 py-0.5 rounded" :class="themeClasses.badge">Saved</span>
              </div>
              <div class="flex flex-wrap gap-2">
                <button @click="flyTo(m)" class="px-3 py-1.5 rounded-lg text-xs" :class="themeClasses.ghostBtn">Show</button>
                <a :href="gmapLink(m)" target="_blank" class="px-3 py-1.5 rounded-lg text-xs" :class="themeClasses.ghostBtn">Directions</a>
                <button @click="sharePlace(m)" class="px-3 py-1.5 rounded-lg text-xs" :class="themeClasses.ghostBtn">Share</button>
                <button
                  @click="removeSaved(m.id)"
                  class="ml-auto px-3 py-1.5 rounded-lg text-xs"
                  :class="themeClasses.destructive"
                >
                  Delete
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <!-- Toast -->
      <div
        v-if="toast"
        class="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm z-50"
        :class="themeClasses.toast"
      >
        {{ toast }}
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet marker icons (Vite)
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png'
import icon from 'leaflet/dist/images/marker-icon.png'
import shadow from 'leaflet/dist/images/marker-shadow.png'
L.Icon.Default.mergeOptions({ iconRetinaUrl: iconRetina, iconUrl: icon, shadowUrl: shadow })

const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY

// ---- Theme presets (Light / Dark / Mint) ----
const theme = ref('light')
const themes = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'mint', label: 'Mint' }
]

// Shared palette helpers
const themeClasses = computed(() => {
  const base = {
    app: 'bg-gradient-to-b from-amber-50 via-emerald-50 to-emerald-100',
    header: 'bg-white/70 text-slate-800 border-slate-200',
    mapRing: 'ring-1 ring-emerald-200',
    segment: 'bg-slate-100 ring-1 ring-slate-200',
    segmentActive: 'bg-white text-slate-900 ring-1 ring-white',
    segmentIdle: 'text-slate-700 hover:bg-white/70',
    ghostBtn: 'bg-white/70 ring-1 ring-slate-200 hover:bg-white text-slate-800',
    dropdown: 'bg-white ring-1 ring-slate-200',
    dropdownItem: 'hover:bg-emerald-50',
    input: 'bg-white/70 ring-1 ring-slate-200 focus:ring-emerald-300 text-slate-900 placeholder:text-slate-400',
    card: 'bg-white/70 ring-1 ring-slate-200',
    cardSoft: 'bg-white/60 ring-1 ring-slate-200',
    badge: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
    toast: 'bg-slate-900/85 text-white ring-1 ring-white/20'
  }
  if (theme.value === 'dark') {
    return {
      app: 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white',
      header: 'bg-slate-900/70 text-white border-white/10',
      mapRing: 'ring-1 ring-white/10',
      segment: 'bg-white/5 ring-1 ring-white/15',
      segmentActive: 'bg-white text-slate-900 ring-white',
      segmentIdle: 'text-white/80 hover:bg-white/10',
      ghostBtn: 'bg-white/10 ring-1 ring-white/15 hover:bg-white/15 text-white',
      dropdown: 'bg-slate-900/95 ring-1 ring-white/15',
      dropdownItem: 'hover:bg-white/5',
      input: 'bg-white/5 ring-1 ring-white/15 focus:ring-white/30 text-white placeholder:text-white/40',
      card: 'bg-white/5 ring-1 ring-white/10',
      cardSoft: 'bg-slate-950/40 ring-1 ring-white/10',
      badge: 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30',
      toast: 'bg-white/10 text-white ring-1 ring-white/15'
    }
  }
  if (theme.value === 'mint') {
    return {
      app: 'bg-gradient-to-b from-emerald-50 via-teal-50 to-cyan-50',
      header: 'bg-white/70 text-slate-800 border-teal-200',
      mapRing: 'ring-1 ring-teal-200',
      segment: 'bg-teal-50 ring-1 ring-teal-200',
      segmentActive: 'bg-white text-slate-900 ring-1 ring-white',
      segmentIdle: 'text-teal-700 hover:bg-white/80',
      ghostBtn: 'bg-white/70 ring-1 ring-teal-200 hover:bg-white text-slate-800',
      dropdown: 'bg-white ring-1 ring-teal-200',
      dropdownItem: 'hover:bg-teal-50',
      input: 'bg-white/70 ring-1 ring-teal-200 focus:ring-teal-300 text-slate-900 placeholder:text-slate-400',
      card: 'bg-white/70 ring-1 ring-teal-200',
      cardSoft: 'bg-white/60 ring-1 ring-teal-200',
      badge: 'bg-teal-100 text-teal-800 ring-1 ring-teal-200',
      toast: 'bg-slate-900/85 text-white ring-1 ring-white/20'
    }
  }
  return base
})

function setTheme(t) { theme.value = t }
function toggleThemeQuick() { theme.value = theme.value === 'dark' ? 'light' : 'dark' }

// ---- Map state ----
let map, tileLayer
const mapHeight = '68vh'
const query = ref('')
const suggestions = ref([])
const resultsOpen = ref(false)
let searchTimer

const saved = ref(JSON.parse(localStorage.getItem('saved_places') || '[]'))
const toast = ref('')

// Keep references to created markers (for Fit)
const markers = new Map()

function tileUrl() {
  // Light and Mint use 'osm-bright', Dark uses 'dark-matter'
  const style = theme.value === 'dark' ? 'dark-matter' : 'osm-bright'
  return `https://maps.geoapify.com/v1/tile/${style}/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_KEY}`
}

// ---- Init map ----
onMounted(() => {
  map = L.map('map', {
    center: [-6.7924, 39.2083], // Dar es Salaam
    zoom: 13,
    zoomControl: false
  })

  tileLayer = L.tileLayer(tileUrl(), {
    attribution: '&copy; <a href="https://www.geoapify.com/">Geoapify</a>',
    maxZoom: 20
  }).addTo(map)

  L.control.zoom({ position: 'topright' }).addTo(map)

  // Default marker
  const m = L.marker([-6.7924, 39.2083]).addTo(map)
  m.bindPopup('<b>Welcome to SmartBiz!</b><br>Dar es Salaam.').openPopup()
  markers.set('default', m)

  attachLongPressAdd()
  document.addEventListener('click', onDocClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  clearTimeout(searchTimer)
})

// ---- Theme toggle (rebuild tiles) ----
watchTheme()
function watchTheme() {
  // Simple watcher without importing watch:
  const origSet = setTheme
  setTheme = (t) => {
    theme.value = t
    map.removeLayer(tileLayer)
    tileLayer = L.tileLayer(tileUrl(), { attribution: '&copy; Geoapify', maxZoom: 20 }).addTo(map)
  }
}

// ---- Search (Geoapify Autocomplete) ----
function debouncedSearch() {
  resultsOpen.value = !!query.value
  clearTimeout(searchTimer)
  if (!query.value) { suggestions.value = []; return }
  searchTimer = setTimeout(async () => {
    try {
      const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query.value)}&limit=6&lang=en&apiKey=${GEOAPIFY_KEY}`
      const res = await fetch(url)
      const data = await res.json()
      suggestions.value = (data.features || []).map(f => {
        const p = f.properties || {}
        return {
          place_id: p.place_id,
          lat: p.lat,
          lng: p.lon,
          address_line1: p.address_line1 || p.formatted || 'Unnamed place',
          address_line2: p.address_line2 || `${p.city || p.county || ''} ${p.country || ''}`.trim()
        }
      })
    } catch {
      suggestions.value = []
    }
  }, 350)
}

function onDocClick(e) {
  const target = e.target
  if (!target.closest || !target.closest('header')) resultsOpen.value = false
}

function pickSuggestion(s) {
  resultsOpen.value = false
  query.value = `${s.address_line1}`
  const { lat, lng } = s
  flyAndMark(lat, lng, s.address_line1, s.address_line2)
}

// ---- My location ----
function useMyLocation() {
  if (!navigator.geolocation) return showToast('Geolocation is not available on this device.')
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords
      flyAndMark(latitude, longitude, 'My location', 'GPS')
    },
    () => showToast('Failed to get location. Allow GPS and try again.'),
    { enableHighAccuracy: true, timeout: 10_000 }
  )
}

// ---- Fly + mark + popup actions ----
function flyAndMark(lat, lng, title = 'Place', subtitle = '') {
  map.flyTo([lat, lng], 16, { duration: 0.8 })
  const id = `${lat},${lng},${Date.now()}`
  const marker = L.marker([lat, lng]).addTo(map)
  const html = `
    <div style="min-width:180px">
      <b>${escapeHtml(title)}</b><br/>
      <small style="opacity:.7">${escapeHtml(subtitle)}</small>
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
        <a href="${gmapLink({lat,lng})}" target="_blank" class="leaflet-btn">Directions</a>
        <button class="leaflet-btn" data-action="save">Save</button>
        <button class="leaflet-btn" data-action="share">Share</button>
      </div>
    </div>
  `
  marker.bindPopup(html).openPopup()
  markers.set(id, marker)

  marker.on('popupopen', () => {
    const el = marker.getPopup().getElement()
    el?.querySelector('[data-action="save"]')?.addEventListener('click', () => {
      savePlace({ id, lat, lng, title, subtitle }); marker.closePopup()
    })
    el?.querySelector('[data-action="share"]')?.addEventListener('click', () =>
      sharePlace({ id, lat, lng, title, subtitle })
    )
  })
}

function gmapLink(m) { return `https://www.google.com/maps?q=${m.lat},${m.lng}` }

function savePlace(p) {
  const exists = saved.value.some(x => Math.abs(x.lat - p.lat) < 1e-8 && Math.abs(x.lng - p.lng) < 1e-8)
  if (!exists) {
    saved.value.unshift({ ...p })
    localStorage.setItem('saved_places', JSON.stringify(saved.value))
    showToast('Saved!')
  } else showToast('Already in the list.')
}

function removeSaved(id) {
  saved.value = saved.value.filter(x => x.id !== id)
  localStorage.setItem('saved_places', JSON.stringify(saved.value))
  showToast('Deleted.')
}

function flyTo(m) { map.flyTo([m.lat, m.lng], 16, { duration: 0.6 }) }

async function sharePlace(m) {
  const text = `${m.title || 'Place'} • ${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}\n${gmapLink(m)}`
  try {
    if (navigator.share) await navigator.share({ title: m.title || 'Place on map', text, url: gmapLink(m) })
    else { await navigator.clipboard.writeText(text); showToast('Link copied!') }
  } catch {}
}

function fitAll() {
  const pts = []
  markers.forEach(mk => pts.push(mk.getLatLng()))
  if (saved.value.length) saved.value.forEach(s => pts.push(L.latLng(s.lat, s.lng)))
  if (!pts.length) return
  map.fitBounds(L.latLngBounds(pts), { padding: [24, 24] })
}

// ---- Long press to add marker ----
function attachLongPressAdd() {
  let t = null
  const hold = 500
  function start(e) {
    clearTimeout(t)
    t = setTimeout(() => {
      const latlng = e.latlng || map.mouseEventToLatLng(e.originalEvent)
      flyAndMark(latlng.lat, latlng.lng, 'New place', '')
    }, hold)
  }
  function cancel(){ clearTimeout(t) }
  map.on('mousedown', start)
  map.on('touchstart', start)
  map.on('mouseup', cancel)
  map.on('mouseleave', cancel)
  map.on('touchend', cancel)
}

// ---- Utils ----
function escapeHtml(s=''){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])) }
function showToast(msg){ toast.value = msg; setTimeout(() => (toast.value = ''), 1400) }
</script>

<style scoped>
/* Leaflet base */
#map { background: #eef6f0; }

/* Leaflet popup small buttons */
.leaflet-btn{
  background: rgba(0,0,0,.06);
  color: inherit;
  border: 1px solid rgba(0,0,0,.12);
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
  text-decoration: none;
}
.leaflet-btn:hover{ background: rgba(0,0,0,.1); }

/* No scrollbars in dropdowns on mobile */
::-webkit-scrollbar{ width:0; height:0; }
</style>
