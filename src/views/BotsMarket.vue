<!-- src/views/AIBotsMarketplaceMobile.vue -->
<template>
  <div class="app">
    <!-- Sticky App Bar -->
    <header class="appbar">
      <div class="ttl">
        <h1>AI Bots Marketplace</h1>
        <p>Choose a package, then confirm below</p>
      </div>

      <div class="cycle">
        <button
          :class="['cy', billingCycle==='monthly' && 'on']"
          @click="billingCycle='monthly'"
        >Monthly</button>
        <button
          :class="['cy', billingCycle==='yearly' && 'on']"
          @click="billingCycle='yearly'"
        >
          Yearly <span class="save">Save 2 months</span>
        </button>
      </div>
    </header>

    <!-- Tools -->
    <section class="pad">
      <div class="tools">
        <div class="searchbox">
          <svg viewBox="0 0 24 24" class="s-ic"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
          <input v-model.trim="query" class="search" type="search" placeholder="Search packages..." />
          <button v-if="query" class="clear" @click="query=''" aria-label="Clear">✕</button>
        </div>

        <div class="chips no-scrollbar">
          <button
            v-for="t in tiers"
            :key="t.value"
            :class="['chip', activeTier===t.value ? 'active' : '']"
            @click="activeTier = t.value"
          >
            {{ t.label }}
          </button>
        </div>
      </div>
    </section>

    <!-- Grid -->
    <section class="pad">
      <div class="grid">
        <!-- Skeletons -->
        <template v-if="loading">
          <div v-for="i in 6" :key="'sk-'+i" class="card sk"></div>
        </template>

        <!-- Cards -->
        <template v-else>
          <div
            v-for="pkg in visiblePackages"
            :key="pkg.id"
            class="card"
            :class="{ active: selectedId === pkg.id }"
            @click="selectedId = pkg.id"
          >
            <div class="card-top">
              <div class="avatar">{{ initials(pkg.name) }}</div>
              <div class="meta">
                <h2 class="name">{{ pkg.name }}</h2>
                <p class="desc">{{ pkg.description }}</p>
              </div>
              <button
                class="pick"
                :aria-label="selectedId===pkg.id ? 'Selected' : 'Select'"
              >
                <span v-if="selectedId===pkg.id">✓</span>
                <span v-else>+</span>
              </button>
            </div>

            <div class="price">
              <span class="amt">{{ money(priceOf(pkg)) }}</span>
              <span class="cycle-tag">/ {{ billingCycle }}</span>
            </div>

            <ul class="features">
              <li v-for="f in pkg.features" :key="f">• {{ f }}</li>
            </ul>

            <div class="actions">
              <button class="btn ghost" @click.stop="openCompare(pkg)">Compare</button>
              <button class="btn primary" @click.stop="selectedId = pkg.id">Choose</button>
            </div>
          </div>

          <div v-if="!visiblePackages.length" class="empty">
            No packages match your search.
          </div>
        </template>
      </div>
    </section>

    <!-- Sticky Checkout Bar -->
    <footer class="checkout">
      <div class="bar" v-if="selectedPackage">
        <div class="sel">
          <span class="label">Selected</span>
          <strong class="pkg">{{ selectedPackage.name }}</strong>
        </div>

        <div class="total">
          <span class="muted">Total</span>
          <strong class="amt">{{ money(priceOf(selectedPackage)) }}</strong>
          <span class="muted">/ {{ billingCycle }}</span>
        </div>

        <button class="cta" @click="proceed">Continue</button>
      </div>

      <!-- Toasts -->
      <transition name="toast"><div v-if="msg" class="toast ok">{{ msg }}</div></transition>
      <transition name="toast"><div v-if="err" class="toast bad">{{ err }}</div></transition>
    </footer>

    <!-- Bottom Sheet: Compare -->
    <transition name="sheet">
      <div v-if="compareOpen" class="sheet-wrap" @click.self="closeCompare">
        <div class="sheet">
          <div class="s-head">
            <h3>Compare Package</h3>
            <button class="x" @click="closeCompare" aria-label="Close">✕</button>
          </div>

          <div class="s-body">
            <div class="compare-card">
              <h4 class="cmp-name">{{ comparePkg?.name }}</h4>
              <p class="cmp-desc">{{ comparePkg?.description }}</p>

              <div class="cmp-price">
                <div class="pp">
                  <span class="muted">Monthly</span>
                  <strong>{{ money(comparePkg?.price_monthly || 0) }}</strong>
                </div>
                <div class="pp">
                  <span class="muted">Yearly</span>
                  <strong>{{ money(comparePkg?.price_yearly || 0) }}</strong>
                </div>
              </div>

              <ul class="cmp-feats">
                <li v-for="f in comparePkg?.features || []" :key="f">• {{ f }}</li>
              </ul>
            </div>
          </div>

          <div class="s-actions">
            <button class="btn ghost" @click="closeCompare">Close</button>
            <button class="btn primary" @click="selectFromCompare">Choose</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
/**
 * Mobile-first AI Bots Marketplace
 * - English-only labels & comments
 * - Monthly/Yearly billing cycle toggle with savings hint
 * - Search + tier chips, selectable cards, sticky checkout bar
 * - Bottom sheet compare view
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

/** Data (translated to English) */
const botPackages = ref([
  {
    id: 1,
    name: 'BasicBot',
    description: 'Essential bot for personal or light usage.',
    price_monthly: 10000,
    price_yearly: 100000,
    features: [
      'Support 1 social platform',
      'Up to 300 messages / month',
      'Basic AI responses',
      'Silent mode'
    ]
  },
  {
    id: 2,
    name: 'ProBot',
    description: 'Great for small businesses needing automation.',
    price_monthly: 25000,
    price_yearly: 250000,
    features: [
      'Support 3 social platforms',
      'Up to 1,000 messages / month',
      'Smart replies + memory',
      'Basic integrations'
    ]
  },
  {
    id: 3,
    name: 'EliteBot',
    description: 'Powerful bot for professional teams.',
    price_monthly: 50000,
    price_yearly: 500000,
    features: [
      'Support unlimited platforms',
      'Unlimited messages',
      'Advanced AI memory',
      'Analytics + full integrations'
    ]
  },
  {
    id: 4,
    name: 'CustomBot',
    description: 'Tailor-made bot for special requirements.',
    price_monthly: 75000,
    price_yearly: 750000,
    features: [
      'Custom AI training',
      'Team collaboration',
      'Dedicated support',
      'Offline + API usage'
    ]
  }
])

/** UI state */
const loading = ref(true)
const query = ref('')
const tiers = [
  { value: 'all', label: 'All' },
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Pro' },
  { value: 'elite', label: 'Elite/Custom' },
]
const activeTier = ref('all')
const billingCycle = ref('monthly') // 'monthly' | 'yearly'
const selectedId = ref(null)

const msg = ref('')
const err = ref('')

/** Compare sheet */
const compareOpen = ref(false)
const comparePkg = ref(null)

/** Derived */
const filtered = computed(() => {
  const q = query.value.toLowerCase()
  return botPackages.value.filter(p => {
    const tierOk =
      activeTier.value === 'all' ? true :
      activeTier.value === 'basic' ? p.name.toLowerCase().includes('basic') :
      activeTier.value === 'pro' ? p.name.toLowerCase().includes('pro') :
      ['elitebot', 'custombot'].includes(p.name.toLowerCase())
    const qOk = !q || `${p.name} ${p.description}`.toLowerCase().includes(q)
    return tierOk && qOk
  })
})
const visiblePackages = computed(() => filtered.value)

const selectedPackage = computed(() =>
  botPackages.value.find(p => p.id === selectedId.value) || null
)

/** Helpers */
function money(n){ return Number(n||0).toLocaleString('en-KE', { style:'currency', currency:'TZS', maximumFractionDigits:0 }) }
function initials(t=''){ return t.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || 'B' }
function priceOf(pkg){
  return billingCycle.value === 'monthly' ? pkg.price_monthly : pkg.price_yearly
}

/** Compare */
function openCompare(pkg){ comparePkg.value = pkg; compareOpen.value = true }
function closeCompare(){ compareOpen.value = false; comparePkg.value = null }
function selectFromCompare(){ if (comparePkg.value) selectedId.value = comparePkg.value.id; closeCompare() }

/** Proceed */
function proceed(){
  if (!selectedPackage.value) { err.value='Please choose a package first.'; setTimeout(()=>err.value='',1800); return }
  msg.value = `Selected ${selectedPackage.value.name} (${billingCycle.value}).`
  setTimeout(()=>{ msg.value=''; router.push({ path:'/bots/create', query:{ package: selectedPackage.value.name } }) }, 900)
}

/** Load (fake delay) */
onMounted(()=> setTimeout(()=> loading.value=false, 450))
</script>

<style scoped>
/* ===== App background (digital gradient) ===== */
.app{
  min-height:100vh;
  background:
    radial-gradient(900px 480px at 90% -10%, #2e2a8a 0%, rgba(46,42,138,0) 60%),
    radial-gradient(800px 420px at -10% 0%, #6b21a8 0%, rgba(107,33,168,0) 55%),
    linear-gradient(180deg,#0a0f22 0%, #0b1633 100%);
  color:#fff; display:flex; flex-direction:column;
}

/* ===== App Bar ===== */
.appbar{
  position:sticky; top:0; z-index:20;
  display:grid; grid-template-columns: 1fr auto; align-items:center; gap:.75rem;
  padding:1rem .95rem .75rem;
  background:linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,0));
  backdrop-filter: blur(12px);
}
.ttl h1{ margin:0; font-size:1.05rem; font-weight:900; letter-spacing:.2px }
.ttl p{ margin:.15rem 0 0; font-size:.72rem; color:rgba(255,255,255,.72) }
.cycle{ display:inline-flex; gap:.35rem; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:999px; padding:.25rem }
.cy{
  border:none; border-radius:999px; padding:.4rem .7rem; font-weight:900; color:#fff; background:transparent
}
.cy.on{
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee); color:#000; box-shadow:0 6px 18px rgba(99,102,241,.35)
}
.save{
  margin-left:.35rem; font-size:.7rem; background:rgba(34,211,238,.2); color:#05131c; padding:.1rem .35rem; border-radius:.5rem
}

/* ===== Sections ===== */
.pad{ padding: .75rem .95rem 0 }

/* ===== Tools ===== */
.tools{ display:grid; gap:.7rem }
.searchbox{
  position:relative; display:flex; align-items:center; gap:.5rem;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
  border-radius:1rem; padding:.55rem .75rem;
}
.s-ic{ width:18px; height:18px; opacity:.85 }
.search{ flex:1; background:transparent; border:none; color:#fff; font-size:.95rem }
.search:focus{ outline:none }
.clear{
  height:28px; width:28px; border-radius:8px; background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.14); color:#fff;
}
.chips{ display:flex; gap:.5rem; overflow-x:auto; padding-bottom:.2rem }
.chips::-webkit-scrollbar{ display:none }
.chip{
  padding:.5rem .85rem; border-radius:999px; white-space:nowrap; font-weight:800; font-size:.86rem;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); color:#fff;
  transition: all .2s ease;
}
.chip.active{
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee);
  border-color:transparent; color:#000; box-shadow:0 6px 18px rgba(99,102,241,.35);
}

/* ===== Grid ===== */
.grid{ display:grid; gap:.8rem; grid-template-columns:repeat(1, minmax(0,1fr)) }
@media (min-width:640px){ .grid{ grid-template-columns:repeat(2, minmax(0,1fr)) } }
@media (min-width:1024px){ .grid{ grid-template-columns:repeat(4, minmax(0,1fr)) } }

/* ===== Card ===== */
.card{
  border-radius:1.25rem; padding:1rem;
  background:linear-gradient(135deg, rgba(255,255,255,.07), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.14); backdrop-filter: blur(16px);
  box-shadow: 0 12px 40px rgba(0,0,0,.45);
  transition:transform .12s ease, box-shadow .2s ease, border-color .2s ease;
}
.card.active{
  border-color: rgba(99,102,241,.55);
  box-shadow: 0 14px 46px rgba(99,102,241,.35);
}
.card-top{ display:grid; grid-template-columns:auto 1fr auto; gap:.75rem; align-items:center }
.avatar{
  height:48px; width:48px; border-radius:14px; display:grid; place-items:center; font-weight:900; color:#000;
  background:linear-gradient(135deg,#fbbf24,#f59e0b); box-shadow: inset 0 -6px 14px rgba(0,0,0,.25), 0 8px 24px rgba(245,158,11,.35);
}
.meta .name{ margin:0; font-size:1.02rem; font-weight:900 }
.desc{ margin:.1rem 0 0; font-size:.86rem; color:rgba(255,255,255,.8) }
.pick{
  height:40px; width:40px; border-radius:12px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.16); color:#fff
}

.price{ display:flex; align-items:baseline; gap:.35rem; margin:.55rem 0 .35rem }
.amt{ font-size:1.1rem; font-weight:900 }
.cycle-tag{ font-size:.85rem; color:rgba(255,255,255,.8) }

.features{
  list-style:none; padding:0; margin:0 0 .7rem 0; display:grid; gap:.25rem; font-size:.9rem; color:rgba(255,255,255,.9)
}

.actions{ display:flex; gap:.5rem }
.btn{
  flex:1; border-radius:.9rem; padding:.6rem .75rem; font-weight:900; border:1px solid transparent; color:#fff; text-align:center
}
.btn.ghost{ background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.16) }
.btn.primary{ background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee); color:#000; box-shadow:0 6px 18px rgba(99,102,241,.35) }

/* Skeleton */
.sk{
  height:220px; border-radius:1.25rem;
  background:linear-gradient(90deg, rgba(255,255,255,.06), rgba(255,255,255,.12), rgba(255,255,255,.06));
  border:1px solid rgba(255,255,255,.12);
  animation: shine 1.1s linear infinite;
}
@keyframes shine{ 0%{ background-position:-200px 0 } 100%{ background-position:200px 0 } }

/* Empty */
.empty{
  grid-column:1/-1; text-align:center; color:rgba(255,255,255,.75);
  padding:1rem; border-radius:1rem; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12)
}

/* ===== Checkout Bar ===== */
.checkout{
  position:sticky; bottom:0; z-index:30; margin-top:auto;
  padding:.75rem .95rem 1rem;
  background:linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.55) 40%, rgba(0,0,0,.85) 100%);
  backdrop-filter: blur(12px);
}
.bar{
  display:flex; align-items:center; gap:.8rem;
  border-radius:1rem; padding:.7rem .75rem;
  background:linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
  border:1px solid rgba(255,255,255,.14);
}
.sel{ display:flex; flex-direction:column }
.label{ font-size:.78rem; color:rgba(255,255,255,.8) }
.pkg{ font-weight:900 }
.total{ margin-left:auto; display:flex; align-items:baseline; gap:.35rem }
.muted{ color:rgba(255,255,255,.8); font-size:.85rem }
.cta{
  margin-left:.5rem; min-width:140px; border:none; border-radius:999px; padding:.9rem 1rem; font-weight:900;
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee); color:#000;
  box-shadow:0 8px 24px rgba(99,102,241,.35);
}

/* ===== Sheet ===== */
.sheet-wrap{ position:fixed; inset:0; z-index:40; display:grid; align-items:end; background:rgba(0,0,0,.45); backdrop-filter: blur(4px) }
.sheet{
  border-top-left-radius:1.25rem; border-top-right-radius:1.25rem;
  background:linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
  border:1px solid rgba(255,255,255,.12); padding:.9rem .95rem 1rem;
}
.s-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:.6rem }
.s-head h3{ margin:0; font-size:1rem; font-weight:900 }
.x{ height:34px; width:34px; border-radius:10px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.16); color:#fff }
.cmp-name{ margin:0; font-weight:900 }
.cmp-desc{ margin:.2rem 0 .5rem; color:rgba(255,255,255,.86) }
.cmp-price{ display:flex; gap:.6rem; margin:.25rem 0 .5rem }
.pp{ flex:1; padding:.6rem; border-radius:.8rem; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); text-align:center }
.cmp-feats{ list-style:none; padding:0; margin:0; display:grid; gap:.25rem }
.s-actions{ display:flex; gap:.6rem; margin-top:.7rem }
.loader{ display:inline-block }

/* Transitions */
.sheet-enter-active,.sheet-leave-active{ transition: all .25s ease }
.sheet-enter-from,.sheet-leave-to{ opacity:0 }
.sheet-enter-from .sheet,.sheet-leave-to .sheet{ transform: translateY(30px) }

/* Toasts */
.toast{
  margin-top:.6rem; border-radius:1rem; padding:.75rem .9rem; font-size:.9rem; border:1px solid; text-align:center;
}
.toast.ok{ background:rgba(16,185,129,.14); border-color:rgba(16,185,129,.35); color:#b8f3d8 }
.toast.bad{ background:rgba(244,63,94,.14); border-color:rgba(244,63,94,.35); color:#ffc9d2 }
.toast-enter-active,.toast-leave-active{ transition: all .25s ease }
.toast-enter-from,.toast-leave-to{ opacity:0; transform: translateY(6px) }

/* Utils */
.no-scrollbar::-webkit-scrollbar{ display:none }
.no-scrollbar{ -ms-overflow-style:none; scrollbar-width:none }
</style>
