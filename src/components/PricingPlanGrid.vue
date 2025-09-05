<!-- 📁 src/components/PricingPlansPro.vue -->
<template>
  <section class="w-full" :style="safeArea" aria-label="Pricing plans">
    <!-- Top controls -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <!-- Billing toggle -->
      <div class="inline-flex items-center gap-2">
        <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Billing</span>
        <button
          class="relative h-9 w-[170px] rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-semibold overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          :aria-pressed="billing==='yearly'"
          @click="toggleBilling"
          title="Toggle Monthly / Yearly"
        >
          <span class="absolute inset-0 grid grid-cols-2">
            <span class="grid place-items-center">Monthly</span>
            <span class="grid place-items-center">Yearly</span>
          </span>
          <span
            class="absolute top-1 bottom-1 w-[calc(50%-6px)] rounded-full bg-indigo-600 text-white grid place-items-center transition-all"
            :style="{ left: billing==='monthly' ? '4px' : 'calc(50% + 2px)' }"
          >
            {{ billing==='monthly' ? 'Monthly' : 'Yearly' }}
          </span>
        </button>
        <span v-if="savePercentDisplay" class="px-2 py-[2px] rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
          Save {{ savePercentDisplay }}%
        </span>
      </div>

      <!-- Currency -->
      <div class="inline-flex items-center gap-2">
        <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Currency</span>
        <select v-model="currency" class="h-9 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-sm px-2">
          <option v-for="c in Object.keys(rates)" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
    </div>

    <!-- Plans grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
      <article
        v-for="plan in normalizedPlans"
        :key="plan.name"
        role="listitem"
        tabindex="0"
        class="relative bg-white dark:bg-[#0b1020] p-5 rounded-2xl shadow-md transition hover:shadow-xl border overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        :class="plan.highlight ? 'border-amber-400 glow' : 'border-black/10 dark:border-white/10'"
        @keyup.enter.prevent="selectPlan(plan)"
        @keyup.space.prevent="selectPlan(plan)"
      >
        <!-- Ribbon -->
        <div v-if="plan.highlight" class="ribbon">Most&nbsp;Popular</div>

        <!-- Title -->
        <h3 class="text-lg font-extrabold text-slate-900 dark:text-white text-center">
          {{ plan.name }}
        </h3>

        <!-- Price -->
        <div class="mt-2 text-center">
          <div class="text-[11px] text-slate-500 dark:text-slate-400">{{ billing==='yearly' ? 'Billed yearly' : 'Billed monthly' }}</div>
          <div class="mt-1 text-4xl font-black text-slate-900 dark:text-white">
            {{ symbol }}{{ displayPrice(plan).toLocaleString(undefined, { maximumFractionDigits: 0 }) }}
            <span class="text-sm font-medium text-slate-500">/{{ billing==='yearly' ? 'yr' : 'mo' }}</span>
          </div>

          <!-- Strike-through monthly*12 vs yearly (if discount applied automatically) -->
          <div v-if="billing==='yearly' && showStrike(plan)" class="mt-1 text-[12px] text-slate-500 line-through">
            {{ symbol }}{{ (monthlyToYear(plan) ).toLocaleString(undefined, { maximumFractionDigits: 0 }) }}/yr
          </div>

          <!-- Trial -->
          <div v-if="plan.trialDays" class="mt-1 text-[11px] text-emerald-600 font-semibold">
            {{ plan.trialDays }}-day free trial
          </div>
        </div>

        <!-- Features -->
        <ul class="mt-4 mb-5 space-y-2 text-[13px] text-slate-700 dark:text-slate-200">
          <li v-for="(f,i) in plan.features" :key="i" class="flex items-start gap-2">
            <span class="text-emerald-500">✔</span>
            <span class="leading-snug">{{ f }}</span>
          </li>
        </ul>

        <!-- CTA: slot fallback -->
        <div class="mt-auto">
          <slot name="button" :plan="plan">
            <button
              class="w-full h-11 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 active:translate-y-[1px]"
              @click="checkout(plan)"
            >
              Choose {{ plan.name }}
            </button>
          </slot>
          <!-- Secondary action -->
          <button class="w-full mt-2 h-10 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-sm"
                  @click="selectPlan(plan)">
            Compare features
          </button>
        </div>
      </article>
    </div>

    <!-- Footer hint -->
    <p class="mt-3 text-[11px] text-slate-500">
      Prices shown are estimates in {{ currency }}. Taxes may apply at checkout.
    </p>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'

/** Props */
const props = defineProps({
  plans: { type: Array, required: true }, // [{ name, price?, monthly?, yearly?, features, highlight?, trialDays? }]
  yearlyDiscount: { type: Number, default: 0.15 }, // fallback if plan.yearly haijapewa (15%)
  initialBilling: { type: String, default: 'monthly' }, // 'monthly' | 'yearly'
  initialCurrency: { type: String, default: 'USD' },
  rates: { // Relative to USD by default; override kutoka kwa API yako
    type: Object,
    default: () => ({ USD: 1, TZS: 2600, KES: 130, ZAR: 18, EUR: 0.92, GBP: 0.78 })
  },
  currencySymbols: {
    type: Object,
    default: () => ({ USD: '$', TZS: 'TSh ', KES: 'KSh ', ZAR: 'R ', EUR: '€', GBP: '£' })
  }
})

/** Emits: select (for compare), checkout (CTA) */
const emit = defineEmits(['select','checkout'])

/** State */
const billing = ref(props.initialBilling)   // 'monthly' | 'yearly'
const currency = ref(props.initialCurrency)

/** Safe-area for mobile */
const safeArea = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }

/** Helpers */
const rates = computed(() => props.rates)
const symbol = computed(() => props.currencySymbols[currency.value] ?? `${currency.value} `)

/** Normalize plans (support legacy 'price' = monthly) */
const normalizedPlans = computed(() => {
  return (props.plans || []).map(p => {
    const monthly = p.monthly ?? p.price ?? 0
    const yearly  = p.yearly ?? Math.round(monthly * 12 * (1 - props.yearlyDiscount))
    return { ...p, monthly, yearly }
  })
})

/** Price calc + conversion */
function convertUSD(valueUSD){
  // If your base is USD; else adapt
  const r = rates.value[currency.value] || 1
  return Math.round(valueUSD * r)
}
function displayPrice(plan){
  const base = billing.value === 'yearly' ? plan.yearly : plan.monthly
  return convertUSD(base)
}
/** For strikethrough monthly*12 baseline vs yearly */
function monthlyToYear(plan){
  return convertUSD(plan.monthly * 12)
}
function showStrike(plan){
  // show strike if yearly < monthly*12
  return plan.yearly < plan.monthly * 12
}

/** Billing toggle */
function toggleBilling(){ billing.value = billing.value === 'monthly' ? 'yearly' : 'monthly' }

/** Save badge percent (from default discount) — purely cosmetic if yearly given */
const savePercentDisplay = computed(() => Math.round(props.yearlyDiscount * 100))

/** Actions */
function selectPlan(plan){ emit('select', { plan, billing: billing.value, currency: currency.value }) }
function checkout(plan){ emit('checkout', { plan, billing: billing.value, currency: currency.value, price: displayPrice(plan) }) }
</script>

<style scoped>
/* Highlight glow for popular plan */
.glow { box-shadow: 0 8px 30px rgba(245, 158, 11, .22); }

/* Ribbon */
.ribbon {
  position: absolute;
  top: 12px; right: -44px;
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  color: #111827;
  font-weight: 800;
  font-size: 11px;
  padding: 6px 48px;
  transform: rotate(18deg);
  box-shadow: 0 2px 10px rgba(0,0,0,.2);
}

/* Focus ring handled by utility classes; no extra CSS needed */
</style>
