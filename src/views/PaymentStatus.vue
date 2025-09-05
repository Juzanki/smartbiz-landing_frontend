<!-- src/views/PaymentStatusMobile.vue -->
<template>
  <DashboardLayout>
    <div class="app">
      <!-- Sticky App Bar (optional mini header) -->
      <header class="appbar">
        <h1>Payment Status</h1>
      </header>

      <main class="wrap">
        <!-- Loading / skeleton -->
        <div v-if="loading" class="card skeleton">
          <div class="sk-line"></div>
          <div class="sk-line w-70"></div>
          <div class="sk-btns">
            <div class="sk-btn"></div>
            <div class="sk-btn"></div>
          </div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="card state error">
          <div class="icon">⚠️</div>
          <h2>We couldn’t load your payment status</h2>
          <p class="muted">{{ error }}</p>
          <div class="actions">
            <button class="btn ghost" @click="reload">Retry</button>
            <router-link class="btn primary" to="/checkout">Go to Checkout</router-link>
          </div>
        </div>

        <!-- Success -->
        <div v-else-if="status === 'success'" class="card state ok">
          <div class="badge ok-badge">SUCCESS</div>
          <div class="icon">✅</div>
          <h2>Payment Successful!</h2>
          <p>You are now subscribed to:</p>
          <p class="plan"><span class="dot"></span> {{ planName || 'Your Plan' }}</p>

          <div class="tips">
            <div class="tip">• Your benefits are now active.</div>
            <div class="tip">• You can cancel or change anytime in Billing.</div>
          </div>

          <div class="actions">
            <router-link class="btn primary" to="/dashboard">Go to Dashboard</router-link>
            <router-link class="btn ghost" to="/billing">Manage Billing</router-link>
          </div>
        </div>

        <!-- Failed -->
        <div v-else-if="status === 'failed'" class="card state fail">
          <div class="badge fail-badge">FAILED</div>
          <div class="icon">❌</div>
          <h2>Payment Failed</h2>
          <p>Please try again or use another payment method.</p>

          <div class="actions">
            <router-link class="btn primary" to="/checkout">Retry Payment</router-link>
            <router-link class="btn ghost" to="/support">Contact Support</router-link>
          </div>
        </div>

        <!-- Pending / Processing -->
        <div v-else class="card state pending">
          <div class="badge pend-badge">PENDING</div>
          <div class="spinner" aria-label="Loading" />
          <h2>Processing Payment…</h2>
          <p class="muted">This may take a few seconds. We’ll update automatically.</p>
          <div class="actions">
            <button class="btn ghost" @click="reload">Refresh</button>
            <router-link class="btn link" to="/dashboard">Go to Dashboard</router-link>
          </div>
        </div>
      </main>
    </div>
  </DashboardLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import axios from 'axios'

const status = ref('')      // success | failed | pending | ''
const planName = ref('')
const loading = ref(true)
const error = ref('')

async function fetchStatus() {
  loading.value = true
  error.value = ''
  try {
    const token = localStorage.getItem('access_token') || ''
    const res = await axios.get('/payments/status', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    status.value = String(res.data?.status || '').toLowerCase() || 'pending'
    planName.value = res.data?.plan_name || ''
  } catch (e) {
    error.value = e?.response?.data?.detail || 'Network error. Please check your connection.'
  } finally {
    loading.value = false
  }
}

function reload() {
  fetchStatus()
}

onMounted(fetchStatus)
</script>

<style scoped>
/* ===== Mobile-first digital background ===== */
.app{
  min-height:100vh;
  background:
    radial-gradient(900px 480px at 90% -10%, #2e2a8a 0%, rgba(46,42,138,0) 60%),
    radial-gradient(800px 420px at -10% 0%, #6b21a8 0%, rgba(107,33,168,0) 55%),
    linear-gradient(180deg,#0a0f22 0%, #0b1633 100%);
  color:#fff;
  display:flex; flex-direction:column;
}
.appbar{
  position:sticky; top:0; z-index:10;
  padding:1rem .95rem .6rem;
  background:linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,0));
  backdrop-filter: blur(10px);
}
.appbar h1{ margin:0; font-weight:900; font-size:1.1rem; letter-spacing:.2px }
.wrap{ padding: .9rem .95rem 1.2rem; display:flex; justify-content:center }

/* ===== Card (glass + glow) ===== */
.card{
  width:100%; max-width:720px;
  border-radius:1.25rem;
  background:linear-gradient(135deg, rgba(255,255,255,.07), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.14);
  box-shadow: 0 12px 40px rgba(0,0,0,.45);
  backdrop-filter: blur(16px);
  padding:1.25rem;
  text-align:center;
}

/* ===== Skeleton ===== */
.skeleton .sk-line{
  height:16px; border-radius:10px;
  background:linear-gradient(90deg, rgba(255,255,255,.06), rgba(255,255,255,.12), rgba(255,255,255,.06));
  animation: shine 1.1s linear infinite; margin:.5rem auto; width:86%;
}
.skeleton .sk-line.w-70{ width:70% }
.skeleton .sk-btns{ display:flex; gap:.6rem; justify-content:center; margin-top:.8rem }
.skeleton .sk-btn{
  height:42px; width:42%; border-radius:999px;
  background:linear-gradient(90deg, rgba(255,255,255,.06), rgba(255,255,255,.12), rgba(255,255,255,.06));
  animation: shine 1.1s linear infinite;
}
@keyframes shine{ 0%{ background-position:-200px 0 } 100%{ background-position:200px 0 } }

/* ===== States ===== */
.state .icon{ font-size:2.2rem; margin:.25rem 0 }
.state h2{ margin:.2rem 0 .35rem; font-size:1.25rem; font-weight:900 }
.muted{ color:rgba(255,255,255,.75); margin:.15rem 0 }

.ok{ border-color: rgba(16,185,129,.35); box-shadow: 0 10px 30px rgba(16,185,129,.18) }
.fail{ border-color: rgba(244,63,94,.35);  box-shadow: 0 10px 30px rgba(244,63,94,.18) }
.error{ border-color: rgba(244,174,63,.35); box-shadow: 0 10px 30px rgba(244,174,63,.18) }
.pending{ border-color: rgba(99,102,241,.35); box-shadow: 0 10px 30px rgba(99,102,241,.18) }

.badge{
  display:inline-block; font-size:.7rem; letter-spacing:.15rem; font-weight:900;
  padding:.25rem .55rem; border-radius:.6rem; border:1px solid;
  margin-bottom:.45rem;
}
.ok-badge{ color:#b8f3d8; border-color:#2dd4bf; background:rgba(45,212,191,.12) }
.fail-badge{ color:#ffc9d2; border-color:#f43f5e; background:rgba(244,63,94,.12) }
.pend-badge{ color:#dbeafe; border-color:#60a5fa; background:rgba(96,165,250,.15) }

.plan{
  display:inline-flex; align-items:center; gap:.45rem;
  margin:.2rem 0 .4rem; font-weight:900;
}
.plan .dot{ height:8px; width:8px; border-radius:999px; background:#22d3ee; box-shadow:0 0 10px #22d3ee }

.tips{ display:grid; gap:.25rem; margin:.5rem 0 .9rem }
.tip{ font-size:.9rem; color:rgba(255,255,255,.85) }

/* ===== Spinner ===== */
.spinner{
  height:44px; width:44px; border-radius:999px;
  border:3px solid rgba(255,255,255,.18);
  border-top-color:#6366f1; margin:.25rem auto .4rem;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }

/* ===== Buttons ===== */
.actions{ display:flex; gap:.6rem; justify-content:center; flex-wrap:wrap }
.btn{
  min-width:140px; padding:.8rem 1rem; border-radius:999px;
  font-weight:900; border:1px solid transparent; text-decoration:none; text-align:center; color:#fff;
}
.primary{
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee);
  color:#000; box-shadow:0 8px 24px rgba(99,102,241,.35);
}
.ghost{
  background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.2);
}

/* small screens */
@media (max-width: 380px){
  .btn{ min-width: 120px; padding:.7rem .85rem }
}
</style>
