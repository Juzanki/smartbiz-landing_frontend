<!-- AdminBrandingSettingsMobile.vue -->
<template>
  <section class="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 text-white">
    <!-- Sticky header (mobile-first) -->
    <header
      class="sticky top-0 z-20 px-4 py-3 flex items-center justify-between
             bg-zinc-950/80 backdrop-blur border-b border-white/10"
    >
      <h1 class="text-base sm:text-lg font-bold text-cyan-300 truncate">
        👨‍💼 Admin Branding Settings
      </h1>
      <button
        type="button"
        class="h-9 px-3 rounded-xl text-sm bg-white/10 hover:bg-white/15 border border-white/15"
        @click="resetToDefaults"
        title="Reset to defaults"
      >
        Reset
      </button>
    </header>

    <!-- Content -->
    <div class="mx-auto w-full max-w-3xl px-4 py-5 space-y-6">
      <!-- Live brand preview -->
      <section class="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
        <div class="p-5 sm:p-6">
          <div class="flex items-center gap-3">
            <div
              class="h-12 w-12 rounded-xl grid place-items-center text-xl font-bold text-zinc-900 shadow"
              :style="{ background: form.primaryColor }"
            >
              <img
                v-if="form.logoUrl"
                :src="form.logoUrl"
                alt="Brand logo"
                class="h-12 w-12 rounded-xl object-cover"
              />
              <span v-else>{{ initials }}</span>
            </div>
            <div class="min-w-0">
              <div class="text-lg font-semibold">
                {{ form.businessName || 'Your Business' }}
              </div>
              <div class="text-xs text-zinc-300">
                {{ form.tagline || 'Tagline appears here' }}
              </div>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-2 text-[11px]">
            <span class="rounded-lg px-2 py-1 bg-white/10 border border-white/10">
              Primary: {{ form.primaryColor }}
            </span>
            <span class="rounded-lg px-2 py-1 bg-white/10 border border-white/10">
              Secondary: {{ form.secondaryColor }}
            </span>
          </div>
        </div>

        <div
          class="px-5 sm:px-6 py-3 bg-black/30 border-t border-white/10 text-[12px] text-zinc-300 flex items-center justify-between"
        >
          <span class="truncate">
            Language: <b class="text-white">{{ form.language.toUpperCase() }}</b> •
            Currency: <b class="text-white">{{ form.currency }}</b> •
            TZ: <b class="text-white">{{ form.timezone }}</b>
          </span>
          <span v-if="autoSavedAt" class="shrink-0 text-zinc-400">💾 Saved</span>
        </div>
      </section>

      <!-- Form -->
      <form @submit.prevent="save" class="space-y-5">
        <!-- Identity -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="block mb-1 text-xs font-semibold text-zinc-300">Business Name</label>
            <input
              v-model.trim="form.businessName"
              type="text"
              required
              placeholder="e.g., SmartBiz Media"
              class="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
            />
          </div>

          <div class="sm:col-span-2">
            <label class="block mb-1 text-xs font-semibold text-zinc-300">Tagline</label>
            <input
              v-model.trim="form.tagline"
              type="text"
              placeholder="e.g., Create. Grow. Monetize."
              class="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
            />
          </div>

          <div>
            <label class="block mb-1 text-xs font-semibold text-zinc-300">Primary Color</label>
            <div class="flex items-center gap-2">
              <input
                v-model="form.primaryColor"
                type="color"
                class="h-10 w-12 rounded-lg border border-white/15 bg-transparent"
              />
              <input
                v-model="form.primaryColor"
                type="text"
                placeholder="#06b6d4"
                class="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-mono placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              />
            </div>
          </div>

          <div>
            <label class="block mb-1 text-xs font-semibold text-zinc-300">Secondary Color</label>
            <div class="flex items-center gap-2">
              <input
                v-model="form.secondaryColor"
                type="color"
                class="h-10 w-12 rounded-lg border border-white/15 bg-transparent"
              />
              <input
                v-model="form.secondaryColor"
                type="text"
                placeholder="#64748b"
                class="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-mono placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              />
            </div>
          </div>
        </div>

        <!-- Brand assets -->
        <div class="rounded-2xl border border-white/10 p-4 bg-white/5 space-y-3">
          <label class="block mb-1 text-xs font-semibold text-zinc-300">Logo</label>
          <div class="flex items-center gap-3">
            <div class="h-12 w-12 rounded-xl overflow-hidden bg-white/10 border border-white/10">
              <img
                v-if="form.logoUrl"
                :src="form.logoUrl"
                alt="Logo preview"
                class="h-full w-full object-cover"
              />
              <div v-else class="h-full w-full grid place-items-center text-zinc-400 text-xs">No logo</div>
            </div>

            <div class="flex-1 flex flex-col sm:flex-row gap-2">
              <input
                v-model.trim="form.logoUrl"
                type="url"
                placeholder="https://…"
                class="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              />
              <input ref="fileRef" type="file" accept="image/*" class="hidden" @change="onFilePicked" />
              <button
                type="button"
                class="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 text-sm"
                @click="fileRef?.click()"
              >
                Upload
              </button>
              <button
                v-if="form.logoUrl"
                type="button"
                class="rounded-xl px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm"
                @click="form.logoUrl=''"
              >
                Remove
              </button>
            </div>
          </div>
          <p class="text-[11px] text-zinc-400">PNG/SVG recommended. Small images look best in mobile headers.</p>
        </div>

        <!-- Locale & money -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block mb-1 text-xs font-semibold text-zinc-300">Language</label>
            <select
              v-model="form.language"
              class="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
            >
              <option value="en">English</option>
              <option value="sw">Swahili</option>
              <option value="fr">French</option>
            </select>
          </div>
          <div>
            <label class="block mb-1 text-xs font-semibold text-zinc-300">Timezone</label>
            <select
              v-model="form.timezone"
              class="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
            >
              <option value="UTC">UTC</option>
              <option value="Africa/Dar_es_Salaam">Africa/Dar_es_Salaam</option>
              <option value="Africa/Nairobi">Africa/Nairobi</option>
              <option value="Europe/London">Europe/London</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </div>
          <div>
            <label class="block mb-1 text-xs font-semibold text-zinc-300">Currency</label>
            <select
              v-model="form.currency"
              class="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
            >
              <option value="USD">USD $</option>
              <option value="TZS">TZS TSh</option>
              <option value="KES">KES KSh</option>
              <option value="EUR">EUR €</option>
            </select>
          </div>
        </div>

        <!-- Custom domain -->
        <div class="rounded-2xl border border-white/10 p-4 bg-white/5 space-y-2">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-semibold text-zinc-300">Enable Custom Domain</label>
            <button
              type="button"
              role="switch"
              :aria-checked="String(form.enableCustomDomain)"
              class="h-7 w-12 rounded-full border transition relative"
              :class="form.enableCustomDomain ? 'bg-emerald-500/90 border-emerald-300' : 'bg-white/10 border-white/15'"
              @click="form.enableCustomDomain = !form.enableCustomDomain"
            >
              <span
                class="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition"
                :class="form.enableCustomDomain ? 'right-0.5' : 'left-0.5'"
              />
            </button>
          </div>
          <input
            v-model.trim="form.customDomain"
            :disabled="!form.enableCustomDomain"
            type="text"
            placeholder="e.g., live.yourbrand.com"
            class="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm placeholder:text-zinc-400 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
          />
          <p class="text-[11px] text-zinc-400">You’ll receive DNS instructions after saving.</p>
        </div>

        <!-- Sticky action bar -->
        <div
          class="sticky bottom-0 inset-x-0 mt-8 bg-zinc-950/80 backdrop-blur border-t border-white/10
                 px-4 py-3 flex items-center justify-between rounded-t-2xl"
        >
          <p class="text-[12px] text-zinc-400">
            {{ dirty ? 'Unsaved changes' : 'All changes saved' }}
          </p>
          <div class="flex items-center gap-2">
            <button type="button" class="min-h-[44px] px-4 py-2 rounded-xl border text-sm bg-white/10 hover:bg-white/15 border-white/15" @click="save(false)">
              Save
            </button>
            <button
              type="submit"
              class="min-h-[44px] px-4 py-2 rounded-xl text-sm bg-cyan-600 hover:bg-cyan-700 border border-cyan-600"
              :disabled="saving || !isValid"
            >
              <span v-if="!saving">Save Changes</span>
              <span v-else class="inline-flex items-center gap-2">
                <span class="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                Saving…
              </span>
            </button>
          </div>
        </div>

        <!-- Success toast -->
        <transition name="fade-pop">
          <div
            v-if="success"
            class="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-emerald-500 text-black font-semibold shadow-2xl"
            role="status"
            aria-live="polite"
          >
            ✅ Admin branding settings saved successfully!
          </div>
        </transition>
      </form>
    </div>

    <!-- Safe area for iOS -->
    <div class="h-[max(env(safe-area-inset-bottom),0px)]"></div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'

const LS_KEY = 'admin_settings'

const defaults = {
  businessName: '',
  tagline: '',
  language: 'en',
  logoUrl: '',
  primaryColor: '#0ea5e9',   // nicer default for mobile preview
  secondaryColor: '#64748b',
  timezone: 'UTC',
  currency: 'USD',
  enableCustomDomain: false,
  customDomain: ''
}

const form = reactive({ ...defaults })
const fileRef = ref(null)
const success = ref(false)
const saving = ref(false)
const dirty = ref(false)
const autoSavedAt = ref('')

const initials = computed(() =>
  (form.businessName || 'B').split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase()
)

const isValid = computed(() => !!form.businessName && isHex(form.primaryColor) && isHex(form.secondaryColor))

onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
    if (saved && typeof saved === 'object') Object.assign(form, defaults, saved)
  } catch {}
})

/* Autosave (debounced) */
let t = null
watch(
  form,
  () => {
    dirty.value = true
    clearTimeout(t)
    t = setTimeout(() => {
      persist()
      autoSavedAt.value = new Date().toLocaleTimeString()
      dirty.value = false
    }, 800)
  },
  { deep: true }
)

function save(showToast = true) {
  if (!isValid.value) return
  saving.value = true
  setTimeout(() => {
    persist()
    saving.value = false
    dirty.value = false
    if (showToast) toast()
  }, 450)
}
function persist() {
  localStorage.setItem(LS_KEY, JSON.stringify(form))
}
function resetToDefaults() {
  Object.assign(form, { ...defaults })
  toast('Reset to defaults')
}

function onFilePicked(e) {
  const f = e.target.files?.[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => { form.logoUrl = String(reader.result || '') }
  reader.readAsDataURL(f)
}

/* Helpers */
function isHex(v){ return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v || '') }
function toast(msg='Admin branding settings saved successfully!'){
  success.value = true
  setTimeout(() => (success.value = false), 2000)
}
</script>

<style scoped>
/* Toast transition */
.fade-pop-enter-active, .fade-pop-leave-active { transition: opacity .18s ease, transform .18s ease }
.fade-pop-enter-from, .fade-pop-leave-to { opacity: 0; transform: translateY(6px) }

/* Reduce iOS tap highlight */
:host, button, input, select { -webkit-tap-highlight-color: transparent; }
</style>
