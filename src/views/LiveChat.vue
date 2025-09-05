<template>
  <div class="flex flex-col h-screen bg-[#f5f8fb]">
    <!-- Top bar -->
    <header class="flex items-center justify-between bg-[#0a1f44] text-white p-4 shadow">
      <div class="flex items-center gap-2">
        💬
        <h1 class="font-bold text-lg">Live Chat</h1>
      </div>
      <span class="text-xs" :class="isConnected ? 'text-green-300' : 'text-red-300'">
        {{ isConnected ? 'Online' : 'Reconnecting...' }}
      </span>
    </header>

    <!-- Messages -->
    <main ref="chatBox" class="flex-1 overflow-y-auto p-4 space-y-3">
      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="flex"
        :class="msg.user === 'Me' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[75%] px-4 py-2 rounded-2xl shadow text-sm"
          :class="msg.user === 'Me'
            ? 'bg-cyan-500 text-white rounded-br-none'
            : 'bg-white text-gray-800 rounded-bl-none'"
        >
          <p class="whitespace-pre-wrap">{{ msg.text }}</p>
          <span class="block text-[10px] mt-1 opacity-70">{{ msg.time }}</span>
        </div>
      </div>
    </main>

    <!-- Typing indicator -->
    <div v-if="typing" class="px-4 py-2 text-xs text-gray-500">User is typing...</div>

    <!-- Input -->
    <form @submit.prevent="sendMessage" class="p-3 bg-white flex items-center gap-2 border-t">
      <button type="button" class="text-gray-500 hover:text-cyan-500">📎</button>
      <input
        v-model="newMessage"
        type="text"
        placeholder="Type a message..."
        class="flex-1 px-3 py-2 text-sm border rounded-full focus:outline-none focus:ring focus:ring-cyan-300"
      />
      <button
        type="submit"
        class="bg-cyan-500 text-white px-4 py-2 rounded-full font-bold hover:bg-cyan-600 active:scale-95"
      >
        Send
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const messages = ref([])
const newMessage = ref('')
const ws = ref(null)
const isConnected = ref(false)
const typing = ref(false)
const chatBox = ref(null)

function connect() {
  ws.value = new WebSocket(`ws://${window.location.host}/ws/live/chat`)
  ws.value.onopen = () => (isConnected.value = true)
  ws.value.onclose = () => {
    isConnected.value = false
    setTimeout(connect, 2000)
  }
  ws.value.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      messages.value.push({ ...data, time: new Date().toLocaleTimeString() })
      scrollToBottom()
    } catch {
      messages.value.push({ user: 'Guest', text: event.data, time: new Date().toLocaleTimeString() })
      scrollToBottom()
    }
  }
}

function sendMessage() {
  if (!newMessage.value.trim()) return
  const msg = { user: 'Me', text: newMessage.value, time: new Date().toLocaleTimeString() }
  ws.value.send(JSON.stringify(msg))
  messages.value.push(msg)
  newMessage.value = ''
  scrollToBottom()
}

function scrollToBottom() {
  nextTick(() => {
    if (chatBox.value) {
      chatBox.value.scrollTop = chatBox.value.scrollHeight
    }
  })
}

onMounted(connect)
onUnmounted(() => ws.value && ws.value.close())
</script>

<style scoped>
/* Smooth scrolling */
main {
  scroll-behavior: smooth;
}
</style>
