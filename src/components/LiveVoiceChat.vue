<template>
  <!-- Floating container (safe-area aware) -->
  <div class="fixed z-50" :style="containerStyle">
    <!-- Main FAB -->
    <button
      ref="btn"
      :class="[
        'relative overflow-hidden select-none rounded-full shadow-xl border active:scale-[.98] transition',
        'flex items-center gap-2 pr-4',
        joined ? 'bg-gradient-to-b from-indigo-600 to-violet-700 border-white/20 text-white' :
                 'bg-gradient-to-b from-slate-800 to-slate-900 border-white/15 text-white'
      ]"
      :aria-pressed="joined"
      role="switch"
      @click="onTap"
      @pointerdown="onPressStart"
      @pointerup="onPressEnd"
      @pointercancel="onPressCancel"
    >
      <!-- Mic circle + meter -->
      <span class="relative grid place-items-center h-12 w-12 rounded-full bg-black/20 border border-white/20">
        <span class="absolute inset-0 rounded-full"
              :style="{ boxShadow: levelShadow }"></span>
        <span class="relative text-xl">{{ icon }}</span>
      </span>

      <!-- Label -->
      <span class="font-semibold text-sm whitespace-nowrap">
        {{
          state==='denied' ? t.denied :
          state==='error'  ? t.error :
          !joined ? t.join :
          muted ? t.unmute :
          t.mute
        }}
      </span>

      <!-- Unread / speaking dot -->
      <span v-if="joined && speaking"
            class="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping"></span>

      <!-- Ripples -->
      <span v-for="r in ripples" :key="r.id" class="ripple"
            :style="{ left:r.x+'px', top:r.y+'px' }" aria-hidden="true" />
    </button>

    <!-- Tiny controls row -->
    <div v-if="joined" class="mt-2 flex items-center gap-2">
      <button class="chip" @click="toggleMute" :title="muted ? t.unmute : t.mute">
        {{ muted ? '🔇' : '🔈' }}
      </button>
      <button class="chip" @click="openDevices = true" :title="t.device">
        ⚙
      </button>
      <button class="chip danger" @click="hangup" :title="t.end">
        ✖
      </button>
    </div>

    <!-- Device chooser sheet -->
    <transition name="fade">
      <div v-if="openDevices" class="fixed inset-0 z-[60] grid place-items-end p-3">
        <div class="w-full max-w-sm rounded-2xl bg-white/90 dark:bg-[#0b1020]/90 backdrop-blur-xl border border-black/10 dark:border-white/10 overflow-hidden">
          <div class="px-4 py-3 text-[13px] font-bold">{{ t.pickMic }}</div>
          <div class="px-3 pb-3 grid grid-cols-1 gap-2 max-h-[50svh] overflow-auto">
            <button v-for="d in devices" :key="d.deviceId"
                    class="dev"
                    :class="d.deviceId===selectedDeviceId ? 'dev-active' : ''"
                    @click="switchDevice(d.deviceId)">
              🎙️ {{ d.label || t.microphone }}
            </button>
          </div>
          <div class="px-3 pb-3">
            <button class="btn" @click="openDevices=false">{{ t.close }}</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Status hint -->
    <transition name="fade">
      <div v-if="hint" class="mt-2 text-[11px] text-white/90">
        {{ hint }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/** PROPS */
const props = defineProps({
  position: { type: String, default: 'bl' }, // bl | br | tl | tr
  mode: { type: String, default: 'toggle' }, // 'toggle' or 'ptt' (push-to-talk)
  aec: { type: Boolean, default: true },     // echoCancellation
  ns:  { type: Boolean, default: true },     // noiseSuppression
  agc: { type: Boolean, default: true },     // autoGainControl
})

/** EMITS */
const emit = defineEmits(['start','stop','stream','error','level'])

/** I18N (inline – simple) */
const t = {
  join: 'Join Voice Chat',
  mute: 'Mute Mic',
  unmute: 'Unmute Mic',
  end: 'Hang Up',
  device: 'Microphone',
  pickMic: 'Pick a Microphone',
  microphone: 'Microphone',
  close: 'Close',
  denied: 'Mic permission denied',
  error: 'Audio error',
  pttHold: 'Hold to talk (PTT)',
}

/** STATE */
const btn = ref(null)
const joined = ref(false)
const muted = ref(false)
const speaking = ref(false)
const hint = ref('')
const state = ref('idle') // idle|requesting|denied|live|error
const ripples = ref([])

const openDevices = ref(false)
const devices = ref([])
const selectedDeviceId = ref(localStorage.getItem('voice_mic_device') || 'default')

let stream = null
let ac = null, source = null, analyser = null, rafId = null

/** Safe-area positioning */
const containerStyle = computed(() => {
  const safeT = 'calc(env(safe-area-inset-top,0px) + 12px)'
  const safeB = 'calc(env(safe-area-inset-bottom,0px) + 12px)'
  const safeL = 'calc(env(safe-area-inset-left,0px) + 12px)'
  const safeR = 'calc(env(safe-area-inset-right,0px) + 12px)'
  const map = {
    tl: { top: safeT, left: safeL },
    tr: { top: safeT, right: safeR },
    bl: { bottom: safeB, left: safeL },
    br: { bottom: safeB, right: safeR },
  }
  return map[props.position] || map.bl
})

/** Icon & meter style */
const icon = computed(() => !joined.value ? '🎙️' : (muted.value ? '🔇' : '🎤'))
const level = ref(0) // 0..1
const levelShadow = computed(() => {
  const a = Math.min(1, level.value)
  const c = muted.value ? 'rgba(255,255,255,0.25)' : 'rgba(16,185,129,'
  return muted.value
    ? `inset 0 0 0 2px rgba(255,255,255,0.2)`
    : `0 0 0 ${6 + 12*a}px ${c}${0.25 + 0.35*a})`
})

/** Haptics helper */
function vib(ms=12){ try{ navigator.vibrate?.(ms) }catch{} }

/** Permissions hint (non-blocking) */
async function queryPerm(){
  try {
    const res = await navigator.permissions?.query?.({ name: 'microphone' })
    if (res && res.state === 'denied') {
      state.value = 'denied'
      hint.value = t.denied
    }
  } catch {}
}

/** Join voice */
async function join(){
  if (joined.value) return
  state.value = 'requesting'
  hint.value = props.mode === 'ptt' ? t.pttHold : ''
  const constraints = {
    audio: {
      deviceId: selectedDeviceId.value && selectedDeviceId.value !== 'default' ? { exact: selectedDeviceId.value } : undefined,
      echoCancellation: props.aec,
      noiseSuppression: props.ns,
      autoGainControl: props.agc,
      channelCount: 1,
      sampleRate: 48000,
      sampleSize: 16
    }
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints)
    // expose stream to parent (WebRTC/SFU)
    emit('stream', stream)

    await setupVAD(stream)
    joined.value = true
    muted.value = false
    state.value = 'live'
    vib(18)
    emit('start')

    // populate device list (labels often require active stream)
    await enumerateMics()
  } catch (e) {
    console.warn(e)
    state.value = (e?.name === 'NotAllowedError' || e?.name === 'NotFoundError') ? 'denied' : 'error'
    hint.value = state.value === 'denied' ? t.denied : t.error
    emit('error', e?.message || String(e))
  }
}

/** Hang up fully */
function hangup(){
  try { stream?.getTracks?.().forEach(tr => tr.stop()) } catch {}
  cleanupVAD()
  stream = null
  joined.value = false
  speaking.value = false
  state.value = 'idle'
  vib(8)
  emit('stop')
}

/** Mute/unmute (keep stream) */
function toggleMute(){
  if (!joined.value || !stream) return
  muted.value = !muted.value
  stream.getAudioTracks().forEach(t => t.enabled = !muted.value)
  vib(6)
}

/** Device switching */
async function enumerateMics(){
  try {
    const list = await navigator.mediaDevices.enumerateDevices()
    devices.value = list.filter(d => d.kind === 'audioinput')
  } catch {}
}
async function switchDevice(deviceId){
  selectedDeviceId.value = deviceId
  localStorage.setItem('voice_mic_device', deviceId)
  openDevices.value = false
  if (!joined.value) return
  // Restart with new device
  try { stream?.getTracks?.().forEach(tr => tr.stop()) } catch {}
  await join()
}

/** VAD + level meter (RMS + hysteresis) */
async function setupVAD(s){
  cleanupVAD()
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)()
    source = ac.createMediaStreamSource(s)
    analyser = ac.createAnalyser()
    analyser.fftSize = 1024
    source.connect(analyser)

    const data = new Float32Array(analyser.fftSize)
    let talk = false
    const onTh = 0.02 // attack
    const offTh = onTh * 0.6
    let smooth = 0

    const tick = () => {
      analyser.getFloatTimeDomainData(data)
      let sum = 0; for (let i=0;i<data.length;i++){ const v=data[i]; sum += v*v }
      const rms = Math.sqrt(sum / data.length)
      smooth = 0.82 * smooth + 0.18 * rms
      level.value = Math.min(1, smooth * 8)
      if (!talk && smooth > onTh) { talk = true; speaking.value = true }
      else if (talk && smooth < offTh) { talk = false; speaking.value = false }

      emit('level', level.value)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  } catch (e) {
    // ignore VAD errors; mic still works
    console.warn('VAD error', e)
  }
}
function cleanupVAD(){
  if (rafId) cancelAnimationFrame(rafId); rafId = null
  try { source?.disconnect?.() } catch {}
  try { analyser?.disconnect?.() } catch {}
  try { ac?.close?.() } catch {}
  source = analyser = ac = null
}

/** Interactions: toggle vs push-to-talk */
function onTap(e){
  // In PTT we don't toggle on tap; use long press
  if (props.mode === 'ptt') return
  addRipple(e)
  if (!joined.value) join()
  else toggleMute()
}
let pressTimer = null
function onPressStart(e){
  addRipple(e)
  if (props.mode !== 'ptt') return
  // PTT: join (if needed), unmute while pressed
  if (!joined.value) {
    join().then(() => { if (muted.value) toggleMute() })
  } else if (muted.value) {
    toggleMute()
  }
  // safety timer to keep pressed state at least 150ms
  pressTimer = setTimeout(() => {}, 150)
}
function onPressEnd(){
  if (pressTimer){ clearTimeout(pressTimer); pressTimer = null }
  if (props.mode !== 'ptt') return
  // PTT: re-mute when released (but keep joined)
  if (joined.value && !muted.value) toggleMute()
}
function onPressCancel(){
  if (pressTimer){ clearTimeout(pressTimer); pressTimer = null }
  if (props.mode === 'ptt' && joined.value && !muted.value) toggleMute()
}

/** Ripples */
let rippleId = 0
function addRipple(e){
  const el = btn.value; if (!el) return
  const rect = el.getBoundingClientRect()
  const x = (e?.clientX ?? rect.left + rect.width/2) - rect.left
  const y = (e?.clientY ?? rect.top + rect.height/2) - rect.top
  const id = ++rippleId
  ripples.value.push({ id, x, y })
  setTimeout(() => ripples.value = ripples.value.filter(r => r.id !== id), 520)
}

/** Lifecycle */
onMounted(() => { queryPerm(); enumerateMics(); })
onBeforeUnmount(() => { hangup() })
</script>

<style scoped>
/* Chips & buttons */
.chip {
  padding: 6px 10px; border-radius: 9999px; font-size: 12px; color: #fff;
  background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.22);
}
.chip.danger { background: rgba(239,68,68,.25); border-color: rgba(239,68,68,.45) }
.dev {
  padding: 10px 12px; border-radius: 12px; text-align: left; color: inherit;
  background: rgba(0,0,0,.05); border: 1px solid rgba(0,0,0,.12);
}
:global(.dark) .dev { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.14) }
.dev-active {
  background: rgba(99,102,241,.18); border-color: rgba(99,102,241,.45); color: #111827;
}
:global(.dark) .dev-active { color: #fff }

/* Ripple */
.ripple{
  position:absolute; pointer-events:none; height:10px; width:10px; border-radius:9999px;
  background: rgba(255,255,255,.6);
  transform: translate(-50%,-50%) scale(0);
  animation: ripple .5s ease-out forwards;
}
@keyframes ripple { to { transform: translate(-50%,-50%) scale(10); opacity: 0 } }

/* Fade */
.fade-enter-active,.fade-leave-active { transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to { opacity:0 }
</style>
