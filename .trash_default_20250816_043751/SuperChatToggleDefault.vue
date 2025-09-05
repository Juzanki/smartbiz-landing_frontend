<template>
  <div>
    <!-- 💰 Super Chat Trigger Button -->
    <button @click="showModal = true" class="icon-btn">
      💰 Super Chat
    </button>

    <!-- 💬 Super Chat Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white text-black rounded-xl shadow-xl w-80 p-5 relative">
        <h3 class="text-lg font-bold mb-4">💬 Send Super Chat</h3>

        <label class="text-sm font-medium">Your Message:</label>
        <textarea v-model="message" class="w-full p-2 border border-gray-300 rounded mb-3" rows="3" placeholder="Type your message..."></textarea>

        <label class="text-sm font-medium">Amount:</label>
        <input v-model="amount" type="number" class="w-full p-2 border border-gray-300 rounded mb-4" placeholder="e.g. 500" />

        <div class="flex justify-between gap-3">
          <button @click="sendSuperChat" class="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded w-full font-bold">
            Send
          </button>
          <button @click="showModal = false" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded w-full font-bold">
            Cancel
          </button>
        </div>

        <!-- Close Icon -->
        <button @click="showModal = false" class="absolute top-2 right-3 text-gray-500 hover:text-red-500 text-xl font-bold">&times;</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const showModal = ref(false)
const message = ref('')
const amount = ref('')

function sendSuperChat() {
  if (!message.value || !amount.value || amount.value <= 0) {
    alert('Please enter a message and a valid amount.')
    return
  }

  // Example logic: send to parent or API
  console.log('Sending Super Chat:', { message: message.value, amount: amount.value })
  alert(`🎉 Super Chat Sent: ${message.value} - TZS ${amount.value}`)

  // Reset and close
  message.value = ''
  amount.value = ''
  showModal.value = false
}
</script>

<style scoped>
.icon-btn {
  @apply bg-green-700 hover:bg-green-600 text-white px-3 py-1 text-sm rounded-full shadow;
}
</style>

