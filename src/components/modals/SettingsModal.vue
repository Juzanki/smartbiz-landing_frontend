<!-- LiveSettingsSheet.vue -->
<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0"
    role="dialog" aria-modal="true" aria-labelledby="ls-title"
    @click.self="close('backdrop')" @keydown.esc.prevent="close('esc')"
  >
    <!-- Bottom Sheet -->
    <section
      ref="sheet"
      class="w-full sm:w-[92%] max-w-lg max-h-[92vh]
             rounded-t-3xl sm:rounded-2xl overflow-hidden select-none
             bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100
             ring-1 ring-black/10 dark:ring-white/10 shadow-2xl animate-in flex flex-col"
      :style="dragStyle"
      @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend.passive="onTouchEnd"
    >
      <!-- Handle -->
      <div class="sm:hidden pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
      </div>

      <!-- Header -->
      <header class="px-5 pt-2 pb-3 sm:p-5 flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10">
        <h2 id="ls-title" class="text-base sm:text-xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
          ⚙️ Live Stream Settings
        </h2>
        <button
          class="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Close" @click="close('x')">✕</button>
      </header>

      <!-- Body -->
      <div class="px-5 pb-4 sm:pb-5 space-y-4 overflow-y-auto">

        <!-- Terms -->
        <section class="rounded-xl p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-900">
          <h3 class="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2">📜 Terms & Community Guidelines</h3>
          <ul class="text-[13px] text-zinc-700 dark:text-zinc-300 list-disc pl-5 space-y-1">
            <li>No nudity or sexually explicit content</li>
            <li>No hate speech, bullying, or harassment</li>
            <li>Respect all users regardless of race, religion, or identity</li>
            <li>No illegal activity or promotions</li>
            <li>Follow national laws and digital ethics</li>
          </ul>
          <label class="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" v-model="agreed" class="h-4 w-4"/>
            <span>I agree to the <a href="#" class="text-indigo-600 underline">Terms & Community Policy</a>.</span>
          </label>
        </section>

        <!-- Title -->
        <section class="rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <label class="block text-sm font-semibold mb-2">📝 Stream Title (optional)</label>
          <input v-model.trim="title" type="text" maxlength="80"
                 placeholder="e.g., Late Night Q&A"
                 class="w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-400 dark:ring-indigo-500"/>
          <div class="text-[11px] text-zinc-500 mt-1">{{ title.length }}/80</div>
        </section>

        <!-- Camera & Mic -->
        <section class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <label class="block text-sm font-semibold mb-2">🎥 Camera</label>
            <select v-model="cameraId" class="w-full border rounded-lg px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-sm">
              <option v-for="d in cameras" :key="d.deviceId" :value="d.deviceId">{{ labelFor(d, 'camera') }}</option>
            </select>
            <div class="flex items-center gap-2 mt-2 text-[12px]" :class="camStatusClass">
              <span>{{ camStatusIcon }}</span><span>{{ camStatusText }}</span>
            </div>
          </div>

          <div class="rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <label class="block text-sm font-semibold mb-2">🎤 Microphone</label>
            <select v-model="micId" class="w-full border rounded-lg px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-sm">
              <option v-for="d in mics" :key="d.deviceId" :value="d.deviceId">{{ labelFor(d, 'mic') }}</option>
            </select>
            <div class="flex items-center gap-2 mt-2 text-[12px]" :class="micStatusClass">
              <span>{{ micStatusIcon }}</span><span>{{ micStatusText }}</span>
            </div>
          </div>
        </section>

        <!-- Quick Preview -->
        <section class="rounded-xl p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-semibold">🔎 Device Preview</label>
            <button @click="togglePreview" class="px-3 py-1.5 text-xs rounded-full bg-zinc-100 dark:bg-zinc-800">
              {{ previewOn ? 'Stop' : 'Test Devices' }}
            </button>
          </div>
          <div class="relative aspect-video rounded-lg overflow-hidden bg-black/70 grid place-items-center">
            <video ref="videoRef" playsinline autoplay muted class="w-full h-full object-cover"></video>
            <div v-if="!previewOn" class="absolute inset-0 grid place-items-center text-white/70 text-xs">No preview</div>
          </div>
        </section>

        <!-- Visibility & Comments & Orientation -->
        <section class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <label class="block text-sm font-semibold mb-2">🌍 Visibility</label>
            <div class="grid grid-cols-2 gap-2 text-[12px]">
              <button @click="visibility='public'"
                      :class="segClass(visibility==='public')">Public</button>
              <button @click="visibility='private'"
                      :class="segClass(visibility==='private')">Private</button>
            </div>
          </div>
          <div class="rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <label class="block text-sm font-semibold mb-2">💬 Comments</label>
            <div class="grid grid-cols-2 gap-2 text-[12px]">
              <button @click="comments=true"  :class="segClass(comments===true)">On</button>
              <button @click="comments=false" :class="segClass(comments===false)">Off</button>
            </div>
          </div>
          <div class="rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <label class="block text-sm font-semibold mb-2">📱 Orientation</label>
            <div class="grid grid-cols-2 gap-2 text-[12px]">
              <button @click="orientation='portrait'"  :class="segClass(orientation==='portrait')">Portrait</button>
              <button @click="orientation='landscape'" :class="segClass(orientation==='landscape')">Landscape</button>
            </div>
          </div>
        </section>

        <!-- Preflight -->
        <section class="rounded-xl p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div class="flex items-center justify-between">
            <div class="text-sm font-semibold">✅ Preflight Check</div>
            <button @click="runPreflight" class="px-3 py-1.5 text-xs rounded-full bg-zinc-100 dark:bg-zinc-800">Re-check</button>
          </div>
          <ul class="mt-2 text-[13px] space-y-1">
            <li class="flex items-center gap-2"><span>{{ camStatusIcon }}</span> <span>{{ camStatusText }}</span></li>
            <li class="flex items-center gap-2"><span>{{ micStatusIcon }}</span> <span>{{ micStatusText }}</span></li>
            <li class="flex items-center gap-2"><span>{{ onlineIcon }}</span> <span>{{ onlineText }}</span></li>
          </ul>
          <p v-if="errorMsg" class="mt-2 text-[12px] text-rose-500">{{ errorMsg }}</p>
        </section>
      </div>

      <!-- Footer -->
      <footer class="px-5 py-3 border-t border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/70 backdrop-blur flex items-center justify-between">
        <button class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-200 dark:bg-zinc-800" @click="close('cancel')">Cancel</button>
        <button
          class="rounded-full px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
          :disabled="!agreed || starting"
          @click="startLive"
        >🚀 Go Live</button>
      </footer>

      <!-- Safe-area spacer -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/* Props & Emits */
const props = defineProps({ open: { type: Boolean, default: true } })
const emit  = defineEmits(['close','start'])

/* State */
const agreed = ref(false)
const title = ref('')
const visibility = ref('public')
const comments = ref(true)
const orientation = ref('portrait')

const cameras = ref([])     // MediaDeviceInfo[]
const mics = ref([])        // MediaDeviceInfo[]
const cameraId = ref('')    // selected deviceId
const micId = ref('')
const camAllowed = ref(null) // true/false/null
const micAllowed = ref(null)

const starting = ref(false)
const errorMsg = ref('')

/* Preview */
const previewOn = ref(false)
const videoRef = ref(null)
let previewStream = null

/* Online status */
const isOnline = ref(navigator.onLine)
function onOnline(){ isOnline.value = true }
function onOffline(){ isOnline.value = false }
const onlineIcon = computed(()=> isOnline.value ? '🌐' : '⚠️')
const onlineText = computed(()=> isOnline.value ? 'Network: Online' : 'Network: Offline')

/* Helpers */
function buzz(ms=10){ try{ navigator?.vibrate?.(ms) }catch{} }
function segClass(active){ return active ? 'bg-indigo-600 text-white rounded-full px-3 py-2' : 'bg-zinc-100 dark:bg-zinc-800 rounded-full px-3 py-2' }
function labelFor(d, kind){
  if (d.label) return d.label
  return kind==='camera' ? 'Camera' : 'Microphone'
}

/* Permission text/icons */
const camStatusText  = computed(()=> camAllowed.value === true ? 'Camera: OK' : camAllowed.value === false ? 'Camera: blocked/denied' : 'Camera: unknown')
const micStatusText  = computed(()=> micAllowed.value === true ? 'Mic: OK'    : micAllowed.value === false ? 'Mic: blocked/denied'    : 'Mic: unknown')
const camStatusIcon  = computed(()=> camAllowed.value === true ? '✅' : camAllowed.value === false ? '⛔' : 'ℹ️')
const micStatusIcon  = computed(()=> micAllowed.value === true ? '✅' : micAllowed.value === false ? '⛔' : 'ℹ️')
const camStatusClass = computed(()=> camAllowed.value === false ? 'text-rose-600' : 'text-emerald-600')
const micStatusClass = computed(()=> micAllowed.value === false ? 'text-rose-600' : 'text-emerald-600')

/* Enumerate devices */
async function listDevices(){
  try{
    if (!navigator.mediaDevices?.enumerateDevices) return
    const devs = await navigator.mediaDevices.enumerateDevices()
    cameras.value = devs.filter(d=> d.kind==='videoinput')
    mics.value    = devs.filter(d=> d.kind==='audioinput')
    if (!cameraId.value && cameras.value[0]) cameraId.value = cameras.value[0].deviceId
    if (!micId.value && mics.value[0]) micId.value = mics.value[0].deviceId
  }catch{}
}

/* Request permissions (silent preview) */
async function runPreflight(){
  errorMsg.value = ''
  try{
    const constraints = {
      video: cameraId.value ? { deviceId: { exact: cameraId.value } } : true,
      audio: micId.value ? { deviceId: { exact: micId.value } } : true
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    camAllowed.value = !!stream.getVideoTracks().length
    micAllowed.value = !!stream.getAudioTracks().length
    // Stop immediately
    stream.getTracks().forEach(t=>t.stop())
    buzz(12)
  }catch(e){
    camAllowed.value = false
    micAllowed.value = false
    errorMsg.value = 'Permission failed. Allow camera & mic in browser settings.'
  }
  await listDevices()
}

/* Preview handlers */
async function togglePreview(){
  if (previewOn.value){ stopPreview(); return }
  try{
    const constraints = {
      video: cameraId.value ? { deviceId: { exact: cameraId.value } } : true,
      audio: false
    }
    previewStream = await navigator.mediaDevices.getUserMedia(constraints)
    if (videoRef.value){ videoRef.value.srcObject = previewStream }
    previewOn.value = true
    camAllowed.value = true
  }catch(e){
    camAllowed.value = false
    errorMsg.value = 'Cannot start camera preview. Check permissions.'
  }
}
function stopPreview(){
  if (previewStream){ previewStream.getTracks().forEach(t=>t.stop()); previewStream=null }
  previewOn.value = false
}

/* Start live */
async function startLive(){
  starting.value = true
  await runPreflight()
  if (camAllowed.value === false || micAllowed.value === false){
    starting.value = false
    buzz(14)
    return
  }
  // persist
  try{
    localStorage.setItem('live_settings_last', JSON.stringify({
      title: title.value, visibility: visibility.value, comments: comments.value,
      orientation: orientation.value, cameraId: cameraId.value, micId: micId.value
    }))
  }catch{}
  buzz(18)
  emit('start', {
    title: title.value, visibility: visibility.value, comments: comments.value,
    orientation: orientation.value, cameraId: cameraId.value, micId: micId.value, at: Date.now()
  })
  close('start')
  starting.value = false
}

/* Persist restore */
onMounted(()=>{
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  try{
    const last = JSON.parse(localStorage.getItem('live_settings_last')||'null')
    if (last){
      title.value = last.title || ''
      visibility.value = last.visibility || 'public'
      comments.value = typeof last.comments==='boolean' ? last.comments : true
      orientation.value = last.orientation || 'portrait'
      cameraId.value = last.cameraId || ''
      micId.value = last.micId || ''
    }
  }catch{}
  listDevices()
})
onBeforeUnmount(()=>{
  stopPreview()
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})

/* Close */
function close(reason){ stopPreview(); emit('close', { reason }) }

/* Swipe-to-close */
const startY = ref(0), dY = ref(0), dragging = ref(false)
const dragStyle = computed(()=>{
  if(!dragging.value) return {}
  const y=Math.max(0,dY.value), op=Math.max(1 - y/240, .5)
  return { transform:`translateY(${y}px)`, opacity:op }
})
function onTouchStart(e){ if(e.touches?.length!==1) return; dragging.value=true; startY.value=e.touches[0].clientY; dY.value=0 }
function onTouchMove(e){ if(!dragging.value) return; dY.value=e.touches[0].clientY - startY.value }
function onTouchEnd(){ if(!dragging.value) return; dragging.value=false; if(dY.value>120) close('swipe'); dY.value=0 }
</script>

<style scoped>
/* Entrance */
@keyframes in{ from{ opacity:0; transform: translateY(40px) scale(.98) } to{ opacity:1; transform:none } }
.animate-in{ animation: in .30s cubic-bezier(.22,1,.36,1) both; will-change: opacity, transform }

/* Hide scrollbars (mobile) */
.no-scrollbar::-webkit-scrollbar{ display:none }

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .backdrop-blur-sm{ backdrop-filter: none !important; }
}
</style>
