<!-- RecordingHUDMobile.vue -->
<template>
  <!-- Minimized pill (when collapsed) -->
  <button
    v-if="collapsed"
    class="fixed top-[max(16px,env(safe-area-inset-top))] left-3 z-50 px-3 h-8 rounded-full bg-red-600 text-white
           text-[12px] font-semibold shadow-lg flex items-center gap-2 active:scale-95 transition"
    @click="toggleCollapse(false)"
    aria-label="Open recording panel"
  >
    <span class="rec-dot" aria-hidden="true"></span>
    REC • {{ elapsedLabel }}
  </button>

  <!-- HUD Panel -->
  <section
    v-else
    class="fixed bottom-0 inset-x-0 z-50"
    role="region"
    aria-label="Recording controls"
  >
    <!-- Backdrop -->
    <div class="absolute inset-0 -top-10 bg-black/40 backdrop-blur-sm" @click="toggleCollapse(true)"></div>

    <!-- Card -->
    <div
      class="relative mx-auto w-[min(100%,560px)] rounded-t-3xl bg-[#0b1220] text-white shadow-2xl
             ring-1 ring-white/10 overflow-hidden animate-sheet-in"
    >
      <!-- Grab handle -->
      <div class="pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-white/20"></div>
      </div>

      <!-- Header row -->
      <header class="px-4 py-2 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 min-w-0">
          <span class="rec-dot"></span>
          <div class="min-w-0">
            <div class="text-sm font-bold leading-tight">Recording</div>
            <div class="text-[11px] text-white/70 leading-tight">{{ statusText }}</div>
          </div>
        </div>

        <div class="text-right">
          <div class="font-mono text-sm tabular-nums">{{ elapsedLabel }}</div>
          <div class="text-[11px] text-white/60">{{ estLeftText }}</div>
        </div>
      </header>

      <!-- Waveform -->
      <div class="px-4">
        <canvas
          ref="wave"
          class="w-full h-16 rounded-xl bg-white/5 border border-white/10"
          aria-hidden="true"
        ></canvas>
      </div>

      <!-- Metrics row -->
      <div class="px-4 mt-2 grid grid-cols-3 gap-2 text-[11px] text-white/75">
        <div class="metric">
          <span class="opacity-70">Size</span>
          <span class="font-semibold">{{ prettyBytes(totalBytes) }}</span>
        </div>
        <div class="metric">
          <span class="opacity-70">Codec</span>
          <span class="font-semibold">{{ usedMime || 'auto' }}</span>
        </div>
        <div class="metric">
          <span class="opacity-70">Mic level</span>
          <span class="font-semibold">{{ (level*100)|0 }}%</span>
        </div>
      </div>

      <!-- Controls -->
      <div class="px-4 py-3 grid grid-cols-3 gap-3">
        <button
          class="btn ghost"
          :disabled="!canPauseResume"
          @click="togglePause"
          :aria-pressed="paused ? 'true' : 'false'"
        >
          <span v-if="!paused">⏸ Pause</span>
          <span v-else>▶ Resume</span>
        </button>

        <button class="btn" @click="addMarker">🔖 Marker</button>

        <!-- Hold-to-stop (long press) -->
        <button
          class="btn danger relative overflow-hidden"
          @pointerdown="startHoldToStop"
          @pointerup="cancelHoldToStop"
          @pointerleave="cancelHoldToStop"
          aria-label="Hold to stop"
        >
          ⏹ Hold to Stop
          <span
            class="absolute inset-0 pointer-events-none"
            :style="holdStyle"
          />
        </button>
      </div>

      <!-- Footer actions -->
      <div class="px-4 pb-3 flex items-center justify-between text-[12px] text-white/70">
        <div class="flex items-center gap-2">
          <label class="flex items-center gap-2">
            <input type="checkbox" v-model="autoSave" class="accent-indigo-500" />
            Auto-save
          </label>
          <button class="underline hover:text-white" @click="downloadBlob" :disabled="!recordedBlob">Download</button>
        </div>

        <div class="flex items-center gap-2">
          <button class="btn xs ghost" @click="toggleCollapse(true)">Minimize</button>
          <button class="btn xs" @click="muteToggle">
            {{ muted ? '🔇 Unmute' : '🎙️ Mute' }}
          </button>
        </div>
      </div>

      <!-- Safe area -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)]"></div>
    </div>
  </section>

  <!-- Permission / Error toast -->
  <div
    v-if="toast"
    class="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] bg-black text-white text-xs px-3 py-1.5 rounded-lg shadow-2xl"
  >
    {{ toast }}
  </div>
</template>

<script setup>
/**
 * Mobile-first recording HUD:
 * - Collapsible pill + bottom sheet
 * - Elapsed time, mic level waveform, size, codec, estimated remaining
 * - Pause/Resume, Mute, Hold-to-Stop, Markers, Download, Auto-save
 * - Emits: start, pause, resume, stop, error, marker
 * - Exposes start(), stop(), pause(), resume()
 */
import { ref, computed, onMounted, onBeforeUnmount, watch, defineEmits, defineExpose } from 'vue'

const emit = defineEmits(['start','pause','resume','stop','error','marker','permission-denied'])

/* UI state */
const collapsed = ref(true)
function toggleCollapse(v){ collapsed.value = v; vibrate(6) }
const toast = ref('')

/* Recording state */
const startedAt = ref(0)
const paused = ref(false)
const elapsed = ref(0)             // ms
const timerId = ref(null)
const level = ref(0)               // 0..1
const totalBytes = ref(0)
const autoSave = ref(true)
const muted = ref(false)
const usedMime = ref('')
const markers = ref([])

/* Media */
let stream, mediaRecorder, chunks = []
let audioCtx, analyser, source, levelRAF

/* Waveform */
const wave = ref(null)
let waveRAF

/* Long press stop */
const holdMS = 1100
const holdStart = ref(0)
const holdPct = ref(0)
const holdTimer = ref(null)
const holdStyle = computed(()=>({
  background: `conic-gradient(#ef4444 ${holdPct.value*360}deg, transparent 0)`,
  mask: 'linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)',
  WebkitMask: 'linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)',
  padding: '1px'
}))

/* Derived labels */
const elapsedLabel = computed(()=>{
  const s = Math.floor(elapsed.value/1000)
  const m = Math.floor(s/60).toString().padStart(2,'0')
  const ss = (s%60).toString().padStart(2,'0')
  return `${m}:${ss}`
})
const statusText = computed(()=>{
  if (!mediaRecorder) return 'Ready'
  if (paused.value) return 'Paused'
  return 'Live • Capturing audio'
})
const estLeftText = computed(()=>{
  // rough estimate based on 64kbps equivalent (8 KB/s)
  const rate = 8 * 1024 // bytes/s
  const limit = 50 * 1024 * 1024 // suggest 50 MB target
  const left = Math.max(0, limit - totalBytes.value)
  const s = Math.floor(left / rate)
  const m = Math.floor(s/60)
  return m > 0 ? `~${m}m left` : `~${s}s left`
})

/* Blob output */
const recordedBlob = ref(null)

/* Public API */
async function start() {
  try {
    if (!stream) {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    }
    // Mute logic uses gain node if needed
    buildAudioGraph(stream)

    const mime = pickMime()
    usedMime.value = mime || 'audio/webm;codecs=opus'
    mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    chunks = []
    mediaRecorder.ondataavailable = e => { if (e.data?.size) { chunks.push(e.data); totalBytes.value += e.data.size } }
    mediaRecorder.onstop = handleStop
    mediaRecorder.onerror = e => { showToast('Recorder error'); emit('error', e); }

    mediaRecorder.start(1000) // chunk every second
    startedAt.value = Date.now()
    paused.value = false
    elapsed.value = 0
    tick()
    collapsed.value = false
    animateWave()
    animateLevel()
    vibrate(10)
    emit('start')
  } catch (err) {
    if (err?.name === 'NotAllowedError') { emit('permission-denied'); showToast('Microphone permission denied') }
    else showToast('Cannot start recording')
    emit('error', err)
  }
}
function pause() {
  if (!mediaRecorder || paused.value) return
  mediaRecorder.pause()
  paused.value = true
  clearInterval(timerId.value)
  vibrate(6)
  emit('pause')
}
function resume() {
  if (!mediaRecorder || !paused.value) return
  mediaRecorder.resume()
  paused.value = false
  tick()
  vibrate(6)
  emit('resume')
}
function stop() {
  if (!mediaRecorder) return
  try { mediaRecorder.stop() } catch {}
  clearInterval(timerId.value)
  cancelAnimationFrame(waveRAF); cancelAnimationFrame(levelRAF)
  waveRAF = levelRAF = null
  vibrate(12)
}
defineExpose({ start, stop, pause, resume })

/* Helpers */
function togglePause(){ paused.value ? resume() : pause() }
function addMarker(){
  if (!startedAt.value) return
  const t = elapsed.value
  markers.value.push(t)
  emit('marker', t)
  showToast(`Marker @ ${elapsedLabel.value}`)
}

function muteToggle(){
  muted.value = !muted.value
  if (source && audioCtx) {
    source.mediaStream.getAudioTracks().forEach(t => t.enabled = !muted.value)
  }
}

function tick() {
  clearInterval(timerId.value)
  timerId.value = setInterval(()=>{ if (!paused.value) elapsed.value = Date.now() - startedAt.value }, 250)
}

function handleStop() {
  recordedBlob.value = new Blob(chunks, { type: usedMime.value || 'audio/webm;codecs=opus' })
  if (autoSave.value) downloadBlob()
  cleanupAudio()
  emit('stop', { blob: recordedBlob.value, markers: markers.value.slice() })
}
function pickMime(){
  const prefs = ['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4']
  return prefs.find(m => MediaRecorder.isTypeSupported?.(m))
}

/* Waveform + level meter */
function animateWave(){
  const ctx = wave.value?.getContext('2d')
  if (!ctx || !analyser) return
  const w = wave.value.width = wave.value.clientWidth * devicePixelRatio
  const h = wave.value.height = wave.value.clientHeight * devicePixelRatio
  const buf = new Uint8Array(analyser.frequencyBinCount)
  const mid = h/2

  const draw = ()=>{
    analyser.getByteTimeDomainData(buf)
    ctx.clearRect(0,0,w,h)
    ctx.strokeStyle = 'rgba(255,255,255,.9)'
    ctx.lineWidth = 2
    ctx.beginPath()
    const step = Math.max(1, Math.floor(buf.length / w))
    for (let x=0,i=0; x<w && i<buf.length; x++, i+=step){
      const v = (buf[i] - 128)/128
      const y = mid + v * (h*0.38)
      if (x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y)
    }
    ctx.stroke()
    waveRAF = requestAnimationFrame(draw)
  }
  draw()
}
function animateLevel(){
  if (!analyser) return
  const arr = new Uint8Array(analyser.frequencyBinCount)
  const loop = ()=>{
    analyser.getByteFrequencyData(arr)
    const avg = arr.reduce((a,b)=>a+b,0)/(arr.length || 1)
    level.value = Math.min(1, avg/255)
    levelRAF = requestAnimationFrame(loop)
  }
  loop()
}
function buildAudioGraph(s){
  audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  analyser = audioCtx.createAnalyser()
  analyser.fftSize = 1024
  source = audioCtx.createMediaStreamSource(s)
  source.connect(analyser)
}
function cleanupAudio(){
  try {
    analyser?.disconnect()
    source?.disconnect()
    audioCtx?.close()
  } catch {}
  analyser = source = audioCtx = null
}

/* Long press stop */
function startHoldToStop(e){
  e.preventDefault()
  holdStart.value = performance.now()
  holdPct.value = 0
  holdTimer.value = requestAnimationFrame(stepHold)
}
function stepHold(ts){
  const d = ts - holdStart.value
  holdPct.value = Math.min(1, d/holdMS)
  if (holdPct.value >= 1){
    cancelHoldToStop()
    stop()
  } else {
    holdTimer.value = requestAnimationFrame(stepHold)
  }
}
function cancelHoldToStop(){
  if (holdTimer.value) cancelAnimationFrame(holdTimer.value)
  holdTimer.value = null
  holdPct.value = 0
}

/* Download */
function downloadBlob(){
  if (!recordedBlob.value) return showToast('Nothing to download')
  const url = URL.createObjectURL(recordedBlob.value)
  const a = document.createElement('a')
  a.href = url
  a.download = `recording-${new Date().toISOString().replace(/[:.]/g,'-')}.webm`
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
  showToast('Download started')
}

/* Utils */
function showToast(msg){
  toast.value = msg
  clearTimeout(showToast._t)
  showToast._t = setTimeout(()=> toast.value = '', 1400)
  vibrate(4)
}
function vibrate(ms=8){ try{ navigator?.vibrate?.(ms) }catch{} }
function prettyBytes(b){
  if (b < 1024) return `${b} B`
  if (b < 1024*1024) return `${(b/1024).toFixed(1)} KB`
  return `${(b/1024/1024).toFixed(1)} MB`
}

/* Lifecycle */
onMounted(()=>{
  // Auto-prepare mic permission silently
  navigator.mediaDevices?.getUserMedia?.({ audio: true })
    .then(s => { s.getTracks().forEach(t => t.stop()) })
    .catch(()=>{})
})
onBeforeUnmount(()=>{
  clearInterval(timerId.value)
  cancelAnimationFrame(waveRAF); cancelAnimationFrame(levelRAF)
  try { stream?.getTracks().forEach(t => t.stop()) } catch {}
})

/* Reactive effects */
watch(muted, v => { if (source) source.mediaStream.getAudioTracks().forEach(t => t.enabled = !v) })

/* Can pause/resume? */
const canPauseResume = computed(()=> !!mediaRecorder && mediaRecorder.state !== 'inactive')
</script>

<style scoped>
/* Buttons */
.btn{
  @apply px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 border border-indigo-600 hover:bg-indigo-700
         active:scale-95 transition w-full text-white;
}
.btn.ghost{
  @apply bg-white/10 border-white/15 text-white hover:bg-white/15;
}
.btn.danger{
  @apply bg-rose-600 border-rose-600 hover:bg-rose-700;
}
.btn.xs{
  @apply px-3 py-1.5 rounded-lg;
}

/* Header metrics */
.metric{ @apply flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2; }

/* Rec dot */
@keyframes pulse{ 0%,100%{ transform: scale(1); opacity: 1 } 50%{ transform: scale(.8); opacity:.6 } }
.rec-dot{
  width: 10px; height: 10px; border-radius: 999px; background: #ef4444; box-shadow: 0 0 0 4px rgba(239,68,68,.15);
  animation: pulse 1.4s infinite;
}

/* Bottom sheet entrance */
@keyframes sheetIn { from { transform: translateY(18px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
.animate-sheet-in{ animation: sheetIn .22s ease-out both; }

/* Improve canvas crispness on mobile */
canvas{ image-rendering: optimizeSpeed; }

/* iOS tap highlight */
:host, button { -webkit-tap-highlight-color: transparent; }
</style>
