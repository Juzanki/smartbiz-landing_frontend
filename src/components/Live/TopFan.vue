<!-- TopFansRoyal.vue -->
<template>
  <!-- 👑 Royal FAB -->
  <div
    class="fixed z-50 inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] flex justify-center"
    role="group" aria-label="Top fans control"
  >
    <button
      @click="openSheet()"
      class="relative inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold
             text-white shadow-xl ring-1 ring-white/20
             bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-600
             active:scale-[.98] transition"
    >
      <span class="relative">
        <span class="absolute -inset-1 blur-md bg-white/20 rounded-full"></span>
        <span class="relative">👑</span>
      </span>
      <span>Top Fans</span>

      <!-- ping for new data -->
      <span v-if="hasNewData" class="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400">
        <span v-if="!reducedMotion" class="absolute inset-0 rounded-full bg-amber-400 animate-ping"></span>
      </span>
    </button>
  </div>

  <!-- 🧾 Bottom Sheet -->
  <div
    v-if="open"
    class="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm"
    role="dialog" aria-modal="true" aria-labelledby="tf-title"
    @click.self="closeSheet('backdrop')" @keydown.esc.prevent="closeSheet('esc')"
  >
    <section
      ref="sheetRef"
      class="absolute inset-x-0 bottom-0 w-full max-h-[86vh]
             sm:right-4 sm:left-auto sm:w-[420px] sm:bottom-6 sm:rounded-2xl
             rounded-t-2xl bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100
             ring-1 ring-black/10 dark:ring-white/10 shadow-2xl overflow-hidden"
      :style="dragStyle" @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend.passive="onTouchEnd"
    >
      <!-- handle -->
      <div class="sm:hidden pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
      </div>

      <!-- header -->
      <header class="px-4 pt-2 pb-3 sm:p-4 flex items-center justify-between gap-2">
        <div>
          <h3 id="tf-title" class="text-base font-bold">
            <span class="mr-1">👑</span> Royal Top Fans
          </h3>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
            {{ visibleFans.length }} of {{ totalFans }} fans
          </p>
        </div>
        <button class="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Close" @click="closeSheet('x')">✕</button>
      </header>

      <!-- toolbar -->
      <div class="px-4 pb-2 flex items-center gap-2">
        <div class="relative flex-1">
          <input v-model="query" type="search" inputmode="search" placeholder="Search username…"
                 class="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm outline-none
                        focus:ring-2 ring-indigo-400 dark:ring-indigo-500"
                 aria-label="Search fans"/>
          <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">⌕</span>
        </div>

        <select v-model="sortBy" class="rounded-xl bg-zinc-100 dark:bg-zinc-800 px-2 py-2 text-xs" aria-label="Sort">
          <option value="rank">Rank</option>
          <option value="gifts">Gifts</option>
          <option value="likes">Likes</option>
          <option value="views">Views</option>
          <option value="recent">Recent</option>
        </select>

        <select v-model="range" class="rounded-xl bg-zinc-100 dark:bg-zinc-800 px-2 py-2 text-xs" aria-label="Time range">
          <option value="all">All-time</option>
          <option value="30d">30d</option>
          <option value="7d">7d</option>
          <option value="24h">24h</option>
        </select>
      </div>

      <!-- list -->
      <div class="px-4 pb-3">
        <ul class="space-y-2 max-h-[58vh] overflow-y-auto tf-scroll">
          <li v-if="loading" v-for="n in 6" :key="n" class="skeleton"/>
          <li v-else-if="visibleFans.length===0" class="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No fans found.
          </li>

          <li v-for="(fan, idx) in visibleFans" :key="fan.username"
              class="flex items-center justify-between gap-3 rounded-xl px-3 py-2
                     bg-gray-50 dark:bg-white/5 ring-1 ring-black/10 dark:ring-white/10"
              @touchstart.passive="onItemTouchStart($event, fan)" @touchmove.passive="onItemTouchMove($event, fan)" @touchend.passive="onItemTouchEnd($event, fan)"
              :style="itemStyle(fan)">
            <!-- left -->
            <div class="flex items-center gap-3 min-w-0">
              <div class="relative">
                <img v-if="fan.avatar" :src="fan.avatar" alt="" class="h-9 w-9 rounded-full object-cover ring-2 ring-indigo-500/40"/>
                <div v-else class="h-9 w-9 rounded-full grid place-items-center bg-indigo-100 text-indigo-600 font-bold ring-2 ring-indigo-500/40">
                  {{ initials(fan.username) }}
                </div>
                <!-- crown for top 3 -->
                <span v-if="idx<3" class="absolute -top-2 -right-1 text-base select-none">👑</span>
              </div>

              <div class="min-w-0">
                <p class="text-sm font-semibold truncate">
                  <span class="text-zinc-900 dark:text-zinc-100">{{ fan.username }}</span>
                  <span v-if="fan.badge" class="ml-1 text-[11px] align-middle">{{ fan.badge }}</span>
                </p>
                <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {{ shortNum(fan.gifts) }} gifts • {{ shortNum(fan.likes) }} likes • {{ shortNum(fan.views) }} views
                </p>
              </div>
            </div>

            <!-- right: points + quick actions -->
            <div class="shrink-0 text-right">
              <div class="text-pink-500 dark:text-pink-400 text-sm font-bold">{{ formatPoints(fan.totalPoints) }}</div>
              <div class="mt-1 flex items-center gap-2">
                <button class="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
                        @click="featureFan(fan)" aria-label="Feature fan">✨ Feature</button>
                <button class="rounded-full px-2.5 py-1 text-[11px] font-semibold bg-zinc-200 dark:bg-zinc-800"
                        @click="openProfile(fan)" aria-label="Open profile">↗</button>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <!-- footer -->
      <footer class="px-4 py-3 border-t border-black/10 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur">
        <div class="flex items-center justify-between gap-2">
          <small class="text-[11px] text-zinc-500 dark:text-zinc-400">Swipe → to Feature, ← to Hide.</small>
          <div class="flex items-center gap-2">
            <button class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    @click="featureTop3">Feature Top 3</button>
            <button class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-200 dark:bg-zinc-800"
                    @click="closeSheet('done')">Done</button>
          </div>
        </div>
      </footer>

      <!-- safe-area spacer -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
    </section>
  </div>

  <!-- SR-only summary -->
  <p class="sr-only" aria-live="polite">{{ srText }}</p>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/** Props (could be fed from backend) */
const props = defineProps({
  fans: { type: Array, default: () => ([
    { username: 'Juzanki', gifts: 15000, likes: 400, views: 80, badge: '💎' },
    { username: 'VIPQueen', gifts: 8000, likes: 1000, views: 60, badge: '🥈' },
    { username: 'SmartViewer', gifts: 0, likes: 300, views: 100, badge: '🎖' },
    { username: 'SilentFan', gifts: 0, likes: 0, views: 1000 }
  ])},
  weights: { type: Object, default: () => ({ gifts: 5, likes: 2, views: 1 }) },
  range: { type: String, default: 'all' }, // reactive with v-model if parent wants
})

/* Emits */
const emit = defineEmits(['feature', 'hide', 'open-profile', 'close'])

/* UI state */
const open = ref(false)
const query = ref('')
const sortBy = ref('rank')
const range = ref(props.range)
const loading = ref(false)
const hasNewData = ref(true)
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

/* FAB -> open */
function openSheet(){ open.value = true; hasNewData.value = false; buzz(12) }
function closeSheet(reason){ open.value = false; emit('close', { reason }) }

/* Compute + sort */
const scored = computed(() =>
  (props.fans || []).map(f => ({
    ...f,
    totalPoints: (f.gifts||0)*props.weights.gifts + (f.likes||0)*props.weights.likes + (f.views||0)*props.weights.views
  }))
)

const filteredByQuery = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? scored.value.filter(f => f.username?.toLowerCase().includes(q)) : scored.value
})

const sorted = computed(() => {
  const list = [...filteredByQuery.value]
  switch (sortBy.value) {
    case 'gifts': list.sort((a,b)=>(b.gifts||0)-(a.gifts||0)); break
    case 'likes': list.sort((a,b)=>(b.likes||0)-(a.likes||0)); break
    case 'views': list.sort((a,b)=>(b.views||0)-(a.views||0)); break
    case 'recent': list.sort((a,b)=> (b.updatedAt||0) - (a.updatedAt||0)); break
    default: list.sort((a,b)=> (b.totalPoints||0)-(a.totalPoints||0))
  }
  return list
})

const visibleFans = computed(() => sorted.value.slice(0, 99))
const totalFans = computed(() => (props.fans||[]).length)
const srText = computed(() => `Top fans visible: ${visibleFans.value.length} of ${totalFans.value}`)

/* Actions */
function featureFan(f){ buzz(18); emit('feature', f) }
function openProfile(f){ buzz(10); emit('open-profile', f) }
function featureTop3(){ visibleFans.value.slice(0,3).forEach(featureFan) }

/* Formatters */
function shortNum(v){ v=Number(v||0); if(v>=1e6) return (v/1e6).toFixed(1).replace(/\.0$/,'')+'M'
  if(v>=1e3) return (v/1e3).toFixed(1).replace(/\.0$/,'')+'K'; return v.toString() }
function formatPoints(n){ if(n>=1e9) return (n/1e9).toFixed(1).replace(/\.0$/,'')+'B'
  if(n>=1e6) return (n/1e6).toFixed(1).replace(/\.0$/,'')+'M'
  if(n>=1e3) return (n/1e3).toFixed(1).replace(/\.0$/,'')+'k'; return n.toString() }
function initials(name=''){ return (name.trim().split(/\s+/).map(p=>p[0]).join('').slice(0,2)||'U').toUpperCase() }

/* Haptics */
function buzz(ms=14){ try{ navigator?.vibrate?.(ms) }catch{} }

/* Swipe sheet */
const startY = ref(0), dY = ref(0), dragging = ref(false)
const dragStyle = computed(()=>{
  if(!dragging.value) return {}
  const y=Math.max(0,dY.value), op=Math.max(1-y/240,.5)
  return { transform:`translateY(${y}px)`, opacity:op }
})
function onTouchStart(e){ if(e.touches?.length!==1) return; dragging.value=true; startY.value=e.touches[0].clientY; dY.value=0 }
function onTouchMove(e){ if(!dragging.value) return; dY.value=e.touches[0].clientY-startY.value }
function onTouchEnd(){ if(!dragging.value) return; dragging.value=false; if(dY.value>120) closeSheet('swipe'); dY.value=0 }

/* Swipe item */
const touch = ref({ id:null, startX:0, dx:0 })
function onItemTouchStart(e,f){ if(e.touches?.length!==1) return; touch.value={ id:f.username, startX:e.touches[0].clientX, dx:0 } }
function onItemTouchMove(e,f){ if(touch.value.id!==f.username) return; touch.value.dx=e.touches[0].clientX-touch.value.startX }
function onItemTouchEnd(e,f){
  if(touch.value.id!==f.username) return
  const dx=touch.value.dx; touch.value={ id:null,startX:0,dx:0 }
  if(Math.abs(dx)>110){ if(dx>0) featureFan(f); else emit('hide', f) }
}
function itemStyle(f){
  const active = touch.value.id===f.username
  if(!active) return {}
  const x=touch.value.dx, op=Math.max(1-Math.abs(x)/240,.35)
  return { transform:`translateX(${x}px)`, opacity:op }
}

/* Simulate loading on mount (for shimmer) */
let loadTimer=null
onMounted(()=>{ loading.value=true; loadTimer=setTimeout(()=>loading.value=false, 600) })
onBeforeUnmount(()=>{ if(loadTimer) clearTimeout(loadTimer) })
</script>

<style scoped>
.tf-scroll::-webkit-scrollbar{ width:6px }
.tf-scroll::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.25); border-radius:10px }

/* skeleton shimmer */
.skeleton{
  height:56px; border-radius:12px; position:relative; overflow:hidden;
  background: linear-gradient(90deg, rgba(0,0,0,.06), rgba(0,0,0,.1), rgba(0,0,0,.06));
}
.skeleton::after{
  content:''; position:absolute; inset:0; transform:translateX(-100%);
  background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.45), rgba(255,255,255,0));
  animation: shimmer 1.2s infinite;
}
@keyframes shimmer{ 100%{ transform: translateX(100%) } }

/* reduced motion */
@media (prefers-reduced-motion: reduce){
  .animate-ping{ animation: none !important; }
  .skeleton::after{ animation: none !important; }
}
</style>
