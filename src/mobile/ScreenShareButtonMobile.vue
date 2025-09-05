<template>
  <div class="fixed bottom-5 right-5 z-30">
    <button @click="shareScreen" class="bg-blue-600 text-white px-4 py-2 rounded shadow">
      Share Screen
    </button>
  </div>
</template>

<script setup>
function shareScreen() {
  navigator.mediaDevices.getDisplayMedia({ video: true }).then(stream => {
    // TODO: Ongeza stream kwa peer au videoRef
    alert('Screen sharing started')
  })
}
</script>

