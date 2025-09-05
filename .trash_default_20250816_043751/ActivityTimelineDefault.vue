<!-- ActivityTimelineSheet.vue -->
<template>
  <section
    class="relative rounded-2xl border border-cyan-700/50 bg-[#0b1220] text-white overflow-hidden"
    role="feed"
    aria-busy="false"
  >
    <!-- Sticky header (mobile-first) -->
    <header
      class="sticky top-0 z-10 px-4 py-3 flex items-center justify-between gap-3
             bg-[#0b1220]/90 backdrop-blur border-b border-white/10"
    >
      <div class="min-w-0">
        <h2 class="text-base sm:text-lg font-bold text-cyan-300 truncate">🔄 Recent Activity</h2>
        <p class="text-[11px] text-cyan-200/70">Tap an item for details</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="h-9 px-3 rounded-xl bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20
                 border border-cyan-500/30 text-xs font-semibold"
          @click="onRefresh"
        >
          Refresh
        </button>
      </div>
    </header>

    <!-- Filter chips (scrollable on small screens) -->
    <div class="px-3 pt-2">
      <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          v-for="opt in filters"
          :key="opt.key"
          class="px-3 py-1 rounded-full text-[12px] border transition
                 bg-white/5 border-white/10 text-cyan-100/90 hover:bg-white/10"
          :class="activeFilter===opt.key ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40' : ''"
          @click="activeFilter = opt.key"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Timeline list -->
    <div
      ref="listRef"
      class="px-3 pt-2 pb-[calc(16px+env(safe-area-inset-bottom))] max-h-[70vh] overflow-y-auto select-none"
      @scroll.passive="onScroll"
    >
      <template v-if="groups.length">
        <ol class="space-y-5" role="list">
          <li v-for="grp in groups" :key="grp.label" class="space-y-3">
            <!-- Day label -->
            <div class="sticky top-[60px] z-[1] w-fit rounded-full px-3 py-1 text-[11px] font-semibold
                        bg-white/5 text-cyan-200 border border-white/10 backdrop-blur">
              {{ grp.label }}
            </div>

            <!-- Items -->
            <article
              v-for="a in grp.items"
              :key="a.id"
              class="relative flex items-start gap-3 rounded-xl p-3 bg-white/5 hover:bg-white/10
                     border border-white/10 transition"
              role="article"
              :aria-label="`${a.user} ${a.action} ${a.target}`"
              @click="onItemTap(a)"
            >
              <!-- Marker / icon -->
              <div class="relative shrink-0">
                <div class="h-10 w-10 grid place-items-center rounded-full border border-white/10
                            bg-gradient-to-br from-cyan-700/40 to-cyan-400/20 shadow-inner">
                  <span class="text-lg">{{ iconFor(a.type || a.action) }}</span>
                </div>
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0 timeline-content">
                <p class="text-[13.5px] leading-snug text-gray-200">
                  <span class="text-cyan-300 font-semibold">{{ a.user }}</span>
                  <span class="text-cyan-100/90"> {{ a.action }} </span>
                  <span class="font-semibold text-white">{{ a.target }}</span>
                </p>
                <p class="mt-1 text-[11px] text-cyan-200/70">
                  {{ a.at ? timeAgo(a.at) : (a.timeAgo || '') }}
                </p>
              </div>

              <!-- Vertical guide line -->
              <span
                class="pointer-events-none absolute left-[21px] top-0 bottom-0 w-px
                       bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent"
                aria-hidden="true"
              />
            </article>
          </li>
        </ol>

        <!-- Load more sentinel -->
        <div ref="sentinel" class="h-8 grid place-items-center text-xs text-cyan-300/60">
          <span v-if="canLoadMore && !loadingMore">Loading more on scroll…</span>
          <span v-else-if="loadingMore">Fetching…</span>
          <span v-else>— End —</span>
        </div>
      </template>

      <!-- Empty state -->
      <div v-else class="py-10 grid place-items-center text-center">
        <div class="text-3xl">🪄</div>
        <p class="mt-2 text-sm text-cyan-100/80">No recent activity yet.</p>
      </div>
    </div>

    <!-- SR-only live region -->
    <span class="sr-only" role="status" aria-live="polite">{{ liveMessage }}</span>
  </section>
</template>

<script setup>
/**
 * Mobile-first improvements:
 * - Sticky header & scrollable filter chips
 * - Grouped by day (Today / Yesterday / date)
 * - Relative time auto-updates every 60s
 * - Infinite scroll hook (IntersectionObserver)
 * - Haptics on tap (navigator.vibrate)
 * - Safe-area bottom padding
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => [
      { id: 1, user: 'Julius Zakayo', action: 'liked',         target: '"Business Growth Tips" post', at: Date.now() - 30_000, type: 'like' },
      { id: 2, user: 'Julius Zakayo', action: 'followed',      target: '@linda_ai',                    at: Date.now() - 3 * 3600_000, type: 'follow' },
      { id: 3, user: 'Julius Zakayo', action: 'received gift', target: '"Galaxy Orbit" 🎁',           at: Date.now() - 24 * 3600_000, type: 'gift' },
      { id: 4, user: 'Julius Zakayo', action: 'commented on',  target: 'AI Discussion video',          at: Date.now() - 2  * 24 * 3600_000, type: 'comment' }
    ]
  },
  canLoadMore: { type: Boolean, default: false },
  loadingMore: { type: Boolean, default: false }
})

const emit = defineEmits(['refresh','load-more','item-tap'])

/* Filters */
const filters = [
  { key: 'all',     label: 'All' },
  { key: 'like',    label: 'Likes' },
  { key: 'follow',  label: 'Follows' },
  { key: 'comment', label: 'Comments' },
  { key: 'gift',    label: 'Gifts' }
]
const activeFilter = ref('all')

/* Live region text */
const liveMessage = ref('')

/* Time helpers */
const tick = ref(0) // triggers recompute each minute
function timeAgo(dateLike){
  const d = typeof dateLike === 'number' ? new Date(dateLike) : new Date(dateLike)
  const diff = (Date.now() - d.getTime()) / 1000
  void tick.value
  const m = 60, h = 3600, dsec = 86400
  if (diff < 10) return 'Just now'
  if (diff < m)  return `${Math.floor(diff)}s ago`
  if (diff < h)  return `${Math.floor(diff/m)}m ago`
  if (diff < dsec) return `${Math.floor(diff/h)}h ago`
  if (diff < 7*dsec) return `${Math.floor(diff/dsec)}d ago`
  return d.toLocaleDateString()
}
function labelForDay(dateLike){
  const d = new Date(dateLike)
  const today = new Date(); today.setHours(0,0,0,0)
  const day = new Date(d);  day.setHours(0,0,0,0)
  const diff = Math.round((today - day)/86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return day.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' })
}

/* Filtered + grouped */
const filtered = computed(()=>{
  if (activeFilter.value === 'all') return props.items
  return props.items.filter(i => String(i.type || i.action).toLowerCase().includes(activeFilter.value))
})
const groups = computed(()=>{
  const byDay = new Map()
  const sorted = [...filtered.value].sort((a,b)=>(b.at ?? 0)-(a.at ?? 0))
  for(const it of sorted){
    const key = labelForDay(it.at ?? Date.now())
    if(!byDay.has(key)) byDay.set(key, [])
    byDay.get(key).push(it)
  }
  return [...byDay.entries()].map(([label, items]) => ({ label, items }))
})

/* Icons */
function iconFor(type=''){
  const t = String(type).toLowerCase()
  if (t.includes('like')) return '❤️'
  if (t.includes('follow')) return '➕'
  if (t.includes('gift')) return '🎁'
  if (t.includes('comment')) return '💬'
  if (t.includes('share')) return '🔗'
  return '🟣'
}

/* Interactions */
function vibrate(ms=10){ try{ navigator?.vibrate?.(ms) }catch{} }
function onItemTap(a){
  vibrate(8)
  liveMessage.value = `Opened ${a.user} ${a.action}`
  emit('item-tap', a)
}
function onRefresh(){
  vibrate(12)
  liveMessage.value = 'Refreshing…'
  emit('refresh')
}

/* Infinite scroll */
const listRef = ref(null)
const sentinel = ref(null)
let io = null
function setupIO(){
  if (!('IntersectionObserver' in window)) return
  io = new IntersectionObserver((entries)=>{
    for(const e of entries){
      if (e.isIntersecting && props.canLoadMore && !props.loadingMore){
        emit('load-more')
      }
    }
  }, { root: listRef.value, rootMargin:'128px', threshold:0 })
  sentinel.value && io.observe(sentinel.value)
}
function cleanupIO(){ io?.disconnect?.(); io=null }
function onScroll(){ /* reserved for pull-to-refresh gesture */ }

/* Lifecycle */
let interval = null
onMounted(()=>{
  setupIO()
  interval = setInterval(()=>{ tick.value++ }, 60_000)
})
onBeforeUnmount(()=>{
  cleanupIO()
  clearInterval(interval)
})
</script>

<style scoped>
/* Keep original “timeline-content” look with a subtle guide line */
.timeline-content{
  border-left: 2px solid #334155;
  padding-left: .75rem;
}

/* Hide horizontal scrollbar on chips (mobile polish) */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* Reduce iOS tap highlight */
:host, button { -webkit-tap-highlight-color: transparent; }
</style>
