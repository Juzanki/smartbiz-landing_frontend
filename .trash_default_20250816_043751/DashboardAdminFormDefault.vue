<!-- src/components/DashboardAdminForm.vue -->
<template>
  <form
    class="relative mx-auto max-w-md w-[min(94vw,40rem)] bg-white/90 dark:bg-slate-900/70 rounded-2xl shadow-xl border border-white/20 backdrop-blur"
    :style="{ '--accent': accent }"
    novalidate
    autocomplete="off"
    @submit.prevent="onSubmit"
  >
    <!-- Header -->
    <header class="px-4 sm:px-6 pt-5 pb-4">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-xl grid place-items-center bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)]">
          <i class="i-tabler-settings-cog text-xl"></i>
        </div>
        <div class="min-w-0">
          <h3 class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">
            {{ formTitle }}
          </h3>
          <p class="text-[.85rem] text-slate-500 dark:text-slate-300 line-clamp-1">
            Business identity & contact details
          </p>
        </div>
      </div>

      <!-- Status chips -->
      <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span :class="['chip', online ? 'chip-ok' : 'chip-warn']">
          <i :class="online ? 'i-tabler-wifi' : 'i-tabler-wifi-off'"></i>
          {{ online ? 'Online' : 'Offline (drafts only)' }}
        </span>
        <span v-if="dirty" class="chip chip-info">
          <i class="i-tabler-edit"></i> Unsaved changes
        </span>
        <span v-if="restored" class="chip chip-accent">
          <i class="i-tabler-history"></i> Draft restored
        </span>
      </div>
    </header>

    <!-- Fields -->
    <section class="px-4 sm:px-6 py-5 grid gap-4">
      <!-- Name -->
      <div>
        <label for="businessName" class="label">System/Business Name</label>
        <div class="field">
          <i class="i-tabler-building-store field-icon"></i>
          <input
            id="businessName"
            v-model.trim="form.businessName"
            type="text"
            inputmode="text"
            placeholder="SmartBiz Assistance"
            :aria-invalid="!!errors.businessName"
            class="input"
            @blur="touch('businessName')"
          />
        </div>
        <p v-if="touched.businessName && errors.businessName" class="error">{{ errors.businessName }}</p>
      </div>

      <!-- Email -->
      <div>
        <label for="businessEmail" class="label">Admin Email</label>
        <div class="field">
          <i class="i-tabler-at field-icon"></i>
          <input
            id="businessEmail"
            v-model.trim="form.businessEmail"
            type="email"
            inputmode="email"
            autocomplete="email"
            placeholder="admin@yourbiz.com"
            :aria-invalid="!!errors.businessEmail"
            class="input"
            @blur="touch('businessEmail')"
          />
          <button type="button" class="suffix-btn" @click="copyEmail" title="Copy email">
            <i class="i-tabler-copy"></i>
          </button>
        </div>
        <p v-if="touched.businessEmail && errors.businessEmail" class="error">{{ errors.businessEmail }}</p>
      </div>

      <!-- Phone -->
      <div>
        <label for="businessPhone" class="label">Phone</label>
        <div class="field">
          <span class="prefix">+</span>
          <input
            id="businessPhone"
            v-model="phoneDisplay"
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            placeholder="255 7XX XXX XXX"
            :aria-invalid="!!errors.businessPhone"
            class="input pl-9"
            @input="formatPhone"
            @blur="touch('businessPhone')"
          />
          <button type="button" class="suffix-btn" @click="toggleWhatsApp = !toggleWhatsApp" :aria-pressed="toggleWhatsApp" title="Toggle WhatsApp">
            <i :class="toggleWhatsApp ? 'i-tabler-brand-whatsapp' : 'i-tabler-phone'"></i>
          </button>
        </div>
        <p v-if="touched.businessPhone && errors.businessPhone" class="error">{{ errors.businessPhone }}</p>
        <p class="hint">International format, no spaces stored. Example: +2557XXXXXXXX</p>
      </div>

      <!-- Description -->
      <div>
        <label for="desc" class="label">Short Description <span class="muted">(optional)</span></label>
        <div class="field textarea-wrap">
          <i class="i-tabler-message-2 field-icon"></i>
          <textarea
            id="desc"
            v-model.trim="form.businessDesc"
            rows="3"
            class="input textarea pr-12"
            placeholder="Describe your system or business…"
            @input="countDesc"
            @blur="touch('businessDesc')"
          ></textarea>
          <span class="counter">{{ descCount }}/{{ descMax }}</span>
        </div>
        <p v-if="touched.businessDesc && errors.businessDesc" class="error">{{ errors.businessDesc }}</p>
      </div>

      <!-- Global messages -->
      <transition name="fade">
        <div v-if="showErrorSummary" class="msg msg-error">
          Please fix the highlighted fields before saving.
        </div>
      </transition>
      <transition name="fade">
        <div v-if="successMsg" class="msg msg-success">
          {{ successMsg }}
        </div>
      </transition>
    </section>

    <!-- Sticky actions (thumb reach, safe-area aware) -->
    <footer class="sticky-actions px-4 sm:px-6 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 bg-white/85 dark:bg-slate-900/70 backdrop-blur border-t border-white/20 flex items-center gap-3">
      <button type="button" class="btn ghost flex-1" :disabled="loading || !dirty" @click="resetForm" title="Reset changes">
        <i class="i-tabler-eraser"></i> Reset
      </button>
      <button type="submit" class="btn primary flex-[2]" :disabled="loading || !dirty || hasErrors || !online">
        <span v-if="!loading" class="flex items-center justify-center gap-2">
          <i class="i-tabler-device-floppy"></i> Save Changes
        </span>
        <span v-else class="flex items-center justify-center gap-2">
          <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Saving…
        </span>
      </button>
    </footer>

    <!-- Tiny toasts -->
    <div class="toasts">
      <transition-group name="toast">
        <div v-for="t in toasts" :key="t.id" class="toast">
          <span class="mr-1">{{ t.icon }}</span>{{ t.msg }}
        </div>
      </transition-group>
    </div>
  </form>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/* Props/Emits */
const props = defineProps({
  formTitle: { type: String, default: 'Business/System Settings' },
  initialData: { type: Object, default: () => ({}) },
  accent: { type: String, default: '#fbbf24' }, // yellow-400
  autosaveKey: { type: String, default: 'admin_form_draft' }
})
const emit = defineEmits(['submit'])

/* Base form + reactive state */
const base = {
  businessName: props.initialData.businessName || '',
  businessEmail: props.initialData.businessEmail || '',
  businessPhone: props.initialData.businessPhone || '',
  businessDesc: props.initialData.businessDesc || '',
}
const form = reactive({ ...base })
const loading = ref(false)
const successMsg = ref('')
const toasts = ref([])
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const restored = ref(false)
const toggleWhatsApp = ref(true)
const touched = reactive({ businessName: false, businessEmail: false, businessPhone: false, businessDesc: false })

/* Counters/limits */
const descMax = 240
const descCount = ref((form.businessDesc || '').length)

/* Toasts */
const showToast = (msg, icon = '💾', ms = 1800) => {
  const id = Date.now() + Math.random()
  toasts.value.push({ id, msg, icon })
  setTimeout(() => (toasts.value = toasts.value.filter(t => t.id !== id)), ms)
}

/* Touch helper */
function touch(k){ touched[k] = true }

/* Validation */
const errors = reactive({ businessName: '', businessEmail: '', businessPhone: '', businessDesc: '' })
function validate() {
  // name
  errors.businessName = !form.businessName
    ? 'Name is required.'
    : form.businessName.length < 2
      ? 'Name is too short.'
      : form.businessName.length > 60
        ? 'Name is too long (max 60).'
        : ''
  // email
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.businessEmail || '')
  errors.businessEmail = !form.businessEmail ? 'Email is required.' : (!emailOk ? 'Invalid email format.' : '')
  // phone
  const digits = (form.businessPhone || '').replace(/\s+/g,'')
  const phoneOk = /^\+\d{8,15}$/.test(digits)
  errors.businessPhone = !form.businessPhone ? 'Phone is required.' : (!phoneOk ? 'Use +country then digits, e.g. +2557XXXXXXXX.' : '')
  // desc
  errors.businessDesc = form.businessDesc && form.businessDesc.length > descMax ? `Max ${descMax} characters.` : ''
}
const hasErrors = computed(() => Object.values(errors).some(Boolean))
watch(form, () => { validate(); autosave() }, { deep: true })

/* Dirty */
const dirty = computed(() => JSON.stringify(form) !== JSON.stringify(base))
const showErrorSummary = computed(() => Object.values(touched).some(Boolean) && hasErrors.value)

/* Phone formatting (display pretty, store normalized) */
const phoneDisplay = ref(form.businessPhone || '')
function formatPhone(e){
  let raw = e?.target?.value ?? phoneDisplay.value
  raw = raw.replace(/[^\d+]/g, '').replace(/(?!^)\+/g,'')  // keep + only at start
  const beautified = raw.startsWith('+2557')
    ? raw.replace(/^(\+2557)(\d{3})(\d{3})(\d{0,3}).*/, (_,a,b,c,d)=> d?`${a} ${b} ${c} ${d}`: c?`${a} ${b} ${c}`: b?`${a} ${b}`: a)
    : raw.replace(/^(\+\d{1,3})(\d{3})(\d{3})(\d{0,3}).*/, (_,a,b,c,d)=> d?`${a} ${b} ${c} ${d}`: c?`${a} ${b} ${c}`: b?`${a} ${b}`: a)
  phoneDisplay.value = beautified
  form.businessPhone = beautified.replace(/\s+/g,'')
}

/* Description counter */
function countDesc(){ descCount.value = (form.businessDesc || '').length }

/* Autosave/restore */
let saveTimer = null
function autosave(){
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(props.autosaveKey, JSON.stringify(form)) } catch {}
  }, 400)
}
function restoreDraft(){
  try {
    const raw = localStorage.getItem(props.autosaveKey)
    if (!raw) return
    const draft = JSON.parse(raw)
    if (JSON.stringify(draft) !== JSON.stringify(form)){
      Object.assign(form, draft)
      phoneDisplay.value = draft.businessPhone || ''
      descCount.value = (form.businessDesc || '').length
      restored.value = true
      showToast('Draft restored','🗂️')
      setTimeout(()=> restored.value = false, 2500)
    }
  } catch {}
}
function clearDraft(){ try { localStorage.removeItem(props.autosaveKey) } catch {} }

/* Online listeners */
function onOnline(){ online.value = true }
function onOffline(){ online.value = false }
onMounted(() => {
  validate()
  restoreDraft()
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})

/* Actions */
async function onSubmit(){
  touched.businessName = touched.businessEmail = touched.businessPhone = true
  validate()
  if (hasErrors.value){ showToast('Please fix errors','⚠️'); return }
  if (!online.value){ showToast('You are offline','📴'); return }
  loading.value = true; successMsg.value = ''
  try{
    // Replace with real API; keeping emit for drop-in compatibility
    await new Promise(r=>setTimeout(r,800))
    emit('submit', { ...form })
    successMsg.value = '✔️ Changes saved successfully!'
    Object.assign(base, JSON.parse(JSON.stringify(form)))
    clearDraft()
    showToast('Saved','✅')
    setTimeout(()=> successMsg.value = '', 2200)
  }catch(e){
    showToast('Failed to save','❌')
  }finally{
    loading.value = false
  }
}
function resetForm(){
  Object.assign(form, JSON.parse(JSON.stringify(base)))
  phoneDisplay.value = form.businessPhone
  descCount.value = (form.businessDesc || '').length
  clearDraft()
  showToast('Changes discarded','↩️')
}

/* Utilities */
async function copyEmail(){
  try{
    await navigator.clipboard.writeText(form.businessEmail || '')
    showToast('Email copied','📋')
  }catch{ showToast('Copy failed','❌') }
}
</script>

<style scoped>
/* Labels & fields */
.label { @apply block text-[.85rem] font-medium text-slate-800 dark:text-slate-200 mb-1; }
.field  { @apply relative flex items-center rounded-xl border bg-white/70 dark:bg-slate-900/60 backdrop-blur px-3 py-2 border-slate-200/80 dark:border-white/10 focus-within:border-[var(--accent)]/60 focus-within:ring-2 focus-within:ring-[var(--accent)]/25; }
.field-icon { @apply text-slate-500 dark:text-slate-300 mr-2; }
.input { @apply w-full bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400/80; }
.textarea-wrap { @apply items-start; }
.textarea { @apply resize-y min-h-[84px]; }
.counter { @apply absolute right-3 bottom-2 text-[.72rem] text-slate-500/80; }
.prefix { @apply absolute left-3 text-slate-500 select-none; }
.suffix-btn { @apply absolute right-2 grid place-items-center h-8 w-8 rounded-lg text-slate-600 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5; }

/* Chips */
.chip { @apply inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[.72rem] font-medium; }
.chip-ok   { @apply bg-emerald-50 text-emerald-700 border-emerald-200; }
.chip-warn { @apply bg-amber-50 text-amber-700 border-amber-200; }
.chip-info { @apply bg-slate-50 text-slate-700 border-slate-200; }
.chip-accent { @apply bg-[var(--accent)]/15 text-[color-mix(in_oklab,var(--accent)_80%,black)] border-[var(--accent)]/30; }

/* Messages */
.msg { @apply rounded-xl text-sm px-3 py-2; }
.msg-success { @apply border border-green-200 bg-green-50 text-green-700; }
.msg-error   { @apply border border-red-200/60 bg-red-50/80 text-red-700; }
.error { @apply mt-1 text-[.8rem] text-red-600; }
.hint  { @apply mt-1 text-[.78rem] text-slate-500; }
.muted { @apply text-slate-400; }

/* Buttons */
.btn { @apply inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-bold transition active:translate-y-[1px] select-none; }
.btn.primary {
  color: #0b1020; background: var(--accent);
  box-shadow: 0 8px 24px rgba(0,0,0,.12);
}
.btn.primary:disabled { @apply opacity-60 cursor-not-allowed; }
.btn.ghost { @apply text-slate-700 dark:text-slate-100 border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5; }
.btn.ghost:disabled { @apply opacity-50 cursor-not-allowed; }

/* Sticky footer */
.sticky-actions { position: sticky; bottom: 0; }

/* Toasts */
.toasts { position: fixed; left: 1rem; bottom: calc(4.25rem + env(safe-area-inset-bottom)); display: grid; gap: 6px; z-index: 50; }
.toast { @apply bg-slate-900/90 text-white text-sm px-3 py-2 rounded-xl border border-white/10 shadow-xl; }
.toast-enter-active, .toast-leave-active { transition: all .2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(6px); }

/* Fades */
.fade-enter-active, .fade-leave-active { transition: opacity .25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
