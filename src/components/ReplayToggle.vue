<!-- 📁 ReplayTogglePro.vue -->
<template>
  <button
    :class="[
      'relative select-none',
      'h-12 px-4 rounded-full shadow font-semibold text-sm',
      'flex items-center gap-2',
      isRecording ? 'bg-green-700 text-white' : 'bg-gray-800 text-white hover:bg-gray-700',
    ]"
    :aria-pressed="isRecording ? 'true' : 'false'"
    aria-live="polite"
    :disabled="pending"
    @click="onTap"
    @dblclick.prevent="quickStop"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <!-- Progress ring (max duration) -->
    <svg v-if="isRecording || pending" class="absolute -left-1.5" width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="16" class="text-white/15" stroke="currentColor" stroke-width="3" fill="none"/>
      <circle
        cx="18" cy="18" r="16"
        :stroke-dasharray="circ"
        :stroke-dashoffset="dashOffset"
        class="text-white"
        stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"
        :style="{ opacity: pending ? 0.4 : 1, transition: 'stroke-dashoffset .2s linear' }"
      />
    </svg>

    <!-- Status dot / spinner -->
    <span
      class="inline-block h-2.5 w-2.5 rounded-full"
      :class="pending ? 'bg-white/70 animate-pulse' : (isRecording ? 'bg-red-400 animate-ping' : 'bg-white/70')"
    ></span>

    <!-- Label -->
    <span class="pl-1">
      🔁
      <span v-if="pending"> Requesting…</span>
      <span v-else-if="isRecording"> Recording… {{ mm }}:{{ ss }}</span>
      <span v-else> Start Replay</span>
    </span>

    <!-- Size indicator -->
    <span v-if="isRecording && estSize"
          class="ml-2 text-[11px] opacity-80 bg-black/25 px-2 py-0.5 rounded-full">
      {{ estSize }}
    </span>

    <!-- Shortcut hint -->
    <span class="hidden sm:inline text-[11px] opacity-70 ml-2">(Double-tap to stop)</span>
  </button>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/** Props */
const props = defineProps({
  modelValue: { type: Boolean, default: false },     // v-model (recording on/off)
  mode: { type: String, default: 'screen' },         // 'screen' | 'camera'
  withAudio: { type: Boolean, default: true },
  mimeCandidates: {
    type: Array,
    default: () => [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4' // some browsers won't allow this; kept as last resort
    ]
  },
  maxMs: { type: Number, default: 5 * 60 * 1000 },   // auto-stop after 5min
  chunkMs: { type: Number, default: 10 * 1000 },     // emit data every 10s
  filenamePrefix: { type: String, default: 'replay' },
  haptics: { type: Boolean, default: true },
})

/** Emits */
const emit = defineEmits(['update:modelValue','start','stop','data','error','auto-stop'])

/** State */
const isRecording = ref(!!props.modelValue)
const pending = ref(false)
const startAt = ref(0)
const timer = ref(0)
const tickT = ref(null)
const mediaRecorder = ref(null)
const streamRef = ref(null)
const chunks = ref([])

/** v-model sync (external control) */
watch(() => props.modelValue, async (v) => {
  if (v && !isRecording.value) await start()
  if (!v && isRecording.value) await stop('external')
})

watch(isRecording, v => emit('update:modelValue', v))

/** Progress ring helpers */
const circ = 2 * Math.PI * 16
const dashOffset = computed(() => {
  const p = Math.min(1, timer.value / props.maxMs)
  return circ * (1 - p)
})

/** Time formatting */
const mm = computed(() => String(Math.floor(timer.value/60000)).padStart(2,'0'))
const ss = computed(() => String(Math.floor((timer.value%60000)/1000)).padStart(2,'0'))

/** Size estimate */
const estSize = computed(() => {
  if (!chunks.value.length) return ''
  const bytes = chunks.value.reduce((a, b) => a + (b?.size || 0), 0)
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(0)}KB`
  return `${(bytes/1024/1024).toFixed(1)}MB`
})

/** Input (tap/press) */
let pressT = null
function onTap(){ // single tap toggle
  if (pending.value) return
  isRecording.value ? stop('tap') : start()
}
function quickStop(){
  if (isRecording.value) stop('dbltap')
}
function onPointerDown(){
  // long-press safety (550ms)
  clearTimeout(pressT)
  pressT = setTimeout(() => { if (!isRecording.value && !pending.value) start() }, 550)
}
function onPointerUp(){ clearTimeout(pressT) }

/** Start recording */
async function start(){
  try {
    pending.value = true
    chunks.value = []
    const mimeType = pickMime()
    const recOpts = mimeType ? { mimeType } : {}

    // 1) Acquire stream
    const stream = await (props.mode === 'screen'
      ? navigator.mediaDevices.getDisplayMedia({ video: true, audio: props.withAudio })
      : navigator.mediaDevices.getUserMedia({ video: true, audio: props.withAudio })
    )
    streamRef.value = stream

    // 2) Setup MediaRecorder
    const mr = new MediaRecorder(stream, recOpts)
    mediaRecorder.value = mr
    mr.ondataavailable = (e) => {
      if (e?.data && e.data.size > 0) {
        chunks.value.push(e.data)
        emit('data', e.data)
      }
    }
    mr.onerror = (e) => emit('error', e?.error || e)

    // 3) Start
    mr.start(props.chunkMs)
    startAt.value = Date.now()
    timer.value = 0
    isRecording.value = true
    pending.value = false
    vibe(8)
    emit('start', { stream, mediaRecorder: mr, mimeType })

    // 4) Ticker
    clearInterval(tickT.value)
    tickT.value = setInterval(() => {
      timer.value = Date.now() - startAt.value
      if (timer.value >= props.maxMs) {
        stop('auto')
      }
    }, 250)

    // 5) Visibility auto-stop (optional safety)
    document.addEventListener('visibilitychange', onVis, { passive: true })
  } catch (err) {
    pending.value = false
    emit('error', err)
  }
}

/** Stop recording */
async function stop(reason='manual'){
  try {
    pending.value = true
    const mr = mediaRecorder.value
    if (mr && mr.state !== 'inactive') {
      const stopped = new Promise(resolve => { mr.onstop = resolve })
      mr.stop()
      await stopped
    }

    // Build blob
    const type = mr?.mimeType || pickMime() || 'video/webm'
    const blob = new Blob(chunks.value, { type })
    const url = URL.createObjectURL(blob)
    const filename = `${props.filenamePrefix}-${new Date().toISOString().replace(/[:.]/g,'-')}.webm`

    // Cleanup
    cleanup()

    // Emit
    emit('stop', { blob, url, filename, bytes: blob.size, durationMs: timer.value, reason })
    if (reason === 'auto') emit('auto-stop')
  } catch (err) {
    emit('error', err)
    cleanup()
  } finally {
    pending.value = false
    isRecording.value = false
    vibe(6)
  }
}

/** Helpers */
function pickMime(){
  try {
    for (const m of props.mimeCandidates) {
      if (MediaRecorder.isTypeSupported?.(m)) return m
    }
  } catch {}
  return null
}
function cleanup(){
  clearInterval(tickT.value)
  tickT.value = null
  document.removeEventListener('visibilitychange', onVis)
  try { streamRef.value?.getTracks()?.forEach(t => t.stop()) } catch {}
  mediaRecorder.value = null
  streamRef.value = null
  startAt.value = 0
  timer.value = 0
  chunks.value = []
}
function onVis(){
  if (document.visibilityState === 'hidden' && isRecording.value) stop('background')
}
function vibe(ms){ if (props.haptics) try { navigator.vibrate?.(ms) } catch {} }

/** Lifecycle */
onMounted(() => {
  if (props.modelValue && !isRecording.value) start()
  // Keyboard: Space/Enter toggles when focused
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  if (isRecording.value) stop('unmount')
})
function onKey(e){
  if (e.key === ' ' || e.key === 'Enter') {
    // prevent scrolling on space when focused
    if (document.activeElement?.tagName === 'BUTTON') {
      e.preventDefault()
      onTap()
    }
  }
}
</script>

<style scoped>
/* Nothing heavy—keep it mobile-first & crisp */
button { min-width: 180px; }
</style>
