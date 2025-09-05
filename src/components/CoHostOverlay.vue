<template>
  <section
    class="fixed inset-0 z-10 overflow-hidden select-none bg-black"
    role="region"
    aria-label="Live stage"
  >
    <!-- GRID / FULL LAYER -->
    <div
      v-if="resolvedLayout !== 'pip'"
      class="absolute inset-0 grid"
      :class="gridClass"
    >
      <!-- Main Host -->
      <div class="relative">
        <video
          ref="mainHostVideo"
          class="w-full h-full object-cover"
          :class="[{ 'scale-x-[-1]': mirrorMain }]"
          autoplay
          playsinline
          :muted="muted"
          disablepictureinpicture
          controlslist="nodownload noplaybackrate nofullscreen"
        />
        <div class="overlay-top" />
        <div class="overlay-bottom" />
        <div class="badge">
          <span class="dot" />
          <span class="name">{{ mainName }}</span>
          <span v-if="mainLabel" class="role">{{ mainLabel }}</span>
        </div>

        <!-- Poster / empty state -->
        <div v-if="!hasMain" class="empty">
          <img v-if="mainPoster" :src="mainPoster" alt="" class="poster" />
          <div v-else class="skeleton" />
          <p class="empty-text">Waiting for main host…</p>
        </div>
      </div>

      <!-- Co-Host -->
      <div class="relative">
        <video
          ref="coHostVideo"
          class="w-full h-full object-cover"
          :class="[{ 'scale-x-[-1]': mirrorCo }]"
          autoplay
          playsinline
          :muted="muted"
          disablepictureinpicture
          controlslist="nodownload noplaybackrate nofullscreen"
        />
        <div class="overlay-top" />
        <div class="overlay-bottom" />
        <div class="badge">
          <span class="dot" />
          <span class="name">{{ coName }}</span>
          <span v-if="coLabel" class="role">{{ coLabel }}</span>
        </div>

        <div v-if="!hasCo" class="empty">
          <img v-if="coPoster" :src="coPoster" alt="" class="poster" />
          <div v-else class="skeleton" />
          <p class="empty-text">Waiting for co-host…</p>
        </div>
      </div>
    </div>

    <!-- PICTURE-IN-PICTURE MODE -->
    <div v-else class="absolute inset-0">
      <!-- Full video (main) -->
      <div class="absolute inset-0">
        <video
          ref="mainHostVideo"
          class="w-full h-full object-cover"
          :class="[{ 'scale-x-[-1]': mirrorMain }]"
          autoplay
          playsinline
          :muted="muted"
          disablepictureinpicture
          controlslist="nodownload noplaybackrate nofullscreen"
        />
        <div class="overlay-top" />
        <div class="overlay-bottom" />
        <div class="badge">
          <span class="dot" />
          <span class="name">{{ mainName }}</span>
          <span v-if="mainLabel" class="role">{{ mainLabel }}</span>
        </div>
        <div v-if="!hasMain" class="empty">
          <img v-if="mainPoster" :src="mainPoster" alt="" class="poster" />
          <div v-else class="skeleton" />
          <p class="empty-text">Waiting for main host…</p>
        </div>
      </div>

      <!-- Small draggable PiP for co-host -->
      <div
        class="pip"
        :style="pipStyle"
        @pointerdown="startDrag"
        role="button"
        aria-label="Drag co-host window"
      >
        <video
          ref="coHostVideo"
          class="w-full h-full object-cover rounded-xl"
          :class="[{ 'scale-x-[-1]': mirrorCo }]"
          autoplay
          playsinline
          :muted="muted"
          disablepictureinpicture
          controlslist="nodownload noplaybackrate nofullscreen"
        />
        <div class="pip-badge">
          <span class="dot" />
          <span class="name">{{ coName }}</span>
        </div>

        <div v-if="!hasCo" class="pip-empty">
          <div class="pip-skeleton" />
        </div>
      </div>
    </div>

    <!-- TAP TOGGLE UI HINT (optional) -->
    <button
      class="hint-btn"
      @click="cycleLayout"
      aria-label="Change layout"
      title="Change layout"
    >
      Layout: {{ resolvedLayout.toUpperCase() }}
    </button>
  </section>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'

/** PROPS */
const props = defineProps({
  isActive: { type: Boolean, default: true },
  /** MediaStream objects from WebRTC/RTMP bridge */
  mainStream: { type: Object, default: null },
  coStream: { type: Object, default: null },
  /** 'auto' | 'vertical' | 'horizontal' | 'pip' */
  layout: { type: String, default: 'auto' },
  /** Picture-in-picture size (fraction of smaller screen side) */
  pipSize: { type: Number, default: 0.28 },
  /** Mirror flags (useful for local/front camera) */
  mirrorMain: { type: Boolean, default: false },
  mirrorCo: { type: Boolean, default: false },
  /** Names/labels/posters */
  mainName: { type: String, default: 'Host' },
  coName: { type: String, default: 'Co-Host' },
  mainLabel: { type: String, default: '' },
  coLabel: { type: String, default: '' },
  mainPoster: { type: String, default: '' },
  coPoster: { type: String, default: '' },
  /** Mute for preview layer (usually true; route real audio to mixer) */
  muted: { type: Boolean, default: true },
})

/** REFS */
const mainHostVideo = ref(null)
const coHostVideo = ref(null)

/** STREAM ATTACH */
const attach = (el, stream) => {
  if (!el) return
  try {
    if (el.srcObject !== stream) el.srcObject = stream || null
    // attempt play when active
    if (props.isActive && stream) el.play().catch(() => {})
    else el.pause?.()
  } catch {}
}
watch(() => props.mainStream, s => attach(mainHostVideo.value, s), { immediate: true })
watch(() => props.coStream, s => attach(coHostVideo.value, s), { immediate: true })
watch(() => props.isActive, (active) => {
  if (!mainHostVideo.value || !coHostVideo.value) return
  if (active) {
    mainHostVideo.value.play?.()
    coHostVideo.value.play?.()
  } else {
    mainHostVideo.value.pause?.()
    coHostVideo.value.pause?.()
  }
})

/** LAYOUT: mobile-first (portrait => vertical) */
const vw = ref(window.innerWidth)
const vh = ref(window.innerHeight)
const isPortrait = computed(() => vh.value >= vw.value)

function onResize() {
  vw.value = window.innerWidth
  vh.value = window.innerHeight
}
onMounted(() => window.addEventListener('resize', onResize, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

const resolvedLayout = computed(() => {
  if (props.layout !== 'auto') return props.layout
  // Portrait: vertical; Landscape: horizontal
  return isPortrait.value ? 'vertical' : 'horizontal'
})
const gridClass = computed(() => {
  if (resolvedLayout.value === 'horizontal') return 'grid-cols-2 grid-rows-1'
  // vertical
  return 'grid-cols-1 grid-rows-2'
})

/** STATE: has streams? */
const hasMain = computed(() => !!props.mainStream)
const hasCo = computed(() => !!props.coStream)

/** PIP drag + size */
const pipPos = ref({ x: 0.04, y: 0.08 }) // % of screen (0..1)
const dragging = ref(false)
let dragStart = null

const pipShortSide = computed(() => Math.min(vw.value, vh.value))
const pipPx = computed(() => Math.round(pipShortSide.value * props.pipSize))
const pipStyle = computed(() => ({
  width: `${pipPx.value}px`,
  height: `${Math.round(pipPx.value * 16 / 9)}px`,
  left: `calc(${(vw.value - pipPx.value - 12) * pipPos.value.x}px)`,
  top: `calc(${(vh.value - Math.round(pipPx.value * 16/9) - 12) * pipPos.value.y}px)`,
}))

function startDrag(e) {
  dragging.value = true
  const rect = e.currentTarget.getBoundingClientRect()
  dragStart = {
    pointerX: e.clientX ?? e.touches?.[0]?.clientX,
    pointerY: e.clientY ?? e.touches?.[0]?.clientY,
    left: rect.left,
    top: rect.top,
    w: rect.width,
    h: rect.height,
  }
  window.addEventListener('pointermove', onDrag)
  window.addEventListener('pointerup', endDrag)
}
function onDrag(e) {
  if (!dragging.value || !dragStart) return
  const x = e.clientX
  const y = e.clientY
  const dx = x - dragStart.pointerX
  const dy = y - dragStart.pointerY
  const newLeft = dragStart.left + dx
  const newTop = dragStart.top + dy
  const maxLeft = vw.value - dragStart.w - 8
  const maxTop = vh.value - dragStart.h - 8
  const clampedLeft = Math.max(8, Math.min(maxLeft, newLeft))
  const clampedTop = Math.max(8, Math.min(maxTop, newTop))
  pipPos.value = {
    x: clampedLeft / (vw.value - dragStart.w - 8),
    y: clampedTop / (vh.value - dragStart.h - 8),
  }
}
function endDrag() {
  dragging.value = false
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup', endDrag)
}

/** QUICK CONTROL: cycle layouts */
const order = ['auto', 'vertical', 'horizontal', 'pip']
function cycleLayout() {
  const idx = order.indexOf(props.layout)
  if (idx === -1 || props.layout === 'auto') {
    // if auto, flip between vertical/horizontal/pip by orientation
    const next = isPortrait.value ? 'horizontal' : 'vertical'
    emit('update:layout', next)
  } else {
    const next = order[(idx + 1) % order.length]
    emit('update:layout', next)
  }
}

const emit = defineEmits(['update:layout'])
</script>

<style scoped>
/* Top/bottom soft overlays for legibility */
.overlay-top,
.overlay-bottom {
  position: absolute; left: 0; right: 0; pointer-events: none;
  z-index: 1;
}
.overlay-top { top: 0; height: 96px; background: linear-gradient(180deg, rgba(0,0,0,.45), rgba(0,0,0,0)); }
.overlay-bottom { bottom: 0; height: 120px; background: linear-gradient(0deg, rgba(0,0,0,.45), rgba(0,0,0,0)); }

/* Name badge */
.badge {
  position: absolute; left: 12px;
  bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  z-index: 2;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 10px;
  background: rgba(17,24,39,.6); /* slate-900 */
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 9999px;
  color: #fff; font-size: .85rem; font-weight: 600;
  backdrop-filter: blur(8px);
}
.badge .dot {
  width: 8px; height: 8px; border-radius: 9999px; background: #22c55e; /* green */
  box-shadow: 0 0 0 2px rgba(34,197,94,.25);
}
.badge .name { white-space: nowrap; }
.badge .role {
  margin-left: 4px; font-size: .72rem; opacity: .85; font-weight: 500;
}

/* Empty state */
.empty, .pip-empty {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  z-index: 1;
}
.poster { width: 38%; max-width: 180px; opacity: .9; border-radius: 12px; }
.skeleton {
  width: 38%; max-width: 180px; aspect-ratio: 1 / 1;
  border-radius: 12px;
  background: linear-gradient(90deg, #111827 0%, #1f2937 50%, #111827 100%);
  animation: sk 1.4s infinite;
}
@keyframes sk {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}
.empty-text {
  position: absolute; bottom: 12px; left: 12px; right: 12px;
  color: #e5e7eb; font-size: .85rem; text-align: left; opacity: .9;
}

/* PiP window */
.pip {
  position: absolute; right: 12px; top: calc(12px + env(safe-area-inset-top, 0px));
  z-index: 5; border-radius: 12px; overflow: hidden;
  box-shadow: 0 12px 40px rgba(0,0,0,.45);
  touch-action: none; /* enables pointer drag */
  background: #000;
}
.pip-badge {
  position: absolute; left: 8px; bottom: 8px; z-index: 2;
  display: inline-flex; align-items: center; gap: 6px;
  font-size: .75rem; color: #fff;
  padding: 4px 8px; border-radius: 9999px;
  background: rgba(17,24,39,.6);
  border: 1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(6px);
}
.pip-badge .dot {
  width: 6px; height: 6px; border-radius: 9999px; background: #22c55e;
}
.pip-empty .pip-skeleton {
  width: 70%; max-width: 140px; aspect-ratio: 16 / 9; border-radius: 10px;
  background: linear-gradient(90deg, #111827 0%, #1f2937 50%, #111827 100%);
  animation: sk 1.4s infinite;
}

/* Layout hint button */
.hint-btn {
  position: absolute; right: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  z-index: 6;
  padding: 8px 12px; font-size: .75rem; font-weight: 700;
  color: #fff; background: rgba(17,24,39,.6);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 9999px; backdrop-filter: blur(8px);
}
.hint-btn:hover { background: rgba(17,24,39,.75); }
</style>
