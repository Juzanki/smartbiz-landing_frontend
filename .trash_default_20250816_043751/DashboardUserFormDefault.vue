<template>
  <form
    class="relative bg-white/95 rounded-2xl shadow-xl border border-yellow-300 mx-auto w-[min(94vw,40rem)] p-4 sm:p-6"
    autocomplete="off" novalidate
    @submit.prevent="onSubmit"
  >
    <!-- Header + status -->
    <header class="flex items-center gap-3 mb-3">
      <!-- Avatar -->
      <div class="relative h-14 w-14 rounded-2xl overflow-hidden ring-1 ring-black/5">
        <img v-if="form.avatarDataUrl" :src="form.avatarDataUrl" class="w-full h-full object-cover" alt="avatar" />
        <div v-else class="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 grid place-items-center">
          <span class="text-slate-400 text-xl">👤</span>
        </div>
        <input ref="fileEl" type="file" accept="image/*" class="hidden" @change="onPickAvatar" />
        <button type="button" class="absolute bottom-1 right-1 bg-black/70 text-white text-[11px] px-2 py-0.5 rounded-lg"
                @click="fileEl?.click()" title="Change photo">
          Change
        </button>
        <button v-if="form.avatarDataUrl" type="button"
                class="absolute top-1 right-1 bg-white/90 text-rose-600 text-[11px] px-2 py-0.5 rounded-lg"
                @click="removeAvatar" title="Remove">
          Clear
        </button>
      </div>

      <div class="min-w-0">
        <h3 class="text-lg sm:text-xl font-bold text-blue-900">Update Profile</h3>
        <div class="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
          <span :class="['px-2 py-0.5 rounded-full border',
                        online ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                               : 'bg-amber-50 text-amber-700 border-amber-200']">
            <i :class="online ? 'i-tabler-wifi' : 'i-tabler-wifi-off'"></i>
            {{ online ? 'Online' : 'Offline (draft only)' }}
          </span>
          <span v-if="dirty" class="px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700 border-slate-200">
            Unsaved changes
          </span>
          <span v-if="restored" class="px-2 py-0.5 rounded-full border bg-yellow-50 text-yellow-700 border-yellow-200">
            Draft restored
          </span>
        </div>
      </div>
    </header>

    <!-- Full Name -->
    <div>
      <label for="userName" class="block text-sm font-medium text-blue-900 mb-1">Full Name</label>
      <input
        id="userName" v-model.trim="form.name" type="text" inputmode="text"
        placeholder="Your full name"
        :aria-invalid="!!errors.name"
        class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        @blur="touch('name')" required
      />
      <p v-if="touched.name && errors.name" class="mt-1 text-[13px] text-rose-600">{{ errors.name }}</p>
    </div>

    <!-- Email -->
    <div>
      <label for="userEmail" class="block text-sm font-medium text-blue-900 mb-1">Email</label>
      <div class="relative">
        <input
          id="userEmail" v-model.trim="form.email" type="email" inputmode="email" autocomplete="email"
          placeholder="your@email.com"
          :aria-invalid="!!errors.email"
          class="w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          @blur="touch('email')" required
        />
        <button type="button" class="absolute inset-y-0 right-2 my-auto text-slate-500 hover:text-slate-700"
                @click="copyEmail" title="Copy email">📋</button>
      </div>
      <p v-if="touched.email && errors.email" class="mt-1 text-[13px] text-rose-600">{{ errors.email }}</p>
    </div>

    <!-- Phone -->
    <div>
      <div class="flex items-center justify-between">
        <label for="userPhone" class="block text-sm font-medium text-blue-900 mb-1">Phone</label>
        <button v-if="canPickContacts" type="button" @click="pickFromContacts"
                class="text-[12px] text-blue-700 underline underline-offset-2">Pick from Contacts</button>
      </div>
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 select-none">+</span>
        <input
          id="userPhone" v-model="phoneDisplay" type="tel" inputmode="tel" autocomplete="tel"
          placeholder="255 7XX XXX XXX"
          :aria-invalid="!!errors.phone"
          class="w-full border rounded-lg pl-7 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          @input="formatPhone" @blur="touch('phone')"
        />
      </div>
      <p v-if="touched.phone && errors.phone" class="mt-1 text-[13px] text-rose-600">{{ errors.phone }}</p>
      <p class="mt-1 text-[12px] text-slate-500">International format stored (e.g., +2557XXXXXXXX).</p>
    </div>

    <!-- Notifications -->
    <div class="flex items-center justify-between gap-4">
      <label for="notif" class="text-sm text-blue-900 select-none">Receive Notifications</label>
      <input id="notif" type="checkbox" v-model="form.notifications"
             @change="maybeRequestPush"
             class="h-5 w-10 appearance-none rounded-full bg-slate-200 relative outline-none cursor-pointer transition
                    before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:shadow before:transition
                    checked:bg-emerald-400 checked:before:translate-x-5" />
    </div>

    <!-- Inline status / success -->
    <transition name="fade">
      <div v-if="banner" class="mt-1 text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded text-center font-medium shadow-sm"
           role="status" aria-live="polite">
        {{ banner }}
      </div>
    </transition>

    <!-- Sticky Actions (thumb reach) -->
    <footer class="sticky bottom-0 bg-gradient-to-t from-white to-transparent pt-3"
            :style="{ paddingBottom: 'calc(.75rem + env(safe-area-inset-bottom))' }">
      <div class="flex items-center gap-2">
        <button type="button" class="flex-1 border rounded-lg px-4 py-2 font-semibold disabled:opacity-60"
                :disabled="loading || !dirty" @click="resetForm">
          Reset
        </button>
        <button type="submit"
                class="flex-[2] bg-yellow-400 text-blue-900 font-bold rounded-lg px-4 py-2 shadow hover:bg-yellow-300 transition disabled:opacity-60"
                :disabled="loading || hasErrors || !dirty || !online">
          <span v-if="!loading">Save Changes</span>
          <span v-else class="inline-flex items-center gap-2">
            <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg> Saving…
          </span>
        </button>
      </div>
    </footer>
  </form>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/* Props & Emits */
const props = defineProps({
  userData: { type: Object, default: () => ({}) },
  autosaveKey: { type: String, default: 'user_profile_ultra_draft' }
})
const emit = defineEmits(['update'])

/* Online */
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const onOnline = () => (online.value = true)
const onOffline = () => (online.value = false)

/* Form state */
const form = reactive({
  name: props.userData.name || '',
  email: props.userData.email || '',
  phone: props.userData.phone || '',
  notifications: props.userData.notifications ?? true,
  avatarDataUrl: props.userData.avatarDataUrl || ''
})
const base = reactive({ ...form })
const dirty = computed(() => JSON.stringify(form) !== JSON.stringify(base))

/* Validation */
const errors = reactive({ name: '', email: '', phone: '' })
const touched = reactive({ name: false, email: false, phone: false })
const hasErrors = computed(() => Object.values(errors).some(Boolean))
function touch(k){ touched[k] = true }
function validate(){
  errors.name = !form.name ? 'Name is required.'
    : form.name.length < 2 ? 'Name is too short.'
    : form.name.length > 80 ? 'Name is too long (max 80).'
    : ''
  const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email || '')
  errors.email = !form.email ? 'Email is required.' : (!okEmail ? 'Invalid email format.' : '')
  const ph = (form.phone || '').replace(/\s+/g,'')
  const okPhone = ph === '' || /^\+\d{8,15}$/.test(ph) // optional; but if present, must be intl
  errors.phone = okPhone ? '' : 'Use +country then digits, e.g., +2557XXXXXXXX.'
}

/* Phone pretty format (store normalized) */
const phoneDisplay = ref(form.phone || '')
function formatPhone(e){
  let raw = e?.target?.value ?? phoneDisplay.value
  raw = raw.replace(/[^\d+]/g,'').replace(/(?!^)\+/g,'')
  const beautified = raw.startsWith('+2557')
    ? raw.replace(/^(\+2557)(\d{3})(\d{3})(\d{0,3}).*/, (_,a,b,c,d)=> d?`${a} ${b} ${c} ${d}`: c?`${a} ${b} ${c}`: b?`${a} ${b}`: a)
    : raw.replace(/^(\+\d{1,3})(\d{3})(\d{3})(\d{0,3}).*/, (_,a,b,c,d)=> d?`${a} ${b} ${c} ${d}`: c?`${a} ${b} ${c}`: b?`${a} ${b}`: a)
  phoneDisplay.value = beautified
  form.phone = beautified.replace(/\s+/g,'')
}

/* Contacts picker (if supported) */
const canPickContacts = 'contacts' in navigator && 'select' in navigator.contacts
async function pickFromContacts(){
  try{
    const props = ['name','email','tel']
    const opts = { multiple:false }
    const [c] = await navigator.contacts.select(props, opts)
    if (!c) return
    if (c.name?.[0]) form.name = c.name[0]
    if (c.email?.[0]) form.email = c.email[0]
    if (c.tel?.[0]) { phoneDisplay.value = c.tel[0]; formatPhone() }
  }catch{/* ignore */}
}

/* Avatar */
const fileEl = ref(null)
async function onPickAvatar(e){
  const file = e?.target?.files?.[0]
  if (!file) return
  if (file.size > 2*1024*1024) { ping('Image too large (max 2MB)'); return }
  const reader = new FileReader()
  reader.onload = () => { form.avatarDataUrl = reader.result }
  reader.readAsDataURL(file)
}
function removeAvatar(){ form.avatarDataUrl = '' }

/* Copy email */
async function copyEmail(){ try{ await navigator.clipboard.writeText(form.email || '') ; ping('Email copied') }catch{} }

/* Notifications permission */
const notifPerm = ref(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
async function maybeRequestPush(){
  if (!form.notifications || notifPerm.value !== 'default' || typeof Notification === 'undefined') return
  try { const p = await Notification.requestPermission(); notifPerm.value = p } catch {}
}

/* Autosave / restore */
const restored = ref(false)
let saveTimer
function autosave(){
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(props.autosaveKey, JSON.stringify({ ...form, phoneDisplay: phoneDisplay.value })) } catch {}
  }, 350)
}
function restore(){
  try {
    const raw = localStorage.getItem(props.autosaveKey)
    if (!raw) return
    const draft = JSON.parse(raw)
    Object.assign(form, draft)
    phoneDisplay.value = draft.phoneDisplay || draft.phone || ''
    restored.value = true
    setTimeout(()=> restored.value = false, 2200)
  } catch {}
}
function clearDraft(){ try { localStorage.removeItem(props.autosaveKey) } catch {} }

/* Submit */
const loading = ref(false)
const banner = ref('')
function ping(msg){ banner.value = msg; setTimeout(()=> banner.value = '', 1800) }

async function onSubmit(){
  touch('name'); touch('email'); touch('phone'); validate()
  if (hasErrors.value) { ping('Please fix the highlighted fields'); return }
  if (!online.value)  { autosave(); ping('Offline — draft saved'); return }

  loading.value = true
  try{
    // Simulate API (replace with real call)
    await new Promise(r=>setTimeout(r,800))
    emit('update', { ...form })
    Object.assign(base, JSON.parse(JSON.stringify(form)))
    clearDraft()
    if (navigator.vibrate) navigator.vibrate(10)
    ping('✔️ Profile updated!')
  } finally { loading.value = false }
}

/* Reset */
function resetForm(){
  Object.assign(form, JSON.parse(JSON.stringify(base)))
  phoneDisplay.value = form.phone || ''
  clearDraft()
  ping('↩️ Changes discarded')
}

/* Sync with parent changes */
watch(() => props.userData, (val) => {
  Object.assign(form, {
    name: val?.name || '', email: val?.email || '', phone: val?.phone || '',
    notifications: val?.notifications ?? true, avatarDataUrl: val?.avatarDataUrl || ''
  })
  phoneDisplay.value = form.phone || ''
  Object.assign(base, JSON.parse(JSON.stringify(form)))
}, { deep: true })

/* Live validate + autosave */
watch(form, () => { validate(); autosave() }, { deep: true })

/* Unsaved changes guard */
function beforeUnload(e){ if (!dirty.value) return; e.preventDefault(); e.returnValue = '' }

/* Lifecycle */
onMounted(() => {
  validate(); restore()
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  window.addEventListener('beforeunload', beforeUnload)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
  window.removeEventListener('beforeunload', beforeUnload)
})
</script>

<style scoped>
/* Smooth fades */
.fade-enter-active, .fade-leave-active { transition: opacity .25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
/* iconify/tabler fallback */
i[class^="i-"], i[class*=" i-"] { display:inline-block; }
</style>
