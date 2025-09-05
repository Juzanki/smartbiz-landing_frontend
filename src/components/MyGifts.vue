<template>
  <section
    class="rounded-2xl border border-cyan-700 bg-[#0f172a] p-3 sm:p-4 shadow-xl text-white"
    :style="safeArea"
    aria-label="My Gifts"
  >
    <!-- Header -->
    <header class="flex items-center justify-between gap-2">
      <h2 class="text-lg sm:text-xl font-extrabold text-cyan-200">🎁 {{ t('myGifts') }}</h2>
      <div class="flex items-center gap-2">
        <span class="pill bg-cyan-500/20 border-cyan-400/40">
          🪙 {{ compact(balance) }}
        </span>
        <button class="btn-recharge" @click="$emit('recharge')">➕ {{ t('recharge') }}</button>
      </div>
    </header>

    <!-- Offline pill -->
    <transition name="fade">
      <div v-if="!online" class="mt-2 pill bg-amber-500/20 border-amber-400/40 text-amber-100">
        ⚠️ {{ t('offline') }}
      </div>
    </transition>

    <!-- Controls -->
    <div class="mt-3 grid grid-cols-1 gap-2">
      <!-- Search -->
      <div class="relative">
        <input
          v-model.trim="query"
          :placeholder="t('searchGift')"
          class="w-full h-11 rounded-xl bg-slate-900/60 border border-white/10 px-10 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          @input="debouncedFilter"
        />
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">🔎</span>
        <button v-if="query" class="absolute right-2 top-1/2 -translate-y-1/2 text-white/60"
                @click="query=''; applyFilters()">✖</button>
      </div>

      <!-- Rarity chips + Sort -->
      <div class="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <button
          v-for="r in rarityOrder"
          :key="r"
          @click="toggleRarity(r)"
          class="chip"
          :class="selectedRarities.has(r) ? rarityMeta[r].chipClassActive : rarityMeta[r].chipClass"
        >
          {{ t(r) }}
        </button>

        <div class="ml-auto flex items-center gap-2">
          <label class="text-xs text-white/60">{{ t('sort') }}</label>
          <select v-model="sortKey" class="h-9 rounded-lg bg-slate-900/60 border border-white/10 px-2 text-xs focus:outline-none">
            <option value="recent">{{ t('recent') }}</option>
            <option value="priceHigh">{{ t('priceHigh') }}</option>
            <option value="priceLow">{{ t('priceLow') }}</option>
            <option value="name">{{ t('name') }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Count -->
    <div class="mt-2 text-[11px] text-white/60">
      {{ t('showing') }} {{ filtered.length }} {{ t('items') }}
    </div>

    <!-- Grid -->
    <div class="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      <!-- Card -->
      <button
        v-for="g in paged"
        :key="g.id"
        class="group gift-card"
        @click="openSheet(g)"
        :aria-label="g.name + ', ' + g.coins + ' coins'"
      >
        <div class="relative aspect-square rounded-xl bg-[#0b1424] border border-cyan-700/60 p-2 overflow-hidden">
          <!-- Blur-up LQIP -->
          <img
            v-if="g.lqip && !loaded[g.id]"
            :src="g.lqip"
            class="absolute inset-0 h-full w-full object-contain blur-md opacity-60 scale-105"
            alt=""
            aria-hidden="true"
          />
          <!-- Real image -->
          <img
            :src="`/Gifts/${g.icon}`"
            :alt="g.name"
            class="relative h-full w-full object-contain transition duration-300 group-active:scale-95"
            loading="lazy"
            decoding="async"
            @load="loaded[g.id]=true"
            @error="onImgErr($event, g)"
          />

          <!-- Rarity Tag -->
          <span class="tag" :class="rarityMeta[g.rarity]?.tagClass || ''">
            {{ t(g.rarity) }}
          </span>
        </div>

        <div class="mt-1 text-center">
          <div class="truncate text-[12px] font-semibold">{{ g.name }}</div>
          <div class="text-[11px] text-cyan-300">🪙 {{ compact(g.coins) }}</div>
        </div>
      </button>

      <!-- Skeletons when loading more -->
      <div v-if="loadingMore" v-for="i in 6" :key="'sk-'+i" class="skeleton aspect-square rounded-xl"></div>
    </div>

    <!-- Infinite scroll sentinel -->
    <div ref="sentinel" class="h-6"></div>

    <!-- Bottom Sheet -->
    <transition name="sheet">
      <div v-if="sheet" class="fixed inset-0 z-[60] grid place-items-end p-0">
        <button class="absolute inset-0 bg-black/60" @click="sheet=null" aria-label="Close"></button>

        <div class="w-full max-w-md rounded-t-2xl bg-slate-900 text-white border-t border-white/10 p-4">
          <div class="mx-auto h-1 w-12 rounded-full bg-white/20 mb-3"></div>

          <div class="flex items-center gap-3">
            <div class="h-16 w-16 rounded-xl bg-slate-800 border border-cyan-700/50 p-2">
              <img :src="`/Gifts/${sheet.icon}`" :alt="sheet.name" class="h-full w-full object-contain" />
            </div>
            <div class="min-w-0">
              <div class="text-base font-extrabold">{{ sheet.name }}</div>
              <div class="text-sm text-cyan-300">🪙 {{ compact(sheet.coins) }}</div>
              <div class="tag mt-1 inline-block" :class="rarityMeta[sheet.rarity]?.tagClass || ''">{{ t(sheet.rarity) }}</div>
            </div>
            <button class="ml-auto chip" @click="sheet=null">✖</button>
          </div>

          <p class="mt-3 text-sm text-white/80 line-clamp-3">
            {{ sheet.description || t('defaultDesc') }}
          </p>

          <div class="mt-4 grid grid-cols-3 gap-2">
            <button class="btn-gradient" @click="sendGift(sheet)" :disabled="!online">📤 {{ t('send') }}</button>
            <button class="btn-soft" @click="$emit('preview', sheet)">👀 {{ t('preview') }}</button>
            <button class="btn-soft" @click="$emit('equip', sheet)">⭐ {{ t('equip') }}</button>
          </div>
        </div>
      </div>
    </transition>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/** i18n (inline minimal) */
const messages = {
  en: {
    myGifts:'My Gifts', recharge:'Recharge', offline:'You are offline — actions are limited.',
    searchGift:'Search gifts…', sort:'Sort', recent:'Recent', priceHigh:'Price: High→Low', priceLow:'Price: Low→High', name:'Name',
    showing:'Showing', items:'items', send:'Send', preview:'Preview', equip:'Equip', defaultDesc:'A special digital gift to light up the live room!',
    Lite:'Lite', Rare:'Rare', Epic:'Epic', Legendary:'Legendary', Mythic:'Mythic', Supreme:'Supreme'
  },
  sw: {
    myGifts:'Zawadi Zangu', recharge:'Ongeza Salio', offline:'Uko offline — baadhi ya vitendo vimelimitishwa.',
    searchGift:'Tafuta zawadi…', sort:'Panga', recent:'Karibuni', priceHigh:'Bei: Juu→Chini', priceLow:'Bei: Chini→Juu', name:'Jina',
    showing:'Inaonyesha', items:'vipengee', send:'Tuma', preview:'Hakiki', equip:'Weka', defaultDesc:'Zawadi ya kidijitali ya kung’arisha Live Room!',
    Lite:'Lite', Rare:'Rare', Epic:'Epic', Legendary:'Legendary', Mythic:'Mythic', Supreme:'Supreme'
  }
}
const locale = ref('en')
const t = (k)=> (messages[locale.value]?.[k] ?? messages.en[k] ?? k)

/** Props-like initial data (replace with API) */
const balance = ref(128430)
const all = ref([])
/** UI state */
const query = ref('')
const sortKey = ref('recent')
const selectedRarities = ref(new Set())
const rarityOrder = ['Lite','Rare','Epic','Legendary','Mythic','Supreme']
const sheet = ref(null)
const loaded = ref({})
const online = ref(navigator.onLine)
const sentinel = ref(null)
const page = ref(1)
const pageSize = 18
const loadingMore = ref(false)

/** Rarity styling meta */
const rarityMeta = {
  Lite:       { chipClass:'chip bg-white/10 border-white/15', chipClassActive:'chip bg-white/25 border-white/40', tagClass:'bg-white/10 border-white/20' },
  Rare:       { chipClass:'chip bg-cyan-500/10 border-cyan-400/25 text-cyan-200', chipClassActive:'chip bg-cyan-500/25 border-cyan-400/50 text-cyan-100', tagClass:'bg-cyan-500/20 border-cyan-300/40 text-cyan-100' },
  Epic:       { chipClass:'chip bg-purple-500/10 border-purple-400/25 text-purple-200', chipClassActive:'chip bg-purple-500/25 border-purple-400/50 text-purple-100', tagClass:'bg-purple-500/20 border-purple-300/40 text-purple-100' },
  Legendary:  { chipClass:'chip bg-yellow-500/10 border-yellow-400/25 text-yellow-200', chipClassActive:'chip bg-yellow-500/25 border-yellow-400/50 text-yellow-100', tagClass:'bg-yellow-500/25 border-yellow-300/50 text-yellow-100' },
  Mythic:     { chipClass:'chip bg-pink-500/10 border-pink-400/25 text-pink-200', chipClassActive:'chip bg-pink-500/25 border-pink-400/50 text-pink-100', tagClass:'bg-pink-500/25 border-pink-300/50 text-pink-100' },
  Supreme:    { chipClass:'chip bg-indigo-500/10 border-indigo-400/25 text-indigo-200', chipClassActive:'chip bg-indigo-500/25 border-indigo-400/50 text-indigo-100', tagClass:'bg-indigo-500/25 border-indigo-300/50 text-indigo-100' },
}

/** Safe area */
const safeArea = { padding: 'env(safe-area-inset, 0px)' }

/** Mock fetch */
onMounted(() => {
  window.addEventListener('online', ()=> online.value = true)
  window.addEventListener('offline', ()=> online.value = false)

  // Seed data (replace with API)
  all.value = [
    { id:'rose',      name:'Rose',          icon:'rose.png',         coins:2,     rarity:'Lite' },
    { id:'galaxy',    name:'Galaxy Orbit',  icon:'galaxyorbit.png',  coins:12000, rarity:'Supreme' },
    { id:'quantum',   name:'Quantum Burst', icon:'quantumburst.png', coins:5000,  rarity:'Mythic' },
    { id:'diamond',   name:'Diamond Drop',  icon:'diamond.png',      coins:2500,  rarity:'Legendary' },
    { id:'confetti',  name:'Confetti Pop',  icon:'confetti.png',     coins:120,   rarity:'Rare' },
    { id:'star',      name:'Starlight',     icon:'star.png',         coins:320,   rarity:'Epic' },
    // duplicate few for demo scroll
    ...Array.from({length:24}, (_,i)=>({
      id:'x'+i, name:'Gift '+(i+1), icon:'gift.png',
      coins: (i%6)*250 + 50, rarity: rarityOrder[i%rarityOrder.length]
    }))
  ].map(g => ({ ...g, lqip:'/Gifts/lqip.jpg', createdAt: Date.now()-Math.random()*1e7 }))

  // start observer for infinite scroll
  setupIO()
})

onBeforeUnmount(() => {
  io?.disconnect?.()
  window.removeEventListener('online', ()=>{})
  window.removeEventListener('offline', ()=>{})
})

/** Filtering / Sorting */
const filtered = computed(() => {
  let arr = all.value
  // search
  if (query.value) {
    const q = query.value.toLowerCase()
    arr = arr.filter(g => g.name.toLowerCase().includes(q))
  }
  // rarity
  if (selectedRarities.value.size) {
    arr = arr.filter(g => selectedRarities.value.has(g.rarity))
  }
  // sort
  const s = sortKey.value
  arr = [...arr].sort((a,b)=>{
    if (s==='recent')   return (b.createdAt||0) - (a.createdAt||0)
    if (s==='priceHigh')return (b.coins||0) - (a.coins||0)
    if (s==='priceLow') return (a.coins||0) - (b.coins||0)
    if (s==='name')     return String(a.name).localeCompare(String(b.name))
    return 0
  })
  return arr
})
const paged = computed(() => filtered.value.slice(0, page.value * pageSize))

/** Search debounce */
let debounceT = null
function debouncedFilter(){
  clearTimeout(debounceT)
  debounceT = setTimeout(applyFilters, 200)
}
function applyFilters(){ page.value = 1 }

/** Rarity toggling */
function toggleRarity(r){
  const set = selectedRarities.value
  set.has(r) ? set.delete(r) : set.add(r)
  // reset page when filters change
  page.value = 1
  vibrate(8)
}

/** Bottom sheet */
function openSheet(g){ sheet.value = g; vibrate(10) }

/** Send */
function sendGift(g){
  if (!online.value) return
  // Business rule: check balance etc.
  // Emit to parent to actually send
  emit('send', g)
  sheet.value = null
}

/** Image error fallback */
function onImgErr(ev, g){
  ev.target.style.opacity = .6
  ev.target.alt = g.name + ' (image missing)'
}

/** Utilities */
function compact(n){ if (n>=1e9) return (n/1e9).toFixed(1)+'B'; if (n>=1e6) return (n/1e6).toFixed(1)+'M'; if (n>=1e3) return (n/1e3).toFixed(1)+'K'; return String(n??0) }
function vibrate(ms=10){ try { navigator.vibrate?.(ms) } catch {} }

/** Infinite scroll */
let io = null
function setupIO(){
  if (!('IntersectionObserver' in window)) return
  io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting && paged.value.length < filtered.value.length && !loadingMore.value) {
        loadingMore.value = true
        setTimeout(()=>{ page.value += 1; loadingMore.value = false }, 350)
      }
    }
  }, { rootMargin: '120px 0px' })
  sentinel.value && io.observe(sentinel.value)
}

/** Emits */
const emit = defineEmits(['send','preview','equip','recharge'])
</script>

<style scoped>
/* Pills & Chips */
.pill { @apply px-2 py-1 rounded-full text-xs border; }
.chip { @apply px-3 py-1 rounded-full text-xs border whitespace-nowrap active:scale-[.98]; }

/* Buttons */
.btn-recharge {
  @apply h-8 px-3 rounded-full text-xs font-semibold bg-gradient-to-b from-cyan-600 to-indigo-700
         border border-white/10 shadow active:translate-y-[1px];
}
.btn-gradient {
  @apply h-11 rounded-xl font-semibold bg-gradient-to-b from-pink-600 to-fuchsia-700
         border border-white/10 shadow active:translate-y-[1px];
}
.btn-soft {
  @apply h-11 rounded-xl border border-white/10 bg-white/10 text-white active:translate-y-[1px];
}

/* Card */
.gift-card { @apply rounded-xl p-1.5 bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-cyan-700/60 shadow hover:shadow-cyan-500/20 active:scale-[.99]; }

/* Rarity tag */
.tag { @apply absolute top-1.5 left-1.5 px-2 py-[2px] rounded-full text-[10px] border; }

/* Skeleton & transitions */
.skeleton { @apply bg-white/5 border border-white/10; animation: shimmer 1.2s linear infinite; background: linear-gradient(90deg, rgba(255,255,255,.06) 25%, rgba(255,255,255,.12) 37%, rgba(255,255,255,.06) 63%); background-size: 400% 100%; }
@keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }

.fade-enter-active,.fade-leave-active { transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to { opacity: 0 }

/* Bottom sheet transition */
.sheet-enter-active,.sheet-leave-active { transition: transform .24s ease, opacity .24s ease }
.sheet-enter-from,.sheet-leave-to { transform: translateY(12%); opacity: 0 }

/* Hide scrollbar for chips */
.scrollbar-hide::-webkit-scrollbar { display: none }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none }
</style>
