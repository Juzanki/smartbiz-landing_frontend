<!-- RecordingIndicator.vue -->
<template>
  <!-- Hide whole HUD if not active -->
  <div
    v-if="activeLocal"
    class="fixed z-50"
    :class="anchorClass"
    :style="anchorStyle"
    role="status"
    aria-live="polite"
  >
    <!-- Pill -->
    <div
      class="flex items-center gap-2 px-3 h-9 rounded-full shadow-xl border border-white/15
             text-white text-[12px] font-semibold
             bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 backdrop-blur
             active:scale-[0.98] transition"
    >
      <!-- Pulse dot -->
      <span class="rec-dot" aria-hidden="true"></span>

      <!-- Text -->
      <span class="truncate">
        <span v-if="!pausedLocal">REC</span>
        <span v-else>PAUSED</span>
        • {{ elapsedLabel }}
      </span>

      <!-- Tiny mic level -->
      <div class="ml-1 flex items-end gap-[2px] h-3 w-5" aria-hidden="true">
        <i
          v-for="i in 4"
          :key="i"
          class="block w-[3px] rounded-[2px] bg-white/80"
          :style="barStyle(i)"
        />
      </div>

      <!-- Controls -->
      <div class="ml-1 flex items-center gap-1">
        <button
          class="ctrl-btn"
          @click="togglePause"
          :aria-pressed="pausedLocal ? 'true' : 'false'"
          :title="pausedLocal ? 'Resume' : 'Pause'"
        >
          <span v-if="pausedLocal">▶</span>
          <span v-else>⏸</span>
        </button>

        <!-- Hold to stop -->
        <button
          class="ctrl-btn relative overflow-hidden"
          :title="'Hold to stop'"
          @pointerdown="startHold"
          @pointerup="cancelHold(true)"
          @pointerleave="cancelHold(false)"
          aria-label="Hold to stop"
        >
          ⏹
          <span
            class="absolute inset-0 pointer-events-none rounded-[8px]"
            :style="holdRing"
          />
        </button>
      </div>
    </div>

    <!-- Secondary row (optional info) -->
    <div class="mt-1 pl-1 text-[10px] text-white/80 flex items-center gap-2">
      <span v-if="syncing">☁️ syncing…</span>
      <span class="opacity-70">~{{ estLeftText }}</span>
    </div>
  </div>
</template>

<script setup>
/**
 * Mobile-first Recording Indicator (drop-in)
 * - Safe-area aware (iOS notch), sticky top-left/right or bottom
 * - Pulse REC pill, elapsed timer, tiny level bars
 * - Pause/Resume button, HOLD-to-STOP with progress ring
 * - Emits: start, pause, resume, stop
 * - Props allow external control, but internal timer can run stand-alone
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  /** initial active state (can be controlled) */
  active: { type: Boolean, default: true },
  /** initial paused state */
  paused: { type: Boolean, default: false },
  /** choose "top-left" | "top-right" | "bottom-left" | "bottom-right" */
  position: { type: String, default: 'top-left' },
  /** milliseconds elapsed (if you drive it). If omitted, component runs its own timer. */
  elapsedMs: { type: Number, default: 0 },
  /** mic level 0..1 (optional external). If not provided, bars animate softly. */
  level: { type: Number, default: -1 },
  /** rough remaining time string driver (optional) */
  estimatedLeft: { type: String, default: '' },
  /** show cloud syncing note */
  syncing: { type: Boolean, default: false }
})

const emit = defineEmits(['start', 'pause', 'resume', 'stop'])

/* Local state (supports controlled or uncontrolled) */
const activeLocal  = ref(!!props.active)
const pausedLocal  = ref(!!props.paused)
const elapsedLocal = ref(props.elapsedMs)
let tickId

watch(() => props.active, v => activeLocal.value = v)
watch(() => props.paused, v => pausedLocal.value = v)
watch(() => props.elapsedMs, v => { if (v) elapsedLocal.value = v })

/* Timer */
function startTimer(){
  clearInterval(tickId)
  tickId = setInterval(()=>{
    if (!pausedLocal.value) elapsedLocal.value += 250
  }, 250)
}
function stopTimer(){ clearInterval(tickId) }

onMounted(() => {
  if (activeLocal.value && !props.elapsedMs) startTimer()
})
onBeforeUnmount(() => stopTimer())

/* Labels */
const elapsedLabel = computed(() => {
  const s = Math.floor((props.elapsedMs || elapsedLocal.value)/1000)
  const m = Math.floor(s/60).toString().padStart(2,'0')
  const ss = (s%60).toString().padStart(2,'0')
  return `${m}:${ss}`
})
const estLeftText = computed(() => props.estimatedLeft || 'safe buffer')

/* Mic bars */
function barStyle(i){
  const base = { height: `${6 + i*3}px`, opacity: .9 }
  const lvl = props.level
  if (lvl >= 0){
    const on = lvl >= i/4
    return { ...base, opacity: on ? .95 : .35 }
  }
  // fallback idle animation
  const delay = i * 90
  return {
    ...base,
    animation: `barPulse 1.2s ${delay}ms infinite ease-in-out`
  }
}

/* Controls */
function togglePause(){
  pausedLocal.value = !pausedLocal.value
  if (pausedLocal.value){ emit('pause') }
  else { emit('resume') }
  try{ navigator.vibrate?.(6) }catch{}
}

/* Hold-to-stop */
const holdMS = 900
const holdPct = ref(0)
let holdRAF, holdStart = 0
const holdRing = computed(() => ({
  background: `conic-gradient(#fff ${holdPct.value*360}deg, transparent 0)`,
  mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
  WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
  padding: '1px',
  opacity: holdPct.value ? 0.35 : 0
}))
function startHold(e){
  e.preventDefault()
  holdStart = performance.now()
  stepHold(holdStart)
}
function stepHold(ts){
  const d = ts - holdStart
  holdPct.value = Math.min(1, d/holdMS)
  if (holdPct.value >= 1){
    cancelHold(true)()
    doStop()
  } else {
    holdRAF = requestAnimationFrame(stepHold)
  }
}
function cancelHold(vibrateOnCancel){
  return ()=> {
    if (holdRAF) cancelAnimationFrame(holdRAF)
    holdRAF = null
    holdPct.value = 0
    if (vibrateOnCancel) try{ navigator.vibrate?.(4) }catch{}
  }
}
function doStop(){
  activeLocal.value = false
  stopTimer()
  emit('stop')
  try{ navigator.vibrate?.(12) }catch{}
}

/* Anchoring + safe areas */
const anchorClass = computed(() => {
  const map = {
    'top-left': 'left-3',
    'top-right': 'right-3',
    'bottom-left': 'left-3',
    'bottom-right': 'right-3'
  }
  return map[props.position] || 'left-3'
})
const anchorStyle = computed(() => {
  const top = props.position.startsWith('top')
  return top
    ? { top: `max(12px, env(safe-area-inset-top))` }
    : { bottom: `max(12px, env(safe-area-inset-bottom))` }
})
</script>

<style scoped>
/* Pulse dot */
@keyframes pulse { 0%,100%{ transform:scale(1); opacity:1 } 50%{ transform:scale(.8); opacity:.6 } }
.rec-dot{
  width: 10px; height: 10px; border-radius: 999px; background: #fff;
  box-shadow: 0 0 0 4px rgba(255,255,255,.2);
  animation: pulse 1.2s infinite;
}

/* Idle bar animation */
@keyframes barPulse {
  0%, 100% { transform: scaleY(0.6); opacity: .45 }
  50%      { transform: scaleY(1);   opacity: .95 }
}

/* Control buttons */
.ctrl-btn{
  backdrop-filter: blur(6px);
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.18);
  color: #fff;
  font-size: 12px;
  height: 26px; min-width: 26px;
  padding: 0 6px;
  border-radius: 8px;
  display: grid; place-items: center;
  transition: transform .1s ease, background .2s ease;
}
.ctrl-btn:active{ transform: scale(0.96) }

/* iOS tap highlight */
:host, button { -webkit-tap-highlight-color: transparent; }
</style>
