<!-- PricingPackageCard.vue -->
<template>
  <article
    class="group relative overflow-hidden rounded-2xl border shadow-lg
           bg-gradient-to-br from-white to-indigo-50
           dark:from-slate-800 dark:to-slate-900
           border-slate-200 dark:border-white/10
           p-5 sm:p-6 flex flex-col gap-4 transition
           active:scale-[0.995]"
    :style="{ paddingTop: `calc(1rem + env(safe-area-inset-top, 0px))` }"
    aria-label="Pricing package card"
  >
    <!-- Glow on hover (desktop) -->
    <div
      class="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 blur-2xl"
      aria-hidden="true"
    >
      <div class="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-indigo-400/20 via-fuchsia-400/20 to-amber-300/20" />
    </div>

    <!-- Header -->
    <header class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-lg sm:text-xl font-extrabold text-indigo-700 dark:text-indigo-300 truncate">
          {{ pkg.name }}
        </h2>
        <p class="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
          {{ pkg.description }}
        </p>
      </div>

      <div class="flex flex-col items-end gap-2">
        <span
          class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide
                 bg-indigo-100 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-300/20"
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

    <!-- Price block -->
    <section class="rounded-xl bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xs text-slate-500 dark:text-slate-400">Current billing</div>
          <div class="mt-1 flex items-baseline gap-2">
            <span class="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
              {{ formattedPrice }}
            </span>
            <span class="text-xs text-slate-500 dark:text-slate-400">
              / {{ cycle === 'monthly' ? 'mo' : 'yr' }}
            </span>
          </div>
          <div v-if="savingsLabel" class="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            {{ savingsLabel }}
          </div>
        </div>

        <!-- Billing toggle -->
        <div class="flex items-center gap-2">
          <button
            :class="['chip', cycle === 'monthly' ? 'chip-on' : 'chip-off']"
            @click="setCycle('monthly')"
            aria-pressed="cycle === 'monthly'"
          >
            Monthly
          </button>
          <button
            :class="['chip', cycle === 'yearly' ? 'chip-on' : 'chip-off']"
            @click="setCycle('yearly')"
            aria-pressed="cycle === 'yearly'"
          >
            Yearly
          </button>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section>
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

    <!-- Actions -->
    <footer class="mt-auto grid grid-cols-2 gap-2">
      <button
        class="col-span-2 sm:col-span-1 order-2 sm:order-1 btn ghost"
        @click="$emit('details', pkg)"
        aria-label="View details"
      >
        Learn More
      </button>

      <button
        class="col-span-2 sm:col-span-1 order-1 sm:order-2 btn"
        @click="handleSelect"
        :aria-label="`Choose ${pkg.name}`"
      >
        🚀 Choose Plan
      </button>
    </footer>

    <!-- Subtle corner decoration -->
    <div class="pointer-events-none absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-indigo-500/10 blur-2xl" />
  </article>
</template>

<script setup>
import { computed, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'

const emit = defineEmits(['select', 'details'])

const props = defineProps({
  pkg: {
    type: Object,
    required: true
    // { name, description, price_monthly, price_yearly, features[] }
  },
  currency: { type: String, default: 'TZS' },
  locale: { type: String, default: 'en-TZ' },
  popular: { type: Boolean, default: false },
  defaultCycle: { type: String, default: 'monthly' }, // 'monthly' | 'yearly'
  rememberCycleKey: { type: String, default: 'pricing_cycle' },
  featuresPreview: { type: Number, default: 5 }
})

const router = useRouter()
const expanded = ref(false)
const cycle = ref(props.defaultCycle)

watchEffect(() => {
  // restore cycle preference if present
  try {
    const saved = localStorage.getItem(props.rememberCycleKey)
    if (saved === 'monthly' || saved === 'yearly') cycle.value = saved
  } catch {}
})

function setCycle(val) {
  cycle.value = val
  try { localStorage.setItem(props.rememberCycleKey, val) } catch {}
}

const nf = computed(() => new Intl.NumberFormat(props.locale, { style: 'currency', currency: props.currency }))

const monthlyPrice = computed(() => Number(props.pkg?.price_monthly || 0))
const yearlyPrice = computed(() => Number(props.pkg?.price_yearly || 0))

const formattedPrice = computed(() => {
  const amount = cycle.value === 'monthly' ? monthlyPrice.value : yearlyPrice.value
  return nf.value.format(amount)
})

const savingsLabel = computed(() => {
  if (!monthlyPrice.value || !yearlyPrice.value) return ''
  const twelveMo = monthlyPrice.value * 12
  if (yearlyPrice.value >= twelveMo) return ''
  const pct = Math.round(((twelveMo - yearlyPrice.value) / twelveMo) * 100)
  return pct > 0 ? `Save ~${pct}% with yearly` : ''
})

const visibleFeatures = computed(() => {
  const list = props.pkg?.features || []
  if (expanded.value) return list
  return list.slice(0, Math.max(1, props.featuresPreview))
})
const hiddenCount = computed(() => Math.max(0, (props.pkg?.features?.length || 0) - visibleFeatures.value.length))
const hasHiddenFeatures = computed(() => hiddenCount.value > 0)

function handleSelect() {
  // light haptic on supported devices
  try { navigator?.vibrate?.(12) } catch {}
  emit('select', { package: props.pkg, cycle: cycle.value })
  // optional deep link
  router.push({ path: '/bots/create', query: { package: props.pkg.name, cycle: cycle.value } })
}
</script>

<style scoped>
/* Buttons */
.btn {
  @apply inline-flex items-center justify-center px-4 py-2.5 rounded-xl
         text-sm font-semibold tracking-tight
         bg-indigo-600 text-white border border-indigo-600
         shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition;
}
.btn.ghost {
  @apply bg-white/70 dark:bg-white/5 text-slate-900 dark:text-white
         border border-slate-200 dark:border-white/10
         hover:bg-white/90 dark:hover:bg-white/10;
}

/* Chips */
.chip {
  @apply px-3 py-1.5 rounded-full text-xs font-semibold border transition;
}
.chip-on {
  @apply bg-indigo-600 text-white border-indigo-600;
}
.chip-off {
  @apply bg-white/70 dark:bg-white/5 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10;
}

/* Utilities */
.line-clamp-3 {
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
</style>
