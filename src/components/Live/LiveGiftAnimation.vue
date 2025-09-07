<!-- src/components/Live/LiveGiftAnimation.vue -->
<template>
  <div
    class="relative w-full h-full pointer-events-none select-none"
    :aria-label="ariaLabel"
    aria-live="polite"
    role="status"
  >
    <div v-if="showProgress" class="absolute left-0 right-0 top-0 h-1 bg-black/20 overflow-hidden rounded-sm">
      <div class="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500" :style="{ width: progressPct + '%' }"/>
    </div>

    <div class="absolute inset-x-0 bottom-6 top-[10%] flex items-end justify-center" :class="reduced ? '' : 'will-change-transform'">
      <div
        class="absolute -z-10 blur-2xl opacity-60"
        :style="{ width: '44vmin', height: '44vmin', borderRadius: '50%', background: auraGradient, filter:'drop-shadow(0 0 24px rgba(255,255,255,.4))' }"
      />
      <div class="stage relative grid place-items-center text-center" :class="reduced ? '' : 'enter-pop'" @animationend="onEnterAnimEnd">
        <video
          v-if="hasVideo"
          ref="videoEl"
          class="max-h-[48vh] max-w-[88vw] object-contain pointer-events-none drop-shadow-lg"
          :src="gift.video" :muted="true" :playsinline="true" :autoplay="true" :loop="false"
        ></video>

        <img v-else-if="gift.image" :src="gift.image" alt="" class="max-h-[42vh] max-w-[70vw] object-contain drop-shadow-xl" :class="reduced ? '' : 'float-y'" />
        <div v-else class="text-7xl md:text-8xl drop-shadow-xl" :class="reduced ? '' : 'float-y'">{{ gift.icon || '🎁' }}</div>

        <div class="mt-3 px-3 py-1.5 rounded-full text-[12px] md:text-sm font-semibold text-white/95 bg-white/10 border border-white/20 backdrop-blur">
          <span class="opacity-90">{{ gift.name || 'Gift' }}</span>
          <span v-if="comboCount > 1" class="ml-2 text-amber-300">×{{ comboCount }}</span>
          <span v-if="gift.message" class="ml-2 text-sky-300">· {{ gift.message }}</span>
        </div>

        <transition name="combo-pop">
          <div
            v-if="comboCount > 1"
            class="absolute -top-4 right-0 translate-x-6 -translate-y-2 px-2.5 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-pink-600 shadow-lg"
            aria-hidden="true"
          >
            🔥 COMBO {{ comboCount }}
          </div>
        </transition>
      </div>
    </div>

    <div v-if="!reduced && comboCount > 1" class="absolute inset-0 pointer-events-none">
      <span v-for="n in 8" :key="n" class="confetti"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

type Gift = {
  id?: string | number
  name?: string
  icon?: string
  image?: string
  video?: string
  message?: string
  themeColor?: string
  sound?: string
  durationMs?: number
}

const props = defineProps<{
  gift: Gift
  comboCount?: number
  durationMs?: number
  showProgress?: boolean
}>()

const emit = defineEmits<{ (e:'animation-start'):void; (e:'animation-end'):void; }>()

const reduced = typeof window !== 'undefined'
  ? (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  : false

const videoEl = ref<HTMLVideoElement|null>(null)
let endTimer: number | null = null
let progressTimer: number | null = null
const progressPct = ref(0)

const comboCount = computed(() => props.comboCount ?? 1)
const showProgress = computed(() => props.showProgress ?? true)
const hasVideo = computed(() => !!props.gift?.video)

const durationMs = computed(() => {
  if (props.durationMs && props.durationMs > 500) return props.durationMs
  if (props.gift?.durationMs && props.gift.durationMs > 500) return props.gift.durationMs
  return 2500
})

const ariaLabel = computed(() => {
  const base = props.gift?.name || 'Gift'
  return comboCount.value > 1 ? `${base} combo ×${comboCount.value}` : base
})

const mainColor = computed(() => props.gift?.themeColor || '#f472b6')
const auraGradient = computed(() => `radial-gradient(closest-side, ${mainColor.value}66, transparent 60%)`)

const buzz = (ms=20) => { try { navigator?.vibrate?.(ms) } catch {} }

function startProgress(total: number) {
  progressPct.value = 0
  clearTimer(progressTimer)
  const t0 = Date.now()
  progressTimer = window.setInterval(() => {
    const elapsed = Date.now() - t0
    progressPct.value = Math.min(100, (elapsed / total) * 100)
  }, 16)
}
function scheduleEnd(total: number) {
  clearTimer(endTimer)
  endTimer = window.setTimeout(() => emit('animation-end'), total)
}
function clearTimer(t: number | null) { if (t) { clearTimeout(t); clearInterval(t) } }
function onEnterAnimEnd(_: AnimationEvent) {}

onMounted(async () => {
  emit('animation-start')
  if (!reduced) buzz(15)

  if (hasVideo.value && videoEl.value) {
    const v = videoEl.value
    try { await v.play?.() } catch {}
    if (Number.isFinite(v.duration) && v.duration > 0) {
      const total = Math.max(800, Math.round(v.duration * 1000))
      startProgress(total); scheduleEnd(total)
    } else {
      const handler = () => {
        const total = Math.max(800, Math.round(v.duration * 1000))
        startProgress(total); scheduleEnd(total)
        v.removeEventListener('loadedmetadata', handler)
      }
      v.addEventListener('loadedmetadata', handler)
      startProgress(durationMs.value); scheduleEnd(durationMs.value)
    }
  } else {
    startProgress(durationMs.value); scheduleEnd(durationMs.value)
  }
})

onBeforeUnmount(() => { clearTimer(endTimer); clearTimer(progressTimer) })
</script>

<style scoped>
@keyframes popIn { 0% { transform: translateY(8px) scale(.96); opacity: 0 } 100% { transform: translateY(0) scale(1); opacity: 1 } }
.enter-pop { animation: popIn 220ms cubic-bezier(.22,.9,.24,1) both; }

@keyframes floatY { 0% { transform: translateY(0) } 50% { transform: translateY(-8px) } 100% { transform: translateY(0) } }
.float-y { animation: floatY 2.6s ease-in-out infinite; }

.combo-pop-enter-active, .combo-pop-leave-active { transition: transform 120ms ease, opacity 120ms ease }
.combo-pop-enter-from, .combo-pop-leave-to { transform: scale(.9); opacity: 0 }

.confetti{ position:absolute; top:0; left:50%; width:6px; height:10px; background:currentColor; opacity:.9; border-radius:1px; color:#f472b6; animation: confettiFall 900ms ease-out forwards }
.confetti:nth-child(2){ left:35%; color:#fb7185; animation-delay:.05s }
.confetti:nth-child(3){ left:65%; color:#f59e0b; animation-delay:.08s }
.confetti:nth-child(4){ left:20%; color:#34d399; animation-delay:.1s }
.confetti:nth-child(5){ left:80%; color:#60a5fa; animation-delay:.12s }
.confetti:nth-child(6){ left:15%; color:#a78bfa; animation-delay:.14s }
.confetti:nth-child(7){ left:72%; color:#f472b6; animation-delay:.16s }
.confetti:nth-child(8){ left:52%; color:#fb7185; animation-delay:.18s }
@keyframes confettiFall { 0%{ transform: translate(-50%,-10px) rotate(0); opacity:0 } 10%{ opacity:1 } 100%{ transform: translate(-50%,120px) rotate(360deg); opacity:0 } }
.stage { max-width: 92vw; }
</style>
