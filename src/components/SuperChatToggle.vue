<template>
  <!-- Trigger (optional) -->
  <button v-if="showTrigger" @click="open = true" class="btn-trigger">💰 Super Chat</button>

  <!-- Overlay + Sheet -->
  <transition name="fade">
    <section v-if="open" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center md:justify-center" @click.self="close">
      <div
        class="w-[92vw] max-w-sm md:max-w-md md:w-[28rem] rounded-t-2xl md:rounded-2xl bg-white text-black dark:bg-[#151515] dark:text-white shadow-2xl border border-black/10 dark:border-white/10 p-4 md:p-5"
        :style="safeArea"
        role="dialog"
        aria-label="Send Super Chat"
      >
        <!-- Header -->
        <header class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <div class="h-9 w-9 rounded-xl grid place-items-center text-lg shadow
                        bg-gradient-to-br from-amber-400 to-pink-500">💬</div>
            <div class="leading-tight">
              <h3 class="text-base font-extrabold">Send Super Chat</h3>
              <p class="text-[11px] opacity-70">
                <span :class="['px-2 py-0.5 rounded-full',
                              online ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600']">
                  {{ online ? 'Online' : 'Offline' }}
                </span>
                <span v-if="balance !== null" class="ml-2">Balance: <b>{{ fmtMoney(balance) }}</b></span>
              </p>
            </div>
          </div>
          <button class="btn-icon" @click="close" aria-label="Close">✖</button>
        </header>

        <!-- Tier banner -->
        <div class="rounded-xl p-3 mb-3 flex items-center justify-between border"
             :class="tierClass">
          <div class="text-sm">
            <p class="font-bold">{{ tier.label }} Super Chat</p>
            <p class="text-xs opacity-80">{{ tier.desc }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold">{{ fmtMoney(amount || 0) }}</p>
            <p class="text-[11px] opacity-70">Fee ~{{ feePct }}% ≈ {{ fmtMoney(feeAmount) }}</p>
          </div>
        </div>

        <!-- Message -->
        <label class="label">Your Message</label>
        <div class="relative">
          <textarea
            v-model.trim="message"
            rows="3"
            :maxlength="charLimit"
            class="input resize-none"
            placeholder="Say something awesome…"
          />
          <div class="absolute bottom-2 right-3 text-[11px] opacity-60">{{ message.length }}/{{ charLimit }}</div>
        </div>

        <!-- Emojis -->
        <div class="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
          <button v-for="(e,i) in emojis" :key="i" class="chip" @click="addEmoji(e)">{{ e }}</button>
        </div>

        <!-- Amount -->
        <div class="mt-3 grid grid-cols-3 gap-2">
          <div class="col-span-3">
            <label class="label">Amount ({{ currency }})</label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="amount"
                type="number"
                :min="min"
                :max="max"
                inputmode="numeric"
                class="input flex-1"
                :placeholder="String(min)"
              />
              <button class="btn-icon" @click="step(-stepValue)" :disabled="amount<=min">➖</button>
              <button class="btn-icon" @click="step(+stepValue)" :disabled="amount>=max">➕</button>
            </div>
          </div>

          <button v-for="p in presets" :key="p" class="chip w-full" @click="amount = p">{{ fmtShort(p) }}</button>
        </div>

        <!-- Optional PIN -->
        <transition name="fade">
          <div v-if="requirePin" class="mt-3">
            <label class="label">PIN (6-digit)</label>
            <input v-model="pin" maxlength="6" inputmode="numeric" class="input tracking-widest text-center" placeholder="••••••" />
          </div>
        </transition>

        <!-- Options -->
        <div class="mt-3 flex items-center justify-between">
          <label class="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" v-model="anonymous" class="accent-amber-500" />
            Send as Anonymous
          </label>
          <button class="text-xs underline opacity-80" @click="previewOpen = !previewOpen">{{ previewOpen ? 'Hide' : 'Preview' }}</button>
        </div>

        <!-- Preview -->
        <transition name="fade">
          <div v-if="previewOpen" class="mt-3 rounded-xl p-3 border bg-black/5 dark:bg-white/5">
            <div class="flex items-start gap-3">
              <div class="h-10 w-10 rounded-full grid place-items-center text-lg"
                   :class="tierBadgeClass">💰</div>
              <div class="text-sm flex-1">
                <p class="font-semibold">
                  {{ anonymous ? 'Anonymous' : previewName }} • {{ fmtMoney(amount || 0) }}
                </p>
                <p class="opacity-90">{{ message || 'Your message will appear here…' }}</p>
              </div>
            </div>
          </div>
        </transition>

        <!-- Actions -->
        <div class="mt-4 grid grid-cols-2 gap-2">
          <button class="btn-soft" @click="close">Cancel</button>
          <button
            class="btn-primary"
            :disabled="!canSend || sending || !online"
            @click="onSend"
          >
            <span v-if="!sending">Send</span>
            <span v-else class="inline-flex items-center gap-1"><span class="animate-spin">⏳</span> Sending…</span>
          </button>
        </div>

        <!-- Error / Info -->
        <p v-if="err" class="mt-2 text-sm text-rose-600">{{ err }}</p>
        <p class="mt-2 text-[11px] opacity-60">
          By sending you agree to community guidelines. Charges include platform fee ~{{ feePct }}%.
        </p>
      </div>
    </section>
  </transition>

  <!-- Toast -->
  <transition name="fade">
    <div v-if="toast" class="fixed left-1/2 -translate-x-1/2 bottom-24 z-[60] bg-black/80 text-white text-xs px-3 py-2 rounded-xl shadow">
      {{ toast }}
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/* Props */
const props = defineProps({
  modelValue: { type: Boolean, default: false },      // v-model open
  showTrigger: { type: Boolean, default: false },
  min: { type: Number, default: 500 },
  max: { type: Number, default: 500000 },
  presets: { type: Array,  default: () => [500, 1000, 2000, 5000, 10000] },
  stepValue: { type: Number, default: 500 },
  currency: { type: String, default: 'TZS' },
  feePct: { type: Number, default: 5 },
  balance: { type: Number, default: null },           // if provided, we validate ≤ balance
  requirePin: { type: Boolean, default: false },
  previewName: { type: String, default: 'You' }
})
const emit = defineEmits(['update:modelValue','send'])

/* State */
const open = ref(props.modelValue)
const message = ref('')
const amount = ref(props.presets[0] || props.min)
const pin = ref('')
const anonymous = ref(false)
const previewOpen = ref(true)
const sending = ref(false)
const err = ref('')
const toast = ref('')

/* Online status */
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
function onOnline(){ online.value = true }
function onOffline(){ online.value = false }

/* UX */
const charLimit = 160
const emojis = ['🔥','❤️','👏','🚀','💎','🙌','✨','🎉','😄','🙏']
const safeArea = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }

/* Computed */
const feeAmount = computed(() => Math.round((amount.value || 0) * (props.feePct/100)))
const totalCost = computed(() => (amount.value || 0) + feeAmount.value)
const canSend = computed(() => {
  const amtOk = amount.value >= props.min && amount.value <= props.max
  const balOk = props.balance === null || totalCost.value <= props.balance
  const pinOk = !props.requirePin || /^\d{6}$/.test(pin.value)
  return amtOk && balOk && message.value.length > 0 && pinOk
})

/* Tiering */
const tier = computed(() => {
  const a = amount.value || 0
  if (a >= 100000) return { label: 'Supreme', desc: 'Front-row highlight & animated frame' }
  if (a >= 50000)  return { label: 'Legendary', desc: 'Priority highlight & long pin' }
  if (a >= 10000)  return { label: 'Epic', desc: 'Bold highlight & pin' }
  if (a >= 2000)   return { label: 'Rare', desc: 'Highlight' }
  return { label: 'Lite', desc: 'Standard Super Chat' }
})
const tierClass = computed(() => ({
  'bg-amber-50 border-amber-200 text-amber-800': tier.value.label==='Lite',
  'bg-cyan-50 border-cyan-200 text-cyan-800': tier.value.label==='Rare',
  'bg-violet-50 border-violet-200 text-violet-800': tier.value.label==='Epic',
  'bg-yellow-50 border-yellow-200 text-yellow-800': tier.value.label==='Legendary',
  'bg-pink-50 border-pink-200 text-pink-800': tier.value.label==='Supreme'
}))
const tierBadgeClass = computed(() => ({
  'bg-amber-500/20 text-amber-600': tier.value.label==='Lite',
  'bg-cyan-500/20 text-cyan-600': tier.value.label==='Rare',
  'bg-violet-500/20 text-violet-600': tier.value.label==='Epic',
  'bg-yellow-500/20 text-yellow-600': tier.value.label==='Legendary',
  'bg-pink-500/20 text-pink-600': tier.value.label==='Supreme'
}))

/* Methods */
function addEmoji(e){ message.value = (message.value + ' ' + e).trim(); vibe(6) }
function step(delta){ amount.value = clamp(amount.value + delta, props.min, props.max); vibe(4) }
function clamp(v, lo, hi){ return Math.min(hi, Math.max(lo, v || 0)) }
function fmtMoney(n){ return new Intl.NumberFormat('sw-TZ', { style:'currency', currency: props.currency, maximumFractionDigits:0 }).format(n||0) }
function fmtShort(n){ return new Intl.NumberFormat('en', { notation:'compact', maximumFractionDigits:1 }).format(n) }
function vibe(ms){ try{ navigator.vibrate?.(ms) }catch{} }

async function onSend(){
  err.value = ''
  if (!canSend.value){
    if (props.balance !== null && totalCost.value > props.balance) err.value = `Insufficient balance (need ${fmtMoney(totalCost.value)})`
    else err.value = 'Please check message, amount and PIN'
    return
  }
  try{
    sending.value = true
    // 👉 TODO: Replace with real API call
    await new Promise(r => setTimeout(r, 600))
    emit('send', {
      message: message.value,
      amount: amount.value,
      currency: props.currency,
      fee: feeAmount.value,
      total: totalCost.value,
      anonymous: anonymous.value,
      pin: props.requirePin ? pin.value : undefined,
      ts: Date.now()
    })
    toastMsg('🎉 Super Chat sent')
    resetForm()
    close()
  }catch(e){
    err.value = 'Failed to send. Try again.'
  }finally{
    sending.value = false
  }
}

function resetForm(){
  message.value = ''
  amount.value = props.presets[0] || props.min
  pin.value = ''
  anonymous.value = false
}
function close(){ open.value = false; emit('update:modelValue', false) }
function toastMsg(m){ toast.value = m; vibe(8); setTimeout(()=> toast.value = '', 1500) }

/* v-model sync */
watch(() => props.modelValue, v => open.value = v)
watch(open, v => emit('update:modelValue', v))

/* lifecycle */
onMounted(()=>{
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
})
onBeforeUnmount(()=>{
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})
</script>

<style scoped>
/* Buttons */
.btn-trigger{ @apply bg-green-700 hover:bg-green-600 text-white px-4 py-2 text-sm rounded-full shadow; }
.btn-primary{ @apply h-11 rounded-xl bg-emerald-600 text-white font-bold shadow hover:bg-emerald-500 active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed; }
.btn-soft{ @apply h-11 rounded-xl bg-black/5 dark:bg-white/10 text-black dark:text-white font-semibold hover:bg-black/10 dark:hover:bg-white/20; }
.btn-icon{ @apply h-9 w-9 grid place-items-center rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-sm; }

/* Inputs */
.input{ @apply w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1b1b1b] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400; }
.label{ @apply text-xs font-medium opacity-80 mb-1 block; }

/* Chips */
.chip{ @apply px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-xs hover:bg-black/10 dark:hover:bg-white/15 whitespace-nowrap; }

/* Animations */
.no-scrollbar::-webkit-scrollbar{ display:none }
.fade-enter-active,.fade-leave-active{ transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to{ opacity:0 }
</style>
