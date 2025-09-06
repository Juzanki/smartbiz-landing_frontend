<!-- src/components/GiftsPanel.vue -->
<template>
  <!-- ===== Overlay mode ===== -->
  <transition name="overlay-fade" v-if="show && !inline">
    <div
      class="overlay fixed inset-0 z-[80] bg-black/60 md:bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="headingId"
      @click.self="close"
    >
      <transition name="sheet-slide">
        <section
          ref="sheetEl"
          class="sheet fixed left-1/2 -translate-x-1/2 bottom-0 w-full md:max-w-md md:mx-auto
                 md:rounded-2xl md:my-8 bg-gradient-to-b from-[#0f172a] to-[#0b1222]
                 text-white border-t md:border border-cyan-800 shadow-2xl"
          :style="{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }"
          @keydown.esc.prevent.stop="close"
          @keydown.tab.prevent="trapFocus"
          @touchstart.passive="onSwipeStart"
          @touchmove.passive="onSwipeMove"
          @touchend.passive="onSwipeEnd"
        >
          <!-- === BODY (shared) === -->
          <div class="px-4">
            <header class="pt-3 pb-2 flex items-center justify-between">
              <h2 :id="headingId" class="text-lg font-bold text-pink-300">🎁 Choose Your Gift</h2>
              <button class="icon-btn" @click="close" aria-label="Close">✖</button>
            </header>

            <!-- Search + categories -->
            <div class="space-y-2">
              <div class="relative">
                <input
                  ref="searchEl"
                  v-model="q"
                  type="search"
                  inputmode="search"
                  autocomplete="off"
                  placeholder="Search gifts…"
                  class="w-full bg-white/10 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400/60"
                  aria-label="Search gifts"
                />
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/70">🔎</span>
              </div>

              <div v-if="categories.length" class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button class="chip" :class="{ 'chip-active': activeCat==='All' }" @click="setCat('All')">All</button>
                <button
                  v-for="c in categories"
                  :key="c"
                  class="chip shrink-0"
                  :class="{ 'chip-active': activeCat===c }"
                  @click="setCat(c)"
                >{{ c }}</button>
              </div>
            </div>

            <!-- Grid / skeletons -->
            <div class="pt-2 pb-3 max-h-[62vh] overflow-y-auto no-scrollbar overscroll-contain" ref="scroller">
              <div
                v-if="!loading"
                class="grid grid-cols-3 sm:grid-cols-4 gap-3"
                role="listbox"
                aria-label="Gifts"
                :aria-activedescendant="selectedId ? `gift-${selectedId}` : undefined"
              >
                <button
                  v-for="gift in visible"
                  :key="gift.id"
                  :id="`gift-${gift.id}`"
                  class="tile"
                  role="option"
                  :aria-selected="String(gift.id===selectedId)"
                  :class="[
                    gift.id===selectedId ? 'tile-active' : '',
                    ringClass(gift.class)
                  ]"
                  @click="selectGift(gift)"
                  @dblclick="toggleFav(gift)"
                  @touchstart.passive="onTouchStart(gift)"
                  @touchend.passive="onTouchEnd"
                >
                  <span v-if="isFav(gift.id)" class="absolute top-1 right-1 text-[12px]">💖</span>

                  <img
                    :src="gift.icon"
                    :alt="gift.name"
                    class="w-[clamp(40px,12vw,58px)] h-[clamp(40px,12vw,58px)] object-contain mb-1 gift-icon"
                    loading="lazy"
                    decoding="async"
                    @error="onImgError"
                  />

                  <span class="text-[12px] font-semibold text-center leading-tight line-clamp-1">
                    {{ gift.name }}
                  </span>

                  <span class="text-yellow-300 text-[11px] font-bold">
                    🪙 {{ formatCoins(gift.coins ?? gift.price ?? 0) }}
                  </span>

                  <span class="tier" :class="badgeClass(gift.class)">{{ gift.class || 'Lite' }}</span>

                  <div class="mt-0.5 flex items-center gap-1 text-[10px] text-white/60">
                    <span v-if="gift.animation">✨ {{ gift.animation }}</span>
                    <span v-if="gift.duration" class="text-white/40">· ⏱ {{ (gift.duration/1000).toFixed(1) }}s</span>
                  </div>
                </button>
              </div>

              <div v-else class="grid grid-cols-3 sm:grid-cols-4 gap-3">
                <div v-for="i in 12" :key="i" class="tile">
                  <div class="rounded-lg" :style="box(58)"></div>
                  <div class="h-2 w-16 mt-2 rounded" :style="bar()"></div>
                  <div class="h-2 w-10 mt-1 rounded" :style="bar()"></div>
                </div>
              </div>

              <!-- sentinel -->
              <div ref="sentinel" class="h-8 grid place-items-center">
                <span v-if="moreLoading" class="text-white/60 text-sm">Loading…</span>
              </div>
            </div>

            <!-- Footer -->
            <footer class="px-0 pt-2 bg-gradient-to-t from-[#0b1222] to-transparent">
              <div class="flex items-center justify-between text-[12px] text-white/80 mb-1 px-4">
                <span>Balance: <strong class="text-yellow-300">🪙 {{ formatCoins(balance) }}</strong></span>
                <button class="underline underline-offset-4 hover:text-pink-300" @click="$emit('topup')">Top up</button>
              </div>

              <div class="flex items-center gap-3 px-4">
                <div class="flex items-center gap-2 min-w-0 flex-1 bg-white/10 border border-white/10 rounded-xl px-3 py-2">
                  <img v-if="selectedGift" :src="selectedGift.icon" :alt="selectedGift.name" class="w-7 h-7 object-contain" />
                  <div class="min-w-0">
                    <p class="text-sm font-medium truncate">{{ selectedGift?.name ?? 'Select a gift' }}</p>
                    <p class="text-[11px] text-white/70">
                      🪙 {{ formatCoins(unitCost||0) }} × {{ qty }} =
                      <span class="text-yellow-300 font-semibold">{{ formatCoins(totalCost||0) }}</span>
                    </p>
                  </div>
                </div>

                <div class="stepper">
                  <button class="step" @click="dec" aria-label="Decrease">−</button>
                  <span class="count" aria-live="polite">{{ qty }}</span>
                  <button class="step" @click="inc" aria-label="Increase">+</button>
                </div>

                <button
                  class="btn-primary"
                  :disabled="!selectedGift || totalCost > balance || sending"
                  @click="sendNow"
                >{{ sending ? '…' : 'Send' }}</button>
              </div>

              <p v-if="selectedGift && totalCost > balance" class="mt-1 text-[11px] text-rose-300 px-4">
                Insufficient balance. Top up to continue.
              </p>
            </footer>
          </div>
        </section>
      </transition>
    </div>
  </transition>

  <!-- ===== Inline mode ===== -->
  <section
    v-else
    ref="sheetEl"
    class="sheet w-full md:max-w-md md:mx-auto rounded-t-2xl md:rounded-2xl
           bg-gradient-to-b from-[#0f172a] to-[#0b1222] text-white
           border-t md:border border-cyan-800 shadow-2xl"
    :style="{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }"
    @keydown.esc.prevent.stop="close"
    @keydown.tab.prevent="trapFocus"
  >
    <!-- Tunatumia mwili ule ule kama juu -->
    <div class="px-4">
      <header class="pt-3 pb-2 flex items-center justify-between">
        <h2 :id="headingId" class="text-lg font-bold text-pink-300">🎁 Choose Your Gift</h2>
        <button class="icon-btn" @click="close" aria-label="Close">✖</button>
      </header>

      <!-- Search + categories -->
      <div class="space-y-2">
        <div class="relative">
          <input
            ref="searchEl"
            v-model="q"
            type="search"
            inputmode="search"
            autocomplete="off"
            placeholder="Search gifts…"
            class="w-full bg-white/10 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400/60"
            aria-label="Search gifts"
          />
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/70">🔎</span>
        </div>

        <div v-if="categories.length" class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button class="chip" :class="{ 'chip-active': activeCat==='All' }" @click="setCat('All')">All</button>
          <button
            v-for="c in categories"
            :key="c"
            class="chip shrink-0"
            :class="{ 'chip-active': activeCat===c }"
            @click="setCat(c)"
          >{{ c }}</button>
        </div>
      </div>

      <!-- Grid / skeletons -->
      <div class="pt-2 pb-3 max-h-[62vh] overflow-y-auto no-scrollbar overscroll-contain" ref="scroller">
        <div
          v-if="!loading"
          class="grid grid-cols-3 sm:grid-cols-4 gap-3"
          role="listbox"
          aria-label="Gifts"
          :aria-activedescendant="selectedId ? `gift2-${selectedId}` : undefined"
        >
          <button
            v-for="gift in visible"
            :key="gift.id"
            :id="`gift2-${gift.id}`"
            class="tile"
            role="option"
            :aria-selected="String(gift.id===selectedId)"
            :class="[ gift.id===selectedId ? 'tile-active' : '', ringClass(gift.class) ]"
            @click="selectGift(gift)"
            @dblclick="toggleFav(gift)"
            @touchstart.passive="onTouchStart(gift)"
            @touchend.passive="onTouchEnd"
          >
            <span v-if="isFav(gift.id)" class="absolute top-1 right-1 text-[12px]">💖</span>
            <img :src="gift.icon" :alt="gift.name" class="w-[clamp(40px,12vw,58px)] h-[clamp(40px,12vw,58px)] object-contain mb-1 gift-icon" loading="lazy" decoding="async" @error="onImgError" />
            <span class="text-[12px] font-semibold text-center leading-tight line-clamp-1">{{ gift.name }}</span>
            <span class="text-yellow-300 text-[11px] font-bold">🪙 {{ formatCoins(gift.coins ?? gift.price ?? 0) }}</span>
            <span class="tier" :class="badgeClass(gift.class)">{{ gift.class || 'Lite' }}</span>
            <div class="mt-0.5 flex items-center gap-1 text-[10px] text-white/60">
              <span v-if="gift.animation">✨ {{ gift.animation }}</span>
              <span v-if="gift.duration" class="text-white/40">· ⏱ {{ (gift.duration/1000).toFixed(1) }}s</span>
            </div>
          </button>
        </div>

        <div v-else class="grid grid-cols-3 sm:grid-cols-4 gap-3">
          <div v-for="i in 12" :key="i" class="tile">
            <div class="rounded-lg" :style="box(58)"></div>
            <div class="h-2 w-16 mt-2 rounded" :style="bar()"></div>
            <div class="h-2 w-10 mt-1 rounded" :style="bar()"></div>
          </div>
        </div>

        <div ref="sentinel" class="h-8 grid place-items-center">
          <span v-if="moreLoading" class="text-white/60 text-sm">Loading…</span>
        </div>
      </div>

      <!-- Footer -->
      <footer class="px-0 pt-2 bg-gradient-to-t from-[#0b1222] to-transparent">
        <div class="flex items-center justify-between text-[12px] text-white/80 mb-1 px-4">
          <span>Balance: <strong class="text-yellow-300">🪙 {{ formatCoins(balance) }}</strong></span>
          <button class="underline underline-offset-4 hover:text-pink-300" @click="$emit('topup')">Top up</button>
        </div>
        <div class="flex items-center gap-3 px-4">
          <div class="flex items-center gap-2 min-w-0 flex-1 bg-white/10 border border-white/10 rounded-xl px-3 py-2">
            <img v-if="selectedGift" :src="selectedGift.icon" :alt="selectedGift.name" class="w-7 h-7 object-contain" />
            <div class="min-w-0">
              <p class="text-sm font-medium truncate">{{ selectedGift?.name ?? 'Select a gift' }}</p>
              <p class="text-[11px] text-white/70">
                🪙 {{ formatCoins(unitCost||0) }} × {{ qty }} =
                <span class="text-yellow-300 font-semibold">{{ formatCoins(totalCost||0) }}</span>
              </p>
            </div>
          </div>
          <div class="stepper">
            <button class="step" @click="dec" aria-label="Decrease">−</button>
            <span class="count" aria-live="polite">{{ qty }}</span>
            <button class="step" @click="inc" aria-label="Increase">+</button>
          </div>
          <button class="btn-primary" :disabled="!selectedGift || totalCost > balance || sending" @click="sendNow">{{ sending ? '…' : 'Send' }}</button>
        </div>
        <p v-if="selectedGift && totalCost > balance" class="mt-1 text-[11px] text-rose-300 px-4">
          Insufficient balance. Top up to continue.
        </p>
      </footer>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, toRefs } from 'vue'

/* ---------- Props / Emits ---------- */
const _props = withDefaults(defineProps<{
  show: boolean
  inline?: boolean
  items: any[]
  balance?: number
  loading?: boolean
}>(), { inline: false, items: () => [], balance: 5000, loading: false })

// toa refs za majina tunayoyatumia kwenye template
const { show, inline, balance, loading } = toRefs(_props)

const emit = defineEmits<{
  (e:'close'): void
  (e:'send',  payload:{ gift:any, quantity:number, total:number }): void
  (e:'preview', gift:any): void
  (e:'topup'): void
}>()

/* ---------- IDs / Refs ---------- */
const headingId = `hdr-${Math.random().toString(36).slice(2,8)}`
const sheetEl   = ref<HTMLElement|null>(null)
const scroller  = ref<HTMLElement|null>(null)
const searchEl  = ref<HTMLInputElement|null>(null)
const sentinel  = ref<HTMLElement|null>(null)

/* ---------- State ---------- */
const selectedId = ref<string|null>(null)
const qty        = ref(1)
const q          = ref('')
const activeCat  = ref<'All'|string>('All')
const sending    = ref(false)
const moreLoading= ref(false)

/* ---------- Favorites ---------- */
const favSet = ref<Set<string>>(new Set())
onMounted(() => {
  try { favSet.value = new Set(JSON.parse(localStorage.getItem('gift:favs') || '[]')) } catch {}
})
watch(favSet, v => { try { localStorage.setItem('gift:favs', JSON.stringify([...v])) } catch {} }, { deep: true })

/* ---------- Data & Categories ---------- */
const all = ref<any[]>([])
watch(() => _props.items, (val)=> { all.value = Array.isArray(val) ? val : [] }, { immediate:true })
const categories = computed<string[]>(() => {
  const set = new Set(all.value.map(g => (g.category || g.class || '').trim()).filter(Boolean))
  return Array.from(set).sort()
})

/* ---------- Filtering + Pagination ---------- */
const page     = ref(1)
const pageSize = 12
const list     = ref<any[]>([])

const filteredBase = computed<any[]>(() => {
  let v = [...all.value]
  if (activeCat.value !== 'All') v = v.filter(g => (g.category || g.class) === activeCat.value)
  if (q.value) {
    const s = q.value.toLowerCase()
    v = v.filter(g => (g.name || '').toLowerCase().includes(s))
  }
  v.sort((a,b) => Number(isFav(b.id)) - Number(isFav(a.id)))
  return v
})
const visible = computed(() => list.value)

async function paginate(reset=false){
  if (reset) { list.value = []; page.value = 1 }
  const start = (page.value - 1) * pageSize
  const next = filteredBase.value.slice(start, start + pageSize)
  list.value.push(...next)
  page.value++
}

let io: IntersectionObserver | null = null
function mountIO(){
  if (!('IntersectionObserver' in window)) return
  io = new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if (e.isIntersecting && !loading.value && !moreLoading.value) {
        moreLoading.value = true
        setTimeout(()=>{ paginate(); moreLoading.value = false }, 220)
      }
    })
  }, { root: scroller.value ?? null, rootMargin: '300px 0px' })
  if (sentinel.value) io.observe(sentinel.value)
}
function unmountIO(){ try{ io?.disconnect() }catch{} io = null }

/* ---------- Selection & totals ---------- */
const selectedGift = computed<any|null>(() => all.value.find(g => g.id === selectedId.value) || null)
const unitCost     = computed<number>(() => Number(selectedGift.value?.coins ?? selectedGift.value?.price ?? 0))
const totalCost    = computed<number>(() => unitCost.value * qty.value)

/* ---------- Actions ---------- */
function setCat(c:string){ activeCat.value = c; vibrate(6); paginate(true) }
function selectGift(g:any){ selectedId.value = g.id; vibrate(8) }
function isFav(id:string){ return favSet.value.has(id) }
function toggleFav(g:any){ favSet.value.has(g.id) ? favSet.value.delete(g.id) : favSet.value.add(g.id); vibrate(6) }
function onImgError(e: Event){ (e.target as HTMLImageElement).src = '/gifts/placeholder.png' }
function inc(){ qty.value = Math.min(99, qty.value + 1); vibrate(4) }
function dec(){ qty.value = Math.max(1, qty.value - 1); vibrate(4) }

function sendNow(){
  if (!selectedGift.value || totalCost.value > (balance.value||0) || sending.value) return
  sending.value = true
  vibrate(12)
  setTimeout(() => {
    emit('send', { gift: selectedGift.value, quantity: qty.value, total: totalCost.value })
    sending.value = false
  }, 450)
}

/* ---------- Touch preview ---------- */
let pressTimer:number|undefined
function onTouchStart(g:any){ clearTimeout(pressTimer); pressTimer = window.setTimeout(()=> emit('preview', g), 360) }
function onTouchEnd(){ clearTimeout(pressTimer) }

/* ---------- Close & focus ---------- */
function close(){ emit('close') }
function trapFocus(e: KeyboardEvent){
  const root = sheetEl.value; if (!root) return
  const focusables = Array.from(
    root.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
  ).filter(el => !el.hasAttribute('disabled'))
  if (!focusables.length) return
  const first = focusables[0], last = focusables[focusables.length - 1]
  if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault() }
  else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault() }
}

/* ---------- Swipe-to-close (mobile) ---------- */
const swipe = ref({ y0:0, dy:0, active:false })
function onSwipeStart(ev: TouchEvent){ const t = ev.touches?.[0]; if (!t) return; swipe.value = { y0:t.clientY, dy:0, active:true } }
function onSwipeMove(ev: TouchEvent){
  if (!swipe.value.active) return
  const t = ev.touches?.[0]; if (!t) return
  swipe.value.dy = Math.max(0, t.clientY - swipe.value.y0)
  if (sheetEl.value && !inline.value) sheetEl.value.style.transform = `translate(-50%, ${Math.min(160, swipe.value.dy)}px)`
}
function onSwipeEnd(){
  if (!swipe.value.active) return
  const shouldClose = swipe.value.dy > 90
  swipe.value.active = false
  if (sheetEl.value && !inline.value) sheetEl.value.style.transform = ''
  if (shouldClose) close()
}

/* ---------- Lifecycle ---------- */
function onGlobalKey(e: KeyboardEvent){ if (e.key === 'Escape' && show.value) close() }
watch(show, async v => {
  if (!inline.value) document.body.style.overflow = v ? 'hidden' : ''
  if (v) {
    await nextTick()
    paginate(true)
    setTimeout(() => { searchEl.value?.focus?.(); mountIO() }, 10)
  } else {
    unmountIO()
  }
})
watch([q, activeCat], () => paginate(true))
onMounted(() => window.addEventListener('keydown', onGlobalKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKey)
  unmountIO()
  if (!inline.value) document.body.style.overflow = ''
})

/* ---------- Utils / skeleton styles ---------- */
function vibrate(ms:number){ try{ navigator.vibrate?.(ms) }catch{} }
function formatCoins(value:number){
  const v = Number(value || 0)
  if (v < 1000) return v
  if (v < 1_000_000) return (v/1000).toFixed(1).replace('.0','') + 'K'
  return (v/1_000_000).toFixed(1).replace('.0','') + 'M'
}
function badgeClass(level?:string){
  switch (level) {
    case 'Lite': return 'bg-green-500/80 shadow-md'
    case 'Rare': return 'bg-blue-500/80 shadow-md'
    case 'Epic': return 'bg-purple-600/80 shadow-md'
    case 'Legendary': return 'bg-orange-500/80 shadow-md'
    case 'Mythic': return 'bg-red-600/80 shadow-md'
    case 'Supreme': return 'bg-gradient-to-r from-yellow-400 to-pink-500 shadow-lg'
    default: return 'bg-gray-400/70'
  }
}
function ringClass(level?:string){
  return {
    'ring-amber': level === 'Legendary',
    'ring-red':   level === 'Mythic',
    'ring-pink':  level === 'Supreme',
  }
}
function bar(){ return { background: grad(), backgroundSize:'200% 100%', animation:'shimmer 1.2s linear infinite' } }
function box(size:number){ return { width:`${size}px`, height:`${size}px`, background:grad(), backgroundSize:'200% 100%', animation:'shimmer 1.2s linear infinite' } }
function grad(){ return 'linear-gradient(110deg, rgba(255,255,255,.12) 8%, rgba(255,255,255,.05) 18%, rgba(255,255,255,.12) 33%)' }
</script>

<style scoped>
/* ===== Transitions ===== */
.overlay-fade-enter-active, .overlay-fade-leave-active { transition: opacity .22s ease; }
.overlay-fade-enter-from, .overlay-fade-leave-to { opacity: 0; }
.sheet-slide-enter-active, .sheet-slide-leave-active { transition: transform .24s ease; }
.sheet-slide-enter-from { transform: translate(-50%, 18px); }
.sheet-slide-leave-to   { transform: translate(-50%, 18px); }

/* ===== UI bits ===== */
.icon-btn{ @apply w-9 h-9 rounded-full grid place-items-center bg-white/10 border border-white/10 hover:bg-white/20 transition; }
.chip{ @apply px-3 py-1 rounded-full text-xs bg-white/10 border border-white/10 hover:bg-white/20 transition; }
.chip-active{ @apply bg-pink-500 text-white border-pink-400; }

.tile{
  @apply relative cursor-pointer p-2 rounded-xl flex flex-col items-center
         transition-all duration-200 bg-white/10 hover:bg-white/20 backdrop-blur-md
         shadow-md border border-white/10 focus:outline-none;
}
.tile-active{ @apply ring-2 ring-offset-0 ring-pink-400/70 scale-[1.02]; }
.ring-amber.tile-active{ box-shadow: 0 0 0 2px rgba(251,191,36,.6), 0 0 24px rgba(251,191,36,.45); }
.ring-red.tile-active{   box-shadow: 0 0 0 2px rgba(239,68,68,.65), 0 0 26px rgba(239,68,68,.5); }
.ring-pink.tile-active{  box-shadow: 0 0 0 2px rgba(236,72,153,.65), 0 0 26px rgba(236,72,153,.5); }

.gift-icon{ transition: transform .22s ease, filter .22s ease; }
.tile:hover .gift-icon{ transform: scale(1.06); filter: drop-shadow(0 0 6px rgba(250,204,21,.5)); }

.tier{ @apply text-[10px] mt-1 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide text-white shadow-inner; }

.stepper{ @apply bg-white/10 border border-white/10 rounded-xl px-2 py-1 flex items-center gap-2; }
.step{ @apply w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 grid place-items-center text-lg leading-none; }
.count{ @apply min-w-[1.5rem] text-center text-sm; }
.btn-primary{ @apply bg-pink-500 hover:bg-pink-400 text-white font-semibold rounded-xl px-4 py-2 transition disabled:opacity-60; }

/* ===== Utilities ===== */
.no-scrollbar::-webkit-scrollbar{ display:none }
.no-scrollbar{ -ms-overflow-style:none; scrollbar-width:none }
.overscroll-contain{ overscroll-behavior: contain; }
.overlay{ contain: content; }

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .tile, .gift-icon,
  .sheet-slide-enter-active, .sheet-slide-leave-active,
  .overlay-fade-enter-active, .overlay-fade-leave-active { transition: none !important; }
}

/* Skeleton shimmer */
@keyframes shimmer { to { background-position-x: -200% } }
</style>
