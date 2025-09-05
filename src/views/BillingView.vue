<template>
  <div class="wrap">
    <!-- Header -->
    <header class="hdr">
      <h1 class="ttl">💳 {{ $t?.('billing') || 'Billing' }}</h1>
      <button class="btn ghost sm" @click="goToPayments">🕘 {{ $t?.('payment_history') || 'Payment history' }}</button>
    </header>

    <!-- Plans (mobile: horizontal swipe, desktop: grid) -->
    <section class="plans" aria-label="Plans">
      <article
        v-for="p in plans"
        :key="p.name"
        class="plan"
        :class="{ active: p.name === currentPlan }"
      >
        <div class="plan-head">
          <h3 class="name">{{ p.name }}</h3>
          <span v-if="p.name === currentPlan" class="badge">{{ $t?.('active') || 'active' }}</span>
        </div>

        <p class="desc">{{ p.description }}</p>
        <div class="price">{{ p.price }}</div>

        <ul class="feat">
          <li v-for="f in p.features" :key="f">✔️ {{ f }}</li>
        </ul>

        <div class="cta">
          <button
            v-if="p.name !== currentPlan"
            class="btn primary"
            @click="openSheet(p)"
          >
            ⬆️ {{ $t?.('upgrade') || 'Upgrade' }}
          </button>

          <button
            v-else
            class="btn ghost"
            disabled
          >
            {{ $t?.('current_plan') || 'Current plan' }}
          </button>
        </div>
      </article>
    </section>

    <!-- Bottom sheet: choose payment method -->
    <transition name="sheet">
      <div v-if="sheetOpen" class="sheet-backdrop" @click.self="sheetOpen=false">
        <section class="sheet" role="dialog" aria-modal="true">
          <header class="sheet-head">
            <div class="sheet-title">
              <strong>{{ selectedPlan?.name }}</strong>
              <span class="muted">{{ selectedPlan?.price }}</span>
            </div>
            <button class="btn ghost sm" @click="sheetOpen=false">✖</button>
          </header>

          <div class="sheet-body">
            <h4 class="subttl">Choose payment method</h4>
            <div class="pay-grid">
              <button class="pay btn outline" @click="payWith('paypal')">🅿️ PayPal</button>
              <button class="pay btn outline" @click="selectMobile('mpesa')">🟩 M-PESA</button>
              <button class="pay btn outline" @click="selectMobile('airtel')">🟥 Airtel Money</button>
              <button class="pay btn outline" @click="selectMobile('tigo')">🟦 Tigo Pesa</button>
            </div>

            <!-- Mobile money instructions -->
            <details v-if="mobileMethod" open class="steps">
              <summary class="steps-head">
                📱 Instructions — {{ labelFor(mobileMethod) }}
              </summary>
              <div class="steps-body">
                <div class="copy-row">
                  <div>
                    <div class="muted">Company Number</div>
                    <div class="mono">{{ companyNumber }}</div>
                  </div>
                  <button class="btn ghost sm" @click="copyCompany">Copy</button>
                </div>
                <ol class="list">
                  <li v-for="(s, i) in stepsFor(mobileMethod)" :key="i">{{ s }}</li>
                </ol>
                <small class="muted">
                  Name should display as <b>{{ companyName }}</b> before confirming.
                </small>
              </div>
            </details>
          </div>

          <footer class="sheet-foot">
            <button class="btn ghost" @click="sheetOpen=false">Close</button>
            <button class="btn primary" @click="confirmPay">Proceed</button>
          </footer>
        </section>
      </div>
    </transition>

    <!-- Toast -->
    <div v-if="toast" class="toast">{{ toast }}</div>

    <div class="safe-bottom" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const currentPlan = ref('Pro')
const plans = ref([
  {
    name: 'Free',
    price: '$0/mo',
    description: 'Basic tools for startups and beginners.',
    features: [
      'Up to 50 messages/month',
      '1 Social platform',
      'Basic AI autoresponder',
      'Email support'
    ],
    paypalLink: 'https://www.paypal.com/ncp/payment/2YVRVNKRGVA6Q'
  },
  {
    name: 'Pro',
    price: '$9.99/mo',
    description: 'Everything you need to automate and grow.',
    features: [
      'Unlimited messages',
      'WhatsApp + Telegram + SMS',
      'Advanced AI bot & analytics',
      'Priority email support'
    ],
    paypalLink: 'https://www.paypal.com/ncp/payment/V8SA7RGZN7R3U'
  },
  {
    name: 'Business',
    price: '$29.99/mo',
    description: 'For enterprises that need full power & team access.',
    features: [
      'Everything in Pro +',
      'Team collaboration tools',
      'Multi-user dashboard',
      'Dedicated onboarding'
    ],
    paypalLink: 'https://www.paypal.com/ncp/payment/D28PZ6TYYQ24N'
  }
])

/* Sheet state */
const sheetOpen = ref(false)
const selectedPlan = ref(null)
const mobileMethod = ref(null)
const toast = ref('')

const companyNumber = '5261077'
const companyName = 'UKUMBI WA MJASIRIAMALI'

function openSheet(p) {
  selectedPlan.value = p
  mobileMethod.value = null
  sheetOpen.value = true
}

function payWith(kind) {
  if (kind === 'paypal') {
    window.open(selectedPlan.value?.paypalLink, '_blank')
  }
}

function selectMobile(kind) {
  mobileMethod.value = kind
}

function labelFor(kind) {
  return kind === 'mpesa'
    ? 'M-PESA'
    : kind === 'airtel'
    ? 'Airtel Money'
    : 'Tigo Pesa'
}

function stepsFor(kind) {
  if (kind === 'mpesa') {
    return [
      'Dial *150*00#',
      'Choose 4. Pay by M-PESA → 1. Company number',
      `Enter Company Number: ${companyNumber}`,
      `Confirm name: ${companyName}`,
      'Enter amount → Enter M-PESA PIN → Confirm'
    ]
  }
  if (kind === 'airtel') {
    return [
      'Dial *150*60#',
      'Choose 5. Pay Bills → 1. Company number',
      `Enter Company Number: ${companyNumber}`,
      `Confirm name: ${companyName}`,
      'Enter amount → Enter Airtel Money PIN → Confirm'
    ]
  }
  return [
    'Dial *150*01#',
    'Choose 4. Pay Bills → 3. Company number',
    `Enter Company Number: ${companyNumber}`,
    `Confirm name: ${companyName}`,
    'Enter amount → Confirm with PIN'
  ]
}

async function copyCompany() {
  try {
    await navigator.clipboard.writeText(companyNumber)
    showToast('Company number copied')
  } catch {
    showToast('Copy failed — long-press to copy')
  }
}

function confirmPay() {
  if (!mobileMethod.value) {
    showToast('Choose a payment method first')
    return
  }
  showToast('Follow the steps to complete payment on your phone')
}

function showToast(msg) {
  toast.value = msg
  setTimeout(() => (toast.value = ''), 1800)
}

function goToPayments() {
  router.push('/my-payments')
}
</script>

<style scoped>
:root{
  --fg:#0f172a; --muted:#64748b; --line:#e5e7eb;
  --brand:#2563eb; --bg:#ffffff; --card:#ffffff;
  --shadow:0 10px 24px rgba(0,0,0,.06);
}

.wrap{ max-width:1100px; margin-inline:auto; padding:12px; color:var(--fg); }
.hdr{ display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; gap:8px; }
.ttl{ font-size:1.3rem; font-weight:900; margin:0; }

.plans{
  display:flex; gap:12px; overflow:auto; padding:2px 2px 8px;
  scroll-snap-type:x proximity;
}
.plan{
  scroll-snap-align:center;
  min-width: 88%;
  background:var(--card); border:1px solid var(--line); border-radius:18px; box-shadow:var(--shadow);
  padding:14px; position:relative;
}
@media (min-width:900px){
  .plans{ display:grid; grid-template-columns: repeat(3, 1fr); overflow:visible; }
  .plan{ min-width:0; }
}
.plan.active{ outline:2px solid var(--brand); }

.plan-head{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.name{ font-weight:900; color:#1d4ed8; margin:0; }
.badge{ background:#1d4ed8; color:#fff; padding:.2rem .5rem; border-radius:999px; font-size:.75rem; font-weight:800; }

.desc{ color:var(--muted); margin:.25rem 0 .75rem; }
.price{ font-size:1.8rem; font-weight:900; margin-bottom:.6rem; }
.feat{ display:grid; gap:6px; margin:0 0 10px; padding:0; list-style:none; }
.cta{ display:flex; gap:8px; }

.btn{
  border:1px solid var(--line); border-radius:12px; padding:.7rem 1rem; font-weight:900;
  background:#111827; color:#fff; width:100%;
}
.btn.primary{ background:var(--brand); border-color:var(--brand); }
.btn.ghost{ background:#fff; color:#111827; }
.btn.outline{ background:#fff; color:#111827; }
.btn.sm{ padding:.35rem .55rem; border-radius:10px; width:auto; }

/* Sheet */
.sheet-backdrop{
  position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:30; display:flex; align-items:flex-end; justify-content:center;
}
.sheet{
  width:100%; max-width:560px; background:#fff; border-top-left-radius:16px; border-top-right-radius:16px;
  box-shadow:0 -12px 28px rgba(0,0,0,.35); max-height:85vh; overflow:auto;
}
.sheet-head{ display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid var(--line); }
.sheet-title{ display:flex; flex-direction:column; }
.sheet-title .muted{ color:var(--muted); font-size:.85rem; }
.sheet-body{ padding:12px; display:grid; gap:12px; }
.subttl{ margin:0 0 2px; font-size:1rem; font-weight:900; }
.pay-grid{ display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.pay{ font-weight:800; }

.steps{ border:1px solid var(--line); border-radius:14px; overflow:hidden; }
.steps-head{ padding:10px 12px; background:#eff6ff; cursor:pointer; font-weight:800; }
.steps-body{ padding:12px; display:grid; gap:10px; }
.copy-row{ display:flex; align-items:center; justify-content:space-between; }
.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.list{ margin:0; padding-left:18px; }
.muted{ color:var(--muted); }

.sheet-foot{ display:flex; justify-content:flex-end; gap:8px; padding:10px 12px 12px; }

.sheet-enter-active,.sheet-leave-active{ transition: opacity .22s ease, transform .22s ease; }
.sheet-enter-from,.sheet-leave-to{ opacity:0; transform:translateY(14px); }

/* Toast */
.toast{
  position:fixed; left:50%; bottom:calc(16px + env(safe-area-inset-bottom));
  transform:translateX(-50%);
  background:#111827; color:#fff; padding:.6rem .9rem; border-radius:12px; box-shadow:var(--shadow);
  z-index:50; font-weight:800;
}

.btn:hover{ filter:brightness(0.98) }
.plan:hover{ transform:translateY(-2px); transition:transform .2s ease; }

.safe-bottom{ height:max(env(safe-area-inset-bottom), 10px); }
</style>
