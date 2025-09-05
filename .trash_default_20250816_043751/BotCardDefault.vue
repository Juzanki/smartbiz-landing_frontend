<!-- DreamPricingCard.vue -->
<template>
  <article
    class="relative group overflow-hidden rounded-2xl p-5 sm:p-6
           bg-gradient-to-br from-white to-indigo-50
           dark:from-[#0b1020] dark:to-[#0e142a]
           border border-slate-200/80 dark:border-white/10
           shadow-lg active:scale-[0.995] transition"
    :style="{ paddingTop: `calc(1rem + env(safe-area-inset-top, 0px))` }"
    aria-label="Pricing package"
  >
    <!-- dreamy aurora backdrop -->
    <div class="aurora" aria-hidden="true">
      <span class="a a1"></span>
      <span class="a a2"></span>
      <span class="a a3"></span>
    </div>

    <!-- header -->
    <header class="relative z-10 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-lg sm:text-xl font-extrabold tracking-tight
                   text-indigo-700 dark:text-indigo-300 truncate">
          {{ pkg.name }}
        </h2>
        <p class="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
          {{ pkg.description }}
        </p>
      </div>

      <div class="flex flex-col items-end gap-2">
        <span
          class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide
                 bg-indigo-100 text-indigo-700
                 dark:bg-indigo-500/15 dark:text-indigo-200 dark:border dark:border-indigo-300/20"
        >
          🤖 AI Package
        </span>
        <span
          v-if="popular"
          class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold
                 bg-amber-400 text-black shadow"
        >
          ⭐ Most Popular
        </span>
      </div>
    </header>

    <!-- price card -->
    <section
      class="relative z-10 mt-4 rounded-xl p-4
             bg-white/80 dark:bg-white/5
             border border-slate-200/80 dark:border-white/10"
    >
      <div class="flex items-center justify-between gap-2">
        <div>
          <div class="text-[11px] text-slate-500 dark:text-slate-400">Billing</div>
          <div class="mt-1 flex items-baseline gap-2">
            <span class="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
              {{ formattedPrice }}
            </span>
            <span class="text-xs text-slate-500 dark:text-slate-400">/ {{ cycle === 'monthly' ? 'mo' : 'yr' }}</span>
          </div>
          <div v-if="savingsLabel" class="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            {{ savingsLabel }}
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="chip"
            :class="cycle === 'monthly' ? 'chip-on' : 'chip-off'"
            @click="setCycle('monthly')"
            aria-pressed="cycle === 'monthly'"
          >
            Monthly
          </button>
          <button
            class="chip"
            :class="cycle === 'yearly' ? 'chip-on' : 'chip-off'"
            @click="setCycle('yearly')"
            aria-pressed="cycle === 'yearly'"
          >
            Yearly
          </button>
        </div>
      </div>
    </section>

    <!-- features -->
    <section class="relative z-10 mt-4">
      <ul class="list-none space-y-2">
        <li
          v-for="(feature, i) in visibleFeatures"
          :key="i"
          class="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200"
        >
          <span class="mt-0.5">✅</span>
          <span class="leading-relaxed">{{ feature }}</span>
        </li>
      </ul>

      <button
        v-if="hasHiddenFeatures"
        class="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:underline"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Show less' : `Show ${hiddenCount} more` }}
      </button>
    </section>

    <!-- actions -->
    <footer class="relative z-10 mt-5 grid grid-cols-2 gap-2">
      <button class="btn ghost" @click="$emit('details', pkg)" aria-label="View details">
        Learn More
      </button>
      <button class="btn" @click="handleSelect" :aria-label="`Choose ${pkg.name}`">
        🚀 Choose Plan
      </button>
    </footer>
  </article>
</template>

<script setup>
import { computed, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'

const emit = defineEmits(['select', 'details'])

const props = defineProps({
  pkg: {
    type: Object,
    required: true // { name, description, price_monthly, price_yearly, features[] }
  },
  currency: { type: String, default: 'TZS' },
  locale: { type: String, default: 'en-TZ' },
  popular: { type: Boolean, default: false },
  defaultCycle: { type: String, default: 'monthly' }, // 'monthly' | 'yearly'
  rememberCycleKey: { type: String, default: 'pricing_cycle_pref' },
  featuresPreview: { type: Number, default: 5 }
})

const router = useRouter()
const expanded = ref(false)
const cycle = ref(props.defaultCycle)

watchEffect(() => {
  try {
    const saved = localStorage.getItem(props.rememberCycleKey)
    if (saved === 'monthly' || saved === 'yearly') cycle.value = saved
  } catch {}
})
function setCycle(val) {
  cycle.value = val
  try { localStorage.setItem(props.rememberCycleKey, val) } catch {}
}

const nf = computed(
  () => new Intl.NumberFormat(props.locale, { style: 'currency', currency: props.currency, maximumFractionDigits: 0 })
)

const monthlyPrice = computed(() => Number(props.pkg?.price_monthly || 0))
const yearlyPrice = computed(() => Number(props.pkg?.price_yearly || 0))

const formattedPrice = computed(() => {
  const amount = cycle.value === 'monthly' ? monthlyPrice.value : yearlyPrice.value
  return nf.value.format(amount)
})

const savingsLabel = computed(() => {
  if (!monthlyPrice.value || !yearlyPrice.value) return ''
  const yearAtMonthly = monthlyPrice.value * 12
  if (yearlyPrice.value >= yearAtMonthly) return ''
  const pct = Math.round(((yearAtMonthly - yearlyPrice.value) / yearAtMonthly) * 100)
  return pct > 0 ? `Save ~${pct}% with yearly` : ''
})

const visibleFeatures = computed(() => {
  const list = props.pkg?.features || []
  return expanded.value ? list : list.slice(0, Math.max(1, props.featuresPreview))
})
const hiddenCount = computed(() => Math.max(0, (props.pkg?.features?.length || 0) - visibleFeatures.value.length))
const hasHiddenFeatures = computed(() => hiddenCount.value > 0)

function handleSelect() {
  try { navigator?.vibrate?.(12) } catch {}
  emit('select', { package: props.pkg, cycle: cycle.value })
  router.push({ path: '/bots/create', query: { package: props.pkg.name, cycle: cycle.value } })
}
</script>

<style scoped>
/* buttons */
.btn {
  @apply inline-flex items-center justify-center px-4 py-2.5 rounded-xl
         text-sm font-semibold tracking-tight
         bg-indigo-600 text-white border border-indigo-600
         shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/70
         active:scale-[0.98] transition;
}
.btn.ghost {
  @apply bg-white/80 dark:bg-white/5 text-slate-900 dark:text-white
         border border-slate-200/80 dark:border-white/10
         hover:bg-white/90 dark:hover:bg-white/10;
}

/* chips */
.chip { @apply px-3 py-1.5 rounded-full text-xs font-semibold border transition; }
.chip-on { @apply bg-indigo-600 text-white border-indigo-600; }
.chip-off { @apply bg-white/70 dark:bg-white/5 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10; }

/* clamp */
.line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

/* dreamy aurora backdrop */
.aurora { position: absolute; inset: -20%; z-index: 0; filter: blur(30px); opacity: .6; pointer-events: none; }
.a { position: absolute; width: 60vmax; height: 60vmax; border-radius: 50%; mix-blend-mode: screen; opacity: .4; }
.a1 { background: radial-gradient(closest-side, rgba(99,102,241,.45), transparent 60%); top: -10%; left: -10%; animation: drift 18s linear infinite; }
.a2 { background: radial-gradient(closest-side, rgba(236,72,153,.35), transparent 60%); bottom: -15%; right: -5%; animation: drift 22s linear infinite reverse; }
.a3 { background: radial-gradient(closest-side, rgba(34,211,238,.35), transparent 60%); top: 10%; right: 25%; animation: drift 26s linear infinite; }

@keyframes drift {
  0% { transform: translate3d(0,0,0) rotate(0deg) scale(1); }
  50% { transform: translate3d(6%, -4%, 0) rotate(20deg) scale(1.05); }
  100% { transform: translate3d(0,0,0) rotate(0deg) scale(1); }
}
</style>
