<!-- ReactionDockFly.vue -->
<template>
  <div
    class="rx-dock fixed z-30 pointer-events-none"
    :class="posClass"
    :style="{ paddingBottom: 'calc(.25rem + env(safe-area-inset-bottom))' }"
    role="toolbar"
    aria-label="Quick Reactions"
  >
    <!-- Bar -->
    <div class="rx-bar pointer-events-auto">
      <button
        v-for="emoji in list"
        :key="emoji"
        class="rx-btn"
        :aria-label="`React ${emoji}`"
        @click="tap(emoji, $event)"
        @dblclick.prevent="burst(emoji, 6, $event)"
        @pointerdown="pressStart(emoji, $event)"
        @pointerup="pressEnd"
        @pointercancel="pressEnd"
        @pointerleave="pressEnd"
      >
        <span class="rx-emoji">{{ emoji }}</span>
        <span v-if="counts[emoji]" class="rx-badge">{{ compact(counts[emoji]) }}</span>
      </button>
    </div>

    <!-- Particle layer -->
    <div ref="layer" class="rx-layer pointer-events-none"></div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onBeforeUnmount } from 'vue'

/* Props */
const props = defineProps({
  emojis: { type: Array, default: () => ['😂','🔥','❤️','👏','😮'] },
  position: { type: String, default: 'bottom-right' }, // 'bottom-right'|'bottom-center'|'bottom-left'
  persistKey: { type: String, default: '' } // kama unataka kuhifadhi counts
})
const emit = defineEmits(['reaction'])

/* State */
const list   = computed(() => props.emojis.slice(0, 12))
const counts = reactive(Object.fromEntries(list.value.map(e => [e, 0])))
if (props.persistKey) {
  try { Object.assign(counts, JSON.parse(localStorage.getItem(props.persistKey) || '{}')) } catch {}
}
function save(){ if(props.persistKey) try{ localStorage.setItem(props.persistKey, JSON.stringify(counts)) }catch{} }

const posClass = computed(() => ({
  'rx-br': props.position === 'bottom-right',
  'rx-bc': props.position === 'bottom-center',
  'rx-bl': props.position === 'bottom-left'
}))

/* Haptics */
function buzz(ms=8){ if (navigator.vibrate) { try{ navigator.vibrate(ms) }catch{} } }

/* React core */
let last = 0, rptTimer = null
const layer = ref(null)

function react(emoji, n=1, evt){
  const now = performance.now()
  if (now - last < 40 && n === 1) return  // kidogo rate limit kwa taps mfululizo
  last = now

  counts[emoji] = (counts[emoji] || 0) + n
  save()
  emit('reaction', emoji)           // API ileile
  spawn(emoji, Math.min(n, 16), evt)
  buzz(Math.min(12, 3 + n))
}

function tap(emoji, e){ react(emoji, 1, e) }
function burst(emoji, n=6, e){ react(emoji, n, e) }

function pressStart(emoji, e){
  clearTimeout(rptTimer)
  rptTimer = setTimeout(function rep(){
    react(emoji, 1, e)
    rptTimer = setTimeout(rep, 110) // auto-repeat
  }, 360)
}
function pressEnd(){ clearTimeout(rptTimer); rptTimer = null }
onBeforeUnmount(()=> clearTimeout(rptTimer))

/* Particles (fly-up) */
function spawn(emoji, n=1, evt){
  const host = layer.value; if (!host) return
  const src  = evt?.target?.getBoundingClientRect?.()
  const base = host.getBoundingClientRect()
  for (let i=0;i<n;i++){
    const s = document.createElement('span')
    s.className = 'rx-fx'
    s.textContent = emoji
    const angle = (60 + Math.random()*60) * (Math.PI/180)
    const dist  = 28 + Math.random()*36
    const dx = Math.cos(angle)*dist*(Math.random()>.5?1:-1)
    const dy = -Math.sin(angle)*dist - (Math.random()*24)
    s.style.setProperty('--dx', `${dx}px`)
    s.style.setProperty('--dy', `${dy}px`)
    s.style.setProperty('--r',  `${(Math.random()*30-15)}deg`)
    s.style.setProperty('--t',  `${0.9 + Math.random()*0.5}s`)
    if (src){
      const x = src.left - base.left + src.width/2
      const y = src.top  - base.top  + src.height/2
      s.style.left = `${x}px`; s.style.top = `${y}px`
    }
    host.appendChild(s)
    s.addEventListener('animationend', ()=> s.remove(), { once:true })
  }
}

/* Utils */
function compact(n){
  if (n < 1000) return n
  if (n < 10000) return (n/1000).toFixed(1).replace(/\.0$/,'') + 'K'
  if (n < 1e6)   return Math.round(n/1000) + 'K'
  return (n/1e6).toFixed(1).replace(/\.0$/,'') + 'M'
}
</script>

<style scoped>
/* Positions */
.rx-dock.rx-br{ right:1rem; bottom:4.5rem }
.rx-dock.rx-bc{ left:50%; transform:translateX(-50%); bottom:4.5rem }
.rx-dock.rx-bl{ left:1rem; bottom:4.5rem }

/* Bar */
.rx-bar{
  display:flex; gap:.5rem; padding:.35rem; border-radius:9999px;
  background:rgba(15,23,42,.7); border:1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(10px); box-shadow: 0 10px 24px rgba(0,0,0,.35);
}

/* Emoji buttons */
.rx-btn{
  position:relative; width:44px; height:44px; border-radius:9999px;
  display:grid; place-items:center; color:#fff; font-size:22px; line-height:1;
  background:transparent; border:1px solid transparent;
  transition: transform .12s ease, background .2s ease, border-color .2s ease;
}
.rx-btn:hover{ background: rgba(255,255,255,.06) }
.rx-btn:active{ transform: translateY(1px) scale(.98) }
.rx-btn:focus-visible{ outline:0; border-color: rgba(34,211,238,.85); background: rgba(34,211,238,.12) }
.rx-emoji{ filter: drop-shadow(0 2px 4px rgba(0,0,0,.35)); }

/* Count badge */
.rx-badge{
  position:absolute; top:-6px; right:-4px; font-size:10px; line-height:1;
  background:#22d3ee; color:#0b1324; border-radius:9999px; padding:2px 6px; font-weight:700;
  box-shadow:0 4px 12px rgba(34,211,238,.35);
}

/* Particles layer & anim */
.rx-layer{ position:fixed; inset:0; overflow:hidden; z-index:-1 }
.rx-fx{
  position:absolute; font-size:20px; will-change: transform, opacity;
  animation: fly var(--t,1s) cubic-bezier(.2,.65,.2,1) forwards, pop .25s ease-out;
}
@keyframes fly{ to{ transform: translate(var(--dx), var(--dy)) rotate(var(--r)); opacity:0 } }
@keyframes pop{ 0%{ transform: scale(.6) } 100%{ transform: scale(1) } }
@media (prefers-reduced-motion: reduce){ .rx-fx{ animation: none; opacity:1 } }
</style>
