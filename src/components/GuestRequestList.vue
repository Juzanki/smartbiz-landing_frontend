<template>
  <!-- Bottom Sheet: mobile-first, safe-area aware -->
  <div
    class="fixed z-[9998] left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-4
           w-[96vw] max-w-sm rounded-2xl shadow-2xl border border-white/10
           bg-white/90 backdrop-blur-md text-slate-900
           dark:bg-slate-900/90 dark:text-white"
    :style="{ bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom,0px))` }"
    role="region"
    aria-label="Guest Join Requests"
  >
    <!-- Header / Grab area -->
    <div
      class="relative px-4 pt-2 pb-2 select-none"
      @pointerdown="onSheetPointerDown"
      @pointermove="onSheetPointerMove"
      @pointerup="onSheetPointerUp"
      @pointercancel="onSheetPointerCancel"
    >
      <div class="mx-auto h-1.5 w-12 rounded-full bg-slate-300/70 dark:bg-white/20 mb-2"></div>

      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 min-w-0">
          <h3 class="text-sm font-bold truncate">🧑‍🤝‍🧑 Guest Requests</h3>
          <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-600/10 text-indigo-600 dark:text-indigo-300">
            {{ filtered.length }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <div class="hidden md:flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span class="kbd">A</span><span>/</span><span class="kbd">D</span>
            <span class="ml-1">= Accept/Decline</span>
          </div>
          <button
            type="button"
            class="h-8 px-3 rounded-full text-[12px] font-semibold bg-black/5 dark:bg-white/10"
            @click="toggleExpand"
          >
            {{ expanded ? 'Minimize' : 'Expand' }}
          </button>
        </div>
      </div>

      <!-- Filters / Search -->
      <div class="mt-2 flex items-center gap-2">
        <div class="flex rounded-full bg-black/5 dark:bg-white/10 p-1">
          <button
            v-for="t in tabs" :key="t"
            class="px-3 h-7 rounded-full text-[12px] font-medium"
            :class="tab===t ? 'bg-white dark:bg-slate-800 shadow' : 'opacity-70'"
            @click="tab=t"
          >{{ t }}</button>
        </div>
        <div class="relative flex-1">
          <input
            v-model.trim="query"
            type="search"
            inputmode="search"
            placeholder="Search…"
            class="w-full h-8 rounded-full text-[12px] px-8 bg-black/5 dark:bg-white/10 outline-none"
            @focus="expanded=true"
            aria-label="Search requests"
          />
          <span class="absolute left-2 top-1.5 text-slate-500 dark:text-slate-400 text-xs">🔎</span>
          <button
            v-if="selection.size"
            class="absolute right-1 top-1 h-6 px-2 rounded-full text-[11px] bg-indigo-600 text-white"
            @click="clearSelection"
          >
            Clear ({{ selection.size }})
          </button>
        </div>
      </div>

      <!-- Bulk actions -->
      <div v-if="selection.size" class="mt-2 grid grid-cols-2 gap-2">
        <button
          class="h-9 rounded-full font-semibold text-white bg-gradient-to-b from-green-500 to-green-600"
          @click="approveSelected"
        >✅ Accept Selected</button>
        <button
          class="h-9 rounded-full font-semibold bg-red-50 text-red-600 border border-red-200
                 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40"
          @click="rejectSelected"
        >❌ Decline Selected</button>
      </div>
    </div>

    <!-- Body -->
    <transition name="body">
      <div v-show="expanded" class="px-3 pb-3">
        <div
          v-if="filtered.length === 0"
          class="text-xs text-slate-500 dark:text-slate-400 italic px-2 pb-3"
        >
          No guest requests yet.
        </div>

        <div class="space-y-2 max-h-[56vh] overflow-y-auto pr-1" ref="scroll">
          <div
            v-for="req in filtered"
            :key="req.id"
            class="relative rounded-xl bg-white/80 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow
                   overflow-hidden"
          >
            <!-- Swipe backdrop -->
            <div class="absolute inset-0 grid grid-cols-2 pointer-events-none">
              <div class="bg-green-500/10" :style="{ opacity: Math.max(0, (dragX[req.id]||0)/swipeThreshold/1.2) }"></div>
              <div class="bg-red-500/10" :style="{ opacity: Math.max(0, -(dragX[req.id]||0)/swipeThreshold/1.2) }"></div>
            </div>

            <!-- Row -->
            <div
              class="relative flex items-center gap-2 px-3 py-2 will-change-transform"
              :style="{ transform: `translateX(${dragX[req.id]||0}px)` , transition: draggingId===req.id ? 'none' : 'transform .15s ease' }"
              @pointerdown="onRowDown($event, req.id)"
              @pointermove="onRowMove($event, req.id)"
              @pointerup="onRowUp($event, req.id)"
              @pointercancel="onRowCancel(req.id)"
            >
              <!-- Select -->
              <input
                type="checkbox"
                class="h-4 w-4 rounded accent-indigo-600"
                :checked="selection.has(req.id)"
                @click.stop="toggleSelect(req.id)"
                :aria-label="`Select ${req.name}`"
              />

              <!-- Avatar + countdown ring -->
              <div class="relative">
                <img
                  :src="req.avatar || fallbackAvatar"
                  @error="onImgError($event)"
                  class="w-10 h-10 rounded-full object-cover border border-white/50"
                  alt=""
                />
                <div
                  class="absolute -inset-[2px] rounded-full -z-10"
                  :style="ringStyle(req)"
                  aria-hidden="true"
                ></div>
              </div>

              <!-- Info -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium truncate">{{ req.name }}</span>
                  <span
                    v-if="req.priority"
                    class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/30 text-amber-900 dark:text-amber-200"
                  >Priority</span>
                  <span
                    v-if="isRecent(req)"
                    class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                  >New</span>
                </div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  wants to join your live • {{ age(req) }}
                </div>
              </div>

              <!-- Actions (buttons as fallback) -->
              <div class="flex items-center gap-1">
                <button
                  class="h-8 px-3 rounded-full text-[12px] font-semibold bg-white text-green-600 border border-green-200
                         dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
                  @click.stop="approve(req.id)"
                  title="Accept"
                >✅</button>
                <button
                  class="h-8 px-3 rounded-full text-[12px] font-semibold bg-red-50 text-red-600 border border-red-200
                         dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40"
                  @click.stop="reject(req.id)"
                  title="Decline"
                >❌</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer tiny helper -->
        <div class="pt-2 text-[10px] text-center text-slate-400">
          Swipe ➡️ accept • ⬅️ decline • Long-press row = open profile
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/* ---------- Props / Emits ---------- */
const props = defineProps({
  requests: { type: Array, required: true }, // [{id,name,avatar,priority?,arrivedAt?,expiresAt?}]
  defaultExpireSec: { type: Number, default: 30 },
  bottomOffset: { type: Number, default: 64 }, // px above bottom nav
})

const emit = defineEmits(['approve', 'reject', 'approve-bulk', 'reject-bulk', 'open'])

/* ---------- Sheet expand/minimize ---------- */
const expanded = ref(true)
function toggleExpand(){ expanded.value = !expanded.value }

// simple drag-to-expand/minimize
let sheetDrag = { active:false, startY:0, lastY:0 }
function onSheetPointerDown(e){ sheetDrag = { active:true, startY:e.clientY, lastY:e.clientY } }
function onSheetPointerMove(e){
  if(!sheetDrag.active) return
  const dy = e.clientY - sheetDrag.startY
  // small dead zone
  if (Math.abs(dy) < 8) return
  sheetDrag.lastY = e.clientY
}
function onSheetPointerUp(){
  if(!sheetDrag.active) return
  const dy = sheetDrag.lastY - sheetDrag.startY
  if (dy > 20) expanded.value = false
  else if (dy < -20) expanded.value = true
  sheetDrag.active = false
}
function onSheetPointerCancel(){ sheetDrag.active = false }

/* ---------- Filters / Search ---------- */
const tabs = ['All','Priority','Recent']
const tab = ref('All')
const query = ref('')
const now = ref(Date.now())
let clock = null

const filtered = computed(() => {
  let arr = [...props.requests]
  if (tab.value === 'Priority') arr = arr.filter(r => r.priority)
  if (tab.value === 'Recent')   arr = arr.filter(isRecent)
  if (query.value) {
    const q = query.value.toLowerCase()
    arr = arr.filter(r => (r.name||'').toLowerCase().includes(q))
  }
  // sort: priority, recency
  return arr.sort((a,b) => (b.priority?1:0)-(a.priority?1:0) || (b.arrivedAt||0)-(a.arrivedAt||0))
})

/* ---------- Selection & Bulk ---------- */
const selection = ref(new Set())
function toggleSelect(id){
  if (selection.value.has(id)) selection.value.delete(id)
  else selection.value.add(id)
}
function clearSelection(){ selection.value = new Set() }
function approveSelected(){
  const ids = Array.from(selection.value)
  if (!ids.length) return
  emit('approve-bulk', ids)
  selection.value = new Set()
}
function rejectSelected(){
  const ids = Array.from(selection.value)
  if (!ids.length) return
  emit('reject-bulk', ids)
  selection.value = new Set()
}

/* ---------- Row actions ---------- */
function approve(id){ vibrate(20); emit('approve', id) }
function reject(id){ vibrate(10); emit('reject', id) }

/* ---------- Swipe per row ---------- */
const swipeThreshold = 88
const draggingId = ref(null)
const dragStartX = ref(0)
const dragX = ref({}) // map by id

function onRowDown(e, id){
  draggingId.value = id
  dragStartX.value = e.clientX
  dragX.value[id] = 0
  longPressStart(id, e) // enable long-press
}
function onRowMove(e, id){
  if (draggingId.value !== id) return
  dragX.value[id] = e.clientX - dragStartX.value
}
function onRowUp(e, id){
  cancelLongPress()
  if (draggingId.value !== id) return
  const dx = dragX.value[id] || 0
  if (dx > swipeThreshold) approve(id)
  else if (dx < -swipeThreshold) reject(id)
  dragX.value[id] = 0
  draggingId.value = null
}
function onRowCancel(id){
  cancelLongPress()
  dragX.value[id] = 0
  draggingId.value = null
}

/* ---------- Long-press to open profile ---------- */
let lpTimer = null
function longPressStart(id, ev){
  lpTimer = setTimeout(() => {
    emit('open', id)
    vibrate(15)
  }, 600)
}
function cancelLongPress(){ if (lpTimer) clearTimeout(lpTimer); lpTimer = null }

/* ---------- Time / countdown rings ---------- */
onMounted(() => {
  clock = setInterval(() => { now.value = Date.now() }, 250)
  // Keyboard shortcuts (A/D for first visible row)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  clearInterval(clock)
  window.removeEventListener('keydown', onKey)
})

function onKey(e){
  if (!expanded.value || !filtered.value.length) return
  if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return
  const first = filtered.value[0]
  if (e.key.toLowerCase() === 'a') approve(first.id)
  if (e.key.toLowerCase() === 'd') reject(first.id)
}

function age(req){
  const t = req.arrivedAt ? +req.arrivedAt : now.value
  const s = Math.max(0, Math.floor((now.value - t)/1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s/60); return `${m}m ago`
}
function expiresProgress(req){
  const end = req.expiresAt ? +req.expiresAt : (req.arrivedAt ? +req.arrivedAt + props.defaultExpireSec*1000 : now.value + props.defaultExpireSec*1000)
  const total = Math.max(1, (end - (req.arrivedAt||now.value)))
  const left = Math.max(0, end - now.value)
  return 1 - Math.min(1, left/total) // 0..1
}
function ringStyle(req){
  const p = expiresProgress(req)
  const deg = Math.round(p*360)
  return {
    background: `conic-gradient(#22c55e ${deg}deg, rgba(148,163,184,.25) ${deg}deg 360deg)`,
    filter: 'blur(3px)',
    opacity: 0.85
  }
}
function isRecent(req){
  const t = req.arrivedAt ? +req.arrivedAt : now.value
  return (now.value - t) < 15000 // 15s window
}

/* ---------- Utils ---------- */
const fallbackAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="100%" height="100%" rx="16" fill="%23222"/><text x="50%" y="56%" font-size="26" text-anchor="middle" fill="white" font-family="Arial">👤</text></svg>'
function onImgError(e){ e.target.src = fallbackAvatar }
function vibrate(ms=12){ try { navigator.vibrate?.(ms) } catch(_){} }
</script>

<style scoped>
/* Body show/hide */
.body-enter-active, .body-leave-active { transition: opacity .18s ease; }
.body-enter-from, .body-leave-to { opacity: 0; }

/* KBD pill */
.kbd {
  padding: 2px 6px; border-radius: 6px;
  border: 1px solid rgba(100,116,139,.35);
  background: rgba(148,163,184,.08);
}
</style>
