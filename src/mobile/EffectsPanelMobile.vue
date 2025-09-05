<template>
  <div class="absolute top-4 left-4 bg-white/10 backdrop-blur-md p-4 rounded text-white">
    <h3 class="text-sm font-bold mb-2">✨ Effects</h3>
    <div class="flex flex-wrap gap-2">
      <button v-for="effect in effects" :key="effect" class="btn-secondary text-xs" @click="applyEffect(effect)">
        {{ effect }}
      </button>
    </div>
  </div>
</template>

<script setup>
const effects = ['Grayscale', 'Sepia', 'Brightness+', 'Invert']
function applyEffect(effect) {
  alert(`Effect applied: ${effect}`)
}
</script>
s

