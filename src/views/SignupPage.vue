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
              type="text"
              name="name"
              placeholder="e.g. Julius Nkindwa"
              maxlength="60"
              autocomplete="name"
              inputmode="text"
              enterkeyhint="next"
              required
            />
          </div>

          <!-- USERNAME -->
          <div class="mb-3">
            <label for="username" class="form-label text-warning small">Username</label>
            <input
              id="username"
              v-model.trim="form.username"
              class="form-control input-dark"
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
          </div>

          <!-- EMAIL -->
          <div class="mb-3">
            <label for="email" class="form-label text-warning small">Email Address</label>
            <input
              id="email"
              v-model.trim="form.email"
              class="form-control input-dark"
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
              type="checkbox"
              style="accent-color:#ffd700;width:1.15em;height:1.15em"
              required
            />
            <label for="terms" class="form-check-label text-light small">
              I agree to the
              <a href="#" class="text-warning text-decoration-underline">terms and conditions</a>
            </label>
          </div>

          <!-- Alerts -->
          <div class="mb-2" aria-live="polite">
            <div v-if="error" class="alert alert-danger py-2 px-3 mb-2">{{ error }}</div>
            <div v-if="success" class="alert alert-success py-2 px-3 mb-2">{{ success }}</div>
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

<script setup>
import axios from 'axios'
import { reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

/* ─────────── API base & axios ───────────
   .env: VITE_API_BASE_URL = https://smartbiz-backend-lp9u.onrender.com   (BILA /api)
   Kisha tunaita /api/auth/signup.
----------------------------------------- */
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const api = axios.create({
  baseURL: API_ROOT,
  withCredentials: true,
  timeout: 15000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
})

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
const showPwd = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref('')
const agreed = ref(false)

const countryCodes = [
  { value: '+255 (TZ)', label: 'tz +255 (TZ)' },
  { value: '+254 (KE)', label: 'ke +254 (KE)' },
  { value: '+256 (UG)', label: 'ug +256 (UG)' },
  { value: '+250 (RW)', label: 'rw +250 (RW)' },
  { value: '+1 (US)',   label: 'us +1 (US)' },
]

/* ─────────── Validation ─────────── */
function isStrongPassword(pwd) {
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
function normalizeLocalNumber(raw) {
  let digits = String(raw || '').replace(/[^\d]/g, '')
  if (digits.startsWith('0')) digits = digits.replace(/^0+/, '')
  return digits
}
function toE164(countryLabel, localRaw) {
  const cc = (String(countryLabel || '').match(/\+\d+/) || [''])[0]
  const local = normalizeLocalNumber(localRaw)
  return cc && local ? `${cc}${local}` : local
}
function extractError(e) {
  const r = e?.response
  const data = r?.data
  if (data?.detail) return Array.isArray(data.detail)
    ? data.detail.map(d => d.msg || d.detail || d).join(' • ')
    : String(data.detail)
  if (data?.message) return String(data.message)
  if (r?.status === 409) return 'Email or username already exists.'
  if (r?.status === 422) return 'Invalid input. Please check your fields.'
  if (e?.code === 'ECONNABORTED') return 'Request timed out. Try again.'
  return e?.message || 'Something went wrong. Please try again.'
}

/* UX: clear alerts while typing; remember last picks */
watch(() => ({...form, agreed: agreed.value}), () => { error.value = ''; success.value = '' }, { deep:true })
watch(() => form.email, v => localStorage.setItem('sb_last_email', v || ''))
watch(() => form.country_code, v => localStorage.setItem('sb_country', v || ''))
;(() => {
  const lastEmail = localStorage.getItem('sb_last_email')
  const lastCc = localStorage.getItem('sb_country')
  if (lastEmail) form.email = lastEmail
  if (lastCc) form.country_code = lastCc
})()

/* ─────────── Submit (aligns EXACTLY with PowerShell schema) ─────────── */
async function onSignup() {
  if (!canSubmit.value || loading.value) return

  error.value = ''
  success.value = ''
  loading.value = true

  // Jenga phone_number sawa na mfano wa PowerShell: "+255757888541"
  const phone_number = toE164(form.country_code, form.phone_local)

  // Tuma majina yale yale: full_name, username, email, password, phone_number, language, business_name, business_type
  const payload = {
    full_name    : form.full_name,
    username     : form.username,          // ikiwa unataka lowercase: .toLowerCase()
    email        : form.email,
    password     : form.password,
    phone_number,
    language     : form.language || 'en',
    business_name: form.business_name || '',
    business_type: form.business_type || ''
  }

  try {
    await api.post('/api/auth/signup', payload)
    success.value = 'Account created successfully. Redirecting…'
    setTimeout(() => router.push('/login'), 900)
  } catch (e) {
    error.value = extractError(e)
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

.text-warning { color: #ffd700 !important; }
.form-label, .form-check-label { font-size: .85rem; color: #c7d0df; }

.form-check-input {
  accent-color: #ffd700 !important;
  width: 1.15em; height: 1.15em; margin-top: .25em;
  border: 2px solid #ffd700 !important; border-radius: .3em;
  cursor: pointer; appearance: auto !important; -webkit-appearance: auto !important;
}
.form-check-label { cursor: pointer; }

/* Strength bar */
.progress.strength { height: 6px; background: #132441; }
.progress-bar.bg-danger  { background:#ff6b6b !important; }
.progress-bar.bg-warning { background:#ffd166 !important; }
.progress-bar.bg-info    { background:#4dabf7 !important; }
.progress-bar.bg-success { background:#51cf66 !important; }

@media (max-width: 480px) {
  .btn-warning { font-size: .95rem; padding: .6rem 1.1rem; }
  input.form-control, select.form-select { font-size: .9rem; padding: .6rem .85rem; }
}
</style>
