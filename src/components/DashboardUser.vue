<template>
  <section
    class="min-h-screen bg-white dark:bg-[#0b0f14] text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden"
  >
    <!-- Top App Bar -->
    <header
      class="sticky top-0 z-20 bg-white/90 dark:bg-[#0b0f14]/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md border-b border-slate-900/5 dark:border-white/10"
      :style="{ paddingTop: 'env(safe-area-inset-top)' }"
    >
      <div class="px-4 py-3 flex items-center justify-between">
        <button class="flex items-center gap-3" @click="emit('profile')">
          <div class="h-9 w-9 rounded-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 bg-slate-200 dark:bg-white/10">
            <img v-if="avatar" :src="avatar" class="w-full h-full object-cover" alt="avatar" />
            <i v-else class="i-tabler-user text-lg grid place-items-center h-full w-full opacity-70"></i>
          </div>
          <div class="text-left">
            <p class="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ $t('welcome') || 'Welcome' }}</p>
            <h1 class="text-base font-bold leading-none">{{ greeting }}, {{ userName }}</h1>
          </div>
        </button>

        <div class="flex items-center gap-2">
          <span
            class="px-2 py-1 text-[11px] rounded-full border"
            :class="online ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-amber-200 text-amber-700 bg-amber-50'"
          >
            <i :class="online ? 'i-tabler-wifi' : 'i-tabler-wifi-off'"></i>
            {{ online ? ($t('online') || 'Online') : ($t('offline') || 'Offline') }}
          </span>

          <button class="relative p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5" @click="emit('notifications')">
            <i class="i-tabler-bell text-xl"></i>
            <span v-if="hasUnread" class="absolute top-1 right-1 h-2 w-2 bg-rose-500 rounded-full"></span>
          </button>

          <button class="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5" @click="toggleTheme" :aria-label="$t('toggle_theme') || 'Toggle theme'">
            <i :class="isDark ? 'i-tabler-moon-stars' : 'i-tabler-sun-high'" class="text-xl"></i>
          </button>
        </div>
      </div>
    </header>

    <!-- Pull to refresh indicator -->
    <div class="sticky top-[calc(env(safe-area-inset-top)+0px)] z-10 pointer-events-none">
      <div
        class="mx-auto w-10 h-10 grid place-items-center rounded-full"
        :class="refreshing ? 'bg-amber-100 dark:bg-amber-900/30' : 'opacity-0'"
      >
        <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>
    </div>

    <!-- Content -->
    <main
      ref="scrollEl"
      class="flex-1 overflow-y-auto overscroll-y-contain px-4 pt-3 pb-24"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <!-- KPIs -->
      <section aria-label="Key metrics">
        <div class="grid grid-cols-2 gap-3">
          <StatCardMini
            icon="i-tabler-wallet"
            :value="balance"
            format="currency"
            currency="TZS"
            tone="emerald"
            :sparkline="[80,90,85,100,120,140,155]"
            :loading="loading"
            :animate="true"
            :title="$t('balance') || 'Balance'"
          />
          <StatCardMini
            icon="i-tabler-shopping-bag"
            :value="orders"
            format="number"
            tone="indigo"
            :sparkline="[12,14,10,16,19,17,22]"
            :loading="loading"
            :animate="true"
            :title="$t('orders') || 'Orders'"
          />
          <StatCardMini
            icon="i-tabler-users-group"
            :value="visitors"
            format="number"
            tone="sky"
            :sparkline="[50,62,58,65,70,74,80]"
            :loading="loading"
            :animate="true"
            :title="$t('visitors') || 'Visitors'"
          />
          <StatCardMini
            icon="i-tabler-chart-pie"
            :value="convRate"
            format="percent"
            tone="amber"
            :sparkline="[0.06,0.055,0.061,0.07,0.072,0.068,0.075]"
            :loading="loading"
            :animate="true"
            :title="$t('conversion') || 'Conversion'"
          />
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="mt-5" aria-label="Quick actions">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-semibold opacity-80">{{ $t('quick_actions') || 'Quick Actions' }}</h3>
          <button class="text-xs opacity-70 hover:opacity-100" @click="emit('customize-actions')">
            <i class="i-tabler-adjustments-horizontal"></i> {{ $t('customize') || 'Customize' }}
          </button>
        </div>
        <div class="grid grid-cols-4 gap-2">
          <ActionChip icon="i-tabler-plus"        :label="$t('new_order') || 'New'"        @press="emit('new-order')" />
          <ActionChip icon="i-tabler-qrcode-scan" :label="$t('scan') || 'Scan'"            @press="emit('scan')" />
          <ActionChip icon="i-tabler-send"        :label="$t('pay_send') || 'Pay/Send'"    @press="emit('pay')" />
          <ActionChip icon="i-tabler-share-3"     :label="$t('share') || 'Share'"          @press="emit('share')" />
        </div>
      </section>

      <!-- Activity -->
      <section class="mt-6" aria-label="Recent activity">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-semibold opacity-80">{{ $t('recent_activity') || 'Recent Activity' }}</h3>
          <button class="text-xs opacity-70 hover:opacity-100" @click="refresh">{{ $t('refresh') || 'Refresh' }}</button>
        </div>

        <ul v-if="!loading" class="divide-y divide-slate-200/80 dark:divide-white/10 rounded-xl border border-slate-200/80 dark:border-white/10 overflow-hidden">
          <li v-for="item in activity" :key="item.id" class="p-3 flex items-center justify-between bg-white dark:bg-white/5">
            <div class="flex items-center gap-3">
              <div class="h-9 w-9 rounded-xl grid place-items-center bg-slate-100 dark:bg-white/10">
                <i :class="item.icon" class="text-lg"></i>
              </div>
              <div>
                <p class="text-[13px] font-semibold leading-tight">{{ item.title }}</p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">{{ item.subtitle }}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-[13px] font-bold tabular-nums">{{ item.amount }}</p>
              <p class="text-[11px] opacity-70">{{ item.time }}</p>
            </div>
          </li>
        </ul>

        <!-- Skeleton list -->
        <div v-else class="space-y-2">
          <div v-for="i in 4" :key="i" class="p-3 rounded-xl bg-slate-100 dark:bg-white/10 animate-pulse h-14"></div>
        </div>
      </section>
    </main>

    <!-- Bottom Nav -->
    <nav
      class="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#0b0f14]/85 backdrop-blur border-t border-slate-900/5 dark:border-white/10"
      :style="{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }"
      aria-label="Primary"
    >
      <div class="mx-auto max-w-md px-6">
        <ul class="grid grid-cols-3">
          <NavBtn icon="i-tabler-layout-grid"  :label="$t('overview') || 'Overview'" :active="tab==='overview'" @press="tab='overview'; emit('navigate','overview')" />
          <NavBtn icon="i-tabler-activity"     :label="$t('activity') || 'Activity'" :active="tab==='activity'" @press="tab='activity'; emit('navigate','activity')" />
          <NavBtn icon="i-tabler-wallet"       :label="$t('wallet') || 'Wallet'"     :active="tab==='wallet'"   @press="tab='wallet'; emit('navigate','wallet')" />
        </ul>
      </div>
    </nav>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/* Emits */
const emit = defineEmits(['refresh','navigate','notifications','profile','new-order','scan','pay','share','customize-actions'])

/* Theme */
const isDark = ref(document.documentElement.classList.contains('dark'))
function toggleTheme(){
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}

/* Online */
const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const onOnline = () => online.value = true
const onOffline = () => online.value = false

/* User */
const userName = ref(localStorage.getItem('user_name') || 'User')
const avatar = ref(localStorage.getItem('business_logo') || '')

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Habari za asubuhi'
  if (h < 17) return 'Habari za mchana'
  return 'Habari za jioni'
})

/* KPIs (demo values; plug real data) */
const loading = ref(true)
const balance = ref(1254300.0)   // TZS
const orders  = ref(22)
const visitors= ref(780)
const convRate= ref(0.075)
const hasUnread = ref(true)

/* Activity (demo) */
const activity = ref([
  { id: 1, icon: 'i-tabler-receipt-2', title: 'New order', subtitle: '#SB-1029', amount: '+ TZS 45,000', time: '2m ago' },
  { id: 2, icon: 'i-tabler-user-plus', title: 'New subscriber', subtitle: 'john@doe.com', amount: '—', time: '10m ago' },
  { id: 3, icon: 'i-tabler-wallet', title: 'Payout processed', subtitle: 'NMB Bank', amount: '− TZS 120,000', time: 'Today 14:10' },
  { id: 4, icon: 'i-tabler-message', title: 'New message', subtitle: 'Re: invoice', amount: '—', time: 'Yesterday' },
])

/* Fake load */
setTimeout(() => (loading.value = false), 900)

/* Pull-to-refresh */
const scrollEl = ref(null)
const startY = ref(0)
const pulling = ref(false)
const refreshing = ref(false)
function onTouchStart(e){
  if (!scrollEl.value) return
  if (scrollEl.value.scrollTop <= 0) {
    startY.value = e.touches[0].clientY
    pulling.value = true
  }
}
function onTouchMove(e){
  if (!pulling.value || refreshing.value) return
  const dy = e.touches[0].clientY - startY.value
  if (dy > 80) refresh()
}
function onTouchEnd(){ pulling.value = false }

async function refresh(){
  if (refreshing.value) return
  refreshing.value = true
  emit('refresh')
  // simulate
  await new Promise(r => setTimeout(r, 800))
  if (navigator.vibrate) navigator.vibrate(10)
  refreshing.value = false
}

/* Tabs */
const tab = ref('overview')

/* Lifecycle */
onMounted(() => {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})

/* --------- Inline micro components (stat/action/nav) --------- */
const StatCardMini = defineAsyncComponent({
  loader: async () => ({
    // minimal inline component object
    name: 'StatCardMini',
    props: {
      icon: String, title: String, value: [Number,String],
      format: { type: String, default: 'auto' },
      currency: { type: String, default: 'TZS' },
      tone: { type: String, default: 'indigo' },
      sparkline: { type: Array, default: () => [] },
      loading: Boolean, animate: { type: Boolean, default: true }
    },
    setup(props){
      const root = ref(null)
      const visible = ref(false)
      const current = ref(Number(props.value) || 0)
      let io, raf, t0
      const tones = {
        indigo:'#6366f1', emerald:'#10b981', sky:'#0ea5e9', amber:'#f59e0b', rose:'#f43f5e', violet:'#8b5cf6'
      }
      const toneHex = computed(()=> tones[props.tone] || tones.indigo)
      const formatter = computed(() => {
        const opt = { maximumFractionDigits: props.format==='currency'?0:2 }
        if (props.format==='currency') return new Intl.NumberFormat(undefined, { style:'currency', currency: props.currency, ...opt })
        if (props.format==='percent') return new Intl.NumberFormat(undefined, { style:'percent', maximumFractionDigits: 2 })
        return new Intl.NumberFormat(undefined, opt)
      })
      const display = computed(()=>{
        if (props.format==='percent') return formatter.value.format(Number(props.value||0))
        return formatter.value.format(Number(props.value||0))
      })
      // sparkline
      const W=100,H=28,P=2
      const linePath = computed(()=>{
        const a = props.sparkline||[]
        if (!a.length) return ''
        const lo=Math.min(...a), hi=Math.max(...a)
        const sx=(i,n)=> n<=1?P : P + (i*(W-P*2))/(n-1)
        const sy=v => hi===lo ? H/2 : H - (P + ((v-lo)/(hi-lo))*(H-P*2))
        return a.map((v,i)=>`${i?'L':'M'} ${sx(i,a.length)} ${sy(v)}`).join(' ')
      })
      const areaPath = computed(()=> linePath.value ? `${linePath.value} L ${W-P} ${H-P} L ${P} ${H-P} Z` : '')

      function ease(t){ return 1 - Math.pow(1-t,3) }
      function startAnim(){
        cancelAnimationFrame(raf)
        if (!props.animate) { current.value = Number(props.value)||0; return }
        const from=0, to=Number(props.value)||0; t0=performance.now()
        const step = (ts)=>{ const k=Math.min(1,(ts-t0)/800); current.value = from + (to-from)*ease(k); if(k<1) raf=requestAnimationFrame(step) }
        raf=requestAnimationFrame(step)
      }
      onMounted(()=>{
        io = new IntersectionObserver(([e])=>{
          if(e.isIntersecting && !visible.value){ visible.value=true; startAnim() }
        },{ threshold:0.3 })
        io.observe(root.value)
      })
      onBeforeUnmount(()=>{ io?.disconnect(); cancelAnimationFrame(raf) })

      return { root, display, toneHex, W,H,areaPath,linePath }
    },
    template: `
    <div ref="root" class="rounded-2xl p-3 bg-white/90 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/10 shadow-sm">
      <div v-if="$props.loading" class="animate-pulse">
        <div class="h-5 w-5 rounded-lg bg-slate-200 dark:bg-white/10 mb-2"></div>
        <div class="h-3 w-1/2 rounded bg-slate-200 dark:bg-white/10 mb-1"></div>
        <div class="h-6 w-2/3 rounded bg-slate-200 dark:bg-white/10"></div>
      </div>
      <div v-else>
        <div class="flex items-center justify-between">
          <i :class="$props.icon" class="text-lg" :style="{ color: toneHex }"></i>
          <svg v-if="$props.sparkline && $props.sparkline.length>1" :viewBox="\`0 0 \${W} \${H}\`" class="h-10 w-20">
            <defs><linearGradient id="g1" x1="0" y1="0" :x2="W" y2="0"><stop offset="0%" :stop-color="toneHex"/><stop offset="100%" :stop-color="toneHex" stop-opacity=".35"/></linearGradient></defs>
            <path :d="areaPath" fill="url(#g1)" opacity=".15"/><path :d="linePath" :stroke="toneHex" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <p class="text-[11px] mt-1 opacity-75">{{ $props.title }}</p>
        <p class="text-xl font-extrabold tabular-nums tracking-tight">{{ display }}</p>
      </div>
    </div>`
  })
})

const ActionChip = {
  name:'ActionChip',
  emits:['press'],
  props:{ icon:String, label:String },
  template:`
    <button class="group rounded-2xl p-3 bg-white/90 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/10 shadow-sm grid place-items-center gap-1 hover:scale-[1.01] active:scale-[.99] transition"
      @click="$emit('press')">
      <i :class="icon" class="text-xl"></i>
      <span class="text-[11px] font-medium opacity-80">{{ label }}</span>
    </button>
  `
}

const NavBtn = {
  name:'NavBtn', emits:['press'],
  props:{ icon:String, label:String, active:Boolean },
  template:`
    <li>
      <button class="w-full py-2.5 grid place-items-center gap-1"
        :class="active ? 'text-amber-600 dark:text-amber-400' : 'opacity-75'"
        @click="$emit('press')">
        <i :class="icon" class="text-xl"></i>
        <span class="text-[11px]">{{ label }}</span>
      </button>
    </li>
  `
}
</script>

<style scoped>
/* smooth page intro */
:host, section { animation: fadeSlide .5s ease both; }
@keyframes fadeSlide { 0%{opacity:0; transform:translateY(24px)} 100%{opacity:1; transform:translateY(0)} }

/* iconify/tabler fallback */
i[class^="i-"], i[class*=" i-"] { display: inline-block; }

/* keep numbers steady on mobile */
.tabular-nums { font-variant-numeric: tabular-nums; }
</style>
