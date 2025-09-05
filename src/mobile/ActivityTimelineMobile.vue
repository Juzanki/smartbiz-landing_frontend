<template>
  <section class="ra-card">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-base font-bold text-cyan-200 flex items-center gap-2">
        <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        Recent Activity
      </h2>
      <button class="ra-btn" @click="markAllRead" v-if="hasUnread">Mark all read</button>
    </div>

    <!-- Filters -->
    <div class="flex gap-2 overflow-x-auto no-scrollbar mb-3">
      <button v-for="f in filters" :key="f.key"
              class="chip"
              :class="activeFilter === f.key ? 'chip-active' : ''"
              @click="activeFilter = f.key">
        {{ f.label }}
      </button>
    </div>

    <!-- Timeline list -->
    <ul class="timeline" role="feed" :aria-busy="loading ? 'true' : 'false'">
      <!-- Loading skeletons -->
      <li v-if="loading && visibleItems.length === 0" v-for="i in 4" :key="'sk-'+i" class="timeline-item">
        <div class="marker skel"></div>
        <div class="content">
          <div class="skel skel-line w-2/3"></div>
          <div class="skel skel-line w-1/3 mt-2"></div>
        </div>
      </li>

      <!-- Items -->
      <li v-for="(activity, idx) in visibleItems" :key="activity.id || idx"
          class="timeline-item"
          :class="['is-'+kind(activity), activity.unread && 'unread']"
          role="article"
          :aria-posinset="idx+1"
          :aria-setsize="visibleItems.length"
          @click="$emit('select', activity)">
        <div class="marker">
          <img v-if="activity.avatar" :src="activity.avatar" alt="" class="avatar" @error="onAvatarError($event)" />
          <span v-else class="avatar-fallback">{{ initials(activity.user) }}</span>
        </div>
        <div class="content">
          <p class="line">
            <span class="user">{{ activity.user }}</span>
            <span class="action">{{ prettifyAction(activity.action) }}</span>
            <span class="target">{{ activity.target }}</span>
          </p>
          <p class="meta">
            <span class="when">{{ relTime(activity) }}</span>
            <span class="dot">•</span>
            <span class="kind">{{ kindLabel(kind(activity)) }}</span>
          </p>
        </div>
      </li>

      <!-- Empty state -->
      <li v-if="!loading && visibleItems.length === 0" class="py-6 text-center text-sm text-gray-400">
        No activities yet.
      </li>

      <!-- Load-more sentinel -->
      <li v-if="canLoadMore" ref="sentinel" class="py-3 text-center text-xs text-cyan-200/70">
        Loading more…
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/** Props (keeps your data shape) */
type Activity = {
  id?: string | number
  user: string
  action: string
  target: string
  timeAgo?: string              // if provided, shown as-is
  time?: string | number | Date // ISO/epoch for live relative time
  avatar?: string
  unread?: boolean
}
const props = withDefaults(defineProps<{
  items?: Activity[],
  loading?: boolean,
  pageSize?: number
}>(), {
  items: () => ([
    { user:'Julius Zakayo', action:'liked', target:'"Business Growth Tips" post', timeAgo:'Just now', unread:true },
    { user:'Julius Zakayo', action:'followed', target:'@linda_ai', timeAgo:'3h ago' },
    { user:'Julius Zakayo', action:'received gift', target:'"Galaxy Orbit" 🎁', timeAgo:'1d ago' },
    { user:'Julius Zakayo', action:'commented on', target:'AI Discussion video', timeAgo:'2d ago' }
  ]),
  loading: false,
  pageSize: 20
})

/** State */
const activeFilter = ref<'all'|'like'|'follow'|'gift'|'comment'|'other'>('all')
const page = ref(1)
const sentinel = ref<HTMLElement|null>(null)
let io: IntersectionObserver | null = null

/** Derived lists */
const filters = [
  { key: 'all',     label: 'All' },
  { key: 'like',    label: 'Likes' },
  { key: 'follow',  label: 'Follows' },
  { key: 'gift',    label: 'Gifts' },
  { key: 'comment', label: 'Comments' },
  { key: 'other',   label: 'Other' }
] as const

function kind(a: Activity): 'like'|'follow'|'gift'|'comment'|'other' {
  const s = a.action.toLowerCase()
  if (s.includes('like')) return 'like'
  if (s.includes('follow')) return 'follow'
  if (s.includes('gift')) return 'gift'
  if (s.includes('comment')) return 'comment'
  return 'other'
}
function kindLabel(k: ReturnType<typeof kind>) {
  return k === 'like' ? 'Like'
       : k === 'follow' ? 'Follow'
       : k === 'gift' ? 'Gift'
       : k === 'comment' ? 'Comment'
       : 'Activity'
}

const filtered = computed(() => {
  if (activeFilter.value === 'all') return props.items
  return props.items.filter(a => kind(a) === activeFilter.value)
})
const visibleItems = computed(() => filtered.value.slice(0, page.value * props.pageSize))
const canLoadMore = computed(() => filtered.value.length > visibleItems.value.length)

/** Live relative time (updates every 60s) */
const tick = ref(Date.now())
let timer: number | null = null
onMounted(() => { timer = window.setInterval(() => (tick.value = Date.now()), 60_000) as unknown as number })
onBeforeUnmount(() => { if (timer) clearInterval(timer); if (io) io.disconnect() })

function relTime(a: Activity) {
  if (a.timeAgo) return a.timeAgo
  if (!a.time) return ''
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = tick.value // depend on tick for updates
  try {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    const then = new Date(a.time).getTime()
    const diff = Math.round((then - Date.now()) / 1000)
    const abs = Math.abs(diff)
    const map = [
      ['year', 60*60*24*365],
      ['month',60*60*24*30],
      ['week', 60*60*24*7],
      ['day',  60*60*24],
      ['hour', 60*60],
      ['minute',60],
      ['second',1],
    ] as const
    for (const [unit, sec] of map) {
      if (abs >= sec || unit === 'second') {
        const val = Math.round(diff / sec)
        return rtf.format(val, unit as Intl.RelativeTimeFormatUnit)
      }
    }
  } catch { /* ignore */ }
  return ''
}

/** Utilities */
function prettifyAction(s: string){ return s.replace(/\b(received gift)\b/i, 'received gift') }
function initials(name: string){
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '')
}
function onAvatarError(e: Event){ (e.target as HTMLImageElement).style.display = 'none' }

const hasUnread = computed(() => props.items.some(i => i.unread))
function markAllRead(){ props.items.forEach(i => (i.unread = false)) }

/** Infinite scroll (load-more) – emits event so parent can fetch */
watch([() => activeFilter.value, () => props.items.length], () => { page.value = 1; setupIO() })
onMounted(setupIO)
function setupIO(){
  if (io) io.disconnect()
  io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && canLoadMore.value){
        page.value += 1
        // Notify parent it's time to load additional page if needed
        emitLoadMore()
      }
    })
  }, { rootMargin: '120px 0px' })
  if (sentinel.value) io.observe(sentinel.value)
}
function emitLoadMore(){ /* consumer can listen and fetch more */
  // @ts-ignore - emits available to parent even without defineEmits
  ;(getCurrentInstance()?.emit || (()=>{}))('load-more', { page: page.value })
}
</script>

<style scoped>
/* Card */
.ra-card{
  background: #0f172a; /* slate-900 */
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid #155e75; /* cyan-700 */
}

/* Buttons & chips */
.ra-btn{
  height: 2rem; padding: 0 .6rem; border-radius: .6rem;
  background: rgba(34,197,94,.15); color:#a7f3d0; font-size:.75rem; font-weight:700;
  border: 1px solid rgba(34,197,94,.25);
}
.ra-btn:active{ transform: scale(.97) }

.chip{
  height: 2rem; padding: 0 .7rem; border-radius: 9999px;
  font-size: .75rem; font-weight: 700;
  background: rgba(34,211,238,.12);
  color: #a5f3fc;
  border: 1px solid rgba(8,145,178,.25);
  white-space: nowrap;
}
.chip-active{
  background: rgba(34,211,238,.22);
  color: #ecfeff;
  box-shadow: inset 0 0 0 1px rgba(34,211,238,.35);
}

/* Timeline */
.timeline{
  position: relative;
  padding-left: .5rem;
}
.timeline::before{
  content:""; position:absolute; left: .55rem; top:.25rem; bottom:.25rem;
  width: 2px; background: #334155; border-radius: 1px;
}
.no-scrollbar { scrollbar-width: none; } .no-scrollbar::-webkit-scrollbar { display: none; }

.timeline-item{
  display:flex; align-items:flex-start; gap:.6rem;
  position: relative;
}
.timeline-item + .timeline-item{ margin-top: .85rem; }

/* Marker / avatar */
.marker{
  position: relative; z-index:1; flex-shrink:0;
  width: 36px; height: 36px; border-radius: 9999px;
  display:grid; place-items:center;
  background: radial-gradient(65% 65% at 30% 30%, rgba(34,211,238,.9), rgba(6,182,212,.6));
  box-shadow: 0 0 0 2px #0f172a, 0 0 0 4px rgba(6,182,212,.25);
  overflow:hidden;
}
.avatar{ width:100%; height:100%; object-fit:cover; border-radius:inherit; display:block; }
.avatar-fallback{ font-size:.8rem; font-weight:800; color:#083344; background:#ecfeff; width:100%; height:100%; display:grid; place-items:center; }

/* Content */
.content{
  flex:1; border-left: 2px solid #334155; padding-left: .75rem;
}
.line{ color: #e2e8f0; font-size:.9rem; line-height:1.3; }
.user{ color: #22d3ee; font-weight: 700; }
.action{ margin: 0 .35rem; color:#e2e8f0; }
.target{ color:#fff; font-weight:700; }
.meta{ margin-top:.2rem; color:#94a3b8; font-size:.72rem; display:flex; align-items:center; gap:.4rem }
.meta .dot{ opacity:.5 }

/* Unread accent */
.unread .content{ border-left-color: #22d3ee; }
.unread .marker{ box-shadow: 0 0 0 2px #0f172a, 0 0 0 6px rgba(34,211,238,.35); }

/* Kind color accents */
.is-like .marker{ background: radial-gradient(65% 65% at 30% 30%, #fda4af, #fb7185); }
.is-follow .marker{ background: radial-gradient(65% 65% at 30% 30%, #93c5fd, #60a5fa); }
.is-gift .marker{ background: radial-gradient(65% 65% at 30% 30%, #fde68a, #f59e0b); }
.is-comment .marker{ background: radial-gradient(65% 65% at 30% 30%, #c7d2fe, #818cf8); }

/* Skeletons */
.skel{ position:relative; overflow:hidden; background: linear-gradient(90deg, rgba(255,255,255,.08), rgba(255,255,255,.04), rgba(255,255,255,.08)); background-size: 200% 100%; animation: sh 1.1s linear infinite; border-radius:.4rem; }
.skel-line{ height:.8rem; }

/* Animations */
@keyframes sh { 0%{ background-position: 200% 0 } 100%{ background-position: -200% 0 } }

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .ra-btn:active{ transform: none }
  .animate-pulse{ animation: none }
}
</style>
