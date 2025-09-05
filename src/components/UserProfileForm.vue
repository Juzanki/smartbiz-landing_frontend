<!-- src/components/ProfileForm.vue -->
<template>
  <section class="p-4 sm:p-6">
    <!-- Online/Offline -->
    <div
      v-if="!online"
      class="mb-3 rounded-xl bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm"
      role="status"
    >
      You’re offline — changes will be saved as a draft.
    </div>

    <!-- Header -->
    <header class="mb-4 flex items-center justify-between">
      <h1 class="text-xl sm:text-2xl font-bold text-blue-900 dark:text-white">Edit Profile</h1>
      <button class="btn-secondary" @click="exportJson">Export JSON</button>
    </header>

    <!-- Avatar card -->
    <div class="mb-5 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#0b0b10] p-4 flex items-center gap-4">
      <div class="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-white/60 dark:ring-white/10">
        <img
          v-if="photoPreview"
          :src="photoPreview"
          alt="Profile photo"
          class="w-full h-full object-cover"
        />
        <div
          v-else
          class="w-full h-full flex items-center justify-center text-white font-semibold"
          :style="{ background: avatarBg }"
          aria-hidden="true"
        >
          {{ initials }}
        </div>

        <!-- live camera dot when capture opened (visual cue) -->
        <span v-if="cameraOpen" class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#0b0b10]" />
      </div>

      <div class="min-w-0 flex-1">
        <p class="text-sm text-gray-600 dark:text-white/70 truncate">{{ profile.username || 'username' }}</p>
        <div class="flex gap-2 mt-2">
          <button class="btn-secondary" @click="openSheet">Change photo</button>
          <button class="btn-secondary" v-if="photoPreview" @click="removePhoto">Remove</button>
        </div>
      </div>
    </div>

    <!-- Form -->
    <form @submit.prevent="saveProfile" novalidate>
      <!-- Inputs grid (mobile-first stack) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
        <!-- Full name -->
        <label class="field">
          <span class="field-label">Full name</span>
          <input
            v-model.trim="profile.name"
            type="text"
            autocomplete="name"
            class="field-input"
            :aria-invalid="!!errors.name"
            :aria-describedby="errors.name ? 'err-name' : undefined"
            placeholder="e.g., Jane Doe"
          />
          <p v-if="errors.name" id="err-name" class="field-err">{{ errors.name }}</p>
        </label>

        <!-- Username -->
        <label class="field">
          <span class="field-label">Username</span>
          <div class="relative">
            <input
              v-model.trim="profile.username"
              type="text"
              inputmode="verbatim"
              autocapitalize="off"
              autocomplete="username"
              class="field-input pr-9"
              :aria-invalid="!!errors.username"
              :aria-describedby="errors.username ? 'err-username' : 'hint-username'"
              placeholder="e.g., jdoe"
            />
            <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-white/60" aria-hidden="true">
              <svg v-if="checkingUser" class="w-4 h-4 animate-spin" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6V2z"/></svg>
              <span v-else>{{ usernameOk ? '✓' : '' }}</span>
            </span>
          </div>
          <p id="hint-username" class="field-hint">Lowercase letters, numbers & underscores only.</p>
          <p v-if="errors.username" id="err-username" class="field-err">{{ errors.username }}</p>
        </label>

        <!-- Email -->
        <label class="field">
          <span class="field-label">Email</span>
          <input
            v-model.trim="profile.email"
            type="email"
            autocomplete="email"
            inputmode="email"
            class="field-input"
            :aria-invalid="!!errors.email"
            :aria-describedby="errors.email ? 'err-email' : undefined"
            placeholder="you@example.com"
          />
          <p v-if="errors.email" id="err-email" class="field-err">{{ errors.email }}</p>
        </label>

        <!-- Phone (+255 formatting) -->
        <label class="field">
          <span class="field-label">Phone (TZ)</span>
          <input
            v-model="profile.phone"
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            class="field-input"
            :aria-invalid="!!errors.phone"
            :aria-describedby="errors.phone ? 'err-phone' : 'hint-phone'"
            placeholder="+255 700 000 000"
            @input="formatTZPhone"
          />
          <p id="hint-phone" class="field-hint">Starts with +255 • 9 digits after prefix.</p>
          <p v-if="errors.phone" id="err-phone" class="field-err">{{ errors.phone }}</p>
        </label>
      </div>

      <!-- Hidden native file input (triggered from sheet) -->
      <input
        ref="fileEl"
        type="file"
        class="hidden"
        accept="image/*"
        capture="user"
        @click="cameraOpen = true"
        @change="handleFile"
      />

      <!-- Sticky action bar (mobile) -->
      <div class="sticky bottom-0 left-0 right-0 mt-2 z-40">
        <div class="rounded-t-2xl bg-white/85 dark:bg-[#0b0b10]/85 backdrop-blur border-t border-black/10 dark:border-white/10 px-4 py-3 flex items-center gap-2">
          <button type="button" class="btn-secondary flex-1" :disabled="!dirty" @click="resetForm">Reset</button>
          <button type="submit" class="btn-primary flex-1" :disabled="!canSubmit || saving">
            <span v-if="!saving">Save Profile</span>
            <span v-else class="inline-flex items-center gap-2">
              <svg class="w-4 h-4 animate-spin" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6V2z"/></svg>
              Saving…
            </span>
          </button>
        </div>
        <!-- Safe area -->
        <div class="h-3" />
      </div>
    </form>

    <!-- Bottom sheet: change photo -->
    <div v-if="sheet" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeSheet"></div>
      <div class="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white dark:bg-[#0b0b10] shadow-2xl">
        <div class="mx-auto w-full max-w-2xl p-4">
          <div class="flex items-center gap-2 mb-3">
            <button @click="closeSheet" class="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10" aria-label="Close">✖</button>
            <h4 class="text-sm font-semibold">Change profile photo</h4>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button class="sheet-btn" @click="pickFromCamera">📸 Take photo</button>
            <button class="sheet-btn" @click="pickFromFiles">🖼️ Choose from files</button>
            <button class="sheet-btn" @click="useInitials">🔤 Use initials</button>
            <button class="sheet-btn" :disabled="!photoPreview" @click="removePhoto">🗑️ Remove</button>
            <button class="sheet-btn" @click="randomGradient">🎨 Random background</button>
          </div>

          <p class="text-xs text-gray-500 dark:text-white/60 mt-3">JPEG/PNG/WebP, up to 5MB. We’ll optimize to ~256×256.</p>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast" class="fixed bottom-16 left-1/2 -translate-x-1/2 z-50">
      <div class="rounded-xl bg-emerald-600 text-white text-sm px-3 py-2 shadow">
        {{ toast }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'

/* ---------- State ---------- */
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
function onOnline(){ online.value = true }
function onOffline(){ online.value = false }

onMounted(() => {
  window.addEventListener?.('online', onOnline)
  window.addEventListener?.('offline', onOffline)
  restoreDraft()
  startAutosave()
})
onBeforeUnmount(() => {
  window.removeEventListener?.('online', onOnline)
  window.removeEventListener?.('offline', onOffline)
  stopAutosave()
})

const profile = reactive({
  name: 'Jane Doe',
  username: 'jdoe',
  email: 'jane@example.com',
  phone: '+255 700 000 000'
})

const initial = ref(JSON.stringify(profile))
const errors = reactive<{ [k:string]: string | null }>({ name:null, username:null, email:null, phone:null })

const sheet = ref(false)
const fileEl = ref<HTMLInputElement|null>(null)
const cameraOpen = ref(false)
const photoPreview = ref<string>('')     // data URL / blob URL
const avatarBg = ref<string>('linear-gradient(135deg,#1e3a8a,#2563eb)')
const saving = ref(false)
const toast = ref('')

/* ---------- Derived ---------- */
const initials = computed(() => (profile.name || 'U').split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join(''))

const dirty = computed(() => JSON.stringify(profile) !== initial.value || !!photoPreview.value)
const canSubmit = computed(() => !errors.name && !errors.username && !errors.email && !errors.phone && dirty.value)

const checkingUser = ref(false)
const usernameOk = ref(true)

/* ---------- Validation ---------- */
watch(() => ({...profile}), () => validateAll(), { deep: true, immediate: true })

function validateAll(){
  // name
  errors.name = profile.name.trim().length < 2 ? 'Enter your full name' : null

  // username rules
  const u = profile.username.trim().toLowerCase()
  if (!/^[a-z0-9_]{3,20}$/.test(u)) {
    errors.username = '3–20 chars: a–z, 0–9, _'
    usernameOk.value = false
  } else {
    errors.username = null
    debounceCheckUsername(u)
  }

  // email
  errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim()) ? null : 'Enter a valid email'

  // phone (TZ +255 followed by 9 digits, allow spaces)
  const digits = profile.phone.replace(/\D+/g,'')
  errors.phone = (/^255\d{9}$/.test(digits)) ? null : 'Use +255 then 9 digits'
}

const debounceCheckUsername = debounce(async (u: string) => {
  checkingUser.value = true
  // demo availability: block some reserved names
  const taken = new Set(['admin','root','support','test','jdoe'])
  await sleep(350)
  usernameOk.value = !taken.has(u)
  if (!usernameOk.value) errors.username = 'Username is taken'
  checkingUser.value = false
}, 350)

/* ---------- Phone formatting (TZ) ---------- */
function formatTZPhone(){
  // normalize to "+255 XXX XXX XXX" while typing
  let digits = profile.phone.replace(/\D+/g,'')
  if (digits.startsWith('0')) digits = '255' + digits.slice(1)
  if (!digits.startsWith('255')) digits = '255' + digits
  digits = digits.slice(0,12) // 255 + 9 digits
  const parts = [digits.slice(0,3), digits.slice(3,6), digits.slice(6,9), digits.slice(9,12)].filter(Boolean)
  profile.phone = '+' + parts[0] + (parts[1] ? ' ' + parts[1] : '') + (parts[2] ? ' ' + parts[2] : '') + (parts[3] ? ' ' + parts[3] : '')
}

/* ---------- File handling ---------- */
function openSheet(){ sheet.value = true }
function closeSheet(){ sheet.value = false }
function pickFromCamera(){ cameraOpen.value = true; fileEl.value?.click() }
function pickFromFiles(){ cameraOpen.value = false; fileEl.value?.click() }
function useInitials(){ photoPreview.value = ''; closeSheet() }
function removePhoto(){ photoPreview.value = ''; closeSheet() }
function randomGradient(){
  const colors = ['#1e3a8a','#2563eb','#7c3aed','#0ea5e9','#f59e0b','#10b981']
  const a = colors[Math.floor(Math.random()*colors.length)]
  const b = colors[Math.floor(Math.random()*colors.length)]
  avatarBg.value = `linear-gradient(135deg,${a},${b})`
}

async function handleFile(e: Event){
  cameraOpen.value = false
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 5_000_000) { toastNow('File too large (max 5MB)'); input.value=''; return }
  const optimized = await compressImage(file, 256, 256, 0.85)
  photoPreview.value = URL.createObjectURL(optimized)
  closeSheet()
  input.value = ''
}

/* ---------- Save / Reset ---------- */
async function saveProfile(){
  validateAll()
  if (!canSubmit.value) return
  saving.value = true
  try {
    // Mock upload photo if set
    if (photoPreview.value) await sleep(400)
    // Mock API call
    await sleep(500)
    initial.value = JSON.stringify(profile)
    toastNow('Profile saved')
    localStorage.removeItem(DRAFT_KEY)
  } catch (e) {
    toastNow('Failed to save')
  } finally {
    saving.value = false
  }
}
function resetForm(){
  Object.assign(profile, JSON.parse(initial.value))
  photoPreview.value = ''
}

/* ---------- Draft autosave ---------- */
const DRAFT_KEY = 'profile_draft_v1'
let autosaveTimer: number|undefined
function startAutosave(){
  stopAutosave()
  autosaveTimer = window.setInterval(()=> {
    if (dirty.value) localStorage.setItem(DRAFT_KEY, JSON.stringify({ profile, photoPreview: photoPreview.value, avatarBg: avatarBg.value }))
  }, 2500)
}
function stopAutosave(){ if (autosaveTimer) window.clearInterval(autosaveTimer) }
function restoreDraft(){
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    const d = JSON.parse(raw)
    Object.assign(profile, d.profile || {})
    if (d.photoPreview) photoPreview.value = d.photoPreview
    if (d.avatarBg) avatarBg.value = d.avatarBg
  } catch {}
}

/* ---------- Utils ---------- */
function toastNow(msg: string){ toast.value = msg; setTimeout(()=> toast.value = '', 1600) }
function sleep(ms:number){ return new Promise(r=>setTimeout(r, ms)) }
function debounce<F extends (...args:any[])=>any>(fn:F, wait=250){
  let t:any; return (...args:any[]) => { clearTimeout(t); t = setTimeout(()=> fn(...args), wait) }
}
async function compressImage(file: File, maxW=256, maxH=256, quality=0.85): Promise<Blob>{
  const bitmap = await createImageBitmap(file)
  const ratio = Math.min(maxW/bitmap.width, maxH/bitmap.height, 1)
  const w = Math.round(bitmap.width * ratio), h = Math.round(bitmap.height * ratio)
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  return await new Promise(res => canvas.toBlob(b => res(b!), 'image/jpeg', quality))
}

/* ---------- Export ---------- */
function exportJson(){
  const data = { ...profile, photo: photoPreview.value || null, bg: avatarBg.value }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'profile.json'; a.click(); URL.revokeObjectURL(url)
}
</script>

<style scoped>
.field { @apply flex flex-col; }
.field-label { @apply text-sm text-gray-700 dark:text-white/80 mb-1; }
.field-input {
  @apply w-full h-11 rounded-xl px-3 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white
         border border-gray-200 dark:border-white/10 outline-none
         focus:ring-2 ring-blue-600/60 placeholder:text-gray-400;
}
.field-hint { @apply text-[11px] text-gray-500 dark:text-white/60 mt-1; }
.field-err { @apply text-xs text-red-600 dark:text-red-400 mt-1; }

.btn-primary {
  @apply h-11 px-4 rounded-xl bg-blue-700 text-white text-sm font-medium active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed;
}
.btn-secondary {
  @apply h-11 px-3 rounded-xl bg-gray-100 dark:bg-white/10 text-sm text-gray-800 dark:text-white active:scale-95 disabled:opacity-50;
}

/* Safe-area padding for phones with notches */
@supports(padding:max(0px)) {
  .sticky { padding-bottom: max(0.25rem, env(safe-area-inset-bottom)); }
}
</style>
