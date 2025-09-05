<template>
  <div class="bg-gradient-to-br from-[#111827]/70 via-[#1f2937]/60 to-[#1e3a8a]/50 backdrop-blur-xl p-4 rounded-2xl shadow-2xl w-full max-w-md text-white space-y-3 border border-white/10">

    <!-- 🔝 Header -->
    <h3 class="text-base font-bold text-center text-pink-400 tracking-wide mb-1">
      🎁 Choose Your Gift
    </h3>

    <!-- 🎁 Gift Grid -->
    <div class="grid grid-cols-1 gap-4">
      <div
        v-for="gift in giftList"
        :key="gift.id"
        @click="selectGift(gift)"
        class="cursor-pointer p-2 rounded-xl flex flex-col items-center transition-all duration-300 hover:scale-105 hover:ring-2 hover:ring-pink-400/60 bg-white/10 hover:bg-white/20 backdrop-blur-md shadow-md border border-white/10"
      >
        <!-- 🖼️ Gift Icon -->
        <img
          :src="gift.icon"
          :alt="gift.name"
          class="w-12 h-12 object-contain mb-1 drop-shadow-md gift-icon"
        />

        <!-- 🏷️ Name -->
        <span class="text-[13px] font-semibold text-center leading-tight text-white">
          {{ gift.name }}
        </span>

        <!-- 🪙 Coins -->
        <span class="text-yellow-300 text-[11px] font-bold">
          🪙 {{ formatCoins(gift.coins) }}
        </span>

        <!-- 🧬 Tier Badge -->
        <span
          class="text-[10px] mt-1 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide text-white shadow-inner"
          :class="badgeClass(gift.class)"
        >
          {{ gift.class }}
        </span>

        <!-- 🎞 Animation Info -->
        <span v-if="gift.animation" class="text-[9px] text-white/60 italic mt-0.5">
          ✨ {{ gift.animation }}
        </span>

        <!-- ⏱ Duration -->
        <span v-if="gift.duration" class="text-[9px] text-white/40">
          ⏱ {{ (gift.duration / 1000).toFixed(1) }}s
        </span>
      </div>
    </div>

  </div>
</template>
<script setup>
import { giftList } from '@/data/giftListEnhanced.js'
const emit = defineEmits(['send'])

function selectGift(gift) {
  emit('send', gift)
}

// Format coin numbers: 1500 => "1.5K", 1_000_000 => "1M"
function formatCoins(value) {
  if (value < 1000) return value
  if (value < 1_000_000) return (value / 1000).toFixed(1).replace('.0', '') + 'K'
  return (value / 1_000_000).toFixed(1).replace('.0', '') + 'M'
}

// Tier color glow
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
</script>
<style scoped>
/* 🌟 Smooth entrance fade */
.animate-fade-in {
  animation: fadeInGiftPanel 0.4s ease-out both;
}
@keyframes fadeInGiftPanel {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

/* 🎁 Gift icon glowing effect */
.gift-icon {
  transition: transform 0.3s ease, filter 0.3s ease;
}
.gift-icon:hover {
  transform: scale(1.1);
  filter: drop-shadow(0 0 6px rgba(250, 204, 21, 0.5));
}

/* 🎨 Badge tier styling (color fallback) */
.badge-tier {
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.1);
}

/* 🌀 Scrollbar hidden on small view */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.12);
  border-radius: 10px;
}

/* 🔲 Gift Box Hover */
.gift-tile {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  will-change: transform;
}
.gift-tile:hover {
  transform: scale(1.05);
  box-shadow:
    0 0 8px rgba(255, 255, 255, 0.06),
    0 0 14px rgba(255, 105, 180, 0.2);
}
</style>


