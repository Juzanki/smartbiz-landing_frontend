<template>
  <!-- Mobile: bottom sheet; Desktop: corner panel -->
  <div
    :class="[
      'z-40 text-black dark:text-white',
      isDesktop
        ? 'absolute top-4 right-4'
        : 'fixed bottom-3 left-1/2 -translate-x-1/2 w-[92vw]'
    ]"
    :style="safeArea"
  >
    <div
      class="relative rounded-2xl backdrop-blur-md border border-white/30 bg-white/85 dark:bg-[#151515]/85 shadow-xl overflow-hidden"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <!-- Gradient ring -->
      <span class="pointer-events-none absolute inset-0 rounded-2xl"
            style="mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
                   -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
                   -webkit-mask-composite: xor; mask-composite: exclude;"
            :class="['p-[1px] bg-gradient-to-br from-yellow-300/70 via-amber-500/50 to-pink-500/50']"></span>

      <!-- Header -->
      <header class="relative z-[1] flex items-center justify-between px-4 py-3">
        <div class="flex items-center gap-2">
          <div class="h-8 w-8 grid place-items-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 shadow">🤖</div>
          <div class="leading-tight">
            <h4 class="text-sm font-extrabold">AI Summary</h4>
            <div class="flex items-center gap-2 text-[11px] opacity-70">
              <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
                             online ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500']">
                <span class="w-1.5 h-1.5 rounded-full" :class="online ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                {{ online ? 'Online' : 'Offline' }}
              </span>
              <span v-if="lastUpdated">Updated {{ timeAgo(lastUpdated) }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <button class="btn-icon" :aria-pressed="pinned" @click="togglePin" :title="pinned ? 'Unpin' : 'Pin'">📌</button>
          <button class="btn-icon" @click="copy" title="Copy">📋</button>
          <button class="btn-icon" @click="share" title="Share">📤</button>
          <button class="btn-icon" @click="refresh" :disabled="loading" title="Refresh">
            <span v-if="!loading">🔄</span><span v-else class="animate-spin">⏳</span>
          </button>
          <button class="btn-icon md:hidden" @click="expanded = !expanded" :aria-expanded="expanded" :title="expanded ? 'Collapse' : 'Expand'">
            {{ expanded ? '▾' : '▴' }}
          </button>
        </div>
      </header>

      <!-- Tags row -->
      <div class="px-4 -mt-1 mb-1 flex items-center gap-2 text-[11px]">
        <span v-if="trend" class="chip">🔥 {{ trend }}</span>
        <span v-if="confidence !== null" class="chip">
          Confidence: <b class="ml-1">{{ Math.round(confidence * 100) }}%</b>
        </span>
        <span v-if="sourceName" class="chip">Source: {{ sourceName }}</span>
      </div>

      <!-- Content -->
      <transition name="fade">
        <section
          v-show="expanded || isDesktop"
          class="px-4 pb-4"
          role="status"
          aria-live="polite"
        >
          <!-- Loading skeleton -->
          <div v-if="loading" class="space-y-2">
            <div class="skeleton h-4 w-11/12"></div>
            <div class="skeleton h-4 w-10/12"></div>
            <div class="skeleton h-4 w-8/12"></div>
          </div>

          <!-- Error -->
          <div v-else-if="error" class="text-rose-600 text-sm">
            ⚠ {{ error }} <button class="underline ml-2" @click="refresh">Retry</button>
          </div>

          <!-- Summary -->
          <div v-else class="text-sm leading-relaxed">
            <p :class="clamped ? 'line-clamp-4' : ''">{{ summary }}</p>
            <button
              v-if="needsClamp"
              class="mt-2 text-[12px] underline opacity-80"
              @click="clamped = !clamped"
            >{{ clamped ? 'Read more' : 'Show less' }}</button>
          </div>
        </section>
      </transition>
    </div>
  </div>

  <!-- Toast -->
  <transition name="fade">
    <div v-if="toast" class="fixed left-1/2 -translate-x-1/2 bottom-24 z-[60] bg-black/80 text-white text-xs px-3 py-2 rounded-xl shadow">
      {{ toast }}
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/* Props (override from parent as needed) */
const props = defineProps({
  initial: { type: String, default: 'Loading summary…' },
  autoRefreshMs: { type: Number, default: 30000 },
  sourceName: { type: String, default: 'AI' },
  confidence: { type: Number, default: null }, // 0..1
  trend: { type: String, default: '' },
  pinnedDefault: { type: Boolean, default: false }
})
const emit = defineEmits(['pin', 'refresh', 'share'])

/* State */
const summary = ref(props.initial)
const loading = ref(false)
const error   = ref('')
const lastUpdated = ref(null)
const pinned = ref(props.pinnedDefault)
const expanded = ref(false)
const clamped = ref(true)
const needsClamp = ref(false)
const toast = ref('')

/* Responsiveness */
const isDesktop = computed(() => window.matchMedia?.('(min-width: 768px)').matches)

/* Online status */
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
function onOnline(){ online.value = true }
function onOffline(){ online.value = false }

/* Safe-area */
const safeArea = { paddingBottom: 'env(safe-area-inset-bottom, 0px)', paddingTop: 'env(safe-area-inset-top, 0px)' }

/* Swipe to collapse (mobile) */
let startY = 0, deltaY = 0
function onTouchStart(e){ if (isDesktop.value) return; startY = e.touches[0].clientY }
function onTouchMove(e){ if (isDesktop.value) return; deltaY = e.touches[0].clientY - startY }
function onTouchEnd(){ if (isDesktop.value) return; if (deltaY > 30) expanded.value = false; startY = deltaY = 0 }

/* Helpers */
function timeAgo(ts){
  const s = Math.max(1, Math.floor((Date.now() - new Date(ts).getTime())/1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s/60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m/60); return `${h}h ago`
}
function vibe(ms=8){ try{ navigator.vibrate?.(ms) }catch{} }
function showToast(m){ toast.value = m; vibe(6); setTimeout(()=>toast.value='', 1400) }

/* Copy & Share */
async function copy(){
  try{ await navigator.clipboard.writeText(summary.value); showToast('Copied') }
  catch{ showToast('Copy failed') }
}
async function share(){
  try{
    if (navigator.share) await navigator.share({ title: 'AI Summary', text: summary.value })
    else await navigator.clipboard.writeText(summary.value)
    emit('share', summary.value)
    showToast('Shared')
  }catch{/* user cancelled */}
}

/* Pin toggle */
function togglePin(){
  pinned.value = !pinned.value
  emit('pin', pinned.value)
  showToast(pinned.value ? 'Pinned' : 'Unpinned')
}

/* Fetch summary (👉 badilisha na API yako) */
async function fetchSummary(){
  // TODO: fanya request halisi hapa (REST/WebSocket). Chini ni demo:
  await new Promise(r => setTimeout(r, 500))
  const demos = [
    '🔥 Trending: EcoCup is gaining popularity — CTR up 18% WoW, repeat purchases +9%.',
    '💡 Suggestion: Bundle EcoCup + SmartBag for a 12% higher AOV.',
    '📈 Peak window 7–9pm EAT; try short live at :45 past the hour.'
  ]
  // rotate
  return demos[Math.floor(Math.random()*demos.length)]
}

/* Refresh */
async function refresh(){
  loading.value = true; error.value = ''
  try{
    const txt = await fetchSummary()
    summary.value = txt
    lastUpdated.value = new Date().toISOString()
    needsClamp.value = txt.length > 160
  }catch(e){
    error.value = 'Unable to fetch summary'
  }finally{
    loading.value = false
    emit('refresh')
  }
}

/* Auto-refresh timer */
let t = null
function startTimer(){
  clearInterval(t)
  if (props.autoRefreshMs > 0){
    t = setInterval(() => { if (online.value) refresh() }, props.autoRefreshMs)
  }
}

/* Lifecycle */
onMounted(async ()=>{
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  await refresh()
  startTimer()
})
onBeforeUnmount(()=>{
  clearInterval(t)
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})
</script>

<style scoped>
.btn-icon{ @apply h-8 w-8 grid place-items-center rounded-lg bg-white/30 dark:bg-white/10 hover:bg-white/50 dark:hover:bg-white/20 text-sm }
.chip{ @apply inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 }
.skeleton{ @apply rounded bg-black/10 dark:bg-white/10 animate-pulse }
.line-clamp-4{
  display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden;
}
.fade-enter-active,.fade-leave-active{ transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to{ opacity:0 }
</style>
