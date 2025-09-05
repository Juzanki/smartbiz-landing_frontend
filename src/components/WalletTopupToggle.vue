<!-- src/components/WalletButton.vue -->
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'

/** Props */
const props = withDefaults(defineProps<{
  balance?: number | null,     // null -> skeleton
  currency?: string,           // e.g. "TZS"
  floating?: boolean,          // fixed FAB bottom-right
  size?: 'md'|'lg',            // visual size
  pending?: number,            // pending tx count badge
  disabled?: boolean,
}>(), {
  balance: null,
  currency: 'TZS',
  floating: true,
  size: 'lg',
  pending: 0,
  disabled: false,
})

/** Emits */
const emit = defineEmits<{
  (e:'open'): void
  (e:'pay'): void
  (e:'receive'): void
  (e:'topup'): void
  (e:'history'): void
  (e:'longpress'): void
}>()

/** State */
const sheet = ref(false)
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const holding = ref(false)
let holdTimer: number | null = null
const btn = ref<HTMLButtonElement|null>(null)

/** Computed */
const capPending = computed(() => props.pending > 99 ? '99+' : props.pending || '')
const isDisabled = computed(() => props.disabled || !online.value)

/** Handlers */
function clickOpen(){
  if (isDisabled.value) return
  emit('open')
  vibrate([10])
}
function onPointerDown(e: PointerEvent){
  if (isDisabled.value) return
  holding.value = true
  holdTimer = window.setTimeout(() => {
    holding.value = false
    sheet.value = true
    emit('longpress')
    vibrate([8, 60, 8])
  }, 420) as unknown as number
  // double-tap convenience
  const t = Date.now()
  const last = (btn.value as any)?._lastTap ?? 0
  ;(btn.value as any)._lastTap = t
  if (t - last < 280) { clearHold(); clickOpen() }
}
function onPointerUp(){
  if (holdTimer){ clearTimeout(holdTimer); holdTimer = null }
  if (holding.value){ holding.value = false } // simple ripple already triggered via CSS
}
function clearHold(){ if (holdTimer){ clearTimeout(holdTimer); holdTimer = null } holding.value = false }

function closeSheet(){ sheet.value = false }

function act(kind:'pay'|'receive'|'topup'|'history'){
  vibrate([10])
  sheet.value = false
  emit(kind)
}

function vibrate(p:number[]){ try{ navigator.vibrate?.(p) }catch{} }

function fmtMoney(n:number){
  try {
    // Keep 0 decimals for TZS
    const minMax = props.currency.toUpperCase() === 'TZS' ? { minimumFractionDigits:0, maximumFractionDigits:0 } : {}
    return new Intl.NumberFormat(undefined, { style:'currency', currency: props.currency, ...minMax }).format(n)
  } catch { return `${props.currency} ${n.toLocaleString()}` }
}

/** Lifecycle */
onMounted(()=>{
  window.addEventListener?.('online', ()=> online.value = true)
  window.addEventListener?.('offline', ()=> online.value = false)
})
onBeforeUnmount(()=>{
  window.removeEventListener?.('online', ()=>{})
  window.removeEventListener?.('offline', ()=>{})
})
</script>

<template>
  <div v-if="floating" class="fixed z-50"
       :style="{
         right: 'max(1rem, calc(env(safe-area-inset-right, 0px) + .75rem))',
         bottom: 'max(1rem, calc(env(safe-area-inset-bottom, 0px) + .75rem))'
       }">
    <button
      ref="btn"
      class="wallet-btn"
      :class="[ size==='lg' ? 'w-16 h-16' : 'w-14 h-14', isDisabled ? 'opacity-60' : 'active:scale-95' ]"
      :aria-label="`Open wallet`"
      :disabled="isDisabled"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @click.stop="clickOpen"
    >
      <!-- icon -->
      <span class="text-2xl">💳</span>

      <!-- pending badge -->
      <span v-if="pending" class="badge">{{ capPending }}</span>

      <!-- offline overlay -->
      <span v-if="!online" class="offline-dot" title="Offline"></span>
    </button>

    <!-- balance chip -->
    <div class="mt-2 px-3 h-9 rounded-full bg-black/70 text-white text-sm flex items-center gap-2 backdrop-blur">
      <span class="opacity-80">Wallet</span>
      <span v-if="balance!==null" class="font-semibold">{{ fmtMoney(balance!) }}</span>
      <span v-else class="skeleton w-16 h-3 rounded"></span>
    </div>
  </div>

  <!-- Inline (non-floating) variant -->
  <button v-else
    ref="btn"
    class="inline-flex items-center gap-2 rounded-full px-4 h-10 text-white bg-amber-500 hover:bg-amber-600 shadow"
    :disabled="isDisabled"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @click.stop="clickOpen"
  >
    <span class="text-lg">💳</span>
    <span class="font-semibold">Wallet</span>
    <span class="ml-1 text-white/90 text-sm" v-if="balance!==null">{{ fmtMoney(balance!) }}</span>
    <span class="skeleton w-10 h-3 rounded" v-else />
    <span v-if="pending" class="ml-2 badge">{{ capPending }}</span>
  </button>

  <!-- Quick actions bottom sheet -->
  <div v-if="sheet" class="fixed inset-0 z-50">
    <div class="absolute inset-0 bg-black/45" @click="closeSheet"></div>
    <section
      class="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white dark:bg-[#0b0b10] border-t border-black/10 dark:border-white/10 p-4"
      role="dialog" aria-modal="true"
    >
      <div class="mx-auto w-full max-w-md">
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-sm font-semibold">Quick actions</h4>
          <button class="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10" @click="closeSheet" aria-label="Close">✖</button>
        </div>
        <div class="grid grid-cols-4 gap-2 text-xs">
          <button class="qa" @click="act('pay')"     :disabled="!online">📤 Pay</button>
          <button class="qa" @click="act('receive')">📥 Receive</button>
          <button class="qa" @click="act('topup')"   :disabled="!online">➕ Top-up</button>
          <button class="qa" @click="act('history')">🧾 History</button>
        </div>
        <p class="mt-2 text-[11px] text-gray-500 dark:text-white/60">Tip: long-press the wallet to open this menu.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* FAB button */
.wallet-btn{
  @apply rounded-full grid place-items-center text-white shadow-lg relative;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  transition: transform .15s ease, filter .2s ease;
}
.wallet-btn::after{ /* subtle ripple on hold */
  content:''; position:absolute; inset:0; border-radius:inherit; opacity:0;
  background: radial-gradient(closest-side, rgba(255,255,255,.25), transparent);
  transition: opacity .2s ease;
}
.wallet-btn:active::after{ opacity:1 }

/* Pending badge */
.badge{
  @apply absolute -top-1 -right-1 min-w-[1.2rem] h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold grid place-items-center ring-2 ring-white;
}

/* Offline dot */
.offline-dot{
  position:absolute; right:-4px; bottom:-4px; width:14px; height:14px; border-radius:9999px;
  background:#9ca3af; box-shadow: 0 0 0 2px white;
}

/* Skeleton shimmer */
.skeleton{
  background: linear-gradient(90deg, rgba(0,0,0,.12), rgba(0,0,0,.08), rgba(0,0,0,.12));
  background-size: 200% 100%; animation: shimmer 1.2s linear infinite;
}
@keyframes shimmer{ 0%{ background-position: 200% 0 } 100%{ background-position: -200% 0 } }

/* Bottom sheet actions */
.qa{
  @apply h-12 rounded-xl bg-gray-100 dark:bg-white/10 dark:text-white hover:bg-gray-200 dark:hover:bg-white/15;
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce){
  .wallet-btn{ transition: none }
  .skeleton{ animation: none }
}
</style>
