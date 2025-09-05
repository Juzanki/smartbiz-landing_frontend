<!-- ActivityTimelineMobile.vue -->
<template>
  <section
    class="relative bg-[#0b1220] text-white rounded-2xl border border-cyan-700/50 overflow-hidden
           shadow-[0_8px_30px_rgba(0,0,0,.35)]"
    role="feed"
    aria-busy="false"
  >
    <!-- Header (sticky on mobile) -->
    <header
      class="sticky top-0 z-10 backdrop-blur bg-[#0b1220]/85 border-b border-white/10
             px-4 py-3 flex items-center justify-between gap-3"
    >
      <div class="min-w-0">
        <h2 class="text-base sm:text-lg font-bold text-cyan-300 truncate">🔄 Recent Activity</h2>
        <p class="text-[11px] text-cyan-200/70">Tap an item for details • Pull to refresh</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="h-9 px-3 rounded-xl bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30
                 text-xs font-semibold"
          @click="refresh"
        >
          Refresh
        </button>
      </div>
    </header>

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
            <div class="sticky top-12 z-[1] w-fit rounded-full px-3 py-1 text-[11px] font-semibold
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
              <!-- Marker + avatar -->
              <div class="relative shrink-0">
                <div class="h-10 w-10 grid place-items-center rounded-full border border-white/10
                            bg-gradient-to-br from-cyan-700/40 to-cyan-400/20 shadow-inner">
                  <span class="text-lg">{{ iconFor(a.type || a.action) }}</span>
                </div>
                <img
                  v-if="a.avatar"
                  :src="a.avatar"
                  :alt="`${a.user} avatar`"
                  class="absolute -right-2 -bottom-2 h-6 w-6 rounded-full border border-white/20 object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <p class="text-[13.5px] leading-snug">
                  <span class="text-cyan-300 font-semibold">{{ a.user }}</span>
                  <span class="text-cyan-100/90"> {{ a.action }} </span>
                  <span class="font-semibold text-white">{{ a.target }}</span>
                </p>
                <p class="mt-1 text-[11px] text-cyan-200/70">
                  {{ timeAgo(a.at) }}
                </p>
              </div>

              <!-- Right affordance -->
              <div class="self-center opacity-60 text-cyan-200">›</div>

              <!-- Vertical guide line -->
              <span
                class="pointer-events-none absolute left-[21px] top-0 bottom-0 w-px bg-gradient-to-b
                       from-transparent via-cyan-500/30 to-transparent"
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
 * Mobile-first, app-like activity timeline
 * - Sticky header + day grouping ("Today", "Yesterday", date)
 * - Relative time auto-updates every 60s
 * - Infinite-scroll via IntersectionObserver (emits 'load-more')
 * - Pull-to-refresh hint (manual button + event)
 * - Haptics on item tap (navigator.vibrate)
 */

import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => [
      // Fallback demo data (replace in parent with real feed)
      { id: 1, user: 'Julius Zakayo', action: 'liked', target: '"Business Growth Tips" post', at: Date.now() - 30_000, type: 'like' },
      { id: 2, user: 'Julius Zakayo', action: 'followed', target: '@linda_ai', at: Date.now() - 3 * 3600_000, type: 'follow' },
      { id: 3, user: 'Julius Zakayo', action: 'received gift', target: '"Galaxy Orbit" 🎁', at: Date.now() - 24 * 3600_000, type: 'gift' },
      { id: 4, user: 'Julius Zakayo', action: 'commented on', target: 'AI Discussion video', at: Date.now() - 2 * 24 * 3600_000, type: 'comment' }
    ]
  },
  canLoadMore: { type: Boolean, default: false },
  loadingMore: { type: Boolean, default: false }
})

const emit = defineEmits(['item-tap', 'refresh', 'load-more'])

/* Refs */
const listRef = ref(null)
const sentinel = ref(null)
const tick = ref(0) // force recompute of time ago each minute
const liveMessage = ref('')

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

/* Time helpers */
function timeAgo(dateLike){
  const d = typeof dateLike === 'number' ? new Date(dateLike) : new Date(dateLike)
  const diff = (Date.now() - d.getTime()) / 1000
  const MIN = 60, H = 3600, D = 86400
  // force use tick so computed text updates each minute
  void tick.value
  if (diff < 10) return 'Just now'
  if (diff < MIN) return `${Math.floor(diff)}s ago`
  if (diff < H) return `${Math.floor(diff / MIN)}m ago`
  if (diff < D) return `${Math.floor(diff / H)}h ago`
  if (diff < 7 * D) return `${Math.floor(diff / D)}d ago`
  return d.toLocaleDateString()
}
function labelForDay(d){
  const one = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
  const today = one(new Date())
  const day = one(new Date(d))
  const diffDays = Math.round((today - day) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

/* Grouped list by day (descending) */
const groups = computed(() => {
  const byDay = new Map()
  const sorted = [...props.items].sort((a,b) => (b.at ?? 0) - (a.at ?? 0))
  for (const it of sorted){
    const key = labelForDay(it.at)
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key).push(it)
  }
  return [...byDay.entries()].map(([label, items]) => ({ label, items }))
})

/* Haptics + tap */
function vibrate(ms=10){ try{ navigator?.vibrate?.(ms) }catch{} }
function onItemTap(a){
  vibrate(8)
  liveMessage.value = `Opened ${a.user} ${a.action}`
  emit('item-tap', a)
}

/* Refresh (pull hint left to parent; provide button) */
function refresh(){
  vibrate(12)
  liveMessage.value = 'Refreshing…'
  emit('refresh')
}

/* Infinite scroll */
let io = null
function setupIO(){
  if (!('IntersectionObserver' in window) || !sentinel.value) return
  io = new IntersectionObserver((entries) => {
    for (const e of entries){
      if (e.isIntersecting && props.canLoadMore && !props.loadingMore){
        emit('load-more')
      }
    }
  }, { root: listRef.value, rootMargin: '120px', threshold: 0 })
  io.observe(sentinel.value)
}
function cleanupIO(){ io?.disconnect?.(); io = null }
function onScroll(){ /* reserved for pull-to-refresh gesture if desired */ }

/* Minute ticker for "time ago" */
let interval = null
onMounted(() => {
  setupIO()
  interval = setInterval(() => { tick.value++ }, 60_000)
})
onBeforeUnmount(() => {
  cleanupIO()
  clearInterval(interval)
})
</script>

<style scoped>
/* Subtle in animation for the sheet style container parents often use */
@keyframes in { from{ opacity: 0; transform: translateY(8px) } to{ opacity: 1; transform: none } }
.animate-in { animation: in .25s ease-out both }

/* Reduce iOS blue tap highlight */
:host, button { -webkit-tap-highlight-color: transparent; }
</style>
