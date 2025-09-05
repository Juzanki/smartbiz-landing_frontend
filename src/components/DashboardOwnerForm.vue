<template>
  <form
    class="bg-white p-4 sm:p-6 rounded-2xl shadow-md max-w-md w-[min(94vw,40rem)] mx-auto border border-yellow-300 relative"
    @submit.prevent="handleSubmit"
    autocomplete="off"
  >
    <!-- Title + status chips -->
    <header class="mb-3">
      <h3 class="text-lg sm:text-xl font-bold text-blue-900">
        {{ $t('update_owner_profile') }}
      </h3>
      <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span :class="['chip', online ? 'chip-ok' : 'chip-warn']">
          <i :class="online ? 'bi bi-wifi' : 'bi bi-wifi-off'"></i>
          {{ online ? $t('online') : $t('offline') }}
        </span>
        <span v-if="dirty" class="chip chip-info">
          <i class="bi bi-pencil-square"></i> {{ $t('unsaved_changes') || 'Unsaved changes' }}
        </span>
        <span v-if="restored" class="chip chip-accent">
          <i class="bi bi-clock-history"></i> {{ $t('draft_restored') || 'Draft restored' }}
        </span>
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
        @blur="touch('businessName')"
        required
      />
      <small v-if="touched.businessName && errors.businessName" class="text-danger">{{ errors.businessName }}</small>
    </div>

    <!-- Business Domain (Optional) -->
    <div class="mb-3">
      <label for="domain" class="form-label text-blue-900">{{ $t('custom_domain') }}</label>
      <div class="input-group">
        <span class="input-group-text">https://</span>
        <input
          id="domain"
          v-model.trim="domainInput"
          type="text"
          class="form-control"
          :placeholder="$t('your_custom_domain')"
          @blur="onDomainBlur"
          :aria-invalid="!!errors.domain"
        />
        <button type="button" class="btn btn-outline-secondary" @click="clearDomain" v-if="domainInput">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      <small class="text-muted">{{ $t('optional') }}</small><br />
      <small v-if="touched.domain && errors.domain" class="text-danger">{{ errors.domain }}</small>
    </div>

    <!-- Language Select -->
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
        <button
          type="button"
          class="btn btn-outline-secondary w-25"
          :disabled="loading || !dirty"
          @click="resetForm"
        >
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

const toast = useToast()
const { locale, t } = useI18n({ useScope: 'global' })

/* Online state */
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
function onOnline(){ online.value = true }
function onOffline(){ online.value = false }

/* Local state */
const loading = ref(false)
const restored = ref(false)
const touched = reactive({ ownerName: false, businessName: false, domain: false, language: false })
function touch(k){ touched[k] = true }

/* Draft + initial */
const AUTOSAVE_KEY = 'owner_profile_draft'

const form = reactive({
  ownerName: localStorage.getItem('user_name') || '',
  businessName: localStorage.getItem('business_name') || '',
  domain: '',   // stored normalized, without protocol
  language: localStorage.getItem('user_lang') || 'sw',
})
const domainInput = ref('') // UI field (raw)

/* Validation */
const errors = reactive({ ownerName: '', businessName: '', domain: '' })
const hasErrors = computed(() => Object.values(errors).some(Boolean))
const base = reactive({ ...form }) // snapshot for dirty check
const dirty = computed(() => JSON.stringify(form) !== JSON.stringify(base))

function isDomainValid(host){
  // ascii labels 1-63 chars, no leading/trailing hyphen, at least one dot, TLD 2+
  const parts = host.split('.')
  if (parts.length < 2) return false
  return parts.every((lbl, i) => {
    if (!lbl || lbl.length > 63) return false
    if (lbl.startsWith('-') || lbl.endsWith('-')) return false
    if (i === parts.length - 1) return /^[A-Za-z]{2,}$/.test(lbl) // TLD
    return /^[A-Za-z0-9-]+$/.test(lbl)
  })
}
function validate(){
  errors.ownerName = !form.ownerName
    ? t('field_required') || 'Required'
    : form.ownerName.length < 2
      ? (t('too_short') || 'Too short')
      : form.ownerName.length > 80
        ? (t('too_long_max', { n: 80 }) || 'Too long (max 80)')
        : ''

  errors.businessName = !form.businessName
    ? (t('field_required') || 'Required')
    : form.businessName.length > 80
      ? (t('too_long_max', { n: 80 }) || 'Too long (max 80)')
      : ''

  if (!domainInput.value) {
    errors.domain = ''
  } else {
    const normalized = normalizeDomain(domainInput.value)
    errors.domain = isDomainValid(normalized) ? '' : (t('invalid_domain') || 'Enter a valid domain (e.g. smartbiz.co.tz)')
  }
}

/* Normalize domain: remove protocol, path, spaces, lowercase */
function normalizeDomain(raw=''){
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//,'')
    .replace(/^www\./,'')
    .replace(/\/.*$/,'')
    .replace(/\s+/g,'')
}

/* Sync domain field on blur */
function onDomainBlur(){
  touched.domain = true
  if (!domainInput.value) { form.domain = ''; validate(); return }
  const norm = normalizeDomain(domainInput.value)
  domainInput.value = norm
  form.domain = norm
  validate()
}
function clearDomain(){
  domainInput.value = ''
  form.domain = ''
  validate()
}

/* Watchers */
watch(form, () => { validate(); autosave() }, { deep: true })
watch(domainInput, validate)
watch(() => form.language, (lng) => {
  locale.value = lng
  try { localStorage.setItem('user_lang', lng) } catch {}
})

/* Autosave / restore */
let saveTimer = null
function autosave(){
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ ...form, domainInput: domainInput.value })) } catch {}
  }, 350)
}
function restoreDraft(){
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY)
    if (!raw) return
    const draft = JSON.parse(raw)
    if (draft) {
      Object.assign(form, draft)
      domainInput.value = draft.domainInput || draft.domain || ''
      restored.value = true
      setTimeout(() => restored.value = false, 2500)
    }
  } catch {}
}
function clearDraft(){ try { localStorage.removeItem(AUTOSAVE_KEY) } catch {} }

/* Submit */
const handleSubmit = async () => {
  touch('ownerName'); touch('businessName'); touch('domain'); validate()
  if (hasErrors.value) { toast.error('⚠️ ' + (t('fix_errors') || 'Please fix errors')); return }
  if (!online.value)  { toast.info('📴 ' + (t('offline') || 'Offline') + ' — ' + (t('draft_saved') || 'draft saved')); autosave(); return }

  loading.value = true
  try {
    // Normalize + persist locally (replace with real API if needed)
    form.domain = domainInput.value ? normalizeDomain(domainInput.value) : ''
    // await axios.put('/api/owner/profile', form)  // <— real API
    localStorage.setItem('user_name', form.ownerName)
    localStorage.setItem('business_name', form.businessName)
    localStorage.setItem('user_lang', form.language)
    if (form.domain) localStorage.setItem('business_domain', form.domain)

    Object.assign(base, JSON.parse(JSON.stringify(form)))
    clearDraft()
    toast.success('✔️ ' + (t('profile_updated') || 'Profile updated successfully!'))
  } catch (err) {
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

/* Lifecycle */
onMounted(() => {
  restoreDraft()
  domainInput.value = form.domain || ''
  validate()
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})
</script>

<style scoped>
/* Bootstrap-friendly polish */
.form-label { font-weight: 600; }
.form-control, .form-select {
  border-radius: 0.65rem;
  border: 1.5px solid #FFD600;
  box-shadow: none;
}
.form-control:focus, .form-select:focus {
  border-color: #FFD600;
  box-shadow: 0 0 0 2px #FFD60033;
}
.input-group-text { border: 1.5px solid #FFD600; }

/* Chips */
.chip {
  display: inline-flex; align-items: center; gap: .4rem;
  padding: .25rem .6rem; border-radius: 9999px; border: 1px solid;
}
.chip-ok   { background: #ecfdf5; color:#065f46; border-color:#a7f3d0; }
.chip-warn { background: #fffbeb; color:#92400e; border-color:#fcd34d; }
.chip-info { background: #f8fafc; color:#0f172a; border-color:#e2e8f0; }
.chip-accent{ background:#fff7cc; color:#7a6000; border-color:#ffe066; }

/* Sticky mobile action bar */
.sticky-actions{
  position: sticky;
  bottom: 0;
  background: linear-gradient(to top, rgba(255,255,255,.98), rgba(255,255,255,0));
  padding: .75rem .25rem calc(.75rem + env(safe-area-inset-bottom));
  margin-left: -0.25rem; margin-right: -0.25rem;
  backdrop-filter: blur(6px);
  border-top-left-radius: 1rem; border-top-right-radius: 1rem;
}

/* Small helpers */
.text-danger{ color:#dc2626 !important; }
</style>
