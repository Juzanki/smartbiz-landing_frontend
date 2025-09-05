<template>
  <article
    ref="root"
    :class="rootClasses"
    role="button"
    tabindex="0"
    :aria-label="ariaLabel"
    @click="onJoin"
    @keydown.enter.space.prevent="onJoin"
  >
    <!-- Media -->
    <div class="relative aspect-video w-full overflow-hidden rounded-xl">
      <!-- Thumbnail fallback -->
      <img
        v-if="!showVideo"
        :src="thumbnail"
        class="h-full w-full object-cover"
        :alt="title"
        @error="onImgError"
      />
      <!-- Video preview -->
      <video
        v-else
        ref="videoRef"
        class="h-full w-full object-cover"
        playsinline
        muted
        preload="metadata"
        :autoplay="autoplay"
        :controls="false"
      ></video>

      <!-- Top overlay -->
      <div class="absolute inset-x-0 top-0 flex items-center justify-between px-2 py-2 bg-gradient-to-b from-black/45 to-transparent">
        <div class="flex items-center gap-2">
          <span class="live-dot" v-if="status==='live'"></span>
          <span v-if="status==='live'" class="badge">LIVE</span>
          <span v-else-if="status==='scheduled'" class="badge badge-amber">⏳ {{ countdown }}</span>
          <span v-else class="badge badge-slate">Offline</span>
          <span v-if="viewers!==null && status==='live'" class="pill">👁️ {{ compact(viewers) }}</span>
          <span class="pill" :class="netClass">{{ netLabel }}</span>
        </div>

        <div class="flex items-center gap-1">
          <button class="chip" @click.stop="togglePreview" :title="showVideo ? 'Pause preview' : 'Play preview'">
            {{ showVideo ? '⏸' : '▶️' }}
          </button>
          <button class="chip" @click.stop="toggleMute" :title="muted ? 'Unmute' : 'Mute'">
            {{ muted ? '🔇' : '🔈' }}
          </button>
          <button class="chip" @click.stop="onShare" title="Share">📤</button>
        </div>
      </div>

      <!-- Bottom overlay stats -->
      <div class="absolute inset-x-0 bottom-0 px-2 pb-2 pt-10 bg-gradient-to-t from-black/60 to-transparent">
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-2 bg-black/35 border border-white/25 backdrop-blur px-2 py-1 rounded-full">
            <img :src="avatar" alt="" class="h-6 w-6 rounded-full object-cover ring-1 ring-white/40" @error="onImgError" />
            <span class="text-xs text-white font-semibold truncate max-w-[42vw]">{{ hostName }}</span>
            <span v-if="verified" class="text-yellow-300">✔</span>
          </div>
          <span class="ml-auto pill" v-if="status==='live'">⏱ {{ liveFor }}</span>
        </div>
      </div>

      <!-- Center overlay: states -->
      <div v-if="overlayState" class="absolute inset-0 grid place-items-center">
        <div class="flex flex-col items-center gap-2">
          <div class="spinner" aria-hidden="true"></div>
          <div class="text-xs font-semibold text-white/90">{{ overlayState }}</div>
          <button v-if="showTapToPlay" class="btn" @click.stop="resumePlayback">▶️ Tap to Play</button>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div class="px-2 pt-2">
      <h3 class="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2">{{ title }}</h3>
      <p class="mt-0.5 text-[12px] text-slate-600 dark:text-slate-300 line-clamp-2">
        {{ subtitleText }}
      </p>

      <div class="mt-2 flex items-center gap-2">
        <button class="btn-primary flex-1" @click.stop="onJoin">{{ ctaText }}</button>
        <button class="btn" @click.stop="onShare">📤</button>
        <button v-if="status==='scheduled'" class="btn" @click.stop="toggleReminder">{{ reminded ? '🔔' : '🛎️' }}</button>
      </div>
    </div>

    <!-- Skeleton (loading) -->
    <div v-if="loading" class="absolute inset-0 rounded-2xl overflow-hidden">
      <div class="absolute inset-0 skeleton"></div>
    </div>
  </article>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

/* PROPS */
const props = defineProps({
  title:       { type: String, default: 'Live Preview' },
  hostName:    { type: String, default: '@host' },
  avatar:      { type: String, default: '/avatars/host.png' },
  verified:    { type: Boolean, default: true },

  thumbnail:   { type: String, default: '/images/placeholder-live.jpg' },
  previewSrc:  { type: String, default: '' }, // HLS .m3u8 or MP4
  live:        { type: Boolean, default: true },
  viewers:     { type: [Number, null], default: null },

  startedAt:   { type: [Number, String, Date], default: null },
  scheduledAt: { type: [Number, String, Date], default: null },

  autoplay:    { type: Boolean, default: true },
  startMuted:  { type: Boolean, default: true },
  dataSaverAuto: { type: Boolean, default: true }, // auto-offload video on poor networks
  routeTo:     { type: String, default: '/live-stream' },
  loading:     { type: Boolean, default: false },
})

/* EMITS */
const emit = defineEmits(['join','share','remind','play','pause','error'])

/* REFS & STATE */
const root = ref(null)
const videoRef = ref(null)
const hls = ref(null)
const hlsReady = ref(false)
const isPlaying = ref(false)
const isBuffering = ref(false)
const showTapToPlay = ref(false)
const showVideo = ref(false)
const muted = ref(props.startMuted)
const reminded = ref(false)

/* TIME */
const now = ref(Date.now())
let timer = null

/* NETWORK */
const net = ref({ downlink: null, effectiveType: null })
function readNet(){
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (!c) return
  net.value = { downlink: c.downlink, effectiveType: c.effectiveType }
  if (props.dataSaverAuto && /2g|slow-2g/.test(c.effectiveType || '')) stopPreview() // save data
}

/* STATUS */
function toMs(v){ if (!v) return null; return (v instanceof Date) ? v.getTime() : +new Date(v) }
const startMs = computed(() => toMs(props.scheduledAt))
const startedMs = computed(() => toMs(props.startedAt))
const status = computed(() => {
  if (props.live) return 'live'
  if (startMs.value && startMs.value > now.value) return 'scheduled'
  return 'offline'
})
const countdown = computed(() => {
  if (!startMs.value) return 'soon'
  const s = Math.max(0, Math.floor((startMs.value - now.value)/1000))
  const m = Math.floor(s/60), h = Math.floor(m/60)
  if (h) return `${h}h ${m%60}m`
  if (m) return `${m}m ${s%60}s`
  return `${s}s`
})
const liveFor = computed(() => {
  const base = startedMs.value || Date.now()
  const s = Math.max(0, Math.floor((now.value - base)/1000))
  const m = Math.floor(s/60), h = Math.floor(m/60)
  if (h) return `${h}h ${m%60}m`
  if (m) return `${m}m ${s%60}s`
  return `${s}s`
})

/* LABELS */
const ctaText = computed(() =>
  status.value === 'scheduled' ? 'Set Reminder' : 'Join Stream'
)
const subtitleText = computed(() =>
  status.value === 'live'
    ? `${props.hostName} is live now`
    : status.value === 'scheduled'
      ? `Starts in ${countdown.value}`
      : `${props.hostName} is offline`
)
const ariaLabel = computed(() => {
  if (status.value==='live') return `Live preview by ${props.hostName}, tap to join`
  if (status.value==='scheduled') return `Starts in ${countdown.value}, tap to set reminder`
  return `Stream by ${props.hostName}`
})

/* CLASSES */
const rootClasses = computed(() =>
  'relative w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0b1020] shadow-lg overflow-hidden active:scale-[.99] transition'
)

/* NET LABEL */
const netLabel = computed(() =>
  net.value.effectiveType ? `${net.value.effectiveType}${net.value.downlink ? ' • '+net.value.downlink+'Mbps' : ''}` : 'online'
)
const netClass = computed(() => /2g|slow-2g/.test(net.value.effectiveType||'') ? 'pill-warn' : 'pill-ok')

/* OVERLAY STATE */
const overlayState = computed(() => {
  if (!showVideo && status.value==='live') return 'Tap ▶️ to preview'
  if (showTapToPlay) return 'Autoplay blocked — tap to play'
  if (isBuffering.value) return 'Buffering…'
  return ''
})

/* LIFECYCLE */
onMounted(async () => {
  timer = setInterval(() => { now.value = Date.now() }, 1000)
  readNet()
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  c?.addEventListener?.('change', readNet)

  setupIntersection()
  if (status.value==='live') maybeStartPreview()
})
onBeforeUnmount(() => {
  clearInterval(timer)
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  c?.removeEventListener?.('change', readNet)
  destroyHls()
})

/* INTERSECTION: auto play/pause when visible */
let io = null
function setupIntersection(){
  if (!('IntersectionObserver' in window)) { showVideo.value = false; return }
  io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) maybeStartPreview()
    else stopPreview()
  }, { threshold: 0.35 })
  io.observe(root.value)
}

/* PREVIEW CONTROL */
async function maybeStartPreview(){
  if (!props.previewSrc || status.value!=='live') return
  if (props.dataSaverAuto && /2g|slow-2g/.test((net.value.effectiveType||''))) return
  showVideo.value = true
  await startPlayback()
}
function stopPreview(){
  isPlaying.value = false
  showVideo.value = false
  try { videoRef.value?.pause?.() } catch {}
  destroyHls()
  emit('pause')
}
function togglePreview(){ showVideo.value ? stopPreview() : maybeStartPreview() }

/* PLAYBACK */
async function startPlayback(){
  const v = videoRef.value
  if (!v) return
  isBuffering.value = true
  showTapToPlay.value = false
  v.muted = muted.value

  // Native HLS?
  if (v.canPlayType('application/vnd.apple.mpegurl')) {
    v.src = props.previewSrc
    bindVideoEvents(v)
    try { await v.play(); emit('play') } catch { showTapToPlay.value = true }
    hlsReady.value = false
    return
  }

  // hls.js fallback
  try {
    const mod = await import('hls.js')
    const Hls = mod.default
    if (Hls.isSupported()) {
      hls.value = new Hls({ lowLatencyMode: true, capLevelToPlayerSize: true, liveSyncDurationCount: 3 })
      hls.value.loadSource(props.previewSrc)
      hls.value.attachMedia(v)
      hls.value.on(Hls.Events.MANIFEST_PARSED, () => { hlsReady.value = true })
      hls.value.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          if (data.type === 'networkError') hls.value.startLoad()
          else if (data.type === 'mediaError') hls.value.recoverMediaError()
          else destroyHls()
        }
      })
      bindVideoEvents(v)
      try { await v.play(); emit('play') } catch { showTapToPlay.value = true }
    } else {
      showTapToPlay.value = true
    }
  } catch (e) {
    showTapToPlay.value = true
  }
}
function bindVideoEvents(v){
  v.onplaying = () => { isPlaying.value = true; isBuffering.value = false }
  v.onwaiting = () => { isBuffering.value = true }
  v.onpause   = () => { isPlaying.value = false }
}
function destroyHls(){ try { hls.value?.destroy?.() } catch {} hls.value = null; hlsReady.value = false }
async function resumePlayback(){ try { await videoRef.value.play(); showTapToPlay.value = false } catch {} }

/* ACTIONS */
function onJoin(){ emit('join'); if (props.routeTo) location.assign(props.routeTo) }
function onShare(){
  emit('share')
  const data = { title: props.title, text: `${props.hostName} is ${status.value==='live'?'live now':'going live soon'}`, url: location.href }
  if (navigator.share) navigator.share(data).catch(()=>{})
  else navigator.clipboard?.writeText(data.url)
}
function toggleReminder(){
  reminded.value = !reminded.value
  emit('remind', { at: startMs.value, on: reminded.value })
}
function toggleMute(){ muted.value = !muted.value; if (videoRef.value) videoRef.value.muted = muted.value }

/* UTILS */
function compact(n){
  if (n >= 1e9) return (n/1e9).toFixed(1)+'B'
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M'
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K'
  return String(n ?? 0)
}
function onImgError(e){ e.target.style.opacity = .6 }
</script>

<style scoped>
/* Live dot & badges */
.live-dot { width: 10px; height: 10px; border-radius: 9999px; background:#ef4444; box-shadow:0 0 0 0 rgba(239,68,68,.6); animation:pulse 1.2s infinite; }
@keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(239,68,68,.6)} 70%{box-shadow:0 0 0 8px rgba(239,68,68,0)} 100%{box-shadow:0 0 0 0 rgba(239,68,68,0)} }
.badge { padding:2px 6px; font-size:11px; border-radius:9999px; font-weight:800; background:#ef4444; color:#fff }
.badge-amber { background:#f59e0b; color:#111827 }
.badge-slate { background:#64748b; color:#fff }

/* Pills */
.pill { padding:2px 6px; font-size:11px; border-radius:9999px; background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.25); color:#fff; backdrop-filter: blur(6px); }
.pill-ok   { background: rgba(34,197,94,.22); border-color: rgba(16,185,129,.35) }
.pill-warn { background: rgba(251,191,36,.22); border-color: rgba(251,191,36,.4) }

/* Buttons */
.btn { padding:8px 12px; border-radius:9999px; background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.25); color:#fff; }
.btn-primary { padding:10px 14px; border-radius:9999px; font-weight:700; color:#fff; background:linear-gradient(180deg,#ef4444,#db2777); border:1px solid rgba(255,255,255,.18); box-shadow:0 8px 24px rgba(219,39,119,.35); }

/* Spinner & skeleton */
.spinner { width:32px; height:32px; border-radius:9999px; border:3px solid rgba(255,255,255,.25); border-top-color:#fff; animation:spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg) } }
.skeleton { background: linear-gradient(90deg, rgba(0,0,0,.06) 25%, rgba(0,0,0,.09) 37%, rgba(0,0,0,.06) 63%); animation: shimmer 1.2s linear infinite; background-size: 400% 100%; }
:global(.dark) .skeleton { background: linear-gradient(90deg, rgba(255,255,255,.06) 25%, rgba(255,255,255,.12) 37%, rgba(255,255,255,.06) 63%); }
@keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }

/* Dark mode helpers */
:global(.dark) .badge-slate { background:#475569 }
</style>
