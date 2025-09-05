<template>
  <div class="fixed top-3 right-3 z-30">
    <button @click="report" class="bg-red-500 text-white px-3 py-1 rounded shadow">
      🚨 Report
    </button>
  </div>
</template>

<script setup>
function report() {
  alert('Report submitted to admin')
  // TODO: Send report details to backend API
}
</script>

