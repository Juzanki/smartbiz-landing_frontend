<template>
  <div
    class="relative inline-block"
    :class="small ? 'w-8 h-8' : 'w-10 h-10'"
    :title="showTooltip ? displayName : null"
  >
    <!-- Avatar Image -->
    <img
      :src="imgSrc"
      alt="User Avatar"
      class="rounded-full object-cover w-full h-full border transition-all duration-300 ease-in-out"
      :class="[ringClass, glowClass, livePulseClass, 'hover:ring-2 hover:ring-offset-1']"
      @error="onImageError"
    />

    <!-- Verified Badge Overlay -->
    <div
      v-if="isVerified"
      class="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow z-10"
      :class="[small ? 'w-3 h-3' : 'w-4 h-4', pulseOnVerified ? 'animate-ping-slow' : '']"
    >
      <i class="i-tabler-badge-check text-blue-500 w-full h-full" />
    </div>

    <!-- Special Badge (Top Fan / Streamer / Supporter) -->
    <div
      v-if="badgeLabel"
      class="absolute -top-1 -left-1 rounded-full px-1.5 py-0.5 text-xs font-bold text-white z-10"
      :class="badgeColorClass"
      :title="badgeTooltip"
    >
      {{ badgeLabel }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  small: Boolean,
  fallback: {
    type: String,
    default: '/avatars/default.png'
  },
  badge: {
    type: String,
    default: '' // 'top-fan', 'streamer', 'supporter'
  },
  isLive: Boolean,
  showTooltip: {
    type: Boolean,
    default: true
  },
  pulseOnVerified: {
    type: Boolean,
    default: false
  }
})

const userStore = useUserStore()

const displayName = computed(() => userStore.displayName)
const isVerified = computed(() => userStore.isVerified)
const role = computed(() => localStorage.getItem('user_role') || '')

const imgSrc = ref(userStore.avatar || props.fallback)

// Fallback if image fails to load
const onImageError = () => {
  imgSrc.value = props.fallback
}

// Ring by role
const ringClass = computed(() => {
  switch (role.value) {
    case 'owner': return 'border-purple-500'
    case 'admin': return 'border-blue-500'
    case 'vip': return 'border-yellow-400'
    case 'user': return 'border-green-400'
    default: return 'border-gray-300 dark:border-gray-600'
  }
})

// Glow for VIP
const glowClass = computed(() =>
  role.value === 'vip'
    ? 'shadow-[0_0_8px_2px_rgba(255,223,0,0.7)]'
    : ''
)

// Live ripple animation
const livePulseClass = computed(() =>
  props.isLive
    ? 'ring-2 ring-red-500 animate-pulse'
    : ''
)

// Badge icons
const badgeLabel = computed(() => {
  switch (props.badge) {
    case 'top-fan': return '🔥'
    case 'streamer': return '🎥'
    case 'supporter': return '💖'
    default: return ''
  }
})

const badgeTooltip = computed(() => {
  switch (props.badge) {
    case 'top-fan': return 'Top Fan'
    case 'streamer': return 'Streamer'
    case 'supporter': return 'Supporter'
    default: return ''
  }
})

const badgeColorClass = computed(() => {
  switch (props.badge) {
    case 'top-fan': return 'bg-red-600'
    case 'streamer': return 'bg-indigo-600'
    case 'supporter': return 'bg-pink-500'
    default: return 'bg-gray-400'
  }
})
</script>

<style scoped>
@keyframes ping-slow {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.3);
    opacity: 0;
  }
}
.animate-ping-slow {
  animation: ping-slow 1.6s infinite;
}
</style>

