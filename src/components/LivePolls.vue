<template>
  <!-- Bottom sheet: safe-area aware -->
  <section
    v-if="open"
    ref="sheet"
    class="fixed inset-x-0 bottom-0 z-[9999] px-3 pb-3"
    :style="safeArea"
    role="dialog"
    aria-modal="true"
    :aria-label="`Poll: ${poll.question}`"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onCancel"
  >
    <!-- Card -->
    <div
      class="relative rounded-2xl border border-white/15 bg-white/85 dark:bg-[#0b1020]/85 backdrop-blur-xl shadow-2xl overflow-hidden select-none"
      :style="dragStyle"
    >
      <!-- Grab handle -->
      <div class="w-full grid place-items-center pt-2">
        <div class="h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/20"></div>
      </div>

      <!-- Header -->
      <header class="px-4 pt-1 pb-2 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="live-dot"></span>
          <h3 class="font-extrabold text-sm">Vote Now</h3>
          <span v-if="timeLeftText" class="text-[11px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10">
            ⏳ {{ timeLeftText }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button class="chip" @click.stop="sharePoll" title="Share">📤</button>
          <button class="chip" @click.stop="closeSheet" title="Close">✖</button>
        </div>
      </header>

      <!-- Question -->
      <div class="px-4 pb-2">
        <p class="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
          {{ poll.question }}
        </p>
        <p class="text-[11px] text-slate-500 dark:text-slate-400">
          {{ totalVotes }} vote{{ totalVotes===1?'':'s' }}
        </p>
      </div>

      <!-- Options -->
      <div class="px-3 pb-3 space-y-2">
        <button
          v-for="opt in localOptions"
          :key="opt.id"
          class="relative w-full text-left rounded-xl border overflow-hidden
                 bg-white/70 dark:bg-white/5 border-black/10 dark:border-white/10
                 active:scale-[.99] transition"
          :disabled="voted || pending"
          @click="castVote(opt.id)"
        >
          <!-- Progress bar -->
          <div
            class="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500/30 to-fuchsia-500/30 pointer-events-none"
            :style="{ width: voted ? pct(opt)+'%' : '0%' }"
          ></div>

          <div class="relative z-10 flex items-center gap-3 px-3 py-3">
            <div class="h-8 w-8 grid place-items-center rounded-full bg-black/5 dark:bg-white/10 text-lg">
              {{ opt.emoji || '✅' }}
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-[13px] truncate">{{ opt.label }}</span>
                <span v-if="voted && isLeader(opt)" class="text-[10px] px-1.5 py-[2px] rounded-full bg-amber-400/80 text-black font-bold">Leading</span>
              </div>
              <div class="text-[11px] text-slate-600 dark:text-slate-300">
                <template v-if="voted">
                  {{ opt.count }} • {{ pct(opt).toFixed(0) }}%
                </template>
                <template v-else>
                  Tap to vote
                </template>
              </div>
            </div>

            <div class="text-xl">{{ voted && chosenId===opt.id ? '🗳️' : '→' }}</div>
          </div>
        </button>
      </div>

      <!-- Footer actions -->
      <div class="px-4 pb-4 flex items-center justify-between">
        <button class="btn" @click="skip" v-if="!voted">Skip</button>
        <div class="text-[11px] text-slate-500 dark:text-slate-400" aria-live="polite">
          <template v-if="voted">
            ✅ Thanks! Your vote for <b>{{ labelOf(chosenId) }}</b> was recorded.
          </template>
          <template v-else-if="pending">Sending vote…</template>
        </div>
        <button class="btn-primary" @click="closeSheet">Done</button>
      </div>

      <!-- Confetti -->
      <span v-for="c in confetti" :key="c.id" class="confetti" :style="{ left:c.x+'%', top:c.y+'%', transform:`scale(${c.s})` }">{{ c.e }}</span>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

/** PROPS */
const props = defineProps({
  poll: {
    type: Object,
    default: () => ({
      id: 'poll-1',
      question: 'Which product do you love most?',
      closesAt: null, // timestamp (ms) or null
      options: [
        { id: 'smartbag', label: 'SmartBag', emoji: '🎒', count: 0 },
        { id: 'ecocup',   label: 'EcoCup',   emoji: '☕', count: 0 },
        { id: 'solarhat', label: 'SolarHat', emoji: '🧢', count: 0 },
      ],
    })
  },
  open: { type: Boolean, default: true },
  lockHours: { type: Number, default: 24 }, // prevent revote within X hours (local)
})

/** EMITS */
const emit = defineEmits(['close','vote','share'])

/** STATE */
const open = ref(props.open)
const localOptions = ref(props.poll.options.map(o => ({ ...o })))
const chosenId = ref(null)
const voted = ref(false)
const pending = ref(false)
const now = ref(Date.now())
let clock = null

/* Safe-area */
const safeArea = { paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 8px)' }

/* Vote memory (local lock) */
const lockKey = computed(() => `poll_lock_${props.poll.id}`)
onMounted(() => {
  // restore lock
  try {
    const raw = localStorage.getItem(lockKey.value)
    if (raw) {
      const { id, exp } = JSON.parse(raw)
      if (!exp || exp > Date.now()) {
        chosenId.value = id
        voted.value = true
      }
    }
  } catch {}
  // clock for countdown
  clock = setInterval(() => now.value = Date.now(), 1000)
})
onBeforeUnmount(() => clearInterval(clock))

/* Totals & percentages */
const totalVotes = computed(() => localOptions.value.reduce((a,b)=>a+(b.count||0), 0))
function pct(opt){ const t = Math.max(1, totalVotes.value); return (100 * (opt.count||0)) / t }
function isLeader(opt){
  const max = Math.max(...localOptions.value.map(o => o.count||0))
  return (opt.count||0) === max && max > 0
}
function labelOf(id){ return localOptions.value.find(o => o.id===id)?.label || '' }

/* Countdown */
const timeLeftText = computed(() => {
  const end = props.poll?.closesAt ? new Date(props.poll.closesAt).getTime() : null
  if (!end) return ''
  const diff = Math.max(0, end - now.value)
  const s = Math.floor(diff/1000), m = Math.floor(s/60), h = Math.floor(m/60)
  if (h) return `${h}h ${m%60}m`
  if (m) return `${m}m ${s%60}s`
  return `${s}s`
})

/* Voting */
async function castVote(id){
  if (voted.value || pending.value) return
  // local time lock check
  const existing = localStorage.getItem(lockKey.value)
  if (existing) {
    try {
      const { exp } = JSON.parse(existing)
      if (!exp || exp > Date.now()) {
        // Already voted within window
        vibrate(8)
        return
      }
    } catch {}
  }

  pending.value = true
  chosenId.value = id

  // optimistic increment
  const idx = localOptions.value.findIndex(o => o.id === id)
  if (idx >= 0) localOptions.value[idx].count = (localOptions.value[idx].count || 0) + 1

  vibrate(14)
  burstConfetti()

  // lock locally
  try {
    const exp = Date.now() + props.lockHours * 3600 * 1000
    localStorage.setItem(lockKey.value, JSON.stringify({ id, exp }))
  } catch {}

  // notify parent/backend
  emit('vote', { pollId: props.poll.id, optionId: id })

  // fake delay (remove if backend promises)
  await new Promise(r => setTimeout(r, 300))
  pending.value = false
  voted.value = true
}

/* Actions */
function skip(){ closeSheet() }
function closeSheet(){ open.value = false; emit('close') }
function sharePoll(){
  const url = location.href
  if (navigator.share) navigator.share({ title: 'Vote with me', text: props.poll.question, url }).catch(()=>{})
  else navigator.clipboard?.writeText(url)
  vibrate(10)
  emit('share')
}

/* Haptics & confetti */
function vibrate(ms=12){ try { navigator.vibrate?.(ms) } catch {} }
const confetti = ref([])
function burstConfetti(){
  const em = ['🎉','✨','🎊','💥','🌟']
  for (let i=0;i<12;i++){
    const id = Math.random().toString(36).slice(2,7)
    confetti.value.push({ id, e: em[i%em.length], x: 50+(Math.random()-0.5)*60, y: 40+(Math.random()-0.5)*40, s: .8+Math.random()*1 })
    setTimeout(() => confetti.value = confetti.value.filter(c => c.id !== id), 800 + i*20)
  }
}

/* Swipe-to-dismiss (vertical) */
const drag = ref({ dragging:false, sx:0, sy:0, dx:0, dy:0 })
function onDown(e){ drag.value = { dragging:true, sx:e.clientX, sy:e.clientY, dx:0, dy:0 } }
function onMove(e){
  if (!drag.value.dragging) return
  drag.value.dx = e.clientX - drag.value.sx
  drag.value.dy = Math.max(0, e.clientY - drag.value.sy) // only down
}
function onUp(){
  if (!drag.value.dragging) return
  const commit = drag.value.dy > 80
  drag.value.dragging = false
  if (commit) closeSheet()
  drag.value.dx = drag.value.dy = 0
}
function onCancel(){ drag.value.dragging=false; drag.value.dx=drag.value.dy=0 }
const dragStyle = computed(() => ({
  transform: `translateY(${drag.value.dy}px)`,
  transition: drag.value.dragging ? 'none' : 'transform .16s ease',
}))
</script>

<style scoped>
/* Live dot pulse */
.live-dot {
  width: 10px; height: 10px; border-radius: 9999px; background: #ef4444;
  box-shadow: 0 0 0 0 rgba(239,68,68,.6);
  animation: pulse 1.2s infinite;
}
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(239,68,68,.6) }
  70% { box-shadow: 0 0 0 8px rgba(239,68,68,0) }
  100%{ box-shadow: 0 0 0 0 rgba(239,68,68,0) }
}

/* Chips & Buttons */
.chip {
  padding: 6px 10px; border-radius: 9999px; font-size: 12px;
  background: rgba(0,0,0,.06); border: 1px solid rgba(0,0,0,.12);
}
:global(.dark) .chip { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.16) }

.btn {
  padding: 8px 12px; border-radius: 9999px; font-size: 13px;
  background: rgba(0,0,0,.06); border: 1px solid rgba(0,0,0,.12);
}
:global(.dark) .btn { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.16) }

.btn-primary {
  padding: 10px 14px; border-radius: 9999px; font-size: 13px; font-weight: 700; color: white;
  background: linear-gradient(180deg,#ef4444,#db2777);
  border: 1px solid rgba(255,255,255,.18);
  box-shadow: 0 8px 24px rgba(219,39,119,.35);
}

/* Confetti */
.confetti {
  position: absolute; pointer-events: none; font-size: 18px; opacity: .96;
  animation: conf-pop .75s ease-out forwards;
}
@keyframes conf-pop {
  from { transform: translateY(6px) scale(.8); opacity: .0 }
  to   { transform: translateY(-16px) scale(1.1); opacity: 0 }
}

/* Reduce motion */
@media (prefers-reduced-motion: reduce){
  * { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
</style>
