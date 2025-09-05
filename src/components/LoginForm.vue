<template>
  <main
    class="min-h-[100svh] px-4 py-10 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-[#0b1020] dark:to-[#0b1020]"
    :style="safeArea"
  >
    <section
      class="mx-auto w-full max-w-md rounded-2xl border border-black/10 dark:border-white/10
             bg-white/90 dark:bg-white/5 backdrop-blur-xl shadow-2xl p-6 sm:p-8 space-y-6"
    >
      <!-- Logo -->
      <div class="flex items-center justify-center gap-3">
        <img
          src="@/assets/logo.svg"
          alt="SmartBiz Logo"
          class="h-14 w-14 rounded-full shadow ring-1 ring-black/10 dark:ring-white/20"
          @error="onImgErr"
        />
        <div class="text-center">
          <h1 class="text-xl font-extrabold text-slate-900 dark:text-white">SmartBiz</h1>
          <p class="text-[12px] text-slate-500 dark:text-slate-300">Welcome back 👋</p>
        </div>
      </div>

      <!-- Offline banner -->
      <transition name="fade">
        <div
          v-if="!online"
          class="rounded-xl px-3 py-2 text-[12px] bg-amber-500/15 border border-amber-400/40 text-amber-800 dark:text-amber-200"
        >
          ⚠️ You’re offline. We’ll retry when you’re back online.
        </div>
      </transition>

      <!-- Error banner -->
      <transition name="fade">
        <div
          v-if="errorMsg"
          class="rounded-xl px-3 py-2 text-[12px] bg-rose-500/15 border border-rose-400/40 text-rose-800 dark:text-rose-200"
          aria-live="polite"
        >
          {{ errorMsg }}
        </div>
      </transition>

      <!-- STEP: LOGIN -->
      <form
        v-if="step==='login'"
        @submit.prevent="handleLogin"
        class="space-y-4"
        novalidate
      >
        <!-- Identifier -->
        <label class="block">
          <span class="sr-only">Email / Phone / Username</span>
          <input
            ref="idInput"
            v-model.trim="form.identifier"
            type="text"
            inputmode="email"
            autocomplete="username"
            autocapitalize="none"
            autocorrect="off"
            placeholder="👤 Email / Phone / Username"
            class="input-field"
            required
          />
        </label>

        <!-- Password with show/hide & CapsLock -->
        <div class="relative">
          <label class="block">
            <span class="sr-only">Password</span>
            <input
              ref="pwInput"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="🔒 Password"
              class="input-field pr-12"
              required
              @keydown="checkCaps"
            />
          </label>
          <button
            type="button"
            class="abs-btn right-2"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            @click="toggleShow"
          >
            {{ showPassword ? '🙈' : '👁️' }}
          </button>
          <span v-if="capsOn" class="abs-hint right-10">⇪</span>
        </div>

        <!-- Remember + Forgot -->
        <div class="flex items-center justify-between text-[12px]">
          <label class="inline-flex items-center gap-2 select-none">
            <input type="checkbox" v-model="remember" class="h-4 w-4 rounded border-slate-300" />
            <span class="text-slate-600 dark:text-slate-300">Remember me</span>
          </label>
          <router-link to="/forgot-password" class="link">Forgot password?</router-link>
        </div>

        <!-- Submit -->
        <button
          type="submit"
          class="btn-primary w-full"
          :disabled="loading || !form.identifier || !form.password"
        >
          <span v-if="!loading">Log in</span>
          <span v-else class="inline-flex items-center gap-2">
            <span class="spinner"></span> Signing you in…
          </span>
        </button>

        <!-- Divider -->
        <div class="flex items-center gap-3 text-[12px] text-slate-500 dark:text-slate-400">
          <div class="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
          <span>or</span>
          <div class="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
        </div>

        <!-- Passkey + Social placeholders -->
        <div class="grid grid-cols-3 gap-2">
          <button type="button" class="btn-soft" @click="loginWithPasskey">🔑 Passkey</button>
          <button type="button" class="btn-soft" @click="loginWith('google')">ⓖ Google</button>
          <button type="button" class="btn-soft" @click="loginWith('apple')"> Apple</button>
        </div>

        <!-- Signup prompt -->
        <p class="text-center text-[12px] text-slate-600 dark:text-slate-300">
          Don’t have an account?
          <router-link to="/signup" class="link font-semibold">Sign up</router-link>
        </p>
      </form>

      <!-- STEP: MFA (OTP) -->
      <form
        v-else-if="step==='mfa'"
        @submit.prevent="verifyOtp"
        class="space-y-4"
      >
        <div class="text-center space-y-1">
          <h2 class="text-base font-bold">Two-step verification</h2>
          <p class="text-[12px] text-slate-600 dark:text-slate-300">
            Enter the 6-digit code we sent to your device.
          </p>
        </div>

        <!-- OTP inputs -->
        <div class="flex items-center justify-center gap-2">
          <input
            v-for="(d,i) in otp"
            :key="i"
            ref="otpInputs"
            v-model="otp[i]"
            class="otp-cell"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="1"
            autocomplete="one-time-code"
            @input="onOtpInput(i)"
            @keydown.backspace.prevent="onOtpBackspace(i)"
            @paste.prevent="onOtpPaste"
          />
        </div>

        <button type="submit" class="btn-primary w-full" :disabled="loading || otp.join('').length<6">
          <span v-if="!loading">Verify</span>
          <span v-else class="inline-flex items-center gap-2"><span class="spinner"></span> Verifying…</span>
        </button>

        <div class="text-center text-[12px] text-slate-500 dark:text-slate-400">
          <button
            type="button"
            class="link"
            :disabled="resendCooldown>0 || loading"
            @click="resendOtp"
          >
            Resend code <span v-if="resendCooldown>0">({{ resendCooldown }}s)</span>
          </button>
        </div>

        <button type="button" class="btn-soft w-full" @click="backToLogin">← Back</button>
      </form>
    </section>
  </main>
</template>

<script setup>
import axios from 'axios'
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'

/** Router */
const router = useRouter()

/** Safe-area */
const safeArea = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }

/** State */
const step = ref('login') // 'login' | 'mfa'
const loading = ref(false)
const errorMsg = ref('')
const online = ref(navigator.onLine)

const form = reactive({
  identifier: '',
  password: '',
})
const remember = ref(true)
const showPassword = ref(false)
const capsOn = ref(false)

const idInput = ref(null)
const pwInput = ref(null)

/** MFA */
const tempToken = ref('') // from /auth/login when mfa_required
const otp = ref(['','','','','',''])
const otpInputs = ref([])   // array of refs
const resendCooldown = ref(0)
let cooldownTimer = null

/** Helpers */
function onImgErr(e){ e.target.style.opacity = .7 }
function toggleShow(){ showPassword.value = !showPassword.value }
function checkCaps(ev){ capsOn.value = ev.getModifierState && ev.getModifierState('CapsLock') }

/** NET */
window.addEventListener('online',  () => online.value = true)
window.addEventListener('offline', () => online.value = false)

/** Focus */
onMounted(() => { nextTick(() => idInput.value?.focus?.()) })

/** Login */
async function handleLogin(){
  errorMsg.value = ''
  if (!online.value) {
    errorMsg.value = 'No internet connection.'
    return
  }
  loading.value = true
  try {
    const res = await axios.post('/auth/login', {
      identifier: form.identifier,
      password: form.password,
      remember: remember.value,
      // You may include a device fingerprint here if needed
    })

    if (res.data?.mfa_required) {
      tempToken.value = res.data.temp_token
      step.value = 'mfa'
      await nextTick()
      otpInputs.value?.[0]?.focus?.()
      startCooldown(30)
    } else {
      await onAuthSuccess(res.data)
    }
  } catch (err) {
    const status = err?.response?.status
    if (status === 401) errorMsg.value = 'Invalid credentials. Check and try again.'
    else if (status === 429) errorMsg.value = 'Too many attempts. Please wait a moment.'
    else errorMsg.value = err?.response?.data?.detail || 'Login failed. Try again.'
    console.error(err)
  } finally {
    loading.value = false
  }
}

/** OTP handlers */
function onOtpInput(i){
  // Only digits
  otp.value[i] = otp.value[i].replace(/\D/g,'').slice(0,1)
  if (otp.value[i] && i < 5) otpInputs.value[i+1]?.focus?.()
}
function onOtpBackspace(i){
  if (otp.value[i]) { otp.value[i]=''; return }
  if (i>0){ otpInputs.value[i-1]?.focus?.(); otp.value[i-1]='' }
}
function onOtpPaste(e){
  const raw = (e.clipboardData?.getData('text') || '').replace(/\D/g,'').slice(0,6)
  if (!raw) return
  for (let i=0; i<6; i++) otp.value[i] = raw[i] || ''
  otpInputs.value[5]?.focus?.()
}
async function verifyOtp(){
  errorMsg.value = ''
  loading.value = true
  try {
    const code = otp.value.join('')
    const res = await axios.post('/auth/mfa/verify', { code, temp_token: tempToken.value })
    await onAuthSuccess(res.data)
  } catch (err) {
    errorMsg.value = err?.response?.data?.detail || 'Invalid code. Please try again.'
  } finally {
    loading.value = false
  }
}
async function resendOtp(){
  try {
    await axios.post('/auth/mfa/resend', { temp_token: tempToken.value })
    startCooldown(30)
  } catch {
    // Silent
  }
}
function startCooldown(sec){
  resendCooldown.value = sec
  clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    resendCooldown.value -= 1
    if (resendCooldown.value <= 0) clearInterval(cooldownTimer)
  }, 1000)
}
function backToLogin(){
  step.value = 'login'
  otp.value = ['','','','','','']
  tempToken.value = ''
  nextTick(() => idInput.value?.focus?.())
}

/** Auth success */
async function onAuthSuccess(payload){
  // NOTE: Prefer HTTPOnly secure cookies on backend for production.
  localStorage.setItem('access_token', payload.access_token)
  const user = payload.user || {}
  localStorage.setItem('user_role', user.role || 'user')
  localStorage.setItem('user_lang', user.language || 'en')

  // Optional: set app locale if using vue-i18n globally
  try { if (typeof window !== 'undefined' && window?.$i18n) window.$i18n.locale = user.language || 'en' } catch {}

  // Redirect by role
  const role = (user.role || 'user').toLowerCase()
  if (role === 'admin') router.push('/dashboard/admin')
  else if (role === 'owner') router.push('/dashboard/owner')
  else router.push('/dashboard')
}

/** Social/Passkey placeholders */
async function loginWith(provider){
  // Redirect to your OAuth endpoint
  window.location.href = `/auth/oauth/${provider}`
}
async function loginWithPasskey(){
  // Placeholder: coordinate with backend
  try {
    // 1) start: const options = (await axios.get('/auth/passkey/start')).data
    // 2) const cred = await navigator.credentials.get({ publicKey: options })
    // 3) finish: await axios.post('/auth/passkey/finish', { cred })
    // 4) onAuthSuccess(...)
    alert('Passkey flow requires backend endpoints. Wire /auth/passkey/start & /finish.')
  } catch (e) {
    errorMsg.value = 'Passkey sign-in failed. Try another method.'
  }
}
</script>

<style scoped>
/* Inputs */
.input-field {
  @apply w-full h-12 px-4 rounded-xl border text-sm
         border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500
         dark:bg-white/10 dark:text-white dark:border-white/10;
}

/* Absolute helpers on password field */
.abs-btn {
  @apply absolute top-1/2 -translate-y-1/2 h-9 w-9 grid place-items-center rounded-full
         bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10;
}
.abs-hint {
  @apply absolute top-1/2 -translate-y-1/2 text-xs text-amber-600 dark:text-amber-300;
}

/* Buttons */
.btn-primary {
  @apply inline-flex items-center justify-center gap-2 rounded-xl font-semibold
         bg-gradient-to-b from-indigo-600 to-violet-700 text-white
         border border-white/10 shadow-lg h-12 active:translate-y-[1px];
}
.btn-soft {
  @apply h-11 rounded-xl border border-black/10 dark:border-white/10
         bg-white/70 dark:bg-white/10 text-slate-800 dark:text-white
         active:translate-y-[1px];
}

/* Links */
.link {
  @apply text-indigo-600 hover:underline dark:text-indigo-300;
}

/* OTP */
.otp-cell {
  @apply w-10 h-12 text-center text-lg font-bold rounded-xl border
         border-slate-300 dark:border-white/10 bg-white dark:bg-white/10
         focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white;
}

/* Spinner */
.spinner {
  width: 16px; height: 16px; border-radius: 9999px;
  border: 2px solid rgba(255,255,255,.4); border-top-color: #fff;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }

/* Fade */
.fade-enter-active,.fade-leave-active { transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to { opacity: 0 }
</style>
