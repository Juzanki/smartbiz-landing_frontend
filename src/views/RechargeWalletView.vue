<!-- src/views/RechargeWalletView.vue -->
<template>
  <div class="app">
    <!-- Top App Bar -->
    <header class="appbar">
      <button class="iconbtn" @click="goBack" aria-label="Back">
        <svg viewBox="0 0 24 24" class="ic"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="ttl">
        <h1>Recharge Wallet</h1>
        <p>Ongeza SmartCoins zako kwa haraka</p>
      </div>
    </header>

    <!-- Balance Card -->
    <section class="pad">
      <div class="card balance">
        <div class="row">
          <div class="coin">
            <div class="coin-glow"></div>
            <span>🪙</span>
          </div>
          <div class="bmeta">
            <p class="label">Current Balance</p>
            <h3>{{ formatTZS(balance) }}</h3>
          </div>
          <button class="mini-btn" @click="refreshBalance" :disabled="loadingBal">
            <svg v-if="!loadingBal" viewBox="0 0 24 24" class="mini-ic"><path d="M4 4v6h6M20 20v-6h-6M5 19a8 8 0 0014-5M19 5a8 8 0 00-14 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
            <svg v-else viewBox="0 0 24 24" class="mini-ic spin"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none"/></svg>
          </button>
        </div>
      </div>
    </section>

    <!-- Amount Selector -->
    <section class="pad">
      <div class="card">
        <h3 class="card-title">Chagua Kiasi</h3>

        <!-- Preset chips -->
        <div class="chips">
          <button
            v-for="a in presets"
            :key="a"
            :class="['chip', amount === a ? 'active' : '']"
            @click="selectPreset(a)"
          >
            {{ formatTZS(a) }}
          </button>
        </div>

        <!-- Custom amount -->
        <div class="field">
          <label class="lbl">Kiasi kingine (TZS)</label>
          <div class="amtbox">
            <span class="prefix">TZS</span>
            <input
              class="amtinp"
              type="tel"
              inputmode="numeric"
              placeholder="0"
              v-model="amountInput"
              @input="syncAmount"
            />
            <button class="clear" v-if="amount" @click="clearAmount" aria-label="Clear">✕</button>
          </div>
          <p class="hint">Min {{ formatTZS(minAmount) }} · Max {{ formatTZS(maxAmount) }}</p>
          <p v-if="amountError" class="err">{{ amountError }}</p>
        </div>
      </div>
    </section>

    <!-- Payment Methods -->
    <section class="pad">
      <div class="card">
        <h3 class="card-title">Chagua Njia ya Malipo</h3>

        <div class="pm-list">
          <label class="pm" :class="{ active: method==='mpesa' }">
            <input class="sr" type="radio" value="mpesa" v-model="method" />
            <div class="pm-ic pm-mpesa">M</div>
            <div class="pm-body">
              <p class="pm-name">M-Pesa</p>
              <p class="pm-note">Vodacom — USSD / STK Push</p>
            </div>
            <div class="pm-check" v-if="method==='mpesa'">✓</div>
          </label>

          <label class="pm" :class="{ active: method==='airtel' }">
            <input class="sr" type="radio" value="airtel" v-model="method" />
            <div class="pm-ic pm-airtel">A</div>
            <div class="pm-body">
              <p class="pm-name">Airtel Money</p>
              <p class="pm-note">Airtel — USSD / STK Push</p>
            </div>
            <div class="pm-check" v-if="method==='airtel'">✓</div>
          </label>

          <label class="pm" :class="{ active: method==='tigo' }">
            <input class="sr" type="radio" value="tigo" v-model="method" />
            <div class="pm-ic pm-tigo">T</div>
            <div class="pm-body">
              <p class="pm-name">Tigo Pesa</p>
              <p class="pm-note">Tigo — USSD / STK Push</p>
            </div>
            <div class="pm-check" v-if="method==='tigo'">✓</div>
          </label>
        </div>
      </div>
    </section>

    <!-- Sticky Pay Bar -->
    <footer class="paybar">
      <div class="paymeta">
        <span>Unalipa</span>
        <strong>{{ amount ? formatTZS(amount) : '—' }}</strong>
      </div>
      <button class="paybtn" :disabled="!canPay || paying" @click="payNow">
        <span v-if="!paying">Proceed to Pay</span>
        <span v-else class="loader">Processing…</span>
      </button>

      <!-- Toasts -->
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
import { ref, computed } from 'vue'

const balance = ref(125000)          // sample balance
const loadingBal = ref(false)

const presets = [2000, 5000, 10000, 20000, 50000, 100000]
const minAmount = 1000
const maxAmount = 5000000

const amount = ref(0)
const amountInput = ref('')
const method = ref('mpesa')

const paying = ref(false)
const msg = ref('')
const err = ref('')

function formatTZS(v) {
  const n = Number(v || 0)
  return n.toLocaleString('en-KE', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 })
}

function selectPreset(v) {
  amount.value = v
  amountInput.value = String(v)
}

function syncAmount() {
  const numeric = amountInput.value.replace(/[^\d]/g, '')
  amountInput.value = numeric
  amount.value = Number(numeric || 0)
}

function clearAmount() {
  amount.value = 0
  amountInput.value = ''
}

const amountError = computed(() => {
  if (!amount.value) return ''
  if (amount.value < minAmount) return `Kiasi kidogo sana. Angalau ${formatTZS(minAmount)}.`
  if (amount.value > maxAmount) return `Kiasi kikubwa sana. Usizidi ${formatTZS(maxAmount)}.`
  return ''
})

const canPay = computed(() => amount.value >= minAmount && amount.value <= maxAmount && !!method.value)

async function refreshBalance() {
  loadingBal.value = true
  try {
    // const res = await axios.get('/api/wallet/balance')
    // balance.value = res.data.balance
    await new Promise(r => setTimeout(r, 800))
    // demo increase
    balance.value = balance.value + Math.floor(Math.random()*500)
  } catch {
    // ignore
  } finally {
    loadingBal.value = false
  }
}

function goBack() {
  if (history.length > 1) history.back()
}

async function payNow() {
  if (!canPay.value) return
  if (amountError.value) { err.value = amountError.value; setTimeout(()=>err.value='',2000); return }

  paying.value = true
  err.value = ''; msg.value = ''
  try {
    // const res = await axios.post('/api/wallet/recharge', { amount: amount.value, method: method.value })
    await new Promise(r => setTimeout(r, 1200)) // demo
    msg.value = 'STK Push imetumwa kwenye simu yako. Thibitisha malipo.'
    // Optional: poll status then update balance
  } catch (e) {
    err.value = 'Imeshindikana kutuma ombi la malipo. Jaribu tena.'
  } finally {
    paying.value = false
    setTimeout(()=>{ msg.value='' }, 3500)
  }
}
</script>

<style scoped>
/* ===== App BG (digital gradient + glow) ===== */
.app{
  min-height:100vh;
  background:
    radial-gradient(900px 480px at 90% -10%, #2e2a8a 0%, rgba(46,42,138,0) 60%),
    radial-gradient(800px 420px at -10% 0%, #6b21a8 0%, rgba(107,33,168,0) 55%),
    linear-gradient(180deg,#0a0f22 0%, #0b1633 100%);
  color:#fff;
  display:flex;
  flex-direction:column;
}

/* ===== App Bar ===== */
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
.iconbtn:active{ transform:scale(.96) }
.ic{ width:20px; height:20px; opacity:.9 }
.ttl h1{ margin:0; font-size:1.05rem; font-weight:800 }
.ttl p{ margin:.15rem 0 0; font-size:.72rem; color:rgba(255,255,255,.68) }

/* ===== Padded section ===== */
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
.card-title{ margin:.25rem 0 1rem; font-size:1rem; font-weight:800 }

/* ===== Balance ===== */
.balance .row{ display:flex; align-items:center; gap:.9rem }
.coin{ position:relative; height:54px; width:54px; border-radius:18px;
  display:grid; place-items:center; font-size:1.3rem;
  background:linear-gradient(135deg,#fbbf24,#f59e0b);
  box-shadow: inset 0 -6px 14px rgba(0,0,0,.25), 0 8px 24px rgba(245,158,11,.35);
  color:#2a1900;
}
.coin-glow{ position:absolute; inset:-8px; border-radius:22px; box-shadow:0 0 26px rgba(251,191,36,.45) }
.bmeta .label{ font-size:.78rem; color:rgba(255,255,255,.7) }
.bmeta h3{ margin:.15rem 0 0; font-size:1.3rem; font-weight:900; letter-spacing:.2px }
.mini-btn{
  margin-left:auto; height:40px; width:40px; border-radius:12px;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14);
  display:grid; place-items:center;
}
.mini-ic{ width:18px; height:18px; opacity:.9 }
.spin{ animation:spin 1s linear infinite }
@keyframes spin { to { transform: rotate(360deg) } }

/* ===== Chips ===== */
.chips{ display:flex; gap:.5rem; overflow-x:auto; padding-bottom:.25rem; margin-bottom:.75rem }
.chips::-webkit-scrollbar{ display:none }
.chip{
  padding:.6rem .9rem; border-radius:999px; white-space:nowrap; font-weight:700; font-size:.9rem;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); color:#fff;
  transition:all .2s ease;
}
.chip.active{
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee);
  border-color:transparent; color:#000; box-shadow:0 6px 18px rgba(99,102,241,.35);
}
.chip:active{ transform:scale(.98) }

/* ===== Amount Field ===== */
.field{ margin-top:.5rem }
.lbl{ display:block; font-size:.78rem; color:rgba(255,255,255,.7); margin-bottom:.35rem }
.amtbox{
  display:flex; align-items:center; gap:.5rem;
  border-radius:1rem; padding:.65rem .8rem;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
}
.prefix{ font-size:.85rem; color:rgba(255,255,255,.75); padding:.15rem .55rem; border-radius:.7rem; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.14) }
.amtinp{
  flex:1; background:transparent; border:none; color:#fff; font-weight:800; font-size:1.15rem; letter-spacing:.3px;
}
.amtinp:focus{ outline:none }
.clear{
  height:32px; width:32px; border-radius:10px; background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.14); color:#fff;
}
.hint{ margin:.35rem 0 0; font-size:.78rem; color:rgba(255,255,255,.65) }
.err{ color:#fecaca; font-size:.82rem; margin-top:.25rem }

/* ===== Payment Methods ===== */
.pm-list{ display:grid; gap:.6rem }
.pm{
  display:flex; align-items:center; gap:.75rem; border-radius:1rem; padding:.75rem;
  background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); cursor:pointer;
  transition:all .2s ease;
}
.pm.active{
  background:linear-gradient(135deg, rgba(99,102,241,.25), rgba(34,211,238,.18));
  border-color:rgba(99,102,241,.45);
  box-shadow:0 8px 24px rgba(99,102,241,.25);
}
.pm-ic{
  height:40px; width:40px; border-radius:12px; display:grid; place-items:center; font-weight:900; color:#000;
}
.pm-mpesa{ background:#7cfc85 }
.pm-airtel{ background:#ff4d4f }
.pm-tigo{ background:#5bb4ff }
.pm-body{ flex:1; min-width:0 }
.pm-name{ margin:0; font-weight:900 }
.pm-note{ margin:2px 0 0; font-size:.8rem; color:rgba(255,255,255,.75) }
.pm-check{ margin-left:auto; height:24px; width:24px; border-radius:999px; background:#10b981; color:#032016; display:grid; place-items:center; font-weight:900 }
.sr{ position:absolute; opacity:0; pointer-events:none }

/* ===== Sticky Pay Bar ===== */
.paybar{
  position:sticky; bottom:0; z-index:30;
  margin-top:auto;
  padding: .75rem .95rem 1rem;
  background:linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.55) 40%, rgba(0,0,0,.8) 100%);
  backdrop-filter: blur(12px);
}
.paymeta{ display:flex; align-items:center; justify-content:space-between; margin-bottom:.5rem; font-size:.92rem; color:rgba(255,255,255,.85) }
.paymeta strong{ font-size:1.05rem }
.paybtn{
  width:100%; border:none; border-radius:999px; padding:1rem;
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee);
  color:#000; font-weight:900; letter-spacing:.3px;
  box-shadow:0 10px 28px rgba(99,102,241,.35); transition:transform .12s ease, opacity .2s ease;
}
.paybtn:disabled{ opacity:.6 }
.paybtn:active{ transform:scale(.98) }
.loader{ display:inline-block }

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
