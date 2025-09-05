<template>
  <transition name="fade">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-white text-black rounded-xl shadow-xl w-[90%] max-w-sm p-6 text-center relative">
        <h3 class="text-base font-semibold mb-2">🙋‍♂️ Join Request</h3>
        <p class="text-sm mb-3">
          <span class="font-bold text-indigo-600">{{ request.name }}</span> is requesting to join the stream!
        </p>

        <!-- 🔥 AI Recommendation -->
        <div class="text-xs text-yellow-500 italic mb-2" v-if="trending">
          💡 We suggest you accept — this session is 🔥 trending!
        </div>

        <!-- ⏳ Countdown -->
        <div class="text-sm text-gray-600 mb-4">Respond in <span class="font-bold">{{ countdown }}</span> seconds</div>

        <!-- 🎛 Action Buttons -->
        <div class="flex justify-center gap-4">
          <button
            @click="respond(true)"
            class="bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-full"
          >
            ✅ Accept
          </button>
          <button
            @click="respond(false)"
            class="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-full"
          >
            ❌ Decline
          </button>
        </div>

        <!-- ❌ Auto-dismiss info -->
        <div class="absolute top-2 right-3 text-xs text-gray-400">Auto-decline if no response</div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  request: {
    type: Object,
    required: true
  },
  trending: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['respond'])

const visible = ref(true)
const countdown = ref(10)
let timer

const respond = (accepted) => {
  visible.value = false
  emit('respond', { accepted, guest: props.request })
  clearInterval(timer)
}

onMounted(() => {
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      respond(false)
    }
  }, 1000)
})

onBeforeUnmount(() => {
  clearInterval(timer)
})
</script>

