<!-- GiftItemCard.vue -->
<template>
  <div
    ref="cardRef"
    class="gift-card relative w-full select-none cursor-pointer
           rounded-2xl p-3 grid place-items-center gap-1
           bg-white/5 dark:bg-white/5 border
           transition-transform duration-200 ease-out
           active:scale-[.98] focus:outline-none focus-visible:ring-2
           backdrop-blur"
    :class="[
      sizeClass,
      tierClass,
      effectClass,
      selected ? 'gift-selected' : 'border-white/10',
      disabled ? 'opacity-60 pointer-events-none' : ''
    ]"
    :style="rippleStyle"
    role="button"
    :tabindex="disabled ? -1 : 0"
    :aria-pressed="selected ? 'true' : 'false'"
    :aria-disabled="disabled ? 'true' : 'false'"
    :aria-label="ariaLabel"
    :data-animation="animation"
    :data-tier="tier?.toLowerCase() || ''"
    @click="onActivate"
    @keydown.enter.prevent="onActivate"
    @keydown.space.prevent="onActivate"
    @pointerdown="onPressStart"
    @pointerup="onPressEnd"
    @pointercancel="onPressCancel"
    @mouseleave="onPressCancel"
  >
    <!-- Background video (auto-paused when offscreen) -->
    <video
      v-if="video"
      ref="vidRef"
      :src="video"
      autoplay
      muted
      loop
      playsinline
      class="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none rounded-2xl"
    />

    <!-- Icon + skeleton -->
    <div class="relative z-10 w-16 h-16 rounded-2xl overflow-hidden shadow-md border border-white/10 bg-white/5">
      <img
        :src="src"
        :alt="name"
        loading="lazy"
        decoding="async"
        @load="imgLoaded = true"
        @error="imgError = true"
        class="w-full h-full object-contain p-1 will-change-transform"
      />
      <!-- skeleton shimmer -->
      <div
        v-if="!imgLoaded && !imgError"
        class="absolute inset-0 animate-[shimmer_1.2s_infinite] bg-gradient-to-r
               from-transparent via-white/15 to-transparent"
      />
      <!-- fallback emoji on error -->
      <div
        v-if="imgError"
        class="absolute inset-0 grid place-items-center text-2xl"
      >🎁</div>

      <!-- corner badge (e.g., NEW / x2) -->
      <span
        v-if="badge"
        class="absolute -top-1.5 -right-1.5 text-[10px] px-1.5 py-0.5 rounded-full
               bg-pink-600 text-white shadow"
      >{{ badge }}</span>
    </div>

    <!-- Name -->
    <span class="gift-name z-10 text-[13px] font-semibold text-white/95 max-w-[80%] text-center truncate">
      {{ name }}
    </span>

    <!-- Coins -->
    <div class="gift-coins z-10 flex items-center gap-1 text-[12px] font-bold text-amber-300">
      <img :src="coinIcon" alt="" class="w-3.5 h-3.5" />
      <span>{{ formattedCoins }}</span>
      <span class="sr-only">coins</span>
    </div>

    <!-- Ripple -->
    <span class="ripple pointer-events-none" aria-hidden="true"></span>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  src: { type: String, required: true },
  name: { type: String, required: true },
  coins: { type: Number, required: true },
  tier: { type: String, default: '' },            // lite | rare | epic | legendary | mythic | supreme
  video: { type: String, default: '' },
  effectClass: { type: String, default: '' },     // extra visual class from parent
  animation: { type: String, default: '' },
  selected: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  badge: { type: String, default: '' },
  size: { type: String, default: 'md' },          // sm | md | lg
  coinIcon: { type: String, default: '/icons/smartbiz-coin.png' }
})

const emit = defineEmits(['click', 'longpress'])

/* Refs */
const cardRef = ref(null)
const vidRef = ref(null)
const imgLoaded = ref(false)
const imgError = ref(false)

/* Formatting */
const formattedCoins = computed(() => {
  const v = Number(props.coins || 0)
  if (v < 1000) return String(v)
  if (v < 1_000_000) return (v / 1_000).toFixed(v % 1000 === 0 ? 0 : 1) + 'K'
  return (v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1) + 'M'
})

/* Size */
const sizeClass = computed(() => ({
  sm: 'p-2 gap-1',
  md: 'p-3 gap-1',
  lg: 'p-4 gap-1.5'
}[props.size] || 'p-3 gap-1'))

/* Tier styling */
const tierClass = computed(() => {
  switch ((props.tier || '').toLowerCase()) {
    case 'rare':
      return 'ring-1 ring-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,.28)]'
    case 'epic':
      return 'ring-1 ring-pink-500/50 shadow-[0_0_14px_rgba(236,72,153,.30)]'
    case 'legendary':
      return 'ring-1 ring-amber-400/60 shadow-[0_0_16px_rgba(251,191,36,.35)]'
    case 'mythic':
      return 'ring-1 ring-cyan-400/60 shadow-[0_0_18px_rgba(34,211,238,.35)]'
    case 'supreme':
      return 'ring-1 ring-red-500/60 shadow-[0_0_20px_rgba(239,68,68,.35)]'
    default:
      return ''
  }
})

/* ARIA label */
const ariaLabel = computed(() =>
  `${props.name}, ${formattedCoins.value} coins${props.selected ? ', selected' : ''}`
)

/* Activate (tap / enter / space) */
function onActivate(e) {
  if (props.disabled) return
  buzz(8)
  spawnRipple(e)
  emit('click')
}

/* Long press */
const longMs = 420
let pressTimer = null
function onPressStart(e){
  if (props.disabled) return
  spawnRipple(e)
  clearTimeout(pressTimer)
  pressTimer = setTimeout(() => {
    buzz(16)
    emit('longpress')
  }, longMs)
}
function onPressEnd(){ clearTimeout(pressTimer) }
function onPressCancel(){ clearTimeout(pressTimer) }

/* Ripple (CSS vars) */
const rippleStyle = ref({})
function spawnRipple(e){
  const el = cardRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = (e?.clientX ?? rect.left + rect.width/2) - rect.left
  const y = (e?.clientY ?? rect.top + rect.height/2) - rect.top
  rippleStyle.value = { '--rx': `${x}px`, '--ry': `${y}px` }
  // retrigger animation by toggling data attr
  el.dataset.r = el.dataset.r === '1' ? '0' : '1'
}

/* Haptics */
function buzz(ms=10){ try{ navigator?.vibrate?.(ms) }catch{} }

/* Pause bg video when offscreen */
let io
onMounted(() => {
  if (vidRef.value && 'IntersectionObserver' in window){
    io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        const v = vidRef.value
        if (!v) return
        if (en.isIntersecting) { v.play?.() } else { v.pause?.() }
      })
    }, { threshold: 0.2 })
    io.observe(cardRef.value)
  }
})
onBeforeUnmount(() => io?.disconnect?.())
</script>

<style scoped>
/* Ripple */
.gift-card { position: relative; overflow: hidden }
.gift-card .ripple::after{
  content:"";
  position:absolute;
  left:var(--rx,50%); top:var(--ry,50%);
  width:12px; height:12px; border-radius:9999px;
  transform: translate(-50%,-50%) scale(0);
  background: rgba(255,255,255,.35);
  pointer-events:none;
}
.gift-card[data-r="1"] .ripple::after,
.gift-card[data-r="0"] .ripple::after{
  animation: rip .6s ease-out forwards;
}
@keyframes rip { to { transform: translate(-50%,-50%) scale(18); opacity:0 } }

/* Selected pulse */
.gift-selected{
  animation: sel 1.2s ease-in-out infinite;
}
@keyframes sel{
  0%,100%{ box-shadow: 0 0 0 0 rgba(255,255,255,.18) }
  50%    { box-shadow: 0 0 0 8px rgba(255,255,255,.04) }
}

/* Skeleton shimmer */
@keyframes shimmer{
  0%{ transform: translateX(-100%) }
  100%{ transform: translateX(100%) }
}

/* Motion-safe */
@media (prefers-reduced-motion: reduce){
  .gift-selected{ animation: none }
  .ripple::after{ animation: none !important }
}
</style>
