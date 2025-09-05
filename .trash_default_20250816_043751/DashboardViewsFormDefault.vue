<!-- src/components/DashboardViewsForm.vue -->
<template>
  <form
    class="relative bg-white/95 rounded-2xl shadow-xl border border-yellow-300 mx-auto w-[min(94vw,40rem)] p-4 sm:p-6 flex flex-col gap-4"
    autocomplete="off"
    novalidate
    @submit.prevent="onSubmit"
  >
    <!-- Header + status chips -->
    <header class="mb-1">
      <h3 class="text-lg sm:text-xl font-bold text-blue-900">
        {{ $t('quick_profile_edit') || 'Quick Profile Edit' }}
      </h3>
      <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
        <span :class="['px-2 py-0.5 rounded-full border',
                      online ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                             : 'bg-amber-50 text-amber-700 border-amber-200']">
          <i :class="online ? 'i-tabler-wifi' : 'i-tabler-wifi-off'"></i>
          {{ online ? ($t('online') || 'Online') : ($t('offline') || 'Offline') }}
        </span>
        <span v-if="dirty" class="px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700 border-slate-200">
          {{ $t('unsaved_changes') || 'Unsaved changes' }}
        </span>
        <span v-if="restored" class="px-2 py-0.5 rounded-full border bg-yellow-50 text-yellow-700 border-yellow-200">
          {{ $t('draft_restored') || 'Draft restored' }}
        </span>
      </div>
    </header>

    <!-- Full Name -->
    <div>
      <label for="fullName" class="block text-sm font-medium text-blue-900 mb-1">
        {{ $t('full_name') || 'Full Name' }}
      </label>
      <input
        id="fullName"
        v-model.trim="form.fullName"
        type="text"
        autocomplete="name"
        :placeholder="$t('enter_full_name') || 'Enter full name'"
        class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        :aria-invalid="!!errors.fullName"
        @blur="touch('fullName')"
        required
      />
      <p v-if="touched.fullName && errors.fullName" class="mt-1 text-[13px] text-rose-600">{{ errors.fullName }}</p>
    </div>

    <!-- Email -->
    <div>
      <label for="userEmail" class="block text-sm font-medium text-blue-900 mb-1">
        {{ $t('email') || 'Email' }}
      </label>
      <div class="relative">
        <input
          id="userEmail"
          v-model.trim="form.email"
          type="email"
          autocomplete="email"
          :placeholder="$t('your_email') || 'your@email.com'"
          class="w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          :aria-invalid="!!errors.email"
          @blur="touch('email')"
          required
        />
        <button type="button" class="absolute inset-y-0 right-2 my-auto text-slate-500 hover:text-slate-700"
                @click="copyEmail" :title="$t('copy') || 'Copy'">📋</button>
      </div>
      <p v-if="touched.email && errors.email" class="mt-1 text-[13px] text-rose-600">{{ errors.email }}</p>
    </div>

    <!-- Phone Number -->
    <div>
      <div class="flex items-center justify-between">
        <label for="phone" class="block text-sm font-medium text-blue-900 mb-1">
          {{ $t('phone') || 'Phone' }}
        </label>
        <button v-if="canPickContacts" type="button" @click="pickFromContacts"
                class="text-[12px] text-blue-700 underline underline-offset-2">
          {{ $t('pick_from_contacts') || 'Pick from Contacts' }}
        </button>
      </div>
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 select-none">+</span>
        <input
          id="phone"
          v-model="phoneDisplay"
          type="tel"
          autocomplete="tel"
          :placeholder="$t('your_phone') || '255 7XX XXX XXX'"
          class="w-full border rounded-lg pl-7 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          :aria-invalid="!!errors.phone"
          @input="formatPhone"
          @blur="touch('phone')"
        />
      </div>
      <p v-if="touched.phone && errors.phone" class="mt-1 text-[13px] text-rose-600">{{ errors.phone }}</p>
      <p class="mt-1 text-[12px] text-slate-500">
        {{ $t('intl_format_note') || 'International format stored (e.g., +2557XXXXXXXX).' }}
      </p>
    </div>

    <!-- Change Password (optional) -->
    <div>
      <label for="password" class="block text-sm font-medium text-blue-900 mb-1">
        {{ $t('change_password') || 'Change Password' }}
      </label>
      <div class="relative">
        <input
          :type="showPass ? 'text' : 'password'"
          id="password"
          v-model="form.password"
          :placeholder="$t('new_password') || '•••••••••••'"
          class="w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          autocomplete="new-password"
          @input="scorePassword"
        />
        <button type="button" class="absolute inset-y-0 right-2 my-auto text-slate-500 hover:text-slate-700"
                @click="showPass = !showPass" :title="showPass ? ($t('hide') || 'Hide') : ($t('show') || 'Show')">
          <i :class="showPass ? 'i-tabler-eye-off' : 'i-tabler-eye'"></i>
        </button>
      </div>
      <div v-if="form.password" class="mt-1">
        <div class="h-1.5 rounded-full overflow-hidden bg-slate-200">
          <div class="h-full transition-all" :class="passBarClass" :style="{ width: passScore + '%' }"></div>
        </div>
        <p class="text-[12px] mt-1" :class="passTextClass">{{ passLabel }}</p>
        <p class="text-[11px] text-slate-500">{{ $t('leave_blank_to_keep') || 'Leave blank to keep your current password.' }}</p>
      </div>
      <p v-else class="text-[11px] text-slate-500">{{ $t('leave_blank_to_keep') || 'Leave blank to keep your current password.' }}</p>
    </div>

    <!-- Notifications -->
    <div class="flex items-center justify-between gap-4">
      <label for="notif" class="text-sm text-blue-900 select-none">
        {{ $t('enable_notifications') || 'Enable notifications' }}
      </label>
      <input
        id="notif"
        type="checkbox"
        v-model="form.notifications"
        @change="maybeRequestPush"
        class="h-5 w-10 appearance-none rounded-full bg-slate-200 relative outline-none cursor-pointer transition
               before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:shadow before:transition
               checked:bg-emerald-400 checked:before:translate-x-5"
      />
    </div>

    <!-- Inline feedback -->
    <transition name="fade">
      <div v-if="banner" class="text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded text-center font-medium shadow-sm" role="status" aria-live="polite">
        {{ banner }}
      </div>
    </transition>

    <!-- Sticky Actions (thumb-reach) -->
    <footer class="sticky bottom-0 bg-gradient-to-t from-white to-transparent pt-3"
            :style="{ paddingBottom: 'calc(.75rem + env(safe-area-inset-bottom))' }">
      <div class="flex items-center gap-2">
        <button type="button" class="flex-1 border rounded-lg px-4 py-2 font-semibold disabled:opacity-60"
                :disabled="loading || !dirty" @click="resetForm">
          {{ $t('reset') || 'Reset' }}
        </button>
        <button
          type="submit"
          class="flex-[2] bg-yellow-400 text-blue-900 font-bold rounded-lg px-4 py-2 shadow hover:bg-yellow-300 transition disabled:opacity-60"
          :disabled="loading || hasErrors || !dirty || !online"
        >
          <span v-if="!loading">{{ $t('save_changes') || 'Save Changes' }}</span>
          <span v-else class="inline-flex items-center gap-2">
            <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg> {{ $t('saving') || 'Saving...' }}
          </span>
        </button>
      </div>
    </footer>

    <!-- Slot ya feedback ya mzazi -->
    <slot name="feedback"></slot>
  </form>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/* Props & Emits (v-model compatible) */
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ fullName: '', email: '', phone: '', notifications: true })
  },
  autosaveKey: { type: String, default: 'dashboard_views_form_draft' }
})
const emit = defineEmits(['update:modelValue', 'saved'])

/* Online status */
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const onOnline = () => (online.value = true)
const onOffline = () => (online.value = false)

/* Local state */
const form = reactive({
  fullName: props.modelValue.fullName || '',
  email: props.modelValue.email || '',
  phone: props.modelValue.phone || '',
  password: '',
  notifications: props.modelValue.notifications ?? true
})
const base = reactive({ ...form })
const dirty = computed(() => JSON.stringify(form) !== JSON.stringify(base))

/* Validation */
const errors = reactive({ fullName: '', email: '', phone: '' })
const touched = reactive({ fullName: false, email: false, phone: false })
const hasErrors = computed(() => Object.values(errors).some(Boolean))
function touch(k){ touched[k] = true }
function validate(){
  errors.fullName = !form.fullName ? 'Full name is required.'
    : form.fullName.length < 2 ? 'Name is too short.'
    : form.fullName.length > 80 ? 'Name is too long (max 80).'
    : ''
  const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email || '')
  errors.email = !form.email ? 'Email is required.' : (!okEmail ? 'Invalid email format.' : '')
  const ph = (form.phone || '').replace(/\s+/g,'')
  const okPhone = ph === '' || /^\+\d{8,15}$/.test(ph)
  errors.phone = okPhone ? '' : 'Use +country then digits, e.g., +2557XXXXXXXX.'
}

/* Pretty phone (store normalized) */
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

/* Password strength */
const showPass = ref(false)
const passScore = ref(0)
const passLabel = computed(()=>{
  if (!form.password) return ''
  if (passScore.value >= 80) return 'Strong password'
  if (passScore.value >= 55) return 'Medium password'
  return 'Weak password'
})
const passBarClass = computed(()=> passScore.value >= 80 ? 'bg-emerald-500' : passScore.value >= 55 ? 'bg-amber-500' : 'bg-rose-500')
const passTextClass = computed(()=> passScore.value >= 80 ? 'text-emerald-600' : passScore.value >= 55 ? 'text-amber-600' : 'text-rose-600')
function scorePassword(){
  const p = form.password || ''
  let s = 0
  if (p.length >= 8) s += 30
  if (p.length >= 12) s += 20
  if (/[a-z]/.test(p)) s += 10
  if (/[A-Z]/.test(p)) s += 10
  if (/\d/.test(p))    s += 15
  if (/[^A-Za-z0-9]/.test(p)) s += 15
  passScore.value = Math.min(100, s)
}

/* Contacts picker (if supported) */
const canPickContacts = 'contacts' in navigator && 'select' in navigator.contacts
async function pickFromContacts(){
  try{
    const props = ['name','email','tel']; const opts = { multiple:false }
    const [c] = await navigator.contacts.select(props, opts)
    if (c?.name?.[0]) form.fullName = c.name[0]
    if (c?.email?.[0]) form.email = c.email[0]
    if (c?.tel?.[0]) { phoneDisplay.value = c.tel[0]; formatPhone() }
  }catch{}
}

/* Push permission */
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
  try{
    const raw = localStorage.getItem(props.autosaveKey)
    if (!raw) return
    const draft = JSON.parse(raw)
    Object.assign(form, draft)
    phoneDisplay.value = draft.phoneDisplay || draft.phone || ''
    restored.value = true
    setTimeout(()=> restored.value = false, 2200)
  }catch{}
}
function clearDraft(){ try { localStorage.removeItem(props.autosaveKey) } catch {} }

/* Copy email */
async function copyEmail(){ try{ await navigator.clipboard.writeText(form.email || '') ; ping($t?.('copied') || 'Copied') }catch{} }

/* Inline banner */
const banner = ref('')
function ping(msg){ banner.value = msg; setTimeout(()=> banner.value = '', 1800) }

/* Submit */
const loading = ref(false)
async function onSubmit(){
  touch('fullName'); touch('email'); touch('phone'); validate()
  if (hasErrors.value) { ping($t?.('fix_errors') || 'Please fix the highlighted fields'); return }
  if (!online.value)  { autosave(); ping($t?.('offline_draft_saved') || 'Offline — draft saved'); return }

  loading.value = true
  try{
    // Simulated backend call; replace with real API
    await new Promise(r => setTimeout(r, 800))

    const payload = { ...form }
    if (!payload.password) delete payload.password

    emit('update:modelValue', {
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      notifications: form.notifications
    })
    emit('saved', payload)

    Object.assign(base, JSON.parse(JSON.stringify(form)))
    clearDraft()
    form.password = ''
    if (navigator.vibrate) navigator.vibrate(10)
    ping($t?.('profile_updated') || '✔️ Profile updated!')
  } finally { loading.value = false }
}

/* Reset */
function resetForm(){
  Object.assign(form, JSON.parse(JSON.stringify(base)))
  phoneDisplay.value = form.phone || ''
  form.password = ''
  clearDraft()
  ping($t?.('changes_discarded') || '↩️ Changes discarded')
}

/* Prop sync */
watch(() => props.modelValue, (val) => {
  form.fullName = val?.fullName || ''
  form.email = val?.email || ''
  form.phone = val?.phone || ''
  form.notifications = val?.notifications ?? true
  phoneDisplay.value = form.phone || ''
  form.password = ''
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
.fade-enter-active, .fade-leave-active { transition: opacity .25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
/* iconify/tabler fallback */
i[class^="i-"], i[class*=" i-"] { display:inline-block; }
</style>
