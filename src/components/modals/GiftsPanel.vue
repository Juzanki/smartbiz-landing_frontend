<!-- src/components/modals/GiftDrawerMobilePro.vue -->
<template>
  <div
    v-if="isOpen"
    ref="overlay"
    class="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
    role="dialog" aria-modal="true" aria-labelledby="gift-title" tabindex="-1"
    @click.self="close('backdrop')" @keydown="onKeydown"
  >
    <!-- Bottom Sheet (single root so parent class attrs hupokelewa vizuri) -->
    <section
      ref="sheet"
      class="w-full max-w-3xl max-h-[88vh] rounded-t-3xl sm:rounded-2xl overflow-hidden
             bg-gradient-to-br from-[#0f172a]/95 via-[#1e293b]/95 to-[#1e40af]/90 text-white
             ring-1 ring-white/10 shadow-2xl flex flex-col animate-in will-change-transform"
      :style="dragStyle"
      @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend.passive="onTouchEnd"
    >
      <!-- Handle (mobile) -->
      <div class="sm:hidden pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-white/20"></div>
      </div>

      <!-- Header -->
      <header class="px-5 sm:px-6 py-3 sm:py-4 bg-white/10 border-b border-white/10 flex items-center justify-between gap-2">
        <div class="min-w-0">
          <h2 id="gift-title" class="text-base sm:text-lg font-extrabold text-pink-400 flex items-center gap-2">
            🎁 <span>Select a Gift</span>
            <span v-if="receiver" class="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-white/10 ring-1 ring-white/15">
              to {{ receiver?.name || 'Host' }}
            </span>
          </h2>
          <p class="text-[11px] text-white/70">Tap to send • Long-press to ★ favorite</p>
        </div>

        <!-- Balance pill (high contrast) -->
        <button
          class="flex items-center gap-1 text-amber-300 text-xs font-bold bg-white/10 px-3 py-1 rounded-full border border-yellow-400/30 shadow-inner
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          :aria-label="`Balance ${balance.toLocaleString()} coins`"
          @click="emit('recharge-request')"
        >
          <img :src="coinSrc" alt="" class="w-4 h-4"/>
          <span aria-live="polite">{{ balance.toLocaleString() }}</span>
        </button>
      </header>

      <!-- Toolbar -->
      <div class="px-5 sm:px-6 py-3 bg-black/15 border-b border-white/10 grid grid-cols-2 gap-2 items-center">
        <div class="relative col-span-2">
          <input
            v-model="query" type="search" inputmode="search" placeholder="Search gifts…"
            class="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm outline-none focus:ring-2 ring-pink-400 placeholder-white/70"
            aria-label="Search gifts"
          />
          <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-white/70">⌕</span>
        </div>

        <select v-model="sortBy" class="rounded-xl bg-white/10 border border-white/20 px-2 py-2 text-xs">
          <option value="default">Sort</option>
          <option value="priceAsc">Price ↑</option>
          <option value="priceDesc">Price ↓</option>
          <option value="alpha">A → Z</option>
        </select>

        <select v-model="tab" class="rounded-xl bg-white/10 border border-white/20 px-2 py-2 text-xs">
          <option value="all">All</option>
          <option value="favorites">★ Favorites</option>
          <option value="recent">Recent</option>
          <option v-for="t in tierTabs" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <!-- Quick tier chips (mobile scroll) -->
      <div class="px-5 sm:px-6 pt-3 pb-1 flex gap-2 overflow-x-auto whitespace-nowrap text-[11px] no-scrollbar">
        <button v-for="t in quickTiers" :key="t"
                class="px-3 py-1 rounded-full bg-white/5 border border-white/10"
                @click="tab=t">{{ t }}</button>
      </div>

      <!-- Grid -->
      <div ref="scrollArea" class="flex-1 overflow-y-auto px-5 sm:px-6 py-4 gift-scroll-area">
        <div class="grid grid-cols-3 sm:grid-cols-4 gap-4">
          <button
            v-for="g in visibleGifts"
            :key="g.id"
            class="relative gift-card focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            :class="[{ 'gift-selected': selectedId===g.id }, disabledClass(g)]"
            :disabled="g.coins > balance"
            :aria-disabled="g.coins > balance ? 'true' : 'false'"
            @click="onSend(g)"
            @touchstart.passive="startHold(g.id)" @touchend.passive="endHold"
            :title="g.name"
          >
            <img :src="g.icon || g.image" :alt="g.name" class="w-16 h-16 mx-auto rounded-md object-contain" loading="lazy" decoding="async"/>
            <p class="gift-name">{{ g.name }}</p>
            <div class="gift-coins">
              <img :src="coinSrc" alt="" />
              <span>{{ g.coins.toLocaleString() }}</span>
            </div>

            <!-- Badges -->
            <span class="chip-left">{{ g.tier || 'Lite' }}</span>
            <span v-if="isFav(g.id)" class="chip-right">★</span>
            <span v-else-if="isRecent(g.id)" class="chip-right subtle">New</span>

            <!-- Insufficient overlay -->
            <div v-if="g.coins > balance" class="insufficient">Insufficient</div>
          </button>
        </div>

        <p v-if="!visibleGifts.length" class="text-center text-sm text-white/70 py-10">No gifts found.</p>
      </div>

      <!-- Footer (neutral + strong CTA color) -->
      <footer class="sticky bottom-0 px-5 sm:px-6 py-3 border-t border-white/10 bg-white/10 backdrop-blur-md flex items-center justify-between gap-2">
        <span class="text-xs text-white/80">Need more coins?</span>
        <button
          class="glow-button text-xs flex items-center gap-2"
          @click="emit('recharge-request'); close('recharge')"
        >
          <img :src="coinSrc" alt="" class="w-4 h-4"/>
          Recharge
        </button>
      </footer>

      <!-- Safe-area spacer -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { giftList as defaultGifts } from '@/data/giftList.js'

/* ---------- Props: support both v-model and legacy "open" ---------- */
const props = defineProps({
  modelValue: { type: Boolean, default: undefined }, // v-model
  open:       { type: Boolean, default: undefined }, // legacy
  gifts:      { type: Array,   default: () => defaultGifts },
  userCoins:  { type: Number,  default: 0 },
  receiver:   { type: Object,  default: null },
  autoCloseAfterSend: { type: Boolean, default: false },
  coinIcon:   { type: String,  default: '/icons/smartbiz-coin.png' }
})

/* ---------- Emits: aligned with LiveRoom + extras ---------- */
const emit = defineEmits([
  'update:modelValue','update:open', // v-model mirroring
  'close',                           // reason: 'backdrop'|'esc'|'swipe'|'recharge'|'program'
  'send', 'gift-sent',               // payload gift + timestamp
  'balance-change',                  // new coins if you decide to manage here
  'recharge-request'                 // optional hook for wallet modal
])

/* ---------- Open state ---------- */
const isOpen = computed({
  get(){ return props.modelValue ?? props.open ?? true },
  set(v){
    emit('update:modelValue', v)
    emit('update:open', v)
    if (!v) emit('close', { reason:'program' })
  }
})

/* ---------- UI state ---------- */
const query = ref(''); const sortBy = ref('default'); const tab = ref('all')
const selectedId = ref(null)
const balance = ref(props.userCoins)
watch(()=>props.userCoins, v => balance.value = v)

/* ---------- Lists / filters ---------- */
const tierTabs   = ['Lite','Rare','Epic','Legendary','Mythic','Supreme']
const quickTiers = tierTabs
const list = computed(()=> (props.gifts || []))

const FAV_KEY='gift_favs', RECENT_KEY='gift_recent'
const favorites = ref(new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')))
const recents   = ref(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'))

const filtered = computed(()=>{
  let arr = list.value
  if (tab.value === 'favorites') arr = arr.filter(g => favorites.value.has(g.id))
  else if (tab.value === 'recent') arr = arr.filter(g => recents.value.includes(g.id))
  else if (tierTabs.includes(tab.value)) arr = arr.filter(g => (g.tier||'').toLowerCase() === tab.value.toLowerCase())

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
const selected = computed(()=> visibleGifts.value.find(x=>x.id===selectedId.value))
const coinSrc = computed(()=> props.coinIcon)

/* ---------- Actions ---------- */
function onSend(g){
  selectedId.value = g.id
  rememberRecent(g.id); buzz(14)

  // Kama balance haitosheki – toa hook ya recharge na usitume
  if (g.coins > balance.value) { emit('recharge-request'); return }

  const payload = { ...g, to: props.receiver, timestamp: Date.now() }
  emit('send', payload)
  emit('gift-sent', payload)

  if (props.autoCloseAfterSend) { close('sent') }
}
function close(reason){ isOpen.value = false; emit('close', { reason }) }

/* ---------- Favorites / Recents (long-press) ---------- */
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

/* ---------- Haptics ---------- */
function buzz(ms=12){ try{ navigator?.vibrate?.(ms) }catch{} }

/* ---------- Swipe-to-close (only when list top) + focus trap ---------- */
const startY = ref(0), dY = ref(0), dragging = ref(false)
const dragStyle = computed(()=> dragging.value ? {
  transform:`translateY(${Math.max(0,dY.value)}px)`, opacity: Math.max(1 - Math.max(0,dY.value)/240, .5)
} : {})

const overlay = ref(null), sheet = ref(null), scrollArea = ref(null)

function onTouchStart(e){
  if(e.touches?.length!==1) return
  if (scrollArea.value && scrollArea.value.scrollTop > 2) return // usizime scroll
  dragging.value=true; startY.value=e.touches[0].clientY; dY.value=0
}
function onTouchMove(e){ if(!dragging.value) return; dY.value = e.touches[0].clientY - startY.value }
function onTouchEnd(){ if(!dragging.value) return; dragging.value=false; if(dY.value>120) close('swipe'); dY.value=0 }

function onKeydown(e){
  if (e.key === 'Escape'){ e.preventDefault(); close('esc'); return }
  if (e.key !== 'Tab') return
  const focusEls = overlay.value?.querySelectorAll?.('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
  if (!focusEls?.length) return
  const list = Array.from(focusEls).filter(el => el.offsetParent !== null)
  const first = list[0], last = list[list.length-1]
  if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus() }
}

/* Scroll-lock while open */
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
onMounted(()=>{ if(isOpen.value){ overlay.value?.focus?.(); document.body.style.overflow='hidden' } })
onBeforeUnmount(()=>{ document.body.style.overflow='' })

/* ---------- Helpers ---------- */
function disabledClass(g){ return g.coins > balance.value ? 'disabled' : '' }
</script>

<style scoped>
/* Entrance */
@keyframes in{ from{ opacity:0; transform: translateY(60px) scale(.95); filter: blur(6px) } to{ opacity:1; transform:none; filter:none } }
.animate-in{ animation: in .42s cubic-bezier(.22,1,.36,1) both }

/* Cards */
.gift-card{
  position:relative; padding:14px; border-radius:18px; text-align:center;
  background: linear-gradient(145deg, rgba(255,255,255,.03), rgba(255,255,255,.015));
  border:1px solid rgba(255,255,255,.08);
  backdrop-filter: blur(10px);
  transition: transform .25s ease, box-shadow .3s ease;
  box-shadow: 0 6px 16px rgba(0,0,0,.16);
  color:#fff;
}
.gift-card:active{ transform: scale(.98) }
.gift-selected{ outline:2px solid rgba(236,72,153,.85); box-shadow: 0 0 18px rgba(236,72,153,.38) }

.gift-name{ font-size:.86rem; font-weight:800; margin-top:6px; text-shadow:0 1px 2px rgba(0,0,0,.4) }
.gift-coins{ display:flex; justify-content:center; align-items:center; gap:4px; margin-top:2px; font-size:.75rem; font-weight:800; color:#facc15 }
.gift-coins img{ width:14px; height:14px }

/* Badges */
.chip-left{ position:absolute; top:.35rem; left:.4rem; font-size:10px; padding:.1rem .4rem; border-radius:9999px; background: rgba(0,0,0,.4) }
.chip-right{ position:absolute; top:.35rem; right:.45rem; font-size:11px }
.chip-right.subtle{ font-size:10px; opacity:.8 }

/* Insufficient overlay */
.insufficient{
  position:absolute; inset:0; display:grid; place-items:center;
  background: rgba(2,6,23,.6); font-size:.78rem; font-weight:800; color:#fca5a5;
  border-radius:18px; text-transform:uppercase; letter-spacing:.06em;
}

/* Disabled style if not enough coins */
.disabled{ opacity:.6; filter:saturate(.7) }
.disabled:active{ transform:none }

/* Scrollbars */
.no-scrollbar::-webkit-scrollbar{ display:none }
.gift-scroll-area{ scrollbar-width: thin }
.gift-scroll-area::-webkit-scrollbar{ width:6px }
.gift-scroll-area::-webkit-scrollbar-thumb{ background: rgba(255,255,255,.16); border-radius:10px }

/* CTA button (high-contrast) */
.glow-button{
  background: linear-gradient(90deg, #fef08a, #fde047);
  color:#111; font-weight:700; padding:.5rem 1.1rem; border-radius:9999px;
  box-shadow: 0 0 16px rgba(253,224,71,.45); transition: transform .22s ease, box-shadow .3s;
}
.glow-button:hover{ transform: scale(1.06); box-shadow: 0 0 30px rgba(253,224,71,.6), 0 0 60px rgba(253,224,71,.35) }

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .backdrop-blur-sm{ backdrop-filter: none !important; }
}
</style>
