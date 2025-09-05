<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="fixed bottom-32 right-4 z-50 bg-indigo-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-in"
    >
      <img :src="request.avatar" class="w-8 h-8 rounded-full border border-white" />
      <div class="flex flex-col text-sm">
        <span class="font-semibold">{{ request.name }}</span>
        <span>wants to join your live!</span>
        <div class="flex gap-2 mt-1">
          <button @click="respond(true)" class="bg-green-500 text-xs px-3 py-1 rounded-full">✅ Accept</button>
          <button @click="respond(false)" class="bg-red-500 text-xs px-3 py-1 rounded-full">❌ Decline</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  request: { type: Object, required: true }
})

const emit = defineEmits(['respond'])

const visible = ref(true)

const respond = (accepted) => {
  emit('respond', { accepted, request: props.request })
  visible.value = false
}

// Auto-hide after 15 sec
onMounted(() => {
  setTimeout(() => {
    visible.value = false
  }, 15000)
})
</script>

<style scoped>
@keyframes slide-in {
  from {
    transform: translateY(40px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}
</style>

