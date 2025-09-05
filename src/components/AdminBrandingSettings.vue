<!-- AdminBrandingSettingsMobile.vue -->
<template>
  <section class="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 text-white">
    <!-- Header (sticky on mobile) -->
    <header
      class="sticky top-0 z-10 backdrop-blur bg-zinc-950/70 border-b border-white/10 px-4 py-3 flex items-center justify-between"
    >
      <h1 class="text-base sm:text-lg font-bold text-cyan-300 truncate">
        👨‍💼 Admin Branding Settings
      </h1>
      <button
        class="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-sm"
        @click="resetToDefaults"
        title="Reset to defaults"
      >
        Reset
      </button>
    </header>

    <!-- Content -->
    <div class="mx-auto w-full max-w-3xl px-4 py-5 space-y-6">
      <!-- Live Brand Preview -->
      <section
        class="rounded-2xl overflow-hidden border border-white/10 bg-white/5"
      >
        <div
          class="p-5 sm:p-6"
          :style="{
            '--brand-primary': settings.primaryColor,
            '--brand-secondary': settings.secondaryColor
          }"
        >
          <div class="flex items-center gap-3">
            <div
              class="h-12 w-12 rounded-xl grid place-items-center text-xl font-bold text-zinc-900 shadow"
              :style="{ background: settings.primaryColor }"
            >
              <img
                v-if="settings.logoUrl"
                :src="settings.logoUrl"
                alt="Brand logo"
                class="h-12 w-12 rounded-xl object-cover"
              />
              <span v-else>{{ initials }}</span>
            </div>
            <div class="min-w-0">
              <div class="text-lg font-semibold">{{ settings.businessName || 'Your Business' }}</div>
              <div class="text-xs text-zinc-300">{{ settings.tagline || 'Tagline appears here' }}</div>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-2 text-[11px]">
            <span class="rounded-lg px-2 py-1 bg-[var(--brand-primary)]/20 border border-white/10">
              Primary: {{ settings.primaryColor }}
            </span>
            <span class="rounded-lg px-2 py-1 bg-[var(--brand-secondary)]/20 border border-white/10">
              Secondary: {{ settings.secondaryColor }}
            </span>
          </div>
        </div>

        <div class="px-5 sm:px-6 py-3 bg-black/30 border-t border-white/10 text-[12px] text-zinc-300 flex items-center justify-between">
          <span class="truncate">Language: <b class="text-white">{{ settings.language.toUpperCase() }}</b> •
            Currency: <b class="text-white">{{ settings.currency }}</b> • TZ: <b class="text-white">{{ settings.timezone }}</b></span>
          <span v-if="autoSavedAt" class="shrink-0 text-zinc-400">💾 Saved</span>
        </div>
      </section>

      <!-- Form -->
      <form @submit.prevent="onSave" class="space-y-5">
        <!-- Business -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="col-span-1 sm:col-span-2">
            <Label>Business Name</Label>
            <Input v-model.trim="settings.businessName" placeholder="e.g., SmartBiz Media" required />
          </div>

          <div class="col-span-1 sm:col-span-2">
            <Label>Tagline</Label>
            <Input v-model.trim="settings.tagline" placeholder="e.g., Create. Grow. Monetize." />
          </div>

          <div>
            <Label>Primary Color</Label>
            <ColorRow
              v-model="settings.primaryColor"
              :fallback="'#06b6d4'"
            />
          </div>

          <div>
            <Label>Secondary Color</Label>
            <ColorRow
              v-model="settings.secondaryColor"
              :fallback="'#64748b'"
            />
          </div>
        </div>

        <!-- Brand assets -->
        <div class="rounded-2xl border border-white/10 p-4 bg-white/5 space-y-3">
          <Label>Logo</Label>
          <div class="flex items-center gap-3">
            <div class="h-12 w-12 rounded-xl overflow-hidden bg-white/10 border border-white/10">
              <img
                v-if="settings.logoUrl"
                :src="settings.logoUrl"
                alt="Logo preview"
                class="h-full w-full object-cover"
              />
              <div v-else class="h-full w-full grid place-items-center text-zinc-400 text-xs">No logo</div>
            </div>

            <div class="flex-1 flex flex-col sm:flex-row gap-2">
              <Input v-model.trim="settings.logoUrl" placeholder="https://…" />
              <input
                ref="fileRef"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onPickFile"
              />
              <button
                type="button"
                class="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/15 text-sm"
                @click="fileRef?.click()"
              >
                Upload
              </button>
              <button
                v-if="settings.logoUrl"
                type="button"
                class="rounded-xl px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm"
                @click="settings.logoUrl=''"
              >
                Remove
              </button>
            </div>
          </div>
          <p class="text-[11px] text-zinc-400">PNG/SVG recommended. Small images look best on mobile headers.</p>
        </div>

        <!-- Locale & money -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Language</Label>
            <Select v-model="settings.language" :options="languages" />
          </div>
          <div>
            <Label>Timezone</Label>
            <Select v-model="settings.timezone" :options="timezones" />
          </div>
          <div>
            <Label>Currency</Label>
            <Select v-model="settings.currency" :options="currencies" />
          </div>
        </div>

        <!-- Custom domain -->
        <div class="rounded-2xl border border-white/10 p-4 bg-white/5 space-y-2">
          <div class="flex items-center justify-between">
            <Label>Enable Custom Domain</Label>
            <Toggle v-model="settings.enableCustomDomain" />
          </div>
          <Input
            v-model.trim="settings.customDomain"
            :disabled="!settings.enableCustomDomain"
            placeholder="e.g., live.yourbrand.com"
          />
          <p class="text-[11px] text-zinc-400">
            You’ll receive DNS instructions after saving. Make sure your domain is active.
          </p>
        </div>

        <!-- Sticky action bar (mobile-first) -->
        <div
          class="sticky bottom-0 inset-x-0 mt-8 bg-zinc-950/80 backdrop-blur border-t border-white/10
                 px-4 py-3 flex items-center justify-between rounded-t-2xl"
        >
          <p class="text-[12px] text-zinc-400">
            {{ dirty ? 'Unsaved changes' : 'All changes saved' }}
          </p>
          <div class="flex items-center gap-2">
            <button type="button" class="btn ghost" @click="saveAndClose(false)">Save</button>
            <button type="submit" class="btn primary" :disabled="saving || !isValid">
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
            ✅ Settings saved successfully!
          </div>
        </transition>
      </form>
    </div>

    <!-- Safe area spacer -->
    <div class="h-[max(env(safe-area-inset-bottom),0px)]"></div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'

/** ---------- Local UI primitives (mobile-first) ---------- **/
const Label = (props, { slots }) => (
  <label class="block mb-1 text-xs font-semibold text-zinc-300">{ slots.default?.() }</label>
)
const Input = {
  props: { modelValue: String, placeholder: String, required: Boolean, disabled: Boolean },
  emits: ['update:modelValue'],
  setup(p, { emit }) {
    return () => (
      <input
        class="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm
               placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 disabled:opacity-50"
        value={p.modelValue}
        placeholder={p.placeholder}
        required={p.required}
        disabled={p.disabled}
        onInput={e => emit('update:modelValue', e.target.value)}
      />
    )
  }
}
const Select = {
  props: { modelValue: String, options: Array },
  emits: ['update:modelValue'],
  setup(p, { emit }) {
    return () => (
      <select
        class="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
        value={p.modelValue}
        onChange={e => emit('update:modelValue', e.target.value)}
      >
        { (p.options || []).map(o => <option value={o.value}>{o.label}</option>) }
      </select>
    )
  }
}
const Toggle = {
  props: { modelValue: Boolean },
  emits: ['update:modelValue'],
  setup(p, { emit }) {
    const on = () => emit('update:modelValue', !p.modelValue)
    return () => (
      <button
        type="button"
        class={[
          "h-7 w-12 rounded-full border transition relative",
          p.modelValue ? "bg-emerald-500/90 border-emerald-300" : "bg-white/10 border-white/15"
        ]}
        onClick={on}
        role="switch"
        aria-checked={String(p.modelValue)}
      >
        <span
          class={[
            "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
            p.modelValue ? "right-0.5" : "left-0.5"
          ]}
        />
      </button>
    )
  }
}
const ColorRow = {
  props: { modelValue: String, fallback: String },
  emits: ['update:modelValue'],
  setup(p, { emit }) {
    const val = computed({
      get: () => p.modelValue || p.fallback,
      set: (v) => emit('update:modelValue', v)
    })
    return () => (
      <div class="flex items-center gap-2">
        <input
          type="color"
          class="h-10 w-12 rounded-lg border border-white/15 bg-transparent"
          value={val.value}
          onInput={e => val.value = e.target.value}
        />
        <input
          class="flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-mono"
          value={val.value}
          onInput={e => val.value = e.target.value}
        />
      </div>
    )
  }
}

/** ---------- State & Logic ---------- **/
const LS_KEY = 'admin_settings'

const defaults = {
  businessName: '',
  tagline: '',
  language: 'en',
  logoUrl: '',
  primaryColor: '#0ea5e9',
  secondaryColor: '#64748b',
  timezone: 'UTC',
  currency: 'USD',
  enableCustomDomain: false,
  customDomain: ''
}

const settings = reactive({ ...defaults })
const success = ref(false)
const saving = ref(false)
const dirty = ref(false)
const autoSavedAt = ref('')
const fileRef = ref(null)

/* Option lists (trimmed for mobile; extend as needed) */
const languages = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Swahili' },
  { value: 'fr', label: 'French' }
]
const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi' },
  { value: 'Africa/Dar_es_Salaam', label: 'Africa/Dar_es_Salaam' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'America/New_York', label: 'America/New_York' }
]
const currencies = [
  { value: 'USD', label: 'USD $' },
  { value: 'TZS', label: 'TZS TSh' },
  { value: 'KES', label: 'KES KSh' },
  { value: 'EUR', label: 'EUR €' }
]

/* Derived */
const initials = computed(() => (settings.businessName || 'B').split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase())
const isValid = computed(() => !!settings.businessName && isHex(settings.primaryColor) && isHex(settings.secondaryColor))

/* Load existing */
onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
    if (saved && typeof saved === 'object') Object.assign(settings, defaults, saved)
  } catch {}
})

/* Autosave (debounced) */
let t = null
watch(
  settings,
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

/* Actions */
function onSave(){ saveAndClose(false) }
function saveAndClose(closeAfter){
  if (!isValid.value) return
  saving.value = true
  setTimeout(() => {
    persist()
    saving.value = false
    dirty.value = false
    pingSuccess()
  }, 500)
}
function persist(){
  localStorage.setItem(LS_KEY, JSON.stringify(settings))
}
function resetToDefaults(){
  Object.assign(settings, { ...defaults })
  pingSuccess('Reset to defaults')
}
function pingSuccess(msg='Settings saved successfully!'){
  success.value = true
  setTimeout(() => (success.value = false), 2000)
}

/* Utils */
function isHex(v){ return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v || '') }
function onPickFile(e){
  const f = e.target.files?.[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => { settings.logoUrl = String(reader.result || '') }
  reader.readAsDataURL(f)
}
</script>

<style scoped>
.btn {
  @apply min-h-[44px] px-4 py-2 rounded-xl border text-sm transition;
}
.btn.primary {
  @apply bg-cyan-600 text-white border-cyan-600 hover:bg-cyan-700;
}
.btn.ghost {
  @apply bg-white/10 text-white border-white/15 hover:bg-white/15;
}

/* Toast transition */
.fade-pop-enter-active,.fade-pop-leave-active{ transition: opacity .18s ease, transform .18s ease }
.fade-pop-enter-from,.fade-pop-leave-to{ opacity:0; transform: translateY(6px) }

/* Reduce iOS tap highlight */
:host, button, input, select { -webkit-tap-highlight-color: transparent; }
</style>
