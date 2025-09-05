<!-- 📁 src/components/ProfileFormPro.vue -->
<template>
  <form @submit.prevent="onSubmit" class="relative max-w-xl mx-auto p-4 sm:p-6 bg-white dark:bg-[#0b1020] rounded-2xl shadow border border-black/10 dark:border-white/10" :style="safeArea" aria-labelledby="profile-title">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h2 id="profile-title" class="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">Edit Profile</h2>
      <span v-if="dirty" class="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" title="Unsaved changes"></span>
    </div>

    <!-- Avatar -->
    <section class="mt-4 grid place-items-center">
      <div class="relative">
        <img
          :src="avatarPreview || defaultAvatar"
          alt="Avatar"
          class="h-24 w-24 rounded-full object-cover ring-2 ring-white shadow-md"
        />
        <!-- Controls -->
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-2">
          <button type="button" class="ctl" title="Upload" @click="fileEl?.click()">📷</button>
          <button type="button" class="ctl" title="Paste URL" @click="showUrl = !showUrl">🔗</button>
          <button v-if="avatarPreview" type="button" class="ctl" title="Remove" @click="removeAvatar">✖</button>
        </div>
        <input ref="fileEl" class="hidden" type="file" accept="image/*" capture="user" @change="onPick" />
      </div>

      <!-- URL input -->
      <transition name="fade">
        <div v-if="showUrl" class="w-full mt-3">
          <label :for="ids.avatarUrl" class="label">Avatar URL</label>
          <input :id="ids.avatarUrl" v-model.trim="model.avatar" type="url" inputmode="url" placeholder="https://..."
                 class="input" @blur="applyAvatarUrl" />
        </div>
      </transition>
    </section>

    <!-- Fields -->
    <section class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div class="grid gap-1">
        <label :for="ids.fullName" class="label">👤 Full Name <span class="req">*</span></label>
        <input :id="ids.fullName" ref="nameEl" v-model.trim="model.fullName" type="text" class="input" placeholder="Jane Doe" :aria-invalid="!!v.fullName" required />
        <p v-if="v.fullName" class="err">{{ v.fullName }}</p>
      </div>

      <div class="grid gap-1">
        <label :for="ids.email" class="label">📧 Email <span class="req">*</span></label>
        <input :id="ids.email" v-model.trim="model.email" type="email" inputmode="email" autocomplete="email" class="input" placeholder="you@example.com" :aria-invalid="!!v.email" required />
        <p v-if="v.email" class="err">{{ v.email }}</p>
      </div>

      <div class="grid gap-1">
        <label :for="ids.phone" class="label">📞 Phone</label>
        <input :id="ids.phone" v-model.trim="model.phone" type="tel" inputmode="tel" autocomplete="tel"
               class="input" placeholder="+2557XXXXXXXX" :aria-invalid="!!v.phone"/>
        <p v-if="v.phone" class="err">{{ v.phone }}</p>
      </div>

      <div class="grid gap-1">
        <label :for="ids.password" class="label">🔒 New Password</label>
        <input :id="ids.password" v-model="model.password" type="password" autocomplete="new-password" class="input" placeholder="Leave blank to keep current" :aria-invalid="!!v.password" />
        <div v-if="model.password" class="mt-1">
          <div class="h-1.5 rounded bg-black/10 dark:bg-white/10 overflow-hidden">
            <div class="h-full" :class="strength.color" :style="{ width: strength.width }"></div>
          </div>
          <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{{ strength.label }}</div>
        </div>
        <p v-if="v.password" class="err">{{ v.password }}</p>
      </div>

      <div class="grid gap-1 sm:col-span-1">
        <label :for="ids.location" class="label">📍 Location</label>
        <input :id="ids.location" v-model.trim="model.location" type="text" class="input" placeholder="Dar es Salaam, TZ" />
      </div>

      <div class="grid gap-1 sm:col-span-1">
        <label :for="ids.bio" class="label">📝 Short Bio</label>
        <textarea :id="ids.bio" v-model.trim="model.bio" rows="2" class="input min-h-[76px]" placeholder="About you..."></textarea>
      </div>

      <div class="grid gap-1 sm:col-span-2">
        <label class="label">🔔 Notification Preference</label>
        <div class="seg">
          <button type="button" class="seg-btn" :class="{ 'seg-active': model.notificationPreference==='Email' }" @click="model.notificationPreference='Email'">Email</button>
          <button type="button" class="seg-btn" :class="{ 'seg-active': model.notificationPreference==='SMS' }" @click="model.notificationPreference='SMS'">SMS</button>
          <button type="button" class="seg-btn" :class="{ 'seg-active': model.notificationPreference==='Both' }" @click="model.notificationPreference='Both'">Both</button>
        </div>
      </div>
    </section>

    <!-- Spacer for sticky bar -->
    <div class="h-16"></div>

    <!-- Sticky actions -->
    <div class="fixed left-0 right-0 bottom-0 z-50 px-3 pb-3">
      <div class="max-w-xl mx-auto rounded-2xl bg-white/85 dark:bg-black/60 backdrop-blur border border-black/10 dark:border-white/10 p-2 flex items-center gap-2">
        <button type="button" class="btn-soft flex-1" @click="resetToProps">Reset</button>
        <button type="submit" class="btn-primary" :disabled="submitting || !isValid">
          <span v-if="!submitting">💾 Save Changes</span>
          <span v-else class="inline-flex items-center gap-2"><span class="spinner"></span>Saving…</span>
        </button>
      </div>
    </div>
  </form>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted, nextTick } from 'vue'

/** Props & Emits (backward-compatible) */
const props = defineProps({ profile: { type: Object, required: true } })
const emit  = defineEmits(['submit'])

/** Safe-area for notches */
const safeArea = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }

/** Defaults */
const defaultAvatar = '/default-avatar.png'

/** Local model (reactive copy) */
const model = reactive({
  avatar: props.profile?.avatar || '',
  fullName: props.profile?.fullName || '',
  email: props.profile?.email || '',
  phone: props.profile?.phone || '',
  password: '',
  location: props.profile?.location || '',
  bio: props.profile?.bio || '',
  notificationPreference: props.profile?.notificationPreference || ''
})

/** Refs */
const fileEl = ref(null)
const nameEl = ref(null)
const showUrl = ref(false)
const avatarPreview = ref(model.avatar || '')

/** Watch incoming prop to keep in sync */
watch(() => props.profile, (v) => {
  Object.assign(model, {
    avatar: v?.avatar || '',
    fullName: v?.fullName || '',
    email: v?.email || '',
    phone: v?.phone || '',
    password: '',
    location: v?.location || '',
    bio: v?.bio || '',
    notificationPreference: v?.notificationPreference || ''
  })
  avatarPreview.value = model.avatar || ''
  dirty.value = false
})

/** Dirty + autosave draft */
const dirty = ref(false)
watch(model, () => {
  dirty.value = true
  localStorage.setItem('profile_draft', JSON.stringify(model))
}, { deep: true })

/** Validation */
const v = reactive({ fullName:'', email:'', phone:'', password:'' })
const isValid = computed(() => {
  v.fullName = model.fullName?.trim() ? '' : 'Full name is required.'
  v.email = /^\S+@\S+\.\S+$/.test(model.email || '') ? '' : 'Valid email is required.'
  v.phone = model.phone && !/^\+?[0-9\s\-()]{7,20}$/.test(model.phone) ? 'Invalid phone format.' : ''
  if (model.password) {
    v.password = model.password.length < 8 ? 'Password must be at least 8 characters.' : ''
  } else v.password = ''
  return !(v.fullName || v.email || v.phone || v.password)
})

/** Password strength */
const strength = computed(() => {
  const p = model.password || ''
  let score = 0
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p)) score++
  if (/[a-z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  const steps = ['Weak','Okay','Good','Strong','Elite']
  const colors = ['bg-rose-500','bg-amber-500','bg-yellow-500','bg-emerald-500','bg-indigo-600']
  const idx = Math.min(score, 5) - 1
  return { label: score ? steps[idx] : '—', color: score ? colors[idx] : 'bg-transparent', width: `${(score/5)*100}%` }
})

/** Avatar handlers */
function applyAvatarUrl(){ avatarPreview.value = model.avatar || '' }
function removeAvatar(){ model.avatar = ''; avatarPreview.value = '' }
function onPick(e){
  const f = e.target.files?.[0]; if (!f) return
  if (!/^image\//.test(f.type)) return
  compressImage(f, 600, 600, 0.85).then(({ dataUrl }) => {
    model.avatar = dataUrl
    avatarPreview.value = dataUrl
  })
  e.target.value = ''
}

/** Simple image compression (canvas) */
function compressImage(file, maxW=600, maxH=600, quality=0.85){
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = () => { img.src = reader.result }
    reader.onerror = reject
    img.onload = () => {
      let { width, height } = img
      const ratio = Math.min(maxW/width, maxH/height, 1)
      const w = Math.round(width*ratio), h = Math.round(height*ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', quality), width: w, height: h })
    }
    reader.readAsDataURL(file)
  })
}

/** Submit */
const submitting = ref(false)
async function onSubmit(){
  if (!isValid.value) return
  submitting.value = true
  try {
    const payload = { ...model }
    emit('submit', payload)
    localStorage.removeItem('profile_draft')
    dirty.value = false
  } finally { submitting.value = false }
}

/** Lifecycle */
onMounted(async () => {
  // Restore draft (if exists and no dirty props change)
  try {
    const draft = JSON.parse(localStorage.getItem('profile_draft') || 'null')
    if (draft && !dirty.value) Object.assign(model, draft)
  } catch {}
  await nextTick(); nameEl.value?.focus()
})

/** IDs for a11y */
const ids = {
  avatarUrl: 'avatar-url-' + rnd(),
  fullName:  'full-' + rnd(),
  email:     'mail-' + rnd(),
  phone:     'phone-' + rnd(),
  password:  'pass-' + rnd(),
  location:  'loc-' + rnd(),
  bio:       'bio-' + rnd()
}
function rnd(){ return Math.random().toString(36).slice(2,7) }
</script>

<style scoped>
/* Base inputs/buttons */
.label { @apply text-[12px] font-semibold text-slate-700 dark:text-slate-200; }
.req { @apply text-rose-600; }
.input { @apply h-11 w-full px-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm; }
.btn-primary { @apply h-11 px-4 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-500 active:translate-y-[1px]; }
.btn-soft { @apply h-11 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/10 text-slate-800 dark:text-white active:translate-y-[1px]; }
.ctl { @apply h-8 w-8 grid place-items-center rounded-full bg-white text-black text-sm shadow border border-black/10; }
.err { @apply text-[11px] text-rose-600 dark:text-rose-300; }

/* Segmented control */
.seg { @apply grid grid-cols-3 bg-black/5 dark:bg-white/10 rounded-xl p-1; }
.seg-btn { @apply h-10 rounded-lg text-sm font-semibold; }
.seg-active { @apply bg-indigo-600 text-white; }

/* Spinner */
.spinner { width:16px;height:16px;border-radius:9999px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;animation:spin 1s linear infinite }
@keyframes spin { to { transform: rotate(360deg) } }

/* Transitions */
.fade-enter-active,.fade-leave-active { transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to { opacity: 0 }
</style>
