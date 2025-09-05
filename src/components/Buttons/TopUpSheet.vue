<template>
  <transition name="ts-fade">
    <div v-if="modelValue" class="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Top up panel">
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
            <button @click="close" class="p-2 rounded-full hover:bg-black/5" aria-label="Close">✖</button>
          </div>
        </header>

        <!-- Content -->
        <main class="px-4 py-4 md:px-6 md:py-6 overflow-y-auto space-y-5">
          <!-- Amount presets -->
          <section>
            <h3 class="text-sm font-bold text-gray-800 mb-2">Choose amount</h3>
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
              <button
                v-for="a in presets"
                :key="a.value"
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
              <label class="text-sm text-gray-600">Custom</label>
              <input
                v-model.number="amount"
                type="number" inputmode="decimal" min="0"
                class="flex-1 px-3 py-2 rounded-xl border border-black/10 bg-white text-gray-800 text-sm"
                placeholder="Enter amount (TSh)"
              />
            </div>
          </section>

          <!-- Promo -->
          <section>
            <h3 class="text-sm font-bold text-gray-800 mb-2">Promo code</h3>
            <div class="flex gap-2">
              <input v-model.trim="promo" class="flex-1 px-3 py-2 rounded-xl border border-black/10 bg-white text-gray-800 text-sm" placeholder="e.g., SMART10" />
              <button @click="applyPromo" class="px-3 py-2 rounded-xl bg-black/80 text-white text-sm font-semibold hover:bg-black">Apply</button>
            </div>
            <p v-if="promoApplied" class="text-emerald-600 text-xs mt-1">Promo applied ✔</p>
          </section>

          <!-- Payment method -->
          <section>
            <h3 class="text-sm font-bold text-gray-800 mb-2">Select payment method</h3>
            <div class="grid grid-cols-2 gap-3">
              <PayOption
                v-for="m in methods"
                :key="m.key"
                :active="method===m.key"
                :title="m.title"
                :desc="m.desc"
                :icon="m.icon"
                @select="method = m.key"
              />
            </div>

            <!-- Dynamic details (example: phone for mobile money) -->
            <div v-if="isMobileMoney" class="mt-3 space-y-2">
              <label class="block text-xs font-semibold text-gray-600">Mobile number</label>
              <input v-model="phone" type="tel" inputmode="tel" placeholder="+2557XXXXXXXX" class="w-full px-3 py-2 rounded-xl border border-black/10 bg-white text-gray-800 text-sm" />
            </div>
            <div v-else-if="method==='card'" class="mt-3 grid grid-cols-1 gap-2">
              <input v-model="card.name" placeholder="Name on card" class="px-3 py-2 rounded-xl border border-black/10 text-sm" />
              <input v-model="card.number" placeholder="Card number" inputmode="numeric" class="px-3 py-2 rounded-xl border border-black/10 text-sm" />
              <div class="flex gap-2">
                <input v-model="card.exp" placeholder="MM/YY" class="flex-1 px-3 py-2 rounded-xl border border-black/10 text-sm" />
                <input v-model="card.cvc" placeholder="CVC" class="flex-1 px-3 py-2 rounded-xl border border-black/10 text-sm" />
              </div>
            </div>
          </section>
        </main>

        <!-- Footer -->
        <footer class="px-4 md:px-6 pb-4 pt-2 border-t border-black/5 bg-white/90 backdrop-blur">
          <div class="flex items-center justify-between text-sm">
            <div class="text-gray-700">
              <span class="font-semibold">Total:</span>
              <span class="ml-1">{{ formatCurrency(total) }}</span>
              <span v-if="discount > 0" class="ml-2 text-emerald-600">(-{{ formatCurrency(discount) }} promo)</span>
            </div>
            <button
              :disabled="!canConfirm"
              @click="confirm"
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
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  currency?: 'TZS'|'USD'
}>(), {
  currency: 'TZS'
})
const emit = defineEmits<{
  (e:'update:modelValue', v:boolean): void
  (e:'confirm', payload: {
    amount:number, currency:string, method:string,
    phone?:string, card?:any, promo?:string, discount?:number
  }): void
}>()

/* state */
const amount = ref<number>(1000)
const promo = ref('')
const promoApplied = ref(false)
const method = ref('mpesa') // default TZ market
const phone = ref('')
const card = ref({ name:'', number:'', exp:'', cvc:'' })

/* presets (TZS examples) */
const presets = [
  { label: 'TSh 1,000', value: 1000 },
  { label: 'TSh 2,000', value: 2000 },
  { label: 'TSh 5,000', value: 5000 },
  { label: 'TSh 10,000', value: 10000 },
  { label: 'TSh 20,000', value: 20000 },
  { label: 'TSh 50,000', value: 50000 },
  { label: 'TSh 100,000', value: 100000 },
  { label: 'TSh 200,000', value: 200000 },
]

/* payment methods (icons via UnoCSS / Tabler / FA6) */
const methods = [
  { key:'mpesa',  title:'M-Pesa',        desc:'Vodacom',      icon:'i-custom-mpesa' },
  { key:'airtel', title:'Airtel Money',  desc:'Airtel',       icon:'i-custom-airtel' },
  { key:'tigo',   title:'Tigo Pesa',     desc:'Tigo',         icon:'i-custom-tigo' },
  { key:'halo',   title:'Halopesa',      desc:'Halotel',      icon:'i-custom-halotel' },
  { key:'card',   title:'Debit/Credit',  desc:'Visa/Master',  icon:'i-tabler-credit-card' },
  { key:'paypal', title:'PayPal',        desc:'International',icon:'i-fa6-brands-paypal' },
]

const isMobileMoney = computed(() => ['mpesa','airtel','tigo','halo'].includes(method.value))

/* promo logic (simple demo: SMART10 = 10% off up to 20,000) */
const discount = computed(() => {
  if (!promoApplied.value) return 0
  const d = Math.min(amount.value * 0.1, 20000)
  return Math.floor(isNaN(d) ? 0 : d)
})
const total = computed(() => Math.max(0, (amount.value || 0) - discount.value))

function applyPromo(){
  promoApplied.value = promo.value.toUpperCase() === 'SMART10'
}

/* confirm payload */
const canConfirm = computed(() => {
  if (!amount.value || amount.value <= 0) return false
  if (isMobileMoney.value && phone.value.trim().length < 9) return false
  if (method.value === 'card') {
    if (!card.name || !card.number || !card.exp || !card.cvc) return false
  }
  return true
})

function confirm(){
  emit('confirm', {
    amount: amount.value,
    currency: props.currency,
    method: method.value,
    phone: isMobileMoney.value ? phone.value : undefined,
    card: method.value === 'card' ? card.value : undefined,
    promo: promoApplied.value ? promo.value : undefined,
    discount: discount.value
  })
}

/* open/close */
function close(){ emit('update:modelValue', false) }

/* body scroll lock */
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

/* esc to close */
function onKey(e: KeyboardEvent){ if (e.key === 'Escape') close() }
onMounted(()=> document.addEventListener('keydown', onKey))
onBeforeUnmount(()=> {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = prevOverflow.value || ''
})

/* swipe-down to close (mobile) */
const sheet = ref<HTMLElement|null>(null)
let startY = 0, currentY = 0, dragging = false
function onTouchStart(e: TouchEvent){ startY = e.touches[0].clientY; dragging = true }
function onTouchMove(e: TouchEvent){
  if(!dragging || !sheet.value) return
  currentY = e.touches[0].clientY
  const delta = Math.max(0, currentY - startY)
  sheet.value.style.transform = `translateY(${delta}px)`
}
function onTouchEnd(){
  if(!sheet.value) return
  const delta = Math.max(0, currentY - startY)
  sheet.value.style.transform = ''
  dragging = false
  if(delta > 120) close()
}

/* Inline PayOption */
const PayOption = defineComponent({
  name: 'PayOption',
  props: {
    active: { type: Boolean, default: false },
    title: { type: String, required: true },
    desc:  { type: String, required: true },
    icon:  { type: String, required: true }
  },
  emits: ['select'],
  setup(p, { emit }){
    return () => (
      <button
        class={[
          'flex items-center gap-3 p-3 rounded-2xl border transition text-left',
          p.active ? 'border-emerald-300 bg-emerald-50' : 'border-black/10 hover:bg-black/5'
        ]}
        onClick={() => emit('select')}
      >
        <i class={[p.icon, 'text-xl']}></i>
        <div class="min-w-0">
          <div class="text-sm font-semibold text-gray-900 truncate">{p.title}</div>
          <div class="text-xs text-gray-600 truncate">{p.desc}</div>
        </div>
      </button>
    )
  }
})
</script>

<style scoped>
.ts-fade-enter-active,.ts-fade-leave-active{ transition: opacity .18s ease; }
.ts-fade-enter-from,.ts-fade-leave-to{ opacity: 0; }
</style>
