<!-- src/components/UserSettings.vue -->
<template>
  <section class="p-4 sm:p-6 max-w-2xl mx-auto">
    <!-- Offline banner -->
    <div v-if="!online" class="mb-3 rounded-xl bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm">
      You’re offline — changes will be saved as a draft.
    </div>

    <!-- Header -->
    <header class="flex items-center justify-between gap-2 mb-3">
      <h1 class="text-xl sm:text-2xl font-bold text-blue-900 dark:text-white">User Settings</h1>
      <button class="btn-secondary" @click="exportData">Export JSON</button>
    </header>

    <!-- Email verification chip -->
    <div class="mb-3 flex items-center gap-2 text-xs">
      <span v-if="emailVerified" class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">✓ Email verified</span>
      <button v-else class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
              :disabled="cooldown>0" @click="resendVerify">
        {{ cooldown>0 ? `Resend in ${cooldown}s` : 'Verify email' }}
      </button>
    </div>

    <!-- Sections (mobile-first accordions) -->
    <div class="space-y-3">
      <!-- Profile -->
      <Section title="Profile" icon="👤" :open-default="true">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="field">
            <span class="field-label">Full name</span>
            <input v-model.trim="form.name" type="text" class="field-input" :aria-invalid="!!errors.name" :aria-describedby="errors.name?'err-name':undefined" placeholder="e.g., Jane Doe" />
            <p v-if="errors.name" id="err-name" class="field-err">{{ errors.name }}</p>
          </label>
          <label class="field">
            <span class="field-label">Email</span>
            <input v-model.trim="form.email" type="email" inputmode="email" autocomplete="email" class="field-input"
                   :aria-invalid="!!errors.email" :aria-describedby="errors.email?'err-email':undefined" placeholder="you@example.com" />
            <p v-if="errors.email" id="err-email" class="field-err">{{ errors.email }}</p>
          </label>
        </div>
      </Section>

      <!-- Security -->
      <Section title="Security" icon="🔒">
        <div class="grid grid-cols-1 gap-3">
          <!-- Password -->
          <label class="field">
            <span class="field-label">New password</span>
            <div class="relative">
              <input :type="showPwd?'text':'password'" v-model="form.password" class="field-input pr-10" placeholder="Leave blank to keep current"
                     :aria-invalid="!!errors.password" :aria-describedby="errors.password?'err-pwd':'pwd-hint'"/>
              <button type="button" class="eye-btn" @click="showPwd=!showPwd" :aria-label="showPwd?'Hide password':'Show password'">{{ showPwd?'🙈':'👁️' }}</button>
            </div>
            <p id="pwd-hint" class="field-hint">Min 8 chars incl. upper, lower & number</p>
            <p v-if="errors.password" id="err-pwd" class="field-err">{{ errors.password }}</p>

            <!-- Strength -->
            <div v-if="form.password" class="mt-1">
              <div class="h-1.5 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div class="h-full transition-all" :class="strengthColor" :style="{ width: strengthWidth }"></div>
              </div>
              <div class="flex justify-between text-[11px] mt-1 text-gray-500 dark:text-white/60">
                <span>Password strength: <strong>{{ strengthLabel }}</strong></span>
                <button type="button" class="underline" @click="genPassword">Generate</button>
              </div>
            </div>
          </label>

          <!-- 2FA -->
          <div class="rounded-xl border border-black/5 dark:border-white/10 p-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-800 dark:text-white">Two-factor authentication</p>
                <p class="text-xs text-gray-500 dark:text-white/60">Add an extra layer of security</p>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="twofaEnabled" @change="toggle2FA" />
                <span class="slider"></span>
              </label>
            </div>
            <div v-if="twofaEnabled && recovery" class="mt-2 text-xs bg-gray-50 dark:bg-white/5 rounded-lg p-2">
              Recovery code: <code class="font-mono">{{ recovery }}</code>
              <button class="ml-2 text-blue-700 dark:text-blue-300 hover:underline" @click="copy(recovery)">Copy</button>
            </div>
          </div>

          <!-- Recent activity -->
          <div class="rounded-xl border border-black/5 dark:border-white/10 p-3">
            <p class="text-sm font-medium text-gray-800 dark:text-white mb-2">Recent activity</p>
            <ul class="space-y-1 text-xs text-gray-600 dark:text-white/70">
              <li v-for="(a,i) in activity" :key="i">• {{ a }}</li>
            </ul>
          </div>
        </div>
      </Section>

      <!-- Notifications -->
      <Section title="Notifications" icon="🔔">
        <div class="space-y-3">
          <label class="inline-flex items-center gap-2"><input type="checkbox" v-model="notify.all" class="accent-blue-700"><span>Email me about important updates</span></label>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label class="inline-flex items-center gap-2"><input type="checkbox" v-model="notify.email" class="accent-blue-700">Email</label>
            <label class="inline-flex items-center gap-2"><input type="checkbox" v-model="notify.sms" class="accent-blue-700">SMS</label>
            <label class="inline-flex items-center gap-2"><input type="checkbox" v-model="notify.push" class="accent-blue-700">Push</label>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <label class="field">
              <span class="field-label">Quiet hours (start)</span>
              <input type="time" v-model="notify.quietStart" class="field-input" />
            </label>
            <label class="field">
              <span class="field-label">Quiet hours (end)</span>
              <input type="time" v-model="notify.quietEnd" class="field-input" />
            </label>
          </div>
          <label class="field">
            <span class="field-label">Digest frequency</span>
            <select v-model="notify.digest" class="field-input">
              <option value="off">Off</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
        </div>
      </Section>

      <!-- Preferences -->
      <Section title="Preferences" icon="🎛️">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="field">
            <span class="field-label">Language</span>
            <select v-model="prefs.lang" class="field-input">
              <option value="sw">Kiswahili</option>
              <option value="en">English</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">Theme</span>
            <select v-model="prefs.theme" class="field-input" @change="applyTheme">
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">Time zone</span>
            <select v-model="prefs.tz" class="field-input">
              <option v-for="z in timezones" :key="z" :value="z">{{ z.replace('_',' ') }}</option>
            </select>
          </label>
          <label class="inline-flex items-center gap-2">
            <input type="checkbox" v-model="prefs.reduceMotion" class="accent-blue-700" @change="applyMotion">
            <span>Reduce motion</span>
          </label>
        </div>
      </Section>

      <!-- Danger zone -->
      <Section title="Danger zone" icon="⚠️">
        <div class="space-y-2">
          <button class="btn-secondary" @click="downloadSessionsCsv">Download sessions CSV</button>
          <div class="rounded-xl border border-red-200 dark:border-red-900/40 p-3">
            <p class="text-sm font-medium text-red-700 dark:text-red-300">Delete account</p>
            <p class="text-xs text-red-600/90 dark:text-red-300/90 mb-2">Type <strong>DELETE</strong> to confirm.</p>
            <div class="flex gap-2">
              <input v-model="confirmDelete" placeholder="DELETE" class="field-input flex-1" />
              <button class="h-11 px-4 rounded-xl bg-red-700 text-white text-sm font-medium active:scale-95 disabled:opacity-50"
                      :disabled="confirmDelete!=='DELETE'" @click="doDelete">Delete</button>
            </div>
          </div>
        </div>
      </Section>
    </div>

    <!-- Sticky actions -->
    <div class="sticky bottom-0 left-0 right-0 z-40 mt-3">
      <div class="rounded-t-2xl bg-white/85 dark:bg-[#0b0b10]/85 backdrop-blur border-t border-black/10 dark:border-white/10 px-4 py-3 flex items-center gap-2">
        <button class="btn-secondary flex-1" :disabled="!dirty" @click="resetForm">Reset</button>
        <button class="btn-primary flex-1" :disabled="!canSubmit || saving" @click="updateSettings">
          <span v-if="!saving">Save Changes</span>
          <span v-else class="inline-flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6V2z"/></svg>
            Saving…
          </span>
        </button>
      </div>
      <div class="h-3" />
    </div>

    <!-- Toast -->
    <div v-if="toast" class="fixed bottom-16 left-1/2 -translate-x-1/2 z-50">
      <div class="rounded-xl bg-emerald-600 text-white text-sm px-3 py-2 shadow">{{ toast }}</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'

/* ------------ State ------------ */
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
function onOnline(){ online.value = true }
function onOffline(){ online.value = false }

onMounted(() => {
  window.addEventListener?.('online', onOnline)
  window.addEventListener?.('offline', onOffline)
  restoreDraft()
  window.addEventListener?.('beforeunload', beforeUnload)
  startAutosave()
  applyTheme()
  applyMotion()
})
onBeforeUnmount(() => {
  window.removeEventListener?.('online', onOnline)
  window.removeEventListener?.('offline', onOffline)
  window.removeEventListener?.('beforeunload', beforeUnload)
  stopAutosave()
})

const form = reactive({
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: '',
})
const notify = reactive({ all: true, email: true, sms: false, push: true, quietStart: '21:00', quietEnd: '07:00', digest: 'weekly' })
const prefs = reactive({ lang: 'en', theme: localStorage.getItem('set_theme') || 'system', tz: 'Africa/Dar_es_Salaam', reduceMotion: readBool('set_reduce_motion') })
const timezones = ['Africa/Dar_es_Salaam','UTC','Africa/Nairobi','Europe/London','America/New_York','Asia/Dubai']

const emailVerified = ref(false)
const cooldown = ref(0)
let cooldownTimer:number|undefined

const twofaEnabled = ref(false)
const recovery = ref('')

const activity = ref<string[]>([
  'Login from Chrome on Android — Dar es Salaam',
  'Password changed — 2 days ago',
  'New device authorized — 1 week ago'
])

const saving = ref(false)
const toast = ref('')
const confirmDelete = ref('')

/* ------------ Validation ------------ */
const errors = reactive<{[k:string]:string|null}>({ name:null, email:null, password:null })
watch(() => ({...form}), validateAll, { deep:true, immediate:true })

function validateAll(){
  errors.name = form.name.trim().length<2 ? 'Enter your full name' : null
  errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? null : 'Enter a valid email'
  errors.password = form.password && !validPassword(form.password) ? 'Min 8 chars incl. upper, lower & number' : null
}

function validPassword(v:string){ return v.length>=8 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /[0-9]/.test(v) }

/* Password strength */
const strength = computed(()=> {
  let s=0; if(form.password.length>=8) s++; if(/[A-Z]/.test(form.password)) s++; if(/[a-z]/.test(form.password)) s++; if(/[0-9]/.test(form.password)) s++; if(/[^A-Za-z0-9]/.test(form.password)) s++; return Math.min(5,s)
})
const strengthLabel = computed(()=> ['Very weak','Weak','Fair','Good','Strong'][Math.max(0, strength.value-1)] || 'Very weak')
const strengthWidth = computed(()=> `${(strength.value/5)*100}%`)
const strengthColor = computed(()=> ['bg-red-500','bg-orange-500','bg-yellow-500','bg-green-500','bg-emerald-600'][Math.max(0, strength.value-1)])

/* Dirty & submit */
const initial = ref(snapshot())
const dirty = computed(()=> snapshot() !== initial.value)
const canSubmit = computed(()=> !errors.name && !errors.email && !errors.password)

/* ------------ Actions ------------ */
function snapshot(){ return JSON.stringify({ form, notify, prefs, twofaEnabled: twofaEnabled.value }) }

function beforeUnload(e: BeforeUnloadEvent){
  if(!dirty.value) return
  e.preventDefault()
  e.returnValue = ''
}

function genPassword(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
  let out=''; for(let i=0;i<14;i++){ out += chars[Math.floor(Math.random()*chars.length)] }
  form.password = out
}

function toggle2FA(){
  if(twofaEnabled.value){
    recovery.value = generateRecovery()
    toastNow('2FA enabled — save your recovery code')
  } else {
    recovery.value = ''
  }
}
function generateRecovery(){
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, b => b.toString(16).padStart(2,'0')).join('-')
}

async function resendVerify(){
  if(cooldown.value>0) return
  cooldown.value = 30
  cooldownTimer = window.setInterval(()=> {
    cooldown.value--
    if(cooldown.value<=0 && cooldownTimer){ clearInterval(cooldownTimer); cooldownTimer=undefined }
  }, 1000)
  // mock request
  await sleep(500)
  toastNow('Verification email sent')
}

async function updateSettings(){
  validateAll()
  if(!canSubmit.value) return
  saving.value = true
  // mock API
  await sleep(650)
  initial.value = snapshot()
  if(form.password) form.password=''  // clear after save
  toastNow('Settings saved')
  localStorage.removeItem(DRAFT_KEY)
  saving.value = false
}

function resetForm(){
  const snap = JSON.parse(initial.value)
  Object.assign(form, snap.form)
  Object.assign(notify, snap.notify)
  Object.assign(prefs, snap.prefs)
  twofaEnabled.value = snap.twofaEnabled
}

function exportData(){
  const blob = new Blob([initial.value], { type:'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download='settings.json'; a.click(); URL.revokeObjectURL(url)
}

function downloadSessionsCsv(){
  const rows = [['device','location','last_seen'], ['Chrome Android','Dar es Salaam','2025-08-10'], ['Safari iPhone','Arusha','2025-08-07']]
  const csv = rows.map(r=>r.join(',')).join('\n')
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download='sessions.csv'; a.click(); URL.revokeObjectURL(url)
}

async function doDelete(){
  await sleep(400)
  toastNow('Account deleted (demo)')
  confirmDelete.value = ''
}

function copy(t:string){ navigator.clipboard?.writeText(t) }
function toastNow(msg:string){ toast.value = msg; setTimeout(()=> toast.value='', 1600) }
function sleep(ms:number){ return new Promise(r=>setTimeout(r, ms)) }

/* ------------ Prefs & autosave ------------ */
function readBool(k:string){ return localStorage.getItem(k)==='true' }

function applyTheme(){
  localStorage.setItem('set_theme', prefs.theme)
  const b = document.documentElement
  b.classList.remove('theme-light','theme-dark')
  if (prefs.theme==='system'){
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    b.classList.add(dark ? 'theme-dark' : 'theme-light')
  } else {
    b.classList.add(prefs.theme==='dark' ? 'theme-dark' : 'theme-light')
  }
}
function applyMotion(){
  localStorage.setItem('set_reduce_motion', String(prefs.reduceMotion))
  document.documentElement.classList.toggle('reduced-motion', prefs.reduceMotion)
}

/* Draft autosave */
const DRAFT_KEY = 'user_settings_draft_v1'
let autosaveTimer:number|undefined
function startAutosave(){ stopAutosave(); autosaveTimer = window.setInterval(()=> { if(dirty.value) localStorage.setItem(DRAFT_KEY, snapshot()) }, 2500) }
function stopAutosave(){ if(autosaveTimer) window.clearInterval(autosaveTimer) }
function restoreDraft(){ const raw = localStorage.getItem(DRAFT_KEY); if(raw){ try{
  const snap = JSON.parse(raw)
  Object.assign(form, snap.form); Object.assign(notify, snap.notify); Object.assign(prefs, snap.prefs); twofaEnabled.value = snap.twofaEnabled
} catch{} } }
</script>

<script lang="ts">
/* Inline Section component for collapsible panels */
import { defineComponent, ref } from 'vue'
export default {
  components: {
    Section: defineComponent({
      name:'Section',
      props:{ title:String, icon:String, openDefault:{type:Boolean, default:false} },
      setup(props, { slots }){
        const open = ref(!!props.openDefault)
        function toggle(){ open.value = !open.value }
        return { open, toggle, props, slots }
      },
      template: `
        <div class="rounded-2xl bg-white dark:bg-[#0b0b10] border border-gray-200 dark:border-white/10">
          <button type="button" class="w-full flex items-center justify-between px-4 py-3" @click="toggle" :aria-expanded="open">
            <span class="text-sm font-semibold text-gray-900 dark:text-white"><span v-if="icon" class="mr-2">{{ icon }}</span>{{ title }}</span>
            <svg class="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path :d="open ? 'M5 12l5-5 5 5H5z' : 'M5 8l5 5 5-5H5z'"/></svg>
          </button>
          <div v-show="open" class="px-4 pb-4 pt-1">
            <slot />
          </div>
        </div>
      `
    })
  }
}
</script>

<style scoped>
/* Inputs & labels */
.field { @apply flex flex-col; }
.field-label { @apply text-sm text-gray-700 dark:text-white/80 mb-1; }
.field-input {
  @apply w-full h-11 rounded-xl px-3 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white
         border border-gray-200 dark:border-white/10 outline-none
         focus:ring-2 ring-blue-600/60 placeholder:text-gray-400;
}
.field-hint { @apply text-[11px] text-gray-500 dark:text-white/60 mt-1; }
.field-err { @apply text-xs text-red-600 dark:text-red-400 mt-1; }

/* Buttons */
.btn-primary { @apply h-11 px-4 rounded-xl bg-blue-700 text-white text-sm font-medium active:scale-95 disabled:opacity-50; }
.btn-secondary { @apply h-11 px-3 rounded-xl bg-gray-100 dark:bg-white/10 text-sm text-gray-800 dark:text-white active:scale-95; }

/* Show/Hide password button */
.eye-btn { @apply absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-gray-600 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10; }

/* Switch */
.switch { position: relative; display: inline-block; width: 44px; height: 26px; }
.switch input { display:none; }
.slider { position: absolute; cursor: pointer; inset: 0; background: #d1d5db; border-radius: 999px; transition: .2s; }
.slider::before { content:''; position:absolute; height:20px; width:20px; left:3px; top:3px; background:white; border-radius:999px; transition:.2s; box-shadow: 0 1px 2px rgba(0,0,0,.2);}
.switch input:checked + .slider { background:#2563eb; }
.switch input:checked + .slider::before { transform: translateX(18px); }

/* Reduced motion helper */
.reduced-motion * { transition: none !important; animation: none !important; }

/* Safe area */
@supports(padding:max(0px)) {
  .sticky { padding-bottom: max(0.25rem, env(safe-area-inset-bottom)); }
}
</style>
