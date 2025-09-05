<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
    <!-- App Bar -->
    <header class="sticky top-0 z-20 backdrop-blur bg-slate-900/70 border-b border-white/10">
      <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <h1 class="text-base sm:text-lg font-semibold">Choose Your Plan</h1>
        <div class="hidden sm:flex items-center gap-2 text-xs">
          <span class="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">Mobile First</span>
          <span class="px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/30">Clear Pricing</span>
        </div>
      </div>

      <!-- Controls -->
      <div class="max-w-6xl mx-auto px-4 pb-3 grid gap-2 sm:grid-cols-3">
        <!-- Billing cycle toggle -->
        <div class="rounded-xl bg-white/5 ring-1 ring-white/10 p-2 flex items-center justify-between">
          <span class="text-xs" :class="cycle==='monthly'?'text-white':'text-white/60'">Monthly</span>
          <button class="relative h-6 w-12 rounded-full bg-white/10 ring-1 ring-white/15"
                  :aria-label="'Toggle billing cycle'"
                  @click="cycle = (cycle==='monthly' ? 'annual' : 'monthly')">
            <span class="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
                  :style="{ left: cycle==='monthly' ? '0.25rem' : 'calc(100% - 1.45rem)'}"></span>
          </button>
          <div class="flex items-center gap-2">
            <span class="text-xs" :class="cycle==='annual'?'text-white':'text-white/60'">Annual</span>
            <span v-if="cycle==='annual'" class="px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30">Save {{ annualSavePct }}%</span>
          </div>
        </div>

        <!-- Currency -->
        <div class="rounded-xl bg-white/5 ring-1 ring-white/10 p-2 flex items-center justify-between">
          <span class="text-xs text-white/70">Currency</span>
          <div class="flex gap-2">
            <button @click="currency='USD'"
              :class="['px-3 py-1.5 rounded-lg text-xs ring-1', currency==='USD' ? 'bg-white text-slate-900 ring-white' : 'bg-white/5 ring-white/15']">USD</button>
            <button @click="currency='TZS'"
              :class="['px-3 py-1.5 rounded-lg text-xs ring-1', currency==='TZS' ? 'bg-white text-slate-900 ring-white' : 'bg-white/5 ring-white/15']">TZS</button>
          </div>
        </div>

        <!-- Help -->
        <div class="rounded-xl bg-white/5 ring-1 ring-white/10 p-2 flex items-center justify-between">
          <span class="text-xs text-white/70">Need help choosing?</span>
          <a href="/help" class="px-3 py-1.5 rounded-lg bg-white/10 ring-1 ring-white/15 text-xs hover:bg-white/15">Contact Support</a>
        </div>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 py-4 space-y-4">
      <!-- Plans Grid -->
      <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article v-for="p in pricedPlans" :key="p.id"
                 class="rounded-2xl ring-1 ring-white/10 bg-white/5 p-4 flex flex-col"
                 :class="p.id===selected?.id ? 'outline outline-1 outline-emerald-400/40' : ''"
                 role="region" :aria-labelledby="`h-${p.id}`">
          <div class="flex items-start justify-between">
            <h2 :id="`h-${p.id}`" class="font-semibold">{{ p.name }}</h2>
            <span v-if="p.id===recommended" class="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30">Recommended</span>
          </div>

          <div class="mt-2">
            <div class="flex items-end gap-1">
              <p class="text-2xl font-bold">{{ displayPrice(p.price) }}</p>
              <span class="text-xs text-white/60">/{{ cycle==='monthly' ? 'mo' : 'yr' }}</span>
            </div>
            <p v-if="cycle==='annual' && p.monthly>0" class="text-[11px] text-white/50">≈ {{ displayPrice(p.monthly) }}/mo billed annually</p>
          </div>

          <ul class="mt-3 space-y-1 text-sm text-white/80 flex-1">
            <li v-for="f in p.features" :key="f" class="flex items-start gap-2">
              <span>✔️</span><span>{{ f }}</span>
            </li>
          </ul>

          <button @click="selectPlan(p)"
                  :aria-pressed="selected?.id===p.id"
                  class="mt-3 px-4 py-2 rounded-xl text-sm ring-1"
                  :class="selected?.id===p.id ? 'bg-white/10 ring-white/15 text-white/80 cursor-default' : 'bg-indigo-500 hover:bg-indigo-400 ring-indigo-400/40 text-white'">
            {{ selected?.id===p.id ? 'Current Plan' : 'Select Plan' }}
          </button>
        </article>
      </section>

      <!-- Comparison (collapsible for mobile) -->
      <details class="rounded-2xl p-4 sm:p-5 bg-white/5 ring-1 ring-white/10">
        <summary class="cursor-pointer text-sm font-semibold">Compare features</summary>
        <div class="mt-3 overflow-x-auto no-scrollbar">
          <table class="min-w-[640px] w-full text-sm">
            <thead class="text-white/70">
              <tr>
                <th class="text-left py-2 pr-3">Feature</th>
                <th v-for="p in pricedPlans" :key="'head'+p.id" class="text-left py-2 pr-3">{{ p.name }}</th>
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

      <!-- CTA -->
      <section class="flex flex-col sm:flex-row items-center justify-between gap-2">
        <p class="text-xs text-white/60">
          Prices include local taxes where applicable. You can change/cancel anytime.
        </p>
        <button :disabled="!selected"
                @click="continueToBilling"
                class="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm disabled:opacity-50">
          Continue to Billing
        </button>
      </section>
    </main>
  </div>
</template>

<script setup>
defineOptions({ name: 'PlansView' })
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

/* ---------- Source plans (monthly USD as base) ---------- */
const annualSavePct = 15
const basePlans = [
  { id:'free',       name:'Free',       monthly:0,   features:['1,000 messages/month','WhatsApp & Email only','Basic analytics'] },
  { id:'pro',        name:'Pro',        monthly:29,  features:['10,000 messages/month','All platforms supported','Advanced analytics','Priority email support'] },
  { id:'enterprise', name:'Enterprise', monthly:99,  features:['Unlimited messages','All platforms + API Access','Dedicated support manager','Custom SLAs'] },
]
const recommended = 'pro'

/* ---------- UI State ---------- */
const cycle = ref('monthly')         // 'monthly' | 'annual'
const currency = ref('USD')          // 'USD' | 'TZS'
const fxTZS = 2600                   // simple static fx for display; link real fx via API on backend
const selected = ref(basePlans[1])   // default Pro

/* ---------- Price computation ---------- */
const pricedPlans = computed(() => {
  return basePlans.map(p => {
    const annual = Math.round(p.monthly * 12 * (1 - annualSavePct/100))
    const price = cycle.value === 'monthly' ? p.monthly : annual
    return { ...p, price }
  })
})

function displayPrice(n) {
  if (currency.value === 'TZS') {
    const tzs = Math.round(n * fxTZS)
    if (tzs >= 1_000_000) return `TZS ${(tzs/1_000_000).toFixed(tzs>=10_000_000?0:1)}M`
    if (tzs >= 1_000)     return `TZS ${(tzs/1_000).toFixed(tzs>=10_000?0:1)}K`
    return `TZS ${tzs.toLocaleString('en-US')}`
  }
  // USD
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

function selectPlan(p) {
  selected.value = p
}

/* ---------- Feature comparison rows ---------- */
const comparisonRows = [
  { key:'ai',      label:'AI Assistant',          check:id => ['pro','enterprise'].includes(id) },
  { key:'api',     label:'API Access',            check:id => ['enterprise'].includes(id) },
  { key:'support', label:'Priority Support',      check:id => ['pro','enterprise'].includes(id) },
  { key:'reports', label:'Advanced Analytics',    check:id => ['pro','enterprise'].includes(id) },
]

/* ---------- Navigation ---------- */
function continueToBilling() {
  if (!selected.value) return
  const params = new URLSearchParams({
    plan: selected.value.id,
    cycle: cycle.value,
    currency: currency.value
  })
  router.push(`/billing?${params.toString()}`)
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar{ display:none; }
.no-scrollbar{ -ms-overflow-style:none; scrollbar-width:none; }
</style>
