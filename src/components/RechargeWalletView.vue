<!-- 📁 src/views/RechargeWalletViewPro.vue -->
<template>
  <div class="min-h-screen bg-white dark:bg-[#0b1020] text-slate-900 dark:text-white"
       :style="safeArea" aria-labelledby="title">
    <!-- Top bar -->
    <header class="px-4 pt-6 pb-3 flex items-center justify-between">
      <h1 id="title" class="text-xl font-extrabold">💳 Recharge Wallet</h1>
      <span class="text-xs px-2 py-1 rounded-full bg-black/5 dark:bg-white/10">
        Balance: <b>{{ coins.toLocaleString() }}</b> coins
      </span>
    </header>

    <!-- Body -->
    <main class="px-4 pb-28 max-w-xl mx-auto">
      <!-- Mode toggle -->
      <div class="seg mt-1">
        <button type="button" class="seg-btn" :class="{ 'seg-active': mode==='money' }" @click="mode='money'">TZS</button>
        <button type="button" class="seg-btn" :class="{ 'seg-active': mode==='coins' }" @click="mode='coins'">Coins</button>
      </div>

      <!-- Amount -->
      <section class="mt-3">
        <label class="label mb-1">{{ mode==='money' ? 'Amount (TZS)' : 'Coins' }}</label>
        <div class="flex items-center gap-2">
          <span v-if="mode==='money'" class="rounded-xl px-2 py-2 text-sm bg-black/5 dark:bg-white/10">TSh</span>
          <input
            :key="mode"
            v-model.number="inputValue"
            :inputmode="mode==='money' ? 'decimal' : 'numeric'"
            :type="mode==='money' ? 'number' : 'number'"
            :placeholder="mode==='money' ? '0.00' : '0'"
            class="input flex-1"
            :aria-invalid="!!v.amount"
          />
        </div>
        <p v-if="v.amount" class="err mt-1">{{ v.amount }}</p>

        <!-- Presets -->
        <div class="mt-3 grid grid-cols-3 gap-2">
          <button v-for="p in presetDisplay" :key="p"
                  type="button" class="chip"
                  @click="applyPreset(p)">
            {{ pLabel(p) }}
          </button>
        </div>

        <!-- Promo code -->
        <div class="mt-3">
          <label class="label mb-1">Promo code</label>
          <div class="flex gap-2">
            <input v-model.trim="promo" class="input flex-1" placeholder="e.g. WELCOME5" />
            <button type="button" class="btn-soft" @click="applyPromo">Apply</button>
          </div>
          <p v-if="promoMsg" class="text-[11px] mt-1"
             :class="promoOk ? 'text-emerald-500' : 'text-rose-500'">{{ promoMsg }}</p>
        </div>
      </section>

      <!-- Payment method -->
      <section class="mt-5">
        <label class="label mb-2">Payment method</label>
        <div class="grid grid-cols-3 gap-2">
          <button v-for="m in methods" :key="m.id" type="button"
                  class="pm" :class="method===m.id && 'pm-active'"
                  @click="method = m.id" :aria-pressed="method===m.id">
            <div class="text-2xl">{{ m.emoji }}</div>
            <div class="text-xs font-semibold">{{ m.title }}</div>
            <div class="text-[10px] text-slate-500">Fee {{ (feePct(m.id)*100).toFixed(1) }}%</div>
          </button>
        </div>
      </section>

      <!-- Summary -->
      <section class="mt-5 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-4">
        <div class="flex items-center justify-between">
          <span class="text-sm">You pay</span>
          <b>{{ payMoney.toLocaleString() }} TZS</b>
        </div>
        <div class="flex items-center justify-between text-slate-500 text-sm mt-1">
          <span>Fees ({{ (feePct(method)*100).toFixed(1) }}%)</span>
          <span>{{ feeAmount.toLocaleString() }} TZS</span>
        </div>
        <div class="flex items-center justify-between border-t border-black/10 dark:border-white/10 mt-2 pt-2">
          <span class="text-sm">You get</span>
          <b>{{ totalCoins.toLocaleString() }} coins</b>
        </div>
        <div v-if="bonusCoins>0" class="mt-1 text-emerald-600 dark:text-emerald-400 text-sm">
          🎁 Bonus {{ bonusPct }}% = +{{ bonusCoins.toLocaleString() }} coins
        </div>
        <div class="mt-1 text-[11px] text-slate-500">
          Rate: 1 coin = {{ coinRate }} TZS
        </div>

        <label class="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" v-model="agree" class="h-4 w-4" />
          I agree to the <a href="#" class="underline">Terms</a>.
        </label>
      </section>

      <!-- Recent -->
      <section v-if="recent.length" class="mt-5">
        <h3 class="text-sm font-bold mb-2">Recent recharges</h3>
        <ul class="space-y-2">
          <li v-for="r in recent" :key="r.id" class="flex items-center justify-between text-sm">
            <span class="text-slate-600 dark:text-slate-300">{{ new Date(r.ts).toLocaleString() }}</span>
            <span><b>{{ r.coins.toLocaleString() }}</b> coins · {{ r.total.toLocaleString() }} TZS</span>
          </li>
        </ul>
      </section>
    </main>

    <!-- Sticky Pay Bar -->
    <div class="fixed left-0 right-0 bottom-0 z-50 px-3 pb-3">
      <div class="max-w-xl mx-auto rounded-2xl bg-white/85 dark:bg-black/60 backdrop-blur border border-black/10 dark:border-white/10 p-2 flex items-center gap-2">
        <button type="button" class="btn-soft flex-1" @click="clearForm">Clear</button>
        <button
          type="button"
          class="btn-primary"
          :disabled="!canPay || processing"
          @click="pay"
        >
          <span v-if="!processing">Pay {{ totalMoney.toLocaleString() }} TZS</span>
          <span v-else class="inline-flex items-center gap-2"><span class="spinner"></span>Processing…</span>
        </button>
      </div>
      <transition name="fade">
        <p v-if="queued" class="mt-2 text-[12px] rounded-lg px-3 py-2 bg-amber-500/15 text-amber-800 dark:text-amber-100 border border-amber-500/30 max-w-xl mx-auto">
          ⚠️ You’re offline — top-up queued and will sync later.
        </p>
      </transition>
    </div>

    <!-- Success sheet / receipt -->
    <transition name="fade">
      <div v-if="showReceipt" class="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm grid place-items-center" @click.self="showReceipt=false">
        <div class="w-[92%] max-w-sm rounded-2xl bg-white dark:bg-[#0b1020] border border-black/10 dark:border-white/10 p-5">
          <h3 class="text-base font-extrabold mb-2">✅ Recharge Successful</h3>
          <div class="text-sm flex items-center justify-between">
            <span>Coins credited</span><b>{{ lastReceipt.coins.toLocaleString() }}</b>
          </div>
          <div class="text-sm flex items-center justify-between">
            <span>Paid</span><b>{{ lastReceipt.total.toLocaleString() }} TZS</b>
          </div>
          <div class="text-xs text-slate-500 mt-1">Ref: {{ lastReceipt.ref }}</div>
          <div class="mt-4 flex gap-2">
            <button class="btn-soft flex-1" @click="copyRef">Copy Ref</button>
            <button class="btn-primary flex-1" @click="showReceipt=false">Done</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'

/** Props-ish (can be lifted to real props later) */
const coins = ref(0)               // current user coins
const coinRate = 1                 // 1 coin = 1 TZS (override if needed)
const presetsTZS = [2000, 5000, 10000, 20000, 50000, 100000]

const methods = [
  { id:'mpesa',   title:'M-Pesa',     emoji:'📱' },
  { id:'tigopesa',title:'Tigo Pesa',  emoji:'📲' },
  { id:'airtel',  title:'Airtel Money', emoji:'📡' },
  { id:'card',    title:'Card',       emoji:'💳' },
  { id:'paypal',  title:'PayPal',     emoji:'🅿️' },
]
function feePct(id){
  return ({
    mpesa: 0.015,
    tigopesa: 0.015,
    airtel: 0.015,
    card: 0.029,
    paypal: 0.035
  }[id]) ?? 0.02
}

/** Form state */
const mode = ref('money')        // 'money' | 'coins'
const inputValue = ref(null)     // number
const method = ref('mpesa')
const promo = ref('')
const promoOk = ref(false)
const promoMsg = ref('')
const agree = ref(false)
const processing = ref(false)
const queued = ref(false)

/** Validation */
const v = reactive({ amount: '' })
function validate(){
  const val = Number(inputValue.value || 0)
  if (isNaN(val) || val <= 0) v.amount = 'Enter a valid amount.'
  else v.amount = ''
  return !v.amount
}

/** Derived amounts */
const moneyAmount = computed(() => mode.value === 'money'
  ? Math.max(0, Number(inputValue.value || 0))
  : Math.max(0, Math.round(Number(inputValue.value || 0) * coinRate))
)
const coinsAmount = computed(() => mode.value === 'coins'
  ? Math.max(0, Number(inputValue.value || 0))
  : Math.max(0, Math.floor(Number(inputValue.value || 0) / coinRate))
)

const bonusPct = computed(() => {
  const a = moneyAmount.value
  if (a >= 100000) return 12
  if (a >= 50000)  return 7
  if (a >= 20000)  return 3
  return 0
})
const bonusCoins = computed(() => Math.floor(coinsAmount.value * (bonusPct.value/100)))

const feeAmount = computed(() => Math.round(moneyAmount.value * feePct(method.value)))
const payMoney  = computed(() => moneyAmount.value)
const totalMoney = computed(() => moneyAmount.value + feeAmount.value)
const totalCoins = computed(() => coinsAmount.value + bonusCoins.value)

/** Presets */
const presetDisplay = computed(() => mode.value === 'money'
  ? presetsTZS
  : presetsTZS.map(v => Math.floor(v / coinRate))
)
function pLabel(p){ return mode.value === 'money' ? `${p.toLocaleString()} TZS` : `${p.toLocaleString()} coins` }
function applyPreset(p){ inputValue.value = p }

/** Promo */
function applyPromo(){
  const code = (promo.value || '').toUpperCase().trim()
  if (!code) { promoOk.value=false; promoMsg.value='Enter a code'; return }
  // Demo rules
  if (['WELCOME5','SMART10'].includes(code)) {
    promoOk.value = true
    promoMsg.value = code === 'WELCOME5' ? '5% bonus applied' : '10% bonus applied'
  } else {
    promoOk.value = false
    promoMsg.value = 'Invalid code'
  }
}
watch(promoOk, ok => {
  // stack with bonus tiers
  // This is only a display note; real math could boost coins:
  // (You can integrate promo into bonusCoins if needed)
})

/** Pay flow */
const canPay = computed(() =>
  validate() && agree.value && method.value && !processing.value
)
const recent = ref([])
const showReceipt = ref(false)
const lastReceipt = reactive({ ref:'', coins:0, total:0 })

function pay(){
  if (!canPay.value) return
  processing.value = true
  queued.value = false

  const payload = {
    method: method.value,
    amountTZS: moneyAmount.value,
    coins: coinsAmount.value,
    bonusPct: bonusPct.value,
    bonusCoins: bonusCoins.value,
    promo: promoOk.value ? (promo.value || '').toUpperCase().trim() : '',
    feeTZS: feeAmount.value,
    totalTZS: totalMoney.value,
    ts: Date.now()
  }

  try {
    if (!navigator.onLine) throw new Error('offline')

    // 🔗 TODO: Call your backend here
    // await axios.post('/wallet/recharge', payload, { headers })

    // optimistic success
    finishSuccess(payload)
  } catch (e) {
    // Queue offline
    const key = 'recharge_queue'
    const q = JSON.parse(localStorage.getItem(key) || '[]')
    q.push(payload)
    localStorage.setItem(key, JSON.stringify(q))
    queued.value = true
    finishSuccess(payload) // optionally credit later on server confirm
  } finally {
    processing.value = false
  }
}

function finishSuccess(p){
  coins.value += (p.coins + p.bonusCoins)
  const ref = 'RC-' + Math.random().toString(36).slice(2,8).toUpperCase()
  lastReceipt.ref = ref
  lastReceipt.coins = p.coins + p.bonusCoins
  lastReceipt.total = p.totalTZS
  showReceipt.value = true
  // History
  const item = { id: ref, coins: lastReceipt.coins, total: p.totalTZS, ts: p.ts }
  recent.value = [item, ...recent.value].slice(0,5)
  const key = 'recharge_history'
  const hist = JSON.parse(localStorage.getItem(key) || '[]')
  hist.unshift(item)
  localStorage.setItem(key, JSON.stringify(hist))
  // Haptics
  try { navigator.vibrate?.(12) } catch {}
  clearForm()
}

function copyRef(){
  navigator.clipboard.writeText(lastReceipt.ref)
}

function clearForm(){
  inputValue.value = null
  promo.value = ''
  promoOk.value = false
  promoMsg.value = ''
  agree.value = false
}

/** Persist history on mount */
onMounted(() => {
  try {
    const key = 'recharge_history'
    recent.value = JSON.parse(localStorage.getItem(key) || '[]').slice(0,5)
  } catch {}
})

/** Safe-area */
const safeArea = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }
</script>

<style scoped>
/* Inputs/buttons */
.label { @apply text-[12px] font-semibold text-slate-700 dark:text-slate-200; }
.input { @apply h-11 px-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm; }
.err { @apply text-[11px] text-rose-600 dark:text-rose-300; }
.btn-primary { @apply h-11 px-4 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-500 active:translate-y-[1px]; }
.btn-soft { @apply h-11 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/10 text-slate-800 dark:text-white active:translate-y-[1px]; }

/* Segmented */
.seg { @apply grid grid-cols-2 bg-black/5 dark:bg-white/10 rounded-xl p-1; }
.seg-btn { @apply h-10 rounded-lg text-sm font-semibold; }
.seg-active { @apply bg-indigo-600 text-white; }

/* Payment method */
.pm { @apply rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-center active:translate-y-[1px]; }
.pm-active { @apply ring-2 ring-indigo-500; }

/* Spinner */
.spinner { width:16px;height:16px;border-radius:9999px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;animation:spin 1s linear infinite }
@keyframes spin { to { transform: rotate(360deg) } }

/* Transition */
.fade-enter-active,.fade-leave-active { transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to { opacity: 0 }
</style>
