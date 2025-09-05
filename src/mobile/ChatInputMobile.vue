<template>
  <div class="live-chat-module fixed bottom-[50px] left-4 z-50 w-[90vw] max-w-sm pointer-events-auto">

    <!-- 📌 Pinned Message -->
    <div v-if="pinned" class="pinned-message mb-1 bg-white/10 text-white text-xs px-3 py-1 rounded shadow-sm">
      📌 <strong>{{ pinned.sender }}:</strong> {{ pinned.text }}
    </div>

    <!-- 💬 Floating Message Feed -->
    <LiveMessageFeed :messages="localMessages" />

    <!-- 🤖 Smart Replies -->
    <div v-if="allowAutoReply && suggestedReplies.length" class="ai-replies flex flex-wrap gap-2 mb-2 text-xs">
      <span class="label text-white/60">Smart Replies:</span>
      <button
        v-for="(reply, index) in suggestedReplies"
        :key="index"
        @click="submitAuto(reply)"
        class="ai-reply-btn bg-white/10 text-white px-3 py-1 rounded-full hover:bg-white/20 transition"
      >
        {{ reply }}
      </button>
    </div>

    <!-- 📝 Chat Input Row -->
    <div class="chat-input-container flex items-center bg-white/10 rounded-full px-3 py-2 shadow-md backdrop-blur-md border border-white/10 gap-2">
      
      <!-- Emoji -->
      <button @click="openEmojiPicker" class="chat-icon-btn" title="Emoji">
        <i class="i-tabler-mood-smile text-white text-base" />
      </button>

      <!-- Input Field -->
      <input
        v-model="message"
        @keydown.enter="submit"
        type="text"
        maxlength="120"
        class="flex-1 bg-transparent outline-none text-white placeholder-white/50 text-sm"
        :class="{ 'text-red-400': message.length >= 120 }"
        placeholder="Type a short message... (max 120 chars)"
      />

      <!-- Attach -->
      <button @click="openAttachment" class="chat-icon-btn" title="Attach">
        <i class="i-tabler-paperclip text-white text-base" />
      </button>

      <!-- Voice -->
      <button @click="recordVoice" class="chat-icon-btn" title="Voice">
        <i class="i-tabler-microphone text-white text-base" />
      </button>

      <!-- Send -->
      <button @click="submit" class="send-btn text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-full px-3 py-1 transition">
        🚀 Send
      </button>
    </div>

    <!-- 🚫 Length Warning -->
    <p v-if="message.length >= 120" class="text-xs text-red-400 text-center mt-1">
      ✋ You reached the 120 characters limit.
    </p>
    
  </div>
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import LiveMessageFeed from '@/components/Live/LiveMessageFeed.vue'

// 🌐 Message states
const message = ref('')
const lastSent = ref('')
const pinned = ref(null)
const localMessages = ref([])
const allowAutoReply = ref(true)
const chatContainer = ref(null)

const MAX_LENGTH = 120
const isAtLimit = computed(() => message.value.length >= MAX_LENGTH)

// 🤖 Suggested AI Replies
const suggestedReplies = ref([
  'Welcome to the stream!',
  'Thanks for your support 💖',
  'We love your energy!',
  'Let us know what you think!',
])

// 🔊 Send sound setup
let sendSound = null
onMounted(() => {
  try {
    sendSound = new Audio('/sounds/send.mp3')
    sendSound.volume = 1.0
    sendSound.preload = 'auto'
  } catch (e) {
    console.warn('Audio init failed:', e)
  }

  cleanupTimer = setInterval(cleanOldMessages, 60000)
})

onBeforeUnmount(() => {
  if (cleanupTimer) clearInterval(cleanupTimer)
})

// ▶️ Play sound
function playSound() {
  if (sendSound) {
    try {
      sendSound.currentTime = 0
      sendSound.play()
    } catch (err) {
      console.warn('Play failed', err)
    }
  }
}

// 🚀 Send manual message
function submit() {
  if (isAtLimit.value) {
    showToast(`Message too long! Max ${MAX_LENGTH} characters.`, '🚫')
    return
  }
  sendMessage(message.value)
}

// 🚀 Send quick/AI message
function submitAuto(text) {
  sendMessage(text)
}

// 📨 Message creation + display
function sendMessage(text) {
  const clean = text.trim()
  if (!clean) {
    showToast('Type something first!', '⚠️')
    return
  }

  const now = Date.now()
  const newMessage = {
    id: now,
    text: clean,
    sender: 'You',
    timestamp: now,
    type: 'chat',
  }

  localMessages.value.push(newMessage)
  pinned.value = newMessage
  lastSent.value = clean
  message.value = ''
  playSound()
  scrollToBottom()
}

// 🔻 Scroll to latest
function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// 🎤 Future voice record logic
function recordVoice() {
  showToast('Voice feature coming 🎙️')
}

// 📎 Future attachment logic
function openAttachment() {
  showToast('Attach media soon 📎')
}

// 😄 Future emoji picker
function openEmojiPicker() {
  showToast('Emoji Picker coming 😄')
}

// 🚮 Clean old messages
let cleanupTimer = null
function cleanOldMessages() {
  const now = Date.now()
  const maxAge = 10 * 60 * 1000 // 10 minutes
  localMessages.value = localMessages.value.filter(
    (msg) => now - msg.timestamp <= maxAge
  )
}

// 🛎️ UX Toast handler
function showToast(msg, icon = '💬') {
  alert(`${icon} ${msg}`)
}
</script>
<style scoped>
/* 🔒 Root container */
.live-chat-module {
  position: relative;
  z-index: 40;
  font-family: 'Inter', sans-serif;
}

/* 📌 Pinned Message */
.pinned-message {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  backdrop-filter: blur(8px);
  background: linear-gradient(to right, #1e3a8a, #3b82f6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  animation: pulsePinned 3s infinite ease-in-out;
}

@keyframes pulsePinned {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.05); }
}

/* 🤖 AI Smart Replies */
.ai-replies {
  position: fixed;
  bottom: 85px;
  left: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  z-index: 40;
  font-size: 0.75rem;
  padding: 0.5rem 0.75rem;
  max-width: 86vw;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(6px);
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  pointer-events: auto;
}
.ai-reply-btn {
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 9999px;
  font-size: 0.75rem;
  transition: background 0.2s ease;
}
.ai-reply-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 📝 Input Section */
.chat-input-container {
  position: fixed;
  bottom: 1rem;
  left: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  width: 88vw;
  max-width: 24rem;
  z-index: 50;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(12px);
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  transition: all 0.3s ease-in-out;
}

input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  color: white;
  background: transparent;
  border: none;
  outline: none;
  font-size: 0.875rem;
  font-family: 'Inter', sans-serif;
}
input::placeholder {
  color: rgba(255, 255, 255, 0.45);
}

/* 📤 Buttons */
.chat-icon-btn {
  font-size: 1.125rem;
  color: white;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 9999px;
  padding: 6px;
  transition: transform 0.2s ease;
}
.chat-icon-btn:hover {
  transform: scale(1.1);
  filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.3));
}

.send-btn {
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  padding: 6px 12px;
  background: linear-gradient(to right, #2563eb, #3b82f6);
  border-radius: 9999px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  transition: background 0.2s ease;
}
.send-btn:hover {
  background: linear-gradient(to right, #3b82f6, #60a5fa);
}

/* 📱 Mobile Tweaks */
@media (max-width: 768px) {
  .chat-input-container {
    left: 3%;
    width: 94%;
  }
  .ai-replies {
    left: 3%;
    width: 94%;
    font-size: 0.7rem;
  }
}
</style>

