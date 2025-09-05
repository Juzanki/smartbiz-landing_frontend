<!-- src/views/AffiliateDashboard.vue -->
<template>
  <div class="page" role="main" aria-label="Affiliate Dashboard">
    <!-- Header -->
    <header class="top">
      <h2 class="title">💼 Affiliate Dashboard</h2>
      <div class="right-actions">
        <button class="cta" @click="shareOrCopy" aria-label="Promote and earn">Promote & Earn</button>
        <button class="ghost" @click="refreshAll" :disabled="loading" aria-label="Refresh">⟲</button>
      </div>
    </header>

    <!-- Referral Link -->
    <section class="card link-card" aria-labelledby="linkTitle">
      <h5 id="linkTitle" class="card-title">🔗 Your Smart Referral Link</h5>
      <div class="input-row">
        <input :value="referralLink" readonly @focus="$event.target.select()" aria-label="Referral link" />
        <button class="btn outline" @click="copyLink" aria-label="Copy referral link">📋 Copy</button>
        <button class="btn" @click="shareOrCopy" aria-label="Share referral link">Share</button>
      </div>
      <small class="muted">Share this link on your social media, livestream, or chat groups.</small>
      <p v-if="copied" class="ok" role="status">✅ Link copied</p>
    </section>

    <!-- Quick Calculator (client-side preview only) -->
    <section class="card" aria-labelledby="calcTitle">
      <h5 id="calcTitle" class="card-title">🧮 Payout Calculator</h5>
      <div class="calc-grid">
        <div class="calc-field">
          <label>Coins</label>
          <div class="row-inline">
            <input type="number" min="0" step="1" v-model.number="calcCoins" placeholder="Enter coins" />
            <button class="mini" @click="useMin">Min</button>
            <button class="mini" @click="useMax" :disabled="!walletCoins">Max</button>
          </div>
          <small class="muted">Your wallet: <strong>{{ walletCoins?.toLocaleString?.() ?? '0' }}</strong> coins</small>
        </div>
        <div class="calc-field">
          <label>Rate (TZS/coin)</label>
          <input type="number" min="1" step="1" v-model.number="rateTzs" />
          <small class="muted">From config (server can override on payout)</small>
        </div>
        <div class="calc-field">
          <label>Fee (%)</label>
          <input type="number" min="0" step="0.1" v-model.number="feePct" />
          <small class="muted">Preview only; server computes final</small>
        </div>
      </div>
      <div class="calc-results">
        <div class="kv"><span>Gross</span><strong>{{ formatTZS(grossTzs) }}</strong></div>
        <div class="kv"><span>Fee</span><strong>{{ formatTZS(feeTzs) }}</strong></div>
        <div class="kv total"><span>Net</span><strong>{{ formatTZS(netTzs) }}</strong></div>
      </div>
      <div class="inline-note">
        <small class="muted">
          Minimum withdrawal: {{ minWithdrawCoins }} coins (≈ {{ formatTZS(minWithdrawCoins * rateTzs) }}).
        </small>
        <button class="btn slim" @click="openWithdraw">Withdraw</button>
      </div>
    </section>

    <!-- Stats -->
    <section class="stats" aria-label="Earnings stats">
      <div class="stat">
        <div class="label">Total Earnings</div>
        <div class="value green">{{ formatTZS(earnings) }}</div>
      </div>
      <div class="stat">
        <div class="label">Referrals</div>
        <div class="value">{{ referrals.length }}</div>
      </div>
      <div class="stat">
        <div class="label">Pending Payout</div>
        <div class="value gold">{{ formatTZS(pending) }}</div>
      </div>
    </section>

    <!-- Activity -->
    <section class="card" aria-labelledby="activityTitle">
      <h5 id="activityTitle" class="card-title">📊 Referral Activity</h5>

      <!-- Skeleton while loading -->
      <div v-if="loading" class="skeleton" aria-busy="true" aria-live="polite">
        <div class="row"></div><div class="row"></div><div class="row"></div>
      </div>

      <template v-else>
        <table v-if="referrals.length" class="rtable">
          <thead>
            <tr>
              <th>Product</th>
              <th>Buyer</th>
              <th>Commission</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in referrals" :key="r.id" class="rrow">
              <td data-label="Product">{{ r.product }}</td>
              <td data-label="Buyer">{{ r.buyer }}</td>
              <td data-label="Commission">{{ formatTZS(r.amount) }}</td>
              <td data-label="Status">
                <span :class="['badge', r.status === 'paid' ? 'ok' : 'warn']">
                  {{ r.status }}
                </span>
              </td>
              <td data-label="Date">{{ formatDate(r.date) }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Empty state -->
        <div v-else class="empty">
          <div class="emoji">🪄</div>
          <h6>No referrals yet</h6>
          <p class="muted">Share your link and earn commission from every purchase.</p>
          <button class="btn" @click="shareOrCopy">Share Link Now</button>
        </div>
      </template>
    </section>

    <!-- Toast (simple) -->
    <transition name="fade">
      <div v-if="toastMsg" class="toast" role="status">{{ toastMsg }}</div>
    </transition>

    <!-- Withdraw Bottom Sheet -->
    <div class="sheet" v-if="withdrawOpen" @click.self="closeWithdraw" aria-modal="true" role="dialog">
      <div class="sheet-body" role="document">
        <div class="sheet-head">
          <h5>Withdraw Coins</h5>
          <button class="x" @click="closeWithdraw" aria-label="Close">✕</button>
        </div>

        <div class="sheet-content">
          <div class="field">
            <label>Coins</label>
            <div class="row-inline">
              <input type="number" min="0" step="1" v-model.number="form.coins" @input="clampCoins" />
              <button class="mini" @click="form.coins = minWithdrawCoins">Min</button>
              <button class="mini" @click="form.coins = walletCoins" :disabled="!walletCoins">Max</button>
            </div>
            <small class="muted">Available: {{ walletCoins?.toLocaleString?.() ?? '0' }} coins</small>
            <p v-if="coinsError" class="err">{{ coinsError }}</p>
          </div>

          <div class="field">
            <label>Destination</label>
            <select v-model="form.dest_type">
              <option value="mpesa">M-Pesa (recommended)</option>
              <option value="tigopesa">TigoPesa</option>
              <option value="airtel">Airtel Money</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>

          <div class="field" v-if="form.dest_type !== 'bank'">
            <label>Phone Number</label>
            <input type="tel" inputmode="numeric" v-model.trim="form.dest_ref" placeholder="+2557XXXXXXXX" />
            <p v-if="phoneError" class="err">{{ phoneError }}</p>
          </div>

          <div class="field" v-else>
            <label>Bank Account (IBAN/ACC)</label>
            <input v-model.trim="form.dest_ref" placeholder="Account Number" />
            <p v-if="phoneError" class="err">{{ phoneError }}</p>
          </div>

          <!-- Server-enforced config preview (read-only amounts) -->
          <div class="sheet-summary">
            <div class="kv"><span>Rate</span><strong>{{ rateTzs }} TZS/coin</strong></div>
            <div class="kv"><span>Gross</span><strong>{{ formatTZS(formGross) }}</strong></div>
            <div class="kv"><span>Fee ({{ feePct }}%)</span><strong>{{ formatTZS(formFee) }}</strong></div>
            <div class="kv total"><span>Net to receive</span><strong>{{ formatTZS(formNet) }}</strong></div>
          </div>

          <div class="consent">
            <label>
              <input type="checkbox" v-model="form.agree" />
              I agree that conversion uses server rates and fees; suspicious activity may be reviewed.
            </label>
          </div>

          <div class="sheet-actions">
            <button class="btn ghost" @click="closeWithdraw">Cancel</button>
            <button class="btn" :disabled="submitting || !canSubmit" @click="submitWithdraw">
              <span v-if="!submitting">Confirm Withdraw</span>
              <span v-else>Processing…</span>
            </button>
          </div>

          <p v-if="submitError" class="err center">{{ submitError }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Mobile-first Affiliate Dashboard
 * Assumes backend endpoints:
 *  - GET  /api/affiliate/me        -> { link, history[], total_earned, pending_payout }
 *  - GET  /api/config/payout       -> { rate_tzs, withdraw_fee_pct, min_withdraw_coins }
 *  - GET  /api/wallet/me           -> { coins }
 *  - POST /api/withdraws           -> { coins, dest_type, dest_ref } (server calculates gross/fee/net)
 */
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

// ---------- State ----------
const referralLink = ref('')
const referrals    = ref([])
const earnings     = ref(0)
const pending      = ref(0)
const walletCoins  = ref(0)
const loading      = ref(true)
const copied       = ref(false)
const toastMsg     = ref('')

// Config (API → fallback defaults)
const rateTzs           = ref(15)   // TZS per coin
const feePct            = ref(3)    // %
const minWithdrawCoins  = ref(2000)

// Calculator (preview only)
const calcCoins = ref(2000)
const grossTzs  = computed(() => (calcCoins.value || 0) * (rateTzs.value || 0))
const feeTzs    = computed(() => Math.round(grossTzs.value * (feePct.value || 0) / 100))
const netTzs    = computed(() => Math.max(0, grossTzs.value - feeTzs.value))

// Withdraw sheet
const withdrawOpen = ref(false)
const submitting   = ref(false)
const submitError  = ref('')
const form = ref({
  coins: 2000,
  dest_type: 'mpesa',   // mpesa | tigopesa | airtel | bank
  dest_ref: '',
  agree: false
})

// ---------- Lifecycle ----------
onMounted(async () => {
  await refreshAll()
})

// ---------- Methods ----------
async function refreshAll () {
  loading.value = true
  try {
    const [me, cfg, w] = await Promise.all([
      axios.get('/api/affiliate/me',     { timeout: 15000 }).catch(() => ({ data: {} })),
      axios.get('/api/config/payout',    { timeout: 15000 }).catch(() => ({ data: {} })),
      axios.get('/api/wallet/me',        { timeout: 15000 }).catch(() => ({ data: {} })),
    ])
    referralLink.value = me.data?.link || window.location.origin + '/?ref=YOURCODE'
    referrals.value    = Array.isArray(me.data?.history) ? me.data.history : []
    earnings.value     = +me.data?.total_earned || 0
    pending.value      = +me.data?.pending_payout || 0
    walletCoins.value  = +w.data?.coins || 0

    if (cfg.data) {
      rateTzs.value          = +cfg.data.rate_tzs || rateTzs.value
      feePct.value           = +cfg.data.withdraw_fee_pct || feePct.value
      minWithdrawCoins.value = +cfg.data.min_withdraw_coins || minWithdrawCoins.value
      // default calculator to min or available
      calcCoins.value = Math.min(Math.max(minWithdrawCoins.value, 0), walletCoins.value || minWithdrawCoins.value)
      form.value.coins = calcCoins.value
    }
  } finally {
    loading.value = false
  }
}

function copyLink () {
  if (!referralLink.value) return
  navigator.clipboard.writeText(referralLink.value)
  copied.value = true
  showToast('Link copied')
  setTimeout(() => (copied.value = false), 1400)
}

async function shareOrCopy () {
  if (navigator.share && referralLink.value) {
    try {
      await navigator.share({ title: 'SmartBiz', text: 'Join SmartBiz via my link 👇', url: referralLink.value })
      return
    } catch {/* cancelled */}
  }
  copyLink()
}

function formatDate (d) {
  const dt = new Date(d)
  return isNaN(+dt) ? '-' : dt.toLocaleDateString()
}
function formatTZS (n) {
  try {
    return new Intl.NumberFormat('sw-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(n || 0)
  } catch { return `${(n || 0).toLocaleString()} TZS` }
}
function showToast (msg) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 1800)
}

// Calculator helpers
function useMin () { calcCoins.value = Math.max(minWithdrawCoins.value, 0) }
function useMax () { if (walletCoins.value) calcCoins.value = walletCoins.value }

// Withdraw
function openWithdraw () {
  form.value.coins = Math.min(Math.max(minWithdrawCoins.value, 0), walletCoins.value || minWithdrawCoins.value)
  form.value.dest_type = 'mpesa'
  form.value.dest_ref  = ''
  form.value.agree     = false
  submitError.value    = ''
  withdrawOpen.value   = true
}
function closeWithdraw () { withdrawOpen.value = false }

function clampCoins () {
  if (form.value.coins < 0) form.value.coins = 0
  if (walletCoins.value && form.value.coins > walletCoins.value) {
    form.value.coins = walletCoins.value
  }
}

// Validation
const coinsError = computed(() => {
  const c = +form.value.coins || 0
  if (c <= 0) return 'Enter coin amount'
  if (c < minWithdrawCoins.value) return `Minimum ${minWithdrawCoins.value} coins`
  if (walletCoins.value && c > walletCoins.value) return 'Exceeds wallet balance'
  return ''
})
const phoneError = computed(() => {
  if (form.value.dest_type === 'bank') {
    return form.value.dest_ref?.length ? '' : 'Enter a valid bank account'
  }
  // basic TZ phone check
  const v = (form.value.dest_ref || '').replace(/\s+/g,'')
  if (!v) return 'Enter phone number'
  if (!/^\+?255[0-9]{9}$/.test(v)) return 'Use format +2557XXXXXXXX'
  return ''
})
const canSubmit = computed(() => !coinsError.value && !phoneError.value && !!form.value.agree)

const formGross = computed(() => (+form.value.coins || 0) * (rateTzs.value || 0))
const formFee   = computed(() => Math.round(formGross.value * (feePct.value || 0) / 100))
const formNet   = computed(() => Math.max(0, formGross.value - formFee.value))

async function submitWithdraw () {
  submitError.value = ''
  if (!canSubmit.value) return
  submitting.value = true
  try {
    // Server must compute authoritative gross/fee/net and validate everything.
    const payload = {
      coins: Math.floor(+form.value.coins || 0),
      dest_type: form.value.dest_type,
      dest_ref: form.value.dest_ref
    }
    const res = await axios.post('/api/withdraws', payload, { timeout: 20000 })
    // optimistic refresh
    showToast('Withdraw request submitted')
    withdrawOpen.value = false
    await refreshAll()
  } catch (e) {
    submitError.value = e?.response?.data?.detail || 'Failed to submit. Try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
:root{
  --bg:#f8fafc; --card:#ffffff; --line:#e5e7eb; --text:#0f172a; --muted:#6b7280; --brand:#0A1C3D; --gold:#ffd700;
  --ok:#059669; --warn:#9a3412; --err:#b91c1c; --ink:#111827;
}
.page{ padding:16px; background:var(--bg); color:var(--text); min-height:100vh; }

/* Header */
.top{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; }
.title{ font-size:1.15rem; font-weight:800; color:var(--brand); margin:0; }
.right-actions{ display:flex; gap:8px; }
.cta{ background:#06b6d4; color:#fff; border:none; padding:.55rem .8rem; border-radius:12px; font-weight:800; box-shadow:0 8px 18px rgba(2,132,199,.25); }
.ghost{ background:#fff; color:var(--ink); border:1px solid var(--line); padding:.55rem .8rem; border-radius:12px; font-weight:700; }

/* Cards */
.card{ background:var(--card); border:1px solid var(--line); border-radius:16px; padding:14px; box-shadow:0 10px 30px rgba(2,6,23,.05); margin-bottom:14px; }
.card-title{ margin:0 0 .55rem; color:var(--brand); font-weight:800; }

/* Referral link row */
.input-row{ display:flex; gap:8px; flex-wrap:wrap; }
.input-row input{
  flex:1 1 220px; min-height:44px; border:1px solid var(--line); border-radius:12px; padding:.6rem .8rem; background:#fff; outline:none;
}
.input-row input:focus{ border-color:var(--gold); box-shadow:0 0 0 2px #ffd70055; }
.btn{ background:var(--brand); color:#fff; border:none; border-radius:12px; padding:.55rem .9rem; font-weight:800; }
.btn.slim{ padding:.5rem .7rem; }
.btn.outline{ background:#fff; color:var(--brand); border:1px solid var(--brand); }
.muted{ color:var(--muted); }
.ok{ color:var(--ok); font-weight:700; margin-top:6px; }

/* Calculator */
.calc-grid{ display:grid; gap:10px; grid-template-columns:1fr; margin-bottom:8px; }
.calc-field label{ display:block; font-weight:700; color:var(--muted); margin-bottom:6px; }
.calc-field input, .calc-field select{
  width:100%; min-height:44px; border:1px solid var(--line); border-radius:12px; padding:.6rem .8rem; background:#fff;
}
.row-inline{ display:flex; gap:8px; align-items:center; }
.mini{
  border:1px solid var(--line); background:#fff; padding:.25rem .5rem; border-radius:10px; font-weight:700;
}
.calc-results{ display:grid; gap:8px; grid-template-columns:1fr; margin-top:6px; }
.kv{ display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border:1px dashed var(--line); border-radius:12px; background:#fafafa; }
.kv.total{ background:#fff7ed; border-color:#fde68a; }
.inline-note{ margin-top:10px; display:flex; align-items:center; justify-content:space-between; gap:10px; }

/* Stats */
.stats{ display:grid; gap:10px; grid-template-columns:1fr; margin-bottom:14px; }
.stat{ background:var(--card); border:1px solid var(--line); border-radius:16px; padding:12px; text-align:center; box-shadow:0 6px 16px rgba(2,6,23,.05); }
.label{ color:var(--muted); font-weight:700; margin-bottom:2px; }
.value{ font-size:1.2rem; font-weight:900; }
.value.green{ color:var(--ok); }
.value.gold{ color:#c08400; }

/* Table -> card list on mobile */
.rtable{ width:100%; border-collapse:collapse; }
.rtable th, .rtable td{ padding:.75rem; border-bottom:1px solid var(--line); text-align:left; }
.badge{ padding:.15rem .5rem; border-radius:999px; font-weight:800; font-size:.85rem; }
.badge.ok{ background:#ecfdf5; color:#065f46; }
.badge.warn{ background:#fff7ed; color:var(--warn); }

/* Skeleton */
.skeleton .row{
  height:54px; background:linear-gradient(90deg,#eef2f7, #f6f8fb, #eef2f7);
  background-size:200% 100%; animation:shimmer 1.2s infinite; border-radius:12px; margin:8px 0;
}
@keyframes shimmer{ 0%{background-position:0% 0} 100%{background-position:200% 0} }

/* Empty */
.empty{ text-align:center; padding:18px 6px; }
.empty .emoji{ font-size:2rem; }
.empty h6{ margin:.35rem 0; font-weight:800; }

/* Toast */
.toast{
  position:fixed; left:50%; bottom:18px; transform:translateX(-50%);
  background:#111827; color:#fff; padding:.6rem .9rem; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,.18);
  z-index:50; font-weight:700;
}
.fade-enter-active,.fade-leave-active{ transition:opacity .25s }
.fade-enter-from,.fade-leave-to{ opacity:0 }

/* Withdraw Sheet */
.sheet{
  position:fixed; inset:0; background:rgba(2,6,23,.5); display:flex; align-items:flex-end; z-index:40;
}
.sheet-body{
  width:100%; background:#fff; border-top-left-radius:20px; border-top-right-radius:20px; padding:12px; box-shadow:0 -10px 30px rgba(2,6,23,.2);
}
.sheet-head{ display:flex; align-items:center; justify-content:space-between; }
.sheet-head h5{ margin:0; font-weight:800; color:var(--brand); }
.sheet-head .x{ border:none; background:transparent; font-size:1.2rem; }
.sheet-content{ display:grid; gap:12px; margin-top:8px; }
.field label{ display:block; font-weight:700; color:var(--muted); margin-bottom:6px; }
.field input, .field select{
  width:100%; min-height:44px; border:1px solid var(--line); border-radius:12px; padding:.6rem .8rem; background:#fff;
}
.err{ color:var(--err); font-weight:700; }
.center{ text-align:center; }
.sheet-summary{ display:grid; gap:8px; grid-template-columns:1fr; }
.sheet-summary .kv{ background:#fafafa; border:1px dashed var(--line); border-radius:12px; padding:10px 12px; }
.sheet-summary .kv.total{ background:#ecfeff; border-color:#a5f3fc; }
.consent label{ display:flex; gap:10px; align-items:flex-start; line-height:1.4; }
.sheet-actions{ display:flex; justify-content:space-between; gap:8px; }
.btn.ghost{ background:#fff; color:var(--ink); border:1px solid var(--line); }

/* Responsive */
@media (max-width: 680px){
  .title{ font-size:1.05rem; }
  .rtable thead{ display:none; }
  .rtable, .rtable tbody, .rtable tr, .rtable td{ display:block; width:100%; }
  .rrow{
    background:#fff; border:1px solid var(--line); border-radius:14px; padding:10px; margin-bottom:12px;
    box-shadow:0 8px 18px rgba(2,6,23,.04);
  }
  .rrow td{ display:flex; justify-content:space-between; gap:12px; padding:8px 4px; border:none; }
  .rrow td::before{ content:attr(data-label); font-weight:700; color:var(--muted); }
}

@media (min-width: 680px){
  .stats{ grid-template-columns:repeat(3, 1fr); }
  .calc-grid{ grid-template-columns: repeat(3, 1fr); }
  .calc-results{ grid-template-columns: repeat(3, 1fr); }
  .title{ font-size:1.25rem; }
}
</style>
