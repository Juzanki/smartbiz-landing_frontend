<!-- ConfirmRechargeSheet.vue -->
<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
    role="dialog" aria-modal="true" aria-labelledby="recharge-title"
    @click.self="!loading && close('backdrop')" @keydown.esc.prevent="!loading && close('esc')"
  >
    <!-- Bottom Sheet -->
    <section
      ref="sheet"
      class="w-full sm:w-[92%] max-w-md max-h-[92vh]
             rounded-t-3xl sm:rounded-2xl overflow-hidden select-none
             bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100
             ring-1 ring-black/10 dark:ring-white/10 shadow-2xl animate-in flex flex-col"
      :style="dragStyle"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <!-- Handle (mobile) -->
      <div class="sm:hidden pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
      </div>

      <!-- Header -->
      <header class="px-5 pt-2 pb-3 sm:p-5 flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10">
        <div>
          <h1 id="recharge-title" class="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400">
            Confirm Recharge
          </h1>
          <p class="text-[12px] text-zinc-500 dark:text-zinc-400">You’re about to recharge your SmartWallet</p>
        </div>

        <button
          class="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          :aria-disabled="loading" :disabled="loading" aria-label="Close"
          @click="close('x')">✕</button>
      </header>

      <!-- Body -->
      <div class="px-5 pt-4 pb-4 sm:pb-5 space-y-4 overflow-y-auto">
        <!-- Summary Card -->
        <div class="rounded-2xl border border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-900/20 p-4 text-center">
          <p class="text-[12px] text-indigo-700/80 dark:text-indigo-300/90">Recharge Amount</p>
          <div class="mt-1 flex items-center justify-center gap-2">
            <img src="/icons/smartbiz-coin.png" alt="" class="w-6 h-6" />
            <div class="text-3xl font-extrabold text-indigo-700 dark:text-indigo-300">
              {{ amount.toLocaleString() }} <span class="text-base align-middle font-semibold">Coins</span>
            </div>
          </div>
          <p class="mt-2 text-[12px] text-zinc-500 dark:text-zinc-400">
            Payment via <b class="capitalize">{{ methodMeta.label }}</b> {{ methodMeta.hint ? `• ${methodMeta.hint}` : '' }}
          </p>
        </div>

        <!-- Method Row -->
        <div class="flex items-center justify-between rounded-xl border bg-white dark:bg-zinc-900 p-3
                    border-zinc-200 dark:border-zinc-800">
          <div class="flex items-center gap-3 min-w-0">
            <div class="text-2xl">{{ methodMeta.icon }}</div>
            <div class="min-w-0">
              <div class="text-sm font-semibold truncate">{{ methodMeta.label }}</div>
              <div class="text-[12px] text-zinc-500 dark:text-zinc-400 truncate">{{ methodMeta.sub }}</div>
            </div>
          </div>
          <button
            class="px-3 py-1.5 text-xs rounded-full bg-zinc-100 dark:bg-zinc-800"
            :disabled="loading"
            @click="$emit('change-method')"
          >Change</button>
        </div>

        <!-- Processing State -->
        <div v-if="loading" class="space-y-2">
          <div class="flex items-center gap-2 text-sm">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity=".25" stroke-width="4"/>
              <path d="M4 12a8 8 0 018-8" fill="currentColor" />
            </svg>
            <span>{{ statusText }}</span>
          </div>
          <div class="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div class="h-full bg-indigo-600 dark:bg-indigo-500 transition-all" :style="{ width: progress + '%' }"></div>
          </div>
        </div>

        <!-- Success State -->
        <div v-if="success" class="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 p-3">
          <div class="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <span>✅</span>
            <b>Recharge successful.</b>
          </div>
          <div class="mt-2 text-[12px] text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
            <span>Txn ID: <code class="px-1 rounded bg-zinc-100 dark:bg-zinc-800">{{ txnId }}</code></span>
            <button class="px-2 py-1 text-[11px] rounded bg-zinc-100 dark:bg-zinc-800" @click="copyTxn">Copy</button>
          </div>
        </div>

        <!-- Offline hint -->
        <div v-if="!isOnline" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-700">
          You appear offline. Payment may fail; check your connection.
        </div>
      </div>

      <!-- Footer -->
      <footer class="px-5 py-3 border-t border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/70 backdrop-blur flex items-center justify-between">
        <button
          class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-200 dark:bg-zinc-800"
          @click="close('cancel')" :disabled="loading">Cancel</button>

        <button
          class="rounded-full px-4 py-2 text-xs font-semibold text-black
                 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 disabled:cursor-not-allowed
                 shadow-md"
          :disabled="loading || amount<=0"
          @click="beginPayment"
        >
          <span v-if="!loading && !success">🚀 Confirm Recharge</span>
          <span v-else-if="loading">Processing…</span>
          <span v-else>Done</span>
        </button>
      </footer>

      <!-- Safe-area spacer -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/* Props */
const props = defineProps({
  open: { type: Boolean, default: true },
  amount: { type: Number, default: 0 },
  method: { type: String, default: 'mpesa' } // mpesa | card | paypal | crypto
})
/* Emits */
const emit = defineEmits(['close','confirmed','change-method'])

/* State */
const loading = ref(false)
const success = ref(false)
const progress = ref(0)
const statusText = ref('')
const txnId = ref('')

/* Online status */
const isOnline = ref(navigator.onLine)
function onOnline(){ isOnline.value = true }
function onOffline(){ isOnline.value = false }

/* Method metadata */
const methodMeta = computed(()=>{
  const map = {
    mpesa : { label:'M-Pesa', icon:'📱', sub:'Sim Toolkit push', hint:'Check phone' },
    card  : { label:'Card', icon:'💳', sub:'Visa / Mastercard', hint:'3-D Secure' },
    paypal: { label:'PayPal', icon:'🅿️', sub:'PayPal Balance', hint:'' },
    crypto: { label:'Crypto', icon:'🪙', sub:'BTC/USDT', hint:'Network fees apply' },
  }
  return map[props.method] || { label: props.method, icon:'💠', sub:'', hint:'' }
})

/* Actions */
function beginPayment(){
  if (loading.value || success.value) return
  if (props.amount <= 0) return
  loading.value = true
  progress.value = 8
  statusText.value = stageText('init')

  // Simulate specific flows
  const steps = flowFor(props.method)
  let i = 0
  const timer = setInterval(()=>{
    i++
    progress.value = Math.min(100, progress.value + steps.delta)
    statusText.value = stageText(steps.labels[i] || 'final')
    if (progress.value >= 100 || i >= steps.labels.length){
      clearInterval(timer)
      // Done
      txnId.value = genTxnId()
      success.value = true
      loading.value = false
      buzz(16)
      // notify parent
      emit('confirmed', { amount: props.amount, method: props.method, txnId: txnId.value, at: Date.now() })
    }
  }, steps.interval)
}

function stageText(key){
  const dict = {
    init:'Starting…',
    mpesa_push:'Sending STK push to your phone…',
    mpesa_wait:'Awaiting PIN confirmation…',
    card_auth:'Contacting bank…',
    card_3ds:'Awaiting 3-D Secure…',
    paypal_redirect:'Connecting to PayPal…',
    crypto_quote:'Fetching network quote…',
    crypto_confirm:'Waiting blockchain confirmation…',
    final:'Finalizing…'
  }
  return dict[key] || 'Processing…'
}

function flowFor(method){
  switch(method){
    case 'mpesa': return { interval: 600, delta: 22, labels:['init','mpesa_push','mpesa_wait','final'] }
    case 'card':  return { interval: 600, delta: 22, labels:['init','card_auth','card_3ds','final'] }
    case 'paypal':return { interval: 650, delta: 25, labels:['init','paypal_redirect','final'] }
    case 'crypto':return { interval: 700, delta: 20, labels:['init','crypto_quote','crypto_confirm','final'] }
    default:      return { interval: 650, delta: 25, labels:['init','final'] }
  }
}

/* Utils */
function genTxnId(){ return 'TX-'+Math.random().toString(36).slice(2,8).toUpperCase()+'-'+Date.now().toString().slice(-4) }
function copyTxn(){
  try{ navigator.clipboard.writeText(txnId.value); buzz(10) }catch{}
}
function buzz(ms=12){ try{ navigator?.vibrate?.(ms) }catch{} }

/* Close */
function close(reason){ if (loading.value) return; emit('close', { reason }) }

/* Reset on open toggle */
watch(()=>props.open, (v)=>{
  if (v){ loading.value=false; success.value=false; progress.value=0; statusText.value=''; txnId.value='' }
})

/* Swipe-to-close */
const startY = ref(0), dY = ref(0), dragging = ref(false)
const dragStyle = computed(()=>{
  if(!dragging.value) return {}
  const y=Math.max(0,dY.value), op=Math.max(1 - y/240, .5)
  return { transform:`translateY(${y}px)`, opacity:op }
})
function onTouchStart(e){ if(e.touches?.length!==1 || loading.value) return; dragging.value=true; startY.value=e.touches[0].clientY; dY.value=0 }
function onTouchMove(e){ if(!dragging.value) return; dY.value=e.touches[0].clientY - startY.value }
function onTouchEnd(){ if(!dragging.value) return; dragging.value=false; if(dY.value>120) close('swipe'); dY.value=0 }

/* Online listeners */
onMounted(()=>{ window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline) })
onBeforeUnmount(()=>{ window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) })
</script>

<style scoped>
/* Entrance */
@keyframes in{ from{ opacity:0; transform: translateY(40px) scale(.98) } to{ opacity:1; transform:none } }
.animate-in{ animation: in .28s cubic-bezier(.22,1,.36,1) both; will-change: opacity, transform }

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .backdrop-blur-sm{ backdrop-filter: none !important; }
}
</style>
