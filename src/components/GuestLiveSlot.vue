<template>
  <!-- Wrapper: mobile-first, edge-to-edge by default -->
  <div
    class="relative w-full overflow-hidden rounded-2xl bg-black/40"
    :style="{ height }"
    @click="onTap"
  >
    <!-- VIDEO -->
    <video
      ref="guestVideo"
      class="absolute inset-0 w-full h-full object-cover will-change-transform"
      playsinline
      autoplay
      :muted="autoplayMuted || localMuted"
      :class="[
        'transition-[filter,transform] duration-300',
        isSpeaking ? 'saturate-125 contrast-[1.05]' : ''
      ]"
    />

    <!-- Audio-reactive NEON frame -->
    <div
      class="pointer-events-none absolute inset-0 rounded-2xl"
      :class="isSpeaking ? 'animate-[pulseGlow_1.2s_ease-in-out_infinite]' : ''"
      :style="{
        boxShadow: isSpeaking
          ? '0 0 0.6rem rgba(137, 99, 235, .55), 0 0 2rem rgba(99,102,241,.35)'
          : '0 0 0 rgba(0,0,0,0)'
      }"
    />
    <!-- Dynamic border using conic-gradient -->
    <div
      class="pointer-events-none absolute -inset-[2px] rounded-[18px]"
      :style="{
        background: `conic-gradient(from ${conicFrom}deg,
          rgba(99,102,241,.0) 0%,
          rgba(236,72,153,.25) 20%,
          rgba(99,102,241,.45) 40%,
          rgba(14,165,233,.35) 60%,
          rgba(99,102,241,.0) 100%)`,
        filter: isSpeaking ? 'blur(6px)' : 'blur(10px)',
        opacity: isSpeaking ? 0.9 : 0.35,
        mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        padding: '2px',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude'
      }"
    />

    <!-- TOP-LEFT: Identity/role -->
    <div
      class="absolute top-2 left-2 bg-white/10 text-white text-xs px-2.5 py-1 rounded-full
             backdrop-blur-md flex items-center gap-2 shadow"
    >
      <img :src="guest.avatar" @error="onAvatarError" class="w-6 h-6 rounded-full border border-white/50 object-cover" />
      <span class="font-medium max-w-[38vw] truncate">{{ guest.name }}</span>
      <span class="text-pink-400 text-[10px]">🎤 Guest</span>
    </div>

    <!-- TOP-RIGHT: Live stats + mic state -->
    <div class="absolute top-2 right-2 flex items-center gap-2">
      <div
        class="rounded-full px-2 py-1 text-[10px] font-semibold text-white/90 bg-black/35 backdrop-blur"
        :class="fpsClass"
        :title="`~${fps.toFixed(0)} FPS`"
      >
        {{ fps.toFixed(0) }} fps
      </div>
      <div
        class="h-6 w-6 grid place-items-center rounded-full"
        :class="isSpeaking ? 'bg-green-500/80' : 'bg-white/20'"
      >
        <span class="text-[12px]">🔊</span>
      </div>
    </div>

    <!-- BOTTOM-LEFT: “Tap for audio” helper (mobile autoplay) -->
    <button
      v-if="autoplayMuted"
      class="absolute bottom-2 left-2 text-[11px] font-semibold text-indigo-900
             bg-white rounded-full px-2.5 py-1 shadow active:bg-white/90"
      @click.stop="unmuteAutoplay"
    >
      🔈 Tap for audio
    </button>

    <!-- BOTTOM-CENTER: Reaction bubble tap area (double-tap => spotlight) -->
    <div class="pointer-events-none absolute inset-0">
      <transition-group name="float" tag="div">
        <div
          v-for="b in bubbles"
          :key="b.id"
          class="absolute text-2xl select-none"
          :style="{ left: b.x+'px', top: b.y+'px', opacity: b.opacity, transform: `scale(${b.scale})` }"
        >
          {{ b.emoji }}
        </div>
      </transition-group>
    </div>

    <!-- BOTTOM-RIGHT: Host action tray -->
    <div
      v-if="isHost && showActions"
      class="absolute bottom-2 right-2 flex items-center gap-2"
    >
      <button class="pill" title="Swap places" @click.stop="$emit('swap')">🔄</button>
      <button class="pill danger" title="Remove guest" @click.stop="$emit('kick')">🛑</button>

      <button class="pill" :title="localMuted ? 'Unmute locally' : 'Mute locally'" @click.stop="toggleLocalMute">
        {{ localMuted ? '🔇' : '🔈' }}
      </button>

      <button class="pill" :title="hardMuted ? 'Unmute guest (send audio)' : 'Hard mute guest (stop sending)'" @click.stop="toggleHardMute">
        {{ hardMuted ? '🚫🎤' : '🎤' }}
      </button>

      <button class="pill" title="Spotlight" @click.stop="toggleSpotlight">🌟</button>
      <button class="pill" title="Picture-in-Picture" @click.stop="enterPiP">🧊</button>
      <button class="pill" title="Snapshot" @click.stop="snapshot">📸</button>
    </div>

    <!-- SPOTLIGHT banner -->
    <div
      v-if="spotlight"
      class="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px]
             font-semibold bg-amber-400/90 text-amber-900 shadow backdrop-blur"
    >
      Spotlighted
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'

/**
 * PROPS
 */
const props = defineProps({
  guest: { type: Object, required: true },           // { name, avatar }
  stream: { type: MediaStream, default: null },
  isHost: { type: Boolean, default: false },
  showActions: { type: Boolean, default: true },
  height: { type: String, default: '50vh' },         // e.g., '50vh', '56dvh', '320px'
})

/**
 * EMITS
 */
const emit = defineEmits([
  'swap', 'kick', 'spotlight', 'react', 'snapshot', 'pip',
  'mute-local-changed', 'mute-hard-changed'
])

/**
 * STATE
 */
const guestVideo = ref(null)
const autoplayMuted = ref(true)       // mobile autoplay helper
const localMuted = ref(false)         // local playback mute
const hardMuted = ref(false)          // toggle sending audio (track.enabled)
const isSpeaking = ref(false)
const spotlight = ref(false)
const conicFrom = ref(0)              // rotating border
let conicTimer = null

// Audio analysis
let audioContext = null
let analyser = null
let dataArray = null
let rafId = null
let speechSmooth = 0

// FPS meter (requestVideoFrameCallback if available)
const fps = ref(0)
let lastFrameT = 0
let frameCount = 0
let fpsTimer = null

// Reactions bubbles
const bubbles = ref([])
let bubbleId = 0

/**
 * HELPERS
 */
function onAvatarError(e){
  e.target.src =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="100%" height="100%" rx="16" fill="%231e293b"/><text x="50%" y="54%" font-size="28" text-anchor="middle" fill="white" font-family="Arial">👤</text></svg>'
}

function vibrate(ms=12){ try { navigator.vibrate?.(ms) } catch(_){} }

/**
 * VIDEO INIT
 */
onMounted(() => {
  if (guestVideo.value && props.stream) {
    guestVideo.value.srcObject = props.stream
    // Safari/iOS often needs a play() after a gesture; we start muted then unmute on tap
    guestVideo.value.play?.().catch(() => {})
  }

  // Audio analyser
  try {
    if (props.stream) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioContext.createMediaStreamSource(props.stream)
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      dataArray = new Uint8Array(analyser.frequencyBinCount)
      detectSpeech()
    }
  } catch (_) {}

  // Fancy border spinner
  conicTimer = setInterval(() => { conicFrom.value = (conicFrom.value + 2) % 360 }, 40)

  // FPS meter
  if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
    const onFrame = (now, metadata) => {
      frameCount++
      if (!lastFrameT) lastFrameT = now
      const dt = now - lastFrameT
      if (dt >= 500) { // 0.5s window
        fps.value = (frameCount / dt) * 1000
        frameCount = 0
        lastFrameT = now
      }
      guestVideo.value?.requestVideoFrameCallback?.(onFrame)
    }
    guestVideo.value?.requestVideoFrameCallback?.(onFrame)
  } else {
    fpsTimer = setInterval(() => {
      // fallback (approx): pretend 24 if playing, 0 otherwise
      fps.value = guestVideo.value && !guestVideo.value.paused ? 24 : 0
    }, 500)
  }
})

onBeforeUnmount(() => {
  clearInterval(conicTimer)
  if (fpsTimer) clearInterval(fpsTimer)
  if (rafId) cancelAnimationFrame(rafId)
  try { audioContext?.close?.() } catch(_) {}
})

/**
 * SPEECH DETECTION with smoothing + adaptive threshold
 */
function detectSpeech(){
  analyser.getByteFrequencyData(dataArray)
  const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
  // exponential moving average for stability
  speechSmooth = speechSmooth * 0.85 + avg * 0.15
  // adaptive threshold baseline
  const baseline = 12
  isSpeaking.value = speechSmooth > baseline
  rafId = requestAnimationFrame(detectSpeech)
}

/**
 * GESTURES & ACTIONS
 */
let lastTap = 0
function onTap(e){
  // single tap => drop a reaction bubble
  spawnBubble(e)
  vibrate(5)

  // double-tap => spotlight toggle
  const now = Date.now()
  if (now - lastTap < 300) {
    toggleSpotlight()
    vibrate(20)
  }
  lastTap = now
}

function spawnBubble(e){
  const el = e.currentTarget.getBoundingClientRect()
  const x = e.clientX - el.left
  const y = e.clientY - el.top
  const id = ++bubbleId
  const emoji = pickEmoji()
  const b = { id, x, y, scale: 0.8, opacity: 1, emoji }
  bubbles.value.push(b)
  emit('react', { emoji, guest: props.guest })

  // animate up then remove
  const start = performance.now()
  const dur = 1200
  const step = (t) => {
    const k = Math.min(1, (t - start) / dur)
    b.y = y - 60 * k
    b.opacity = 1 - k
    b.scale = 0.8 + 0.5 * k
    if (k < 1) requestAnimationFrame(step)
    else bubbles.value = bubbles.value.filter(x => x.id !== id)
  }
  requestAnimationFrame(step)
}

function pickEmoji(){
  const set = ['❤️','🔥','👏','🌟','💎','✨']
  return set[Math.floor(Math.random() * set.length)]
}

function unmuteAutoplay(){
  autoplayMuted.value = false
  guestVideo.value?.play?.().catch(()=>{})
}

function toggleLocalMute(){
  localMuted.value = !localMuted.value
  emit('mute-local-changed', { muted: localMuted.value, guest: props.guest })
}

function toggleHardMute(){
  try {
    const tracks = props.stream?.getAudioTracks?.() || []
    hardMuted.value = !hardMuted.value
    tracks.forEach(t => (t.enabled = !hardMuted.value))
    emit('mute-hard-changed', { muted: hardMuted.value, guest: props.guest })
  } catch(_) {}
}

function toggleSpotlight(){
  spotlight.value = !spotlight.value
  emit('spotlight', { spotlight: spotlight.value, guest: props.guest })
}

async function enterPiP(){
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture()
    } else {
      await guestVideo.value?.requestPictureInPicture?.()
      emit('pip', { guest: props.guest, active: true })
    }
  } catch (_) {}
}

async function snapshot(){
  try {
    const v = guestVideo.value
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth || 1280
    canvas.height = v.videoHeight || 720
    const ctx = canvas.getContext('2d')
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/jpeg', 0.9)
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    a.download = `${props.guest.name || 'guest'}-${ts}.jpg`
    a.click()
    emit('snapshot', { guest: props.guest })
    vibrate(15)
  } catch(_) {}
}

/**
 * DERIVED
 */
const fpsClass = computed(() => {
  if (fps.value >= 24) return 'ring-1 ring-white/20'
  if (fps.value >= 12) return 'bg-yellow-500/30 ring-1 ring-yellow-300/30'
  return 'bg-red-500/30 ring-1 ring-red-300/30'
})
</script>

<style scoped>
/* Mobile-first pills */
.pill {
  @apply h-9 w-9 grid place-items-center rounded-full bg-white/15 text-white
         backdrop-blur border border-white/20 active:bg-white/25;
}
.pill.danger { @apply bg-red-500/80 border-red-400/40; }

/* Floating bubble */
.float-enter-active, .float-leave-active { transition: all .3s ease; }
.float-enter-from, .float-leave-to { opacity: 0; transform: translateY(6px); }

/* Lux neon breathing */
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0.25rem rgba(137,99,235,.25), 0 0 1rem rgba(99,102,241,.2) }
  50% { box-shadow: 0 0 0.7rem rgba(137,99,235,.6), 0 0 2.1rem rgba(99,102,241,.45) }
}
</style>
