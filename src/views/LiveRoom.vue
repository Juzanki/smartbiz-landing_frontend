<!-- src/views/LiveRoom.vue -->
<template>
  <div class="live-root" @click="handleScreenTap">
    <!-- =========================
         VIDEO BACKGROUND
         ========================= -->
    <section class="stage">
      <div class="video-background">
        <video class="stage-video" autoplay muted playsinline loop></video>
        
        <!-- Video overlay -->
        <div class="video-overlay">
          
          <!-- =========================
               TOP BAR - ORIGINAL LAYOUT
               ========================= -->
          <header class="top-bar-original">
            <!-- Left: Host Info with Level & Daily Rank -->
            <div class="host-info-original" @click="openHostProfile">
              <div class="host-avatar-original">
                <img 
                  src="https://randomuser.me/api/portraits/men/32.jpg" 
                  alt="Julius Zakayo"
                  class="host-avatar-img"
                  @error="handleAvatarError"
                />
              </div>
              <div class="host-details-original">
                <div class="host-name-level">
                  <span class="host-name">Julius Zakayo</span>
                  <span class="host-level">LV 42</span>
                </div>
                <div class="daily-rank">Daily Rank</div>
              </div>
            </div>
            
            <!-- Center: Add Goal Button -->
            <button class="add-goal-btn" @click="openGoalModal">
              <span class="goal-icon">🎯</span>
              <span class="goal-text">Add goal</span>
            </button>
            
            <!-- Right: Live Status & Controls -->
            <div class="right-controls-original">
              <!-- Live Indicator -->
              <div class="live-status-original">
                <span class="live-indicator">🔴 LIVE</span>
                <span class="live-timer" v-if="showTimer">12:45</span>
              </div>
              
              <!-- Notification Icon -->
              <button class="notification-btn" @click="toggleNotifications">
                <span class="notification-icon">🔔</span>
                <span class="notification-badge" v-if="hasNotifications">3</span>
              </button>
              
              <!-- End Live Button -->
              <button class="end-live-btn-original" @click="handleEndButton" title="End Live">
                <span class="end-icon">✕</span>
              </button>
            </div>
          </header>
          
          <!-- =========================
               TOP CONTRIBUTORS - P¹ P² P³
               ========================= -->
          <div class="top-contributors-original">
            <div 
              v-for="(contributor, index) in top3Contributors" 
              :key="contributor.id"
              class="contributor-original"
              :class="`rank-${index + 1}`"
              @click="openUserProfile(contributor.id)"
            >
              <div class="contributor-rank">P{{ index + 1 }}</div>
              <img 
                :src="contributor.avatar" 
                :alt="contributor.name"
                class="contributor-avatar-original"
              />
              <div class="contributor-info-original">
                <div class="contributor-name-original">{{ contributor.name }}</div>
                <div class="contributor-amount">🪙 {{ formatCompact(contributor.amount) }}</div>
              </div>
            </div>
          </div>
          
          <!-- =========================
               LIVE STATS (Gifts & Likes)
               ========================= -->
          <div class="live-stats-original">
            <div class="stat-item">
              <span class="stat-icon">🎁</span>
              <span class="stat-value">{{ formatCompact(liveStats.giftsValue) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">❤️</span>
              <span class="stat-value">{{ formatCompact(liveStats.likes) }}</span>
            </div>
          </div>
          
          <!-- =========================
               FULL SCREEN VIDEO AREA
               ========================= -->
          <div class="full-screen-video">
            <!-- Video plays in background -->
            <div class="video-focus-area"></div>
          </div>
          
          <!-- =========================
               COMMENT OVERLAY AREA
               ========================= -->
          <div class="comment-overlay-original">
            <div class="comments-container">
              <div 
                v-for="comment in visibleComments" 
                :key="comment.id"
                class="comment-item"
                :class="{ 'highlighted-comment': comment.isHighlighted }"
              >
                <img 
                  :src="comment.avatar" 
                  :alt="comment.senderName"
                  class="comment-avatar"
                />
                <div class="comment-content">
                  <span class="comment-sender">{{ comment.senderName }}:</span>
                  <span class="comment-text">{{ comment.text }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- =========================
               CHAT INPUT AREA
               ========================= -->
          <div class="chat-input-area-original">
            <div class="input-wrapper">
              <input
                v-model="chatInput"
                type="text"
                placeholder="Types..."
                @keyup.enter="sendChatMessage"
                class="chat-input-field-original"
              />
              <button 
                class="send-btn-original"
                @click.stop="sendChatMessage"
                :disabled="!canSendMessage"
              >
                <span class="send-icon">➤</span>
              </button>
            </div>
          </div>
          
          <!-- =========================
               BOTTOM ACTION BAR - ORIGINAL
               ========================= -->
          <nav class="bottom-bar-original">
            <button 
              class="action-btn"
              @click.stop="openGuestsPanel"
              :class="{ active: activePanel === 'guests' }"
            >
              <span class="action-icon">👥</span>
              <span class="action-label">Guests</span>
            </button>
            
            <button 
              class="action-btn"
              @click.stop="openHostControls"
              :class="{ active: activePanel === 'host' }"
            >
              <span class="action-icon">👤</span>
              <span class="action-label">Host</span>
            </button>
            
            <button 
              class="action-btn"
              @click.stop="openGiftsPanel"
              :class="{ active: activePanel === 'gifts' }"
            >
              <span class="action-icon">🎁</span>
              <span class="action-label">Gifts</span>
            </button>
            
            <button 
              class="action-btn"
              @click.stop="openShopPanel"
              :class="{ active: activePanel === 'shop' }"
            >
              <span class="action-icon">🛍</span>
              <span class="action-label">Shop/Products</span>
            </button>
            
            <button 
              class="action-btn"
              @click.stop="openMorePanel"
              :class="{ active: activePanel === 'more' }"
            >
              <span class="action-icon">⋯</span>
              <span class="action-label">More</span>
            </button>
          </nav>
        </div>
      </div>
      
      <!-- =========================
           MODALS & PANELS
           ========================= -->
      
      <!-- Add Goal Modal -->
      <transition name="fade">
        <div v-if="showGoalModal" class="modal-overlay" @click.stop="closeGoalModal">
          <div class="goal-modal" @click.stop>
            <div class="modal-header">
              <h3 class="modal-title">Set Live Goal</h3>
              <button class="modal-close" @click="closeGoalModal">✕</button>
            </div>
            <div class="modal-body">
              <div class="goal-options">
                <div class="goal-type">
                  <label class="goal-type-label">Goal Type</label>
                  <select v-model="selectedGoalType" class="goal-type-select">
                    <option value="gifts">Gifts</option>
                    <option value="likes">Likes</option>
                    <option value="viewers">Viewers</option>
                    <option value="coins">Coins</option>
                  </select>
                </div>
                
                <div class="goal-target">
                  <label class="goal-target-label">Target Amount</label>
                  <input 
                    v-model="goalTargetAmount" 
                    type="number" 
                    min="1" 
                    class="goal-target-input"
                    placeholder="Enter target"
                  />
                </div>
                
                <div class="goal-reward">
                  <label class="goal-reward-label">Reward (Optional)</label>
                  <input 
                    v-model="goalReward" 
                    type="text" 
                    class="goal-reward-input"
                    placeholder="What will you do when goal is reached?"
                  />
                </div>
              </div>
              
              <button class="set-goal-btn" @click="setLiveGoal">
                Set Goal
              </button>
            </div>
          </div>
        </div>
      </transition>
      
      <!-- Gifts Panel -->
      <transition name="slide-up">
        <div v-if="activePanel === 'gifts'" class="panel-overlay" @click.stop="closePanel">
          <div class="gifts-panel-original" @click.stop>
            <div class="panel-header">
              <h3 class="panel-title">Send Gifts</h3>
              <button class="panel-close" @click="closePanel">✕</button>
            </div>
            <div class="gifts-grid-original">
              <div 
                v-for="gift in availableGifts" 
                :key="gift.id"
                class="gift-item-original"
                @click="sendGift(gift)"
              >
                <div class="gift-icon">{{ gift.icon }}</div>
                <div class="gift-name">{{ gift.name }}</div>
                <div class="gift-price">🪙 {{ gift.price }}</div>
              </div>
            </div>
          </div>
        </div>
      </transition>
      
      <!-- Shop Panel -->
      <transition name="slide-up">
        <div v-if="activePanel === 'shop'" class="panel-overlay" @click.stop="closePanel">
          <div class="shop-panel-original" @click.stop>
            <div class="panel-header">
              <h3 class="panel-title">Shop Products</h3>
              <button class="panel-close" @click="closePanel">✕</button>
            </div>
            <div class="products-grid">
              <div 
                v-for="product in availableProducts" 
                :key="product.id"
                class="product-item"
                @click="viewProduct(product)"
              >
                <img :src="product.image" :alt="product.name" class="product-image" />
                <div class="product-info">
                  <div class="product-name">{{ product.name }}</div>
                  <div class="product-price">${{ product.price }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
      
      <!-- More Panel -->
      <transition name="slide-up">
        <div v-if="activePanel === 'more'" class="panel-overlay" @click.stop="closePanel">
          <div class="more-panel-original" @click.stop>
            <div class="panel-header">
              <h3 class="panel-title">More Options</h3>
              <button class="panel-close" @click="closePanel">✕</button>
            </div>
            <div class="more-options">
              <button class="more-option" @click="shareLive">
                <span class="option-icon">↗️</span>
                <span class="option-text">Share Live</span>
              </button>
              <button class="more-option" @click="toggleEffects">
                <span class="option-icon">✨</span>
                <span class="option-text">Effects</span>
              </button>
              <button class="more-option" @click="openSettings">
                <span class="option-icon">⚙️</span>
                <span class="option-text">Settings</span>
              </button>
              <button class="more-option" @click="reportIssue">
                <span class="option-icon">🚨</span>
                <span class="option-text">Report</span>
              </button>
            </div>
          </div>
        </div>
      </transition>
      
      <!-- Toast Notifications -->
      <transition name="slide-up">
        <div v-if="toast.show" class="toast-notification" :class="toast.type">
          <span class="toast-icon">{{ toast.icon }}</span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      </transition>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// =========================
// LIVE DATA
// =========================

// Live Stats (as per image)
const liveStats = ref({
  viewers: 3240,
  gifts: 2300,  // 2.3K as per image
  likes: 5600,  // 5.6K as per image
  giftsValue: 2300
})

// Top 3 Contributors (P¹ P² P³)
const top3Contributors = ref([
  { id: 'p1', name: 'Eman', avatar: 'https://randomuser.me/api/portraits/women/1.jpg', amount: 4500 },
  { id: 'p2', name: 'Sami', avatar: 'https://randomuser.me/api/portraits/men/2.jpg', amount: 3200 },
  { id: 'p3', name: 'Robert', avatar: 'https://randomuser.me/api/portraits/men/5.jpg', amount: 2800 }
])

// Active Panel
const activePanel = ref(null)
const showGoalModal = ref(false)
const showTimer = ref(true)
const hasNotifications = ref(true)

// Chat State
const chatInput = ref('')
const chatComments = ref([])

// Goal Settings
const selectedGoalType = ref('gifts')
const goalTargetAmount = ref('')
const goalReward = ref('')

// Available Gifts
const availableGifts = ref([
  { id: 'rose', name: 'Rose', icon: '🌹', price: 10 },
  { id: 'heart', name: 'Heart', icon: '❤️', price: 50 },
  { id: 'coffee', name: 'Coffee', icon: '☕', price: 100 },
  { id: 'fire', name: 'Fire', icon: '🔥', price: 200 },
  { id: 'diamond', name: 'Diamond', icon: '💎', price: 500 },
  { id: 'crown', name: 'Crown', icon: '👑', price: 1000 }
])

// Available Products
const availableProducts = ref([
  { id: 'prod1', name: 'Wireless Earbuds', image: 'https://via.placeholder.com/100x100/333/fff?text=Earbuds', price: 49.99 },
  { id: 'prod2', name: 'Smart Watch', image: 'https://via.placeholder.com/100x100/333/fff?text=Watch', price: 199.99 },
  { id: 'prod3', name: 'Phone Case', image: 'https://via.placeholder.com/100x100/333/fff?text=Case', price: 24.99 },
  { id: 'prod4', name: 'Power Bank', image: 'https://via.placeholder.com/100x100/333/fff?text=Power', price: 39.99 }
])

// =========================
// COMPUTED PROPERTIES
// =========================

const visibleComments = computed(() => {
  // Show only last 5 comments for overlay
  return chatComments.value.slice(-5)
})

const canSendMessage = computed(() => {
  return chatInput.value.trim().length > 0
})

// =========================
// FUNCTIONS
// =========================

function handleScreenTap(event) {
  // Handle screen tap for likes
  liveStats.value.likes++
  showToast('+1 Like', 'info')
}

function openHostProfile() {
  showToast('Opening host profile', 'info')
}

function openUserProfile(userId) {
  showToast(`Opening ${userId}'s profile`, 'info')
}

function openGoalModal() {
  showGoalModal.value = true
  closePanel()
}

function closeGoalModal() {
  showGoalModal.value = false
}

function setLiveGoal() {
  if (!goalTargetAmount.value) {
    showToast('Please set a target amount', 'error')
    return
  }
  
  showToast(`Goal set: ${goalTargetAmount.value} ${selectedGoalType.value}`, 'success')
  closeGoalModal()
}

function toggleNotifications() {
  hasNotifications.value = false
  showToast('Notifications cleared', 'info')
}

function handleEndButton() {
  if (confirm('Are you sure you want to end the live stream?')) {
    showToast('Live stream ended', 'success')
    setTimeout(() => {
      router.push('/profile')
    }, 1500)
  }
}

// Panel Management
function openPanel(panelName) {
  activePanel.value = panelName
}

function closePanel() {
  activePanel.value = null
}

function openGuestsPanel() {
  openPanel('guests')
}

function openHostControls() {
  showToast('Host controls opened', 'info')
}

function openGiftsPanel() {
  openPanel('gifts')
}

function openShopPanel() {
  openPanel('shop')
}

function openMorePanel() {
  openPanel('more')
}

// Chat System
function sendChatMessage() {
  if (!chatInput.value.trim()) return
  
  const comment = {
    id: `comment-${Date.now()}`,
    senderName: 'You',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    text: chatInput.value.trim(),
    timestamp: Date.now(),
    isHighlighted: Math.random() > 0.8
  }
  
  chatComments.value.push(comment)
  chatInput.value = ''
  
  // Simulate random comments from others
  if (Math.random() > 0.5) {
    setTimeout(() => {
      const names = ['Sarah', 'Mike', 'Lisa', 'David', 'Maria']
      const messages = [
        'Great content!',
        '🔥🔥🔥',
        'Amazing!',
        'Watching from here',
        'Thanks for the tips!'
      ]
      
      const randomComment = {
        id: `rand-${Date.now()}`,
        senderName: names[Math.floor(Math.random() * names.length)],
        avatar: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${Math.floor(Math.random() * 10) + 1}.jpg`,
        text: messages[Math.floor(Math.random() * messages.length)],
        timestamp: Date.now(),
        isHighlighted: Math.random() > 0.9
      }
      
      chatComments.value.push(randomComment)
    }, 1000 + Math.random() * 2000)
  }
}

function sendGift(gift) {
  showToast(`Sent ${gift.name} gift!`, 'success')
  liveStats.value.gifts += gift.price
  liveStats.value.giftsValue += gift.price
  
  // Add gift comment
  const giftComment = {
    id: `gift-${Date.now()}`,
    senderName: 'You',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    text: `Sent ${gift.icon} ${gift.name}`,
    timestamp: Date.now(),
    isHighlighted: true
  }
  
  chatComments.value.push(giftComment)
  closePanel()
}

function viewProduct(product) {
  showToast(`Viewing ${product.name} - $${product.price}`, 'info')
}

// More Panel Functions
function shareLive() {
  showToast('Live stream link copied!', 'success')
  closePanel()
}

function toggleEffects() {
  showToast('Effects toggled', 'info')
  closePanel()
}

function openSettings() {
  showToast('Settings opened', 'info')
  closePanel()
}

function reportIssue() {
  showToast('Report submitted', 'info')
  closePanel()
}

// Utility Functions
function formatCompact(num) {
  if (typeof num !== 'number') return '0'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function handleAvatarError(event) {
  event.target.src = 'https://cdn-icons-png.flaticon.com/512/847/847969.png'
}

// Toast System
const toast = ref({
  show: false,
  message: '',
  type: 'info',
  icon: 'ℹ️'
})

function showToast(message, type = 'info') {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌'
  }
  
  toast.value = {
    show: true,
    message,
    type,
    icon: icons[type] || 'ℹ️'
  }
  
  setTimeout(() => {
    toast.value.show = false
  }, 2000)
}

// Lifecycle
onMounted(() => {
  // Initialize with sample comments
  const sampleComments = [
    { id: '1', senderName: 'Sarah', avatar: 'https://randomuser.me/api/portraits/women/1.jpg', text: 'Amazing content! 🥰', timestamp: Date.now() - 30000, isHighlighted: true },
    { id: '2', senderName: 'Mike', avatar: 'https://randomuser.me/api/portraits/men/6.jpg', text: 'Great tips!', timestamp: Date.now() - 25000 },
    { id: '3', senderName: 'Lisa', avatar: 'https://randomuser.me/api/portraits/women/7.jpg', text: '🔥🔥🔥', timestamp: Date.now() - 20000 },
    { id: '4', senderName: 'David', avatar: 'https://randomuser.me/api/portraits/men/8.jpg', text: 'Watching from Kenya', timestamp: Date.now() - 15000 }
  ]
  
  chatComments.value = sampleComments
  
  // Auto-update live stats
  const statsInterval = setInterval(() => {
    liveStats.value.viewers += Math.floor(Math.random() * 10) - 3
    liveStats.value.likes += Math.floor(Math.random() * 5) + 1
  }, 5000)
  
  onUnmounted(() => {
    clearInterval(statsInterval)
  })
})
</script>

<style scoped>
/* ==============================================
   ORIGINAL LIVE ROOM STYLE
   ============================================== */

.live-root {
  min-height: 100dvh;
  width: 100%;
  background: #000;
  color: #fff;
  overflow: hidden;
  position: relative;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.stage {
  position: relative;
  min-height: 100dvh;
  width: 100%;
  overflow: hidden;
}

.video-background {
  position: absolute;
  inset: 0;
  background: #000;
  z-index: 1;
}

.stage-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.4;
  filter: brightness(0.7);
  z-index: 1;
}

.video-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
}

.video-overlay > * {
  pointer-events: auto;
}

/* =========================
   TOP BAR - ORIGINAL STYLE
   ========================= */
.top-bar-original {
  position: absolute;
  top: max(env(safe-area-inset-top), 12px);
  left: 12px;
  right: 12px;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 15px;
  background: rgba(20, 20, 30, 0.9);
  border-radius: 15px;
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.host-info-original {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  flex: 1;
}

.host-avatar-original {
  width: 45px;
  height: 45px;
  position: relative;
}

.host-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #ff6b35;
}

.host-details-original {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.host-name-level {
  display: flex;
  align-items: center;
  gap: 8px;
}

.host-name {
  font-size: 16px;
  font-weight: 700;
  color: white;
}

.host-level {
  font-size: 14px;
  color: #ff6b35;
  font-weight: 800;
  background: rgba(255, 107, 53, 0.15);
  padding: 2px 8px;
  border-radius: 10px;
}

.daily-rank {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
}

.add-goal-btn {
  padding: 8px 16px;
  background: rgba(0, 240, 255, 0.15);
  border: 1px solid rgba(0, 240, 255, 0.3);
  border-radius: 20px;
  color: #00f0ff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.add-goal-btn:hover {
  background: rgba(0, 240, 255, 0.25);
  transform: translateY(-1px);
}

.goal-icon {
  font-size: 14px;
}

.goal-text {
  font-weight: 700;
}

.right-controls-original {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-shrink: 0;
}

.live-status-original {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.live-indicator {
  color: #ff4444;
  font-size: 12px;
  font-weight: bold;
  animation: pulseLive 1.5s ease infinite;
}

.live-timer {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
}

.notification-btn {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.notification-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.notification-icon {
  font-size: 18px;
}

.notification-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #ff4444, #ff3366);
  color: white;
  font-size: 10px;
  font-weight: bold;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.end-live-btn-original {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 68, 68, 0.2);
  border: 1px solid rgba(255, 68, 68, 0.4);
  color: #ff4444;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
  font-size: 16px;
  font-weight: bold;
}

.end-live-btn-original:hover {
  background: rgba(255, 68, 68, 0.35);
  transform: scale(1.1);
  box-shadow: 0 0 15px rgba(255, 68, 68, 0.4);
}

@keyframes pulseLive {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* =========================
   TOP CONTRIBUTORS - ORIGINAL
   ========================= */
.top-contributors-original {
  position: absolute;
  top: 90px;
  right: 20px;
  z-index: 150;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100px;
}

.contributor-original {
  background: rgba(0, 0, 0, 0.8);
  border-radius: 12px;
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  border: 2px solid;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.contributor-original:hover {
  transform: translateX(-5px);
}

.contributor-original.rank-1 {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.15);
}

.contributor-original.rank-2 {
  border-color: #c0c0c0;
  background: rgba(192, 192, 192, 0.15);
}

.contributor-original.rank-3 {
  border-color: #cd7f32;
  background: rgba(205, 127, 50, 0.15);
}

.contributor-rank {
  font-size: 12px;
  font-weight: 800;
  color: white;
  min-width: 20px;
}

.contributor-avatar-original {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.contributor-info-original {
  flex: 1;
  min-width: 0;
}

.contributor-name-original {
  font-size: 11px;
  font-weight: 700;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.contributor-amount {
  font-size: 10px;
  color: #ffd700;
  font-weight: 600;
}

/* =========================
   LIVE STATS - ORIGINAL
   ========================= */
.live-stats-original {
  position: absolute;
  top: 90px;
  left: 20px;
  z-index: 150;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 12px;
  padding: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-icon {
  font-size: 16px;
}

.stat-value {
  font-size: 14px;
  font-weight: 800;
  color: white;
}

/* =========================
   FULL SCREEN VIDEO AREA
   ========================= */
.full-screen-video {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
}

.video-focus-area {
  position: absolute;
  top: 140px;
  left: 0;
  right: 0;
  bottom: 180px;
  z-index: 5;
  pointer-events: none;
}

/* =========================
   COMMENT OVERLAY - ORIGINAL
   ========================= */
.comment-overlay-original {
  position: absolute;
  bottom: 60px;
  left: 12px;
  right: 12px;
  height: 120px;
  z-index: 90;
  pointer-events: auto;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 15px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.comments-container {
  height: 100%;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comments-container::-webkit-scrollbar {
  width: 4px;
}

.comments-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.comments-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.comment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  animation: commentSlide 0.3s ease;
}

.comment-item.highlighted-comment {
  background: rgba(0, 240, 255, 0.2);
  border-left: 3px solid #00f0ff;
}

.comment-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-sender {
  font-size: 12px;
  font-weight: 700;
  color: white;
  margin-right: 4px;
}

.comment-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
}

@keyframes commentSlide {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* =========================
   CHAT INPUT AREA - ORIGINAL
   ========================= */
.chat-input-area-original {
  position: absolute;
  bottom: 120px;
  left: 12px;
  right: 12px;
  z-index: 100;
  pointer-events: auto;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 25px;
  padding: 5px 5px 5px 15px;
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.chat-input-field-original {
  flex: 1;
  padding: 12px 0;
  background: transparent;
  border: none;
  color: white;
  font-size: 14px;
  outline: none;
}

.chat-input-field-original::placeholder {
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

.send-btn-original {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00f0ff, #0099ff);
  border: none;
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  font-weight: bold;
}

.send-btn-original:hover:not(:disabled) {
  transform: scale(1.05);
}

.send-btn-original:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* =========================
   BOTTOM BAR - ORIGINAL
   ========================= */
.bottom-bar-original {
  position: absolute;
  bottom: max(env(safe-area-inset-bottom), 8px);
  left: 12px;
  right: 12px;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(20, 20, 30, 0.9);
  border-radius: 20px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  min-width: 55px;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.action-btn.active {
  background: rgba(0, 240, 255, 0.15);
  color: #00f0ff;
}

.action-icon {
  font-size: 20px;
  margin-bottom: 2px;
}

.action-label {
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  line-height: 1.1;
}

/* =========================
   MODALS & PANELS
   ========================= */
.modal-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(30px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.goal-modal {
  background: rgba(30, 30, 40, 0.95);
  border-radius: 20px;
  padding: 20px;
  max-width: 350px;
  width: 90%;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: white;
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.goal-options {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.goal-type, .goal-target, .goal-reward {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.goal-type-label, .goal-target-label, .goal-reward-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
}

.goal-type-select, .goal-target-input, .goal-reward-input {
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: white;
  font-size: 14px;
  outline: none;
}

.goal-type-select option {
  background: #1a1a2e;
  color: white;
}

.set-goal-btn {
  padding: 14px;
  background: linear-gradient(135deg, #00f0ff, #0099ff);
  border: none;
  border-radius: 10px;
  color: #000;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}

.set-goal-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 240, 255, 0.3);
}

/* Panel Overlay */
.panel-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(20px);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.gifts-panel-original, .shop-panel-original, .more-panel-original {
  background: rgba(20, 20, 30, 0.95);
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
  color: white;
}

.panel-close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
}

.panel-close:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* Gifts Grid */
.gifts-grid-original {
  flex: 1;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  overflow-y: auto;
}

.gift-item-original {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.gift-item-original:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
  border-color: #00f0ff;
}

.gift-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.gift-name {
  font-size: 14px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
}

.gift-price {
  font-size: 13px;
  color: #ffd700;
  font-weight: 600;
}

/* Shop Products Grid */
.products-grid {
  flex: 1;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  overflow-y: auto;
}

.product-item {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.product-item:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
}

.product-image {
  width: 100%;
  height: 120px;
  object-fit: cover;
}

.product-info {
  padding: 12px;
}

.product-name {
  font-size: 14px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
}

.product-price {
  font-size: 13px;
  color: #00f0ff;
  font-weight: 700;
}

/* More Options */
.more-options {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.more-option {
  padding: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s ease;
}

.more-option:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateX(5px);
}

.option-icon {
  font-size: 18px;
}

.option-text {
  flex: 1;
}

/* Toast Notifications */
.toast-notification {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 30, 40, 0.95);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 3000;
  max-width: 90%;
  animation: toastSlide 0.3s ease;
}

.toast-notification.info {
  border-left: 4px solid #00f0ff;
}

.toast-notification.success {
  border-left: 4px solid #00ff88;
}

.toast-notification.error {
  border-left: 4px solid #ff4444;
}

.toast-icon {
  font-size: 16px;
}

.toast-message {
  font-size: 14px;
  color: white;
  font-weight: 500;
  flex: 1;
}

@keyframes toastSlide {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* =========================
   RESPONSIVE DESIGN
   ========================= */
@media (max-width: 480px) {
  .top-bar-original {
    left: 8px;
    right: 8px;
    padding: 8px 12px;
  }
  
  .host-avatar-original {
    width: 40px;
    height: 40px;
  }
  
  .host-name {
    font-size: 14px;
  }
  
  .host-level {
    font-size: 12px;
  }
  
  .daily-rank {
    font-size: 11px;
  }
  
  .add-goal-btn {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  .notification-btn {
    width: 36px;
    height: 36px;
  }
  
  .end-live-btn-original {
    width: 32px;
    height: 32px;
  }
  
  .top-contributors-original {
    right: 12px;
    width: 90px;
  }
  
  .live-stats-original {
    left: 12px;
  }
  
  .comment-overlay-original {
    left: 8px;
    right: 8px;
    bottom: 55px;
    height: 110px;
  }
  
  .chat-input-area-original {
    left: 8px;
    right: 8px;
    bottom: 115px;
  }
  
  .bottom-bar-original {
    left: 8px;
    right: 8px;
    padding: 10px 12px;
  }
  
  .action-btn {
    min-width: 50px;
  }
  
  .action-icon {
    font-size: 18px;
  }
  
  .action-label {
    font-size: 10px;
  }
}

/* Panel transitions */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
