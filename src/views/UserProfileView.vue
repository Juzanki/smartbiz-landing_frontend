<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
    <!-- App Bar -->
    <header class="sticky top-0 z-20 backdrop-blur bg-slate-900/70 border-b border-white/10">
      <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <h1 class="text-base sm:text-lg font-semibold">👤 User Profile</h1>
        <div class="hidden sm:flex items-center gap-2 text-xs">
          <span class="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
            Mobile First
          </span>
          <span class="px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/30">
            Privacy-aware
          </span>
        </div>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 py-4 space-y-4">
      <!-- Completeness / Save -->
      <section class="rounded-2xl p-4 sm:p-6 bg-white/5 ring-1 ring-white/10">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-2xl grid place-items-center bg-white/5 ring-1 ring-white/10">🧭</div>
            <div>
              <p class="text-sm text-white/80 font-medium">Profile completeness</p>
              <div class="h-2 w-48 bg-white/10 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-400" :style="{ width: completeness + '%' }"></div>
              </div>
              <p class="text-xs text-white/60 mt-1">{{ completeness }}% complete</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button type="button" @click="saveProfile" :disabled="saving || !isDirty"
                    class="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm">
              {{ saving ? 'Saving…' : 'Save Profile' }}
            </button>
            <button type="button" @click="resetChanges" :disabled="!isDirty"
                    class="px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-sm disabled:opacity-50">
              Reset
            </button>
          </div>
        </div>
      </section>

      <!-- Core Info -->
      <section class="rounded-2xl p-4 sm:p-6 bg-white/5 ring-1 ring-white/10">
        <h2 class="text-sm font-semibold text-white/80 mb-3">Basic Information</h2>

        <!-- Avatar row -->
        <div class="flex items-start gap-4 mb-4">
          <div class="relative">
            <img :src="draft.photoUrl || placeholderAvatar(draft.name)"
                 class="h-20 w-20 rounded-2xl object-cover ring-1 ring-white/15 bg-white/5" alt="avatar" />
            <label class="absolute -bottom-2 -right-2 text-[11px] px-2 py-1 rounded-lg bg-white/10 ring-1 ring-white/15 cursor-pointer">
              Upload
              <input type="file" class="hidden" accept="image/*" @change="handleFileUpload" />
            </label>
          </div>
          <p class="text-xs text-white/60 max-w-prose">
            Tip: clear, centered photo helps trust. Images stay local unless your backend uploads them.
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="text-xs text-white/60 block mb-1">Full Name</label>
            <input v-model.trim="draft.name" class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm"
                   :aria-invalid="!!errors.name" @blur="touched.name = true" placeholder="Jane Doe" />
            <p v-if="touched.name && errors.name" class="text-[11px] text-red-300 mt-1">{{ errors.name }}</p>
          </div>

          <div>
            <div class="flex items-center justify-between">
              <label class="text-xs text-white/60">Username</label>
              <span v-if="usernameState"
                    :class="['text-[11px]', usernameState==='ok' ? 'text-emerald-300' : 'text-amber-300']">
                {{ usernameState==='ok' ? 'Available' : 'Checking…' }}
              </span>
            </div>
            <input v-model.trim="draft.username" class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm"
                   :aria-invalid="!!errors.username" @input="debouncedCheckUsername" placeholder="jdoe" />
            <p v-if="touched.username && errors.username" class="text-[11px] text-red-300 mt-1">{{ errors.username }}</p>
          </div>

          <div>
            <label class="text-xs text-white/60 block mb-1">Email</label>
            <input v-model.trim="draft.email" type="email"
                   class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm"
                   :aria-invalid="!!errors.email" @blur="touched.email = true" placeholder="jane@example.com" />
            <p v-if="touched.email && errors.email" class="text-[11px] text-red-300 mt-1">{{ errors.email }}</p>
          </div>

          <div>
            <label class="text-xs text-white/60 block mb-1">Phone</label>
            <input v-model.trim="draft.phone" inputmode="tel"
                   class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" placeholder="+255 700 000 000" />
          </div>
        </div>
      </section>

      <!-- Preferences -->
      <section class="rounded-2xl p-4 sm:p-6 bg-white/5 ring-1 ring-white/10">
        <h2 class="text-sm font-semibold text-white/80 mb-3">Preferences</h2>

        <div class="grid gap-3 sm:grid-cols-3">
          <div>
            <label class="text-xs text-white/60 block mb-1">Theme</label>
            <select v-model="draft.theme" class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm">
              <option value="system">System</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div>
            <label class="text-xs text-white/60 block mb-1">Language</label>
            <select v-model="draft.language" class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm">
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
            </select>
          </div>

          <div>
            <label class="text-xs text-white/60 block mb-1">Timezone</label>
            <select v-model="draft.timezone" class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm">
              <option value="Africa/Dar_es_Salaam">Africa/Dar_es_Salaam</option>
              <option value="UTC">UTC</option>
              <option value="Africa/Nairobi">Africa/Nairobi</option>
            </select>
          </div>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <label class="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" v-model="draft.notify_email" /> <span>Email notifications</span>
          </label>
          <label class="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" v-model="draft.notify_sms" /> <span>SMS notifications</span>
          </label>
        </div>
      </section>

      <!-- Social & About -->
      <section class="rounded-2xl p-4 sm:p-6 bg-white/5 ring-1 ring-white/10">
        <h2 class="text-sm font-semibold text-white/80 mb-3">About & Social</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="text-xs text-white/60 block mb-1">Bio</label>
            <textarea v-model.trim="draft.bio" rows="3"
                      class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm"
                      placeholder="Short intro that appears on your public profile"></textarea>
          </div>
          <div>
            <label class="text-xs text-white/60 block mb-1">Website</label>
            <input v-model.trim="draft.website" type="url"
                   class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" placeholder="https://…" />
          </div>
          <div>
            <label class="text-xs text-white/60 block mb-1">Twitter/X</label>
            <input v-model.trim="draft.twitter" class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" placeholder="@handle" />
          </div>
        </div>
      </section>

      <!-- Security -->
      <section class="rounded-2xl p-4 sm:p-6 bg-white/5 ring-1 ring-white/10">
        <h2 class="text-sm font-semibold text-white/80 mb-3">Security</h2>
        <div class="grid gap-3 sm:grid-cols-3">
          <div>
            <label class="text-xs text-white/60 block mb-1">Current Password</label>
            <input v-model.trim="security.current" type="password"
                   class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="text-xs text-white/60 block mb-1">New Password</label>
            <input v-model.trim="security.new1" type="password"
                   class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="text-xs text-white/60 block mb-1">Confirm New Password</label>
            <input v-model.trim="security.new2" type="password"
                   class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" />
          </div>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-3">
          <label class="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" v-model="draft.two_factor" />
            <span>Enable 2FA (Authenticator/SMS)</span>
          </label>
          <button type="button" @click="changePassword"
                  class="px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-sm">
            Update Password
          </button>
        </div>
        <p v-if="passMsg" class="text-xs mt-2" :class="passOk ? 'text-emerald-300' : 'text-red-300'">{{ passMsg }}</p>
      </section>

      <!-- Public preview -->
      <section class="rounded-2xl p-4 sm:p-6 bg-white/5 ring-1 ring-white/10">
        <h2 class="text-sm font-semibold text-white/80 mb-3">Public Profile Preview</h2>
        <div class="grid gap-3 sm:grid-cols-[auto,1fr]">
          <img :src="draft.photoUrl || placeholderAvatar(draft.name)"
               class="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/15 bg-white/5" alt="avatar" />
          <div>
            <p class="font-semibold">{{ draft.name || 'Your Name' }} <span class="text-white/50">@{{ draft.username || 'username' }}</span></p>
            <p class="text-xs text-white/70 line-clamp-2">{{ draft.bio || 'Your bio will appear here.' }}</p>
            <div class="mt-1 text-[11px] text-white/60 flex flex-wrap gap-2">
              <a v-if="draft.website" :href="safeUrl(draft.website)" target="_blank" class="underline">Website</a>
              <a v-if="draft.twitter" :href="`https://x.com/${draft.twitter.replace('@','')}`" target="_blank" class="underline">X/Twitter</a>
            </div>
          </div>
        </div>
      </section>

      <!-- Danger zone -->
      <section class="rounded-2xl p-4 sm:p-6 bg-red-500/10 ring-1 ring-red-400/30">
        <h2 class="text-sm font-semibold text-red-200 mb-2">Danger Zone</h2>
        <p class="text-xs text-red-200/80 mb-3">Delete your account and all personal data. This action cannot be undone.</p>
        <button @click="deleteAccount" class="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 ring-1 ring-red-400/30 text-red-100 text-sm">
          Delete Account
        </button>
      </section>

      <!-- Alerts -->
      <section v-if="toast" class="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-sm">
        {{ toast }}
      </section>
    </main>
  </div>
</template>

<script setup>
defineOptions({ name: 'UserProfileView' })
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/** ------- Base state (could come from API) ------- */
const initial = {
  name: 'Jane Doe',
  username: 'jdoe',
  email: 'jane@example.com',
  phone: '+255 700 000 000',
  photoUrl: '',
  theme: 'system',
  language: 'en',
  timezone: 'Africa/Dar_es_Salaam',
  notify_email: true,
  notify_sms: false,
  bio: '',
  website: '',
  twitter: '',
  two_factor: false
}

const original = ref({ ...initial, ...(JSON.parse(localStorage.getItem('profile') || '{}')) })
const draft = reactive({ ...original.value })
const saving = ref(false)
const toast = ref('')
const touched = reactive({ name: false, username: false, email: false })
const usernameState = ref('') // '', 'checking', 'ok'
let usernameDebounce

/** ------- Computed / validation ------- */
const errors = computed(() => {
  const e = {}
  if (!draft.name || draft.name.length < 3) e.name = 'Name must be at least 3 characters.'
  if (!draft.username || !/^[a-z0-9_\.]{3,20}$/i.test(draft.username)) e.username = '3–20 letters/numbers/._'
  if (!draft.email || !/^\S+@\S+\.\S+$/.test(draft.email)) e.email = 'Enter a valid email.'
  return e
})
const isDirty = computed(() => JSON.stringify(draft) !== JSON.stringify(original.value))

const completeness = computed(() => {
  const fields = ['name','username','email','phone','bio','photoUrl']
  const done = fields.filter(f => (draft[f] || '').toString().trim().length > 0).length
  return Math.min(100, Math.round((done / fields.length) * 100))
})

/** ------- Username availability (mock) ------- */
function debouncedCheckUsername() {
  touched.username = true
  usernameState.value = 'checking'
  clearTimeout(usernameDebounce)
  usernameDebounce = setTimeout(async () => {
    // Mock “API”: mark 'admin' or 'test' as taken
    const taken = ['admin','test','user']
    usernameState.value = taken.includes(draft.username?.toLowerCase()) ? '' : 'ok'
  }, 500)
}

/** ------- Image upload preview ------- */
function handleFileUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const url = URL.createObjectURL(file)
  draft.photoUrl = url
}

/** ------- Save / reset ------- */
async function saveProfile() {
  if (Object.keys(errors.value).length) {
    touched.name = touched.username = touched.email = true
    toast.value = 'Please fix validation errors.'
    setTimeout(() => (toast.value = ''), 2000)
    return
  }
  saving.value = true
  try {
    // simulate API
    await new Promise(r => setTimeout(r, 500))
    original.value = JSON.parse(JSON.stringify(draft))
    localStorage.setItem('profile', JSON.stringify(original.value))
    toast.value = 'Profile updated!'
  } catch {
    toast.value = 'Failed to save.'
  } finally {
    saving.value = false
    setTimeout(() => (toast.value = ''), 1500)
  }
}

function resetChanges() {
  Object.assign(draft, JSON.parse(JSON.stringify(original.value)))
}

/** ------- Security ------- */
const security = reactive({ current: '', new1: '', new2: '' })
const passMsg = ref('')
const passOk = ref(false)
function changePassword() {
  if (!security.current || !security.new1 || !security.new2) {
    passOk.value = false; passMsg.value = 'Fill all password fields.'; return
  }
  if (security.new1 !== security.new2 || security.new1.length < 8) {
    passOk.value = false; passMsg.value = 'Passwords must match and be 8+ chars.'; return
  }
  passOk.value = true; passMsg.value = 'Password updated (demo).'
  security.current = security.new1 = security.new2 = ''
}

/** ------- Public helpers ------- */
function placeholderAvatar(name = '') {
  const letter = (name?.[0] || 'U').toUpperCase()
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>
    <rect width='100%' height='100%' rx='24' fill='#0ea5a5'/><text x='50%' y='54%' font-size='60'
    text-anchor='middle' fill='white' font-family='Inter,Arial'>${letter}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
function safeUrl(u='') { try { return new URL(u).toString() } catch { return '#' } }

/** ------- Draft autosave & unload guard ------- */
const autosave = ref(null)
onMounted(() => {
  autosave.value = setInterval(() => {
    localStorage.setItem('profile_draft', JSON.stringify(draft))
  }, 2000)

  // restore draft if newer
  const saved = localStorage.getItem('profile_draft')
  if (saved) {
    const d = JSON.parse(saved)
    if (JSON.stringify(d) !== JSON.stringify(original.value)) Object.assign(draft, d)
  }

  window.addEventListener('beforeunload', onBeforeLeave)
})
onBeforeUnmount(() => {
  clearInterval(autosave.value)
  window.removeEventListener('beforeunload', onBeforeLeave)
})
function onBeforeLeave(e) {
  if (isDirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

/** ------- Danger zone ------- */
function deleteAccount() {
  if (!confirm('Delete your account permanently?')) return
  localStorage.removeItem('profile')
  localStorage.removeItem('profile_draft')
  toast.value = 'Account deleted (demo).'
  setTimeout(() => (toast.value = ''), 1500)
}
</script>

<style scoped>
/* small helpers for mobile polish */
.line-clamp-2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
</style>
