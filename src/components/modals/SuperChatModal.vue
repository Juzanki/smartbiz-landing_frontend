<!-- SuperChatStrategicSheet.vue -->
<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
    role="dialog" aria-modal="true" aria-labelledby="sc-title"
    @click.self="!loading && close('backdrop')" @keydown.esc.prevent="!loading && close('esc')"
  >
    <!-- Bottom Sheet -->
    <section
      ref="sheet"
      class="w-full sm:w-[92%] max-w-md max-h-[92vh]
             rounded-t-3xl sm:rounded-2xl overflow-hidden select-none
             bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100
             ring-1 ring-black/10 dark:ring-white/10 shadow-2xl animate-in flex flex-col"
      :style="dragStyle"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <!-- Handle -->
      <div class="sm:hidden pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
      </div>

      <!-- Header -->
      <header class="px-5 pt-2 pb-3 sm:p-5 flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10">
        <div>
          <h2 id="sc-title" class="text-base sm:text-lg font-bold text-pink-600 dark:text-pink-400">💬 Send SuperChat</h2>
          <p class="text-[12px] text-zinc-500 dark:text-zinc-400">
            Balance: <b>{{ format(balance) }}</b> • Daily left: <b>{{ format(remainingDaily) }}</b>
          </p>
        </div>
        <button
          class="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          :disabled="loading" aria-label="Close" @click="close('x')">✕</button>
      </header>

      <!-- Body -->
      <div class="px-5 pb-4 sm:pb-5 space-y-4 overflow-y-auto">

        <!-- Strategic Preview -->
        <div class="rounded-2xl p-4 text-white shadow-lg border border-white/10 relative" :style="previewStyle" aria-label="Preview">
          <div class="flex items-center justify-between">
            <div class="text-sm font-semibold truncate">
              <span class="opacity-90">{{ anon ? 'Anonymous' : username }}</span>
              <span class="ml-2 px-2 py-0.5 rounded-full text-[11px] bg-white/20">{{ tierLabel }}</span>
            </div>
            <div class="text-lg font-extrabold drop-shadow-sm">{{ format(amount) }} 🪙</div>
          </div>
          <p class="mt-2 text-sm leading-snug break-words">{{ message || 'Your message will appear here…' }}</p>
          <div class="absolute inset-0 pointer-events-none rounded-2xl" :style="shine"></div>
          <!-- strategic hint -->
          <div class="mt-3 text-[12px] bg-black/20 rounded-full px-2 py-1 w-fit">
            {{ strategyHint }}
          </div>
        </div>

        <!-- Message -->
        <div>
          <label class="text-sm font-semibold block mb-1">Message</label>
          <div class="relative">
            <input
              v-model.trim="message"
              type="text" :maxlength="charLimit"
              placeholder="Say something nice ✨"
              class="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 ring-pink-400 dark:ring-pink-500"
              :class="{'ring-rose-400 dark:ring-rose-500': errors.message}"
            />
            <div class="absolute right-2 bottom-1.5 text-[11px] text-zinc-500">{{ message.length }}/{{ charLimit }}</div>
          </div>
          <div class="mt-2 flex gap-1 flex-wrap text-xl">
            <button v-for="e in emojis" :key="e" class="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800" @click="appendEmoji(e)">{{ e }}</button>
          </div>
          <p v-if="errors.message" class="mt-1 text-[12px] text-rose-600">{{ errors.message }}</p>
        </div>

        <!-- Amount -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-sm font-semibold">Amount (Coins)</label>
            <span class="text-[12px] text-zinc-500">Highlight ~ {{ approxDuration }}s</span>
          </div>

          <!-- Quick chips (auto-fit to balance & caps) -->
          <div class="grid grid-cols-3 gap-2 mb-2">
            <button
              v-for="v in quickAmounts" :key="v"
              class="px-3 py-2 rounded-xl text-sm border"
              :class="amount===v
                ? 'bg-pink-600 text-white border-pink-600'
                : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'"
              :disabled="v>effectiveMax || v>balance || v>remainingDaily"
              @click="amount=v"
            >
              {{ format(v) }}
            </button>
          </div>

          <div class="flex items-center gap-2">
            <input v-model.number="amount" type="number" :min="minAmount" :max="effectiveMax" step="1"
                   class="w-28 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 ring-pink-400 dark:ring-pink-500"/>
            <input v-model.number="amount" type="range" :min="minAmount" :max="effectiveMax" step="1" class="flex-1"/>
            <button
              v-if="insufficient"
              class="px-3 py-2 rounded-full text-xs font-semibold bg-yellow-400 text-black"
              @click="$emit('recharge')"
            >Recharge</button>
          </div>

          <!-- Limits & slow mode -->
          <div class="mt-1 text-[12px] text-zinc-500 space-y-0.5">
            <div>Per-message cap: {{ format(maxPerMessage) }} • Daily cap: {{ format(dailyCap) }}</div>
            <div v-if="cooldownLeft>0">⏱️ Slow mode: wait {{ cooldownLeft }}s</div>
          </div>

          <p v-if="errors.amount" class="mt-1 text-[12px] text-rose-600">{{ errors.amount }}</p>
        </div>

        <!-- Options -->
        <div class="grid grid-cols-2 gap-2 text-[13px]">
          <label class="flex items-center gap-2 rounded-xl px-3 py-2 bg-zinc-100 dark:bg-zinc-800">
            <input type="checkbox" v-model="anon" /> Anonymous
          </label>
          <label class="flex items-center gap-2 rounded-xl px-3 py-2 bg-zinc-100 dark:bg-zinc-800" :class="pinAllowed ? '' : 'opacity-60'">
            <input type="checkbox" v-model="pin" :disabled="!pinAllowed"/> Pin to top (≥ {{ format(pinThreshold) }})
          </label>
        </div>

        <!-- Inline global error -->
        <div v-if="globalError" class="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-[12px] px-3 py-2">
          {{ globalError }}
        </div>
      </div>

      <!-- Footer -->
      <footer class="px-5 py-3 border-t border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/70 backdrop-blur flex items-center justify-between">
        <button class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-200 dark:bg-zinc-800" :disabled="loading" @click="close('cancel')">Cancel</button>
        <button
          class="rounded-full px-4 py-2 text-xs font-semibold text-white
                 bg-pink-600 hover:bg-pink-700 disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="!canSend || loading"
          @click="send"
        >
          <span v-if="!loading">Send</span>
          <span v-else>Sending…</span>
        </button>
      </footer>

      <!-- Safe-area spacer -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/** Props & Emits */
const props = defineProps({
  open: { type: Boolean, default: true },
  balance: { type: Number, default: 1000 },
  username: { type: String, default: 'You' },
  /** strategy limits */
  minAmount: { type: Number, default: 10 },
  maxPerMessage: { type: Number, default: 5000 },
  dailyCap: { type: Number, default: 10000 },
  sentToday: { type: Number, default: 0 },
  cooldownSec: { type: Number, default: 8 },      // slow-mode
  pinThreshold: { type: Number, default: 500 }    // min coins required to allow pin toggle
})
const emit = defineEmits(['close','send','recharge'])

/** State */
const message = ref('')
const amount  = ref(props.minAmount)
const anon    = ref(false)
const pin     = ref(false)
const loading = ref(false)
const charLimit = 140
const globalError = ref('')
const errors = ref({ message:'', amount:'' })
const lastSentAt = ref(0)
const cooldownLeft = ref(0)
let cooldownTimer = null
let lastMessage = ''

/** Emojis & quick amounts */
const emojis = ['✨','🙏','🔥','💖','🎉','👏','🌟','💎']

/** Computed strategy */
const remainingDaily = computed(()=> Math.max(0, props.dailyCap - props.sentToday))
const effectiveMax = computed(()=> Math.max(props.minAmount, Math.min(props.maxPerMessage, props.balance, remainingDaily.value || props.maxPerMessage)))
const insufficient = computed(()=> amount.value > props.balance)
const pinAllowed = computed(()=> amount.value >= props.pinThreshold)
const canSend = computed(()=>{
  const msgOk = message.value.trim().length >= 3
  const amtOk = amount.value >= props.minAmount && amount.value <= effectiveMax.value
  const notCooling = cooldownLeft.value <= 0
  const notInsufficient = !insufficient.value
  return msgOk && amtOk && notCooling && notInsufficient
})
const sliderMax = computed(()=> effectiveMax.value)

/** Tier logic */
const tier = computed(()=>{
  const v = Number(amount.value||0)
  if (v >= 2000) return 'supreme'
  if (v >= 1000) return 'legendary'
  if (v >= 500)  return 'epic'
  if (v >= 250)  return 'rare'
  if (v >= 100)  return 'plus'
  return 'lite'
})
const tierLabel = computed(()=> ({ lite:'Lite', plus:'Plus', rare:'Rare', epic:'Epic', legendary:'Legendary', supreme:'Supreme' }[tier.value]))
const gradients = {
  lite:      'linear-gradient(135deg,#6366f1 0%,#a78bfa 100%)',
  plus:      'linear-gradient(135deg,#10b981 0%,#34d399 100%)',
  rare:      'linear-gradient(135deg,#06b6d4 0%,#60a5fa 100%)',
  epic:      'linear-gradient(135deg,#f59e0b 0%,#f97316 100%)',
  legendary: 'linear-gradient(135deg,#ef4444 0%,#f43f5e 100%)',
  supreme:   'linear-gradient(135deg,#f59e0b 0%,#ef4444 40%,#8b5cf6 100%)'
}
const previewStyle = computed(()=> ({ background: gradients[tier.value] }))
const shine = computed(()=> ({
  background: 'radial-gradient(600px circle at 0 0, rgba(255,255,255,.12), transparent 40%), radial-gradient(600px circle at 100% 100%, rgba(255,255,255,.08), transparent 40%)',
  mixBlendMode: 'overlay'
}))
const approxDuration = computed(()=> Math.min(300, Math.max(10, Math.round(amount.value * 0.6)))) // seconds
const strategyHint = computed(()=>{
  if (amount.value < props.pinThreshold) {
    const delta = props.pinThreshold - amount.value
    return `Tip: add ${format(delta)} to unlock Pin.`
  }
  if (amount.value >= 1000) return 'Ultra highlight & long pin duration.'
  if (amount.value >= 250)  return 'High visibility — great for shoutouts.'
  return 'Starter highlight — perfect for quick support.'
})

/** Quick amounts (auto based on balance & caps) */
const quickAmounts = computed(()=>{
  const base = [props.minAmount, props.minAmount*5, props.minAmount*10, Math.round((props.balance*0.25)), Math.round((props.balance*0.5))]
  const capped = base
    .map(v=>Math.min(v, sliderMax.value))
    .filter(v=>v>=props.minAmount)
    .map(v=>Math.max(props.minAmount, Math.floor(v)))
  const uniq = [...new Set(capped)].sort((a,b)=>a-b).slice(0,6)
  return uniq.length ? uniq : [props.minAmount]
})

/** Actions */
function appendEmoji(e){ message.value = (message.value || '') + e; buzz(8) }
function validate(){
  errors.value = { message:'', amount:'' }
  const text = message.value.trim()
  if (text.length < 3) errors.value.message = 'Minimum 3 characters.'
  if (amount.value < props.minAmount) errors.value.amount = `Minimum is ${format(props.minAmount)}.`
  if (amount.value > effectiveMax.value) errors.value.amount = `Max allowed now is ${format(effectiveMax.value)}.`
  if (insufficient.value) errors.value.amount = `Insufficient balance. Need ${format(amount.value - props.balance)} more.`
  if (cooldownLeft.value > 0) errors.value.amount = `Wait ${cooldownLeft.value}s (slow mode).`
  if (lastMessage && lastMessage === text && Date.now() - lastSentAt.value < 10000) {
    errors.value.message = 'Duplicate message detected. Try adding a bit more 🙂'
  }
  globalError.value = (errors.value.message || errors.value.amount) ? 'Please fix the highlighted fields.' : ''
}

async function send(){
  validate()
  if (!canSend.value){ buzz(12); return }
  loading.value = true
  buzz(16)

  // sanitize (simple)
  const clean = softClean(message.value.trim())

  setTimeout(()=>{
    emit('send', {
      message: clean,
      amount: Number(amount.value),
      tier: tier.value,
      anon: anon.value,
      pin: pin.value && pinAllowed.value,
      durationSec: approxDuration.value,
      at: Date.now()
    })
    // cooldown start
    lastMessage = clean
    lastSentAt.value = Date.now()
    startCooldown()
    loading.value = false
    close('sent')
  }, 650)
}

/** Cooldown (slow-mode) */
function startCooldown(){
  stopCooldown()
  cooldownLeft.value = props.cooldownSec
  cooldownTimer = setInterval(()=>{
    cooldownLeft.value--
    if (cooldownLeft.value <= 0) stopCooldown()
  }, 1000)
}
function stopCooldown(){ if (cooldownTimer){ clearInterval(cooldownTimer); cooldownTimer = null } }

/** Utils */
function buzz(ms=10){ try{ navigator?.vibrate?.(ms) }catch{} }
function format(n){ return Number(n||0).toLocaleString() }
function softClean(t){
  const bad = ['damn','shit','fuck'] // mfano mdogo; badilisha na kamusi yako
  let s = t
  bad.forEach(word => { s = s.replace(new RegExp(`\\b${word}\\b`, 'ig'), '***') })
  return s
}

/** Close */
function close(reason){ if (loading.value) return; emit('close', { reason }) }

/** Reset on open */
watch(()=>props.open, (v)=>{ if(v){ globalError.value=''; errors.value={message:'', amount:''} } })

/** Swipe-to-close */
const startY = ref(0), dY = ref(0), dragging = ref(false)
const dragStyle = computed(()=>{
  if(!dragging.value) return {}
  const y=Math.max(0,dY.value), op=Math.max(1 - y/240, .5)
  return { transform:`translateY(${y}px)`, opacity:op }
})
function onTouchStart(e){ if(e.touches?.length!==1 || loading.value) return; dragging.value=true; startY.value=e.touches[0].clientY; dY.value=0 }
function onTouchMove(e){ if(!dragging.value) return; dY.value=e.touches[0].clientY - startY.value }
function onTouchEnd(){ if(!dragging.value) return; dragging.value=false; if(dY.value>120) close('swipe'); dY.value=0 }

/** Clean up */
onBeforeUnmount(()=>{ stopCooldown() })
onMounted(()=>{ /* could hydrate last state if you want */ })
</script>

<style scoped>
/* Entrance */
@keyframes in { from{ opacity:0; transform: translateY(40px) scale(.98) } to{ opacity:1; transform:none } }
.animate-in{ animation: in .28s cubic-bezier(.22,1,.36,1) both; will-change: opacity, transform }

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .backdrop-blur-sm{ backdrop-filter: none !important; }
}
</style>
