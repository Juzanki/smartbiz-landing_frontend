<template>
  <div
    class="min-h-screen p-6 flex flex-col gap-6 items-center justify-start transition-colors duration-300"
    :class="dark ? 'bg-[#121212] text-white' : 'bg-white text-slate-800'"
  >
    <!-- App bar -->
    <header class="w-full max-w-md flex items-center justify-between">
      <h2 class="text-xl font-bold text-amber-500">VoiceToggle</h2>
      <div class="flex items-center gap-2">
        <select
          v-model="selectedDeviceId"
          @change="switchDevice"
          class="text-xs rounded-lg px-2 py-1 border"
          :class="dark ? 'bg-transparent border-gray-600' : 'bg-white border-gray-300'"
        >
          <option v-for="d in devices" :key="d.deviceId" :value="d.deviceId">
            {{ d.label || 'Microphone' }}
          </option>
        </select>
        <button
          @click="dark = !dark"
          class="text-xs px-3 py-1.5 rounded-lg border"
          :class="dark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'"
        >
          {{ dark ? '☀️ Light' : '🌙 Dark' }}
        </button>
      </div>
    </header>

    <!-- Status + timer -->
    <div class="w-full max-w-md rounded-xl px-4 py-3 flex items-center justify-between"
         :class="dark ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-200'">
      <div class="text-sm">
        <div class="font-semibold">{{ micStatusText }}</div>
        <div class="text-xs opacity-70">{{ hintText }}</div>
      </div>
      <div class="text-sm font-mono tabular-nums" :class="isRecording ? 'text-red-500' : 'opacity-70'">
        ⏱ {{ clock }}
      </div>
    </div>

    <!-- Visualizer -->
    <div class="w-full max-w-md">
      <canvas ref="canvasRef" class="w-full h-24 rounded-xl"
              :class="dark ? 'bg-black/60 ring-1 ring-white/10' : 'bg-slate-100 ring-1 ring-slate-200'"></canvas>
      <div class="mt-2 flex items-center gap-2 text-xs">
        <div class="flex-1 h-2 rounded-full overflow-hidden" :class="dark ? 'bg-white/10' : 'bg-slate-200'">
          <div class="h-full transition-all duration-100"
               :style="{ width: levelPct + '%' }"
               :class="isRecording ? 'bg-red-500' : 'bg-emerald-500'"></div>
        </div>
        <span class="w-12 text-right">{{ Math.round(levelPct) }}%</span>
      </div>
    </div>

    <!-- Controls -->
    <div class="w-full max-w-md grid grid-cols-3 gap-3">
      <button
        @click="toggleRecording"
        @touchstart.passive="holdToTalkStart"
        @touchend.passive="holdToTalkEnd"
        class="col-span-2 rounded-2xl h-16 text-sm font-semibold shadow-lg active:scale-95 transition"
        :class="isRecording
          ? 'bg-red-500 hover:bg-red-600 text-white'
          : 'bg-emerald-500 hover:bg-emerald-600 text-white'">
        {{ isRecording ? 'Stop Recording' : (holdMode ? 'Hold to Talk' : 'Start Recording') }}
      </button>

      <button
        @click="holdMode = !holdMode"
        class="rounded-2xl h-16 text-sm font-semibold border"
        :class="holdMode
          ? (dark ? 'border-emerald-400 text-emerald-300' : 'border-emerald-500 text-emerald-700')
          : (dark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700')"
      >
        {{ holdMode ? 'Hold Mode: On' : 'Hold Mode: Off' }}
      </button>
    </div>

    <!-- Playback & export -->
    <div v-if="audioUrl" class="w-full max-w-md rounded-xl p-4 flex flex-col gap-3"
         :class="dark ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-200'">
      <audio :src="audioUrl" controls class="w-full"></audio>
      <div class="flex items-center gap-2 text-xs opacity-70">
        <span>Size: {{ prettySize(lastBlobSize) }}</span>
        <span>•</span>
        <span>Type: {{ lastMime }}</span>
      </div>
      <div class="flex gap-2">
        <a :href="audioUrl" :download="downloadName"
           class="px-3 py-2 rounded-lg text-sm border"
           :class="dark ? 'border-gray-600' : 'border-gray-300'">Download</a>
        <button @click="reset" class="px-3 py-2 rounded-lg text-sm border"
                :class="dark ? 'border-gray-600' : 'border-gray-300'">Discard</button>
      </div>
    </div>

    <!-- Permission notice -->
    <p v-if="permError" class="max-w-md text-center text-sm text-red-500">
      {{ permError }}
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

/* ----------------- state ----------------- */
const dark = ref(false)
const isRecording = ref(false)
const holdMode = ref(true)          // tap-to-toggle or hold-to-talk
const hintText = ref('Tap to start, or enable Hold Mode for push-to-talk.')
const micStatusText = ref('Microphone ready')

const mediaStream = ref(null)
let mediaRecorder = null
const chunks = []
const audioUrl = ref('')
const lastBlobSize = ref(0)
const lastMime = ref('audio/webm')

const devices = ref([])
const selectedDeviceId = ref('')
const permError = ref('')

/* timer */
const clock = ref('00:00')
let startTs = 0, tickId = 0

/* visualizer */
const canvasRef = ref(null)
let ctx, analyser, dataArray, rafId
const levelPct = ref(0)

/* ----------------- setup ----------------- */
onMounted(async () => {
  await ensureStream()
  await enumerateMics()
  initCanvas()
})

onBeforeUnmount(() => {
  stopAll()
  cancelAnimationFrame(rafId)
  clearInterval(tickId)
})

/* ----------------- mic / stream ----------------- */
async function ensureStream() {
  try {
    const constraints = {
      audio: selectedDeviceId.value
        ? { deviceId: { exact: selectedDeviceId.value }, echoCancellation: true, noiseSuppression: true }
        : { echoCancellation: true, noiseSuppression: true }
    }
    mediaStream.value = await navigator.mediaDevices.getUserMedia(constraints)
    setupAnalyser()
    permError.value = ''
    micStatusText.value = 'Microphone ready'
  } catch (e) {
    permError.value = 'Microphone permission denied or unavailable.'
    micStatusText.value = 'No microphone'
  }
}

async function enumerateMics() {
  try {
    const list = await navigator.mediaDevices.enumerateDevices()
    devices.value = list.filter(d => d.kind === 'audioinput')
    if (!selectedDeviceId.value && devices.value[0]) selectedDeviceId.value = devices.value[0].deviceId
  } catch {}
}

async function switchDevice() {
  stopAll()
  await ensureStream()
}

/* ----------------- recording ----------------- */
function startRec() {
  if (!mediaStream.value) return
  chunks.length = 0
  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm'
  lastMime.value = mime
  mediaRecorder = new MediaRecorder(mediaStream.value, { mimeType: mime })
  mediaRecorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: lastMime.value })
    lastBlobSize.value = blob.size
    audioUrl.value = URL.createObjectURL(blob)
  }
  mediaRecorder.start()
  isRecording.value = true
  micStatusText.value = 'Recording…'
  startTimer()
  startViz()
}

function stopRec() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop()
  isRecording.value = false
  micStatusText.value = 'Stopped'
  stopTimer()
  stopViz()
}

function toggleRecording() {
  if (holdMode.value) return // in hold mode, main button only acts on touch events
  isRecording.value ? stopRec() : startRec()
}

/* hold-to-talk on mobile */
function holdToTalkStart() { if (holdMode.value && !isRecording.value) startRec() }
function holdToTalkEnd() { if (holdMode.value && isRecording.value) stopRec() }

/* ----------------- timer ----------------- */
function startTimer() {
  startTs = Date.now()
  tickId = setInterval(() => {
    const s = Math.floor((Date.now() - startTs) / 1000)
    const mm = String(Math.floor(s / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    clock.value = `${mm}:${ss}`
  }, 250)
}
function stopTimer() { clearInterval(tickId); tickId = 0 }

/* ----------------- visualizer ----------------- */
function setupAnalyser() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  const ac = new AudioCtx()
  const src = ac.createMediaStreamSource(mediaStream.value)
  analyser = ac.createAnalyser()
  analyser.fftSize = 1024
  dataArray = new Uint8Array(analyser.frequencyBinCount)
  src.connect(analyser)
}

function initCanvas() {
  const c = canvasRef.value
  ctx = c.getContext('2d')
  const resize = () => {
    c.width = c.clientWidth * devicePixelRatio
    c.height = c.clientHeight * devicePixelRatio
  }
  resize()
  new ResizeObserver(resize).observe(c)
  drawIdle()
}

function drawIdle() {
  if (!ctx) return
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  ctx.globalAlpha = 1
}

function startViz() {
  const draw = () => {
    rafId = requestAnimationFrame(draw)
    analyser.getByteTimeDomainData(dataArray)
    const { width, height } = canvasRef.value
    ctx.clearRect(0, 0, width, height)
    ctx.lineWidth = 2 * devicePixelRatio
    ctx.strokeStyle = isRecording.value ? '#ef4444' : '#10b981'
    ctx.beginPath()
    let slice = width / dataArray.length
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0 // 0..2
      const y = (v * height) / 2
      const x = i * slice
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // level %
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      const dv = dataArray[i] - 128
      sum += dv * dv
    }
    const rms = Math.sqrt(sum / dataArray.length) // 0..~128
    levelPct.value = Math.min(100, Math.round((rms / 64) * 100))
  }
  draw()
}
function stopViz() {
  cancelAnimationFrame(rafId)
  drawIdle()
}

/* ----------------- utils ----------------- */
function prettySize(n) {
  if (!n) return '0 KB'
  const kb = n / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(2)} MB`
}
const downloadName = 'smartbiz-voice.webm'

function reset() {
  audioUrl.value && URL.revokeObjectURL(audioUrl.value)
  audioUrl.value = ''
  lastBlobSize.value = 0
}

function stopAll() {
  try { mediaRecorder && mediaRecorder.state !== 'inactive' && mediaRecorder.stop() } catch {}
  mediaStream.value?.getTracks().forEach(t => t.stop())
}
</script>

<style scoped>
/* subtle entrance */
:host, .min-h-screen { animation: fadeSlide .45s ease }
@keyframes fadeSlide {
  0% { opacity: 0; transform: translateY(24px) }
  100% { opacity: 1; transform: translateY(0) }
}
</style>
