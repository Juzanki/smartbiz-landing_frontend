<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black text-white p-6">
    <div class="max-w-2xl mx-auto bg-white/10 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-2xl border border-white/20">

      <!-- Header -->
      <div class="text-center mb-6 sm:mb-8">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-yellow-400">Recharge Your Wallet</h1>
        <p class="text-xs sm:text-sm text-white/80 mt-2">
          Top up your SmartCoins and enjoy premium features, send gifts, and more.
        </p>
      </div>

      <!-- Balance -->
      <div class="bg-black/30 border border-white/20 p-4 rounded-xl text-center mb-6">
        <p class="text-xs sm:text-sm text-white/70">Current Balance</p>
        <div
          class="flex justify-center items-center gap-2 text-xl sm:text-2xl font-extrabold text-yellow-300 animate-bounce-slow"
          :class="{ 'balance-flash': balanceFlash }"
        >
          <img src="/icons/smartbiz-coin.png" alt="Coin" class="w-6 h-6 sparkle-glow" />
          {{ formattedBalance }} Coins
        </div>
      </div>

      <!-- Preset packages -->
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3 sm:gap-4">
          <button
            v-for="p in packages"
            :key="p.amount"
            type="button"
            @click="selectAmount(p.amount)"
            class="recharge-btn coin-btn relative"
            :aria-pressed="customAmount === p.amount"
          >
            <span
              v-if="p.badge"
              class="absolute -top-2 right-2 bg-yellow-400 text-black text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow"
            >{{ p.badge }}</span>
            <img src="/icons/smartbiz-coin.png" alt="" class="w-5 h-5" />
            {{ p.amount.toLocaleString() }}
            <span class="block text-[10px] text-white/70 mt-0.5">≈ {{ tzs(p.amount * COIN_TO_TSH) }}</span>
          </button>
        </div>

        <!-- Custom Amount -->
        <div>
          <label class="block mb-1 text-sm text-white/70">Or enter custom amount</label>
          <input
            v-model.number="customAmount"
            type="number"
            inputmode="numeric"
            min="100"
            :max="MAX_AMOUNT"
            step="50"
            placeholder="Enter amount…"
            class="w-full rounded-lg px-4 py-2 bg-black/20 border border-white/30 placeholder-white/50 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
          />
          <p v-if="customAmount" class="text-xs sm:text-sm text-white/70 mt-1 italic">
            {{ customAmount.toLocaleString() }} coins ≈
            <span class="text-yellow-300 font-semibold">{{ tzs(customAmount * COIN_TO_TSH) }}</span>
          </p>
          <p v-if="!isValid && customAmount"
             class="text-xs text-red-300 mt-1">Enter between 100 and {{ MAX_AMOUNT.toLocaleString() }} coins.</p>
        </div>

        <!-- Payment method pills -->
        <div>
          <label class="block mb-2 text-sm text-white/70">Select Payment Method</label>
          <div class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              v-for="m in methods"
              :key="m.value"
              type="button"
              @click="paymentMethod = m.value"
              class="method-pill"
              :class="paymentMethod === m.value ? 'ring-2 ring-yellow-400/70 bg-white/15' : 'bg-white/10'"
              :aria-pressed="paymentMethod === m.value"
            >
              <span class="text-lg">{{ m.emoji }}</span>
              <span class="text-sm font-semibold">{{ m.label }}</span>
            </button>
          </div>

          <!-- Method hint -->
          <div class="mt-3 text-xs sm:text-sm bg-black/30 border border-white/15 rounded-lg p-3 leading-relaxed">
            <template v-if="paymentMethod === 'mpesa'">
              <p class="font-semibold text-white/90 mb-1">M-PESA steps:</p>
              <p>Dial <b>*150*00#</b> → 4. Pay → 1. Enter Company No. → <b>5261077</b> (UKUMBI WA MJASIRIAMALI) → Amount → PIN.</p>
            </template>
            <template v-else-if="paymentMethod === 'airtel'">
              <p class="font-semibold text-white/90 mb-1">Airtel Money:</p>
              <p>Dial <b>*150*60#</b> → 5. Pay Bills → Enter Company No. <b>5261077</b> → Amount → PIN.</p>
            </template>
            <template v-else-if="paymentMethod === 'card'">
              Use your debit/credit card on the next step. All payments are secured.
            </template>
            <template v-else-if="paymentMethod === 'paypal'">
              You’ll be redirected to PayPal checkout.
            </template>
            <template v-else>
              Pay with crypto (USDT/BTC). You’ll see a wallet address on the next step.
            </template>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="text-center mt-6">
        <button
          :disabled="!isValid || isProcessing"
          @click="openRechargePage"
          class="bg-yellow-400 disabled:bg-yellow-400/50 disabled:cursor-not-allowed hover:bg-yellow-500 text-black font-extrabold px-8 py-3 rounded-full shadow-lg transition inline-flex items-center gap-2"
        >
          <svg v-if="isProcessing" class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
          </svg>
          <span>{{ isProcessing ? 'Processing…' : '🚀 Recharge Now' }}</span>
        </button>
      </div>
    </div>

    <!-- Modal -->
    <RechargePage
      v-if="showRechargeModal"
      :amount="customAmount"
      :method="paymentMethod"
      @close="showRechargeModal = false; isProcessing = false"
      @confirmed="handleRechargeSuccess"
    />

    <!-- Toast -->
    <div v-if="toastVisible" class="toast-success">✅ Recharge successful! Balance updated.</div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import RechargePage from '@/components/modals/RechargePage.vue'

/** Rates & Limits */
const COIN_TO_TSH = 1.5
const MAX_AMOUNT = 2_000_000

/** State */
const userBalance = ref(1_000_000)
const balanceFlash = ref(false)
const customAmount = ref(5_000)
const paymentMethod = ref('mpesa')
const showRechargeModal = ref(false)
const toastVisible = ref(false)
const isProcessing = ref(false)

/** Packages (with Best value) */
const packages = [
  { amount: 5_000 },
  { amount: 10_000 },
  { amount: 20_000 },
  { amount: 50_000, badge: 'Best Value' }
]

/** Methods (display pills) */
const methods = [
  { value: 'mpesa',  label: 'M-Pesa',        emoji: '📱' },
  { value: 'airtel', label: 'Airtel Money',  emoji: '📲' },
  { value: 'card',   label: 'Card',          emoji: '💳' },
  { value: 'paypal', label: 'PayPal',        emoji: '🅿️' },
  { value: 'crypto', label: 'Crypto',        emoji: '₿' }
]

/** Formatters */
const tzs = (n) => new Intl.NumberFormat('sw-TZ', {
  style: 'currency', currency: 'TZS', maximumFractionDigits: 0
}).format(Math.round(n))

const formattedBalance = computed(() => {
  const v = userBalance.value
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000)     return (v / 1_000).toFixed(1) + 'K'
  return v.toLocaleString()
})

const isValid = computed(() =>
  Number.isFinite(customAmount.value) &&
  customAmount.value >= 100 &&
  customAmount.value <= MAX_AMOUNT
)

/** Actions */
function selectAmount(amount) {
  customAmount.value = amount
}

function openRechargePage() {
  if (!isValid.value || isProcessing.value) return
  isProcessing.value = true
  showRechargeModal.value = true
}

async function handleRechargeSuccess() {
  showRechargeModal.value = false
  // update balance
  userBalance.value += customAmount.value

  // flash effect
  balanceFlash.value = true
  await nextTick()
  setTimeout(() => (balanceFlash.value = false), 800)

  // toast
  toastVisible.value = true
  setTimeout(() => (toastVisible.value = false), 4000)

  // reset
  customAmount.value = 0
  isProcessing.value = false
}

</script>

<style scoped>
/* Background wave (optional class if you want to swap) */
.bg-wave{background:linear-gradient(135deg,#1e3a8a,#6d28d9,#000);background-size:400% 400%;animation:gradient-wave 12s ease infinite}
@keyframes gradient-wave{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}

/* Coin glow */
.sparkle-glow{filter:drop-shadow(0 0 4px #facc15);animation:coin-glow 3s ease-in-out infinite}
@keyframes coin-glow{0%,100%{filter:drop-shadow(0 0 4px #facc15)}50%{filter:drop-shadow(0 0 10px #fde047) brightness(1.15)}}

/* Buttons */
.recharge-btn{
  color:#fde68a;font-weight:700;padding:.75rem 1rem;border-radius:1rem;border:1px solid rgba(253,224,71,.2);
  background:linear-gradient(to right,rgba(255,255,255,.06),rgba(255,255,255,.12));
  display:flex;align-items:center;justify-content:center;gap:.5rem;transition:all .25s ease
}
.recharge-btn:hover{background:linear-gradient(to right,#fde047,#facc15);color:#000;transform:scale(1.05);
  box-shadow:0 0 15px rgba(253,224,71,.4),0 0 25px rgba(253,224,71,.2)}

/* Slow bounce for balance */
@keyframes bounce-slow{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.animate-bounce-slow{animation:bounce-slow 3s infinite ease-in-out}

/* Coin chip */
.coin-btn{border:1px solid rgba(253,224,71,.3);border-radius:9999px}

/* Payment method pills */
.method-pill{
  display:inline-flex;align-items:center;gap:.5rem;padding:.55rem .8rem;border-radius:9999px;
  border:1px solid rgba(255,255,255,.18);white-space:nowrap;transition:all .2s ease
}

/* CTA hover */
button.bg-yellow-400:hover{box-shadow:0 0 16px rgba(253,224,71,.35),0 0 28px rgba(253,224,71,.2);transform:scale(1.03)}

/* Toast */
.toast-success{
  position:fixed;left:50%;bottom:1.5rem;transform:translateX(-50%);background:#22c55e;color:#fff;
  font-weight:800;padding:.75rem 1.25rem;border-radius:9999px;box-shadow:0 10px 30px rgba(0,0,0,.35);z-index:60;
  animation:toast-slide-in .4s ease-out, toast-fade-out .4s ease-in 3.6s forwards
}
@keyframes toast-slide-in{from{opacity:0;transform:translateX(-50%) translateY(40px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@keyframes toast-fade-out{to{opacity:0;transform:translateX(-50%) translateY(30px)}}

/* Balance flash on success */
.balance-flash{animation:flash-scale .6s ease-out}
@keyframes flash-scale{0%{transform:scale(1);color:#facc15}50%{transform:scale(1.25);color:#fff176}100%{transform:scale(1);color:#facc15}}
</style>
