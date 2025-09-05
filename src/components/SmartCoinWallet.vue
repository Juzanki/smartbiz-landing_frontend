<template>
  <div class="relative min-h-screen flex flex-col bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100">
    <!-- Top Bar -->
    <header class="sticky top-0 z-30 px-4 py-3 flex items-center justify-between bg-white/85 dark:bg-[#121212]/85 backdrop-blur border-b border-black/10 dark:border-white/10">
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 grid place-items-center shadow">🪙</div>
        <div class="leading-tight">
          <h2 class="text-base font-extrabold">SmartCoin Wallet</h2>
          <div class="flex items-center gap-2 text-xs">
            <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
                           online ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500']">
              <span class="w-1.5 h-1.5 rounded-full" :class="online ? 'bg-emerald-500' : 'bg-rose-500'"></span>
              {{ online ? 'Online' : 'Offline' }}
            </span>
            <span class="opacity-60">TZS • Mobile-first</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button class="btn-soft h-9 px-3" @click="refresh" :disabled="loading" title="Refresh">
          <span v-if="!loading">🔄</span>
          <span v-else class="animate-spin">⏳</span>
        </button>
        <button class="btn-soft h-9 px-3 md:hidden" @click="openReceive = true" title="Receive">📥</button>
      </div>
    </header>

    <!-- Balance Card -->
    <section class="px-4 pt-4">
      <div class="rounded-2xl p-4 bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white border border-cyan-700 shadow">
        <div class="flex items-center justify-between">
          <p class="text-xs opacity-80">Available Balance</p>
          <button class="text-xs underline opacity-80" @click="hidden = !hidden">{{ hidden ? 'Show' : 'Hide' }}</button>
        </div>

        <div class="mt-1 flex items-end gap-3">
          <h3 class="text-3xl font-black tracking-tight">
            <span v-if="!hidden">{{ formatCoins(balance.coins) }}</span>
            <span v-else>•••••</span>
            <span class="text-base font-semibold opacity-80 ml-1">Coins</span>
          </h3>
        </div>

        <p class="text-xs mt-1 opacity-80">
          ≈
          <span v-if="!hidden">{{ formatTZS(balance.coins * rateTZSPerCoin) }}</span>
          <span v-else>••••</span>
          ({{ rateTZSPerCoin }} TZS/coin)
        </p>

        <!-- Progress to next tier -->
        <div class="mt-3">
          <div class="flex justify-between text-xs opacity-80">
            <span>Tier: <b>{{ tier.label }}</b></span>
            <span>{{ tier.progress }}%</span>
          </div>
          <div class="h-2 rounded bg-white/10 overflow-hidden mt-1">
            <div class="h-full bg-cyan-400" :style="{ width: tier.progress + '%' }"></div>
          </div>
        </div>

        <!-- Wallet mini -->
        <div class="mt-3 text-xs flex items-center justify-between">
          <div class="opacity-80">
            ID: <span class="font-mono">{{ shortId(walletId) }}</span>
            <button class="underline ml-1" @click="copy(walletId)">Copy</button>
          </div>
          <button class="btn-soft h-8 px-3 hidden md:block" @click="openReceive = true">📥 Receive</button>
        </div>
      </div>
    </section>

    <!-- Quick Actions -->
    <section class="px-4 mt-3">
      <div class="grid grid-cols-4 gap-2 text-sm">
        <button class="qa" @click="openTopup = true">➕<span>Top-Up</span></button>
        <button class="qa" @click="openSend = true">📤<span>Send</span></button>
        <button class="qa" @click="openWithdraw = true">💳<span>Withdraw</span></button>
        <button class="qa" @click="openReceive = true">📥<span>Receive</span></button>
      </div>
    </section>

    <!-- Filters -->
    <section class="px-4 mt-4">
      <div class="flex gap-2 overflow-x-auto no-scrollbar">
        <button class="chip" :class="filter==='all' && 'chip-on'" @click="setFilter('all')">All</button>
        <button class="chip" :class="filter==='in' && 'chip-on'" @click="setFilter('in')">Incoming</button>
        <button class="chip" :class="filter==='out' && 'chip-on'" @click="setFilter('out')">Outgoing</button>
        <button class="chip" :class="filter==='pending' && 'chip-on'" @click="setFilter('pending')">Pending</button>
      </div>
    </section>

    <!-- History -->
    <main class="flex-1 px-4 mt-2 pb-40">
      <ul class="divide-y divide-black/5 dark:divide-white/10 rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-white dark:bg-[#161616]">
        <li v-for="tx in filteredTx" :key="tx.id" class="px-3 py-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-full grid place-items-center"
                 :class="tx.type==='in' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'">
              {{ tx.type==='in' ? '⬇' : '⬆' }}
            </div>
            <div class="text-sm">
              <p class="font-semibold">
                {{ tx.title }}
                <span v-if="tx.status==='pending'" class="ml-1 text-xs px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-600">pending</span>
              </p>
              <p class="text-xs opacity-70">{{ fmtTime(tx.ts) }}</p>
            </div>
          </div>
          <div class="text-right">
            <p :class="['text-sm font-bold', tx.type==='in' ? 'text-emerald-600' : 'text-rose-600']">
              {{ tx.type==='in' ? '+' : '-' }}{{ formatCoins(tx.amount) }}c
            </p>
            <p class="text-[11px] opacity-70">≈ {{ formatTZS(tx.amount * rateTZSPerCoin) }}</p>
          </div>
        </li>

        <!-- Skeletons -->
        <li v-if="loading" class="px-3 py-3">
          <div class="h-5 bg-black/10 dark:bg-white/10 rounded animate-pulse w-1/2 mb-2"></div>
          <div class="h-3 bg-black/10 dark:bg-white/10 rounded animate-pulse w-1/3"></div>
        </li>
      </ul>

      <div class="flex justify-center mt-3">
        <button class="btn-soft h-9 px-4" @click="loadMore" :disabled="loading || !hasMore">
          {{ hasMore ? (loading ? 'Loading…' : 'Load more') : 'End of history' }}
        </button>
      </div>
    </main>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast" class="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 bg-black/80 text-white text-xs px-3 py-2 rounded-xl shadow">
        {{ toast }}
      </div>
    </transition>

    <!-- ===== Bottom Sheets ===== -->

    <!-- TopUp -->
    <transition name="slide-up">
      <section v-if="openTopup" class="sheet" @click.self="openTopup = false">
        <div class="sheet-card">
          <header class="sheet-bar">
            <b>Top-Up</b>
            <button class="btn-ghost" @click="openTopup = false">✖</button>
          </header>

          <div class="grid grid-cols-4 gap-2">
            <button v-for="p in presets" :key="p" class="chip w-full" @click="topup.amount = p">{{ p }}c</button>
          </div>

          <div class="mt-3">
            <label class="text-xs opacity-70">Amount (coins)</label>
            <input v-model.number="topup.amount" type="number" min="1" class="input" placeholder="e.g. 100" />
            <p class="text-xs opacity-70 mt-1">≈ {{ formatTZS(topup.amount * rateTZSPerCoin) }}</p>
          </div>

          <div class="mt-3">
            <label class="text-xs opacity-70">Method</label>
            <select v-model="topup.method" class="input">
              <option value="mpesa">M-Pesa</option>
              <option value="tigopesa">Tigo Pesa</option>
              <option value="airtel">Airtel Money</option>
              <option value="card">Card</option>
            </select>
          </div>

          <button class="btn-primary w-full mt-4" @click="doTopup">Confirm</button>
          <p class="text-[11px] opacity-60 mt-2">* Demo only. TODO: Unganisha na backend ya malipo.</p>
        </div>
      </section>
    </transition>

    <!-- Send -->
    <transition name="slide-up">
      <section v-if="openSend" class="sheet" @click.self="openSend = false">
        <div class="sheet-card">
          <header class="sheet-bar">
            <b>Send Coins</b>
            <button class="btn-ghost" @click="openSend = false">✖</button>
          </header>

          <div class="mt-1">
            <label class="text-xs opacity-70">Recipient (username or ID)</label>
            <input v-model.trim="send.to" class="input" placeholder="@username or WALLET123…" />
          </div>

          <div class="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label class="text-xs opacity-70">Amount (coins)</label>
              <input v-model.number="send.amount" type="number" min="1" class="input" placeholder="e.g. 50" />
            </div>
            <div>
              <label class="text-xs opacity-70">≈ In TZS</label>
              <input :value="formatTZSPlain(send.amount * rateTZSPerCoin)" disabled class="input opacity-70" />
            </div>
          </div>

          <div class="mt-2">
            <label class="text-xs opacity-70">Note (optional)</label>
            <input v-model.trim="send.note" class="input" placeholder="Thanks!" />
          </div>

          <!-- PIN step -->
          <div class="mt-2">
            <label class="text-xs opacity-70">PIN (6-digit)</label>
            <input v-model="send.pin" maxlength="6" inputmode="numeric" class="input tracking-widest text-center" placeholder="••••••" />
          </div>

          <button class="btn-primary w-full mt-3" :disabled="!canSend" @click="doSend">Send</button>
          <p class="text-[11px] opacity-60 mt-2">Security: transactions require valid PIN.</p>
        </div>
      </section>
    </transition>

    <!-- Withdraw -->
    <transition name="slide-up">
      <section v-if="openWithdraw" class="sheet" @click.self="openWithdraw = false">
        <div class="sheet-card">
          <header class="sheet-bar">
            <b>Withdraw</b>
            <button class="btn-ghost" @click="openWithdraw = false">✖</button>
          </header>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs opacity-70">Amount (coins)</label>
              <input v-model.number="wd.amount" type="number" min="1" class="input" />
            </div>
            <div>
              <label class="text-xs opacity-70">To (TZS)</label>
              <input :value="formatTZSPlain(wd.amount * rateTZSPerCoin)" disabled class="input opacity-70" />
            </div>
          </div>

          <div class="mt-2">
            <label class="text-xs opacity-70">Method</label>
            <select v-model="wd.method" class="input">
              <option value="mpesa">M-Pesa</option>
              <option value="tigopesa">Tigo Pesa</option>
              <option value="airtel">Airtel Money</option>
              <option value="bank">Bank</option>
            </select>
          </div>

          <div class="mt-2">
            <label class="text-xs opacity-70">PIN</label>
            <input v-model="wd.pin" maxlength="6" inputmode="numeric" class="input tracking-widest text-center" placeholder="••••••" />
          </div>

          <button class="btn-primary w-full mt-3" :disabled="!canWithdraw" @click="doWithdraw">Withdraw</button>
          <p class="text-[11px] opacity-60 mt-2">* Demo only. TODO: Thibitisha KYC kabla ya kutoa.</p>
        </div>
      </section>
    </transition>

    <!-- Receive -->
    <transition name="slide-up">
      <section v-if="openReceive" class="sheet" @click.self="openReceive = false">
        <div class="sheet-card">
          <header class="sheet-bar">
            <b>Receive</b>
            <button class="btn-ghost" @click="openReceive = false">✖</button>
          </header>

          <div class="grid place-items-center my-2">
            <component v-if="QRCodeVue" :is="QRCodeVue" :value="receivePayload" :size="180" class="bg-white p-2 rounded" />
            <div v-else class="text-xs opacity-70">Loading QR…</div>
          </div>
          <p class="text-center text-xs opacity-80">
            Wallet ID: <span class="font-mono">{{ walletId }}</span>
          </p>
          <div class="mt-3 grid grid-cols-2 gap-2">
            <button class="btn-soft" @click="copy(walletId)">Copy ID</button>
            <button class="btn-soft" @click="shareReceive">Share Link</button>
          </div>
        </div>
      </section>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'

/* ===== Config / Props (rahisi ku-override) ===== */
const rateTZSPerCoin = 50 // 1 coin = 50 TZS (example)
const walletId = localStorage.getItem('sb_wallet_id') || genWalletId()
localStorage.setItem('sb_wallet_id', walletId)

/* ===== Online/Offline ===== */
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
function onOnline(){ online.value = true }
function onOffline(){ online.value = false }

/* ===== State ===== */
const loading = ref(false)
const hidden = ref(false)
const balance = reactive({ coins: Number(localStorage.getItem('sb_balance') || 250) })
const toast = ref('')

/* Bottom sheets */
const openTopup = ref(false)
const openSend = ref(false)
const openWithdraw = ref(false)
const openReceive = ref(false)
const QRCodeVue = ref(null)

/* TopUp */
const topup = reactive({ amount: 100, method: 'mpesa' })
const presets = [50, 100, 250, 500, 1000]

/* Send */
const send = reactive({ to: '', amount: 0, note: '', pin: '' })

/* Withdraw */
const wd = reactive({ amount: 0, method: 'mpesa', pin: '' })

/* History (mock + pagination) */
const filter = ref('all') // all|in|out|pending
const page = ref(1)
const pageSize = 10
const hasMore = ref(true)
const txs = ref(loadCache('sb_txs', []) )

/* ===== Computed ===== */
const tier = computed(() => {
  // Example tiers: Starter 0-499, Pro 500-1999, Elite 2000+
  const c = balance.coins
  if (c >= 2000) return { label: 'Elite', progress: Math.min(100, Math.round(((c-2000)/2000)*100)) }
  if (c >= 500)  return { label: 'Pro',   progress: Math.min(100, Math.round(((c-500)/1500)*100)) }
  return { label: 'Starter', progress: Math.min(100, Math.round((c/500)*100)) }
})
const filteredTx = computed(() => {
  let arr = [...txs.value]
  if (filter.value !== 'all') arr = arr.filter(t => t.status === filter.value || t.type === filter.value)
  return arr.slice(0, page.value * pageSize)
})
const canSend = computed(() =>
  send.to && send.amount > 0 && send.amount <= balance.coins && /^\d{6}$/.test(send.pin)
)
const canWithdraw = computed(() =>
  wd.amount > 0 && wd.amount <= balance.coins && /^\d{6}$/.test(wd.pin)
)
const receivePayload = computed(() => JSON.stringify({ walletId, ts: Date.now() }))

/* ===== Methods ===== */
function refresh(){
  loading.value = true
  setTimeout(() => { loading.value = false; toastMsg('Refreshed') }, 600)
}
function setFilter(f){ filter.value = f; page.value = 1 }
function loadMore(){ if (!hasMore.value) return; page.value++; if (filteredTx.value.length >= txs.value.length) hasMore.value = false }

function doTopup(){
  if (topup.amount <= 0) return toastMsg('Enter a valid amount')
  balance.coins += Number(topup.amount)
  persist()
  pushTx({ type: 'in', amount: topup.amount, title: `Top-Up (${topup.method})`, status: 'done' })
  openTopup.value = false
  toastMsg('✅ Top-Up successful')
}
function doSend(){
  if (!canSend.value) return toastMsg('Review send details')
  balance.coins -= Number(send.amount)
  persist()
  pushTx({ type: 'out', amount: send.amount, title: `To ${send.to}${send.note ? ' — ' + send.note : ''}`, status: 'done' })
  Object.assign(send, { to:'', amount:0, note:'', pin:'' })
  openSend.value = false
  toastMsg('✅ Sent')
}
function doWithdraw(){
  if (!canWithdraw.value) return toastMsg('Review withdraw details')
  balance.coins -= Number(wd.amount)
  persist()
  pushTx({ type: 'out', amount: wd.amount, title: `Withdraw (${wd.method})`, status: 'pending' })
  Object.assign(wd, { amount:0, method:'mpesa', pin:'' })
  openWithdraw.value = false
  toastMsg('⏳ Withdrawal requested')
}

async function shareReceive(){
  try{
    await navigator.share?.({ title: 'Receive SmartCoins', text: 'Scan or use my Wallet ID', url: window.location.href })
  }catch{}
}

function pushTx({ type, amount, title, status }){
  txs.value.unshift({ id: Date.now() + Math.random(), type, amount, title, status: status || 'done', ts: new Date().toISOString() })
  saveCache('sb_txs', txs.value)
  hasMore.value = true
  page.value = 1
}

function persist(){
  localStorage.setItem('sb_balance', String(balance.coins))
}

function copy(t){
  try{ navigator.clipboard.writeText(t); toastMsg('Copied') } catch { toastMsg('Copy failed') }
}

function shortId(id){ return id.slice(0,6) + '…' + id.slice(-4) }

function formatCoins(n){ return new Intl.NumberFormat('en-US').format(Math.floor(n)) }
function formatTZS(n){ return new Intl.NumberFormat('sw-TZ', { style:'currency', currency:'TZS', maximumFractionDigits:0 }).format(Math.round(n)) }
function formatTZSPlain(n){ return new Intl.NumberFormat('sw-TZ', { maximumFractionDigits:0 }).format(Math.round(n)) + ' TZS' }
function fmtTime(iso){ const d = new Date(iso); return d.toLocaleString([], { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'short' }) }

function toastMsg(m){ toast.value = m; try{ navigator.vibrate?.(8) }catch{}; setTimeout(()=>toast.value='', 1600) }

function genWalletId(){
  const base = 'WALLET' + Math.random().toString(36).slice(2,10).toUpperCase()
  return base + Math.floor(Math.random()*1000).toString().padStart(3,'0')
}

function saveCache(key, val){ localStorage.setItem(key, JSON.stringify(val)) }
function loadCache(key, fallback){ try{ return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback }catch{ return fallback } }

/* ===== Lifecycle ===== */
onMounted(async () => {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  // Lazy-load QR component
  try{ QRCodeVue.value = (await import('qrcode.vue')).default } catch {}
  if (!txs.value.length){
    // Seed demo transactions
    txs.value = [
      { id: 1, type:'in',  amount: 120, title: 'Gift from @esther', status:'done', ts: new Date(Date.now()-3600e3).toISOString() },
      { id: 2, type:'out', amount: 60,  title: 'Tip to @alpha',     status:'done', ts: new Date(Date.now()-2*3600e3).toISOString() },
      { id: 3, type:'out', amount: 300, title: 'Withdraw (M-Pesa)', status:'pending', ts: new Date(Date.now()-86400e3).toISOString() }
    ]
    saveCache('sb_txs', txs.value)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})
</script>

<style scoped>
/* Buttons & inputs */
.btn-soft{ @apply rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 border border-black/10 dark:border-white/10 text-sm; }
.btn-ghost{ @apply rounded-xl bg-transparent hover:bg-black/5 dark:hover:bg-white/10; }
.btn-primary{ @apply h-11 px-4 rounded-xl bg-yellow-400 text-black font-bold shadow hover:brightness-110 active:translate-y-[1px]; }
.input{ @apply w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1b1b1b] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400; }

/* Chips & quick actions */
.chip{ @apply px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-xs hover:bg-black/10 dark:hover:bg-white/15 whitespace-nowrap; }
.chip-on{ @apply bg-yellow-400 text-black font-semibold; }
.qa{ @apply grid place-items-center gap-1 rounded-2xl py-3 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15; }
.qa span{ @apply text-xs }

/* Bottom sheet */
.sheet{ @apply fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-end; }
.sheet-card{ @apply w-full rounded-t-2xl bg-white dark:bg-[#1b1b1b] p-4 border-t border-black/10 dark:border-white/10; }
.sheet-bar{ @apply flex items-center justify-between mb-2; }

/* Animations */
.no-scrollbar::-webkit-scrollbar{ display:none }
.fade-enter-active,.fade-leave-active{ transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to{ opacity:0 }
.slide-up-enter-active,.slide-up-leave-active{ transition: transform .22s ease, opacity .18s ease }
.slide-up-enter-from,.slide-up-leave-to{ transform: translateY(12px); opacity:0 }
</style>
