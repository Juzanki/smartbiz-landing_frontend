<!-- src/components/VoiceToggle.vue -->
<template>
  <section
    class="section-anim min-h-screen p-5 flex flex-col items-center justify-center bg-white dark:bg-[#121212]"
    :class="{ 'reduce-motion': reduceMotion }"
  >
    <!-- Status banners -->
    <div v-if="!online" class="w-full max-w-sm mb-3 rounded-xl bg-amber-50 text-amber-900 px-3 py-2 text-sm" role="status" aria-live="polite">
      You’re offline — voice will pause.
    </div>
    <div v-if="perm==='denied'" class="w-full max-w-sm mb-3 rounded-xl bg-rose-50 text-rose-900 px-3 py-2 text-sm" role="alert">
      Mic permission denied. Allow microphone in browser settings.
    </div>

    <!-- Title -->
    <h2 class="text-2xl font-bold text-yellow-500 mb-1 animate-pulse">VoiceToggle</h2>
    <p class="text-sm text-gray-500 dark:text-gray-300 mb-6">SmartBiz mobile mic control</p>

    <!-- Mic button -->
    <button
      ref="btn"
      class="mic-btn focus:outline-none focus:ring-4 focus:ring-blue-300/40 dark:focus:ring-blue-600/30"
      :class="isOn ? 'on' : 'off'"
      :style="ringStyle"
      :aria-pressed="isOn"
      :aria-describedby="'status-hint'"
      :disabled="perm==='denied' || busy"
      @pointerdown="onPress"
      @pointerup="onRelease"
      @pointercancel="onRelease"
      @keydown.space.prevent="toggle()"
      @keydown.enter.prevent="toggle()"
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
      <div class="text-[10px] mt-0.5 opacity-75" v-if="duration>0">{{ fmtDuration(duration) }}</div>

      <!-- glow ring -->
      <span class="ring-glow" aria-hidden="true"></span>
    </button>

    <p id="status-hint" class="sr-only">Press the big round button to start or stop microphone.</p>

    <!-- Helper controls -->
    <div class="mt-4 flex items-center gap-2">
      <button class="chip" @click="toggleMode" :disabled="busy">
        {{ mode==='push' ? 'Switch to Toggle' : 'Switch to Push-to-Talk' }}
      </button>
      <button class="chip" @click="toggleSidetone" :disabled="busy || !isOn">
        {{ sidetone ? 'Mute sidetone' : 'Enable sidetone' }}
      </button>
    </div>

    <!-- Level + status -->
    <div class="mt-4 w-full max-w-sm rounded-xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 p-3">
      <div class="flex items-center justify-between text-xs text-gray-600 dark:text-white/70 mb-2">
        <span>Status: <strong>{{ statusLabel }}</strong></span>
        <span v-if="peakHold>0">Peak: <strong>{{ peakHold }}</strong></span>
      </div>

      <!-- level meter -->
      <div class="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
        <div class="h-full transition-all bg-blue-600" :style="{ width: Math.round(level*100)+'%' }"></div>
      </div>

      <!-- tiny visualizer -->
      <canvas ref="viz" class="mt-2 w-full h-16 rounded-lg bg-gray-100 dark:bg-white/5"></canvas>

      <p class="mt-2 text-[11px] text-gray-500 dark:text-white/60">
        Tip: double-tap the mic to {{ isOn ? 'mute' : 'unmute' }} quickly.
      </p>
    </div>

    <!-- Toast -->
    <div v-if="toast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div class="rounded-xl bg-emerald-600 text-white text-sm px-3 py-2 shadow">{{ toast }}</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'

/** Modes: 'toggle' (tap to start/stop) or 'push' (hold to talk) */
const mode = ref<'toggle'|'push'>(readLS<'toggle'|'push'>('voicetoggle:mode','toggle'))
const isOn = ref(false)
const busy = ref(false)
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const perm = ref<'idle'|'prompt'|'granted'|'denied'>('idle')
const reduceMotion = typeof window !== 'undefined'
  ? matchMedia('(prefers-reduced-motion: reduce)').matches : false

/* Audio */
let ac: AudioContext | null = null
let stream: MediaStream | null = null
let srcNode: MediaStreamAudioSourceNode | null = null
let analyser: AnalyserNode | null = null
let gain: GainNode | null = null // sidetone

/* Visuals / VAD */
const level = ref(0)           // 0..1 RMS
const peakHold = ref(0)        // 0..100 with decay
let raf: number | null = null
const viz = ref<HTMLCanvasElement|null>(null)
let vizCtx: CanvasRenderingContext2D|null = null

/* VAD (auto-stop on silence) */
const SILENCE_DB = 0.04        // ~ threshold (0..1 RMS)
const SILENCE_MS = 12000       // stop after this much continuous silence
let silenceSince = 0

/* Duration */
const duration = ref(0)
let durTimer: number | null = null

/* UI */
const btn = ref<HTMLButtonElement|null>(null)
const sidetone = ref(false)
const toast = ref('')

/* Status label */
const statusLabel = computed(() => {
  if (busy.value) return 'Preparing…'
  if (perm.value==='denied') return 'Permission denied'
  return isOn.value ? 'Streaming' : 'Idle'
})

/* Ring style */
const ringStyle = computed(() => {
  const pct = Math.round(level.value * 100)
  return {
    '--ring-pct': pct + '%',
  } as any
})

/* Lifecycle */
onMounted(async () => {
  document.addEventListener('visibilitychange', onVis)
  window.addEventListener?.('online', () => online.value = true)
  window.addEventListener?.('offline', () => online.value = false)

  // Try to read permission state if supported
  try {
    // Safari iOS doesn’t support this; it’s fine to fail silently
    // @ts-ignore
    const q = await navigator.permissions?.query?.({ name: 'microphone' })
    if (q && 'state' in q) {
      // @ts-ignore
      perm.value = q.state === 'granted' ? 'granted' : q.state === 'denied' ? 'denied' : 'idle'
      q.onchange = () => {
        // @ts-ignore
        perm.value = q.state === 'granted' ? 'granted' : q.state === 'denied' ? 'denied' : 'idle'
      }
    }
  } catch {}

  // Prepare visualizer
  if (viz.value) vizCtx = viz.value.getContext('2d')
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVis)
  stopAll()
})

watch(mode, v => writeLS('voicetoggle:mode', v))
watch(isOn, v => {
  // focus button for accessibility feedback
  v && btn.value?.focus()
})

/* Controls */
function toggleMode(){ mode.value = mode.value==='toggle' ? 'push' : 'toggle'; vibrate([12]); toastNow(mode.value==='push'?'Push-to-Talk':'Toggle mode') }
function toggleSidetone(){
  sidetone.value = !sidetone.value
  if (gain) gain.gain.value = sidetone.value ? 0.12 : 0
  toastNow(sidetone.value ? 'Sidetone ON' : 'Sidetone OFF')
}

function onPress(){
  // double-tap quick toggle in toggle mode
  const t = Date.now()
  const last = (btn.value as any)?._lastTap ?? 0
  ;(btn.value as any)._lastTap = t
  if (mode.value==='toggle') {
    if (t - last < 280) { toggle(); return }
    toggle()
  } else {
    start()
  }
}
function onRelease(){
  if (mode.value==='push') stop()
}
function toggle(){ isOn.value ? stop() : start() }

/* Start mic */
async function start(){
  if (busy.value || isOn.value) return
  busy.value = true
  try {
    if (!ac) ac = new (window.AudioContext || (window as any).webkitAudioContext)()
    if (ac.state === 'suspended') await ac.resume()

    perm.value = 'prompt'
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true, noiseSuppression: true, autoGainControl: true,
        channelCount: 1, sampleRate: 48000
      },
      video: false
    })
    perm.value = 'granted'

    // Nodes
    srcNode = ac.createMediaStreamSource(stream)
    analyser = ac.createAnalyser()
    analyser.fftSize = 1024
    gain = ac.createGain()
    gain.gain.value = sidetone.value ? 0.12 : 0

    // Graph
    srcNode.connect(analyser)
    srcNode.connect(gain).connect(ac.destination)

    // Draw loop + VAD
    const data = new Uint8Array(analyser.frequencyBinCount)
    const draw = () => {
      if (!analyser) return
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i=0;i<data.length;i++){ const v = (data[i]-128)/128; sum += v*v }
      const rms = Math.sqrt(sum/data.length)
      level.value = Math.min(1, rms*1.8)

      // peak hold with decay
      const p = Math.round(level.value*100)
      peakHold.value = Math.max(0, Math.max(peakHold.value - 1, p))

      // VAD silence window
      const now = performance.now()
      if (rms < SILENCE_DB) {
        if (!silenceSince) silenceSince = now
        else if (now - silenceSince > SILENCE_MS) {
          // auto stop to save battery
          stop()
          toastNow('Stopped (silence)')
          silenceSince = 0
          return
        }
      } else {
        silenceSince = 0
      }

      drawViz(rms)
      raf = requestAnimationFrame(draw)
    }
    draw()

    // duration
    duration.value = 0
    durTimer = window.setInterval(()=> duration.value++, 1000) as unknown as number

    isOn.value = true
    vibrate([12])
  } catch (err: any) {
    perm.value = (err?.name==='NotAllowedError' || err?.name==='SecurityError') ? 'denied' : perm.value
    console.error(err)
    toastNow('Mic error')
  } finally {
    busy.value = false
  }
}

/* Stop mic */
async function stop(){
  if (!isOn.value) return
  await stopAll()
  isOn.value = false
  vibrate([8])
}

/* Tear down graph + timers */
async function stopAll(){
  if (durTimer){ clearInterval(durTimer); durTimer = null }
  if (raf){ cancelAnimationFrame(raf); raf = null }
  try { stream?.getTracks().forEach(t=>t.stop()) } catch {}
  try { srcNode?.disconnect(); analyser?.disconnect(); gain?.disconnect() } catch {}
  stream = null; srcNode = null; analyser = null; gain = null
  level.value = 0
  peakHold.value = 0
  drawViz(0, true)
}

/* Background handling */
function onVis(){
  if (!ac) return
  if (document.hidden && isOn.value) {
    try { ac.suspend() } catch {}
  } else if (isOn.value) {
    try { ac.resume() } catch {}
  }
}

/* Visualizer (simple bars) */
function drawViz(rms: number, clear=false){
  if (!viz.value || !vizCtx) return
  const canvas = viz.value
  const dpr = Math.max(1, window.devicePixelRatio || 1)
  const w = canvas.clientWidth, h = canvas.clientHeight
  if (canvas.width !== w*dpr) { canvas.width = w*dpr; canvas.height = h*dpr; vizCtx.scale(dpr,dpr) }
  const ctx = vizCtx
  ctx.clearRect(0,0,w,h)
  if (clear) return
  const bars = 24
  const pad = 6
  const barW = (w - pad*(bars+1)) / bars
  for (let i=0;i<bars;i++){
    const f = Math.sin((i/bars)*Math.PI) // center heavier
    const bh = Math.max(2, (rms* (0.5 + f)) * (h-6))
    const x = pad + i*(barW+pad)
    const y = h - bh - 3
    ctx.fillStyle = 'rgba(59,130,246,0.85)' // blue-600
    ctx.fillRect(x,y,barW,bh)
  }
}

/* Helpers */
function fmtDuration(s: number){
  const m = Math.floor(s/60).toString().padStart(2,'0')
  const ss = (s%60).toString().padStart(2,'0')
  return `${m}:${ss}`
}
function vibrate(pattern: number[]){ try{ navigator.vibrate?.(pattern) }catch{} }
function toastNow(msg:string){ toast.value = msg; setTimeout(()=> toast.value='', 1600) }

function writeLS<T=unknown>(k:string, v:T){ try{ localStorage.setItem(k, JSON.stringify(v)) }catch{} }
function readLS<T=unknown>(k:string, def:T){ try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return (v ?? def) as T }catch{ return def } }
</script>

<style scoped>
/* Entrance animation */
.section-anim { animation: fadeSlide .5s ease both; }
@keyframes fadeSlide { 0% { opacity:0; transform: translateY(20px) } 100% { opacity:1; transform:none } }

/* Big, thumb-friendly mic */
.mic-btn{
  width: min(72vw, 220px);
  height: min(72vw, 220px);
  border-radius: 9999px;
  display: inline-flex;
  flex-direction: column;
  align-items: center; justify-content: center;
  position: relative;
  background-clip: padding-box;
  box-shadow: 0 10px 28px rgba(0,0,0,.25);
  transition: transform .15s ease, box-shadow .2s ease, background .2s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.mic-btn.off{ background: #111827; color:#fff; }
.mic-btn.on{  background: #1d4ed8; color:#fff; }
.mic-btn:active { transform: scale(.97); }
.mic-btn:disabled { opacity:.6; cursor:not-allowed }

/* Reactive conic ring via CSS var */
.mic-btn::before{
  content:'';
  position:absolute; inset:-8px;
  border-radius:inherit;
  background:
    conic-gradient(rgba(255,255,255,.28) var(--ring-pct, 0%), transparent 0),
    radial-gradient(transparent 58%, rgba(255,255,255,.2) 60%, transparent 62%);
  filter: blur(0.3px);
  z-index:-1;
}

/* Soft glow when ON */
.ring-glow{
  position:absolute; inset:-16px; border-radius:inherit;
  box-shadow: 0 0 120px 40px rgba(37,99,235,.28);
  opacity:0; transition: opacity .25s ease;
}
.mic-btn.on .ring-glow{ opacity:1 }

/* Small chips */
.chip{
  @apply px-3 h-9 rounded-full text-sm bg-gray-100 dark:bg-white/10 dark:text-white hover:bg-gray-200 dark:hover:bg-white/15;
}

/* Canvas fits parent size */
canvas{ display:block; }

/* Safe-area padding for phones with notches */
@supports(padding:max(0px)) { section { padding-bottom: max(1rem, env(safe-area-inset-bottom)); } }

/* Reduced motion */
.reduce-motion * { transition: none !important; animation: none !important; }

/* Screen reader helper */
.sr-only{ position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0; }
</style>
