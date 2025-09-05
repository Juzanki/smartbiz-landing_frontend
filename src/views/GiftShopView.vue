<!-- src/views/GiftShopMobile.vue -->
<template>
  <div class="app">
    <!-- Sticky App Bar -->
    <header class="appbar">
      <RouterLink to="/live-stream" class="iconbtn" aria-label="Back to Live">
        <svg viewBox="0 0 24 24" class="ic"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </RouterLink>
      <div class="ttl">
        <h1>SmartBiz Gift Shop</h1>
        <p>Discover, select and send gifts in your live</p>
      </div>

      <button class="pill" @click="goWallet" aria-label="Open Wallet">
        <span class="coin">🪙</span>
        <span class="amt">{{ formatCoins(balance) }}</span>
      </button>
    </header>

    <!-- Filters -->
    <section class="pad">
      <div class="tools">
        <div class="searchbox">
          <svg viewBox="0 0 24 24" class="s-ic"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
          <input
            v-model.trim="query"
            type="search"
            class="search"
            placeholder="Search gifts..."
          />
          <button v-if="query" class="clear" @click="query = ''" aria-label="Clear">✕</button>
        </div>

        <div class="chips no-scrollbar">
          <button
            v-for="t in coinTypesAll"
            :key="t"
            :class="['chip', activeType === t ? 'active' : '']"
            @click="activeType = t"
          >
            {{ t }}
          </button>
        </div>

        <div class="sort">
          <label class="sort-lbl">Sort</label>
          <div class="sort-tabs">
            <button :class="['sort-tab', sortBy==='trending'&&'active']" @click="sortBy='trending'">Trending</button>
            <button :class="['sort-tab', sortBy==='price_asc'&&'active']" @click="sortBy='price_asc'">Price ↑</button>
            <button :class="['sort-tab', sortBy==='price_desc'&&'active']" @click="sortBy='price_desc'">Price ↓</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Grid -->
    <section class="pad">
      <div class="grid">
        <!-- Skeletons -->
        <template v-if="loading">
          <div v-for="i in 8" :key="'sk-'+i" class="card sk"></div>
        </template>

        <!-- Cards -->
        <template v-else>
          <div
            v-for="g in visibleGifts"
            :key="g.id"
            class="card"
          >
            <button class="fav" :class="{on: favorites.has(g.id)}" @click="toggleFav(g.id)" aria-label="Toggle favorite">★</button>

            <div class="cover">
              <div class="ring"></div>
              <img :src="g.image" :alt="g.name" class="img" loading="lazy" />
            </div>

            <h2 class="name" :title="g.name">{{ g.name }}</h2>

            <div class="meta">
              <span class="tier" :class="g.tier">{{ g.tier }}</span>
              <span class="price">
                <span class="coin">🪙</span>
                {{ formatCoins(g.coins) }} <span class="ctype">{{ g.coinType }}</span>
              </span>
            </div>

            <button class="send" @click="openSheet(g)">Send Gift</button>
          </div>

          <div v-if="!visibleGifts.length" class="empty">
            No gifts match your search. Try another keyword or type.
          </div>
        </template>
      </div>

      <!-- Load More (simple pager) -->
      <div v-if="!loading && canLoadMore" class="loadmore">
        <button class="loadbtn" @click="limit += 24">Load more</button>
      </div>
    </section>

    <!-- Bottom Sheet: Confirm -->
    <transition name="sheet">
      <div v-if="sheetOpen" class="sheet-wrap" @click.self="closeSheet">
        <div class="sheet">
          <div class="s-head">
            <h3>Confirm Gift</h3>
            <button class="x" @click="closeSheet" aria-label="Close">✕</button>
          </div>

          <div class="s-body" v-if="selected">
            <div class="s-row">
              <div class="s-cover">
                <img :src="selected.image" :alt="selected.name" />
              </div>
              <div class="s-info">
                <p class="s-name">{{ selected.name }}</p>
                <p class="s-tier">
                  <span class="tier" :class="selected.tier">{{ selected.tier }}</span>
                </p>
                <p class="s-price">
                  <span class="coin">🪙</span>
                  {{ formatCoins(selected.coins) }} {{ selected.coinType }}
                </p>
              </div>
            </div>

            <div class="qty">
              <span>Quantity</span>
              <div class="stepper">
                <button @click="qty = Math.max(1, qty-1)" aria-label="Decrease">−</button>
                <span class="qv">{{ qty }}</span>
                <button @click="qty = Math.min(99, qty+1)" aria-label="Increase">+</button>
              </div>
            </div>

            <div class="total">
              <span>Total</span>
              <strong><span class="coin">🪙</span> {{ formatCoins(totalCost) }} {{ selected.coinType }}</strong>
            </div>

            <p v-if="insufficient" class="warn">Insufficient balance. Please recharge your wallet.</p>
          </div>

          <div class="s-actions">
            <button class="btn ghost" @click="closeSheet">Cancel</button>
            <button class="btn primary" :disabled="sending || insufficient" @click="sendNow">
              <span v-if="!sending">Send</span>
              <span v-else class="loader">Sending…</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Toasts -->
    <transition name="toast"><div v-if="msg" class="toast ok">{{ msg }}</div></transition>
    <transition name="toast"><div v-if="err" class="toast bad">{{ err }}</div></transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

const router = useRouter()

/** Demo wallet (SmartCoin) */
const balance = ref(150_000)

/** Filters */
const query = ref('')
const coinTypesAll = ['All', 'SmartCoin', 'JuzankiCoin', 'MegaGem', 'StreamPoint']
const activeType = ref('All')
const sortBy = ref('trending') // trending | price_asc | price_desc
const favorites = ref(new Set())

/** Data */
const gifts = ref([])
const loading = ref(true)
const limit = ref(24) // page size

/** Sheet state */
const sheetOpen = ref(false)
const selected = ref(null)
const qty = ref(1)
const sending = ref(false)
const msg = ref('')
const err = ref('')

/** Helpers */
function formatCoins(n) {
  const v = Number(n || 0)
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 })
}
function tierOf(coins) {
  if (coins >= 100000) return 'Mythic'
  if (coins >= 20000)  return 'Epic'
  if (coins >= 5000)   return 'Rare'
  return 'Common'
}

/** Seed demo data */
onMounted(() => {
  const coinTypes = ['SmartCoin', 'JuzankiCoin', 'MegaGem', 'StreamPoint']
  const temp = []
  for (let i = 1; i <= 100; i++) {
    const ctype = coinTypes[i % coinTypes.length]
    const coins = (Math.floor(Math.random() * 120) + 10) * i
    temp.push({
      id: i,
      name: `${ctype} Gift #${i}`,
      coins,
      coinType: ctype,
      tier: tierOf(coins),
      trending: Math.random(), // for demo sorting
      image: `/assets/gifts/gift${(i % 12) + 1}.png`
    })
  }
  // simulate fetch delay
  setTimeout(() => { gifts.value = temp; loading.value = false }, 600)
})

/** Filter + sort + limit */
const filtered = computed(() => {
  const q = query.value.toLowerCase()
  return gifts.value.filter(g => {
    const typeMatch = activeType.value === 'All' || g.coinType === activeType.value
    const qMatch = !q || `${g.name} ${g.coinType}`.toLowerCase().includes(q)
    return typeMatch && qMatch
  })
})

const sorted = computed(() => {
  const arr = [...filtered.value]
  if (sortBy.value === 'price_asc') arr.sort((a,b)=>a.coins-b.coins)
  else if (sortBy.value === 'price_desc') arr.sort((a,b)=>b.coins-a.coins)
  else arr.sort((a,b)=>b.trending - a.trending)
  return arr
})

const visibleGifts = computed(() => sorted.value.slice(0, limit.value))
const canLoadMore = computed(() => sorted.value.length > limit.value)

/** Favorites */
function toggleFav(id) {
  const s = new Set(favorites.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  favorites.value = s
}

/** Sheet actions */
function openSheet(g) {
  selected.value = g
  qty.value = 1
  sheetOpen.value = true
}
function closeSheet() {
  sheetOpen.value = false
  selected.value = null
}
const totalCost = computed(() => selected.value ? selected.value.coins * qty.value : 0)
const insufficient = computed(() => !!selected.value && selected.value.coinType === 'SmartCoin' && totalCost.value > balance.value)

async function sendNow() {
  if (!selected.value) return
  sending.value = true; err.value=''; msg.value=''
  try {
    // Simulate payment rules:
    if (selected.value.coinType === 'SmartCoin') {
      if (totalCost.value > balance.value) {
        err.value = 'Insufficient SmartCoin balance.'
        return
      }
      // Deduct for demo
      balance.value -= totalCost.value
    } else {
      // Other coin types would integrate their own wallet in real app
    }
    await new Promise(r => setTimeout(r, 800))
    msg.value = `Sent ${qty.value} × ${selected.value.name}!`
    closeSheet()
  } catch {
    err.value = 'Failed to send gift. Please try again.'
  } finally {
    sending.value = false
    setTimeout(()=>{ msg.value=''; err.value='' }, 2600)
  }
}

/** Nav */
function goWallet(){ router.push('/wallet') }
</script>

<style scoped>
/* ===== App background (digital gradient) ===== */
.app{
  min-height:100vh;
  background:
    radial-gradient(900px 480px at 90% -10%, #2e2a8a 0%, rgba(46,42,138,0) 60%),
    radial-gradient(800px 420px at -10% 0%, #6b21a8 0%, rgba(107,33,168,0) 55%),
    linear-gradient(180deg,#0a0f22 0%, #0b1633 100%);
  color:#fff;
  display:flex; flex-direction:column;
}

/* ===== App Bar ===== */
.appbar{
  position:sticky; top:0; z-index:30;
  display:flex; align-items:center; gap:.75rem;
  padding:1rem .95rem .75rem;
  background:linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,0));
  backdrop-filter: blur(12px);
}
.iconbtn{
  height:40px; width:40px; border-radius:999px; display:grid; place-items:center;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
}
.ic{ width:20px; height:20px; opacity:.9 }
.iconbtn:active{ transform:scale(.96) }
.ttl h1{ margin:0; font-size:1.05rem; font-weight:900; letter-spacing:.2px }
.ttl p{ margin:.15rem 0 0; font-size:.72rem; color:rgba(255,255,255,.7) }
.pill{
  margin-left:auto; display:inline-flex; align-items:center; gap:.45rem;
  border-radius:999px; padding:.45rem .7rem; font-weight:900; color:#000;
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee);
  box-shadow:0 6px 18px rgba(99,102,241,.35);
  border:1px solid rgba(255,255,255,.12);
}
.pill .coin{ filter: drop-shadow(0 2px 6px rgba(0,0,0,.3)) }
.pill .amt{ color:#05131c }

/* ===== Sections ===== */
.pad{ padding: .75rem .95rem 0 }

/* ===== Tools ===== */
.tools{ display:grid; gap:.7rem }
.searchbox{
  position:relative; display:flex; align-items:center; gap:.5rem;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
  border-radius:1rem; padding:.55rem .75rem;
}
.s-ic{ width:18px; height:18px; opacity:.8 }
.search{
  flex:1; background:transparent; border:none; color:#fff; font-size:.95rem;
}
.search:focus{ outline:none }
.clear{
  height:28px; width:28px; border-radius:8px; background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.14); color:#fff;
}
.chips{
  display:flex; gap:.5rem; overflow-x:auto; padding-bottom:.2rem;
}
.chips::-webkit-scrollbar{ display:none }
.chip{
  padding:.5rem .85rem; border-radius:999px; white-space:nowrap; font-weight:800; font-size:.86rem;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); color:#fff;
  transition:all .2s ease;
}
.chip.active{
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee);
  border-color:transparent; color:#000; box-shadow:0 6px 18px rgba(99,102,241,.35);
}
.sort{ display:grid; gap:.45rem }
.sort-lbl{ font-size:.78rem; color:rgba(255,255,255,.75) }
.sort-tabs{ display:flex; gap:.4rem; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); padding:.3rem; border-radius:1rem }
.sort-tab{
  flex:1; border-radius:.7rem; padding:.45rem .6rem; font-weight:800; text-align:center;
  background:transparent; border:1px solid transparent; color:#fff;
}
.sort-tab.active{
  background:linear-gradient(135deg, rgba(99,102,241,.25), rgba(34,211,238,.18));
  border-color:rgba(99,102,241,.45);
  box-shadow:0 8px 24px rgba(99,102,241,.25);
}

/* ===== Grid ===== */
.grid{
  display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:.75rem;
}
@media (min-width: 640px){
  .grid{ grid-template-columns:repeat(3, minmax(0,1fr)) }
}
@media (min-width: 768px){
  .grid{ grid-template-columns:repeat(4, minmax(0,1fr)) }
}
@media (min-width: 1024px){
  .grid{ grid-template-columns:repeat(6, minmax(0,1fr)) }
}

/* ===== Card ===== */
.card{
  position:relative; border-radius:1.1rem; padding:.85rem; text-align:center;
  background:linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(14px);
  box-shadow: 0 10px 36px rgba(0,0,0,.42);
  transition: transform .15s ease, box-shadow .2s ease;
}
.card:hover{ transform: translateY(-2px); box-shadow: 0 14px 42px rgba(0,0,0,.5) }
.fav{
  position:absolute; top:.5rem; right:.5rem; height:28px; width:28px; border-radius:8px;
  background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.18); color:#ffd700;
}
.fav.on{ background:rgba(255,215,0,.18); border-color:rgba(255,215,0,.45) }
.cover{ position:relative; height:90px; display:grid; place-items:center; margin:.25rem 0 .5rem }
.ring{
  position:absolute; inset:auto; height:76px; width:76px; border-radius:999px;
  background:radial-gradient(circle at 30% 30%, rgba(124,58,237,.35), rgba(34,211,238,.25));
  filter: blur(14px);
}
.img{
  height:76px; width:76px; border-radius:999px; object-fit:cover;
  border:1px solid rgba(255,255,255,.18);
  box-shadow: 0 6px 22px rgba(0,0,0,.35);
  animation: float 3s ease-in-out infinite;
}
@keyframes float{ 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-6px) } }

.name{
  margin:.15rem 0 .3rem; font-weight:900; font-size:.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.meta{
  display:flex; align-items:center; justify-content:space-between; gap:.4rem; margin-bottom:.6rem;
}
.tier{
  font-size:.7rem; padding:.18rem .45rem; border-radius:.6rem; border:1px solid;
}
.tier.Common{ color:#dbeafe; border-color:#60a5fa; background:rgba(96,165,250,.15) }
.tier.Rare{ color:#e9d5ff; border-color:#a78bfa; background:rgba(167,139,250,.15) }
.tier.Epic{ color:#fde68a; border-color:#f59e0b; background:rgba(245,158,11,.15) }
.tier.Mythic{ color:#b8f3d8; border-color:#10b981; background:rgba(16,185,129,.15) }
.price{ font-weight:900; font-size:.92rem; display:inline-flex; align-items:center; gap:.25rem }
.ctype{ opacity:.7; font-weight:700; margin-left:.15rem }
.coin{ filter: drop-shadow(0 2px 6px rgba(0,0,0,.3)) }

.send{
  width:100%; border:none; border-radius:.9rem; padding:.55rem .9rem; font-weight:900;
  background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee); color:#000;
  box-shadow:0 8px 24px rgba(99,102,241,.35);
}
.empty{
  grid-column:1/-1; text-align:center; color:rgba(255,255,255,.75);
  padding:1rem; border-radius:1rem; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.05)
}

/* Skeleton */
.sk{
  height:186px;
  background:linear-gradient(90deg, rgba(255,255,255,.06), rgba(255,255,255,.12), rgba(255,255,255,.06));
  border:1px solid rgba(255,255,255,.12); border-radius:1.1rem;
  animation: shine 1.1s linear infinite;
}
@keyframes shine{ 0%{ background-position:-200px 0 } 100%{ background-position:200px 0 } }

/* Load more */
.loadmore{ padding: .8rem 0 1.2rem; display:flex; justify-content:center }
.loadbtn{
  border:1px solid rgba(255,255,255,.2); background:rgba(255,255,255,.06); color:#fff;
  padding:.6rem 1rem; border-radius:.9rem; font-weight:800;
}

/* ===== Sheet (Bottom) ===== */
.sheet-wrap{
  position:fixed; inset:0; z-index:40; display:grid; align-items:end;
  background:rgba(0,0,0,.45); backdrop-filter: blur(4px);
}
.sheet{
  border-top-left-radius:1.25rem; border-top-right-radius:1.25rem;
  background:linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
  border:1px solid rgba(255,255,255,.12);
  padding: .9rem .95rem 1rem;
}
.s-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:.6rem }
.s-head h3{ margin:0; font-size:1rem; font-weight:900 }
.s-head .x{ height:34px; width:34px; border-radius:10px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.16); color:#fff }
.s-body{ display:grid; gap:.75rem }
.s-row{ display:flex; gap:.7rem; align-items:center }
.s-cover img{ height:64px; width:64px; border-radius:.9rem; object-fit:cover; border:1px solid rgba(255,255,255,.2) }
.s-info .s-name{ margin:0; font-weight:900 }
.s-info .s-tier{ margin:.15rem 0 0 }
.s-price{ margin:.15rem 0 0; font-weight:900; display:flex; align-items:center; gap:.25rem }
.qty{ display:flex; align-items:center; justify-content:space-between }
.stepper{
  display:inline-flex; align-items:center; gap:.6rem; background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.12); border-radius:.8rem; padding:.25rem .4rem;
}
.stepper button{ height:30px; width:30px; border-radius:.6rem; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.14); color:#fff }
.qv{ width:28px; text-align:center; font-weight:900 }
.total{ display:flex; align-items:center; justify-content:space-between; font-size:.95rem }
.warn{ margin:.15rem 0 0; color:#fecaca; font-size:.85rem }

.s-actions{ display:flex; gap:.6rem; margin-top:.7rem }
.btn{
  flex:1; border-radius:.9rem; padding:.7rem; font-weight:900; border:1px solid transparent;
}
.btn.ghost{ background:rgba(255,255,255,.06); border-color:rgba(255,255,255,.16); color:#fff }
.btn.primary{ background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee); color:#000; box-shadow:0 8px 24px rgba(99,102,241,.35) }
.loader{ display:inline-block }

/* Sheet transition */
.sheet-enter-active,.sheet-leave-active{ transition: all .25s ease }
.sheet-enter-from,.sheet-leave-to{ opacity:0 }
.sheet-enter-from .sheet,.sheet-leave-to .sheet{ transform: translateY(30px) }

/* Toasts */
.toast{
  position:fixed; left:12px; right:12px; bottom:12px; z-index:50;
  border-radius:1rem; padding:.75rem .9rem; font-size:.9rem; border:1px solid;
  text-align:center;
}
.toast.ok{ background:rgba(16,185,129,.14); border-color:rgba(16,185,129,.35); color:#b8f3d8 }
.toast.bad{ background:rgba(244,63,94,.14); border-color:rgba(244,63,94,.35); color:#ffc9d2 }
.toast-enter-active,.toast-leave-active{ transition: all .25s ease }
.toast-enter-from,.toast-leave-to{ opacity:0; transform: translateY(6px) }

/* Utils */
.no-scrollbar::-webkit-scrollbar{ display:none }
.no-scrollbar{ -ms-overflow-style: none; scrollbar-width: none }
</style>
