<template>
  <!-- SVG symbol sprites (no external icon libs required) -->
  <svg aria-hidden="true" class="d-none">
    <symbol id="i-dashboard" viewBox="0 0 24 24">
      <path d="M3 13h5v8H3zM10 3h4v18h-4zM16 8h5v13h-5z" />
    </symbol>
    <symbol id="i-campaigns" viewBox="0 0 24 24">
      <path d="M3 4h18v4H3zM3 10h12v4H3zM3 16h18v4H3z" />
    </symbol>
    <symbol id="i-my" viewBox="0 0 24 24">
      <path d="M9 7l2 2 4-4 2 2-6 6-4-4zM4 18h16v2H4z" />
    </symbol>
    <symbol id="i-trophy" viewBox="0 0 24 24">
      <path d="M7 4h10v3h3a5 5 0 0 1-5 5H9A5 5 0 0 1 4 7h3V4zm5 10a5 5 0 0 0 5-5v-1H7v1a5 5 0 0 0 5 5zm-3 2h6v2h-6v-2zm-2 4h10v2H7z"/>
    </symbol>
    <symbol id="i-chevron-left" viewBox="0 0 24 24">
      <path d="M15.4 6L9.4 12l6 6-1.4 1.4L6.6 12l7.4-7.4z"/>
    </symbol>
    <symbol id="i-chevron-right" viewBox="0 0 24 24">
      <path d="M8.6 18l6-6-6-6 1.4-1.4L17.4 12l-7.4 7.4z"/>
    </symbol>
    <symbol id="i-menu" viewBox="0 0 24 24">
      <path d="M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z"/>
    </symbol>
  </svg>

  <!-- Mobile toggle button (visible on < lg) -->
  <button
    class="btn btn-dark d-lg-none position-fixed top-0 start-0 m-2 z-3 shadow-sm"
    aria-label="Open sidebar"
    @click="mobileOpen = true"
  >
    <svg width="20" height="20"><use href="#i-menu" /></svg>
  </button>

  <!-- Backdrop for mobile drawer -->
  <div
    class="sidebar-backdrop d-lg-none"
    :class="{ show: mobileOpen }"
    @click="mobileOpen = false"
  />

  <aside
    class="affiliate-sidebar bg-dark text-white p-3"
    :class="{ collapsed, 'mobile-open': mobileOpen }"
    role="navigation"
    aria-label="Affiliate navigation"
  >
    <!-- Header -->
    <div class="d-flex align-items-center mb-3">
      <img
        src="/logo-circle.png"
        alt="SmartBiz logo"
        class="me-2 rounded-circle flex-shrink-0"
        width="40"
        height="40"
        @error="hideLogo = true"
        v-show="!hideLogo"
      />
      <span class="fs-5 fw-bold text-truncate sidebar-title">Affiliate</span>

      <!-- Collapse toggle (desktop only) -->
      <button
        class="btn btn-outline-light btn-sm ms-auto d-none d-lg-inline-flex align-items-center"
        :title="collapsed ? 'Expand' : 'Collapse'"
        @click="toggleCollapse"
      >
        <svg width="18" height="18" v-if="!collapsed"><use href="#i-chevron-left" /></svg>
        <svg width="18" height="18" v-else><use href="#i-chevron-right" /></svg>
      </button>

      <!-- Close (mobile) -->
      <button
        class="btn btn-outline-light btn-sm ms-auto d-lg-none"
        aria-label="Close sidebar"
        @click="mobileOpen = false"
      >
        ×
      </button>
    </div>

    <hr class="border-light opacity-25 my-3" />

    <!-- Nav -->
    <ul class="nav flex-column gap-1">
      <li v-for="item in navItems" :key="item.to" class="nav-item">
        <RouterLink :to="item.to" v-slot="{ href, navigate, isActive, isExactActive }">
          <a
            :href="href"
            @click="navigate"
            class="nav-link d-flex align-items-center gap-2 text-white rounded-3 px-2 py-2"
            :class="[{ active: isExactActive || (item.exact !== true && isActive) }, collapsed && 'justify-content-center']"
            :aria-current="(isExactActive || isActive) ? 'page' : undefined"
            :title="collapsed ? item.label : undefined"
          >
            <span class="icon-wrap">
              <svg width="18" height="18" aria-hidden="true">
                <use :href="`#${item.icon}`" />
              </svg>
            </span>
            <span class="label text-truncate" v-show="!collapsed">{{ item.label }}</span>
          </a>
        </RouterLink>
      </li>
    </ul>

    <!-- Footer -->
    <div class="mt-auto small text-center text-muted pt-3">
      <span v-show="!collapsed">© {{ year }} SmartBiz</span>
    </div>
  </aside>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const year = new Date().getFullYear()

const navItems = [
  { to: '/affiliate', label: 'Dashboard', icon: 'i-dashboard', exact: true },
  { to: '/available-campaigns', label: 'Available Campaigns', icon: 'i-campaigns' },
  { to: '/my-campaigns', label: 'My Campaigns', icon: 'i-my' },
  { to: '/promoter-leaderboard', label: 'Leaderboard', icon: 'i-trophy' },
]

const collapsed = ref(false)
const mobileOpen = ref(false)
const hideLogo = ref(false)

onMounted(() => {
  try {
    collapsed.value = localStorage.getItem('affiliate_sidebar_collapsed') === '1'
  } catch {}
})

watch(collapsed, (v) => {
  try {
    localStorage.setItem('affiliate_sidebar_collapsed', v ? '1' : '0')
  } catch {}
})

function toggleCollapse() {
  collapsed.value = !collapsed.value
}
</script>

<style scoped>
/* Layout + sizing */
.affiliate-sidebar {
  width: 260px;
  min-height: 100vh;
  position: sticky;
  top: 0;
  left: 0;
  z-index: 1040;
  transition: width .2s ease, transform .2s ease;
  box-shadow: inset -1px 0 0 rgba(255,255,255,.08);
}

/* Collapsed (desktop) */
.affiliate-sidebar.collapsed {
  width: 86px;
}
.affiliate-sidebar.collapsed .sidebar-title {
  display: none;
}

/* Mobile drawer behavior */
@media (max-width: 991.98px) {
  .affiliate-sidebar {
    position: fixed;
    transform: translateX(-100%);
    height: 100vh;
    width: 82%;
    max-width: 320px;
  }
  .affiliate-sidebar.mobile-open {
    transform: translateX(0);
  }
  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.45);
    opacity: 0;
    pointer-events: none;
    transition: opacity .2s ease;
    z-index: 1039;
  }
  .sidebar-backdrop.show {
    opacity: 1;
    pointer-events: auto;
  }
}

/* Nav styling */
.nav-link {
  opacity: .9;
  transition: background-color .15s ease, opacity .15s ease, color .15s ease;
}
.nav-link:hover {
  background: rgba(255,255,255,.08);
  opacity: 1;
}
.nav-link.active {
  background: #ffc107;
  color: #212529 !important;
  font-weight: 600;
}
.nav-link .icon-wrap {
  width: 22px;
  display: inline-flex;
  justify-content: center;
}
.nav-link svg {
  fill: currentColor;
}

/* Smooth text truncation */
.label {
  min-width: 0;
}

/* Rounded corners & subtle gradient for the aside */
.affiliate-sidebar {
  background: radial-gradient(120% 120% at 0% 0%, rgba(255,255,255,.06), transparent 60%) #111;
}
</style>
