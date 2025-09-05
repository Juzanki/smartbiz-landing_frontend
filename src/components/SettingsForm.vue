<!-- 📁 src/components/OwnerBrandingFormPro.vue -->
<template>
  <form @submit.prevent="handleSubmit" class="min-h-screen bg-white dark:bg-[#0b1020]">
    <!-- Brand Preview -->
    <section class="p-4 pb-2">
      <div
        class="rounded-2xl overflow-hidden shadow-lg border border-black/10 dark:border-white/10"
        :style="{
          background: `linear-gradient(135deg, ${model.primaryColor} 0%, ${model.secondaryColor} 100%)`
        }"
      >
        <div class="p-4 flex items-center gap-3">
          <div class="relative h-14 w-14 rounded-xl overflow-hidden bg-white/20 backdrop-blur ring-2 ring-white/60">
            <img v-if="model.logoUrl" :src="model.logoUrl" alt=""
                 class="h-full w-full object-cover" />
            <div v-else class="h-full w-full grid place-items-center text-white font-extrabold text-xl">
              {{ (model.businessName || 'SB').slice(0,1).toUpperCase() }}
            </div>
          </div>
          <div class="min-w-0">
            <h3 class="text-white font-black text-lg truncate">{{ model.businessName || 'Your Business' }}</h3>
            <p class="text-white/90 text-xs truncate">{{ model.tagline || 'Your slogan or mission' }}</p>
          </div>
        </div>

        <!-- Contrast warning -->
        <div v-if="contrastWarning" class="px-4 pb-3">
          <div class="rounded-lg px-3 py-2 text-[12px] font-medium bg-black/35 text-yellow-200">
            ⚠️ Text contrast is low on chosen colors. Consider adjusting for readability.
          </div>
        </div>
      </div>
    </section>

    <!-- Draft restore -->
    <section v-if="hasDraft && !draftHandled" class="px-4 mt-3">
      <div class="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 rounded-xl px-3 py-2 text-sm">
        <span>📝 Unsaved draft found.</span>
        <button type="button" class="ml-auto btn-soft" @click="restoreDraft">Restore</button>
        <button type="button" class="btn-soft" @click="discardDraft">Discard</button>
      </div>
    </section>

    <!-- Form sections -->
    <section class="px-4 mt-4 grid gap-4">
      <!-- Basic -->
      <div class="card">
        <h4 class="card-title">📇 Basic Info</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="label">Business Name *</label>
            <input v-model.trim="model.businessName" required class="input" placeholder="SmartBiz Ltd." />
          </div>

          <div>
            <label class="label">Preferred Language *</label>
            <select v-model="model.language" required class="input">
              <option value="en">English</option>
              <option value="sw">Swahili</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
            </select>
          </div>

          <div class="md:col-span-2">
            <label class="label">Business Tagline</label>
            <input v-model.trim="model.tagline" class="input" placeholder="Your slogan or mission" />
          </div>
        </div>
      </div>

      <!-- Region -->
      <div class="card">
        <h4 class="card-title">🌍 Region & Locale</h4>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="label">Timezone</label>
            <select v-model="model.timezone" class="input">
              <option>Africa/Dar_es_Salaam</option>
              <option>Africa/Nairobi</option>
              <option>UTC</option>
              <option>Asia/Dubai</option>
              <option>America/New_York</option>
            </select>
            <p class="hint">Detected: <strong>{{ detectedTZ }}</strong></p>
          </div>

          <div>
            <label class="label">Default Currency</label>
            <select v-model="model.currency" class="input">
              <option value="TZS">TZS</option>
              <option value="USD">USD</option>
              <option value="KES">KES</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Branding -->
      <div class="card">
        <h4 class="card-title">🎨 Branding</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="label">Primary Color</label>
            <div class="flex items-center gap-2">
              <input type="color" v-model="model.primaryColor" class="color" />
              <input v-model.trim="model.primaryColor" class="input flex-1" />
            </div>
          </div>

          <div>
            <label class="label">Secondary Color</label>
            <div class="flex items-center gap-2">
              <input type="color" v-model="model.secondaryColor" class="color" />
              <input v-model.trim="model.secondaryColor" class="input flex-1" />
            </div>
          </div>

          <div class="md:col-span-2">
            <label class="label">Logo</label>
            <div class="flex items-center gap-2">
              <input v-model.trim="model.logoUrl" type="url" class="input flex-1" placeholder="https://cdn.example.com/logo.png" />
              <input type="file" accept="image/*" class="hidden" ref="fileEl" @change="onPick" />
              <button type="button" class="btn-soft" @click="fileEl?.click()">Upload</button>
              <button v-if="model.logoUrl" type="button" class="btn-soft" @click="model.logoUrl=''">Remove</button>
            </div>
            <p class="hint">Paste a direct image URL or upload a file for instant preview.</p>
          </div>

          <div class="md:col-span-2">
            <button type="button" class="btn-soft" @click="randomPalette">🎲 Try a palette</button>
          </div>
        </div>
      </div>

      <!-- Domain -->
      <div class="card">
        <h4 class="card-title">🔗 Custom Domain</h4>
        <label class="row">
          <input type="checkbox" v-model="model.enableCustomDomain" />
          <span>Enable Custom Domain (e.g. <span class="font-mono">yourbiz.co.tz</span>)</span>
        </label>
        <div v-if="model.enableCustomDomain" class="mt-2">
          <label class="label">Domain</label>
          <div class="flex items-center gap-2">
            <input v-model.trim="model.customDomain" class="input flex-1" placeholder="yourbiz.co.tz" />
            <button class="btn-soft" type="button" @click="testDomain">Test</button>
          </div>
          <p class="hint">We’ll guide you to set DNS when you save.</p>
        </div>
      </div>
    </section>

    <!-- Sticky save bar -->
    <div
      class="sticky bottom-0 z-40 px-4 py-3 mt-6 bg-white/85 dark:bg-[#0b1020]/85 backdrop-blur border-t border-black/10 dark:border-white/10"
      :style="safeArea"
    >
      <div class="max-w-3xl mx-auto flex items-center gap-2">
        <p class="text-xs text-slate-600 dark:text-slate-300 flex-1">
          <span v-if="isDirty">Unsaved changes</span>
          <span v-else>All changes saved</span>
        </p>
        <button type="button" class="btn-soft" @click="resetToProps" :disabled="!isDirty">Reset</button>
        <button class="btn-primary" :disabled="!isValid || saving">
          <span v-if="!saving">💾 Save Changes</span>
          <span v-else class="inline-flex items-center gap-2"><span class="spinner" /> Saving…</span>
        </button>
      </div>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast" class="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 bg-black/80 text-white text-xs px-3 py-2 rounded-xl shadow" aria-live="polite">
        {{ toast }}
      </div>
    </transition>
  </form>
</template>

<script setup>
import { reactive, ref, watch, computed, onMounted, nextTick } from 'vue'

/** Props & Emits */
const props = defineProps({
  settings: { type: Object, required: true }
})
const emit = defineEmits(['submit'])

/** Model */
const model = reactive({
  businessName: '',
  language: 'en',
  tagline: '',
  timezone: 'Africa/Dar_es_Salaam',
  currency: 'TZS',
  logoUrl: '',
  primaryColor: '#1E3A8A',   // indigo-800
  secondaryColor: '#0EA5E9', // sky-500
  enableCustomDomain: false,
  customDomain: ''
})
Object.assign(model, props.settings || {})

/** Validation */
const isValid = computed(() =>
  !!model.businessName && !!model.language && isHex(model.primaryColor) && isHex(model.secondaryColor)
)

/** Dirty state */
const initial = ref(JSON.stringify(model))
const isDirty = computed(() => JSON.stringify(model) !== initial.value)

/** TZ detect */
const detectedTZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
if (!props.settings?.timezone) model.timezone = detectedTZ

/** Draft autosave */
const DRAFT_KEY = 'owner_settings_draft_v1'
const hasDraft = !!localStorage.getItem(DRAFT_KEY)
const draftHandled = ref(!hasDraft)
let draftT
watch(model, () => {
  clearTimeout(draftT)
  draftT = setTimeout(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(model))
  }, 500)
}, { deep: true })
function restoreDraft(){
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}')
    Object.assign(model, d || {})
    toastOk('Draft restored'); draftHandled.value = true
  } catch { toastFail('Failed to restore') }
}
function discardDraft(){
  localStorage.removeItem(DRAFT_KEY); draftHandled.value = true
  toastOk('Draft discarded')
}

/** Save */
const saving = ref(false)
async function handleSubmit(){
  if (!isValid.value) { toastFail('Please complete required fields'); return }
  saving.value = true
  try {
    // sanitize
    const payload = {
      ...model,
      customDomain: model.customDomain?.replace(/^https?:\/\//i, '').trim()
    }
    emit('submit', payload)
    initial.value = JSON.stringify(model)
    localStorage.removeItem(DRAFT_KEY)
    vibe(10); toastOk('Settings saved')
  } catch (e) {
    toastFail('Save failed')
  } finally {
    saving.value = false
  }
}

/** Reset */
function resetToProps(){
  Object.assign(model, props.settings || {})
  vibe(6); toastOk('Reverted')
}

/** Colors & contrast */
function isHex(x){ return /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(String(x||'')) }
function hex2rgb(hex){
  let h = hex.replace('#','')
  if (h.length===3) h = h.split('').map(c=>c+c).join('')
  const n = parseInt(h,16); return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 }
}
function luminance({r,g,b}){ const s=[r,g,b].map(v=>v/255).map(v=>v<=.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)); return s[0]*.2126+s[1]*.7152+s[2]*.0722 }
function contrastRatio(bg, fg='#ffffff'){
  const L1 = luminance(hex2rgb(bg))+0.05, L2 = luminance(hex2rgb(fg))+0.05
  return L1>L2 ? (L1/L2) : (L2/L1)
}
const contrastWarning = computed(() => {
  const cr1 = contrastRatio(model.primaryColor, '#ffffff')
  const cr2 = contrastRatio(model.secondaryColor, '#ffffff')
  return cr1 < 4.5 || cr2 < 4.5
})

/** Logo upload -> DataURL preview */
const fileEl = ref(null)
function onPick(e){
  const f = e.target.files?.[0]; if (!f) return
  const reader = new FileReader()
  reader.onload = () => { model.logoUrl = reader.result }
  reader.readAsDataURL(f)
  e.target.value = ''
}

/** Random palette */
function randomPalette(){
  const palettes = [
    ['#0ea5e9','#a78bfa'], // sky + violet
    ['#22c55e','#14b8a6'], // green + teal
    ['#ef4444','#f59e0b'], // red + amber
    ['#1e3a8a','#075985'], // indigo + cyan-900
  ]
  const [p,s] = palettes[Math.floor(Math.random()*palettes.length)]
  model.primaryColor = p; model.secondaryColor = s
}

/** Test domain (best-effort) */
async function testDomain(){
  if (!model.customDomain) { toastFail('Enter a domain'); return }
  try {
    await fetch(`https://${model.customDomain}`, { mode: 'no-cors' })
    toastOk('Domain looks reachable (check DNS/SSL)')
  } catch { toastFail('Could not reach domain (DNS/SSL)') }
}

/** Toasts + haptics */
const toast = ref('')
function toastOk(m){ toast.value = m; setTimeout(()=>toast.value='', 1600) }
function toastFail(m){ toast.value = m; setTimeout(()=>toast.value='', 2000) }
function vibe(ms){ try{ navigator.vibrate?.(ms) }catch{} }

/** Safe-area for iOS */
const safeArea = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }

/** Keep prop changes in sync */
watch(() => props.settings, (v) => { Object.assign(model, v || {}) })
</script>

<style scoped>
/* Primitives */
.label { @apply text-[12px] font-semibold text-slate-700 dark:text-slate-200; }
.input { @apply w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm; }
.color { @apply h-10 w-12 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/10; }
.hint { @apply mt-1 text-[11px] text-slate-500; }
.row { @apply flex items-center gap-2 text-sm; }
.card { @apply rounded-2xl p-4 bg-white dark:bg-[#0b1020] border border-black/10 dark:border-white/10 shadow-sm; }
.card-title { @apply text-sm font-extrabold text-slate-900 dark:text-white mb-2; }
.btn-primary { @apply h-11 px-4 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-500 active:translate-y-[1px]; }
.btn-soft { @apply h-9 px-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/10 text-slate-800 dark:text-white; }
.spinner { width:16px;height:16px;border-radius:9999px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;animation:spin 1s linear infinite }
@keyframes spin { to { transform: rotate(360deg) } }
.fade-enter-active,.fade-leave-active { transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to { opacity: 0 }
</style>
[]