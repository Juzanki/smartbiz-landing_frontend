<!-- src/views/Signup.vue -->
<template>
  <div class="page bg-dark d-flex align-items-center justify-content-center px-3">
    <div class="wrap" style="width:100%;max-width:520px">
      <!-- Logo + title -->
      <div class="text-center mb-3 mt-2 animate-fade-in">
        <img
          src="/icons/logo.png"
          alt="SmartBiz Logo"
          width="56"
          height="56"
          class="rounded-circle border border-warning shadow-sm"
          style="background:#fff"
          loading="eager"
          decoding="async"
        />
        <h1 class="fw-bold text-warning mt-2 h5 m-0">Create Your Account</h1>
        <p class="text-secondary small m-0 mt-1">Join SmartBiz and simplify your business journey.</p>
      </div>

      <!-- Card -->
      <div class="card shadow-lg border border-warning rounded-4 p-3 p-sm-4">
        <form @submit.prevent="onSignup" autocomplete="off" novalidate>
          <!-- FULL NAME -->
          <div class="mb-3">
            <label for="fullname" class="form-label text-warning small">Full Name</label>
            <input
              id="fullname"
              v-model.trim="form.full_name"
              class="form-control input-dark"
              :class="{ 'is-invalid': errors.full_name }"
              type="text"
              name="name"
              placeholder="e.g. Julius Nkindwa"
              maxlength="60"
              autocomplete="name"
              inputmode="text"
              enterkeyhint="next"
              required
            />
            <div v-if="errors.full_name" class="invalid-feedback d-block">{{ errors.full_name }}</div>
          </div>

          <!-- USERNAME -->
          <div class="mb-3">
            <label for="username" class="form-label text-warning small">Username</label>
            <input
              id="username"
              v-model.trim="form.username"
              class="form-control input-dark"
              :class="{ 'is-invalid': errors.username }"
              type="text"
              name="username"
              placeholder="Unique username"
              maxlength="30"
              autocomplete="username"
              autocapitalize="off"
              autocorrect="off"
              enterkeyhint="next"
              required
            />
            <small class="text-secondary d-block mt-1">Lowercase & numbers recommended.</small>
            <div v-if="errors.username" class="invalid-feedback d-block">{{ errors.username }}</div>
          </div>

          <!-- EMAIL -->
          <div class="mb-3">
            <label for="email" class="form-label text-warning small">Email Address</label>
            <input
              id="email"
              v-model.trim="form.email"
              class="form-control input-dark"
              :class="{ 'is-invalid': errors.email }"
              type="email"
              name="email"
              placeholder="your@email.com"
              maxlength="100"
              autocomplete="email"
              inputmode="email"
              autocapitalize="off"
              autocorrect="off"
              enterkeyhint="next"
              required
            />
            <div v-if="errors.email" class="invalid-feedback d-block">{{ errors.email }}</div>
          </div>

          <!-- PASSWORD -->
          <div class="mb-2">
            <label for="password" class="form-label text-warning small">Password</label>
            <div class="input-group">
              <input
                :type="showPwd ? 'text' : 'password'"
                id="password"
                v-model="form.password"
                class="form-control input-dark"
                :class="{ 'is-invalid': errors.password }"
                name="new-password"
                placeholder="Strong password"
                minlength="8"
                autocomplete="new-password"
                :aria-invalid="form.password && !isStrongPassword(form.password)"
                enterkeyhint="next"
                required
              />
              <button
                type="button"
                class="btn btn-outline-warning"
                @click="showPwd = !showPwd"
                :aria-pressed="showPwd"
                aria-label="Toggle password visibility"
              >
                <i :class="showPwd ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>

            <!-- Strength meter -->
            <div class="mt-2">
              <div class="progress strength" aria-hidden="true">
                <div
                  class="progress-bar"
                  role="progressbar"
                  :style="{ width: strength.percent + '%' }"
                  :class="strength.barClass"
                  :aria-valuenow="strength.percent"
                  aria-valuemin="0"
                  aria-valuemax="100"
                />
              </div>
              <small
                v-if="form.password"
                class="d-block mt-1"
                :class="isStrongPassword(form.password) ? 'text-success' : 'text-danger'"
              >
                {{ strength.label }}
              </small>
              <small v-if="form.password && !isStrongPassword(form.password)" class="text-danger d-block">
                Must include upper/lowercase, a number & a symbol (8+ chars).
              </small>
            </div>
            <div v-if="errors.password" class="invalid-feedback d-block">{{ errors.password }}</div>
          </div>

          <!-- PHONE -->
          <div class="mb-3">
            <label class="form-label text-warning small">Phone Number</label>
            <div class="d-flex gap-2">
              <select v-model="form.country_code" class="form-select input-dark w-auto" required>
                <option v-for="code in countryCodes" :key="code.value" :value="code.value">
                  {{ code.label }}
                </option>
              </select>
              <input
                v-model.trim="form.phone_local"
                class="form-control input-dark"
                :class="{ 'is-invalid': errors.phone_number }"
                type="tel"
                placeholder="712345678"
                pattern="^[1-9][0-9]{7,13}$"
                maxlength="13"
                autocomplete="tel"
                inputmode="numeric"
                enterkeyhint="next"
                required
              />
            </div>
            <small class="text-secondary">Start without 0 (e.g. <span class="text-warning">712345678</span>)</small>
            <div v-if="errors.phone_number" class="invalid-feedback d-block">{{ errors.phone_number }}</div>
          </div>

          <!-- LANGUAGE -->
          <div class="mb-3">
            <label class="form-label text-warning small">Preferred Language</label>
            <select class="form-select input-dark" v-model="form.language" required>
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
            </select>
          </div>

          <!-- OPTIONALS -->
          <div class="mb-3">
            <label class="form-label text-warning small">
              Business Name <span class="text-secondary">(Optional)</span>
            </label>
            <input class="form-control input-dark" v-model.trim="form.business_name" maxlength="60" />
          </div>

          <div class="mb-3">
            <label class="form-label text-warning small">
              Business Type <span class="text-secondary">(Optional)</span>
            </label>
            <select class="form-select input-dark" v-model="form.business_type">
              <option value="">Select Type</option>
              <option value="Retail">Retail</option>
              <option value="Service">Service</option>
              <option value="Wholesale">Wholesale</option>
              <option value="Education">Education</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <!-- TERMS -->
          <div class="form-check d-flex align-items-center gap-2 mb-3">
            <input
              id="terms"
              v-model="agreed"
              class="form-check-input border-warning"
              :class="{ 'is-invalid': errors.agreed }"
              type="checkbox"
              style="accent-color:#ffd700;width:1.15em;height:1.15em"
              required
            />
            <label for="terms" class="form-check-label text-light small">
              I agree to the
              <a href="#" class="text-warning text-decoration-underline">terms and conditions</a>
            </label>
            <div v-if="errors.agreed" class="invalid-feedback d-block">{{ errors.agreed }}</div>
          </div>

          <!-- Alerts -->
          <div class="mb-2" aria-live="polite">
            <div v-if="error" class="alert alert-danger py-2 px-3 mb-2">
              <i class="bi bi-exclamation-triangle me-2"></i>{{ error }}
            </div>
            <div v-if="success" class="alert alert-success py-2 px-3 mb-2">
              <i class="bi bi-check-circle me-2"></i>{{ success }}
            </div>
          </div>

          <!-- SUBMIT -->
          <button class="btn btn-warning w-100 fw-bold py-2 rounded-3" :disabled="loading || !canSubmit">
            <span v-if="loading"><span class="spinner-border spinner-border-sm me-2" />Signing Up…</span>
            <span v-else>Sign Up</span>
          </button>
        </form>

        <div class="text-center mt-3 small text-secondary">
          Already have an account?
          <router-link to="/login" class="text-warning fw-bold text-decoration-underline ms-1">Login</router-link>
        </div>
      </div>

      <div class="mt-4"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { authAPI } from '../api/client.js'

const router = useRouter()

/** ===== API ROOT (for debugging / logs) ===== */
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

/* ─────────── State ─────────── */
const form = reactive({
  full_name    : '',
  username     : '',
  email        : '',
  password     : '',
  country_code : '+255 (TZ)',
  phone_local  : '',
  language     : 'en',
  business_name: '',
  business_type: ''
})

const errors = reactive({
  full_name: '',
  username: '',
  email: '',
  password: '',
  phone_number: '',
  agreed: ''
})

const showPwd = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref('')
const agreed = ref(false)
let abortCtrl: AbortController | null = null

const countryCodes = [
  { value: '+255 (TZ)', label: 'TZ +255 (TZ)' },
  { value: '+254 (KE)', label: 'KE +254 (KE)' },
  { value: '+256 (UG)', label: 'UG +256 (UG)' },
  { value: '+250 (RW)', label: 'RW +250 (RW)' },
  { value: '+1 (US)',   label: 'US +1 (US)'  },
]

/* ─────────── Validation ─────────── */
function validateForm() {
  // Clear previous errors
  Object.keys(errors).forEach(key => errors[key] = '')
  
  let isValid = true

  if (!form.full_name.trim()) {
    errors.full_name = 'Full name is required'
    isValid = false
  }

  if (!form.username.trim()) {
    errors.username = 'Username is required'
    isValid = false
  } else if (!/^[a-z0-9_]+$/.test(form.username)) {
    errors.username = 'Username can only contain lowercase letters, numbers, and underscores'
    isValid = false
  }

  if (!form.email.trim()) {
    errors.email = 'Email is required'
    isValid = false
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = 'Please enter a valid email address'
    isValid = false
  }

  if (!form.password) {
    errors.password = 'Password is required'
    isValid = false
  } else if (!isStrongPassword(form.password)) {
    errors.password = 'Password must be at least 8 characters with uppercase, lowercase, number, and symbol'
    isValid = false
  }

  if (!form.phone_local.trim()) {
    errors.phone_number = 'Phone number is required'
    isValid = false
  } else if (!/^[1-9][0-9]{7,13}$/.test(form.phone_local)) {
    errors.phone_number = 'Please enter a valid phone number (without 0)'
    isValid = false
  }

  if (!agreed.value) {
    errors.agreed = 'You must agree to the terms and conditions'
    isValid = false
  }

  return isValid
}

function isStrongPassword(pwd?: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/.test(pwd || '')
}

const canSubmit = computed(() =>
  !!form.full_name &&
  !!form.username &&
  !!form.email &&
  !!form.password &&
  !!form.phone_local &&
  !!form.language &&
  agreed.value &&
  isStrongPassword(form.password)
)

const strength = computed(() => {
  const p = form.password || ''
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p)) s++
  if (/[a-z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^\w\s]/.test(p)) s++
  const map = [
    { label: 'Too weak', percent: 10,  barClass: 'bg-danger'  },
    { label: 'Weak',     percent: 30,  barClass: 'bg-danger'  },
    { label: 'Fair',     percent: 55,  barClass: 'bg-warning' },
    { label: 'Good',     percent: 75,  barClass: 'bg-info'    },
    { label: 'Strong',   percent: 100, barClass: 'bg-success' },
  ]
  return map[Math.max(0, Math.min(s - 1, 4))]
})

/* ─────────── Helpers ─────────── */
function normalizeLocalNumber(raw?: string) {
  let digits = String(raw || '').replace(/[^\d]/g, '')
  if (digits.startsWith('0')) digits = digits.replace(/^0+/, '')
  return digits
}

function toE164(countryLabel: string, localRaw: string) {
  const cc = (String(countryLabel || '').match(/\+\d+/) || [''])[0]
  const local = normalizeLocalNumber(localRaw)
  return cc && local ? `${cc}${local}` : local
}

function extractError(e: any): string {
  const r = e?.response
  const data = r?.data
  if (data?.detail) return Array.isArray(data.detail)
    ? data.detail.map((d: any) => d.msg || d.detail || d).join(' • ')
    : String(data.detail)
  if (data?.message) return String(data.message)
  if (r?.status === 409) return 'Email or username already exists.'
  if (r?.status === 422) return 'Invalid input. Please check your fields.'
  if (e?.code === 'ECONNABORTED') return 'Request timed out. Try again.'
  return e?.message || 'Something went wrong. Please try again.'
}

/* UX: clear alerts while typing; remember last picks */
watch(() => ({...form, agreed: agreed.value}), () => { 
  error.value = ''; 
  success.value = '';
  // Clear errors when user starts typing
  Object.keys(errors).forEach(key => errors[key] = '');
}, { deep:true })

watch(() => form.email, v => localStorage.setItem('sb_last_email', v || ''))
watch(() => form.country_code, v => localStorage.setItem('sb_country', v || ''))

// Load saved data on component mount
;(() => {
  const lastEmail = localStorage.getItem('sb_last_email')
  const lastCc = localStorage.getItem('sb_country')
  if (lastEmail) form.email = lastEmail
  if (lastCc) form.country_code = lastCc
})()

/* ─────────── Submit ─────────── */
async function onSignup() {
  if (!validateForm() || loading.value) return
  
  if (!navigator.onLine) {
    error.value = 'You appear to be offline. Please check your connection.'
    return
  }

  // cancel any in-flight request
  if (abortCtrl) abortCtrl.abort()
  abortCtrl = new AbortController()

  error.value = ''
  success.value = ''
  loading.value = true

  const phone_number = toE164(form.country_code, form.phone_local)

  const payload = {
    full_name     : form.full_name,
    username      : form.username.trim(),
    email         : form.email.trim(),
    password      : form.password,
    phone_number,
    language      : form.language || 'en',
    business_name : form.business_name || '',
    business_type : form.business_type || ''
  }

  try {
    const response = await authAPI.signUp(payload)
    success.value = 'Account created successfully. Redirecting…'
    
    // Save user data for auto-login
    localStorage.setItem('sb_signup_email', form.email)
    
    setTimeout(() => router.push('/login'), 1500)
  } catch (e: any) {
    error.value = extractError(e)
    
    // Handle specific field errors from backend
    if (e.response?.data?.errors) {
      const backendErrors = e.response.data.errors
      Object.keys(backendErrors).forEach(key => {
        if (errors.hasOwnProperty(key)) {
          errors[key] = backendErrors[key][0]
        }
      })
    }
  } finally {
    loading.value = false
  }
}
</script>

<!-- Global page bg for this route -->
<style>
html, body { background: #0b1220; }
</style>

<style scoped>
.bg-dark { background: #0b1220 !important; }
.card    { background: #0f1e34 !important; }

.card {
  box-shadow: 0 8px 28px rgba(0,0,0,.4), 0 0 0 2px #ffd70033;
  border: 2px solid #ffd700 !important;
  transition: box-shadow .3s ease, transform .2s ease;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 32px rgba(0,0,0,.5), 0 0 0 2px #ffd70066;
}

input.form-control,
select.form-select,
.form-check-input {
  background: #132441 !important;
  color: #fff !important;
  border: none !important;
  border-radius: .5rem;
  padding: .65rem .85rem;
  font-size: .95rem;
  transition: box-shadow .25s ease;
}
input.form-control::placeholder { color: #b9c3d3 !important; opacity: .9; }
select.form-select { color: #d4dbe6 !important; }

input:focus, select:focus {
  outline: none !important;
  box-shadow: 0 0 0 2px #ffd70099 !important;
}

.input-dark.is-invalid {
  box-shadow: 0 0 0 2px #dc3545 !important;
}

.invalid-feedback {
  color: #ff6b6b;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.btn-warning {
  background-color: #ffd700 !important;
  color: #0b1220 !important;
  font-weight: 700;
  font-size: 1rem;
  border: none !important;
  border-radius: .6rem;
  transition: all .2s ease;
}
.btn-warning:hover { background-color: #ffdd33 !important; box-shadow: 0 0 10px rgba(255,214,0,.4); }
.btn-warning:active,
.btn-warning:focus { background: #ffec80 !important; outline: none !important; }
.btn-warning:disabled { opacity: 0.7; cursor: not-allowed; }

.text-warning { color: #ffd700 !important; }
.form-label, .form-check-label { font-size: .85rem; color: #c7d0df; }

.form-check-input {
  accent-color: #ffd700 !important;
  width: 1.15em; height: 1.15em; margin-top: .25em;
  border: 2px solid #ffd700 !important; border-radius: .3em;
  cursor: pointer; appearance: auto !important; -webkit-appearance: auto !important;
}
.form-check-input.is-invalid {
  border-color: #dc3545 !important;
}
.form-check-label { cursor: pointer; }

/* Strength bar */
.progress.strength { height: 6px; background: #132441; }
.progress-bar.bg-danger  { background:#ff6b6b !important; }
.progress-bar.bg-warning { background:#ffd166 !important; }
.progress-bar.bg-info    { background:#4dabf7 !important; }
.progress-bar.bg-success { background:#51cf66 !important; }

.alert {
  border: none;
  border-radius: 0.5rem;
  font-size: 0.9rem;
}

@media (max-width: 480px) {
  .btn-warning { font-size: .95rem; padding: .6rem 1.1rem; }
  input.form-control, select.form-select { font-size: .9rem; padding: .6rem .85rem; }
}

.animate-fade-in {
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
