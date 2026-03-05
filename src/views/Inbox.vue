<template>
  <div class="chat-app">
    <div class="chat-container">
      <!-- Mode Switcher (optional) -->
      <div class="mode-switcher" v-if="!hideModeSwitch">
        <button
          class="mode-btn"
          :class="{ active: viewMode === 'inbox' }"
          @click="switchMode('inbox')"
        >
          <span>📨 Inbox</span>
          <span v-if="unreadTotal > 0" class="badge">{{ unreadTotal > 99 ? '99+' : unreadTotal }}</span>
        </button>
        <button
          class="mode-btn"
          :class="{ active: viewMode === 'thread' }"
          @click="switchMode('thread')"
          :disabled="!activeThread"
        >
          <span>💬 Chat</span>
        </button>
      </div>

      <!-- INBOX VIEW -->
      <template v-if="viewMode === 'inbox'">
        <div class="inbox-header">
          <div class="header-row">
            <button class="icon-btn" @click="goBack">←</button>
            <h2>Inbox</h2>
            <div class="header-actions">
              <button class="icon-btn" @click="toggleSearch">🔍</button>
              <button class="icon-btn" @click="openNewChatModal">✚</button>
              <button class="icon-btn" @click="openGlobalMenu">⋮</button>
            </div>
          </div>

          <transition name="slide">
            <div v-if="showSearch" class="search-bar">
              <input
                ref="searchInput"
                v-model="searchQuery"
                type="text"
                placeholder="Search messages..."
                @input="debouncedSearch"
              />
              <button @click="closeSearch">✕</button>
            </div>
          </transition>
        </div>

        <transition name="slide">
          <div v-if="activeCalls.length > 0" class="active-calls">
            <div class="calls-header" @click="showCalls = !showCalls">
              <span>📞 Active calls ({{ activeCalls.length }})</span>
              <span class="chevron">{{ showCalls ? '▼' : '▶' }}</span>
            </div>
            <transition name="slide">
              <div v-if="showCalls" class="calls-list">
                <div v-for="call in activeCalls" :key="call.id" class="call-item" @click="joinCall(call)">
                  <img :src="call.avatar" class="call-avatar" @error="handleImageError" />
                  <div class="call-info">
                    <div class="call-name">{{ call.name }}</div>
                    <div class="call-meta">{{ call.type }} • {{ formatTime(call.startedAt) }}</div>
                  </div>
                  <button class="join-btn">Join</button>
                </div>
              </div>
            </transition>
          </div>
        </transition>

        <div class="filters">
          <button
            v-for="filter in filters"
            :key="filter.value"
            class="filter-chip"
            :class="{ active: activeFilter === filter.value }"
            @click="setFilter(filter.value)"
          >
            {{ filter.label }}
          </button>

          <button class="filter-chip" @click="toggleCompact">
            {{ compactMode ? '📏 Compact' : '📐 Cozy' }}
          </button>
        </div>

        <div class="conversations" :class="{ compact: compactMode }">
          <div v-if="loading.inbox" class="loading">
            <div v-for="i in 5" :key="i" class="skeleton-item">
              <div class="skeleton-avatar"></div>
              <div class="skeleton-lines">
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
              </div>
            </div>
          </div>

          <div v-else-if="error.inbox" class="error-state">
            <span>⚠️</span>
            <p>{{ error.inbox }}</p>
            <button @click="fetchConversations">Retry</button>
          </div>

          <div v-else-if="filteredConversations.length === 0" class="empty-state">
            <span class="empty-icon">💬</span>
            <h3>No conversations</h3>
            <p>Start a new chat</p>
            <button class="btn-primary" @click="openNewChatModal">New Message</button>
          </div>

          <div v-else class="conversation-list">
            <div
              v-for="conv in filteredConversations"
              :key="conv.id"
              class="conversation-item"
              :class="{
                unread: conv.unread > 0,
                muted: conv.muted,
                'in-call': conv.inCall
              }"
              @click="openChat(conv)"               <!-- ✅ SINGLE CLICK OPENS CHAT -->
              @contextmenu.prevent="openContextMenu($event, conv)"
            >
              <div class="item-avatar">
                <img :src="conv.avatar || defaultAvatar" @error="handleImageError" />
                <span class="online-indicator" :class="{ online: conv.online }"></span>
                <span v-if="conv.inCall" class="call-badge">{{ conv.callType === 'video' ? '📹' : '🎙️' }}</span>
                <span v-if="conv.pinned" class="pin-badge">📌</span>

                <!-- ✅ Lock badge -->
                <span v-if="isThreadLocked(conv.id)" class="lock-badge" title="Locked">🔒</span>
              </div>

              <div class="item-content">
                <div class="item-header">
                  <span class="item-name">{{ conv.name }}</span>
                  <span class="item-time">{{ formatTime(conv.lastTs) }}</span>
                </div>

                <div class="item-preview">
                  <span v-if="conv.typing" class="typing-text">typing...</span>
                  <span v-else-if="conv.inCall" class="call-text">🔴 In call...</span>
                  <span v-else class="preview-text">
                    <span v-if="conv.lastMessage?.sender === currentUser?.id">You: </span>
                    {{ conv.lastText || 'No messages' }}
                  </span>

                  <div class="item-badges">
                    <span v-if="conv.muted" class="badge muted">🔇</span>
                    <span v-if="conv.unread > 0" class="badge unread">
                      {{ conv.unread > 99 ? '99+' : conv.unread }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- THREAD VIEW -->
      <template v-else-if="viewMode === 'thread' && activeThread">
        <!-- Thread Header -->
        <div class="thread-header">
          <div class="thread-header-left">
            <button class="icon-btn back-btn" @click="switchMode('inbox')">←</button>

            <div class="thread-peer" @click="openUserProfile(activeThread.peerId)">
              <div class="peer-avatar">
                <img :src="activeThread.avatar || defaultAvatar" @error="handleImageError" />
                <span class="online-dot" :class="{ online: activeThread.online }"></span>
              </div>
              <div class="peer-details">
                <div class="peer-name">
                  {{ activeThread.name }}
                  <span v-if="isThreadLocked(activeThread.id)" class="mini-lock">🔒</span>
                </div>
                <div class="peer-status">
                  <span v-if="activeThread.typing" class="typing">typing...</span>
                  <span v-else-if="isInCall" class="in-call">🔴 In call</span>
                  <span v-else>{{ activeThread.online ? 'Online' : 'Offline' }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="thread-header-right">
            <button class="icon-btn" @click="toggleVoiceCall" :class="{ active: isInCall }">
              {{ isInCall ? '🔴' : '🎙️' }}
            </button>
            <button class="icon-btn" @click="toggleVideoCall" :class="{ active: isInVideoCall }">
              {{ isInVideoCall ? '🔴' : '📹' }}
            </button>

            <!-- ✅ Three dots menu -->
            <button class="icon-btn" @click="openThreadMenu">⋮</button>
          </div>

          <transition name="slide">
            <div v-if="isInCall || isInVideoCall" class="call-bar">
              <span class="call-timer">{{ formatDuration(callStartTime) }}</span>
              <div class="call-controls">
                <button @click="toggleMute" :class="{ active: isMuted }">🔇</button>
                <button @click="toggleSpeaker" :class="{ active: isSpeakerOn }">🔊</button>
                <button v-if="isInVideoCall" @click="toggleCamera" :class="{ active: isCameraOn }">📹</button>
                <button class="end-call" @click="endCall">End</button>
              </div>
            </div>
          </transition>
        </div>

        <!-- Messages -->
        <div ref="messageContainer" class="message-thread" @scroll="handleScroll">
          <div v-if="threadHasMore" class="load-more">
            <button @click="loadMoreMessages" :disabled="threadLoadingMore">
              {{ threadLoadingMore ? 'Loading...' : 'Load older' }}
            </button>
          </div>

          <div v-if="threadLoading" class="thread-loading">
            <div class="loading-spinner"></div>
          </div>

          <div v-else-if="threadError" class="thread-error">
            <p>{{ threadError }}</p>
            <button @click="loadThreadMessages">Retry</button>
          </div>

          <template v-else>
            <div v-for="(group, index) in groupedMessages" :key="index" class="message-group">
              <div class="date-divider">{{ group.date }}</div>

              <div
                v-for="msg in group.messages"
                :key="msg.id"
                class="message-wrapper"
                :class="{
                  'my-message': msg.sender === currentUser?.id,
                  'their-message': msg.sender !== currentUser?.id,
                  'highlighted': highlightedMessage === msg.id
                }"
                @contextmenu.prevent="openMessageMenu($event, msg)"
              >
                <img
                  v-if="msg.sender !== currentUser?.id"
                  :src="msg.avatar || activeThread.avatar || defaultAvatar"
                  class="message-avatar"
                  @error="handleImageError"
                />

                <div class="message-content">
                  <div v-if="msg.replyTo" class="reply-ref" @click="jumpToMessage(msg.replyTo.id)">
                    <span class="reply-author">{{ msg.replyTo.sender === currentUser?.id ? 'You' : activeThread.name }}</span>
                    <span class="reply-text">{{ msg.replyTo.text }}</span>
                  </div>

                  <div class="message-bubble">
                    <p class="message-text" v-html="formatMessage(msg.text)"></p>

                    <div v-if="msg.attachments?.length" class="message-attachments">
                      <div
                        v-for="(att, i) in msg.attachments"
                        :key="i"
                        class="attachment"
                        @click="openAttachment(att)"
                      >
                        <span class="att-icon">{{ att.type === 'image' ? '🖼️' : '📎' }}</span>
                        <span class="att-name">{{ att.name }}</span>
                        <span class="att-size">{{ formatFileSize(att.size) }}</span>
                      </div>
                    </div>

                    <div class="message-meta">
                      <span class="message-time">{{ formatTimeOnly(msg.ts) }}</span>
                      <span v-if="msg.edited" class="edited">(edited)</span>
                      <span v-if="msg.sender === currentUser?.id" class="message-status">
                        <span v-if="msg.status === 'sending'">⏳</span>
                        <span v-else-if="msg.status === 'sent'">✓</span>
                        <span v-else-if="msg.status === 'delivered'">✓✓</span>
                        <span v-else-if="msg.status === 'read'" class="read">✓✓</span>
                        <span v-else-if="msg.status === 'failed'" class="failed">⚠</span>
                      </span>
                    </div>

                    <!-- ✅ Edit window hint -->
                    <div v-if="msg.sender === currentUser?.id && canEditOrDelete(msg)" class="edit-window-hint">
                      You can edit/delete for everyone within {{ editWindowMinutes }} min
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <div v-if="activeThread.typing" class="typing-indicator">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>

          <transition name="fade">
            <button v-if="showJumpToBottom" class="jump-bottom" @click="scrollToBottom">↓</button>
          </transition>
        </div>

        <!-- Thread Composer -->
        <div class="thread-composer">
          <transition name="slide">
            <div v-if="replyToMessage" class="reply-indicator">
              <div class="reply-info" @click="jumpToMessage(replyToMessage.id)">
                <span>Replying to {{ replyToMessage.sender === currentUser?.id ? 'yourself' : activeThread.name }}</span>
                <span class="reply-preview">{{ replyToMessage.text }}</span>
              </div>
              <button class="cancel-reply" @click="replyToMessage = null">✕</button>
            </div>
          </transition>

          <transition name="slide">
            <div v-if="editingMessage" class="edit-indicator">
              <span>Editing message</span>
              <button class="cancel-edit" @click="cancelEdit">Cancel</button>
            </div>
          </transition>

          <div class="composer-row">
            <textarea
              ref="threadInput"
              v-model="threadMessage"
              rows="1"
              placeholder="Type a message..."
              @keydown.enter.prevent="sendThreadMessage"
              @input="autoResize"
            ></textarea>

            <div class="composer-actions">
              <button @click="addEmojiThread">😊</button>
              <button @click="openFilePicker('thread')">📎</button>
              <button @click="toggleRecording('thread')" :class="{ recording: isRecording.thread }">
                {{ isRecording.thread ? '⏹️' : '🎤' }}
              </button>
              <button
                class="send-btn"
                :disabled="(!threadMessage.trim() && threadAttachments.length === 0) || sending.thread"
                @click="sendThreadMessage"
              >
                {{ sending.thread ? '⏳' : '➤' }}
              </button>
            </div>
          </div>

          <transition-group name="fade" class="attachments">
            <div v-for="(file, index) in threadAttachments" :key="index" class="attachment-chip">
              <span>{{ file.type.startsWith('image/') ? '🖼️' : '📄' }}</span>
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
              <button @click="removeAttachment('thread', index)">✕</button>
            </div>
          </transition-group>
        </div>
      </template>
    </div>

    <!-- ✅ LOCK / UNLOCK MODAL -->
    <transition name="modal">
      <div v-if="lockModal.show" class="modal-overlay" @click.self="closeLockModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ lockModal.modeTitle }}</h3>
            <button class="close-btn" @click="closeLockModal">✕</button>
          </div>

          <div class="modal-body">
            <p class="lock-sub">
              Chat: <b>{{ lockModal.threadName }}</b>
            </p>

            <div class="lock-inputs">
              <input
                v-model="lockModal.pin"
                type="password"
                inputmode="numeric"
                placeholder="Enter PIN / Password"
              />
              <input
                v-if="lockModal.mode === 'set' || lockModal.mode === 'change'"
                v-model="lockModal.pin2"
                type="password"
                inputmode="numeric"
                placeholder="Confirm PIN / Password"
              />
            </div>

            <div class="lock-actions">
              <button class="btn-primary" @click="confirmLockAction" :disabled="lockModal.loading">
                {{ lockModal.loading ? '⏳' : lockModal.primaryLabel }}
              </button>

              <button class="btn-ghost" @click="closeLockModal">Cancel</button>
            </div>

            <p v-if="lockModal.error" class="lock-error">⚠ {{ lockModal.error }}</p>

            <div class="lock-info">
              <div class="info-row">✅ PIN haikai wazi, tunahifadhi <b>hash</b> tu.</div>
              <div class="info-row">✅ Lock ni ya device/browser hii (client-side).</div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- New Chat Modal -->
    <transition name="modal">
      <div v-if="showNewChatModal" class="modal-overlay" @click.self="closeNewChatModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>New Message</h3>
            <button class="close-btn" @click="closeNewChatModal">✕</button>
          </div>

          <div class="modal-body">
            <div class="search-users">
              <input
                v-model="userSearchQuery"
                type="text"
                placeholder="Search users..."
                @input="debouncedUserSearch"
              />
            </div>

            <div v-if="loading.users" class="modal-loading">
              <div class="spinner"></div>
            </div>

            <div v-else-if="userSearchResults.length > 0" class="user-list">
              <div
                v-for="user in userSearchResults"
                :key="user.id"
                class="user-item"
                @click="startChatWithUser(user)"
              >
                <img :src="user.avatar || defaultAvatar" class="user-avatar" @error="handleImageError"/>
                <div class="user-info">
                  <div class="user-name">{{ user.name }}</div>
                  <div class="user-email">{{ user.email }}</div>
                </div>
                <button class="start-chat">Chat</button>
              </div>
            </div>

            <div v-else-if="userSearchQuery" class="no-results">
              No users found
            </div>

            <div v-else class="search-hint">
              <span>🔍</span>
              <p>Search for users by name or email</p>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Context Menu -->
    <transition name="fade">
      <div v-if="contextMenu.show" class="context-menu-overlay" @click.self="closeContextMenu">
        <div class="context-menu" :style="contextMenu.position">
          <button
            v-for="item in contextMenu.items"
            :key="item.label"
            class="menu-item"
            @click="item.action"
          >
            <span>{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </button>
        </div>
      </div>
    </transition>

    <!-- Image Preview Modal -->
    <transition name="modal">
      <div v-if="previewImage" class="modal-overlay" @click.self="previewImage = null">
        <div class="image-preview">
          <img :src="previewImage" />
          <button class="close-btn" @click="previewImage = null">✕</button>
        </div>
      </div>
    </transition>

    <!-- Hidden File Input -->
    <input
      ref="fileInput"
      type="file"
      class="hidden-input"
      @change="handleFileSelect"
      multiple
      accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// ==================== Constants ====================
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://smartbiz-backend-p45m.onrender.com'
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'wss://smartbiz-backend-p45m.onrender.com'
const defaultAvatar = 'https://ui-avatars.com/api/?background=0D8F81&color=fff&size=150&name='

// ✅ edit/delete window
const editWindowMinutes = 5
const editWindowMs = editWindowMinutes * 60 * 1000

// ✅ lock storage key
const LOCK_PREFIX = 'smartbiz_chat_lock_'     // + conversationId
const UNLOCK_PREFIX = 'smartbiz_chat_unlock_' // + conversationId (session unlock)

// ==================== State ====================
const viewMode = ref('inbox')
const hideModeSwitch = ref(false)
const activeFilter = ref('all')
const searchQuery = ref('')
const showSearch = ref(false)
const compactMode = ref(localStorage.getItem('compactMode') === 'true')
const showNewChatModal = ref(false)
const showCalls = ref(true)

const currentUser = ref(null)
const token = ref(localStorage.getItem('token'))

const conversations = ref([])
const activeThread = ref(null)
const unreadTotal = ref(0)
const activeCalls = ref([])

const threadMessages = ref([])
const threadLoading = ref(false)
const threadLoadingMore = ref(false)
const threadHasMore = ref(true)
const threadError = ref(null)

const loading = ref({ inbox: false, users: false })
const error = ref({ inbox: null })

const threadMessage = ref('')
const threadAttachments = ref([])
const replyToMessage = ref(null)
const editingMessage = ref(null)
const sending = ref({ thread: false })

const isRecording = ref({ thread: false })
let mediaRecorder = null
let audioChunks = []

const isInCall = ref(false)
const isInVideoCall = ref(false)
const isMuted = ref(false)
const isSpeakerOn = ref(true)
const isCameraOn = ref(true)
const callStartTime = ref(null)

let peerConnection = null
let localStream = null
let ws = null

const userSearchQuery = ref('')
const userSearchResults = ref([])
let searchTimeout = null

const contextMenu = ref({
  show: false,
  position: { top: '0px', left: '0px' },
  items: []
})

const searchInput = ref(null)
const messageContainer = ref(null)
const threadInput = ref(null)
const fileInput = ref(null)
const showJumpToBottom = ref(false)
const nearBottom = ref(true)
const highlightedMessage = ref(null)
const previewImage = ref(null)

let wsReconnectAttempts = 0
const maxReconnectAttempts = 5

const filters = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'pinned', label: 'Pinned' }
]

// ✅ lock modal state
const lockModal = ref({
  show: false,
  mode: 'unlock', // unlock | set | change
  modeTitle: 'Unlock Chat',
  primaryLabel: 'Unlock',
  loading: false,
  error: null,
  pin: '',
  pin2: '',
  threadId: null,
  threadName: ''
})

// ==================== Computed ====================
const filteredConversations = computed(() => {
  let filtered = [...conversations.value]

  if (activeFilter.value === 'unread') filtered = filtered.filter(c => c.unread > 0)
  if (activeFilter.value === 'pinned') filtered = filtered.filter(c => c.pinned)

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.lastText || '').toLowerCase().includes(q)
    )
  }

  return filtered.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return (b.lastTs || 0) - (a.lastTs || 0)
  })
})

const groupedMessages = computed(() => {
  const groups = []
  const sorted = [...threadMessages.value].sort((a, b) => a.ts - b.ts)

  sorted.forEach(msg => {
    const date = new Date(msg.ts).toLocaleDateString()
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.date === date) lastGroup.messages.push(msg)
    else groups.push({ date, messages: [msg] })
  })

  return groups
})

// ==================== Helpers ====================
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token.value}`
})

const handleImageError = (event) => {
  event.target.src = defaultAvatar + encodeURIComponent('User')
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (diff < 7 * 24 * 60 * 60 * 1000) return date.toLocaleDateString([], { weekday: 'short' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const formatTimeOnly = (timestamp) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const formatDuration = (startTime) => {
  if (!startTime) return '0:00'
  const seconds = Math.floor((Date.now() - startTime) / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatFileSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

const formatMessage = (text) => {
  if (!text) return ''
  let escaped = text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c))
  escaped = escaped.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
  escaped = escaped.replace(/\n/g, '<br>')
  return escaped
}

const autoResize = (event) => {
  const el = event.target
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

// ==================== Lock / Privacy (Client-side) ====================

// ✅ SHA-256 hash for PIN/password
const sha256 = async (text) => {
  const enc = new TextEncoder()
  const data = enc.encode(text)
  const hashBuf = await crypto.subtle.digest('SHA-256', data)
  const hashArr = Array.from(new Uint8Array(hashBuf))
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('')
}

const lockKey = (threadId) => `${LOCK_PREFIX}${threadId}`
const unlockKey = (threadId) => `${UNLOCK_PREFIX}${threadId}`

// ✅ Returns true if thread has lock set
const isThreadLocked = (threadId) => {
  if (!threadId) return false
  const stored = localStorage.getItem(lockKey(threadId))
  return !!stored
}

// ✅ Returns true if locked and not unlocked in this session
const isThreadLockedAndRequiresUnlock = (threadId) => {
  if (!isThreadLocked(threadId)) return false
  const unlocked = sessionStorage.getItem(unlockKey(threadId))
  return !unlocked
}

const openLockModal = (mode, thread) => {
  const titleMap = {
    unlock: 'Unlock Chat',
    set: 'Set Chat Lock',
    change: 'Change Chat PIN',
  }
  const labelMap = {
    unlock: 'Unlock',
    set: 'Save PIN',
    change: 'Update PIN',
  }

  lockModal.value = {
    show: true,
    mode,
    modeTitle: titleMap[mode] || 'Chat Lock',
    primaryLabel: labelMap[mode] || 'Continue',
    loading: false,
    error: null,
    pin: '',
    pin2: '',
    threadId: thread?.id || null,
    threadName: thread?.name || 'Chat'
  }
}

const closeLockModal = () => {
  lockModal.value.show = false
}

const disableLock = (threadId) => {
  localStorage.removeItem(lockKey(threadId))
  sessionStorage.removeItem(unlockKey(threadId))
}

const confirmLockAction = async () => {
  const m = lockModal.value
  if (!m.threadId) return

  m.error = null
  m.loading = true
  try {
    const pin = (m.pin || '').trim()
    const pin2 = (m.pin2 || '').trim()

    if (m.mode === 'unlock') {
      if (!pin) throw new Error('PIN required')
      const storedHash = localStorage.getItem(lockKey(m.threadId))
      if (!storedHash) throw new Error('No lock set for this chat')

      const inputHash = await sha256(pin)
      if (inputHash !== storedHash) throw new Error('Wrong PIN')

      sessionStorage.setItem(unlockKey(m.threadId), '1')
      closeLockModal()
      // after unlock, continue loading
      await reallyOpenThreadById(m.threadId)
      return
    }

    // set/change
    if (!pin) throw new Error('PIN required')
    if (pin.length < 4) throw new Error('PIN must be at least 4 characters')
    if (pin !== pin2) throw new Error('PIN confirmation does not match')

    const hashed = await sha256(pin)
    localStorage.setItem(lockKey(m.threadId), hashed)
    sessionStorage.setItem(unlockKey(m.threadId), '1')
    closeLockModal()
  } catch (e) {
    m.error = e.message || 'Failed'
  } finally {
    m.loading = false
  }
}

// ==================== API mapping ====================
const mapThreadToConversation = (t) => {
  const lastTs = t.last_message_at ? Date.parse(t.last_message_at) : Date.now()
  return {
    id: t.id,
    peerId: t.peer_id,
    name: t.peer_name || 'User',
    avatar: t.peer_avatar || defaultAvatar,
    online: !!t.peer_online,
    typing: !!t.typing,
    muted: !!t.is_muted,
    pinned: !!t.is_pinned,
    unread: Number(t.unread_count || 0),
    lastText: (t.last_message || '').trim() || 'No messages',
    lastTs,
    inCall: false
  }
}

const mapApiMessageToUi = (m) => {
  let ts = Date.now()
  if (m.created_at) ts = Date.parse(m.created_at)
  else if (m.timestamp) ts = Date.parse(m.timestamp)
  else if (m.ts) ts = m.ts

  return {
    id: m.id,
    sender: m.sender_id || m.user_id || m.sender,
    avatar: m.avatar || m.sender_avatar,
    text: m.text || m.content || '',
    ts,
    status: m.status || 'sent',
    edited: !!(m.edited || m.edited_at),
    attachments: m.attachments || m.files || [],
    replyTo: m.reply_to ? {
      id: m.reply_to.id,
      sender: m.reply_to.sender_id || m.reply_to.sender,
      text: m.reply_to.text || m.reply_to.content
    } : null
  }
}

// ==================== Core fetch ====================
const fetchConversations = async () => {
  loading.value.inbox = true
  error.value.inbox = null
  try {
    const response = await fetch(`${API_BASE_URL}/inbox/recent?limit=50`, { headers: getHeaders() })
    if (!response.ok) throw new Error('Failed to fetch conversations')
    const data = await response.json()
    const arr = Array.isArray(data) ? data : (data.data || [])
    conversations.value = arr.map(mapThreadToConversation)
    unreadTotal.value = conversations.value.reduce((sum, c) => sum + (c.unread || 0), 0)
  } catch (err) {
    error.value.inbox = err.message
    console.error('Fetch conversations error:', err)
  } finally {
    loading.value.inbox = false
  }
}

const fetchThreadMessages = async (conversationId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/inbox/conversation/${encodeURIComponent(conversationId)}/messages?limit=50`,
      { headers: getHeaders() }
    )
    if (!response.ok) return []
    const data = await response.json()
    if (data.items) return data.items
    if (Array.isArray(data)) return data
    return []
  } catch (err) {
    console.error('Fetch messages error:', err)
    return []
  }
}

const markAsRead = async (conversationId) => {
  try {
    await fetch(`${API_BASE_URL}/inbox/conversation/${encodeURIComponent(conversationId)}/read`, {
      method: 'POST',
      headers: getHeaders()
    })
    const conv = conversations.value.find(c => c.id === conversationId)
    if (conv) {
      unreadTotal.value = Math.max(0, unreadTotal.value - (conv.unread || 0))
      conv.unread = 0
    }
  } catch (err) {
    console.error('Failed to mark as read:', err)
  }
}

// ==================== Open Chat Flow (with Lock) ====================

// ✅ real open thread
const reallyOpenThreadById = async (threadId) => {
  const conv = conversations.value.find(c => c.id === threadId) || activeThread.value
  if (!conv) return
  activeThread.value = conv
  viewMode.value = 'thread'
  await loadThreadMessages()
}

// ✅ click from inbox
const openChat = async (conv) => {
  // if locked and needs unlock -> show unlock modal first
  if (isThreadLockedAndRequiresUnlock(conv.id)) {
    openLockModal('unlock', conv)
    return
  }
  await reallyOpenThreadById(conv.id)
}

const loadThreadMessages = async () => {
  if (!activeThread.value) return
  threadLoading.value = true
  threadError.value = null
  try {
    const messages = await fetchThreadMessages(activeThread.value.id)
    threadMessages.value = messages.map(mapApiMessageToUi)
    threadHasMore.value = false
    await markAsRead(activeThread.value.id)
    nextTick(() => scrollToBottom())
  } catch (err) {
    threadError.value = err.message
  } finally {
    threadLoading.value = false
  }
}

const loadMoreMessages = async () => {
  if (threadLoadingMore.value || !threadHasMore.value || !activeThread.value) return
  threadLoadingMore.value = true
  const oldest = threadMessages.value[0]
  if (!oldest) { threadLoadingMore.value = false; return }

  try {
    const response = await fetch(
      `${API_BASE_URL}/inbox/conversation/${encodeURIComponent(activeThread.value.id)}/messages?before_id=${oldest.id}&limit=20`,
      { headers: getHeaders() }
    )
    if (!response.ok) { threadHasMore.value = false; return }
    const data = await response.json()
    const older = (data.items || data).map(mapApiMessageToUi)
    if (older.length) threadMessages.value = [...older, ...threadMessages.value]
    else threadHasMore.value = false
  } catch (e) {
    console.error(e)
  } finally {
    threadLoadingMore.value = false
  }
}

// ==================== Send / Edit / Delete ====================
const sendMessage = async (conversationId, content, attachments = [], replyTo = null) => {
  const formData = new FormData()
  formData.append('text', content)
  formData.append('message', content)
  if (replyTo) formData.append('reply_to', replyTo)
  attachments.forEach(file => formData.append('attachments', file))

  const response = await fetch(
    `${API_BASE_URL}/inbox/conversation/${encodeURIComponent(conversationId)}/messages`,
    { method: 'POST', headers: { 'Authorization': `Bearer ${token.value}` }, body: formData }
  )
  if (!response.ok) throw new Error('Failed to send message')
  const data = await response.json()
  return mapApiMessageToUi(data)
}

const sendThreadMessage = async () => {
  if ((!threadMessage.value.trim() && threadAttachments.value.length === 0) || !activeThread.value) return
  if (sending.value.thread) return

  sending.value.thread = true
  try {
    // ✅ EDIT (within 5 min)
    if (editingMessage.value) {
      if (!canEditOrDelete(editingMessage.value)) {
        throw new Error(`Edit time expired (max ${editWindowMinutes} min)`)
      }

      const response = await fetch(`${API_BASE_URL}/messages/${editingMessage.value.id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ content: threadMessage.value })
      })
      if (!response.ok) throw new Error('Failed to edit message')

      editingMessage.value.text = threadMessage.value
      editingMessage.value.edited = true
      cancelEdit()
    } else {
      const msg = await sendMessage(
        activeThread.value.id,
        threadMessage.value,
        threadAttachments.value,
        replyToMessage.value?.id
      )
      threadMessages.value.push(msg)
      replyToMessage.value = null

      const conv = conversations.value.find(c => c.id === activeThread.value.id)
      if (conv) {
        conv.lastText = threadMessage.value
        conv.lastTs = Date.now()
        conv.unread = 0
      }
    }

    threadMessage.value = ''
    threadAttachments.value = []
    nextTick(() => scrollToBottom())
  } catch (err) {
    alert('Failed: ' + err.message)
  } finally {
    sending.value.thread = false
  }
}

// ✅ allowed window for edit/delete for everyone
const canEditOrDelete = (msg) => {
  if (!msg?.ts) return false
  const age = Date.now() - msg.ts
  return age <= editWindowMs
}

const deleteMessageForMe = async (msg) => {
  // just remove local
  threadMessages.value = threadMessages.value.filter(m => m.id !== msg.id)
}

const deleteMessageForEveryone = async (msg) => {
  if (!canEditOrDelete(msg)) throw new Error(`Delete time expired (max ${editWindowMinutes} min)`)
  const response = await fetch(`${API_BASE_URL}/messages/${msg.id}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  if (!response.ok) throw new Error('Failed to delete message on server')
  threadMessages.value = threadMessages.value.filter(m => m.id !== msg.id)
}

// ==================== Attachments ====================
const openFilePicker = (type) => {
  fileInput.value.dataset.target = type
  fileInput.value.click()
}

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files)
  const target = event.target.dataset.target
  if (target === 'thread') threadAttachments.value.push(...files)
  event.target.value = ''
}

const removeAttachment = (type, index) => {
  if (type === 'thread') threadAttachments.value.splice(index, 1)
}

const openAttachment = (att) => {
  const url = att.url || att.path
  if (!url) return
  if (att.type === 'image' || url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) previewImage.value = url
  else window.open(url, '_blank')
}

// ==================== Search Users / Start Chat ====================
const searchUsers = async () => {
  if (!userSearchQuery.value.trim()) {
    userSearchResults.value = []
    return
  }
  loading.value.users = true
  try {
    const response = await fetch(`${API_BASE_URL}/users/search?q=${encodeURIComponent(userSearchQuery.value)}`, { headers: getHeaders() })
    if (!response.ok) throw new Error('Search failed')
    const data = await response.json()
    userSearchResults.value = data.data || data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value.users = false
  }
}

const startChatWithUser = async (user) => {
  closeNewChatModal()
  try {
    let conversation = conversations.value.find(c => c.peerId === user.id)
    if (!conversation) {
      const response = await fetch(`${API_BASE_URL}/inbox/thread/${encodeURIComponent(user.id)}`, { headers: getHeaders() })
      if (!response.ok) throw new Error('Failed to create thread')
      const data = await response.json()
      conversation = {
        id: data.thread_id || data.id,
        peerId: user.id,
        name: user.name,
        avatar: user.avatar || defaultAvatar,
        online: user.online || false,
        typing: false,
        muted: false,
        pinned: false,
        unread: 0,
        lastText: '',
        lastTs: Date.now(),
        inCall: false
      }
      conversations.value.unshift(conversation)
    }
    await openChat(conversation)
  } catch (err) {
    alert('Failed: ' + err.message)
  }
}

// ==================== WebSocket ====================
const connectWebSocket = () => {
  if (!token.value) return
  try {
    ws = new WebSocket(`${WS_BASE_URL}/messages/ws?token=${token.value}`)

    ws.onopen = () => { wsReconnectAttempts = 0 }
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleWebSocketMessage(data)
      } catch (e) {
        console.error(e)
      }
    }
    ws.onclose = () => {
      if (wsReconnectAttempts < maxReconnectAttempts) {
        wsReconnectAttempts++
        setTimeout(connectWebSocket, 3000 * wsReconnectAttempts)
      }
    }
    ws.onerror = (error) => console.error('WS error', error)
  } catch (err) {
    console.error(err)
  }
}

const handleWebSocketMessage = (data) => {
  if (data.type === 'new_message') handleNewMessage(data.message)
  if (data.type === 'typing') handleTyping(data)
  if (data.type === 'read_receipt') handleReadReceipt(data)
}

const handleNewMessage = (message) => {
  const msg = mapApiMessageToUi(message)
  const conv = conversations.value.find(c => c.id === message.conversation_id)
  if (conv) {
    conv.lastText = msg.text
    conv.lastTs = msg.ts
    conversations.value = [conv, ...conversations.value.filter(c => c.id !== message.conversation_id)]

    if (activeThread.value?.id !== message.conversation_id) {
      conv.unread = (conv.unread || 0) + 1
      unreadTotal.value++
    }
  }
  if (activeThread.value?.id === message.conversation_id) {
    threadMessages.value.push(msg)
    if (nearBottom.value) nextTick(() => scrollToBottom())
  }
}

const handleTyping = (data) => {
  if (data.conversation_id === activeThread.value?.id && data.user_id !== currentUser.value?.id) {
    activeThread.value.typing = data.is_typing
  }
}

const handleReadReceipt = (data) => {
  if (data.conversation_id === activeThread.value?.id) {
    const msg = threadMessages.value.find(m => m.id === data.message_id)
    if (msg && msg.sender === currentUser.value?.id) msg.status = 'read'
  }
}

const sendTyping = (isTyping) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify({ type: 'typing', conversation_id: activeThread.value?.id, is_typing: isTyping }))
}

// ==================== Calls (basic placeholders kept) ====================
const startVoiceCall = async () => alert('Voice call: integrate WebRTC signaling on backend for production.')
const startVideoCall = async () => alert('Video call: integrate WebRTC signaling on backend for production.')
const toggleVoiceCall = () => (isInCall.value ? endCall() : activeThread.value && startVoiceCall(activeThread.value))
const toggleVideoCall = () => (isInVideoCall.value ? endCall() : activeThread.value && startVideoCall(activeThread.value))
const toggleMute = () => (isMuted.value = !isMuted.value)
const toggleSpeaker = () => (isSpeakerOn.value = !isSpeakerOn.value)
const toggleCamera = () => (isCameraOn.value = !isCameraOn.value)

const endCall = () => {
  if (peerConnection) { peerConnection.close(); peerConnection = null }
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null }
  isInCall.value = false
  isInVideoCall.value = false
  callStartTime.value = null
}

// ==================== Voice recording ====================
const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    audioChunks = []
    mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data)
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
      threadAttachments.value.push(file)
      stream.getTracks().forEach(track => track.stop())
    }
    mediaRecorder.start()
    isRecording.value.thread = true
  } catch (err) {
    alert('Mic failed: ' + err.message)
  }
}
const stopRecording = () => {
  if (mediaRecorder && isRecording.value.thread) {
    mediaRecorder.stop()
    isRecording.value.thread = false
  }
}
const toggleRecording = () => (isRecording.value.thread ? stopRecording() : startRecording())

// ==================== Context Menus ====================
const openContextMenu = (event, item) => {
  event.preventDefault()
  // conversation menu
  const items = [
    { icon: isThreadLocked(item.id) ? '🔓' : '🔒', label: isThreadLocked(item.id) ? 'Unlock Settings' : 'Lock Chat', action: () => threadLockAction(item) },
    { icon: item.pinned ? '📌' : '📍', label: item.pinned ? 'Unpin' : 'Pin', action: () => togglePin(item) },
    { icon: item.muted ? '🔔' : '🔇', label: item.muted ? 'Unmute' : 'Mute', action: () => toggleMuteConv(item) },
    { icon: '🧹', label: 'Clear chat (local view)', action: () => clearChatLocal(item) },
    { icon: '🗑️', label: 'Delete conversation (local)', action: () => deleteConversationLocal(item) }
  ]

  contextMenu.value = {
    show: true,
    position: { top: event.clientY + 'px', left: event.clientX + 'px' },
    items
  }
}

const openMessageMenu = (event, msg) => {
  event.preventDefault()
  const mine = msg.sender === currentUser.value?.id

  const items = [
    { icon: '↩️', label: 'Reply', action: () => setReply(msg) },
    { icon: '📋', label: 'Copy', action: () => copyMessage(msg) },
    { icon: '🔗', label: 'Copy link', action: () => copyMessageLink(msg) }
  ]

  if (mine && canEditOrDelete(msg)) {
    items.push(
      { icon: '✏️', label: `Edit (≤${editWindowMinutes}m)`, action: () => setEdit(msg) },
      { icon: '🗑️', label: `Delete for everyone (≤${editWindowMinutes}m)`, action: () => safeDeleteEveryone(msg) }
    )
  }

  if (mine) {
    items.push({ icon: '🧺', label: 'Delete for me', action: () => safeDeleteMe(msg) })
  }

  contextMenu.value = {
    show: true,
    position: { top: event.clientY + 'px', left: event.clientX + 'px' },
    items
  }
}

const closeContextMenu = () => { contextMenu.value.show = false }

const setReply = (msg) => {
  replyToMessage.value = msg
  nextTick(() => threadInput.value?.focus())
  closeContextMenu()
}

const setEdit = (msg) => {
  editingMessage.value = msg
  threadMessage.value = msg.text
  nextTick(() => threadInput.value?.focus())
  closeContextMenu()
}

const cancelEdit = () => {
  editingMessage.value = null
  threadMessage.value = ''
}

const copyMessage = async (msg) => {
  try {
    await navigator.clipboard.writeText(msg.text || '')
    alert('Copied')
  } catch (e) {}
  closeContextMenu()
}

const copyMessageLink = (msg) => {
  const url = `${window.location.origin}/dashboard/inbox?thread=${activeThread.value?.id}&message=${msg.id}`
  navigator.clipboard.writeText(url)
  alert('Link copied')
  closeContextMenu()
}

const safeDeleteMe = async (msg) => {
  if (!confirm('Delete for you (local)?')) return
  await deleteMessageForMe(msg)
  closeContextMenu()
}

const safeDeleteEveryone = async (msg) => {
  if (!confirm('Delete for everyone? (within time limit)')) return
  try {
    await deleteMessageForEveryone(msg)
  } catch (e) {
    alert(e.message)
  }
  closeContextMenu()
}

// ==================== Thread Menu (⋮) ====================
const openThreadMenu = (e) => {
  if (!activeThread.value) return

  const t = activeThread.value
  const locked = isThreadLocked(t.id)

  const items = [
    { icon: locked ? '🔑' : '🔒', label: locked ? 'Change PIN' : 'Set PIN', action: () => openLockModal(locked ? 'change' : 'set', t) },
    { icon: '✅', label: 'Unlock (this session)', action: () => sessionStorage.setItem(unlockKey(t.id), '1') },
    { icon: '🧨', label: 'Disable Lock', action: () => { if(confirm('Disable lock?')) disableLock(t.id) } },
    { icon: '🧹', label: 'Clear chat (local view)', action: () => clearChatLocal(t) },
    { icon: t.muted ? '🔔' : '🔇', label: t.muted ? 'Unmute' : 'Mute', action: () => toggleMuteConv(t) },
    { icon: t.pinned ? '📌' : '📍', label: t.pinned ? 'Unpin' : 'Pin', action: () => togglePin(t) },
    { icon: '🚫', label: 'Block user (UI)', action: () => alert('Block: add backend endpoint later for real blocking.') },
    { icon: '⚠️', label: 'Report (UI)', action: () => alert('Report: add backend endpoint later.') }
  ]

  // open as context menu positioned top-right
  contextMenu.value = {
    show: true,
    position: { top: '70px', left: '220px' },
    items
  }
}

const threadLockAction = (conv) => {
  if (!conv) return
  if (isThreadLocked(conv.id)) {
    // Already locked -> offer change PIN
    openLockModal('change', conv)
  } else {
    openLockModal('set', conv)
  }
  closeContextMenu()
}

// ==================== Conversation actions (local UI) ====================
const togglePin = (conv) => { conv.pinned = !conv.pinned; closeContextMenu() }
const toggleMuteConv = (conv) => { conv.muted = !conv.muted; closeContextMenu() }

const clearChatLocal = (conv) => {
  if (!confirm('Clear messages on screen? (does not delete server history)')) return
  if (activeThread.value?.id === conv.id) threadMessages.value = []
  closeContextMenu()
}

const deleteConversationLocal = (conv) => {
  if (!confirm('Remove conversation from list? (local UI only)')) return
  conversations.value = conversations.value.filter(c => c.id !== conv.id)
  if (activeThread.value?.id === conv.id) {
    activeThread.value = null
    viewMode.value = 'inbox'
  }
  closeContextMenu()
}

// ==================== UI ====================
const switchMode = (mode) => {
  viewMode.value = mode
  if (mode === 'thread' && activeThread.value) loadThreadMessages()
}

const toggleSearch = () => {
  showSearch.value = !showSearch.value
  if (showSearch.value) nextTick(() => searchInput.value?.focus())
}

const closeSearch = () => {
  showSearch.value = false
  searchQuery.value = ''
}

const setFilter = (filter) => { activeFilter.value = filter }

const toggleCompact = () => {
  compactMode.value = !compactMode.value
  localStorage.setItem('compactMode', compactMode.value)
}

const openNewChatModal = () => {
  showNewChatModal.value = true
  userSearchQuery.value = ''
  userSearchResults.value = []
}

const closeNewChatModal = () => { showNewChatModal.value = false }

const openUserProfile = (userId) => router.push(`/profile/${userId}`)

const handleScroll = () => {
  const container = messageContainer.value
  if (!container) return

  const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
  nearBottom.value = distanceFromBottom < 100
  showJumpToBottom.value = distanceFromBottom > 200

  if (container.scrollTop < 100 && threadHasMore.value && !threadLoadingMore.value) loadMoreMessages()
}

const scrollToBottom = () => {
  const container = messageContainer.value
  if (container) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
}

const jumpToMessage = (messageId) => {
  highlightedMessage.value = messageId
  setTimeout(() => { highlightedMessage.value = null }, 2000)
}

const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {}, 250)
}

const debouncedUserSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(searchUsers, 250)
}

const addEmojiThread = () => { threadMessage.value += ' 😊' }

const openGlobalMenu = () => alert('Global menu: add settings/help later.')

const goBack = () => {
  if (viewMode.value === 'thread') {
    viewMode.value = 'inbox'
    activeThread.value = null
  } else router.back()
}

// ==================== Lifecycle ====================
onMounted(async () => {
  if (!token.value) {
    router.push('/login')
    return
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, { headers: getHeaders() })
    if (response.ok) currentUser.value = await response.json()
  } catch (err) {
    console.error('Failed to fetch current user:', err)
  }

  await fetchConversations()
  connectWebSocket()

  let typingTimeout = null
  watch(threadMessage, () => {
    if (!activeThread.value) return
    if (typingTimeout) clearTimeout(typingTimeout)
    sendTyping(true)
    typingTimeout = setTimeout(() => sendTyping(false), 2000)
  })
})

onBeforeUnmount(() => {
  if (ws) ws.close()
  if (mediaRecorder && isRecording.value.thread) mediaRecorder.stop()
  sendTyping(false)
})

watch(viewMode, () => {
  if (viewMode.value === 'inbox') fetchConversations()
})

watch(activeThread, (newVal, oldVal) => {
  if (oldVal) sendTyping(false)
})
</script>

<style scoped>
/* ==================== Base Styles ==================== */
* { box-sizing: border-box; margin: 0; padding: 0; }

.chat-app {
  height: 100vh;
  background: #0f172a;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.chat-container {
  width: 100%;
  max-width: 450px;
  height: 100%;
  max-height: 800px;
  background: white;
  border-radius: 28px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

/* ==================== Mode Switcher ==================== */
.mode-switcher { display:flex; padding:12px; gap:8px; background:#f8fafc; border-bottom:1px solid #e2e8f0; }
.mode-btn {
  flex:1; display:flex; align-items:center; justify-content:center; gap:8px; padding:12px;
  background:white; border:1px solid #e2e8f0; border-radius:40px; font-weight:700;
  color:#64748b; position:relative; cursor:pointer; transition:all .2s;
}
.mode-btn.active { background:#0f172a; color:white; border-color:#0f172a; }
.mode-btn:disabled { opacity:.5; cursor:not-allowed; }
.badge { position:absolute; top:-4px; right:4px; background:#ef4444; color:white; font-size:11px; padding:2px 6px; border-radius:20px; min-width:20px; }

/* ==================== Inbox Header ==================== */
.inbox-header { padding:12px 16px; background:white; border-bottom:1px solid #e2e8f0; }
.header-row { display:flex; align-items:center; gap:12px; }
.header-row h2 { flex:1; font-size:20px; font-weight:800; color:#0f172a; }
.header-actions { display:flex; gap:4px; }

.icon-btn {
  width:40px; height:40px; border-radius:40px; border:1px solid #e2e8f0;
  background:white; color:#334155; font-size:18px; display:grid; place-items:center;
  cursor:pointer; transition:all .2s;
}
.icon-btn:active { background:#f1f5f9; transform:scale(.95); }
.icon-btn.active { background:#0f172a; color:white; border-color:#0f172a; }

/* Search */
.search-bar {
  margin-top:12px; display:flex; align-items:center; gap:8px; background:#f8fafc;
  border:1px solid #e2e8f0; border-radius:40px; padding:0 16px;
}
.search-bar input { flex:1; border:none; background:transparent; padding:12px 0; font-size:15px; outline:none; }
.search-bar button { border:none; background:transparent; color:#94a3b8; font-size:18px; padding:8px; cursor:pointer; }

/* Calls */
.active-calls { background:#ecfdf5; border-bottom:1px solid #a7f3d0; }
.calls-header { padding:12px 16px; display:flex; justify-content:space-between; align-items:center; font-weight:700; color:#059669; cursor:pointer; }
.calls-list { padding:0 16px 12px; display:flex; flex-direction:column; gap:8px; }
.call-item { display:flex; align-items:center; gap:12px; padding:8px; background:white; border-radius:12px; border:1px solid #a7f3d0; }
.call-avatar { width:40px; height:40px; border-radius:40px; object-fit:cover; }
.call-info { flex:1; }
.call-name { font-weight:700; font-size:14px; }
.call-meta { font-size:12px; color:#6b7280; }
.join-btn { background:#059669; border:none; color:white; padding:6px 16px; border-radius:30px; font-size:13px; font-weight:700; cursor:pointer; }

/* Filters */
.filters { padding:12px 16px; display:flex; gap:8px; overflow-x:auto; background:white; border-bottom:1px solid #e2e8f0; scrollbar-width:none; }
.filters::-webkit-scrollbar { display:none; }
.filter-chip {
  padding:8px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:30px;
  font-size:14px; font-weight:600; color:#475569; white-space:nowrap; cursor:pointer; transition:all .2s;
}
.filter-chip.active { background:#0f172a; color:white; border-color:#0f172a; }

/* Conversations */
.conversations { flex:1; overflow-y:auto; background:#f8fafc; padding:8px; }
.conversation-list { display:flex; flex-direction:column; gap:8px; }
.conversation-item {
  display:flex; gap:12px; padding:12px; background:white; border-radius:16px;
  cursor:pointer; transition:all .2s; border:1px solid transparent;
}
.conversation-item:active { transform:scale(.99); background:#f8fafc; }
.conversation-item.unread { background:#f0f9ff; border-color:#bae6fd; }
.conversation-item.muted { opacity:.75; }
.conversation-item.in-call { background:#fef2f2; border-color:#fecaca; }

.item-avatar { position:relative; width:50px; height:50px; }
.item-avatar img { width:50px; height:50px; border-radius:50px; object-fit:cover; }
.online-indicator { position:absolute; bottom:2px; right:2px; width:12px; height:12px; border-radius:12px; background:#94a3b8; border:2px solid white; }
.online-indicator.online { background:#22c55e; }
.call-badge { position:absolute; top:-4px; right:-4px; width:24px; height:24px; background:#ef4444; border-radius:24px; display:grid; place-items:center; color:white; font-size:12px; border:2px solid white; }
.pin-badge { position:absolute; top:-4px; left:-4px; width:24px; height:24px; background:white; border-radius:24px; display:grid; place-items:center; font-size:12px; border:1px solid #e2e8f0; }
.lock-badge { position:absolute; bottom:-6px; left:-6px; width:24px; height:24px; background:#0f172a; color:white; border-radius:24px; display:grid; place-items:center; font-size:12px; border:2px solid white; }

.item-content { flex:1; min-width:0; }
.item-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
.item-name { font-weight:800; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.item-time { font-size:12px; color:#94a3b8; }
.item-preview { display:flex; justify-content:space-between; align-items:center; gap:8px; }
.preview-text { font-size:14px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.typing-text { color:#2563eb; font-style:italic; }
.call-text { color:#ef4444; font-weight:700; }
.item-badges { display:flex; gap:4px; }
.badge.unread { background:#ef4444; color:white; padding:0 6px; border-radius:20px; min-width:20px; height:20px; display:grid; place-items:center; font-size:11px; font-weight:800; }
.badge.muted { background:#e2e8f0; color:#475569; border-radius:20px; min-width:20px; height:20px; display:grid; place-items:center; font-size:11px; font-weight:800; }

/* Thread Header */
.thread-header { padding:12px 16px; background:white; border-bottom:1px solid #e2e8f0; position:relative; }
.thread-header-left { display:flex; align-items:center; gap:12px; }
.thread-peer { display:flex; align-items:center; gap:10px; cursor:pointer; }
.peer-avatar { position:relative; width:40px; height:40px; }
.peer-avatar img { width:40px; height:40px; border-radius:40px; object-fit:cover; }
.online-dot { position:absolute; bottom:2px; right:2px; width:10px; height:10px; border-radius:10px; background:#94a3b8; border:2px solid white; }
.online-dot.online { background:#22c55e; }
.peer-details { min-width:0; }
.peer-name { font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.mini-lock { margin-left:6px; font-size:12px; }
.peer-status { font-size:12px; color:#64748b; }
.peer-status .typing { color:#2563eb; }
.peer-status .in-call { color:#ef4444; }

.thread-header-right { display:flex; gap:8px; margin-top:8px; }

/* Call bar */
.call-bar {
  position:absolute; left:0; right:0; top:100%;
  background:#059669; color:white; padding:10px 16px;
  display:flex; justify-content:space-between; align-items:center; z-index:10;
}
.call-controls { display:flex; gap:12px; }
.call-controls button {
  width:36px; height:36px; border-radius:36px; border:none;
  background:rgba(255,255,255,.2); color:white; font-size:16px; cursor:pointer;
}
.call-controls button.active { background:rgba(255,255,255,.4); }
.call-controls .end-call { background:#ef4444; width:auto; padding:0 16px; font-weight:800; }

/* Message thread */
.message-thread { flex:1; overflow-y:auto; padding:16px; background:#f8fafc; position:relative; }
.load-more { text-align:center; margin-bottom:16px; }
.load-more button {
  background:white; border:1px solid #e2e8f0; border-radius:30px; padding:8px 16px;
  font-size:13px; color:#64748b; cursor:pointer;
}

.thread-loading { display:flex; justify-content:center; padding:40px; }
.loading-spinner { width:40px; height:40px; border:3px solid #e2e8f0; border-top-color:#0f172a; border-radius:50%; animation:spin 1s linear infinite; }
.thread-error { padding:40px 20px; text-align:center; }
.thread-error p { color:#ef4444; margin-bottom:16px; }
.thread-error button { background:#0f172a; color:white; border:none; padding:10px 20px; border-radius:30px; cursor:pointer; font-weight:800; }

.message-group { margin-bottom:24px; }
.date-divider { text-align:center; margin-bottom:16px; font-size:12px; color:#94a3b8; position:relative; }
.date-divider::before, .date-divider::after {
  content:''; position:absolute; top:50%; width:30%; height:1px; background:#e2e8f0;
}
.date-divider::before { left:0; }
.date-divider::after { right:0; }

.message-wrapper { display:flex; gap:8px; margin-bottom:12px; position:relative; }
.message-wrapper.my-message { justify-content:flex-end; }
.message-wrapper.their-message { justify-content:flex-start; }
.message-wrapper.highlighted .message-bubble { animation:highlight 2s; }
.message-avatar { width:32px; height:32px; border-radius:32px; object-fit:cover; align-self:flex-end; }
.message-content { max-width:80%; }

.reply-ref {
  background:#f1f5f9; border-left:3px solid #94a3b8; border-radius:8px;
  padding:6px 10px; margin-bottom:4px; font-size:12px; cursor:pointer;
}
.reply-author { font-weight:800; display:block; margin-bottom:2px; }
.reply-text { color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.message-bubble { background:white; border-radius:18px; padding:10px 12px; box-shadow:0 2px 8px rgba(0,0,0,0.05); }
.my-message .message-bubble { background:#0f172a; color:white; }
.message-text { word-break:break-word; margin-bottom:4px; font-size:14px; line-height:1.4; }
.message-text :deep(a) { color:inherit; text-decoration:underline; }

.message-attachments { margin-top:8px; }
.attachment { display:flex; align-items:center; gap:8px; padding:6px 8px; background:#f8fafc; border-radius:8px; margin-bottom:4px; cursor:pointer; }
.my-message .attachment { background:rgba(255,255,255,.1); }
.att-name { font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.att-size { font-size:11px; color:#94a3b8; margin-left:auto; }

.message-meta { display:flex; align-items:center; gap:6px; margin-top:4px; font-size:11px; color:#94a3b8; }
.my-message .message-meta { justify-content:flex-end; }
.edited { font-style:italic; }
.read { color:#22c55e; }
.failed { color:#ef4444; }

.edit-window-hint {
  margin-top:6px;
  font-size:11px;
  opacity:.85;
}

/* Typing indicator */
.typing-indicator { display:flex; gap:4px; padding:12px; background:white; border-radius:20px; width:fit-content; margin-top:8px; }
.dot { width:8px; height:8px; background:#94a3b8; border-radius:8px; animation:bounce 1.4s infinite; }
.dot:nth-child(2) { animation-delay:.2s; }
.dot:nth-child(3) { animation-delay:.4s; }

.jump-bottom {
  position:sticky; bottom:20px; left:50%; transform:translateX(-50%);
  width:40px; height:40px; border-radius:40px; background:#0f172a; color:white;
  border:none; font-size:20px; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,.2); z-index:5;
}

/* Composer */
.thread-composer { background:white; border-top:1px solid #e2e8f0; padding:12px; }
.reply-indicator, .edit-indicator {
  display:flex; align-items:center; justify-content:space-between; background:#f8fafc;
  border-radius:12px; padding:8px 12px; margin-bottom:8px; font-size:13px;
}
.reply-info { flex:1; cursor:pointer; }
.reply-preview { display:block; font-size:12px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.cancel-reply, .cancel-edit { border:none; background:transparent; color:#94a3b8; font-size:16px; padding:4px; cursor:pointer; }

.composer-row { display:flex; align-items:flex-end; gap:8px; }
.composer-row textarea {
  flex:1; border:1px solid #e2e8f0; border-radius:20px; padding:10px 14px;
  font-size:14px; resize:none; min-height:40px; max-height:100px; outline:none; font-family:inherit;
}
.composer-actions { display:flex; gap:4px; background:#f8fafc; border-radius:30px; padding:2px; }
.composer-actions button { width:36px; height:36px; border-radius:36px; border:none; background:transparent; font-size:16px; cursor:pointer; transition:all .2s; }
.composer-actions button:active { background:#e2e8f0; }
.composer-actions button.recording { background:#ef4444; color:white; }
.composer-actions .send-btn { background:#0f172a; color:white; width:44px; font-weight:900; }

.attachments { display:flex; flex-wrap:wrap; gap:8px; padding:8px 0 0; }
.attachment-chip { display:flex; align-items:center; gap:6px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:30px; padding:4px 10px; font-size:12px; }
.file-name { max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.file-size { color:#94a3b8; font-size:11px; }
.attachment-chip button { border:none; background:transparent; color:#94a3b8; font-size:14px; padding:2px 4px; cursor:pointer; }

/* Modal */
.modal-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.5); backdrop-filter:blur(5px);
  display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px;
}
.modal-content { width:100%; max-width:400px; background:white; border-radius:28px; overflow:hidden; }
.modal-header { padding:16px 20px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; }
.modal-header h3 { font-size:18px; font-weight:800; }
.close-btn { width:32px; height:32px; border-radius:32px; border:1px solid #e2e8f0; background:white; font-size:16px; cursor:pointer; }

.modal-body { padding:20px; max-height:60vh; overflow-y:auto; }
.btn-primary { background:#0f172a; color:white; border:none; padding:14px 24px; border-radius:40px; font-weight:800; cursor:pointer; }
.btn-ghost { background:#f8fafc; color:#0f172a; border:1px solid #e2e8f0; padding:14px 24px; border-radius:40px; font-weight:800; cursor:pointer; }

.lock-sub { margin-bottom:10px; color:#334155; }
.lock-inputs { display:flex; flex-direction:column; gap:10px; }
.lock-inputs input {
  width:100%; padding:12px 16px; border:1px solid #e2e8f0; border-radius:16px; outline:none; font-size:15px;
}
.lock-actions { display:flex; gap:10px; margin-top:14px; }
.lock-error { margin-top:10px; color:#ef4444; font-weight:700; }
.lock-info { margin-top:14px; font-size:12px; color:#64748b; display:flex; flex-direction:column; gap:6px; }
.info-row { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:10px; }

.search-users { margin-bottom:16px; }
.search-users input { width:100%; padding:12px 16px; border:1px solid #e2e8f0; border-radius:30px; font-size:15px; outline:none; }
.user-list { display:flex; flex-direction:column; gap:12px; }
.user-item { display:flex; align-items:center; gap:12px; padding:12px; background:#f8fafc; border-radius:16px; cursor:pointer; }
.user-avatar { width:48px; height:48px; border-radius:48px; object-fit:cover; }
.user-info { flex:1; min-width:0; }
.user-name { font-weight:800; margin-bottom:2px; }
.user-email { font-size:12px; color:#64748b; }
.start-chat { background:#0f172a; color:white; border:none; padding:8px 16px; border-radius:30px; font-size:12px; font-weight:800; cursor:pointer; }

.context-menu-overlay { position:fixed; inset:0; background:transparent; z-index:2000; }
.context-menu { position:absolute; background:white; border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,.2); padding:8px; min-width:220px; z-index:2001; }
.menu-item { display:flex; align-items:center; gap:12px; width:100%; padding:12px 16px; border:none; background:transparent; font-size:14px; text-align:left; cursor:pointer; border-radius:8px; }
.menu-item:active { background:#f8fafc; }
.menu-item span:first-child { width:24px; font-size:16px; }

.image-preview { position:relative; max-width:90vw; max-height:90vh; }
.image-preview img { max-width:100%; max-height:90vh; border-radius:16px; }
.image-preview .close-btn {
  position:absolute; top:10px; right:10px; width:40px; height:40px; border-radius:40px;
  border:none; background:rgba(0,0,0,.5); color:white; font-size:18px; cursor:pointer;
}

.hidden-input { display:none; }

/* States */
.loading { padding:16px; }
.skeleton-item { display:flex; gap:12px; padding:12px; background:white; border-radius:16px; margin-bottom:8px; }
.skeleton-avatar { width:50px; height:50px; border-radius:50px; background:#e2e8f0; animation:pulse 1.5s infinite; }
.skeleton-lines { flex:1; display:flex; flex-direction:column; gap:8px; padding-top:8px; }
.skeleton-line { height:12px; background:#e2e8f0; border-radius:12px; width:80%; animation:pulse 1.5s infinite; }
.skeleton-line.short { width:40%; }
.error-state { padding:40px 20px; text-align:center; }
.error-state span { font-size:40px; display:block; margin-bottom:16px; }
.error-state p { color:#ef4444; margin-bottom:16px; font-weight:700; }
.error-state button { background:#0f172a; color:white; border:none; padding:12px 24px; border-radius:30px; font-weight:800; cursor:pointer; }
.empty-state { padding:60px 20px; text-align:center; }
.empty-icon { font-size:48px; margin-bottom:16px; }
.empty-state h3 { font-size:18px; color:#0f172a; margin-bottom:8px; font-weight:900; }
.empty-state p { color:#64748b; margin-bottom:24px; }

/* Animations */
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-8px)} }
@keyframes highlight { 0%,100%{background:white} 50%{background:#fef9c3} }
@keyframes spin { to{transform:rotate(360deg)} }

.slide-enter-active,.slide-leave-active { transition:all .2s ease; }
.slide-enter-from,.slide-leave-to { opacity:0; transform:translateY(-10px); }
.fade-enter-active,.fade-leave-active { transition:opacity .2s ease; }
.fade-enter-from,.fade-leave-to { opacity:0; }
.modal-enter-active,.modal-leave-active { transition:all .2s ease; }
.modal-enter-from,.modal-leave-to { opacity:0; transform:scale(.95); }

@media (max-width: 380px) {
  .chat-container { border-radius:0; max-height:100vh; }
  .mode-btn { padding:10px; font-size:14px; }
}
</style>
