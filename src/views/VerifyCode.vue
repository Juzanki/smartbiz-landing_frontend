<!-- src/views/VerifyCode.vue -->
<template>
  <div class="page bg-dark d-flex align-items-center justify-content-center px-3">
    <div class="wrap" style="width:100%;max-width:520px">
      <!-- Logo + title -->
      <div class="text-center mb-3 mt-2">
        <img
          src="/icons/logo.png"
          alt="SmartBiz Logo"
          width="56"
          height="56"
          class="rounded-circle border border-warning shadow-sm"
          style="background:#fff;object-fit:contain"
          loading="eager" decoding="async"
        />
        <h1 class="fw-bold text-warning mt-2 h5 m-0">Enter Verification Code</h1>
        <p class="text-secondary small m-0 mt-1">
          We’ve sent a 6-digit code to <strong class="text-warning">{{ displayId }}</strong>. Enter it below to continue.
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

        <!-- OTP segmented inputs -->
        <form @submit.prevent="verifyCode" autocomplete="one-time-code" novalidate :aria-busy="loading">
          <label class="form-label text-warning small">6-digit code</label>
          <div class="otp d-flex justify-content-between gap-2 mb-2" @paste.prevent="onPaste">
            <input
              v-for="(d, i) in digits"
              :key="i"
              ref="otpRefs"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="1"
              class="otp-input"
              :aria-label="`Digit ${i+1}`"
              :disabled="loading"
              v-model="digits[i]"
              @input="onInput(i)"
              @keydown="onKeydown(i, $event)"
            />
          </div>

          <div class="mb-2" aria-live="polite">
            <div v-if="error" class="alert alert-danger py-2 px-3 mb-2">{{ error }}</div>
            <div v-if="success" class="alert alert-success py-2 px-3 mb-2">{{ success }}</div>
          </div>

          <button
            type="submit"
            class="btn btn-warning w-100 fw-bold py-2 rounded-3"
            :disabled="loading || codeValue.length !== 6"
          >
            <span v-if="!loading">Verify Code</span>
            <span v-else><span class="spinner-border spinner-border-sm me-2" />Verifying…</span>
          </button>
        </form>

        <!-- Resend -->
        <div class="text-center mt-3 small">
          <button
            class="btn btn-sm btn-outline-warning rounded-3 px-3"
            :disabled="loading || onCooldown"
            @click="resend"
          >
            <span v-if="!onCooldown">Resend Code</span>
            <span v-else>Resend in {{ cooldownLeft }}s</span>
          </button>
          <div class="text-secondary mt-2">
            Wrong contact? <router-link to="/forgot-password" class="text-warning text-decoration-underline">Change</router-link>
          </div>
        </div>
      </div>

      <div class="mt-4"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

/* ===== Backend base (NO /api) ===== */
const BACKEND_BASE =
  (import.meta.env.VITE_BACKEND_BASE as string | undefined)?.replace(/\/+$/,'') ||
  'https://smartbiz-backend-p45m.onrender.com'

/* ===== Lightweight JSON helpers (fetch) ===== */
async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_BASE}${path}`, {
    credentials: 'omit',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  })
  let data: any = null
  try { data = await res.json() } catch {}
  if (!res.ok) {
    const err: any = new Error(data?.detail || data?.message || `HTTP ${res.status}`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data as T
}
const postJSON = <T,>(path: string, body: any) =>
  jsonRequest<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

/* ─────────── State ─────────── */
const digits = ref<string[]>(['', '', '', '', '', ''])
const otpRefs = ref<HTMLInputElement[]>([])
const loading = ref(false)
const error   = ref('')
const success = ref('')
const online  = ref<boolean>(navigator.onLine)
const hint    = ref('')

/* Identifier (from previous step) */
const identifier = ref<string>(sessionStorage.getItem('reset_identifier') || '')
const displayId  = computed(() => identifier.value || 'your email/phone')

/* Cooldown for resend */
const COOLDOWN_SECONDS = 30
const cooldownUntil = ref<number>(0)
const cooldownLeft  = computed(() => Math.max(0, Math.ceil((cooldownUntil.value - Date.now()) / 1000)))
const onCooldown    = computed(() => cooldownLeft.value > 0)

/* Derived */
const codeValue = computed(() => digits.value.join(''))

/* Mount focus + hint */
onMounted(async () => {
  window.addEventListener('online',  () => (online.value = true))
  window.addEventListener('offline', () => (online.value = false))

  hint.value = `API base: ${BACKEND_BASE}`

  await nextTick()
  focusIndex(0)
})

/* ─────────── OTP input handlers ─────────── */
function focusIndex(i: number) { const el = otpRefs.value[i]; el?.focus?.(); el?.select?.() }
function onInput(i: number) {
  digits.value[i] = (digits.value[i] || '').replace(/\D/g, '').slice(0, 1)
  if (digits.value[i] && i < 5) focusIndex(i + 1)
}
function onKeydown(i: number, e: KeyboardEvent) {
  const k = e.key
  if (k === 'Backspace') {
    if (!digits.value[i] && i > 0) { digits.value[i - 1] = ''; focusIndex(i - 1); e.preventDefault() }
  } else if (k === 'ArrowLeft' && i > 0) { focusIndex(i - 1); e.preventDefault() }
  else if (k === 'ArrowRight' && i < 5) { focusIndex(i + 1); e.preventDefault() }
  else if (!/^\d$/.test(k) && k.length === 1) { e.preventDefault() }
}
function onPaste(e: ClipboardEvent) {
  const only = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6)
  for (let i = 0; i < 6; i++) digits.value[i] = only[i] || ''
  focusIndex(Math.min(5, only.length))
}

/* ─────────── Utilities ─────────── */
function parseError(e: any): string {
  if (!e?.status && /network/i.test(e?.message || '')) {
    return 'Network/CORS error. Ensure your backend allows this origin.'
  }
  return e?.data?.detail || e?.data?.message || e?.message || 'Verification failed.'
}
function buildVerifyPayload(code: string) {
  const p: any = { code }
  if (identifier.value) {
    p.identifier = identifier.value
    if (/\S+@\S+\.\S+/.test(identifier.value)) p.email = identifier.value
    if (identifier.value.startsWith('+'))      p.phone_number = identifier.value
  }
  return p
}

/* Endpoints (tuna-probe kadhaa ili tushike majina tofauti ya route) */
const VERIFY_ENDPOINTS = ['/auth/verify-code', '/api/auth/verify-code', '/api/auth/password/verify', '/api/password/verify']
const RESEND_ENDPOINTS = ['/auth/request-reset', '/api/auth/request-reset', '/api/auth/request-reset/resend', '/api/password/forgot']

/* ─────────── Actions ─────────── */
async function verifyCode() {
  if (loading.value) return
  if (!online.value) { error.value = 'You appear to be offline.'; return }
  if (codeValue.value.length !== 6) { error.value = 'Please enter the 6-digit code.'; return }

  error.value = ''; success.value = ''; loading.value = true
  const payload = buildVerifyPayload(codeValue.value)

  try {
    let data: any = null; let lastErr: any = null
    for (const url of VERIFY_ENDPOINTS) {
      try { data = await postJSON<any>(url, payload); break }
      catch (e:any) {
        lastErr = e
        const st = e?.status
        if (!st || [404, 405, 415].includes(st)) continue
        break
      }
    }
    if (!data) throw lastErr || new Error('No verification route responded.')

    const resetToken = data.reset_token || data.resetToken || data.token
    if (resetToken) sessionStorage.setItem('reset_token', String(resetToken))
    if (identifier.value) sessionStorage.setItem('reset_identifier', identifier.value)

    success.value = 'Code verified! Redirecting…'
    setTimeout(() => router.push('/reset-password'), 700)
  } catch (e:any) {
    error.value = parseError(e)
  } finally {
    loading.value = false
  }
}

async function resend() {
  if (loading.value || onCooldown.value) return
  if (!online.value) { error.value = 'You appear to be offline.'; return }
  if (!identifier.value) { error.value = 'Identifier missing. Go back and request again.'; return }

  error.value = ''; success.value = ''; loading.value = true
  const payload: any = { identifier: identifier.value }
  if (/\S+@\S+\.\S+/.test(identifier.value)) payload.email = identifier.value
  if (identifier.value.startsWith('+'))      payload.phone_number = identifier.value

  try {
    let ok = false; let lastErr: any = null
    for (const url of RESEND_ENDPOINTS) {
      try { await postJSON<any>(url, payload); ok = true; break }
      catch (e:any) {
        lastErr = e
        const st = e?.status
        if (!st || [404, 405, 415].includes(st)) continue
        break
      }
    }
    if (!ok) throw lastErr || new Error('No resend route responded.')

    success.value = 'A new code has been sent. Please check your inbox/SMS.'
    cooldownUntil.value = Date.now() + COOLDOWN_SECONDS * 1000
  } catch (e:any) {
    error.value = parseError(e)
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

.text-warning  { color: #ffd700 !important; }
.text-secondary { color: #c7d0df !important; }
.alert-dark { background: #0e1a30; }

/* OTP input styling */
.otp-input {
  width: 48px;
  height: 56px;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  background: #132441 !important;
  border: none !important;
  border-radius: .6rem;
  outline: none;
  transition: box-shadow .2s ease;
}
.otp-input:focus { box-shadow: 0 0 0 2px #ffd70099 !important; }
@media (max-width: 420px) {
  .otp-input { width: 44px; height: 52px; font-size: 1.1rem; }
}
</style>
