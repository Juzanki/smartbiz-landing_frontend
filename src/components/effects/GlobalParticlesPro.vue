<template>
  <div
    class="gp-layer absolute inset-0 pointer-events-none"
    :style="{ padding: `env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)` }"
  >
    <!-- pooled particles -->
    <div
      v-for="p in pool"
      :key="p.id"
      class="gp"
      :class="[reduced ? 'no-anim' : variantClass]"
      :style="p.active ? p.style : baseStyle"
      @animationend="onAnimEnd(p)"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, onBeforeUnmount, computed, watch, defineExpose } from 'vue'

type Particle = {
  id: number
  active: boolean
  style: Record<string,string>
  ttl: number
}

const props = withDefaults(defineProps<{
  /** auto particle count scaling hint; 'auto' = based on viewport */
  density?: 'auto' | number
  /** animation variant: float | drift | orbit */
  variant?: 'float' | 'drift' | 'orbit'
  /** palette key or custom array */
  palette?: 'tanzania' | 'pride' | 'earth' | 'neon' | string[]
  /** min/max duration (seconds) */
  minDur?: number
  maxDur?: number
  /** size in px (base), scales by DPR */
  size?: number
  /** enable device tilt wind */
  tiltWind?: boolean
}>(), {
  density: 'auto',
  variant: 'float',
  palette: 'earth',
  minDur: 3.2,
  maxDur: 6.2,
  size: 8,
  tiltWind: true
})

/* Accessibility */
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/* Variant class */
const variantClass = computed(() => ({
  float: 'anim-float',
  drift: 'anim-drift',
  orbit: 'anim-orbit'
}[props.variant!] || 'anim-float'))

/* Palettes (kimataifa) */
const PALETTES: Record<string, string[]> = {
  tanzania: ['#1EB53A','#FCD116','#00A3DD','#000000','#FFFFFF'],
  pride: ['#E40303','#FF8C00','#FFED00','#008026','#24408E','#732982'],
  earth: ['#ffffff','#e0f2fe','#bae6fd','#a7f3d0','#d9f99d'],
  neon: ['#22d3ee','#a78bfa','#f472b6','#34d399','#60a5fa']
}
function getPalette(): string[] {
  return Array.isArray(props.palette) ? props.palette : (PALETTES[props.palette as string] || PALETTES.earth)
}

/* Density (mobile-first) */
function autoCount(){
  const vw = Math.min(440, window.innerWidth)
  const vh = Math.min(900, window.innerHeight)
  // tuned for phones first
  const base = Math.round((vw * vh) / 9000) // ~20–40 on phones
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  return Math.round(base * (0.85 + (dpr-1)*0.3))
}

/* Pool */
let idc = 0
const pool = reactive<Particle[]>([])
const baseStyle: Record<string,string> = {
  '--x': '50%', '--y': '50%', '--dx': '0px', '--dy': '-100px',
  '--bg': '#fff', '--size': '8px', '--blur': '0.6px',
  '--dur': '4s', '--delay': '0s', '--rot': '0deg'
}

/* Wind (tilt) */
const wind = reactive({ x: 0, y: 0 })
function onTilt(e: DeviceOrientationEvent){
  if (!props.tiltWind) return
  const gx = (e.gamma ?? 0) / 45 // left-right
  const gy = (e.beta ?? 0) / 45  // front-back
  wind.x = Math.max(-1, Math.min(1, gx))
  wind.y = Math.max(-1, Math.min(1, gy))
}

/* Utils */
const rnd = (a:number, b:number)=> a + Math.random()*(b-a)
const irnd = (a:number, b:number)=> Math.round(rnd(a,b))
function pick<T>(arr:T[]){ return arr[irnd(0, arr.length-1)] }

/* Activate a particle at random spot */
function activate(p: Particle, palette: string[]){
  const x = irnd(2, 98)
  const y = irnd(5, 95)
  const dur = rnd(props.minDur!, props.maxDur!)
  const size = Math.max(4, props.size! * (window.devicePixelRatio || 1) * rnd(0.8, 1.2))
  const blur = size * rnd(0.08, 0.18)
  const color = pick(palette)

  // wind displacement
  const wx = wind.x * rnd(20, 60)
  const wy = wind.y * rnd(-20, 20)

  // orbit variant rotates; others set small rotation only
  const rot = props.variant === 'orbit' ? `${irnd(0,360)}deg` : `${irnd(-8,8)}deg`

  p.style = {
    '--x': `${x}%`,
    '--y': `${y}%`,
    '--dx': `${irnd(-30, 30) + wx}px`,
    '--dy': `${irnd(-120, -60) + wy}px`,
    '--bg': color,
    '--size': `${size}px`,
    '--blur': `${blur}px`,
    '--dur': `${dur}s`,
    '--delay': `${rnd(0, 0.6)}s`,
    '--rot': rot
  }
  p.ttl = dur * 1000 + 100
  p.active = true
}

/* Animation end → recycle */
function onAnimEnd(p: Particle){ p.active = false; // keep recycled by sweeper
}

/* Sweeper: re-activate inert particles */
let sweep: number | null = null
function startSweep(){
  stopSweep()
  const palette = getPalette()
  sweep = window.setInterval(() => {
    for (const p of pool){
      if (!p.active) activate(p, palette)
      else { p.ttl -= 250; if (p.ttl <= 0) p.active = false }
    }
  }, 250)
}
function stopSweep(){ if (sweep){ clearInterval(sweep); sweep = null } }

/* Public: force refresh / change palette / burst at point */
function refresh(){
  const palette = getPalette()
  pool.forEach(p => { p.active = false; activate(p, palette) })
}
function setPalette(nameOrArray: string | string[]){
  // @ts-ignore allow external assignment via prop update
  if (Array.isArray(nameOrArray)) (props as any).palette = nameOrArray
  else (props as any).palette = nameOrArray
  refresh()
}
function burstAt(x:number, y:number, count = 16){
  const palette = getPalette()
  const chosen = pool.filter(p => !p.active).slice(0, count)
  for (const p of chosen){
    const dur = rnd(1.8, 3.2)
    const size = Math.max(4, props.size! * (window.devicePixelRatio || 1) * rnd(0.9, 1.35))
    const blur = size * rnd(0.08, 0.16)
    const color = pick(palette)
    const angle = rnd(0, Math.PI*2)
    const r = rnd(60, 140)
    p.style = {
      '--x': `${(x/window.innerWidth)*100}%`,
      '--y': `${(y/window.innerHeight)*100}%`,
      '--dx': `${Math.cos(angle)*r}px`,
      '--dy': `${Math.sin(angle)*-r}px`,
      '--bg': color,
      '--size': `${size}px`,
      '--blur': `${blur}px`,
      '--dur': `${dur}s`,
      '--delay': `0s`,
      '--rot': `${irnd(-12,12)}deg`
    }
    p.ttl = dur*1000 + 80; p.active = true
  }
}
defineExpose({ refresh, setPalette, burstAt })

/* Rebuild pool when density changes */
function buildPool(){
  stopSweep()
  pool.splice(0, pool.length)
  const count = props.density === 'auto' ? autoCount() : Math.max(8, Number(props.density))
  for (let i=0;i<count;i++){
    pool.push({ id: ++idc, active: false, style: {}, ttl: 0 })
  }
  startSweep()
}

/* Recompute on resize / prop changes */
function onResize(){ if (props.density === 'auto') buildPool() }
watch(() => [props.minDur, props.maxDur, props.size, props.variant], refresh)
watch(() => props.palette, refresh)
onMounted(async () => {
  buildPool()
  if (props.tiltWind && typeof DeviceOrientationEvent !== 'undefined'){
    try {
      // @ts-ignore iOS permission
      if (DeviceOrientationEvent.requestPermission) {
        const perm = await DeviceOrientationEvent.requestPermission()
        if (perm === 'granted') window.addEventListener('deviceorientation', onTilt)
      } else {
        window.addEventListener('deviceorientation', onTilt)
      }
    } catch { /* ignore */ }
  }
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  stopSweep()
  window.removeEventListener('resize', onResize)
  window.removeEventListener('deviceorientation', onTilt)
})
</script>

<style scoped>
.gp-layer{
  transform: translateZ(0);
  contain: layout style paint;
  content-visibility: auto;
}

/* Particle */
.gp{
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: var(--size);
  height: var(--size);
  border-radius: 9999px;
  background: var(--bg);
  opacity: .35;
  filter: blur(var(--blur));
  transform: translate3d(-50%,-50%,0) rotate(var(--rot));
  will-change: transform, opacity, filter;
  backface-visibility: hidden;
}

/* Variants — GPU-only transforms */
.gp.anim-float{
  animation:
    gp-move var(--dur) ease-in-out var(--delay) infinite,
    gp-fade var(--dur) ease-in-out var(--delay) infinite;
}
@keyframes gp-move{
  0%   { transform: translate3d(-50%,-50%,0) rotate(var(--rot)) }
  50%  { transform: translate3d(calc(-50% + var(--dx)/2), calc(-50% + var(--dy)/2), 0) rotate(var(--rot)) }
  100% { transform: translate3d(calc(-50% + var(--dx)), calc(-50% + var(--dy)), 0) rotate(var(--rot)) }
}
@keyframes gp-fade{
  0%{ opacity:.15 } 50%{ opacity:.6 } 100%{ opacity:0 }
}

.gp.anim-drift{
  animation:
    gp-drift var(--dur) cubic-bezier(.2,.6,.2,1) var(--delay) infinite,
    gp-fade var(--dur) ease-in-out var(--delay) infinite;
}
@keyframes gp-drift{
  0%{ transform: translate3d(-50%,-50%,0) rotate(var(--rot)) }
  100%{ transform: translate3d(calc(-50% + var(--dx)), calc(-50% + var(--dy)), 0) rotate(var(--rot)) }
}

.gp.anim-orbit{
  transform-origin: center;
  animation:
    gp-orbit var(--dur) linear var(--delay) infinite,
    gp-fade var(--dur) ease-in-out var(--delay) infinite;
}
@keyframes gp-orbit{
  0%{ transform: translate3d(-50%,-50%,0) rotate(0deg) }
  100%{ transform: translate3d(-50%,-50%,0) rotate(360deg) }
}

/* Reduced motion */
.no-anim{ animation: none !important; opacity:.35 !important }
@media (prefers-reduced-motion: reduce){
  .gp{ animation-duration: 1ms !important; }
}
</style>
