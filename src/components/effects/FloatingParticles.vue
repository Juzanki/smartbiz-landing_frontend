<!-- src/components/effects/FloatingParticles.vue -->
<template>
  <!-- Overlay layer; change `absolute inset-0` to fit your layout -->
  <div
    class="absolute inset-0 pointer-events-none select-none"
    :style="{ opacity }"
    ref="wrapEl"
  >
    <canvas ref="canvasEl"></canvas>
  </div>
</template>

<script setup>
/**
 * FloatingParticles.vue
 * - Mobile-first canvas particles: light, responsive, and battery-friendly.
 * - Uses devicePixelRatio scaling for crisp lines on HiDPI screens.
 * - Auto-adapts density to area; supports touch/hover repel.
 * - Pauses when page is hidden to save power.
 */

import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'

/* =======================
   Props (tweak as needed)
   ======================= */
const props = defineProps({
  // Visuals
  color: { type: String, default: 'rgba(255,255,255,0.8)' },
  linkColor: { type: String, default: 'rgba(255,255,255,0.25)' },
  opacity: { type: Number, default: 1 },

  // Performance & motion
  density: { type: Number, default: 0.00008 }, // particles per px^2 (auto-scaled)
  maxCount: { type: Number, default: 120 },    // hard cap for very large screens
  speed: { type: Number, default: 0.25 },      // base speed in px/frame
  reduceMotion: { type: Boolean, default: false }, // override (true disables motion)

  // Interactions
  repelRadius: { type: Number, default: 80 },  // touch/hover repel radius (CSS px)
  linkDistance: { type: Number, default: 100 },// max distance to draw link lines
  linkWidth: { type: Number, default: 1 },

  // Sizes
  sizeMin: { type: Number, default: 1 },
  sizeMax: { type: Number, default: 2.4 },

  // Bounds behavior: "wrap" | "bounce"
  edgeMode: { type: String, default: 'wrap' },
})

/* =======================
   Refs and state
   ======================= */
const canvasEl = ref(null)
const wrapEl = ref(null)
let ctx = /** @type {CanvasRenderingContext2D|null} */(null)
let rafId = 0
let particles = []
let width = 0
let height = 0
let dpr = 1
let running = true
const pointer = { x: null, y: null, active: false }

/* =======================
   Utilities
   ======================= */
const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const motionDisabled = computed(() => props.reduceMotion || prefersReducedMotion)

function rand(min, max) {
  return Math.random() * (max - min) + min
}
function clamp(v, min, max) { return v < min ? min : v > max ? max : v }

/* =======================
   Setup & resize
   ======================= */
function resize() {
  if (!canvasEl.value || !wrapEl.value) return
  const rect = wrapEl.value.getBoundingClientRect()
  width = Math.max(1, Math.floor(rect.width))
  height = Math.max(1, Math.floor(rect.height))
  dpr = clamp(window.devicePixelRatio || 1, 1, 2) // cap DPR at 2 for perf

  canvasEl.value.width = Math.floor(width * dpr)
  canvasEl.value.height = Math.floor(height * dpr)
  canvasEl.value.style.width = width + 'px'
  canvasEl.value.style.height = height + 'px'

  ctx = canvasEl.value.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // Rebuild particles based on area
  buildParticles()
}

function buildParticles() {
  const area = width * height
  // Lower density on tiny devices automatically
  const density = area < 360 * 640 ? props.density * 0.7 : props.density
  const targetCount = motionDisabled.value ? 0 : Math.min(Math.round(area * density), props.maxCount)

  // Keep existing particles if already built; add/remove smoothly
  if (particles.length > targetCount) {
    particles.length = targetCount
    return
  }
  while (particles.length < targetCount) {
    particles.push(makeParticle())
  }
}

function makeParticle() {
  const angle = Math.random() * Math.PI * 2
  const speed = rand(props.speed * 0.5, props.speed * 1.5)
  return {
    x: rand(0, width),
    y: rand(0, height),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: rand(props.sizeMin, props.sizeMax),
    life: rand(0, 1), // phase for subtle opacity modulation
  }
}

/* =======================
   Interactions
   ======================= */
function onPointerMove(e) {
  const t = e.touches?.[0] ?? e
  const rect = wrapEl.value.getBoundingClientRect()
  pointer.x = t.clientX - rect.left
  pointer.y = t.clientY - rect.top
  pointer.active = true
}
function onPointerLeave() {
  pointer.active = false
  pointer.x = pointer.y = null
}

/* =======================
   Animation loop
   ======================= */
function step() {
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)

  // Move + draw particles
  const repR2 = props.repelRadius * props.repelRadius

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]

    // Interact (repel) on hover/touch
    if (pointer.active && pointer.x != null) {
      const dx = p.x - pointer.x
      const dy = p.y - pointer.y
      const dist2 = dx * dx + dy * dy
      if (dist2 < repR2) {
        const dist = Math.sqrt(dist2) || 1
        const force = (props.repelRadius - dist) / props.repelRadius
        p.vx += (dx / dist) * force * 0.6
        p.vy += (dy / dist) * force * 0.6
      }
    }

    // Integrate
    p.x += motionDisabled.value ? 0 : p.vx
    p.y += motionDisabled.value ? 0 : p.vy
    p.life += 0.005

    // Edges
    if (props.edgeMode === 'bounce') {
      if (p.x < 0 || p.x > width) p.vx *= -1
      if (p.y < 0 || p.y > height) p.vy *= -1
      p.x = clamp(p.x, 0, width)
      p.y = clamp(p.y, 0, height)
    } else {
      // wrap
      if (p.x < -10) p.x = width + 10
      if (p.x > width + 10) p.x = -10
      if (p.y < -10) p.y = height + 10
      if (p.y > height + 10) p.y = -10
    }

    // Draw particle
    const a = 0.5 + 0.5 * Math.sin(p.life * 2 * Math.PI) // subtle twinkle
    ctx.beginPath()
    ctx.fillStyle = props.color
    ctx.globalAlpha = a
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Link lines (draw after particles)
  if (!motionDisabled.value && props.linkDistance > 0 && particles.length <= 180) {
    ctx.lineWidth = props.linkWidth
    ctx.strokeStyle = props.linkColor
    ctx.globalAlpha = 1
    const maxD2 = props.linkDistance * props.linkDistance
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i]
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const d2 = dx * dx + dy * dy
        if (d2 < maxD2) {
          const t = 1 - d2 / maxD2 // fade line by distance
          ctx.globalAlpha = t * 0.6
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }
    }
  }

  rafId = requestAnimationFrame(step)
}

/* =======================
   Lifecycle
   ======================= */
function start() {
  if (rafId) cancelAnimationFrame(rafId)
  running = true
  rafId = requestAnimationFrame(step)
}
function stop() {
  running = false
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
}

function onVisibilityChange() {
  if (document.hidden) stop()
  else if (!running) start()
}

onMounted(() => {
  resize()
  start()

  // Events
  window.addEventListener('resize', resize, { passive: true })
  document.addEventListener('visibilitychange', onVisibilityChange)
  // Enable pointer interaction; keep canvas pointer-events: none so UI remains clickable
  // We listen on wrapper (which also has pointer-events: none), so add capturing on window:
  window.addEventListener('mousemove', onPointerMove, { passive: true })
  window.addEventListener('touchmove', onPointerMove, { passive: true })
  window.addEventListener('mouseleave', onPointerLeave, { passive: true })
  window.addEventListener('touchend', onPointerLeave, { passive: true })
})

onBeforeUnmount(() => {
  stop()
  window.removeEventListener('resize', resize)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('mousemove', onPointerMove)
  window.removeEventListener('touchmove', onPointerMove)
  window.removeEventListener('mouseleave', onPointerLeave)
  window.removeEventListener('touchend', onPointerLeave)
})

/* Rebuild if these change meaningfully */
watch(
  () => [
    props.density, props.maxCount, props.speed, props.sizeMin, props.sizeMax,
    props.edgeMode, props.reduceMotion, props.linkDistance
  ],
  () => {
    resize()
  }
)
</script>

<style scoped>
/* Canvas fills the wrapper; wrapper is positioned by parent (absolute inset-0 by default) */
canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
