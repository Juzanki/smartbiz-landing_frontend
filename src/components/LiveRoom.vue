<template>
  <main
    class="relative w-full min-h-[100svh] bg-white dark:bg-[#0b1020] text-slate-900 dark:text-white"
    :style="safeArea"
    :dir="dir"
  >
    <!-- Top bar -->
    <header class="sticky top-0 z-50 px-3 py-2 bg-gradient-to-b from-black/60 to-transparent text-white flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="relative">
          <img :src="host.avatar" class="h-9 w-9 rounded-full object-cover ring-1 ring-white/40" alt="" @error="onImgErr"/>
          <span class="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-red-500 rounded-full border border-white animate-ping"></span>
        </div>
        <div class="leading-tight">
          <div class="flex items-center gap-1 font-extrabold text-[13px]">
            {{ host.name }}
            <span v-if="host.verified" class="text-yellow-300">✔</span>
            <span class="px-2 py-[2px] rounded-full bg-white/15 text-pink-300 text-[10px]">{{ t('live') }}</span>
          </div>
          <div class="text-[11px] text-pink-200">{{ compact(viewers) }} {{ t('watching') }}</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button class="chip" @click="toggleTheme" :title="theme==='dark' ? t('light') : t('dark')">🌓</button>
        <button class="chip" @click="openLang = !openLang" :title="t('language')">🌐</button>
        <button class="chip" @click="doShare" :title="t('share')">📤</button>
        <button class="chip" @click="endLive" :title="t('close')">✖</button>
      </div>
    </header>

    <!-- Offline banner -->
    <transition name="fade">
      <div v-if="!online" class="mx-3 mt-2 mb-1 rounded-xl px-3 py-2 bg-amber-500/20 text-amber-100 border border-amber-400/40 text-[12px]">
        ⚠️ {{ t('offline') }}
      </div>
    </transition>

    <!-- Player -->
    <section class="relative w-full">
      <div class="relative w-full aspect-[9/16] sm:aspect-video bg-black overflow-hidden">
        <video
          ref="videoRef"
          class="h-full w-full object-cover"
          :muted="muted"
          playsinline
          preload="metadata"
          :autoplay="true"
          :controls="false"
        ></video>

        <!-- Overlays -->
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"></div>

        <!-- Net + status pills -->
        <div class="absolute top-2 left-2 right-2 flex items-center justify-between text-white">
          <div class="flex items-center gap-2">
            <span class="live-dot"></span>
            <span class="badge">LIVE</span>
            <span class="pill">👁️ {{ compact(viewers) }}</span>
            <span class="pill" :class="netClass">{{ netLabel }}</span>
          </div>
          <div class="flex items-center gap-1 pointer-events-auto">
            <button class="chip" @click.stop="toggleMute">{{ muted ? '🔇' : '🔈' }}</button>
            <button class="chip" @click.stop="enterPip">🗔 PIP</button>
            <button class="chip" @click.stop="enterFullscreen">⛶</button>
          </div>
        </div>

        <!-- Center state -->
        <div v-if="overlayText" class="absolute inset-0 grid place-items-center text-white">
          <div class="flex flex-col items-center gap-3">
            <div class="spinner" aria-hidden="true"></div>
            <div class="text-sm font-semibold">{{ overlayText }}</div>
            <button v-if="tapToPlay" class="btn" @click.stop="resumePlayback">▶️ {{ t('tapToPlay') }}</button>
          </div>
        </div>

        <!-- Tap reactions -->
        <transition-group name="float" tag="div" class="absolute inset-0 pointer-events-none">
          <div v-for="h in hearts" :key="h.id" class="absolute text-2xl" :style="{ left:h.x+'px', top:h.y+'px', animation:'float-up 1.2s ease-out forwards' }">💖</div>
        </transition-group>

        <!-- Tap layer for likes -->
        <button class="absolute inset-0" @click="tapLike"></button>
      </div>
    </section>

    <!-- Title / description -->
    <section class="px-3 py-2">
      <h2 class="text-[15px] font-extrabold line-clamp-2">{{ title }}</h2>
      <p class="text-[12px] text-slate-600 dark:text-slate-300 line-clamp-2">{{ subtitle }}</p>
    </section>

    <!-- Chat & actions -->
    <section class="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 pt-12 bg-gradient-to-t from-black/70 to-transparent">
      <div class="flex items-center gap-2">
        <input
          v-model="chatText"
          :placeholder="t('sayHi')"
          class="flex-1 h-11 rounded-full px-4 text-[13px] bg-white/95 dark:bg-white/10 text-slate-900 dark:text-white border border-black/10 dark:border-white/10 focus:outline-none"
          @keyup.enter="sendChat"
        />
        <button class="btn-primary" @click="sendChat">➡️</button>
      </div>

      <!-- Bottom bar (high-contrast) -->
      <div class="mt-3 grid grid-cols-5 gap-2">
        <button class="act" @click="tapLike">❤️ <span class="small">{{ compact(likes) }}</span></button>
        <button class="act" @click="openGifts">🎁 <span class="sr-only">Gifts</span></button>
        <button class="act" @click="doShare">📤 <span class="sr-only">{{ t('share') }}</span></button>
        <button class="act" @click="togglePreview">{{ previewOn ? '⏸' : '▶️' }}</button>
        <button class="act" @click="openMore">⋯</button>
      </div>
    </section>

    <!-- Language sheet -->
    <transition name="fade">
      <div v-if="openLang" class="fixed inset-0 z-[9999] grid place-items-end p-3">
        <div class="w-full max-w-sm rounded-2xl bg-white/90 dark:bg-[#0b1020]/90 backdrop-blur-xl border border-black/10 dark:border-white/10 overflow-hidden">
          <div class="px-4 py-3 text-[13px] font-bold">{{ t('language') }}</div>
          <div class="px-3 pb-3 grid grid-cols-3 gap-2">
            <button v-for="l in locales" :key="l" class="chip" :class="locale===l ? 'chip-active' : ''" @click="setLocale(l)">{{ l.toUpperCase() }}</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Gifts bottom-sheet (BUILT-IN) -->
    <transition name="fade">
      <div
        v-if="showGifts"
        class="fixed inset-0 z-[9999] grid place-items-end p-3"
        role="dialog" aria-modal="true" aria-label="Gifts"
        @click.self="showGifts=false"
      >
        <div class="w-full max-w-md rounded-t-2xl bg-white/92 dark:bg-[#0b1020]/92 backdrop-blur-xl border border-black/10 dark:border-white/10 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3">
            <div class="font-extrabold text-[14px]">🎁 Gifts</div>
            <button class="chip" @click="showGifts=false">✖</button>
          </div>

          <div class="px-3 pb-3 grid grid-cols-4 gap-2">
            <button
              v-for="g in giftsCatalog"
              :key="g.id"
              class="gift-card"
              @click="sendGift(g)"
            >
              <div class="text-2xl leading-none">{{ g.icon }}</div>
              <div class="text-[11px] font-semibold opacity-90 truncate">{{ g.name }}</div>
              <div class="text-[10px] opacity-80">{{ g.price }} 💎</div>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Skeleton cover (first load) -->
    <div v-if="loading" class="absolute inset-0 skeleton"></div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits(['gift'])

/** PROPS */
const props = defineProps({
  source: { type: String, required: true },         // HLS .m3u8
  title: { type: String, default: 'LiveRoom' },
  subtitle: { type: String, default: 'SmartBiz Live' },
  host: { type: Object, default: () => ({ name: '@host', avatar: '/avatars/host.png', verified: true }) },
  initialViewers: { type: Number, default: 1325 },
  initialLikes: { type: Number, default: 0 },
  startMuted: { type: Boolean, default: true },
  autoDark: { type: Boolean, default: true },
  locale: { type: String, default: 'en' } // en | sw | fr | es | ar
})

/** STATE */
const videoRef = ref(null)
const hls = ref(null)
const isPlaying = ref(false)
const isBuffering = ref(true)
const tapToPlay = ref(false)
const muted = ref(props.startMuted)
const loading = ref(true)

const viewers = ref(props.initialViewers)
const likes = ref(props.initialLikes)
const hearts = ref([])
const previewOn = ref(true)

const online = ref(navigator.onLine)
const net = ref({ downlink:null, effectiveType:null })

const chatText = ref('')
const openLang = ref(false)
const showGifts = ref(false)        // <-- drawer state

/* default gifts (you can pass via parent later if unataka) */
const giftsCatalog = ref([
  { id:'rose',    name:'Rose',    icon:'🌹', price:1  },
  { id:'heart',   name:'Heart',   icon:'💖', price:5  },
  { id:'rocket',  name:'Rocket',  icon:'🚀', price:10 },
  { id:'diamond', name:'Diamond', icon:'💎', price:20 },
  { id:'crown',   name:'Crown',   icon:'👑', price:25 },
  { id:'car',     name:'Car',     icon:'🚗', price:40 },
  { id:'phone',   name:'Smart',   icon:'📱', price:60 },
  { id:'castle',  name:'Castle',  icon:'🏰', price:80 }
])

const theme = ref( (props.autoDark && window.matchMedia?.('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light' )
if (theme.value === 'dark') document.documentElement.classList.add('dark')

/** I18N (in-component) */
const locales = ['en','sw','fr','es','ar']
const messages = {
  en: { live:'LIVE', watching:'Watching', share:'Share', language:'Language', close:'Close', offline:'You are offline — reconnecting…', tapToPlay:'Tap to play', sayHi:'Say something…', light:'Light', dark:'Dark' },
  sw: { live:'LIVE', watching:'Wanaangalia', share:'Shiriki', language:'Lugha', close:'Funga', offline:'Uko offline — inajaribu kuunganisha…', tapToPlay:'Gusa uchezeshwe', sayHi:'Sema kitu…', light:'Mwanga', dark:'Giza' },
  fr: { live:'EN DIRECT', watching:'Regardent', share:'Partager', language:'Langue', close:'Fermer', offline:'Hors ligne — reconnexion…', tapToPlay:'Appuyez pour lire', sayHi:'Dites quelque chose…', light:'Clair', dark:'Sombre' },
  es: { live:'EN VIVO', watching:'Mirando', share:'Compartir', language:'Idioma', close:'Cerrar', offline:'Sin conexión — reconectando…', tapToPlay:'Toca para reproducir', sayHi:'Di algo…', light:'Claro', dark:'Oscuro' },
  ar: { live:'مباشر', watching:'مشاهد', share:'مشاركة', language:'اللغة', close:'إغلاق', offline:'أنت غير متصل — إعادة الاتصال…', tapToPlay:'اضغط للتشغيل', sayHi:'قل شيئًا…', light:'فاتح', dark:'داكن' },
}
const curLocale = ref(props.locale)
const dir = computed(() => curLocale.value === 'ar' ? 'rtl' : 'ltr')
function t(key){ return (messages[curLocale.value] && messages[curLocale.value][key]) || messages.en[key] || key }
function setLocale(l){ curLocale.value = l; openLang.value = false }

/** SAFE-AREA */
const safeArea = { paddingBottom: 'max(env(safe-area-inset-bottom,0px), 0px)' }

/** NETWORK */
function readNet(){
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (!c) return
  net.value = { downlink: c.downlink, effectiveType: c.effectiveType }
}
const netLabel = computed(() => net.value.effectiveType ? `${net.value.effectiveType}${net.value.downlink ? ' • '+net.value.downlink+'Mbps' : ''}` : 'online')
const netClass = computed(() => /2g|slow-2g/.test(net.value.effectiveType||'') ? 'pill-warn' : 'pill-ok')

/** OVERLAY TEXT */
const overlayText = computed(() => {
  if (tapToPlay.value) return t('tapToPlay')
  if (!isPlaying.value && isBuffering.value) return 'Connecting…'
  if (isBuffering.value) return 'Buffering…'
  return ''
})

/** LIFE */
let visHandler = null
onMounted(async () => {
  window.addEventListener('online', () => online.value = true)
  window.addEventListener('offline', () => online.value = false)
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  c?.addEventListener?.('change', readNet)
  readNet()
  setupVideoListeners()
  await startPlayback()
  loading.value = false

  visHandler = () => { if (document.visibilityState === 'hidden') pausePreview(); else resumePreview() }
  document.addEventListener('visibilitychange', visHandler, { passive: true })
})

onBeforeUnmount(() => {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  c?.removeEventListener?.('change', readNet)
  document.removeEventListener('visibilitychange', visHandler)
  destroyHls()
})

/** PLAYBACK */
async function startPlayback(){
  const v = videoRef.value
  if (!v) return
  isBuffering.value = true
  tapToPlay.value = false
  v.muted = muted.value

  if (v.canPlayType('application/vnd.apple.mpegurl')) {
    v.src = props.source
    try { await v.play() } catch { tapToPlay.value = true }
    return
  }
  try {
    const mod = await import('hls.js')
    const Hls = mod.default
    if (Hls.isSupported()) {
      hls.value = new Hls({ lowLatencyMode:true, capLevelToPlayerSize:true, liveSyncDurationCount:3 })
      hls.value.loadSource(props.source)
      hls.value.attachMedia(v)
      hls.value.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          if (data.type==='networkError') hls.value.startLoad()
          else if (data.type==='mediaError') hls.value.recoverMediaError()
          else destroyHls()
        }
      })
      try { await v.play() } catch { tapToPlay.value = true }
    } else {
      tapToPlay.value = true
    }
  } catch {
    tapToPlay.value = true
  }
}

function setupVideoListeners(){
  const v = videoRef.value
  if (!v) return
  v.addEventListener('playing', () => { isPlaying.value = true; isBuffering.value = false })
  v.addEventListener('waiting', () => { isBuffering.value = true })
  v.addEventListener('pause',   () => { isPlaying.value = false })
}

function destroyHls(){ try { hls.value?.destroy?.() } catch {} hls.value = null }

async function resumePlayback(){ try { await videoRef.value.play(); tapToPlay.value = false } catch {} }
function pausePreview(){ try { videoRef.value?.pause?.() } catch {} }
function resumePreview(){ if (previewOn.value && !tapToPlay.value) resumePlayback() }

/** ACTIONS */
function toggleMute(){ muted.value = !muted.value; if (videoRef.value) videoRef.value.muted = muted.value }
async function enterPip(){ try { await videoRef.value?.requestPictureInPicture?.() } catch {} }
async function enterFullscreen(){
  const el = videoRef.value
  try { if (el.requestFullscreen) await el.requestFullscreen(); else if (el.webkitEnterFullscreen) el.webkitEnterFullscreen() } catch {}
}
function doShare(){
  const data = { title: props.title, text: `${host.value?.name || '@host'} ${messages[curLocale.value].live}`, url: location.href }
  if (navigator.share) navigator.share(data).catch(()=>{})
  else navigator.clipboard?.writeText(data.url)
}
function endLive(){ /* hook for host; keep UI only */ }
function toggleTheme(){
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.classList.toggle('dark', theme.value === 'dark')
}
function openGifts(){ showGifts.value = true }                                   // <-- open drawer
function openMore(){ /* open extra actions */ }
function togglePreview(){ previewOn.value = !previewOn.value; previewOn.value ? resumePreview() : pausePreview() }

function sendChat(){
  if (!chatText.value.trim()) return
  chatText.value = '' // optimistic; wire to backend if needed
}

function sendGift(g){
  // fanya emit kwa parent (kwa effects/analytics)
  emit('gift', { ...g, timestamp: Date.now() })
  try{ navigator.vibrate?.(12) }catch{}
  showGifts.value = false
}

function tapLike(e){
  likes.value++
  const rect = e.currentTarget.getBoundingClientRect()
  hearts.value.push({ id: Math.random().toString(36).slice(2,7), x: (e.clientX||rect.right-24)-rect.left, y: (e.clientY||rect.bottom-24)-rect.top })
  setTimeout(() => hearts.value.shift(), 900)
}

/** UTILS */
function compact(n){ if (n>=1e9) return (n/1e9).toFixed(1)+'B'; if (n>=1e6) return (n/1e6).toFixed(1)+'M'; if (n>=1e3) return (n/1e3).toFixed(1)+'K'; return String(n??0) }
function onImgErr(ev){ ev.target.style.opacity = .6 }
const host = computed(() => props.host)
</script>

<style scoped>
/* Pills/Chips/Buttons */
.pill { padding:2px 6px; font-size:11px; border-radius:9999px; background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.25); color:#fff; backdrop-filter: blur(6px); }
.pill-ok { background: rgba(34,197,94,.22); border-color: rgba(16,185,129,.35) }
.pill-warn { background: rgba(251,191,36,.22); border-color: rgba(251,191,36,.4) }
.badge { padding:2px 6px; font-size:11px; border-radius:9999px; font-weight:800; background:#ef4444; color:#fff }
.chip { padding:6px 10px; border-radius:9999px; font-size:12px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2); color:#fff; }
.chip-active { background: rgba(99,102,241,.35); border-color: rgba(99,102,241,.6); color:#fff; }
.btn { padding:8px 12px; border-radius:9999px; background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.25); color:#fff; }
.btn-primary { padding:10px 14px; border-radius:9999px; font-weight:700; color:#fff; background:linear-gradient(180deg,#ef4444,#db2777); border:1px solid rgba(255,255,255,.18); box-shadow:0 8px 24px rgba(219,39,119,.35); }
.live-dot { width:10px; height:10px; border-radius:9999px; background:#ef4444; box-shadow:0 0 0 0 rgba(239,68,68,.6); animation:pulse 1.2s infinite; }
@keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(239,68,68,.6)} 70%{box-shadow:0 0 0 8px rgba(239,68,68,0)} 100%{box-shadow:0 0 0 0 rgba(239,68,68,0)} }
.spinner { width:34px; height:34px; border-radius:9999px; border:3px solid rgba(255,255,255,.25); border-top-color:#fff; animation:spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg) } }

/* Bottom actions — HIGH CONTRAST, mobile-first */
.act{
  height:42px; display:flex; align-items:center; justify-content:center; gap:6px;
  border-radius:14px; font-weight:800; font-size:14px;
  color:#fff; text-shadow:0 1px 2px rgba(0,0,0,.45);
  background:linear-gradient(180deg, rgba(255,255,255,.20), rgba(255,255,255,.08));
  border:1px solid rgba(255,255,255,.25);
  backdrop-filter: blur(8px);
}
:global(.dark) .act{
  background:linear-gradient(180deg, rgba(20,20,30,.55), rgba(20,20,30,.35));
  border-color: rgba(255,255,255,.18);
}
.act:active{ transform: scale(.98) }
.small{ font-size:11px; font-weight:700; }

/* Gift cards */
.gift-card{
  display:grid; place-items:center; gap:2px; padding:10px 6px; border-radius:14px;
  border:1px solid rgba(0,0,0,.1); background: rgba(255,255,255,.85); color:#111;
}
:global(.dark) .gift-card{
  border-color: rgba(255,255,255,.18);
  background: rgba(255,255,255,.08); color:#fff;
}
.gift-card:active{ transform: scale(.98) }

/* Hearts float */
@keyframes float-up { from{ transform: translateY(10px); opacity: .2 } to{ transform: translateY(-60px); opacity: 0 } }

/* Fade */
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease }
.fade-enter-from, .fade-leave-to { opacity: 0 }

/* Skeleton */
.skeleton { position:absolute; inset:0; background:linear-gradient(90deg, rgba(0,0,0,.06) 25%, rgba(0,0,0,.09) 37%, rgba(0,0,0,.06) 63%); animation: shimmer 1.2s linear infinite; background-size:400% 100%; }
:global(.dark) .skeleton { background: linear-gradient(90deg, rgba(255,255,255,.06) 25%, rgba(255,255,255,.12) 37%, rgba(255,255,255,.06) 63%); }
@keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }

/* Pills – keep */
.pill { padding:2px 6px; font-size:11px; border-radius:9999px; background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.25); color:#fff; backdrop-filter: blur(6px); }
</style>
