<template>
  <div class="dashboard d-flex min-vh-100 bg-light">
    <!-- ===================== Mobile Topbar ===================== -->
    <header class="d-md-none position-fixed top-0 start-0 end-0 bg-white border-bottom px-3 py-2 d-flex align-items-center justify-content-between" style="z-index:1050;">
      <button
        class="btn btn-outline-primary btn-sm d-flex align-items-center"
        type="button"
        aria-label="Open menu"
        @click="sidebarOpen = true"
      >
        <i class="bi bi-list" style="font-size:1.25rem;"></i>
      </button>

      <!-- brand (small round logo + name) -->
      <router-link to="/" class="d-inline-flex align-items-center text-decoration-none">
        <img
          src="/icons/logo.png"
          alt="SmartBiz"
          class="rounded-circle bg-white border border-warning me-2"
          width="28" height="28"
          decoding="async" loading="eager"
          style="object-fit:contain"
        />
        <span class="fw-bold text-primary">SmartBiz</span>
      </router-link>

      <router-link to="/settings" class="btn btn-outline-secondary btn-sm" aria-label="Settings">
        <i class="bi bi-gear"></i>
      </router-link>
    </header>
    <!-- spacer for fixed mobile topbar -->
    <div class="d-md-none" style="height:48px;"></div>

    <!-- ============== Mobile Sidebar (Drawer) ============== -->
    <transition name="fade">
      <div
        v-if="sidebarOpen"
        class="position-fixed top-0 start-0 end-0 bottom-0 bg-dark bg-opacity-50"
        style="z-index:1049;"
        @click.self="sidebarOpen = false"
        aria-label="Sidebar backdrop"
      >
        <aside
          class="h-100 bg-primary text-white p-3"
          style="width: 80%; max-width: 280px;"
          role="navigation"
          aria-label="Mobile sidebar"
        >
          <div class="d-flex align-items-center mb-3">
            <img src="/icons/logo.png" alt="SmartBiz Logo"
                 class="rounded-circle bg-white me-2 border border-warning"
                 width="36" height="36" style="object-fit:contain" />
            <span class="fs-5 fw-bold">SmartBiz</span>
            <button
              class="btn btn-light btn-sm ms-auto"
              aria-label="Close menu"
              @click="sidebarOpen = false"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <hr class="border-light opacity-50">

          <ul class="nav flex-column mb-auto">
            <li v-for="link in navLinks" :key="link.name" class="nav-item">
              <router-link
                :to="link.path"
                class="nav-link text-white d-flex align-items-center gap-2 py-2"
                active-class="active"
                @click="sidebarOpen = false"
              >
                <span aria-hidden="true">{{ link.icon }}</span>
                <span>{{ $t(link.name) }}</span>
              </router-link>
            </li>
          </ul>

          <hr class="border-light opacity-50">
          <div class="small text-center">
            &copy; {{ new Date().getFullYear() }} SmartBiz
          </div>
        </aside>
      </div>
    </transition>

    <!-- ===================== Desktop Sidebar ===================== -->
    <aside
      class="d-none d-md-flex flex-column p-3 bg-primary text-white"
      style="width:260px;"
      role="navigation"
      aria-label="Desktop sidebar"
    >
      <div class="d-flex align-items-center mb-4">
        <!-- small round logo on the corner -->
        <img
          src="/icons/logo.png"
          alt="SmartBiz Logo"
          class="rounded-circle bg-white me-2 border border-warning"
          width="40" height="40" style="object-fit:contain"
        />
        <span class="fs-4 fw-bold">SmartBiz</span>
      </div>

      <hr class="border-light opacity-50">
      <ul class="nav flex-column mb-auto">
        <li v-for="link in navLinks" :key="link.name" class="nav-item">
          <router-link
            :to="link.path"
            class="nav-link text-white d-flex align-items-center gap-2 py-2"
            active-class="active"
          >
            <span aria-hidden="true">{{ link.icon }}</span>
            <span>{{ $t(link.name) }}</span>
          </router-link>
        </li>
      </ul>

      <hr class="border-light opacity-50">
      <div class="text-center small">
        &copy; {{ new Date().getFullYear() }} SmartBiz
      </div>
    </aside>

    <!-- ===================== Main Content ===================== -->
    <main class="flex-grow-1 p-3 p-md-4">
      <!-- Top Header -->
      <div class="d-flex justify-content-between align-items-center mb-3 mb-md-4">
        <h2 class="text-primary fw-bold mb-0">
          👤 {{ $t('dashboard') }} – {{ user.value?.name || $t('user') }}
        </h2>
        <div class="d-flex align-items-center gap-2">
          <span class="text-muted d-none d-sm-inline">{{ user.value?.name || $t('user') }}</span>
          <div
            class="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
            style="width:40px;height:40px;"
            aria-label="User avatar"
          >
            {{ user.value?.name?.charAt(0)?.toUpperCase() || 'U' }}
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="row g-3 g-md-4 mb-3 mb-md-4">
        <div class="col-12 col-sm-6 col-lg-4" v-for="stat in stats" :key="stat.title">
          <div class="card shadow-sm text-center p-3 h-100">
            <div class="fs-1" aria-hidden="true">{{ stat.icon }}</div>
            <h5 class="fw-bold my-2">{{ $t(stat.title) }}</h5>
            <p class="fs-4 text-primary mb-0">{{ stat.value }}</p>
          </div>
        </div>
      </div>

      <!-- Platform Connections -->
      <div class="card shadow-sm p-3 p-md-4 mb-3 mb-md-4">
        <h4 class="text-primary fw-bold mb-3">🔗 {{ $t('platform_connections') }}</h4>
        <div class="row g-2 g-sm-3">
          <div class="col-6 col-md-3" v-for="platform in platforms" :key="platform.name">
            <div class="card text-center p-3 h-100">
              <div class="fs-2" aria-hidden="true">{{ platform.icon }}</div>
              <h6 class="mt-2 mb-1">{{ $t(platform.name) }}</h6>
              <small :class="platform.connected ? 'text-success' : 'text-danger'">
                {{ platform.connected ? 'Connected' : 'Disconnected' }}
              </small>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Messages -->
      <div class="card shadow-sm p-3 p-md-4 mb-4">
        <h4 class="text-primary fw-bold mb-3">💬 {{ $t('recent_messages') }}</h4>
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
              <tr v-for="message in recentMessages" :key="message.id">
                <td>{{ message.platform.icon }} {{ $t(message.platform.name) }}</td>
                <td>{{ message.sender }}</td>
                <td>{{ message.text }}</td>
                <td class="text-muted">{{ message.timestamp }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

/* ---------- Auth guard (simple) ---------- */
onMounted(() => {
  const token = localStorage.getItem('access_token')
  if (!token) router.replace('/login')
})

/* ---------- UI state ---------- */
const sidebarOpen = ref(false)

/* Funga drawer ukibonyeza ESC au ubofye backdrop */
function onKey(e) {
  if (e.key === 'Escape') sidebarOpen.value = false
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

/* Zuia body-scroll wakati drawer iko wazi */
watch(sidebarOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

/* ---------- User & data ---------- */
const user = ref({
  name: localStorage.getItem('user_name') || 'User'
})

const navLinks = [
  { name: 'dashboard',            path: '/dashboard/user',      icon: '🏠' },
  { name: 'customers',            path: '/customers',           icon: '👥' },
  { name: 'products',             path: '/products',            icon: '🛒' },
  { name: 'orders',               path: '/orders',              icon: '📦' },
  { name: 'messaging_center',     path: '/messaging-center',    icon: '✉️' },
  { name: 'scheduled_promotions', path: '/scheduled-promotions',icon: '📅' },
  { name: 'support',              path: '/support',             icon: '🆘' },
  { name: 'affiliate_dashboard',  path: '/affiliate',           icon: '🤝' },
  { name: 'live_stream',          path: '/live-stream',         icon: '📺' },
  { name: 'drone_tracking',       path: '/drones/missions',     icon: '🚁' },
  { name: 'analytics',            path: '/analytics',           icon: '📊' },
  { name: 'settings',             path: '/settings',            icon: '⚙️' },
  { name: 'profile',              path: '/profile',             icon: '👤' },
  { name: 'notifications',        path: '/notifications',       icon: '🔔' },
  { name: 'loyalty_rewards',      path: '/loyalty',             icon: '🎁' },
  { name: 'help',                 path: '/help',                icon: '❓' },
  { name: 'billing',              path: '/billing',             icon: '💳' },
  { name: 'activity_log',         path: '/my-logs',             icon: '📜' },
  { name: 'smart_assistant',      path: '/assistant-assistant',           icon: '🤖' }
]

const stats = [
  { title: 'messages_sent',    value: '2,543', icon: '📨' },
  { title: 'active_platforms', value: '3/5',   icon: '🔌' },
  { title: 'response_rate',    value: '89%',   icon: '🚀' }
]

const platforms = [
  { name: 'whatsapp', icon: '📱', connected: true  },
  { name: 'telegram', icon: '✈️', connected: true  },
  { name: 'sms',      icon: '📲', connected: false },
  { name: 'email',    icon: '📧', connected: true  }
]

const recentMessages = [
  { id: 1, platform: { name: 'whatsapp', icon: '📱' }, sender: '+255 712 345 678', text: 'Hello, I need support!', timestamp: '2 min ago' },
  { id: 2, platform: { name: 'email',    icon: '📧' }, sender: 'john@company.com', text: 'Order confirmation',     timestamp: '1 hour ago' },
  { id: 3, platform: { name: 'telegram', icon: '✈️' }, sender: '@johndoe',        text: 'Bot not working',        timestamp: '3 hours ago' }
]

/* expose to template */
defineExpose({ sidebarOpen })
</script>

<style scoped>
/* =================== Tokens / tweaks =================== */
:root{
  --gold:#FFD600;
  --gold-ink:#181829;
}

/* Desktop sidebar active link */
.active{
  background-color: var(--gold);
  color: var(--gold-ink) !important;
  font-weight: 700;
  border-radius: .5rem;
}

/* Sidebar links default + hover */
.nav-link{
  border-radius: .5rem;
  transition: background .18s ease, color .18s ease, transform .12s ease;
}
.nav-link:hover{
  background: rgba(255,255,255,.12);
  transform: translateX(2px);
}

/* Cards polish */
.card{
  border-radius: .9rem;
  border: 1px solid rgba(0,0,0,.05);
}
.card:hover{
  box-shadow: 0 12px 28px rgba(0,0,0,.08);
}

/* Table polish (compact on mobile) */
.table td, .table th{ vertical-align: middle; }
@media (max-width: 576px){
  .table{ font-size: .92rem; }
}

/* ======= Drawer overlay transition ======= */
.fade-enter-active, .fade-leave-active{
  transition: opacity .18s ease;
}
.fade-enter-from, .fade-leave-to{
  opacity: 0;
}

/* A11y focus rings */
a:focus-visible, button:focus-visible{
  outline: 2px solid var(--gold);
  outline-offset: 2px;
  border-radius: .35rem;
}

/* Spacing harmonized for mobile-first */
.dashboard main{ padding-bottom: 1rem; }
@media (min-width: 768px){
  .dashboard main{ padding-bottom: 1.25rem; }
}
</style>
