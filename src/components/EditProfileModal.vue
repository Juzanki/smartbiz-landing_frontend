<template>
  <!-- Overlay -->
  <div
    v-if="show"
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:flex md:items-center md:justify-center animate-fadeIn"
    @click.self="handleClose"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="headingId"
  >
    <!-- Bottom sheet (mobile) / Centered (md+) -->
    <div
      ref="sheetEl"
      class="bg-[#0f172a] w-full md:max-w-md md:mx-auto md:rounded-xl md:my-10 border border-cyan-700 shadow-2xl
             md:animate-fadeInUp animate-slideUpSafe overflow-hidden relative"
      :style="{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <!-- Drag handle (mobile) -->
      <div class="md:hidden absolute left-1/2 -translate-x-1/2 top-2">
        <div class="h-1.5 w-12 rounded-full bg-cyan-700/70"></div>
      </div>

      <div class="p-6 pt-5 md:pt-6">
        <h2 :id="headingId" class="text-xl font-bold text-cyan-300 mb-4 md:mb-5">✏️ Edit Your Profile</h2>

        <!-- Online / draft chips -->
        <div class="flex flex-wrap items-center gap-2 text-[11px] mb-3">
          <span :class="['chip', online ? 'chip-ok' : 'chip-warn']">
            <i :class="online ? 'i-tabler-wifi' : 'i-tabler-wifi-off'"></i>
            {{ online ? 'Online' : 'Offline (draft only)' }}
          </span>
          <span v-if="dirty" class="chip chip-info">
            <i class="i-tabler-pencil"></i> Unsaved changes
          </span>
          <span v-if="restored" class="chip chip-accent">
            <i class="i-tabler-clock"></i> Draft restored
          </span>
        </div>

        <form @submit.prevent="saveChanges" class="space-y-5" novalidate>
          <!-- Display Name Type -->
          <div>
            <label class="block text-sm text-gray-300 mb-1">Display Name Type</label>
            <div class="seg group">
              <button type="button" :class="['seg-btn', !useUsername ? 'seg-active' : '']" @click="useUsername=false">Full Name</button>
              <button type="button" :class="['seg-btn',  useUsername ? 'seg-active' : '']" @click="useUsername=true">Username</button>
            </div>
            <p class="text-xs text-cyan-300 mt-1">
              Preview: <span class="font-semibold">@{{ previewHandle }}</span> · <span class="font-semibold">{{ displayName }}</span>
            </p>
          </div>

          <!-- Full Name -->
          <div>
            <label class="block text-sm text-gray-300 mb-1">Full Name</label>
            <input v-model.trim="form.name" type="text" :class="['input', errors.name && 'input-error']" placeholder="Enter your full name" @blur="touch('name')" />
            <p v-if="touched.name && errors.name" class="err">{{ errors.name }}</p>
          </div>

          <!-- Username -->
          <div>
            <div class="flex items-center justify-between">
              <label class="block text-sm text-gray-300 mb-1">Username (e.g. @yourname)</label>
              <small v-if="checkingUser" class="text-cyan-300">Checking…</small>
              <small v-else-if="userState==='ok'" class="text-emerald-400">Available</small>
              <small v-else-if="userState==='taken'" class="text-rose-400">Taken</small>
            </div>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 select-none">@</span>
              <input
                v-model="usernameInput"
                type="text"
                :class="['input pl-8', errors.username && 'input-error']"
                placeholder="username"
                @input="onUsernameInput"
                @blur="onUsernameBlur"
              />
              <button v-if="usernameInput" type="button" class="abs-btn" @click="usernameInput=''; onUsernameBlur()">✖</button>
            </div>
            <p class="hint">3–15 chars; letters, numbers, underscores, dots.</p>
            <p v-if="touched.username && errors.username" class="err">{{ errors.username }}</p>
          </div>

          <!-- Bio -->
          <div>
            <label class="block text-sm text-gray-300 mb-1">Short Bio</label>
            <div class="relative">
              <textarea v-model="form.bio" rows="3" :maxlength="BIO_MAX" class="input pr-12"
                        placeholder="Tell us about yourself..." @input="onBioInput"></textarea>
              <span class="count">{{ bioCount }}/{{ BIO_MAX }}</span>
            </div>
          </div>

          <!-- Avatar Upload -->
          <div>
            <label class="block text-sm text-gray-300 mb-1">Profile Photo</label>
            <input type="file" accept="image/*" capture="user" @change="handleAvatarUpload" class="file-input" />
            <div v-if="previewUrl" class="mt-3 flex items-center gap-3">
              <img :src="previewUrl" class="w-16 h-16 rounded-full border-2 border-cyan-500 object-cover shadow" />
              <div class="flex gap-2">
                <button type="button" class="btn-dark px-3 py-1" @click="retakeAvatar">Retake</button>
                <button v-if="form.avatarBlob" type="button" class="btn-outline px-3 py-1" @click="removeAvatar">Remove</button>
              </div>
            </div>
            <p class="hint">Auto-crops to square & compresses to ~512px for faster loads.</p>
          </div>

          <!-- Sticky Footer (thumb reach) -->
          <div class="sticky bottom-0 bg-gradient-to-t from-[#0f172a] to-transparent pt-2 -mx-6 px-6">
            <div class="flex justify-between items-center gap-3">
              <button type="button" @click="handleClose" class="btn-dark">❌ Cancel</button>
              <button type="submit" class="btn-cyan flex items-center gap-2" :disabled="loading || hasErrors || (!dirty && !form.avatarBlobChanged)">
                <span v-if="loading" class="loader"></span>
                <span>{{ loading ? 'Saving...' : '✅ Save' }}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <!-- close (desktop) -->
      <button class="hidden md:block absolute top-3 right-3 text-cyan-300/80 hover:text-cyan-200" @click="handleClose" aria-label="Close">
        <i class="i-tabler-x text-xl"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'

/* Props & Emits */
const props = defineProps({ show: Boolean, user: Object })
const emit  = defineEmits(['update', 'close'])

/* Refs & state */
const headingId = `hdr-${Math.random().toString(36).slice(2,8)}`
const form = ref({ name:'', username:'', bio:'', avatarBlob:null })
const previewUrl = ref(null)
const usernameInput = ref('')
const useUsername = ref(false)
const loading = ref(false)
const sheetEl = ref(null)
const restored = ref(false)
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const onOnline = () => online.value = true
const onOffline = () => online.value = false

/* Validation */
const errors = ref({ name:'', username:'' })
const touched = ref({ name:false, username:false })
const hasErrors = computed(()=> !!errors.value.name || !!errors.value.username)

/* Dirty check (also consider avatar change) */
const base = ref({ name:'', username:'', bio:'', avatarUrl:'' })
const dirty = computed(()=> JSON.stringify({n:form.value.name,u:form.value.username,b:form.value.bio}) !== JSON.stringify({n:base.value.name,u:base.value.username,b:base.value.bio}))
const avatarBlobChanged = ref(false)

/* Bio counter */
const BIO_MAX = 160
const bioCount = computed(()=> (form.value.bio || '').length)

/* Display name / handle preview */
const normalizedHandle = computed(()=> normalizeUsername(usernameInput.value))
const previewHandle = computed(()=> normalizedHandle.value.replace(/^@/, ''))
const displayName = computed(()=> useUsername.value ? `@${previewHandle.value}` : (form.value.name || ''))


/* ---------- Watch incoming user ---------- */
watch(()=>props.user, (u)=>{
  if (!u) return
  form.value.name = u.name || ''
  form.value.username = (u.username || '').replace(/^@/,'')
  usernameInput.value = form.value.username
  form.value.bio = u.bio || ''
  previewUrl.value = u.avatar || '/user-avatar.png'
  form.value.avatarBlob = null
  avatarBlobChanged.value = false
  base.value = { name: form.value.name, username: form.value.username, bio: form.value.bio, avatarUrl: previewUrl.value }
  // restore draft if exists for this user
  restoreDraft(u.username || u.id || 'default')
}, { immediate:true })

/* ---------- Username checks (debounced) ---------- */
const checkingUser = ref(false)
const userState = ref('') // '', 'ok', 'taken', 'invalid'
let uTimer
function onUsernameInput(){
  usernameInput.value = usernameInput.value.replace(/\s+/g,'')
  validate()
  clearTimeout(uTimer)
  const host = normalizedHandle.value.replace(/^@/,'')
  if (!host) { userState.value=''; return }
  checkingUser.value = true
  uTimer = setTimeout(()=>{
    // Simulated availability (stable hash)
    const hash = [...host].reduce((a,c)=>((a<<5)-a)+c.charCodeAt(0),0)
    userState.value = (Math.abs(hash)%7===0) ? 'taken' : 'ok'
    checkingUser.value = false
  }, 500)
}
function onUsernameBlur(){ touched.value.username = true; validate() }

/* ---------- Validation ---------- */
function validate(){
  // name
  errors.value.name = !form.value.name ? 'Full name is required.' :
                      form.value.name.length < 2 ? 'Name too short.' : ''
  // username
  const u = normalizedHandle.value.replace(/^@/,'')
  const ok = /^[a-z0-9_\.]{3,15}$/.test(u || '')
  errors.value.username = !u ? 'Username is required.' :
                           !ok ? '3–15 chars: letters, numbers, _ or .' :
                           (userState.value==='taken' ? 'Username already taken.' : '')
}

/* ---------- Username helpers ---------- */
function normalizeUsername(raw=''){
  return '@' + raw.toLowerCase().replace(/^@/,'').replace(/[^a-z0-9_\.]/g,'')
}

/* ---------- Bio handlers ---------- */
function onBioInput(){
  if ((form.value.bio||'').length > BIO_MAX) {
    form.value.bio = form.value.bio.slice(0, BIO_MAX)
  }
}

/* ---------- Avatar: compress square 512px ---------- */
async function handleAvatarUpload(e){
  const file = e?.target?.files?.[0]
  if (!file) return
  const { blob, url } = await toSquareCompressedBlob(file, 512)
  form.value.avatarBlob = blob
  avatarBlobChanged.value = true
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = url
}
function retakeAvatar(){ form.value.avatarBlob=null; avatarBlobChanged.value=false; previewUrl.value = props.user?.avatar || '/user-avatar.png' }
function removeAvatar(){
  form.value.avatarBlob=null; avatarBlobChanged.value=true
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
}
async function toSquareCompressedBlob(file, size=512){
  const img = await fileToImage(file)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const side = Math.min(img.width, img.height)
  const sx = (img.width - side) / 2
  const sy = (img.height - side) / 2
  canvas.width = size; canvas.height = size
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
  const blob = await new Promise(res => canvas.toBlob(res, 'image/webp', 0.9))
  return { blob, url: URL.createObjectURL(blob) }
}
function fileToImage(file){
  return new Promise((res, rej)=>{
    const fr = new FileReader()
    fr.onload = () => { const img = new Image(); img.onload=()=>res(img); img.onerror=rej; img.src = fr.result }
    fr.onerror = rej
    fr.readAsDataURL(file)
  })
}

/* ---------- Autosave / Restore (per user) ---------- */
const DRAFT_NS = 'profile_edit_draft:'
function draftKey(key){ return DRAFT_NS + (key || 'default') }
function autosave(){
  try {
    const key = draftKey(props.user?.username || props.user?.id || 'default')
    const data = {
      name: form.value.name, username: usernameInput.value, bio: form.value.bio,
      useUsername: useUsername.value
    }
    localStorage.setItem(key, JSON.stringify(data))
  } catch {}
}
function restoreDraft(keyId){
  try {
    const raw = localStorage.getItem(draftKey(keyId))
    if (!raw) return
    const d = JSON.parse(raw)
    form.value.name = d.name ?? form.value.name
    usernameInput.value = d.username ?? usernameInput.value
    useUsername.value = !!d.useUsername
    form.value.bio = d.bio ?? form.value.bio
    restored.value = true; setTimeout(()=> restored.value=false, 2200)
  } catch {}
}

/* ---------- Save ---------- */
async function saveChanges(){
  touched.value.name = true; touched.value.username = true; validate()
  if (hasErrors.value) { vibrate(5); return }
  loading.value = true
  setTimeout(async () => {
    const finalName = useUsername.value ? '@' + (form.value.username || normalizedHandle.value.replace(/^@/,'')) : form.value.name
    // Merge normalized username back to form
    form.value.username = normalizedHandle.value.replace(/^@/,'')
    // Build payload
    const payload = {
      name: form.value.name,
      username: form.value.username,
      bio: form.value.bio,
      displayName: finalName,
      avatar: form.value.avatarBlob || undefined
    }
    emit('update', payload)
    // clear draft
    try { localStorage.removeItem(draftKey(props.user?.username || props.user?.id || 'default')) } catch {}
    loading.value = false
    vibrate(10)
    // UX toast fallback
    // prefer your toast lib; fallback:
    try { /* no-op if you have toasts */ } catch {}
    handleClose()
  }, 900)
}

/* ---------- Close / ESC / Focus management ---------- */
const lastActive = ref(null)
function handleClose(){ emit('close') }
function onKey(e){ if (e.key === 'Escape') handleClose() }

/* Lock body scroll on open (mobile) + focus */
watch(()=>props.show, (v)=>{
  if (v){
    lastActive.value = document.activeElement
    document.body.style.overflow = 'hidden'
    setTimeout(()=> sheetEl.value?.querySelector('input,textarea,select')?.focus(), 30)
    window.addEventListener('keydown', onKey)
  } else {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKey)
    lastActive.value?.focus?.()
  }
})

/* Online listeners + autosave heartbeat */
let autoTimer
onMounted(()=>{
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  autoTimer = setInterval(autosave, 800)
})
onBeforeUnmount(()=>{
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
  clearInterval(autoTimer)
})

/* ---------- Swipe to dismiss (mobile) ---------- */
const startY = ref(0)
const deltaY = ref(0)
function onTouchStart(e){ startY.value = e.touches[0].clientY; deltaY.value = 0 }
function onTouchMove(e){
  deltaY.value = e.touches[0].clientY - startY.value
  if (deltaY.value > 80 && window.innerWidth < 768) handleClose()
}
function onTouchEnd(){ deltaY.value = 0 }

/* ---------- Misc helpers ---------- */
function vibrate(ms){ if (navigator.vibrate) navigator.vibrate(ms) }

/* Derived errors */
function touch(field){ touched.value[field] = true }

</script>

<style scoped>
/* Tailwind helpers via @apply-like classes */
.input {
  @apply w-full px-3 py-2 rounded-md bg-[#1e293b] border border-cyan-700 text-white
         focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-gray-400;
}
.input-error { @apply border-rose-500 focus:ring-rose-500; }
.file-input {
  @apply w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md
         file:border-0 file:bg-cyan-700 file:text-white hover:file:bg-cyan-600;
}
.btn-dark {
  @apply bg-[#0b1324] text-gray-200 px-4 py-2 rounded-md border border-cyan-800 hover:bg-[#0c1426] active:scale-[.99] transition;
}
.btn-outline {
  @apply bg-transparent text-cyan-300 border border-cyan-700 rounded-md hover:bg-cyan-800/30 transition;
}
.btn-cyan {
  @apply bg-cyan-500 text-[#0b1324] font-semibold px-4 py-2 rounded-md shadow hover:bg-cyan-400 active:scale-[.99] disabled:opacity-60 transition;
}
.hint { @apply text-xs text-gray-400 mt-1; }
.err  { @apply text-xs text-rose-400 mt-1; }
.abs-btn { @apply absolute inset-y-0 right-2 my-auto text-cyan-300 hover:text-white; }

/* Chips */
.chip{ @apply inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px]; }
.chip-ok{ @apply bg-emerald-50 text-emerald-700 border-emerald-200; }
.chip-warn{ @apply bg-amber-50 text-amber-700 border-amber-200; }
.chip-info{ @apply bg-slate-50 text-slate-700 border-slate-200; }
.chip-accent{ @apply bg-cyan-50 text-cyan-700 border-cyan-200; }

/* Counters */
.count{
  @apply absolute bottom-2 right-2 text-[11px] text-gray-400 bg-black/20 px-1.5 py-0.5 rounded;
}

/* Animations */
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
@keyframes fadeInUp { from{opacity:0; transform:translateY(20px)} to{opacity:1; transform:translateY(0)} }
@keyframes slideUp { from{ transform: translateY(24px) } to{ transform: translateY(0) } }
.animate-fadeIn { animation: fadeIn .25s ease both; }
.animate-fadeInUp { animation: fadeInUp .45s ease both; }
.animate-slideUpSafe { animation: slideUp .4s ease both; }

/* Icons fallback */
i[class^="i-"], i[class*=" i-"]{ display:inline-block; }
</style>
