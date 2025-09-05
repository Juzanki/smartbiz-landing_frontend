<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="fixed right-4 bottom-24 z-50 w-[92vw] max-w-sm rounded-2xl shadow-2xl border border-black/10 dark:border-white/10
             bg-white/90 dark:bg-[#0b1020]/90 backdrop-blur-lg"
      :style="safeArea"
      role="dialog" aria-modal="true" aria-labelledby="jrmp-title"
    >
      <!-- Header -->
      <div class="px-4 pt-3 pb-2 flex items-center justify-between">
        <h3 id="jrmp-title" class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          🙋‍♂️ Join Requests
          <span class="text-[11px] px-2 py-0.5 rounded-full bg-indigo-600 text-white">{{ filtered.length }}</span>
        </h3>
        <div class="flex items-center gap-1">
          <button class="h-8 px-3 rounded-full text-xs font-semibold bg-black/5 dark:bg-white/10" @click="toggleSelect">
            {{ selecting ? 'Done' : 'Select' }}
          </button>
          <button class="h-8 w-8 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10" @click="close" aria-label="Close">✖</button>
        </div>
      </div>

      <!-- Search + Filters -->
      <div class="px-4 flex items-center gap-2">
        <div class="relative flex-1">
          <input v-model.trim="q" class="input w-full pl-8 h-9" type="search" placeholder="Search name…" />
          <span class="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">🔎</span>
        </div>
        <div class="flex gap-1 overflow-x-auto no-scrollbar">
          <button v-for="f in filters" :key="f" class="chip h-8" :class="activeFilter===f && 'chip-active'" @click="activeFilter=f">
            {{ f }}
          </button>
        </div>
      </div>

      <!-- Bulk actions -->
      <transition name="fade">
        <div v-if="selecting" class="px-4 mt-2 flex items-center gap-2">
          <button class="btn-soft flex-1" @click="toggleAll">{{ allChecked ? 'Unselect All' : 'Select All' }}</button>
          <button class="btn-primary" :disabled="!checkedIds.size" @click="approveSelected">Approve ({{ checkedIds.size }})</button>
        </div>
      </transition>

      <!-- List -->
      <div class="px-4 py-3 space-y-3 max-h-[320px] overflow-y-auto">
        <div v-if="!displayed.length" class="text-center text-sm text-gray-500 py-8">No pending requests.</div>

        <div v-for="(req, i) in displayed" :key="req.id || req.timestamp"
             class="item-card"
             :class="swipeState[reqKey(req)]?.cls"
             @touchstart.passive="onTouchStart($event, req)"
             @touchmove.passive="onTouchMove($event, req)"
             @touchend.passive="onTouchEnd($event, req)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <img :src="req.avatar || fallbackAvatar" class="w-8 h-8 rounded-full border border-gray-300 object-cover" alt="" />
            <div class="min-w-0">
              <p class="text-sm font-semibold truncate">
                {{ req.name }}
                <span v-if="req.isVip" class="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400 text-black font-bold">VIP</span>
              </p>
              <p class="text-[11px] text-gray-500">
                {{ timeAgo(req.timestamp) }} · {{ formatTime(req.timestamp) }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <label v-if="selecting" class="h-6 w-6 grid place-items-center rounded border border-black/10 dark:border-white/20 bg-white/60 dark:bg-white/10">
              <input type="checkbox" class="accent-indigo-600" :checked="checkedIds.has(reqKey(req))" @change="toggleCheck(req)" />
            </label>
            <template v-else>
              <button @click="accept(req)" class="btn-accept" aria-label="Accept">✅</button>
              <button @click="reject(req)" class="btn-decline" aria-label="Decline">❌</button>
            </template>
          </div>
        </div>

        <!-- “More” indicator when truncated -->
        <p v-if="moreCount>0" class="text-center text-[11px] text-slate-500">
          +{{ moreCount }} more (refine search or scroll)
        </p>
      </div>

      <!-- Footer quick actions -->
      <div class="px-4 pb-3">
        <div class="rounded-xl bg-black/5 dark:bg-white/10 px-3 py-2 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span class="inline-flex items-center gap-1"><span class="dot-live"></span> Live</span>
            <label class="inline-flex items-center gap-1">
              <input type="checkbox" v-model="autoVip" />
              <span>Auto-accept VIP</span>
            </label>
          </div>
          <button class="h-8 px-3 rounded-full bg-gray-200 dark:bg-white/20" @click="snooze">Snooze 60s</button>
        </div>
      </div>

      <!-- Toast -->
      <transition name="fade">
        <div v-if="toast" class="fixed left-1/2 -translate-x-1/2 -bottom-2 translate-y-full z-[60] px-3 py-2 rounded-xl text-sm text-white bg-emerald-600 shadow">
          {{ toast }}
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/** Props */
const props = defineProps({
  requests: { type: Array, required: true },  // [{ id?, name, avatar?, timestamp, isVip? }]
  modelValue: { type: Boolean, default: true },
  maxVisible: { type: Number, default: 50 },  // pagination cap inside panel
  autoSort:   { type: Boolean, default: true }
})
const emit = defineEmits(['update:modelValue','accept','reject','approve-many','snooze','close'])

/** UI state */
const visible = ref(!!props.modelValue)
watch(() => props.modelValue, v => visible.value = v)
watch(visible, v => emit('update:modelValue', v))

/** Filters/search */
const q = ref('')
const filters = ['All','VIP','New']
const activeFilter = ref('All')

/** Selection (bulk) */
const selecting = ref(false)
const checkedIds = ref(new Set())
const allChecked = computed(() => displayed.value.length && displayed.value.every(r => checkedIds.value.has(reqKey(r))))
function toggleSelect(){ selecting.value = !selecting.value; if (!selecting.value) checkedIds.value = new Set() }
function toggleAll(){
  if (allChecked.value) checkedIds.value = new Set()
  else {
    const s = new Set(checkedIds.value)
    displayed.value.forEach(r => s.add(reqKey(r)))
    checkedIds.value = s
  }
}
function toggleCheck(req){
  const id = reqKey(req)
  const s = new Set(checkedIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  checkedIds.value = s
}

/** Sorting + filtering */
const sorted = computed(() => {
  const list = (props.requests || []).slice()
  if (props.autoSort) {
    list.sort((a,b) => {
      // VIP first, then newest
      const v = (b.isVip?1:0) - (a.isVip?1:0)
      if (v) return -v
      return (b.timestamp||0) - (a.timestamp||0)
    })
  }
  return list
})
const filtered = computed(() => {
  const term = q.value.toLowerCase()
  return sorted.value.filter(r => {
    const matchesQ = !term || String(r.name||'').toLowerCase().includes(term)
    const matchesF = activeFilter.value === 'All'
      ? true
      : activeFilter.value === 'VIP' ? !!r.isVip
      : activeFilter.value === 'New' ? (Date.now() - (r.timestamp||0) < 5*60*1000)
      : true
    return matchesQ && matchesF
  })
})
const displayed = computed(() => filtered.value.slice(0, props.maxVisible))
const moreCount = computed(() => Math.max(0, filtered.value.length - displayed.value.length))

/** Auto-accept VIP (fresh ≤10s) */
const autoVip = ref(true)
watch(() => props.requests, (list) => {
  if (!autoVip.value || !Array.isArray(list)) return
  const fresh = list.filter(r => r.isVip && Date.now() - (r.timestamp||0) < 10*1000)
  fresh.forEach(r => accept(r, true))
}, { deep:true })

/** Actions */
const toast = ref('')
function showToast(msg){ toast.value = msg; setTimeout(()=>toast.value='', 1600); try{ navigator.vibrate?.(8) }catch{} }

function accept(req, silent=false){
  emit('accept', req)
  if (!silent) showToast('✅ Added')
}
function reject(req){
  emit('reject', req)
  showToast('🛑 Declined')
}
function approveSelected(){
  const ids = new Set(checkedIds.value)
  const picks = displayed.value.filter(r => ids.has(reqKey(r)))
  if (!picks.length) return
  picks.forEach(r => emit('accept', r))
  emit('approve-many', picks)
  showToast(`✅ Approved ${picks.length}`)
  checkedIds.value = new Set()
  selecting.value = false
}
function close(){ visible.value = false; emit('close') }
function snooze(){
  visible.value = false
  emit('snooze')
  // auto-reopen after 60s (optional; parent can control via v-model pia)
  setTimeout(() => { visible.value = true }, 60000)
}

/** Swipe gestures (mobile) */
const swipeState = ref({}) // { [key]: { startX, dx, cls } }
function reqKey(r){ return r.id || r.timestamp }
function onTouchStart(e, req){
  const k = reqKey(req)
  swipeState.value[k] = { startX: e.touches[0].clientX, dx: 0, cls: '' }
}
function onTouchMove(e, req){
  const k = reqKey(req); const st = swipeState.value[k]; if (!st) return
  st.dx = e.touches[0].clientX - st.startX
  const t = Math.max(-80, Math.min(80, st.dx))
  st.cls = `translate-x-[${t}px] ${t>0?'bg-emerald-50':'bg-rose-50'}`
}
function onTouchEnd(e, req){
  const k = reqKey(req); const st = swipeState.value[k]; if (!st) return
  const d = st.dx || 0
  if (d > 60) accept(req)      // swipe right to accept
  else if (d < -60) reject(req) // swipe left to reject
  swipeState.value[k] = { startX: 0, dx: 0, cls: '' }
}

/** Helpers */
const fallbackAvatar = '/user-avatar.png'
function timeAgo(ts){
  const s = Math.max(1, Math.floor((Date.now() - Number(ts||0))/1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s/60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m/60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h/24); return `${d}d ago`
}
function formatTime(ts){
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** A11y & lifecycle */
const safeArea = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
function onKey(e){
  if (!visible.value) return
  if (e.key === 'Escape') close()
  if (e.key.toLowerCase() === 'a' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); toggleAll() }
}
</script>

<style scoped>
/* Inputs & chips */
.input { @apply rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm; }
.chip  { @apply px-3 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-black/10 dark:border-white/10; }
.chip-active { @apply bg-indigo-600 text-white; }

/* Items */
.item-card { @apply flex items-center justify-between bg-gray-50 dark:bg-white/5 px-3 py-2 rounded-lg shadow border border-black/5 dark:border-white/10 transition-transform; }
.btn-accept  { @apply bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded-full shadow; }
.btn-decline { @apply bg-rose-500 hover:bg-rose-600 text-white text-xs px-3 py-1 rounded-full shadow; }

/* Live dot */
.dot-live { width:8px; height:8px; border-radius:9999px; background:#ef4444; animation:pulse 1.2s infinite }
@keyframes pulse { 0%,100%{ transform:scale(1); opacity:.8 } 50%{ transform:scale(1.6); opacity:.3 } }

/* Scrollbar + transitions */
.no-scrollbar::-webkit-scrollbar { display: none; }
.fade-enter-active,.fade-leave-active { transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to { opacity: 0 }
</style>
