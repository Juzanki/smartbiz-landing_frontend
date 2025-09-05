<template>
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-40">
    <div class="bg-white text-black p-6 rounded w-80 shadow-lg">
      <h3 class="text-lg font-bold mb-4">🪙 Recharge Coins</h3>
      <input type="number" v-model="amount" placeholder="Amount to top-up" class="input mb-4 w-full" />
      <button class="btn-primary w-full" @click="recharge">Recharge via Mpesa</button>
    </div>
  </div>
</template>

<script setup>
const amount = ref(0)
function recharge() {
  alert(`Recharge of ${amount.value} requested`)
  // Ungeunganisha Mpesa or payment gateway hapa
}
</script>

