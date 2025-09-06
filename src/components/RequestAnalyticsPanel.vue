<!-- src/components/RequestAnalyticsPanel.vue (Join Requests Panel) -->
<template>
  <!-- Overlay (mobile only) -->
  <div
    v-if="visible"
    class="fixed inset-0 z-50 md:inset-auto md:pointer-events-none bg-black/40 md:bg-transparent"
    @click.self="close"
  />

  <!-- Panel: bottom-sheet on mobile, floating card on md+ -->
  <div
    v-if="visible"
    class="fixed z-[60] left-0 right-0 bottom-0 md:top-20 md:right-4 md:left-auto
           w-full md:w-80 max-w-md md:max-w-none
           rounded-t-3xl md:rounded-xl bg-white dark:bg-[#0b1020] text-slate-900 dark:text-white
           shadow-2xl border border-black/10 dark:border-white/10
           max-h-[85vh] md:max-h-[80vh] overflow-hidden"
    :style="safeArea"
    role="dialog" aria-modal="true" aria-labelledby="jr-title"
  >
    <!-- Header -->
    <div class="px-4 pt-3 pb-2 sticky top-0 bg-white/90 dark:bg-[#0b1020]/90 backdrop-blur border-b border-black/10 dark:border-white/10">
      <div class="flex items-center justify-between">
        <h3 id="jr-title" class="text-base font-extrabold text-indigo-600 flex items-center gap-2">
          📊 Join Requests
          <span class="text-[11px] px-2 py-0.5 rounded-full bg-indigo-600 text-white">{{ totalCount }}</span>
        </h3>
        <div class="flex items-center gap-1">
          <button class="h-8 px-3 rounded-full text-xs font-semibold bg-black/5 dark:bg-white/10" @click="toggleSelect">
            {{ selecting ? 'Done' : 'Select' }}
          </button>
          <button class="h-8 w-8 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 md:hidden" @click="close" aria-label="Close">✖</button>
        </div>
      </div>

      <!-- Search + filters -->
      <div class="mt-2 flex items-center gap-2">
        <div class="relative flex-1">
          <input v-model.trim="q" type="search" placeholder="Search name…" class="input w-full pl-8 h-9" />
          <span class="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">🔎</span>
        </div>
        <div class="flex gap-1 overflow-x-auto no-scrollbar">
          <button
            v-for="f in filters" :key="f"
            class="chip h-8"
            :class="activeFilter===f && 'chip-active'"
            @click="activeFilter=f"
          >{{ f }}</button>
        </div>
      </div>

      <!-- Bulk actions (when selecting) -->
      <transition name="fade">
        <div v-if="selecting" class="mt-2 flex items-center gap-2">
          <button class="btn-soft flex-1" @click="toggleAll">{{ allChecked ? 'Unselect All' : 'Select All' }}</button>
          <button class="btn-primary" :disabled="!checkedIds.size" @click="approveSelected">Approve ({{ checkedIds.size }})</button>
        </div>
      </transition>
    </div>

    <!-- List -->
    <div ref="listEl" class="px-4 py-3 space-y-3 overflow-y-auto" @scroll.passive="onScroll">
      <div v-if="loading && !displayed.length" class="space-y-3">
        <SkeletonItem v-for="i in 5" :key="i" />
      </div>

      <div v-else-if="!displayed.length" class="text-sm text-gray-500 py-12 text-center">
        No requests yet.
      </div>

      <ul v-else class="space-y-3">
        <li
          v-for="req in displayed"
          :key="req.id || req.timestamp"
          class="bg-gray-100/80 dark:bg-white/5 p-3 rounded-lg shadow border border-black/5 dark:border-white/10 flex items-center justify-between gap-3"
        >
          <!-- Left -->
          <div class="flex items-center gap-3 min-w-0">
            <img :src="req.avatar || fallbackAvatar" class="h-10 w-10 rounded-full object-cover ring-2 ring-white/60" alt="" />
            <div class="min-w-0">
              <p class="font-semibold text-sm truncate">
                {{ req.name }}
                <span v-if="req.isVip" class="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/90 text-black font-bold">VIP</span>
              </p>
              <p class="text-[11px] text-gray-500">
                {{ timeAgo(req.timestamp) }} · {{ formatTime(req.timestamp) }}
              </p>
            </div>
          </div>

          <!-- Right actions -->
          <div class="flex items-center gap-2">
            <label v-if="selecting" class="h-6 w-6 grid place-items-center rounded border border-black/10 dark:border-white/20 bg-white/60 dark:bg-white/10">
              <input type="checkbox" class="accent-indigo-600" :checked="checkedIds.has(req.id || req.timestamp)" @change="toggleCheck(req)" />
            </label>

            <template v-else>
              <button @click="emitApprove(req)" class="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-full shadow">🎤 Add</button>
              <button @click="emitReject(req)" class="text-xs bg-rose-500 hover:bg-rose-600 text-white px-2.5 py-1 rounded-full">✖</button>
            </template>
          </div>
        </li>
      </ul>

      <!-- Load more sentinel -->
      <div v-if="hasMore" class="py-4 grid place-items-center">
        <button class="h-9 px-4 rounded-full text-xs bg-black/5 dark:bg-white/10" @click="loadMore">Load more</button>
      </div>
    </div>

    <!-- Footer (desktop only quick actions) -->
    <div class="hidden md:flex items-center justify-between px-4 py-2 border-t border-black/10 dark:border-white/10 text-xs">
      <div class="text-slate-500">Auto-accept VIP</div>
      <label class="inline-flex items-center gap-2">
        <input type="checkbox" v-model="autoVip" />
        <span class="text-slate-700 dark:text-slate-200">On</span>
      </label>
    </div>

    <!-- Toast -->
    <transition name="fade">
      <div
        v-if="toast"
        class="fixed left-1/2 -translate-x-1/2 bottom-20 md:bottom-6 z-[70] px-3 py-2 rounded-xl text-sm text-white bg-emerald-600 shadow"
        aria-live="polite"
      >
        {{ toast }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, defineComponent } from 'vue'

/** Props */
const props = defineProps({
  modelValue: { type: Boolean, default: true },  // control visibility
  requests:   { type: Array,   required: true }, // [{ id?, name, avatar?, timestamp, isVip? }]
  loading:    { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue','approve','reject','approve-all','close'])

/** State */
const visible = ref(!!props.modelValue)
watch(() => props.modelValue, v => (visible.value = v))
watch(visible, v => emit('update:modelValue', v))

const q = ref('')
const filters = ['All','VIP','New']
const activeFilter = ref('All')
const selecting = ref(false)
const checkedIds = ref(new Set())
const page = ref(1)
const pageSize = 20
const listEl = ref(null)
const toast = ref('')
const autoVip = ref(true)

const fallbackAvatar = '/user-avatar.png'
const safeArea = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }

/** Derived */
const totalCount = computed(() => (props.requests || []).length)

const filtered = computed(() => {
  const term = q.value.toLowerCase()
  const base = (props.requests || []).slice().sort((a,b) => (b.timestamp||0) - (a.timestamp||0))
  return base.filter(r => {
    const matchesQ = !term || String(r.name||'').toLowerCase().includes(term)
    const matchesF =
      activeFilter.value === 'All'
        ? true
        : activeFilter.value === 'VIP'
          ? !!r.isVip
          : activeFilter.value === 'New'
            ? Date.now() - (r.timestamp||0) < 5*60*1000 // last 5 min
            : true
    return matchesQ && matchesF
  })
})

const displayed = computed(() => filtered.value.slice(0, page.value * pageSize))
const hasMore = computed(() => displayed.value.length < filtered.value.length)
const allChecked = computed(
  () => displayed.value.length && displayed.value.every(r => checkedIds.value.has(r.id || r.timestamp))
)

/** Auto-approve VIP (fresh) */
watch(() => props.requests, (list) => {
  if (!autoVip.value || !Array.isArray(list)) return
  const fresh = list.filter(r => r.isVip && Date.now() - (r.timestamp||0) < 10_000)
  if (fresh.length) fresh.forEach(r => emitApprove(r, true))
}, { deep: true })

/** Methods */
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
function toggleSelect(){ selecting.value = !selecting.value; if (!selecting.value) checkedIds.value = new Set() }
function toggleAll(){
  if (allChecked.value) checkedIds.value = new Set()
  else {
    const set = new Set(checkedIds.value)
    displayed.value.forEach(r => set.add(r.id || r.timestamp))
    checkedIds.value = set
  }
}
function toggleCheck(req){
  const id = req.id || req.timestamp
  const set = new Set(checkedIds.value)
  set.has(id) ? set.delete(id) : set.add(id)
  checkedIds.value = set
}
function onScroll(e){
  const el = e.target
  if (el.scrollTop + el.clientHeight + 120 >= el.scrollHeight && hasMore.value) loadMore()
}
function loadMore(){ page.value += 1 }

function showToast(msg){ toast.value = msg; setTimeout(() => (toast.value=''), 1800); try { navigator.vibrate?.(8) } catch {} }

function emitApprove(req, silent=false){
  emit('approve', req)
  if (!silent) showToast('✅ Approved')
}
function emitReject(req){
  emit('reject', req)
  showToast('🛑 Declined')
}
function approveSelected(){
  const ids = new Set(checkedIds.value)
  const selected = displayed.value.filter(r => ids.has(r.id || r.timestamp))
  if (!selected.length) return
  selected.forEach(r => emit('approve', r))
  emit('approve-all', selected)
  showToast(`✅ Approved ${selected.length}`)
  checkedIds.value = new Set()
  selecting.value = false
}
function close(){ visible.value = false; emit('close') }

/** Lifecycle & shortcuts */
let keyHandler
onMounted(() => {
  nextTick(() => listEl.value?.focus?.())
  keyHandler = (e) => {
    if (!visible.value) return
    if (e.key === 'Escape') close()
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault(); toggleAll()
    }
  }
  window.addEventListener('keydown', keyHandler)
})
onBeforeUnmount(() => {
  if (keyHandler) window.removeEventListener('keydown', keyHandler)
})

/** Local Skeleton (inside same <script setup>) */
const SkeletonItem = defineComponent({
  name: 'SkeletonItem',
  template: `
    <div class="bg-gray-100/80 dark:bg-white/5 p-3 rounded-lg border border-black/5 dark:border-white/10 flex items-center justify-between gap-3 overflow-hidden">
      <div class="flex items-center gap-3">
        <div class="skeleton h-10 w-10 rounded-full"></div>
        <div>
          <div class="skeleton h-3 w-32 rounded"></div>
          <div class="skeleton h-2 w-24 rounded mt-2"></div>
        </div>
      </div>
      <div class="skeleton h-7 w-16 rounded-full"></div>
    </div>
  `
})
</script>

<style scoped>
.input { @apply h-9 px-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm; }
.chip  { @apply px-3 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-black/10 dark:border-white/10; }
.chip-active { @apply bg-indigo-600 text-white; }
.btn-primary { @apply h-9 px-3 rounded-full font-semibold bg-indigo-600 text-white hover:bg-indigo-500; }
.btn-soft { @apply h-9 px-3 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-white/10; }
.no-scrollbar::-webkit-scrollbar { display: none; }

/* Skeleton shimmer */
.skeleton { position: relative; overflow: hidden; background: #e5e7eb; }
.dark .skeleton { background: rgba(255,255,255,0.08); }
.skeleton::after {
  content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.6) 50%, rgba(255,255,255,0) 100%);
  animation: shimmer 1.2s infinite; background-size: 200% 100%;
}
@keyframes shimmer { 0% { background-position: -150% 0 } 100% { background-position: 250% 0 } }

/* Transitions */
.fade-enter-active,.fade-leave-active { transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to { opacity: 0 }
</style>
