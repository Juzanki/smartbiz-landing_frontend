<template>
  <article
    v-if="!loading"
    ref="root"
    class="relative overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0b1020] shadow-lg active:scale-[.99] transition"
    role="button"
    :aria-label="ariaLabel"
    tabindex="0"
    @click="onJoin"
    @keydown.enter.space.prevent="onJoin"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
  >
    <!-- Hero / Thumbnail -->
    <div class="relative aspect-video w-full overflow-hidden">
      <img
        :src="thumbnail"
        alt=""
        class="h-full w-full object-cover"
        loading="lazy"
        @error="onImgError"
      />
      <!-- Gradient guard -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none"></div>

      <!-- LIVE badge -->
      <div class="absolute top-2 left-2 flex items-center gap-2">
        <span class="live-dot"></span>
        <span class="px-2 py-0.5 rounded-full text-[11px] font-bold text-white bg-red-600/90 shadow">
          LIVE
        </span>
        <span v-if="rank" class="px-2 py-0.5 rounded-full text-[10px] font-bold text-yellow-900 bg-yellow-300/90 shadow">
          🔥 #{{ rank }}
        </span>
      </div>

      <!-- Host -->
      <div class="absolute top-2 right-2 flex items-center gap-2 bg-black/40 backdrop-blur px-2 py-1 rounded-full border border-white/15">
        <img :src="avatar" alt="" class="h-6 w-6 rounded-full object-cover ring-1 ring-white/40" @error="onImgError" />
        <span class="text-xs text-white font-semibold truncate max-w-[40vw]">{{ hostName }}</span>
        <span v-if="verified" class="text-yellow-300">✔</span>
      </div>

      <!-- Bottom stats strip (over image) -->
      <div class="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-[11px]">
        <span class="stat-pill">👁️ {{ compact(viewerCount) }}</span>
        <span class="stat-pill">💬 {{ compact(chatCount) }}</span>
        <span class="stat-pill">🎁 {{ compact(giftCount) }}</span>
        <span class="ml-auto stat-pill" v-if="status==='live'">⏱ {{ liveFor }}</span>
        <span class="ml-auto stat-pill" v-else-if="status==='scheduled'">⏳ {{ countdown }}</span>
      </div>
    </div>

    <!-- Body -->
    <div class="p-3">
      <h3 class="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2">
        {{ title || `📺 Live Now` }}
      </h3>
      <p class="mt-1 text-[12px] text-slate-600 dark:text-slate-300 line-clamp-2">
        🎤 {{ hostName }} {{ status==='live' ? 'is now live!' : status==='scheduled' ? 'starts soon' : 'is offline' }}
      </p>

      <!-- Actions -->
      <div class="mt-3 flex items-center gap-2">
        <button
          class="flex-1 h-10 rounded-full text-sm font-semibold text-white
                 bg-gradient-to-b from-rose-500 to-red-600 shadow-lg border border-white/10
                 active:translate-y-[1px]"
          @click.stop="onJoin"
        >
          {{ ctaText }}
        </button>

        <button
          class="h-10 w-10 rounded-full grid place-items-center bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10"
          title="Share"
          @click.stop="onShare"
        >📤</button>

        <button
          v-if="status==='scheduled'"
          class="h-10 w-10 rounded-full grid place-items-center bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10"
          :title="reminded ? 'Reminder set' : 'Remind me'"
          @click.stop="toggleReminder"
        >{{ reminded ? '🔔' : '🛎️' }}</button>
      </div>
    </div>

    <!-- Ripples -->
    <span
      v-for="r in ripples"
      :key="r.id"
      class="ripple"
      :style="{ left: r.x+'px', top: r.y+'px' }"
      aria-hidden="true"
    />
  </article>

  <!-- Skeleton -->
  <div v-else class="rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-white dark:bg-[#0b1020]">
    <div class="aspect-video skeleton"></div>
    <div class="p-3 space-y-2">
      <div class="h-4 w-2/3 skeleton"></div>
      <div class="h-3 w-4/5 skeleton"></div>
      <div class="mt-3 h-10 w-full skeleton rounded-full"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

/** PROPS */
const props = defineProps({
  hostName:    { type: String, default: 'Host' },
  viewerCount: { type: Number, default: 0 },
  chatCount:   { type: Number, default: 0 },
  giftCount:   { type: Number, default: 0 },
  title:       { type: String, default: '' },
  routeTo:     { type: String, default: '/live-stream' },
  thumbnail:   { type: String, default: '/images/placeholder-live.jpg' },
  avatar:      { type: String, default: '/avatars/host.png' },
  verified:    { type: Boolean, default: true },
  live:        { type: Boolean, default: true },
  scheduledAt: { type: [Number, String, Date], default: null },
  startedAt:   { type: [Number, String, Date], default: null },
  endedAt:     { type: [Number, String, Date], default: null },
  rank:        { type: Number, default: 0 },
  loading:     { type: Boolean, default: false },
})

/** EMITS */
const emit = defineEmits(['join','share','remind'])

/** ROUTER */
const router = useRouter()

/** STATE */
const root = ref(null)
const ripples = ref([])
let pressTimer = null
let clock = null
const now = ref(Date.now())
const reminded = ref(false)

/** STATUS */
function toMs(v){ if (!v) return null; return (v instanceof Date) ? v.getTime() : +new Date(v) }
const startMs = computed(() => toMs(props.scheduledAt))
const startLiveMs = computed(() => toMs(props.startedAt))
const endMs = computed(() => toMs(props.endedAt))

const status = computed(() => {
  if (props.live) return 'live'
  if (startMs.value && startMs.value > now.value) return 'scheduled'
  if (endMs.value && endMs.value <= now.value) return 'ended'
  return 'offline'
})

/** TEXTS */
const countdown = computed(() => {
  if (!startMs.value) return 'soon'
  const s = Math.max(0, Math.floor((startMs.value - now.value)/1000))
  const m = Math.floor(s/60), h = Math.floor(m/60)
  if (h) return `${h}h ${m%60}m`
  if (m) return `${m}m ${s%60}s`
  return `${s}s`
})
const liveFor = computed(() => {
  const base = startLiveMs.value || Date.now()
  const s = Math.max(0, Math.floor((now.value - base)/1000))
  const m = Math.floor(s/60), h = Math.floor(m/60)
  if (h) return `${h}h ${m%60}m`
  if (m) return `${m}m ${s%60}s`
  return `${s}s`
})
const ctaText = computed(() =>
  status.value === 'scheduled' ? 'Set Reminder' :
  status.value === 'ended' ? 'Watch Replay' : 'Join Stream'
)
const ariaLabel = computed(() => {
  if (status.value==='live') return `Live now by ${props.hostName}, ${props.viewerCount} watching. Tap to join`
  if (status.value==='scheduled') return `${props.hostName} goes live in ${countdown.value}. Tap to set reminder`
  if (status.value==='ended') return `${props.hostName} ended live. Tap to watch replay`
  return `Stream by ${props.hostName}`
})

/** CLOCK */
onMounted(() => { clock = setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => { clearInterval(clock) })

/** ACTIONS */
function onJoin(){
  vibrate(12)
  if (status.value === 'scheduled') { toggleReminder(); return }
  if (props.routeTo) router.push(props.routeTo)
  emit('join')
}
function onShare(){
  vibrate(8)
  const shareData = { title: props.title || 'Join my LIVE', text:`${props.hostName} is live now!`, url: location.href }
  if (navigator.share) navigator.share(shareData).catch(()=>{})
  else navigator.clipboard?.writeText(shareData.url)
  emit('share')
}
function toggleReminder(){
  reminded.value = !reminded.value
  try {
    if ('Notification' in window && Notification.permission !== 'denied') Notification.requestPermission?.()
  } catch {}
  emit('remind', { at: startMs.value, on: reminded.value })
}

/** RIPPLE + HAPTICS */
let rippleId = 0
function onPointerDown(e){
  addRipple(e)
  pressTimer = setTimeout(() => vibrate(18), 350) // long-press buzz
}
function onPointerUp(){ if (pressTimer) clearTimeout(pressTimer) }
function onPointerCancel(){ if (pressTimer) clearTimeout(pressTimer) }
function addRipple(e){
  const rect = root.value.getBoundingClientRect()
  const x = (e.clientX ?? rect.right - 12) - rect.left
  const y = (e.clientY ?? rect.bottom - 12) - rect.top
  const id = ++rippleId
  ripples.value.push({ id, x, y })
  setTimeout(() => ripples.value = ripples.value.filter(r => r.id !== id), 500)
}
function vibrate(ms=10){ try { navigator.vibrate?.(ms) } catch {} }

/** UTILS */
function compact(n){
  if (n >= 1e9) return (n/1e9).toFixed(1)+'B'
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M'
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K'
  return String(n ?? 0)
}
function onImgError(e){ e.target.style.opacity = .5 }
</script>

<style scoped>
/* Live dot pulse */
.live-dot {
  height: 10px; width: 10px; border-radius: 9999px; background: #ef4444;
  box-shadow: 0 0 0 0 rgba(239,68,68,.6); margin-right: 6px;
  animation: pulse 1.2s infinite;
}
@keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(239,68,68,.6)} 70%{box-shadow:0 0 0 8px rgba(239,68,68,0)} 100%{box-shadow:0 0 0 0 rgba(239,68,68,0)} }

/* Stat pill */
.stat-pill{
  padding: 4px 8px; border-radius: 9999px; color: #fff;
  background: rgba(0,0,0,.35); border: 1px solid rgba(255,255,255,.25);
  backdrop-filter: blur(6px);
}

/* Ripple */
.ripple {
  position: absolute; pointer-events: none; height: 10px; width: 10px;
  border-radius: 9999px; background: rgba(255,255,255,.6);
  transform: translate(-50%,-50%) scale(0);
  animation: ripple .5s ease-out forwards;
}
@keyframes ripple { to { transform: translate(-50%,-50%) scale(10); opacity: 0 } }

/* Skeleton */
.skeleton {
  position: relative;
  background: linear-gradient(90deg, rgba(0,0,0,.06) 25%, rgba(0,0,0,.09) 37%, rgba(0,0,0,.06) 63%);
  animation: shimmer 1.2s linear infinite; background-size: 400% 100%;
}
.dark .skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,.06) 25%, rgba(255,255,255,.12) 37%, rgba(255,255,255,.06) 63%);
}
@keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }

/* Reduce motion */
@media (prefers-reduced-motion: reduce){
  * { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
</style>
