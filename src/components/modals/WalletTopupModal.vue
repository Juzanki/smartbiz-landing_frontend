<!-- WalletTopupSheet.vue -->
<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
    role="dialog" aria-modal="true" aria-labelledby="topup-title"
    @click.self="close('backdrop')" @keydown.esc.prevent="close('esc')"
  >
    <!-- Bottom Sheet -->
    <section
      ref="sheet"
      class="w-full sm:w-[92%] max-w-lg max-h-[92vh]
             rounded-t-3xl sm:rounded-2xl overflow-hidden select-none
             bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100
             ring-1 ring-black/10 dark:ring-white/10 shadow-2xl animate-in flex flex-col"
      :style="dragStyle"
      @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend.passive="onTouchEnd"
    >
      <!-- Handle (mobile) -->
      <div class="sm:hidden pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
      </div>

      <!-- Header -->
      <header class="px-5 pt-2 pb-3 sm:p-5 flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10">
        <div>
          <h2 id="topup-title" class="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            💰 Wallet Top-up
          </h2>
          <p class="text-[12px] text-zinc-500">
            Balance: <b>{{ format(balance) }} {{ currency }}</b>
          </p>
        </div>
        <button
          class="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Close" @click="close('x')">✕</button>
      </header>

      <!-- Body -->
      <div class="px-5 pb-4 sm:pb-5 space-y-5 overflow-y-auto">
        <!-- Amount -->
        <div>
          <label class="text-sm font-semibold block mb-1">Amount</label>
          <div class="flex items-stretch gap-2">
            <div class="relative flex-1">
              <input
                ref="amountRef"
                v-model.number="amount"
                type="text"
                inputmode="decimal"
                pattern="[0-9]*"
                :placeholder="`e.g., ${format(20000)}`"
                class="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-4 py-3 text-lg font-semibold tracking-wide outline-none focus:ring-2 ring-indigo-400 dark:ring-indigo-500"
              />
              <div class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">{{ currency }}</div>
            </div>
            <select v-model="currency" class="rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm">
              <option value="TZS">TZS</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <!-- Quick chips -->
          <div class="mt-2 grid grid-cols-3 gap-2">
            <button v-for="v in quickAmounts" :key="v"
              class="px-3 py-2 rounded-xl text-sm border transition"
              :class="amount===v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700'"
              @click="setAmount(v)"
            >{{ format(v) }}</button>
          </div>
          <p v-if="errors.amount" class="mt-1 text-[12px] text-rose-600">{{ errors.amount }}</p>
          <p v-else class="mt-1 text-[12px] text-zinc-500">Min {{ format(min) }}, Max {{ format(max) }} ({{ currency }}).</p>
        </div>

        <!-- Methods -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-semibold">Payment method</label>
            <button class="text-[12px] underline text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300" @click="explainFees = !explainFees">
              {{ explainFees ? 'Hide fees' : 'Show fees' }}
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="m in availableMethods" :key="m"
              class="p-3 rounded-xl border text-left transition flex items-center gap-3"
              :class="method===m ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30' : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'"
              @click="selectMethod(m)"
            >
              <span class="text-xl">{{ methodIcon(m) }}</span>
              <div class="flex-1">
                <div class="text-sm font-semibold">{{ methodLabel(m) }}</div>
                <div v-if="explainFees" class="text-[11px] text-zinc-500">
                  Fee: {{ feeLabel(m) }} • ETA: {{ etaLabel(m) }}
                </div>
              </div>
              <span v-if="method===m" class="text-indigo-600 text-lg">✔</span>
            </button>
          </div>
        </div>

        <!-- Method-specific fields -->
        <div v-if="method==='mpesa'">
          <label class="text-sm font-semibold block mb-1">M-Pesa phone</label>
          <input v-model.trim="mpesaPhone" type="tel" inputmode="tel" placeholder="e.g., 07xx xxx xxx"
                 class="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-400 dark:ring-indigo-500"/>
          <p class="mt-1 text-[12px] text-zinc-500">We’ll send a STK prompt to this number.</p>
        </div>

        <div v-else-if="method==='card'" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div class="sm:col-span-2">
            <label class="text-sm font-semibold block mb-1">Card number (demo)</label>
            <input v-model.trim="cardNumber" inputmode="numeric" placeholder="4242 4242 4242 4242"
                   class="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-400 dark:ring-indigo-500"/>
          </div>
          <div>
            <label class="text-sm font-semibold block mb-1">Expiry (MM/YY)</label>
            <input v-model.trim="cardExp" inputmode="numeric" placeholder="02/27"
                   class="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-400 dark:ring-indigo-500"/>
          </div>
          <div>
            <label class="text-sm font-semibold block mb-1">CVC</label>
            <input v-model.trim="cardCvc" inputmode="numeric" placeholder="123"
                   class="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-400 dark:ring-indigo-500"/>
          </div>
        </div>

        <div v-else-if="method==='paypal'">
          <label class="text-sm font-semibold block mb-1">PayPal email</label>
          <input v-model.trim="paypalEmail" type="email" placeholder="you@example.com"
                 class="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-400 dark:ring-indigo-500"/>
        </div>

        <div v-else-if="method==='crypto'">
          <label class="text-sm font-semibold block mb-1">Network</label>
          <select v-model="cryptoNet" class="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm">
            <option value="USDT-TRC20">USDT-TRC20</option>
            <option value="USDT-ERC20">USDT-ERC20</option>
            <option value="BTC">BTC</option>
          </select>
          <p class="mt-1 text-[12px] text-zinc-500">We’ll display a deposit address after confirming.</p>
        </div>

        <!-- Summary -->
        <div class="rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
          <div class="flex items-center justify-between text-sm">
            <span>Amount</span><b>{{ format(amountValid ? amount : 0) }} {{ currency }}</b>
          </div>
          <div class="flex items-center justify-between text-sm mt-1">
            <span>Fee ({{ methodLabel(method) }})</span><b>{{ format(fee) }} {{ currency }}</b>
          </div>
          <div class="flex items-center justify-between text-sm mt-1">
            <span class="flex items-center gap-2">Total to pay <span class="text-[11px] text-zinc-500">(ETA {{ etaLabel(method) }})</span></span>
            <b>{{ format(total) }} {{ currency }}</b>
          </div>
        </div>

        <!-- Inline error -->
        <div v-if="globalError" class="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-[12px] px-3 py-2">
          {{ globalError }}
        </div>
      </div>

      <!-- Footer -->
      <footer class="px-5 py-3 border-t border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/70 backdrop-blur flex items-center justify-between">
        <button class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-200 dark:bg-zinc-800" :disabled="loading" @click="close('cancel')">Cancel</button>
        <button
          class="rounded-full px-4 py-2 text-xs font-semibold text-white
                 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="!canConfirm || loading"
          @click="confirm"
        >
          <span v-if="!loading">Confirm & Top-up</span>
          <span v-else>Processing…</span>
        </button>
      </footer>

      <!-- Safe-area spacer -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

/** Props & Emits */
const props = defineProps({
  open: { type: Boolean, default: true },
  balance: { type: Number, default: 0 },
  min: { type: Number, default: 2000 },             // min top-up per txn
  max: { type: Number, default: 2_000_000 },        // max top-up per txn
  initialCurrency: { type: String, default: 'TZS' },
  methods: { type: Array, default: () => ['mpesa','card','paypal','crypto'] }
})
const emit = defineEmits(['close','confirm'])

/** State */
const currency = ref(props.initialCurrency)
const amount = ref(0)
const method = ref('mpesa')
const mpesaPhone = ref('')
const cardNumber = ref('')
const cardExp = ref('')
const cardCvc = ref('')
const paypalEmail = ref('')
const cryptoNet = ref('USDT-TRC20')
const explainFees = ref(false)
const loading = ref(false)
const amountRef = ref(null)
const errors = ref({ amount: '' })
const globalError = ref('')

/** Methods availability */
const availableMethods = computed(()=> props.methods)

/** Fees (flat + percent by method, rough demo values) */
const feeTable = {
  TZS: {
    mpesa:  { flat: 300,  pct: 0.012, min: 300,  max: 7000, eta: 'Instant' },
    card:   { flat: 0,    pct: 0.029, min: 600,  max: 120000, eta: '~1–2m' },
    paypal: { flat: 0,    pct: 0.034, min: 700,  max: 150000, eta: '~1–2m' },
    crypto: { flat: 0,    pct: 0.004, min: 400,  max: 50000,  eta: '~5–15m' }
  },
  USD: {
    mpesa:  { flat: 0.15, pct: 0.012, min: 0.15, max: 3.0,    eta: 'Instant' },
    card:   { flat: 0,    pct: 0.029, min: 0.3,  max: 60,     eta: '~1–2m' },
    paypal: { flat: 0,    pct: 0.034, min: 0.35, max: 70,     eta: '~1–2m' },
    crypto: { flat: 0,    pct: 0.004, min: 0.2,  max: 25,     eta: '~5–15m' }
  }
}

/** Quick chips based on min/max */
const quickAmounts = computed(()=>{
  const base = [props.min, props.min*5, props.min*10, Math.round(props.max*0.1), Math.round(props.max*0.25), Math.round(props.max*0.5)]
  const uniq = [...new Set(base)].filter(v=>v<=props.max).sort((a,b)=>a-b).slice(0,6)
  return uniq
})

/** Amount & fees */
const amountValid = computed(()=> Number.isFinite(amount.value) && amount.value >= props.min && amount.value <= props.max)
const fee = computed(()=>{
  const cfg = feeTable[currency.value]?.[method.value] || { flat: 0, pct: 0 }
  const raw = (amountValid.value ? (amount.value * cfg.pct + cfg.flat) : 0)
  const bounded = Math.min(Math.max(raw, cfg.min||0), cfg.max||Number.POSITIVE_INFINITY)
  return Math.round(bounded)
})
const total = computed(()=> amountValid.value ? amount.value + fee.value : 0)

/** Labels */
function methodLabel(m){
  return ({ mpesa:'M-Pesa', card:'Card', paypal:'PayPal', crypto:'Crypto' })[m] || m
}
function methodIcon(m){
  return ({ mpesa:'📱', card:'💳', paypal:'🅿️', crypto:'🪙' })[m] || '💲'
}
function feeLabel(m){
  const cfg = feeTable[currency.value]?.[m]
  if(!cfg) return '-'
  const pct = (cfg.pct*100).toFixed(1).replace(/\.0$/,'')
  return `${pct}% + ${format(cfg.flat)} (min ${format(cfg.min)}, max ${format(cfg.max)})`
}
function etaLabel(m){
  return feeTable[currency.value]?.[m]?.eta || '—'
}

/** Validation */
const canConfirm = computed(()=>{
  if (!amountValid.value) return false
  if (method.value === 'mpesa')   return /^0\d{8,9}$/.test(mpesaPhone.value.replace(/\s/g,'')) // simple local check
  if (method.value === 'card')    return !!(cardNumber.value && cardExp.value && cardCvc.value)
  if (method.value === 'paypal')  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail.value)
  if (method.value === 'crypto')  return !!cryptoNet.value
  return false
})

function validateAmount(){
  errors.value.amount = ''
  if (!Number.isFinite(amount.value) || String(amount.value).trim()==='') errors.value.amount = 'Enter a valid amount.'
  else if (amount.value < props.min) errors.value.amount = `Minimum is ${format(props.min)} ${currency.value}.`
  else if (amount.value > props.max) errors.value.amount = `Maximum is ${format(props.max)} ${currency.value}.`
}

/** Actions */
function setAmount(v){ amount.value = v; validateAmount(); buzz(8) }
function selectMethod(m){ method.value = m; savePrefs(); buzz(6) }

async function confirm(){
  validateAmount()
  if (errors.value.amount || !canConfirm.value){ globalError.value = errors.value.amount || 'Please complete the required fields.'; buzz(12); return }
  loading.value = true
  globalError.value = ''

  // Simulate processing
  setTimeout(()=>{
    const payload = {
      amount: amount.value,
      currency: currency.value,
      fee: fee.value,
      total: total.value,
      method: method.value,
      meta: {
        mpesaPhone: method.value==='mpesa' ? mpesaPhone.value : undefined,
        cardLast4: method.value==='card' ? (cardNumber.value.replace(/\s/g,'').slice(-4) || undefined) : undefined,
        paypalEmail: method.value==='paypal' ? paypalEmail.value : undefined,
        cryptoNet: method.value==='crypto' ? cryptoNet.value : undefined,
      },
      at: Date.now()
    }
    buzz(16)
    emit('confirm', payload)
    loading.value = false
    close('confirm')
  }, 700)
}

function close(reason){ if (loading.value) return; emit('close', { reason }) }

/** Persistence */
function savePrefs(){
  try{
    localStorage.setItem('wallet_topup_prefs', JSON.stringify({
      method: method.value, currency: currency.value, lastAmount: amount.value
    }))
  }catch{}
}
function loadPrefs(){
  try{
    const s = JSON.parse(localStorage.getItem('wallet_topup_prefs') || 'null')
    if (s){
      if (s.currency) currency.value = s.currency
      if (s.method && props.methods.includes(s.method)) method.value = s.method
      if (Number.isFinite(s.lastAmount)) amount.value = s.lastAmount
    } else {
      amount.value = quickAmounts.value[0] || props.min
    }
  }catch{}
}

/** Haptics */
function buzz(ms=10){ try{ navigator?.vibrate?.(ms) }catch{} }

/** UX */
onMounted(async ()=>{
  loadPrefs()
  await nextTick()
  amountRef.value?.focus?.()
})
watch([currency, method, amount], savePrefs)

/** Swipe-to-close */
const startY = ref(0), dY = ref(0), dragging = ref(false)
const dragStyle = computed(()=>{
  if(!dragging.value) return {}
  const y=Math.max(0,dY.value), op=Math.max(1 - y/240, .5)
  return { transform:`translateY(${y}px)`, opacity:op }
})
function onTouchStart(e){ if(e.touches?.length!==1) return; dragging.value=true; startY.value=e.touches[0].clientY; dY.value=0 }
function onTouchMove(e){ if(!dragging.value) return; dY.value=e.touches[0].clientY - startY.value }
function onTouchEnd(){ if(!dragging.value) return; dragging.value=false; if(dY.value>120) close('swipe'); dY.value=0 }

onBeforeUnmount(()=>{})
</script>

<style scoped>
/* Entrance */
@keyframes in { from{ opacity:0; transform: translateY(40px) scale(.98) } to{ opacity:1; transform:none } }
.animate-in{ animation: in .30s cubic-bezier(.22,1,.36,1) both; will-change: opacity, transform }

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .backdrop-blur-sm{ backdrop-filter: none !important; }
}
</style>
