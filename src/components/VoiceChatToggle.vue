<!-- src/components/VoiceChatControl.vue -->
<template>
  <section class="p-4">
    <!-- banners -->
    <div v-if="!online" class="mb-3 rounded-xl bg-amber-50 text-amber-900 px-3 py-2 text-sm">
      You’re offline — voice streaming paused.
    </div>
    <div v-if="perm==='denied'" class="mb-3 rounded-xl bg-rose-50 text-rose-900 px-3 py-2 text-sm">
      Mic permission denied. Open browser settings to allow microphone.
    </div>

    <!-- big mic button -->
    <div class="flex items-center justify-center">
      <button
        ref="btn"
        class="mic-btn active:scale-95"
        :class="[
          isOn ? 'bg-blue-700 text-white' : 'bg-gray-900 text-white',
          'shadow-lg'
        ]"
        :style="ringStyle"
        @pointerdown="onPress"
        @pointerup="onRelease"
        @pointercancel="onRelease"
        @keydown.space.prevent="onKeyToggle"
        @keydown.enter.prevent="onKeyToggle"
        :aria-pressed="isOn"
        :disabled="perm==='denied' || busy"
      >
        <div class="text-3xl leading-none">{{ isOn ? '🎙️' : '🔇' }}</div>
        <div class="mt-1 text-xs opacity-90">
          <template v-if="mode==='push'">
            {{ isOn ? 'Hold to talk…' : 'Hold to talk' }}
          </template>
          <template v-else>
            {{ isOn ? 'Tap to mute' : 'Tap to speak' }}
          </template>
        </div>
        <div class="text-[10px] mt-0.5 opacity-75" v-if="duration>0">
          {{ fmtDuration(duration) }}
        </div>
      </button>
    </div>

    <!-- mini controls row -->
    <div class="mt-3 flex items-center justify-center gap-2">
      <button class="chip" @click="toggleMode" :disabled="busy">
        {{ mode==='push' ? 'Switch to Toggle' : 'Switch to Push-to-Talk' }}
      </button>
      <button class="chip" @click="openSheet" :disabled="busy">Input device</button>
      <button class="chip" @click="toggleMutePreview" :disabled="!isOn">
        {{ monitorMuted ? 'Enable sidetone' : 'Mute sidetone' }}
      </button>
    </div>

    <!-- waveform -->
    <div class="mt-3 rounded-xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 p-3">
      <div class="flex items-center justify-between text-xs text-gray-600 dark:text-white/70 mb-1">
        <span>Status: <strong>{{ statusLabel }}</strong></span>
        <span v-if="peak>0">Peak: <strong>{{ peak }}</strong></span>
      </div>
      <canvas ref="canvas" class="w-full h-16 block"></canvas>
      <div class="mt-1 text-[11px] text-gray-500 dark:text-white/60">
        Tip: double-tap the mic to quickly {{ isOn ? 'mute' : 'unmute' }}.
      </div>
    </div>

    <!-- bottom sheet: devices -->
    <div v-if="sheet" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeSheet"></div>
      <div class="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white dark:bg-[#0b0b10] shadow-2xl">
        <div class="mx-auto w-full max-w-2xl p-4">
          <div class="flex items-center gap-2 mb-3">
            <button @click="closeSheet" class="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10" aria-label="Close">✖</button>
            <h4 class="text-sm font-semibold">Select microphone</h4>
          </div>
          <div v-if="!devices.length" class="text-sm text-gray-600 dark:text-white/70">No inputs found.</div>
          <ul class="grid grid-cols-1 gap-2">
            <li v-for="d in devices" :key="d.deviceId">
              <button
                class="w-full text-left rounded-xl px-3 py-2 border border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
                :class="selectedDeviceId===d.deviceId && 'ring-2 ring-blue-600/60'"
                @click="chooseDevice(d.deviceId)"
              >
                {{ d.label || fallbackLabel(d) }}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- toast -->
    <div v-if="toast" class="fixed bottom-16 left-1/2 -translate-x-1/2 z-50">
      <div class="rounded-xl bg-emerald-600 text-white text-sm px-3 py-2 shadow">{{ toast }}</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'

/** Props */
const props = defineProps<{
  wsUrl?: string // optional WebSocket endpoint for streaming chunks
  modeDefault?: 'toggle' | 'push'
}>()

/** Emits (hook into your app analytics/network) */
const emit = defineEmits<{
  (e:'start'): void
  (e:'stop'): void
  (e:'chunk', blob: Blob): void
  (e:'error', err: unknown): void
}>()

/** State */
const mode = ref<'toggle'|'push'>(props.modeDefault ?? 'toggle')
const isOn = ref(false)
const busy = ref(false)
const perm = ref<'idle'|'prompt'|'granted'|'denied'>('idle')
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const monitorMuted = ref(true)         // sidetone preview
const peak = ref(0)
const level = ref(0)                    // 0..1 for ring
const duration = ref(0)                 // seconds
let durTimer: number | null = null

/** Audio plumbing */
let ac: AudioContext | null = null
let stream: MediaStream | null = null
let srcNode: MediaStreamAudioSourceNode | null = null
let analyser: AnalyserNode | null = null
let gain: GainNode | null = null       // sidetone gain
let raf: number | null = null

/** Recording/streaming */
let mr: MediaRecorder | null = null
let ws: WebSocket | null = null

/** UI refs */
const canvas = ref<HTMLCanvasElement|null>(null)
const btn = ref<HTMLButtonElement|null>(null)

/** Device management */
const devices = ref<MediaDeviceInfo[]>([])
const selectedDeviceId = ref<string>('default')
const sheet = ref(false)

/** Toast */
const toast = ref(''); const toastNow = (t:string)=>{ toast.value = t; setTimeout(()=> toast.value='', 1500) }

/** Status label */
const statusLabel = computed(() => {
  if (busy.value) return 'Preparing…'
  if (perm.value==='denied') return 'Permission denied'
  if (!isOn.value) return 'Idle'
  return 'Streaming'
})

/** Ring style (progress by level, respects reduced motion) */
const ringStyle = computed(() => {
  const pct = Math.round(level.value * 100)
  return {
    background:
      `conic-gradient(rgba(255,255,255,.25) ${pct}% , transparent 0)`,
    boxShadow: isOn.value ? '0 0 0 4px rgba(37,99,235,.25)' : '0 0 0 2px rgba(255,255,255,.15)'
  } as any
})

/** Lifecycle */
onMounted(async () => {
  document.addEventListener('visibilitychange', onVis)
  window.addEventListener?.('online', ()=> online.value = true)
  window.addEventListener?.('offline', ()=> online.value = false)
  try { await enumerateInputs() } catch {}
})
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVis)
  stopAll()
})

/** Interactions */
function onKeyToggle(){ mode.value==='toggle' ? toggleVoice() : null }
function onPress(e: PointerEvent){
  // enable double-tap toggle convenience
  if (mode.value==='toggle') {
    // double tap detection
    const t = Date.now()
    const last = (btn.value as any)?._lastTap ?? 0
    ;(btn.value as any)._lastTap = t
    if (t - last < 280) { toggleVoice(); return }
    toggleVoice()
  } else {
    // push-to-talk: start on press
    startVoice()
  }
}
function onRelease(){
  if (mode.value==='push') stopVoice()
}
function toggleMode(){ mode.value = mode.value==='toggle' ? 'push' : 'toggle'; toastNow(mode.value==='push' ? 'Push-to-talk' : 'Toggle mode') }
function toggleMutePreview(){
  monitorMuted.value = !monitorMuted.value
  if (gain) gain.gain.value = monitorMuted.value ? 0 : 0.12
}

/** Core start/stop */
async function toggleVoice(){ isOn.value ? stopVoice() : startVoice() }

async function startVoice(){
  if (busy.value || isOn.value) return
  busy.value = true
  try {
    // create audio graph
    if (!ac) ac = new (window.AudioContext || (window as any).webkitAudioContext)()
    if (ac.state === 'suspended') await ac.resume()

    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: selectedDeviceId.value ? { ideal: selectedDeviceId.value } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000
      },
      video: false
    }

    perm.value = 'prompt'
    stream = await navigator.mediaDevices.getUserMedia(constraints)
    perm.value = 'granted'

    srcNode = ac.createMediaStreamSource(stream)
    analyser = ac.createAnalyser()
    analyser.fftSize = 1024
    const data = new Uint8Array(analyser.frequencyBinCount)

    gain = ac.createGain()
    gain.gain.value = monitorMuted.value ? 0 : 0.12

    // connect: mic -> [split] analyser + (optional) speaker sidetone
    srcNode.connect(analyser)
    srcNode.connect(gain).connect(ac.destination)

    // visual loop
    const draw = () => {
      if (!analyser) return
      analyser.getByteTimeDomainData(data)
      // calculate rough RMS level
      let sum = 0
      for (let i=0;i<data.length;i++){ const v = (data[i]-128)/128; sum += v*v }
      level.value = Math.min(1, Math.sqrt(sum/data.length)*1.8)
      peak.value = Math.max(peak.value, Math.round(level.value*100))
      drawWave(data)
      raf = requestAnimationFrame(draw)
    }
    draw()

    // start recorder &/or websocket
    if (props.wsUrl) {
      ws = new WebSocket(props.wsUrl)
      ws.binaryType = 'arraybuffer'
      ws.onopen = () => startMediaRecorder()
      ws.onerror = () => emit('error', new Error('WebSocket error'))
    } else {
      startMediaRecorder()
    }

    // timers
    duration.value = 0
    durTimer = window.setInterval(()=> duration.value++, 1000) as unknown as number

    isOn.value = true
    emit('start')
    vibrate([12])
  } catch (err: any) {
    perm.value = (err && (err.name==='NotAllowedError' || err.name==='SecurityError')) ? 'denied' : perm.value
    emit('error', err)
    toastNow(err?.message || 'Microphone error')
    await stopAll()
  } finally {
    busy.value = false
  }
}

async function stopVoice(){
  if (!isOn.value) return
  await stopAll()
  isOn.value = false
  emit('stop')
  vibrate([8])
}

async function stopAll(){
  if (durTimer){ clearInterval(durTimer); durTimer = null }
  if (raf){ cancelAnimationFrame(raf); raf = null }
  if (mr && mr.state !== 'inactive'){ try{ mr.stop() }catch{} }
  mr = null
  if (ws){ try{ ws.close() }catch{} ws = null }
  if (stream){ try{ stream.getTracks().forEach(t=>t.stop()) }catch{} stream = null }
  if (srcNode){ try{ srcNode.disconnect() }catch{} srcNode = null }
  if (analyser){ try{ analyser.disconnect() }catch{} analyser = null }
  if (gain){ try{ gain.disconnect() }catch{} gain = null }
}

/** MediaRecorder with mime fallback */
function startMediaRecorder(){
  if (!stream) return
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4' // Safari may expose this
  ]
  const type = types.find(t => (window as any).MediaRecorder?.isTypeSupported?.(t))
  try {
    mr = new MediaRecorder(stream!, type ? { mimeType: type, audioBitsPerSecond: 48_000 } : undefined)
  } catch (e) {
    emit('error', new Error('MediaRecorder not supported'))
    return
  }
  mr.ondataavailable = (ev) => {
    if (!ev.data || !ev.data.size) return
    emit('chunk', ev.data)
    if (ws && ws.readyState === 1) {
      ev.data.arrayBuffer().then(ab => ws!.send(ab)).catch(()=>{})
    }
  }
  mr.start(750) // chunk every ~750ms
}

/** Canvas waveform */
function drawWave(bytes: Uint8Array){
  const c = canvas.value
  if (!c) return
  const ctx = c.getContext('2d')!
  const w = c.width = c.clientWidth * (window.devicePixelRatio || 1)
  const h = c.height = c.clientHeight * (window.devicePixelRatio || 1)
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)
  ctx.clearRect(0,0,w,h)
  ctx.lineWidth = 2
  ctx.strokeStyle = '#2563eb'
  ctx.beginPath()
  const step = Math.max(1, Math.floor(bytes.length / (c.clientWidth || 1)))
  for (let i=0, x=0; i<bytes.length; i+=step, x++){
    const v = (bytes[i]-128)/128
    const y = (c.clientHeight/2) + v * (c.clientHeight/2 - 2)
    x===0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()
}

/** Visibility pause */
function onVis(){
  if (document.hidden && isOn.value) {
    // soft pause (keeps graph) to save battery
    mr?.pause?.()
  } else {
    mr?.resume?.()
  }
}

/** Devices */
async function enumerateInputs(){
  const list = await navigator.mediaDevices.enumerateDevices()
  devices.value = list.filter(d => d.kind === 'audioinput')
}
function openSheet(){ sheet.value = true }
function closeSheet(){ sheet.value = false }
async function chooseDevice(id: string){
  selectedDeviceId.value = id
  sheet.value = false
  if (isOn.value) { // hot-swap
    await stopAll()
    await startVoice()
  }
}
function fallbackLabel(d: MediaDeviceInfo){ return d.kind==='audioinput' ? 'Microphone' : d.label || 'Device' }

/** Helpers */
function vibrate(pattern: number[]){ try{ navigator.vibrate?.(pattern) }catch{} }
function fmtDuration(s: number){
  const m = Math.floor(s/60).toString().padStart(2,'0')
  const ss = (s%60).toString().padStart(2,'0')
  return `${m}:${ss}`
}
function toggleVoiceChat(){ toggleVoice() } // back-compat if you swap component in

/** Expose a programmatic toggle if needed */
defineExpose({ startVoice, stopVoice, toggleVoice, chooseDevice, mode })
</script>

<style scoped>
.mic-btn{
  width: min(72vw, 220px);
  height: min(72vw, 220px);
  border-radius: 9999px;
  display: inline-flex;
  flex-direction: column;
  align-items: center; justify-content: center;
  position: relative;
  /* ring backdrop */
  background-clip: padding-box;
  transition: transform .15s ease, background .2s ease, box-shadow .2s ease;
}
.chip{
  @apply px-3 h-9 rounded-full text-sm bg-gray-100 dark:bg-white/10 dark:text-white hover:bg-gray-200 dark:hover:bg-white/15;
}

/* Reduce motion support */
:global(.reduced-motion) .mic-btn { transition: none !important; }

/* Safe-area padding for phones with notches */
@supports(padding:max(0px)) {
  section { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
}
</style>
