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

      <!-- Backend status -->
      <div
        v-if="apiStatus !== 'ok'"
        class="alert alert-dark border border-warning-subtle text-warning small py-2 mb-2"
        role="alert"
        aria-live="polite"
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

      <!-- STEP 1: Credentials -->
      <form v-if="!mfa.required" @submit.prevent="handleLogin" autocomplete="off" novalidate :aria-busy="loading">
        <!-- Identifier -->
        <div class="mb-3 input-group group-dark rounded-3 overflow-hidden">
          <span class="input-group-text border-0"><i class="bi bi-person-fill" aria-hidden="true"></i></span>
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

        <button type="submit" class="btn btn-warning w-100 fw-bold mb-2 py-2 rounded-3" :disabled="loading || !canSubmit">
          <span v-if="!loading">Login</span>
          <span v-else><span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Logging in…</span>
        </button>
      </form>

      <!-- STEP 2: OTP / 2FA (optional: only if backend ever returns mfa_required) -->
      <form v-else @submit.prevent="verifyOtp" autocomplete="off" novalidate>
        <div class="mb-2 text-center">
          <h2 class="h6 text-warning fw-bold m-0">Two-Factor Authentication</h2>
          <p class="small text-light-50 m-0 mt-1">Enter the 6-digit code sent to your device.</p>
        </div>
        <div class="mb-2 input-group group-dark rounded-3 overflow-hidden">
          <span class="input-group-text border-0"><i class="bi bi-shield-lock-fill" aria-hidden="true"></i></span>
          <input
            v-model.trim="mfa.code"
            type="text"
            class="form-control border-0"
            placeholder="123456"
            inputmode="numeric"
            pattern="^[0-9]{4,8}$"
            maxlength="8"
            required
            :disabled="loading"
            @keydown.enter.prevent="verifyOtp()"
          />
        </div>
        <p v-if="mfa.error" class="small text-danger mb-2">{{ mfa.error }}</p>

        <div class="d-flex gap-2">
          <button type="button" class="btn btn-outline-secondary w-50" :disabled="loading" @click="cancelMfa">Cancel</button>
          <button type="submit" class="btn btn-warning w-50 fw-bold" :disabled="loading || !mfa.code">Verify</button>
        </div>
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
          <div>BACKEND_BASE: <code class="text-light">{{ BACKEND_BASE }}</code></div>
          <div>Origin: <code class="text-light">{{ origin }}</code></div>
          <div>Status: <code class="text-light">{{ apiStatus }}</code></div>
          <div>Last error: <code class="text-light">{{ lastError || '-' }}</code></div>
          <div>MFA: <code class="text-light">{{ mfa }}</code></div>
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

/* Small fetch helpers */
async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_BASE}${path}`, {
    credentials: 'include',
    ...init,
  })
  let data: any = null
  try { data = await res.json() } catch {}
  if (!res.ok) {
    const err: any = new Error(data?.detail || data?.message || res.statusText)
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
    body: JSON.stringify(body),
    signal
  })
}

/* ─────────── State ─────────── */
const origin   = window.location.origin
const loading  = ref(false)
const showPwd  = ref(false)
const capsOn   = ref(false)
const remember = ref(true)
const online   = ref(navigator.onLine)
const form     = ref<{identifier:string;password:string}>({ identifier: '', password: '' })
const errors   = ref<{identifier:string;password:string}>({ identifier: '', password: '' })
const idInput  = ref<HTMLInputElement|null>(null)
const pwdInput = ref<HTMLInputElement|null>(null)
const debug    = (import.meta.env.VITE_APP_DEBUG?.toString() === '1') || /[?&]debug=1/.test(location.search)
const lastError = ref('')

/* MFA (optional) */
const mfa = ref<{required:boolean; token?:string; code?:string; error?:string}>({ required: false })

/* API health status */
const apiStatus = ref<'checking'|'ok'|'down'|'cors'>('checking')

/* Connectivity listeners */
const _onOnline  = () => (online.value = true)
const _onOffline = () => (online.value = false)

onMounted(async () => {
  window.addEventListener('online', _onOnline)
  window.addEventListener('offline', _onOffline)
  document.addEventListener('visibilitychange', onVisChange)

  // If already authenticated (token saved), redirect
  const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
  if (token) { await safePushByRole(); return }

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
  if (document.visibilityState === 'visible' && apiStatus.value !== 'ok') checkApiHealth()
}

/* ─────────── Validation ─────────── */
const normalizeId = (v?: string) => (v ?? '').trim()
const canSubmit = computed(() => normalizeId(form.value.identifier).length > 0 && (form.value.password || '').length > 0)

function validate() {
  errors.value.identifier = ''
  errors.value.password = ''
  const id = normalizeId(form.value.identifier)
  if (!id) errors.value.identifier = 'Please enter your email/username/phone.'
  if (!form.value.password) errors.value.password = 'Please enter your password.'
  return !(errors.value.identifier || errors.value.password)
}

const onPwdKeyup = (e: KeyboardEvent) => {
  try { capsOn.value = !!(e.getModifierState && e.getModifierState('CapsLock')) } catch { capsOn.value = false }
}
function focusPwd() { pwdInput.value?.focus?.() }

/* ─────────── Helpers: token/cookie session ─────────── */
function saveAuthFromBody(data: any) {
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
  return true
}

async function saveAuthFromCookieSession() {
  try {
    const res = await getJSON<{ valid:boolean; user?: any }>('/auth/session/verify')
    if (!res.valid) return false
    const profile = await getJSON<any>('/auth/me')
    const storage = remember.value ? localStorage : sessionStorage
    storage.setItem('user_role', profile?.role || 'user')
    storage.setItem('user_name', profile?.full_name || profile?.username || '')
    storage.setItem('user_lang', profile?.language || 'en')
    storage.setItem('auth_at', String(Date.now()))
    return true
  } catch { return false }
}

async function safePushByRole() {
  const role =
    localStorage.getItem('user_role') ||
    sessionStorage.getItem('user_role') ||
    'user'
  const target =
    ({ admin: '/dashboard/admin', owner: '/dashboard/owner', user: '/dashboard/user' } as any)[role] ||
    '/dashboard/user'
  await router.push(target)
}

/* ─────────── Health check (NO /api) ─────────── */
async function checkApiHealth() {
  apiStatus.value = 'checking'
  try {
    await getJSON('/health', { method: 'GET' } as any)
    apiStatus.value = 'ok'
  } catch (err: any) {
    lastError.value = err?.message || 'Unable to reach server'
    // If fetch reached network layer but blocked, label as cors
    apiStatus.value = (err?.name === 'TypeError' && !navigator.onLine ? 'down' : 'cors')
  }
}

/* ─────────── Login flow (NO /api) ─────────── */
let lastTry = 0
let abortCtrl: AbortController | null = null
const COOLDOWN_MS = 1200

function buildLoginPayload(identifier: string, password: string) {
  const emailLike = /\S+@\S+\.\S+/.test(identifier)
  const digits = identifier.replace(/\D+/g, '')
  const isPhone = digits.length >= 8 && !emailLike && /^[0-9+()\s-]+$/.test(identifier)
  if (emailLike) return { email: identifier.toLowerCase(), password }
  if (isPhone)   return { phone: digits, password }
  return { username: identifier.toLowerCase(), password }
}

async function handleLogin() {
  const now = Date.now()
  if (now - lastTry < COOLDOWN_MS || loading.value) return
  lastTry = now

  if (!navigator.onLine) { lastError.value = 'You are offline.'; return }
  if (!validate()) return

  if (abortCtrl) abortCtrl.abort()
  abortCtrl = new AbortController()

  const identifier = normalizeId(form.value.identifier)
  const password   = form.value.password

  loading.value = true
  lastError.value = ''
  try {
    const payload = buildLoginPayload(identifier, password)

    // POST /auth/login (JSON), cookies enabled
    const data = await postJSON<any>('/auth/login', payload, abortCtrl.signal)

    // Optional MFA flow (only if backend returns these fields)
    if (data?.mfa_required && data?.mfa_token) {
      mfa.value = { required: true, token: data.mfa_token }
      return
    }

    // JWT or cookie-session
    let authed = saveAuthFromBody(data)
    if (!authed) authed = await saveAuthFromCookieSession()
    if (!authed) throw new Error('Missing token/session in response.')

    await safePushByRole()
  } catch (err:any) {
    lastError.value =
      err?.data?.detail ||
      err?.data?.message ||
      err?.message ||
      'Login failed'
    // refresh health panel
    checkApiHealth()
  } finally {
    loading.value = false
    abortCtrl = null
  }
}

/* ─────────── MFA verify (optional; path shown if you later add it) ─────────── */
async function verifyOtp() {
  if (!mfa.value.code || !mfa.value.token) { mfa.value.error = 'Enter the code.'; return }
  mfa.value.error = ''
  loading.value = true
  try {
    // If/when you add the endpoint, keep it without /api:
    const data = await postJSON<any>('/auth/mfa/verify', {
      otp: mfa.value.code,
      mfa_token: mfa.value.token,
    })
    let authed = saveAuthFromBody(data)
    if (!authed) authed = await saveAuthFromCookieSession()
    if (!authed) throw new Error('Session not established after OTP.')
    await safePushByRole()
  } catch (e:any) {
    mfa.value.error = e?.data?.detail || e?.message || 'Invalid code.'
  } finally {
    loading.value = false
  }
}
function cancelMfa() { mfa.value = { required: false } }
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
