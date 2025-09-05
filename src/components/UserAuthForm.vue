<template>
  <section class="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-white to-gray-50 dark:from-[#0b0b10] dark:to-black">
    <div class="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0b0b10] shadow-xl border border-black/5 dark:border-white/10 p-5 sm:p-6">
      <!-- Title -->
      <header class="mb-4">
        <h2 class="text-xl sm:text-2xl font-bold text-blue-900 dark:text-white">{{ isLogin ? 'Login' : 'Create account' }}</h2>
        <p class="text-xs text-gray-500 dark:text-white/60">Secure sign in to SmartBiz</p>
      </header>

      <!-- Form -->
      <form @submit.prevent="onSubmit" novalidate class="space-y-3">
        <!-- Name (register only) -->
        <div v-if="!isLogin" class="space-y-1.5">
          <label for="name" class="text-sm text-gray-700 dark:text-white/80">Full name</label>
          <input
            id="name"
            v-model.trim="name"
            type="text"
            autocomplete="name"
            inputmode="text"
            class="auth-input"
            :aria-invalid="Boolean(errors.name)"
            :aria-describedby="errors.name ? 'name-err' : undefined"
            placeholder="e.g., Aisha Mwenda"
          />
          <p v-if="errors.name" id="name-err" class="auth-error">{{ errors.name }}</p>
        </div>

        <!-- Email -->
        <div class="space-y-1.5">
          <label for="email" class="text-sm text-gray-700 dark:text-white/80">Email</label>
          <input
            id="email"
            v-model.trim="email"
            type="email"
            autocomplete="email"
            inputmode="email"
            class="auth-input"
            :aria-invalid="Boolean(errors.email)"
            :aria-describedby="errors.email ? 'email-err' : undefined"
            placeholder="you@example.com"
          />
          <p v-if="errors.email" id="email-err" class="auth-error">{{ errors.email }}</p>
        </div>

        <!-- Password -->
        <div class="space-y-1.5">
          <label for="password" class="text-sm text-gray-700 dark:text-white/80">Password</label>
          <div class="relative">
            <input
              :type="showPwd ? 'text' : 'password'"
              id="password"
              v-model="password"
              autocomplete="current-password"
              class="auth-input pr-10"
              :aria-invalid="Boolean(errors.password)"
              :aria-describedby="errors.password ? 'pwd-err' : undefined"
              placeholder="••••••••"
            />
            <button type="button" class="eye-btn" @click="showPwd = !showPwd" :aria-label="showPwd ? 'Hide password' : 'Show password'">
              {{ showPwd ? '🙈' : '👁️' }}
            </button>
          </div>
          <p v-if="errors.password" id="pwd-err" class="auth-error">{{ errors.password }}</p>

          <!-- Strength meter (register only) -->
          <div v-if="!isLogin" class="mt-1">
            <div class="h-1.5 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div class="h-full transition-all"
                   :class="strengthColor"
                   :style="{ width: strengthWidth }"></div>
            </div>
            <div class="flex justify-between text-[11px] mt-1 text-gray-500 dark:text-white/60">
              <span>Password strength: <strong>{{ strengthLabel }}</strong></span>
              <span>Min 8 chars</span>
            </div>
          </div>
        </div>

        <!-- Confirm password (register only) -->
        <div v-if="!isLogin" class="space-y-1.5">
          <label for="confirm" class="text-sm text-gray-700 dark:text-white/80">Confirm password</label>
          <div class="relative">
            <input
              :type="showConfirm ? 'text' : 'password'"
              id="confirm"
              v-model="confirm"
              autocomplete="new-password"
              class="auth-input pr-10"
              :aria-invalid="Boolean(errors.confirm)"
              :aria-describedby="errors.confirm ? 'confirm-err' : undefined"
              placeholder="Repeat password"
            />
            <button type="button" class="eye-btn" @click="showConfirm = !showConfirm" :aria-label="showConfirm ? 'Hide password' : 'Show password'">
              {{ showConfirm ? '🙈' : '👁️' }}
            </button>
          </div>
          <p v-if="errors.confirm" id="confirm-err" class="auth-error">{{ errors.confirm }}</p>
        </div>

        <!-- Extras row -->
        <div class="flex items-center justify-between">
          <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-white/80">
            <input type="checkbox" v-model="remember" class="accent-blue-700" />
            Remember me
          </label>
          <button type="button" class="text-sm text-blue-700 dark:text-blue-300 hover:underline" @click="$emit('forgot')">
            Forgot password?
          </button>
        </div>

        <!-- Terms (register only) -->
        <label v-if="!isLogin" class="flex items-start gap-2 text-xs text-gray-600 dark:text-white/70">
          <input type="checkbox" v-model="agree" class="mt-0.5 accent-blue-700" />
          I agree to the <a href="#" class="underline hover:no-underline">Terms</a> and <a href="#" class="underline hover:no-underline">Privacy Policy</a>.
        </label>
        <p v-if="!isLogin && errors.agree" class="auth-error -mt-1">{{ errors.agree }}</p>

        <!-- Submit -->
        <button
          type="submit"
          class="w-full h-11 rounded-xl bg-blue-700 text-white font-medium active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canSubmit || loading"
        >
          <span v-if="!loading">{{ isLogin ? 'Login' : 'Create account' }}</span>
          <span v-else class="inline-flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6V2z"/></svg>
            Processing…
          </span>
        </button>
      </form>

      <!-- Toggle -->
      <p class="text-center mt-3 text-sm">
        <button class="text-blue-700 dark:text-blue-300 hover:underline" @click="toggleMode">
          {{ isLogin ? "Don't have an account? Register" : "Already have an account? Login" }}
        </button>
      </p>

      <!-- Optional: OAuth (slot) -->
      <slot name="oauth"></slot>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

const emit = defineEmits<{
  (e: 'submit', payload: { mode: 'login'|'register'; email: string; password: string; name?: string; remember: boolean }): void
  (e: 'forgot'): void
  (e: 'mode-change', mode: 'login'|'register'): void
}>()

const props = defineProps<{
  initialMode?: 'login'|'register'
}>()

const isLogin = ref(props.initialMode ?? 'login' === 'login')
const name = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const remember = ref(true)
const agree = ref(false)
const showPwd = ref(false)
const showConfirm = ref(false)
const loading = ref(false)

const errors = reactive<{ [k: string]: string | null }>({
  name: null, email: null, password: null, confirm: null, agree: null
})

watch([email, password, confirm, name, agree, isLogin], () => validateAll(), { immediate: true })

function validateAll() {
  errors.name = !isLogin.value && name.value.trim().length < 2 ? 'Enter your full name' : null
  errors.email = validEmail(email.value) ? null : 'Enter a valid email'
  errors.password = validPassword(password.value) ? null : 'Min 8 chars incl. upper, lower & number'
  errors.confirm = !isLogin.value && password.value !== confirm.value ? 'Passwords do not match' : null
  errors.agree = !isLogin.value && !agree.value ? 'You must agree to continue' : null
}

const canSubmit = computed(() => {
  const base = !errors.email && !errors.password
  if (isLogin.value) return base
  return base && !errors.name && !errors.confirm && !errors.agree
})

function validEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}
function validPassword(v: string) {
  if (v.length < 8) return false
  const hasU = /[A-Z]/.test(v)
  const hasL = /[a-z]/.test(v)
  const hasN = /[0-9]/.test(v)
  return hasU && hasL && hasN
}

/* Password strength (register) */
const strength = computed(() => {
  let s = 0
  if (password.value.length >= 8) s++
  if (/[A-Z]/.test(password.value)) s++
  if (/[a-z]/.test(password.value)) s++
  if (/[0-9]/.test(password.value)) s++
  if (/[^A-Za-z0-9]/.test(password.value)) s++
  return Math.min(5, s)
})
const strengthLabel = computed(() => ['Very weak','Weak','Fair','Good','Strong'][Math.max(0, strength.value-1)] || 'Very weak')
const strengthWidth = computed(() => `${(strength.value/5)*100}%`)
const strengthColor = computed(() => {
  return [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-emerald-600'
  ][Math.max(0, strength.value-1)]
})

async function onSubmit() {
  validateAll()
  if (!canSubmit.value) return
  loading.value = true
  try {
    // Emit upwards so parent can call real API
    emit('submit', { mode: isLogin.value ? 'login' : 'register', email: email.value.trim(), password: password.value, name: name.value.trim(), remember: remember.value })

    // Demo: slight delay to show loading
    await new Promise(r => setTimeout(r, 600))

    // Clear confirm on success in register
    if (!isLogin.value) confirm.value = ''
  } catch (e) {
    // You can set field or global errors here
    console.error(e)
  } finally {
    loading.value = false
  }
}

function toggleMode() {
  isLogin.value = !isLogin.value
  emit('mode-change', isLogin.value ? 'login' : 'register')
}
</script>

<style scoped>
.auth-input {
  @apply w-full h-11 rounded-xl px-3 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white
         border border-gray-200 dark:border-white/10 outline-none
         focus:ring-2 ring-blue-600/60 placeholder:text-gray-400;
}
.auth-error { @apply text-xs text-red-600 dark:text-red-400; }
.eye-btn {
  @apply absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg
         text-gray-600 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10;
}

/* Mobile polish */
@supports (padding: max(0px)) {
  section { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
}
</style>
