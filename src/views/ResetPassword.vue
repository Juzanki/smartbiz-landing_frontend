<!-- src/views/ResetPassword.vue -->
<template>
  <div class="page bg-dark d-flex align-items-center justify-content-center px-3">
    <div class="wrap" style="width:100%;max-width:520px">
      <!-- Logo + title (kama login/signup) -->
      <div class="text-center mb-3 mt-2">
        <img
          src="/icons/logo.png"
          alt="SmartBiz Logo"
          width="56"
          height="56"
          class="rounded-circle border border-warning shadow-sm"
          style="background:#fff;object-fit:contain"
          loading="eager"
          decoding="async"
        />
        <h1 class="fw-bold text-warning mt-2 h5 m-0">Reset Your Password</h1>
        <p class="text-secondary small m-0 mt-1">
          Choose a strong password for <strong class="text-warning">{{ maskedIdentifier }}</strong>.
        </p>
      </div>

      <!-- Card -->
      <div class="card shadow-lg border border-warning rounded-4 p-3 p-sm-4">
        <!-- Offline / missing token / API hint -->
        <div v-if="!online" class="alert alert-dark border border-danger text-danger small py-2 mb-3" role="alert">
          You seem to be offline. Please check your connection.
        </div>
        <div v-if="!resetToken" class="alert alert-dark border border-warning text-warning small py-2 mb-3" role="alert">
          Reset session not found. <router-link to="/forgot-password" class="text-warning text-decoration-underline">Start again</router-link>.
        </div>
        <div v-if="hint" class="alert alert-dark border border-warning text-warning small py-2 mb-3" role="note">
          {{ hint }}
        </div>

        <form @submit.prevent="resetPassword" autocomplete="off" novalidate :aria-busy="loading">
          <!-- New password -->
          <div class="mb-2">
            <label for="pwd" class="form-label text-warning small">New Password</label>
            <div class="input-group group-dark rounded-3 overflow-hidden">
              <span class="input-group-text border-0"><i class="bi bi-shield-lock" aria-hidden="true"></i></span>
              <input
                :type="showPwd ? 'text' : 'password'"
                id="pwd"
                v-model="password"
                class="form-control border-0"
                placeholder="Strong password"
                minlength="8"
                autocomplete="new-password"
                @keyup="onPwdKey"
                @blur="capsOn = false"
                :aria-invalid="password && !isStrongPassword(password)"
                required
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
              <small v-if="password" class="d-block mt-1" :class="isStrongPassword(password) ? 'text-success' : 'text-danger'">
                {{ strength.label }}
              </small>
            </div>

            <!-- Requirements -->
            <ul class="req mt-2">
              <li :class="hasLen">8+ characters</li>
              <li :class="hasUpper">Uppercase letter</li>
              <li :class="hasLower">Lowercase letter</li>
              <li :class="hasDigit">Number</li>
              <li :class="hasSymbol">Symbol</li>
            </ul>

            <!-- CapsLock notice -->
            <div v-if="capsOn" class="small text-warning mt-1" role="alert" aria-live="polite">
              <i class="bi bi-exclamation-triangle-fill me-1"></i> Caps Lock is ON
            </div>
          </div>

          <!-- Confirm -->
          <div class="mb-2">
            <label for="pwd2" class="form-label text-warning small">Confirm Password</label>
            <div class="input-group group-dark rounded-3 overflow-hidden">
              <span class="input-group-text border-0"><i class="bi bi-lock-fill" aria-hidden="true"></i></span>
              <input
                :type="showConfirm ? 'text' : 'password'"
                id="pwd2"
                v-model="confirmPassword"
                class="form-control border-0"
                placeholder="Repeat password"
                minlength="8"
                autocomplete="new-password"
                required
              />
              <button
                class="btn btn-outline-warning btn-toggle"
                type="button"
                :aria-pressed="showConfirm"
                :title="showConfirm ? 'Hide password' : 'Show password'"
                @click="showConfirm = !showConfirm"
                :disabled="loading"
              >
                <i :class="showConfirm ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>
            <small v-if="confirmPassword && !matches" class="text-danger d-block mt-1">Passwords do not match.</small>
          </div>

          <!-- Feedback -->
          <div class="mb-2" aria-live="polite">
            <div v-if="error" class="alert alert-danger py-2 px-3 mb-2">{{ error }}</div>
            <div v-if="success" class="alert alert-success py-2 px-3 mb-2">{{ success }}</div>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            class="btn btn-warning w-100 fw-bold py-2 rounded-3"
            :disabled="loading || !resetToken || !canSubmit"
          >
            <span v-if="!loading">Reset Password</span>
            <span v-else><span class="spinner-border spinner-border-sm me-2" />Resetting…</span>
          </button>

          <div class="text-center mt-3 small text-secondary">
            Already know your password?
            <router-link to="/login" class="text-warning fw-bold text-decoration-underline ms-1">Back to Login</router-link>
          </div>
        </form>
      </div>

      <div class="mt-4"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, API_ROOT_URL } from '@/lib/api' // axios instance (withCredentials on)

const router = useRouter()

/* ─────────── State ─────────── */
const password        = ref<string>('')
const confirmPassword = ref<string>('')
const showPwd         = ref<boolean>(false)
const showConfirm     = ref<boolean>(false)
const capsOn          = ref<boolean>(false)
const loading         = ref<boolean>(false)
const error           = ref<string>('')
const success         = ref<string>('')
const online          = ref<boolean>(navigator.onLine)
const hint            = ref<string>('')

/* Identifier for display (from Forgot → Verify) */
const identifier   = ref<string>(sessionStorage.getItem('reset_identifier') || '')
const maskedIdentifier = computed(() => {
  const id = identifier.value
  if (!id) return 'your account'
  if (id.includes('@')) {
    const [u, d] = id.split('@')
    return `${u.slice(0,2)}***@${d}`
  }
  if (id.startsWith('+')) return `${id.slice(0,4)}****${id.slice(-2)}`
  return id
})

/* Token handling (URL ?token=... preferred; else storage) */
function getResetToken(): string {
  const urlToken = new URLSearchParams(location.search).get('token')
  const store    = sessionStorage.getItem('reset_token') || localStorage.getItem('reset_token')
  return urlToken || store || ''
}
const resetToken = ref<string>(getResetToken())

/* Connectivity */
window.addEventListener('online',  () => (online.value = true))
window.addEventListener('offline', () => (online.value = false))

onMounted(() => {
  hint.value = `API base: ${API_ROOT_URL.replace(/\/+$/, '')}`
})

/* ─────────── Validation & strength ─────────── */
const reUpper  = /[A-Z]/
const reLower  = /[a-z]/
const reDigit  = /\d/
const reSymbol = /[^\w\s]/

function isStrongPassword(p: string) {
  return p.length >= 8 && reUpper.test(p) && reLower.test(p) && reDigit.test(p) && reSymbol.test(p)
}

const hasLen    = computed(() => ({ ok: password.value.length >= 8 }))
const hasUpper  = computed(() => ({ ok: reUpper.test(password.value) }))
const hasLower  = computed(() => ({ ok: reLower.test(password.value) }))
const hasDigit  = computed(() => ({ ok: reDigit.test(password.value) }))
const hasSymbol = computed(() => ({ ok: reSymbol.test(password.value) }))

const matches   = computed(() => !!password.value && password.value === confirmPassword.value)
const canSubmit = computed(() => isStrongPassword(password.value) && matches.value)

const strength = computed(() => {
  const p = password.value || ''
  let s = 0
  if (p.length >= 8) s++
  if (reUpper.test(p)) s++
  if (reLower.test(p)) s++
  if (reDigit.test(p)) s++
  if (reSymbol.test(p)) s++
  const map = [
    { label: 'Too weak', percent: 15,  barClass: 'bg-danger'  },
    { label: 'Weak',     percent: 35,  barClass: 'bg-danger'  },
    { label: 'Fair',     percent: 55,  barClass: 'bg-warning' },
    { label: 'Good',     percent: 75,  barClass: 'bg-info'    },
    { label: 'Strong',   percent: 100, barClass: 'bg-success' },
  ]
  return map[Math.max(0, Math.min(s - 1, 4))]
})

function onPwdKey(e: KeyboardEvent) {
  try { capsOn.value = !!(e.getModifierState && e.getModifierState('CapsLock')) } catch { capsOn.value = false }
}

/* ─────────── Networking helpers ─────────── */
function parseError(e: any): string {
  const r = e?.response, d = r?.data
  if (!r && e?.message?.toLowerCase?.().includes('network')) {
    return 'Network/CORS error. Ensure your backend allows this origin.'
  }
  return d?.detail || d?.message || e?.message || 'Failed to reset password.'
}

const ENDPOINTS = [
  '/api/auth/reset-password',
  '/api/auth/password/reset',
  '/api/password/reset',
  '/auth/reset-password',
]

/* ─────────── Submit ─────────── */
async function resetPassword() {
  if (loading.value || !resetToken.value) return
  if (!online.value) { error.value = 'You appear to be offline.'; return }
  if (!canSubmit.value) {
    error.value = 'Please meet all password requirements and ensure the passwords match.'
    return
  }

  error.value = ''; success.value = ''; loading.value = true

  // Build payload variants for different backends
  const payloads: any[] = [
    { token: resetToken.value, new_password: password.value, confirm_password: confirmPassword.value },
    { reset_token: resetToken.value, password: password.value, password_confirm: confirmPassword.value },
    { token: resetToken.value, password: password.value },
  ]
  // Include identifier if present (some backends require it)
  if (identifier.value) {
    for (const p of payloads) {
      p.identifier = identifier.value
      if (/\S+@\S+\.\S+/.test(identifier.value)) p.email = identifier.value
      if (identifier.value.startsWith('+')) p.phone_number = identifier.value
    }
  }

  try {
    let ok = false
    let lastErr: any = null
    // Try endpoints × payloads
    for (const url of ENDPOINTS) {
      for (const body of payloads) {
        try {
          const res = await api.post(url, body, { timeout: 15000 })
          if (res.status === 200 || res.status === 204) {
            ok = true
            break
          }
          ok = true
          break
        } catch (e:any) {
          lastErr = e
          const st = e?.response?.status
          // try next endpoint for 404/405/415; break for validation/server errors
          if (st && ![404, 405, 415].includes(st)) break
        }
      }
      if (ok) break
    }
    if (!ok) throw lastErr || new Error('No reset route responded.')

    // Cleanup token + state
    sessionStorage.removeItem('reset_token')
    localStorage.removeItem('reset_token')
    sessionStorage.removeItem('reset_identifier')

    success.value = 'Password has been reset successfully! Redirecting…'
    setTimeout(() => router.push('/login'), 900)
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

.text-warning { color: #ffd700 !important; }
.text-secondary { color: #c7d0df !important; }
.alert-dark { background: #0e1a30; }

/* Strength bar + req list */
.progress.strength { height: 6px; background: #132441; }
.progress-bar.bg-danger  { background:#ff6b6b !important; }
.progress-bar.bg-warning { background:#ffd166 !important; }
.progress-bar.bg-info    { background:#4dabf7 !important; }
.progress-bar.bg-success { background:#51cf66 !important; }

.req { list-style: none; padding-left: 0; margin: .4rem 0 0; display: grid; grid-template-columns: 1fr 1fr; gap: .25rem .75rem; }
.req li { font-size: .8rem; color: #b9c3d3; }
.req li.ok { color: #51cf66; }
.req li::before { content: "• "; color: #b9c3d3; }
.req li.ok::before { content: "✓ "; color: #51cf66; }
</style>
