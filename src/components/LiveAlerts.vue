<template>
  <!-- Container (pointer-events none so it floats above UI) -->
  <div
    class="fixed z-[9999] pointer-events-none w-full"
    :class="containerPosClass"
    :style="safeAreaStyle"
    aria-live="polite"
    role="region"
  >
    <!-- Stack -->
    <transition-group name="alert" tag="div" class="flex flex-col gap-2 items-center">
      <div
        v-for="a in visible"
        :key="a.id"
        class="pointer-events-auto w-[92vw] max-w-sm rounded-2xl shadow-2xl border
               bg-white/90 dark:bg-[#0b1020]/90 backdrop-blur
               border-black/10 dark:border-white/10 overflow-hidden relative"
        :class="accentClass(a)"
        :style="dragStyle(a)"
        role="status"
        @pointerdown="onDown(a, $event)"
        @pointermove="onMove(a, $event)"
        @pointerup="onUp(a)"
        @pointercancel="onCancel(a)"
      >
        <!-- Accent bar -->
        <div class="absolute left-0 top-0 h-full w-1.5" :class="accentBar(a)"></div>

        <!-- Row -->
        <div class="px-3 py-2.5 pl-4 pr-2 flex items-start gap-3">
          <!-- Avatar / Icon -->
          <div class="shrink-0 relative">
            <img v-if="a.avatar && showAvatars" :src="a.avatar" @error="onImgError"
                 class="h-10 w-10 rounded-full object-cover ring-1 ring-white/40" alt="" />
            <div v-else class="h-10 w-10 grid place-items-center rounded-full text-lg"
                 :class="iconBg(a.type)">
              {{ typeIcon(a.type) }}
            </div>
            <!-- tiny type badge -->
            <span class="absolute -right-1 -bottom-1 text-[12px] h-5 w-5 grid place-items-center
                         rounded-full bg-black/80 text-white border border-white/40">
              {{ shortType(a.type) }}
            </span>
          </div>

          <!-- Copy -->
          <div class="min-w-0 flex-1">
            <div class="text-[13px] leading-5">
              <b class="font-semibold">{{ a.user || 'Someone' }}</b>
              <span class="opacity-80"> {{ summary(a) }}</span>
            </div>
            <p v-if="a.text" class="mt-0.5 text-[12px] text-slate-600 dark:text-slate-300 break-words">
              {{ a.text }}
            </p>
            <div class="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span>{{ relTime(a.at) }}</span>
              <span v-if="a.meta?.gift">• 🎁 {{ a.meta.gift }}</span>
              <span v-if="a.meta?.amount">• +{{ a.meta.amount }} {{ a.meta.unit || '' }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1">
            <button class="i-btn" title="Pin" @click.stop="$emit('pin', a)">⭐</button>
            <button class="i-btn" title="Dismiss" @click.stop="dismiss(a.id)">✖️</button>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="h-1 w-full bg-black/5 dark:bg-white/10">
          <div class="h-full" :class="progressClass(a)" :style="{ width: a.pct + '%' }"></div>
        </div>

        <!-- Confetti (emoji bursts for gifts/superchat) -->
        <span v-for="c in a.confetti" :key="c.id" class="confetti" :style="{ left:c.x+'%', top:c.y+'%', transform:`scale(${c.s})` }">
          {{ c.e }}
        </span>
      </div>
    </transition-group>

    <!-- Controls pill (optional) -->
    <div class="mt-2 flex items-center gap-2 justify-center">
      <button class="pill" :class="paused ? 'pill-on' : ''" @click="togglePause">{{ paused ? 'Resume' : 'Pause' }}</button>
      <button class="pill" @click="clear">Clear</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'

/* PROPS */
const props = defineProps({
  placement: { type: String, default: 'top', validator: v => ['top','bottom'].includes(v) },
  maxVisible: { type: Number, default: 3 },
  autoDismissMs: { type: Number, default: 4200 },
  showAvatars: { type: Boolean, default: true },
  soundsEnabled: { type: Boolean, default: false },     // if true, use WebAudio pings
  vibrateOnShow: { type: Boolean, default: true },
  safeOffset: { type: Number, default: 10 },            // px beyond safe-area
})

/* EMITS */
const emit = defineEmits(['pin','act','open-profile'])

/* STATE */
const visible = ref([])    // currently displayed alerts
const queue = ref([])      // pending alerts
const paused = ref(false)
let tickTimer = null
let idSeed = 0

/* POSITIONING */
const containerPosClass = computed(() =>
  props.placement === 'top'
    ? 'top-0 left-0 right-0 pt-[env(safe-area-inset-top)]'
    : 'bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)]'
)
const safeAreaStyle = computed(() =>
  props.placement === 'top'
    ? { paddingTop: `calc(env(safe-area-inset-top,0px) + ${props.safeOffset}px)` }
    : { paddingBottom: `calc(env(safe-area-inset-bottom,0px) + ${props.safeOffset}px)` }
)

/* ICONS & COLORS */
function typeIcon(t){
  return ({ like:'❤️', comment:'💬', gift:'🎁', join:'👥', follow:'➕', star:'⭐', superchat:'💎' }[t] || '📣')
}
function shortType(t){
  return ({ like:'❤', comment:'💬', gift:'🎁', join:'👥', follow:'➕', star:'⭐', superchat:'💎' }[t] || '•')
}
function iconBg(t){
  return ({
    like:'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
    comment:'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200',
    gift:'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
    join:'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
    follow:'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200',
    star:'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200',
    superchat:'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-200',
  }[t] || 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white')
}
function accentBar(a){
  return ({
    like:'bg-rose-500', comment:'bg-sky-500', gift:'bg-amber-500', join:'bg-emerald-500',
    follow:'bg-indigo-500', star:'bg-violet-500', superchat:'bg-fuchsia-500'
  }[a.type] || 'bg-cyan-500')
}
function progressClass(a){
  return ({
    like:'bg-rose-400', comment:'bg-sky-400', gift:'bg-amber-400', join:'bg-emerald-400',
    follow:'bg-indigo-400', star:'bg-violet-400', superchat:'bg-fuchsia-400'
  }[a.type] || 'bg-cyan-400')
}
function accentClass(a){
  // subtle ring tint
  return ({
    like:'ring-1 ring-rose-300/40', comment:'ring-1 ring-sky-300/40', gift:'ring-1 ring-amber-300/40',
    join:'ring-1 ring-emerald-300/40', follow:'ring-1 ring-indigo-300/40', star:'ring-1 ring-violet-300/40',
    superchat:'ring-1 ring-fuchsia-300/40'
  }[a.type] || '')
}

/* HELPERS */
function vibrate(ms=12){ try { navigator.vibrate?.(ms) } catch(_){} }
function relTime(t){
  const s = Math.max(1, Math.round((Date.now() - +t)/1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s/60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m/60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h/24); return `${d}d ago`
}
function summary(a){
  switch (a.type) {
    case 'like': return 'liked your stream'
    case 'comment': return 'left a comment'
    case 'gift': return 'sent a gift'
    case 'join': return 'joined the live'
    case 'follow': return 'followed you'
    case 'star': return 'pinned your message'
    case 'superchat': return 'sent a SuperChat'
    default: return 'reacted'
  }
}
function onImgError(e){
  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="100%" height="100%" rx="12" fill="%2311203a"/><text x="50%" y="56%" font-size="28" text-anchor="middle" fill="white" font-family="Arial">👤</text></svg>'
}

/* CORE: push/queue/dismiss */
function nextId(){ return 'al_' + (++idSeed) + '_' + Math.random().toString(36).slice(2,7) }

function baseAlert(input){
  const now = Date.now()
  return {
    id: input.id || nextId(),
    type: input.type || 'info',
    user: input.user || '',
    text: input.text || '',
    avatar: input.avatar || '',
    meta: input.meta || {},
    at: input.at || now,
    // runtime
    pct: 0,
    until: now + (input.ttl || props.autoDismissMs),
    dragging: false, dx:0, dy:0,
    confetti: [],
  }
}

function playSound(type){
  if (!props.soundsEnabled) return
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    const f = ({ gift:880, superchat:740, like:660, comment:520, follow:600 }[type] || 500)
    o.frequency.setValueAtTime(f, ctx.currentTime)
    g.gain.value = 0.001
    g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.15)
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.15)
  } catch(_) {}
}

function burstConfetti(a){
  if (!['gift','superchat','star'].includes(a.type)) return
  const em = a.type === 'gift' ? ['🪙','🎉','✨','💎'] : (a.type==='superchat' ? ['💎','✨','🌟'] : ['⭐','✨'])
  for (let i=0;i<10;i++){
    a.confetti.push({ id: i+'-'+Date.now(), e: em[Math.floor(Math.random()*em.length)], x: 50+(Math.random()-0.5)*60, y: 60+(Math.random()-0.5)*30, s: 0.8+Math.random()*0.8 })
    setTimeout(() => { a.confetti.shift() }, 700 + i*20)
  }
}

function push(input){
  const a = baseAlert(input || {})
  if (paused.value) { queue.value.push(a); return }
  if (visible.value.length >= props.maxVisible) { queue.value.push(a); return }
  visible.value = props.placement === 'top' ? [a, ...visible.value] : [...visible.value, a]
  if (props.vibrateOnShow) vibrate(12)
  playSound(a.type)
  burstConfetti(a)
}
function dismiss(id){
  visible.value = visible.value.filter(x => x.id !== id)
  maybeDrain()
}
function clear(){
  visible.value = []; queue.value = []
}

/* DRAIN QUEUE */
function maybeDrain(){
  if (paused.value) return
  while (visible.value.length < props.maxVisible && queue.value.length) {
    const next = queue.value.shift()
    visible.value = props.placement === 'top' ? [next, ...visible.value] : [...visible.value, next]
    if (props.vibrateOnShow) vibrate(8)
    playSound(next.type)
    burstConfetti(next)
  }
}

/* TICK (progress + auto-dismiss) */
function tick(){
  if (paused.value) return
  const now = Date.now()
  for (const a of visible.value) {
    const ttl = Math.max(1, a.until - (a.at))
    const left = Math.max(0, a.until - now)
    a.pct = 100 - Math.round((left/ttl)*100)
    if (left <= 0) dismiss(a.id)
  }
}
onMounted(() => { tickTimer = setInterval(tick, 100) })
onBeforeUnmount(() => { clearInterval(tickTimer) })

/* PAUSE/RESUME */
function togglePause(){ paused.value = !paused.value; if (!paused.value) maybeDrain() }
function pause(){ paused.value = true }
function resume(){ paused.value = false; maybeDrain() }

/* SWIPE-to-dismiss */
function onDown(a, e){
  a.dragging = true; a.dx = 0; a.dy = 0; a._startX = e.clientX; a._startY = e.clientY
}
function onMove(a, e){
  if (!a.dragging) return
  a.dx = e.clientX - a._startX
  a.dy = e.clientY - a._startY
}
function onUp(a){
  if (!a.dragging) return
  a.dragging = false
  const commit = Math.abs(a.dx) > 56 || Math.abs(a.dy) > 48
  if (commit) dismiss(a.id)
  a.dx = 0; a.dy = 0
}
function onCancel(a){ a.dragging = false; a.dx = 0; a.dy = 0 }
const dragStyle = (a) => ({
  transform: `translate(${a.dx}px, ${a.dy}px)`,
  transition: a.dragging ? 'none' : 'transform .16s ease',
})

/* EXPOSE API */
defineExpose({ push, clear, pause, resume, togglePause, dismiss })
</script>

<style scoped>
/* Transitions */
.alert-enter-active, .alert-leave-active { transition: opacity .2s ease, transform .2s ease; }
.alert-enter-from, .alert-leave-to { opacity: 0; transform: translateY(6px) scale(.98); }
@media (prefers-reduced-motion: reduce) {
  .alert-enter-active, .alert-leave-active { transition: none; }
}

/* Buttons */
.i-btn {
  height: 32px; width: 32px; display:grid; place-items:center;
  border-radius: 9999px; background: rgba(0,0,0,.05);
  border: 1px solid rgba(0,0,0,.08);
}
:global(.dark) .i-btn { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.12); }
.i-btn:active { transform: translateY(1px); }

/* Controls pill */
.pill {
  height: 30px; padding: 0 10px; font-size: 12px; border-radius: 9999px;
  background: rgba(0,0,0,.05); border: 1px solid rgba(0,0,0,.08);
}
:global(.dark) .pill { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.12); }
.pill-on { background: linear-gradient(180deg, rgba(99,102,241,.35), rgba(59,130,246,.25)); color: white; }

/* Confetti emoji */
.confetti {
  position: absolute; pointer-events: none; font-size: 18px; opacity: .95;
  animation: pop .7s ease-out forwards;
}
@keyframes pop {
  from { transform: translateY(6px) scale(.8); opacity: .0 }
  to   { transform: translateY(-18px) scale(1.1); opacity: 0 }
}
</style>
