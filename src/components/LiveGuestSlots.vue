<template>
  <section
    v-if="guest && stream"
    class="absolute top-0 inset-x-0 z-30 bg-black/30 rounded-b-2xl overflow-hidden"
    :class="heightClass"
    ref="rootEl"
    role="region"
    aria-label="Guest video"
  >
    <!-- Video -->
    <video
      ref="guestVideo"
      autoplay
      playsinline
      :muted="muted"
      :class="[
        'w-full h-full object-cover transition-all duration-300 border-4',
        isTalking ? 'border-purple-500 animate-pulse' : 'border-transparent',
        mirrored ? 'scale-x-[-1]' : ''
      ]"
    ></video>

    <!-- Connecting skeleton -->
    <div
      v-if="connecting"
      class="absolute inset-0 grid place-items-center bg-black/30 backdrop-blur-sm text-white text-xs"
    >
      <div class="px-3 py-1.5 rounded-full bg-white/10 border border-white/15 shadow">
        Connecting…
      </div>
    </div>

    <!-- Overlay: Guest info -->
    <div
      class="absolute top-2 left-2 bg-white/10 text-white text-[11px] px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-2 shadow"
    >
      <img :src="guest.avatar" class="w-6 h-6 rounded-full border border-white object-cover" alt="" />
      <span class="font-semibold truncate max-w-[36vw] sm:max-w-[20vw]">{{ guest.name }}</span>
      <span class="text-pink-300 text-[10px]">🎤 Guest</span>

      <!-- VAD status -->
      <span v-if="isTalking" class="text-green-400 text-sm animate-ping ml-1" aria-hidden="true">🔊</span>
    </div>

    <!-- Level meter -->
    <div class="absolute left-2 bottom-2 flex items-end gap-0.5 h-4">
      <span
        v-for="i in 6"
        :key="i"
        class="w-1.5 rounded-t-[3px]"
        :style="barStyle(i)"
        aria-hidden="true"
      />
    </div>

    <!-- Host controls -->
    <div
      v-if="isHost"
      class="absolute bottom-3 right-3 flex gap-2"
      role="group"
      aria-label="Guest controls"
    >
      <button
        @click="$emit('swap')"
        class="ctrl-btn"
        title="Swap"
        aria-label="Swap guest positions"
      >🔄</button>

      <button
        @click="toggleMute"
        class="ctrl-btn"
        :title="muted ? 'Unmute locally' : 'Mute locally'"
        :aria-label="muted ? 'Unmute locally' : 'Mute locally'"
      >{{ muted ? '🔇' : '🔈' }}</button>

      <button
        @click="enterPip"
        class="ctrl-btn"
        title="Picture-in-Picture"
        aria-label="Enter Picture in Picture"
      >🗔</button>

      <button
        @click="enterFullscreen"
        class="ctrl-btn"
        title="Fullscreen"
        aria-label="Fullscreen guest"
      >⛶</button>

      <!-- Kick: long-press to confirm -->
      <button
        class="ctrl-btn bg-red-600 hover:bg-red-700"
        @pointerdown="startKickPress"
        @pointerup="cancelKickPress(true)"
        @pointercancel="cancelKickPress(false)"
        title="Hold to remove"
        aria-label="Hold to remove guest"
      >🛑</button>
    </div>

    <!-- Kick confirm pill -->
    <transition name="fade">
      <div
        v-if="confirmKick"
        class="absolute bottom-14 right-3 bg-red-600 text-white text-xs px-3 py-1 rounded-full shadow"
      >
        Release to remove
      </div>
    </transition>
  </section>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

/** PROPS */
const props = defineProps({
  guest:  { type: Object, required: true },
  stream: { type: MediaStream, required: true },
  isHost: { type: Boolean, default: false },
  mirrored: { type: Boolean, default: false },   // flip horizontally (selfie feel)
  autoHeightMobile: { type: Boolean, default: true }, // use small viewport height unit
  vadSensitivity: { type: Number, default: 1.0 }, // 0.5 (less sensitive) .. 2.0 (more)
})

/** EMITS */
const emit = defineEmits(['swap','kick','error'])

/** STATE */
const guestVideo = ref(null)
const rootEl = ref(null)
const connecting = ref(true)
const muted = ref(true)              // local mute for echo safety
const isTalking = ref(false)
const level = ref(0)                 // 0..1 (smoothed)
let ac = null, source = null, analyser = null
let rafId = null
let io = null

/** Height class (mobile-first) */
const heightClass = computed(() =>
  props.autoHeightMobile ? 'h-[48svh] sm:h-1/2' : 'h-1/2'
)

/** Assign stream */
function attachStream(){
  try {
    if (guestVideo.value && props.stream) {
      guestVideo.value.srcObject = props.stream
      // set muted state on element
      guestVideo.value.muted = muted.value
      // show once playable
      const onReady = () => { connecting.value = false }
      guestVideo.value.onloadedmetadata = onReady
      guestVideo.value.oncanplay = onReady
    }
  } catch (e) {
    emit('error', e?.message || 'Failed to attach stream')
  }
}

/** VAD (RMS + hysteresis) */
function startVAD(){
  stopVAD()
  try {
    const audioTrack = props.stream?.getAudioTracks?.()[0]
    if (!audioTrack) return
    ac = new (window.AudioContext || window.webkitAudioContext)()
    const streamForAudio = new MediaStream([audioTrack])
    source = ac.createMediaStreamSource(streamForAudio)
    analyser = ac.createAnalyser()
    analyser.fftSize = 1024
    source.connect(analyser)

    const data = new Float32Array(analyser.fftSize)
    let talk = false
    const onTh  = 0.02 / Math.max(0.2, props.vadSensitivity)      // attack threshold (RMS)
    const offTh = onTh * 0.6                                       // release threshold
    let smooth = 0

    const tick = () => {
      analyser.getFloatTimeDomainData(data)
      // RMS
      let sum = 0
      for (let i=0; i<data.length; i++) { const v = data[i]; sum += v*v }
      const rms = Math.sqrt(sum / data.length)
      // smooth
      smooth = 0.82 * smooth + 0.18 * rms
      level.value = Math.min(1, smooth * 8) // scale to visible range

      if (!talk && smooth > onTh) { talk = true; isTalking.value = true }
      else if (talk && smooth < offTh) { talk = false; isTalking.value = false }

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  } catch (e) {
    // Silent degradation
  }
}
function stopVAD(){
  if (rafId) cancelAnimationFrame(rafId); rafId = null
  try { source?.disconnect?.() } catch {}
  try { analyser?.disconnect?.() } catch {}
  try { ac?.close?.() } catch {}
  ac = source = analyser = null
}

/** Meter bar style */
function barStyle(i){
  // map level (0..1) to N bars
  const n = 6, active = Math.round(level.value * n)
  const on = i <= active
  const h = 4 + i * 3
  const bg = on ? `linear-gradient(180deg, rgba(168,85,247,.9), rgba(99,102,241,.9))` : 'rgba(255,255,255,.25)'
  return {
    height: `${h}px`,
    width: '6px',
    background: bg,
    border: '1px solid rgba(255,255,255,.25)',
    opacity: on ? 1 : .5,
    transition: 'height .12s ease, opacity .12s ease, background .12s ease'
  }
}

/** Controls */
function toggleMute(){
  muted.value = !muted.value
  if (guestVideo.value) guestVideo.value.muted = muted.value
}
async function enterPip(){
  try {
    if ('requestPictureInPicture' in guestVideo.value) {
      await guestVideo.value.requestPictureInPicture()
    }
  } catch {}
}
async function enterFullscreen(){
  try { await rootEl.value?.requestFullscreen?.() } catch {}
}

/** Kick (long press) */
let kickTimer = null
const confirmKick = ref(false)
function startKickPress(){
  confirmKick.value = true
  kickTimer = setTimeout(() => {
    confirmKick.value = false
    emit('kick')
  }, 700) // hold 700ms
}
function cancelKickPress(commit){
  return () => {
    if (kickTimer) { clearTimeout(kickTimer); kickTimer = null }
    // if released before timer and we showed hint, hide it
    if (!commit) confirmKick.value = false
  }
}

/** Visibility / Intersection: pause VAD to save battery */
function onVis(){ document.hidden ? stopVAD() : (startVAD()) }
function setupObserver(){
  if (!('IntersectionObserver' in window)) return
  io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) startVAD()
    else stopVAD()
  }, { threshold: 0.1 })
  rootEl.value && io.observe(rootEl.value)
}

/** Lifecycle */
onMounted(() => {
  attachStream()
  setupObserver()
  document.addEventListener('visibilitychange', onVis)
})
onBeforeUnmount(() => {
  stopVAD()
  io?.disconnect?.()
  document.removeEventListener('visibilitychange', onVis)
})

/** React to stream change */
watch(() => props.stream, () => {
  attachStream()
  startVAD()
}, { immediate: true })
</script>

<style scoped>
/* Buttons */
.ctrl-btn {
  @apply h-9 w-9 grid place-items-center rounded-full bg-white/15 text-white border border-white/25;
}
.ctrl-btn:active { transform: translateY(1px); }

/* Animations (respect reduced motion) */
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
</style>
