<template>
  <main class="min-h-[100svh] bg-gradient-to-b from-slate-50 to-slate-100 dark:from-[#0b1020] dark:to-[#0b1020] p-3 sm:p-4"
        :style="safeArea">
    <!-- Header -->
    <header class="max-w-xl mx-auto flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <div class="h-9 w-9 rounded-lg bg-blue-600 grid place-items-center text-white shadow">
          🏢
        </div>
        <div>
          <h1 class="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
            Owner Branding Settings
          </h1>
          <p class="text-[11px] text-slate-500 dark:text-slate-300">
            Make it yours — name, colors, logo, domain & more.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span v-if="dirty" class="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" title="Unsaved changes"></span>
        <button class="btn-ghost" @click="exportSettings" title="Export JSON">⬇️ Export</button>
        <label class="btn-ghost cursor-pointer" title="Import JSON">
          ⬆️ Import
          <input type="file" accept="application/json" class="hidden" @change="importSettings" />
        </label>
      </div>
    </header>

    <!-- Offline pill -->
    <transition name="fade">
      <div v-if="!online" class="max-w-xl mx-auto mt-2 rounded-full px-3 py-1 text-[11px]
                                  bg-amber-500/20 text-amber-900 dark:text-amber-100 border border-amber-400/40">
        ⚠️ You’re offline — changes will save locally and sync when online.
      </div>
    </transition>

    <!-- Content -->
    <section class="max-w-xl mx-auto mt-3 grid gap-3">
      <!-- Live Preview -->
      <div class="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden bg-white/90 dark:bg-white/5 backdrop-blur">
        <div class="h-20 sm:h-24 relative"
             :style="{ background: `linear-gradient(135deg, ${model.primaryColor}, ${model.secondaryColor})` }">
          <div class="absolute inset-0 bg-black/10"></div>
          <div class="absolute inset-0 flex items-center gap-3 px-4">
            <img :src="logoPreview" alt="Logo" class="h-10 w-10 rounded-lg ring-1 ring-white/50 object-cover bg-white/70" />
            <div class="min-w-0">
              <div class="text-white font-extrabold truncate">{{ model.businessName || 'Your Business' }}</div>
              <div class="text-white/90 text-[12px] truncate">{{ model.tagline || 'Tagline goes here' }}</div>
            </div>
            <span class="ml-auto text-[11px] bg-white/20 text-white px-2 py-[2px] rounded-full border border-white/30">
              {{ model.language.toUpperCase() }} • {{ model.currency }}
            </span>
          </div>
        </div>
        <div class="p-4 grid gap-2">
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: model.primaryColor }"></span>
            <span class="text-[12px] text-slate-600 dark:text-slate-300">Primary</span>
            <span class="ml-2 h-2 w-2 rounded-full" :style="{ backgroundColor: model.secondaryColor }"></span>
            <span class="text-[12px] text-slate-600 dark:text-slate-300">Secondary</span>
            <span class="ml-auto text-[11px]" :class="contrastOk ? 'text-emerald-600' : 'text-rose-600'">
              Contrast: {{ contrastRatio.toFixed(2) }}:1 {{ contrastOk ? '✓' : '✕' }}
            </span>
          </div>
          <div class="flex gap-2">
            <button class="btn-primary">Primary CTA</button>
            <button class="btn-soft">Secondary</button>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="save" class="rounded-2xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-white/5 backdrop-blur p-4 grid gap-3">
        <!-- Business basics -->
        <div class="grid gap-2">
          <label class="label">Business Name</label>
          <input v-model.trim="model.businessName" class="input" placeholder="SmartBiz Ltd." required />
        </div>

        <div class="grid gap-2">
          <label class="label">Tagline</label>
          <input v-model.trim="model.tagline" class="input" placeholder="Grow faster with AI" />
        </div>

        <!-- Logo -->
        <div class="grid gap-2">
          <label class="label">Logo</label>
          <div class="flex items-center gap-2">
            <input v-model.trim="model.logoUrl" class="input flex-1" placeholder="https://example.com/logo.png" />
            <label class="btn-ghost cursor-pointer">
              Upload
              <input type="file" accept="image/*" class="hidden" @change="onLogoFile" />
            </label>
          </div>
          <p class="hint">Paste URL or upload an image. We’ll store a preview in local cache.</p>
        </div>

        <!-- Colors -->
        <div class="grid grid-cols-2 gap-3">
          <div class="grid gap-2">
            <label class="label">Primary Color</label>
            <div class="flex items-center gap-2">
              <input type="color" v-model="model.primaryColor" class="h-10 w-10 rounded border border-black/10 dark:border-white/10" />
              <input v-model.trim="model.primaryColor" class="input flex-1" placeholder="#0ea5e9" />
            </div>
          </div>
          <div class="grid gap-2">
            <label class="label">Secondary Color</label>
            <div class="flex items-center gap-2">
              <input type="color" v-model="model.secondaryColor" class="h-10 w-10 rounded border border-black/10 dark:border-white/10" />
              <input v-model.trim="model.secondaryColor" class="input flex-1" placeholder="#8b5cf6" />
            </div>
          </div>
        </div>

        <!-- Locale & money -->
        <div class="grid grid-cols-2 gap-3">
          <div class="grid gap-2">
            <label class="label">Language</label>
            <select v-model="model.language" class="input">
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
              <option value="fr">Français</option>
              <option value="pt">Português</option>
            </select>
          </div>
          <div class="grid gap-2">
            <label class="label">Currency</label>
            <select v-model="model.currency" class="input">
              <option value="TZS">TZS — Tanzanian Shilling</option>
              <option value="KES">KES — Kenyan Shilling</option>
              <option value="UGX">UGX — Ugandan Shilling</option>
              <option value="ZAR">ZAR — South African Rand</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="INR">INR — Indian Rupee</option>
            </select>
          </div>
        </div>

        <!-- Timezone -->
        <div class="grid gap-2">
          <label class="label">Timezone</label>
          <select v-model="model.timezone" class="input">
            <option v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</option>
          </select>
        </div>

        <!-- Domain -->
        <div class="grid gap-2">
          <label class="label flex items-center gap-2">
            <input type="checkbox" v-model="model.enableCustomDomain" class="h-4 w-4" />
            Enable Custom Domain
          </label>
          <div class="flex items-center gap-2" :class="{ 'opacity-50 pointer-events-none': !model.enableCustomDomain }">
            <input v-model.trim="model.customDomain" class="input flex-1" placeholder="yourdomain.com" :disabled="!model.enableCustomDomain" />
            <button type="button" class="btn-ghost" @click="checkDomain" :disabled="!model.enableCustomDomain">Check</button>
          </div>
          <p v-if="domainMsg" class="text-[12px]" :class="domainOk ? 'text-emerald-600' : 'text-rose-600'">
            {{ domainMsg }}
          </p>
          <p class="hint">We’ll validate format & reachability (best-effort). Configure DNS from your provider.</p>
        </div>

        <!-- Actions -->
        <div class="grid grid-cols-2 gap-2 pt-1">
          <button type="button" class="btn-soft" @click="resetDefaults">Reset</button>
          <button type="submit" class="btn-primary" :disabled="saving">
            <span v-if="!saving">Save Settings</span>
            <span v-else class="inline-flex items-center gap-2"><span class="spinner"></span>Saving…</span>
          </button>
        </div>
        <div class="text-[11px] text-slate-500 dark:text-slate-400">
          Last saved: <span class="font-medium">{{ lastSavedAt || '—' }}</span>
        </div>
      </form>
    </section>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast" class="fixed bottom-3 inset-x-0 px-3">
        <div class="max-w-md mx-auto rounded-xl bg-emerald-500 text-white text-sm px-3 py-2 shadow">
          ✅ Your business branding has been saved!
        </div>
      </div>
    </transition>
  </main>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted } from 'vue'

/* Safe area (mobile notches) */
const safeArea = { paddingBottom: 'env(safe-area-inset-bottom, 0px)', paddingTop: 'env(safe-area-inset-top, 0px)' }

/* Online awareness */
const online = ref(navigator.onLine)
window.addEventListener('online', () => online.value = true)
window.addEventListener('offline', () => online.value = false)

/* Defaults */
const defaults = {
  businessName: '',
  tagline: '',
  language: 'en',
  logoUrl: '',
  primaryColor: '#0ea5e9',
  secondaryColor: '#8b5cf6',
  timezone: 'Africa/Dar_es_Salaam',
  currency: 'TZS',
  enableCustomDomain: true,
  customDomain: ''
}

/* Model */
const model = reactive({ ...defaults })
const dirty = ref(false)
const saving = ref(false)
const toast = ref(false)
const lastSavedAt = ref('')

/* Timezones (quick list + user default first) */
const baseTz = ['Africa/Dar_es_Salaam','Africa/Nairobi','Africa/Kampala','Africa/Johannesburg','Europe/London','UTC','Asia/Dubai','Asia/Kolkata','America/New_York']
const timezones = ref(baseTz)

/* Load saved */
onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem('owner_settings') || 'null')
    if (saved && typeof saved === 'object') Object.assign(model, defaults, saved)
  } catch {}
})

/* Debounced autosave */
let t = null
watch(model, () => {
  dirty.value = true
  clearTimeout(t)
  t = setTimeout(() => {
    // autosave to local storage
    localStorage.setItem('owner_settings', JSON.stringify(model))
    lastSavedAt.value = new Date().toLocaleString()
  }, 500)
}, { deep: true })

/* Manual save (simulate server) */
async function save(){
  saving.value = true
  try {
    // TODO: replace with real API call
    await new Promise(r => setTimeout(r, 600))
    localStorage.setItem('owner_settings', JSON.stringify(model))
    lastSavedAt.value = new Date().toLocaleString()
    dirty.value = false
    toast.value = true
    setTimeout(() => toast.value = false, 1800)
  } finally {
    saving.value = false
  }
}

/* Reset */
function resetDefaults(){
  Object.assign(model, defaults)
}

/* Logo handling (URL + file) */
const logoPreview = computed(() => model.logoUrl || '/logo.svg')
function onLogoFile(e){
  const f = e.target.files?.[0]
  if (!f) return
  if (!f.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => { model.logoUrl = reader.result } // dataURL preview + persistence
  reader.readAsDataURL(f)
  e.target.value = ''
}

/* Domain validation + reachability (best-effort) */
const domainMsg = ref('')
const domainOk = ref(false)
function validDomain(d){
  return /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(?:\.[A-Za-z]{2,})+$/.test(d)
}
async function checkDomain(){
  domainMsg.value = ''
  domainOk.value = false
  const d = (model.customDomain || '').trim()
  if (!d) { domainMsg.value = 'Enter a domain to check.'; return }
  if (!validDomain(d)) { domainMsg.value = 'Invalid domain format.'; return }
  // reachability (no-cors)
  try {
    const ctrl = new AbortController()
    const to = setTimeout(() => ctrl.abort(), 3500)
    await fetch(`https://${d}`, { mode:'no-cors', signal: ctrl.signal, cache:'no-cache' })
    clearTimeout(to)
    domainOk.value = true
    domainMsg.value = 'Domain is reachable. Configure DNS for full setup.'
  } catch {
    domainOk.value = false
    domainMsg.value = 'Domain not reachable (yet). DNS/SSL may be pending.'
  }
}

/* Contrast checker (WCAG AA approx against white text in preview bar) */
const contrastRatio = computed(() => {
  // Calculate contrast of primary color vs white
  const c = hexToRgb(model.primaryColor || '#000000')
  const w = { r:255, g:255, b:255 }
  const L = (x)=> {
    x = x/255
    return (x <= 0.03928) ? (x/12.92) : Math.pow((x+0.055)/1.055, 2.4)
  }
  const l1 = 0.2126*L(c.r) + 0.7152*L(c.g) + 0.0722*L(c.b) + 0.05
  const l2 = 0.2126*L(w.r) + 0.7152*L(w.g) + 0.0722*L(w.b) + 0.05
  return Math.max(l1, l2) / Math.min(l1, l2)
})
const contrastOk = computed(() => contrastRatio.value >= 3.0) // small text may need 4.5, but preview uses bold

function hexToRgb(hex){
  let h = hex?.trim() || '#000000'
  if (h.startsWith('#')) h = h.slice(1)
  if (h.length === 3) h = h.split('').map(x=>x+x).join('')
  const num = parseInt(h,16)
  return { r:(num>>16)&255, g:(num>>8)&255, b:num&255 }
}

/* Export / Import */
function exportSettings(){
  const blob = new Blob([JSON.stringify(model, null, 2)], { type:'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'owner_settings.json'
  a.click()
  URL.revokeObjectURL(url)
}
function importSettings(e){
  const f = e.target.files?.[0]; if (!f) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result)
      if (data && typeof data === 'object') Object.assign(model, defaults, data)
    } catch {}
  }
  reader.readAsText(f)
  e.target.value = ''
}
</script>

<style scoped>
/* Inputs & labels */
.label { @apply text-[12px] font-semibold text-slate-700 dark:text-slate-200; }
.input {
  @apply h-11 px-3 rounded-xl border border-black/10 dark:border-white/10
         bg-white dark:bg-white/10 text-slate-900 dark:text-white
         focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm;
}
.hint { @apply text-[11px] text-slate-500 dark:text-slate-400; }

/* Buttons */
.btn-primary {
  @apply h-11 rounded-xl font-semibold bg-gradient-to-b from-blue-600 to-indigo-700
         text-white border border-white/10 shadow active:translate-y-[1px];
}
.btn-soft {
  @apply h-11 rounded-xl border border-black/10 dark:border-white/10
         bg-white dark:bg-white/10 text-slate-800 dark:text-white active:translate-y-[1px];
}
.btn-ghost {
  @apply h-9 px-3 rounded-full text-sm font-semibold
         border border-black/10 dark:border-white/10
         bg-black/5 dark:bg-white/10 text-slate-800 dark:text-white active:translate-y-[1px];
}

/* Spinner */
.spinner { width:16px;height:16px;border-radius:9999px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;animation:spin 1s linear infinite }
@keyframes spin { to { transform: rotate(360deg) } }

/* Transitions */
.fade-enter-active,.fade-leave-active { transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to { opacity: 0 }
</style>
