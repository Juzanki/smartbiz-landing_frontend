<template>
  <!-- Safe-area, finger-safe top rail -->
  <div
    class="fcp-layer pointer-events-none fixed inset-x-0 z-[9998]"
    :style="{ top: `calc(16px + env(safe-area-inset-top))` }"
  >
    <!-- Lanes (avoid overlap) -->
    <div
      v-for="lane in lanesArr"
      :key="lane"
      class="fcp-lane"
      :style="{ height: laneHeight + 'px' }"
    >
      <!-- pooled bubbles -->
      <div
        v-for="b in poolByLane[lane]"
        :key="b.id"
        class="fcp-bubble pointer-events-auto"
        :class="[
          b.active ? 'is-on' : '',
          b.theme,
          reduced ? 'no-anim' : trajectoryClass(b.trajectory)
        ]"
        :style="b.active ? b.style : baseBubbleStyle"
        @animationend="onAnimEnd(b)"
        @touchstart.passive="onTouchStart(b, $event)"
        @touchmove.passive="onTouchMove(b, $event)"
        @touchend.passive="onTouchEnd(b, $event)"
        @click="onTap(b)"
        role="status"
        aria-live="polite"
      >
        <!-- avatar / emoji -->
        <div v-if="b.avatar || b.emoji" class="fcp-avatar">
          <img v-if="b.avatar" :src="b.avatar" alt="" />
          <span v-else class="text-lg leading-none">{{ b.emoji }}</span>
        </div>

        <!-- text -->
        <div class="fcp-text">
          <span v-if="b.prefix" class="fcp-prefix">{{ b.prefix }}</span>
          <span class="fcp-body">{{ b.text }}</span>
        </div>

        <!-- reaction spark (cheap confetti) -->
        <div v-if="b.spark" class="fcp-spark">
          <i v-for="n in 8" :key="n" class="fcp-spark-dot" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, onBeforeUnmount, defineExpose } from 'vue'

type Bubble = {
  id: number
  lane: number
  active: boolean
  text: string
  emoji?: string
  avatar?: string
  prefix?: string
  theme: string        // CSS theme class
  style: Record<string,string>
  trajectory: 'rise'|'curve'|'drift'
  ttl: number
  spark?: boolean
}

/* ---------- Props ---------- */
const props = withDefaults(defineProps<{
  lanes?: number              // rows to avoid overlap
  duration?: number           // ms per bubble
  maxConcurrent?: number      // on-screen cap
  rateLimitMs?: number        // min gap between adds
  laneHeight?: number         // px per lane
  sound?: string              // optional tiny blip sound
  keywordSpark?: (string|RegExp)[] // spark triggers
}>(), {
  lanes: 3,
  duration: 3500,
  maxConcurrent: 12,
  rateLimitMs: 140,
  laneHeight: 42,
  sound: ''
})

/* ---------- Setup ---------- */
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
const lanesArr = computed(() => Array.from({ length: props.lanes! }, (_, i) => i))
const laneHeight = props.laneHeight

let idc = 0
const pool = reactive<Bubble[]>([])
const poolByLane = computed(() => {
  const map: Record<number,Bubble[]> = {}
  for (const l of lanesArr.value) map[l] = []
  pool.forEach(b => { if (b.active) map[b.lane].push(b) })
  return map
})

/* Base style (CSS variables for GPU transforms) */
const baseBubbleStyle: Record<string,string> = {
  '--x': '0px', '--y': '0px', '--dx': '0px', '--dy': '-40px',
  '--dur': '3500ms', '--delay': '0ms'
}

/* ---------- Sound + Haptics ---------- */
let lastSound = 0
function blip() {
  if (!props.sound || reduced) return
  const now = performance.now()
  if (now - lastSound < 120) return
  lastSound = now
  try { const a = new Audio(props.sound); a.volume = 0.25; a.play().catch(()=>{}) } catch {}
}
function vibrate(ms=6){ try{ navigator.vibrate?.(ms) }catch{} }

/* ---------- Add API with smart lane / rate limit ---------- */
let lastAdd = 0
function addFloatingComment(
  text: string,
  opts?: {
    emoji?: string
    avatar?: string
    prefix?: string
    theme?: 'indigo'|'emerald'|'rose'|'amber'|'sky'|'night'
    trajectory?: 'rise'|'curve'|'drift'
    lane?: number        // force lane
    duration?: number
  }
){
  const now = performance.now()
  if (now - lastAdd < props.rateLimitMs) return // throttle
  lastAdd = now

  // respect cap
  const activeCount = pool.filter(p => p.active).length
  if (activeCount >= props.maxConcurrent!) {
    // recycle oldest
    const first = pool.find(p => p.active)
    if (first) first.active = false
  }

  // choose lane with fewest items
  let lane = typeof opts?.lane === 'number'
    ? Math.max(0, Math.min(props.lanes!-1, opts!.lane))
    : 0
  if (opts?.lane == null){
    let best = 0, min = Infinity
    lanesArr.value.forEach(l => {
      const c = poolByLane.value[l].length
      if (c < min){ min = c; best = l }
    })
    lane = best
  }

  // spark on keywords
  const triggers = props.keywordSpark ?? [/love/i, /kali/i, /🔥/, /wow/i]
  const spark = triggers.some(t => typeof t === 'string' ? text.includes(t) : t.test(text))

  const duration = Math.max(1600, opts?.duration ?? props.duration!)
  const id = ++idc
  const x = 0 // start centered lane, we animate via translate
  const y = lane * props.laneHeight!

  // theme class
  const theme = `theme-${opts?.theme ?? pick(['indigo','emerald','rose','amber','sky','night'])}`
  const traj = opts?.trajectory ?? pick(['rise','curve','drift'] as const)

  const b: Bubble = {
    id, lane, active: true, text,
    emoji: opts?.emoji, avatar: opts?.avatar, prefix: opts?.prefix,
    theme, trajectory: traj, ttl: duration + 80,
    spark,
    style: {
      '--x': `${x}px`,
      '--y': `${y}px`,
      '--dx': `${rnd(-40,40)}px`,
      '--dy': `${rnd(-60,-120)}px`,
      '--dur': `${duration}ms`,
      '--delay': `${irnd(0,120)}ms`
    }
  }
  pool.push(b)
  blip(); vibrate(4)
}
defineExpose({ addFloatingComment })

/* ---------- Touch interactions (swipe to dismiss) ---------- */
const touchMap = new Map<number,{x:number,y:number,el:HTMLElement}>()

function onTouchStart(b: Bubble, e: TouchEvent){
  if (!b.active) return
  const t = e.touches[0]
  const el = (e.currentTarget as HTMLElement)
  touchMap.set(b.id, { x: t.clientX, y: t.clientY, el })
}

function onTouchMove(b: Bubble, e: TouchEvent){
  const st = touchMap.get(b.id); if (!st) return
  const t = e.touches[0]
  const dx = t.clientX - st.x
  const dy = t.clientY - st.y
  st.el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
  st.el.style.opacity = String(Math.max(.4, 1 - Math.hypot(dx,dy)/120))
}

function onTouchEnd(b: Bubble){
  const st = touchMap.get(b.id); if (!st) return
  const rect = st.el.getBoundingClientRect()
  const moved = Math.hypot(rect.x, rect.y) // rough
  if (moved > 80){ b.active = false; vibrate(8) }
  else { st.el.style.transform = ''; st.el.style.opacity = '' }
  touchMap.delete(b.id)
}

/* Quick tap → heart spark */
function onTap(b: Bubble){
  b.spark = true
  setTimeout(()=> b.spark = false, 600)
}

/* ---------- Housekeeping ---------- */
let sweep: number | null = null
function onAnimEnd(b: Bubble){ b.active = false }
function startSweep(){
  stopSweep()
  sweep = window.setInterval(() => {
    pool.forEach(p => p.ttl -= 200)
    pool.filter(p => p.ttl <= 0 && p.active).forEach(p => p.active = false)
  }, 200)
}
function stopSweep(){ if (sweep){ clearInterval(sweep); sweep=null } }

onMounted(startSweep)
onBeforeUnmount(stopSweep)

/* ---------- Utils ---------- */
const rnd = (a:number,b:number)=> a + Math.random()*(b-a)
const irnd = (a:number,b:number)=> Math.round(rnd(a,b))
const pick = <T,>(arr:T[]) => arr[irnd(0, arr.length-1)]

</script>

<style scoped>
/* Layer & lanes */
.fcp-layer{
  transform: translateZ(0);
  contain: layout style paint;
  content-visibility: auto;
}
.fcp-lane{
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center; /* center bubbles by default */
  overflow: visible;
}

/* Bubble */
.fcp-bubble{
  display:inline-flex; align-items:center; gap:.5rem;
  max-width: 86vw; /* mobile-first */
  margin: 6px auto;
  padding: .5rem .8rem;
  border-radius: 9999px;
  font-size: .85rem; line-height: 1.1; font-weight: 700;
  box-shadow: 0 8px 22px rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.15);
  backdrop-filter: blur(8px);
  transform: translate3d(var(--x), var(--y), 0);
  opacity: 0;
}

/* Avatar/emoji */
.fcp-avatar{
  width: 24px; height: 24px; flex: 0 0 24px;
  border-radius: 9999px; overflow:hidden;
  display:grid; place-items:center;
  background: rgba(0,0,0,.2);
}
.fcp-avatar img{ width:100%; height:100%; object-fit:cover }

/* Text */
.fcp-text{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.fcp-prefix{
  opacity:.85; margin-right:.25rem; font-weight:900;
}

/* Themes (glass neon) */
.theme-indigo{ color:#fff; background: linear-gradient(120deg, rgba(99,102,241,.8), rgba(56,189,248,.65)); }
.theme-emerald{ color:#062; background: linear-gradient(120deg, rgba(16,185,129,.85), rgba(52,211,153,.7)); color:#052; }
.theme-rose{ color:#fff; background: linear-gradient(120deg, rgba(244,63,94,.85), rgba(236,72,153,.65)); }
.theme-amber{ color:#301a00; background: linear-gradient(120deg, rgba(245,158,11,.9), rgba(251,191,36,.7)); }
.theme-sky{ color:#022; background: linear-gradient(120deg, rgba(14,165,233,.9), rgba(125,211,252,.7)); }
.theme-night{ color:#fff; background: linear-gradient(120deg, rgba(17,24,39,.8), rgba(55,65,81,.7)); }

/* Trajectories (GPU only) */
.fcp-bubble.is-on.rise{
  animation:
    fcp-rise var(--dur) ease-out var(--delay) forwards,
    fcp-fade var(--dur) ease-out var(--delay) forwards;
}
.fcp-bubble.is-on.curve{
  animation:
    fcp-curve var(--dur) ease-out var(--delay) forwards,
    fcp-fade var(--dur) ease-out var(--delay) forwards;
}
.fcp-bubble.is-on.drift{
  animation:
    fcp-drift var(--dur) ease-out var(--delay) forwards,
    fcp-fade var(--dur) ease-out var(--delay) forwards;
}
@keyframes fcp-rise{
  from { transform: translate3d(var(--x), var(--y), 0) }
  to   { transform: translate3d(calc(var(--x) + 0px), calc(var(--y) - 72px), 0) }
}
@keyframes fcp-curve{
  from { transform: translate3d(var(--x), var(--y), 0) }
  to   { transform: translate3d(calc(var(--x) + var(--dx)), calc(var(--y) + var(--dy)), 0) }
}
@keyframes fcp-drift{
  from { transform: translate3d(var(--x), var(--y), 0) }
  to   { transform: translate3d(calc(var(--x) + var(--dx)), calc(var(--y) - 64px), 0) }
}
@keyframes fcp-fade{
  0%{ opacity:.02 }
  18%{ opacity:.98 }
  100%{ opacity:0 }
}

/* Spark (tiny confetti) */
.fcp-spark{
  position:absolute; inset:-6px -8px;
  pointer-events:none;
}
.fcp-spark-dot{
  position:absolute; width:6px; height:6px; border-radius:9999px;
  background: radial-gradient(circle, #fff, transparent 70%);
  animation: spark 620ms ease-out forwards;
  left: calc(50% + (var(--i,0) - 4) * 6px);
  top: calc(50% - (var(--i,0) - 4) * 4px);
  filter: blur(1px);
}
.fcp-spark-dot:nth-child(n){ --i: 1 }
.fcp-spark-dot:nth-child(2){ --i: 2 }
.fcp-spark-dot:nth-child(3){ --i: 3 }
.fcp-spark-dot:nth-child(4){ --i: 4 }
.fcp-spark-dot:nth-child(5){ --i: -1 }
.fcp-spark-dot:nth-child(6){ --i: -2 }
.fcp-spark-dot:nth-child(7){ --i: -3 }
.fcp-spark-dot:nth-child(8){ --i: -4 }
@keyframes spark{
  0%{ transform: scale(.6); opacity:.9 }
  100%{ transform: scale(1.2) translateY(-14px); opacity:0 }
}

/* Reduced motion: no movement, quick show/hide */
.no-anim{
  animation: none !important;
  opacity: 1 !important;
}

/* Mobile-first typography */
@media (min-width: 768px){
  .fcp-bubble{ font-size: .9rem; }
}
</style>
