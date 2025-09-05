<template>
  <DashboardLayout>
    <div class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
      <!-- App Bar / Stepper -->
      <header class="sticky top-0 z-20 backdrop-blur bg-slate-900/70 border-b border-white/10">
        <div class="max-w-6xl mx-auto px-4 py-3">
          <div class="flex items-center justify-between">
            <h1 class="text-base sm:text-lg font-semibold">Plans & Billing</h1>
            <div class="hidden sm:flex items-center gap-2 text-xs">
              <span class="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">Mobile First</span>
              <span class="px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/30">Clear Steps</span>
            </div>
          </div>

          <!-- Stepper -->
          <ol class="mt-3 flex items-center text-xs gap-2">
            <li :class="step>=1 ? activeStepClass : stepClass">1. Choose Plan</li>
            <span class="opacity-50">—</span>
            <li :class="step>=2 ? activeStepClass : stepClass">2. Billing & Payment</li>
            <span class="opacity-50">—</span>
            <li :class="step>=3 ? activeStepClass : stepClass">3. Confirmation</li>
          </ol>
        </div>
      </header>

      <main class="max-w-6xl mx-auto px-4 py-4 space-y-4">
        <!-- STEP 1: PRICING -->
        <section v-if="step===1" class="space-y-4">
          <!-- Toggle Monthly / Annual -->
          <div class="rounded-2xl p-4 sm:p-5 bg-white/5 ring-1 ring-white/10 flex items-center justify-between">
            <div>
              <p class="text-sm font-medium">Choose your plan</p>
              <p class="text-xs text-white/60">Switch billing cycle anytime.</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs" :class="cycle==='monthly'?'text-white':'text-white/60'">Monthly</span>
              <button
                class="relative h-6 w-12 rounded-full bg-white/10 ring-1 ring-white/15"
                @click="cycle = (cycle==='monthly' ? 'annual' : 'monthly')"
                :aria-label="'Toggle billing cycle'"
              >
                <span
                  class="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
                  :style="{ left: cycle==='monthly' ? '0.25rem' : 'calc(100% - 1.45rem)' }"
                ></span>
              </button>
              <span class="text-xs" :class="cycle==='annual'?'text-white':'text-white/60'">Annual</span>
              <span v-if="cycle==='annual'" class="ml-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30">
                Save {{ annualSavePct }}%
              </span>
            </div>
          </div>

          <!-- Plans Grid (cards on mobile, 4-col on desktop) -->
          <div class="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article
              v-for="p in pricedPlans"
              :key="p.id"
              class="rounded-2xl ring-1 ring-white/10 bg-white/5 p-4 flex flex-col"
              :class="p.id===recommended ? 'outline outline-1 outline-emerald-400/40' : ''"
            >
              <div class="flex items-start justify-between">
                <h3 class="font-semibold">{{ p.name }}</h3>
                <span v-if="p.id===recommended" class="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30">Recommended</span>
              </div>

              <div class="mt-2">
                <div class="flex items-end gap-1">
                  <p class="text-2xl font-bold">{{ formatTZS(p.price) }}</p>
                  <span class="text-xs text-white/60">/{{ cycle==='monthly' ? 'mo' : 'yr' }}</span>
                </div>
                <p v-if="cycle==='annual' && p.monthly" class="text-[11px] text-white/50">≈ {{ formatTZS(p.monthly) }}/mo billed annually</p>
              </div>

              <ul class="mt-3 space-y-1 text-sm text-white/80 flex-1">
                <li v-for="f in p.features" :key="f" class="flex items-start gap-2">
                  <span>✔️</span><span>{{ f }}</span>
                </li>
              </ul>

              <button
                class="mt-3 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15 text-sm"
                @click="choose(p)"
              >
                {{ p.id===selected?.id ? 'Selected' : 'Select Plan' }}
              </button>
            </article>
          </div>

          <!-- Feature comparison (collapsible on mobile) -->
          <details class="rounded-2xl p-4 sm:p-5 bg-white/5 ring-1 ring-white/10">
            <summary class="cursor-pointer text-sm font-semibold">Compare features</summary>
            <div class="mt-3 overflow-x-auto no-scrollbar">
              <table class="min-w-[640px] w-full text-sm">
                <thead class="text-white/70">
                  <tr>
                    <th class="text-left py-2 pr-3">Feature</th>
                    <th v-for="p in pricedPlans" :key="'h'+p.id" class="text-left py-2 pr-3">{{ p.name }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in comparisonRows" :key="row.key" class="border-t border-white/10">
                    <td class="py-2 pr-3 text-white/80">{{ row.label }}</td>
                    <td v-for="p in pricedPlans" :key="row.key+p.id" class="py-2 pr-3">
                      <span v-if="row.check(p.id)">✔️</span>
                      <span v-else class="opacity-50">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>

          <!-- CTA row -->
          <div class="flex flex-col sm:flex-row justify-between items-center gap-2">
            <p class="text-xs text-white/60">
              Need more? <a class="underline" href="/contact">Talk to sales</a> for custom Enterprise.
            </p>
            <button
              :disabled="!selected"
              @click="goBilling"
              class="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm disabled:opacity-50"
            >
              Continue to Billing
            </button>
          </div>
        </section>

        <!-- STEP 2: BILLING & PAYMENT -->
        <section v-else-if="step===2" class="space-y-4">
          <div class="rounded-2xl p-4 sm:p-5 bg-white/5 ring-1 ring-white/10">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium">Billing for: <span class="text-white/90">{{ selected?.name }}</span></p>
                <p class="text-xs text-white/60">Cycle: {{ cycleLabel }}</p>
              </div>
              <button class="text-xs underline" @click="step=1">Change plan</button>
            </div>
          </div>

          <div class="grid gap-3 lg:grid-cols-[1fr,420px]">
            <!-- Left: Billing form -->
            <div class="space-y-3">
              <!-- Payer info -->
              <div class="rounded-2xl p-4 sm:p-5 bg-white/5 ring-1 ring-white/10">
                <h3 class="text-sm font-semibold mb-3">Billing Details</h3>
                <div class="grid gap-3 sm:grid-cols-2">
                  <input v-model.trim="billing.name" placeholder="Full Name" class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" />
                  <input v-model.trim="billing.email" type="email" placeholder="Email" class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" />
                  <input v-model.trim="billing.company" placeholder="Company (optional)" class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm sm:col-span-2" />
                  <input v-model.trim="billing.taxId" placeholder="TIN/VAT (optional)" class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm sm:col-span-2" />
                  <input v-model.trim="billing.address" placeholder="Address" class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm sm:col-span-2" />
                  <div class="grid grid-cols-3 gap-2 sm:col-span-2">
                    <input v-model.trim="billing.city" placeholder="City" class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" />
                    <input v-model.trim="billing.country" placeholder="Country" class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" />
                    <input v-model.trim="billing.postal" placeholder="Postal" class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>

              <!-- Payment method -->
              <div class="rounded-2xl p-4 sm:p-5 bg-white/5 ring-1 ring-white/10">
                <h3 class="text-sm font-semibold mb-3">Payment Method</h3>
                <div class="flex gap-2 overflow-x-auto no-scrollbar">
                  <button v-for="m in payMethods" :key="m.value"
                          @click="payment.method=m.value"
                          :class="['px-3 py-1.5 rounded-full text-xs ring-1 whitespace-nowrap',
                                   payment.method===m.value ? 'bg-white text-slate-900 ring-white' : 'bg-white/5 ring-white/15']">
                    {{ m.label }}
                  </button>
                </div>

                <div class="mt-3 grid gap-2" v-if="payment.method==='card'">
                  <input v-model.trim="payment.card.number" inputmode="numeric" placeholder="Card Number"
                         class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" />
                  <div class="grid grid-cols-2 gap-2">
                    <input v-model.trim="payment.card.exp" placeholder="MM/YY" class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" />
                    <input v-model.trim="payment.card.cvc" placeholder="CVC" class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <input v-model.trim="payment.card.name" placeholder="Name on Card"
                         class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" />
                </div>

                <div class="mt-3 grid gap-2" v-else>
                  <input v-model.trim="payment.mobile.number" inputmode="tel" placeholder="Mobile Number e.g. 07xx…"
                         class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" />
                  <p class="text-xs text-white/60">A push/USSD prompt will be sent to complete payment.</p>
                </div>
              </div>

              <!-- Notes & TOS -->
              <div class="rounded-2xl p-4 sm:p-5 bg-white/5 ring-1 ring-white/10">
                <label class="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" v-model="agreeTOS" />
                  <span>I agree to the <a href="/terms" class="underline">Terms</a> & <a href="/privacy" class="underline">Privacy</a>.</span>
                </label>
              </div>
            </div>

            <!-- Right: Summary -->
            <aside class="space-y-3">
              <div class="rounded-2xl p-4 sm:p-5 bg-white/5 ring-1 ring-white/10">
                <h3 class="text-sm font-semibold mb-3">Summary</h3>
                <div class="flex items-center justify-between text-sm">
                  <span>{{ selected?.name }} ({{ cycleLabel }})</span>
                  <b>{{ formatTZS(priceNow) }}</b>
                </div>
                <div class="mt-2 flex items-center justify-between text-sm" v-if="discount > 0">
                  <span>Discount</span><span class="text-emerald-300">- {{ formatTZS(discount) }}</span>
                </div>
                <div class="mt-2 flex items-center justify-between text-sm">
                  <span>VAT ({{ vatPct }}%)</span><span>{{ formatTZS(vatAmount) }}</span>
                </div>
                <div class="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                  <span class="font-semibold">Total Due</span><span class="font-semibold">{{ formatTZS(totalDue) }}</span>
                </div>

                <!-- Coupon -->
                <div class="mt-3 flex gap-2">
                  <input v-model.trim="coupon" placeholder="Coupon code" class="flex-1 bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" />
                  <button @click="applyCoupon" class="px-3 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-sm">Apply</button>
                </div>

                <button
                  class="mt-3 w-full px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm disabled:opacity-50"
                  :disabled="!canPay"
                  @click="payNow"
                >
                  Pay {{ formatTZS(totalDue) }}
                </button>
                <p v-if="payMsg" class="text-xs mt-2" :class="payOk ? 'text-emerald-300':'text-red-300'">{{ payMsg }}</p>
              </div>

              <div class="rounded-2xl p-4 sm:p-5 bg-white/5 ring-1 ring-white/10 text-xs text-white/60">
                <p>Invoices will be sent to <b class="text-white/80">{{ billing.email || 'your email' }}</b>. You can cancel or change plan anytime from Billing.</p>
              </div>
            </aside>
          </div>
        </section>

        <!-- STEP 3: CONFIRMATION -->
        <section v-else-if="step===3" class="space-y-4">
          <div class="rounded-2xl p-6 bg-white/5 ring-1 ring-white/10 text-center">
            <div class="text-3xl mb-2">🎉</div>
            <h3 class="text-lg font-semibold">You’re all set!</h3>
            <p class="text-sm text-white/70 mt-1">Plan: <b>{{ confirmed.plan }}</b> • Cycle: <b>{{ confirmed.cycle }}</b></p>
            <p class="text-sm text-white/70">Receipt sent to <b>{{ confirmed.email }}</b></p>
            <div class="mt-4 flex flex-wrap gap-2 justify-center">
              <a href="/dashboard" class="px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-sm">Go to Dashboard</a>
              <a href="/billing" class="px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-sm">Manage Billing</a>
            </div>
          </div>

          <!-- FAQ (collapsible) -->
          <details class="rounded-2xl p-4 sm:p-5 bg-white/5 ring-1 ring-white/10">
            <summary class="cursor-pointer text-sm font-semibold">FAQ</summary>
            <div class="mt-3 space-y-2 text-sm text-white/80">
              <p><b>Can I cancel anytime?</b> Yes — your plan stays active until end of cycle.</p>
              <p><b>Do you offer refunds?</b> Pro-rated refunds are available within 7 days in some cases.</p>
            </div>
          </details>
        </section>
      </main>
    </div>
  </DashboardLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import axios from 'axios'

/** -------- Steps -------- */
const step = ref(1)
const stepClass = 'px-2 py-1 rounded bg-white/5 ring-1 ring-white/15 text-white/70'
const activeStepClass = 'px-2 py-1 rounded bg-white/10 ring-1 ring-white/20 text-white'

/** -------- Plans & Pricing -------- */
const annualSavePct = 15
const cycle = ref('monthly') // 'monthly' | 'annual'
const recommended = 'pro'
const plans = [
  { id: 'free',       name: 'Free',       monthly: 0,      features: ['Basic Chatbot','Limited Usage','1 Social Platform'] },
  { id: 'pro',        name: 'Pro',        monthly: 30000,  features: ['AI Assistant','Scheduling Tools','Up to 3 Platforms'] },
  { id: 'business',   name: 'Business',   monthly: 65000,  features: ['Analytics','Auto Promotions','5+ Platforms','CRM'] },
  { id: 'enterprise', name: 'Enterprise', monthly: 125000, features: ['Custom Domain','Unlimited Access','Advanced Reports'] },
]
// compute actual price based on cycle
const pricedPlans = computed(() =>
  plans.map(p => {
    const annual = Math.round(p.monthly * 12 * (1 - annualSavePct/100))
    return {
      ...p,
      price: cycle.value==='monthly' ? p.monthly : annual,
      monthly: p.monthly
    }
  })
)
const selected = ref(null)
function choose(p) {
  selected.value = p
}

/** -------- Comparison table rows (example flags) -------- */
const comparisonRows = [
  { key:'ai',       label: 'AI Assistant',   check: id => ['pro','business','enterprise'].includes(id) },
  { key:'crm',      label: 'CRM',            check: id => ['business','enterprise'].includes(id) },
  { key:'reports',  label: 'Advanced Reports', check: id => ['enterprise'].includes(id) },
  { key:'platforms',label: 'Multi-Platform', check: id => ['pro','business','enterprise'].includes(id) },
]

/** -------- Billing -------- */
const billing = ref({
  name: '', email: '', company: '', taxId: '',
  address: '', city: '', country: 'Tanzania', postal: ''
})
const payMethods = [
  { label: 'Card', value: 'card' },
  { label: 'M-Pesa', value: 'mpesa' },
  { label: 'TigoPesa', value: 'tigopesa' },
  { label: 'Airtel Money', value: 'airtel' }
]
const payment = ref({
  method: 'card',
  card: { number:'', exp:'', cvc:'', name:'' },
  mobile: { number:'' }
})
const agreeTOS = ref(false)
const coupon = ref('')
const discount = ref(0)
const vatPct = 18

const cycleLabel = computed(() => cycle.value==='monthly' ? 'Monthly' : 'Annual')
const priceNow = computed(() => selected.value ? selected.value.price : 0)
const vatAmount = computed(() => Math.round((priceNow.value - discount.value) * vatPct / 100))
const totalDue = computed(() => Math.max(0, priceNow.value - discount.value + vatAmount.value))

const canPay = computed(() => {
  if (!selected.value) return false
  if (!billing.value.name || !/^\S+@\S+\.\S+$/.test(billing.value.email)) return false
  if (!agreeTOS.value) return false
  if (payment.value.method==='card') {
    const ok = payment.value.card.number.length >= 12 && payment.value.card.exp && payment.value.card.cvc.length>=3
    return ok
  }
  return !!payment.value.mobile.number
})

function applyCoupon() {
  // demo: SMART10 => 10% off, SMART20 => 20% off
  const code = coupon.value.trim().toUpperCase()
  const pct = code==='SMART20' ? 20 : code==='SMART10' ? 10 : 0
  discount.value = Math.round(priceNow.value * pct / 100)
}

async function goBilling() {
  if (!selected.value) return
  step.value = 2
}

/** -------- Payment -------- */
const payMsg = ref('')
const payOk = ref(false)
async function payNow() {
  payMsg.value = ''; payOk.value = false
  try {
    const token = localStorage.getItem('access_token')
    // 1) select plan on server
    await axios.post('/subscriptions/select',
      { plan_id: selected.value.id, cycle: cycle.value, coupon: coupon.value || null },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    // 2) create payment intent (fake endpoint example)
    await axios.post('/subscriptions/checkout', {
      method: payment.value.method,
      billing: billing.value,
      amount: totalDue.value,
    }, { headers: { Authorization: `Bearer ${token}` } })

    payOk.value = true
    payMsg.value = 'Payment successful!'
    confirmed.plan = selected.value.name
    confirmed.cycle = cycleLabel.value
    confirmed.email = billing.value.email
    step.value = 3
  } catch (e) {
    payOk.value = false
    payMsg.value = e?.response?.data?.detail || 'Payment failed. Please try again.'
  }
}

const confirmed = ref({ plan:'', cycle:'', email:'' })

/** -------- Utils -------- */
function formatTZS(n) {
  const num = Number(n || 0)
  if (num >= 1_000_000) return `TZS ${(num/1_000_000).toFixed(num>=10_000_000?0:1)}M`
  if (num >= 1_000) return `TZS ${(num/1_000).toFixed(num>=10_000?0:1)}K`
  return `TZS ${num.toLocaleString('en-US')}`
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar{ display:none; }
.no-scrollbar{ -ms-overflow-style:none; scrollbar-width:none; }
</style>
