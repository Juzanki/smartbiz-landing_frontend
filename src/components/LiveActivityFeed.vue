<template>
  <section
    class="w-full max-w-xl mx-auto rounded-2xl border border-slate-200 dark:border-white/10
           bg-white dark:bg-[#0b1020] text-slate-900 dark:text-white overflow-hidden"
    aria-label="Live Activity"
  >
    <!-- Header (sticky) -->
    <header class="sticky top-0 z-10 bg-white/80 dark:bg-[#0b1020]/80 backdrop-blur px-4 pt-3 pb-2 border-b border-black/5 dark:border-white/10">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="live-dot" aria-hidden="true"></span>
          <h2 class="text-base font-extrabold truncate">Live Activity</h2>
        </div>
        <div class="flex items-center gap-2">
          <button class="chip" :class="follow ? 'chip-active' : ''" @click="toggleFollow" title="Auto-scroll to newest">
            ↧ Follow
          </button>
          <button class="chip" :class="paused ? 'chip-active' : ''" @click="togglePause" title="Pause">
            ⏸ Pause
          </button>
          <button class="chip" @click="clearAll" title="Clear feed">🧹</button>
        </div>
      </div>

      <!-- Search + filter chips -->
      <div class="mt-2 flex items-center gap-2">
        <div class="relative flex-1">
          <input
            v-model.trim="query"
            type="search" inputmode="search"
            placeholder="Search user or text…"
            class="w-full h-10 rounded-xl bg-black/5 dark:bg-white/10 px-9 text-sm outline-none
                   border border-black/10 dark:border-white/10 placeholder-slate-400 dark:placeholder-slate-500"
            aria-label="Search activity"
          />
          <span class="absolute left-3 top-1/2 -translate-y-1/2 opacity-70">🔎</span>
          <button
            v-if="query"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] px-2 py-1 rounded bg-black/10 dark:bg-white/10"
            @click="query=''"
          >Clear</button>
        </div>
      </div>

      <div class="mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button class="chip" :class="filter==='' ? 'chip-active' : ''" @click="setFilter('')">All</button>
        <button class="chip" :class="filter==='like' ? 'chip-active' : ''" @click="setFilter('like')">🔥 Likes</button>
        <button class="chip" :class="filter==='comment' ? 'chip-active' : ''" @click="setFilter('comment')">💬 Comments</button>
        <button class="chip" :class="filter==='gift' ? 'chip-active' : ''" @click="setFilter('gift')">🎁 Gifts</button>
        <button class="chip" :class="filter==='join' ? 'chip-active' : ''" @click="setFilter('join')">👥 Joins</button>
        <button class="chip" :class="filter==='pin' ? 'chip-active' : ''" @click="setFilter('pin')">⭐ Pins</button>
      </div>
    </header>

    <!-- “New events” pill when not at bottom -->
    <transition name="pill">
      <button
        v-if="pendingCount>0 && !atBottom"
        class="mx-auto mt-2 mb-1 block text-xs px-3 py-1 rounded-full bg-indigo-600 text-white"
        @click="jumpToBottom"
      >{{ pendingCount }} new ↓</button>
    </transition>

    <!-- List -->
    <div ref="scroller" class="max-h-[70dvh] overflow-y-auto px-3 pb-3" @scroll="onScroll">
      <!-- Top sentinel for older -->
      <div ref="topSentinel" class="h-1"></div>

      <!-- Skeletons when loading older -->
      <div v-if="loadingOlder" class="space-y-2 px-1 py-2">
        <div v-for="i in 3" :key="'sk'+i" class="skeleton h-[56px] rounded-xl"></div>
      </div>

      <ul class="space-y-2">
        <li
          v-for="it in visible"
          :key="it.id"
          class="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2
                 flex items-start gap-3 shadow-sm"
        >
          <!-- Icon / Avatar -->
          <div class="shrink-0">
            <div v-if="it.avatar" class="relative">
              <img :src="it.avatar" @error="onImgError" alt="" class="h-9 w-9 rounded-full object-cover ring-1 ring-white/30" />
              <span class="abs-badge" v-text="typeIcon(it.type)" :title="it.type"></span>
            </div>
            <div v-else class="h-9 w-9 grid place-items-center rounded-full text-lg" :class="iconBg(it.type)">
              {{ typeIcon(it.type) }}
            </div>
          </div>

          <!-- Content -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1 text-sm">
              <button class="font-semibold hover:underline truncate" @click="$emit('open-profile', it)">{{ it.user }}</button>
              <span class="opacity-70 truncate">· {{ summary(it) }}</span>
            </div>
            <p v-if="it.text" class="text-[13px] text-slate-600 dark:text-slate-300 mt-0.5 break-words">{{ it.text }}</p>
            <div class="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span>{{ relTime(it.time) }}</span>
              <span v-if="it.meta?.amount">• +{{ it.meta.amount }} {{ it.meta.unit || '' }}</span>
              <span v-if="it.meta?.gift">• 🎁 {{ it.meta.gift }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1">
            <button class="icon" :class="it.pinned ? 'icon-active' : ''" @click="$emit('pin', it)">⭐</button>
            <button class="icon" @click="$emit('act', it)">⋯</button>
          </div>
        </li>
      </ul>

      <!-- End -->
      <div class="py-3 text-center text-[11px] text-slate-500" v-if="!canLoadOlder && !visible.length">
        No activity yet — keep the show going! ✨
      </div>
    </div>

    <!-- Bottom safe-area spacer -->
    <div class="h-2" :style="{ paddingBottom: 'env(safe-area-inset-bottom,0px)' }"/>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

/** PROPS */
const props = defineProps({
  /** Initial events (newest last). Each item: {id,type,user,text,time,avatar?,meta?} */
  items: {
    type: Array,
    default: () => ([
      { id: '1', type: 'like',    user: '@nash_tech',   text: '🔥 Loved it',                time: Date.now()-45_000, avatar:'/avatars/nash.png' },
      { id: '2', type: 'join',    user: '@alpha_marketer', text: '',                        time: Date.now()-120_000, avatar:'/avatars/alpha.png' },
      { id: '3', type: 'gift',    user: '@esther_art',  text: 'Gifted Super Star',         time: Date.now()-240_000, avatar:'/avatars/esther.png', meta:{ gift:'Super Star', amount:100, unit:'Coins' } },
      { id: '4', type: 'comment', user: '@neo',         text: 'This tip is 🔥',            time: Date.now()-300_000 },
    ])
  },
  total:         { type: Number, default: 0 },    // if paginating older
  pageSize:      { type: Number, default: 20 },
  loadingOlder:  { type: Boolean, default: false }
})

/** EMITS */
const emit = defineEmits(['load-older','pin','act','open-profile'])

/** STATE */
const scroller = ref(null)
const topSentinel = ref(null)
const atBottom = ref(true)
const paused = ref(false)
const follow = ref(true)
const query = ref('')
const filter = ref('') // '', 'like','comment','gift','join','pin'
const data = ref([...props.items])   // internal mirror
const pendingCount = ref(0)

/** Watch external items change (replace) */
watch(() => props.items, (v) => {
  data.value = [...v]
  // on replace, decide scroll
  nextTick(() => maybeFollow())
}, { deep: true })

/** DERIVED */
const canLoadOlder = computed(() => {
  const tot = props.total || data.value.length
  return data.value.length < tot
})
const visible = computed(() => {
  const q = query.value.toLowerCase().trim()
  return data.value.filter(it => {
    const okType = !filter.value || it.type === filter.value
    const okQ = !q || it.user?.toLowerCase().includes(q) || it.text?.toLowerCase().includes(q)
    return okType && okQ
  })
})

/** HELPERS */
function typeIcon(t){
  return ({ like:'🔥', comment:'💬', gift:'🎁', join:'👥', pin:'⭐' }[t] || '📣')
}
function iconBg(t){
  return ({
    like:'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
    comment:'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200',
    gift:'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
    join:'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
    pin:'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200',
  }[t] || 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white')
}
function summary(it){
  switch (it.type) {
    case 'like': return 'liked'
    case 'comment': return 'commented'
    case 'gift': return 'sent a gift'
    case 'join': return 'joined'
    case 'pin': return 'pinned'
    default: return 'reacted'
  }
}
function relTime(t){
  const s = Math.max(1, Math.round((Date.now() - +t)/1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s/60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m/60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h/24); return `${d}d ago`
}
function vibrate(ms=10){ try { navigator.vibrate?.(ms) } catch(_){} }
function onImgError(e){
  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="100%" height="100%" rx="36" fill="%2311203a"/><text x="50%" y="56%" font-size="28" text-anchor="middle" fill="white" font-family="Arial">👤</text></svg>'
}

/** FILTER actions */
function setFilter(v){ filter.value = (filter.value === v ? '' : v); vibrate(8) }

/** FOLLOW / SCROLL */
function onScroll(){
  const el = scroller.value
  if (!el) return
  const threshold = 24
  atBottom.value = (el.scrollHeight - el.scrollTop - el.clientHeight) <= threshold
  if (atBottom.value) pendingCount.value = 0
}
function jumpToBottom(){
  const el = scroller.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  pendingCount.value = 0
}
function maybeFollow(){
  if (paused.value || !follow.value) return
  if (atBottom.value) jumpToBottom()
}

/** PUBLIC append API (for real-time pushes) */
function append(event){
  data.value.push(event)
  if (!atBottom.value) pendingCount.value++
  nextTick(() => maybeFollow())
}
defineExpose({ append })

/** CONTROLS */
function togglePause(){ paused.value = !paused.value; vibrate(8) }
function toggleFollow(){ follow.value = !follow.value; vibrate(8); if (follow.value) nextTick(() => jumpToBottom()) }
function clearAll(){ data.value = []; pendingCount.value = 0; vibrate(10) }

/** LOAD OLDER (infinite scroll up) */
let ioTop = null
onMounted(() => {
  // Start near bottom for mobile chat-like
  nextTick(() => jumpToBottom())
  if ('IntersectionObserver' in window) {
    ioTop = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && canLoadOlder.value) {
        emit('load-older', { before: data.value[0]?.id, limit: props.pageSize })
      }
    }, { root: scroller.value, rootMargin: '200px 0px 0px 0px', threshold: 0 })
    topSentinel.value && ioTop.observe(topSentinel.value)
  }
})
onBeforeUnmount(() => { ioTop?.disconnect?.() })
</script>

<style scoped>
/* Live dot */
.live-dot {
  width: 10px; height: 10px; border-radius: 9999px; background: #ef4444;
  box-shadow: 0 0 0 0 rgba(239,68,68,.6);
  animation: pulse 1.4s infinite;
}
@keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(239,68,68,.6)} 70%{box-shadow:0 0 0 8px rgba(239,68,68,0)} 100%{box-shadow:0 0 0 0 rgba(239,68,68,0)} }

/* Chips */
.chip {
  padding: 6px 10px; border-radius: 9999px; font-size: 12px;
  background: rgba(0,0,0,.05); border: 1px solid rgba(0,0,0,.08);
}
.dark .chip { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.12); }
.chip-active {
  background: linear-gradient(180deg, rgba(99,102,241,.35), rgba(59,130,246,.25));
  border-color: rgba(99,102,241,.45); color: white;
}

/* Icon buttons */
.icon {
  height: 32px; width: 32px; display:grid; place-items:center;
  border-radius: 9999px; background: rgba(0,0,0,.05);
  border: 1px solid rgba(0,0,0,.08);
}
.dark .icon { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.12); }
.icon-active { background: rgba(250,204,21,.25); border-color: rgba(250,204,21,.5); }

/* Tiny badge at avatar corner */
.abs-badge {
  position: absolute; right: -6px; bottom: -6px;
  height: 18px; width: 18px; font-size: 12px;
  display:grid; place-items:center; border-radius: 9999px;
  background: #111827; color: white; border: 1px solid rgba(255,255,255,.6);
}

/* “New events” pill */
.pill-enter-active, .pill-leave-active { transition: opacity .18s ease, transform .18s ease; }
.pill-enter-from, .pill-leave-to { opacity: 0; transform: translateY(4px); }

/* Skeleton shimmer */
.skeleton {
  position: relative;
  background: linear-gradient(90deg, rgba(0,0,0,.05) 25%, rgba(0,0,0,.08) 37%, rgba(0,0,0,.05) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.1s linear infinite;
}
.dark .skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,.06) 25%, rgba(255,255,255,.1) 37%, rgba(255,255,255,.06) 63%);
}
@keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }

/* Hide horizontal scrollbar on chips */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
