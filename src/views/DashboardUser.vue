hii hapaa DashboardUser.vue sasa nataka uboreshe kibekee sana na hakikisha unaweka kwenye ulimwengu ujao tunataka tuwe na kitu real tayari inatumika na hakikisha ni mobile first kwa kwa muonekano sahihi na mpangilio ulivyo sio mbaya kama unaweza kuboresha kipekee sana na kuandika spiritual DashboaedUser ya kipekee sana na bora na nyepesi kila kipengele kikiwa ni chepesi na murwaa <!-- src/views/DashboardUser.vue -->
<template>
  <div class="dashboard d-flex min-vh-100 bg-light">
    <!-- ======== MOBILE TOPBAR (hamburger • brand • kebab) ======== -->
    <header class="mobile-topbar d-md-none">
      <button class="icon-btn" aria-label="Open menu" @click="sidebarOpen = true">
        <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M3 6h18M3 12h18M3 18h18"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            fill="none"
          />
        </svg>
      </button>

      <router-link to="/" class="brand text-decoration-none">
        <img
          src="/icons/logo.png"
          alt="SmartBiz"
          class="logo"
          width="28"
          height="28"
          decoding="async"
          loading="eager"
        />
        <span class="brand-text">SmartBiz</span>
      </router-link>

      <div class="dropdown">
        <button
          class="icon-btn"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          aria-label="More"
        >
          <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="5" cy="12" r="2" fill="currentColor" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <circle cx="19" cy="12" r="2" fill="currentColor" />
          </svg>
        </button>
        <ul class="dropdown-menu dropdown-menu-end shadow-sm rounded-3">
          <li>
            <router-link class="dropdown-item" to="/dashboard/profile">
              {{ $t('profile') }}
            </router-link>
          </li>
          <li>
            <router-link class="dropdown-item" to="/dashboard/settings">
              {{ $t('settings') }}
            </router-link>
          </li>
          <li><hr class="dropdown-divider" /></li>
          <li>
            <button class="dropdown-item text-danger" @click="logout">
              {{ $t('logout') }}
            </button>
          </li>
        </ul>
      </div>
    </header>
    <!-- spacer for fixed topbar -->
    <div class="d-md-none" style="height:54px;"></div>

    <!-- ===================== MOBILE DRAWER ===================== -->
    <transition name="fade">
      <div
        v-if="sidebarOpen"
        class="drawer-mask"
        @click.self="sidebarOpen = false"
        aria-label="Sidebar backdrop"
      >
        <aside
          class="drawer"
          role="navigation"
          aria-label="Mobile sidebar"
        >
          <!-- drawer header -->
          <div class="drawer-head d-flex align-items-center">
            <img
              src="/icons/logo.png"
              alt="SmartBiz"
              class="logo me-2"
              width="36"
              height="36"
            />
            <span class="fw-bold text-white flex-grow-1 text-truncate">SmartBiz</span>

            <button
              class="icon-btn light ms-auto"
              aria-label="Close menu"
              @click="sidebarOpen = false"
            >
              <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  fill="none"
                />
              </svg>
            </button>
          </div>

          <hr class="border-light opacity-50 my-2" />

          <!-- drawer scroll body -->
          <div class="drawer-body flex-grow-1 overflow-auto">
            <ul class="nav flex-column mb-auto">
              <li
                v-for="link in navLinks"
                :key="link.path"
                class="nav-item"
              >
                <router-link
                  :to="link.path"
                  class="nav-link text-white d-flex align-items-center gap-2 py-2"
                  :class="{ active: isActive(link.path) }"
                  @click="sidebarOpen = false"
                >
                  <span aria-hidden="true">{{ link.icon }}</span>
                  <span class="text-truncate">{{ $t(link.name) }}</span>
                </router-link>
              </li>
            </ul>
          </div>

          <hr class="border-light opacity-50 my-2" />

          <!-- drawer footer -->
          <div class="drawer-foot small text-white">
            <div class="mb-2 d-flex align-items-center gap-2">
              <div class="avatar-circle">{{ avatarLetter }}</div>
              <strong class="text-truncate flex-grow-1">
                {{ displayName }}
              </strong>
            </div>

            <button
              class="btn btn-sm btn-outline-light w-100"
              @click="logout"
            >
              <span class="me-1">⎋</span>{{ $t('logout') }}
            </button>

            <div class="text-center mt-3">
              &copy; {{ year }} SmartBiz
            </div>
          </div>
        </aside>
      </div>
    </transition>

    <!-- ===================== DESKTOP SIDEBAR ===================== -->
    <aside
      class="d-none d-md-flex flex-column p-3 bg-primary text-white desktop-sidebar"
      role="navigation"
      aria-label="Desktop sidebar"
    >
      <div class="d-flex align-items-center mb-4">
        <img
          src="/icons/logo.png"
          alt="SmartBiz"
          class="logo me-2"
          width="40"
          height="40"
        />
        <span class="fs-5 fw-bold text-truncate">SmartBiz</span>
      </div>

      <hr class="border-light opacity-50" />
      <ul class="nav flex-column mb-auto">
        <li
          v-for="link in navLinks"
          :key="link.path"
          class="nav-item"
        >
          <router-link
            :to="link.path"
            class="nav-link text-white d-flex align-items-center gap-2 py-2"
            :class="{ active: isActive(link.path) }"
          >
            <span aria-hidden="true">{{ link.icon }}</span>
            <span class="text-truncate">{{ $t(link.name) }}</span>
          </router-link>
        </li>
      </ul>

      <hr class="border-light opacity-50" />
      <div class="mt-auto">
        <div class="small d-flex align-items-center gap-2 mb-2">
          <div class="avatar-circle">{{ avatarLetter }}</div>
          <div class="text-truncate">{{ displayName }}</div>
        </div>
        <button
          class="btn btn-sm btn-outline-light w-100"
          @click="logout"
        >
          <span class="me-1">⎋</span>{{ $t('logout') }}
        </button>
        <div class="text-center small mt-3">
          &copy; {{ year }} SmartBiz
        </div>
      </div>
    </aside>

    <!-- ===================== MAIN ===================== -->
    <main class="flex-grow-1 p-3 p-md-4">
      <!-- header row -->
      <div
        class="d-flex justify-content-between align-items-center mb-3 mb-md-4 flex-wrap gap-2"
      >
        <h2 class="text-primary fw-bold mb-0">
          🏠 {{ $t('dashboard') }} — {{ displayName }}
        </h2>

        <div class="d-none d-sm-flex align-items-center gap-2">
          <router-link
            class="btn btn-outline-primary btn-sm"
            to="/dashboard/settings"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              class="me-1"
            >
              <path
                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
                fill="currentColor"
              />
            </svg>
            {{ $t('settings') }}
          </router-link>

          <router-link
            class="btn btn-outline-secondary btn-sm"
            to="/dashboard/profile"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              class="me-1"
            >
              <path
                d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2-8 4v2h16v-2c0-2-3.58-4-8-4Z"
                fill="currentColor"
              />
            </svg>
            {{ $t('profile') }}
          </router-link>

          <button
            class="btn btn-warning btn-sm fw-bold"
            @click="logout"
          >
            <span class="me-1">⎋</span>{{ $t('logout') }}
          </button>
        </div>
      </div>

      <!-- quick stats (skeletons when loading) -->
      <div class="row g-3 g-md-4 mb-3 mb-md-4">
        <div
          class="col-12 col-sm-6 col-lg-4"
          v-for="stat in uiStats"
          :key="stat.key"
        >
          <div class="card shadow-sm text-center p-3 h-100 card-soft">
            <div class="fs-1" aria-hidden="true">{{ stat.icon }}</div>
            <h5 class="fw-bold my-2">{{ stat.title }}</h5>
            <p
              v-if="!loading"
              class="fs-4 text-primary mb-0"
            >
              {{ stat.value }}
            </p>
            <div
              v-else
              class="skeleton mt-2"
              style="height:28px;width:120px;margin:0 auto;"
            ></div>
          </div>
        </div>
      </div>

      <!-- quick actions -->
      <div class="card shadow-sm p-3 p-md-4 mb-3 mb-md-4 card-soft">
        <h4 class="text-primary fw-bold mb-3">
          ⚡ {{ $t('quick_actions') || 'Quick Actions' }}
        </h4>

        <div class="d-flex flex-wrap gap-2">
          <router-link
            class="btn btn-outline-primary"
            to="/dashboard/customers"
          >👥 {{ $t('customers') }}</router-link>

          <router-link
            class="btn btn-outline-primary"
            to="/dashboard/products"
          >🛒 {{ $t('products') }}</router-link>

          <router-link
            class="btn btn-outline-primary"
            to="/dashboard/orders"
          >📦 {{ $t('orders') }}</router-link>

          <router-link
            class="btn btn-outline-primary"
            to="/dashboard/messaging_center"
          >✉️ {{ $t('messaging_center') }}</router-link>

          <router-link
            class="btn btn-outline-primary"
            to="/dashboard/analytics"
          >📊 {{ $t('analytics') }}</router-link>
        </div>
      </div>

      <!-- platform connections -->
      <div class="card shadow-sm p-3 p-md-4 mb-3 mb-md-4 card-soft">
        <h4 class="text-primary fw-bold mb-3">
          🔗 {{ $t('platform_connections') }}
        </h4>

        <div class="row g-2 g-sm-3">
          <div
            class="col-6 col-md-3"
            v-for="p in platforms"
            :key="p.name"
          >
            <div
              class="card text-center p-3 h-100 border-0 shadow-xs hover-raise rounded-4"
            >
              <div class="fs-2" aria-hidden="true">
                {{ p.icon }}
              </div>
              <h6 class="mt-2 mb-1 text-truncate">
                {{ p.name }}
              </h6>
              <small
                :class="p.connected ? 'text-success' : 'text-danger'"
              >
                {{
                  p.connected
                    ? ($t('connected') || 'Connected')
                    : ($t('disconnected') || 'Disconnected')
                }}
              </small>
            </div>
          </div>
        </div>
      </div>

      <!-- recent messages -->
      <div class="card shadow-sm p-3 p-md-4 mb-5 card-soft">
        <h4 class="text-primary fw-bold mb-3">
          💬 {{ $t('recent_messages') }}
        </h4>

        <div class="table-responsive">
          <table class="table table-striped align-middle">
            <thead class="table-light">
              <tr>
                <th scope="col">{{ $t('platform') }}</th>
                <th scope="col">{{ $t('sender') }}</th>
                <th scope="col">{{ $t('message') }}</th>
                <th scope="col">{{ $t('timestamp') }}</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="m in recentMessages"
                :key="m.id"
              >
                <td>
                  {{ m.platform?.icon || '✉️' }}
                  {{ m.platform?.name || 'unknown' }}
                </td>
                <td
                  class="text-truncate"
                  style="max-width:200px"
                >{{ m.sender }}</td>
                <td
                  class="text-truncate"
                  style="max-width:360px"
                >{{ m.text }}</td>
                <td class="text-muted">
                  {{ m.timestamp }}
                </td>
              </tr>

              <tr
                v-if="!loading && recentMessages.length === 0"
              >
                <td
                  colspan="4"
                  class="text-center text-muted py-3"
                >
                  No messages yet.
                </td>
              </tr>

              <tr
                v-if="loading && recentMessages.length === 0"
              >
                <td colspan="4" class="py-3">
                  <div
                    class="skeleton"
                    style="height:18px"
                  ></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- ===================== MOBILE BOTTOM NAV ===================== -->
    <nav class="mobile-bottomnav d-md-none">
      <button
        class="bn-btn"
        :class="{ active: isHomeActive }"
        @click="router.push('/dashboard')"
      >
        <span class="bn-ico">🏠</span>
        <span class="bn-txt">Home</span>
      </button>

      <!-- CHANGED: now push inbox/chat page, not messaging_center -->
      <button
        class="bn-btn"
        :class="{ active: isMessagesActive }"
        @click="router.push('/dashboard/messages')"
      >
        <span class="bn-ico">✉️</span>
        <span class="bn-txt">Messages</span>
      </button>

      <button
        class="bn-btn bn-primary"
        :class="{ active: isLiveActive }"
        @click="router.push('/dashboard/live_stream')"
      >
        <span class="bn-ico">📺</span>
        <span class="bn-txt">Live</span>
      </button>

      <button
        class="bn-btn"
        :class="{ active: isOrdersActive }"
        @click="router.push('/dashboard/orders')"
      >
        <span class="bn-ico">📦</span>
        <span class="bn-txt">Orders</span>
      </button>

      <!-- replaced Settings with Profile 👤 -->
      <button
        class="bn-btn"
        :class="{ active: isProfileActive }"
        @click="router.push('/dashboard/profile')"
      >
        <span class="bn-ico">👤</span>
        <span class="bn-txt">Profile</span>
      </button>
    </nav>
    <!-- spacer for fixed bottomnav -->
    <div class="d-md-none" style="height:66px;"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

/* =================== CONFIG =================== */
const ENDPOINTS = {
  overview: ['/dashboard/overview', '/stats/overview'],
  // ongeza routes unazo nazo; hizi hapa ni salama
  platforms: [
    '/connections',
    '/platforms',
    '/platforms/status',
    '/integrations/list'
  ],
  // tumia fallbacks nyingi kwa messages
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

/* =================== AUTH =================== */
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

/* =================== API HELPERS =================== */
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

      // 405/404/401 -> jaribu endpoint inayofuata
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

/* =================== STATE =================== */
const sidebarOpen = ref(false)
const year = new Date().getFullYear()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') sidebarOpen.value = false
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

watch(sidebarOpen, (open) => {
  // freeze body scroll when drawer open
  document.body.style.overflow = open ? 'hidden' : ''
})

/* ---- User ---- */
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

/* ---- Nav links ---- */
const navLinks = [
  { name: 'dashboard',            path: '/dashboard',                          icon: '🏠' },
  { name: 'customers',            path: '/dashboard/customers',                icon: '👥' },
  { name: 'products',             path: '/dashboard/products',                 icon: '🛒' },
  { name: 'orders',               path: '/dashboard/orders',                   icon: '📦' },
  { name: 'messaging_center',     path: '/dashboard/messaging_center',         icon: '✉️' },
  { name: 'scheduled_promotions', path: '/dashboard/scheduled_promotions',     icon: '📅' },
  { name: 'support',              path: '/dashboard/support',                  icon: '🆘' },
  { name: 'affiliate_dashboard',  path: '/dashboard/affiliate_dashboard',      icon: '🤝' },
  { name: 'live_stream',          path: '/dashboard/live_stream',              icon: '📺' },
  { name: 'drone_tracking',       path: '/dashboard/drone_tracking/missions',  icon: '🚁' },
  { name: 'analytics',            path: '/dashboard/analytics',                icon: '📊' },
  { name: 'settings',             path: '/dashboard/settings',                 icon: '⚙️' },
  { name: 'profile',              path: '/dashboard/profile',                  icon: '👤' },
  { name: 'notifications',        path: '/dashboard/notifications',            icon: '🔔' },
  { name: 'loyalty_rewards',      path: '/dashboard/loyalty_rewards',          icon: '🎁' },
  { name: 'help',                 path: '/dashboard/help',                     icon: '❓' },
  { name: 'billing',              path: '/dashboard/billing',                  icon: '💳' },
  { name: 'activity_log',         path: '/dashboard/activity_log',             icon: '📜' },
  { name: 'smart_assistant',      path: '/dashboard/assistant',                icon: '🤖' }
]

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

/* active states for bottom nav buttons */
const isHomeActive = computed(() => route.path === '/dashboard')
const isMessagesActive = computed(() => route.path.startsWith('/dashboard/messages'))
const isLiveActive = computed(() => route.path.startsWith('/dashboard/live_stream'))
const isOrdersActive = computed(() => route.path.startsWith('/dashboard/orders'))
const isProfileActive = computed(() => route.path.startsWith('/dashboard/profile'))

/* =================== LIVE DATA =================== */
const loading = ref(true)

/** Raw state from API (DB) */
const overview = ref<{
  messages_sent?: number
  response_rate?: number
  active_platforms_connected?: number
  active_platforms_total?: number
  users_total?: number
} | null>(null)

const platforms = ref<{ name: string; icon: string; connected: boolean }[]>([])
const recentMessages = ref<any[]>([])

/** UI derived stats */
const uiStats = computed(() => {
  const ms = num(overview.value?.messages_sent)
  const rr = percent(overview.value?.response_rate)
  const apC = num(overview.value?.active_platforms_connected)
  const apT = num(overview.value?.active_platforms_total || 5)

  return [
    {
      key: 'messages',
      icon: '📨',
      title: $tWrap('messages_sent', 'Messages Sent'),
      value: formatNum(ms)
    },
    {
      key: 'platforms',
      icon: '🔌',
      title: $tWrap('active_platforms', 'Active Platforms'),
      value: `${apC}/${apT}`
    },
    {
      key: 'response',
      icon: '🚀',
      title: $tWrap('response_rate', 'Response Rate'),
      value: rr
    }
  ]
})

/* helpers */
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
function $tWrap(key: string, fallback: string) {
  try {
    return (
      ((globalThis as any).$t?.(key) ||
        (window as any)?.$t?.(key) ||
        fallback) ?? fallback
    )
  } catch {
    return fallback
  }
}

/* ======== Fetch + map with graceful fallback ======== */
async function loadOverview() {
  try {
    const data = await apiGet<any>(ENDPOINTS.overview)
    const o = {
      messages_sent:
        data?.messages_sent ??
        data?.messages?.sent ??
        data?.counts?.messages ??
        0,
      response_rate:
        data?.response_rate ??
        data?.rates?.response ??
        data?.response_rate_pct ??
        0,
      active_platforms_connected:
        data?.active_platforms_connected ??
        data?.platforms?.active ??
        data?.connected ??
        0,
      active_platforms_total:
        data?.active_platforms_total ??
        data?.platforms?.total ??
        5,
      users_total: data?.users_total ?? data?.users?.total ?? undefined
    }
    overview.value = o
  } catch {
    // fallback defaults
    overview.value = {
      messages_sent: 0,
      response_rate: 0,
      active_platforms_connected: 0,
      active_platforms_total: 5
    }
  }
}

async function loadPlatforms() {
  try {
    const arr = await apiGet<any[]>(ENDPOINTS.platforms)
    platforms.value = (arr || []).map((p: any) => ({
      name: p.name || p.platform || 'unknown',
      icon: iconForPlatform(p.name || p.platform),
      connected: !!(
        p.connected ??
        (p.status === 'connected') ??
        p.active
      )
    }))
  } catch {
    platforms.value = []
  }
}

async function loadMessages() {
  try {
    const res = await apiGet<any>(ENDPOINTS.messages)
    const list = Array.isArray(res?.items)
      ? res.items
      : Array.isArray(res)
      ? res
      : res?.data ?? []

    recentMessages.value = list.map((m: any, i: number) => ({
      id: m.id || m._id || i,
      platform: {
        name: m.platform || m.channel || 'unknown',
        icon: iconForPlatform(m.platform || m.channel)
      },
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

/* Bootstrap load + polling */
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
  pollTimer = setInterval(loadAll, 15000) // refresh kila sekunde 15
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})

/* =================== LOGOUT =================== */
function logout() {
  // toa token zote local/session
  localStorage.removeItem('auth:access')
  sessionStorage.removeItem('auth:access')
  localStorage.removeItem('sbz_token')
  sessionStorage.removeItem('sbz_token')
  localStorage.removeItem('sbz_user')
  sessionStorage.removeItem('sbz_user')
  router.replace('/login')
}
</script>

<style scoped>
/* ========== MOBILE TOP BAR ========== */
.mobile-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1050;
  background-color: #0b1220;
  color: #fff;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mobile-topbar .brand {
  display: flex;
  align-items: center;
  min-width: 0;
  color: #fff;
  font-weight: 600;
  font-size: 1rem;
}
.mobile-topbar .brand-text {
  margin-left: 8px;
  white-space: nowrap;
  color: #fff;
  font-weight: 600;
  font-size: 1rem;
}
.mobile-topbar .logo {
  border-radius: 50%;
  border: 2px solid #f6c84c;
  background: #fff;
  object-fit: contain;
  box-shadow: 0 0 8px rgba(246, 200, 76, 0.6);
}

/* generic icon button */
.icon-btn {
  appearance: none;
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  width: 42px;
  height: 42px;
  padding: 0;
  display: grid;
  place-items: center;
  font-size: 0;
  color: #0b1220;
  font-weight: 600;
}
.icon-btn.light {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
}
.icon-btn .ico {
  width: 24px;
  height: 24px;
  color: currentColor;
}
.icon-btn:active {
  transform: scale(0.96);
}

/* ========== DRAWER MASK + PANEL ========== */
.drawer-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
}

/* Drawer main container */
.drawer {
  background-color: #0b1a3a;
  color: #fff;
  width: 85%;
  max-width: 320px;
  padding: 16px;
  padding-top: calc(env(safe-area-inset-top, 0px) + 16px);
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  border-top-right-radius: 16px;
  border-bottom-right-radius: 16px;

  display: flex;
  flex-direction: column;
  max-height: 100dvh;
  height: 100%;
  box-shadow: 8px 0 24px rgba(0, 0, 0, 0.6);
}

/* header / body / footer split */
.drawer-head {
  flex-shrink: 0;
  min-height: 44px;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
}

.drawer-body {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  scrollbar-width: thin;
  scrollbar-color: #4a5568 transparent;
  padding-right: 4px; /* kidogo nafasi kwa scroll */
}
.drawer-body::-webkit-scrollbar {
  width: 4px;
}
.drawer-body::-webkit-scrollbar-track {
  background: transparent;
}
.drawer-body::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 999px;
}

.drawer-foot {
  flex-shrink: 0;
  font-size: 0.8rem;
  line-height: 1.2rem;
  color: #fff;
  text-align: left;
}

/* active nav link style (yellow bg kama screenshot) */
.drawer .nav-link.active,
.desktop-sidebar .nav-link.active {
  background-color: #f6c84c;
  color: #000 !important;
  border-radius: 8px;
  font-weight: 600;
}

/* nav links default */
.drawer .nav-link,
.desktop-sidebar .nav-link {
  font-weight: 500;
  font-size: 1rem;
  line-height: 1.3rem;
}

/* avatar bubble */
.avatar-circle {
  background: #f6c84c;
  color: #000;
  font-weight: 700;
  border-radius: 999px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  font-size: 0.9rem;
  line-height: 1;
}

/* fade transition for mask */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s linear;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ========== DESKTOP SIDEBAR STYLES ========== */
.desktop-sidebar {
  width: 260px;
  min-height: 100vh;
  background-color: #0d1a4a !important;
  background-image: radial-gradient(
      circle at 10% 10%,
      rgba(246, 200, 76, 0.08),
      transparent 60%
    ),
    radial-gradient(
      circle at 90% 0%,
      rgba(255, 255, 255, 0.07),
      transparent 70%
    );
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.4);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}
.desktop-sidebar .logo {
  border-radius: 50%;
  border: 2px solid #f6c84c;
  background: #fff;
  object-fit: contain;
  box-shadow: 0 0 8px rgba(246, 200, 76, 0.6);
}
.desktop-sidebar .nav-link {
  color: #fff;
  border-radius: 8px;
}
.desktop-sidebar .nav-link:not(.active):active {
  background: rgba(255, 255, 255, 0.08);
}

/* ========== CARDS / CONTENT AREA ========== */
.card-soft {
  border: 0;
  border-radius: 1rem;
  background-color: #fff;
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.06),
    0 2px 6px rgba(0, 0, 0, 0.04);
}
@media (prefers-color-scheme: dark) {
  .card-soft {
    background: #0b1020;
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.07);
    box-shadow:
      0 20px 40px rgba(0, 0, 0, 0.9),
      0 2px 8px rgba(0, 0, 0, 0.6);
  }
}

/* subtle hover raise */
.hover-raise {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.hover-raise:active,
.hover-raise:hover {
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.08);
}

/* mini skeleton block */
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.08) 0%,
    rgba(0, 0, 0, 0.02) 40%,
    rgba(0, 0, 0, 0.08) 80%
  );
  background-size: 300% 100%;
  border-radius: 6px;
  animation: shimmer 1.2s infinite;
}
@keyframes shimmer {
  0% {
    background-position: 0% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* ========== MOBILE BOTTOM NAV ========== */
.mobile-bottomnav {
  position: fixed;
  z-index: 1100;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #0b1220;
  color: #fff;
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 6px);
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);

  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 60px;
}
.bn-btn {
  background: transparent;
  border: 0;
  padding: 0;
  color: #fff;
  font-size: 0.75rem;
  line-height: 1rem;
  text-align: center;
  flex: 1 1 20%;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-weight: 500;
}
.bn-btn:active {
  transform: scale(0.96);
}
.bn-ico {
  font-size: 1.2rem;
  line-height: 1.2rem;
}
.bn-txt {
  margin-top: 2px;
  font-size: 0.7rem;
  line-height: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
}
.bn-primary {
  background: rgba(246, 200, 76, 0.12);
  border-radius: 12px;
  padding: 4px 6px 6px;
  box-shadow: 0 0 12px rgba(246, 200, 76, 0.4);
}
.bn-primary .bn-ico {
  text-shadow: 0 0 8px rgba(246, 200, 76, 0.8);
}
.bn-primary .bn-txt {
  color: #f6c84c;
  font-weight: 600;
}

/* active highlight for bottom nav button */
.bn-btn.active .bn-ico,
.bn-btn.active .bn-txt {
  color: #f6c84c;
  font-weight: 600;
  text-shadow: 0 0 8px rgba(246,200,76,.6);
}
.bn-btn.active {
  background: rgba(246,200,76,.12);
  border-radius: 12px;
  box-shadow: 0 0 12px rgba(246,200,76,.4);
}

/* dark mode tweaks for main bg */
@media (prefers-color-scheme: dark) {
  .dashboard {
    background-color: #0b1020 !important;
    color: #fff;
  }
  main.flex-grow-1 {
    color: #fff;
  }
}
</style>
