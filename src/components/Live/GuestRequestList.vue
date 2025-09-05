<!-- GuestRequestsPanel.vue -->
<template>
  <!-- Backdrop -->
  <div
    v-if="open"
    class="fixed inset-0 z-50 bg-black/55 sm:bg-black/45 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="requests-title"
    @click.self="handleClose('backdrop')"
    @keydown.esc.prevent="handleClose('esc')"
  >
    <!-- Bottom Sheet / Card -->
    <section
      ref="sheetRef"
      class="absolute inset-x-0 bottom-0 sm:inset-auto sm:left-auto sm:right-4 sm:bottom-4
             w-full sm:w-[380px] max-h-[86vh] sm:max-h-[78vh]
             bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100
             rounded-t-2xl sm:rounded-2xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10
             overflow-hidden"
      :style="dragStyle"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <!-- Drag handle (mobile) -->
      <div class="sm:hidden pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
      </div>

      <!-- Header -->
      <header class="px-4 pt-3 pb-2 sm:p-4 flex items-center justify-between gap-2">
        <div>
          <h3 id="requests-title" class="text-sm font-bold">🧑‍🤝‍🧑 Guest Join Requests</h3>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
            {{ filtered.length }} request(s)
          </p>
        </div>
        <button
          class="inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          @click="handleClose('x')"
          aria-label="Close"
        >✕</button>
      </header>

      <!-- Toolbar -->
      <div class="px-4 pb-2">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <input
              v-model="query"
              type="text"
              inputmode="search"
              placeholder="Search name…"
              class="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm outline-none
                     focus:ring-2 ring-indigo-400 dark:ring-indigo-500"
              aria-label="Search requests by name"
            />
            <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">⌕</span>
          </div>

          <select
            v-model="sortBy"
            class="rounded-xl bg-zinc-100 dark:bg-zinc-800 px-2 py-2 text-xs"
            aria-label="Sort"
            title="Sort"
          >
            <option value="recent">Recent</option>
            <option value="expiring">Expiring</option>
            <option value="followers">Followers</option>
            <option value="priority">Priority</option>
          </select>
        </div>
      </div>

      <!-- List -->
      <div
        class="px-4 pb-3 space-y-2 overflow-y-auto"
        :style="{ maxHeight: 'calc(70vh - 96px)' }"
        @mouseenter="pause()"
        @mouseleave="resume()"
      >
        <div v-if="filtered.length === 0" class="text-xs text-zinc-500 italic py-6 text-center">
          No guest requests yet.
        </div>

        <!-- Item -->
        <article
          v-for="(req, idx) in filtered"
          :key="req.id"
          class="flex items-center justify-between gap-3 rounded-xl px-3 py-2 ring-1
                 ring-black/10 dark:ring-white/10 bg-white/80 dark:bg-white/5
                 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md"
          :style="itemStyle(idx)"
          @touchstart.passive="onItemTouchStart($event, req)"
          @touchmove.passive="onItemTouchMove($event, req)"
          @touchend.passive="onItemTouchEnd($event, req)"
        >
          <!-- Left: avatar + name -->
          <div class="flex items-center gap-2 min-w-0 flex-1">
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
              <p class="text-sm font-medium truncate">
                <span class="text-indigo-600 dark:text-indigo-300">{{ req.name }}</span>
                <span v-if="req.priority" class="ml-1 align-middle text-[10px] px-1.5 py-0.5 rounded
                            bg-amber-500/20 text-amber-700 dark:text-amber-300 ring-1 ring-amber-400/30">
                  {{ req.priority }}
                </span>
              </p>
              <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
                {{ followerShort(req.followers) }} followers • {{ remaining(req) }}s left
              </p>
              <!-- progress -->
              <div class="mt-1 h-1 w-36 bg-zinc-200/70 dark:bg-zinc-700/70 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-500"
                     :style="{ width: progressWidth(req) }"></div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 shrink-0">
            <button
              class="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold
                     text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800
                     focus:outline-none focus:ring-2 focus:ring-emerald-400"
              @click="approveOne(req.id)"
              :aria-label="`Accept ${req.name}`"
            >✅ Accept</button>

            <button
              class="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold
                     text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800
                     focus:outline-none focus:ring-2 focus:ring-rose-400"
              @click="rejectOne(req.id)"
              :aria-label="`Decline ${req.name}`"
            >❌</button>
          </div>
        </article>
      </div>

      <!-- Footer: bulk actions -->
      <footer class="px-4 py-3 border-t border-black/10 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur">
        <div class="flex items-center justify-between gap-2">
          <div class="text-[11px] text-zinc-500 dark:text-zinc-400">
            Auto-clean expired & paused in background tabs.
          </div>
          <div class="flex items-center gap-2">
            <button
              class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              @click="approveBulk()"
              :disabled="filtered.length === 0"
            >Approve All</button>
            <button
              class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-200 dark:bg-zinc-800"
              @click="rejectBulk()"
              :disabled="filtered.length === 0"
            >Decline All</button>
          </div>
        </div>
      </footer>

      <!-- Safe-area spacer -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>

      <!-- SR live region -->
      <p class="sr-only" aria-live="polite">{{ srText }}</p>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

/**
 * PROPS
 * requests: Array of {
 *   id: string|number, name: string, avatar?: string, followers?: number,
 *   requestedAt?: number|Date, // ms
 *   expiresIn?: number,        // seconds (default 15)
 *   priority?: 'VIP'|'Mod'|'Top Fan'|string
 * }
 */
const props = defineProps({
  open: { type: Boolean, default: true },
  requests: { type: Array, required: true },
  defaultExpiry: { type: Number, default: 15 },
})
const emit = defineEmits(['close', 'approve', 'reject'])

/* ---------- State ---------- */
const query = ref('')
const sortBy = ref('recent')
const sheetRef = ref(null)
const now = ref(Date.now())
let tickTimer = null

/* ---------- Time / Expiry ---------- */
function deadlineMs(r) {
  const start = r.requestedAt ? new Date(r.requestedAt).getTime() : Date.now()
  const span = (r.expiresIn ?? props.defaultExpiry) * 1000
  return start + span
}
function remaining(r) {
  return Math.max(0, Math.ceil((deadlineMs(r) - now.value) / 1000))
}
function expired(r) {
  return deadlineMs(r) <= now.value
}
function progressWidth(r) {
  const total = (r.expiresIn ?? props.defaultExpiry)
  const used = Math.min(total, total - remaining(r))
  return `${(used / total) * 100}%`
}

/* ---------- Filters & Sort ---------- */
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  let list = props.requests.filter(r => !expired(r) && (q ? r.name?.toLowerCase().includes(q) : true))
  switch (sortBy.value) {
    case 'expiring':
      list = list.sort((a,b) => remaining(a) - remaining(b)); break
    case 'followers':
      list = list.sort((a,b) => (b.followers??0) - (a.followers??0)); break
    case 'priority':
      list = list.sort((a,b) => priorityScore(b) - priorityScore(a)); break
    default: // recent
      list = list.sort((a,b) => (new Date(b.requestedAt||0)) - (new Date(a.requestedAt||0)))
  }
  return list
})

function priorityScore(r){
  const p = (r.priority||'').toLowerCase()
  if (p.includes('vip')) return 3
  if (p.includes('mod')) return 2
  if (p.includes('top')) return 1.5
  return 1
}

/* ---------- Haptics ---------- */
function buzz(ms=14){ try{ navigator?.vibrate?.(ms) }catch{} }

/* ---------- Actions ---------- */
function approveOne(id){
  buzz(18)
  emit('approve', { ids:[id] })
}
function rejectOne(id){
  buzz(10)
  emit('reject', { ids:[id] })
}
function approveBulk(){
  if (filtered.value.length===0) return
  buzz(22)
  emit('approve', { ids: filtered.value.map(r=>r.id) })
}
function rejectBulk(){
  if (filtered.value.length===0) return
  buzz(12)
  emit('reject', { ids: filtered.value.map(r=>r.id) })
}
function handleClose(reason){
  emit('close', { reason })
}

/* ---------- Live clock ---------- */
function startTick(){
  stopTick()
  tickTimer = setInterval(()=>{
    now.value = Date.now()
  }, 1000)
}
function stopTick(){
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null }
}

/* ---------- Visibility pause ---------- */
function onVisibility(){
  if (document.hidden) stopTick()
  else startTick()
}

/* ---------- Swipe-to-close (sheet) ---------- */
const startY = ref(0)
const deltaY = ref(0)
const dragging = ref(false)
const dragStyle = computed(()=>{
  if (!dragging.value) return {}
  const y = Math.max(0, deltaY.value)
  const op = Math.max(1 - y/240, .5)
  return { transform: `translateY(${y}px)`, opacity: op }
})
function onTouchStart(e){
  if (e.touches?.length!==1) return
  dragging.value = true
  startY.value = e.touches[0].clientY
  deltaY.value = 0
}
function onTouchMove(e){
  if (!dragging.value) return
  deltaY.value = e.touches[0].clientY - startY.value
}
function onTouchEnd(){
  if (!dragging.value) return
  dragging.value = false
  if (deltaY.value > 120) handleClose('swipe')
  else deltaY.value = 0
}

/* ---------- Per-item swipe (dismiss) ---------- */
const itemTouch = ref({ id:null, startX:0, dx:0 })
function onItemTouchStart(e, r){
  if (e.touches?.length!==1) return
  itemTouch.value = { id:r.id, startX:e.touches[0].clientX, dx:0 }
}
function onItemTouchMove(e, r){
  if (itemTouch.value.id!==r.id) return
  itemTouch.value.dx = e.touches[0].clientX - itemTouch.value.startX
}
function onItemTouchEnd(e, r){
  if (itemTouch.value.id!==r.id) return
  const dx = itemTouch.value.dx
  itemTouch.value = { id:null, startX:0, dx:0 }
  if (Math.abs(dx) > 120){
    // Right swipe = approve, Left swipe = reject
    if (dx > 0) approveOne(r.id); else rejectOne(r.id)
  }
}
function itemStyle(idx){
  const dx = itemTouch.value.id === filtered.value[idx]?.id ? itemTouch.value.dx : 0
  const opa = Math.max(1 - Math.abs(dx)/240, .35)
  return dx ? { transform:`translateX(${dx}px)`, opacity: opa } : {}
}

/* ---------- Helpers ---------- */
function followerShort(v){
  v = Number(v||0)
  if (v>=1e6) return (v/1e6).toFixed(1).replace(/\.0$/,'')+'M'
  if (v>=1e3) return (v/1e3).toFixed(1).replace(/\.0$/,'')+'K'
  return v.toString()
}
function initials(name=''){
  return (name.trim().split(/\s+/).map(p=>p[0]).join('').slice(0,2) || 'U').toUpperCase()
}

/* ---------- SR text ---------- */
const srText = computed(()=> `${filtered.value.length} guest request(s) visible`)

/* ---------- Lifecycle ---------- */
const open = computed(()=> props.open)

onMounted(()=>{
  startTick()
  document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(()=>{
  stopTick()
  document.removeEventListener('visibilitychange', onVisibility)
})

/* Keep ticking only when panel open */
watch(()=>props.open, v=> { v ? startTick() : stopTick() })
</script>

<style scoped>
/* Reduce motion friendly tweaks */
@media (prefers-reduced-motion: reduce) {
  .backdrop-blur-sm { backdrop-filter: none !important; }
}
</style>
