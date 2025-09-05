<template>
  <transition name="pop-fade">
    <div
      v-if="visible && product"
      :class="['absolute z-40', positionClass]"
      role="dialog"
      aria-live="polite"
      :aria-label="`Product: ${product.name}`"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <div
        class="relative w-44 sm:w-48 rounded-2xl border border-white/15 bg-white/90 text-black shadow-2xl backdrop-blur p-3"
        :style="bubbleStyle"
      >
        <!-- Close -->
        <button
          class="absolute -top-2 -right-2 h-7 w-7 grid place-items-center rounded-full bg-black/70 text-white text-xs"
          @click="close"
          aria-label="Close"
        >✖</button>

        <!-- Countdown -->
        <div v-if="remaining > 0" class="absolute -top-2 left-2 rounded-full bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 shadow">
          ⏳ {{ mm }}:{{ ss }}
        </div>

        <!-- Image with skeleton -->
        <div class="relative mb-2">
          <div v-if="!imgLoaded" class="skeleton h-24 w-full rounded-xl"></div>
          <img
            v-show="imgLoaded"
            :src="product.image"
            alt=""
            loading="lazy"
            @load="imgLoaded = true"
            class="h-24 w-full object-cover rounded-xl border border-black/10"
          />
          <!-- Discount badge -->
          <span v-if="discountPct > 0"
                class="absolute top-1 left-1 bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow">
            -{{ discountPct }}%
          </span>
          <!-- Tag (optional) -->
          <span v-if="product.tag"
                class="absolute top-1 right-1 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {{ product.tag }}
          </span>
        </div>

        <!-- Texts -->
        <div class="text-sm font-semibold truncate" :title="product.name">{{ product.name }}</div>

        <div class="flex items-baseline gap-2">
          <div class="text-emerald-600 font-extrabold text-sm">{{ formattedPrice }}</div>
          <div v-if="product.oldPrice" class="text-[11px] text-gray-500 line-through">{{ formattedOld }}</div>
        </div>

        <!-- Stock (optional) -->
        <div v-if="product.stock !== undefined" class="mt-0.5 text-[11px]"
             :class="product.stock > 0 ? 'text-gray-500' : 'text-rose-600 font-semibold'">
          {{ product.stock > 0 ? `Stock: ${product.stock}` : 'Out of stock' }}
        </div>

        <!-- Actions -->
        <div class="mt-2 grid grid-cols-2 gap-2">
          <button
            class="h-8 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 active:translate-y-[1px]"
            @click="onBuy"
          >Buy Now</button>
          <button
            class="h-8 rounded-xl border border-black/10 bg-black/5 text-xs font-semibold active:translate-y-[1px]"
            @click="onAddToCart"
          >Add to Cart</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'

/** Props */
const props = defineProps({
  modelValue: { type: Boolean, default: true },        // control visibility (v-model)
  product: {                                           // same shape + optional fields below
    type: Object,
    default: () => ({ name: '', price: 0, image: '', position: 'bottom' })
  },
  currency: { type: String, default: 'TZS' },          // default TZS
  autoHideMs: { type: Number, default: 12000 },        // auto-dismiss if no interaction
  countdownSec: { type: Number, default: 0 },          // flash-sale timer (0 = off)
  accent: { type: String, default: '#4f46e5' }         // accent color for ring/glow (indigo-600)
})

/** Emits */
const emit = defineEmits(['update:modelValue','buy','add-to-cart','close','expired'])

/** Visibility */
const visible = ref(!!props.modelValue)
watch(() => props.modelValue, v => visible.value = v)
watch(visible, v => emit('update:modelValue', v))

/** Price formatting */
const formatter = computed(() => {
  try { return new Intl.NumberFormat('sw-TZ', { style: 'currency', currency: props.currency, maximumFractionDigits: 0 }) }
  catch { return { format: n => `${props.currency} ${Number(n||0).toLocaleString()}` } }
})
const formattedPrice = computed(() => formatter.value.format(props.product?.price || 0))
const formattedOld   = computed(() => formatter.value.format(props.product?.oldPrice || 0))
const discountPct    = computed(() => {
  const { price, oldPrice } = props.product || {}
  if (!oldPrice || !price || oldPrice <= price) return 0
  return Math.round(100 - (price / oldPrice) * 100)
})

/** Position (mobile-first safe areas) */
const positionClass = computed(() => {
  const pos = props.product?.position || 'bottom'
  if (pos === 'top')    return 'top-12 left-1/2 -translate-x-1/2'
  if (pos === 'center') return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
  return 'left-1/2 -translate-x-1/2'
})
const bubbleStyle = computed(() => {
  if ((props.product?.position || 'bottom') === 'bottom') {
    // sit a bit above bottom & respect safe-area
    return { marginBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4rem)', borderColor: `${props.accent}33` }
  }
  return { borderColor: `${props.accent}33` }
})

/** Image skeleton */
const imgLoaded = ref(false)
watch(() => props.product?.image, () => { imgLoaded.value = false })

/** Auto hide timer */
let autoT = null
function scheduleAutoHide(){
  clearTimeout(autoT)
  if (props.autoHideMs > 0) {
    autoT = setTimeout(() => { visible.value = false; emit('expired') }, props.autoHideMs)
  }
}

/** Countdown (optional) */
const remaining = ref(props.countdownSec || 0)
let tickT = null
const mm = computed(() => String(Math.floor(remaining.value/60)).padStart(2,'0'))
const ss = computed(() => String(remaining.value%60).padStart(2,'0'))
function startCountdown(){
  clearInterval(tickT)
  if (remaining.value <= 0) return
  tickT = setInterval(() => {
    remaining.value--
    if (remaining.value <= 0) {
      clearInterval(tickT)
      visible.value = false
      emit('expired')
    }
  }, 1000)
}

/** Gestures: swipe-down to dismiss (mobile) */
let startY = 0, dy = 0
function onTouchStart(e){ startY = e.touches?.[0]?.clientY || 0; dy = 0 }
function onTouchMove(e){
  const y = e.touches?.[0]?.clientY || 0
  dy = y - startY
}
function onTouchEnd(){
  if (dy > 40) close()
  startY = 0; dy = 0
}

/** Actions */
function onBuy(){ emit('buy', props.product) }
function onAddToCart(){ emit('add-to-cart', props.product) }
function close(){ visible.value = false; emit('close') }

/** Lifecycle */
onMounted(() => { scheduleAutoHide(); startCountdown(); try { navigator.vibrate?.(8) } catch {} })
onBeforeUnmount(() => { clearTimeout(autoT); clearInterval(tickT) })
watch(() => [props.product, props.autoHideMs], () => scheduleAutoHide(), { deep: true })
</script>

<style scoped>
/* Pop + fade */
.pop-fade-enter-active, .pop-fade-leave-active { transition: transform .18s ease, opacity .18s ease }
.pop-fade-enter-from, .pop-fade-leave-to { transform: scale(.95); opacity: 0 }

/* Skeleton shimmer */
.skeleton {
  position: relative; overflow: hidden; background: #e5e7eb;
}
.skeleton::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.6) 50%, rgba(255,255,255,0) 100%);
  animation: shimmer 1.2s infinite; background-size: 200% 100%;
}
@keyframes shimmer { 0% { background-position: -150% 0 } 100% { background-position: 250% 0 } }
</style>
