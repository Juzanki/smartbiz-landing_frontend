<!-- 📁 src/components/QuickGiftFormPro.vue -->
<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="ids.title"
      @click.self="close"
    >
      <!-- Bottom sheet -->
      <div
        class="absolute left-0 right-0 bottom-0 rounded-t-3xl bg-white dark:bg-[#0b1020] text-slate-900 dark:text-white shadow-2xl border-t border-black/10 dark:border-white/10"
        :style="safeArea"
      >
        <!-- Drag handle -->
        <div class="pt-2 grid place-items-center">
          <div class="h-1.5 w-12 rounded-full bg-black/15 dark:bg-white/15"></div>
        </div>

        <!-- Header -->
        <div class="px-4 pt-3 pb-2 flex items-center justify-between">
          <h3 :id="ids.title" class="text-base font-extrabold">🎁 Quick Gift</h3>
          <button class="h-9 w-9 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                  @click="close" aria-label="Close">✖</button>
        </div>

        <!-- Balance -->
        <div class="px-4 -mt-1 mb-2 text-xs text-slate-600 dark:text-slate-300">
          Balance: <b class="text-indigo-600 dark:text-indigo-400">{{ balance.toLocaleString() }}</b> coins
        </div>

        <!-- Filters -->
        <div class="px-4 flex items-center gap-2">
          <div class="relative flex-1">
            <input
              :id="ids.search"
              v-model.trim="q"
              class="input w-full pl-9"
              type="search"
              placeholder="Search gifts…"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔎</span>
          </div>
          <div class="flex gap-1 overflow-x-auto no-scrollbar">
            <button
              v-for="c in ['All',...categories]"
              :key="c"
              type="button"
              class="chip"
              :class="activeCat===c && 'chip-active'"
              @click="activeCat = c"
            >{{ c }}</button>
          </div>
        </div>

        <!-- Gifts grid -->
        <div class="px-4 mt-3 max-h-[42vh] overflow-y-auto space-y-3">
          <div v-if="!filtered.length" class="text-center text-sm text-slate-500 py-8">No gifts found.</div>

          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="g in filtered"
              :key="g.id"
              type="button"
              class="gift-card group"
              :class="selected?.id===g.id && 'ring-2 ring-indigo-500'"
              @click="select(g)"
            >
              <div class="relative">
                <div v-if="!imgLoaded[g.id]" class="skeleton h-20 w-full rounded-xl"></div>
                <img
                  v-show="imgLoaded[g.id]"
                  :src="g.icon"
                  :alt="g.name"
                  loading="lazy"
                  @load="onImgLoad(g.id)"
                  class="h-20 w-full object-contain rounded-xl"
                />
                <span v-if="g.tier" class="tier-badge">{{ g.tier }}</span>
                <span v-if="g.limited" class="tag-limited">⏳</span>
                <span v-if="g.popular" class="tag-popular">🔥</span>
              </div>
              <div class="mt-1 text-[12px] font-semibold truncate" :title="g.name">{{ g.name }}</div>
              <div class="text-[11px] text-emerald-600 font-bold">{{ g.coins.toLocaleString() }}c</div>
            </button>
          </div>
        </div>

        <!-- Selection panel -->
        <div v-if="selected" class="px-4 mt-3">
          <div class="flex items-center gap-3">
            <img :src="selected.icon" alt="" class="h-10 w-10 object-contain rounded-lg border border-black/10 dark:border-white/10" />
            <div class="min-w-0">
              <div class="text-sm font-bold truncate">{{ selected.name }}</div>
              <div class="text-[11px] text-slate-500">{{ selected.coins.toLocaleString() }} coins</div>
            </div>

            <!-- Qty stepper -->
            <div class="ml-auto flex items-center gap-2">
              <button class="step" @click="dec" aria-label="Decrease">−</button>
              <input
                class="qty"
                :value="qty"
                @input="onQtyInput($event)"
                inputmode="numeric"
                pattern="[0-9]*"
              />
              <button class="step" @click="inc" aria-label="Increase">+</button>
            </div>
          </div>

          <!-- Optional message -->
          <div class="mt-2">
            <textarea
              v-model="message"
              class="input w-full h-10 resize-none"
              maxlength="80"
              placeholder="Add a short message (optional)…"
            />
            <div class="flex justify-end text-[11px] text-slate-500">{{ 80 - (message?.length || 0) }}</div>
          </div>

          <!-- Totals -->
          <div class="mt-2 text-sm">
            <div class="flex justify-between">
              <span>Subtotal</span>
              <b>{{ subtotal.toLocaleString() }} coins</b>
            </div>
            <div v-if="discountPct>0" class="flex justify-between text-emerald-700 dark:text-emerald-400">
              <span>Combo discount ({{ discountPct }}%)</span>
              <b>-{{ discountValue.toLocaleString() }}</b>
            </div>
            <div class="flex justify-between border-t border-black/10 dark:border-white/10 mt-1 pt-1">
              <span>Total</span>
              <b class="text-indigo-600 dark:text-indigo-400">{{ total.toLocaleString() }} coins</b>
            </div>
            <div v-if="insufficient" class="mt-1 text-[12px] text-rose-600 font-semibold">Not enough coins.</div>
          </div>
        </div>

        <!-- Sticky action bar -->
        <div class="px-4 py-3 mt-2 bg-white/85 dark:bg-black/60 border-t border-black/10 dark:border-white/10 rounded-t-3xl">
          <div class="flex items-center gap-2">
            <button type="button" class="btn-soft flex-1" @click="close">Cancel</button>
            <button
              v-if="insufficient"
              type="button"
              class="btn-ghost"
              @click="$emit('recharge')"
            >Recharge</button>
            <button
              v-else
              type="button"
              class="btn-primary"
              :disabled="!selected || qty<=0 || sending"
              @click="send"
            >
              <span v-if="!sending">Send Gift</span>
              <span v-else class="inline-flex items-center gap-2"><span class="spinner"></span>Sending…</span>
            </button>
          </div>
          <transition name="fade">
            <p v-if="queued" class="mt-2 text-[12px] rounded-lg px-3 py-2 bg-amber-500/15 text-amber-800 dark:text-amber-100 border border-amber-500/30">
              ⚠️ You’re offline — gift queued and will sync later.
            </p>
          </transition>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/** Props */
const props = defineProps({
  modelValue: { type: Boolean, default: false },              // v-model for visibility
  gifts: { type: Array, default: () => ([
    { id:'rose', name:'Rose', icon:'/Gifts/rose.png', coins:2,  tier:'Lite',  category:'Flowers', popular:true },
    { id:'diamond', name:'Diamond Drop', icon:'/Gifts/diamond.png', coins:2500, tier:'Epic', category:'Luxury' },
    { id:'galaxy', name:'Galaxy Orbit', icon:'/Gifts/galaxyorbit.png', coins:12000, tier:'Legendary', category:'Cosmic', limited:true },
  ])},
  balance: { type: Number, default: 0 },
  maxQty: { type: Number, default: 99 },
})

/** Emits */
const emit = defineEmits(['update:modelValue','submit','recharge','close'])

/** Visibility & a11y */
const visible = ref(!!props.modelValue)
watch(() => props.modelValue, v => visible.value = v)
watch(visible, v => {
  emit('update:modelValue', v)
  toggleScroll(!v)
})

/** State */
const q = ref('')
const activeCat = ref('All')
const selected = ref(null)
const qty = ref(1)
const message = ref('')
const sending = ref(false)
const queued = ref(false)
const imgLoaded = ref({}) // {id:true}

/** Derived lists */
const categories = computed(() => {
  const set = new Set((props.gifts || []).map(g => g.category).filter(Boolean))
  return Array.from(set)
})

const filtered = computed(() => {
  const term = q.value.toLowerCase()
  return (props.gifts || []).filter(g => {
    const inCat = activeCat.value === 'All' || g.category === activeCat.value || g.tier === activeCat.value
    const inSearch = !term || [g.name, g.tier, g.category].filter(Boolean).some(x => String(x).toLowerCase().includes(term))
    return inCat && inSearch
  })
})

/** Pricing */
const subtotal = computed(() => (selected.value ? selected.value.coins * qty.value : 0))
const discountPct = computed(() => (qty.value >= 10 ? 12 : qty.value >= 5 ? 5 : 0))
const discountValue = computed(() => Math.floor(subtotal.value * (discountPct.value/100)))
const total = computed(() => Math.max(0, subtotal.value - discountValue.value))
const insufficient = computed(() => total.value > props.balance)

/** Actions */
function select(g){
  selected.value = g
  try { navigator.vibrate?.(6) } catch {}
}
function inc(){ qty.value = Math.min(props.maxQty, qty.value + 1) }
function dec(){ qty.value = Math.max(1, qty.value - 1) }
function onQtyInput(e){
  const v = Math.max(1, Math.min(props.maxQty, parseInt(e.target.value.replace(/\D/g,'')) || 1))
  qty.value = v
}

/** Image load tracker */
function onImgLoad(id){ imgLoaded.value = { ...imgLoaded.value, [id]: true } }

/** Submit */
async function send(){
  if (!selected.value || qty.value <= 0 || insufficient.value) return
  sending.value = true
  queued.value = false
  const payload = {
    giftId: selected.value.id,
    qty: qty.value,
    coinsPerUnit: selected.value.coins,
    subtotal: subtotal.value,
    discountPct: discountPct.value,
    total: total.value,
    message: message.value?.trim() || '',
    createdAt: Date.now(),
    queued: false
  }
  try {
    if (!navigator.onLine) throw new Error('offline')
    emit('submit', payload)
    resetForm()
  } catch (e) {
    // Queue offline
    const storeKey = 'gift_queue'
    const q = JSON.parse(localStorage.getItem(storeKey) || '[]')
    q.push({ ...payload, queued: true })
    localStorage.setItem(storeKey, JSON.stringify(q))
    queued.value = true
    emit('submit', { ...payload, queued: true }) // optimistic
    resetForm()
  } finally {
    sending.value = false
  }
}

function resetForm(){
  qty.value = 1
  message.value = ''
  try { navigator.vibrate?.(8) } catch {}
}

function close(){
  visible.value = false
  emit('close')
}

/** Keyboard (ESC) */
function onKey(e){ if (e.key === 'Escape') close() }

/** Safe area */
const safeArea = { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }

/** Lifecycle */
onMounted(() => { window.addEventListener('keydown', onKey) })
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); toggleScroll(true) })

/** IDs */
const ids = {
  title: 'gf-title-' + rnd(),
  search: 'gf-search-' + rnd(),
}
function rnd(){ return Math.random().toString(36).slice(2,7) }

/** Scroll lock when open */
function toggleScroll(enable){ try { document.documentElement.style.overflow = enable ? '' : 'hidden' } catch {} }
</script>

<style scoped>
/* Inputs & chips */
.input { @apply h-11 px-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm; }
.chip { @apply h-8 px-3 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-black/10 dark:border-white/10; }
.chip-active { @apply bg-indigo-600 text-white; }

/* Gift cards */
.gift-card { @apply text-left rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-2 active:translate-y-[1px]; }
.tier-badge { @apply absolute top-1 left-1 text-[10px] font-extrabold bg-black/70 text-white rounded-full px-2 py-0.5; }
.tag-limited { @apply absolute top-1 right-1 text-[10px] font-bold bg-rose-600 text-white rounded-full px-1.5; }
.tag-popular { @apply absolute top-1 right-7 text-[10px] font-bold bg-amber-500 text-black rounded-full px-1.5; }

/* Stepper & qty */
.step { @apply h-8 w-8 grid place-items-center rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/10 text-base font-bold; }
.qty  { @apply h-8 w-12 text-center rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-white/10 text-sm; }

/* Buttons */
.btn-primary { @apply h-11 px-4 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-500; }
.btn-soft { @apply h-11 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/10; }
.btn-ghost { @apply h-11 px-4 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-500; }

/* Skeleton */
.skeleton { position: relative; overflow: hidden; background: #e5e7eb; }
.skeleton::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.6) 50%, rgba(255,255,255,0) 100%);
  animation: shimmer 1.2s infinite; background-size: 200% 100%;
}
@keyframes shimmer { 0% { background-position: -150% 0 } 100% { background-position: 250% 0 } }

/* Transitions & scrollbar */
.fade-enter-active,.fade-leave-active { transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to { opacity: 0 }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
