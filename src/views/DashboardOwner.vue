<!-- src/views/DashboardOwner.vue -->
<template>
  <div class="owner-shell min-h-screen bg-[#0d1b2a] text-[#e0e1dd]">
    <!-- Top App Bar -->
    <header class="appbar">
      <button class="icon-btn" @click="toggleSidebar" aria-label="Open menu">☰</button>

      <div class="brand">
        <img :src="logoUrl" alt="SmartBiz" class="logo" />
        <span class="brand-name">SmartBiz</span>
      </div>

      <div class="appbar-actions">
        <RouterLink class="icon-btn" :to="{ name:'Notifications' }" aria-label="Notifications">🔔</RouterLink>
        <RouterLink class="icon-btn" :to="{ name:'Settings' }" aria-label="Settings">⚙️</RouterLink>
      </div>
    </header>

    <!-- Mobile overlay when sidebar is open -->
    <div v-if="isSidebarOpen" class="overlay md:hidden" @click="closeSidebar" aria-hidden="true"></div>

    <!-- Sidebar -->
    <aside :class="['sidebar', { 'sidebar--hidden': !isSidebarOpen }]" aria-label="Owner navigation">
      <nav class="side-nav">
        <div v-for="group in navGroups" :key="group.title" class="side-group">
          <p class="side-title">{{ group.title }}</p>
          <ul class="side-list">
            <li
              v-for="l in group.links"
              :key="l.key"
              @click="go(l)"
              :class="['side-item', currentPath === (l.to?.path || l.path || '') ? 'is-active' : '']"
            >
              <span class="mr-2 text-lg">{{ l.icon }}</span>
              <span class="flex-1">{{ l.label }}</span>
              <span v-if="l.badge" class="badge">{{ l.badge }}</span>
            </li>
          </ul>
        </div>
      </nav>
    </aside>

    <!-- Main content -->
    <main class="content">
      <div class="content-head">
        <h2 class="page-title">{{ pageTitle }}</h2>
        <span class="panel-chip">OWNER PANEL</span>
      </div>

      <!-- KPI: mobile carousel, desktop grid -->
      <section class="kpi-wrap">
        <div class="kpi-carousel md:hidden">
          <article class="kpi-card" aria-label="Total users">
            <h3>{{ kpi.totalUsers.toLocaleString() }}</h3>
            <p>Total Users</p>
          </article>
          <article class="kpi-card" aria-label="Active admins">
            <h3>{{ kpi.activeAdmins }}</h3>
            <p>Active Admins</p>
          </article>
          <article class="kpi-card" aria-label="Weekly revenue">
            <h3>{{ kpi.revenue }}</h3>
            <p>Weekly Revenue</p>
          </article>
          <article class="kpi-card" aria-label="Uptime">
            <h3>{{ kpi.uptime }}</h3>
            <p>Uptime</p>
          </article>
        </div>

        <div class="kpi-grid hidden md:grid">
          <article class="kpi-card"><h3>{{ kpi.totalUsers.toLocaleString() }}</h3><p>Total Users</p></article>
          <article class="kpi-card"><h3>{{ kpi.activeAdmins }}</h3><p>Active Admins</p></article>
          <article class="kpi-card"><h3>{{ kpi.revenue }}</h3><p>Weekly Revenue</p></article>
          <article class="kpi-card"><h3>{{ kpi.uptime }}</h3><p>Uptime</p></article>
        </div>
      </section>

      <!-- Quick actions -->
      <section class="actions">
        <button class="action-chip" @click="go(toolsMap['manage-users'])">👥 Users</button>
        <button class="action-chip" @click="go(toolsMap['deploy'])">🚀 Deploy</button>
        <button class="action-chip" @click="go(toolsMap['audit'])">📜 Audit</button>
        <button class="action-chip" @click="go(toolsMap['analytics'])">📈 Analytics</button>
        <button class="action-chip" @click="go(toolsMap['branding'])">🎨 Branding</button>
        <button class="action-chip" @click="go(toolsMap['console'])">🖥️ Console</button>
      </section>

      <!-- Tools grid -->
      <section class="card-section">
        <div class="section-head">
          <h3>Owner / Admin Tools</h3>
          <small class="muted">Admin-only. Routes are guarded in the router.</small>
        </div>

        <div class="tools-grid">
          <component
            v-for="t in tools"
            :key="t.key"
            :is="t._isRoute ? 'RouterLink' : 'a'"
            class="owner-tool-card tool-card"
            :to="t._isRoute ? t.to : undefined"
            :href="!t._isRoute ? (t.path || '#') : undefined"
            @click="closeSidebar"
          >
            <div class="tool-ico">{{ t.icon }}</div>
            <div class="tool-title">{{ t.label }}</div>
            <div class="tool-cap">{{ t.caption }}</div>
          </component>
        </div>
      </section>

      <!-- Placeholder / router note -->
      <section class="info-card">
        <h4>Page: {{ pageTitle }}</h4>
        <p>When owner sub-routes are wired, the target component will render in this view.</p>
      </section>
    </main>

    <!-- Bottom Tab Bar (mobile) -->
    <nav class="tabbar md:hidden" aria-label="Quick nav">
      <RouterLink class="tab" :to="{ path:'/dashboard/owner' }">🏠<span>Home</span></RouterLink>
      <button class="tab" @click="go(toolsMap['manage-users'])">👥<span>Users</span></button>
      <button class="tab fab" @click="go(toolsMap['deploy'])">🚀</button>
      <button class="tab" @click="go(toolsMap['audit'])">📜<span>Audit</span></button>
      <RouterLink class="tab" :to="{ name:'Settings' }">⚙️<span>Settings</span></RouterLink>
    </nav>

    <!-- Footer (desktop) -->
    <footer class="site-footer hidden md:block">
      © {{ new Date().getFullYear() }} SmartBiz SaaS. All rights reserved.
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import logoUrl from '../assets/logo-circle.png'

const router = useRouter()
const route  = useRoute()

// Guard: only owner/admin
onMounted(() => {
  const role = (localStorage.getItem('user_role') || '').toLowerCase()
  if (role !== 'owner' && role !== 'admin') router.replace('/unauthorized')
})

const isSidebarOpen = ref(false)
const currentPath   = ref(route.path)
const pageTitle     = ref('Owner Dashboard')

const kpi = ref({
  totalUsers: 3210,
  activeAdmins: 4,
  revenue: 'TZS 1,450,000',
  uptime: '92%'
})

function toggleSidebar(){ isSidebarOpen.value = !isSidebarOpen.value }
function closeSidebar(){ isSidebarOpen.value = false }

// Route-safe link helper (name first, path fallback)
function link({ key, label, icon, caption, to, path, badge }) {
  let isRoute = false, finalTo
  try {
    if (to?.name && typeof router.hasRoute === 'function' && router.hasRoute(to.name)) {
      isRoute = true
      finalTo = { name: to.name, params: to.params, query: to.query }
    }
    if (!isRoute && (path || to?.path)) {
      const r = router.resolve({ path: path || to.path })
      if (r?.matched?.length) { isRoute = true; finalTo = { path: path || to.path } }
    }
  } catch { isRoute = false }
  return { key, label, icon, caption, to: finalTo, path, _isRoute: isRoute, badge }
}

/* -------- Sidebar groups (owner/admin only) -------- */
const navGroups = [
  {
    title: 'Overview',
    links: [
      { key: 'owner-dash', label: 'Dashboard', icon: '📊', to: { path: '/dashboard/owner' }, path: '/dashboard/owner' },
      { key: 'admin-dash', label: 'Admin Dashboard', icon: '🧭', to: { name: 'DashboardAdmin' }, path: '/dashboard/admin' }
    ]
  },
  {
    title: 'Management',
    links: [
      { key: 'manage-users', label: 'Manage Users', icon: '👥', to: { name: 'ManageUsersView' }, path: '/owner/manage-users' },
      { key: 'team', label: 'Team Management', icon: '🧑‍🤝‍🧑', to: { name: 'TeamManagementView' }, path: '/owner/team-management' },
      { key: 'payouts', label: 'Payouts', icon: '💳', to: { name: 'PayoutAdminView' }, path: '/admin/payouts' },
      { key: 'console', label: 'Owner Console', icon: '🖥️', to: { name: 'SmartOwnerConsole' }, path: '/owner/console' }
    ]
  },
  {
    title: 'Operations',
    links: [
      { key: 'deploy', label: 'Smart Deploy', icon: '🚀', to: { name: 'SmartDeploy' }, path: '/owner/deploy' },
      { key: 'branding', label: 'Branding Settings', icon: '🎨', to: { name: 'Settings' }, path: '/settings' },
      { key: 'analytics', label: 'Analytics (Pro)', icon: '📈', to: { name: 'Analytics' }, path: '/analytics' }
    ]
  },
  {
    title: 'Audit & Compliance',
    links: [
      { key: 'audit', label: 'Audit Log', icon: '📜', to: { name: 'AuditLogView' }, path: '/audit/logs' },
      { key: 'audit-hist', label: 'Audit History', icon: '🗂️', to: { name: 'AuditLogHistory' }, path: '/audit/history' }
    ]
  }
]

/* -------- Tools grid (same destinations) -------- */
const tools = [
  link({ key:'manage-users', label:'Manage Users', icon:'👥', caption:'Invite, suspend, roles', to:{ name:'ManageUsersView' }, path:'/owner/manage-users' }),
  link({ key:'team', label:'Team Management', icon:'🧑‍🤝‍🧑', caption:'Teams & permissions', to:{ name:'TeamManagementView' }, path:'/owner/team-management' }),
  link({ key:'payouts', label:'Payouts', icon:'💳', caption:'Vendors & settlements', to:{ name:'PayoutAdminView' }, path:'/admin/payouts' }),
  link({ key:'console', label:'Owner Console', icon:'🖥️', caption:'System controls', to:{ name:'SmartOwnerConsole' }, path:'/owner/console' }),
  link({ key:'deploy', label:'Smart Deploy', icon:'🚀', caption:'Releases & envs', to:{ name:'SmartDeploy' }, path:'/owner/deploy' }),
  link({ key:'branding', label:'Branding Settings', icon:'🎨', caption:'Logos & theme', to:{ name:'Settings' }, path:'/settings' }),
  link({ key:'analytics', label:'Analytics (Pro)', icon:'📈', caption:'Advanced insights', to:{ name:'Analytics' }, path:'/analytics', badge:'Pro' }),
  link({ key:'audit', label:'Audit Log', icon:'📜', caption:'Events & actions', to:{ name:'AuditLogView' }, path:'/audit/logs' }),
  link({ key:'audit-hist', label:'Audit History', icon:'🗂️', caption:'Exports & archives', to:{ name:'AuditLogHistory' }, path:'/audit/history' }),
  link({ key:'admin-dash', label:'Admin Dashboard', icon:'🧭', caption:'Admin overview', to:{ name:'DashboardAdmin' }, path:'/dashboard/admin' })
]

// Map for quick actions
const toolsMap = computed(() => Object.fromEntries(tools.map(t => [t.key, t])))

/* -------- Navigation helper -------- */
function go(l) {
  const resolved = l._isRoute ? router.resolve(l.to) : router.resolve({ path: l.path || '/dashboard/owner' })
  currentPath.value = resolved.path
  pageTitle.value   = (navGroups.flatMap(g => g.links).find(x => x.key === l.key)?.label) || 'Owner Dashboard'
  if (l._isRoute) router.push(l.to); else router.push(l.path || '/dashboard/owner')
  closeSidebar()
}
</script>

<style scoped>
/* ========== Theme & background ========== */
.owner-shell{
  --bg:#0d1b2a;
  --panel:#1b263b;
  --card:#2b3a53;
  --card-top:#415a77;
  --muted:#a5b4cf;
  --text:#e0e1dd;
  --accent:#f4d160;
  --border:rgba(255,255,255,.08);
  background:
    radial-gradient(1100px 520px at 20% -10%, #1e3a8a22, transparent 60%),
    radial-gradient(900px 460px at 120% 25%, #14b8a622, transparent 60%),
    var(--bg);
  min-height:100dvh;
}

/* ========== App Bar ========== */
.appbar{
  position:sticky; top:0; z-index:40;
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 14px; background:var(--panel);
  border-bottom:1px solid var(--border);
  backdrop-filter: blur(6px) saturate(115%);
}
.brand{ display:flex; align-items:center; gap:10px }
.logo{ width:36px; height:36px; border-radius:999px; border:2px solid var(--accent); background:#fff; object-fit:contain }
.brand-name{ display:none; font-weight:800; color:var(--accent) }
@media (min-width:640px){ .brand-name{ display:inline } }
.appbar-actions{ display:flex; gap:8px }
.icon-btn{
  display:inline-grid; place-items:center; width:36px; height:36px;
  border-radius:10px; border:1px solid var(--border);
  background:linear-gradient(180deg, #2b3a53, #1c2740);
  color:#ffd166; font-size:18px;
  transition:transform .15s ease, box-shadow .2s ease;
}
.icon-btn:active{ transform:scale(.96) }

/* ========== Sidebar ========== */
.sidebar{
  position:fixed; inset:0 auto 0 0; width:264px; z-index:50;
  background:var(--panel); color:var(--text);
  transform:translateX(0); transition:transform .28s ease;
  border-right:1px solid var(--border);
  padding:64px 14px 14px;
}
.sidebar--hidden{ transform:translateX(-100%) }
@media (min-width:768px){ .sidebar--hidden{ transform:translateX(0) } }
.overlay{
  position:fixed; inset:0; background:#0006; backdrop-filter:blur(2px); z-index:45;
}

.side-nav{ display:grid; gap:14px }
.side-title{
  margin:6px 4px; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted)
}
.side-list{ display:grid; gap:8px }
.side-item{
  display:flex; align-items:center; gap:10px;
  padding:10px 12px; border-radius:12px;
  background:linear-gradient(180deg, var(--card-top), var(--card));
  border:1px solid var(--border);
  transition:transform .14s ease, background .2s ease, box-shadow .2s ease;
  cursor:pointer;
}
.side-item:hover{ transform:translateX(4px) }
.side-item.is-active{
  background:linear-gradient(180deg, #f4d160, #f1c24a);
  color:#0b1220; font-weight:800; box-shadow:0 10px 28px -16px #f4d16080;
}
.badge{ font-size:10px; padding:2px 6px; border-radius:999px; background:#0003 }

/* ========== Main ========== */
.content{ padding:14px; padding-bottom:92px; }
@media (min-width:768px){ .content{ margin-left:264px; padding-bottom:24px } }

.content-head{
  display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px;
}
.page-title{ font-weight:800; font-size:20px; color:var(--accent); letter-spacing:.2px }
.panel-chip{
  display:inline-block; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:800;
  background:#f59e0b1a; color:#f4d160; border:1px solid #f4d16033;
}

/* KPI carousel (mobile) */
.kpi-wrap{ margin-top:6px }
.kpi-carousel{
  display:flex; gap:10px; overflow:auto; scroll-snap-type:x mandatory; padding-bottom:4px;
}
.kpi-carousel::-webkit-scrollbar{ height:8px }
.kpi-carousel::-webkit-scrollbar-thumb{ background:#0ea5aacc; border-radius:999px; border:2px solid var(--bg) }
.kpi-card{
  min-width:180px; scroll-snap-align:start;
  background:linear-gradient(180deg, var(--card-top), var(--card));
  border:1px solid var(--border); border-radius:16px; padding:14px; text-align:center;
  box-shadow:0 8px 22px -16px #000;
}
.kpi-card h3{ font-size:20px; font-weight:800; color:#fff }
.kpi-card p{ color:#cbd5e1; font-size:12px }

/* KPI grid (desktop) */
.kpi-grid{
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap:14px; margin-top:4px;
}
.kpi-grid .kpi-card{ min-width:auto }

/* Actions (chips) */
.actions{
  display:flex; gap:8px; overflow:auto; padding:12px 2px 2px; margin-top:10px;
}
.action-chip{
  border:1px solid var(--border); background:#f9fafb0f; color:#e2e8f0;
  border-radius:999px; padding:8px 12px; font-weight:700; font-size:13px;
  transition:transform .12s ease, background .2s ease;
}
.action-chip:active{ transform:scale(.98) }

/* Tools */
.card-section{ margin-top:12px; background:var(--panel); border:1px solid var(--border); border-radius:16px; padding:14px; box-shadow:0 12px 28px -22px #000 }
.section-head{ display:flex; align-items:end; justify-content:space-between; margin-bottom:10px }
.section-head h3{ font-weight:800; font-size:16px }
.muted{ color:#9fb1ca; font-size:12px }

.tools-grid{
  display:grid; gap:10px;
  grid-template-columns: repeat(2, minmax(0,1fr));
}
@media (min-width:640px){ .tools-grid{ grid-template-columns: repeat(3, minmax(0,1fr)) } }
@media (min-width:1024px){ .tools-grid{ grid-template-columns: repeat(4, minmax(0,1fr)) } }

.tool-card{
  position:relative; overflow:hidden; border:1px solid var(--border);
  background:linear-gradient(180deg, #3b4d6dcc, #2a364dcc);
  border-radius:16px; padding:12px; display:flex; flex-direction:column; gap:6px;
  transition:transform .16s ease, box-shadow .2s ease;
  isolation:isolate;
}
.tool-card::before{
  content:""; position:absolute; inset:-40% -40%;
  background:conic-gradient(from 180deg at 50% 50%, transparent, #ffffff12, transparent 30%);
  animation:sweep 3.6s linear infinite; pointer-events:none;
}
.tool-card:hover{ transform:translateY(-2px); box-shadow:0 18px 36px -18px #000 }
.tool-card:hover::before{ animation-duration:1.2s }
.tool-ico{ font-size:22px }
.tool-title{ font-weight:800 }
.tool-cap{ font-size:12px; color:#cdd1d6 }

/* Info card */
.info-card{
  margin-top:12px; background:var(--panel); border:1px solid var(--border); border-radius:16px; padding:14px;
}
.info-card h4{ font-weight:800; color:#f4d160; margin-bottom:6px }

/* Bottom Tab Bar */
.tabbar{
  position:fixed; left:0; right:0; bottom:0; z-index:35;
  display:grid; grid-template-columns:repeat(5,1fr); gap:6px; padding:8px 10px;
  background:linear-gradient(180deg, rgba(27,38,59,.9), rgba(13,27,42,.95));
  border-top:1px solid var(--border); backdrop-filter:blur(10px);
}
.tab{
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px;
  color:#e2e8f0; font-size:18px;
}
.tab span{ font-size:10px }
.fab{
  width:54px; height:54px; margin-top:-22px; border-radius:16px;
  background:linear-gradient(180deg, #f4d160, #edc14a); color:#0b1220; font-size:24px; box-shadow:0 18px 34px -18px #f4d160aa;
}

/* Desktop footer */
.site-footer{
  margin-left:264px; padding:10px 14px; text-align:center; color:#cbd5e1; background:var(--panel);
  border-top:1px solid var(--border)
}

/* Animation */
@keyframes sweep{ to{ transform:rotate(360deg) } }
</style>
