<!-- GuestTopPane.vue -->
<template>
  <section
    v-if="guest && stream"
    class="fixed inset-x-0 top-[max(env(safe-area-inset-top),0px)] z-30 h-1/2"
    role="region"
    :aria-label="`Guest video for ${guest?.name || 'Guest'}`"
  >
    <!-- Wrapper -->
    <div
      class="relative h-full w-full overflow-hidden rounded-b-2xl bg-black/30 ring-1 ring-white/10"
      :style="dragStyle"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <!-- 🎥 Video -->
      <video
        ref="guestVideo"
        autoplay
        playsinline
        muted
        disablepictureinpicture
        class="h-full w-full object-cover rounded-b-2xl"
        :class="{
          'ring-2 ring-purple-500': isTalking,
          'transition-[filter] duration-200': true
        }"
      />

      <!-- gradient guard for legibility -->
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent"></div>

      <!-- LIVE + Viewers (optional) -->
      <div class="absolute top-2 left-2 flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600/90 text-white"
        >
          <span class="relative flex h-2 w-2">
            <span class="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-70"></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
          </span>
          LIVE
        </span>
        <span
          v-if="typeof viewers === 'number'"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-black/60 text-white ring-1 ring-white/15"
          aria-label="Current viewers"
        >👀 {{ viewersShort }}</span>
      </div>

      <!-- 🧾 Guest Info -->
      <div
        class="absolute top-2 right-2 bg-white/10 text-white text-[11px] px-2.5 py-1 rounded-full backdrop-blur-md flex items-center gap-2 ring-1 ring-white/15"
      >
        <img
          v-if="guest?.avatar"
          :src="guest.avatar"
          alt=""
          class="w-6 h-6 rounded-full object-cover ring-2 ring-indigo-500/50"
        />
        <div v-else class="w-6 h-6 rounded-full grid place-items-center bg-white/15 ring-2 ring-indigo-500/50">
          {{ initials }}
        </div>
        <span class="font-semibold truncate max-w-[38vw]">{{ displayName }}</span>
        <span class="text-pink-300">🎤 Guest</span>
        <span v-if="isTalking" class="text-emerald-300">🔊</span>
      </div>

      <!-- 🔊 Audio meter + Mic toggle (bottom-left) -->
      <div class="absolute bottom-3 left-3 flex items-center gap-2">
        <button
          class="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold text-white
                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/20
                 transition shadow"
          :class="muted ? 'bg-white/20' : 'bg-emerald-600 hover:bg-emerald-700'"
          :aria-pressed="(!muted).toString()"
          :aria-label="muted ? 'Unmute guest audio (local)' : 'Mute guest audio (local)'"
          @click="toggleMute"
        >
          <span v-if="muted">🔇</span><span v-else>🎙️</span>
          <span class="ml-1 font-semibold">{{ muted ? 'Muted' : 'Mic On' }}</span>
        </button>

        <!-- Level bars (pure CSS heights) -->
        <div class="flex items-end gap-[3px] h-5 w-8" aria-hidden="true">
          <span class="w-[4px] rounded bg-white/80" :style="{ height: h1 }"></span>
          <span class="w-[4px] rounded bg-white/80" :style="{ height: h2 }"></span>
          <span class="w-[4px] rounded bg-white/80" :style="{ height: h3 }"></span>
        </div>
      </div>

      <!-- ⚙️ Host Controls (bottom-right) -->
      <div v-if="isHost" class="absolute bottom-3 right-3 flex items-center gap-2">
        <button
          class="rounded-full px-3 py-1.5 text-xs font-semibold text-white bg-yellow-500 hover:bg-yellow-600
                 focus:outline-none focus:ring-2 focus:ring-yellow-300 shadow"
          @click="$emit('swap')"
          aria-label="Swap positions"
        >🔄 Swap</button>

        <button
          class="rounded-full px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700
                 focus:outline-none focus:ring-2 focus:ring-red-400 shadow"
          @click="$emit('kick')"
          aria-label="Remove guest"
        >🛑 Remove</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

/**
 * Props
 * - guest: { name, avatar? }
 * - stream: MediaStream
 * - isHost: Boolean
 * - viewers: Number (optional)
 */
const props = defineProps({
  guest: { type: Object, required: true },
  stream: { type: Object, required: true },
  isHost: { type: Boolean, default: false },
  viewers: { type: Number, default: null }
})

/* Emits: swap, kick */
defineEmits(['swap','kick'])

/* --------- Refs/State --------- */
const guestVideo = ref(null)
const muted = ref(false)
const isTalking = ref(false)

const audioCtx = ref(null)
const analyser = ref(null)
const srcNode = ref(null)
const rafId = ref(null)
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

/* --------- Assign stream to video --------- */
function attachStream(ms) {
  if (!guestVideo.value || !ms) return
  try { guestVideo.value.srcObject = ms } catch {}
}

/* --------- Voice detection (real) --------- */
function startAnalyser(ms) {
  stopAnalyser()
  const aTrack = ms?.getAudioTracks?.()[0]
  if (!aTrack) return

  audioCtx.value = new (window.AudioContext || window.webkitAudioContext)()
  srcNode.value = audioCtx.value.createMediaStreamSource(new MediaStream([aTrack]))
  analyser.value = audioCtx.value.createAnalyser()
  analyser.value.fftSize = 256
  srcNode.value.connect(analyser.value)

  const arr = new Uint8Array(analyser.value.frequencyBinCount)
  const loop = () => {
    analyser.value.getByteFrequencyData(arr)
    // Moving average-ish loudness
    const avg = arr.reduce((s, n) => s + n, 0) / arr.length
    const speaking = avg > 25
    isTalking.value = speaking

    // Heights for bars (0..1)
    const level = Math.max(0, Math.min(1, (avg - 10) / 70))
    h1.value = `${6 + level * 14}px`
    h2.value = `${4 + level * 18}px`
    h3.value = `${8 + level * 20}px`

    rafId.value = requestAnimationFrame(loop)
  }
  rafId.value = requestAnimationFrame(loop)
}

function stopAnalyser() {
  if (rafId.value) cancelAnimationFrame(rafId.value)
  rafId.value = null
  try { srcNode.value?.disconnect?.() } catch {}
  srcNode.value = null
  analyser.value = null
  if (audioCtx.value) {
    // Close to free resources on mobile
    audioCtx.value.close?.()
  }
  audioCtx.value = null
}

/* --------- Mic toggle (local only) --------- */
function toggleMute() {
  muted.value = !muted.value
  try { navigator?.vibrate?.(muted.value ? 18 : 12) } catch {}
  if (!guestVideo.value) return
  guestVideo.value.muted = muted.value
}

/* --------- Swipe down to minimize --------- */
const startY = ref(0)
const dy = ref(0)
const dragging = ref(false)
const dragStyle = computed(() => {
  if (!dragging.value) return {}
  const y = Math.max(0, dy.value)
  const op = Math.max(1 - y / 260, 0.5)
  return { transform: `translateY(${y}px)`, opacity: op }
})
function onTouchStart(e) {
  if (e.touches?.length !== 1) return
  dragging.value = true
  startY.value = e.touches[0].clientY
  dy.value = 0
}
function onTouchMove(e) {
  if (!dragging.value) return
  dy.value = e.touches[0].clientY - startY.value
}
function onTouchEnd() {
  if (!dragging.value) return
  dragging.value = false
  if (dy.value > 120) {
    // emit event to parent if you want to minimize/hide
    // For now, just vibrate and snap back
    try { navigator?.vibrate?.(10) } catch {}
  }
  dy.value = 0
}

/* --------- Computed helpers --------- */
const displayName = computed(() => props.guest?.name || 'Guest')
const initials = computed(() =>
  (displayName.value.split(/\s+/).map(s => s[0]).join('').slice(0,2) || 'G').toUpperCase()
)
const viewersShort = computed(() => {
  const v = Number(props.viewers ?? 0)
  if (v >= 1e6) return (v/1e6).toFixed(1).replace(/\.0$/,'')+'M'
  if (v >= 1e3) return (v/1e3).toFixed(1).replace(/\.0$/,'')+'K'
  return v.toString()
})

/* Level bars reactive heights */
const h1 = ref('8px'), h2 = ref('6px'), h3 = ref('10px')

/* --------- Lifecycle --------- */
onMounted(() => {
  attachStream(props.stream)
  // Start analyser only after user gesture on some browsers; if blocked, it will start on first interaction
  try { startAnalyser(props.stream) } catch {}
})

onBeforeUnmount(() => {
  stopAnalyser()
})

/* React to stream changes (hot replace) */
watch(() => props.stream, (ms) => {
  attachStream(ms)
  try { startAnalyser(ms) } catch {}
})
</script>

<style scoped>
/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .motion-safe\:animate-ping { animation: none !important; }
}
</style>
