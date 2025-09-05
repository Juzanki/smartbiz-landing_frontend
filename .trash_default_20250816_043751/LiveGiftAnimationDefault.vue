<template>
  <div class="relative w-screen h-screen overflow-hidden font-sans text-white" :style="backgroundStyle" @click="tapLikeAnywhere">

    <!-- 🔴 LIVE STATUS & TOP BAR -->
    <div class="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-black/60 backdrop-blur border-b border-white/10">
      <div class="flex items-center gap-3">
        <div class="relative">
          <img :src="hostAvatar" alt="Host Avatar" class="w-9 h-9 rounded-full object-cover border-2 border-white" />
          <span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-white animate-ping"></span>
        </div>
        <div class="text-xs leading-tight">
          <div class="flex items-center gap-1 font-bold">
            {{ hostUsername }}
            <span v-if="isVerified" class="text-yellow-400">✔</span>
            <span class="bg-white/10 text-pink-400 px-2 ml-1 rounded-full text-[10px]">LIVE Host</span>
          </div>
          <div class="text-pink-400 text-[11px]">{{ viewerCount }} Watching</div>
        </div>
        <div class="flex items-center gap-1 px-2 py-1 bg-white/10 rounded-full text-pink-300 text-xs font-bold">
          <i class="i-tabler-heart-filled text-pink-400 text-sm"></i>
          <span>{{ likeCount }}</span>
        </div>
        <span class="ml-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full text-[10px]">🔥 Daily Ranking</span>
        <button @click="showAddGoal = true" class="ml-2 px-2 py-0.5 bg-pink-500 text-white rounded-full text-[10px] hover:bg-pink-600">➕ Add Goal</button>
      </div>

      <div class="flex items-center gap-2 text-xs">
        <button class="px-2 py-1 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] hover:brightness-110">⭐ Featured</button>
        <button class="px-2 py-1 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 text-white text-[10px] hover:brightness-110">🌍 Explore</button>
        <span class="bg-white/10 text-blue-200 px-2 py-1 rounded-full">👑 TopFan</span>
        <span class="text-white/70 text-xs">{{ viewerCount }} Watching</span>
        <span class="text-red-500 text-xs animate-pulse">● LIVE</span>
        <button @click="confirmEndStream" class="ml-2 text-xs px-2 py-1 bg-red-600 rounded-full hover:bg-red-700">✖ End Live</button>
      </div>
    </div>

    <!-- 💬 TICKER -->
    <div class="absolute top-12 left-0 right-0 z-40 bg-black/80 text-white text-xs px-4 py-1">
      <marquee behavior="scroll" direction="left" scrollamount="4">
        🚀 Promotion: Boost your live visibility now and earn double coins! | 🌐 Invite friends to join and get rewards.
      </marquee>
    </div>

    <!-- 🎯 TOPIC + GOAL -->
    <div class="absolute top-20 left-1/2 -translate-x-1/2 z-40">
      <div class="bg-white/10 text-xs px-4 py-1 rounded-full shadow backdrop-blur border border-white/20">
        🎯 Topic: Boosting Business Engagement 🔥
      </div>
      <div
        v-if="currentGoal"
        class="mt-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-white text-xs px-4 py-1 rounded-full shadow backdrop-blur border border-white/20 animate-pulse"
      >
        🎯 Goal: {{ currentGoal }}
      </div>
    </div>

    <!-- 🎙 AI HOST AVATAR -->
    <transition name="fade">
      <div v-if="showAiHostAvatar" class="absolute bottom-[160px] right-4 z-50 bg-white/10 border border-white/20 p-3 rounded-xl backdrop-blur text-center">
        <img :src="aiHostAvatar" class="w-12 h-12 rounded-full mx-auto" />
        <div class="text-xs mt-1 text-white/80">Smart Host</div>
        <div class="text-[10px] text-sky-300">"Welcome! Need help? Ask me anything."</div>
      </div>
    </transition>

    <!-- 🎥 VIDEO FEED -->
    <video ref="videoFeed" autoplay playsinline muted class="absolute inset-0 w-full h-full object-cover z-0">
      Your browser does not support video playback.
    </video>

    <!-- 🎭 FACE FILTER OVERLAY -->
    <FaceFilterLayer :filter="selectedFilter" />

    <!-- ✨ EFFECTS + GIFTS -->
    <FloatingParticles />
    <AnimatedGiftEffect />
    <StageLighting />
    <FaceFilterLayer />
    <LiveGiftAnimation :gift="currentGiftAnimation" v-if="currentGiftAnimation" class="absolute bottom-[120px] top-[40%] left-0 right-0 pointer-events-none z-50" />

    <transition-group name="fly" tag="div" class="absolute inset-x-0 bottom-[120px] top-[40%] z-50 pointer-events-none">
      <GiftFly v-for="(gift, index) in flyingGifts" :key="gift.id || index" :gift="gift" />
    </transition-group>

    <!-- 💬 CHAT -->
    <LiveMessageFeed :messages="liveMessages" class="fixed bottom-[120px] left-4 z-40 max-w-md w-[90vw] pointer-events-none flex flex-col-reverse space-y-1 space-y-reverse" />
    <ChatInput v-model="chatMessage" @send="handleSendMessage" placeholder="Type a message..." class="fixed bottom-4 left-4 z-50 max-w-md w-[90vw]" />

    <!-- 💖 Likes -->
    <transition-group name="float" tag="div" class="absolute inset-0 pointer-events-none z-50">
      <div
        v-for="like in floatingLikes"
        :key="like.id"
        :style="{ left: like.x + 'px', top: like.y + 'px', animation: 'float-up 1.2s ease-out forwards', fontSize: '24px' }"
        class="absolute"
      >💖</div>
    </transition-group>

    <!-- 🧠 AI SUGGESTIONS -->
    <transition name="fade">
      <div v-if="aiSuggestions.length" class="fixed bottom-[180px] left-4 z-40 bg-white/10 backdrop-blur rounded-xl p-3 text-xs text-white w-[90vw] max-w-md">
        <div class="font-bold mb-1">🧠 Smart Tips:</div>
        <ul class="list-disc list-inside">
          <li v-for="(suggestion, i) in aiSuggestions" :key="i">{{ suggestion }}</li>
        </ul>
      </div>
    </transition>

    <!-- 📢 ANNOUNCEMENT -->
    <transition name="fade">
      <div
        v-if="streamAnnouncement"
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-black/80 px-6 py-4 rounded-xl text-lg font-bold text-white shadow-xl"
      >
        {{ streamAnnouncement }}
      </div>
    </transition>

    <!-- ❤️ LIKE BUTTON -->
    <div class="absolute bottom-48 right-4 z-50 flex flex-col items-center gap-1">
      <button @click="tapLikeAnywhere" class="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center hover:bg-pink-600 shadow-lg">
        <i class="i-tabler-heart-filled text-white text-xl"></i>
      </button>
      <span class="text-sm font-semibold text-pink-300">{{ likeCount }}</span>
    </div>

    <!-- 🧭 ACTION BAR -->
    <div class="absolute bottom-16 left-0 right-0 px-4 z-40">
      <div class="flex justify-between items-center px-5 py-2 rounded-full text-white text-xs">
        <template v-for="action in bottomActions" :key="action.label">
          <button @click="action.onClick" :class="[ 'w-14 h-14 flex flex-col items-center justify-center rounded-full text-sm shadow-lg border border-white/10 backdrop-blur-xl transition duration-200 ease-in-out',
            action.label === 'Gifts' ? 'bg-gradient-to-br from-pink-500 to-pink-700' :
            action.label === 'Share' ? 'bg-gradient-to-br from-rose-500 to-red-600' :
            action.label === '+Guests' ? 'bg-gradient-to-br from-purple-600 to-indigo-700' :
            action.label === '+Hosts' ? 'bg-gradient-to-br from-indigo-600 to-blue-700' :
            action.label === 'More' ? 'bg-gradient-to-br from-gray-700 to-black' : 'bg-white/5', 'hover:scale-110']">
            <i :class="action.icon + ' text-xl'" />
            <span class="mt-1 text-xs">{{ action.label }}</span>
            <span v-if="action.hasNotification" class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
            <span v-if="action.hasNotification" class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500"></span>
          </button>
        </template>
      </div>
    </div>

    <!-- 🎭 FACE FILTER SELECTOR -->
    <transition name="fade">
      <div v-if="showFaceFilterSelector" class="absolute bottom-28 left-1/2 -translate-x-1/2 z-50">
        <FaceFilterSelector :selected="selectedFilter" @select="(f) => { selectedFilter = f; showFaceFilterSelector = false }" />
      </div>
    </transition>

    <!-- 📦 PANELS & MODALS -->
    <transition name="fade">
      <div v-if="showMoreOptions" class="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl text-sm text-white bg-black/50 backdrop-blur-md shadow-lg">
        <div class="flex flex-wrap gap-4 justify-center">
          <button @click="startVoiceChat" class="hover:text-sky-400">🔇 Voice Off</button>
          <button @click="toggleReplay" class="hover:text-sky-400">📼 Replay</button>
          <button @click="openEffects" class="hover:text-sky-400">✨ Effects</button>
          <button @click="openSummary" class="hover:text-sky-400">📊 Summary</button>
          <button @click="toggleSettings" class="hover:text-sky-400">⚙ Settings</button>
          <button @click="showFaceFilterSelector = true" class="hover:text-sky-400">🎭 Face Filter</button>
        </div>
      </div>
    </transition>

    <GiftDrawer v-if="showGiftDrawer" @close="showGiftDrawer = false" @send="handleGiftSend" @recharge="goToRecharge" />
    <GiftsPanel v-if="showGiftDrawer" :gifts="giftList" @close="showGiftDrawer = false" @send="handleGiftSend" />
    <SuperChatModal v-if="showSuperChatModal" @close="showSuperChatModal = false" @send="handleSuperChat" />
    <SettingsModal v-if="showSettings" @close="showSettings = false" />
    <WalletTopupModal v-if="showWalletTopup" @close="showWalletTopup = false" />
    <HostsPanel v-if="showHostsPanel" @close="closeHostsPanel" />
    <GuestsPanel v-if="showGuestPanel" @close="closeGuestsPanel" />
    <EffectsPanel v-if="showEffectsPanel" @close="showEffectsPanel = false" />
    <AddGoal v-if="showAddGoal" @close="showAddGoal = false" @set-goal="goal => currentGoal = goal" />

  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { effectMap } from '@/data/effectMap'
import LiveGiftParticles from '@/components/effects/LiveGiftParticles.vue'
import FireworksBurst from '@/components/effects/FireworksBurst.vue'
import EnergyPulse from '@/components/effects/EnergyPulse.vue'
import GiftComboCounter from '@/components/live/GiftComboCounter.vue'

// 🧾 Props
const props = defineProps({
  gift: {
    type: Object,
    required: true
  }
})

// 🔁 Reactive state
const visible = ref(true)
const fadeOut = ref(false)
const videoRef = ref(null)
const activeEffects = ref([])
let timeoutRef = null

// ⏱ Default duration fallback by tier
const tierDurations = {
  Lite: 2500,
  Rare: 3500,
  Epic: 5000,
  Legendary: 6500,
  Mythic: 8000,
  Supreme: 10000
}

const getDuration = (gift) => {
  if (!gift) return 3000
  return gift.duration || tierDurations[gift.tier] || 3000
}

// 🎞 End video
const onVideoEnded = () => {
  triggerFadeOut()
}

// 👋 Fade-out logic
const triggerFadeOut = () => {
  if (fadeOut.value) return
  fadeOut.value = true
  setTimeout(() => {
    visible.value = false
  }, 1200)
}

// 🎇 Animation per tier
const animationClass = computed(() => {
  const animationMap = {
    Lite: 'animate-float-up',
    Rare: 'animate-float-up',
    Epic: 'animate-burst',
    Legendary: 'animate-bounce-scale',
    Mythic: 'animate-overlay-zoom',
    Supreme: 'animate-overlay-zoom'
  }
  return animationMap[props.gift?.tier] || 'animate-float-up'
})

// ✨ Glow style
const tierGlowClass = computed(() => {
  const glowMap = {
    Lite: 'shadow-[0_0_12px_rgba(255,255,255,0.3)] bg-white/5 rounded-full',
    Rare: 'shadow-[0_0_18px_rgba(0,255,255,0.4)] bg-cyan-400/10 rounded-full',
    Epic: 'shadow-[0_0_25px_rgba(147,51,234,0.4)] bg-purple-500/10 rounded-full',
    Legendary: 'shadow-[0_0_30px_rgba(255,215,0,0.5)] bg-yellow-500/10 rounded-full',
    Mythic: 'shadow-[0_0_35px_rgba(255,0,130,0.5)] bg-pink-500/10 rounded-full',
    Supreme: 'shadow-[0_0_40px_rgba(0,255,255,0.6)] bg-indigo-600/10 rounded-full'
  }
  return glowMap[props.gift?.tier] || 'bg-white/5 rounded-full'
})

// ⚛ Load dynamic effects
const playSupportEffects = async () => {
  const fxList = props.gift?.supportEffects
  if (!Array.isArray(fxList)) return

  try {
    const loaded = await Promise.all(
      fxList.map(async (fx) => {
        if (effectMap[fx]) {
          const comp = await effectMap[fx]()
          return comp?.default || null
        }
        return null
      })
    )
    activeEffects.value = loaded.filter(Boolean)

    setTimeout(() => {
      activeEffects.value = []
    }, 3000)
  } catch (err) {
    console.warn('❌ Failed loading supportEffects:', err)
  }
}

// 🚀 On Mount
onMounted(async () => {
  const duration = getDuration(props.gift)

  if (props.gift?.video?.webm || props.gift?.video?.mp4) {
    await nextTick()
    try {
      await videoRef.value?.play?.()
    } catch (e) {
      console.warn('🎥 Auto-play failed, retrying after nextTick')
      setTimeout(() => {
        videoRef.value?.play?.()
      }, 100)
    }
    timeoutRef = setTimeout(triggerFadeOut, duration + 1500)
  } else {
    timeoutRef = setTimeout(() => {
      visible.value = false
    }, duration)
  }

  playSupportEffects()
})

// 🧹 Cleanup
onBeforeUnmount(() => {
  if (timeoutRef) clearTimeout(timeoutRef)
  activeEffects.value = []
})
</script>
<style scoped>
/* 🎬 Entrance Animation: Gift Fade + Bounce */
@keyframes giftFadeBounce {
  0% {
    opacity: 0;
    transform: scale(0.7) translateY(80px);
    filter: blur(8px) brightness(0.6);
  }
  60% {
    opacity: 1;
    transform: scale(1.15) translateY(-10px);
    filter: blur(2px) brightness(1.1);
  }
  100% {
    transform: scale(1) translateY(0);
    filter: blur(0) brightness(1);
  }
}
.gift-fade-enter-active {
  animation: giftFadeBounce 1s cubic-bezier(0.25, 1.25, 0.5, 1);
  will-change: transform, opacity, filter;
}

/* 🎁 Gift Icon Pop Bounce */
@keyframes bounceGift {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(50px);
  }
  50% {
    opacity: 1;
    transform: scale(1.25) translateY(-12px);
  }
  100% {
    transform: scale(1) translateY(0);
  }
}
.animate-gift-bounce {
  animation: bounceGift 1.4s ease-out;
  will-change: transform, opacity;
}

/* 🎞 Gift Video Styling — Bottom Half */
video {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: auto;
  max-width: 100vw;
  height: 45vh;
  max-height: 45vh;
  object-fit: contain;
  z-index: 50;
  pointer-events: none;
  background: transparent;
  filter: brightness(1.35) contrast(1.2) saturate(1.4);
  box-shadow:
    0 0 160px rgba(255, 255, 255, 0.08),
    inset 0 0 200px rgba(255, 255, 255, 0.04);
  transition: opacity 0.6s ease;
}

/* 🌌 Cinematic Pulse Overlay (bottom blend only) */
@keyframes overlayPulse {
  0%, 100% {
    background: linear-gradient(to top, rgba(0,0,0,0.6), transparent 80%);
  }
  50% {
    background: linear-gradient(to top, rgba(255,255,255,0.05), transparent 80%);
  }
}
.animate-overlay-pulse {
  animation: overlayPulse 3s ease-in-out infinite;
}

/* 🛑 Exit Fade with Motion */
@keyframes fadeOutMotion {
  0% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  100% {
    opacity: 0;
    transform: scale(0.9) translateY(-60px);
  }
}
.fade-out {
  animation: fadeOutMotion 2s ease forwards;
}

/* 🏷 Gift Label */
.gift-label {
  text-align: center;
  font-weight: 700;
  font-size: 1.3rem;
  background: linear-gradient(to right, #ffffff, #ffe579, #ffffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 6px rgba(255,255,255,0.15);
  padding: 0.3rem 1rem;
}

/* 🪙 Coin Count Styling */
.coin-value {
  font-size: 1rem;
  font-weight: 700;
  color: gold;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  justify-content: center;
  margin-top: 0.4rem;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

/* 💫 Background Spin Animation */
@keyframes spin {
  to { transform: rotate(360deg); }
}
.animate-spin-slow {
  animation: spin 12s linear infinite;
  opacity: 0.3;
  filter: blur(1px) brightness(1.1);
}

/* 💥 Radiant Glow Ring */
@keyframes glowPulse {
  0%, 100% {
    box-shadow:
      0 0 16px rgba(255,255,255,0.1),
      0 0 40px rgba(255,255,255,0.2),
      0 0 80px rgba(255,255,255,0.1);
  }
  50% {
    box-shadow:
      0 0 32px rgba(255,255,255,0.25),
      0 0 70px rgba(255,255,255,0.3),
      0 0 120px rgba(255,255,255,0.2);
  }
}
.glow-ring {
  animation: glowPulse 3s ease-in-out infinite;
  border-radius: 9999px;
  will-change: box-shadow;
  transition: box-shadow 0.3s ease;
}

/* 🌀 Tier Glow Container */
.tier-glow {
  padding: 1.8rem;
  border-radius: 9999px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  position: relative;
  background: radial-gradient(circle at center, rgba(255,255,255,0.08), transparent 70%);
  box-shadow:
    0 0 30px rgba(255,255,255,0.1),
    0 0 60px rgba(255,255,255,0.07),
    inset 0 0 50px rgba(255,255,255,0.05);
  backdrop-filter: blur(12px);
  z-index: 10;
}

/* 🧊 Fullscreen Gift Wrapper */
.fullscreen-gift-wrapper {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  pointer-events: none;
}
</style>

