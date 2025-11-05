<!-- src/views/DashboardUser.vue -->
<template>
  <div class="Dashboard">
    <!-- ======== MOBILE TOPBAR (white only) ======== -->
    <header class="MobileTopbar d-md-none">
      <button class="IconBtn" aria-label="Open menu" @click="sidebarOpen = true">
        <svg class="Ico" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>
        </svg>
      </button>

      <router-link to="/" class="Brand">
        <img src="/icons/logo.png" alt="SmartBiz" class="Logo" width="28" height="28" decoding="async" loading="eager" />
        <span class="BrandText">SmartBiz</span>
      </router-link>

      <div class="Menu">
        <button class="IconBtn" type="button" aria-label="More" @click="menuOpen = !menuOpen">
          <svg class="Ico" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="5" cy="12" r="2" fill="currentColor" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <circle cx="19" cy="12" r="2" fill="currentColor" />
          </svg>
        </button>
        <transition name="fade">
          <ul v-if="menuOpen" class="Dropdown shadow-sm rounded-3">
            <li><router-link class="dropdown-item" to="/dashboard/my/profile">My Profile</router-link></li>
            <li><router-link class="dropdown-item" to="/dashboard/settings">Settings</router-link></li>
            <li><hr /></li>
            <li><button class="dropdown-item text-danger" @click="logout">Log out</button></li>
          </ul>
        </transition>
      </div>
    </header>
    <!-- spacer for fixed topbar -->
    <div class="d-md-none" style="height:54px;"></div>

    <!-- ===================== MOBILE DRAWER (white) ===================== -->
    <transition name="fade">
      <div v-if="sidebarOpen" class="DrawerMask" @click.self="sidebarOpen = false" aria-label="Sidebar backdrop">
        <aside class="Drawer" role="navigation" aria-label="Mobile sidebar">
          <!-- drawer header -->
          <div class="DrawerHead">
            <img src="/icons/logo.png" alt="SmartBiz" class="Logo DrawerLogo" width="36" height="36" />
            <span class="DrawerBrand">{{ appName }}</span>

            <button class="IconBtn Light ms-auto" aria-label="Close menu" @click="sidebarOpen = false">
              <svg class="Ico" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>
              </svg>
            </button>
          </div>

          <hr class="DrawerRule" />

          <!-- drawer scroll body -->
          <div class="DrawerBody">
            <ul class="DrawerNav">
              <li v-for="link in navLinks" :key="link.path" class="DrawerItem">
                <router-link
                  :to="link.path"
                  class="DrawerLink"
                  :class="{ Active: isActive(link.path) }"
                  @click="sidebarOpen = false"
                >
                  <span class="DrawerIco">{{ link.icon }}</span>
                  <span class="DrawerTxt">{{ link.label }}</span>
                </router-link>
              </li>
            </ul>
          </div>

          <hr class="DrawerRule" />

          <!-- drawer footer -->
          <div class="DrawerFoot">
            <div class="UserRow">
              <div class="AvatarCircle">{{ avatarLetter }}</div>
              <strong class="UserName">{{ displayName }}</strong>
            </div>

            <button class="DrawerLogoutBtn" @click="logout">⎋ Log out</button>
            <div class="DrawerCopy">© {{ year }} SmartBiz</div>
          </div>
        </aside>
      </div>
    </transition>

    <!-- ===================== DESKTOP SIDEBAR (white) ===================== -->
    <aside class="Sidebar d-none d-md-flex" role="navigation" aria-label="Desktop sidebar">
      <div class="SideHead">
        <img src="/icons/logo.png" alt="SmartBiz" class="Logo" width="40" height="40" />
        <span class="SideBrand">{{ appName }}</span>
      </div>

      <hr class="SideRule" />

      <ul class="SideNav">
        <li v-for="link in navLinks" :key="link.path" class="SideItem">
          <router-link :to="link.path" class="SideLink" :class="{ Active: isActive(link.path) }">
            <span class="SideIco">{{ link.icon }}</span>
            <span class="SideTxt">{{ link.label }}</span>
          </router-link>
        </li>
      </ul>

      <hr class="SideRule" />
      <div class="SideFoot">
        <div class="SideUserRow">
          <div class="AvatarCircle">{{ avatarLetter }}</div>
          <div class="SideUserName">{{ displayName }}</div>
        </div>

        <button class="SideLogoutBtn" @click="logout">⎋ Log out</button>
        <div class="SideCopy">© {{ year }} SmartBiz</div>
      </div>
    </aside>

    <!-- ===================== MAIN ===================== -->
    <main class="Main">
      <!-- ===== page intro / greeting row ===== -->
      <div class="IntroRow">
        <div class="IntroText">
          <div class="HelloTitle">
            <span class="Wave" aria-hidden="true">👋</span>
            <span class="HelloLabel">Welcome back,</span>
            <span class="HelloName">{{ displayName }}</span>
          </div>
          <div class="HelloSub">Your commerce • wallet • live sales hub.</div>
        </div>

        <div class="IntroBtns d-none d-sm-flex">
          <router-link class="TopBtn Outline" to="/dashboard/settings">⚙️ Settings</router-link>
          <router-link class="TopBtn Outline" to="/dashboard/my/profile">👤 My Profile</router-link>
          <button class="TopBtn Warn" @click="logout">⎋ Log out</button>
        </div>
      </div>

      <!-- ===== HERO / MARKETPLACE QUICK ACCESS (NEW) ===== -->
      <section class="Card HeroCard">
        <div class="HeroLeft">
          <h3 class="HeroTitle">Sell faster with SmartBiz Marketplace</h3>
          <p class="HeroSub">Explore trending items, manage your store, and earn via promote links.</p>

          <div class="HeroActions">
            <router-link class="HeroBtn Primary" to="/explore">🧭 Explore</router-link>
            <router-link class="HeroBtn" to="/my-store">🏪 My Store</router-link>
            <router-link class="HeroBtn" to="/promote">💸 Promote</router-link>
          </div>
        </div>
        <picture class="HeroImgWrap" aria-hidden="true">
          <img class="HeroImg" src="/img/market/hero.webp" alt="" />
        </picture>
      </section>

      <!-- ===== WALLET CARD ===== -->
      <section class="Card WalletCard">
        <div class="WalletHeader">
          <div class="WalletLeft">
            <div class="WalletLabel">SmartBiz Wallet</div>
            <div class="WalletBalance"><span class="CoinText">{{ coinsDisplay }} SC</span></div>
            <div class="WalletHint">Spend, withdraw or send across SmartBiz.</div>
          </div>

          <div class="WalletRight">
            <div class="MiniSection">
              <div class="MiniLabel">Est. Value (USD)</div>
              <div class="MiniValue">${{ formatMoney(usdEstimate) }}</div>
            </div>
            <div class="MiniSection">
              <div class="MiniLabel">24h Activity</div>
              <div class="MiniValue AccentGood">+{{ todayEarned }} SC</div>
            </div>
          </div>
        </div>

        <div class="WalletActions">
          <button class="WalletBtn Primary" @click="goRecharge">➕ Top Up</button>
          <button class="WalletBtn PrimaryAlt" @click="goWithdraw">⬇ Withdraw</button>
          <button class="WalletBtn Soft" @click="goHistory">📜 History</button>
        </div>
      </section>

      <!-- ===== KPIs / quick stats ===== -->
      <section class="Card StatGrid">
        <div v-for="stat in uiStats" :key="stat.key" class="KpiBox">
          <div class="KpiIcon" aria-hidden="true">{{ stat.icon }}</div>
          <div class="KpiLabel">{{ stat.title }}</div>

          <div v-if="!loading" class="KpiValue">{{ stat.value }}</div>
          <div v-else class="SkeletonBlock"></div>
        </div>
      </section>

      <!-- ===== MARKETPLACE PREVIEW (NEW images) ===== -->
      <section class="Card MarketPreview">
        <div class="CardHeadRow">
          <div class="CardHeadLeft">
            <div class="CardHeadIcon">🧭</div>
            <div class="CardHeadText">
              <div class="CardHeadTitle">Explore — Trending now</div>
              <div class="CardHeadSub">Public feed from other sellers</div>
            </div>
          </div>
          <router-link class="SeeAllBtn" to="/explore">See all →</router-link>
        </div>

        <div class="Gallery" role="list">
          <article
            v-for="p in explorePreview"
            :key="p.id"
            class="GalleryCard"
            role="listitem"
            @click="router.push(`/p/${slugify(p.title)}`)"
          >
            <div class="Badge" :class="p.badge">{{ p.badge }}</div>
            <img :src="p.image" :alt="p.title" class="GImg" />
            <div class="GTitle" :title="p.title">{{ p.title }}</div>
            <div class="GMeta">
              <span class="GSeller">@{{ p.seller }}</span>
              <span class="GPrice">TZS {{ p.price.toLocaleString() }}</span>
            </div>
          </article>

          <div v-if="!explorePreview.length && !loading" class="GalleryEmpty">
            No items yet — check back soon.
          </div>
          <div v-if="loading && !explorePreview.length" class="GallerySkeleton"></div>
        </div>
      </section>

      <!-- ===== QUICK ACTIONS ===== -->
      <section class="Card QuickCard">
        <div class="CardHeadRow">
          <div class="CardHeadLeft">
            <div class="CardHeadIcon">⚡</div>
            <div class="CardHeadText">
              <div class="CardHeadTitle">Quick Actions</div>
              <div class="CardHeadSub">Move fast. Sell faster.</div>
            </div>
          </div>
        </div>

        <div class="ActionGrid">
          <router-link class="ActionBtn" to="/dashboard/customers">👥 <span>Customers</span></router-link>
          <router-link class="ActionBtn" to="/dashboard/products">🛒 <span>Products</span></router-link>
          <router-link class="ActionBtn" to="/dashboard/orders">📦 <span>Orders</span></router-link>
          <router-link class="ActionBtn" to="/dashboard/messages">✉️ <span>Inbox</span></router-link>
          <router-link class="ActionBtn" to="/dashboard/analytics">📊 <span>Analytics</span></router-link>
          <router-link class="ActionBtn" to="/dashboard/live_stream">📺 <span>Go Live</span></router-link>
          <!-- Marketplace shortcuts (NEW) -->
          <router-link class="ActionBtn" to="/explore">🧭 <span>Explore</span></router-link>
          <router-link class="ActionBtn" to="/my-store">🏪 <span>My Store</span></router-link>
          <router-link class="ActionBtn" to="/promote">💸 <span>Promote</span></router-link>
        </div>
      </section>

      <!-- ===== PLATFORM CONNECTIONS ===== -->
      <section class="Card IntegrationsCard">
        <div class="CardHeadRow">
          <div class="CardHeadLeft">
            <div class="CardHeadIcon">🔗</div>
            <div class="CardHeadText">
              <div class="CardHeadTitle">Channels</div>
              <div class="CardHeadSub">Where you're currently selling / talking</div>
            </div>
          </div>
        </div>

        <div class="PlatformGrid">
          <div class="PlatformCard" v-for="p in platforms" :key="p.name">
            <div class="PlatformIcon">{{ p.icon }}</div>
            <div class="PlatformName">{{ p.name }}</div>
            <div class="PlatformStatus" :class="p.connected ? 'Good' : 'Bad'">
              {{ p.connected ? 'Connected' : 'Offline' }}
            </div>
          </div>

          <div v-if="!platforms.length && !loading" class="PlatformEmpty">No channels linked yet.</div>
          <div v-if="loading && !platforms.length" class="PlatformSkeleton"></div>
        </div>
      </section>

      <!-- ===== RECENT MESSAGES ===== -->
      <section class="Card MessagesCard">
        <div class="CardHeadRow">
          <div class="CardHeadLeft">
            <div class="CardHeadIcon">💬</div>
            <div class="CardHeadText">
              <div class="CardHeadTitle">Recent Messages</div>
              <div class="CardHeadSub">Last contacts across all channels</div>
            </div>
          </div>

          <router-link class="SeeAllBtn" to="/dashboard/messages">View all →</router-link>
        </div>

        <ul class="MsgList">
          <li v-for="m in recentMessages" :key="m.id" class="MsgRow">
            <div class="MsgLeft">
              <div class="MsgPlatform">{{ m.platform?.icon || '✉️' }}</div>
              <div class="MsgBody">
                <div class="MsgSender">{{ m.sender }}</div>
                <div class="MsgText">{{ m.text }}</div>
              </div>
            </div>
            <div class="MsgTime">{{ m.timestamp }}</div>
          </li>

          <li v-if="!loading && recentMessages.length === 0" class="MsgEmpty">No messages yet.</li>
          <li v-if="loading && recentMessages.length === 0" class="MsgSkeleton"></li>
        </ul>
      </section>

      <!-- footer legal -->
      <footer class="Legal">
        <div class="LegalText">SmartBiz Wallet • Secure • Cross-border • Creator friendly</div>
        <div class="LegalCopy">© {{ year }} SmartBiz. All rights reserved.</div>
      </footer>

      <div class="BottomSpacer"></div>
    </main>

    <!-- ===================== MOBILE BOTTOM NAV (white) ===================== -->
    <nav class="BottomNav d-md-none">
      <button class="BNBtn" :class="{ Active: isHomeActive }" @click="router.push('/dashboard')">
        <span class="BNIco">🏠</span>
        <span class="BNTxt">Home</span>
      </button>

      <button class="BNBtn" :class="{ Active: isMessagesActive }" @click="router.push('/dashboard/messages')">
        <span class="BNIco">✉️</span>
        <span class="BNTxt">Inbox</span>
      </button>

      <button class="BNBtn BNPrimary" :class="{ Active: isLiveActive }" @click="router.push('/dashboard/live_stream')">
        <span class="BNIco">📺</span>
        <span class="BNTxt">Live</span>
      </button>

      <button class="BNBtn" :class="{ Active: isOrdersActive }" @click="router.push('/dashboard/orders')">
        <span class="BNIco">📦</span>
        <span class="BNTxt">Orders</span>
      </button>

      <button class="BNBtn" :class="{ Active: isProfileActive }" @click="router.push('/dashboard/my/profile')">
        <span class="BNIco">👤</span>
        <span class="BNTxt">Me</span>
      </button>
    </nav>

    <!-- spacer for fixed bottomnav -->
    <div class="d-md-none" style="height:66px;"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/* router helpers */
const route = useRoute()
const router = useRouter()

/* brand */
const appName = 'SmartBiz'

/* ENV / API targets (fallback friendly) */
const ENDPOINTS = {
  overview: ['/dashboard/overview', '/stats/overview'],
  platforms: ['/connections', '/platforms', '/platforms/status', '/integrations/list'],
  messages: [
    '/messages/recent?limit=10',
    '/messages?limit=10&order=desc',
    '/messages/list?limit=10',
    '/api/messages?limit=10',
    '/conversations/recent?limit=10',
    '/inbox/recent?limit=10'
  ]
}
const API_BASE =
  (import.meta as any)?.env?.VITE_API_BASE ||
  (import.meta as any)?.env?.VITE_BACKEND_BASE ||
  ''

/* auth helpers */
function getToken(): string {
  return (
    localStorage.getItem('auth:access') ||
    sessionStorage.getItem('auth:access') ||
    localStorage.getItem('sbz_token') ||
    sessionStorage.getItem('sbz_token') ||
    ''
  ) as string
}
onMounted(() => {
  if (!getToken()) {
    router.replace(`/login?next=${encodeURIComponent(route.fullPath)}`)
  }
})

/* http GET w/ fallback chain */
async function apiGet<T = any>(paths: string[]): Promise<T> {
  const token = getToken()
  let lastErr: any = null
  for (const p of paths) {
    try {
      const res = await fetch(joinUrl(API_BASE, p), {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (res.ok) {
        return await res.json()
      }
      lastErr = new Error(`GET ${p} -> ${res.status}`)
      continue
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}
function joinUrl(base: string, path: string) {
  if (!base) return path
  if (base.endsWith('/') && path.startsWith('/')) return base + path.slice(1)
  if (!base.endsWith('/') && !path.startsWith('/')) return base + '/' + path
  return base + path
}

/* UI state */
const menuOpen = ref(false)
const sidebarOpen = ref(false)
const year = new Date().getFullYear()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    sidebarOpen.value = false
    menuOpen.value = false
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

watch(sidebarOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

/* user info from storage */
const storedUser = (() => {
  try {
    return JSON.parse(
      localStorage.getItem('sbz_user') ||
        sessionStorage.getItem('sbz_user') ||
        'null'
    )
  } catch {
    return null
  }
})()

const displayName = computed<string>(() => {
  return (
    storedUser?.full_name ||
    storedUser?.name ||
    storedUser?.username ||
    localStorage.getItem('user_name') ||
    'User'
  )
})
const avatarLetter = computed<string>(() => {
  return displayName.value?.charAt(0)?.toUpperCase() || 'U'
})

/* Wallet state (local demo / should come from backend later) */
const coins = ref<number>(0)
const todayEarned = ref<number>(120) // demo daily gain

onMounted(() => {
  coins.value = inferWalletBalance()
})

function inferWalletBalance(): number {
  let bal = 0
  try {
    const hist = JSON.parse(localStorage.getItem('recharge_history') || '[]')
    for (const row of hist) if (row?.coins) bal += Number(row.coins) || 0
  } catch {}
  try {
    const w = JSON.parse(localStorage.getItem('withdraw_history') || '[]')
    for (const row of w) if (row?.sc) bal -= Number(row.sc) || 0
  } catch {}
  return bal < 0 ? 0 : bal
}

/* conversion math */
const TSH_PER_SC = 15
const TSH_PER_USD = 2600
const SC_PER_USD = TSH_PER_USD / TSH_PER_SC

function SCtoUSD(sc: number) {
  return sc / SC_PER_USD
}

const coinsDisplay = computed(() =>
  coins.value.toLocaleString(undefined, { maximumFractionDigits: 0 })
)
const usdEstimate = computed(() => SCtoUSD(coins.value || 0))

function formatMoney(n: number) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

/* routes for sidebar + quick nav */
const navLinks = [
  { label: 'Home',               path: '/dashboard',                         icon: '🏠' },
  { label: 'Explore',            path: '/explore',                            icon: '🧭' },
  { label: 'My Store',           path: '/my-store',                           icon: '🏪' },
  { label: 'Promote',            path: '/promote',                            icon: '💸' },
  { label: 'Customers',          path: '/dashboard/customers',               icon: '👥' },
  { label: 'Products',           path: '/dashboard/products',                icon: '🛒' },
  { label: 'Orders',             path: '/dashboard/orders',                  icon: '📦' },
  { label: 'Inbox',              path: '/dashboard/messages',                icon: '✉️' },
  { label: 'Promotions',         path: '/dashboard/scheduled_promotions',    icon: '📅' },
  { label: 'Support',            path: '/dashboard/support',                 icon: '🆘' },
  { label: 'Affiliate',          path: '/dashboard/affiliate_dashboard',     icon: '🤝' },
  { label: 'Live Stream',        path: '/dashboard/live_stream',             icon: '📺' },
  { label: 'Drone Missions',     path: '/dashboard/drone_tracking/missions', icon: '🚁' },
  { label: 'Analytics',          path: '/dashboard/analytics',               icon: '📊' },
  { label: 'Wallet: Top Up',     path: '/dashboard/wallet/recharge',         icon: '➕' },
  { label: 'Wallet: Withdraw',   path: '/dashboard/wallet/withdrawals',      icon: '⬇' },
  { label: 'Settings',           path: '/dashboard/settings',                icon: '⚙️' },
  { label: 'My Profile',         path: '/dashboard/my/profile',              icon: '👤' },
  { label: 'Notifications',      path: '/dashboard/notifications',           icon: '🔔' },
  { label: 'Rewards',            path: '/dashboard/loyalty_rewards',         icon: '🎁' },
  { label: 'Billing',            path: '/dashboard/billing',                 icon: '💳' },
  { label: 'Activity Log',       path: '/dashboard/activity_log',            icon: '📜' },
  { label: 'AI Assistant',       path: '/dashboard/assistant',               icon: '🤖' }
]
function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

/* active states for mobile bottom nav */
const isHomeActive = computed(() => route.path === '/dashboard')
const isMessagesActive = computed(() => route.path.startsWith('/dashboard/messages'))
const isLiveActive = computed(() => route.path.startsWith('/dashboard/live_stream'))
const isOrdersActive = computed(() => route.path.startsWith('/dashboard/orders'))
const isProfileActive = computed(() => route.path.startsWith('/dashboard/my/profile'))

/* live data state / loading */
const loading = ref(true)
const overview = ref<{ messages_sent?: number; response_rate?: number; active_platforms_connected?: number; active_platforms_total?: number; users_total?: number } | null>(null)
const platforms = ref<{ name: string; icon: string; connected: boolean }[]>([])
const recentMessages = ref<any[]>([])

/* marketplace preview (mocked images) */
const explorePreview = ref([
  { id:1, title:'Ring Light',   price:19000, image:'/img/d1.webp', seller:'aisha', badge:'TRENDING' },
  { id:2, title:'Phone Tripod', price:15000, image:'/img/d2.webp', seller:'juma',  badge:'NEW' },
  { id:3, title:'USB Mic',      price:42000, image:'/img/d3.webp', seller:'neema', badge:'VERIFIED' },
  { id:4, title:'Studio Headset', price:68000, image:'/img/d4.webp', seller:'joseph', badge:'LIVE' }
])

const uiStats = computed(() => {
  const ms = num(overview.value?.messages_sent)
  const rr = percent(overview.value?.response_rate)
  const apC = num(overview.value?.active_platforms_connected)
  const apT = num(overview.value?.active_platforms_total || 5)
  return [
    { key: 'messages',  icon: '📨', title: 'Messages Sent',   value: formatNum(ms) },
    { key: 'platforms', icon: '🔌', title: 'Active Platforms', value: `${apC}/${apT}` },
    { key: 'response',  icon: '🚀', title: 'Response Rate',    value: rr }
  ]
})

/* helpers for mapping stats */
function num(v: any, d = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}
function percent(v: any, dflt = '0%') {
  const n = Number(v)
  if (!Number.isFinite(n)) return dflt
  return n <= 1 ? `${Math.round(n * 100)}%` : `${Math.round(n)}%`
}
function formatNum(n: number) {
  return n.toLocaleString()
}

/* load data functions */
async function loadOverview() {
  try {
    const data = await apiGet<any>(ENDPOINTS.overview)
    const o = {
      messages_sent: data?.messages_sent ?? data?.messages?.sent ?? data?.counts?.messages ?? 0,
      response_rate: data?.response_rate ?? data?.rates?.response ?? data?.response_rate_pct ?? 0,
      active_platforms_connected: data?.active_platforms_connected ?? data?.platforms?.active ?? data?.connected ?? 0,
      active_platforms_total: data?.active_platforms_total ?? data?.platforms?.total ?? 5,
      users_total: data?.users_total ?? data?.users?.total ?? undefined
    }
    overview.value = o
  } catch {
    overview.value = { messages_sent: 0, response_rate: 0, active_platforms_connected: 0, active_platforms_total: 5 }
  }
}

async function loadPlatforms() {
  try {
    const arr = await apiGet<any[]>(ENDPOINTS.platforms)
    platforms.value = (arr || []).map((p: any) => ({
      name: p.name || p.platform || 'unknown',
      icon: iconForPlatform(p.name || p.platform),
      connected: !!(p.connected ?? (p.status === 'connected') ?? p.active)
    }))
  } catch {
    platforms.value = []
  }
}

async function loadMessages() {
  try {
    const res = await apiGet<any>(ENDPOINTS.messages)
    const list = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : res?.data ?? []
    recentMessages.value = list.map((m: any, i: number) => ({
      id: m.id || m._id || i,
      platform: { name: m.platform || m.channel || 'unknown', icon: iconForPlatform(m.platform || m.channel) },
      sender: m.sender || m.from || m.user || '—',
      text: m.text || m.message || m.body || '',
      timestamp: m.timestamp || m.created_at || m.time || ''
    }))
  } catch {
    recentMessages.value = []
  }
}

function iconForPlatform(name: string) {
  const n = String(name || '').toLowerCase()
  if (n.includes('whats')) return '📱'
  if (n.includes('telegram')) return '✈️'
  if (n.includes('email')) return '📧'
  if (n.includes('sms')) return '📲'
  return '🔗'
}

/* poll every 15s for live-ish dashboard */
let pollTimer: ReturnType<typeof setInterval> | null = null
async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadOverview(), loadPlatforms(), loadMessages()])
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  loadAll()
  pollTimer = setInterval(loadAll, 15000)
})
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})

/* wallet CTA handlers */
function goRecharge() { router.push('/dashboard/wallet/recharge') }
function goWithdraw() { router.push('/dashboard/wallet/withdrawals') }
function goHistory()  { router.push('/dashboard/wallet/recharge') }

/* logout */
function logout() {
  localStorage.removeItem('auth:access')
  sessionStorage.removeItem('auth:access')
  localStorage.removeItem('sbz_token')
  sessionStorage.removeItem('sbz_token')
  localStorage.removeItem('sbz_user')
  sessionStorage.removeItem('sbz_user')
  router.replace('/login')
}

/* utils */
function slugify(s: string){ return s.toLowerCase().replace(/\s+/g,'-') }
</script>

<style scoped>
/* ========= GLOBAL LAYOUT TOKENS ========= */
/* White-mode only (no auto-dark) */
:root{
  --bg-page:#ffffff;
  --bg-card:#ffffff;
  --bg-soft:#f7f8fa;
  --border:rgba(0,0,0,.08);
  --border-strong:rgba(0,0,0,.14);
  --text-main:#0f172a;
  --text-dim:#64748b;
  --text-faint:#94a3b8;
  --brand:#2563eb;          /* primary blue */
  --brand-2:#0ea5e9;        /* cyan */
  --accent-good:#10b981;
  --radius-lg:16px;
  --radius-md:12px;
  --font-stack:system-ui,-apple-system,BlinkMacSystemFont,"Inter","Roboto","Segoe UI",sans-serif;
}

.Dashboard{min-height:100vh;background:var(--bg-page);color:var(--text-main);display:flex;flex-direction:column;font-family:var(--font-stack);}

/* layout split: sidebar + main */
.Sidebar{
  width:260px;min-height:100vh;background:#fff;color:var(--text-main);
  border-right:1px solid var(--border-strong);display:flex;flex-direction:column;padding:16px;
  padding-top:calc(env(safe-area-inset-top,0px) + 16px);
  padding-bottom:calc(env(safe-area-inset-bottom,0px) + 16px);
}

.Main{
  flex-grow:1;max-width:100%;padding:16px 16px 100px;width:100%;margin:0 auto;max-width:680px;
}
@media(min-width:768px){.Main{padding:24px 24px 120px;max-width:1000px;}}

/* ========= TOPBAR (MOBILE HEADER, white) ========= */
.MobileTopbar{
  position:fixed;top:0;left:0;right:0;z-index:1050;background:#fff;color:var(--text-main);
  padding:8px 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-strong);
}
.Brand{display:flex;align-items:center;min-width:0;color:var(--text-main);font-weight:700;font-size:1rem;text-decoration:none;}
.BrandText{margin-left:8px;white-space:nowrap;}
.Logo{border-radius:50%;border:2px solid #e2e8f0;background:#fff;object-fit:contain;}
.IconBtn{appearance:none;background:#fff;border-radius:12px;border:1px solid var(--border);width:42px;height:42px;padding:0;display:grid;place-items:center;font-size:0;color:var(--text-main);font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.05);}
.IconBtn.Light{background:#fff;border-color:var(--border);color:var(--text-main);}
.IconBtn:active{transform:scale(.96);}
.Ico{width:24px;height:24px;color:currentColor;}
.Menu{position:relative;}
.Dropdown{position:absolute;right:0;top:46px;background:#fff;border:1px solid var(--border-strong);border-radius:12px;padding:6px;min-width:180px;box-shadow:0 12px 30px rgba(0,0,0,.08);}
.Dropdown .dropdown-item{display:block;width:100%;text-align:left;padding:8px 10px;border-radius:8px;color:var(--text-main);font-weight:500;text-decoration:none;background:transparent;border:0;}
.Dropdown .dropdown-item:hover{background:var(--bg-soft);}
.Dropdown hr{border:none;border-top:1px solid var(--border);margin:6px 2px;}
.Dropdown .text-danger{color:#b91c1c}

/* ========= DRAWER ========= */
.DrawerMask{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2000;display:flex;align-items:stretch;justify-content:flex-start;}
.Drawer{
  background:#fff;color:var(--text-main);width:85%;max-width:320px;border-top-right-radius:16px;border-bottom-right-radius:16px;
  box-shadow:8px 0 24px rgba(0,0,0,.2);display:flex;flex-direction:column;max-height:100dvh;height:100%;
  padding:16px;padding-top:calc(env(safe-area-inset-top,0px)+16px);padding-bottom:calc(env(safe-area-inset-bottom,0px)+16px);border-right:1px solid var(--border-strong);
}
.DrawerHead{display:flex;align-items:center;min-height:44px;font-size:1rem;font-weight:700;}
.DrawerLogo{margin-right:8px;}
.DrawerBrand{font-weight:700;font-size:1rem;flex-grow:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.DrawerRule{border-color:var(--border-strong)!important;opacity:1;margin:8px 0;}
.DrawerBody{flex-grow:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;scrollbar-width:thin;scrollbar-color:#cbd5e1 transparent;padding-right:4px;}
.DrawerNav{list-style:none;margin:0;padding:0;}
.DrawerItem + .DrawerItem{margin-top:4px;}
.DrawerLink{display:flex;align-items:center;gap:8px;background:transparent;color:var(--text-main);text-decoration:none;font-size:1rem;font-weight:600;padding:10px 12px;border-radius:8px;}
.DrawerLink.Active{background:rgba(37,99,235,.1);color:#1d4ed8;}
.DrawerIco{font-size:1.1rem;}
.DrawerTxt{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.DrawerFoot{flex-shrink:0;font-size:.85rem;line-height:1.2rem;text-align:left;}
.UserRow{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.DrawerLogoutBtn{width:100%;appearance:none;background:#fff;border:1px solid var(--border-strong);border-radius:10px;padding:8px 12px;color:var(--text-main);font-size:.95rem;font-weight:700;text-align:center;}
.DrawerLogoutBtn:active{transform:scale(.97);}
.DrawerCopy{margin-top:12px;text-align:center;opacity:.7;}
.AvatarCircle{background:rgba(37,99,235,.1);color:#1d4ed8;font-weight:800;border-radius:999px;width:32px;height:32px;display:grid;place-items:center;font-size:.9rem;line-height:1;}
.fade-enter-active,.fade-leave-active{transition:opacity .18s linear;}
.fade-enter-from,.fade-leave-to{opacity:0;}

/* ========= DESKTOP SIDEBAR SUBBLOCKS ========= */
.SideHead{display:flex;align-items:center;margin-bottom:16px;}
.SideBrand{font-size:1.1rem;font-weight:800;margin-left:8px;white-space:nowrap;}
.SideRule{border-color:var(--border-strong)!important;margin:8px 0 16px;}
.SideNav{list-style:none;padding:0;margin:0 0 16px 0;flex-grow:1;}
.SideItem + .SideItem{margin-top:4px;}
.SideLink{display:flex;align-items:center;gap:8px;color:var(--text-main);font-size:1rem;font-weight:700;line-height:1.3rem;border-radius:10px;text-decoration:none;padding:10px 12px;border:1px solid transparent;}
.SideLink:not(.Active):hover{background:var(--bg-soft);border-color:var(--border);}
.SideLink.Active{background:rgba(37,99,235,.1);color:#1d4ed8;border-color:rgba(37,99,235,.25);}
.SideIco{font-size:1.1rem;}
.SideTxt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.SideFoot{margin-top:auto;font-size:.85rem;line-height:1.2rem;}
.SideUserRow{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-weight:800;}
.SideUserName{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.SideLogoutBtn{width:100%;appearance:none;background:#fff;border:1px solid var(--border-strong);border-radius:10px;padding:8px 12px;color:var(--text-main);font-size:.95rem;font-weight:800;text-align:center;}
.SideLogoutBtn:active{transform:scale(.97);}
.SideCopy{margin-top:12px;text-align:center;opacity:.7;}

/* ========= INTRO ========= */
.IntroRow{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px;}
.IntroText{min-width:0;}
.HelloTitle{font-size:15px;font-weight:700;color:var(--text-main);display:flex;flex-wrap:wrap;column-gap:6px;row-gap:4px;line-height:1.4;}
.Wave{font-size:18px;}
.HelloLabel{color:var(--text-dim);font-weight:700;}
.HelloName{color:var(--text-main);}
.HelloSub{margin-top:4px;font-size:12px;line-height:1.4;color:var(--text-dim);font-weight:600;max-width:420px;}
.IntroBtns{display:flex;flex-wrap:wrap;gap:8px;}
.TopBtn{border-radius:10px;font-size:13px;line-height:1.2;font-weight:800;padding:10px 12px;border:1px solid var(--border);background:#fff;color:var(--text-main);box-shadow:0 8px 20px rgba(0,0,0,.04);text-decoration:none;}
.TopBtn.Outline{background:var(--bg-soft);}
.TopBtn.Warn{border-color:rgba(220,38,38,.25);background:rgba(220,38,38,.08);color:#b91c1c;}
.TopBtn:active{transform:scale(.97);}

/* ========= CARD BASE ========= */
.Card{background:var(--bg-card);border-radius:var(--radius-lg);border:1px solid var(--border);box-shadow:0 12px 30px rgba(15,23,42,.06),0 2px 4px rgba(15,23,42,.03);padding:16px;margin-bottom:16px;}
@media(min-width:768px){.Card{border-radius:20px;padding:20px;margin-bottom:20px;}}

/* ========= HERO (NEW) ========= */
.HeroCard{display:flex;gap:16px;align-items:center;overflow:hidden;}
.HeroLeft{min-width:0;flex:1;}
.HeroTitle{font-size:18px;font-weight:800;line-height:1.25;}
.HeroSub{color:var(--text-dim);font-size:12px;margin-top:4px;max-width:520px;}
.HeroActions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}
.HeroBtn{border-radius:12px;border:1px solid var(--border);background:var(--bg-soft);padding:10px 12px;font-weight:800;font-size:13px;text-decoration:none;color:var(--text-main);}
.HeroBtn.Primary{background:linear-gradient(90deg,var(--brand),var(--brand-2));border:0;color:#fff;}
.HeroImgWrap{flex:0 0 160px;height:100px;border-radius:12px;overflow:hidden;border:1px solid var(--border);display:none;}
.HeroImg{width:100%;height:100%;object-fit:cover;}
@media(min-width:700px){.HeroImgWrap{display:block;}}

/* ========= WALLET ========= */
.WalletCard{background:#fff;position:relative;overflow:hidden;}
.WalletHeader{display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;}
.WalletLeft{min-width:0;flex:1 1 200px;}
.WalletLabel{font-size:12px;font-weight:800;color:var(--text-dim);line-height:1.3;}
.WalletBalance{font-size:22px;line-height:1.2;font-weight:900;margin-top:4px;}
.CoinText{background-image:linear-gradient(90deg,var(--brand),var(--brand-2));-webkit-background-clip:text;color:transparent;}
.WalletHint{font-size:12px;color:var(--text-faint);line-height:1.4;margin-top:4px;max-width:280px;}
.WalletRight{display:flex;flex-direction:row;flex-wrap:wrap;gap:16px;min-width:0;}
.MiniSection{min-width:90px;}
.MiniLabel{font-size:11px;line-height:1.3;color:var(--text-faint);font-weight:700;}
.MiniValue{font-size:14px;font-weight:900;color:var(--text-main);}
.AccentGood{color:var(--accent-good);}
.WalletActions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;}
.WalletBtn{flex:1 1 auto;min-width:0;border-radius:12px;padding:10px 12px;font-size:13px;font-weight:900;line-height:1.2;border:1px solid var(--border);background:var(--bg-soft);color:var(--text-main);text-align:center;box-shadow:0 8px 20px rgba(0,0,0,.04);}
.WalletBtn.Primary{background-image:linear-gradient(90deg,var(--brand),var(--brand-2));border:0;color:#fff;}
.WalletBtn.PrimaryAlt{background:#111827;color:#fff;border:0;}
.WalletBtn.Soft{background:var(--bg-soft);}
.WalletBtn:active{transform:scale(.97);}

/* ========= KPI GRID ========= */
.StatGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
@media(max-width:400px){.StatGrid{grid-template-columns:repeat(2,1fr);}}
.KpiBox{border:1px solid var(--border);border-radius:12px;background:var(--bg-soft);padding:12px;text-align:left;box-shadow:0 8px 20px rgba(0,0,0,.03);min-height:94px;display:flex;flex-direction:column;justify-content:space-between;}
.KpiIcon{font-size:16px;line-height:1;}
.KpiLabel{font-size:12px;color:var(--text-dim);font-weight:800;margin-top:6px;line-height:1.3;}
.KpiValue{font-size:16px;font-weight:900;color:var(--text-main);line-height:1.2;margin-top:6px;}
.SkeletonBlock{width:60%;height:20px;border-radius:6px;background:linear-gradient(90deg,rgba(0,0,0,.08) 0%,rgba(0,0,0,.02) 40%,rgba(0,0,0,.08) 80%);background-size:300% 100%;animation:shimmer 1.2s infinite;}

/* ========= MARKETPLACE PREVIEW ========= */
.MarketPreview .Gallery{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:2px;}
.MarketPreview .Gallery::-webkit-scrollbar{height:6px}
.MarketPreview .Gallery::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:999px}
.GalleryCard{position:relative;flex:0 0 160px;border:1px solid var(--border);border-radius:12px;scroll-snap-align:start;background:#fff;box-shadow:0 6px 16px rgba(0,0,0,.04);padding:8px;cursor:pointer;}
.GImg{width:100%;height:110px;border-radius:8px;object-fit:cover;}
.GTitle{font-weight:800;font-size:12px;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.GMeta{display:flex;justify-content:space-between;align-items:center;margin-top:2px;font-size:11px;}
.GSeller{color:var(--text-dim);}
.GPrice{font-weight:900;}
.Badge{position:absolute;left:8px;top:8px;font-size:10px;font-weight:900;padding:4px 6px;border-radius:999px;background:#111827;color:#fff;}
.Badge.NEW{background:#2563eb}
.Badge.TRENDING{background:#f59e0b}
.Badge.VERIFIED{background:#10b981}
.Badge.LIVE{background:#ef4444}
.GalleryEmpty,.GallerySkeleton{flex:1 0 auto;border:1px dashed var(--border);border-radius:12px;padding:20px;text-align:center;color:var(--text-faint);min-width:220px;}
.GallerySkeleton{background:linear-gradient(90deg,rgba(0,0,0,.06),rgba(0,0,0,.02),rgba(0,0,0,.06));background-size:300% 100%;animation:shimmer 1.2s infinite;}

/* ========= QUICK ACTIONS ========= */
.CardHeadRow{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:12px;}
.CardHeadLeft{display:flex;flex-wrap:nowrap;gap:10px;min-width:0;}
.CardHeadIcon{font-size:20px;line-height:1;}
.CardHeadText{min-width:0;}
.CardHeadTitle{font-size:14px;font-weight:900;line-height:1.3;}
.CardHeadSub{font-size:12px;line-height:1.3;color:var(--text-faint);font-weight:700;max-width:220px;}
.ActionGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
@media(min-width:480px){.ActionGrid{grid-template-columns:repeat(6,1fr);}}
.ActionBtn{border-radius:12px;background:var(--bg-soft);border:1px solid var(--border);box-shadow:0 8px 20px rgba(0,0,0,.04);font-size:13px;font-weight:900;line-height:1.2;color:var(--text-main);padding:12px 8px;text-align:center;text-decoration:none;display:flex;flex-direction:column;align-items:center;gap:6px;}
.ActionBtn span{display:block;white-space:nowrap;}
.ActionBtn:active{transform:scale(.97);}

/* ========= INTEGRATIONS ========= */
.PlatformGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;}
@media(min-width:480px){.PlatformGrid{grid-template-columns:repeat(3,1fr);}}
.PlatformCard{background:var(--bg-soft);border:1px solid var(--border);border-radius:12px;box-shadow:0 8px 20px rgba(0,0,0,.04);padding:12px;text-align:center;}
.PlatformIcon{font-size:20px;line-height:1;}
.PlatformName{font-size:13px;font-weight:900;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.PlatformStatus{font-size:11px;font-weight:900;margin-top:2px;}
.PlatformStatus.Good{color:#10b981;}
.PlatformStatus.Bad{color:#dc2626;}
.PlatformEmpty{grid-column:1/-1;text-align:center;font-size:12px;color:var(--text-faint);border:1px dashed var(--border);border-radius:12px;padding:20px 12px;font-weight:700;}
.PlatformSkeleton{grid-column:1/-1;height:44px;border-radius:8px;background:linear-gradient(90deg,rgba(0,0,0,.08) 0%,rgba(0,0,0,.02) 40%,rgba(0,0,0,.08) 80%);background-size:300% 100%;animation:shimmer 1.2s infinite;}

/* ========= MESSAGES ========= */
.SeeAllBtn{font-size:12px;color:var(--brand);font-weight:900;text-decoration:none;}
.SeeAllBtn:active{opacity:.7;}
.MsgList{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px;}
.MsgRow{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border:1px solid var(--border);border-radius:12px;background:var(--bg-soft);box-shadow:0 8px 20px rgba(0,0,0,.04);padding:12px;}
.MsgLeft{display:flex;align-items:flex-start;gap:10px;min-width:0;flex:1;}
.MsgPlatform{flex-shrink:0;font-size:18px;line-height:1;}
.MsgBody{min-width:0;}
.MsgSender{font-size:13px;font-weight:900;line-height:1.3;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.MsgText{font-size:12px;line-height:1.4;color:var(--text-dim);font-weight:700;max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.MsgTime{flex-shrink:0;font-size:11px;color:var(--text-faint);font-weight:700;line-height:1.3;text-align:right;min-width:60px;}
.MsgEmpty{text-align:center;font-size:12px;color:var(--text-faint);border:1px dashed var(--border);border-radius:12px;padding:20px 12px;font-weight:700;}
.MsgSkeleton{height:44px;border-radius:12px;background:linear-gradient(90deg,rgba(0,0,0,.08) 0%,rgba(0,0,0,.02) 40%,rgba(0,0,0,.08) 80%);background-size:300% 100%;animation:shimmer 1.2s infinite;}

/* ========= FOOTER ========= */
.Legal{text-align:center;color:var(--text-faint);margin-top:24px;}
.LegalText{font-size:12px;line-height:1.4;font-weight:700;}
.LegalCopy{font-size:11px;line-height:1.4;font-weight:700;margin-top:4px;}
.BottomSpacer{height:80px;}

/* ========= BOTTOM NAV (white) ========= */
.BottomNav{
  position:fixed;z-index:1100;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--border-strong);
  color:var(--text-main);padding-bottom:calc(env(safe-area-inset-bottom, 0px) + 6px);padding-top:6px;
  display:flex;justify-content:space-around;align-items:flex-end;height:60px;
}
.BNBtn{background:transparent;border:0;padding:0;color:var(--text-main);font-size:.75rem;line-height:1rem;text-align:center;flex:1 1 20%;display:flex;flex-direction:column;align-items:center;font-weight:800;}
.BNBtn:active{transform:scale(.96);}
.BNIco{font-size:1.2rem;line-height:1.2rem;}
.BNTxt{margin-top:2px;font-size:.7rem;line-height:.8rem;color:var(--text-dim);}
.BNPrimary{background:rgba(37,99,235,.08);border-radius:12px;padding:4px 6px 6px;}
.BNPrimary .BNIco{filter:saturate(1.1);}
.BNPrimary .BNTxt{color:#1d4ed8;font-weight:900;}
.BNBtn.Active .BNIco,.BNBtn.Active .BNTxt{color:#1d4ed8;font-weight:900;}
.BNBtn.Active{background:rgba(37,99,235,.08);border-radius:12px;}

/* shimmer anim */
@keyframes shimmer{0%{background-position:0% 0;}100%{background-position:-200% 0;}}
</style>
