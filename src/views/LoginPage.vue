<!-- src/views/LoginPage.vue -->
<template>
  <div class="page bg-dark d-flex align-items-center justify-content-center px-3">
    <div
      class="auth-card card shadow-lg rounded-4 border-2 border-warning p-3 p-sm-4"
      role="dialog"
      aria-labelledby="loginTitle"
      aria-describedby="loginDesc"
    >
      <!-- Logo + title -->
      <div class="text-center mb-3 mt-1">
        <img
          src="/icons/logo.png"
          alt="SmartBiz Logo"
          class="rounded-circle border border-warning shadow-sm"
          width="56" height="56"
          style="background:#fff;object-fit:contain"
          loading="eager"
          decoding="async"
        />
        <h1 id="loginTitle" class="fw-bold text-warning mt-2 h5 m-0">Login to SmartBiz</h1>
        <p id="loginDesc" class="text-light-50 small m-0 mt-1">
          Welcome back — please sign in to continue.
        </p>
      </div>

      <hr class="mb-3 border-warning opacity-75" />

      <!-- API status -->
      <div
        v-if="apiStatus !== 'ok'"
        class="alert alert-dark border border-warning-subtle text-warning small py-2 mb-2"
        role="alert"
        aria-live="polite"
      >
        <span v-if="apiStatus === 'checking'">Checking API availability…</span>
        <span v-else-if="apiStatus === 'down'">
          API unreachable. Ensure backend is running at
          <code class="text-light">{{ API_BASE }}</code>.
        </span>
        <span v-else-if="apiStatus === 'cors'">
          CORS blocked. Allow origin
          <code class="text-light">{{ origin }}</code> in backend CORS settings.
        </span>
      </div>

      <form
        @submit.prevent="handleLogin"
        autocomplete="off"
        novalidate
        :aria-busy="loading"
      >
        <!-- Identifier -->
        <div class="mb-3 input-group group-dark rounded-3 overflow-hidden">
          <span class="input-group-text border-0">
            <i class="bi bi-person-fill" aria-hidden="true"></i>
          </span>
          <input
            ref="idInput"
            v-model.trim="form.identifier"
            type="text"
            class="form-control border-0"
            placeholder="Enter Username, Email, or Phone"
            aria-label="Username, Email, or Phone"
            autocomplete="username"
            inputmode="text"
            autocapitalize="off"
            autocorrect="off"
            enterkeyhint="next"
            :aria-invalid="Boolean(errors.identifier)"
            :disabled="loading"
            required
            @keydown.enter.prevent="focusPwd()"
          />
        </div>

        <!-- Password -->
        <div class="mb-1 input-group group-dark rounded-3 overflow-hidden">
          <span class="input-group-text border-0">
            <i class="bi bi-lock-fill" aria-hidden="true"></i>
          </span>
          <input
            :type="showPwd ? 'text' : 'password'"
            v-model="form.password"
            class="form-control border-0"
            placeholder="Enter Password"
            aria-label="Password"
            autocomplete="current-password"
            :aria-invalid="Boolean(errors.password)"
            minlength="1"
            @keyup="onPwdKeyup"
            @blur="capsOn = false"
            enterkeyhint="go"
            :disabled="loading"
            required
            ref="pwdInput"
            @keydown.enter.prevent="handleLogin()"
          />
          <button
            class="btn btn-outline-warning btn-toggle"
            type="button"
            :aria-pressed="showPwd"
            :title="showPwd ? 'Hide password' : 'Show password'"
            @click="showPwd = !showPwd"
            :disabled="loading"
          >
            <i :class="showPwd ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
          </button>
        </div>

        <!-- Inline validation -->
        <p v-if="errors.identifier" class="small text-danger mb-1">{{ errors.identifier }}</p>
        <p v-if="errors.password" class="small text-danger mb-1">{{ errors.password }}</p>

        <!-- CapsLock notice -->
        <div v-if="capsOn" class="small text-warning mb-2" role="alert" aria-live="polite">
          <i class="bi bi-exclamation-triangle-fill me-1"></i> Caps Lock is ON
        </div>

        <!-- Remember me + offline -->
        <div class="d-flex justify-content-between align-items-center mb-2">
          <label class="form-check small m-0 text-light">
            <input class="form-check-input me-1" type="checkbox" v-model="remember" :disabled="loading" />
            Remember me
          </label>
          <span v-if="!online" class="badge bg-danger-subtle text-danger border border-danger">Offline</span>
        </div>

        <button
          type="submit"
          class="btn btn-warning w-100 fw-bold mb-2 py-2 rounded-3"
          :disabled="loading || !canSubmit"
        >
          <span v-if="!loading">Login</span>
          <span v-else>
            <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            Logging in…
          </span>
        </button>
      </form>

      <div class="text-center mt-2 small">
        <span class="text-light">Don't have an account?</span>
        <router-link to="/signup" class="text-warning fw-bold ms-1">Signup</router-link>
      </div>
      <div class="text-center mt-1">
        <router-link to="/forgot-password" class="link-info">Forgot Password?</router-link>
      </div>

      <!-- Debug panel -->
      <details v-if="debug" class="mt-3 small text-light-50">
        <summary class="text-warning">Debug</summary>
        <div class="mt-2">
          <div>API_BASE: <code class="text-light">{{ API_BASE }}</code></div>
          <div>Origin: <code class="text-light">{{ origin }}</code></div>
          <div>API status: <code class="text-light">{{ apiStatus }}</code></div>
          <div>Last error: <code class="text-light">{{ lastError || '-' }}</code></div>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: 'LoginPage' })

import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'

const toast = useToast()
const router = useRouter()

// ───────────── State ─────────────
const loading  = ref(false)
const showPwd  = ref(false)
const capsOn   = ref(false)
const remember = ref(true)
const online   = ref(navigator.onLine)
const form     = ref({ identifier: '', password: '' })
const errors   = ref({ identifier: '', password: '' })

const idInput  = ref(null)
const pwdInput = ref(null)
const origin   = window.location.origin
const debug    = (import.meta.env.VITE_APP_DEBUG?.toString() === '1') || /[?&]debug=1/.test(location.search)
const lastError = ref('')

// API health status: 'checking' | 'ok' | 'down' | 'cors'
const apiStatus = ref('checking')

// Connectivity listeners
const _onOnline  = () => (online.value = true)
const _onOffline = () => (online.value = false)

onMounted(async () => {
  window.addEventListener('online', _onOnline)
  window.addEventListener('offline', _onOffline)
  document.addEventListener('visibilitychange', onVisChange)

  // Redirect if already authenticated
  const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
  if (token) {
    await safePushByRole()
    return
  }

  const lastId = localStorage.getItem('last_identifier')
  if (lastId) form.value.identifier = lastId
  await nextTick()
  idInput.value?.focus?.()

  checkApiHealth()
})

onBeforeUnmount(() => {
  window.removeEventListener('online', _onOnline)
  window.removeEventListener('offline', _onOffline)
  document.removeEventListener('visibilitychange', onVisChange)
})

function onVisChange() {
  if (document.visibilityState === 'visible' && apiStatus.value !== 'ok') {
    checkApiHealth()
  }
}

// ───────────── API base & axios ─────────────
const API_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  'http://localhost:8000'
).replace(/\/+$/, '')

// Some deployments use cookies; allow opting-in without forcing it
const USE_CREDENTIALS = (import.meta.env.VITE_USE_CREDENTIALS?.toString() === '1')

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  withCredentials: USE_CREDENTIALS,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// Attach token if present
api.interceptors.request.use((config) => {
  const t = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
  if (t) config.headers.Authorization = `Bearer ${t}`
  // Ensure JSON when sending objects
  if (config.data && typeof config.data === 'object' && !(config.data instanceof URLSearchParams)) {
    config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/json'
  }
  return config
})

// Normalize errors (timeout, network, CORS)
api.interceptors.response.use(
  r => r,
  err => {
    if (err?.code === 'ECONNABORTED') {
      err.message = 'Request timeout'
    }
    return Promise.reject(err)
  }
)

// ───────────── Helpers & validation ─────────────
const normalizeId = (v) => (v ?? '').trim()
const isEmail = (v) => /\S+@\S+\.\S+/.test(v)

const canSubmit = computed(() =>
  normalizeId(form.value.identifier).length > 0 && (form.value.password || '').length > 0
)

const validate = () => {
  errors.value.identifier = ''
  errors.value.password = ''
  const id = normalizeId(form.value.identifier)
  if (!id) errors.value.identifier = 'Please enter your email/username/phone.'
  if (!form.value.password) errors.value.password = 'Please enter your password.'
  return !(errors.value.identifier || errors.value.password)
}

const parseAxiosError = (err) => {
  // CORS heuristic: has request, no response
  const isCors = !err?.response && !!err?.request
  const status = err?.response?.status
  // Prefer backend detail if exists
  const message =
    err?.response?.data?.detail ||
    err?.response?.data?.message ||
    err?.message ||
    'Request failed'
  return { status, isCors, message }
}

const getErrorMsg = (err) => {
  const { status, isCors, message } = parseAxiosError(err)
  if (isCors) return 'Network/CORS error. Ensure the backend allows this origin.'
  if (status === 499) return 'Client closed the request. Please try again.'
  if (status === 400) return 'Missing or invalid credentials.'
  if (status === 401) return 'Invalid credentials.'
  if (status === 403) return 'You are not allowed to login.'
  if (status === 404) return 'Login route not found.'
  if (status === 405) return 'Method not allowed.'
  if (status === 415) return 'Unsupported content type.'
  if (status === 422) return 'Invalid input. Please check your fields.'
  if (status === 429) return 'Too many attempts. Please wait and try again.'
  if (status === 503) return 'Service temporarily unavailable. Try again shortly.'
  return message || 'Request failed.'
}

const onPwdKeyup = (e) => {
  try { capsOn.value = !!(e?.getModifierState && e.getModifierState('CapsLock')) }
  catch { capsOn.value = false }
}

function focusPwd() {
  pwdInput.value?.focus?.()
}

function saveAuth(data) {
  const token = data?.access_token || data?.token || data?.accessToken
  const user  = data?.user || {}
  const role  = user?.role || data?.role || 'user'
  const name  = user?.full_name || data?.name || user?.name || ''
  const lang  = user?.language || data?.language || 'en'

  if (!token) return false

  const storage = remember.value ? localStorage : sessionStorage
  storage.setItem('access_token', token)
  storage.setItem('user_role', role)
  storage.setItem('user_name', name)
  storage.setItem('user_lang', lang)
  storage.setItem('auth_at', String(Date.now()))
  localStorage.setItem('last_identifier', normalizeId(form.value.identifier).toLowerCase())

  api.defaults.headers.common.Authorization = `Bearer ${token}`
  axios.defaults.headers.common.Authorization = `Bearer ${token}`
  return true
}

async function safePushByRole() {
  const role =
    localStorage.getItem('user_role') ||
    sessionStorage.getItem('user_role') ||
    'user'
  const target =
    ({ admin: '/dashboard/admin', owner: '/dashboard/owner', user: '/dashboard/user' })[role] ||
    '/dashboard/user'
  await router.push(target)
}

// ───────────── Health check ─────────────
async function checkApiHealth() {
  apiStatus.value = 'checking'
  try {
    await api.get('/healthz', { timeout: 4000 })
    apiStatus.value = 'ok'
  } catch (err) {
    const parsed = parseAxiosError(err)
    lastError.value = parsed.message
    apiStatus.value = parsed.isCors ? 'cors' : 'down'
  }
}

// ───────────── Login flow ─────────────
let lastTry = 0
let inflightSource = null
const COOLDOWN_MS = 1200

const handleLogin = async () => {
  const now = Date.now()
  if (now - lastTry < COOLDOWN_MS || loading.value) return
  lastTry = now

  if (!online.value) {
    toast.error('You are offline. Please check your connection.')
    return
  }
  if (!validate()) return

  // Cancel any inflight request to avoid racing
  if (inflightSource) {
    inflightSource.cancel('Cancelled due to a new attempt')
  }
  inflightSource = axios.CancelToken.source()

  const identifier = normalizeId(form.value.identifier)
  const password   = form.value.password

  loading.value = true
  lastError.value = ''
  try {
    let data = null

    // Try JSON first (new auth route)
    try {
      const payload = isEmail(identifier)
        ? { email: identifier, password }
        : { username: identifier, password }
      const r1 = await api.post('/auth/login', payload, {
        cancelToken: inflightSource.token,
        headers: { 'Content-Type': 'application/json' },
      })
      data = r1.data
    } catch (e1) {
      if (axios.isCancel(e1)) return
      const { status, isCors, message } = parseAxiosError(e1)
      if (isCors) { lastError.value = message; throw e1 }
      // Fallback only for unsupported/validation cases
      if (!status || [404, 405, 415, 422].includes(status)) {
        // continue to form fallback
      } else {
        lastError.value = message
        throw e1
      }
    }

    // Form-encoded fallback (legacy/compat)
    if (!data) {
      const params = new URLSearchParams()
      // server side will accept either username/email/phone under 'username'
      params.set('username', identifier)
      params.set('password', password)
      const r2 = await api.post('/auth/login-form', params, {
        cancelToken: inflightSource.token,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      data = r2.data
    }

    if (!saveAuth(data)) throw new Error('Missing token in response.')

    toast.success('✅ Login successful! Welcome!')
    await safePushByRole()
  } catch (err) {
    const msg = getErrorMsg(err)
    lastError.value = msg
    toast.error(`❌ ${msg}`)
    checkApiHealth()
  } finally {
    loading.value = false
    inflightSource = null
  }
}
</script>

<!-- Global page bg for this route -->
<style>
html, body { background: #0b1220; }
</style>

<style scoped>
.page { min-height: 100vh; }

.auth-card {
  width: 100%;
  max-width: 420px;
  background: #0f1e34 !important;
  box-shadow: 0 8px 28px rgba(0,0,0,.45), 0 0 0 2px #ffd70033;
}

.bg-dark { background: #0b1220 !important; }

.group-dark .input-group-text,
.group-dark .form-control {
  background: #132441 !important;
  color: #f8f9fa !important;
  border: none !important;
}
.group-dark .form-control::placeholder { color: #b9c3d3 !important; }

.group-dark .form-control:focus {
  outline: none !important;
  box-shadow: 0 0 0 2px #ffd70099 !important;
}

.btn-toggle { border-left: 1px solid rgba(255,255,255,.08) !important; }
hr { border-top: 2px solid #ffd700 !important; }

.btn-warning {
  background-color: #ffd700 !important;
  color: #0b1220 !important;
  border: none !important;
  font-weight: 700;
  border-radius: .65rem;
  transition: all .2s ease;
}
.btn-warning:hover { background-color: #ffdd33 !important; box-shadow: 0 0 10px rgba(255,214,0,.4); }
.btn-warning:active,
.btn-warning:focus { background: #ffec80 !important; outline: none !important; }

.text-light { color: #dbe3f2 !important; }
.link-info { color: #7ec8ff; }

.alert-dark { background: #0e1a30; }

@media (min-width: 768px) {
  .auth-card { padding: 1.5rem 2rem !important; }
}
</style>
