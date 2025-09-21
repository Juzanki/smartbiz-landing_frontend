<!-- src/views/ForgotPasswordPage.vue -->
<template>
  <div class="page bg-dark d-flex align-items-center justify-content-center px-3">
    <div class="wrap" style="width:100%;max-width:520px">
      <!-- Logo + title -->
      <div class="text-center mb-3 mt-2">
        <img
          src="/icons/logo.png"
          alt="SmartBiz Logo"
          width="56" height="56"
          class="rounded-circle border border-warning shadow-sm"
          style="background:#fff;object-fit:contain"
          loading="eager" decoding="async"
        />
        <h1 class="fw-bold text-warning mt-2 h5 m-0">Forgot Your Password?</h1>
        <p class="text-secondary small m-0 mt-1">
          Enter your email or phone — we’ll send you a reset code.
        </p>
      </div>

      <!-- Card -->
      <div class="card shadow-lg border border-warning rounded-4 p-3 p-sm-4">
        <div v-if="!online" class="alert alert-dark border border-danger text-danger small py-2 mb-3" role="alert">
          You seem to be offline. Please check your connection.
        </div>
        <div v-if="hint" class="alert alert-dark border border-warning text-warning small py-2 mb-3" role="note">
          {{ hint }}
        </div>

        <form @submit.prevent="requestReset" autocomplete="off" novalidate :aria-busy="loading">
          <!-- IDENTIFIER -->
          <div class="mb-3">
            <label for="identifier" class="form-label text-warning small">Email or Phone</label>
            <input
              id="identifier"
              ref="idInput"
              v-model.trim="identifier"
              type="text"
              class="form-control input-dark"
              placeholder="e.g. your@email.com or +255712345678"
              :aria-invalid="Boolean(error)"
              autocomplete="username"
              autocapitalize="off"
              autocorrect="off"
              inputmode="email"
              enterkeyhint="send"
              required
              @keydown.enter.prevent="requestReset()"
            />
            <small class="text-secondary d-block mt-1">
              For phone, use full international format (e.g. <span class="text-warning">+255712345678</span>).
            </small>
          </div>

          <!-- FEEDBACK -->
          <div class="mb-2" aria-live="polite">
            <div v-if="error" class="alert alert-danger py-2 px-3 mb-2">{{ error }}</div>
            <div v-if="success" class="alert alert-success py-2 px-3 mb-2">{{ success }}</div>
          </div>

          <!-- SUBMIT -->
          <button
            type="submit"
            class="btn btn-warning w-100 fw-bold py-2 rounded-3"
            :disabled="loading || !canSubmit || onCooldown"
          >
            <span v-if="!loading">Send Reset Code</span>
            <span v-else><span class="spinner-border spinner-border-sm me-2" />Sending…</span>
          </button>

          <div v-if="onCooldown" class="text-center small text-secondary mt-2">
            Please wait {{ cooldownLeft }}s before requesting again.
          </div>
        </form>

        <div class="text-center mt-3 small text-secondary">
          Remembered your password?
          <router-link to="/login" class="text-warning fw-bold text-decoration-underline ms-1">Back to Login</router-link>
        </div>
      </div>

      <div class="mt-4"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

/* ===== Backend base (NO /api) ===== */
const BACKEND_BASE =
  (import.meta.env.VITE_BACKEND_BASE as string | undefined)?.replace(/\/+$/,'') ||
  'https://smartbiz-backend-p45m.onrender.com'

/* ===== Tiny JSON helper (fetch) ===== */
async function postJSON<T>(path: string, body: any, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BACKEND_BASE}${path}`, {
    method: 'POST',
    credentials: 'omit',                        // JWT, si cookies
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  let data:any = null
  try { data = await res.json() } catch {}
  if (!res.ok) {
    const err:any = new Error(data?.detail || data?.message || `HTTP ${res.status}`)
    err.status = res.status; err.data = data; throw err
  }
  return data as T
}

/* ─────────── State ─────────── */
const identifier = ref<string>('')
const loading    = ref(false)
const error      = ref('')
const success    = ref('')
const online     = ref<boolean>(navigator.onLine)
const idInput    = ref<HTMLInputElement|null>(null)
const hint       = ref('')

/* Cooldown */
const COOLDOWN_SECONDS = 30
const cooldownUntil = ref<number>(0)
const cooldownLeft  = computed(() => Math.max(0, Math.ceil((cooldownUntil.value - Date.now()) / 1000)))
const onCooldown    = computed(() => cooldownLeft.value > 0)

/* Helpers */
const isEmail = (v:string) => /\S+@\S+\.\S+/.test(v)
const isLikelyPhone = (v:string) => /^[+0-9][0-9\s\-()]*$/.test(v)
const normalizePhone = (raw:string) => raw.replace(/[^\d+]/g, '')
const canSubmit = computed(() => identifier.value.trim().length > 2)

/* Connectivity listeners */
const _onOnline  = () => (online.value = true)
const _onOffline = () => (online.value = false)

/* Ping backend (Render cold start) */
async function wakeBackend(ms = 4000) {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), ms)
    await fetch(`${BACKEND_BASE}/health`, { credentials: 'omit', signal: ctrl.signal })
    clearTimeout(t)
  } catch { /* ignore */ }
}

onMounted(async () => {
  window.addEventListener('online', _onOnline)
  window.addEventListener('offline', _onOffline)

  await nextTick()
  idInput.value?.focus?.()

  await wakeBackend()
  hint.value = `API base: ${BACKEND_BASE}`
})

onBeforeUnmount(() => {
  window.removeEventListener('online', _onOnline)
  window.removeEventListener('offline', _onOffline)
})

/* Error parsing */
function parseError(e:any): string {
  if (!e?.status && /network/i.test(e?.message || '')) {
    return 'Network/CORS error. Ensure your backend allows this origin.'
  }
  return e?.data?.detail || e?.data?.message || e?.message || 'Failed to send reset code.'
}

/* Build payload */
function buildPayload(id: string) {
  const v = id.trim()
  if (isEmail(v)) return { email: v, identifier: v }
  if (isLikelyPhone(v)) {
    const ph = normalizePhone(v)
    if (!ph.startsWith('+')) throw new Error('Please enter phone in international format, e.g. +255712345678.')
    return { phone_number: ph, identifier: ph }
  }
  return { identifier: v }
}

/* Endpoints to try (first success wins) */
const ENDPOINTS = [
  '/auth/request-reset',
  '/api/auth/request-reset',
  '/api/auth/password/forgot',
  '/api/auth/forgot-password',
  '/api/password/forgot',
]

/* Main action */
let abortCtrl: AbortController | null = null
async function requestReset() {
  if (loading.value || !canSubmit.value || onCooldown.value) return
  if (!online.value) { error.value = 'You appear to be offline.'; return }

  error.value = ''; success.value = ''; loading.value = true
  if (abortCtrl) abortCtrl.abort()
  abortCtrl = new AbortController()

  let payload: any
  try {
    payload = buildPayload(identifier.value)
  } catch (e:any) {
    error.value = e?.message || 'Please enter a valid email or phone in +CCC... format.'
    loading.value = false
    abortCtrl = null
    return
  }

  try {
    let sent = false
    let lastErr: any = null
    for (const p of ENDPOINTS) {
      try {
        await postJSON<any>(p, payload, abortCtrl.signal)
        sent = true
        break
      } catch (e:any) {
        lastErr = e
        const st = e?.status
        if (!st || [404, 405, 415].includes(st)) continue  // jaribu endpoint nyingine
        break                                              // kosa la validation/server: usiendelee
      }
    }
    if (!sent) throw lastErr || new Error('No reset route responded.')

    sessionStorage.setItem('reset_identifier', String(payload.email || payload.phone_number || payload.identifier))
    success.value = 'Reset code sent successfully! Check your email or SMS.'
    cooldownUntil.value = Date.now() + COOLDOWN_SECONDS * 1000
    setTimeout(() => router.push('/verify-code'), 800)
  } catch (e:any) {
    error.value = parseError(e)
  } finally {
    loading.value = false
    abortCtrl = null
  }
}
</script>

<!-- Global page bg -->
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

input.form-control {
  background: #132441 !important;
  color: #fff !important;
  border: none !important;
  border-radius: .5rem;
  padding: .65rem .85rem;
  font-size: .95rem;
  transition: box-shadow .25s ease;
}
input.form-control::placeholder { color: #b9c3d3 !important; opacity: .9; }
input:focus { outline: none !important; box-shadow: 0 0 0 2px #ffd70099 !important; }

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
.text-secondary { color: #c7d0df !important; }
.alert-dark { background: #0e1a30; }
</style>
