<template>
  <div
    class="relative inline-block align-middle select-none"
    :class="sizeClass"
    :style="sizeStyle"
    :title="showTooltip ? (altText || displayName) : null"
  >
    <!-- LIVE ripple (behind) -->
    <span
      v-if="isLive"
      class="absolute inset-0 rounded-full pointer-events-none"
      :class="['ring-2 ring-red-500', liveRippleClass]"
      aria-hidden="true"
    />

    <!-- Skeleton while loading -->
    <div
      v-if="!loaded"
      class="absolute inset-0 rounded-full animate-pulse"
      :class="['bg-gray-200 dark:bg-white/10', borderClass]"
      aria-hidden="true"
    ></div>

    <!-- Avatar image -->
    <img
      :src="imgSrc"
      :srcset="srcSet || undefined"
      :alt="altText || (displayName ? displayName + ' avatar' : 'User avatar')"
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      class="relative z-10 rounded-full object-cover w-full h-full transition-all duration-300 ease-in-out"
      :class="[borderClass, glowClass, loaded ? 'opacity-100' : 'opacity-0']"
      @load="onLoad"
      @error="onImageError"
      @click="$emit('click')"
      :tabindex="clickable ? 0 : undefined"
      @keydown.enter.prevent="clickable && $emit('click')"
      @keydown.space.prevent="clickable && $emit('click')"
    />

    <!-- Online/Busy/Offline status dot -->
    <span
      v-if="status"
      class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-[#0b0b10]"
      :class="statusClass"
      aria-hidden="true"
    />

    <!-- Verified badge -->
    <div
      v-if="isVerified"
      class="absolute -bottom-1 -right-1 bg-white dark:bg-[#0b0b10] rounded-full p-0.5 shadow z-20"
      :class="[size < 36 ? 'w-3 h-3' : 'w-4 h-4', pulseOnVerified ? 'animate-ping-slow' : '']"
      aria-label="Verified"
      title="Verified"
    >
      <i class="i-tabler-badge-check text-blue-500 w-full h-full" />
    </div>

    <!-- Special badge (Top Fan / Streamer / Supporter) -->
    <div
      v-if="badgeLabel"
      class="absolute -top-1 -left-1 rounded-full px-1.5 py-0.5 text-[11px] font-bold text-white z-20"
      :class="badgeColorClass"
      :title="badgeTooltip"
      aria-live="polite"
    >
      {{ badgeLabel }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watchEffect } from 'vue'
import { useUserStore } from '@/stores/user'

/**
 * Props
 */
const props = defineProps({
  /* size in px; if omitted, falls back to 'small' boolean/back-compat */
  size: { type: Number, default: 0 },
  small: Boolean,

  src: String,            // optional: override store avatar
  srcSet: String,         // optional: retina set if you have it
  name: String,           // optional: override store displayName
  verified: { type: Boolean, default: undefined }, // override store verified

  fallback: { type: String, default: '/avatars/default.png' },

  badge: { type: String, default: '' },   // 'top-fan' | 'streamer' | 'supporter'
  isLive: Boolean,
  status: { type: String, default: '' },  // 'online' | 'busy' | 'offline'
  showTooltip: { type: Boolean, default: true },
  pulseOnVerified: { type: Boolean, default: false },
  clickable: { type: Boolean, default: false },

  role: { type: String, default: '' },    // override role if you have it
  alt: { type: String, default: '' }
})

const emit = defineEmits(['click'])

/**
 * Sources (store + props)
 */
const userStore = useUserStore()
const displayName = computed(() => props.name || userStore.displayName || '')
const isVerified = computed(() =>
  typeof props.verified === 'boolean' ? props.verified : !!userStore.isVerified
)

const safeWindow = typeof window !== 'undefined'
const storedRole = computed(() =>
  props.role || (safeWindow ? (localStorage.getItem('user_role') || '') : '')
)

const initialSrc = computed(() => props.src || userStore.avatar || props.fallback)
const imgSrc = ref(initialSrc.value)
const loaded = ref(false)

watchEffect(() => {
  // reset when src changes
  imgSrc.value = initialSrc.value
  loaded.value = false
})

/**
 * Handlers
 */
const onLoad = () => { loaded.value = true }
const onImageError = () => {
  // 1) try provided fallback path
  if (imgSrc.value !== props.fallback && props.fallback) {
    imgSrc.value = props.fallback
    return
  }
  // 2) fallback to generated initials SVG
  imgSrc.value = initialsDataUri(displayName.value || 'U')
}

/**
 * Visual classes
 */
const size = computed(() => (props.size > 0 ? props.size : (props.small ? 32 : 40)))

const sizeClass = computed(() => {
  // for utility-based sizing on common sizes (mobile-first)
  if (props.size > 0) return '' // inline style will handle it
  return props.small ? 'w-8 h-8' : 'w-10 h-10'
})
const sizeStyle = computed(() => props.size > 0 ? { width: `${size.value}px`, height: `${size.value}px` } : {})

const borderClass = computed(() => {
  switch (storedRole.value) {
    case 'owner': return 'border-2 border-purple-500'
    case 'admin': return 'border-2 border-blue-500'
    case 'vip':   return 'border-2 border-yellow-400'
    case 'user':  return 'border border-green-400'
    default:      return 'border border-gray-300 dark:border-gray-600'
  }
})

const glowClass = computed(() =>
  storedRole.value === 'vip'
    ? 'shadow-[0_0_8px_2px_rgba(255,223,0,0.6)]'
    : ''
)

const liveRippleClass = computed(() =>
  // brighter ripple on bigger avatars
  size.value >= 40 ? 'live-ripple' : 'animate-pulse'
)

const statusClass = computed(() => {
  switch (props.status) {
    case 'online': return 'bg-emerald-500'
    case 'busy':   return 'bg-amber-500'
    case 'offline':return 'bg-gray-400 dark:bg-gray-500'
    default:       return 'bg-transparent'
  }
})

/**
 * Badges
 */
const badgeLabel = computed(() => {
  switch (props.badge) {
    case 'top-fan':   return '🔥'
    case 'streamer':  return '🎥'
    case 'supporter': return '💖'
    default:          return ''
  }
})
const badgeTooltip = computed(() => {
  switch (props.badge) {
    case 'top-fan':   return 'Top Fan'
    case 'streamer':  return 'Streamer'
    case 'supporter': return 'Supporter'
    default:          return ''
  }
})
const badgeColorClass = computed(() => {
  switch (props.badge) {
    case 'top-fan':   return 'bg-red-600'
    case 'streamer':  return 'bg-indigo-600'
    case 'supporter': return 'bg-pink-500'
    default:          return 'bg-gray-400'
  }
})

const altText = computed(() => props.alt || '')

/**
 * Helpers
 */
function initialsDataUri(name) {
  const letters = name.trim().split(/\s+/).slice(0,2).map(w => w[0]?.toUpperCase() || '').join('') || 'U'
  const bg = '#1f2937' // gray-800
  const fg = '#ffffff'
  const fontSize = Math.round(size.value * 0.45)
  const svg =
`<svg xmlns='http://www.w3.org/2000/svg' width='${size.value}' height='${size.value}'>
  <rect rx='${size.value/2}' width='100%' height='100%' fill='${bg}'/>
  <text x='50%' y='54%' text-anchor='middle' font-family='system-ui, -apple-system, Segoe UI, Roboto' font-size='${fontSize}' fill='${fg}' dy='.1em'>${letters}</text>
</svg>`
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
}
</script>

<style scoped>
/* Subtle, smooth outward ripple for live state */
@keyframes live-ripple-kf {
  0%   { box-shadow: 0 0 0 0 rgba(239, 68, 68, .45), 0 0 0 4px rgba(239, 68, 68, .35), 0 0 0 8px rgba(239, 68, 68, .15); }
  70%  { box-shadow: 0 0 0 6px rgba(239, 68, 68, .0), 0 0 0 12px rgba(239, 68, 68, .10), 0 0 0 18px rgba(239, 68, 68, .04); }
  100% { box-shadow: 0 0 0 10px rgba(239, 68, 68, .0), 0 0 0 18px rgba(239, 68, 68, .0), 0 0 0 26px rgba(239, 68, 68, .0); }
}
.live-ripple {
  animation: live-ripple-kf 1.6s ease-out infinite;
  /* ensures rings render outside without clipping */
  clip-path: inset(-24px -24px -24px -24px round 999px);
}

/* Verified slow ping */
@keyframes ping-slow {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.3); opacity: 0; }
}
.animate-ping-slow { animation: ping-slow 1.6s infinite; }
</style>
