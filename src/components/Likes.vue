<template>
  <section
    class="w-full rounded-2xl border border-cyan-700/50 bg-[#0b1222] text-slate-100 overflow-hidden"
    aria-label="Likes"
  >
    <!-- Header -->
    <header class="px-4 pt-4 pb-2">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-base font-extrabold text-cyan-200">❤️ Likes</h2>
        <span class="text-[11px] text-cyan-300/80">{{ filtered.length }} shown</span>
      </div>

      <!-- Tools: search + reactions -->
      <div class="mt-2 flex items-center gap-2">
        <div class="relative flex-1">
          <input
            v-model.trim="query"
            type="search"
            inputmode="search"
            placeholder="Search username or message…"
            class="w-full h-10 rounded-xl bg-[#111a2e] text-slate-200 placeholder-slate-500
                   border border-cyan-900/50 px-9 outline-none focus:border-cyan-400"
            @keydown.esc="query=''"
            aria-label="Search likes"
          />
          <span class="absolute left-3 top-1/2 -translate-y-1/2 opacity-70">🔎</span>
          <button
            v-if="query"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] px-2 py-1 rounded bg-white/10"
            @click="query=''"
            aria-label="Clear search"
          >Clear</button>
        </div>

        <button
          class="h-10 px-3 rounded-xl bg-white/10 border border-white/10 text-xs"
          :class="dense ? 'opacity-100' : 'opacity-70'"
          @click="dense=!dense"
          aria-pressed="dense ? 'true' : 'false'"
          title="Toggle compact"
        >{{ dense ? 'Compact' : 'Cozy' }}</button>
      </div>

      <!-- Reaction chips -->
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          class="chip"
          :class="!reaction ? 'chip-active' : ''"
          @click="setReaction('')"
        >All</button>
        <button
          v-for="r in reactions"
          :key="r"
          class="chip"
          :class="reaction===r ? 'chip-active' : ''"
          @click="setReaction(r)"
        >{{ r }}</button>
      </div>
    </header>

    <!-- Body: list/grid -->
    <div class="px-4 pb-3">
      <!-- Skeletons -->
      <div v-if="loading && !items.length" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div v-for="i in 6" :key="i" class="skeleton h-[68px] rounded-xl" />
      </div>

      <!-- Empty state -->
      <div v-else-if="!filtered.length" class="text-center text-sm text-slate-400 py-8">
        No likes yet. Keep creating — watu wanakuja! ✨
      </div>

      <!-- Cards -->
      <ul
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
        :class="dense ? 'auto-rows-fr' : ''"
        role="list"
      >
        <li
          v-for="like in filtered"
          :key="like.id || like.username"
          class="group like-card rounded-xl bg-[#141e36] border border-cyan-900/40
                 hover:border-cyan-400/40 hover:shadow-[0_0_0_1px_rgba(34,211,238,.25)]
                 transition will-change-transform"
          @click="openProfile(like)"
          @pointerdown="startPress(like)"
          @pointerup="cancelPress"
          @pointercancel="cancelPress"
        >
          <div class="p-3 flex items-center gap-3">
            <!-- Avatar -->
            <div class="relative">
              <img
                :src="like.avatar || fallback"
                @error="onImgError"
                alt=""
                class="w-10 h-10 rounded-full object-cover ring-1 ring-cyan-500/40"
              />
              <span class="absolute -inset-1 rounded-full -z-10 pointer-events-none aura"></span>
            </div>

            <!-- Info -->
            <div class="min-w-0 flex-1">
              <p class="text-slate-50 font-semibold truncate leading-5">{{ like.username }}</p>
              <p class="text-xs text-slate-400 truncate">
                <span class="mr-1">{{ reactionEmoji(like) }}</span>{{ like.reaction }}
                <span v-if="like.time" class="opacity-60"> • {{ prettyTime(like.time) }}</span>
              </p>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1">
              <button
                class="icon-btn"
                title="React back"
                @click.stop="reactBack(like)"
              >💖</button>
              <button
                class="icon-btn"
                title="Follow"
                @click.stop="follow(like)"
              >➕</button>
              <!-- ripple container -->
              <span v-for="r in like._ripples || []" :key="r.id" class="ripple" :style="{ left:r.x+'px', top:r.y+'px' }"/>
            </div>
          </div>
        </li>
      </ul>

      <!-- Load more sentinel / button -->
      <div ref="sentinel" class="h-10 grid place-items-center mt-2">
        <button
          v-if="canLoadMore"
          class="text-xs px-3 py-2 rounded-lg bg-white/10 border border-white/10"
          @click="loadMore"
        >
          <span v-if="!loading">Load more</span>
          <span v-else class="inline-flex items-center gap-1"><span class="spinner h-3 w-3"></span> Loading…</span>
        </button>
        <div v-else class="text-[11px] text-slate-500">End • {{ filtered.length }} items</div>
      </div>
    </div>

    <!-- bottom safe-area spacer -->
    <div class="h-3" :style="{ paddingBottom: 'env(safe-area-inset-bottom,0px)' }" />
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

/** PROPS */
const props = defineProps({
  items: { type: Array, default: () => ([
    { username:'@esther_art', avatar:'/avatars/esther.png', reaction:'🔥 Loved your AI Course', time:Date.now()-9*60*1000 },
    { username:'@alpha_marketer', avatar:'/avatars/alpha.png', reaction:'❤️ Great Livestream!', time:Date.now()-25*60*1000 },
    { username:'@nash_tech', avatar:'/avatars/nash.png', reaction:'👏 Business tips were gold!', time:Date.now()-2*60*60*1000 },
  ]) },
  total: { type: Number, default: 0 },          // pass total from server (0 => treat as items.length)
  loading: { type: Boolean, default: false },
  pageSize: { type: Number, default: 18 }
})

/** EMITS */
const emit = defineEmits(['open','react','follow','load-more'])

/** STATE */
const query = ref('')
const reaction = ref('')       // filter value (emoji)
const dense = ref(false)
const list = ref(props.items)  // local mirror so we can push on load more
watch(() => props.items, v => { list.value = v }, { deep: true })

/** FALLBACK avatar */
const fallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="100%" height="100%" rx="40" fill="%2318253a"/><text x="50%" y="55%" font-size="28" text-anchor="middle" fill="%23a5f3fc" font-family="Arial">👤</text></svg>'
function onImgError(e){ e.target.src = fallback }

/** FILTERS */
const reactions = computed(() => {
  const set = new Set()
  list.value.forEach(it => { const e = reactionEmoji(it); if (e) set.add(e) })
  return Array.from(set)
})
const filtered = computed(() => {
  const q = query.value.toLowerCase().trim()
  return list.value.filter(it => {
    const keepR = reaction.value ? (reactionEmoji(it) === reaction.value) : true
    const keepQ = !q || (it.username?.toLowerCase().includes(q) || it.reaction?.toLowerCase().includes(q))
    return keepR && keepQ
  })
})
function setReaction(r){ reaction.value = (reaction.value === r) ? '' : r; vibrate(8) }

/** HELPERS */
function reactionEmoji(it){
  const s = String(it.reaction || '')
  const g = Array.from(s)[0] || ''
  return /\p{Extended_Pictographic}/u.test(g) ? g : ''
}
function prettyTime(t){
  const ms = Date.now() - +t
  const s = Math.max(1, Math.floor(ms/1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s/60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m/60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h/24); return `${d}d ago`
}
function vibrate(ms=10){ try { navigator.vibrate?.(ms) } catch(_){} }

/** CARD INTERACTIONS */
let pressTimer = null
function startPress(item){
  cancelPress()
  pressTimer = setTimeout(() => { openProfile(item) }, 500)
}
function cancelPress(){ if (pressTimer) clearTimeout(pressTimer); pressTimer = null }

function openProfile(item){
  vibrate(14)
  emit('open', item)
}

function rippleAt(el){
  const rect = el.getBoundingClientRect()
  const x = rect.width - 12
  const y = rect.height / 2
  return { x, y }
}
let rippleId = 0
function addRippleOn(item, el){
  const pos = rippleAt(el)
  const r = { id: ++rippleId, x: pos.x, y: pos.y }
  if (!item._ripples) item._ripples = []
  item._ripples.push(r)
  setTimeout(() => {
    item._ripples = item._ripples.filter(k => k.id !== r.id)
  }, 500)
}

function reactBack(item, e){
  vibrate(16)
  addRippleOn(item, e?.currentTarget || e?.target || document.body)
  emit('react', { to: item })
}
function follow(item, e){
  vibrate(12)
  addRippleOn(item, e?.currentTarget || e?.target || document.body)
  emit('follow', { user: item.username })
}

/** INFINITE SCROLL */
const sentinel = ref(null)
const canLoadMore = computed(() => {
  const total = props.total || list.value.length
  return list.value.length < total
})
function loadMore(){
  if (!canLoadMore.value) return
  emit('load-more', { offset: list.value.length, limit: props.pageSize })
}
let io = null
onMounted(() => {
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && canLoadMore.value && !props.loading) {
        loadMore()
      }
    }, { rootMargin: '120px' })
    sentinel.value && io.observe(sentinel.value)
  }
})
onBeforeUnmount(() => { io?.disconnect?.() })
</script>

<style scoped>
/* Chips */
.chip {
  padding: 6px 10px;
  border-radius: 9999px;
  font-size: 12px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(34,211,238,.25);
  color: #bfeaff;
}
.chip-active {
  background: linear-gradient(180deg, rgba(6,182,212,.35), rgba(34,211,238,.25));
  border-color: rgba(34,211,238,.6);
  color: #e0fbff;
}

/* Aura glow around avatar */
.aura {
  box-shadow:
    0 0 12px rgba(34,211,238,.25),
    0 0 36px rgba(14,165,233,.15);
}

/* Icon buttons */
.icon-btn {
  height: 36px; width: 36px;
  display: grid; place-items: center;
  border-radius: 9999px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.15);
}
.icon-btn:active { transform: translateY(1px); }

/* Ripple */
.ripple {
  position: absolute;
  height: 10px; width: 10px;
  background: rgba(255,255,255,.6);
  border-radius: 9999px;
  transform: translate(-50%, -50%) scale(0);
  animation: ripple .5s ease-out forwards;
}
@keyframes ripple { to { transform: translate(-50%, -50%) scale(9); opacity: 0; } }

/* Skeleton shimmer */
.skeleton {
  position: relative;
  background: linear-gradient(90deg, rgba(255,255,255,.06) 25%, rgba(255,255,255,.12) 37%, rgba(255,255,255,.06) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.2s linear infinite;
}
@keyframes shimmer { 0% {background-position: 100% 0} 100% {background-position: 0 0} }

/* Card hover micro-move */
.like-card { transition: transform .15s ease; }
.like-card:hover { transform: translateY(-2px); }

/* Spinner */
.spinner {
  box-sizing: border-box;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-right-color: currentColor;
  border-radius: 9999px;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }
</style>
