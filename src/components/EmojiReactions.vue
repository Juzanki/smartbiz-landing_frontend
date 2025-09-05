<!-- MobileReactionDock.vue -->
<template>
  <div
    class="reactions-dock pointer-events-none"
    :class="positionClass"
    :style="{ paddingBottom: `calc(0.5rem + env(safe-area-inset-bottom))` }"
    role="toolbar"
    aria-label="Quick Reactions"
  >
    <!-- Toggle (mobile thumb-reach) -->
    <button
      class="rx-fab pointer-events-auto"
      :aria-expanded="open ? 'true' : 'false'"
      aria-label="Open reactions"
      @click="toggle"
    >
      <span class="text-xl">😊</span>
    </button>

    <!-- Bar -->
    <div
      class="rx-bar pointer-events-auto"
      :class="{ open }"
      @keydown.left.prevent="focusPrev"
      @keydown.right.prevent="focusNext"
      @keydown.space.prevent="keyReact"
      @keydown.enter.prevent="keyReact"
      ref="barEl"
      role="group"
      aria-label="Reactions"
    >
      <button
        v-for="(emoji, idx) in items"
        :key="emoji"
        class="rx-btn"
        :data-emoji="emoji"
        :tabindex="open ? 0 : -1"
        @click="tap(emoji, $event)"
        @dblclick.prevent="burst(emoji, 6, $event)"
        @pointerdown="onPressStart(emoji, $event, idx)"
        @pointerup="onPressEnd"
        @pointercancel="onPressEnd"
        @pointerleave="onPressEnd"
        :aria-label="`React ${emoji}`"
      >
        <span class="rx-emoji">{{ emoji }}</span>
        <span v-if="counts[emoji]" class="rx-badge">{{ compact(counts[emoji]) }}</span>
      </button>
    </div>

    <!-- Particle layer -->
    <div ref="particlesEl" class="rx-particles pointer-events-none"></div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'

/** Props */
const props = defineProps({
  emojis: { type: Array, default: () => ['😂','🔥','❤️','👏','😮'] },
  /** 'bottom-right' | 'bottom-center' | 'bottom-left' */
  position: { type: String, default: 'bottom-right' },
  /** localStorage key for counts/dock state */
  sessionKey: { type: String, default: 'rx:dock:v1' },
  /** max particles per burst (safety) */
  maxParticles: { type: Number, default: 24 }
})

const emit = defineEmits(['reaction','open','close'])

/* State */
const open = ref(false)
const barEl = ref(null)
const particlesEl = ref(null)
const items = computed(() => props.emojis.slice(0, 12)) // guard length for mobile
const counts = reactive(Object.fromEntries(items.value.map(e => [e, 0])))

/* Position classes */
const positionClass = computed(() => ({
  'pos-br': props.position === 'bottom-right',
  'pos-bc': props.position === 'bottom-center',
  'pos-bl': props.position === 'bottom-left'
}))

/* Load persisted counts/state */
function load() {
  try {
    const raw = localStorage.getItem(props.sessionKey)
    if (!raw) return
    const obj = JSON.parse(raw)
    if (obj?.counts) Object.keys(obj.counts).forEach(k => counts[k] = obj.counts[k])
    if (typeof obj.open === 'boolean') open.value = obj.open
  } catch {}
}
function persist() {
  try { localStorage.setItem(props.sessionKey, JSON.stringify({ counts, open: open.value })) } catch {}
}

/* Haptics */
function buzz(ms=8){ if (navigator.vibrate) try{ navigator.vibrate(ms) }catch{} }

/* Toggle */
function toggle(){
  open.value = !open.value
  buzz(5)
  persist()
  emit(open.value ? 'open' : 'close')
}

/* Compact number (1.2K) */
function compact(n){
  if (n < 1000) return n
  if (n < 10000) return (n/1000).toFixed(1).replace(/\.0$/, '') + 'K'
  if (n < 1e6) return Math.round(n/1000) + 'K'
  return (n/1e6).toFixed(1).replace(/\.0$/, '') + 'M'
}

/* Reaction core */
let lastAt = 0
function react(emoji, burst=1, origin=null){
  // rate limit small (allows bursts)
  const now = performance.now()
  if (now - lastAt < 40 && burst === 1) burst = 0
  lastAt = now

  if (!counts[emoji] && counts[emoji] !== 0) counts[emoji] = 0
  counts[emoji] += burst
  persist()
  emit('reaction', emoji) // backwards-compatible

  spawnParticles(emoji, Math.min(burst, props.maxParticles), origin)
  buzz(Math.min(12, 3 + burst))
}

/* Tap / Burst / Long-press auto-repeat */
function tap(emoji, e){ react(emoji, 1, e) }
function burst(emoji, n=6, e){ react(emoji, n, e) }

let pressTimer = null
function onPressStart(emoji, e, idx){
  clearTimeout(pressTimer)
  // focus for keyboard context
  e.currentTarget?.focus?.()
  // start auto-repeat after 350ms
  pressTimer = setTimeout(()=>{
    let ticks = 0
    const rep = () => {
      if (!pressTimer) return
      react(emoji, 1, e)
      ticks++
      pressTimer = setTimeout(rep, Math.max(80, 250 - ticks*15)) // speed up a bit
    }
    rep()
  }, 350)
}
function onPressEnd(){
  clearTimeout(pressTimer)
  pressTimer = null
}

/* Keyboard support */
function focusIdx(){
  const nodes = [...(barEl.value?.querySelectorAll('.rx-btn') || [])]
  const i = nodes.indexOf(document.activeElement)
  return { nodes, i }
}
function focusPrev(){ const {nodes,i} = focusIdx(); if (i > 0) nodes[i-1].focus(); else nodes.at(-1)?.focus() }
function focusNext(){ const {nodes,i} = focusIdx(); if (i >= 0 && i < nodes.length-1) nodes[i+1].focus(); else nodes[0]?.focus() }
function keyReact(){
  const el = document.activeElement
  const emoji = el?.dataset?.emoji
  if (emoji) react(emoji, 1, { target: el })
}

/* Particles */
function spawnParticles(emoji, n=1, evt){
  if (!particlesEl.value) return
  const originRect = (evt?.target?.getBoundingClientRect && evt.target.getBoundingClientRect()) || null
  for (let i=0; i<n; i++){
    const span = document.createElement('span')
    span.className = 'rx-ptc'
    span.textContent = emoji
    const angle = (Math.random() * 60 + 60) * (Math.PI/180) // 60°–120°
    const dist = 36 + Math.random()*26
    const dx = Math.cos(angle) * dist * (Math.random() > .5 ? 1 : -1)
    const dy = -Math.sin(angle) * dist - (Math.random()*30)
    span.style.setProperty('--dx', `${dx}px`)
    span.style.setProperty('--dy', `${dy}px`)
    span.style.setProperty('--rot', `${(Math.random()*40-20)}deg`)
    span.style.setProperty('--dur', `${0.8 + Math.random()*0.5}s`)
    // start near source
    if (originRect){
      const host = particlesEl.value.getBoundingClientRect()
      const x = originRect.left - host.left + originRect.width/2
      const y = originRect.top - host.top + originRect.height/2
      span.style.left = `${x}px`
      span.style.top  = `${y}px`
    }
    particlesEl.value.appendChild(span)
    span.addEventListener('animationend', ()=> span.remove(), { once:true })
  }
}

/* Mount */
onMounted(async ()=>{
  load()
  await nextTick()
  // pre-apply focusable order
  if (open.value) barEl.value?.querySelector('.rx-btn')?.focus()
})
onBeforeUnmount(()=> { clearTimeout(pressTimer) })
</script>

<style scoped>
/* Layout */
.reactions-dock{ position:fixed; display:flex; align-items:center; gap:.5rem; }
.pos-br{ right:1rem; bottom:4.5rem; }
.pos-bc{ left:50%; transform:translateX(-50%); bottom:4.5rem; }
.pos-bl{ left:1rem; bottom:4.5rem; }

/* FAB */
.rx-fab{
  display:grid; place-items:center; width:44px; height:44px; border-radius:9999px;
  background:rgba(15,23,42,.7); color:white; border:1px solid rgba(34,211,238,.35);
  box-shadow:0 8px 24px rgba(0,0,0,.35);
  transition:transform .15s ease, background .2s ease; backdrop-filter: blur(8px);
}
.rx-fab:active{ transform:scale(.96) }
.rx-fab:hover{ background:rgba(15,23,42,.8) }

/* Bar */
.rx-bar{
  display:flex; gap:.375rem; padding:.35rem; border-radius:9999px;
  background:rgba(15,23,42,.65); border:1px solid rgba(148,163,184,.25); backdrop-filter: blur(10px);
  max-width:92vw; overflow-x:auto; scrollbar-width:none; transform-origin: right;
  transform: scale(.9); opacity:0; pointer-events:none; transition: all .18s ease;
}
.rx-bar.open{ transform: scale(1); opacity:1; pointer-events:auto; }
.rx-bar::-webkit-scrollbar{ display:none }

/* Button */
.rx-btn{
  position:relative; min-width:44px; height:44px; border-radius:9999px;
  display:grid; place-items:center; font-size:22px; line-height:1;
  background:transparent; color:white; border:1px solid transparent;
  transition: transform .1s ease, background .2s ease, border-color .2s ease;
  outline: none;
}
.rx-btn:focus-visible{ border-color: rgba(34,211,238,.8); background: rgba(34,211,238,.1) }
.rx-btn:active{ transform: translateY(1px) scale(.98) }
.rx-emoji{ filter: drop-shadow(0 2px 4px rgba(0,0,0,.35)); }

/* Count badge */
.rx-badge{
  position:absolute; top:-6px; right:-2px; font-size:10px; line-height:1;
  background:#22d3ee; color:#0b1324; border-radius:9999px; padding:2px 6px; font-weight:700;
  box-shadow:0 4px 12px rgba(34,211,238,.35);
}

/* Particle layer */
.rx-particles{ position:fixed; inset:0; overflow:hidden; z-index:-1; }
.rx-ptc{
  position:absolute; font-size:20px; will-change: transform, opacity;
  animation: fly var(--dur,1s) cubic-bezier(.2,.65,.2,1) forwards, pop .25s ease-out;
}
@keyframes fly{
  to{ transform: translate(var(--dx,0), var(--dy,-60px)) rotate(var(--rot,0)); opacity:0 }
}
@keyframes pop{
  0%{ transform: scale(.6); }
  100%{ transform: scale(1); }
}

/* Reduce motion */
@media (prefers-reduced-motion: reduce){
  .rx-ptc{ animation: none; opacity:1 }
}

/* Dark iOS overscroll niceness (optional) */
:host, .reactions-dock{ -webkit-tap-highlight-color: transparent; }
</style>
