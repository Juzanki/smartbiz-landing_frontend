<template>
  <transition name="ts-fade">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Top up panel"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/70 md:bg-black/50 backdrop-blur-sm" @click="close" />

      <!-- Sheet (mobile) / Dialog (md+) -->
      <section
        ref="sheet"
        class="fixed md:static bottom-0 md:bottom-auto inset-x-0 md:inset-auto
               mx-auto w-full md:max-w-xl
               bg-white text-black rounded-t-3xl md:rounded-3xl
               shadow-2xl overflow-hidden
               pb-[max(16px,env(safe-area-inset-bottom))]"
        :class="['max-h-[90vh] md:max-h-[85vh]', 'md:mt-16']"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd"
        @click.stop
      >
        <!-- Header -->
        <header class="sticky top-0 bg-white/90 backdrop-blur border-b border-black/5">
          <div class="flex items-center justify-between px-4 pt-3 pb-3 md:px-5">
            <div class="absolute left-1/2 -translate-x-1/2 -top-1.5 md:hidden">
              <div class="h-1.5 w-12 rounded-full bg-black/15" />
            </div>
            <h2 class="text-base md:text-lg font-bold">💰 Top Up Wallet</h2>
            <button @click="close" class="p-2 rounded-full hover:bg-black/5" aria-label="Close" type="button">✖</button>
          </div>
        </header>

        <!-- Content -->
        <main class="px-4 py-4 md:px-6 md:py-6 overflow-y-auto space-y-6">
          <!-- Amount presets -->
          <section>
            <h3 class="text-sm font-bold text-gray-800 mb-2">Choose amount</h3>
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
              <button
                v-for="a in presets"
                :key="a.value"
                type="button"
                @click="amount = a.value"
                class="px-3 py-2 rounded-xl border text-sm font-semibold transition"
                :class="amount === a.value
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                  : 'bg-white border-black/10 hover:bg-black/5 text-gray-800'"
              >
                {{ a.label }}
              </button>
            </div>

            <!-- Custom amount -->
            <div class="mt-3 flex items-center gap-2">
              <label for="amt" class="text-sm text-gray-600">Custom</label>
              <input
                id="amt"
                v-model.number="amount"
                type="number"
                inputmode="decimal"
                min="0"
                class="flex-1 px-3 py-2 rounded-xl border border-black/10 bg-white text-gray-800 text-sm"
                :placeholder="currency === 'TZS' ? 'Enter amount (TSh)' : 'Enter amount (USD)'"
              />
            </div>
            <p v-if="amountError" class="text-rose-600 text-xs mt-1">{{ amountError }}</p>
          </section>

          <!-- Promo -->
          <section>
            <h3 class="text-sm font-bold text-gray-800 mb-2">Promo code</h3>
            <div class="flex gap-2">
              <input
                v-model.trim="promo"
                class="flex-1 px-3 py-2 rounded-xl border border-black/10 bg-white text-gray-800 text-sm"
                placeholder="e.g., SMART10"
                @keydown.enter.prevent="applyPromo"
              />
              <button @click="applyPromo" class="px-3 py-2 rounded-xl bg-black/80 text-white text-sm font-semibold hover:bg-black" type="button">
                Apply
              </button>
            </div>
            <p v-if="promoApplied" class="text-emerald-600 text-xs mt-1">Promo applied ✔ ({{ promoNote }})</p>
            <p v-if="promoError" class="text-rose-600 text-xs mt-1">{{ promoError }}</p>
          </section>

          <!-- Payment method -->
          <section>
            <h3 class="text-sm font-bold text-gray-800 mb-2">Select payment method</h3>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="m in methods"
                :key="m.key"
                type="button"
                class="flex items-center gap-3 p-3 rounded-2xl border transition text-left"
                :class="method === m.key ? 'border-emerald-300 bg-emerald-50' : 'border-black/10 hover:bg-black/5'"
                @click="method = m.key"
              >
                <i :class="[m.icon, 'text-xl']"></i>
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-gray-900 truncate">{{ m.title }}</div>
                  <div class="text-xs text-gray-600 truncate">{{ m.desc }}</div>
                </div>
              </button>
            </div>

            <!-- Dynamic details -->
            <div v-if="isMobileMoney" class="mt-3 space-y-2">
              <label for="phone" class="block text-xs font-semibold text-gray-600">Mobile number</label>
              <input
                id="phone"
                v-model.trim="phone"
                type="tel"
                inputmode="tel"
                placeholder="+2557XXXXXXXX or 07XXXXXXXX"
                class="w-full px-3 py-2 rounded-xl border border-black/10 bg-white text-gray-800 text-sm"
              />
              <p v-if="phoneError" class="text-rose-600 text-xs">{{ phoneError }}</p>
            </div>

            <div v-else-if="method === 'card'" class="mt-3 grid grid-cols-1 gap-2">
              <input v-model.trim="card.name" placeholder="Name on card" class="px-3 py-2 rounded-xl border border-black/10 text-sm" />
              <input
                v-model.trim="card.number"
                placeholder="Card number"
                inputmode="numeric"
                class="px-3 py-2 rounded-xl border border-black/10 text-sm"
              />
              <div class="flex gap-2">
                <input v-model.trim="card.exp" placeholder="MM/YY" class="flex-1 px-3 py-2 rounded-xl border border-black/10 text-sm" />
                <input v-model.trim="card.cvc" placeholder="CVC" inputmode="numeric" class="flex-1 px-3 py-2 rounded-xl border border-black/10 text-sm" />
              </div>
              <p v-if="cardError" class="text-rose-600 text-xs">{{ cardError }}</p>
            </div>
          </section>

          <!-- Summary -->
          <section class="rounded-2xl border border-black/5 bg-black/[0.02] p-4">
            <h3 class="text-sm font-bold text-gray-800 mb-2">Summary</h3>
            <div class="text-sm space-y-1">
              <div class="flex justify-between">
                <span>Amount</span>
                <span class="font-semibold">{{ formatCurrency(amount || 0) }}</span>
              </div>
              <div class="flex justify-between">
                <span>Fees <span class="text-gray-500">({{ feeLabel }})</span></span>
                <span class="font-semibold">{{ formatCurrency(fee) }}</span>
              </div>
              <div v-if="discount > 0" class="flex justify-between text-emerald-700">
                <span>Promo discount</span>
                <span class="font-semibold">-{{ formatCurrency(discount) }}</span>
              </div>
              <div class="flex justify-between border-t border-black/10 pt-2 mt-2">
                <span>Total to pay</span>
                <span class="font-bold">{{ formatCurrency(total) }}</span>
              </div>
            </div>
          </section>
        </main>

        <!-- Footer -->
        <footer class="px-4 md:px-6 pb-4 pt-2 border-t border-black/5 bg-white/90 backdrop-blur">
          <div class="flex items-center justify-between text-sm">
            <div class="text-gray-700">
              <span class="font-semibold">You’ll be charged:</span>
              <span class="ml-1">{{ formatCurrency(total) }}</span>
            </div>
            <button
              :disabled="!canConfirm"
              @click="confirm"
              type="button"
              class="px-5 py-2 rounded-2xl text-white font-semibold
                     disabled:opacity-50 disabled:cursor-not-allowed
                     bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
            >
              Top Up Now
            </button>
          </div>
        </footer>
      </section>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, reactive, watch } from 'vue'

/* ---------------------- Props & Emits ---------------------- */
const props = withDefaults(defineProps<{
  modelValue: boolean
  currency?: 'TZS' | 'USD'
}>(), {
  currency: 'TZS'
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'confirm', payload: {
    amount: number
    currency: string
    method: string
    phone?: string
    card?: { name: string; number: string; exp: string; cvc: string }
    promo?: string
    discount?: number
    total: number
    fee: number
  }): void
}>()

/* ------------------------- State -------------------------- */
const amount = ref<number>(props.currency === 'USD' ? 5 : 1000)
const promo = ref('')
const promoApplied = ref(false)
const promoError = ref('')
const method = ref('mpesa') // default in TZ market
const phone = ref('')
const card = reactive({ name: '', number: '', exp: '', cvc: '' })

/* -------------------- Presets & Methods -------------------- */
const presets = computed(() => {
  if (props.currency === 'USD') {
    return [
      { label: '$ 5', value: 5 },
      { label: '$ 10', value: 10 },
      { label: '$ 25', value: 25 },
      { label: '$ 50', value: 50 },
      { label: '$ 100', value: 100 },
      { label: '$ 200', value: 200 },
    ]
  }
  return [
    { label: 'TSh 1,000', value: 1000 },
    { label: 'TSh 2,000', value: 2000 },
    { label: 'TSh 5,000', value: 5000 },
    { label: 'TSh 10,000', value: 10000 },
    { label: 'TSh 20,000', value: 20000 },
    { label: 'TSh 50,000', value: 50000 },
    { label: 'TSh 100,000', value: 100000 },
    { label: 'TSh 200,000', value: 200000 },
  ]
})

const methods = computed(() => {
  if (props.currency === 'USD') {
    return [
      { key: 'card',   title: 'Debit/Credit',  desc: 'Visa/Master',    icon: 'i-tabler-credit-card' },
      { key: 'paypal', title: 'PayPal',        desc: 'International',   icon: 'i-fa6-brands-paypal' },
    ]
  }
  return [
    { key: 'mpesa',  title: 'M-Pesa',        desc: 'Vodacom',      icon: 'i-custom-mpesa' },
    { key: 'airtel', title: 'Airtel Money',  desc: 'Airtel',       icon: 'i-custom-airtel' },
    { key: 'tigo',   title: 'Tigo Pesa',     desc: 'Tigo',         icon: 'i-custom-tigo' },
    { key: 'halo',   title: 'Halopesa',      desc: 'Halotel',      icon: 'i-custom-halotel' },
    { key: 'card',   title: 'Debit/Credit',  desc: 'Visa/Master',  icon: 'i-tabler-credit-card' },
  ]
})

const isMobileMoney = computed(() => ['mpesa', 'airtel', 'tigo', 'halo'].includes(method.value))

/* -------------------- Fees & Discounts -------------------- */
/** Fee rules (simple demo): mobile money 1.5%, card 2.9%+(fixed), PayPal 3.4%+0.30 */
const fee = computed<number>(() => {
  const base = Number(amount.value) || 0
  if (base <= 0) return 0
  if (method.value === 'card') {
    if (props.currency === 'USD') return +(base * 0.029 + 0.3).toFixed(2)
    return Math.round(base * 0.029) + 300
  }
  if (method.value === 'paypal') {
    return +(base * 0.034 + 0.3).toFixed(2)
  }
  if (isMobileMoney.value) {
    return Math.round(base * 0.015)
  }
  return 0
})
const feeLabel = computed(() => {
  if (method.value === 'card') return props.currency === 'USD' ? '2.9% + $0.30' : '2.9% + TSh300'
  if (method.value === 'paypal') return '3.4% + $0.30'
  if (isMobileMoney.value) return '1.5%'
  return '—'
})

/** Promos: SMART10 (10% off, cap: TSh 20,000 / $10), WELCOME5 (flat TSh 1,500 / $1) */
const promoNote = computed(() => {
  return promo.value.toUpperCase() === 'SMART10'
    ? (props.currency === 'USD' ? '10% off (up to $10)' : '10% off (up to TSh 20,000)')
    : promo.value.toUpperCase() === 'WELCOME5'
      ? (props.currency === 'USD' ? '$1 off' : 'TSh 1,500 off')
      : ''
})

const discount = computed<number>(() => {
  if (!promoApplied.value) return 0
  const base = Number(amount.value) || 0
  const code = promo.value.toUpperCase()
  if (code === 'SMART10') {
    return props.currency === 'USD'
      ? Math.min(base * 0.1, 10)
      : Math.min(Math.round(base * 0.1), 20000)
  }
  if (code === 'WELCOME5') {
    return props.currency === 'USD' ? 1 : 1500
  }
  return 0
})

const total = computed<number>(() => {
  const t = (Number(amount.value) || 0) + fee.value - discount.value
  return Math.max(0, props.currency === 'USD' ? +t.toFixed(2) : Math.round(t))
})

/* ------------------------- Validation ------------------------- */
const amountError = computed(() => {
  if (!amount.value || amount.value <= 0) return 'Enter a valid amount.'
  return ''
})

const phoneError = computed(() => {
  if (!isMobileMoney.value) return ''
  if (!phone.value.trim()) return 'Enter your mobile number.'
  if (!isValidTZPhone(phone.value)) return 'Enter a valid TZ number (+2557… or 07…).'
  return ''
})

const cardError = computed(() => {
  if (method.value !== 'card') return ''
  if (!card.name || !card.number || !card.exp || !card.cvc) return 'Complete all card fields.'
  if (!luhn(card.number)) return 'Card number is invalid.'
  if (!validExpiry(card.exp)) return 'Expiry must be MM/YY (future).'
  if (!/^\d{3,4}$/.test(card.cvc)) return 'CVC must be 3–4 digits.'
  return ''
})

const canConfirm = computed(() => {
  if (amountError.value) return false
  if (isMobileMoney.value && phoneError.value) return false
  if (method.value === 'card' && cardError.value) return false
  return true
})

/* -------------------------- Actions -------------------------- */
function applyPromo() {
  promoError.value = ''
  const code = promo.value.trim().toUpperCase()
  if (!code) {
    promoApplied.value = false
    return
  }
  if (!['SMART10', 'WELCOME5'].includes(code)) {
    promoApplied.value = false
    promoError.value = 'Unknown promo code.'
    return
  }
  promoApplied.value = true
}

function confirm() {
  if (!canConfirm.value) return
  const payload = {
    amount: Number(amount.value) || 0,
    currency: props.currency,
    method: method.value,
    phone: isMobileMoney.value ? normalizeTZPhone(phone.value) : undefined,
    card: method.value === 'card' ? { ...card, number: maskCard(card.number) } : undefined,
    promo: promoApplied.value ? promo.value.trim() : undefined,
    discount: discount.value,
    total: total.value,
    fee: fee.value,
  }
  emit('confirm', payload)
}

function close() {
  emit('update:modelValue', false)
}

/* ---------------------- Body scroll lock ---------------------- */
const prevOverflow = ref('')
watch(() => props.modelValue, async (open) => {
  if (open) {
    prevOverflow.value = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    await nextTick()
  } else {
    document.body.style.overflow = prevOverflow.value || ''
  }
})

/* ESC to close */
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = prevOverflow.value || ''
})

/* -------------------- Swipe-down to close -------------------- */
const sheet = ref<HTMLElement | null>(null)
let startY = 0; let currentY = 0; let dragging = false
function onTouchStart(e: TouchEvent) { startY = e.touches[0].clientY; dragging = true }
function onTouchMove(e: TouchEvent) {
  if (!dragging || !sheet.value) return
  currentY = e.touches[0].clientY
  const delta = Math.max(0, currentY - startY)
  sheet.value.style.transform = `translateY(${delta}px)`
}
function onTouchEnd() {
  if (!sheet.value) return
  const delta = Math.max(0, currentY - startY)
  sheet.value.style.transform = ''
  dragging = false
  if (delta > 120) close()
}

/* ----------------------- Utils & Format ----------------------- */
function formatCurrency(v: number) {
  const currency = props.currency || 'TZS'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'TZS' ? 0 : 2,
  }).format(isNaN(v) ? 0 : v)
}

/** Tanzania mobile numbers: +2556/7xxxxxxxx or 06/07xxxxxxxx → normalize to +255… */
function isValidTZPhone(s: string) {
  const v = s.replace(/\s+/g, '')
  return /^(\+?255|0)(6|7)\d{8}$/.test(v)
}
function normalizeTZPhone(s: string) {
  let v = s.replace(/\s+/g, '')
  if (v.startsWith('0')) v = '+255' + v.slice(1)
  if (!v.startsWith('+')) v = '+' + v
  return v
}

/** Luhn card check */
function luhn(num: string) {
  const v = (num || '').replace(/\D/g, '')
  let sum = 0, dbl = false
  for (let i = v.length - 1; i >= 0; i--) {
    let d = parseInt(v[i], 10)
    if (dbl) { d *= 2; if (d > 9) d -= 9 }
    sum += d; dbl = !dbl
  }
  return v.length >= 12 && sum % 10 === 0
}
function validExpiry(exp: string) {
  const m = /^(\d{2})\/(\d{2})$/.exec(exp.trim())
  if (!m) return false
  const mm = +m[1], yy = +m[2]
  if (mm < 1 || mm > 12) return false
  const now = new Date()
  const year = 2000 + yy
  // set to last day of month 23:59
  const last = new Date(year, mm, 0, 23, 59, 59)
  return last >= now
}
function maskCard(num: string) {
  const v = (num || '').replace(/\s+/g, '')
  return v.length <= 4 ? v : v.slice(0, 4) + ' •••• •••• ' + v.slice(-4)
}
</script>

<style scoped>
.ts-fade-enter-active, .ts-fade-leave-active { transition: opacity .18s ease; }
.ts-fade-enter-from, .ts-fade-leave-to { opacity: 0; }
</style>
