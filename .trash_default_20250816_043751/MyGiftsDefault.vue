<template>
  <div class="bg-[#0f172a] p-6 rounded-xl border border-cyan-700">
    <h2 class="text-xl font-bold text-cyan-200 mb-4">🎁 My Gifts</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      <div
        v-for="gift in gifts"
        :key="gift.id"
        class="gift-card"
      >
        <img
          :src="`/Gifts/${gift.icon}`"
          :alt="gift.name"
          class="w-full h-20 object-contain bg-[#1e293b] rounded-xl border border-cyan-700 p-2 shadow-md hover:scale-105 transition"
        />
        <div class="mt-2 text-center text-white text-sm font-medium">{{ gift.name }}</div>
        <div class="text-xs text-center text-cyan-400">{{ gift.coins }} coins</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const gifts = ref([])

onMounted(() => {
  // Simulate fetch (you can replace with actual backend API call)
  gifts.value = [
    { id: 'rose', name: 'Rose', icon: 'rose.png', coins: 2 },
    { id: 'galaxy', name: 'Galaxy Orbit', icon: 'galaxyorbit.png', coins: 12000 },
    { id: 'quantum', name: 'Quantum Burst', icon: 'quantumburst.png', coins: 5000 },
    { id: 'diamond', name: 'Diamond Drop', icon: 'diamond.png', coins: 2500 },
  ]
})
</script>

<style scoped>
.gift-card {
  transition: transform 0.3s ease-in-out;
  background: linear-gradient(to bottom right, #1e293b, #0f172a);
  border: 1px solid #155e75;
  border-radius: 0.75rem;
  padding: 0.75rem;
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.1);
}
.gift-card:hover {
  transform: scale(1.08);
  box-shadow: 0 0 16px rgba(34, 211, 238, 0.4);
}
</style>

