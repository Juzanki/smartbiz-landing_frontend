<template>
  <div class="w-[90vw] max-w-md mx-auto bg-black/70 backdrop-blur-md rounded-xl p-4 text-white">
    <h3 class="text-sm font-bold mb-2">🎭 Choose a Face Filter</h3>
    <div class="grid grid-cols-4 gap-3">
      <div
        v-for="filter in filters"
        :key="filter.id"
        class="cursor-pointer p-2 rounded-xl border border-white/10 hover:bg-white/10 transition-all"
        :class="{ 'ring-2 ring-pink-400': filter.id === selected }"
        @click="$emit('select', filter.id)"
      >
        <img :src="filter.preview" class="w-14 h-14 object-cover rounded-lg mx-auto" />
        <div class="text-[11px] mt-1 text-center">{{ filter.name }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  selected: String // optional prop to highlight current selection
})

const filters = [
  { id: 'none', name: 'None', preview: '/filters/none.png' },
  { id: 'beauty', name: 'Beauty', preview: '/filters/beauty.png' },
  { id: 'cool', name: 'Cool Tone', preview: '/filters/cool.png' },
  { id: 'warm', name: 'Warm Tone', preview: '/filters/warm.png' },
  { id: 'bw', name: 'Black & White', preview: '/filters/bw.png' },
  { id: 'retro', name: 'Retro', preview: '/filters/retro.png' },
  { id: 'dreamy', name: 'Dreamy', preview: '/filters/dreamy.png' },
  { id: 'neon', name: 'Neon Glow', preview: '/filters/neon.png' },
]
</script>

