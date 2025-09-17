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
import { reactive, ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authAPI, handleApiError } from '../api/client'

const router = useRouter()

/** ===== API ROOT (for debugging / logs) ===== */
const API_BASE = import.meta.env.VITE_API_BASE || '/api'

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
  { value: '+44 (UK)',  label: 'UK +44 (UK)' },
  { value: '+27 (ZA)',  label: 'ZA +27 (ZA)' }
]

/* ─────────── Validation ─────────── */
function validateForm() {
  // Clear previous errors
  Object.keys(errors).forEach(key => errors[key] = '')
  
  let isValid = true

  if (!form.full_name.trim()) {
    errors.full_name = 'Full name is required'
    isValid = false
  } else if (form.full_name.trim().length < 2) {
    errors.full_name = 'Full name must be at least 2 characters'
    isValid = false
  }

  if (!form.username.trim()) {
    errors.username = 'Username is required'
    isValid = false
  } else if (form.username.length < 3) {
    errors.username = 'Username must be at least 3 characters'
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
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
    isValid = false
  } else if (!isStrongPassword(form.password)) {
    errors.password = 'Password must include uppercase, lowercase, number, and symbol'
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

function isStrongPassword(pwd?: string): boolean {
  if (!pwd) return false
  const hasUpper = /[A-Z]/.test(pwd)
  const hasLower = /[a-z]/.test(pwd)
  const hasNumber = /\d/.test(pwd)
  const hasSpecial = /[^\w\s]/.test(pwd)
  return hasUpper && hasLower && hasNumber && hasSpecial && pwd.length >= 8
}

const canSubmit = computed(() =>
  !!form.full_name?.trim() &&
  !!form.username?.trim() &&
  !!form.email?.trim() &&
  !!form.password &&
  !!form.phone_local?.trim() &&
  !!form.language &&
  agreed.value &&
  isStrongPassword(form.password)
)

const strength = computed(() => {
  const p = form.password || ''
  let score = 0
  
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p)) score++
  if (/[a-z]/.test(p)) score++
  if (/\d/.test(p)) score++
  if (/[^\w\s]/.test(p)) score++
  
  const levels = [
    { label: 'Too weak', percent: 20, barClass: 'bg-danger' },
    { label: 'Weak', percent: 40, barClass: 'bg-danger' },
    { label: 'Fair', percent: 60, barClass: 'bg-warning' },
    { label: 'Good', percent: 80, barClass: 'bg-info' },
    { label: 'Strong', percent: 100, barClass: 'bg-success' }
  ]
  
  return levels[Math.min(score, levels.length - 1)]
})

/* ─────────── Helpers ─────────── */
function normalizeLocalNumber(raw?: string): string {
  let digits = String(raw || '').replace(/[^\d]/g, '')
  if (digits.startsWith('0')) digits = digits.substring(1)
  return digits
}

function toE164(countryLabel: string, localRaw: string): string {
  const ccMatch = countryLabel.match(/\+(\d+)/)
  const cc = ccMatch ? ccMatch[0] : ''
  const local = normalizeLocalNumber(localRaw)
  return cc && local ? `${cc}${local}` : local
}

function extractError(e: any): string {
  return handleApiError(e)
}

/* UX: clear alerts while typing; remember last picks */
watch(() => ({...form, agreed: agreed.value}), () => { 
  error.value = ''
  success.value = ''
  // Clear errors when user starts typing
  Object.keys(errors).forEach(key => errors[key] = '')
}, { deep: true })

watch(() => form.email, v => {
  if (v) localStorage.setItem('sb_last_email', v)
})

watch(() => form.country_code, v => {
  if (v) localStorage.setItem('sb_country', v)
})

// Load saved data on component mount
onMounted(() => {
  const lastEmail = localStorage.getItem('sb_last_email')
  const lastCc = localStorage.getItem('sb_country')
  
  if (lastEmail) form.email = lastEmail
  if (lastCc) form.country_code = lastCc
})

/* ─────────── Submit ─────────── */
async function onSignup() {
  if (!validateForm() || loading.value) return
  
  if (!navigator.onLine) {
    error.value = 'You appear to be offline. Please check your connection.'
    return
  }

  // Cancel any in-flight request
  if (abortCtrl) {
    abortCtrl.abort()
  }
  abortCtrl = new AbortController()

  error.value = ''
  success.value = ''
  loading.value = true

  const phone_number = toE164(form.country_code, form.phone_local)

  const payload = {
    full_name     : form.full_name.trim(),
    username      : form.username.trim().toLowerCase(),
    email         : form.email.trim().toLowerCase(),
    password      : form.password,
    phone_number,
    language      : form.language,
    business_name : form.business_name.trim() || undefined,
    business_type : form.business_type || undefined
  }

  try {
    const response = await authAPI.signUp(payload)
    
    if (response.data) {
      success.value = 'Account created successfully. Redirecting to login…'
      
      // Save user data for auto-login
      localStorage.setItem('sb_signup_email', form.email)
      localStorage.setItem('sb_signup_success', 'true')
      
      // Redirect after delay
      setTimeout(() => {
        router.push({ 
          path: '/login',
          query: { registered: 'true', email: form.email }
        })
      }, 1500)
    }
  } catch (e: any) {
    error.value = extractError(e)
    
    // Handle specific field errors from backend
    if (e.response?.data?.errors) {
      const backendErrors = e.response.data.errors
      Object.keys(backendErrors).forEach(key => {
        if (errors.hasOwnProperty(key)) {
          errors[key] = Array.isArray(backendErrors[key]) 
            ? backendErrors[key][0] 
            : backendErrors[key]
        }
      })
    }
  } finally {
    loading.value = false
    abortCtrl = null
  }
}
</script>

<style>
html, body { 
  background: #0b1220 !important;
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>

<style scoped>
.page {
  min-height: 100vh;
  background: #0b1220 !important;
  padding: 2rem 1rem;
}

.wrap {
  animation: fadeInUp 0.6s ease-out;
}

.bg-dark { 
  background: #0b1220 !important; 
}

.card { 
  background: #0f1e34 !important;
  box-shadow: 0 8px 28px rgba(0,0,0,0.4), 0 0 0 2px rgba(255, 215, 0, 0.2) !important;
  border: 2px solid #ffd700 !important;
  border-radius: 1rem !important;
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.5), 0 0 0 2px rgba(255, 215, 0, 0.4) !important;
}

:deep(.input-dark),
:deep(.form-control.input-dark),
:deep(.form-select.input-dark) {
  background: #132441 !important;
  color: #ffffff !important;
  border: none !important;
  border-radius: 0.5rem !important;
  padding: 0.65rem 0.85rem !important;
  font-size: 0.95rem !important;
  transition: box-shadow 0.25s ease !important;
}

:deep(.input-dark:focus),
:deep(.form-control.input-dark:focus),
:deep(.form-select.input-dark:focus) {
  outline: none !important;
  box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.6) !important;
  background: #132441 !important;
  color: #ffffff !important;
}

:deep(.input-dark::placeholder) {
  color: #b9c3d3 !important;
  opacity: 0.9 !important;
}

:deep(.form-select.input-dark) {
  color: #d4dbe6 !important;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23ffd700' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e") !important;
}

:deep(.input-dark.is-invalid) {
  box-shadow: 0 0 0 2px #dc3545 !important;
}

.invalid-feedback {
  color: #ff6b6b !important;
  font-size: 0.8rem !important;
  margin-top: 0.25rem !important;
}

.btn-warning {
  background: linear-gradient(135deg, #ffd700, #ffed4e) !important;
  color: #0b1220 !important;
  font-weight: 700 !important;
  font-size: 1rem !important;
  border: none !important;
  border-radius: 0.6rem !important;
  padding: 0.75rem 1.5rem !important;
  transition: all 0.2s ease !important;
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3) !important;
}

.btn-warning:hover {
  background: linear-gradient(135deg, #ffed4e, #fff176) !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 6px 16px rgba(255, 215, 0, 0.4) !important;
}

.btn-warning:disabled {
  opacity: 0.6 !important;
  cursor: not-allowed !important;
  transform: none !important;
}

.text-warning {
  color: #ffd700 !important;
}

.form-label,
.form-check-label {
  font-size: 0.85rem !important;
  color: #c7d0df !impo
