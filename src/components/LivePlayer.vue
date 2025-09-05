<template>
  <div class="relative w-full h-full bg-black text-white select-none" :style="safeArea" @click="onTap">
    <!-- VIDEO -->
    <video
      ref="videoRef"
      class="w-full h-full object-cover"
      :autoplay="autoplay"
      :muted="muted"
      :playsinline="true"
      x-webkit-airplay="allow"
      :controls="showNativeControls"
      preload="metadata"
    ></video>

    <!-- OVERLAYS -->
    <!-- Top bar -->
    <div class="pointer-events-none absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/50 to-transparent">
      <div class="flex items-center gap-2">
        <span class="live-dot"></span>
        <span class="badge">LIVE</span>
        <span v-if="viewers!==null" class="pill">👁️ {{ compact(viewers) }}</span>
        <span class="pill" :class="netClass">{{ netLabel }}</span>
        <span v-if="latencyMs!==null" class="pill">⏱ {{ Math.round(latencyMs) }}ms</span>
      </div>
      <div class="flex items-center gap-2">
        <button class="chip pointer-events-auto" @click.stop="toggleDataSaver">
          {{ dataSaver ? '🟢 Data Saver' : '⚪ Data Saver' }}
        </button>
        <button class="chip pointer-events-auto" @click.stop="enterPip" title="Picture-in-Picture">🗔 PIP</button>
        <button class="chip pointer-events-auto" @click.stop="enterFullscreen" title="Fullscreen">⛶</button>
      </div>
    </div>

    <!-- Center state -->
    <div v-if="overlayState" class="absolute inset-0 grid place-items-center">
      <div class="flex flex-col items-center gap-3">
        <div class="spinner" aria-hidden="true"></div>
        <div class="text-sm font-semibold text-white/90">{{ overlayState }}</div>
        <button v-if="showTapToPlay" class="btn" @click.stop="resumePlayback">▶️ Tap to Play</button>
      </div>
    </div>

    <!-- Bottom controls -->
    <div class="absolute left-0 right-0 bottom-0 px-3 pb-3 pt-10 bg-gradient-to-t from-black/60 to-transparent">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button class="btn" @click.stop="toggleMute">{{ muted ? '🔇 Unmute' : '🔈 Mute' }}</button>
          <button v-if="hlsReady" class="btn" @click.stop="setAuto">⚙️ {{ qualityLabel }}</button>
        </div>

        <!-- Quality chips -->
        <div v-if="hlsReady" class="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            v-for="q in qualities"
            :key="q.key"
            class="chip"
            :class="q.key===selectedKey ? 'chip-active' : ''"
            @click.stop="selectQuality(q)"
          >
            {{ q.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

/* PROPS */
const props = defineProps({
  source: { type: String, required: true },         // HLS .m3u8
  autoplay: { type: Boolean, default: true },
  startMuted: { type: Boolean, default: true },
  showNativeControls: { type: Boolean, default: false },
  lowLatency: { type: Boolean, default: true },     // hls.js LL-HLS
  keepAwake: { type: Boolean, default: true },
  viewers: { type: [Number, null], default: null }  // optional live viewer count
})

/* STATE */
const videoRef = ref(null)
const hls = ref(null)
const hlsReady = ref(false)
const isPlaying = ref(false)
const isBuffering = ref(true)
const showTapToPlay = ref(false)
const muted = ref(props.startMuted)
const dataSaver = ref(false)
const latencyMs = ref(null)

/* QUALITY */
const qualities = ref([{ key:'auto', label:'Auto' }]) // later push 1080p etc
const selectedKey = ref('auto')
const qualityLabel = computed(() => selectedKey.value === 'auto' ? 'Auto' : selectedKey.value)

/* SAFE AREA */
const safeArea = { padding: '0 0 env(safe-area-inset-bottom,0px) 0' }

/* NET INFO */
const net = ref({ downlink:null, effectiveType:null })
function readNet(){
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (!c) return
  net.value = { downlink: c.downlink, effectiveType: c.effectiveType }
}
const netLabel = computed(() => net.value.effectiveType ? `${net.value.effectiveType}${net.value.downlink?' • '+net.value.downlink+'Mbps':''}` : 'online')
const netClass = computed(() => /2g|slow-2g/.test(net.value.effectiveType||'') ? 'pill-warn' : 'pill-ok')

/* OVERLAY TEXT */
const overlayState = computed(() => {
  if (showTapToPlay.value) return 'Autoplay blocked — tap to play'
  if (!isPlaying.value && isBuffering.value) return 'Connecting to live stream…'
  if (isBuffering.value) return 'Buffering…'
  return ''
})

/* HELPERS */
function compact(n){
  if (n==null) return ''
  if (n >= 1e9) return (n/1e9).toFixed(1)+'B'
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M'
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K'
  return String(n)
}
function vibrate(ms=10){ try { navigator.vibrate?.(ms) } catch {} }

/* INIT */
onMounted(async () => {
  readNet()
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  c?.addEventListener?.('change', readNet)

  setupVideoListeners()
  await startPlayback()
  if (props.keepAwake) requestWake()
})

onBeforeUnmount(() => {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  c?.removeEventListener?.('change', readNet)
  destroyHls()
  releaseWake()
})

/* WATCH SOURCE CHANGES */
watch(() => props.source, async () => {
  destroyHls()
  await startPlayback()
})

/* PLAYBACK LOGIC */
async function startPlayback(){
  const video = videoRef.value
  if (!video) return
  isBuffering.value = true
  showTapToPlay.value = false
  video.muted = muted.value

  // Native HLS?
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = props.source
    try {
      await video.play()
    } catch {
      showTapToPlay.value = true
    }
    hlsReady.value = false
    setupBasicLatency()
    return
  }

  // hls.js fallback (dynamic import)
  try {
    const mod = await import('hls.js')
    const Hls = mod.default
    if (Hls.isSupported()) {
      const cfg = {
        lowLatencyMode: props.lowLatency,
        backBufferLength: 30,
        liveSyncDurationCount: 3,
        maxLiveSyncPlaybackRate: 1.1,
        capLevelToPlayerSize: true
      }
      hls.value = new Hls(cfg)
      hls.value.loadSource(props.source)
      hls.value.attachMedia(video)

      hls.value.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        // Build quality list
        const lvls = data.levels || hls.value.levels || []
        qualities.value = [{ key:'auto', label:'Auto' }].concat(
          lvls
            .map((l, i) => ({ key: `${l.height}p`, label: `${l.height}p`, index: i, height: l.height }))
            .sort((a,b) => a.height - b.height)
        )
        selectedKey.value = 'auto'
        hlsReady.value = true
      })

      hls.value.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
        const lvl = hls.value.levels?.[data.level]
        if (lvl?.loadError) return
        selectedKey.value = data.level === -1 ? 'auto' : `${lvl?.height || '?'}p`
      })

      hls.value.on(Hls.Events.FRAG_CHANGED, (_e, data) => {
        // crude latency estimate (live edge - buffer end)
        try {
          const { stats } = data.frag
          if (stats?.loading) {
            latencyMs.value = (stats.loading.end - stats.loading.start) || null
          }
        } catch {}
      })

      hls.value.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          switch (data.type) {
            case 'networkError':
              hls.value.startLoad()
              break
            case 'mediaError':
              hls.value.recoverMediaError()
              break
            default:
              destroyHls()
          }
        }
      })

      try {
        await video.play()
      } catch {
        showTapToPlay.value = true
      }
    } else {
      console.warn('HLS not supported')
      showTapToPlay.value = true
    }
  } catch (e) {
    console.warn('Failed to load hls.js', e)
    showTapToPlay.value = true
  }
}

/* BASIC LATENCY for native HLS (placeholder) */
function setupBasicLatency(){ latencyMs.value = null }

/* DESTROY */
function destroyHls(){
  try { hls.value?.destroy?.() } catch {}
  hls.value = null
  hlsReady.value = false
}

/* VIDEO EVENTS */
function setupVideoListeners(){
  const v = videoRef.value
  if (!v) return
  v.addEventListener('playing', () => { isPlaying.value = true; isBuffering.value = false })
  v.addEventListener('pause',   () => { isPlaying.value = false })
  v.addEventListener('waiting', () => { isBuffering.value = true })
  v.addEventListener('timeupdate', () => { isBuffering.value = false })
}

/* USER ACTIONS */
function onTap(){ /* keep for future gestures */ }
async function resumePlayback(){
  try {
    await videoRef.value.play()
    showTapToPlay.value = false
  } catch {}
}
function toggleMute(){
  muted.value = !muted.value
  videoRef.value.muted = muted.value
  vibrate(8)
}

/* QUALITY CONTROLS */
function setAuto(){
  if (!hls.value) return
  hls.value.currentLevel = -1
  hls.value.autoLevelCapping = undefined
  selectedKey.value = 'auto'
}
function selectQuality(q){
  if (!hls.value) return
  if (q.key === 'auto') return setAuto()
  const lvl = hls.value.levels.findIndex(l => `${l.height}p` === q.key)
  if (lvl >= 0) {
    hls.value.autoLevelCapping = undefined
    hls.value.currentLevel = lvl
    selectedKey.value = q.key
  }
}

/* DATA SAVER */
function toggleDataSaver(){
  dataSaver.value = !dataSaver.value
  if (hls.value) {
    if (dataSaver.value) {
      // cap to lowest level
      const lowest = 0
      hls.value.autoLevelCapping = lowest
      hls.value.currentLevel = lowest
      selectedKey.value = `${hls.value.levels?.[lowest]?.height || 'low'}p`
    } else {
      hls.value.autoLevelCapping = undefined
      hls.value.currentLevel = -1
      selectedKey.value = 'auto'
    }
  }
}

/* PIP / FULLSCREEN */
async function enterPip(){
  try {
    if ('requestPictureInPicture' in videoRef.value) await videoRef.value.requestPictureInPicture()
  } catch {}
}
async function enterFullscreen(){
  const el = videoRef.value
  try {
    if (el.requestFullscreen) await el.requestFullscreen()
    else if (el.webkitEnterFullscreen) el.webkitEnterFullscreen()
  } catch {}
}

/* WAKE LOCK */
let wakeLock = null
async function requestWake(){
  try { wakeLock = await navigator.wakeLock?.request?.('screen') } catch {}
}
function releaseWake(){ try { wakeLock?.release?.(); wakeLock = null } catch {} }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && props.keepAwake) requestWake()
})
</script>

<style scoped>
/* Live dot */
.live-dot {
  width: 10px; height: 10px; border-radius: 9999px; background: #ef4444;
  box-shadow: 0 0 0 0 rgba(239,68,68,.6);
  animation: pulse 1.2s infinite;
}
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(239,68,68,.6) }
  70% { box-shadow: 0 0 0 8px rgba(239,68,68,0) }
  100%{ box-shadow: 0 0 0 0 rgba(239,68,68,0) }
}

/* Pills & badges */
.pill {
  padding: 2px 6px; font-size: 11px; border-radius: 9999px;
  background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.25); backdrop-filter: blur(6px);
}
.pill-ok { background: rgba(52,211,153,.18); border-color: rgba(16,185,129,.35) }
.pill-warn { background: rgba(251,191,36,.18); border-color: rgba(251,191,36,.35) }
.badge {
  padding: 2px 6px; font-size: 11px; border-radius: 9999px; font-weight: 800;
  background: #ef4444;
}

/* Buttons */
.btn { padding: 8px 12px; border-radius: 9999px; background: rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.25); }
.chip {
  padding: 6px 10px; border-radius: 9999px; font-size: 12px;
  background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2);
}
.chip-active { background: rgba(99,102,241,.35); border-color: rgba(99,102,241,.6); color: #fff; }

/* Spinner */
.spinner {
  width: 36px; height: 36px; border-radius: 9999px; border: 3px solid rgba(255,255,255,.25); border-top-color: #fff;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }

/* Hide scrollbar for chips */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* Reduce motion */
@media (prefers-reduced-motion: reduce){
  * { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
</style>
