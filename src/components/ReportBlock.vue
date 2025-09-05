<!-- 📁 src/components/ReportSheetPro.vue -->
<template>
  <!-- 🔘 Floating Report Button (FAB) -->
  <div v-if="floating" :class="['fixed z-40', fabPos]" :style="safeArea">
    <button
      class="h-10 px-4 rounded-full shadow bg-rose-600 text-white text-sm font-semibold active:translate-y-[1px]"
      :disabled="cooldownLeft>0"
      @click="openSheet"
      :aria-label="cooldownLeft>0 ? `Please wait ${Math.ceil(cooldownLeft/1000)}s` : 'Report'"
    >
      🚨 {{ cooldownLeft>0 ? `Wait ${Math.ceil(cooldownLeft/1000)}s` : 'Report' }}
    </button>
  </div>

  <!-- 🪟 Backdrop + Bottom Sheet -->
  <transition name="fade">
    <div
      v-if="visible"
      class="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm"
      role="dialog" aria-modal="true" :aria-labelledby="ids.title"
      @click.self="closeSheet"
    >
      <div
        class="absolute left-0 right-0 bottom-0 rounded-t-3xl bg-white dark:bg-[#0b1020] text-slate-900 dark:text-white shadow-2xl border-t border-black/10 dark:border-white/10"
        :style="safeArea"
      >
        <!-- Handle -->
        <div class="pt-2 grid place-items-center">
          <div class="h-1.5 w-12 rounded-full bg-black/15 dark:bg-white/15"></div>
        </div>

        <!-- Header -->
        <div class="px-4 pt-3 pb-2 flex items-center justify-between">
          <h3 :id="ids.title" class="text-base font-extrabold">Report {{ targetLabel }}</h3>
          <button class="h-9 w-9 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10" @click="closeSheet">✖</button>
        </div>

        <!-- Form -->
        <div class="px-4 pb-[6.5rem] max-h-[65vh] overflow-y-auto">
          <!-- Reason -->
          <label class="label">Reason *</label>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <button v-for="r in reasons" :key="r" type="button"
              class="chip" :class="form.reason===r && 'chip-active'"
              @click="form.reason = r">{{ r }}</button>
          </div>
          <p v-if="v.reason" class="err mt-1">{{ v.reason }}</p>

          <!-- Details -->
          <div class="mt-4">
            <label class="label">Details (optional)</label>
            <textarea
              v-model.trim="form.details"
              class="input w-full h-24 resize-none"
              maxlength="300"
              placeholder="Describe what happened…"
              @input="count = form.details.length"
            />
            <div class="flex justify-end text-[11px] text-slate-500">{{ 300 - count }}</div>
          </div>

          <!-- Screenshot -->
          <div class="mt-4">
            <label class="label">Screenshot (optional)</label>
            <div class="flex items-center gap-2">
              <button class="btn-soft" type="button" @click="fileEl?.click()">Add Image</button>
              <input ref="fileEl" class="hidden" type="file" accept="image/*" @change="onPick" />
              <button v-if="form.image" class="btn-soft" type="button" @click="removeImage">Remove</button>
            </div>
            <img v-if="form.image" :src="form.image" alt="" class="mt-2 h-28 rounded-xl border border-black/10 dark:border-white/10 object-cover" />
          </div>

          <!-- Options -->
          <div class="mt-4 space-y-2">
            <label class="row">
              <input type="checkbox" v-model="form.includeMeta" />
              <span>Include device info & URL</span>
            </label>
            <label v-if="blockable" class="row">
              <input type="checkbox" v-model="form.blockAlso" />
              <span>Also block {{ targetName || 'this user' }}</span>
            </label>
          </div>

          <!-- Note -->
          <p class="mt-3 text-[11px] text-slate-500">
            Submissions are reviewed by moderators. Misuse may lead to restrictions.
          </p>
        </div>

        <!-- Sticky Action Bar -->
        <div class="px-4 py-3 bg-white/85 dark:bg-black/60 border-t border-black/10 dark:border-white/10 rounded-t-3xl">
          <div class="max-w-xl mx-auto flex items-center gap-2">
            <button class="btn-soft flex-1" type="button" @click="closeSheet">Cancel</button>
            <button
              class="btn-primary"
              :disabled="sending || cooldownLeft>0 || !valid"
              @click="submit"
            >
              <span v-if="!sending">Submit Report</span>
              <span v-else class="inline-flex items-center gap-2"><span class="spinner"></span>Sending…</span>
            </button>
          </div>
          <transition name="fade">
            <p v-if="cooldownLeft>0" class="mt-2 text-[12px] text-center text-amber-700 dark:text-amber-300">
              Please wait {{ Math.ceil(cooldownLeft/1000) }}s before sending another report.
            </p>
          </transition>
        </div>
      </div>
    </div>
  </transition>

  <!-- ✅ Toast -->
  <transition name="fade">
    <div v-if="toast" class="fixed left-1/2 -translate-x-1/2 bottom-20 z-[1000] px-3 py-2 rounded-xl text-sm text-white bg-emerald-600 shadow">
      {{ toast }}
    </div>
  </transition>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/** Props */
const props = defineProps({
  modelValue: { type: Boolean, default: false },           // control sheet visibility
  floating:   { type: Boolean, default: true },            // show FAB
  position:   { type: String,  default: 'top-right' },     // 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  targetType: { type: String,  default: 'stream' },        // 'user' | 'stream' | 'message'
  targetId:   { type: String,  default: '' },
  targetName: { type: String,  default: '' },
  blockable:  { type: Boolean, default: true },
  reasons:    { type: Array,   default: () => ['Spam','Harassment','Hate','Impersonation','Sexual Content','Illegal','Self-harm','Other'] },
  endpoint:   { type: String,  default: '' },              // optional backend endpoint
  authToken:  { type: String,  default: '' },
  cooldownMs: { type: Number,  default: 10000 }
})

/** Emits */
const emit = defineEmits(['update:modelValue','open','close','submitted','blocked','error'])

/** UI state */
const visible = ref(!!props.modelValue)
watch(() => props.modelValue, v => visible.value = v)
watch(visible, v => emit('update:modelValue', v))

/** FAB position */
const fabPos = computed(() => ({
  'top-right':    'top-3 right-3',
  'top-left':     'top-3 left-3',
  'bottom-right': 'bottom-4 right-3',
  'bottom-left':  'bottom-4 left-3',
}[props.position] || 'top-3 right-3'))

/** Form model */
const form = reactive({
  reason: '',
  details: '',
  includeMeta: true,
  blockAlso: false,
  image: '' // dataURL
})

/** Refs */
const fileEl = ref(null)
const sending = ref(false)
const toast = ref('')
const count = ref(0)

/** Validation */
const v = reactive({ reason: '' })
const valid = computed(() => {
  v.reason = form.reason ? '' : 'Please select a reason.'
  return !v.reason
})

/** Cooldown */
const cooldownLeft = ref(0)
let cooldownT = null
function startCooldown(){
  const until = Date.now() + props.cooldownMs
  clearInterval(cooldownT)
  cooldownT = setInterval(() => {
    const left = until - Date.now()
    cooldownLeft.value = left > 0 ? left : 0
    if (left <= 0) clearInterval(cooldownT)
  }, 250)
}

/** Open/Close */
function openSheet(){ visible.value = true; emit('open'); try{ navigator.vibrate?.(6) }catch{} }
function closeSheet(){ visible.value = false; emit('close') }

/** Labels */
const targetLabel = computed(() => {
  if (props.targetType === 'user') return props.targetName ? `@${props.targetName}` : 'User'
  if (props.targetType === 'message') return 'Message'
  return 'Stream'
})

/** Image pick & compress */
async function onPick(e){
  const f = e.target.files?.[0]; if (!f || !/^image\//.test(f.type)) return
  const { dataUrl } = await compressImage(f, 900, 900, 0.8)
  form.image = dataUrl
  e.target.value = ''
}
function removeImage(){ form.image = '' }
function compressImage(file, maxW, maxH, quality){
  return new Promise((resolve,reject)=>{
    const img = new Image()
    const rdr = new FileReader()
    rdr.onload = () => { img.src = rdr.result }
    rdr.onerror = reject
    img.onload = () => {
      const ratio = Math.min(maxW/img.width, maxH/img.height, 1)
      const w = Math.round(img.width*ratio), h = Math.round(img.height*ratio)
      const cvs = document.createElement('canvas')
      cvs.width = w; cvs.height = h
      const ctx = cvs.getContext('2d'); ctx.drawImage(img,0,0,w,h)
      resolve({ dataUrl: cvs.toDataURL('image/jpeg', quality) })
    }
    rdr.readAsDataURL(file)
  })
}

/** Submit */
async function submit(){
  if (!valid.value || sending.value || cooldownLeft.value>0) return
  sending.value = true

  // Payload
  const payload = {
    targetType: props.targetType, targetId: props.targetId, targetName: props.targetName,
    reason: form.reason, details: form.details,
    screenshot: form.image || null,
    meta: form.includeMeta ? {
      url: location.href,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lang: navigator.language,
      ua: navigator.userAgent,
      at: new Date().toISOString()
    } : null
  }

  try {
    if (!navigator.onLine) throw new Error('offline')

    // Try sendBeacon first for reliability
    if (props.endpoint) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      const ok = navigator.sendBeacon?.(props.endpoint, blob)
      if (!ok) {
        await fetch(props.endpoint, {
          method: 'POST',
          headers: { 'Content-Type':'application/json', ...(props.authToken && { Authorization: `Bearer ${props.authToken}` }) },
          body: JSON.stringify(payload)
        })
      }
    }
    emit('submitted', payload)
    if (form.blockAlso && props.blockable) emit('blocked', { targetId: props.targetId, targetType: props.targetType })

    // UX
    toast.value = '✅ Report submitted'
    setTimeout(() => toast.value = '', 2000)
    startCooldown()
    resetForm()
    closeSheet()
    try{ navigator.vibrate?.(10) }catch{}
  } catch (e) {
    // Queue offline
    const key = 'report_queue'
    const q = JSON.parse(localStorage.getItem(key) || '[]')
    q.push({ payload, ts: Date.now() })
    localStorage.setItem(key, JSON.stringify(q))
    toast.value = '⚠️ Offline — report queued'
    setTimeout(() => toast.value = '', 2500)
    emit('submitted', { ...payload, queued: true })
    startCooldown()
    resetForm()
    closeSheet()
  } finally {
    sending.value = false
  }
}

function resetForm(){
  form.reason = ''
  form.details = ''
  form.image = ''
  form.blockAlso = false
}

/** Keyboard ESC */
function onKey(e){ if (e.key === 'Escape' && visible.value) closeSheet() }

/** Safe-area */
const safeArea = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }

/** IDs */
const ids = { title: 'rep-title-' + Math.random().toString(36).slice(2,7) }

/** Lifecycle */
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
/* Inputs & chips */
.label { @apply text-[12px] font-semibold text-slate-700 dark:text-slate-200; }
.input { @apply px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm; }
.chip { @apply h-9 px-3 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-black/10 dark:border-white/10; }
.chip-active { @apply bg-rose-600 text-white; }
.row { @apply flex items-center gap-2 text-sm; }
.btn-primary { @apply h-11 px-4 rounded-xl font-semibold bg-rose-600 text-white hover:bg-rose-500 active:translate-y-[1px]; }
.btn-soft { @apply h-10 px-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/10; }

/* Spinner & transitions */
.spinner { width:16px;height:16px;border-radius:9999px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;animation:spin 1s linear infinite }
@keyframes spin { to { transform: rotate(360deg) } }
.fade-enter-active,.fade-leave-active { transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to { opacity: 0 }
</style>
