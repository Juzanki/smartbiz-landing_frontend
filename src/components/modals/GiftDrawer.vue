<!-- src/components/modals/GiftDrawerRoyal.vue -->
<template>
  <transition name="gd-fade">
    <div
      v-if="visible"
      ref="overlay"
      class="fixed inset-0 z-[140] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gift-title"
      tabindex="-1"
      @click.self="emit('close')"
      @keydown="onKeydown"
    >
      <!-- Bottom sheet (mobile) / centered (sm+) -->
      <section
        ref="sheet"
        class="w-full max-w-4xl max-h-[88vh]
               rounded-t-3xl sm:rounded-2xl overflow-hidden
               bg-gradient-to-br from-[#0f172a]/90 via-[#1e293b]/90 to-[#334155]/90
               text-white ring-1 ring-white/10 shadow-2xl flex flex-col animate-fade-in will-change-transform"
        :style="dragStyle"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd"
      >
        <!-- Header -->
        <header class="flex items-center justify-between gap-2 px-5 py-3 border-b border-white/10 bg-white/5">
          <h2 id="gift-title" class="text-base sm:text-lg font-bold text-pink-400 flex items-center gap-2">
            🎁 <span>Select a Gift</span>
            <span v-if="receiver" class="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-white/10 ring-1 ring-white/15">
              to {{ receiver?.name || 'Host' }}
            </span>
          </h2>

          <div class="flex items-center gap-2">
            <!-- Coins -->
            <button
              class="flex items-center gap-1 text-yellow-300 text-xs font-bold bg-white/10 px-3 py-1 rounded-full border border-yellow-400/30 shadow-inner focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              @click="goRecharge"
              aria-label="Recharge coins"
            >
              <img :src="coinSrc" alt="" class="w-4 h-4" />
              <span aria-live="polite">{{ coins.toLocaleString() }}</span>
            </button>

            <!-- Close -->
            <button
              @click="emit('close')"
              class="text-white/80 hover:text-red-400 text-xl leading-none rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              aria-label="Close"
            >✕</button>
          </div>
        </header>

        <!-- Toolbar -->
        <div class="px-5 py-3 flex items-center gap-2 border-b border-white/10 bg-black/20">
          <!-- Tabs -->
          <div class="flex-1 min-w-0">
            <div class="flex gap-2 overflow-x-auto no-scrollbar text-[12px] font-semibold text-white/90">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                @click="activeTab = tab.key"
                :class="[
                  'px-3 py-1 rounded-full whitespace-nowrap border border-white/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400',
                  activeTab === tab.key ? 'bg-pink-500 text-white shadow' : 'bg-white/5 hover:bg-white/10'
                ]"
                :aria-pressed="activeTab === tab.key"
              >{{ tab.label }}</button>
            </div>
          </div>

          <!-- Search (desktop) -->
          <div class="relative hidden sm:block">
            <input
              v-model="searchTerm"
              type="search"
              inputmode="search"
              placeholder="Search…"
              class="w-[180px] rounded-full bg-white/10 border border-white/20 px-3 py-1.5 text-xs outline-none focus:ring-2 ring-pink-400 placeholder-white/60"
              aria-label="Search gifts"
            />
            <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-white/60">⌕</span>
          </div>

          <!-- Sort -->
          <label class="sr-only" for="gift-sort">Sort gifts</label>
          <select
            id="gift-sort"
            v-model="sortOrder"
            class="px-3 py-1 bg-white/10 border border-white/20 text-white text-xs rounded-full outline-none focus:ring-2 ring-pink-400"
          >
            <option value="default">Sort</option>
            <option value="price">Price ↑</option>
            <option value="priceDesc">Price ↓</option>
          </select>
        </div>

        <!-- Quick tiers (mobile helper) -->
        <div class="px-5 pt-3 pb-1 flex gap-2 text-[11px] overflow-x-auto no-scrollbar">
          <button v-for="t in quickTiers" :key="t"
                  class="px-3 py-1 rounded-full bg-white/5 border border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                  @click="jumpTier(t)">
            {{ t }}
          </button>

          <!-- Search (mobile) -->
          <div class="sm:hidden ml-auto relative">
            <input
              v-model="searchTerm"
              type="search"
              placeholder="Search…"
              class="w-[42vw] rounded-full bg-white/10 border border-white/20 px-3 py-1.5 text-xs outline-none placeholder-white/60"
              aria-label="Search gifts"
            />
            <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-white/60">⌕</span>
          </div>
        </div>

        <!-- Grid -->
        <div ref="scrollArea" class="flex-1 overflow-y-auto px-5 py-4 gift-scroll-area">
          <div
            v-if="sortedGifts.length"
            class="grid grid-cols-3 sm:grid-cols-4 gap-4"
          >
            <button
              v-for="gift in sortedGifts"
              :key="gift.id"
              class="relative gift-card glow-shine focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              :class="[{ 'gift-selected': selectedGiftId === gift.id }, tierClass(gift.tier)]"
              @click="selectGift(gift)"
              @touchstart.passive="startHold(gift.id)"
              @touchend.passive="endHold"
              :aria-pressed="selectedGiftId === gift.id ? 'true' : 'false'"
              :title="gift.name"
            >
              <!-- preview -->
              <img
                :src="gift.icon"
                :alt="gift.name"
                class="w-14 h-14 mx-auto rounded-md object-cover"
                loading="lazy"
                decoding="async"
              />
              <p class="gift-name">{{ gift.name }}</p>
              <div class="gift-coins">
                <img :src="coinSrc" alt="" />
                <span>{{ gift.coins.toLocaleString() }}</span>
              </div>

              <!-- tier tag -->
              <span class="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded bg-black/40 ring-1 ring-white/10">
                {{ gift.tier }}
              </span>
              <!-- favorite -->
              <span v-if="isFav(gift.id)" class="absolute top-2 right-2" aria-label="Favorited">★</span>
              <!-- recent pulse -->
              <span v-if="isRecent(gift.id)" class="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-pink-300">
                Recent
              </span>
            </button>
          </div>

          <!-- Empty state -->
          <div
            v-else
            class="h-36 grid place-items-center text-sm text-white/80"
          >
            <div class="text-center">
              <div class="mb-1">No gifts match your filters.</div>
              <button class="btn-ghost mt-1" @click="resetFilters">Reset filters</button>
            </div>
          </div>
        </div>

        <!-- Sticky Checkout -->
        <footer class="sticky bottom-0 px-5 py-3 border-t border-white/10 bg-black/30 backdrop-blur-md flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p v-if="selectedGift" class="text-[12px]">
              <span class="opacity-80">Selected:</span>
              <span class="font-semibold ml-1">{{ selectedGift.name }}</span>
              <span class="ml-2 text-yellow-300 font-bold">{{ selectedGift.coins.toLocaleString() }}</span>
              <img :src="coinSrc" alt="" class="inline-block w-3 h-3 ml-1 align-[-2px]" />
            </p>
            <p v-else class="text-[12px] opacity-75">Pick a gift to continue.</p>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="goRecharge"
              class="glow-button text-xs flex items-center gap-2"
            >
              <img :src="coinSrc" alt="" class="w-4 h-4" />
              Recharge
            </button>

            <button
              :disabled="!selectedGift || sending"
              @click="sendSelected"
              class="px-4 py-2 rounded-full text-xs font-semibold
                     text-white
                     bg-pink-500 hover:bg-pink-600
                     disabled:opacity-60 disabled:cursor-not-allowed
                     shadow-[0_10px_24px_rgba(236,72,153,.35)] border border-white/10"
            >
              {{ sending ? 'Sending…' : 'Send' }}
            </button>
          </div>
        </footer>

        <!-- Safe-area spacer -->
        <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
      </section>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

// ---- Props / Emits ----
const props = defineProps({
  visible: { type: Boolean, default: false },
  receiver: { type: Object, default: null },
  autoCloseAfterSend: { type: Boolean, default: false },
  initialCoins: { type: Number, default: 1_000 },
  gifts: { type: Array, default: null }, // optional override (else we use built-in)
  coinIcon: { type: String, default: '/icons/smartbiz-coin.png' }
})
const emit = defineEmits(['close','send','gift-sent','balance-change'])

// ---- Data / State ----
const coinSrc = computed(() => props.coinIcon)
const overlay = ref(null)
const sheet = ref(null)
const scrollArea = ref(null)
const coins = ref(props.initialCoins)
const searchTerm = ref('')
const sortOrder = ref('default') // default | price | priceDesc
const selectedGiftId = ref(null)
const sending = ref(false)

// Favorites & recents (persisted)
const FAV_KEY = 'gift_favs'
const RECENT_KEY = 'gift_recent'
const favorites = ref(new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')))
const recents = ref(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'))

// Tabs
const tabs = [
  { key: 'All', label: 'All' },
  { key: 'Lite', label: 'Lite' },
  { key: 'Rare', label: 'Rare' },
  { key: 'Epic', label: 'Epic' },
  { key: 'Legendary', label: 'Legendary' },
  { key: 'Mythic', label: 'Mythic' },
  { key: 'Supreme', label: 'Supreme' },
  { key: '★', label: '★ Fav' },
  { key: 'Recent', label: 'Recent' }
]
const activeTab = ref('All')
const quickTiers = ['Lite','Rare','Epic','Legendary','Mythic','Supreme']

// ---- Gift list (built-in minimal fallback) ----
const builtinGiftList = [
  { id:'rose',    name:'Rose',    icon:'https://emojiapi.dev/api/v1/1f339.png', coins:1,   tier:'Lite' },
  { id:'heart',   name:'Heart',   icon:'https://emojiapi.dev/api/v1/1f496.png', coins:5,   tier:'Lite' },
  { id:'rocket',  name:'Rocket',  icon:'https://emojiapi.dev/api/v1/1f680.png', coins:10,  tier:'Rare' },
  { id:'diamond', name:'Diamond', icon:'https://emojiapi.dev/api/v1/1f48e.png', coins:20,  tier:'Epic' },
  { id:'crown',   name:'Crown',   icon:'https://emojiapi.dev/api/v1/1f451.png', coins:50,  tier:'Legendary' }
]
const list = computed(() => Array.isArray(props.gifts) && props.gifts.length ? props.gifts : builtinGiftList)

// ---- Filtering & sorting ----
const filteredGifts = computed(() => {
  const kw = searchTerm.value.toLowerCase().trim()
  let l = list.value

  if (activeTab.value === '★') l = l.filter(g => favorites.value.has(g.id))
  else if (activeTab.value === 'Recent') l = l.filter(g => recents.value.includes(g.id))
  else if (activeTab.value !== 'All') l = l.filter(g => g.tier === activeTab.value)

  if (kw) l = l.filter(g => g.name.toLowerCase().includes(kw))
  return l
})
const sortedGifts = computed(() => {
  const arr = [...filteredGifts.value]
  if (sortOrder.value === 'price') arr.sort((a,b)=>a.coins-b.coins)
  else if (sortOrder.value === 'priceDesc') arr.sort((a,b)=>b.coins-a.coins)
  return arr
})
const selectedGift = computed(() => sortedGifts.value.find(g => g.id === selectedGiftId.value))

// ---- Actions ----
function selectGift(gift){
  selectedGiftId.value = gift.id
  rememberRecent(gift.id)
  buzz(14)
}

async function sendSelected(){
  if (!selectedGift.value || sending.value) return
  const gift = selectedGift.value

  // balance check
  if (coins.value < gift.coins) {
    // light inline feedback
    buzz(24)
    // (parent can open recharge)
    emit('balance-change', coins.value)
    emit('close')
    return
  }

  sending.value = true
  coins.value -= gift.coins
  emit('balance-change', coins.value)

  const payload = { ...gift, to: props.receiver, timestamp: Date.now() }
  emit('send', payload)
  emit('gift-sent', payload)
  buzz(18)

  if (props.autoCloseAfterSend) emit('close')
  setTimeout(() => { sending.value = false }, 450)
}

function goRecharge(){
  // parent is expected to open wallet/recharge screen
  emit('close')
}

// Favorites via long-press (mobile); also allow Alt+Click (desktop)
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
  recents.value = arr.slice(0, 20)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recents.value))
}
function isFav(id){ return favorites.value.has(id) }
function isRecent(id){ return recents.value.includes(id) }
function resetFilters(){ activeTab.value='All'; searchTerm.value=''; sortOrder.value='default' }

// Tier styles (extra ring color)
function tierClass(t){
  return {
    'Lite': 'border-white/10',
    'Rare': 'ring-1 ring-sky-400/30',
    'Epic': 'ring-1 ring-violet-400/30',
    'Legendary': 'ring-1 ring-amber-400/30',
    'Mythic': 'ring-1 ring-pink-400/30',
    'Supreme': 'ring-1 ring-fuchsia-400/40'
  }[t] || ''
}
function jumpTier(t){ activeTab.value = t }

// Haptics
function buzz(ms=12){ try{ navigator?.vibrate?.(ms) }catch{} }

// ---- Swipe-to-close, only when at top (no conflict with scroll) ----
const startY = ref(0), dY = ref(0), dragging = ref(false)
const dragStyle = computed(()=>{
  if(!dragging.value) return {}
  const y = Math.max(0, dY.value)
  const op = Math.max(1 - y/240, .5)
  return { transform: `translateY(${y}px)`, opacity: op }
})
function onTouchStart(e){
  if(e.touches?.length!==1) return
  // allow drag only if the scroll area is at top
  if (scrollArea.value && scrollArea.value.scrollTop > 2) return
  dragging.value=true; startY.value=e.touches[0].clientY; dY.value=0
}
function onTouchMove(e){ if(!dragging.value) return; dY.value = e.touches[0].clientY - startY.value }
function onTouchEnd(){ if(!dragging.value) return; dragging.value=false; if(dY.value>120) emit('close'); dY.value=0 }

// ---- A11y: focus trap + Esc ----
let lastActive = null
async function focusTrapOn(){
  await nextTick()
  lastActive = document.activeElement
  overlay.value?.focus?.()

  const focusables = overlay.value?.querySelectorAll?.(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  // Ensure at least the first focusable inside sheet is focused
  const first = sheet.value?.querySelector?.('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
  first?.focus?.()
}
function focusTrapOff(){
  try{ lastActive?.focus?.() }catch{}
}
function onKeydown(e){
  if (e.key === 'Escape') { e.preventDefault(); emit('close'); return }
  if (e.key !== 'Tab') return
  const focusEls = overlay.value?.querySelectorAll?.(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  if (!focusEls || !focusEls.length) return
  const list = Array.from(focusEls).filter(el => el.offsetParent !== null)
  const first = list[0], last = list[list.length - 1]
  if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus() }
}

// Focus trap lifecycle
watch(() => props.visible, v => { v ? focusTrapOn() : focusTrapOff() })
onMounted(() => { if (props.visible) focusTrapOn() })
onBeforeUnmount(() => focusTrapOff())
</script>

<style scoped>
/* ---- Transitions ---- */
.gd-fade-enter-active, .gd-fade-leave-active { transition: opacity .25s ease }
.gd-fade-enter-from, .gd-fade-leave-to { opacity: 0 }

/* Fancy sheet intro */
@keyframes fade-in {
  0% { opacity:0; transform: translateY(60px) scale(.96); filter: blur(6px) brightness(.9) }
  100%{ opacity:1; transform: translateY(0)    scale(1);   filter: blur(0)  brightness(1) }
}
.animate-fade-in { animation: fade-in .45s cubic-bezier(.22,1,.36,1) both }

/* Buttons visibility on dark bg */
.btn-ghost{
  color:#fff;
  text-shadow:0 1px 1px rgba(0,0,0,.45);
  border:1px solid rgba(255,255,255,.28);
  background:rgba(255,255,255,.12);
  padding:.45rem .8rem; border-radius:9999px;
}

/* Primary CTA glow */
.glow-button{
  color:#fff; padding:.45rem .9rem; border-radius:9999px; font-weight:700;
  border:1px solid rgba(255,255,255,.16);
  background: linear-gradient(180deg, rgba(34,197,94,.28), rgba(34,197,94,.16));
  box-shadow: 0 10px 24px rgba(34,197,94,.28);
}

/* Gift cards */
.gift-card{
  position:relative; padding:14px; border-radius:20px;
  background: linear-gradient(145deg,rgba(255,255,255,.03),rgba(255,255,255,.015));
  border:1px solid rgba(255,255,255,.10);
  backdrop-filter: blur(10px);
  transition: transform .25s ease, box-shadow .3s ease, border-color .3s ease;
  box-shadow:0 8px 18px rgba(0,0,0,.25);
}
.gift-card:hover{ transform: translateY(-2px) scale(1.03) }
.gift-selected{ border:2px solid rgba(255,105,180,.75); box-shadow: 0 0 18px rgba(255,105,180,.45) }

/* Shine overlay */
.glow-shine::after{
  content:''; position:absolute; inset:0; border-radius:20px; pointer-events:none;
  background: linear-gradient(135deg, rgba(255,255,255,.05), rgba(255,255,255,.015));
  background-size: 400% 100%; animation: shine-slide 3s linear infinite;
}
@keyframes shine-slide{ 0%{background-position:-200% center} 100%{background-position:200% center} }

/* Text/coins */
.gift-name{ text-align:center; font-size:.84rem; font-weight:700; margin-top:6px; text-shadow:0 1px 2px rgba(0,0,0,.4) }
.gift-coins{ display:flex; justify-content:center; align-items:center; gap:4px; margin-top:2px; font-size:.75rem; font-weight:800; color:#facc15 }
.gift-coins img{ width:14px; height:14px; object-fit:contain }

/* Scrollbars */
.no-scrollbar::-webkit-scrollbar{ display:none }
.gift-scroll-area::-webkit-scrollbar{ width:6px }
.gift-scroll-area::-webkit-scrollbar-thumb{
  background: rgba(255,255,255,.16); border-radius:10px
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce){
  *{ animation-duration:.01ms !important; animation-iteration-count:1 !important }
}
</style>
