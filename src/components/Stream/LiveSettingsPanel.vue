<!-- LiveSettingsMobile.vue -->
<template>
  <!-- Backdrop -->
  <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" @click.self="close">
    <!-- Bottom sheet -->
    <section
      class="absolute inset-x-0 bottom-0 sm:top-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
             w-full sm:w-[640px] max-h-[92vh] overflow-hidden
             rounded-t-3xl sm:rounded-2xl bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100
             ring-1 ring-black/10 dark:ring-white/10 shadow-2xl animate-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lsm-title"
    >
      <!-- Drag handle (mobile) -->
      <div class="sm:hidden pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
      </div>

      <!-- Header -->
      <header class="px-4 sm:px-6 pt-2 sm:pt-4 pb-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between gap-2">
        <div class="min-w-0">
          <h2 id="lsm-title" class="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400">
            ⚙️ Live Stream Settings
          </h2>
          <p class="text-[11px] sm:text-xs text-zinc-500">Choose devices, preview, and confirm policies</p>
        </div>
        <button
          class="h-10 w-10 grid place-items-center rounded-xl bg-white/60 dark:bg-white/10
                 text-zinc-700 dark:text-zinc-200 border border-black/10 dark:border-white/10
                 focus:outline-none focus:ring-2 ring-indigo-400"
          aria-label="Close settings"
          @click="close"
        >✕</button>
      </header>

      <!-- Content -->
      <div class="px-4 sm:px-6 py-4 overflow-y-auto space-y-4" :style="contentMax">
        <!-- Terms & Community -->
        <section class="rounded-xl border border-indigo-200/60 dark:border-indigo-900/40 bg-indigo-50/70 dark:bg-indigo-950/20 p-4">
          <h3 class="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2">📜 Terms & Community Guidelines</h3>
          <ul class="text-[13px] sm:text-sm text-zinc-700 dark:text-zinc-300 list-disc pl-5 space-y-1">
            <li>No nudity or sexually explicit content</li>
            <li>No hate speech, bullying, or harassment</li>
            <li>Respect all users regardless of race, religion, or identity</li>
            <li>No illegal activity or promotions</li>
            <li>Follow applicable national laws and digital ethics</li>
          </ul>
          <label class="mt-3 flex items-center gap-2 text-[13px] sm:text-sm">
            <input type="checkbox" v-model="agreed" class="h-4 w-4" />
            <span>I have read and agree to the <a href="#" class="text-indigo-600 underline">Terms & Community Policy</a>.</span>
          </label>
        </section>

        <!-- Preview & meters -->
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Video preview -->
          <div class="rounded-xl overflow-hidden border border-white/10 bg-zinc-100 dark:bg-zinc-800 relative">
            <video
              ref="videoRef"
              autoplay
              playsinline
              muted
              class="w-full aspect-video bg-black object-cover"
            ></video>
            <!-- Overlay info -->
            <div class="absolute left-2 top-2 flex items-center gap-2 text-[11px]">
              <span class="px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur">
                {{ cameraLabel(selectedCameraId) || 'Camera' }}
              </span>
              <span class="px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur" v-if="quality.label">
                {{ quality.label }}
              </span>
            </div>
          </div>

          <!-- Audio meter + quick knobs -->
          <div class="rounded-xl border border-white/10 bg-white/70 dark:bg-zinc-900/50 p-4 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="font-semibold text-sm">🎤 Mic Level</h4>
              <span class="text-xs text-zinc-500">{{ micLabel(selectedMicId) || 'Microphone' }}</span>
            </div>
            <div class="h-3 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div
                class="h-full bg-emerald-500 transition-[width] duration-150"
                :style="{ width: `${Math.min(100, Math.round(micVolume * 100))}%` }"
              />
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label class="text-xs font-medium block mb-1">Visibility</label>
                <select v-model="visibility" class="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900">
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-medium block mb-1">Comments</label>
                <select v-model="comments" class="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900">
                  <option value="on">Enabled</option>
                  <option value="off">Disabled</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <!-- Devices & quality -->
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="rounded-xl border p-4 bg-white/80 dark:bg-zinc-900/50">
            <label class="block text-sm font-semibold mb-2">🎥 Camera</label>
            <div class="flex gap-2">
              <select v-model="selectedCameraId" class="flex-1 rounded-lg border px-3 py-2">
                <option v-for="d in cameras" :key="d.deviceId" :value="d.deviceId">
                  {{ d.label || fallbackLabel(d, 'Camera') }}
                </option>
              </select>
              <button
                class="rounded-lg px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border"
                title="Flip (front/back)"
                @click="flipCamera"
              >🔄</button>
            </div>
          </div>

          <div class="rounded-xl border p-4 bg-white/80 dark:bg-zinc-900/50">
            <label class="block text-sm font-semibold mb-2">🎤 Microphone</label>
            <select v-model="selectedMicId" class="w-full rounded-lg border px-3 py-2">
              <option v-for="d in mics" :key="d.deviceId" :value="d.deviceId">
                {{ d.label || fallbackLabel(d, 'Microphone') }}
              </option>
            </select>
          </div>

          <div class="rounded-xl border p-4 bg-white/80 dark:bg-zinc-900/50">
            <label class="block text-sm font-semibold mb-2">📺 Quality</label>
            <select v-model="qualityKey" class="w-full rounded-lg border px-3 py-2">
              <option v-for="(q, key) in qualities" :key="key" :value="key">{{ q.label }}</option>
            </select>
            <p class="text-xs text-zinc-500 mt-1">Changes affect camera preview immediately.</p>
          </div>

          <div class="rounded-xl border p-4 bg-white/80 dark:bg-zinc-900/50">
            <label class="block text-sm font-semibold mb-2">📦 Preset</label>
            <div class="flex gap-2">
              <button class="px-3 py-2 rounded-lg border bg-zinc-100 dark:bg-zinc-800" @click="savePreset">💾 Save</button>
              <button class="px-3 py-2 rounded-lg border bg-zinc-100 dark:bg-zinc-800" @click="loadPreset">📥 Load</button>
              <button class="px-3 py-2 rounded-lg border bg-zinc-100 dark:bg-zinc-800" @click="clearPreset">🗑 Clear</button>
            </div>
            <p class="text-xs text-zinc-500 mt-1">Stored locally on this device.</p>
          </div>
        </section>
      </div>

      <!-- Footer -->
      <footer class="px-4 sm:px-6 py-3 border-t border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/70 backdrop-blur flex items-center justify-between">
        <div class="text-[12px] text-zinc-500">
          <span v-if="permissionState==='denied'">⚠️ Camera/microphone permission denied. Check browser settings.</span>
          <span v-else-if="permissionState==='prompt'">Tip: we’ll ask for camera/mic when you go live.</span>
        </div>
        <div class="flex items-center gap-2">
          <button class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-200 dark:bg-zinc-800" @click="close">Cancel</button>
          <button
            class="rounded-full px-4 py-2 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!agreed || starting"
            @click="start"
          >
            <span v-if="!starting">🚀 Go Live</span>
            <span v-else class="inline-flex items-center gap-2">
              <span class="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
              Starting…
            </span>
          </button>
        </div>
      </footer>

      <!-- Safe area for iOS home bar -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)]"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

/* Emits */
const emit = defineEmits(['close','start'])

/* State */
const agreed = ref(false)
const comments = ref('on')
const visibility = ref('public')
const starting = ref(false)

/* Devices */
const cameras = ref([])
const mics = ref([])
const selectedCameraId = ref('')
const selectedMicId = ref('')

/* Preview */
const videoRef = ref(null)
let currentStream = null
let audioCtx = null
let analyser = null
let micSource = null
const micVolume = ref(0)

/* Permission status (best-effort) */
const permissionState = ref('prompt') // 'granted' | 'denied' | 'prompt'

/* Qualities */
const qualities = {
  auto: { label: 'Auto (browser chooses)', constraints: { video: true } },
  '480p': { label: '480p (SD)', constraints: { video: { width: { ideal: 854 }, height: { ideal: 480 }, frameRate: { ideal: 30 } } } },
  '720p': { label: '720p (HD)', constraints: { video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } } },
  '1080p': { label: '1080p (Full HD)', constraints: { video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } } } },
  audio: { label: 'Audio-only', constraints: { video: false } }
}
const qualityKey = ref('auto')
const quality = computed(() => qualities[qualityKey.value] || qualities.auto)

/* Layout helpers */
const contentMax = computed(() => ({ maxHeight: 'calc(92vh - 96px)' }))

/* Methods */
function close(){ emit('close') }

function cameraLabel(id){
  return cameras.value.find(d => d.deviceId === id)?.label || ''
}
function micLabel(id){
  return mics.value.find(d => d.deviceId === id)?.label || ''
}
function fallbackLabel(d, base){ return `${base} (${(d.deviceId || '').slice(-4) || 'N/A'})` }

async function ensurePermission(){
  try {
    // Grab minimal stream to unlock device labels
    const constraints = {
      audio: { deviceId: selectedMicId.value ? { exact: selectedMicId.value } : undefined },
      video: quality.value.constraints.video === false
        ? false
        : {
            ...quality.value.constraints.video,
            deviceId: selectedCameraId.value ? { exact: selectedCameraId.value } : undefined,
            facingMode: selectedCameraId.value ? undefined : 'user'
          }
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    permissionState.value = 'granted'
    stream.getTracks().forEach(t => t.stop())
  } catch (e) {
    permissionState.value = /denied/i.test(String(e?.name || e?.message)) ? 'denied' : 'prompt'
  }
}

async function enumerate(){
  if (!navigator.mediaDevices?.enumerateDevices) return
  const list = await navigator.mediaDevices.enumerateDevices()
  cameras.value = list.filter(d => d.kind === 'videoinput')
  mics.value = list.filter(d => d.kind === 'audioinput')
  // Defaults
  if (!selectedCameraId.value && cameras.value[0]) selectedCameraId.value = cameras.value[0].deviceId
  if (!selectedMicId.value && mics.value[0]) selectedMicId.value = mics.value[0].deviceId
}

async function startPreview(){
  stopPreview()
  try{
    const vConstraint = quality.value.constraints.video === false
      ? false
      : {
          ...quality.value.constraints.video,
          deviceId: selectedCameraId.value ? { exact: selectedCameraId.value } : undefined,
          facingMode: selectedCameraId.value ? undefined : 'user'
        }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: vConstraint,
      audio: selectedMicId.value ? { deviceId: { exact: selectedMicId.value } } : true
    })
    currentStream = stream
    if (videoRef.value){
      videoRef.value.srcObject = stream
      await videoRef.value.play().catch(()=>{})
    }
    setupAudioMeter(stream)
  }catch(e){
    console.warn('Preview failed:', e)
  }
}
function stopPreview(){
  if (audioCtx){
    try{ audioCtx.close() }catch{}
    audioCtx = null; analyser = null; micSource = null
  }
  if (currentStream){
    currentStream.getTracks().forEach(t => t.stop())
    currentStream = null
  }
}
function setupAudioMeter(stream){
  try{
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    micSource = audioCtx.createMediaStreamSource(stream)
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    micSource.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      if (!analyser) return
      analyser.getByteFrequencyData(data)
      const avg = data.reduce((a,b)=>a+b,0)/data.length
      micVolume.value = avg/255
      requestAnimationFrame(tick)
    }
    tick()
  }catch(e){
    console.warn('Audio meter unavailable:', e)
  }
}

function flipCamera(){
  // Try to pick a device with different facing mode by name hint
  const cur = cameraLabel(selectedCameraId.value).toLowerCase()
  const isFront = cur.includes('front') || cur.includes('user')
  const alt = cameras.value.find(c => {
    const lbl = (c.label || '').toLowerCase()
    return isFront ? (lbl.includes('back') || lbl.includes('environment')) : (lbl.includes('front') || lbl.includes('user'))
  })
  if (alt) selectedCameraId.value = alt.deviceId
  else qualityKey.value = qualityKey.value // no-op to trigger restart anyway
}

/* Presets (localStorage) */
const LS_KEY = 'live-settings-preset'
function savePreset(){
  const preset = {
    camera: selectedCameraId.value,
    mic: selectedMicId.value,
    quality: qualityKey.value,
    comments: comments.value,
    visibility: visibility.value
  }
  localStorage.setItem(LS_KEY, JSON.stringify(preset))
  vibrate(10)
}
function loadPreset(){
  try{
    const p = JSON.parse(localStorage.getItem(LS_KEY) || '{}')
    if (p.camera) selectedCameraId.value = p.camera
    if (p.mic) selectedMicId.value = p.mic
    if (p.quality) qualityKey.value = p.quality
    if (p.comments) comments.value = p.comments
    if (p.visibility) visibility.value = p.visibility
    vibrate(10)
  }catch{}
}
function clearPreset(){
  localStorage.removeItem(LS_KEY)
  vibrate(6)
}

/* Start */
async function start(){
  if (!agreed.value) return
  starting.value = true
  try{
    await ensurePermission()
    emit('start', {
      cameraId: selectedCameraId.value,
      micId: selectedMicId.value,
      quality: qualityKey.value,
      comments: comments.value,
      visibility: visibility.value
    })
  } finally {
    starting.value = false
  }
}

/* Haptics */
function vibrate(ms=8){ try{ navigator?.vibrate?.(ms) }catch{} }

/* Lifecycle */
onMounted(async () => {
  await ensurePermission()
  await enumerate()
  await nextTick()
  await startPreview()
})
onBeforeUnmount(() => {
  stopPreview()
})

/* React to changes */
watch([selectedCameraId, selectedMicId, qualityKey], () => {
  // debounce restart a bit
  restartPreviewSoon()
})

let restartTimer = null
function restartPreviewSoon(){
  clearTimeout(restartTimer)
  restartTimer = setTimeout(() => startPreview(), 200)
}
</script>

<style scoped>
/* Entrance */
@keyframes in{ from{ opacity:0; transform: translateY(40px) scale(.98) } to{ opacity:1; transform:none } }
.animate-in{ animation: in .28s cubic-bezier(.22,1,.36,1) both; will-change: opacity, transform }

/* Reduce iOS tap highlight */
:host, button, select { -webkit-tap-highlight-color: transparent; }
</style>
