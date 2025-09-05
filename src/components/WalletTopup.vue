<!-- src/components/RechargeSheet.vue -->
<template>
  <!-- Scrim -->
  <div class="fixed inset-0 z-50">
    <div class="absolute inset-0 bg-black/60" @click="close" />
    <!-- Bottom sheet -->
    <section
      ref="sheet"
      class="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-auto rounded-t-2xl bg-white dark:bg-[#0b0b10] text-gray-900 dark:text-white shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rch-title"
      tabindex="-1"
      @keydown.esc.prevent.stop="close"
    >
      <!-- Grabber -->
      <div class="flex justify-center pt-2">
        <div class="h-1.5 w-10 rounded-full bg-black/20 dark:bg-white/20" />
      </div>

      <!-- Header -->
      <header class="px-4 pt-2 pb-3 flex items-center justify-between">
        <div>
          <h3 id="rch-title" class="text-base font-bold">🪙 Recharge Coins</h3>
          <p class="text-xs text-gray-500 dark:text-white/60">Secure mobile payment • EAT</p>
        </div>
        <button class="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10" @click="close" aria-label="Close">✖</button>
      </header>

      <!-- Offline banner -->
      <div v-if="!online" class="mx-4 mb-3 rounded-xl bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm">
        You’re offline — you can fill the form and submit when back online.
      </div>

      <!-- Content -->
      <div class="px-4 pb-4 space-y-4">
        <!-- Mode / Test -->
        <div class="flex items-center justify-between">
          <label class="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" v-model="sandbox" class="accent-blue-700" />
            <span>Test mode (sandbox)</span>
          </label>
          <button class="text-sm text-blue-700 dark:text-blue-300 hover:underline" @click="openHelp">How it works?</button>
        </div>

        <!-- Amount -->
        <div class="rounded-2xl border border-black/5 dark:border-white/10 p-3">
          <label class="text-sm font-medium">Amount (TZS)</label>
          <div class="mt-1 flex items-center gap-2">
            <span class="px-2 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/70 text-sm">TSh</span>
            <input
              v-model.number="amount"
              type="number"
              inputmode="decimal"
              min="minAmount"
              step="100"
              placeholder="e.g. 5000"
              class="flex-1 h-11 rounded-xl px-3 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 outline-none focus:ring-2 ring-blue-600/60"
              :aria-invalid="!!errors.amount"
              :aria-describedby="errors.amount ? 'err-amount' : 'hint-amount'"
            />
          </div>

          <!-- quick chips -->
          <div class="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
            <button v-for="v in quick" :key="v" class="chip" @click="amount=v">{{ format(v) }}</button>
          </div>
          <p id="hint-amount" class="text-[11px] text-gray-500 dark:text-white/60 mt-1">Min {{ format(minAmount) }}, max {{ format(maxAmount) }}.</p>
          <p v-if="errors.amount" id="err-amount" class="text-xs text-red-600 dark:text-red-400 mt-1">{{ errors.amount }}</p>

          <!-- breakdown -->
          <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div class="rounded-xl bg-gray-50 dark:bg-white/5 p-2">
              <div class="text-gray-500 dark:text-white/60">Fees</div>
              <div class="font-semibold">{{ format(fee) }}</div>
            </div>
            <div class="rounded-xl bg-gray-50 dark:bg-white/5 p-2">
              <div class="text-gray-500 dark:text-white/60">You pay</div>
              <div class="font-semibold">{{ format(totalPay) }}</div>
            </div>
            <div class="rounded-xl bg-gray-50 dark:bg-white/5 p-2">
              <div class="text-gray-500 dark:text-white/60">Rate</div>
              <div class="font-semibold">1 coin = {{ format(rateTzsPerCoin) }}</div>
            </div>
            <div class="rounded-xl bg-gray-50 dark:bg-white/5 p-2">
              <div class="text-gray-500 dark:text-white/60">You get</div>
              <div class="font-semibold">{{ coins }} coins</div>
            </div>
          </div>
        </div>

        <!-- Payment method -->
        <div class="rounded-2xl border border-black/5 dark:border-white/10 p-3">
          <label class="text-sm font-medium">Payment method</label>
          <div class="mt-2 grid grid-cols-3 gap-2 text-sm">
            <button v-for="p in providers" :key="p.id"
              class="h-10 rounded-xl border border-black/5 dark:border-white/10 flex items-center justify-center gap-2"
              :class="payMethod===p.id ? 'ring-2 ring-blue-600/60 bg-blue-50 dark:bg-blue-900/20' : ''"
              @click="payMethod=p.id">
              <span>{{ p.emoji }}</span><span>{{ p.label }}</span>
            </button>
          </div>

          <!-- Phone -->
          <div class="mt-3">
            <label class="text-sm font-medium">Phone (TZ)</label>
            <input
              v-model="phone"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              placeholder="+255 7xx xxx xxx"
              class="mt-1 w-full h-11 rounded-xl px-3 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 outline-none focus:ring-2 ring-blue-600/60"
              @input="formatTZPhone"
              :aria-invalid="!!errors.phone"
              :aria-describedby="errors.phone ? 'err-phone' : undefined"
            />
            <p v-if="errors.phone" id="err-phone" class="text-xs text-red-600 dark:text-red-400 mt-1">{{ errors.phone }}</p>
          </div>

          <!-- Notes / fallback -->
          <div class="mt-2 text-xs text-gray-600 dark:text-white/70">
            <p v-if="payMethod==='mpesa'">We’ll send an STK Push to your phone. Approve to complete.</p>
            <p class="mt-1">If push fails, use provider USSD or request a QR:</p>
            <div class="mt-1 flex flex-wrap gap-1">
              <button class="mini" @click="showUssd=true">Show USSD</button>
              <button class="mini" @click="showQr=true">Show QR</button>
            </div>
          </div>
        </div>

        <!-- Sticky actions -->
        <div class="sticky bottom-0 left-0 right-0 z-40">
          <div class="rounded-t-2xl bg-white/90 dark:bg-[#0b0b10]/90 backdrop-blur border-t border-black/10 dark:border-white/10 px-4 py-3 flex items-center gap-2">
            <button class="btn-secondary flex-1" @click="close">Cancel</button>
            <button class="btn-primary flex-1" :disabled="!canSubmit || processing" @click="recharge">
              <span v-if="!processing">Pay {{ format(totalPay) }}</span>
              <span v-else class="inline-flex items-center gap-2">
                <svg class="w-4 h-4 animate-spin" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6V2z"/></svg>
                Processing…
              </span>
            </button>
          </div>
          <div class="h-3" />
        </div>

        <!-- Processing state -->
        <div v-if="processing" class="text-center text-sm text-gray-600 dark:text-white/70">
          Awaiting provider confirmation… <span class="opacity-70">{{ pollHint }}</span>
        </div>

        <!-- USSD Modal -->
        <div v-if="showUssd" class="fixed inset-0 z-50">
          <div class="absolute inset-0 bg-black/50" @click="showUssd=false"></div>
          <div class="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white dark:bg-[#0b0b10] p-4">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold">USSD Fallback</h4>
              <button class="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10" @click="showUssd=false">✖</button>
            </div>
            <p class="text-sm text-gray-600 dark:text-white/70">Dial your provider USSD and follow prompts, then enter the amount {{ format(totalPay) }}:</p>
            <ul class="mt-2 text-sm space-y-1">
              <li>• M-Pesa: <code class="px-1 rounded bg-gray-100 dark:bg-white/10">*150*00#</code></li>
              <li>• Tigo Pesa: <code class="px-1 rounded bg-gray-100 dark:bg-white/10">*150*01#</code></li>
              <li>• Airtel Money: <code class="px-1 rounded bg-gray-100 dark:bg-white/10">*150*60#</code></li>
            </ul>
          </div>
        </div>

        <!-- QR Modal (placeholder QR) -->
        <div v-if="showQr" class="fixed inset-0 z-50">
          <div class="absolute inset-0 bg-black/50" @click="showQr=false"></div>
          <div class="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white dark:bg-[#0b0b10] p-4">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold">Scan to pay</h4>
              <button class="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10" @click="showQr=false">✖</button>
            </div>
            <div class="mt-2 flex items-center justify-center">
              <!-- Simple QR placeholder; replace with real QR image/data -->
              <div class="w-40 h-40 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-white/10 dark:to-white/5 grid place-items-center">
                <span class="text-xs text-gray-600 dark:text-white/70">QR Placeholder</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Toast -->
        <div v-if="toast" class="fixed bottom-16 left-1/2 -translate-x-1/2 z-50">
          <div class="rounded-xl bg-emerald-600 text-white text-sm px-3 py-2 shadow">{{ toast }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'

/** Emits */
const emit = defineEmits<{
  (e:'success', payload:{ txId:string; amount:number; coins:number }):void
  (e:'close'):void
}>()

/** Online awareness */
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
function onOnline(){ online.value = true }
function onOffline(){ online.value = false }

/** UI state */
const sheet = ref<HTMLElement|null>(null)
const processing = ref(false)
const toast = ref('')
const showUssd = ref(false)
const showQr = ref(false)
const pollHint = ref('')

/** Form state */
const amount = ref<number>(5000)
const phone = ref<string>('+255 7')
const sandbox = ref<boolean>(false)
const payMethod = ref<'mpesa'|'tigo'|'airtel'>('mpesa')

/** Configs (tweak freely) */
const minAmount = 1000
const maxAmount = 500000
const quick = [1000, 2000, 5000, 10000, 20000]
const feePct = 0.015   // 1.5%
const feeFixed = 100   // TSh
const rateTzsPerCoin = 100 // 1 coin = TSh 100

/** Derived */
const fee = computed(()=> Math.round(amount.value * feePct) + feeFixed)
const totalPay = computed(()=> Math.min(maxAmount, Math.max(minAmount, Math.round(amount.value))) + fee.value)
const coins = computed(()=> Math.floor(amount.value / rateTzsPerCoin))
const canSubmit = computed(()=> !errors.value.amount && !errors.value.phone && amount.value>=minAmount && amount.value<=maxAmount)

/** Errors */
const errors = ref<{amount?:string|null; phone?:string|null}>({ amount:null, phone:null })

/** Providers */
const providers = [
  { id: 'mpesa', label: 'M-Pesa', emoji: '🟡' },
  { id: 'tigo',  label: 'Tigo Pesa', emoji: '🔵' },
  { id: 'airtel',label: 'Airtel Money', emoji: '🔴' }
] as const

/** Lifecycle */
onMounted(() => {
  validateAll()
  sheet.value?.focus()
  window.addEventListener?.('online', onOnline)
  window.addEventListener?.('offline', onOffline)
  document.addEventListener('keydown', onTabTrap)
})
onBeforeUnmount(() => {
  window.removeEventListener?.('online', onOnline)
  window.removeEventListener?.('offline', onOffline)
  document.removeEventListener('keydown', onTabTrap)
})

/** Methods */
function close(){ emit('close') }

function openHelp(){
  toastNow('Enter amount • choose method • confirm on phone')
}

function toastNow(msg:string){ toast.value = msg; setTimeout(()=> toast.value = '', 1500) }

function format(v:number){ return new Intl.NumberFormat('en-TZ', { style:'currency', currency:'TZS', maximumFractionDigits:0 }).format(v) }

function formatTZPhone(){
  // normalize to "+255 7XX XXX XXX" or "+255 6/7 digit patterns"
  let digits = phone.value.replace(/\D+/g,'')
  if (digits.startsWith('0')) digits = '255' + digits.slice(1)
  if (!digits.startsWith('255')) digits = '255' + digits
  digits = digits.slice(0,12) // 255 + 9
  const parts = [digits.slice(0,3), digits.slice(3,6), digits.slice(6,9), digits.slice(9,12)].filter(Boolean)
  phone.value = '+' + parts[0] + (parts[1] ? ' ' + parts[1] : '') + (parts[2] ? ' ' + parts[2] : '') + (parts[3] ? ' ' + parts[3] : '')
  validatePhone()
}

function validateAmount(){
  if (!amount.value || isNaN(amount.value)) { errors.value.amount = 'Enter a valid amount'; return }
  if (amount.value < minAmount) { errors.value.amount = `Min is ${format(minAmount)}`; return }
  if (amount.value > maxAmount) { errors.value.amount = `Max is ${format(maxAmount)}`; return }
  errors.value.amount = null
}
function validatePhone(){
  const digits = phone.value.replace(/\D+/g,'')
  errors.value.phone = /^255\d{9}$/.test(digits) ? null : 'Use +255 then 9 digits'
}
function validateAll(){ validateAmount(); validatePhone() }

/** Focus trap (basic) */
function onTabTrap(e: KeyboardEvent){
  if (e.key !== 'Tab') return
  const focusables = Array.from(sheet.value?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || [])
    .filter(el => !el.hasAttribute('disabled'))
  if (!focusables.length) return
  const first = focusables[0], last = focusables[focusables.length-1]
  if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault() }
  else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault() }
}

/** Payment flow (mock STK push + polling) */
async function recharge(){
  validateAll()
  if (!canSubmit.value || processing.value) return
  if (!online.value){ toastNow('You’re offline'); return }

  processing.value = true
  pollHint.value = 'sending push…'

  try {
    // 1) Initiate payment request (mock endpoint)
    const payload = {
      provider: payMethod.value,
      amount: totalPay.value,
      msisdn: phone.value.replace(/\D+/g,''),
      coins: coins.value,
      sandbox: sandbox.value
    }

    // Replace with your API call:
    // const res = await fetch('/api/payments/stkpush', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    // const init = await res.json() as { txId: string, status: 'PENDING'|'FAILED' }
    // Mock init:
    await sleep(600)
    const init = { txId: 'TX' + Math.random().toString(36).slice(2,8).toUpperCase(), status: 'PENDING' as const }

    if (init.status !== 'PENDING') throw new Error('Failed to start payment')

    // 2) Poll status
    let attempts = 0
    const maxAttempts = 6
    while (attempts++ < maxAttempts){
      pollHint.value = `checking status… (${attempts}/${maxAttempts})`
      await sleep(1000 + attempts*250)

      // Replace with: const st = await fetch(`/api/payments/status?tx=${init.txId}`).then(r=>r.json())
      // Mock: success chance improves with attempts
      const rnd = Math.random()
      const st = rnd + attempts*0.1 > 0.8 ? { status:'SUCCESS' as const } : (rnd < 0.08 ? { status:'FAILED' as const } : { status:'PENDING' as const })

      if (st.status === 'SUCCESS'){
        vibrate([12, 20, 12])
        toastNow('Payment successful')
        emit('success', { txId: init.txId, amount: totalPay.value, coins: coins.value })
        processing.value = false
        close()
        return
      }
      if (st.status === 'FAILED'){
        throw new Error('Payment failed — try USSD or QR fallback')
      }
    }

    // 3) Timed out -> suggest fallback
    throw new Error('Timed out — approve on phone or use USSD/QR')
  } catch (e:any){
    vibrate([8, 30, 8])
    processing.value = false
    toastNow(e?.message || 'Payment error')
  }
}

/** Utils */
function sleep(ms:number){ return new Promise(r=>setTimeout(r, ms)) }
function vibrate(pattern:number[]){ try{ navigator.vibrate?.(pattern) }catch{} }
</script>

<style scoped>
.no-scrollbar { scrollbar-width: none; } .no-scrollbar::-webkit-scrollbar { display: none; }

.btn-primary {
  @apply h-11 px-4 rounded-xl bg-blue-700 text-white text-sm font-medium active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed;
}
.btn-secondary {
  @apply h-11 px-3 rounded-xl bg-gray-100 dark:bg-white/10 text-sm text-gray-800 dark:text-white active:scale-95;
}
.chip {
  @apply h-9 px-3 rounded-full text-sm bg-gray-100 dark:bg-white/10 dark:text-white active:scale-95;
}
.mini {
  @apply h-8 px-2 rounded-lg text-xs bg-gray-100 dark:bg-white/10 dark:text-white active:scale-95;
}

/* Safe-area for phones with notches */
@supports(padding:max(0px)) {
  section { padding-bottom: max(0.75rem, env(safe-area-inset-bottom)); }
}
</style>
