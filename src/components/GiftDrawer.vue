<template>
  <!-- Overlay -->
  <div
    v-if="show"
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:flex md:items-end md:justify-center animate-fadeIn"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="headingId"
    @click.self="handleClose"
  >
    <!-- Bottom Drawer (mobile) / Centered (md+) -->
    <section
      ref="sheetEl"
      class="w-full md:max-w-lg md:rounded-2xl md:shadow-2xl bg-[#0f172a] border-t md:border border-cyan-800 text-white animate-slideUpSafe relative"
      :style="{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <!-- Drag handle -->
      <div class="absolute left-1/2 -translate-x-1/2 top-2 md:top-3">
        <div class="h-1.5 w-12 rounded-full bg-white/20"></div>
      </div>

      <!-- Header -->
      <header class="px-4 pt-5 md:pt-6 pb-3 md:pb-4 border-b border-cyan-800/40">
        <div class="flex items-center justify-between gap-3">
          <h2 :id="headingId" class="text-lg md:text-xl font-bold text-cyan-300">🎁 Gifts</h2>

          <!-- Balance pill -->
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-white/10 border border-white/10">
              <i class="i-tabler-coin"></i>
              {{ pretty(balance) }}
            </span>
            <button class="btn-cyan px-2 py-1 text-xs" @click="addCoins">Top-up</button>
          </div>
        </div>

        <!-- Search -->
        <div class="relative mt-3">
          <input
            v-model.trim="q"
            type="search"
            inputmode="search"
            autocomplete="off"
            placeholder="Search gifts…"
            class="w-full bg-white/10 border border-white/10 rounded-xl pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500"
            aria-label="Search gifts"
          />
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">🔎</span>
        </div>

        <!-- Categories -->
        <div class="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            v-for="c in categories"
            :key="c"
            class="chip shrink-0"
            :class="{ 'chip-active': category===c }"
            @click="setCategory(c)"
          >
            {{ c }}
          </button>
        </div>
      </header>

      <!-- Body -->
      <main class="px-4 py-3">
        <!-- Offline hint -->
        <p v-if="!online" class="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-400/30 rounded-lg px-2 py-1 mb-2">
          You’re offline. Sending will resume when you’re back online.
        </p>

        <!-- Loading skeleton -->
        <div v-if="loading" class="grid grid-cols-4 gap-3">
          <SkeletonGift v-for="i in 8" :key="i" />
        </div>

        <!-- Grid -->
        <div
          v-else
          class="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-5"
          aria-label="Gifts grid"
        >
          <button
            v-for="g in visibleGifts"
            :key="g.id"
            class="gift-card group"
            :class="{'ring-2 ring-cyan-400/70': selectedGift?.id === g.id}"
            @click="selectGift(g)"
            @dblclick="toggleFav(g)"
          >
            <div class="relative">
              <img
                :src="g.img"
                :alt="g.name"
                class="w-full h-14 md:h-16 object-cover rounded-lg"
                loading="lazy"
                decoding="async"
                @error="onImgError"
              />
              <span
                v-if="isFav(g.id)"
                class="absolute top-1 right-1 text-[12px]"
                title="Favorite"
              >💖</span>
            </div>
            <div class="mt-1 text-[11px] leading-tight text-left">
              <p class="truncate">{{ g.name }}</p>
              <p class="text-cyan-300 flex items-center gap-0.5">
                <i class="i-tabler-coin text-[12px]"></i>{{ g.price }}
              </p>
            </div>
          </button>
        </div>

        <!-- Empty -->
        <p v-if="!loading && !visibleGifts.length" class="text-center text-white/60 text-sm py-6">
          No gifts found. Try another keyword or category.
        </p>
      </main>

      <!-- Sticky footer actions -->
      <footer class="sticky bottom-0 left-0 right-0 mt-2 px-4 pt-2 bg-gradient-to-t from-[#0f172a] to-transparent">
        <div class="flex items-center gap-3">
          <!-- Selected preview -->
          <div v-if="selectedGift" class="flex items-center gap-2 min-w-0">
            <img :src="selectedGift.img" :alt="selectedGift.name" class="w-10 h-10 rounded-lg object-cover border border-cyan-800" />
            <div class="min-w-0">
              <p class="text-sm font-medium truncate">{{ selectedGift.name }}</p>
              <p class="text-xs text-cyan-300 flex items-center gap-1">
                <i class="i-tabler-coin"></i> {{ selectedGift.price }} each
              </p>
            </div>
          </div>
          <div v-else class="text-xs text-white/60">Select a gift to continue</div>

          <!-- Qty stepper -->
          <div class="ml-auto flex items-center gap-2">
            <div class="stepper" :class="{ 'opacity-50 pointer-events-none': !selectedGift }">
              <button @click="decQty" :disabled="qty<=1">−</button>
              <span class="w-8 text-center">{{ qty }}</span>
              <button @click="incQty">＋</button>
            </div>

            <!-- Total & Send -->
            <div class="text-right">
              <p class="text-xs text-white/70">Total</p>
              <p class="text-sm font-semibold text-cyan-300 flex items-center justify-end gap-1">
                <i class="i-tabler-coin"></i>{{ total }}
              </p>
            </div>

            <button
              class="btn-cyan px-4 py-2 font-semibold"
              :disabled="!canSend"
              @click="send"
            >
              {{ online ? 'Send' : 'Queue' }}
            </button>
          </div>
        </div>

        <!-- Tips row -->
        <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/60">
          <button class="tip" @click="quickQty(5)">x5</button>
          <button class="tip" @click="quickQty(10)">x10</button>
          <button class="tip" @click="quickQty(25)">x25</button>
          <span class="ml-auto">Long-press a gift to favorite 💖</span>
        </div>
      </footer>

      <!-- Close (desktop) -->
      <button
        class="hidden md:block absolute top-3 right-3 text-cyan-300/80 hover:text-cyan-200"
        @click="handleClose"
        aria-label="Close"
      >
        <i class="i-tabler-x text-xl"></i>
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, defineComponent, h, type Ref } from 'vue'

/* Props & Emits */
type SendPayload = { gift: Gift; qty: number; total: number }
const props = withDefaults(defineProps<{ show: boolean; startBalance?: number }>(), {
  show: false,
  startBalance: 1200
})
const emit = defineEmits<{
  (e:'close'): void
  (e:'send', payload: SendPayload): void
}>()

/* Types */
type Category = 'Popular' | 'Boosts' | 'Stickers' | 'Party' | 'Love' | 'VIP'
type Gift = { id: string; name: string; price: number; img: string; category: Category }

/* IDs & Refs */
const headingId = `hdr-${Math.random().toString(36).slice(2,8)}`
const sheetEl: Ref<HTMLElement|null> = ref(null)

/* Network state */
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const onOnline = () => (online.value = true)
const onOffline = () => (online.value = false)

/* Balance & selection */
const balance = ref(props.startBalance)
const selectedGift = ref<Gift|null>(null)
const qty = ref(1)
const total = computed(()=> selectedGift.value ? selectedGift.value.price * qty.value : 0)
const canSend = computed(()=> !!selectedGift.value && qty.value>0 && balance.value>=total.value)

/* Search & category */
const q = ref('')
const category = ref<Category>('Popular')
const categories: Category[] = ['Popular','Boosts','Stickers','Party','Love','VIP']

/* Gifts (mock data) */
const gifts = ref<Gift[]>([])
const loading = ref(true)

/* Favorites (persist) */
const FAV_KEY = 'giftdrawer:favs'
const favs = ref<Set<string>>(new Set())
onMounted(()=>{
  try{ favs.value = new Set<string>(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')) }catch{}
})
function persistFavs(){ try{ localStorage.setItem(FAV_KEY, JSON.stringify([...favs.value])) }catch{} }
function isFav(id:string){ return favs.value.has(id) }
function toggleFav(g: Gift){
  if (!g) return
  const s = new Set(favs.value)
  s.has(g.id) ? s.delete(g.id) : s.add(g.id)
  favs.value = s
  persistFavs()
  vibrate(8)
}

/* Filters */
const visibleGifts = computed(()=> {
  let list = gifts.value.filter(g => category.value==='Popular' ? true : g.category===category.value)
  if (q.value) {
    const s = q.value.toLowerCase()
    list = list.filter(g => g.name.toLowerCase().includes(s))
  }
  // favorites first
  list.sort((a,b)=> Number(isFav(b.id)) - Number(isFav(a.id)))
  return list
})

/* Actions */
function selectGift(g: Gift){
  selectedGift.value = g
  qty.value = 1
  vibrate(6)
}
function incQty(){ if(!selectedGift.value) return; qty.value = Math.min(qty.value+1, 999); vibrate(4) }
function decQty(){ if(!selectedGift.value) return; qty.value = Math.max(1, qty.value-1); vibrate(4) }
function quickQty(n:number){ if(!selectedGift.value) return; qty.value = n; vibrate(6) }

function send(){
  if (!canSend.value) { vibrate(6); return }
  balance.value -= total.value
  emit('send', { gift: selectedGift.value as Gift, qty: qty.value, total: total.value })
  vibrate(12)
  qty.value = 1
}

function addCoins(){ balance.value += 500; vibrate(8) }

/* Helpers */
function setCategory(c: Category){ category.value = c; vibrate(4) }
function pretty(n:number){ return n.toLocaleString?.() ?? String(n) }
function onImgError(e: Event){ (e.target as HTMLImageElement).src = '/gifts/placeholder.png' }
function handleClose(){ emit('close') }
function vibrate(ms:number){ if (typeof navigator !== 'undefined' && 'vibrate' in navigator) try{ navigator.vibrate(ms) }catch{} }

/* Swipe-to-close (drag down) */
const swipe = reactive({ startY:0, dy:0 })
function onTouchStart(e: TouchEvent){ swipe.startY = e.touches[0].clientY; swipe.dy = 0 }
function onTouchMove(e: TouchEvent){
  swipe.dy = e.touches[0].clientY - swipe.startY
  if (swipe.dy > 0 && sheetEl.value) sheetEl.value.style.transform = `translateY(${Math.min(swipe.dy, 120)}px)`
}
function onTouchEnd(){
  if (swipe.dy > 80) { vibrate(8); handleClose() }
  if (sheetEl.value) sheetEl.value.style.transform = ''
  swipe.dy = 0
}

/* ESC to close */
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }

/* Seed mock data (replace with API) */
async function seed(){
  loading.value = true
  await new Promise(r=> setTimeout(r, 500))
  const base: Gift[] = [
    { id:'g1',  name:'Confetti',     price:20,  img:'/gifts/confetti.png',    category:'Party'    },
    { id:'g2',  name:'Fireworks',    price:80,  img:'/gifts/fireworks.png',   category:'Party'    },
    { id:'g3',  name:'Heart',        price:25,  img:'/gifts/heart.png',       category:'Love'     },
    { id:'g4',  name:'Rocket Boost', price:120, img:'/gifts/boost.png',       category:'Boosts'   },
    { id:'g5',  name:'VIP Crown',    price:300, img:'/gifts/crown.png',       category:'VIP'      },
    { id:'g6',  name:'Star Shower',  price:60,  img:'/gifts/stars.png',       category:'Stickers' },
    { id:'g7',  name:'Neon Wave',    price:45,  img:'/gifts/neon.png',        category:'Stickers' },
    { id:'g8',  name:'Rose',         price:15,  img:'/gifts/rose.png',        category:'Love'     },
    { id:'g9',  name:'Golden Ticket',price:200, img:'/gifts/ticket.png',      category:'VIP'      },
    { id:'g10', name:'Turbo Boost',  price:150, img:'/gifts/turbo.png',       category:'Boosts'   },
  ]
  gifts.value = base
  loading.value = false
}

/* Local subcomponent: SkeletonGift */
const SkeletonGift = defineComponent({
  name: 'SkeletonGift',
  setup(){
    return () => h('div', { class: 'skel' }, [
      h('div', { class:'w-full h-14 rounded-lg skel-bar' }),
      h('div', { class:'h-2 w-2/3 rounded mt-1.5 skel-bar' }),
      h('div', { class:'h-2 w-1/3 rounded mt-1 skel-bar' }),
    ])
  }
})

/* Lifecycle */
onMounted(async ()=>{
  await seed()
  window.addEventListener('keydown', onKey)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
})
onBeforeUnmount(()=>{
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})
</script>

<style scoped>
/* Buttons & UI atoms */
.btn-cyan { @apply bg-cyan-500 text-[#0b1324] rounded-full hover:bg-cyan-400 transition; }
.chip{ @apply px-2.5 py-1 rounded-full text-xs bg-white/10 border border-white/10 hover:bg-white/20 transition; }
.chip-active{ @apply bg-cyan-600 text-[#0b1324] border-cyan-500; }
.tip{ @apply px-2 py-0.5 rounded-full bg-white/10 border border-white/10 hover:bg-white/20; }
.stepper{ @apply inline-flex items-center bg-white/10 border border-white/10 rounded-lg overflow-hidden; }
.stepper > button{ @apply w-8 h-8 grid place-items-center hover:bg-white/10; }

/* Gift card */
.gift-card{ @apply bg-white/5 border border-white/10 rounded-xl p-1.5 text-left hover:bg-white/10 transition; }

/* Skeleton */
.skel{ @apply bg-white/5 border border-white/10 rounded-xl p-1.5; }
.skel-bar{
  background: linear-gradient(110deg, rgba(255,255,255,.10) 8%, rgba(255,255,255,.04) 18%, rgba(255,255,255,.10) 33%);
  background-size: 200% 100%; animation: shimmer 1.2s linear infinite;
}
@keyframes shimmer { to { background-position-x: -200% } }

/* Animations */
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
@keyframes slideUp { from{ transform: translateY(24px) } to{ transform: translateY(0) } }
.animate-fadeIn { animation: fadeIn .25s ease both; }
.animate-slideUpSafe { animation: slideUp .35s ease both; }

/* Utilities */
.no-scrollbar::-webkit-scrollbar{ display:none }
.no-scrollbar{ -ms-overflow-style:none; scrollbar-width:none }
</style>
