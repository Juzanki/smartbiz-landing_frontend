<template>
  <button @click="$emit('open')" class="icon-btn bg-amber-500 hover:bg-amber-600">
    💳 Wallet
  </button>
</template>

<script setup>
// This component simply emits an 'open' event when clicked
</script>

<style scoped>
.icon-btn {
  @apply text-white px-3 py-1 text-sm rounded-full shadow transition duration-200;
}
</style>

