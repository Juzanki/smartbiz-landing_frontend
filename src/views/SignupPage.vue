<!-- src/views/SignupPage.vue -->
<template>
  <div class="page">
    <div class="wrap">
      <!-- Brand -->
      <div class="brand">
        <img
          src="/icons/logo.png"
          alt="SmartBiz Logo"
          width="56"
          height="56"
          class="brand-logo"
          loading="eager"
          decoding="async"
        />
        <h1 class="brand-title">Create Your Account</h1>
        <p class="brand-sub">Join SmartBiz and simplify your business journey.</p>
      </div>

      <!-- Card -->
      <div class="card">
        <form @submit.prevent="onSignup" autocomplete="off" novalidate>
          <!-- FULL NAME -->
          <div class="mb-3">
            <label for="fullname" class="label">Full Name</label>
            <input
              id="fullname"
              v-model.trim="form.full_name"
              class="input"
              :class="{ 'is-invalid': !!errors.full_name }"
              type="text"
              name="name"
              placeholder="e.g. Julius Nkindwa"
              maxlength="60"
              autocomplete="name"
              inputmode="text"
              enterkeyhint="next"
              required
            />
            <div v-if="errors.full_name" class="invalid">{{ errors.full_name }}</div>
          </div>

          <!-- USERNAME -->
          <div class="mb-3">
            <label for="username" class="label">Username</label>
            <input
              id="username"
              v-model.trim="form.username"
              class="input"
              :class="{ 'is-invalid': !!errors.username }"
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
            <small class="hint">Lowercase &amp; numbers recommended.</small>
            <div v-if="errors.username" class="invalid">{{ errors.username }}</div>
          </div>

          <!-- EMAIL -->
          <div class="mb-3">
            <label for="email" class="label">Email Address</label>
            <input
              id="email"
              v-model.trim="form.email"
              class="input"
              :class="{ 'is-invalid': !!errors.email }"
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
            <div v-if="errors.email" class="invalid">{{ errors.email }}</div>
          </div>

          <!-- PASSWORD -->
          <div class="mb-2">
            <label for="password" class="label">Password</label>
            <div class="row-inline">
              <input
                :type="showPwd ? 'text' : 'password'"
                id="password"
                v-model="form.password"
                class="input flex-1"
                :class="{ 'is-invalid': !!errors.password }"
                name="new-password"
                placeholder="Strong password"
                minlength="8"
                autocomplete="new-password"
                :aria-invalid="!!(form.password && !isStrongPassword(form.password))"
                enterkeyhint="next"
                required
              />
              <button
                type="button"
                class="btn-ghost"
                @click="showPwd = !showPwd"
                :aria-pressed="showPwd"
                aria-label="Toggle password visibility"
              >
                <i :class="showPwd ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>

            <!-- Strength meter -->
            <div class="mt-2">
              <div class="strength">
                <div
                  class="strength-bar"
                  role="progressbar"
                  :style="{ width: strength.percent + '%' }"
                  :class="strength.barClass"
                  :aria-valuenow="strength.percent"
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
              </div>
              <small
                v-if="form.password"
                class="mt-1"
                :class="isStrongPassword(form.password) ? 'ok' : 'bad'"
              >
                {{ strength.label }}
              </small>
              <small
                v-if="form.password && !isStrongPassword(form.password)"
                class="bad d-block"
              >
                Must include upper/lowercase, a number &amp; a symbol (8+ chars).
              </small>
            </div>
            <div v-if="errors.password" class="invalid">{{ errors.password }}</div>
          </div>

          <!-- PHONE -->
          <div class="mb-3">
            <label class="label">Phone Number</label>
            <div class="row-inline gap-2">
              <select v-model="form.country_code" class="input select w-auto" required>
                <option v-for="code in countryCodes" :key="code.value" :value="code.value">
                  {{ code.label }}
                </option>
              </select>
              <input
                v-model.trim="form.phone_local"
                class="input flex-1"
                :class="{ 'is-invalid': !!errors.phone_number }"
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
            <small class="hint">
              Start without 0 (e.g. <span class="accent">712345678</span>)
            </small>
            <div v-if="errors.phone_number" class="invalid">{{ errors.phone_number }}</div>
          </div>

          <!-- LANGUAGE -->
          <div class="mb-3">
            <label class="label">Preferred Language</label>
            <select class="input select" v-model="form.language" required>
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
            </select>
          </div>

          <!-- OPTIONALS -->
          <div class="mb-3">
            <label class="label">
              Business Name <span class="muted">(Optional)</span>
            </label>
            <input class="input" v-model.trim="form.business_name" maxlength="60" />
          </div>

          <div class="mb-3">
            <label class="label">
              Business Type <span class="muted">(Optional)</span>
            </label>
            <select class="input select" v-model="form.business_type">
              <option value="">Select Type</option>
              <option value="Retail">Retail</option>
              <option value="Service">Service</option>
              <option value="Wholesale">Wholesale</option>
              <option value="Education">Education</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <!-- TERMS -->
          <div class="mb-3 row-inline gap-2 align-center">
            <input
              id="terms"
              v-model="agreed"
              class="checkbox"
              :class="{ 'is-invalid': !!errors.agreed }"
              type="checkbox"
              required
            />
            <label for="terms" class="label light">
              I agree to the
              <a href="#" class="link">terms and conditions</a>
            </label>
          </div>
          <div v-if="errors.agreed" class="invalid">{{ errors.agreed }}</div>

          <!-- Alerts -->
          <div class="mb-2" aria-live="polite">
            <div v-if="error" class="alert error">
              <i class="bi bi-exclamation-triangle me-2"></i>{{ error }}
            </div>
            <div v-if="success" class="alert ok">
              <i class="bi bi-check-circle me-2"></i>{{ success }}
            </div>
          </div>

          <!-- SUBMIT -->
          <button class="btn-primary" :disabled="loading || !canSubmit">
            <span v-if="loading"><span class="spinner"></span>Signing Up…</span>
            <span v-else>Sign Up</span>
          </button>
        </form>

        <div class="footer-note">
          Already have an account?
          <router-link to="/login" class="link strong">Login</router-link>
        </div>
      </div>

      <div class="space"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { authAPI, handleApiError } from '../api/client'

defineOptions({ name: 'SignupPage' })

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE || '/api' // optional: for debug

type Lang = 'en' | 'sw' | 'fr' | 'ar'
type BizType = '' | 'Retail' | 'Service' | 'Wholesale' | 'Education' | 'Other'

const form = reactive({
  full_name: '',
  username: '',
  email: '',
  password: '',
  country_code: '+255 (TZ)',
  phone_local: '',
  language: 'en' as Lang,
  business_name: '',
  business_type: '' as BizType
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
  { value: '+1 (US)', label: 'US +1 (US)' },
  { value: '+44 (UK)', label: 'UK +44 (UK)' },
  { value: '+27 (ZA)', label: 'ZA +27 (ZA)' }
] as const

function isStrongPassword(pwd?: string): boolean {
  if (!pwd) return false
  const hasUpper = /[A-Z]/.test(pwd)
  const hasLower = /[a-z]/.test(pwd)
  const hasNumber = /\d/.test(pwd)
  const hasSpecial = /[^\w\s]/.test(pwd)
  return hasUpper && hasLower && hasNumber && hasSpecial && pwd.length >= 8
}

const canSubmit = computed(() =>
  !!form.full_name.trim() &&
  !!form.username.trim() &&
  !!form.email.trim() &&
  !!form.password &&
  !!form.phone_local.trim() &&
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
    { label: 'Too weak', percent: 20, barClass: 'bar-danger' },
    { label: 'Weak', percent: 40, barClass: 'bar-danger' },
    { label: 'Fair', percent: 60, barClass: 'bar-warn' },
    { label: 'Good', percent: 80, barClass: 'bar-info' },
    { label: 'Strong', percent: 100, barClass: 'bar-ok' }
  ] as const
  return levels[Math.min(score, levels.length - 1)]
})

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

watch(() => ({ ...form, agreed: agreed.value }), () => {
  error.value = ''
  success.value = ''
  Object.keys(errors).forEach((k) => ((errors as any)[k] = ''))
}, { deep: true })

watch(() => form.email, (v) => { if (v) localStorage.setItem('sb_last_email', v) })
watch(() => form.country_code, (v) => { if (v) localStorage.setItem('sb_country', v) })

onMounted(() => {
  const lastEmail = localStorage.getItem('sb_last_email')
  const lastCc = localStorage.getItem('sb_country')
  if (lastEmail) form.email = lastEmail
  if (lastCc) form.country_code = lastCc
})

onBeforeUnmount(() => { if (abortCtrl) abortCtrl.abort() })

function validateForm(): boolean {
  Object.keys(errors).forEach((k) => ((errors as any)[k] = ''))
  let ok = true

  if (!form.full_name.trim()) { errors.full_name = 'Full name is required'; ok = false }
  else if (form.full_name.trim().length < 2) { errors.full_name = 'Full name must be at least 2 characters'; ok = false }

  if (!form.username.trim()) { errors.username = 'Username is required'; ok = false }
  else if (form.username.length < 3) { errors.username = 'Username must be at least 3 characters'; ok = false }
  else if (!/^[a-z0-9_]+$/.test(form.username)) { errors.username = 'Use lowercase letters, numbers, and underscores only'; ok = false }

  if (!form.email.trim()) { errors.email = 'Email is required'; ok = false }
  else if (!/\S+@\S+\.\S+/.test(form.email)) { errors.email = 'Please enter a valid email address'; ok = false }

  if (!form.password) { errors.password = 'Password is required'; ok = false }
  else if (form.password.length < 8) { errors.password = 'Password must be at least 8 characters'; ok = false }
  else if (!isStrongPassword(form.password)) { errors.password = 'Password must include uppercase, lowercase, number, and symbol'; ok = false }

  if (!form.phone_local.trim()) { errors.phone_number = 'Phone number is required'; ok = false }
  else if (!/^[1-9][0-9]{7,13}$/.test(form.phone_local)) { errors.phone_number = 'Use a valid phone number (no leading 0)'; ok = false }

  if (!agreed.value) { errors.agreed = 'You must agree to the terms and conditions'; ok = false }

  return ok
}

async function onSignup() {
  if (!validateForm() || loading.value) return
  if (!navigator.onLine) { error.value = 'You appear to be offline. Please check your connection.'; return }

  if (abortCtrl) abortCtrl.abort()
  abortCtrl = new AbortController()

  error.value = ''
  success.value = ''
  loading.value = true

  const phone_number = toE164(form.country_code, form.phone_local)
  const payload = {
    full_name: form.full_name.trim(),
    username: form.username.trim().toLowerCase(),
    email: form.email.trim().toLowerCase(),
    password: form.password,
    phone_number,
    language: form.language,
    business_name: form.business_name.trim() || undefined,
    business_type: form.business_type || undefined
  }

  try {
    const res = await authAPI.signUp(payload /*, { signal: abortCtrl.signal } */)
    if ((res as any)?.data) {
      success.value = 'Account created successfully. Redirecting to login…'
      localStorage.setItem('sb_signup_email', form.email)
      localStorage.setItem('sb_signup_success', 'true')
      setTimeout(() => {
        router.push({ path: '/login', query: { registered: 'true', email: form.email } })
      }, 1500)
    }
  } catch (e: any) {
    error.value = extractError(e)
    const be = e?.response?.data?.errors
    if (be && typeof be === 'object') {
      Object.keys(be).forEach((k) => {
        if (k in errors) (errors as any)[k] = Array.isArray(be[k]) ? be[k][0] : String(be[k])
      })
    }
  } finally {
    loading.value = false
    abortCtrl = null
  }
}
</script>

<style>
/* Global page bg */
html, body {
  background: #0b1220 !important;
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>

<style scoped>
/* Layout */
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem 1rem;
  background: #0b1220;
}
.wrap { width: 100%; max-width: 520px; animation: fadeInUp .6s ease-out; }

/* Brand */
.brand { text-align: center; margin: .5rem 0 1rem; }
.brand-logo {
  border-radius: 9999px;
  border: 2px solid #ffd700;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
}
.brand-title { color: #ffd700; font-weight: 700; font-size: 1.125rem; margin: .5rem 0 0; }
.brand-sub { color: #9fb0c9; font-size: .85rem; margin: .25rem 0 0; }

/* Card */
.card {
  background: #0f1e34;
  border: 2px solid rgba(255,215,0,.6);
  border-radius: 1rem;
  padding: 1rem 1.25rem;
  box-shadow: 0 8px 28px rgba(0,0,0,.4), 0 0 0 2px rgba(255,215,0,.2);
  transition: transform .2s ease, box-shadow .2s ease;
}
.card:hover { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(0,0,0,.5), 0 0 0 2px rgba(255,215,0,.4); }

/* Inputs */
.label { color: #ffd700; font-size: .85rem; display: inline-block; margin-bottom: .35rem; }
.label.light { color: #d3dbeb; }
.input, .select {
  width: 100%;
  background: #132441;
  color: #ffffff;
  border: none;
  border-radius: .5rem;
  padding: .65rem .85rem;
  font-size: .95rem;
  outline: none;
  transition: box-shadow .2s ease;
}
.input:focus, .select:focus { box-shadow: 0 0 0 2px rgba(255,215,0,.6); }
.input::placeholder { color: #b9c3d3; opacity: .95; }
.is-invalid { box-shadow: 0 0 0 2px #dc3545 !important; }

/* Checkbox */
.checkbox {
  width: 1.15em; height: 1.15em; border-radius: .25rem; border: 2px solid #ffd700;
  accent-color: #ffd700; background: #132441; color: #fff;
}

/* Helpers */
.row-inline { display: flex; align-items: center; }
.flex-1 { flex: 1 1 auto; }
.align-center { align-items: center; }
.gap-2 { gap: .5rem; }
.mb-2 { margin-bottom: .5rem; }
.mb-3 { margin-bottom: .85rem; }
.mt-1 { margin-top: .25rem; }
.d-block { display: block; }
.hint { color: #9fb0c9; font-size: .8rem; margin-top: .25rem; }
.muted { color: #9fb0c9; font-weight: 400; }
.accent { color: #ffd700; }

/* Alerts */
.invalid { color: #ff6b6b; font-size: .8rem; margin-top: .25rem; }
.alert { padding: .5rem .75rem; border-radius: .6rem; font-size: .9rem; }
.alert.error { background: #3a1120; color: #ff98a5; border: 1px solid #ff6b6b33; }
.alert.ok { background: #0f2f20; color: #7bf2b9; border: 1px solid #7bf2b933; }

/* Buttons */
.btn-ghost {
  background: transparent;
  border: 1px solid #ffd70066;
  color: #ffd700;
  padding: .55rem .75rem;
  border-radius: .55rem;
  cursor: pointer;
}
.btn-ghost:hover { background: #1a2b4f; }
.btn-primary {
  width: 100%;
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #0b1220;
  font-weight: 700;
  font-size: 1rem;
  border: none;
  border-radius: .6rem;
  padding: .75rem 1.25rem;
  box-shadow: 0 4px 12px rgba(255,215,0,.3);
  cursor: pointer;
  transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease;
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(255,215,0,.4); }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; transform: none; }

/* Strength meter */
.strength { width: 100%; height: 8px; background: #0e1a30; border-radius: 999px; overflow: hidden; border: 1px solid #193256; }
.strength-bar { height: 100%; transition: width .25s ease; }
.bar-danger { background: #e74c3c; }
.bar-warn   { background: #f1c40f; }
.bar-info   { background: #00bcd4; }
.bar-ok     { background: #2ecc71; }

.ok { color: #7bf2b9; }
.bad { color: #ff98a5; }

/* Footer */
.footer-note { text-align: center; margin-top: .9rem; color: #a8b6cc; font-size: .9rem; }
.link { color: #ffd700; text-decoration: underline; }
.link.strong { font-weight: 700; }

/* Misc */
.space { height: 1rem; }

.spinner {
  display: inline-block;
  width: 1em; height: 1em;
  border: 2px solid #0b1220;
  border-top-color: transparent;
  border-radius: 50%;
  margin-right: .5rem;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
</style>
