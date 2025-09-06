<!-- src/components/VoiceToggle.vue -->
<template>
  <section class="min-h-screen p-5 flex flex-col items-center justify-center bg-white dark:bg-[#121212]">
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
      class="mic-btn"
      :class="isOn ? 'bg-blue-700 text-white' : 'bg-gray-900 text-white'"
      :style="ringStyle"
      :aria-pressed="isOn"
      aria-describedby="status-hint"
      :disabled="perm==='denied' || busy"
      @pointerdown="onPress"
      @pointerup="onRelease"
      @pointercancel="onRelease"
      @keydown="onKey"
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
        <span v-if="peak>0">Peak: <strong>{{ peak }}</strong></span>
      </div>
      <div class="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
        <div class="h-full transition-all bg-blue-600" :style="{ width: Math.round(level*100)+'%' }"></div>
      </div>
      <p class="mt-2 text-[11px] text-gray-500 dark:text-white/60">
        Tip: double-tap the mic to {{ isOn ? 'mute' : 'unmute' }} quickly.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'

/* Mode: 'toggle' (tap to start/stop) or 'push' (hold to talk) */
const mode = ref<'toggle'|'push'>('toggle')
const isOn = ref(false)
const busy = ref(false)
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const perm = ref<'idle'|'prompt'|'granted'|'denied'>('idle')

/* Audio */
let ac: AudioContext | null = null
let stream: MediaStream | null = null
let srcNode: MediaStreamAudioSourceNode | null = null
let analyser: AnalyserNode | null = null
let gain: GainNode | null = null // sidetone

/* Visuals */
const level = ref(0)           // 0..1
const peak  = ref(0)           // 0..100
let raf: number | null = null

/* Duration */
const duration = ref(0)
let durTimer: number | null = null

/* UI */
const btn = ref<HTMLButtonElement|null>(null)
const sidetone = ref(false)

/* Computed */
const statusLabel = computed(() => {
  if (busy.value) return 'Preparing…'
  if (perm.value==='denied') return 'Permission denied'
  return isOn.value ? 'Streaming' : 'Idle'
})
const ringStyle = computed(() => {
  const pct = Math.round(level.value * 100)
  return { background: `conic-gradient(rgba(255,255,255,.25) ${pct}%, transparent 0)` } as any
})

/* Lifecycle */
onMounted(() => {
  document.addEventListener('visibilitychange', onVis)
  window.addEventListener?.('online',  () => (online.value = true))
  window.addEventListener?.('offline', () => (online.value = false))
})
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVis)
  stopAll()
})

/* Keyboard (single handler — fixes duplicate attribute error) */
function onKey(e: KeyboardEvent){
  const k = e.key
  if (k === 'Enter' || k === ' ' || k === 'Spacebar') {
    e.preventDefault()
    toggle()
  }
}

/* Controls */
function toggleMode(){ mode.value = mode.value==='toggle' ? 'push' : 'toggle'; vibrate([12]) }
function toggleSidetone(){ sidetone.value = !sidetone.value; if (gain) gain.gain.value = sidetone.value ? 0.12 : 0 }
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
function onRelease(){ if (mode.value==='push') stop() }
function toggle(){ isOn.value ? stop() : start() }

async function start(){
  if (busy.value || isOn.value) return
  busy.value = true
  try {
    if (!ac) ac = new (window.AudioContext || (window as any).webkitAudioContext)()
    if (ac.state === 'suspended') await ac.resume()

    perm.value = 'prompt'
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 48000 },
      video: false
    })
    perm.value = 'granted'

    srcNode = ac.createMediaStreamSource(stream)
    analyser = ac.createAnalyser()
    analyser.fftSize = 1024
    gain = ac.createGain()
    gain.gain.value = sidetone.value ? 0.12 : 0

    srcNode.connect(analyser)
    srcNode.connect(gain).connect(ac.destination)

    const data = new Uint8Array(analyser.frequencyBinCount)
    const draw = () => {
      if (!analyser) return
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i=0;i<data.length;i++){ const v = (data[i]-128)/128; sum += v*v }
      level.value = Math.min(1, Math.sqrt(sum/data.length)*1.8)
      peak.value  = Math.max(peak.value, Math.round(level.value*100))
      raf = requestAnimationFrame(draw)
    }
    draw()

    duration.value = 0
    // @ts-ignore
    durTimer = window.setInterval(() => (duration.value++), 1000)

    isOn.value = true
    vibrate([12])
  } catch (err: any) {
    perm.value = (err?.name==='NotAllowedError' || err?.name==='SecurityError') ? 'denied' : perm.value
    console.error(err)
  } finally {
    busy.value = false
  }
}

async function stop(){
  if (!isOn.value) return
  await stopAll()
  isOn.value = false
  vibrate([8])
}

async function stopAll(){
  if (durTimer){ clearInterval(durTimer); durTimer = null }
  if (raf){ cancelAnimationFrame(raf); raf = null }
  try { stream?.getTracks().forEach(t=>t.stop()) } catch {}
  try { srcNode?.disconnect(); analyser?.disconnect(); gain?.disconnect() } catch {}
  stream = null; srcNode = null; analyser = null; gain = null
}

function onVis(){
  if (document.hidden && isOn.value) {
    try { (ac as any)?.suspend?.() } catch {}
  } else {
    try { (ac as any)?.resume?.() } catch {}
  }
}

/* Helpers */
function fmtDuration(s: number){
  const m = Math.floor(s/60).toString().padStart(2,'0')
  const ss = (s%60).toString().padStart(2,'0')
  return `${m}:${ss}`
}
function vibrate(pattern: number[]){ try{ navigator.vibrate?.(pattern) }catch{} }
</script>

<style scoped>
/* Entrance animation (scoped to section only) */
.section-anim { animation: fadeSlide .6s ease; }
@keyframes fadeSlide { 0%{ opacity:0; transform: translateY(30px) } 100%{ opacity:1; transform:none } }

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
  transition: transform .15s ease, background .2s ease, box-shadow .2s ease;
}
.mic-btn:active { transform: scale(.97); }

/* Small chips */
.chip{
  @apply px-3 h-9 rounded-full text-sm bg-gray-100 dark:bg-white/10 dark:text-white hover:bg-gray-200 dark:hover:bg-white/15;
}

/* Safe-area padding for phones with notches */
@supports(padding:max(0px)) {
  section { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
}

/* Screen reader helper */
.sr-only{ position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0 }
</style>
