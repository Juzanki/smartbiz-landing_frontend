<template>
  <div
    class="live-chat-dock"
    :style="{
      '--bottom-offset': bottomOffsetCss,
      '--max-width': maxWidthCss
    }"
    role="complementary"
    aria-label="Live chat dock"
  >
    <!-- 📌 Pinned Message -->
    <div
      v-if="pinned"
      class="pinned-message"
      role="status"
      aria-live="polite"
    >
      📌 <strong>{{ pinned.sender }}:</strong> {{ pinned.text }}
    </div>

    <!-- 💬 Floating Message Feed -->
    <div ref="feedWrap" class="feed-wrap" :class="{ 'is-typing': isTyping }" aria-label="Message feed">
      <LiveMessageFeed :messages="localMessages" />
      <!-- Tiny spacer so last bubble isn’t hidden behind input -->
      <div class="feed-spacer" />
    </div>

    <!-- 🤖 Smart Replies -->
    <div
      v-if="showSmartReplies && allowAutoReply && visibleReplies.length && !keyboardOpen"
      class="ai-replies"
      role="group"
      aria-label="Smart replies"
    >
      <span class="label">Smart Replies:</span>
      <button
        v-for="(reply, index) in visibleReplies"
        :key="index"
        @click="submitAuto(reply)"
        class="ai-reply-btn"
        type="button"
      >
        {{ reply }}
      </button>
      <button
        v-if="suggestedReplies.length > maxSmartReplies"
        type="button"
        class="ai-reply-btn"
        @click="toggleMoreReplies"
        :aria-expanded="showAllReplies ? 'true' : 'false'"
      >
        {{ showAllReplies ? 'Show less' : 'More…' }}
      </button>
    </div>

    <!-- 📝 Chat Input Row -->
    <div
      class="chat-input-container"
      :class="{ 'kb-open': keyboardOpen }"
      role="group"
      aria-label="Compose message"
    >
      <!-- Emoji -->
      <button
        @click="openEmojiPicker"
        class="icon-btn"
        type="button"
        aria-label="Insert emoji"
        title="Emoji"
      >
        <i class="i-tabler-mood-smile text-lg" />
      </button>

      <!-- Input Field -->
      <input
        ref="inputEl"
        v-model="message"
        @keydown.enter.prevent="submit"
        @focus="isTyping = true"
        @blur="isTyping = false"
        type="text"
        :maxlength="maxLength"
        class="chat-input"
        :class="{ 'at-limit': isAtLimit }"
        :placeholder="placeholder"
        aria-label="Type a short message"
      />

      <!-- Counter (mobile-friendly) -->
      <span class="len" :class="{ warn: message.length >= maxLength - 10 }" aria-hidden="true">
        {{ message.length }}/{{ maxLength }}
      </span>

      <!-- Attach -->
      <button
        @click="openAttachment"
        class="icon-btn"
        type="button"
        aria-label="Attach file"
        title="Attach"
      >
        <i class="i-tabler-paperclip text-lg" />
      </button>

      <!-- Voice: Tap = toggle, Long-press = momentary record -->
      <button
        class="icon-btn mic"
        type="button"
        aria-label="Record voice"
        title="Voice"
        @mousedown="startHold"
        @touchstart.prevent="startHold"
        @mouseup="endHold"
        @mouseleave="endHold"
        @touchend="endHold"
        @click="toggleVoice"
        :class="{ active: recording }"
      >
        <i class="i-tabler-microphone text-lg" />
      </button>

      <!-- Send -->
      <button
        @click="submit"
        class="send-btn"
        type="button"
        :disabled="sendDisabled"
        aria-label="Send message"
        title="Send"
      >
        🚀 Send
      </button>
    </div>

    <!-- 🚫 Length Warning -->
    <p v-if="isAtLimit" class="limit-note">
      ✋ You reached the {{ maxLength }} characters limit.
    </p>

    <!-- 🔔 Tiny toasts -->
    <div class="toasts" aria-live="polite" aria-atomic="true">
      <transition-group name="toast">
        <div v-for="t in toasts" :key="t.id" class="toast">
          <span class="emoji">{{ t.icon }}</span>
          <span>{{ t.msg }}</span>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import LiveMessageFeed from '@/components/Live/LiveMessageFeed.vue'

/* ============ Props / Emits ============ */
const props = defineProps({
  maxLength: { type: Number, default: 120 },
  maxWidth: { type: [Number, String], default: 380 }, // px or css string
  bottomOffset: { type: [Number, String], default: 56 }, // keep above action bar
  showSmartReplies: { type: Boolean, default: true },
  replies: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Type a short message…' },
})
const emit = defineEmits(['send', 'attach', 'voiceStart', 'voiceStop', 'emoji'])

/* ============ State ============ */
const message = ref('')
const lastSent = ref('')
const pinned = ref(null)
const localMessages = ref([])
const allowAutoReply = ref(true)
const isTyping = ref(false)

const inputEl = ref(null)
const feedWrap = ref(null)

const maxSmartReplies = 4
const suggestedReplies = ref(
  props.replies.length
    ? props.replies
    : [
        'Welcome to the stream!',
        'Thanks for your support 💖',
        'We love your energy!',
        'Let us know what you think!',
        'Where are you watching from?',
        '🔥 Follow for more!',
      ]
)
const showAllReplies = ref(false)
const visibleReplies = computed(() =>
  showAllReplies.value ? suggestedReplies.value : suggestedReplies.value.slice(0, maxSmartReplies)
)

/* ============ Audio (send SFX) ============ */
let sendSound = null
onMounted(() => {
  try {
    sendSound = new Audio('/sounds/send.mp3')
    sendSound.volume = 1.0
    sendSound.preload = 'auto'
  } catch (e) {
    // safe fallback
  }
})

/* ============ Cleanup old messages ============ */
let cleanupTimer = null
const CLEAN_MINUTES = 10
onMounted(() => {
  cleanupTimer = setInterval(cleanOldMessages, 60_000)
})
onBeforeUnmount(() => {
  if (cleanupTimer) clearInterval(cleanupTimer)
})

function cleanOldMessages() {
  const now = Date.now()
  const maxAge = CLEAN_MINUTES * 60 * 1000
  localMessages.value = localMessages.value.filter(m => now - m.timestamp <= maxAge)
}

/* ============ Keyboard-aware layout (mobile) ============ */
const baseHeight = ref(window.innerHeight)
const keyboardOpen = ref(false)
function handleViewport() {
  const h = window.innerHeight
  keyboardOpen.value = h < baseHeight.value * 0.88 // heuristic
}
onMounted(() => {
  baseHeight.value = window.innerHeight
  window.addEventListener('resize', handleViewport, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('resize', handleViewport))

/* ============ Computeds ============ */
const isAtLimit = computed(() => message.value.length >= props.maxLength)
const sendDisabled = computed(() => !message.value.trim() || isAtLimit.value)
const bottomOffsetCss = computed(() =>
  typeof props.bottomOffset === 'number' ? `${props.bottomOffset}px` : String(props.bottomOffset)
)
const maxWidthCss = computed(() =>
  typeof props.maxWidth === 'number' ? `${props.maxWidth}px` : String(props.maxWidth)
)

/* ============ Toasts ============ */
const toasts = ref([])
function showToast(msg, icon = '💬', ms = 1800) {
  const id = Date.now() + Math.random()
  toasts.value.push({ id, msg, icon })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, ms)
}

/* ============ Send flow ============ */
let lastSendAt = 0
function playSound() {
  if (!sendSound) return
  try {
    sendSound.currentTime = 0
    sendSound.play()
  } catch {}
}
function scrollToBottom() {
  nextTick(() => {
    if (!feedWrap.value) return
    feedWrap.value.scrollTop = feedWrap.value.scrollHeight
  })
}

function pushLocal(text, sender = 'You') {
  const now = Date.now()
  const entry = {
    id: now,
    text,
    sender,
    timestamp: now,
    type: 'chat',
  }
  localMessages.value.push(entry)
  pinned.value = entry
  scrollToBottom()
}

function submit() {
  const clean = message.value.trim()
  if (!clean) {
    showToast('Type something first!', '⚠️')
    inputEl.value?.focus()
    return
  }
  if (clean.length > props.maxLength) {
    showToast(`Max ${props.maxLength} characters.`, '🚫')
    return
  }
  const now = Date.now()
  if (now - lastSendAt < 500) {
    // throttle
    return
  }
  lastSendAt = now

  pushLocal(clean)
  emit('send', { text: clean, at: new Date().toISOString() })

  lastSent.value = clean
  message.value = ''
  playSound()
}

function submitAuto(text) {
  const clean = String(text || '').trim()
  if (!clean) return
  pushLocal(clean, 'Auto')
  emit('send', { text: clean, at: new Date().toISOString(), auto: true })
  playSound()
}

function toggleMoreReplies() {
  showAllReplies.value = !showAllReplies.value
}

/* ============ Emoji / Attach ============ */
function openEmojiPicker() {
  emit('emoji')
  showToast('Emoji Picker coming 😄')
  inputEl.value?.focus()
}
function openAttachment() {
  emit('attach')
  showToast('Attach media soon 📎')
}

/* ============ Voice UX (tap/hold) ============ */
const recording = ref(false)
let holdTimer = null
function startHold() {
  clearTimeout(holdTimer)
  holdTimer = setTimeout(() => {
    // long press => momentary record
    if (!recording.value) {
      startRecording()
      // small haptic if supported
      if (navigator.vibrate) navigator.vibrate(8)
    }
  }, 250)
}
function endHold() {
  clearTimeout(holdTimer)
  if (recording.value) stopRecording()
}
function toggleVoice() {
  // tap toggles record when not in hold path
  if (recording.value) stopRecording()
  else startRecording()
}
function startRecording() {
  recording.value = true
  emit('voiceStart')
  showToast('Recording…', '🎙️', 1200)
}
function stopRecording() {
  recording.value = false
  emit('voiceStop')
  showToast('Voice saved (stub)', '✅')
}
</script>

<style scoped>
/* Root dock */
.live-chat-dock {
  /* anchored left/bottom; safe-area-aware */
  position: fixed;
  left: 1rem;
  bottom: calc(0.75rem + var(--bottom-offset, 0px) + env(safe-area-inset-bottom, 0px));
  width: min(90vw, var(--max-width, 380px));
  pointer-events: none; /* children enable selectively */
  z-index: 50;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji';
  color: #fff;
}

/* 📌 Pinned */
.pinned-message {
  position: fixed;
  top: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  backdrop-filter: blur(8px);
  background: linear-gradient(90deg, rgba(30,58,138,.9), rgba(59,130,246,.9));
  border: 1px solid rgba(255,255,255,.12);
  box-shadow: 0 6px 16px rgba(59,130,246,.35);
  animation: pulsePinned 3s infinite ease-in-out;
  pointer-events: auto;
}
@keyframes pulsePinned {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50%       { transform: translateX(-50%) scale(1.05); }
}

/* 💬 Feed */
.feed-wrap {
  position: relative;
  pointer-events: none;
  max-height: 38vh;
  overflow: auto;
  padding-right: 4px; /* tiny room for scrollbar */
  margin-bottom: 0.5rem;
  /* soft fade at bottom */
  mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 80%, rgba(0,0,0,0));
}
.feed-wrap.is-typing {
  mask-image: none;
}
.feed-spacer { height: 56px; }

/* 🤖 Smart Replies */
.ai-replies {
  position: relative;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.75rem;
  padding: 0.4rem 0.55rem;
  max-width: 100%;
  background: rgba(0,0,0,0.35);
  backdrop-filter: blur(6px);
  border-radius: 9999px;
  border: 1px solid rgba(255,255,255,0.08);
  pointer-events: auto;
  margin-bottom: 0.5rem;
}
.ai-replies .label {
  opacity: 0.7;
  margin-right: 0.25rem;
}
.ai-reply-btn {
  padding: 0.25rem 0.7rem;
  background: rgba(255,255,255,0.10);
  color: #fff;
  border-radius: 9999px;
  line-height: 1.8;
  transition: background .2s ease, transform .05s ease;
  pointer-events: auto;
  border: 1px solid rgba(255,255,255,0.08);
}
.ai-reply-btn:hover { background: rgba(255,255,255,0.20); }
.ai-reply-btn:active { transform: scale(0.98); }

/* 📝 Input Row */
.chat-input-container {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 0.6rem;
  width: 100%;
  background: rgba(0,0,0,0.30);
  backdrop-filter: blur(12px);
  border-radius: 9999px;
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 6px 20px rgba(0,0,0,0.35);
  pointer-events: auto;
  transition: transform .2s ease;
}
.chat-input-container.kb-open {
  transform: translateY(-6px);
}

.chat-input {
  flex: 1 1 auto;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 0.9rem;
  line-height: 1.2;
}
.chat-input::placeholder { color: rgba(255,255,255,0.5); }
.chat-input.at-limit { color: #fecaca; } /* red-100 */

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  width: 34px;
  border-radius: 9999px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  transition: transform .15s ease, filter .2s ease, background .2s ease;
}
.icon-btn:hover { transform: scale(1.06); filter: drop-shadow(0 0 4px rgba(255,255,255,.25)); }
.icon-btn:active { transform: scale(0.98); }

.icon-btn.mic.active {
  background: rgba(59,130,246,0.18);
  border-color: rgba(59,130,246,0.35);
  box-shadow: 0 0 0 3px rgba(59,130,246,0.15) inset;
}

.send-btn {
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  padding: 6px 10px;
  background: linear-gradient(90deg, #2563eb, #3b82f6);
  border-radius: 9999px;
  box-shadow: 0 6px 16px rgba(59,130,246,.35);
  transition: filter .2s ease, opacity .2s ease, transform .05s ease;
}
.send-btn:hover { filter: brightness(1.06); }
.send-btn:active { transform: translateY(1px); }
.send-btn:disabled { opacity: .5; cursor: not-allowed; }

/* Counter */
.len {
  font-size: 0.72rem;
  opacity: .7;
  min-width: 54px;
  text-align: right;
}
.len.warn { opacity: 1; }

/* 🚫 Limit note */
.limit-note {
  font-size: 0.72rem;
  color: #fca5a5;
  margin-top: 0.25rem;
}

/* 🔔 Toasts */
.toasts {
  position: fixed;
  left: 1rem;
  bottom: calc(3.75rem + var(--bottom-offset, 0px) + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 0.82rem;
  border-radius: 12px;
  background: rgba(17,24,39,.88); /* slate-900 */
  border: 1px solid rgba(255,255,255,.08);
  box-shadow: 0 8px 20px rgba(0,0,0,.35);
}
.toast .emoji { font-size: 1rem; }
.toast-enter-active, .toast-leave-active { transition: all .2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(6px); }

/* 📱 Responsive */
@media (max-width: 768px) {
  .live-chat-dock { left: 3%; width: 94%; }
}
</style>
