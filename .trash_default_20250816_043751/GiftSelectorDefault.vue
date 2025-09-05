<template>
  <div
    class="panel animate-fade-in"
    :style="{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }"
  >
    <!-- Header -->
    <h3 class="text-lg font-bold text-center text-pink-400 tracking-wide mb-2">
      🎁 Choose Your Gift
    </h3>

    <!-- Search -->
    <div class="relative mb-2">
      <input
        v-model.trim="q"
        type="search"
        inputmode="search"
        autocomplete="off"
        placeholder="Search gifts…"
        class="w-full bg-white/10 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400/60"
        aria-label="Search gifts"
      />
      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/70">🔎</span>
    </div>

    <!-- Category chips (auto) -->
    <div v-if="categories.length" class="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-2">
      <button class="chip" :class="{ 'chip-active': activeCat==='All' }" @click="setCat('All')">All</button>
      <button
        v-for="c in categories"
        :key="c"
        class="chip shrink-0"
        :class="{ 'chip-active': activeCat===c }"
        @click="setCat(c)"
      >
        {{ c }}
      </button>
    </div>

    <!-- Grid -->
    <div v-if="!loading" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3" role="listbox" aria-label="Gifts">
      <button
        v-for="gift in visible"
        :key="gift.id"
        class="tile"
        role="option"
        :aria-selected="gift.id===selectedId"
        :class="[ gift.id===selectedId ? 'tile-active' : '', ringClass(gift.class) ]"
        @click="selectGift(gift)"
        @dblclick="toggleFav(gift)"
        @touchstart.passive="onTouchStart(gift)"
        @touchend.passive="onTouchEnd"
      >
        <!-- Favorite badge -->
        <span v-if="isFav(gift.id)" class="absolute top-1 right-1 text-[12px] drop-shadow" title="Favorite">💖</span>

        <!-- Icon -->
        <img
          :src="gift.icon"
          :alt="gift.name"
          class="w-[clamp(40px,12vw,56px)] h-[clamp(40px,12vw,56px)] object-contain mb-1 gift-icon"
          loading="lazy"
          decoding="async"
          @error="onImgError($event)"
        />

        <!-- Name -->
        <span class="text-[12px] font-semibold text-center leading-tight text-white line-clamp-1">
          {{ gift.name }}
        </span>

        <!-- Coins -->
        <span class="text-yellow-300 text-[11px] font-bold">
          🪙 {{ formatCoins(gift.coins ?? gift.price ?? 0) }}
        </span>

        <!-- Tier -->
        <span
          class="text-[10px] mt-1 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide text-white shadow-inner"
          :class="badgeClass(gift.class)"
        >
          {{ gift.class }}
        </span>

        <!-- Animation / Duration -->
        <div class="mt-0.5 flex items-center gap-1 text-[10px] text-white/60">
          <span v-if="gift.animation">✨ {{ gift.animation }}</span>
          <span v-if="gift.duration" class="text-white/40">· ⏱ {{ (gift.duration/1000).toFixed(1) }}s</span>
        </div>
      </button>
    </div>

    <!-- Skeletons -->
    <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      <SkeletonGift v-for="i in 8" :key="i" />
    </div>

    <!-- Empty -->
    <p v-if="!loading && !visible.length" class="text-center text-white/70 text-sm mt-2">
      No gifts match your filters.
    </p>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { giftList } from '@/data/giftListEnhanced.js' // endelea kutumia data yako
const emit = defineEmits(['send','preview'])          // + preview (hiari)

const loading = ref(false)
const selectedId = ref(null)
const q = ref('')
const activeCat = ref('All')

/* Favorites in localStorage */
const favSet = ref(new Set(JSON.parse(localStorage.getItem('gift:favs') || '[]')))
watch(favSet, v => localStorage.setItem('gift:favs', JSON.stringify([...v])), { deep: true })

/* Categories auto (tumia gift.category; fallback: class) */
const categories = computed(() => {
  const set = new Set(giftList.map(g => (g.category || g.class || '').trim()).filter(Boolean))
  return Array.from(set).sort()
})

/* Filtered list */
const visible = computed(() => {
  let v = [...giftList]
  if (activeCat.value !== 'All') v = v.filter(g => (g.category || g.class) === activeCat.value)
  if (q.value) {
    const s = q.value.toLowerCase()
    v = v.filter(g => (g.name || '').toLowerCase().includes(s))
  }
  // favorites first
  v.sort((a,b) => Number(isFav(b.id)) - Number(isFav(a.id)))
  return v
})

/* Actions */
function selectGift(gift) {
  selectedId.value = gift.id
  vibrate(8)
  emit('send', gift)
}
function setCat(c){ activeCat.value = c; vibrate(6) }
function toggleFav(g){ favSet.value.has(g.id) ? favSet.value.delete(g.id) : favSet.value.add(g.id); vibrate(6) }
let pressTimer = null
function onTouchStart(g){ clearTimeout(pressTimer); pressTimer = setTimeout(() => emit('preview', g), 380) }
function onTouchEnd(){ clearTimeout(pressTimer) }

/* Utils */
function isFav(id){ return favSet.value.has(id) }
function vibrate(ms){ if (navigator.vibrate) try{ navigator.vibrate(ms) }catch{} }
function onImgError(e){ e.target.src = '/gifts/placeholder.png' }

function formatCoins(value) {
  const v = Number(value || 0)
  if (v < 1000) return v
  if (v < 1_000_000) return (v / 1000).toFixed(1).replace('.0', '') + 'K'
  return (v / 1_000_000).toFixed(1).replace('.0', '') + 'M'
}

/* Tier badge */
function badgeClass(level) {
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
function ringClass(level){
  return {
    'ring-amber': level === 'Legendary',
    'ring-red':   level === 'Mythic',
    'ring-pink':  level === 'Supreme',
  }
}
</script>

<style scoped>
/* Container */
.panel{
  @apply bg-gradient-to-br from-[#111827]/70 via-[#1f2937]/60 to-[#1e3a8a]/50
         backdrop-blur-xl p-4 rounded-2xl shadow-2xl w-full max-w-md text-white space-y-3 border border-white/10;
}

/* Chips */
.chip{ @apply px-3 py-1 rounded-full text-xs bg-white/10 border border-white/10 hover:bg-white/20 transition; }
.chip-active{ @apply bg-pink-500 text-white border-pink-400; }

/* Tile */
.tile{
  @apply relative cursor-pointer p-2 rounded-xl flex flex-col items-center
         transition-all duration-300 bg-white/10 hover:bg-white/20 backdrop-blur-md
         shadow-md border border-white/10 focus:outline-none;
}
.tile-active{ @apply ring-2 ring-offset-0 ring-pink-400/70 scale-[1.02]; }

/* Tier rings */
.ring-amber.tile-active{ box-shadow: 0 0 0 2px rgba(251,191,36,.6), 0 0 24px rgba(251,191,36,.45); }
.ring-red.tile-active{   box-shadow: 0 0 0 2px rgba(239,68,68,.65), 0 0 26px rgba(239,68,68,.5); }
.ring-pink.tile-active{  box-shadow: 0 0 0 2px rgba(236,72,153,.65), 0 0 26px rgba(236,72,153,.5); }

/* Icon glow */
.gift-icon{ transition: transform .25s ease, filter .25s ease; }
.tile:hover .gift-icon{ transform: scale(1.06); filter: drop-shadow(0 0 6px rgba(250,204,21,.5)); }

/* Entrance */
.animate-fade-in{ animation: fadeInGiftPanel .35s ease both; }
@keyframes fadeInGiftPanel{
  from{ opacity:0; transform: translateY(28px) scale(.97); filter: blur(3px); }
  to  { opacity:1; transform: translateY(0)   scale(1);    filter: blur(0); }
}

/* Scrollbars */
.no-scrollbar::-webkit-scrollbar{ display:none }
.no-scrollbar{ -ms-overflow-style:none; scrollbar-width:none }

/* (Optional) legacy styles from your snippet kept for compatibility */
.badge-tier{ padding:2px 8px; border-radius:9999px; font-size:10px; font-weight:600; text-transform:uppercase;
  text-shadow:0 1px 2px rgba(0,0,0,.4); box-shadow:0 0 4px rgba(255,255,255,.1) }
</style>

<script lang="ts">
/* Lightweight skeletons (inline) */
import { defineComponent, h } from 'vue'
export default {}
export const SkeletonGift = defineComponent({
  name: 'SkeletonGift',
  setup(){
    return () => h('div', { class: 'tile' }, [
      h('div', { class:'rounded-lg', style: box(56) }),
      h('div', { class:'h-2 w-16 mt-2 rounded', style: bar() }),
      h('div', { class:'h-2 w-10 mt-1 rounded', style: bar() }),
    ])
    function bar(){
      return { background: grad(), backgroundSize:'200% 100%', animation:'shimmer 1.2s linear infinite' }
    }
    function box(size){ return { width:`${size}px`, height:`${size}px`, background:grad(), backgroundSize:'200% 100%', animation:'shimmer 1.2s linear infinite' } }
    function grad(){ return 'linear-gradient(110deg, rgba(255,255,255,.12) 8%, rgba(255,255,255,.05) 18%, rgba(255,255,255,.12) 33%)' }
  }
})
</script>

<style>
@keyframes shimmer { to { background-position-x: -200% } }
</style>
