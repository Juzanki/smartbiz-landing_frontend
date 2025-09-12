<!-- 📁 src/components/SignupFormPro.vue -->
<template>
  <form @submit.prevent="signup" autocomplete="off" :style="safeArea" class="max-w-md mx-auto px-4 py-6">
    <!-- Progress / Steps -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2 text-sm">
        <span :class="step >= 1 ? 'badge-on' : 'badge-off'">1</span>
        <span :class="step === 1 ? 'font-semibold' : 'opacity-70'">Account</span>
      </div>
      <div class="w-16 h-1 bg-gradient-to-r" :class="step===2?'from-yellow-400 to-yellow-500':'from-gray-300 to-gray-300'"></div>
      <div class="flex items-center gap-2 text-sm">
        <span :class="step >= 2 ? 'badge-on' : 'badge-off'">2</span>
        <span :class="step === 2 ? 'font-semibold' : 'opacity-70'">Business</span>
      </div>
    </div>

    <!-- STEP 1: ACCOUNT -->
    <section v-show="step===1" class="space-y-3">
      <!-- Full name -->
      <div>
        <label for="fullname" class="form-label text-warning fw-semibold">Full Name</label>
        <FormInput
          id="fullname"
          icon="person-fill"
          placeholder="Enter your full name"
          v-model="form.full_name"
          autocomplete="name"
          required
          :aria-invalid="!!errors.full_name"
          @blur="touch('full_name')"
        />
        <p v-if="errors.full_name" class="err" aria-live="polite">{{ errors.full_name }}</p>
      </div>

      <!-- Username -->
      <div>
        <label for="username" class="form-label">Username</label>
        <FormInput
          id="username"
          icon="at"
          placeholder="awesome_you"
          v-model="form.username"
          autocomplete="username"
          inputmode="text"
          :aria-invalid="!!errors.username"
          @blur="checkUsername()"
        />
        <div class="flex items-center gap-2">
          <p v-if="errors.username" class="err" aria-live="polite">{{ errors.username }}</p>
          <p v-else-if="usernameState==='ok'" class="ok">✅ available</p>
          <p v-else-if="usernameState==='checking'" class="muted">Checking…</p>
        </div>
      </div>

      <!-- Email -->
      <div>
        <label for="email" class="form-label">Email</label>
        <FormInput
          id="email"
          icon="envelope"
          type="email"
          placeholder="you@example.com"
          v-model="form.email"
          autocomplete="email"
          inputmode="email"
          :aria-invalid="!!errors.email"
          @blur="checkEmail()"
        />
        <div class="flex items-center gap-2">
          <p v-if="errors.email" class="err" aria-live="polite">{{ errors.email }}</p>
          <p v-else-if="emailState==='ok'" class="ok">✅ looks good</p>
          <p v-else-if="emailState==='checking'" class="muted">Checking…</p>
        </div>
      </div>

      <!-- Phone -->
      <div>
        <label for="phone" class="form-label">Phone</label>
        <FormInput
          id="phone"
          icon="telephone"
          placeholder="+255712345678"
          v-model="form.phone_number"
          autocomplete="tel"
          inputmode="tel"
          :aria-invalid="!!errors.phone_number"
          @blur="touch('phone_number')"
        />
        <p v-if="errors.phone_number" class="err" aria-live="polite">{{ errors.phone_number }}</p>
      </div>

      <!-- Password -->
      <div>
        <label for="password" class="form-label">Password</label>
        <div class="position-relative">
          <FormInput
            :type="showPass ? 'text' : 'password'"
            id="password"
            icon="lock-fill"
            placeholder="Create a strong password"
            v-model="form.password"
            autocomplete="new-password"
            :aria-invalid="!!errors.password"
            @input="scorePassword()"
            @blur="touch('password')"
          />
          <button type="button" class="toggle-eye" @click="showPass = !showPass" :aria-label="showPass?'Hide password':'Show password'">
            {{ showPass ? '🙈' : '👁️' }}
          </button>
        </div>
        <!-- Strength meter -->
        <div class="mt-1">
          <div class="h-2 rounded bg-light overflow-hidden">
            <div class="h-full" :style="{width: strength.pct + '%'}" :class="strength.bar"></div>
          </div>
          <p class="muted mt-1">Strength: <b :class="strength.textClass">{{ strength.label }}</b></p>
        </div>
        <p v-if="errors.password" class="err" aria-live="polite">{{ errors.password }}</p>
      </div>

      <div class="d-flex justify-content-between mt-3">
        <button type="button" class="btn btn-outline-secondary" @click="resetForm" :disabled="loading">Reset</button>
        <button type="button" class="btn btn-warning fw-bold text-dark" @click="goStep(2)" :disabled="!canGoStep2">Continue</button>
      </div>
    </section>

    <!-- STEP 2: BUSINESS -->
    <section v-show="step===2" class="space-y-3">
      <!-- Language -->
      <div>
        <label class="form-label">Preferred Language</label>
        <FormSelect v-model="form.language" :options="langs" />
      </div>

      <!-- Business name -->
      <div>
        <label class="form-label">Business Name</label>
        <FormInput
          placeholder="SmartBiz Ltd."
          v-model="form.business_name"
          autocomplete="organization"
          :aria-invalid="!!errors.business_name"
          @blur="touch('business_name')"
        />
        <p v-if="errors.business_name" class="err">{{ errors.business_name }}</p>
      </div>

      <!-- Business type -->
      <div>
        <label class="form-label">Business Type</label>
        <FormSelect v-model="form.business_type" :options="bizTypes" />
      </div>

      <!-- Terms -->
      <div class="form-check mt-2">
        <input class="form-check-input" type="checkbox" id="terms" v-model="accept" />
        <label class="form-check-label" for="terms">
          I agree to the <a href="/terms" target="_blank" rel="noopener" class="link-warning">Terms</a> &amp; <a href="/privacy" target="_blank" rel="noopener" class="link-warning">Privacy</a>
        </label>
      </div>

      <!-- Submit -->
      <button type="submit" class="btn btn-warning w-100 fw-bold text-dark mt-2" :disabled="loading || !accept">
        <span v-if="!loading">Signup</span>
        <span v-else><i class="bi bi-arrow-repeat spinner-border spinner-border-sm me-1"></i> Signing Up…</span>
      </button>

      <div class="d-flex justify-content-between mt-2">
        <button type="button" class="btn btn-outline-secondary" @click="goStep(1)" :disabled="loading">Back</button>
        <button type="button" class="btn btn-outline-danger" @click="clearDraft" :disabled="loading">Clear Draft</button>
      </div>
    </section>
  </form>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toastification'
import FormInput from '@/components/shared/FormInput.vue'
import FormSelect from '@/components/shared/FormSelect.vue'

const toast = useToast()

/* ---------- API base (VITE_API_URL) + axios instance ---------- */
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
console.log('API base =', API_BASE || '(not set)')
const api = axios.create({
  baseURL: API_BASE || '/api',           // fallback: proxy via Netlify _redirects
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: false
})

/* ---------- Helper: try multiple paths (avoid 404 due to prefix mismatch) ---------- */
async function requestFirstAvailable(paths, cfg){
  let lastErr
  for (const p of paths){
    try {
      const res = await api.request({ url: p, ...cfg })
      return res
    } catch (e){
      const st = e?.response?.status
      // if 404, try next path; otherwise rethrow immediately
      if (st !== 404) throw e
      lastErr = e
    }
  }
  throw lastErr
}

/* ---------- State ---------- */
const step = ref(1)
const loading = ref(false)
const showPass = ref(false)
const accept = ref(false)
const usernameState = ref('idle') // idle|checking|ok|taken|error
const emailState = ref('idle')

const form = reactive({
  full_name: '',
  username: '',
  email: '',
  password: '',
  phone_number: '',
  language: 'en',
  business_name: '',
  business_type: ''
})

/* ---------- Options ---------- */
const langs = [
  { label: 'English', value: 'en' },
  { label: 'Swahili', value: 'sw' },
  { label: 'French', value: 'fr' },
  { label: 'Spanish', value: 'es' }
]
const bizTypes = [
  { label: 'Retail', value: 'retail' },
  { label: 'Services', value: 'service' },
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Education', value: 'education' },
  { label: 'Other', value: 'other' }
]

/* ---------- Validation ---------- */
const touched = reactive({})
const errors = reactive({})

function touch(field){ touched[field] = true; validate() }

function validate(){
  errors.full_name = !form.full_name?.trim() ? 'Full name is required' : ''
  errors.username  = !/^[a-z0-9_\.]{3,20}$/i.test(form.username || '') ? '3–20 chars, letters/numbers/._' : ''
  errors.email     = !/^\S+@\S+\.\S+$/.test(form.email || '') ? 'Enter a valid email' : ''
  errors.phone_number = !/^\+?[0-9]{7,15}$/.test(form.phone_number || '') ? 'Use international format e.g. +2557…' : ''
  errors.password  = passScore(form.password).score < 2 ? 'Use 8+ chars incl. number & letter' : ''
  errors.business_name = step.value===2 && !form.business_name?.trim() ? 'Business name is required' : ''
}
watch(form, validate, { deep: true })

/* ---------- Password strength ---------- */
function passScore(pw=''){
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return { score: s }
}
const strength = computed(() => {
  const s = passScore(form.password).score
  return {
    pct: [10, 35, 65, 85, 100][s] || 10,
    label: ['Very weak','Weak','Okay','Strong','Great'][s] || 'Very weak',
    bar: s>=4 ? 'bg-success' : s>=3 ? 'bg-warning' : 'bg-danger',
    textClass: s>=3 ? 'text-success' : 'text-danger'
  }
})

/* ---------- Step control ---------- */
const canGoStep2 = computed(() =>
  !errors.full_name && !errors.username && !errors.email && !errors.phone_number && !errors.password &&
  form.full_name && form.username && form.email && form.password && form.phone_number &&
  usernameState.value !== 'taken' && emailState.value !== 'error'
)
function goStep(n){ step.value = n; window.scrollTo({ top: 0, behavior: 'smooth' }) }

/* ---------- Availability checks (using API base) ---------- */
let tUser, tMail
function checkUsername(){
  if (errors.username) return
  clearTimeout(tUser)
  usernameState.value = 'checking'
  tUser = setTimeout(async () => {
    try {
      await requestFirstAvailable(
        ['/api/auth/check-username', '/auth/check-username'],
        { method: 'get', params: { username: form.username } }
      )
      usernameState.value = 'ok'
    } catch {
      usernameState.value = 'ok'
    }
  }, 350)
}
function checkEmail(){
  if (errors.email) return
  clearTimeout(tMail)
  emailState.value = 'checking'
  tMail = setTimeout(async () => {
    try {
      await requestFirstAvailable(
        ['/api/auth/check-email', '/auth/check-email'],
        { method: 'get', params: { email: form.email } }
      )
      emailState.value = 'ok'
    } catch {
      emailState.value = 'ok'
    }
  }, 350)
}

/* ---------- Autosave draft ---------- */
const DRAFT_KEY = 'signup_draft_v1'
const hasDraft = !!localStorage.getItem(DRAFT_KEY)
if (hasDraft){
  try { Object.assign(form, JSON.parse(localStorage.getItem(DRAFT_KEY))) } catch {}
}
watch(form, () => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
}, { deep: true })
function clearDraft(){
  localStorage.removeItem(DRAFT_KEY)
  toast.info('🧹 Draft cleared')
}

/* ---------- Submit ---------- */
const emit = defineEmits(['success'])
const safeArea = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }

// NOTE: Adjust field names if your backend expects different casing.
// Payload includes both snake_case and camelCase for tolerance.
async function signup(){
  validate()
  if (step.value === 1 && !canGoStep2.value){ toast.error('Complete account details first'); return }
  if (step.value === 2 && (!accept.value || errors.business_name)){ toast.error('Review business details'); return }

  loading.value = true
  try {
    const payload = {
      email: form.email,
      password: form.password,
      phone: form.phone_number,
      phone_country: 'TZ',
      phoneCountry: 'TZ',
      preferred_language: form.language,
      preferredLanguage: form.language,
      business_name: form.business_name || null,
      businessName: form.business_name || null,
      business_type: form.business_type || null,
      businessType: form.business_type || null,
      termsAccepted: accept.value,
      terms_accepted: accept.value
    }

    await requestFirstAvailable(
      ['/api/auth/signup', '/auth/signup', '/signup'],
      { method: 'post', data: payload }
    )

    localStorage.removeItem(DRAFT_KEY)
    try { navigator.vibrate?.(12) } catch {}
    toast.success('✅ Account created successfully!')
    emit('success', payload)
    window.location.href = '/login'
  } catch (err){
    console.error('signup error →', err?.response?.status, err?.response?.data || err.message)
    toast.error(err?.response?.data?.detail || '❌ Signup failed. Please try again.')
  } finally {
    loading.value = false
  }
}

function resetForm(){
  Object.assign(form, {
    full_name: '', username: '', email: '', password: '', phone_number: '',
    language: 'en', business_name: '', business_type: ''
  })
  accept.value = false
  usernameState.value = 'idle'
  emailState.value = 'idle'
  try { navigator.vibrate?.(6) } catch {}
}
</script>

<style scoped>
/* Mobile-first helpers (Bootstrap-compatible colours) */
.badge-on{ display:inline-flex; align-items:center; justify-content:center; width:1.5rem; height:1.5rem; border-radius:9999px; background:#ffc107; color:#111; font-weight:700 }
.badge-off{ display:inline-flex; align-items:center; justify-content:center; width:1.5rem; height:1.5rem; border-radius:9999px; background:#e5e7eb; color:#444; font-weight:700 }
.err{ color:#dc3545; font-size:.85rem; margin:.25rem 0 0 }
.ok{ color:#198754; font-size:.8rem }
.muted{ color:#6c757d; font-size:.8rem }
.toggle-eye{ position:absolute; right:.5rem; top:50%; transform:translateY(-50%); background:transparent; border:none; font-size:1.1rem }
.bg-danger{ background:#dc3545 }
.bg-warning{ background:#ffc107 }
.bg-success{ background:#198754 }
</style>
