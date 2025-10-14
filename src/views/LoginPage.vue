<!-- src/views/LoginPage.vue -->  <template>  
  <div class="page bg-dark center px-3">  
    <div  
      class="auth-card card"  
      role="dialog"  
      aria-labelledby="loginTitle"  
      aria-describedby="loginDesc"  
    >  
      <!-- Logo + title -->  
      <div class="txt-center mb-3 mt-1">  
        <img  
          src="/icons/logo.png"  
          alt="SmartBiz Logo"  
          class="logo"  
          width="56"  
          height="56"  
          loading="eager"  
          decoding="async"  
        />  
        <h1 id="loginTitle" class="title">Login to SmartBiz</h1>  
        <p id="loginDesc" class="muted">  
          Welcome back — please sign in to continue.  
        </p>  
      </div>  <hr class="rule" />  

  <!-- Backend status -->  
  <div  
    v-if="apiStatus !== 'ok'"  
    class="alert alert-dark"  
    role="alert"  
    aria-live="polite"  
  >  
    <template v-if="apiStatus === 'checking'">  
      Checking server availability…  
    </template>  
    <template v-else-if="apiStatus === 'down'">  
      Server unreachable. Ensure backend is running at  
      <code class="code">{{ BACKEND_BASE }}</code>.  
    </template>  
    <template v-else-if="apiStatus === 'cors'">  
      Network/CORS error. Allow origin  
      <code class="code">{{ origin }}</code> on the backend.  
    </template>  
  </div>  

  <!-- Form -->  
  <form @submit.prevent="handleLogin" autocomplete="off" novalidate :aria-busy="loading">  
    <!-- Email -->  
    <label class="label">Email</label>  
    <div class="field">  
      <span class="addon" aria-hidden="true">✉️</span>  
      <input  
        ref="emailInput"  
        v-model.trim="form.email"  
        type="email"  
        class="input"  
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
    <label class="label">Password</label>  
    <div class="field">  
      <span class="addon" aria-hidden="true">🔒</span>  
      <input  
        :type="showPwd ? 'text' : 'password'"  
        v-model="form.password"  
        class="input"  
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
        class="btn btn-outline btn-toggle"  
        type="button"  
        :aria-pressed="showPwd"  
        :title="showPwd ? 'Hide password' : 'Show password'"  
        @click="showPwd = !showPwd"  
        :disabled="loading"  
      >{{ showPwd ? '🙈' : '👁️' }}</button>  
    </div>  

    <!-- Inline validation -->  
    <p v-if="errors.email" class="err">{{ errors.email }}</p>  
    <p v-if="errors.password" class="err">{{ errors.password }}</p>  

    <!-- CapsLock notice -->  
    <div v-if="capsOn" class="warn" role="alert" aria-live="polite">  
      ⚠️ Caps Lock is ON  
    </div>  

    <!-- Remember me + offline -->  
    <div class="row">  
      <label class="chk">  
        <input type="checkbox" v-model="remember" :disabled="loading" />  
        Remember me  
      </label>  
      <span v-if="!online" class="badge">Offline</span>  
    </div>  

    <button  
      type="submit"  
      class="btn btn-primary w-100 mb-2"  
      :disabled="loading || !canSubmit"  
    >  
      <span v-if="!loading">Login</span>  
      <span v-else>⏳ Logging in…</span>  
    </button>  

    <!-- Global notice -->  
    <div  
      v-if="notice.text"  
      class="alert"  
      :class="notice.type === 'error' ? 'alert-err' : 'alert-ok'"  
    >  
      {{ notice.text }}  
    </div>  
  </form>  

  <div class="txt-center small mt-2">  
    <span class="muted">Don't have an account?</span>  
    <router-link to="/signup" class="link ms-1">Signup</router-link>  
  </div>  
  <div class="txt-center small mt-1">  
    <router-link to="/forgot-password" class="link-alt">Forgot Password?</router-link>  
  </div>  

  <!-- Debug -->  
  <details v-if="debug" class="small muted mt-3">  
    <summary class="link">Debug</summary>  
    <div class="mt-2">  
      <div>BACKEND_BASE: <code class="code">{{ BACKEND_BASE }}</code></div>  
      <div>Origin: <code class="code">{{ origin }}</code></div>  
      <div>Status: <code class="code">{{ apiStatus }}</code></div>  
      <div>Last error: <code class="code">{{ lastError || '-' }}</code></div>  
    </div>  
  </details>  
</div>

  </div>  
</template>  <script setup>  
defineOptions({ name: 'LoginPage' })  
  
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'  
import { useRouter } from 'vue-router'  
const router = useRouter()  
  
/* ===== Backend base (NO /api) ===== */  
const BACKEND_BASE = (  
  import.meta.env?.VITE_BACKEND_BASE || 'https://smartbiz-backend-p45m.onrender.com'  
).replace(/\/+$/,'')  
const origin = window.location.origin  
  
/* ===== Helpers ===== */  
async function getJSON(path, init) {  
  const res = await fetch(`${BACKEND_BASE}${path}`, {  
    credentials: 'omit',  
    ...init,  
    headers: { Accept: 'application/json', ...(init?.headers || {}) },  
  })  
  let data = null  
  try { data = await res.json() } catch {}  
  if (!res.ok) {  
    const err = new Error(data?.detail || data?.message || data?.error || `HTTP ${res.status}`)  
    err.status = res.status  
    err.data = data  
    throw err  
  }  
  return data  
}  
  
/* ─────────── State ─────────── */  
const loading  = ref(false)  
const showPwd  = ref(false)  
const capsOn   = ref(false)  
const remember = ref(true)  
const online   = ref(navigator.onLine)  
const form     = ref({ email: '', password: '' })  
const errors   = ref({ email: '', password: '' })  
const emailInput  = ref(null)  
const pwdInput    = ref(null)  
const notice   = ref({ type:'error', text:'' })  
const debug    = (import.meta.env?.VITE_APP_DEBUG?.toString() === '1') || /[?&]debug=1/.test(location.search)  
const lastError = ref('')  
  
/* API health status */  
const apiStatus = ref('checking') // 'checking' | 'ok' | 'down' | 'cors'  
  
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
  emailRe.test((form.value.email || '').trim()) &&  
  String(form.value.password || '').length >= 1  
)  
function validate() {  
  errors.value.email = ''  
  errors.value.password = ''  
  const email = (form.value.email || '').trim()  
  if (!emailRe.test(email)) errors.value.email = 'Please enter a valid email address.'  
  if (!form.value.password) errors.value.password = 'Please enter your password.'  
  return !(errors.value.email || errors.value.password)  
}  
  
const onPwdKeyup = (e) => {  
  try { capsOn.value = !!(e.getModifierState && e.getModifierState('CapsLock')) } catch { capsOn.value = false }  
}  
function focusPwd() { pwdInput.value?.focus?.() }  
  
/* ─────────── Auth helpers ─────────── */  
function saveAuth(data) {  
  const token = data?.access_token || data?.token || data?.accessToken  
  if (!token) return false  
  
  // 🔒 Normalize token_type to "Bearer"  
  const rawType = String(data?.token_type || 'Bearer').trim()  
  const normType = /^bearer$/i.test(rawType) ? 'Bearer' : rawType  
  
  const store = remember.value ? localStorage : sessionStorage  
  store.setItem('sbz_token', token)  
  store.setItem('sbz_token_type', normType)  
  store.setItem('sbz_auth_at', String(Date.now()))  
  localStorage.setItem('sbz_last_email', (form.value.email || '').trim().toLowerCase())  
  return true  
}  
  
async function redirectAfterLogin() {  
  await router.push('/dashboard')  
}  
  
/* ─────────── Health check ─────────── */  
async function checkApiHealth() {  
  apiStatus.value = 'checking'  
  try {  
    await getJSON('/health', { method: 'GET' })  
    apiStatus.value = 'ok'  
  } catch (err) {  
    lastError.value = err?.message || 'Unable to reach server'  
    apiStatus.value = navigator.onLine ? 'cors' : 'down'  
  }  
}  
  
/* ─────────── Login (email_or_username + password) ─────────── */  
let lastTry = 0  
let abortCtrl = null  
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
  
    const res = await fetch(`${BACKEND_BASE}/auth/login`, {  
      method: 'POST',  
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },  
      credentials: 'omit',  
      body: JSON.stringify({ email_or_username: email, password }),  
      signal: abortCtrl.signal,  
    })  
    let data = null  
    try { data = await res.json() } catch {}  
    if (!res.ok) {  
      const err = new Error(data?.detail || data?.message || `HTTP ${res.status}`)  
      err.status = res.status  
      err.data = data  
      throw err  
    }  
  
    if (!saveAuth(data)) throw new Error('Missing token in response.')  
    notice.value = { type:'success', text:'Login successful. Redirecting…' }  
    await redirectAfterLogin()  
  } catch (err) {  
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
</script>  <!-- Global page bg for this route -->  <style>  
html, body { background: #0b1220; }  
</style>  <style scoped>  
/* ===== Layout base (no Bootstrap, pure CSS utility-ish) ===== */  
.page { min-height: 100vh; }  
.center { display:flex; align-items:center; justify-content:center; }  
.bg-dark { background:#0b1220; }  
  
.card.auth-card {  
  width: 100%;  
  max-width: 420px;  
  background: #0f1e34;  
  border-radius: 1rem;  
  padding: 1rem 1.25rem;  
  box-shadow: 0 8px 28px rgba(0,0,0,.45), 0 0 0 2px #ffd70033;  
  border: 2px solid #ffd700;  
}  
@media (min-width: 768px) { .card.auth-card { padding: 1.25rem 1.75rem; } }  
  
.txt-center { text-align:center; }  
.small { font-size: .875rem; }  
.mt-1 { margin-top: .25rem; } .mt-2 { margin-top: .5rem; } .mt-3 { margin-top: .75rem; }  
.mb-2 { margin-bottom: .5rem; } .mb-3 { margin-bottom: .75rem; }  
.ms-1 { margin-left: .25rem; }  
.w-100 { width: 100%; }  
  
.logo {  
  border-radius: 9999px;  
  background: #fff;  
  object-fit: contain;  
  outline: 1px solid rgba(255,215,0,.6);  
  box-shadow: 0 2px 8px rgba(0,0,0,.3);  
  padding: 2px;  
}  
.title { color:#ffd700; font-weight:800; margin: .5rem 0 0 0; font-size: 1.125rem; }  
.muted { color:#b9c3d3; margin:0; }  
.rule { border:none; border-top:2px solid #ffd700; opacity:.9; margin:.5rem 0 1rem; }  
  
.label { color:#dbe3f2; font-size:.85rem; margin:.25rem 0 .25rem; display:block; }  
.field { display:flex; align-items:center; gap:.5rem; background:#132441; border-radius:.75rem; padding:.4rem .5rem .4rem .6rem; }  
.addon { opacity:.85; }  
.input {  
  appearance:none; border:none; outline:none; background:transparent; color:#f8f9fa;  
  padding:.45rem .5rem; width:100%;  
}  
.input::placeholder { color:#b9c3d3; }  
.input:focus { box-shadow: 0 0 0 2px #ffd70099; border-radius:.5rem; }  
  
.btn { border:1px solid transparent; border-radius:.65rem; padding:.55rem .75rem; font-weight:700; transition:.2s ease }  
.btn-outline { background:transparent; border-color:rgba(255,255,255,.15); color:#ffd700; }  
.btn-toggle { margin-left:.25rem; }  
.btn-primary { background:#ffd700; color:#0b1220; }  
.btn-primary:hover { background:#ffdd33; box-shadow:0 0 10px rgba(255,214,0,.4); }  
.btn-primary:active, .btn-primary:focus { background:#ffec80; outline:none; }  
  
.alert { border-radius:.65rem; padding:.5rem .75rem; }  
.alert-dark { background:#0e1a30; border:1px solid #ffd70055; color:#ffd700; }  
.alert-err { background:#371c1c; color:#ff9b9b; border:1px solid #ff8a8a55; }  
.alert-ok { background:#12351a; color:#b6f3c5; border:1px solid #6be39a55; }  
  
.err { color:#ff9b9b; margin:.25rem 0; }  
.warn { color:#ffd700; margin:.25rem 0; }  
.badge { background:#4d1a1a; color:#ff9b9b; border:1px solid #ff8a8a55; border-radius:.5rem; padding:.1rem .4rem; }  
  
.row { display:flex; align-items:center; justify-content:space-between; margin:.5rem 0; }  
.chk { color:#dbe3f2; display:flex; align-items:center; gap:.35rem; }  
  
.link { color:#ffd700; font-weight:700; }  
.link-alt { color:#7ec8ff; }  
.code { color:#dbe3f2; background:#0c1627; padding:.1rem .3rem; border-radius:.35rem; }  
</style>  
