<!-- src/components/modals/GiftModalMobile.vue -->
<template>
  <div
    v-if="isOpen"
    ref="overlay"
    class="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
    role="dialog"
    aria-modal="true"
    aria-labelledby="gift-title"
    tabindex="-1"
    @click.self="close('backdrop')"
    @keydown="onKeydown"
  >
    <!-- Bottom sheet / card -->
    <section
      ref="sheet"
      class="w-full sm:w-[92%] max-w-md max-h-[86vh]
             rounded-t-2xl sm:rounded-2xl overflow-hidden
             bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100
             ring-1 ring-black/10 dark:ring-white/10 shadow-2xl flex flex-col animate-in will-change-transform"
      :style="dragStyle"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <!-- Handle (mobile) -->
      <div class="sm:hidden pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
      </div>

      <!-- Header -->
      <header class="px-4 pt-2 pb-3 sm:p-5 flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10">
        <div class="min-w-0">
          <h2 id="gift-title" class="text-base sm:text-lg font-extrabold text-pink-600 dark:text-pink-400 flex items-center gap-2">
            🎁 Choose a Gift
            <span
              v-if="receiver"
              class="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-pink-600/10 text-pink-700 dark:text-pink-300 ring-1 ring-pink-600/20"
            >
              to {{ receiver?.name || 'Host' }}
            </span>
          </h2>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-400">Tap to select • Long-press to ★ favorite</p>
        </div>

        <!-- Coins -->
        <button
          class="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-bold
                 bg-amber-500/10 px-3 py-1 rounded-full ring-1 ring-amber-500/30
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          @click="goRecharge"
          :aria-label="`Balance ${balance.toLocaleString()} coins`"
        >
          <img :src="coinSrc" alt="" class="w-4 h-4" />
          <span aria-live="polite">{{ balance.toLocaleString() }}</span>
        </button>
      </header>

      <!-- Toolbar -->
      <div class="px-4 pb-2 sm:px-5 sm:pb-0 grid grid-cols-2 gap-2 items-center">
        <div class="relative col-span-2">
          <input
            v-model="query"
            type="search"
            inputmode="search"
            placeholder="Search gifts…"
            class="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm outline-none
                   focus:ring-2 ring-pink-500 placeholder-zinc-500 dark:placeholder-zinc-400"
            aria-label="Search gifts"
          />
          <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">⌕</span>
        </div>

        <select v-model="sortBy" class="rounded-xl bg-zinc-100 dark:bg-zinc-800 px-2 py-2 text-xs" aria-label="Sort">
          <option value="default">Sort</option>
          <option value="priceAsc">Price ↑</option>
          <option value="priceDesc">Price ↓</option>
          <option value="alpha">A → Z</option>
        </select>

        <select v-model="tab" class="rounded-xl bg-zinc-100 dark:bg-zinc-800 px-2 py-2 text-xs" aria-label="Filter">
          <option value="all">All</option>
          <option value="favorites">★ Favorites</option>
          <option value="recent">Recent</option>
        </select>
      </div>

      <!-- Grid -->
      <div ref="scrollArea" class="flex-1 overflow-y-auto px-4 sm:px-5 py-4 grid grid-cols-3 gap-3 content-start scroll">
        <button
          v-for="g in visibleGifts"
          :key="g.id"
          class="relative card focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          :class="[{ selected: selected?.id === g.id }]"
          @click="pick(g)"
          @touchstart.passive="startHold(g.id)"
          @touchend.passive="endHold"
          :aria-pressed="selected?.id === g.id ? 'true' : 'false'"
          :title="g.name"
        >
          <img :src="g.image || g.icon" :alt="g.name" class="w-14 h-14 mx-auto rounded-md object-cover" loading="lazy" decoding="async" />
          <p class="name">{{ g.name }}</p>
          <div class="coins">
            <img :src="coinSrc" alt="" />
            <span>{{ g.coins.toLocaleString() }}</span>
          </div>
          <span v-if="g.multiplier" class="chip">x{{ g.multiplier }}</span>
          <span v-if="isFav(g.id)" class="fav" aria-label="Favorited">★</span>
          <span v-else-if="isRecent(g.id)" class="recent">New</span>
        </button>

        <p v-if="!visibleGifts.length" class="col-span-3 text-center text-sm text-zinc-500 dark:text-zinc-400 py-10">
          No gifts found.
        </p>
      </div>

      <!-- Sticky actions -->
      <footer class="sticky bottom-0 px-4 sm:px-5 py-3 border-t border-black/10 dark:border-white/10 bg-white/90 dark:bg-zinc-900/75 backdrop-blur flex items-center justify-between gap-2">
        <div class="min-w-0">
          <p v-if="selected" class="text-[12px]">
            <span class="opacity-70">Selected:</span>
            <span class="font-semibold ml-1">{{ selected.name }}</span>
            <span class="ml-2 text-amber-600 dark:text-amber-400 font-bold">{{ selected.coins.toLocaleString() }}</span>
            <img :src="coinSrc" alt="" class="inline-block w-3 h-3 ml-1 align-[-2px]" />
          </p>
          <p v-else class="text-[12px] opacity-70">Pick a gift to continue.</p>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="rounded-full px-3 py-2 text-xs font-semibold
                   bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50
                   border border-zinc-300/60 dark:border-white/10"
            @click="close('cancel')"
          >
            Cancel
          </button>
          <button
            :disabled="!selected || sending"
            class="rounded-full px-4 py-2 text-xs font-semibold text-white
                   bg-pink-600 hover:bg-pink-700
                   disabled:opacity-60 disabled:cursor-not-allowed
                   shadow-[0_10px_24px_rgba(236,72,153,.35)] border border-white/10"
            @click="sendNow"
          >
            {{ sending ? 'Sending…' : 'Send' }}
          </button>
        </div>
      </footer>

      <!-- Safe-area spacer -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'

/** Props (supports both v-model and legacy "open") */
const props = defineProps({
  modelValue: { type: Boolean, default: undefined }, // v-model
  open: { type: Boolean, default: undefined },       // legacy
  receiver: { type: Object, default: null },
  coins: { type: Number, default: 25_000 },
  gifts: {
    type: Array,
    default: () => ([
      { id: 'rose',    name: 'Rose',    coins: 100,   image: new URL('@/assets/gifts/rose.png',   import.meta.url).href, multiplier: 1 },
      { id: 'heart',   name: 'Heart',   coins: 200,   image: new URL('@/assets/gifts/heart.png',  import.meta.url).href, multiplier: 1 },
      { id: 'crown',   name: 'Crown',   coins: 1500,  image: new URL('@/assets/gifts/crown.png',  import.meta.url).href, multiplier: 2 },
      { id: 'rocket',  name: 'Rocket',  coins: 5000,  image: new URL('@/assets/gifts/rocket.png', import.meta.url).href, multiplier: 3 },
      { id: 'trophy',  name: 'Trophy',  coins: 8000,  image: new URL('@/assets/gifts/trophy.png', import.meta.url).href, multiplier: 2 },
      { id: 'diamond', name: 'Diamond', coins: 12000, image: new URL('@/assets/gifts/diamond.png',import.meta.url).href, multiplier: 5 },
    ])
  },
  autoCloseAfterSend: { type: Boolean, default: true },
  coinIcon: { type: String, default: '/icons/smartbiz-coin.png' }
})

/** Emits — aligned with the main app */
const emit = defineEmits(['update:modelValue','update:open','close','send','gift-sent','balance-change'])

/** Router */
const router = useRouter()

/** Open state (v-model OR open) */
const isOpen = computed({
  get(){ return props.modelValue ?? props.open ?? false },
  set(v){
    emit('update:modelValue', v)
    emit('update:open', v)
    if(!v) emit('close', { reason:'program' })
  }
})

/** UI state */
const query   = ref('')
const sortBy  = ref('default') // default | priceAsc | priceDesc | alpha
const tab     = ref('all')     // all | favorites | recent
const sending = ref(false)
const selectedId = ref(null)
const balance = ref(props.coins)
watch(()=>props.coins, v => balance.value = v)

/** Favorites/Recents — same keys as other components */
const FAV_KEY = 'gift_favs'
const RECENT_KEY = 'gift_recent'
const favorites = ref(new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')))
const recents   = ref(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'))

/** Derived lists */
const list = computed(()=> props.gifts || [])
const filtered = computed(()=>{
  let arr = list.value
  if (tab.value === 'favorites') arr = arr.filter(g => favorites.value.has(g.id))
  if (tab.value === 'recent')    arr = arr.filter(g => recents.value.includes(g.id))
  const q = query.value.trim().toLowerCase()
  if (q) arr = arr.filter(g => g.name.toLowerCase().includes(q))
  return arr
})
const sorted = computed(()=>{
  const arr = [...filtered.value]
  if (sortBy.value === 'priceAsc')  arr.sort((a,b)=>a.coins-b.coins)
  if (sortBy.value === 'priceDesc') arr.sort((a,b)=>b.coins-a.coins)
  if (sortBy.value === 'alpha')     arr.sort((a,b)=>a.name.localeCompare(b.name))
  return arr
})
const visibleGifts = computed(()=> sorted.value)
const selected = computed(()=> visibleGifts.value.find(x => x.id === selectedId.value))
const coinSrc = computed(()=> props.coinIcon)

/** Refs for interactions */
const overlay = ref(null)
const sheet = ref(null)
const scrollArea = ref(null)

/** Actions */
function pick(g){
  selectedId.value = g.id
  rememberRecent(g.id)
  buzz(14)
}
async function sendNow(){
  if (!selected.value || sending.value) return
  const g = selected.value

  if (balance.value < g.coins) {
    goRecharge()
    return
  }

  sending.value = true
  balance.value -= g.coins
  emit('balance-change', balance.value)

  const payload = { ...g, to: props.receiver, timestamp: Date.now() }
  emit('send', payload)
  emit('gift-sent', payload)
  buzz(18)

  if (props.autoCloseAfterSend) close('sent')
  setTimeout(()=> sending.value = false, 450)
}
function close(reason){
  isOpen.value = false
  emit('close', { reason })
}

/** Favorites & Recents (long-press) */
let holdTimer=null
function startHold(id){ holdTimer=setTimeout(()=>toggleFav(id), 520) }
function endHold(){ clearTimeout(holdTimer); holdTimer=null }
function toggleFav(id){
  if (favorites.value.has(id)) favorites.value.delete(id)
  else favorites.value.add(id)
  localStorage.setItem(FAV_KEY, JSON.stringify([...favorites.value]))
}
function rememberRecent(id){
  const arr = recents.value.filter(x=>x!==id); arr.unshift(id)
  recents.value = arr.slice(0, 18)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recents.value))
}
function isFav(id){ return favorites.value.has(id) }
function isRecent(id){ return recents.value.includes(id) }

/** Coins / Recharge */
function goRecharge(){ router.push('/wallet/recharge'); close('recharge') }

/** Haptics */
function buzz(ms=12){ try{ navigator?.vibrate?.(ms) }catch{} }

/** Swipe-to-close — only when list is scrolled to top */
const startY = ref(0), dY = ref(0), dragging = ref(false)
const dragStyle = computed(()=>{
  if(!dragging.value) return {}
  const y=Math.max(0,dY.value), op=Math.max(1 - y/240, .5)
  return { transform:`translateY(${y}px)`, opacity:op }
})
function onTouchStart(e){
  if(e.touches?.length!==1) return
  if (scrollArea.value && scrollArea.value.scrollTop > 2) return
  dragging.value=true; startY.value=e.touches[0].clientY; dY.value=0
}
function onTouchMove(e){ if(!dragging.value) return; dY.value=e.touches[0].clientY - startY.value }
function onTouchEnd(){ if(!dragging.value) return; dragging.value=false; if(dY.value>120) close('swipe'); dY.value=0 }

/** Focus trap + keyboard nav */
function onKeydown(e){
  if (e.key === 'Escape') { e.preventDefault(); close('esc'); return }
  if (e.key !== 'Tab') return
  const focusEls = overlay.value?.querySelectorAll?.('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
  if (!focusEls || !focusEls.length) return
  const list = Array.from(focusEls).filter(el => el.offsetParent !== null)
  const first = list[0], last = list[list.length - 1]
  if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus() }
}
let lastActive=null
watch(isOpen, async v => {
  if (v){
    await nextTick()
    lastActive = document.activeElement
    overlay.value?.focus?.()
    sheet.value?.querySelector?.('input,button,select')?.focus?.()
    document.body.style.overflow='hidden'
  } else {
    document.body.style.overflow=''
    try{ lastActive?.focus?.() }catch{}
  }
})
onMounted(()=>{ if(isOpen.value){ overlay.value?.focus?.(); document.body.style.overflow='hidden' }})
onBeforeUnmount(()=>{ document.body.style.overflow='' })
</script>

<style scoped>
/* Entrance */
@keyframes in { from{ opacity:0; transform: translateY(40px) scale(.98) } to{ opacity:1; transform:none } }
.animate-in{ animation: in .28s cubic-bezier(.22,1,.36,1) both }

/* Card (high contrast on dark bg) */
.card{
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding:.7rem; border-radius:14px;
  background: rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.10);
  color:#111;
  text-align:center;
  box-shadow: 0 6px 16px rgba(0,0,0,.16);
  position:relative;
  color:#fff;
}
.card.selected{ outline:2px solid rgba(236,72,153,.85); box-shadow: 0 0 20px rgba(236,72,153,.35) }
.card .name{ margin-top:6px; font-size:.85rem; font-weight:700; text-shadow: 0 1px 2px rgba(0,0,0,.35) }
.card .coins{ display:flex; align-items:center; gap:5px; margin-top:2px; font-size:.75rem; font-weight:800; color:#f59e0b }
.card .coins img{ width:14px; height:14px }
.card .chip{ position:absolute; top:.35rem; left:.35rem; font-size:10px; padding:.1rem .35rem; border-radius:9999px; background: rgba(0,0,0,.38); color:#fff }
.card .fav{ position:absolute; top:.35rem; right:.45rem }
.card .recent{ position:absolute; bottom:-.35rem; left:50%; transform: translateX(-50%); font-size:10px; color:#f9a8d4 }

/* Scrollbar */
.scroll::-webkit-scrollbar{ width:6px }
.scroll::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.22); border-radius:10px }

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .backdrop-blur-sm{ backdrop-filter:none !important }
}
</style>
