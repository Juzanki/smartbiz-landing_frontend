<template>
  <div
    class="fw-layer absolute inset-0 z-[2] pointer-events-none overflow-hidden"
    :style="{ paddingBottom: 'env(safe-area-inset-bottom)' }"
  >
    <!-- pooled particles -->
    <div
      v-for="p in pool"
      :key="p.id"
      class="fw-p"
      :class="[p.active ? 'is-on' : '', p.className]"
      :style="p.active ? p.style : baseStyle"
      @animationend="onAnimEnd(p)"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, onBeforeUnmount, defineExpose } from 'vue'

type Shape = 'ring' | 'star' | 'spray' | 'heart'
type Palette = string[] // array of CSS color strings
type Particle = {
  id: number
  active: boolean
  className: string
  style: Record<string, string>
  ttl: number
}

/* ============ Props / Options ============ */
const props = withDefaults(defineProps<{
  /** max particles kept in the pool */
  maxParticles?: number
  /** auto bursts every N ms (0 disables) */
  autoInterval?: number
  /** number of particles per burst (base, shape may scale) */
  particlesPerBurst?: number
  /** default palette */
  palette?: Palette
  /** enable trails glow */
  trails?: boolean
  /** optional sound url */
  sound?: string
}>(), {
  maxParticles: 220,
  autoInterval: 0,
  particlesPerBurst: 36,
  palette: [
    '#fde047','#f97316','#ec4899','#a78bfa','#60a5fa',
    '#22d3ee','#34d399','#a3e635','#ffffff'
  ],
  trails: true,
  sound: ''
})

/* ============ Pool ============ */
let idc = 0
const pool = reactive<Particle[]>(
  Array.from({ length: props.maxParticles }, () => ({
    id: ++idc, active: false, className: '', style: {}, ttl: 0
  }))
)

const baseStyle: Record<string,string> = {
  '--x': '50vw', '--y': '50vh',
  '--tx': '0px', '--ty': '-120px',
  '--size': '3px', '--blur': '1.5px',
  '--c1': '#fff', '--c2': '#fff',
  '--dur': '1200ms', '--delay': '0ms', '--tw': '0'
}

/* ============ Utils ============ */
function vibrate(ms=8){ try{ navigator.vibrate?.(ms) }catch{} }
let lastAudio = 0
function playSound(){
  if (!props.sound) return
  const now = performance.now()
  if (now - lastAudio < 120) return // throttle
  lastAudio = now
  try { const a = new Audio(props.sound); a.volume = 0.35; a.play().catch(()=>{}) } catch {}
}

function take(n = 1){ // grab n inactive particles
  const arr: Particle[] = []
  for (const p of pool){
    if (!p.active){ arr.push(p); if (arr.length === n) break }
  }
  // if not enough, reuse earliest actives (soft fallback)
  if (arr.length < n){
    const extras = pool.filter(p => p.active).slice(0, n - arr.length)
    arr.push(...extras)
  }
  return arr
}

/* random helpers */
const rnd = (a:number, b:number)=> a + Math.random()*(b-a)
const irnd = (a:number, b:number)=> Math.round(rnd(a,b))
const pick = <T,>(arr:T[])=> arr[irnd(0, arr.length-1)]

/* compute end displacement for different shapes */
function vectorForShape(i:number, total:number, shape:Shape, power:number){
  const t = i / total
  const angle = (Math.PI*2) * t
  const spread = power
  switch(shape){
    case 'ring': {
      const r = rnd(80, 120) * spread
      return { x: Math.cos(angle)*r, y: Math.sin(angle)*r }
    }
    case 'star': {
      // five-point star spikes
      const spikes = 5
      const a = Math.round((t*spikes)%1*2) ? 0.45 : 1 // alternate short/long
      const r = (a?120:70) * spread * rnd(0.9,1.1)
      const ang = angle * spikes / 2
      return { x: Math.cos(ang)*r, y: Math.sin(ang)*r }
    }
    case 'heart': {
      // cardioid-ish parametric heart
      const a = angle
      const r = 90*spread * (1 - Math.sin(a)) // simple heart curve
      return { x: r*Math.cos(a), y: -r*Math.sin(a) }
    }
    case 'spray':
    default: {
      const r = rnd(60, 160) * spread
      const jitter = rnd(-0.3, 0.3)
      return { x: Math.cos(angle+jitter)*r, y: Math.sin(angle+jitter)*r }
    }
  }
}

/* create styles for one particle */
function particleStyle(x:number, y:number, endX:number, endY:number, dur:number, delay:number, c1:string, c2:string, size:number, blur:number, twinkle:number){
  return {
    '--x': `${x}px`,
    '--y': `${y}px`,
    '--tx': `${endX}px`,
    '--ty': `${endY}px`,
    '--size': `${size}px`,
    '--blur': `${blur}px`,
    '--c1': c1,
    '--c2': c2,
    '--dur': `${dur}ms`,
    '--delay': `${delay}ms`,
    '--tw': String(twinkle)
  }
}

/* Public API: fire a burst */
function burst(opts: {
  x: number, y: number,
  count?: number,
  power?: number,     // 0.6..1.6
  shape?: Shape,
  colors?: Palette
}){
  const {
    x, y,
    count = props.particlesPerBurst,
    power = 1,
    shape = 'spray',
    colors = props.palette
  } = opts

  const parts = take(count)
  const baseDur = irnd(900, 1500)
  const twinkle = Math.random() < 0.6 ? 1 : 0

  for (let i=0; i<parts.length; i++){
    const p = parts[i]
    const v = vectorForShape(i, parts.length, shape, power)
    const dur = Math.round(baseDur * rnd(0.9, 1.35))
    const delay = Math.round(rnd(0, 180))
    const size = rnd(2, 3.5)
    const blur = rnd(0.8, 2.2)
    const c1 = pick(colors), c2 = pick(colors)

    p.style = particleStyle(x, y, v.x, v.y, dur, delay, c1, c2, size, blur, twinkle)
    p.className = props.trails ? 'fw-grad fw-trail' : 'fw-grad'
    p.active = true
    p.ttl = dur + delay + 40
  }
  vibrate(10)
  playSound()
}

/* Auto mode */
let autoTimer: number | null = null
function startAuto(){
  if (!props.autoInterval) return
  stopAuto()
  autoTimer = window.setInterval(() => {
    const x = rnd(window.innerWidth*0.15, window.innerWidth*0.85)
    const y = rnd(window.innerHeight*0.25, window.innerHeight*0.65)
    const shape = pick<Shape>(['spray','ring','star','heart'])
    const power = rnd(0.85, 1.25)
    burst({ x, y, shape, power })
  }, Math.max(600, props.autoInterval))
}
function stopAuto(){ if (autoTimer){ clearInterval(autoTimer); autoTimer=null } }

/* recycle safety (in case animationend misses) */
let sweepTimer: number | null = null
function startSweeper(){
  stopSweeper()
  sweepTimer = window.setInterval(() => {
    const now = performance.now()
    for (const p of pool){
      if (p.active && p.ttl && (p.ttl < 0)){
        p.active = false
      } else if (p.active) {
        p.ttl -= 250
      }
    }
  }, 250)
}
function stopSweeper(){ if (sweepTimer){ clearInterval(sweepTimer); sweepTimer=null } }

function onAnimEnd(p: Particle){ p.active = false }

/* Expose API */
defineExpose({ burst, startAuto, stopAuto })

/* Mount */
onMounted(() => {
  startAuto()
  startSweeper()
})
onBeforeUnmount(() => {
  stopAuto()
  stopSweeper()
})
</script>

<style scoped>
.fw-layer{
  contain: layout style paint;
  content-visibility: auto;
  transform: translateZ(0);
}

/* Particle */
.fw-p{
  position: absolute;
  left: var(--x); top: var(--y);
  width: var(--size); height: var(--size);
  border-radius: 9999px;
  filter: blur(var(--blur));
  transform: translate3d(-50%, -50%, 0);
  opacity: 0;
  pointer-events: none;
  will-change: transform, opacity, filter;
  backface-visibility: hidden;
}

/* Gradient + glow */
.fw-grad{
  background:
    radial-gradient(circle at 30% 30%, var(--c1), transparent 60%),
    radial-gradient(circle at 70% 70%, var(--c2), transparent 60%),
    radial-gradient(circle at 50% 50%, rgba(255,255,255,.7), transparent 60%);
  box-shadow:
    0 0 12px color-mix(in oklab, var(--c1) 30%, transparent),
    0 0 22px color-mix(in oklab, var(--c2) 30%, transparent);
}

/* Trails (cheap) */
.fw-trail::after{
  content:'';
  position:absolute; inset:auto auto 0 0;
  width: 100%; height: 100%;
  border-radius: inherit;
  background: radial-gradient(circle, rgba(255,255,255,.55), transparent 70%);
  filter: blur(calc(var(--blur) * 1.2));
  opacity: .85;
  transform-origin: top left;
  animation: fw-trail var(--dur) ease-out forwards;
}

/* Animations (GPU-only) */
.fw-p.is-on{
  animation:
    fw-move var(--dur) cubic-bezier(.12,.6,.2,1) var(--delay) forwards,
    fw-fade var(--dur) ease-out var(--delay) forwards;
}
@keyframes fw-move{
  from { transform: translate3d(-50%, -50%, 0) }
  to   { transform: translate3d(calc(-50% + var(--tx)), calc(-50% + var(--ty)), 0) }
}
@keyframes fw-fade{
  0% { opacity: .98 }
  60%{ opacity: .95 }
  100%{ opacity: 0 }
}
@keyframes fw-trail{
  0% { transform: scale(1) translateY(0); opacity:.95 }
  100%{ transform: scale(.7) translateY(12px); opacity:0 }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .fw-p.is-on{ animation-duration: 1ms !important; }
  .fw-trail::after{ animation-duration: 1ms !important; }
}
</style>
