<template>
  <div class="fixed top-24 left-1/2 transform -translate-x-1/2 bg-white/80 p-4 rounded shadow z-20">
    <h3 class="font-bold mb-2">Vote Now:</h3>
    <div v-for="(option, i) in poll.options" :key="i" class="mb-1">
      <button @click="vote(option)" class="bg-gray-800 text-white px-3 py-1 rounded w-full">
        {{ option }}
      </button>
    </div>
  </div>
</template>

<script setup>
const poll = {
  question: 'Which product do you love most?',
  options: ['SmartBag', 'EcoCup', 'SolarHat']
}

function vote(option) {
  alert(`Voted for ${option}`)
  // TODO: Tuma kura kwa backend au emit
}
</script>

