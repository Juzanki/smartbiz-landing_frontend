<template>
  <div class="min-h-screen bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 text-white">
    <!-- App Bar -->
    <header class="sticky top-0 z-20 backdrop-blur bg-slate-900/70 border-b border-white/10">
      <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 class="text-base sm:text-lg font-semibold flex items-center gap-2">🏦 Withdraw</h1>
          <p class="text-xs text-white/60">Request payout of your SmartCoins.</p>
        </div>
        <div class="text-right">
          <div class="text-xs text-white/60">Balance</div>
          <div class="text-emerald-300 font-semibold">{{ walletBalance.toLocaleString() }} SC</div>
        </div>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 py-4 space-y-4">
      <!-- Form Card -->
      <section class="rounded-2xl p-4 sm:p-6 bg-white/5 ring-1 ring-white/10">
        <h3 class="text-sm font-semibold mb-3">Create request</h3>

        <!-- Amount + quick actions -->
        <div class="grid sm:grid-cols-3 gap-3">
          <div class="sm:col-span-1">
            <label class="text-xs text-white/70 block mb-1">Amount (SC)</label>
            <div class="flex gap-2">
              <input v-model.number="amount" type="number" min="1"
                     inputmode="numeric" placeholder="e.g. 250"
                     class="w-full px-3 py-2 rounded-xl bg-white/5 ring-1 ring-white/15 focus:ring-white/30"
                     @input="clampAmount" />
            </div>
            <div class="mt-2 flex flex-wrap gap-2 text-xs">
              <button v-for="q in quick" :key="q.label"
                      @click="applyQuick(q)"
                      class="px-2.5 py-1 rounded-lg bg-white/10 ring-1 ring-white/15 hover:bg-white/15">
                {{ q.label }}
              </button>
            </div>
            <div class="mt-2 text-[11px]" :class="amountError ? 'text-red-300' : 'text-white/60'">
              {{ amountError || 'Tip: fees shown live below.' }}
            </div>
          </div>

          <!-- Method -->
          <div>
            <label class="text-xs text-white/70 block mb-1">Method</label>
            <select v-model="method" class="w-full px-3 py-2 rounded-xl bg-white/5 ring-1 ring-white/15">
              <option disabled value="">Select method</option>
              <option value="mpesa">📱 Mobile Money (M-Pesa / TigoPesa)</option>
              <option value="bank">🏦 Bank Transfer</option>
              <option value="paypal">💻 PayPal</option>
              <option value="crypto">🪙 Crypto (USDT)</option>
            </select>
          </div>

          <!-- Destination -->
          <div>
            <label class="text-xs text-white/70 block mb-1">Destination</label>
            <input v-model.trim="account" :placeholder="destPlaceholder"
                   class="w-full px-3 py-2 rounded-xl bg-white/5 ring-1 ring-white/15" />
          </div>
        </div>

        <!-- Method-specific fields -->
        <div class="mt-3 grid gap-3 sm:grid-cols-3" v-if="method">
          <template v-if="method==='bank'">
            <input v-model.trim="bank.name" placeholder="Bank name" class="px-3 py-2 rounded-xl bg-white/5 ring-1 ring-white/15" />
            <input v-model.trim="bank.holder" placeholder="Account holder" class="px-3 py-2 rounded-xl bg-white/5 ring-1 ring-white/15" />
            <input v-model.trim="bank.swift" placeholder="SWIFT/IBAN (optional)" class="px-3 py-2 rounded-xl bg-white/5 ring-1 ring-white/15" />
          </template>

          <template v-else-if="method==='crypto'">
            <select v-model="chain" class="px-3 py-2 rounded-xl bg-white/5 ring-1 ring-white/15">
              <option value="TRON">TRON (TRC-20)</option>
              <option value="BSC">BNB Smart Chain (BEP-20)</option>
              <option value="ETH">Ethereum (ERC-20)</option>
            </select>
            <input v-model.trim="memoTag" placeholder="Memo/Tag (if required)" class="px-3 py-2 rounded-xl bg-white/5 ring-1 ring-white/15" />
          </template>

          <template v-else-if="method==='paypal'">
            <input v-model.trim="paypalNote" placeholder="Note (optional)" class="px-3 py-2 rounded-xl bg-white/5 ring-1 ring-white/15" />
          </template>
        </div>

        <!-- Fee + Net preview -->
        <div class="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
          <div class="rounded-xl p-3 bg-slate-950/40 ring-1 ring-white/10">
            <div class="text-white/70 text-xs">Fee</div>
            <div class="font-semibold">{{ fee.toLocaleString() }} SC</div>
          </div>
          <div class="rounded-xl p-3 bg-slate-950/40 ring-1 ring-white/10">
            <div class="text-white/70 text-xs">Net you receive</div>
            <div class="font-semibold">{{ net.toLocaleString() }} SC</div>
          </div>
          <div class="rounded-xl p-3 bg-slate-950/40 ring-1 ring-white/10">
            <div class="text-white/70 text-xs">Estimated processing</div>
            <div class="font-semibold">{{ etaLabel }}</div>
          </div>
        </div>

        <!-- Submit -->
        <div class="mt-4 flex items-center justify-end gap-3">
          <button @click="clearForm" class="px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-sm">Clear</button>
          <button :disabled="!canSubmit || loading"
                  @click="openConfirm"
                  class="px-5 py-2 rounded-xl text-sm font-semibold bg-pink-500 hover:bg-pink-600 disabled:opacity-50">
            🚀 Submit request
          </button>
        </div>

        <!-- Alerts -->
        <p v-if="message" class="mt-3 text-sm px-3 py-2 rounded-xl"
           :class="messageType==='success' ? 'bg-emerald-500/20 ring-1 ring-emerald-400/30 text-emerald-100' : 'bg-red-500/20 ring-1 ring-red-400/30 text-red-100'">
          {{ message }}
        </p>
      </section>

      <!-- History -->
      <section class="rounded-2xl p-4 sm:p-6 bg-white/5 ring-1 ring-white/10">
        <div class="flex items-center justify-between gap-2 mb-3">
          <h3 class="text-sm font-semibold">Withdrawal history</h3>
          <div class="flex items-center gap-2 text-xs">
            <select v-model="histFilter" class="rounded-lg px-2 py-1 bg-white/5 ring-1 ring-white/15">
              <option value="">All</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </div>
        </div>

        <!-- Empty -->
        <div v-if="!historyLoaded" class="grid gap-2">
          <div class="h-16 rounded-xl bg-white/5 animate-pulse"></div>
          <div class="h-16 rounded-xl bg-white/5 animate-pulse"></div>
        </div>
        <div v-else-if="!filteredHistory.length" class="text-sm text-white/60 italic">
          😴 No withdrawal requests yet.
        </div>

        <!-- List -->
        <ul v-else class="divide-y divide-white/10 text-sm">
          <li v-for="w in paged" :key="w.id" class="py-3">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="font-semibold text-pink-300">{{ w.amount.toLocaleString() }} SC</div>
                <div class="text-xs text-white/60 truncate">
                  {{ formatDate(w.date) }} — {{ w.method }} — {{ w.account }}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded text-[11px] font-semibold uppercase"
                      :class="badge(w.status)">{{ w.status }}</span>
                <button v-if="w.status==='Pending'" @click="cancelRequest(w.id)"
                        class="text-[11px] underline opacity-90">Cancel</button>
              </div>
            </div>
          </li>
        </ul>

        <!-- Pagination -->
        <div v-if="filteredHistory.length" class="mt-3 flex items-center justify-between text-xs">
          <span class="text-white/60">Showing {{ start+1 }}–{{ end }} of {{ filteredHistory.length }}</span>
          <div class="flex items-center gap-2">
            <button @click="prev" :disabled="page===1" class="px-3 py-1.5 rounded-lg bg-white/10 ring-1 ring-white/15 disabled:opacity-40">Prev</button>
            <span>Page {{ page }} / {{ pages || 1 }}</span>
            <button @click="next" :disabled="page===pages" class="px-3 py-1.5 rounded-lg bg-white/10 ring-1 ring-white/15 disabled:opacity-40">Next</button>
          </div>
        </div>
      </section>
    </main>

    <!-- Confirm Drawer -->
    <div v-if="confirmOpen" class="fixed inset-0 z-30">
      <div class="absolute inset-0 bg-black/60" @click="closeConfirm"></div>
      <aside class="absolute right-0 top-0 h-full w-full sm:w-[420px] p-4 overflow-y-auto bg-slate-900 ring-1 ring-white/10">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-semibold">Confirm withdrawal</h4>
          <button @click="closeConfirm" class="opacity-70">✕</button>
        </div>

        <div class="rounded-xl p-3 bg-white/5 ring-1 ring-white/10 text-sm space-y-1">
          <div class="flex justify-between"><span>Amount</span><b>{{ amount.toLocaleString() }} SC</b></div>
          <div class="flex justify-between"><span>Fee</span><b>{{ fee.toLocaleString() }} SC</b></div>
          <div class="flex justify-between"><span>Net</span><b>{{ net.toLocaleString() }} SC</b></div>
          <div class="flex justify-between"><span>Method</span><b class="capitalize">{{ method }}</b></div>
          <div class="flex justify-between"><span>Destination</span><b class="truncate">{{ account }}</b></div>
        </div>

        <div class="mt-4">
          <label class="text-xs text-white/70 block mb-1">Enter 6-digit OTP</label>
          <input v-model.trim="otp" maxlength="6" inputmode="numeric" placeholder="••••••"
                 class="w-full px-3 py-2 rounded-xl bg-white/5 ring-1 ring-white/15 text-center tracking-widest" />
          <p class="text-[11px] text-white/60 mt-1">We sent a code to your email/phone.</p>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-2">
          <button @click="closeConfirm" class="px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15">Back</button>
          <button :disabled="loading || otp.length!==6" @click="submitWithdraw"
                  class="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50">Confirm & Submit</button>
        </div>
      </aside>
    </div>

    <!-- Toast -->
    <div v-if="toast" class="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-sm">
      {{ toast }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from '@/utils/axios'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

/* ------------------- State ------------------- */
const amount   = ref(0)
const method   = ref('')
const account  = ref('')
const bank     = ref({ name:'', holder:'', swift:'' })
const chain    = ref('TRON')
const memoTag  = ref('')
const paypalNote = ref('')
const walletBalance = ref(0)

const loading = ref(false)
const message = ref('')
const messageType = ref('')

const withdrawals = ref([])
const historyLoaded = ref(false)

const confirmOpen = ref(false)
const otp = ref('')
const toast = ref('')

/* Quick % buttons */
const quick = [
  { label: '25%', fn: (b)=> Math.floor(b*0.25) },
  { label: '50%', fn: (b)=> Math.floor(b*0.50) },
  { label: '75%', fn: (b)=> Math.floor(b*0.75) },
  { label: 'Max', fn: (b)=> Math.floor(b) }
]
function applyQuick(q){ amount.value = Math.max(0, q.fn(walletBalance.value)); clampAmount() }

/* Validation */
const amountError = computed(() => {
  if (!amount.value) return 'Enter an amount.'
  if (amount.value < 1) return 'Minimum is 1 SC.'
  if (amount.value > walletBalance.value) return 'Amount exceeds balance.'
  if (net.value < 1) return 'Net after fees must be at least 1 SC.'
  return ''
})
const destPlaceholder = computed(() => {
  if (method.value==='mpesa') return 'Phone number (e.g. 07XXXXXXXX)'
  if (method.value==='bank') return 'Account number'
  if (method.value==='paypal') return 'PayPal email'
  if (method.value==='crypto') return 'USDT wallet address'
  return 'Destination (phone/account/wallet)'
})

/* Fees (example): 1.5% + fixed by method */
const percent = 0.015
const fixedByMethod = computed(() => ({
  mpesa: 15,
  bank: 30,
  paypal: 25,
  crypto: 10
}[method.value] || 0))
const fee = computed(() => {
  const f = Math.floor(amount.value * percent) + fixedByMethod.value
  return Math.max(0, isFinite(f) ? f : 0)
})
const net = computed(() => Math.max(0, Math.floor(amount.value - fee.value)) )
const etaLabel = computed(() => ({
  mpesa: 'Minutes – 2h',
  bank: '1–2 business days',
  paypal: 'Within 24h',
  crypto: '≈ 10–30 min'
}[method.value] || '—'))

const canSubmit = computed(() =>
  !amountError.value && method.value && account.value.trim().length >= 5
)

/* ------------------- History (filters/paging) ------------------- */
const histFilter = ref('')
const filteredHistory = computed(() => {
  let arr = [...withdrawals.value]
  if (histFilter.value) arr = arr.filter(w => w.status === histFilter.value)
  return arr.sort((a,b)=> b.date - a.date)
})
const page = ref(1)
const pageSize = 7
const pages = computed(() => Math.ceil(filteredHistory.value.length / pageSize))
const paged = computed(() => filteredHistory.value.slice((page.value-1)*pageSize, page.value*pageSize))
const start = computed(() => (page.value-1)*pageSize)
const end = computed(() => Math.min(page.value*pageSize, filteredHistory.value.length))
function next(){ if (page.value < pages.value) page.value++ }
function prev(){ if (page.value > 1) page.value-- }

/* ------------------- API ------------------- */
async function fetchWallet(){
  try {
    const res = await axios.get('/wallet/smartcoin-log')
    walletBalance.value = Number(res.data?.balance) || 0
  } catch (e){ /* silent */ }
}
async function fetchWithdrawals(){
  try {
    const res = await axios.get('/wallet/withdrawals')
    withdrawals.value = Array.isArray(res.data) ? res.data : []
  } catch (e){ /* silent */ }
  finally { historyLoaded.value = true }
}

/* Cancel pending (demo optimistic) */
async function cancelRequest(id){
  const item = withdrawals.value.find(w => w.id===id)
  if (!item || item.status!=='Pending') return
  const prev = item.status
  item.status = 'Rejected'
  try {
    await axios.post('/wallet/withdrawals/cancel', { id })
    showToast('Request cancelled')
  } catch {
    item.status = prev
  }
}

/* Confirm drawer */
function openConfirm(){ if (canSubmit.value) { confirmOpen.value = true; otp.value='' } }
function closeConfirm(){ confirmOpen.value = false }

/* Submit */
async function submitWithdraw(){
  if (otp.value.length !== 6) return
  loading.value = true
  message.value = ''
  try{
    const userId = localStorage.getItem('user_id') || auth.user?.id || 'unknown'
    const payload = {
      user_id: userId,
      amount: Number(amount.value),
      method: method.value,
      account: account.value,
      meta: {
        bank: method.value==='bank' ? bank.value : undefined,
        chain: method.value==='crypto' ? chain.value : undefined,
        memo:  method.value==='crypto' ? memoTag.value : undefined,
        note:  method.value==='paypal' ? paypalNote.value : undefined
      },
      otp: otp.value
    }
    await axios.post('/wallet/request-withdraw', payload)
    message.value = '✅ Your request has been submitted.'
    messageType.value = 'success'
    confirmOpen.value = false
    clearForm()
    await Promise.all([fetchWithdrawals(), fetchWallet()])
  } catch (e){
    message.value = '❌ Submission failed. Please try again.'
    messageType.value = 'error'
  } finally { loading.value = false }
}

/* Utils */
function clampAmount(){ if (amount.value < 0) amount.value = 0; if (!Number.isFinite(amount.value)) amount.value = 0 }
function badge(s){
  const map = {
    Approved: 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30',
    Pending:  'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/30',
    Rejected: 'bg-red-500/20 text-red-200 ring-1 ring-red-400/30',
  }
  return (map[s] || 'bg-white/10 text-white ring-1 ring-white/15')
}
function showToast(msg){ toast.value = msg; setTimeout(()=> toast.value='', 1200) }
function formatDate(ts){ return new Date(ts).toLocaleString() }
function clearForm(){
  amount.value = 0; method.value = ''; account.value = ''
  bank.value = { name:'', holder:'', swift:'' }
  chain.value='TRON'; memoTag.value=''; paypalNote.value=''
}

/* Init */
onMounted(async () => {
  await Promise.all([fetchWallet(), fetchWithdrawals()])
})
</script>
