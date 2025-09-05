<!-- src/views/WithdrawRequestView.vue -->
<template>
  <section class="min-h-screen p-4 sm:p-6 bg-white dark:bg-[#121212] text-gray-900 dark:text-white">
    <!-- Offline -->
    <div v-if="!online" class="mb-3 rounded-xl bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm">
      You’re offline — you can fill the form and submit when back online.
    </div>

    <!-- Header -->
    <header class="flex items-center justify-between mb-3">
      <div>
        <h2 class="text-xl sm:text-2xl font-bold text-yellow-500">Withdraw</h2>
        <p class="text-xs text-gray-500 dark:text-white/70">Secure payout • EAT</p>
      </div>
      <div class="rounded-full px-3 h-9 bg-black/80 text-white grid place-items-center text-sm">
        Balance: <strong class="ml-1">{{ fmt(balance) }}</strong>
      </div>
    </header>

    <!-- KYC banner (mock) -->
    <div v-if="kycLevel<2" class="mb-3 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200 p-3 text-sm">
      Complete KYC to unlock higher limits. Current level: <strong>L{{ kycLevel }}</strong>.
      <button class="ml-2 underline" @click="upgradeKyc">Upgrade</button>
    </div>

    <!-- Amount -->
    <div class="rounded-2xl border border-black/5 dark:border-white/10 p-3 mb-3">
      <label class="text-sm font-semibold">Amount (TZS)</label>
      <div class="mt-1 flex items-center gap-2">
        <span class="px-2 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/70 text-sm">TSh</span>
        <input
          v-model.number="amount"
          type="number"
          inputmode="decimal"
          min="1000"
          step="100"
          placeholder="e.g. 50,000"
          class="flex-1 h-11 rounded-xl px-3 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 outline-none focus:ring-2 ring-blue-600/60"
          :aria-invalid="!!errors.amount"
          :aria-describedby="errors.amount ? 'err-amount' : 'amt-hint'"
          @blur="validateAmount"
        />
      </div>

      <!-- quick chips -->
      <div class="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
        <button v-for="v in quick" :key="v" class="chip" @click="setQuick(v)">{{ fmt(v) }}</button>
        <button class="chip" @click="amount = balance">Max</button>
        <div class="ml-auto flex items-center gap-2 text-xs">
          <label class="inline-flex items-center gap-2">
            <input type="checkbox" v-model="sandbox" class="accent-blue-700">
            <span>Test mode</span>
          </label>
        </div>
      </div>

      <p id="amt-hint" class="text-[11px] text-gray-500 dark:text-white/60 mt-1">
        Min {{ fmt(minAmount) }}, max {{ fmt(maxAmount) }} • Daily limit: {{ fmt(dailyLimit) }}
      </p>
      <p v-if="errors.amount" id="err-amount" class="text-xs text-rose-600 dark:text-rose-400 mt-1">{{ errors.amount }}</p>

      <!-- Daily limit progress -->
      <div class="mt-2">
        <div class="flex justify-between text-[11px] text-gray-500 dark:text-white/60 mb-1">
          <span>Today used</span><span>{{ fmt(withdrawnToday) }} / {{ fmt(dailyLimit) }}</span>
        </div>
        <div class="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
          <div class="h-full bg-blue-600 transition-all" :style="{ width: Math.min(100, Math.round(((withdrawnToday + (amount||0)) / dailyLimit)*100)) + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- Method -->
    <div class="rounded-2xl border border-black/5 dark:border-white/10 p-3 mb-3">
      <label class="text-sm font-semibold">Method</label>
      <div class="mt-2 grid grid-cols-3 gap-2 text-sm">
        <button class="seg" :class="method==='mobile' && 'seg-active'" @click="method='mobile'">📱 Mobile</button>
        <button class="seg" :class="method==='bank' && 'seg-active'" @click="method='bank'">🏦 Bank</button>
        <button class="seg opacity-60" disabled title="Coming soon">🪙 USDT (beta)</button>
      </div>

      <!-- Destination account -->
      <div class="mt-3 rounded-xl border border-black/5 dark:border-white/10 p-3">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-600 dark:text-white/70">
            <div class="font-medium text-gray-900 dark:text-white">Destination</div>
            <div v-if="selected" class="mt-0.5 text-xs">
              <template v-if="method==='mobile'">
                {{ selected.provider }} • {{ prettyPhone(selected.msisdn) }}
              </template>
              <template v-else-if="method==='bank'">
                {{ selected.bank }} • {{ selected.account }}
              </template>
            </div>
            <div v-else class="mt-0.5 text-xs">No account selected</div>
          </div>
          <div class="flex items-center gap-2">
            <button class="mini" @click="openSheet">Choose</button>
            <button class="mini" @click="openSheet(true)">Add new</button>
          </div>
        </div>
        <p v-if="errors.dest" class="text-xs text-rose-600 dark:text-rose-400 mt-2">{{ errors.dest }}</p>
      </div>
    </div>

    <!-- Breakdown -->
    <div class="rounded-2xl border border-black/5 dark:border-white/10 p-3 mb-24">
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div class="tile"><div class="muted">Fees</div><div class="strong">{{ fmt(fee) }}</div></div>
        <div class="tile"><div class="muted">You receive</div><div class="strong">{{ fmt(net) }}</div></div>
        <div class="tile"><div class="muted">Processing</div><div class="strong">{{ method==='mobile' ? 'Instant' : 'Next business day' }}</div></div>
        <div class="tile"><div class="muted">Reference</div><div class="strong">Auto-generated</div></div>
      </div>
    </div>

    <!-- Sticky actions -->
    <div class="sticky bottom-0 left-0 right-0 z-40">
      <div class="rounded-t-2xl bg-white/90 dark:bg-[#0b0b10]/90 backdrop-blur border-t border-black/10 dark:border-white/10 px-4 py-3 flex items-center gap-2">
        <button class="btn-secondary flex-1" @click="cancel">Cancel</button>
        <button class="btn-primary flex-1"
                :disabled="!canSubmit || processing || !online"
                @click="beginReview">
          <span v-if="!processing">Request {{ fmt(amount || 0) }}</span>
          <span v-else class="inline-flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6V2z"/></svg>
            Processing…
          </span>
        </button>
      </div>
      <div class="h-3" />
    </div>

    <!-- Account Sheet -->
    <div v-if="sheet" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/45" @click="closeSheet"></div>
      <section class="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white dark:bg-[#0b0b10] p-4">
        <div class="mx-auto w-full max-w-md">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-semibold">{{ adding ? 'Add payout account' : 'Choose payout account' }}</h4>
            <button class="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10" @click="closeSheet">✖</button>
          </div>

          <!-- Add new -->
          <div v-if="adding" class="space-y-2 text-sm">
            <template v-if="method==='mobile'">
              <label class="field">
                <span class="label">Provider</span>
                <select v-model="draft.provider" class="input">
                  <option>M-Pesa</option><option>Tigo Pesa</option><option>Airtel Money</option>
                </select>
              </label>
              <label class="field">
                <span class="label">Phone (+255)</span>
                <input v-model="draft.msisdn" class="input" placeholder="+255 7xx xxx xxx" @input="formatTZPhone('draft.msisdn')">
              </label>
            </template>
            <template v-else>
              <label class="field">
                <span class="label">Bank</span>
                <input v-model="draft.bank" class="input" placeholder="e.g. CRDB">
              </label>
              <label class="field">
                <span class="label">Account number</span>
                <input v-model="draft.account" class="input" placeholder="e.g. 011XXXXXXXX">
              </label>
              <label class="field">
                <span class="label">Account name</span>
                <input v-model="draft.name" class="input" placeholder="Full name">
              </label>
            </template>
            <div class="flex gap-2 pt-1">
              <button class="btn-secondary flex-1" @click="adding=false">Back</button>
              <button class="btn-primary flex-1" :disabled="!canSaveDraft" @click="saveDraftAccount">Save</button>
            </div>
          </div>

          <!-- List -->
          <div v-else class="space-y-2">
            <div v-for="acc in accountsByMethod" :key="acc.id"
                 class="w-full text-left rounded-xl px-3 py-2 border border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between">
              <div class="text-sm">
                <div class="font-medium">
                  <template v-if="method==='mobile'">{{ acc.provider }} • {{ prettyPhone(acc.msisdn) }}</template>
                  <template v-else>{{ acc.bank }} • {{ acc.account }}</template>
                </div>
                <div class="text-xs text-gray-500 dark:text-white/60">{{ acc.label || 'Saved account' }}</div>
              </div>
              <button class="mini" @click="selectAccount(acc)">Select</button>
            </div>
            <button class="qa mt-2" @click="adding=true">➕ Add new</button>
          </div>
        </div>
      </section>
    </div>

    <!-- Review + OTP Sheet -->
    <div v-if="otpSheet" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/45" @click="otpSheet=false"></div>
      <section class="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white dark:bg-[#0b0b10] p-4">
        <div class="mx-auto w-full max-w-md">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-semibold">Confirm & verify</h4>
            <button class="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10" @click="otpSheet=false">✖</button>
          </div>

          <div class="rounded-xl border border-black/5 dark:border-white/10 p-3 text-sm">
            <div class="flex justify-between"><span>Amount</span><strong>{{ fmt(amount) }}</strong></div>
            <div class="flex justify-between"><span>Fees</span><strong>{{ fmt(fee) }}</strong></div>
            <div class="flex justify-between"><span>Net</span><strong>{{ fmt(net) }}</strong></div>
            <div class="flex justify-between">
              <span>To</span>
              <strong>
                <template v-if="method==='mobile'">{{ selected?.provider }} • {{ prettyPhone(selected?.msisdn || '') }}</template>
                <template v-else>{{ selected?.bank }} • {{ selected?.account }}</template>
              </strong>
            </div>
          </div>

          <div class="mt-3">
            <div class="flex items-center justify-between">
              <label class="text-sm font-semibold">One-time code</label>
              <button class="mini" :disabled="cooldown>0" @click="sendOtp">
                {{ cooldown>0 ? `Resend in ${cooldown}s` : 'Send code' }}
              </button>
            </div>
            <div class="mt-2 grid grid-cols-6 gap-2">
              <input v-for="i in 6" :key="i" class="otp" maxlength="1" inputmode="numeric" pattern="[0-9]*"
                     v-model="otp[i-1]" @input="onOtpInput(i-1,$event)" />
            </div>
          </div>

          <div class="flex gap-2 mt-3">
            <button class="btn-secondary flex-1" @click="otpSheet=false">Back</button>
            <button class="btn-primary flex-1" :disabled="otp.join('').length!==6 || processing" @click="submitWithdrawal">
              Confirm withdrawal
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- Result Sheet -->
    <div v-if="result" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/45" @click="result=null"></div>
      <section class="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white dark:bg-[#0b0b10] p-4">
        <div class="mx-auto w-full max-w-md text-center">
          <div class="text-4xl mb-1">✅</div>
          <h4 class="text-base font-semibold">Withdrawal requested</h4>
          <p class="text-sm text-gray-600 dark:text-white/70">We’re processing your payout.</p>

          <div class="mt-3 text-left rounded-xl border border-black/5 dark:border-white/10 p-3 text-sm">
            <div class="flex justify-between"><span>Tx ID</span><code class="font-mono">{{ result.txId }}</code></div>
            <div class="flex justify-between"><span>Method</span><span>{{ result.method }}</span></div>
            <div class="flex justify-between"><span>Amount</span><strong>{{ fmt(result.amount) }}</strong></div>
            <div class="flex justify-between"><span>Net</span><strong>{{ fmt(result.net) }}</strong></div>
            <div class="flex justify-between"><span>Time</span><span>{{ result.time }}</span></div>
          </div>

          <div class="flex gap-2 mt-3">
            <button class="qa flex-1" @click="copy(result.txId)">Copy ID</button>
            <button class="qa flex-1" @click="downloadReceipt">Download receipt</button>
          </div>

          <button class="btn-primary w-full mt-3" @click="result=null">Done</button>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'

/* --------- State --------- */
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
function onOnline(){ online.value = true } function onOffline(){ online.value = false }

const sandbox = ref(false)
const kycLevel = ref(1) // mock: 1..3
const balance = ref(250000) // TSh

const amount = ref<number | null>(null)
const method = ref<'mobile'|'bank'>('mobile')
const errors = reactive<{ amount?: string|null; dest?: string|null }>({ amount:null, dest:null })

/* Accounts store (persisted) */
type MobileAcc = { id:string; type:'mobile'; provider:'M-Pesa'|'Tigo Pesa'|'Airtel Money'; msisdn:string; label?:string }
type BankAcc   = { id:string; type:'bank'; bank:string; account:string; name?:string; label?:string }
type AnyAcc = MobileAcc | BankAcc

const ACC_KEY = 'withdraw_accounts_v1'
const accounts = ref<AnyAcc[]>([])
const selected = ref<AnyAcc | null>(null)

/* UI sheets */
const sheet = ref(false)
const adding = ref(false)
const otpSheet = ref(false)
const otp = ref<string[]>(['','','','','',''])
const cooldown = ref(0); let cooldownTimer:number|undefined
const processing = ref(false)
const result = ref<any|null>(null)

/* Quick amounts */
const minAmount = 1000, maxAmount = 2_000_000
const quick = [10000, 20000, 50000, 100000]

/* Daily limit (mock) */
const dailyLimit = 2_000_000
const withdrawnToday = 150_000

/* Draft account being added */
const draft = reactive<any>({ provider:'M-Pesa', msisdn:'+255 7', bank:'', account:'', name:'' })

/* --------- Computed --------- */
const fee = computed(() => {
  const a = Math.max(0, amount.value || 0)
  if (method.value === 'mobile') return Math.round(a*0.015) + 100 // 1.5% + 100 TSh
  return Math.round(a*0.02) + 1500 // bank: 2% + 1500
})
const net = computed(() => Math.max(0, (amount.value || 0) - fee.value))
const canSubmit = computed(() =>
  !errors.amount && !errors.dest && !!amount.value && amount.value!>=minAmount && amount.value!<=maxAmount && !!selected.value
)
const accountsByMethod = computed(() => accounts.value.filter(a => a.type === method.value))
const canSaveDraft = computed(() => {
  if (method.value === 'mobile') return /^(\+?255)\s?\d{2}\s?\d{3}\s?\d{3}$/.test(draft.msisdn.replace(/\D+/g,'255$&'.slice(-9))) || /^255\d{9}$/.test(draft.msisdn.replace(/\D/g,''))
  return draft.bank?.trim().length>1 && draft.account?.trim().length>5
})

/* --------- Lifecycle --------- */
onMounted(() => {
  window.addEventListener?.('online', onOnline)
  window.addEventListener?.('offline', onOffline)
  restoreAccounts()
  restoreDraft()
  // Preselect first available for method
  selected.value = accountsByMethod.value[0] || null
})
onBeforeUnmount(() => {
  window.removeEventListener?.('online', onOnline)
  window.removeEventListener?.('offline', onOffline)
  stopCooldown()
  stopAutosave()
})

/* --------- Validation --------- */
watch([amount, method, selected], () => { validateAmount(); validateDest(); autosave() }, { deep:true })
function validateAmount(){
  const a = amount.value ?? 0
  if (!a || a < minAmount) { errors.amount = `Minimum is ${fmt(minAmount)}`; return }
  if (a > maxAmount) { errors.amount = `Maximum is ${fmt(maxAmount)}`; return }
  if (a > balance.value) { errors.amount = `Exceeds balance (${fmt(balance.value)})`; return }
  if (withdrawnToday + a > dailyLimit) { errors.amount = `Daily limit exceeded`; return }
  errors.amount = null
}
function validateDest(){
  if (!selected.value) { errors.dest = 'Select a payout account'; return }
  if (method.value === 'mobile'){
    const digits = (selected.value as MobileAcc).msisdn.replace(/\D+/g,'')
    errors.dest = /^255\d{9}$/.test(digits) ? null : 'Invalid +255 format'
  } else {
    errors.dest = (selected.value as BankAcc).account?.length>5 ? null : 'Invalid account number'
  }
}

/* --------- Actions --------- */
function setQuick(v:number){ amount.value = v; navigator.vibrate?.([8]) }

function openSheet(add=false){ adding.value = add; sheet.value = true }
function closeSheet(){ sheet.value = false }
function selectAccount(acc: AnyAcc){ selected.value = acc; sheet.value = false; vibrate([10]) }

function formatTZPhone(path: 'draft.msisdn'){
  let digits = draft.msisdn.replace(/\D+/g,'')
  if (digits.startsWith('0')) digits = '255' + digits.slice(1)
  if (!digits.startsWith('255')) digits = '255' + digits
  digits = digits.slice(0,12)
  const parts = [digits.slice(0,3), digits.slice(3,6), digits.slice(6,9), digits.slice(9,12)].filter(Boolean)
  draft.msisdn = '+' + parts.join(' ')
}

function saveDraftAccount(){
  const id = 'AC' + Math.random().toString(36).slice(2,8).toUpperCase()
  if (method.value === 'mobile'){
    const acc: MobileAcc = { id, type:'mobile', provider: draft.provider, msisdn: draft.msisdn, label:'My mobile' }
    accounts.value.push(acc); persistAccounts(); selected.value = acc
  } else {
    const acc: BankAcc = { id, type:'bank', bank: draft.bank, account: draft.account, name: draft.name, label:'My bank' }
    accounts.value.push(acc); persistAccounts(); selected.value = acc
  }
  adding.value = false; sheet.value = false; vibrate([10])
}

function beginReview(){
  validateAmount(); validateDest()
  if (!canSubmit.value) return
  otp.value = ['','','','','','']
  otpSheet.value = true
}

function sendOtp(){
  if (cooldown.value>0) return
  // mock send
  cooldown.value = 30
  cooldownTimer = window.setInterval(()=> {
    cooldown.value--
    if (cooldown.value<=0) stopCooldown()
  }, 1000)
  vibrate([12])
}

function onOtpInput(i:number, e:Event){
  const v = (e.target as HTMLInputElement).value.replace(/\D/g,'').slice(0,1)
  otp.value[i] = v
  if (v && i<5) (e.target as HTMLInputElement).nextElementSibling?.focus()
}

async function submitWithdrawal(){
  if (otp.value.join('').length !== 6) return
  otpSheet.value = false
  processing.value = true
  // mock API call
  await sleep(900)
  const txId = 'TX' + Math.random().toString(36).slice(2,10).toUpperCase()
  // mock additional wait/poll
  await sleep(900)
  processing.value = false
  const time = new Intl.DateTimeFormat('en-GB', { dateStyle:'medium', timeStyle:'short', timeZone:'Africa/Dar_es_Salaam' }).format(new Date())
  result.value = { txId, method: method.value==='mobile' ? 'Mobile Money' : 'Bank Transfer', amount: amount.value, net: net.value, time }
  // adjust balance (demo)
  balance.value = Math.max(0, balance.value - (amount.value || 0))
  // clear draft after success
  clearDraft()
  vibrate([15, 50, 15])
}

function cancel(){ history.length>1 ? history.back() : window.scrollTo({ top:0, behavior:'smooth' }) }
function copy(t:string){ navigator.clipboard?.writeText(t) }
function downloadReceipt(){
  const blob = new Blob([JSON.stringify(result.value, null, 2)], { type:'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=`withdraw_${result.value.txId}.json`; a.click()
  URL.revokeObjectURL(url)
}
function upgradeKyc(){ kycLevel.value = Math.min(3, kycLevel.value+1) }

/* --------- Draft autosave --------- */
const DRAFT_KEY = 'withdraw_draft_v1'
let autosaveTimer:number|undefined
function autosave(){
  startAutosave()
  const snap = { amount: amount.value, method: method.value, selectedId: selected.value?.id, sandbox: sandbox.value }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(snap))
}
function restoreDraft(){
  try{
    const raw = localStorage.getItem(DRAFT_KEY); if(!raw) return
    const snap = JSON.parse(raw)
    amount.value = snap.amount ?? amount.value
    method.value = snap.method ?? method.value
    selected.value = accounts.value.find(a => a.id===snap.selectedId) || selected.value
    sandbox.value = !!snap.sandbox
  }catch{}
}
function clearDraft(){ localStorage.removeItem(DRAFT_KEY) }
function startAutosave(){ stopAutosave(); autosaveTimer = window.setInterval(()=> autosave(), 2500) as unknown as number }
function stopAutosave(){ if(autosaveTimer) clearInterval(autosaveTimer) }

/* --------- Accounts persistence --------- */
function persistAccounts(){ localStorage.setItem(ACC_KEY, JSON.stringify(accounts.value)) }
function restoreAccounts(){
  try{
    const raw = localStorage.getItem(ACC_KEY)
    if (raw) accounts.value = JSON.parse(raw)
    else {
      // seed example accounts
      accounts.value = [
        { id:'ACM1', type:'mobile', provider:'M-Pesa', msisdn:'+255 712 345 678', label:'Primary' },
        { id:'ACM2', type:'mobile', provider:'Tigo Pesa', msisdn:'+255 713 222 111' },
        { id:'ACB1', type:'bank', bank:'CRDB', account:'011012345678', name:'Jane Doe', label:'Main' }
      ] as AnyAcc[]
      persistAccounts()
    }
  }catch{}
}

/* --------- Utils --------- */
function fmt(n:number|null|undefined){ return new Intl.NumberFormat('en-TZ', { style:'currency', currency:'TZS', maximumFractionDigits:0 }).format(n || 0) }
function prettyPhone(p:string){ return p || '' }
function sleep(ms:number){ return new Promise(r=>setTimeout(r, ms)) }
function vibrate(pattern:number[]){ try{ navigator.vibrate?.(pattern) }catch{} }
function stopCooldown(){ if (cooldownTimer){ clearInterval(cooldownTimer); cooldownTimer = undefined } cooldown.value = 0 }
</script>

<style scoped>
/* Controls */
.field{ display:flex; flex-direction:column; }
.label{ font-size:.85rem; color:#64748b; margin-bottom:.2rem; }
.input{
  @apply h-11 rounded-xl px-3 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 outline-none focus:ring-2 ring-blue-600/60;
}

.chip{
  @apply h-9 px-3 rounded-full text-sm bg-gray-100 dark:bg-white/10 dark:text-white active:scale-95;
}
.mini{
  @apply h-9 px-2 rounded-lg text-xs bg-gray-100 dark:bg-white/10 dark:text-white active:scale-95;
}
.qa{
  @apply h-11 rounded-xl bg-gray-100 dark:bg-white/10 dark:text-white;
}
.btn-primary{
  @apply h-11 px-4 rounded-xl bg-blue-700 text-white text-sm font-medium active:scale-95 disabled:opacity-60;
}
.btn-secondary{
  @apply h-11 px-3 rounded-xl bg-gray-100 dark:bg-white/10 text-sm text-gray-800 dark:text-white active:scale-95;
}
.seg{
  @apply h-10 rounded-xl bg-gray-100 dark:bg-white/10 dark:text-white;
}
.seg-active{
  @apply ring-2 ring-blue-600/60 bg-blue-50 dark:bg-blue-900/20;
}

.tile{ @apply rounded-xl bg-gray-50 dark:bg-white/5 p-2; }
.muted{ @apply text-gray-500 dark:text-white/60 text-xs; }
.strong{ @apply font-semibold; }

/* OTP inputs */
.otp{
  @apply text-center h-11 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 outline-none;
  font-size:1.1rem;
}

/* Scrollbar */
.no-scrollbar { scrollbar-width: none; } .no-scrollbar::-webkit-scrollbar { display: none; }

/* Safe-area padding for phones with notches */
@supports(padding:max(0px)) {
  section { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
}
</style>
