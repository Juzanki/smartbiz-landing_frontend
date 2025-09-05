<!-- 📁 src/components/PKBattleStagePro.vue -->
<template>
  <section
    class="relative min-h-[100svh] bg-black text-white flex flex-col md:flex-row items-stretch gap-2 p-2"
    :style="safeArea"
    aria-label="PK Battle Stage"
  >
    <!-- 🧮 Scoreboard + Countdown -->
    <div class="absolute top-2 left-1/2 -translate-x-1/2 z-40 w-[92vw] md:w-[520px]">
      <div class="rounded-full px-3 py-1.5 bg-white/10 backdrop-blur border border-white/15 shadow flex items-center justify-between text-xs md:text-sm">
        <div class="flex items-center gap-2">
          <span class="font-bold">🔥 PK</span>
          <span class="text-white/80">{{ timeLeft }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded-full bg-rose-500/80 font-bold">{{ leftScore }}</span>
          <span class="text-white/60">vs</span>
          <span class="px-2 py-0.5 rounded-full bg-indigo-500/80 font-bold">{{ rightScore }}</span>
        </div>
      </div>
      <div class="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div class="h-full bg-gradient-to-r from-rose-500 to-indigo-500" :style="{ width: progressPct + '%' }"></div>
      </div>
    </div>

    <!-- 🎥 Left Tile (Main Host) -->
    <div
      class="relative w-full md:w-1/2 flex-1 rounded-xl overflow-hidden border border-white/10 shadow-lg group"
      :class="tileClass(isSpeakingLeft)"
      @dblclick="like('left', $event)"
      @click="toggleControls('left')"
    >
      <video
        ref="leftRef"
        class="w-full h-full object-cover bg-black"
        autoplay
        playsinline
        muted
        @playing="onPlay('left')"
        @pause="onPause('left')"
      ></video>

      <!-- Overlay: top-left identity -->
      <div class="absolute top-2 left-2 flex items-center gap-2 bg-black/40 px-2.5 py-1 rounded-full border border-white/15 backdrop-blur">
        <img :src="left.avatar || '/user-avatar.png'" class="h-6 w-6 rounded-full ring-1 ring-white/30 object-cover" alt="" />
        <span class="text-xs font-bold truncate max-w-[30vw]">{{ left.name }}</span>
        <span class="text-[11px] text-pink-300">LIVE</span>
        <span class="ml-1 h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
      </div>

      <!-- Overlay: bottom-left stats -->
      <div class="absolute bottom-2 left-2 text-[12px] bg-black/45 px-2 py-1 rounded-full border border-white/10">
        👀 {{ left.viewers || '—' }}
      </div>

      <!-- Controls (show on tap/hover) -->
      <div
        v-show="showControlsLeft"
        class="absolute top-2 right-2 flex items-center gap-1"
      >
        <button class="ctl" @click.stop="toggleMute('left')" :aria-pressed="mutedLeft" :title="mutedLeft ? 'Unmute' : 'Mute'">
          {{ mutedLeft ? '🔇' : '🔊' }}
        </button>
        <button class="ctl" @click.stop="enterPip('left')" title="Picture-in-Picture">🪟</button>
        <button class="ctl" @click.stop="toggleFullscreen" title="Fullscreen">⛶</button>
        <button class="ctl" @click.stop="swapTiles" title="Swap">🔄</button>
      </div>

      <!-- Floating Likes -->
      <transition-group name="float" tag="div" class="pointer-events-none absolute inset-0">
        <div v-for="h in heartsLeft" :key="h.id" :style="h.style" class="absolute text-2xl select-none">💖</div>
      </transition-group>
    </div>

    <!-- 🎥 Right Tile (Co-Host) -->
    <div
      class="relative w-full md:w-1/2 flex-1 rounded-xl overflow-hidden border border-white/10 shadow-lg group"
      :class="tileClass(isSpeakingRight)"
      @dblclick="like('right', $event)"
      @click="toggleControls('right')"
    >
      <video
        ref="rightRef"
        class="w-full h-full object-cover bg-black"
        autoplay
        playsinline
        muted
        @playing="onPlay('right')"
        @pause="onPause('right')"
      ></video>

      <!-- Overlay: top-left identity -->
      <div class="absolute top-2 left-2 flex items-center gap-2 bg-black/40 px-2.5 py-1 rounded-full border border-white/15 backdrop-blur">
        <img :src="right.avatar || '/user-avatar.png'" class="h-6 w-6 rounded-full ring-1 ring-white/30 object-cover" alt="" />
        <span class="text-xs font-bold truncate max-w-[30vw]">{{ right.name }}</span>
        <span class="text-[11px] text-indigo-300">CO-HOST</span>
        <span class="ml-1 h-2 w-2 rounded-full" :class="isSpeakingRight ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'"></span>
      </div>

      <!-- Overlay: bottom-left stats -->
      <div class="absolute bottom-2 left-2 text-[12px] bg-black/45 px-2 py-1 rounded-full border border-white/10">
        👀 {{ right.viewers || '—' }}
      </div>

      <!-- Controls -->
      <div
        v-show="showControlsRight"
        class="absolute top-2 right-2 flex items-center gap-1"
      >
        <button class="ctl" @click.stop="toggleMute('right')" :aria-pressed="mutedRight" :title="mutedRight ? 'Unmute' : 'Mute'">
          {{ mutedRight ? '🔇' : '🔊' }}
        </button>
        <button class="ctl" @click.stop="enterPip('right')" title="Picture-in-Picture">🪟</button>
        <button class="ctl" @click.stop="toggleFullscreen" title="Fullscreen">⛶</button>
        <button class="ctl" @click.stop="swapTiles" title="Swap">🔄</button>
      </div>

      <!-- Floating Likes -->
      <transition-group name="float" tag="div" class="pointer-events-none absolute inset-0">
        <div v-for="h in heartsRight" :key="h.id" :style="h.style" class="absolute text-2xl select-none">💖</div>
      </transition-group>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'

/** PROPS */
const props = defineProps({
  mainHost: {
    type: Object,
    default: () => ({ name: 'Host A', viewers: '1.2K', stream: null, url: '', avatar: '' })
  },
  coHost: {
    type: Object,
    default: () => ({ name: 'Host B', viewers: '980', stream: null, url: '', avatar: '' })
  },
  pkSeconds: { type: Number, default: 120 }, // total countdown time
  leftScore: { type: [Number, String], default: 0 },
  rightScore: { type: [Number, String], default: 0 },
  autoplayMuted: { type: Boolean, default: true } // iOS requires muted autoplay
})

/** EMITS */
const emit = defineEmits(['timeout','swap','play','pause','error','like'])

/** SAFE AREA */
const safeArea = { paddingBottom: 'env(safe-area-inset-bottom, 0px)', paddingTop: 'env(safe-area-inset-top, 0px)' }

/** REFS */
const leftRef = ref(null)
const rightRef = ref(null)

/** STATE */
const left  = reactive({ ...props.mainHost })
const right = reactive({ ...props.coHost })

const mutedLeft  = ref(true)
const mutedRight = ref(true)
const isSpeakingLeft  = ref(false)
const isSpeakingRight = ref(false)
const showControlsLeft  = ref(false)
const showControlsRight = ref(false)

const heartsLeft  = ref([])
const heartsRight = ref([])

/** COUNTDOWN */
const remain = ref(props.pkSeconds)
let timer = null
const progressPct = computed(() => 100 * (props.pkSeconds - remain.value) / Math.max(1, props.pkSeconds))
const timeLeft = computed(() => {
  const s = Math.max(0, remain.value)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')} left`
})

/** Attach videos */
onMounted(() => {
  mutedLeft.value  = !!props.autoplayMuted
  mutedRight.value = !!props.autoplayMuted
  attachStream(leftRef.value, left)
  attachStream(rightRef.value, right)
  startCountdown()
  window.addEventListener('visibilitychange', handleVisibility)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  cleanupAnalyser('left')
  cleanupAnalyser('right')
  window.removeEventListener('visibilitychange', handleVisibility)
})

watch(() => props.mainHost, v => { Object.assign(left, v || {}) ; attachStream(leftRef.value, left) }, { deep: true })
watch(() => props.coHost,   v => { Object.assign(right, v || {}) ; attachStream(rightRef.value, right) }, { deep: true })

/** Video attach helper (MediaStream or URL with optional HLS) */
async function attachStream(videoEl, host) {
  if (!videoEl || !host) return
  try {
    // Prefer MediaStream
    if (host.stream instanceof MediaStream) {
      videoEl.srcObject = host.stream
      await videoEl.play().catch(()=>{})
      setupAnalyser(host === left ? 'left' : 'right', host.stream)
      return
    }
    // Else URL
    if (host.url) {
      const isM3u8 = /\.m3u8($|\?)/i.test(host.url)
      if (isM3u8 && videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = host.url
        await videoEl.play().catch(()=>{})
      } else if (isM3u8 && window.Hls) {
        const hls = new window.Hls()
        hls.loadSource(host.url)
        hls.attachMedia(videoEl)
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => videoEl.play().catch(()=>{}))
      } else {
        videoEl.src = host.url
        await videoEl.play().catch(()=>{})
      }
      // analyser needs MediaStream; skip if URL
    }
  } catch (e) {
    emit('error', e)
  }
}

/** Speaking detection via Web Audio */
const audioCtx = { left: null, right: null }
const analyser = { left: null, right: null }
let rafId = { left: 0, right: 0 }

function setupAnalyser(side, stream){
  cleanupAnalyser(side)
  try {
    audioCtx[side] = new (window.AudioContext || window.webkitAudioContext)()
    const src = audioCtx[side].createMediaStreamSource(stream)
    analyser[side] = audioCtx[side].createAnalyser()
    analyser[side].fftSize = 512
    src.connect(analyser[side])
    const data = new Uint8Array(analyser[side].frequencyBinCount)
    const loop = () => {
      analyser[side].getByteFrequencyData(data)
      const avg = data.reduce((a,b)=>a+b,0) / data.length
      if (side === 'left')  isSpeakingLeft.value  = avg > 12
      if (side === 'right') isSpeakingRight.value = avg > 12
      rafId[side] = requestAnimationFrame(loop)
    }
    loop()
  } catch { /* ignore */ }
}
function cleanupAnalyser(side){
  if (rafId[side]) cancelAnimationFrame(rafId[side])
  try { audioCtx[side]?.close?.() } catch {}
  audioCtx[side] = null
  analyser[side] = null
}

/** Controls */
function toggleMute(side){
  const el = side === 'left' ? leftRef.value : rightRef.value
  const state = side === 'left' ? mutedLeft : mutedRight
  state.value = !state.value
  if (el) el.muted = state.value
}
async function enterPip(side){
  const el = side === 'left' ? leftRef.value : rightRef.value
  if (!el) return
  try {
    if (document.pictureInPictureElement) await document.exitPictureInPicture()
    if (el.requestPictureInPicture) await el.requestPictureInPicture()
  } catch { /* ignored */ }
}
async function toggleFullscreen(){
  const root = document.fullscreenElement ? document : (document.documentElement || document.body)
  try {
    if (!document.fullscreenElement) await (document.documentElement.requestFullscreen?.() || document.body.requestFullscreen?.())
    else await document.exitFullscreen?.()
  } catch { /* ignore */ }
}
function toggleControls(side){
  if (side === 'left')  showControlsLeft.value  = !showControlsLeft.value
  if (side === 'right') showControlsRight.value = !showControlsRight.value
}
function swapTiles(){
  // Visual swap by swapping refs' parent order via CSS grid trick:
  // Simpler: swap left/right objects + reattach (emit for parent if needed)
  const a = { ...left }; Object.assign(left, right); Object.assign(right, a)
  attachStream(leftRef.value, left)
  attachStream(rightRef.value, right)
  emit('swap', { left, right })
}

/** Likes (double-tap hearts) */
function like(side, ev){
  const box = (side === 'left' ? leftRef.value : rightRef.value)?.getBoundingClientRect?.()
  const x = (ev.clientX ?? (box?.left||0) + (box?.width||0)/2) - (box?.left||0)
  const y = (ev.clientY ?? (box?.top||0)  + (box?.height||0)/2) - (box?.top||0)
  const id = Math.random().toString(36).slice(2,8)
  const style = `left:${x}px; top:${y}px; animation: float-up 1.2s ease-out forwards;`
  const list = side === 'left' ? heartsLeft : heartsRight
  list.value.push({ id, style })
  setTimeout(()=> list.value = list.value.filter(h=>h.id!==id), 1200)
  emit('like', { side })
  try { navigator.vibrate?.(10) } catch {}
}

/** Playback events */
function onPlay(side){ emit('play', side) }
function onPause(side){ emit('pause', side) }

/** Countdown */
function startCountdown(){
  clearInterval(timer)
  remain.value = props.pkSeconds
  timer = setInterval(() => {
    if (remain.value > 0) remain.value--
    else {
      clearInterval(timer)
      emit('timeout')
    }
  }, 1000)
}
function handleVisibility(){
  if (document.hidden) return
  // resume analyser loops if needed
  if (leftRef.value?.srcObject)  setupAnalyser('left',  leftRef.value.srcObject)
  if (rightRef.value?.srcObject) setupAnalyser('right', rightRef.value.srcObject)
}

/** UI helpers */
function tileClass(speaking){
  return speaking
    ? 'ring-2 ring-emerald-400'
    : 'ring-1 ring-white/10'
}
</script>

<style scoped>
/* Controls pill */
.ctl {
  @apply h-9 w-9 grid place-items-center rounded-full bg-black/50 border border-white/15 hover:bg-black/60 active:scale-[.98];
}

/* Floating hearts */
@keyframes float-up {
  0%   { transform: translateY(0) scale(0.9); opacity: 0.9; }
  60%  { transform: translateY(-40px) scale(1.15); opacity: 1; }
  100% { transform: translateY(-80px) scale(1); opacity: 0; }
}
.float-enter-active, .float-leave-active { transition: opacity .2s ease; }
.float-enter-from, .float-leave-to { opacity: 0; }

/* Group hover (desktop) shows controls; on mobile tunatumia tap toggle */
.group:hover .ctl { opacity: 1; }
</style>
