<!-- src/views/SmartCoinWallet.vue -->
<template>
  <div class="app">
    <!-- Top App Bar -->
    <header class="appbar">
      <button class="iconbtn" @click="goBack" aria-label="Back">
        <svg viewBox="0 0 24 24" class="ic"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="ttl">
        <h1>SmartCoin Wallet</h1>
        <p>Simamia mizania, miamala na malipo</p>
      </div>
      <button class="iconbtn" @click="openSettings" aria-label="Settings">
        <svg viewBox="0 0 24 24" class="ic"><path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm7.94-2.88l1.56-1.12-1.56-1.12a7.9 7.9 0 00-.63-1.54l.25-1.9-1.86-.78a7.9 7.9 0 00-1.23-1.23l-.78-1.86-1.9.25a7.9 7.9 0 00-1.54-.63L12.38 2h-1.76l-.12 1.56a7.9 7.9 0 00-1.54.63l-1.9-.25-.78 1.86a7.9 7.9 0 00-1.23 1.23L3.33 8.9l.25 1.9c-.24.5-.45 1.02-.63 1.54L1.4 13.46l1.56 1.12c.18.53.39 1.05.63 1.54l-.25 1.9 1.86.78c.38.45.79.86 1.23 1.23l.78 1.86 1.9-.25c.5.24 1.02.45 1.54.63L10.62 22h1.76l.12-1.56c.52-.18 1.04-.39 1.54-.63l1.9.25.78-1.86c.45-.38.86-.79 1.23-1.23l1.86-.78-.25-1.9c.24-.5.45-1.02.63-1.54z" stroke="currentColor" stroke-width="0" fill="currentColor"/></svg>
      </button>
    </header>

    <!-- Balance Card -->
    <section class="pad">
      <div class="card balance">
        <div class="toprow">
          <div class="coin">
            <div class="coin-glow"></div>
            <span>🪙</span>
          </div>
          <div class="bmeta">
            <p class="label">Current Balance</p>
            <h3>{{ formatTZS(balance) }}</h3>
            <p class="sub">≈ {{ coins.toLocaleString() }} SmartCoins</p>
          </div>
          <button class="mini-btn" @click="refresh" :disabled="loading">
            <svg v-if="!loading" viewBox="0 0 24 24" class="mini-ic"><path d="M4 4v6h6M20 20v-6h-6M5 19a8 8 0 0014-5M19 5a8 8 0 00-14 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
            <svg v-else viewBox="0 0 24 24" class="mini-ic spin"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none"/></svg>
          </button>
        </div>

        <div class="quick">
          <button class="qbtn primary" @click="recharge"><span>Recharge</span></button>
          <button class="qbtn" @click="withdraw"><span>Withdraw</span></button>
          <button class="qbtn" @click="transfer"><span>Transfer</span></button>
        </div>
      </div>
    </section>

    <!-- Tabs -->
    <section class="pad">
      <div class="tabs">
        <button :class="['tab', tab==='activity' ? 'active' : '']" @click="tab='activity'">Activity</button>
        <button :class="['tab', tab==='stats' ? 'active' : '']" @click="tab='stats'">Stats</button>
      </div>
    </section>

    <!-- Activity -->
    <section class="pad" v-if="tab==='activity'">
      <div class="card">
        <div class="filters">
          <div class="chips">
            <button v-for="f in filters" :key="f.value" :class="['chip', filter===f.value?'active':'']" @click="filter=f.value">{{ f.label }}</button>
          </div>
          <input class="search" type="search" v-model.trim="query" placeholder="Tafuta muamala..." />
        </div>

        <div v-if="loadingTx" class="skeletons">
          <div v-for="i in 5" :key="i" class="sk"></div>
        </div>
        <div v-else>
          <div v-if="visibleTx.length" class="tx-list">
            <div v-for="t in visibleTx" :key="t.id" class="tx">
              <div class="tx-ic" :class="t.type">
                <span v-if="t.type==='in'">➕</span>
                <span v-else-if="t.type==='out'">➖</span>
                <span v-else>⇄</span>
              </div>
              <div class="tx-body">
                <p class="tx-title">{{ t.title }}</p>
                <p class="tx-sub">{{ t.date }} • {{ t.ref }}</p>
              </div>
              <div class="tx-amt" :class="t.type">{{ t.type==='out' ? '-' : '+' }}{{ formatTZS(t.amount) }}</div>
              <span class="badge" :class="t.status">{{ t.status }}</span>
            </div>
          </div>
          <div v-else class="empty">Hakuna miamala inayolingana na utafutaji.</div>
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="pad" v-else>
      <div class="card">
        <h3 class="card-title">Summary (Last 30 days)</h3>
        <div class="stats">
          <div class="stat">
            <p class="s-label">Total In</p>
            <h4 class="s-val pos">{{ formatTZS(totalIn) }}</h4>
          </div>
          <div class="stat">
            <p class="s-label">Total Out</p>
            <h4 class="s-val neg">{{ formatTZS(totalOut) }}</h4>
          </div>
          <div class="stat">
            <p class="s-label">Net</p>
            <h4 class="s-val">{{ formatTZS(totalIn-totalOut) }}</h4>
          </div>
        </div>

        <div class="hint">
          * Add charts later (recharts/d3) — muundo tayari ni responsive.
        </div>
      </div>
    </section>

    <!-- Sticky Action Bar -->
    <footer class="actionbar">
      <div class="paymeta">
        <span>Wallet</span>
        <strong>{{ formatTZS(balance) }}</strong>
      </div>
      <button class="paybtn" @click="recharge">Top Up Now</button>

      <transition name="toast">
        <div v-if="msg" class="toast ok">{{ msg }}</div>
      </transition>
      <transition name="toast">
        <div v-if="err" class="toast bad">{{ err }}</div>
      </transition>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Demo state (replace with API later)
const balance = ref(245000)
const coins = ref(245000) // 1 coin == 1 TZS (example)
const loading = ref(false)
const msg = ref('')
const err = ref('')

const tab = ref('activity')
const loadingTx = ref(true)
const filter = ref('all')
const query = ref('')

const filters = [
  { value: 'all', label: 'All' },
  { value: 'in', label: 'In' },
  { value: 'out', label: 'Out' },
  { value: 'pending', label: 'Pending' },
]

const tx = ref([
  { id: 1, title: 'Recharge - M-Pesa', date: '2025-08-10 14:12', ref: 'INV-93812', amount: 20000, type: 'in', status: 'success' },
  { id: 2, title: 'Gift Sent', date: '2025-08-10 20:31', ref: 'GF-0912', amount: 5000, type: 'out', status: 'success' },
  { id: 3, title: 'Transfer to @Alpha', date: '2025-08-11 09:15', ref: 'TR-3345', amount: 12000, type: 'out', status: 'pending' },
  { id: 4, title: 'Cashout - Airtel', date: '2025-08-11 18:42', ref: 'WD-5541', amount: 30000, type: 'out', status: 'success' },
  { id: 5, title: 'Promo Bonus', date: '2025-08-12 10:05', ref: 'BN-7711', amount: 2500, type: 'in', status: 'success' },
])

const visibleTx = computed(() => {
  let list = [...tx.value]
  if (filter.value !== 'all') {
    if (filter.value === 'in' || filter.value === 'out') {
      list = list.filter(t => t.type === filter.value)
    } else {
      list = list.filter(t => t.status === filter.value)
    }
  }
  const q = query.value.toLowerCase()
  if (q) {
    list = list.filter(t =>
      `${t.title} ${t.ref} ${t.date}`.toLowerCase().includes(q)
    )
  }
  return list
})

const totalIn = computed(() => tx.value.filter(t=>t.type==='in').reduce((s,t)=>s+t.amount,0))
const totalOut = computed(() => tx.value.filter(t=>t.type==='out').reduce((s,t)=>s+t.amount,0))

function formatTZS(v) {
  const n = Number(v || 0)
  return n.toLocaleString('en-KE', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 })
}

async function refresh() {
  loading.value = true
  try {
    // const res = await axios.get('/api/wallet')
    // balance.value = res.data.balance
    await new Promise(r => setTimeout(r, 850))
    balance.value += Math.floor(Math.random()*300)
    msg.value = 'Balance refreshed.'
  } catch {
    err.value = 'Failed to refresh balance.'
  } finally {
    loading.value = false
    setTimeout(()=>{ msg.value=''; err.value='' }, 2200)
  }
}

function recharge(){ msg.value='Open: Recharge flow (M-Pesa/Airtel/Tigo)…'; setTimeout(()=>msg.value='',2000) }
function withdraw(){ msg.value='Open: Withdraw flow…'; setTimeout(()=>msg.value='',2000) }
function transfer(){ msg.value='Open: Transfer flow…'; setTimeout(()=>msg.value='',2000) }
function openSettings(){ msg.value='Open: Wallet settings…'; setTimeout(()=>msg.value='',2000) }
function goBack(){ if (history.length>1) history.back() }

onMounted(()=>{
  setTimeout(()=> loadingTx.value = false, 700)
})
</script>

<style scoped>
/* ===== App (digital gradient + glow) ===== */
.app{
  min-height:100vh;
  background:
    radial-gradient(900px 480px at 90% -10%, #2e2a8a 0%, rgba(46,42,138,0) 60%),
    radial-gradient(800px 420px at -10% 0%, #6b21a8 0%, rgba(107,33,168,0) 55%),
    linear-gradient(180deg,#0a0f22 0%, #0b1633 100%);
  color:#fff;
  display:flex; flex-direction:column;
}

/* ===== Top App Bar ===== */
.appbar{
  position:sticky; top:0; z-index:20;
  display:flex; align-items:center; gap:.75rem;
  padding:1rem .95rem .75rem;
  background:linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,0));
  backdrop-filter: blur(12px);
}
.iconbtn{
  height:40px; width:40px; border-radius:999px; display:grid; place-items:center;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
}
.ic{ width:20px; height:20px; opacity:.9 }
.iconbtn:active{ transform:scale(.96) }
.ttl h1{ margin:0; font-size:1.05rem; font-weight:800 }
.ttl p{ margin:.15rem 0 0; font-size:.72rem; color:rgba(255,255,255,.68) }

/* ===== Padding section ===== */
.pad{ padding: .75rem .95rem 0 }

/* ===== Cards ===== */
.card{
  border-radius:1.25rem;
  background:linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(18px);
  box-shadow: 0 12px 40px rgba(0,0,0,.45);
  padding:1rem;
}

/* ===== Balance Card ===== */
.balance .toprow{ display:flex; align-items:center; gap:.9rem }
.coin{ position:relative; height:56px; width:56px; border-radius:18px;
  display:grid; place-items:center; font-size:1.3rem;
  background:linear-gradient(135deg,#fbbf24,#f59e0b);
  box-shadow: inset 0 -6px 14px rgba(0,0,0,.25), 0 8px 24px rgba(245,158,11,.35);
  color:#2a1900;
}
.coin-glow{ position:absolute; inset:-8px; border-radius:22px; box-shadow:0 0 26px rgba(251,191,36,.45) }
.bmeta .label{ font-size:.78rem; color:rgba(255,255,255,.7) }
.bmeta h3{ margin:.15rem 0 0; font-size:1.3rem; font-weight:900; letter-spacing:.2px }
.sub{ margin:.1rem 0 0; font-size:.78rem; color:rgba(255,255,255,.75) }
.mini-btn{
  margin-left:auto; height:40px; width:40px; border-radius:12px;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14);
  display:grid; place-items:center;
}
.mini-ic{ width:18px; height:18px; opacity:.9 }
.spin{ animation:spin 1s linear infinite }
@keyframes spin { to { transform: rotate(360deg) } }

.quick{ display:flex; gap:.6rem; margin-top:1rem }
.qbtn{
  flex:1; border-radius:1rem; padding:.8rem .9rem; font-weight:800; text-align:center;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); color:#fff;
  transition:transform .12s ease, box-shadow .2s ease;
}
.qbtn:active{ transform:scale(.98) }
.qbtn.primary{
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee);
  color:#000; box-shadow:0 8px 24px rgba(99,102,241,.35);
}

/* ===== Tabs ===== */
.tabs{
  display:flex; gap:.6rem; background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.1); padding:.35rem; border-radius:1rem;
}
.tab{
  flex:1; padding:.6rem; border-radius:.8rem; font-weight:800; text-align:center;
  background:transparent; border:1px solid transparent; color:#fff;
}
.tab.active{
  background:linear-gradient(135deg, rgba(99,102,241,.25), rgba(34,211,238,.18));
  border-color:rgba(99,102,241,.45);
  box-shadow:0 8px 24px rgba(99,102,241,.25);
  color:#fff;
}

/* ===== Filters & Search ===== */
.filters{ display:grid; gap:.6rem; margin-bottom:.8rem }
.chips{ display:flex; gap:.5rem; overflow-x:auto; padding-bottom:.2rem }
.chips::-webkit-scrollbar{ display:none }
.chip{
  padding:.5rem .85rem; border-radius:999px; white-space:nowrap; font-weight:700; font-size:.86rem;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); color:#fff;
}
.chip.active{
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee);
  border-color:transparent; color:#000; box-shadow:0 6px 18px rgba(99,102,241,.35);
}
.search{
  width:100%; border-radius:1rem; padding:.7rem .9rem; font-size:.92rem; color:#fff;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
}
.search::placeholder{ color:rgba(255,255,255,.55) }

/* ===== Transactions ===== */
.tx-list{ display:grid; gap:.55rem }
.tx{
  position:relative; display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:.75rem;
  padding:.75rem; border-radius:1rem; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
}
.tx-ic{
  height:40px; width:40px; border-radius:12px; display:grid; place-items:center; font-weight:900;
  background:rgba(255,255,255,.08); color:#000;
}
.tx-ic.in{ background:#a7f3d0 }
.tx-ic.out{ background:#fecaca }
.tx-ic.transfer{ background:#bfdbfe }
.tx-body{ min-width:0 }
.tx-title{ margin:0; font-weight:900; font-size:.95rem }
.tx-sub{ margin:.15rem 0 0; font-size:.78rem; color:rgba(255,255,255,.75) }
.tx-amt{ font-weight:900; }
.tx-amt.in{ color:#86efac }
.tx-amt.out{ color:#fecaca }
.badge{
  position:absolute; right:.6rem; bottom:.55rem; font-size:.7rem; padding:.15rem .5rem; border-radius:.6rem; border:1px solid;
}
.badge.success{ color:#b8f3d8; border-color:#2dd4bf; background:rgba(45,212,191,.12) }
.badge.pending{ color:#fde68a; border-color:#f59e0b; background:rgba(245,158,11,.12) }
.badge.failed{ color:#ffc9d2; border-color:#f43f5e; background:rgba(244,63,94,.12) }

.skeletons{ display:grid; gap:.55rem }
.sk{
  height:68px; border-radius:1rem; background:linear-gradient(90deg, rgba(255,255,255,.06), rgba(255,255,255,.12), rgba(255,255,255,.06));
  animation: shine 1.1s linear infinite; border:1px solid rgba(255,255,255,.1)
}
@keyframes shine{ 0%{ background-position:-200px 0 } 100%{ background-position:200px 0 } }

/* ===== Empty ===== */
.empty{
  text-align:center; color:rgba(255,255,255,.7); padding:.9rem; border-radius:1rem;
  background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.1);
}

/* ===== Sticky Action Bar ===== */
.actionbar{
  position:sticky; bottom:0; z-index:30; margin-top:auto;
  padding:.75rem .95rem 1rem;
  background:linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.55) 40%, rgba(0,0,0,.8) 100%);
  backdrop-filter: blur(12px);
}
.paymeta{ display:flex; align-items:center; justify-content:space-between; margin-bottom:.5rem; font-size:.92rem; color:rgba(255,255,255,.85) }
.paymeta strong{ font-size:1.05rem }
.paybtn{
  width:100%; border:none; border-radius:999px; padding:1rem;
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee);
  color:#000; font-weight:900; letter-spacing:.3px; cursor:pointer;
  box-shadow:0 10px 28px rgba(99,102,241,.35); transition:transform .12s ease, opacity .2s ease;
}
.paybtn:active{ transform:scale(.98) }

/* ===== Toasts ===== */
.toast{
  margin-top:.6rem; border-radius:1rem; padding:.75rem .9rem; font-size:.9rem; border:1px solid;
}
.toast.ok{ background:rgba(16,185,129,.14); border-color:rgba(16,185,129,.35); color:#b8f3d8 }
.toast.bad{ background:rgba(244,63,94,.14); border-color:rgba(244,63,94,.35); color:#ffc9d2 }
.toast-enter-active,.toast-leave-active{ transition: all .25s ease }
.toast-enter-from,.toast-leave-to{ opacity:0; transform: translateY(6px) }

/* tablet+ */
@media (min-width: 768px){
  .pad{ display:flex; justify-content:center }
  .card{ width:720px }
}
</style>
