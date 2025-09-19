<!-- src/views/LoginPage.vue -->
<template>
  <div class="page bg-dark d-flex align-items-center justify-content-center px-3">
    <div
      class="auth-card card shadow-lg rounded-4 border-2 border-warning p-3 p-sm-4"
      role="dialog"
      aria-labelledby="loginTitle"
      aria-describedby="loginDesc"
      style="max-width:420px;width:100%"
    >
      <!-- Logo + title -->
      <div class="text-center mb-3 mt-1">
        <img
          src="/icons/logo.png"
          alt="SmartBiz Logo"
          class="rounded-circle border border-warning shadow-sm"
          width="56" height="56"
          style="background:#fff;object-fit:contain"
          loading="eager" decoding="async"
        />
        <h1 id="loginTitle" class="fw-bold text-warning mt-2 h5 m-0">Login to SmartBiz</h1>
        <p id="loginDesc" class="text-light-50 small m-0 mt-1">
          Welcome back — please sign in to continue.
        </p>
      </div>

      <hr class="mb-3 border-warning opacity-75" />

      <!-- Backend status -->
      <div
        v-if="apiStatus !== 'ok'"
        class="alert alert-dark border border-warning-subtle text-warning small py-2 mb-2"
        role="alert" aria-live="polite"
      >
        <span v-if="apiStatus === 'checking'">Checking server availability…</span>
        <span v-else-if="apiStatus === 'down'">
          Server unreachable. Ensure backend is running at
          <code class="text-light">{{ BACKEND_BASE }}</code>.
        </span>
        <span v-else-if="apiStatus === 'cors'">
          Network/CORS error. Allow origin
          <code class="text-light">{{ origin }}</code> on the backend.
        </span>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" autocomplete="off" novalidate :aria-busy="loading">
        <!-- Email (used as identifier in request) -->
        <label class="form-label text-light small mb-1">Email</label>
        <div class="mb-2 input-group group-dark rounded-3 overflow-hidden">
          <span class="input-group-text border-0"><i class="bi bi-envelope-fill" aria-hidden="true"></i></span>
          <input
            ref="emailInput"
            v-model.trim="form.email"
            type="email"
            class="form-control border-0"
            placeholder="you@example.com"
            aria-label="Email"
            autocomplete="email"
            inputmode="email"
            autocapitalize="off"
            autocorrect="off"
            :aria-invalid="Boolean(errors.email)"
            :disabled="loading"
            required
            @keydown.enter.prevent="focusPwd()"
          />
        </div>

        <!-- Password -->
        <label class="form-label text-light small mb-1">Password</label>
        <div class="mb-1 input-group group-dark rounded-3 overflow-hidden">
          <span class="input-group-text border-0"><i class="bi bi-lock-fill" aria-hidden="true"></i></span>
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
        <p v-if="errors.email" class="small text-danger mb-1">{{ errors.email }}</p>
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

        <button type="submit" class="btn btn-warning w-100 fw-bold mb-2 py-2 rounded-3" :disabled="loading || !canSubmit">
          <span v-if="!loading">Login</span>
          <span v-else><span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Logging in…</span>
        </button>

        <!-- Global error/success -->
        <div v-if="notice.text" class="alert mt-2 py-2" :class="notice.type === 'error' ? 'alert-danger' : 'alert-success'">
          {{ notice.text }}
        </div>
      </form>

      <div class="text-center mt-2 small">
        <span class="text-light">Don't have an account?</span>
        <router-link to="/signup" class="text-warning fw-bold ms-1">Signup</router-link>
      </div>
      <div class="text-center mt-1">
        <router-link to="/forgot-password" class="link-info">Forgot Password?</router-link>
      </div>

      <!-- Debug -->
      <details v-if="debug" class="mt-3 small text-light-50">
        <summary class="text-warning">Debug</summary>
        <div class="mt-2">
          <div>BACKEND_BASE: <code class="text-light">{{ BACKEND_BASE }}</code></div>
          <div>Origin: <code class="text-light">{{ origin }}</code></div>
          <div>Status: <code class="text-light">{{ apiStatus }}</code></div>
          <div>Last error: <code class="text-light">{{ lastError || '-' }}</code></div>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'LoginPage' })

import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

/* ===== Backend base (NO /api) ===== */
const BACKEND_BASE =
  (import.meta.env.VITE_BACKEND_BASE as string | undefined)?.replace(/\/+$/,'') ||
  'https://smartbiz-backend-p45m.onrender.com'

/* ===== Fetch helpers (JSON only) ===== */
async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_BASE}${path}`, {
    credentials: 'omit',            // weka 'include' tu kama unatumia cookies za session
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  })
  let data: any = null
  try { data = await res.json() } catch {}
  if (!res.ok) {
    const err: any = new Error(
      data?.detail || data?.message || data?.error || `HTTP ${res.status}`
    )
    err.status = res.status
    err.data = data
    throw err
  }
  return data as T
}
async function postJSON<T>(path: string, body: any, signal?: AbortSignal): Promise<T> {
  return getJSON<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),     // JSON halali (keys kwenye quotes)
    signal,
  })
}

/* ─────────── State ─────────── */
const origin   = window.location.origin
const loading  = ref(false)
const showPwd  = ref(false)
const capsOn   = ref(false)
const remember = ref(true)
const online   = ref(navigator.onLine)
const form     = ref<{email:string;password:string}>({ email: '', password: '' })
const errors   = ref<{email:string;password:string}>({ email: '', password: '' })
const emailInput  = ref<HTMLInputElement|null>(null)
const pwdInput    = ref<HTMLInputElement|null>(null)
const notice   = ref<{type:'error'|'success';text:string}>({ type:'error', text:'' })
const debug    = (import.meta.env.VITE_APP_DEBUG?.toString() === '1') || /[?&]debug=1/.test(location.search)
const lastError = ref('')

/* API health status */
const apiStatus = ref<'checking'|'ok'|'down'|'cors'>('checking')

/* Connectivity listeners */
const _onOnline  = () => (online.value = true)
const _onOffline = () => (online.value = false)

onMounted(async () => {
  window.addEventListener('online', _onOnline)
  window.addEventListener('offline', _onOffline)

  const savedEmail = localStorage.getItem('sbz_last_email')
  if (savedEmail) form.value.email = savedEmail

  await nextTick()
  emailInput.value?.focus?.()

  checkApiHealth()
})

onBeforeUnmount(() => {
  window.removeEventListener('online', _onOnline)
  window.removeEventListener('offline', _onOffline)
})

/* ─────────── Validation ─────────── */
const emailRe = /^\S+@\S+\.\S+$/
const canSubmit = computed(() =>
  emailRe.test((form.value.email || '').trim()) && String(form.value.password || '').length >= 1
)
function validate() {
  errors.value.email = ''
  errors.value.password = ''
  const email = (form.value.email || '').trim()
  if (!emailRe.test(email)) errors.value.email = 'Please enter a valid email address.'
  if (!form.value.password) errors.value.password = 'Please enter your password.'
  return !(errors.value.email || errors.value.password)
}

const onPwdKeyup = (e: KeyboardEvent) => {
  try { capsOn.value = !!(e.getModifierState && e.getModifierState('CapsLock')) } catch { capsOn.value = false }
}
function focusPwd() { pwdInput.value?.focus?.() }

/* ─────────── Auth helpers ─────────── */
function saveAuth(data: any) {
  const token = data?.access_token || data?.token || data?.accessToken
  if (!token) return false
  const store = remember.value ? localStorage : sessionStorage
  store.setItem('sbz_token', token)
  store.setItem('sbz_token_type', data?.token_type ?? 'Bearer')
  store.setItem('sbz_auth_at', String(Date.now()))
  localStorage.setItem('sbz_last_email', (form.value.email || '').trim().toLowerCase())
  return true
}
async function redirectAfterLogin() {
  await router.push('/dashboard')   // badilisha ukihitaji role-based
}

/* ─────────── Health check ─────────── */
async function checkApiHealth() {
  apiStatus.value = 'checking'
  try {
    await getJSON('/health', { method: 'GET' } as any)
    apiStatus.value = 'ok'
  } catch (err: any) {
    lastError.value = err?.message || 'Unable to reach server'
    apiStatus.value = navigator.onLine ? 'cors' : 'down'
  }
}

/* ─────────── Login (tuma identifier + password) ─────────── */
let lastTry = 0
let abortCtrl: AbortController | null = null
const COOLDOWN_MS = 1200

async function handleLogin() {
  const now = Date.now()
  if (now - lastTry < COOLDOWN_MS || loading.value) return
  lastTry = now

  notice.value.text = ''
  if (!navigator.onLine) { notice.value = { type:'error', text:'You are offline.' }; return }
  if (!validate()) return

  if (abortCtrl) abortCtrl.abort()
  abortCtrl = new AbortController()

  loading.value = true
  lastError.value = ''
  try {
    const email = (form.value.email || '').trim().toLowerCase()
    const password = String(form.value.password)

    // ✅ Backend inahitaji 'identifier' + 'password'
    const data = await postJSON<any>('/auth/login', { identifier: email, password }, abortCtrl.signal)

    if (!saveAuth(data)) throw new Error('Missing token in response.')
    notice.value = { type:'success', text:'Login successful. Redirecting…' }
    await redirectAfterLogin()
  } catch (err:any) {
    const status = err?.status
    const detail = err?.data?.detail || err?.data?.message || err?.message || 'Login failed.'
    notice.value = { type:'error', text:
      status === 401 ? 'Invalid email or password.' :
      status === 422 ? 'Invalid request payload. Please try again.' :
      String(detail)
    }
    lastError.value = String(detail)
    checkApiHealth()
  } finally {
    loading.value = false
    abortCtrl = null
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
  .auth-card { padding: 1.25rem 1.75rem !important; }
}
</style>
