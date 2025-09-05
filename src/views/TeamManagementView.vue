<template>
  <div class="tm-shell min-h-screen px-4 py-5 md:px-6">
    <!-- Header -->
    <header class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 grid place-items-center text-white shadow-md">👥</div>
        <div>
          <h1 class="text-xl font-extrabold text-slate-900 md:text-2xl">Team Management</h1>
          <p class="text-slate-500 text-sm">Add teammates, set roles, approve or pause access.</p>
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
          aria-label="Search team"
        />
      </label>
    </header>

    <!-- Filters -->
    <section class="mt-4 space-y-2">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-slate-600">Filters</h2>
        <button v-if="hasAnyFilter" @click="resetFilters" class="text-xs font-medium text-blue-700 hover:underline">Reset</button>
      </div>

      <div class="flex gap-2 overflow-auto pb-1">
        <button v-for="r in roleOptions" :key="r.key" @click="roleFilter = r.key" :class="['tm-chip', roleFilter === r.key && 'tm-chip--active']">
          <span class="mr-1">{{ r.emoji }}</span>{{ r.label }}
        </button>
      </div>

      <div class="flex gap-2 overflow-auto pb-1">
        <button v-for="s in statusOptions" :key="s.key" @click="statusFilter = s.key" :class="['tm-chip', statusFilter === s.key && 'tm-chip--active']">
          <span class="mr-1">{{ s.emoji }}</span>{{ s.label }}
        </button>
      </div>
    </section>

    <!-- Mobile list -->
    <section class="mt-4 space-y-3 md:hidden">
      <article v-for="m in filtered" :key="m.id" class="tm-card">
        <div class="flex items-center gap-3">
          <div :class="['tm-avatar', avatarHue(m.fullName)]">{{ initials(m.fullName) }}</div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="truncate font-semibold text-slate-900">{{ m.fullName }}</h3>
              <span :class="['tm-badge', roleClass(m.role)]">{{ m.role }}</span>
            </div>
            <p class="truncate text-sm text-slate-500">{{ m.email }}</p>
            <div class="mt-1">
              <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs', m.active ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700']">
                <span :class="['h-1.5 w-1.5 rounded-full', m.active ? 'bg-green-500' : 'bg-amber-500']"></span>
                {{ m.active ? 'Active' : 'Pending' }}
              </span>
            </div>
          </div>
        </div>

        <div class="mt-3 grid grid-cols-3 gap-2">
          <button class="tm-btn" @click="editStaff(m)">Edit</button>
          <button class="tm-btn" :class="m.active ? 'tm-btn--warn' : 'tm-btn--ok'" @click="toggleActive(m)">
            {{ m.active ? 'Pause' : 'Activate' }}
          </button>
          <button class="tm-btn tm-btn--danger" @click="removeStaff(m.id)">Remove</button>
        </div>
      </article>

      <p v-if="!loading && filtered.length === 0" class="text-center text-slate-500 py-6">No team members.</p>
      <p v-if="loading" class="text-center text-slate-400 py-6">Loading…</p>
    </section>

    <!-- Desktop table -->
    <section class="mt-5 hidden md:block">
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="px-4 py-3 text-left">Name</th>
              <th class="px-4 py-3 text-left">Email</th>
              <th class="px-4 py-3 text-left">Role</th>
              <th class="px-4 py-3 text-left">Status</th>
              <th class="px-4 py-3 text-right pr-5">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in filtered" :key="m.id" class="border-t border-slate-100 hover:bg-slate-50/70">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div :class="['tm-avatar', avatarHue(m.fullName)]">{{ initials(m.fullName) }}</div>
                  <div class="font-semibold text-slate-900">{{ m.fullName }}</div>
                </div>
              </td>
              <td class="px-4 py-3 text-slate-700">{{ m.email }}</td>
              <td class="px-4 py-3"><span :class="['tm-badge', roleClass(m.role)]">{{ m.role }}</span></td>
              <td class="px-4 py-3">
                <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs', m.active ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700']">
                  <span :class="['h-1.5 w-1.5 rounded-full', m.active ? 'bg-green-500' : 'bg-amber-500']"></span>
                  {{ m.active ? 'Active' : 'Pending' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="inline-flex gap-2">
                  <button class="tm-btn" @click="editStaff(m)">Edit</button>
                  <button class="tm-btn" :class="m.active ? 'tm-btn--warn' : 'tm-btn--ok'" @click="toggleActive(m)">
                    {{ m.active ? 'Pause' : 'Activate' }}
                  </button>
                  <button class="tm-btn tm-btn--danger" @click="removeStaff(m.id)">Remove</button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && filtered.length === 0">
              <td colspan="5" class="px-4 py-6 text-center text-slate-500">No team members.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- FAB (mobile) -->
    <button class="tm-fab md:hidden" @click="openCreate">➕</button>

    <!-- Add/Edit Sheet / Modal -->
    <transition name="sheet">
      <div v-if="showModal" class="tm-overlay" @click.self="closeModal">
        <div class="tm-sheet">
          <header class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-extrabold text-slate-900">{{ isEditing ? 'Edit Staff' : 'Add Staff Member' }}</h3>
            <button class="tm-icon" @click="closeModal">✕</button>
          </header>

          <form @submit.prevent="handleSave" class="space-y-3">
            <div>
              <label class="tm-label">Full Name</label>
              <input v-model.trim="form.fullName" type="text" class="tm-input" required />
              <p v-if="errors.fullName" class="tm-err">{{ errors.fullName }}</p>
            </div>

            <div>
              <label class="tm-label">Email</label>
              <input v-model.trim="form.email" type="email" class="tm-input" required />
              <p v-if="errors.email" class="tm-err">{{ errors.email }}</p>
            </div>

            <div>
              <label class="tm-label">Role</label>
              <select v-model="form.role" class="tm-input">
                <option value="viewer">Viewer</option>
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <div class="flex items-center gap-2">
              <input id="invite" type="checkbox" v-model="form.sendInvite" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <label for="invite" class="text-sm text-slate-700">Send invite email</label>
            </div>

            <div class="flex items-center gap-2">
              <input id="active" type="checkbox" v-model="form.active" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <label for="active" class="text-sm text-slate-700">Active immediately</label>
            </div>

            <div class="pt-2 grid">
              <button :disabled="saving" class="tm-primary">
                <span v-if="saving">Saving…</span>
                <span v-else>💾 Save</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toastification'

const toast = useToast()

/* -------- State -------- */
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const isEditing = ref(false)
const staffList = ref([])

const searchQuery = ref('')
const roleFilter = ref('all')
const statusFilter = ref('all')

const form = ref({
  id: null,
  fullName: '',
  email: '',
  role: 'viewer',
  active: true,
  sendInvite: true
})
const errors = ref({})

/* -------- API -------- */
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'
const TEAM_URL = `${API_BASE}/api/team`
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')}` })

onMounted(fetchStaff)

async function fetchStaff () {
  loading.value = true
  try {
    const res = await axios.get(TEAM_URL, { headers: authHeader() })
    staffList.value = Array.isArray(res.data) ? res.data : []
  } catch (e) {
    toast.error(e?.response?.data?.detail ?? 'Failed to load team.')
  } finally {
    loading.value = false
  }
}

/* -------- Derived -------- */
const roleOptions = [
  { key: 'all', label: 'All Roles', emoji: '🎭' },
  { key: 'viewer', label: 'Viewer', emoji: '👀' },
  { key: 'agent', label: 'Agent', emoji: '🎧' },
  { key: 'manager', label: 'Manager', emoji: '🧑‍💼' }
]
const statusOptions = [
  { key: 'all', label: 'All Status', emoji: '⚪' },
  { key: 'active', label: 'Active', emoji: '🟢' },
  { key: 'pending', label: 'Pending', emoji: '🟡' }
]
const hasAnyFilter = computed(() => roleFilter.value !== 'all' || statusFilter.value !== 'all' || searchQuery.value.trim() !== '')

const filtered = computed(() => {
  let list = staffList.value.slice()
  const q = searchQuery.value.trim().toLowerCase()
  if (q) list = list.filter(s => s.fullName?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q))
  if (roleFilter.value !== 'all') list = list.filter(s => (s.role || '').toLowerCase() === roleFilter.value)
  if (statusFilter.value !== 'all') {
    const wantActive = statusFilter.value === 'active'
    list = list.filter(s => !!s.active === wantActive)
  }
  return list
})

/* -------- Helpers -------- */
function resetFilters () {
  roleFilter.value = 'all'
  statusFilter.value = 'all'
  searchQuery.value = ''
}
function initials (name = '') {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase()).join('') || 'T'
}
function avatarHue (seed = '') {
  const hash = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0)
  const bucket = hash % 6
  const map = ['bg-indigo-100 text-indigo-700','bg-blue-100 text-blue-700','bg-teal-100 text-teal-700','bg-emerald-100 text-emerald-700','bg-amber-100 text-amber-700','bg-rose-100 text-rose-700']
  return map[bucket]
}
function roleClass (role = '') {
  const r = role.toLowerCase()
  if (r === 'manager') return 'bg-purple-100 text-purple-700'
  if (r === 'agent') return 'bg-blue-100 text-blue-700'
  return 'bg-slate-100 text-slate-700'
}

/* -------- CRUD -------- */
function openCreate () {
  isEditing.value = false
  showModal.value = true
  errors.value = {}
  form.value = { id: null, fullName: '', email: '', role: 'viewer', active: true, sendInvite: true }
}
function editStaff (s) {
  isEditing.value = true
  showModal.value = true
  errors.value = {}
  form.value = { id: s.id, fullName: s.fullName, email: s.email, role: s.role, active: !!s.active, sendInvite: false }
}
function closeModal () {
  showModal.value = false
}

function validate () {
  const e = {}
  if (!form.value.fullName.trim()) e.fullName = 'Full name is required.'
  if (!/^\S+@\S+\.\S+$/.test(form.value.email)) e.email = 'Enter a valid email.'
  errors.value = e
  return Object.keys(e).length === 0
}

async function handleSave () {
  if (!validate()) return
  saving.value = true
  try {
    const payload = { ...form.value }
    if (isEditing.value) {
      await axios.put(`${TEAM_URL}/${payload.id}`, payload, { headers: authHeader() })
      toast.success('Staff updated.')
    } else {
      await axios.post(TEAM_URL, payload, { headers: authHeader() })
      toast.success('Staff added.')
    }
    await fetchStaff()
    closeModal()
  } catch (e) {
    toast.error(e?.response?.data?.detail ?? 'Failed to save.')
  } finally {
    saving.value = false
  }
}

async function removeStaff (id) {
  if (!confirm('Remove this staff member?')) return
  try {
    await axios.delete(`${TEAM_URL}/${id}`, { headers: authHeader() })
    toast.success('Removed.')
    staffList.value = staffList.value.filter(x => x.id !== id)
  } catch (e) {
    toast.error(e?.response?.data?.detail ?? 'Failed to remove.')
  }
}

async function toggleActive (s) {
  const next = !s.active
  try {
    await axios.patch(`${TEAM_URL}/${s.id}`, { active: next }, { headers: authHeader() })
    s.active = next // optimistic
    toast.success(next ? 'Activated.' : 'Paused.')
  } catch (e) {
    toast.error('Failed to update status.')
  }
}
</script>

<style scoped>
/* Page bg with gentle lights */
.tm-shell{
  background:
    radial-gradient(900px 450px at -10% -20%, rgba(99,102,241,.08), transparent 60%),
    radial-gradient(700px 400px at 110% 10%, rgba(56,189,248,.08), transparent 60%),
    #f7fafc;
}

/* Chips */
.tm-chip{
  border:1px solid #e5e7eb; background:#fff; color:#0f172a;
  padding:.45rem .8rem; border-radius:999px; font-size:.8rem; font-weight:700; white-space:nowrap; transition:.2s ease;
}
.tm-chip--active{ border-color:#3b82f6; background:#eff6ff; color:#1d4ed8; box-shadow:0 6px 18px -12px rgba(59,130,246,.5) }

/* Cards */
.tm-card{
  border:1px solid #e7e9ef; border-radius:16px; background:linear-gradient(180deg, #ffffff, #fbfdff);
  padding:12px; box-shadow:0 10px 24px -20px rgba(0,0,0,.35);
}
.tm-avatar{
  height:42px; width:42px; border-radius:12px; display:grid; place-items:center; font-weight:800; letter-spacing:.5px;
}

/* Badges & buttons */
.tm-badge{ display:inline-flex; align-items:center; font-size:.72rem; font-weight:800; padding:.2rem .5rem; border-radius:999px; text-transform:uppercase; letter-spacing:.4px }
.tm-btn{
  border:1px solid #e5e7eb; background:#fff; color:#0f172a; padding:.45rem .65rem; border-radius:.6rem; font-weight:700; font-size:.8rem;
  transition:.2s ease; box-shadow:0 6px 18px -16px rgba(0,0,0,.25);
}
.tm-btn:hover{ transform:translateY(-1px); background:#f8fafc }
.tm-btn--warn{ color:#b45309; border-color:#f59e0b; background:#fffbeb }
.tm-btn--ok{ color:#065f46; border-color:#10b981; background:#ecfdf5 }
.tm-btn--danger{ color:#b91c1c; border-color:#fca5a5; background:#fef2f2 }

/* FAB */
.tm-fab{
  position:fixed; right:16px; bottom:16px; height:56px; width:56px; border-radius:16px;
  background:#111827; color:#fff; font-weight:900; box-shadow:0 20px 40px -20px rgba(0,0,0,.4);
}

/* Sheet/Modal */
.tm-overlay{ position:fixed; inset:0; background:rgba(15,23,42,.5); display:grid; place-items:end center; padding:0 0 6px; z-index:50 }
.tm-sheet{
  width:100%; max-width:480px; background:#fff; border-top-left-radius:18px; border-top-right-radius:18px;
  padding:16px; box-shadow:0 -20px 60px -30px rgba(0,0,0,.5);
}
/* desktop centers it */
@media (min-width:768px){ .tm-overlay{ place-items:center } .tm-sheet{ border-radius:18px } }

/* Inputs */
.tm-label{ display:block; font-size:.85rem; font-weight:700; color:#0f172a; margin-bottom:6px }
.tm-input{
  width:100%; border:1px solid #e5e7eb; border-radius:12px; padding:.6rem .8rem; background:#fff;
  font-size:.95rem; outline:none; transition:.15s; box-shadow:0 4px 14px -12px rgba(0,0,0,.2);
}
.tm-input:focus{ border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.15) }
.tm-primary{
  border:1px solid #2563eb; background:#2563eb; color:#fff; padding:.7rem .9rem; border-radius:12px; font-weight:800; box-shadow:0 10px 22px -14px rgba(37,99,235,.6)
}
.tm-primary:disabled{ opacity:.6; cursor:not-allowed }
.tm-icon{ height:36px; width:36px; display:grid; place-items:center; background:#f1f5f9; border-radius:10px; font-weight:900 }

.tm-err{ color:#b91c1c; font-size:.78rem; margin-top:4px }

/* Sheet animation */
.sheet-enter-from, .sheet-leave-to{ transform:translateY(100%); opacity:0 }
.sheet-enter-active, .sheet-leave-active{ transition:all .22s ease }
</style>
