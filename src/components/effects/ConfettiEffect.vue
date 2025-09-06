<template>
  <!-- aria-hidden so it won't distract screen readers -->
  <canvas
    ref="cv"
    class="w-100 h-100"
    style="pointer-events:none; display:block;"
    aria-hidden="true"
  />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, defineProps, defineEmits, defineExpose } from 'vue'

/* ========================== Props & Emits ========================== */
const props = defineProps({
  autoStart: { type: Boolean, default: true },
  duration:  { type: Number,  default: 0 },        // ms (0 = endless)
  particleCount: { type: Number, default: 120 },
  colors: { type: Array, default: () => [] },      // e.g. ['#ff3b3b','#ffe047','#4ade80']
  shapes: { type: Array, default: () => ['circle', 'square', 'triangle'] },
  sizeMin: { type: Number, default: 2 },
  sizeMax: { type: Number, default: 6 },
  speedMin: { type: Number, default: 80 },         // px/sec
  speedMax: { type: Number, default: 260 },        // px/sec
  gravity:  { type: Number, default: 900 },        // px/sec^2
  wind:     { type: Number, default: 0 },          // px/sec^2 to the right (negative = left)
  spinMin:  { type: Number, default: -360 },       // deg/sec
  spinMax:  { type: Number, default: 360 },        // deg/sec
  fadeOut:  { type: Boolean, default: true },
  burstOnClick: { type: Boolean, default: false },
})

const emit = defineEmits(['start', 'stop', 'complete', 'burst'])

/* ========================== Canvas & State ========================= */
const cv = ref(null)
let ctx = null
let running = false
let raf = 0
let lastTime = 0
let cssW = 0, cssH = 0   // CSS pixel size
let DPR = 1

/** @type {Array<{x:number,y:number,vx:number,vy:number,ax:number,ay:number,r:number,shape:string,color:string,rot:number,spin:number,life:number,ttl:number}>} */
let parts = []

/* ========================== Utilities ============================= */
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[(Math.random() * arr.length) | 0]
const toRad = (deg) => (deg * Math.PI) / 180

function randColor() {
  if (props.colors?.length) return pick(props.colors)
  const h = (Math.random() * 360) | 0
  return `hsl(${h}deg 90% 60%)`
}

/* ========================== Sizing / DPR ========================== */
function resize() {
  const c = cv.value
  if (!c) return
  DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2)) // cap DPR for perf
  cssW = c.clientWidth
  cssH = c.clientHeight
  c.width = Math.floor(cssW * DPR)
  c.height = Math.floor(cssH * DPR)
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0) // Draw in CSS pixels
}

/* ========================== Particles ============================ */
function makeParticle(x = Math.random() * cssW, y = -rnd(10, cssH * 0.5)) {
  const speed = rnd(props.speedMin, props.speedMax)
  const angle = rnd(-70, -110) // up-ish
  const vx = Math.cos(toRad(angle)) * speed
  const vy = Math.sin(toRad(angle)) * speed
  return {
    x, y,
    vx, vy,
    ax: props.wind,
    ay: 0,
    r: rnd(props.sizeMin, props.sizeMax),
    shape: pick(props.shapes),
    color: randColor(),
    rot: rnd(0, 360),
    spin: rnd(props.spinMin, props.spinMax),
    life: 0,
    ttl: rnd(2.5, 4.5) // seconds on screen (used for fade)
  }
}

function spawn(count = props.particleCount) {
  for (let i = 0; i < count; i++) parts.push(makeParticle())
}

function burst({ x = cssW / 2, y = cssH / 2, count = Math.max(24, props.particleCount / 3), spread = 75 } = {}) {
  for (let i = 0; i < count; i++) {
    const p = makeParticle(x, y)
    const a = toRad(rnd(-spread, spread))
    const s = rnd(props.speedMin * 0.8, props.speedMax * 1.2)
    p.vx = Math.cos(a) * s
    p.vy = Math.sin(a) * s
    p.y += rnd(-6, 6)
    parts.push(p)
  }
  emit('burst', { x, y, count })
}

/* ========================== Drawing ============================== */
function drawParticle(p) {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(toRad(p.rot))
  ctx.fillStyle = p.color
  switch (p.shape) {
    case 'square': {
      const s = p.r * 2
      ctx.fillRect(-s / 2, -s / 2, s, s)
      break
    }
    case 'triangle': {
      const s = p.r * 2.2
      ctx.beginPath()
      ctx.moveTo(0, -s / 2)
      ctx.lineTo(-s / 2, s / 2)
      ctx.lineTo(s / 2, s / 2)
      ctx.closePath()
      ctx.fill()
      break
    }
    default: { // circle
      ctx.beginPath()
      ctx.arc(0, 0, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

/* ========================== Loop ================================= */
function step(ts) {
  if (!running) return
  if (!lastTime) lastTime = ts
  const dt = Math.min(0.04, (ts - lastTime) / 1000) // seconds, clamp for slow tabs
  lastTime = ts

  ctx.clearRect(0, 0, cssW, cssH)

  // Update
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]
    // physics
    p.vx += p.ax * dt
    p.vy += (props.gravity + p.ay) * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.rot += p.spin * dt
    p.life += dt

    // fade out near the end of ttl
    if (props.fadeOut) {
      const left = Math.max(0, p.ttl - p.life)
      const alpha = Math.min(1, left / 0.6) // fade last ~0.6s
      ctx.globalAlpha = Math.max(0.05, Math.min(1, alpha))
    } else {
      ctx.globalAlpha = 1
    }

    drawParticle(p)
    ctx.globalAlpha = 1

    // remove when far out or life expired
    if (p.y > cssH + 40 || p.x < -60 || p.x > cssW + 60 || p.life > p.ttl + 2) {
      parts.splice(i, 1)
    }
  }

  // If duration specified, stop once all particles are gone
  if (_shouldStopAt > 0 && performance.now() >= _shouldStopAt && parts.length === 0) {
    pause()
    emit('complete')
    return
  }

  raf = requestAnimationFrame(step)
}

/* ========================== Controls ============================= */
let _shouldStopAt = 0

function play() {
  if (running) return
  running = true
  lastTime = 0
  if (!parts.length) spawn()
  if (props.duration > 0) _shouldStopAt = performance.now() + props.duration
  emit('start')
  raf = requestAnimationFrame(step)
}

function pause() {
  if (!running) return
  running = false
  cancelAnimationFrame(raf)
  emit('stop')
}

function reset() {
  pause()
  parts = []
  ctx?.clearRect(0, 0, cssW, cssH)
}

/* ========================== Lifecycle ============================ */
function onVisibility() {
  if (document.hidden) pause()
  else if (props.autoStart) play()
}

function onClick(e) {
  // translate click to canvas CSS coords
  const rect = cv.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  burst({ x, y })
}

onMounted(async () => {
  await nextTick()
  ctx = cv.value.getContext('2d', { alpha: true, desynchronized: true })
  resize()
  window.addEventListener('resize', resize, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  if (props.burstOnClick) cv.value.addEventListener('click', onClick, { passive: true })
  if (props.autoStart) play()
})

onBeforeUnmount(() => {
  pause()
  window.removeEventListener('resize', resize)
  document.removeEventListener('visibilitychange', onVisibility)
  if (props.burstOnClick) cv.value.removeEventListener('click', onClick)
})

/* Expose imperative API to parent components */
defineExpose({ play, pause, reset, burst, isRunning: () => running })
</script>

<style scoped>
/* Keep the canvas flush and crisp */
canvas { width: 100%; height: 100%; }
</style>
