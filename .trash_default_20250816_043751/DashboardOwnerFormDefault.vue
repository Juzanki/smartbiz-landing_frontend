<template>
  <form
    class="owner-form bg-white/95 p-4 sm:p-6 rounded-3 shadow-md max-w-md w-[min(94vw,40rem)] mx-auto border border-yellow-300 position-relative"
    autocomplete="off"
    novalidate
    @submit.prevent="handleSubmit"
  >
    <!-- Header + avatar -->
    <header class="d-flex align-items-center gap-3 mb-3">
      <div class="avatar-wrap position-relative" :class="{ 'avatar-has': !!form.logoDataUrl }">
        <img v-if="form.logoDataUrl" :src="form.logoDataUrl" alt="Logo" class="avatar-img" />
        <div v-else class="avatar-skeleton"></div>
        <button type="button" class="avatar-edit btn btn-sm btn-dark" @click="pickLogo" :title="$t('change_logo') || 'Change logo'">
          <i class="bi bi-camera"></i>
        </button>
        <input ref="fileEl" type="file" accept="image/*" class="d-none" @change="onLogoPicked" />
        <button v-if="form.logoDataUrl" type="button" class="avatar-remove btn btn-sm btn-outline-danger" @click="removeLogo" :title="$t('remove_logo') || 'Remove logo'">
          <i class="bi bi-x"></i>
        </button>
      </div>

      <div class="flex-grow-1">
        <h3 class="m-0 fs-5 fw-bold text-blue-900">{{ $t('update_owner_profile') }}</h3>
        <div class="mt-2 d-flex flex-wrap gap-2 align-items-center">
          <span :class="['chip', online ? 'chip-ok' : 'chip-warn']">
            <i :class="online ? 'bi bi-wifi' : 'bi bi-wifi-off'"></i>
            {{ online ? ($t('online') || 'Online') : ($t('offline') || 'Offline') }}
          </span>
          <span v-if="dirty" class="chip chip-info">
            <i class="bi bi-pencil-square"></i> {{ $t('unsaved_changes') || 'Unsaved changes' }}
          </span>
          <span v-if="restored" class="chip chip-accent">
            <i class="bi bi-clock-history"></i> {{ $t('draft_restored') || 'Draft restored' }}
          </span>
        </div>
      </div>
    </header>

    <!-- Owner Name -->
    <div class="mb-3">
      <label for="ownerName" class="form-label text-blue-900">{{ $t('full_name') }}</label>
      <input
        id="ownerName"
        v-model.trim="form.ownerName"
        type="text"
        class="form-control"
        :placeholder="$t('enter_full_name')"
        :aria-invalid="!!errors.ownerName"
        @blur="touch('ownerName')"
        required
      />
      <small v-if="touched.ownerName && errors.ownerName" class="text-danger">{{ errors.ownerName }}</small>
    </div>

    <!-- Business Name -->
    <div class="mb-3">
      <label for="businessName" class="form-label text-blue-900">{{ $t('business_name') }}</label>
      <input
        id="businessName"
        v-model.trim="form.businessName"
        type="text"
        class="form-control"
        :placeholder="$t('enter_business_name')"
        :aria-invalid="!!errors.businessName"
        @input="maybeSuggest"
        @blur="touch('businessName')"
        required
      />
      <small v-if="touched.businessName && errors.businessName" class="text-danger">{{ errors.businessName }}</small>

      <!-- Smart suggestions (mobile-friendly chips) -->
      <div v-if="domainSuggestions.length" class="mt-2 d-flex flex-wrap gap-2">
        <button
          v-for="s in domainSuggestions"
          :key="s"
          type="button"
          class="suggest-chip"
          @click="applySuggestion(s)"
        >
          <i class="bi bi-magic"></i> {{ s }}
        </button>
      </div>
    </div>

    <!-- Custom Domain -->
    <div class="mb-3">
      <label for="domain" class="form-label text-blue-900">{{ $t('custom_domain') }}</label>
      <div class="input-group has-validation">
        <span class="input-group-text">https://</span>
        <input
          id="domain"
          v-model.trim="domainInput"
          type="text"
          class="form-control"
          :placeholder="$t('your_custom_domain')"
          :aria-invalid="!!errors.domain"
          @input="onDomainInput"
          @blur="onDomainBlur"
        />
        <button v-if="domainInput" type="button" class="btn btn-outline-secondary" @click="clearDomain" :title="$t('clear') || 'Clear'">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <!-- availability state -->
      <div class="d-flex align-items-center gap-2 mt-1">
        <small class="text-muted">{{ $t('optional') }}</small>
        <small v-if="checkingDomain" class="text-secondary d-inline-flex align-items-center gap-1">
          <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          {{ $t('checking') || 'Checking…' }}
        </small>
        <small v-else-if="domainState==='available'" class="text-success d-inline-flex align-items-center gap-1">
          <i class="bi bi-check-circle"></i> {{ $t('available') || 'Available' }}
        </small>
        <small v-else-if="domainState==='taken'" class="text-danger d-inline-flex align-items-center gap-1">
          <i class="bi bi-x-circle"></i> {{ $t('taken') || 'Taken' }}
        </small>
        <small v-else-if="domainState==='unknown' && domainInput" class="text-secondary">
          {{ $t('unknown_status') || 'Status unknown' }}
        </small>
      </div>

      <small v-if="touched.domain && errors.domain" class="text-danger d-block mt-1">{{ errors.domain }}</small>
    </div>

    <!-- Language -->
    <div class="mb-20 sm:mb-4">
      <label for="lang" class="form-label text-blue-900">{{ $t('language') }}</label>
      <select id="lang" v-model="form.language" class="form-select" required @change="applyLanguage">
        <option value="sw">Kiswahili</option>
        <option value="en">English</option>
        <option value="fr">Français</option>
        <option value="ar">العربية</option>
      </select>
    </div>

    <!-- Sticky mobile actions -->
    <div class="sticky-actions">
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-outline-secondary w-25" :disabled="loading || !dirty" @click="resetForm">
          <i class="bi bi-arrow-counterclockwise me-1"></i>{{ $t('reset') || 'Reset' }}
        </button>
        <button
          class="btn btn-warning fw-bold text-dark flex-fill"
          :disabled="loading || hasErrors || !dirty || !online"
          type="submit"
        >
          <span v-if="!loading">{{ $t('save_changes') }}</span>
          <span v-else>
            <i class="bi bi-arrow-repeat spinner-border spinner-border-sm me-1"></i>
            {{ $t('saving') }}...
          </span>
        </button>
      </div>
    </div>
  </form>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useToast } from 'vue-toastification'
import axios from 'axios'
import { useI18n } from 'vue-i18n'

/* i18n & toast */
const toast = useToast()
const { locale, t } = useI18n({ useScope: 'global' })

/* Online status */
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const onOnline = () => (online.value = true)
const onOffline = () => (online.value = false)

/* Base form */
const form = reactive({
  ownerName: localStorage.getItem('user_name') || '',
  businessName: localStorage.getItem('business_name') || '',
  domain: localStorage.getItem('business_domain') || '', // normalized (no protocol)
  language: localStorage.getItem('user_lang') || 'sw',
  logoDataUrl: localStorage.getItem('business_logo') || '' // data URL preview
})

/* Snapshot for dirty check */
const base = reactive({ ...form })
const dirty = computed(() => JSON.stringify(form) !== JSON.stringify(base))

/* UI & helpers */
const loading = ref(false)
const touched = reactive({ ownerName: false, businessName: false, domain: false, language: false })
function touch(k){ touched[k] = true }
const restored = ref(false)
const AUTOSAVE_KEY = 'owner_profile_pro_draft'

/* Validation */
const errors = reactive({ ownerName: '', businessName: '', domain: '' })
const hasErrors = computed(() => Object.values(errors).some(Boolean))

/* Domain input & availability */
const domainInput = ref(form.domain || '')
const checkingDomain = ref(false)
const domainState = ref('') // '', 'available', 'taken', 'unknown'
let checkTimer = 0

/* Smart suggestions based on business name */
const domainSuggestions = computed(() => {
  const base = slugify(form.businessName)
  if (!base) return []
  const roots = Array.from(new Set([base, base.replace(/-/g,''), base + 'app']))
  const tlds = ['co.tz','tz','com','co.ke']
  return roots.flatMap(r => tlds.map(tld => `${r}.${tld}`)).slice(0, 6)
})
function applySuggestion(s) {
  domainInput.value = s
  onDomainBlur()
}

/* Avatar/logo upload */
const fileEl = ref(null)
function pickLogo(){ fileEl.value?.click() }
function removeLogo(){
  form.logoDataUrl = ''
  try { localStorage.removeItem('business_logo') } catch {}
}
async function onLogoPicked(e){
  const file = e?.target?.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) { // 2MB guard
    toast.error('📦 ' + (t('file_too_large') || 'Image too large (max 2MB)'))
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    form.logoDataUrl = reader.result
    try { localStorage.setItem('business_logo', reader.result) } catch {}
  }
  reader.readAsDataURL(file)
}

/* Validation fns */
function validate(){
  // ownerName
  errors.ownerName = !form.ownerName
    ? (t('field_required') || 'Required')
    : form.ownerName.length < 2
      ? (t('too_short') || 'Too short')
      : form.ownerName.length > 80
        ? (t('too_long_max', { n: 80 }) || 'Too long (max 80)')
        : ''
  // businessName
  errors.businessName = !form.businessName
    ? (t('field_required') || 'Required')
    : form.businessName.length > 80
      ? (t('too_long_max', { n: 80 }) || 'Too long (max 80)')
      : ''
  // domain
  if (!domainInput.value) {
    errors.domain = ''
  } else {
    const norm = normalizeDomain(domainInput.value)
    errors.domain = isDomainValid(norm) ? '' : (t('invalid_domain') || 'Enter a valid domain (e.g. smartbiz.co.tz)')
  }
}

/* Domain helpers */
function normalizeDomain(raw=''){
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//,'')
    .replace(/^www\./,'')
    .replace(/\/.*$/,'')
    .replace(/\s+/g,'')
}
function isDomainValid(host){
  const parts = host.split('.')
  if (parts.length < 2) return false
  return parts.every((lbl, i) => {
    if (!lbl || lbl.length > 63) return false
    if (/^-|-$/.test(lbl)) return false
    if (i === parts.length - 1) return /^[a-z]{2,}$/i.test(lbl)
    return /^[a-z0-9-]+$/i.test(lbl)
  })
}
function slugify(name=''){
  return name
    .normalize?.('NFD').replace(/[\u0300-\u036f]/g,'') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0, 40)
}

/* Debounced domain availability check (optional backend) */
async function checkAvailability(host){
  if (!host || !isDomainValid(host)) { domainState.value = ''; return }
  checkingDomain.value = true
  domainState.value = ''
  try {
    // Optional: replace with your real endpoint
    // const { data } = await axios.get('/api/domain/check', { params: { domain: host }, timeout: 3000 })
    // domainState.value = data?.available ? 'available' : 'taken'
    // Demo heuristic: random-ish but stable per host hash
    const hash = [...host].reduce((a,c)=>((a<<5)-a)+c.charCodeAt(0),0)
    domainState.value = (Math.abs(hash) % 5 === 0) ? 'taken' : 'available'
  } catch {
    domainState.value = 'unknown'
  } finally {
    checkingDomain.value = false
  }
}
function onDomainInput(){
  clearTimeout(checkTimer)
  validate()
  const norm = normalizeDomain(domainInput.value)
  checkTimer = setTimeout(() => checkAvailability(norm), 500)
}
function onDomainBlur(){
  touched.domain = true
  const norm = normalizeDomain(domainInput.value)
  domainInput.value = norm
  form.domain = norm
  validate()
  checkAvailability(norm)
}
function clearDomain(){
  domainInput.value = ''
  form.domain = ''
  domainState.value = ''
  validate()
}

/* Suggest from businessName */
function maybeSuggest(){
  if (!domainInput.value) {
    const base = slugify(form.businessName)
    if (base) domainInput.value = `${base}.co.tz`
  }
}

/* Autosave / restore */
let saveTimer = 0
function autosave(){
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ ...form, domainInput: domainInput.value }))
    } catch {}
  }, 350)
}
function restoreDraft(){
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY)
    if (!raw) return
    const draft = JSON.parse(raw)
    Object.assign(form, draft)
    domainInput.value = draft.domainInput ?? draft.domain ?? ''
    restored.value = true
    setTimeout(()=> restored.value = false, 2500)
  } catch {}
}
function clearDraft(){ try { localStorage.removeItem(AUTOSAVE_KEY) } catch {} }

/* Persist language immediately */
watch(() => form.language, (lng) => {
  locale.value = lng
  try { localStorage.setItem('user_lang', lng) } catch {}
})

/* Validate & autosave on change */
watch(form, () => { validate(); autosave() }, { deep: true })
watch(domainInput, () => { validate(); autosave() })

/* Prevent losing unsaved changes */
function beforeUnload(e){
  if (!dirty.value) return
  e.preventDefault()
  e.returnValue = ''
}

/* Submit */
async function handleSubmit(){
  touch('ownerName'); touch('businessName'); touch('domain'); validate()
  if (hasErrors.value) { toast.error('⚠️ ' + (t('fix_errors') || 'Please fix errors')); return }
  if (!online.value)  { toast.info('📴 ' + (t('offline') || 'Offline') + ' — ' + (t('draft_saved') || 'draft saved')); autosave(); return }

  loading.value = true
  try {
    form.domain = domainInput.value ? normalizeDomain(domainInput.value) : ''
    // await axios.put('/api/owner/profile', form)  // <— plug your real API
    localStorage.setItem('user_name', form.ownerName)
    localStorage.setItem('business_name', form.businessName)
    localStorage.setItem('user_lang', form.language)
    if (form.domain) localStorage.setItem('business_domain', form.domain)
    if (form.logoDataUrl) localStorage.setItem('business_logo', form.logoDataUrl)

    Object.assign(base, JSON.parse(JSON.stringify(form)))
    clearDraft()
    if (navigator.vibrate) navigator.vibrate(10)
    toast.success('✔️ ' + (t('profile_updated') || 'Profile updated successfully!'))
  } catch {
    toast.error('❌ ' + (t('update_failed') || 'Failed to update profile. Try again!'))
  } finally {
    loading.value = false
  }
}

/* Reset */
function resetForm(){
  Object.assign(form, JSON.parse(JSON.stringify(base)))
  domainInput.value = form.domain || ''
  toast.info('↩️ ' + (t('changes_discarded') || 'Changes discarded'))
}

/* Language change button (optional external triggers) */
function applyLanguage(){ /* already handled by watcher */ }

/* Lifecycle */
onMounted(() => {
  restoreDraft()
  validate()
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  window.addEventListener('beforeunload', beforeUnload)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
  window.removeEventListener('beforeunload', beforeUnload)
})
</script>

<style scoped>
/* Techy glass look */
.owner-form {
  --ring: #ffd600;
  border-radius: 1rem;
  box-shadow: 0 10px 30px rgba(0,0,0,.08);
  backdrop-filter: blur(8px);
  background:
    linear-gradient(180deg, rgba(255,214,0,.08), rgba(255,214,0,0)) border-box,
    linear-gradient(#fff, #fff) padding-box;
}

/* Avatar */
.avatar-wrap { width: 56px; height: 56px; border-radius: 14px; overflow: hidden; position: relative; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-skeleton { width: 100%; height: 100%; background: linear-gradient(90deg,#eee,#f6f6f6,#eee); animation: sk 1.2s infinite; }
@keyframes sk { 0%{background-position:-200px 0} 100%{background-position:calc(200px + 100%) 0} }
.avatar-edit { position: absolute; bottom: 4px; right: 4px; padding: .15rem .35rem; border-radius: .5rem; }
.avatar-remove { position: absolute; top: 4px; right: 4px; padding: .15rem .35rem; border-radius: .5rem; }

/* Chips */
.chip {
  display: inline-flex; align-items: center; gap: .35rem;
  padding: .25rem .6rem; border-radius: 9999px; border: 1px solid;
  font-size: .75rem; white-space: nowrap;
}
.chip-ok   { background: #ecfdf5; color:#065f46; border-color:#a7f3d0; }
.chip-warn { background: #fffbeb; color:#92400e; border-color:#fcd34d; }
.chip-info { background: #f8fafc; color:#0f172a; border-color:#e2e8f0; }
.chip-accent{ background:#fff7cc; color:#7a6000; border-color:#ffe066; }

/* Suggestion chips */
.suggest-chip {
  border: 1px dashed #ffd600; color:#7a6000; background:#fffdf3;
  border-radius: 9999px; padding: .25rem .6rem; font-size:.8rem;
}
.suggest-chip:active { transform: translateY(1px); }

/* Inputs */
.form-label { font-weight: 600; }
.form-control, .form-select, .input-group-text, .btn-outline-secondary {
  border-radius: 0.65rem;
  border: 1.5px solid var(--ring);
  box-shadow: none;
}
.form-control:focus, .form-select:focus {
  border-color: var(--ring);
  box-shadow: 0 0 0 2px #FFD60033;
}

/* Sticky mobile action bar (safe-area aware) */
.sticky-actions {
  position: sticky;
  bottom: 0;
  background: linear-gradient(to top, rgba(255,255,255,.98), rgba(255,255,255,0));
  padding: .75rem .25rem calc(.75rem + env(safe-area-inset-bottom));
  margin-left: -.25rem; margin-right: -.25rem;
  border-top-left-radius: 1rem; border-top-right-radius: 1rem;
  backdrop-filter: blur(6px);
}

/* Small helpers */
.text-danger { color:#dc2626 !important; }
</style>
