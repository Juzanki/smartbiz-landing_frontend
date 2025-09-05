<template>
  <div class="mu-shell min-h-screen px-4 py-5 md:px-6">
    <!-- Header -->
    <header class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 grid place-items-center text-white shadow-md">👥</div>
        <div>
          <h1 class="text-xl font-extrabold text-slate-900 md:text-2xl">Manage Users</h1>
          <p class="text-slate-500 text-sm">Invite, change roles, suspend, or delete users.</p>
        </div>
      </div>

      <!-- Search -->
      <label class="relative w-full md:w-[360px]">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M13.036 14.45a7 7 0 1 1 1.414-1.414l3.258 3.257a1 1 0 0 1-1.414 1.415l-3.258-3.258ZM14 9a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z" clip-rule="evenodd"/>
        </svg>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search by name or email…"
          class="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-[15px] shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          aria-label="Search users"
        />
      </label>
    </header>

    <!-- Quick stats -->
    <section class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
      <div class="mu-stat">
        <div class="mu-stat-val">{{ users.length }}</div>
        <div class="mu-stat-label">Total</div>
      </div>
      <div class="mu-stat">
        <div class="mu-stat-val">{{ counts.active }}</div>
        <div class="mu-stat-label">Active</div>
      </div>
      <div class="mu-stat">
        <div class="mu-stat-val">{{ counts.suspended }}</div>
        <div class="mu-stat-label">Suspended</div>
      </div>
      <div class="mu-stat">
        <div class="mu-stat-val">{{ counts.owner }}</div>
        <div class="mu-stat-label">Owners</div>
      </div>
      <div class="mu-stat">
        <div class="mu-stat-val">{{ counts.admin }}</div>
        <div class="mu-stat-label">Admins</div>
      </div>
      <div class="mu-stat">
        <div class="mu-stat-val">{{ counts.user }}</div>
        <div class="mu-stat-label">Users</div>
      </div>
    </section>

    <!-- Filters -->
    <section class="mt-4 space-y-2">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-slate-600">Filters</h2>
        <button v-if="hasAnyFilter" @click="resetFilters" class="text-xs font-medium text-blue-700 hover:underline">Reset</button>
      </div>

      <div class="flex gap-2 overflow-auto pb-1">
        <button v-for="r in roleOptions" :key="r.key" @click="roleFilter = r.key"
          :class="['mu-chip', roleFilter === r.key && 'mu-chip--active']">
          <span class="mr-1">{{ r.emoji }}</span>{{ r.label }}
        </button>
      </div>

      <div class="flex gap-2 overflow-auto pb-1">
        <button v-for="s in statusOptions" :key="s.key" @click="statusFilter = s.key"
          :class="['mu-chip', statusFilter === s.key && 'mu-chip--active']">
          <span class="mr-1">{{ s.emoji }}</span>{{ s.label }}
        </button>
      </div>
    </section>

    <!-- Mobile list (cards) -->
    <section class="md:hidden mt-4 space-y-3">
      <article v-for="u in pagedUsers" :key="u.id" class="mu-card">
        <div class="flex items-center gap-3">
          <div :class="['mu-avatar', avatarHue(u.full_name)]">{{ initials(u.full_name) }}</div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="truncate font-semibold text-slate-900">{{ u.full_name }}</h3>
              <span :class="['mu-badge', roleClass(u.role)]">{{ u.role }}</span>
            </div>
            <p class="truncate text-sm text-slate-500">{{ u.email }}</p>
            <div class="mt-1 flex items-center gap-2 text-xs">
              <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full', u.is_active ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700']">
                <span :class="['h-1.5 w-1.5 rounded-full', u.is_active ? 'bg-green-500' : 'bg-rose-500']"></span>
                {{ u.is_active ? 'Active' : 'Suspended' }}
              </span>
            </div>
          </div>

          <!-- Actions menu -->
          <div class="ml-auto relative">
            <button @click="toggleMenu(u.id)" class="mu-icon-btn" aria-label="Open user actions">⋯</button>
            <div v-if="openMenuId === u.id" class="mu-menu" @click.outside="openMenuId = null">
              <button @click="viewUser(u)">View</button>
              <button @click="editRole(u)">Edit Role</button>
              <button @click="toggleSuspend(u)">{{ u.is_active ? 'Suspend' : 'Unsuspend' }}</button>
              <button class="!text-rose-600" @click="deleteUser(u)">Delete</button>
            </div>
          </div>
        </div>
      </article>

      <!-- Load more -->
      <div v-if="hasMore" class="mt-2 grid">
        <button @click="page++" class="rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
          Load more
        </button>
      </div>

      <p v-if="!loading && pagedUsers.length === 0" class="text-center text-slate-500 py-6">No users found.</p>
      <p v-if="loading" class="text-center text-slate-400 py-6">Loading…</p>
    </section>

    <!-- Desktop table -->
    <section class="mt-5 hidden md:block">
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="px-4 py-3 text-left w-14">#</th>
              <th class="px-4 py-3 text-left cursor-pointer select-none" @click="toggleSort('full_name')">
                Full Name <SortIcon :active="sortKey==='full_name'" :dir="sortDir"/>
              </th>
              <th class="px-4 py-3 text-left cursor-pointer select-none" @click="toggleSort('email')">
                Email <SortIcon :active="sortKey==='email'" :dir="sortDir"/>
              </th>
              <th class="px-4 py-3 text-left">Role</th>
              <th class="px-4 py-3 text-left">Status</th>
              <th class="px-4 py-3 text-right pr-5">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(u, idx) in pagedUsersDesktop" :key="u.id" class="border-t border-slate-100 hover:bg-slate-50/70">
              <td class="px-4 py-3 text-slate-500">{{ idx + 1 + (pageDesktop-1)*pageSizeDesktop }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div :class="['mu-avatar', avatarHue(u.full_name)]">{{ initials(u.full_name) }}</div>
                  <div>
                    <div class="font-semibold text-slate-900">{{ u.full_name }}</div>
                    <div class="text-xs text-slate-500">ID: {{ u.id }}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-slate-700">{{ u.email }}</td>
              <td class="px-4 py-3">
                <span :class="['mu-badge', roleClass(u.role)]">{{ u.role }}</span>
              </td>
              <td class="px-4 py-3">
                <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs', u.is_active ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700']">
                  <span :class="['h-1.5 w-1.5 rounded-full', u.is_active ? 'bg-green-500' : 'bg-rose-500']"></span>
                  {{ u.is_active ? 'Active' : 'Suspended' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="inline-flex gap-2">
                  <button class="mu-btn" @click="viewUser(u)">View</button>
                  <button class="mu-btn" @click="editRole(u)">Edit Role</button>
                  <button class="mu-btn" :class="u.is_active ? 'mu-btn--warn' : 'mu-btn--ok'" @click="toggleSuspend(u)">
                    {{ u.is_active ? 'Suspend' : 'Unsuspend' }}
                  </button>
                  <button class="mu-btn mu-btn--danger" @click="deleteUser(u)">Delete</button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && pagedUsersDesktop.length === 0">
              <td colspan="6" class="px-4 py-6 text-center text-slate-500">No users found.</td>
            </tr>
            <tr v-if="loading">
              <td colspan="6" class="px-4 py-6 text-center text-slate-400">Loading…</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Desktop pagination -->
      <div v-if="totalDesktopPages > 1" class="mt-3 flex items-center justify-between text-sm">
        <span class="text-slate-500">Page {{ pageDesktop }} of {{ totalDesktopPages }}</span>
        <div class="flex gap-2">
          <button class="mu-pg" :disabled="pageDesktop===1" @click="pageDesktop--">Prev</button>
          <button class="mu-pg" :disabled="pageDesktop===totalDesktopPages" @click="pageDesktop++">Next</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toastification'

/* ---------- Small helper component for sort chevron ---------- */
const SortIcon = {
  props: { active: Boolean, dir: { type: String, default: 'asc' } },
  template: `
    <span class="inline-block ml-1 align-middle text-xs text-slate-400" aria-hidden="true">
      <span v-if="active && dir==='asc'">▲</span>
      <span v-else-if="active && dir==='desc'">▼</span>
    </span>`
}

const toast = useToast()
const users = ref([])
const loading = ref(false)
const openMenuId = ref(null)

const searchQuery = ref('')
const roleFilter = ref('all')
const statusFilter = ref('all')

const sortKey = ref('full_name')
const sortDir = ref('asc')

/* Pagination: mobile (infinite style) */
const page = ref(1)
const pageSize = 10
const hasMore = computed(() => page.value * pageSize < filteredAndSorted.value.length)

/* Pagination: desktop */
const pageDesktop = ref(1)
const pageSizeDesktop = 12
const totalDesktopPages = computed(() => Math.max(1, Math.ceil(filteredAndSorted.value.length / pageSizeDesktop)))

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` })

onMounted(fetchUsers)

async function fetchUsers () {
  loading.value = true
  try {
    const res = await axios.get(`${API_BASE}/admin/users`, { headers: authHeader() })
    users.value = Array.isArray(res.data) ? res.data : []
  } catch (err) {
    toast.error(err?.response?.data?.detail ?? 'Failed to load users.')
  } finally {
    loading.value = false
  }
}

/* ---- Filters ---- */
const roleOptions = [
  { key: 'all', label: 'All Roles', emoji: '🎭' },
  { key: 'owner', label: 'Owner', emoji: '👑' },
  { key: 'admin', label: 'Admin', emoji: '🛡️' },
  { key: 'user', label: 'User', emoji: '👤' }
]
const statusOptions = [
  { key: 'all', label: 'All Status', emoji: '⚪' },
  { key: 'active', label: 'Active', emoji: '🟢' },
  { key: 'suspended', label: 'Suspended', emoji: '🔴' }
]
const hasAnyFilter = computed(() => roleFilter.value !== 'all' || statusFilter.value !== 'all' || searchQuery.value.trim() !== '')
function resetFilters () {
  roleFilter.value = 'all'
  statusFilter.value = 'all'
  searchQuery.value = ''
}

/* ---- Derived lists ---- */
const filteredAndSorted = computed(() => {
  let list = users.value.slice()

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    )
  }
  if (roleFilter.value !== 'all') {
    list = list.filter(u => (u.role || '').toLowerCase() === roleFilter.value)
  }
  if (statusFilter.value !== 'all') {
    const wantActive = statusFilter.value === 'active'
    list = list.filter(u => !!u.is_active === wantActive)
  }

  list.sort((a, b) => {
    const va = (a[sortKey.value] || '').toString().toLowerCase()
    const vb = (b[sortKey.value] || '').toString().toLowerCase()
    if (va < vb) return sortDir.value === 'asc' ? -1 : 1
    if (va > vb) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })
  return list
})

const pagedUsers = computed(() =>
  filteredAndSorted.value.slice(0, page.value * pageSize)
)
const pagedUsersDesktop = computed(() => {
  const start = (pageDesktop.value - 1) * pageSizeDesktop
  return filteredAndSorted.value.slice(start, start + pageSizeDesktop)
})

/* ---- Counters ---- */
const counts = computed(() => {
  const c = { active: 0, suspended: 0, owner: 0, admin: 0, user: 0 }
  for (const u of users.value) {
    if (u.is_active) c.active++; else c.suspended++
    const r = (u.role || '').toLowerCase()
    if (r === 'owner') c.owner++
    else if (r === 'admin') c.admin++
    else c.user++
  }
  return c
})

/* ---- Actions ---- */
function toggleMenu (id) {
  openMenuId.value = openMenuId.value === id ? null : id
}
function initials (name = '') {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase()).join('') || 'U'
}
function avatarHue (seed = '') {
  // simple hash -> 6 hues
  const hash = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0)
  const bucket = hash % 6
  const map = ['bg-indigo-100 text-indigo-700', 'bg-blue-100 text-blue-700', 'bg-teal-100 text-teal-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700']
  return map[bucket]
}
function roleClass (role = '') {
  const r = role.toLowerCase()
  if (r === 'owner') return 'bg-purple-100 text-purple-700'
  if (r === 'admin') return 'bg-blue-100 text-blue-700'
  return 'bg-slate-100 text-slate-700'
}

function toggleSort (key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function viewUser (u) {
  openMenuId.value = null
  // Plug your details route here if available
  toast.info(`Viewing profile: ${u.full_name}`)
}

async function editRole (u) {
  openMenuId.value = null
  const current = (u.role || '').toLowerCase()
  const newRole = prompt(`Change role for ${u.full_name} (user/admin/owner):`, current)
  if (!newRole) return
  const role = newRole.trim().toLowerCase()
  if (!['user', 'admin', 'owner'].includes(role)) {
    toast.warning('Invalid role. Use: user, admin, or owner.')
    return
  }
  try {
    await axios.put(`${API_BASE}/admin/users/${u.id}`, { role }, { headers: authHeader() })
    toast.success('Role updated.')
    await fetchUsers()
  } catch (err) {
    toast.error(err?.response?.data?.detail ?? 'Failed to update role.')
  }
}

async function toggleSuspend (u) {
  openMenuId.value = null
  const next = !u.is_active
  const verb = next ? 'unsuspend' : 'suspend'
  if (!confirm(`Are you sure you want to ${verb} ${u.full_name}?`)) return
  try {
    await axios.put(`${API_BASE}/admin/users/${u.id}`, { is_active: next }, { headers: authHeader() })
    toast.success(next ? 'User reactivated.' : 'User suspended.')
    // optimistic update
    u.is_active = next
  } catch (err) {
    toast.error(err?.response?.data?.detail ?? `Failed to ${verb} user.`)
  }
}

async function deleteUser (u) {
  openMenuId.value = null
  if (!confirm(`Permanently delete ${u.full_name}? This cannot be undone.`)) return
  try {
    await axios.delete(`${API_BASE}/admin/users/${u.id}`, { headers: authHeader() })
    toast.success('User deleted.')
    users.value = users.value.filter(x => x.id !== u.id)
  } catch (err) {
    toast.error(err?.response?.data?.detail ?? 'Failed to delete user.')
  }
}
</script>

<style scoped>
/* Page background with subtle radial lights */
.mu-shell{
  background:
    radial-gradient(900px 450px at -10% -20%, rgba(99,102,241,.08), transparent 60%),
    radial-gradient(700px 400px at 110% 10%, rgba(56,189,248,.08), transparent 60%),
    #f7fafc;
}

/* Stats */
.mu-stat{
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e6eaf0;
  border-radius: 16px;
  padding: 12px;
  text-align: center;
  box-shadow: 0 8px 20px -16px rgba(0,0,0,.25);
}
.mu-stat-val{ font-weight: 800; font-size: 18px; color:#0f172a }
.mu-stat-label{ font-size: 11px; color:#64748b }

/* Chips */
.mu-chip{
  border:1px solid #e5e7eb;
  background:#fff;
  color:#0f172a;
  padding:.45rem .8rem;
  border-radius:999px;
  font-size:.8rem;
  font-weight:700;
  white-space:nowrap;
  transition:.2s ease;
}
.mu-chip--active{
  border-color:#3b82f6;
  background:#eff6ff;
  color:#1d4ed8;
  box-shadow:0 6px 18px -12px rgba(59,130,246,.5);
}

/* Cards */
.mu-card{
  border:1px solid #e7e9ef;
  border-radius:16px;
  background:linear-gradient(180deg, #ffffff, #fbfdff);
  padding:12px;
  box-shadow:0 10px 24px -20px rgba(0,0,0,.35);
}
.mu-avatar{
  height:40px; width:40px;
  border-radius:12px;
  display:grid; place-items:center;
  font-weight:800;
  letter-spacing:.5px;
}

/* Badges & buttons */
.mu-badge{
  display:inline-flex; align-items:center;
  font-size:.72rem; font-weight:800;
  padding:.2rem .5rem; border-radius:999px;
  text-transform:uppercase; letter-spacing:.4px;
}

.mu-btn{
  border:1px solid #e5e7eb; background:#fff; color:#0f172a;
  padding:.4rem .65rem; border-radius:.6rem;
  font-weight:700; font-size:.78rem;
  transition:.2s ease; box-shadow:0 6px 18px -16px rgba(0,0,0,.25);
}
.mu-btn:hover{ transform:translateY(-1px); background:#f8fafc }
.mu-btn--warn{ color:#b45309; border-color:#f59e0b; background:#fffbeb }
.mu-btn--ok{ color:#065f46; border-color:#10b981; background:#ecfdf5 }
.mu-btn--danger{ color:#b91c1c; border-color:#fca5a5; background:#fef2f2 }

.mu-icon-btn{
  height:34px; width:34px;
  border-radius:10px; background:#fff; border:1px solid #e5e7eb;
  display:grid; place-items:center; font-weight:800;
  box-shadow:0 8px 20px -16px rgba(0,0,0,.3);
}
.mu-icon-btn:hover{ background:#f8fafc }

/* Pop menu */
.mu-menu{
  position:absolute; right:0; top:42px;
  min-width:170px; background:#fff; border:1px solid #e5e7eb; border-radius:12px;
  box-shadow:0 20px 40px -24px rgba(0,0,0,.3);
  display:flex; flex-direction:column; padding:6px;
  z-index:50;
}
.mu-menu button{
  text-align:left; padding:.55rem .6rem; border-radius:8px; font-size:.86rem; font-weight:700; color:#0f172a;
}
.mu-menu button:hover{ background:#f1f5f9 }

/* Pagination buttons */
.mu-pg{
  border:1px solid #e5e7eb; background:#fff; color:#0f172a;
  padding:.4rem .7rem; border-radius:.6rem; font-weight:700;
}
.mu-pg:disabled{ opacity:.5; cursor:not-allowed }
</style>
