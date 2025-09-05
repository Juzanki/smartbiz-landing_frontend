<template>
  <section class="stage fixed inset-0 z-10 bg-black overflow-hidden">
    <div
      class="grid-container grid w-full h-full"
      :class="gridClass"
      :style="{ gap: gapCss }"
      role="region"
      aria-label="Live video stage"
    >
      <!-- Main Host -->
      <div class="cell relative">
        <video
          ref="mainHostVideo"
          class="video"
          :class="[{ mirror: mirrorMain }]"
          autoplay
          playsinline
          :muted="muted"
          disablepictureinpicture
          controlslist="nodownload noplaybackrate nofullscreen"
        />
        <div v-if="!hasMain" class="empty">
          <div class="pulse" />
          <p class="empty-text">Waiting for main host…</p>
        </div>
      </div>

      <!-- Co-Host -->
      <div v-if="showCoSlot" class="cell relative">
        <video
          ref="coHostVideo"
          class="video"
          :class="[{ mirror: mirrorCo }]"
          autoplay
          playsinline
          :muted="muted"
          disablepictureinpicture
          controlslist="nodownload noplaybackrate nofullscreen"
        />
        <div v-if="!hasCo" class="empty">
          <div class="pulse" />
          <p class="empty-text">Waiting for co-host…</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  /** Control */
  isActive: { type: Boolean, default: true },
  layout: { type: String, default: 'auto' }, // 'auto' | 'vertical' | 'horizontal'
  alwaysTwo: { type: Boolean, default: true }, // keep second slot even if no stream
  gap: { type: Number, default: 8 },          // px gap between videos
  muted: { type: Boolean, default: true },

  /** Streams */
  mainStream: { type: Object, default: null },
  coStream: { type: Object, default: null },

  /** Visuals */
  mirrorMain: { type: Boolean, default: false },
  mirrorCo: { type: Boolean, default: false },
})

const mainHostVideo = ref(null)
const coHostVideo   = ref(null)

/* Attach Streams */
function attach(el, stream) {
  if (!el) return
  try {
    if (el.srcObject !== stream) el.srcObject = stream || null
    if (stream && props.isActive) el.play?.().catch(() => {})
  } catch {}
}
watch(() => props.mainStream, s => attach(mainHostVideo.value, s), { immediate: true })
watch(() => props.coStream,  s => attach(coHostVideo.value,   s), { immediate: true })
watch(() => props.isActive, active => {
  for (const el of [mainHostVideo.value, coHostVideo.value]) {
    if (!el) continue
    active ? el.play?.().catch(() => {}) : el.pause?.()
  }
})

/* Orientation-aware layout */
const vw = ref(window.innerWidth)
const vh = ref(window.innerHeight)
const isPortrait = computed(() => vh.value >= vw.value)
function onResize() { vw.value = window.innerWidth; vh.value = window.innerHeight }
onMounted(() => window.addEventListener('resize', onResize, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

const resolvedLayout = computed(() => {
  if (props.layout !== 'auto') return props.layout
  return isPortrait.value ? 'vertical' : 'horizontal'
})

/* Presence / Slots */
const hasMain = computed(() => !!props.mainStream)
const hasCo   = computed(() => !!props.coStream)
const showCoSlot = computed(() => props.alwaysTwo || hasCo.value)

/* Classes / Styles */
const gridClass = computed(() =>
  resolvedLayout.value === 'horizontal'
    ? 'grid-cols-2 grid-rows-1'
    : 'grid-cols-1 grid-rows-2'
)
const gapCss = computed(() => `${props.gap}px`)
</script>

<style scoped>
/* Video cells */
.cell { width: 100%; height: 100%; }
.video {
  width: 100%; height: 100%;
  object-fit: cover; object-position: center;
  background: #000;
}
.mirror { transform: scaleX(-1); }

/* Empty state */
.empty {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  pointer-events: none;
}
.pulse {
  width: 40%; max-width: 220px; aspect-ratio: 16 / 9; border-radius: 12px;
  background: linear-gradient(90deg, #0b1220 0%, #1b2540 50%, #0b1220 100%);
  animation: sk 1.2s infinite;
  box-shadow: 0 10px 30px rgba(0,0,0,.35);
}
.empty-text {
  position: absolute; bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  left: 12px; right: 12px;
  color: #d1d5db; font-size: .85rem; text-shadow: 0 1px 2px #000;
}
@keyframes sk {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}

/* Stage wrapper (safe-area awareness) */
.stage { padding-bottom: env(safe-area-inset-bottom, 0px); }
</style>
