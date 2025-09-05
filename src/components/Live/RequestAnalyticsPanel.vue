<!-- JoinRequestsSheet.vue -->
<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 bg-black/55 sm:bg-black/40 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="jr-title"
    @click.self="close('backdrop')"
    @keydown.esc.prevent="close('esc')"
  >
    <!-- Bottom sheet -->
    <section
      ref="sheet"
      class="absolute inset-x-0 bottom-0 sm:right-4 sm:left-auto sm:bottom-6
             w-full sm:w-[380px] max-h-[86vh] sm:max-h-[78vh]
             bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100
             rounded-t-2xl sm:rounded-2xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10
             overflow-hidden"
      :style="dragStyle"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <!-- Drag handle -->
      <div class="sm:hidden pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
      </div>

      <!-- Header -->
      <header class="px-4 pt-2 pb-3 sm:p-4 flex items-center justify-between gap-2">
        <div>
          <h3 id="jr-title" class="text-base font-bold text-indigo-600 dark:text-indigo-400">📊 Join Requests</h3>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-400">{{ filtered.length }} request(s)</p>
        </div>
        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Close"
          @click="close('x')"
        >✕</button>
      </header>

      <!-- Tools -->
      <div class="px-4 pb-2 flex items-center gap-2">
        <div class="relative flex-1">
          <input
            v-model="query"
            type="search"
            inputmode="search"
            placeholder="Search name…"
            class="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm outline-none
                   focus:ring-2 ring-indigo-400 dark:ring-indigo-500"
            aria-label="Search requests"
          />
          <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">⌕</span>
        </div>

        <select
          v-model="sortBy"
          class="rounded-xl bg-zinc-100 dark:bg-zinc-800 px-2 py-2 text-xs"
          aria-label="Sort"
        >
          <option value="recent">Recent</option>
          <option value="oldest">Oldest</option>
          <option value="followers">Followers</option>
          <option value="priority">Priority</option>
        </select>
      </div>

      <!-- Tabs (All / VIP) -->
      <div class="px-4 pb-2 flex items-center gap-2 text-[12px]">
        <button
          class="px-3 py-1 rounded-full"
          :class="tab==='all' ? 'bg-indigo-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800'"
          @click="tab='all'"
        >All</button>
        <button
          class="px-3 py-1 rounded-full"
          :class="tab==='vip' ? 'bg-indigo-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800'"
          @click="tab='vip'"
        >VIP</button>
      </div>

      <!-- List -->
      <ul
        class="px-4 pb-3 space-y-2 overflow-y-auto"
        :style="{ maxHeight: 'calc(70vh - 120px)' }"
      >
        <li v-if="filtered.length===0" class="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No requests yet.
        </li>

        <li
          v-for="req in filtered"
          :key="req.id || req.timestamp"
          class="flex items-center justify-between gap-3 rounded-xl px-3 py-2
                 bg-gray-100 dark:bg-white/5 ring-1 ring-black/10 dark:ring-white/10"
          @touchstart.passive="onItemTouchStart($event, req)"
          @touchmove.passive="onItemTouchMove($event, req)"
          @touchend.passive="onItemTouchEnd($event, req)"
          :style="itemStyle(req)"
        >
          <div class="flex items-center gap-3 min-w-0">
            <img
              v-if="req.avatar"
              :src="req.avatar"
              alt=""
              class="h-9 w-9 rounded-full object-cover ring-2 ring-indigo-500/40"
            />
            <div v-else class="h-9 w-9 rounded-full grid place-items-center bg-indigo-100 text-indigo-600 font-bold ring-2 ring-indigo-500/40">
              {{ initials(req.name) }}
            </div>

            <div class="min-w-0">
              <p class="text-sm font-semibold truncate">
                <span class="text-zinc-900 dark:text-zinc-100">{{ req.name }}</span>
                <span
                  v-if="req.priority"
                  class="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 ring-1 ring-amber-400/30 align-middle"
                >{{ req.priority }}</span>
              </p>
              <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
                {{ timeAgo(req.timestamp) }}
                <span v-if="typeof req.followers==='number'"> • {{ shortNum(req.followers) }} followers</span>
              </p>
            </div>
          </div>

          <button
            class="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-white
                   bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800
                   focus:outline-none focus:ring-2 focus:ring-emerald-400"
            @click="approve(req)"
            :aria-label="`Add ${req.name}`"
            @mousedown.prevent
            @touchstart.passive="startHold(req)"
            @touchend.passive="endHold"
          >
            🎤 Add
          </button>
        </li>
      </ul>

      <!-- Footer -->
      <footer class="px-4 py-3 border-t border-black/10 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur">
        <div class="flex items-center justify-between gap-2">
          <small class="text-[11px] text-zinc-500 dark:text-zinc-400">Swipe right = Add, left = Dismiss</small>
          <div class="flex items-center gap-2">
            <button
              class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              @click="approveAll"
              :disabled="filtered.length===0"
            >Approve All</button>
            <button
              class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-200 dark:bg-zinc-800"
              @click="dismissAll"
              :disabled="filtered.length===0"
            >Dismiss All</button>
          </div>
        </div>
      </footer>

      <!-- Safe-area spacer -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: true },
  requests: { type: Array, required: true }, // {id?, name, timestamp, avatar?, followers?, priority?}
})
const emit = defineEmits(['close','approve','dismiss','approve-all','dismiss-all'])

/* UI state */
const query = ref('')
const sortBy = ref('recent')  // recent | oldest | followers | priority
const tab = ref('all')        // all | vip
const now = ref(Date.now())
let tickTimer = null

/* Filtering / sorting */
const filtered = computed(()=>{
  const q = query.value.trim().toLowerCase()
  let list = props.requests.filter(r => (tab.value==='vip' ? (r.priority||'').toLowerCase().includes('vip') : true))
  if (q) list = list.filter(r => r.name?.toLowerCase().includes(q))

  switch (sortBy.value) {
    case 'oldest': list.sort((a,b)=>a.timestamp-b.timestamp); break
    case 'followers': list.sort((a,b)=>(b.followers||0)-(a.followers||0)); break
    case 'priority': list.sort((a,b)=>priorityScore(b)-priorityScore(a)); break
    default: list.sort((a,b)=>b.timestamp-a.timestamp)
  }
  return list
})
function priorityScore(r){
  const p=(r.priority||'').toLowerCase()
  if (p.includes('vip')) return 3
  if (p.includes('mod')) return 2
  if (p.includes('top')) return 1.5
  return 1
}

/* Actions */
function approve(req){ buzz(18); emit('approve', req) }
function approveAll(){ buzz(22); emit('approve-all', filtered.value.map(x=>x)) }
function dismissAll(){ buzz(12); emit('dismiss-all', filtered.value.map(x=>x)) }
function close(reason){ emit('close', { reason }) }

/* Time helpers */
function timeAgo(ts){
  const s = Math.max(1, Math.floor((now.value - ts)/1000))
  if (s<60) return `${s}s ago`
  const m=Math.floor(s/60); if(m<60) return `${m}m ago`
  const h=Math.floor(m/60); return `${h}h ago`
}
function shortNum(v){
  v=Number(v||0); if(v>=1e6) return (v/1e6).toFixed(1).replace(/\.0$/,'')+'M'
  if(v>=1e3) return (v/1e3).toFixed(1).replace(/\.0$/,'')+'K'
  return v.toString()
}

/* Haptics */
function buzz(ms=14){ try{ navigator?.vibrate?.(ms) }catch{} }

/* Live clock */
function startTick(){ stopTick(); tickTimer=setInterval(()=>now.value=Date.now(),1000) }
function stopTick(){ if(tickTimer){ clearInterval(tickTimer); tickTimer=null }}

/* Sheet swipe to close */
const startY = ref(0), dY = ref(0), dragging = ref(false)
const dragStyle = computed(()=>{
  if(!dragging.value) return {}
  const y=Math.max(0,dY.value), op=Math.max(1-y/240,.5)
  return { transform:`translateY(${y}px)`, opacity:op }
})
function onTouchStart(e){ if(e.touches?.length!==1) return; dragging.value=true; startY.value=e.touches[0].clientY; dY.value=0 }
function onTouchMove(e){ if(!dragging.value) return; dY.value=e.touches[0].clientY-startY.value }
function onTouchEnd(){ if(!dragging.value) return; dragging.value=false; if(dY.value>120) close('swipe'); dY.value=0 }

/* Per-item swipe (approve right / dismiss left) */
const touch = ref({ id:null, startX:0, dx:0 })
function onItemTouchStart(e, r){ if(e.touches?.length!==1) return; touch.value={ id:r.id||r.timestamp, startX:e.touches[0].clientX, dx:0 } }
function onItemTouchMove(e, r){ if(touch.value.id!==(r.id||r.timestamp)) return; touch.value.dx=e.touches[0].clientX - touch.value.startX }
function onItemTouchEnd(e, r){
  if(touch.value.id!==(r.id||r.timestamp)) return
  const dx=touch.value.dx; touch.value={ id:null, startX:0, dx:0 }
  if(Math.abs(dx)>110){
    if(dx>0) approve(r)
    else emit('dismiss', r)
  }
}
function itemStyle(r){
  const active = touch.value.id===(r.id||r.timestamp)
  if(!active) return {}
  const x=touch.value.dx, op=Math.max(1-Math.abs(x)/240,.35)
  return { transform:`translateX(${x}px)`, opacity:op }
}

/* Long-press to approve */
let holdTimer=null
function startHold(req){ holdTimer=setTimeout(()=>approve(req), 550) }
function endHold(){ clearTimeout(holdTimer); holdTimer=null }

/* Visibility */
function onVisibility(){ if(document.hidden) stopTick(); else startTick() }

/* Lifecycle */
onMounted(()=>{ startTick(); document.addEventListener('visibilitychange', onVisibility) })
onBeforeUnmount(()=>{ stopTick(); document.removeEventListener('visibilitychange', onVisibility) })
</script>

<style scoped>
/* Smooth scrollbar for the sheet */
ul::-webkit-scrollbar{ width:6px }
ul::-webkit-scrollbar-thumb{ background-color:#bbb; border-radius:10px }
</style>
