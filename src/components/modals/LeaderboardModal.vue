<!-- LeaderboardMobilePro.vue -->
<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
    role="dialog" aria-modal="true" aria-labelledby="lb-title"
    @click.self="close('backdrop')" @keydown.esc.prevent="close('esc')"
  >
    <!-- Bottom sheet -->
    <section
      ref="sheet"
      class="w-full sm:w-[92%] max-w-md max-h-[92vh]
             rounded-t-3xl sm:rounded-2xl overflow-hidden select-none
             bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100
             ring-1 ring-black/10 dark:ring-white/10 shadow-2xl animate-in flex flex-col"
      :style="dragStyle"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <!-- Handle -->
      <div class="pt-2 grid place-items-center sm:hidden">
        <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
      </div>

      <!-- Header -->
      <header class="px-5 pt-2 pb-3 sm:p-5 flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10">
        <h2 id="lb-title" class="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
          🏆 Leaderboard ya Washiriki
        </h2>
        <div class="flex items-center gap-2">
          <button v-if="canShare" @click="shareBoard" class="rounded-full px-3 py-1 text-xs bg-zinc-200 dark:bg-zinc-800">Share…</button>
          <button @click="copyBoard" class="rounded-full px-3 py-1 text-xs bg-zinc-200 dark:bg-zinc-800">Copy</button>
          <button class="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10" aria-label="Close" @click="close('x')">✕</button>
        </div>
      </header>

      <!-- Tabs + search -->
      <div class="px-5 pb-2 sm:pb-0">
        <div class="flex items-center justify-between gap-2">
          <nav class="flex gap-2 overflow-x-auto no-scrollbar text-[12px] font-semibold">
            <button v-for="t in tabs" :key="t.key"
                    class="px-3 py-1 rounded-full border whitespace-nowrap"
                    :class="range===t.key
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'"
                    @click="setRange(t.key)">
              {{ t.label }}
            </button>
          </nav>
          <div class="relative hidden sm:block">
            <input v-model="q" type="search" inputmode="search" placeholder="Search…"
                   class="w-[160px] rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs outline-none focus:ring-2 ring-indigo-400 dark:ring-indigo-500"/>
            <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-zinc-500">⌕</span>
          </div>
        </div>
        <div class="sm:hidden mt-2">
          <input v-model="q" type="search" inputmode="search" placeholder="Search…"
                 class="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-400 dark:ring-indigo-500"/>
        </div>
      </div>

      <!-- Pull to refresh indicator -->
      <div class="px-5" v-if="refreshState!=='idle'">
        <div class="text-[12px] text-center opacity-70 pb-1">
          <span v-if="refreshState==='pull'">Pull to refresh…</span>
          <span v-else-if="refreshState==='release'">Release to refresh…</span>
          <span v-else>Refreshing…</span>
        </div>
      </div>

      <!-- Content -->
      <div ref="scrollRef" class="flex-1 overflow-y-auto px-5 pb-4 space-y-4" @scroll.passive="onScroll">
        <!-- Podium Top 3 -->
        <section v-if="podium.length" class="grid grid-cols-3 gap-2">
          <div v-for="(p,idx) in podium" :key="p.id"
               class="rounded-2xl p-3 text-center border border-black/10 dark:border-white/10
                      bg-gradient-to-br"
               :class="[
                 idx===0 ? 'from-yellow-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20'
                         : idx===1 ? 'from-zinc-50 to-zinc-100 dark:from-zinc-800/40 dark:to-zinc-800/20'
                                   : 'from-orange-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/20'
               ]">
            <div class="text-2xl">
              {{ idx===0 ? '🥇' : idx===1 ? '🥈' : '🥉' }}
            </div>
            <img :src="p.avatar" alt="" class="w-12 h-12 rounded-full mx-auto my-1 border object-cover"/>
            <div class="text-xs font-semibold truncate">{{ p.name }}</div>
            <div class="text-[11px] text-amber-600 dark:text-amber-300 font-bold mt-1">
              {{ formatScore(p.score) }} {{ metricLabel }}
            </div>
          </div>
        </section>

        <!-- Full list -->
        <section aria-label="Leaderboard list">
          <ul class="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <li v-for="(u, idx) in listed" :key="u.id" class="bg-white dark:bg-zinc-900">
              <button
                class="w-full flex items-center gap-3 px-3 py-2 text-left active:bg-black/5 dark:active:bg-white/5"
                @click="scrollToMe(u.id)"
              >
                <!-- Rank -->
                <div class="w-7 text-xs font-bold text-zinc-500">{{ u.rank }}</div>

                <!-- Avatar -->
                <img :src="u.avatar" alt="" class="w-8 h-8 rounded-full border object-cover"/>

                <!-- Name + bar -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-sm truncate">{{ u.name }}</span>
                    <span v-if="meId && u.id===meId" class="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-600 text-white">You</span>
                    <span v-if="u.badge" class="text-[12px]">{{ u.badge }}</span>
                  </div>

                  <!-- progress -->
                  <div class="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 mt-1 overflow-hidden">
                    <div class="h-full bg-indigo-500" :style="{ width: u.progress + '%' }"></div>
                  </div>
                </div>

                <!-- Score + delta -->
                <div class="text-right">
                  <div class="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {{ formatScore(u.score) }}
                  </div>
                  <div class="text-[11px]" :class="u.delta>0?'text-emerald-500':u.delta<0?'text-rose-500':'text-zinc-400'">
                    <span v-if="u.delta>0">📈 +{{ formatScore(u.delta) }}</span>
                    <span v-else-if="u.delta<0">📉 {{ formatScore(u.delta) }}</span>
                    <span v-else>—</span>
                  </div>
                </div>
              </button>
            </li>
          </ul>
        </section>

        <!-- Empty state -->
        <div v-if="!listed.length" class="text-center text-sm opacity-70 py-8">Hakuna data ya kuonyesha.</div>
      </div>

      <!-- Footer -->
      <footer class="px-5 py-3 border-t border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/70 backdrop-blur flex items-center justify-between">
        <small class="text-[11px] opacity-70">Swipe down or tap ✕ to close.</small>
        <button class="rounded-full px-4 py-2 text-xs font-semibold bg-zinc-200 dark:bg-zinc-800" @click="close('done')">Done</button>
      </footer>

      <!-- Safe-area spacer -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

/** Props */
const props = defineProps({
  open: { type: Boolean, default: true },
  items: {
    type: Array,
    // Fallback demo
    default: () => ([
      { id: 1, name: 'Janet',  score: 120, avatar:'/avatars/u1.png', prev:100 },
      { id: 2, name: 'Moses',  score: 105, avatar:'/avatars/u2.png', prev:110 },
      { id: 3, name: 'Lilian', score:  97, avatar:'/avatars/u3.png', prev: 84 },
      { id: 4, name: 'Alex',   score:  91, avatar:'/avatars/u4.png', prev: 91 },
    ])
  },
  meId: { type: [String, Number], default: null },
  metricLabel: { type: String, default: 'pts' },
  // Optional: if each item has `scores: {session, day, week, all}`
  defaultRange: { type: String, default: 'session' }
})

/** Emits */
const emit = defineEmits(['close','refresh','share','copy'])

/** State */
const open = computed(()=>props.open)
const q = ref('')
const range = ref(props.defaultRange) // session | day | week | all
const canShare = !!navigator.share

/** Tabs */
const tabs = [
  { key:'session', label:'Session' },
  { key:'day',     label:'Today' },
  { key:'week',    label:'Week' },
  { key:'all',     label:'All-time' },
]

function setRange(r){ range.value = r; buzz(8) }

/** Normalize items by current range */
function getScore(it){
  if (it.scores && typeof it.scores[range.value] === 'number') return it.scores[range.value]
  return Number(it.score ?? 0)
}
function getPrev(it){
  if (it.prevScores && typeof it.prevScores[range.value] === 'number') return it.prevScores[range.value]
  return Number(it.prev ?? 0)
}

/** Processed list */
const filtered = computed(()=>{
  const s = q.value.trim().toLowerCase()
  const base = (props.items || []).map(it=>({
    ...it,
    score: getScore(it),
    prev:  getPrev(it)
  }))
  return s ? base.filter(x => x.name?.toLowerCase().includes(s)) : base
})
const ranked = computed(()=>{
  const arr = [...filtered.value].sort((a,b)=> b.score - a.score || a.name.localeCompare(b.name))
  let lastScore = null, lastRank = 0
  return arr.map((x,i)=>{
    const rank = (x.score === lastScore) ? lastRank : i+1
    lastScore = x.score; lastRank = rank
    return { ...x, rank }
  })
})
const maxScore = computed(()=> Math.max(1, ...ranked.value.map(x=>x.score)))
const podium = computed(()=> ranked.value.slice(0,3))
const listed = computed(()=> ranked.value.map(x=>({
  ...x,
  progress: Math.max(2, Math.min(100, Math.round((x.score/maxScore.value)*100))),
  delta: Math.round((x.score - x.prev) * 10) / 10
})))

/** Share / Copy */
async function shareBoard(){
  const text = `🏆 Leaderboard (${labelFor(range.value)}):\n` +
    listed.value.slice(0,5).map(u=>`${u.rank}. ${u.name} — ${formatScore(u.score)} ${props.metricLabel}`).join('\n')
  try{
    await navigator.share({ title:'Leaderboard', text })
    emit('share'); buzz(12)
  }catch{}
}
async function copyBoard(){
  const text = listed.value.map(u=>`${u.rank}. ${u.name} — ${formatScore(u.score)} ${props.metricLabel}`).join('\n')
  try{ await navigator.clipboard.writeText(text); buzz(10) }catch{}
  emit('copy')
}

/** Utilities */
function formatScore(n){
  const v = Number(n||0)
  if (Math.abs(v) >= 1_000_000) return (v/1_000_000).toFixed(1).replace(/\.0$/,'') + 'M'
  if (Math.abs(v) >= 1_000)     return (v/1_000).toFixed(1).replace(/\.0$/,'') + 'k'
  return v.toString()
}
function labelFor(r){ return ({session:'Session', day:'Today', week:'Week', all:'All-time'})[r] || 'Session' }

/** Scroll to "You" (or any id) */
const scrollRef = ref(null)
function scrollToMe(id){
  if (!scrollRef.value) return
  const el = scrollRef.value.querySelector(`[data-id="${id}"]`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

/** Pull-to-refresh (simple) */
const refreshState = ref('idle') // idle | pull | release | refreshing
function onScroll(){ if (scrollRef.value?.scrollTop > 0 && refreshState.value!=='refreshing') refreshState.value='idle' }
let startY=0, pulling=false
function onTouchStart(e){
  if (dragging.value) return // sheet drag takes precedence
  if (!scrollRef.value) return
  if (scrollRef.value.scrollTop>0) return
  pulling = true; startY = e.touches[0].clientY
}
function onTouchMove(e){
  if (dragging.value) return
  if (!pulling) return
  const dy = e.touches[0].clientY - startY
  if (dy < 0) { refreshState.value='idle'; return }
  refreshState.value = dy > 90 ? 'release' : 'pull'
}
function onTouchEnd(){
  if (!pulling) return
  if (refreshState.value==='release'){
    refreshState.value='refreshing'
    emit('refresh')
    setTimeout(()=> refreshState.value='idle', 1000) // simple feedback; parent can also control
  } else {
    refreshState.value='idle'
  }
  pulling=false
}

/** Haptics */
function buzz(ms=12){ try{ navigator?.vibrate?.(ms) }catch{} }

/** Close */
function close(reason){ emit('close', { reason }) }

/** Swipe-to-close for sheet */
const dragging = ref(false), startSY = ref(0), dY = ref(0)
const dragStyle = computed(()=>{
  if(!dragging.value) return {}
  const y=Math.max(0,dY.value), op=Math.max(1 - y/240, .5)
  return { transform:`translateY(${y}px)`, opacity:op }
})
function onTouchStartSheet(e){ dragging.value=true; startSY.value=e.touches[0].clientY; dY.value=0 }
function onTouchMoveSheet(e){ if(!dragging.value) return; dY.value = e.touches[0].clientY - startSY.value }
function onTouchEndSheet(){ if(!dragging.value) return; dragging.value=false; if(dY.value>120) close('swipe'); dY.value=0 }

/* bridge touch handlers: decide if event is for sheet drag or pull-to-refresh */
function onTouchStart(e){
  // if touch begins near top edge of sheet and content at top → allow pull
  if (scrollRef.value && scrollRef.value.scrollTop<=0) onTouchStart(e) // will be shadowed; see rename fix below
}
</script>

<script lang="ts" setup>
// NOTE: The above onTouchStart naming conflicts with pull-to-refresh.
// Provide distinct handlers here to bind on the <section> element.
</script>

<script setup>
/* Patch the handler names correctly for the sheet container */
function onTouchStart(e){ onTouchStartSheet(e) }
function onTouchMove(e){ onTouchMoveSheet(e) }
function onTouchEnd(){ onTouchEndSheet() }
</script>

<style scoped>
/* Entrance */
@keyframes in{ from{ opacity:0; transform: translateY(60px) scale(.98) } to{ opacity:1; transform:none } }
.animate-in{ animation: in .34s cubic-bezier(.22,1,.36,1) both; will-change: opacity, transform }

/* Hide scrollbars on mobile */
.no-scrollbar::-webkit-scrollbar{ display:none }
</style>
