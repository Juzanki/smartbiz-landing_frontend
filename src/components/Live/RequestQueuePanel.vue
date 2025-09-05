<!-- JoinRequestsFloating.vue -->
<template>
  <div
    v-if="open"
    class="fixed inset-x-0 z-50 bottom-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-6 flex justify-center sm:justify-end sm:pr-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="jr-title"
  >
    <section
      ref="panel"
      class="w-[92vw] sm:w-[380px] max-w-sm rounded-2xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10
             bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100 backdrop-blur
             overflow-hidden"
    >
      <!-- Header -->
      <header class="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
        <div class="min-w-0">
          <h3 id="jr-title" class="text-base font-semibold text-indigo-600 dark:text-indigo-400 text-center sm:text-left">
            🙋‍♂️ Join Requests
          </h3>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-400 text-center sm:text-left">
            {{ filtered.length }} pending
          </p>
        </div>
        <button
          class="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Close"
          @click="$emit('close')"
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
          <option value="followers">Followers</option>
          <option value="priority">Priority</option>
        </select>
      </div>

      <!-- List -->
      <div class="px-4 pb-3">
        <div v-if="filtered.length===0" class="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No pending requests.
        </div>

        <ul class="space-y-2 max-h-[48vh] overflow-y-auto jr-scroll">
          <li
            v-for="req in filtered"
            :key="req.id || req.timestamp"
            class="flex items-center justify-between gap-3 rounded-xl px-3 py-2
                   bg-gray-50 dark:bg-white/5 ring-1 ring-black/10 dark:ring-white/10"
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
              <div
                v-else
                class="h-9 w-9 rounded-full grid place-items-center bg-indigo-100 text-indigo-600 font-bold ring-2 ring-indigo-500/40"
              >{{ initials(req.name) }}</div>

              <div class="min-w-0">
                <p class="text-sm font-medium truncate">
                  <span class="text-zinc-900 dark:text-zinc-100">{{ req.name }}</span>
                  <span
                    v-if="req.priority"
                    class="ml-1 align-middle text-[10px] px-1.5 py-0.5 rounded
                           bg-amber-500/20 text-amber-700 dark:text-amber-300 ring-1 ring-amber-400/30"
                  >{{ req.priority }}</span>
                </p>
                <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {{ timeAgo(req.timestamp) }}
                  <span v-if="typeof req.followers==='number'"> • {{ shortNum(req.followers) }} followers</span>
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button
                class="rounded-full px-3 py-1.5 text-xs font-semibold text-white
                       bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800
                       focus:outline-none focus:ring-2 focus:ring-emerald-400"
                @click="accept(req)"
                :aria-label="`Accept ${req.name}`"
                @touchstart.passive="startHold(req)"
                @touchend.passive="endHold"
              >✅</button>
              <button
                class="rounded-full px-3 py-1.5 text-xs font-semibold text-white
                       bg-rose-600 hover:bg-rose-700 active:bg-rose-800
                       focus:outline-none focus:ring-2 focus:ring-rose-400"
                @click="reject(req)"
                :aria-label="`Reject ${req.name}`"
              >❌</button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Footer -->
      <footer class="px-4 py-3 border-t border-black/10 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur">
        <div class="flex items-center justify-between gap-2">
          <small class="text-[11px] text-zinc-500 dark:text-zinc-400">
            Swipe ↔︎ item (→ Accept, ← Reject)
          </small>
          <div class="flex items-center gap-2">
            <button
              class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              @click="acceptAll"
              :disabled="filtered.length===0"
            >Accept All</button>
            <button
              class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-200 dark:bg-zinc-800"
              @click="rejectAll"
              :disabled="filtered.length===0"
            >Reject All</button>
          </div>
        </div>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: true },
  requests: { type: Array, required: true }, // { id?, name, timestamp, avatar?, followers?, priority? }
})
const emit = defineEmits(['accept','reject','accept-all','reject-all','close'])

/* UI state */
const query = ref('')
const sortBy = ref('recent')
const now = ref(Date.now())
let tick = null

/* Filter + sort */
const filtered = computed(()=>{
  const q = query.value.trim().toLowerCase()
  let list = props.requests.filter(r => q ? r.name?.toLowerCase().includes(q) : true)
  switch (sortBy.value) {
    case 'followers': list.sort((a,b)=>(b.followers||0)-(a.followers||0)); break
    case 'priority': list.sort((a,b)=>prio(b)-prio(a)); break
    default: list.sort((a,b)=>b.timestamp-a.timestamp)
  }
  return list
})
function prio(r){
  const p=(r.priority||'').toLowerCase()
  if (p.includes('vip')) return 3
  if (p.includes('mod')) return 2
  if (p.includes('top')) return 1.5
  return 1
}

/* Actions */
function accept(req){ buzz(18); emit('accept', req) }
function reject(req){ buzz(10); emit('reject', req) }
function acceptAll(){ buzz(22); emit('accept-all', filtered.value) }
function rejectAll(){ buzz(12); emit('reject-all', filtered.value) }

/* Relative time + formatters */
function timeAgo(ts){
  const s = Math.max(1, Math.floor((now.value - ts)/1000))
  if (s<60) return `${s}s ago`
  const m=Math.floor(s/60); if(m<60) return `${m}m ago`
  const h=Math.floor(m/60); return `${h}h ago`
}
function shortNum(v){
  v=Number(v||0)
  if(v>=1e6) return (v/1e6).toFixed(1).replace(/\.0$/,'')+'M'
  if(v>=1e3) return (v/1e3).toFixed(1).replace(/\.0$/,'')+'K'
  return v.toString()
}
function initials(name=''){
  return (name.trim().split(/\s+/).map(p=>p[0]).join('').slice(0,2) || 'U').toUpperCase()
}

/* Haptics */
function buzz(ms=14){ try{ navigator?.vibrate?.(ms) }catch{} }

/* Live clock */
function start(){ stop(); tick=setInterval(()=>now.value=Date.now(),1000) }
function stop(){ if(tick){ clearInterval(tick); tick=null } }
onMounted(start)
onBeforeUnmount(stop)

/* Per-item swipe */
const touch = ref({ id:null, startX:0, dx:0 })
function onItemTouchStart(e, r){
  if (e.touches?.length!==1) return
  touch.value = { id:r.id||r.timestamp, startX:e.touches[0].clientX, dx:0 }
}
function onItemTouchMove(e, r){
  if (touch.value.id!==(r.id||r.timestamp)) return
  touch.value.dx = e.touches[0].clientX - touch.value.startX
}
function onItemTouchEnd(e, r){
  if (touch.value.id!==(r.id||r.timestamp)) return
  const dx = touch.value.dx
  touch.value = { id:null, startX:0, dx:0 }
  if (Math.abs(dx) > 110) {
    if (dx > 0) accept(r); else reject(r)
  }
}
function itemStyle(r){
  const active = touch.value.id===(r.id||r.timestamp)
  if (!active) return {}
  const x = touch.value.dx, op = Math.max(1 - Math.abs(x)/240, .35)
  return { transform:`translateX(${x}px)`, opacity:op }
}

/* Long-press quick accept */
let holdTimer=null
function startHold(req){ holdTimer=setTimeout(()=>accept(req), 550) }
function endHold(){ clearTimeout(holdTimer); holdTimer=null }
</script>

<style scoped>
.jr-scroll::-webkit-scrollbar{ width:6px }
.jr-scroll::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.25); border-radius:10px }
</style>
