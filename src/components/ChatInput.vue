<!-- LiveChatDock.vue — Mobile-first, safe-area aware, a11y & pro UX -->
<template>
  <section
    class="fixed inset-x-0 bottom-0 z-50 pointer-events-none"
    :style="{
      paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${bottomInset}px)`
    }"
    aria-label="Live chat dock"
  >
    <!-- 🔔 Pinned message (floating, dismissible) -->
    <div
      v-if="pinned"
      class="pointer-events-auto mx-auto mb-2 max-w-[92vw] sm:max-w-md"
    >
      <div
        class="flex items-center gap-2 rounded-full px-3 py-1 text-white shadow-lg
               bg-gradient-to-r from-indigo-700 to-blue-500 border border-white/10"
        role="status"
        aria-live="polite"
      >
        <span class="text-xs">📌 <strong>{{ pinned.sender }}:</strong> {{ pinned.text }}</span>
        <button
          class="ml-auto grid place-items-center w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 transition"
          @click="unpinned"
          aria-label="Unpin message"
        >
          ×
        </button>
      </div>
    </div>

    <!-- 💬 Live feed (provided by parent component) -->
    <div class="pointer-events-auto mx-4 sm:mx-auto sm:max-w-md">
      <LiveMessageFeed :messages="localMessages" />
    </div>

    <!-- 🤖 Smart replies (horizontal scroll) -->
    <div
      v-if="allowAutoReply && smartReplies.length"
      class="pointer-events-auto mx-4 mt-2 sm:mx-auto sm:max-w-md"
    >
      <div
        class="flex items-center gap-2 overflow-x-auto no-scrollbar rounded-full border border-white/10
               bg-black/30 backdrop-blur-md px-2 py-1"
      >
        <span class="text-[11px] text-white/70 shrink-0 pl-1">Smart Replies:</span>
        <button
          v-for="(reply, idx) in smartReplies"
          :key="idx"
          @click="submitAuto(reply)"
          class="shrink-0 rounded-full px-3 py-1 text-xs text-white bg-white/10 hover:bg-white/20 transition"
        >
          {{ reply }}
        </button>
      </div>
    </div>

    <!-- 📝 Input row -->
    <div class="pointer-events-auto mx-4 mt-2 sm:mx-auto sm:max-w-md">
      <div
        class="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/25
               backdrop-blur-xl px-2 py-2 shadow-xl"
      >
        <!-- Emoji -->
        <button
          class="tap-btn"
          title="Emoji"
          aria-label="Open emoji picker"
          @click="openEmojiPicker"
        >
          <i class="i-tabler-mood-smile text-white text-base" />
        </button>

        <!-- Auto-growing textarea -->
        <textarea
          ref="inputEl"
          v-model="message"
          :maxlength="maxLength"
          rows="1"
          @input="autoGrow"
          @keydown.enter.exact.prevent="submit"
          @keydown.shift.enter.prevent="newline"
          class="min-h-[36px] max-h-28 flex-1 resize-none bg-transparent text-sm text-white placeholder-white/50 outline-none"
          :placeholder="placeholder"
          :aria-invalid="isAtLimit ? 'true' : 'false'"
        />

        <!-- Counter -->
        <span
          class="select-none text-[11px] font-semibold"
          :class="isAtLimit ? 'text-rose-300' : 'text-white/50'"
        >
          {{ remaining }}/{{ maxLength }}
        </span>

        <!-- Attach -->
        <button
          class="tap-btn"
          title="Attach"
          aria-label="Attach media"
          @click="openAttachment"
        >
          <i class="i-tabler-paperclip text-white text-base" />
        </button>

        <!-- Voice (press & hold) -->
        <button
          class="tap-btn"
          title="Hold to record voice"
          aria-label="Hold to record voice"
          @mousedown.prevent="startVoice"
          @touchstart.prevent="startVoice"
          @mouseup.prevent="stopVoice"
          @mouseleave.prevent="cancelVoice"
          @touchend.prevent="stopVoice"
        >
          <i :class="['text-base', recording ? 'i-tabler-microphone-filled text-rose-300' : 'i-tabler-microphone text-white']" />
        </button>

        <!-- Send -->
        <button
          class="rounded-full px-3 py-1 text-sm font-semibold text-white
                 bg-blue-500 hover:bg-blue-600 active:scale-[0.98] transition disabled:opacity-40"
          :disabled="disableSend"
          @click="submit"
          aria-label="Send message"
        >
          🚀 Send
        </button>
      </div>

      <!-- Inline warning -->
      <p v-if="isAtLimit" class="mt-1 text-center text-[11px] text-rose-300">
        ✋ You reached the {{ maxLength }} characters limit.
      </p>

      <!-- Offline banner -->
      <div
        v-if="!online"
        class="mt-2 rounded-full bg-amber-500/15 text-amber-200 border border-amber-400/30 px-3 py-1 text-[11px] text-center"
        role="status"
        aria-live="polite"
      >
        ⚠️ You are offline. Messages will retry when connection is back.
      </div>
    </div>

    <!-- SR-only live region for a11y announcements -->
    <span class="sr-only" aria-live="polite">{{ srAnnounce }}</span>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import LiveMessageFeed from '@/components/Live/LiveMessageFeed.vue'

/* ───────────────────────────
   Props & Emits
──────────────────────────── */
const props = defineProps({
  maxLength: { type: Number, default: 120 },
  placeholder: { type: String, default: 'Type a short message… (max 120 chars)' },
  initialMessages: { type: Array, default: () => [] },
  initialPinned: { type: Object, default: null },
  smartReplies: {
    type: Array,
    default: () => ['Welcome to the stream!', 'Thanks for your support 💖', 'We love your energy!', 'Let us know what you think!']
  },
  allowAutoReply: { type: Boolean, default: true },
  bottomInset: { type: Number, default: 10 }, // extra space above bottom bar
  persistKey: { type: String, default: 'live-chat-draft' } // sessionStorage key for draft
})

const emit = defineEmits([
  'send',           // { text, ts }
  'attach',         // trigger parent picker
  'voice-start',
  'voice-stop',
  'toast',          // { message, icon }
  'pin-change'      // pinned message changed
])

/* ───────────────────────────
   State
──────────────────────────── */
const inputEl = ref(null)
const message = ref('')
const lastSent = ref('')
const pinned = ref(props.initialPinned)
const localMessages = ref([...props.initialMessages])

const online = ref(true)
const recording = ref(false)
const srAnnounce = ref('')

/* Derived */
const maxLength = computed(() => props.maxLength)
const isAtLimit = computed(() => message.value.length >= maxLength.value)
const remaining = computed(() => `${maxLength.value - message.value.length}`)
const disableSend = computed(() => !message.value.trim() || isAtLimit.value)

/* ───────────────────────────
   Lifecycle & setup
──────────────────────────── */
let cleanupTimer = null
let sendSound

onMounted(() => {
  // Load draft
  try {
    const draft = sessionStorage.getItem(props.persistKey)
    if (draft) message.value = draft
  } catch {}

  // Prepare sound
  try {
    sendSound = new Audio('/sounds/send.mp3')
    sendSound.volume = 1
    sendSound.preload = 'auto'
  } catch {}

  // Online/offline listeners
  online.value = navigator.onLine
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  // Periodic cleanup
  cleanupTimer = setInterval(cleanOldMessages, 60_000)

  // Auto size on mount if draft exists
  nextTick(autoGrow)
})

onBeforeUnmount(() => {
  if (cleanupTimer) clearInterval(cleanupTimer)
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})

/* ───────────────────────────
   Watchers
──────────────────────────── */
watch(message, (val) => {
  // Persist non-empty draft
  try {
    if (val && val.trim()) sessionStorage.setItem(props.persistKey, val)
    else sessionStorage.removeItem(props.persistKey)
  } catch {}
})

/* ───────────────────────────
   Handlers
──────────────────────────── */
function autoGrow () {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

function newline () {
  // Intentionally ignored to keep single-line feel; remove to allow multi-line
}

function playSound () {
  try {
    sendSound?.pause?.()
    sendSound.currentTime = 0
    sendSound?.play?.()
  } catch {}
}

function vibrate (ms = 10) {
  try { navigator?.vibrate?.(ms) } catch {}
}

function submit () {
  if (disableSend.value) {
    if (isAtLimit.value) toast(`Message too long! Max ${maxLength.value} characters.`, '🚫')
    return vibrate(8)
  }
  sendMessage(message.value)
}

function submitAuto (text) {
  sendMessage(text)
}

function sendMessage (text) {
  const clean = (text || '').trim()
  if (!clean) {
    toast('Type something first!', '⚠️')
    return
  }

  const now = Date.now()
  const newMessage = { id: now, text: clean, sender: 'You', timestamp: now, type: 'chat' }

  localMessages.value.push(newMessage)
  pinned.value = newMessage
  emit('pin-change', newMessage)

  lastSent.value = clean
  message.value = ''
  sessionStorage.removeItem(props.persistKey)

  playSound()
  vibrate(12)
  srAnnounce.value = 'Message sent'

  emit('send', { text: clean, ts: now })
  nextTick(() => inputEl.value?.focus?.())
}

function openAttachment () {
  emit('attach')
  toast('Attach media soon 📎')
}

function openEmojiPicker () {
  toast('Emoji picker coming 😄')
}

function startVoice () {
  if (recording.value) return
  recording.value = true
  vibrate(15)
  emit('voice-start')
  toast('Recording… hold to speak 🎙️', '🎙️')
}

function stopVoice () {
  if (!recording.value) return
  recording.value = false
  emit('voice-stop')
  toast('Voice recorded (demo) ✅')
}

function cancelVoice () {
  if (!recording.value) return
  recording.value = false
  emit('voice-stop')
  toast('Recording canceled', '⚠️')
}

function unpinned () {
  pinned.value = null
  emit('pin-change', null)
}

function onOnline () {
  online.value = true
  toast('Back online ✅')
}
function onOffline () {
  online.value = false
  toast('You are offline', '⚠️')
}

function cleanOldMessages () {
  const now = Date.now()
  const maxAge = 10 * 60 * 1000 // 10 minutes
  localMessages.value = localMessages.value.filter(m => now - m.timestamp <= maxAge)
}

function toast (message, icon = '💬') {
  emit('toast', { message, icon }) // allow parent to show a real toast
  // Fallback: subtle SR announce for a11y
  srAnnounce.value = `${icon} ${message}`
}
</script>

<style scoped>
/* Touch target size for icons */
.tap-btn {
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  display: grid;
  place-items: center;
  border-radius: 9999px;
  background: rgba(255,255,255,0.06);
  transition: transform .15s ease, background .15s ease;
}
.tap-btn:active { transform: scale(0.96); }

/* Hide scrollbar on smart replies */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* Screen reader utility */
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
</style>
