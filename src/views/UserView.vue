<template>
  <div class="min-h-screen" :class="dark ? 'bg-[#0f1320] text-white' : 'bg-gray-100 text-slate-800'">
    <!-- App Bar -->
    <header class="sticky top-0 z-20 backdrop-blur border-b"
            :class="dark ? 'bg-[#0f1320]/70 border-white/10' : 'bg-white/70 border-slate-200'">
      <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <h1 class="text-base sm:text-lg font-semibold">👥 User Management</h1>
        <div class="flex items-center gap-2">
          <button @click="openDrawer('create')"
                  class="px-3 py-1.5 rounded-xl text-xs font-semibold"
                  :class="dark ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30' : 'bg-emerald-600 text-white'">+ Add User</button>
          <button @click="dark=!dark"
                  class="px-3 py-1.5 rounded-xl text-xs"
                  :class="dark ? 'bg-white/10 ring-1 ring-white/15' : 'bg-white ring-1 ring-slate-200'">
            {{ dark ? '☀️' : '🌙' }}
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="max-w-6xl mx-auto px-4 pb-3 grid gap-2 sm:grid-cols-4">
        <div class="relative">
          <input v-model.trim="search"
                 @input="debounceSearch"
                 type="search" inputmode="search" aria-label="Search users"
                 placeholder="Search name or email…"
                 class="w-full rounded-xl pl-9 pr-3 py-2 text-sm"
                 :class="dark ? 'bg-white/5 ring-1 ring-white/15 placeholder:text-white/40' : 'bg-white ring-1 ring-slate-200 placeholder:text-slate-400'"/>
          <span class="absolute left-3 top-1/2 -translate-y-1/2 opacity-60">🔎</span>
        </div>
        <select v-model="roleFilter" class="rounded-xl px-3 py-2 text-sm"
                :class="dark ? 'bg-white/5 ring-1 ring-white/15' : 'bg-white ring-1 ring-slate-200'">
          <option value="">All roles</option>
          <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
        </select>
        <select v-model="statusFilter" class="rounded-xl px-3 py-2 text-sm"
                :class="dark ? 'bg-white/5 ring-1 ring-white/15' : 'bg-white ring-1 ring-slate-200'">
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select v-model="sortBy" class="rounded-xl px-3 py-2 text-sm"
                :class="dark ? 'bg-white/5 ring-1 ring-white/15' : 'bg-white ring-1 ring-slate-200'">
          <option value="recent">Sort: Recent</option>
          <option value="name">Sort: Name A–Z</option>
          <option value="role">Sort: Role A–Z</option>
        </select>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 py-4 space-y-4">
      <!-- Bulk actions (desktop only) -->
      <div v-if="selectedIds.size" class="hidden sm:flex items-center gap-2 text-xs"
           :class="dark ? 'text-white/80' : 'text-slate-600'">
        <span class="font-medium">{{ selectedIds.size }} selected</span>
        <button @click="bulkActivate(true)" class="px-2 py-1 rounded-lg"
                :class="dark ? 'bg-white/10 ring-1 ring-white/15' : 'bg-white ring-1 ring-slate-200'">Activate</button>
        <button @click="bulkActivate(false)" class="px-2 py-1 rounded-lg"
                :class="dark ? 'bg-white/10 ring-1 ring-white/15' : 'bg-white ring-1 ring-slate-200'">Suspend</button>
        <button @click="bulkDelete" class="px-2 py-1 rounded-lg"
                :class="dark ? 'bg-red-500/20 ring-1 ring-red-400/30 text-red-200' : 'bg-red-50 ring-1 ring-red-200 text-red-700'">Delete</button>
      </div>

      <!-- Mobile cards -->
      <section class="grid sm:hidden gap-2">
        <article v-for="u in paged" :key="u.id"
                 class="rounded-2xl p-4 flex items-start justify-between"
                 :class="dark ? 'bg-white/5 ring-1 ring-white/10' : 'bg-white ring-1 ring-slate-200'">
          <div class="flex items-start gap-3 min-w-0">
            <div class="h-10 w-10 rounded-full grid place-items-center text-sm font-semibold"
                 :class="avatarClass(u)">
              {{ initials(u.name) }}
            </div>
            <div class="min-w-0">
              <p class="font-medium truncate">{{ u.name }}</p>
              <p class="text-xs opacity-70 truncate">{{ u.email }}</p>
              <div class="mt-1 flex items-center gap-2 text-xs">
                <span class="px-2 py-0.5 rounded"
                      :class="chipClass(u.role)">{{ u.role }}</span>
                <span class="px-2 py-0.5 rounded"
                      :class="u.active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200' : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200'">
                  {{ u.active ? 'Active' : 'Inactive' }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <button @click="openDrawer('edit', u)" class="text-xs underline opacity-90">Edit</button>
            <button @click="toggleStatus(u)" class="text-xs underline opacity-90">
              {{ u.active ? 'Suspend' : 'Activate' }}
            </button>
            <button @click="removeUser(u.id)" class="text-xs underline opacity-90 text-red-500">Delete</button>
          </div>
        </article>
      </section>

      <!-- Desktop table -->
      <section class="hidden sm:block overflow-x-auto rounded-2xl"
               :class="dark ? 'ring-1 ring-white/10' : 'ring-1 ring-slate-200'">
        <table class="w-full text-sm">
          <thead :class="dark ? 'bg-white/5' : 'bg-slate-50'">
            <tr>
              <th class="p-3 w-10">
                <input type="checkbox" :checked="allPageSelected" @change="toggleSelectAllPage($event)"/>
              </th>
              <th class="p-3 text-left">Name</th>
              <th class="p-3 text-left">Email</th>
              <th class="p-3 text-left">Role</th>
              <th class="p-3 text-left">Status</th>
              <th class="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in paged" :key="u.id"
                :class="dark ? 'border-t border-white/10' : 'border-t border-slate-200'">
              <td class="p-3">
                <input type="checkbox" :checked="selectedIds.has(u.id)" @change="toggleSelect(u.id,$event)"/>
              </td>
              <td class="p-3">
                <div class="flex items-center gap-2">
                  <div class="h-8 w-8 rounded-full grid place-items-center text-xs font-semibold"
                       :class="avatarClass(u)">{{ initials(u.name) }}</div>
                  <div>
                    <div class="font-medium">{{ u.name }}</div>
                    <div class="text-xs opacity-70">ID: {{ u.id }}</div>
                  </div>
                </div>
              </td>
              <td class="p-3">{{ u.email }}</td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded" :class="chipClass(u.role)">{{ u.role }}</span>
              </td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded"
                      :class="u.active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200' : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200'">
                  {{ u.active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="p-3">
                <div class="flex items-center gap-3">
                  <button class="underline opacity-90" @click="viewUser(u)">View</button>
                  <button class="underline opacity-90" @click="openDrawer('edit', u)">Edit</button>
                  <button class="underline opacity-90" @click="toggleStatus(u)">
                    {{ u.active ? 'Suspend' : 'Activate' }}
                  </button>
                  <button class="underline opacity-90 text-red-500" @click="removeUser(u.id)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Pagination -->
      <section class="flex items-center justify-between text-xs">
        <span :class="dark ? 'text-white/70' : 'text-slate-600'">
          Showing {{ startIndex + 1 }}–{{ endIndex }} of {{ filtered.length }}
        </span>
        <div class="flex items-center gap-2">
          <button @click="prevPage" :disabled="page===1"
                  class="px-3 py-1.5 rounded-lg disabled:opacity-40"
                  :class="dark ? 'bg-white/10 ring-1 ring-white/15' : 'bg-white ring-1 ring-slate-200'">Prev</button>
          <span>Page {{ page }} / {{ totalPages || 1 }}</span>
          <button @click="nextPage" :disabled="page===totalPages"
                  class="px-3 py-1.5 rounded-lg disabled:opacity-40"
                  :class="dark ? 'bg-white/10 ring-1 ring-white/15' : 'bg-white ring-1 ring-slate-200'">Next</button>
        </div>
      </section>
    </main>

    <!-- Drawer (Add/Edit) -->
    <div v-if="drawerOpen" class="fixed inset-0 z-30">
      <div class="absolute inset-0 bg-black/50" @click="closeDrawer"></div>
      <aside class="absolute right-0 top-0 h-full w-full sm:w-[420px] p-4 overflow-y-auto"
             :class="dark ? 'bg-[#0f1320] ring-1 ring-white/10' : 'bg-white ring-1 ring-slate-200'">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold">{{ mode==='create' ? 'Add User' : 'Edit User' }}</h3>
          <button @click="closeDrawer" class="opacity-70">✕</button>
        </div>

        <div class="grid gap-3">
          <div>
            <label class="text-xs opacity-70 block mb-1">Full name</label>
            <input v-model.trim="form.name" class="w-full rounded-xl px-3 py-2 text-sm"
                   :class="inputCls"/>
            <p v-if="touched.name && !form.name" class="text-[11px] text-red-500 mt-1">Name is required.</p>
          </div>

          <div>
            <label class="text-xs opacity-70 block mb-1">Email</label>
            <input v-model.trim="form.email" type="email" class="w-full rounded-xl px-3 py-2 text-sm"
                   :class="inputCls"/>
            <p v-if="touched.email && !isEmail(form.email)" class="text-[11px] text-red-500 mt-1">Valid email required.</p>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs opacity-70 block mb-1">Role</label>
              <select v-model="form.role" class="w-full rounded-xl px-3 py-2 text-sm" :class="inputCls">
                <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
              </select>
            </div>
            <div class="flex items-end">
              <label class="inline-flex items-center gap-2 text-xs">
                <input type="checkbox" v-model="form.active" />
                <span>Active</span>
              </label>
            </div>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-2">
          <button @click="closeDrawer" class="px-4 py-2 rounded-xl" :class="ghostBtnCls">Cancel</button>
          <button @click="save" :disabled="!canSave" class="px-4 py-2 rounded-xl text-white disabled:opacity-40 bg-indigo-600">
            {{ mode==='create' ? 'Create' : 'Save changes' }}
          </button>
        </div>
      </aside>
    </div>

    <!-- Toast -->
    <div v-if="toast" class="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl text-sm"
         :class="dark ? 'bg-white/10 ring-1 ring-white/15' : 'bg-slate-900 text-white'">
      {{ toast }}
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

defineOptions({ name: 'UsersView' })

/* ---------- Theme ---------- */
const dark = ref(false)

/* ---------- Data (demo + persistence) ---------- */
const roles = ['Admin','Editor','Viewer']
const list = ref([
  { id: 1, name: 'Jane Doe',  email:'jane@company.com',  role:'Admin',  active:true },
  { id: 2, name: 'John Smith',email:'john@company.com',  role:'Editor', active:false },
  { id: 3, name: 'Linda Brown',email:'linda@company.com',role:'Viewer', active:true },
])
onMounted(() => {
  const saved = JSON.parse(localStorage.getItem('users_demo') || '[]')
  if (saved?.length) list.value = saved
})
function persist(){ localStorage.setItem('users_demo', JSON.stringify(list.value)) }

/* ---------- Filters / Sort / Search ---------- */
const search = ref(''); let searchTimer
const roleFilter = ref('')
const statusFilter = ref('')
const sortBy = ref('recent')

function debounceSearch(){ clearTimeout(searchTimer); searchTimer = setTimeout(()=> search.value = search.value, 250) }

const filtered = computed(() => {
  let arr = [...list.value]
  const q = (search.value || '').toLowerCase()
  if (q) arr = arr.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  if (roleFilter.value) arr = arr.filter(u => u.role === roleFilter.value)
  if (statusFilter.value) arr = arr.filter(u => statusFilter.value === 'active' ? u.active : !u.active)
  if (sortBy.value==='name') arr.sort((a,b)=> a.name.localeCompare(b.name))
  else if (sortBy.value==='role') arr.sort((a,b)=> a.role.localeCompare(b.role))
  else arr.sort((a,b)=> b.id - a.id) // recent
  return arr
})

/* ---------- Pagination ---------- */
const page = ref(1)
const pageSize = 8
const totalPages = computed(()=> Math.ceil(filtered.value.length / pageSize) )
const paged = computed(()=> filtered.value.slice((page.value-1)*pageSize, page.value*pageSize))
const startIndex = computed(()=> (page.value-1)*pageSize )
const endIndex = computed(()=> Math.min(page.value*pageSize, filtered.value.length) )
function nextPage(){ if (page.value < totalPages.value) page.value++ }
function prevPage(){ if (page.value > 1) page.value-- }

/* ---------- Selection (desktop) ---------- */
const selectedIds = reactive(new Set())
function toggleSelect(id, e){ e.target.checked ? selectedIds.add(id) : selectedIds.delete(id) }
const allPageSelected = computed(()=> paged.value.length && paged.value.every(u => selectedIds.has(u.id)) )
function toggleSelectAllPage(e){
  if (e.target.checked) paged.value.forEach(u => selectedIds.add(u.id))
  else paged.value.forEach(u => selectedIds.delete(u.id))
}

/* ---------- Actions ---------- */
const toast = ref('')
function showToast(msg){ toast.value = msg; setTimeout(()=> toast.value = '', 1200) }

function viewUser(u){
  alert(`User details:\n\nName: ${u.name}\nEmail: ${u.email}\nRole: ${u.role}\nStatus: ${u.active?'Active':'Inactive'}`)
}

function toggleStatus(u){
  u.active = !u.active
  persist()
  showToast(u.active ? 'User activated' : 'User suspended')
}

function removeUser(id){
  if (!confirm('Delete this user?')) return
  list.value = list.value.filter(u => u.id !== id)
  selectedIds.delete(id)
  persist()
  showToast('User deleted')
}

function bulkActivate(active){
  list.value = list.value.map(u => selectedIds.has(u.id) ? { ...u, active } : u)
  persist()
  showToast(active ? 'Selected users activated' : 'Selected users suspended')
}
function bulkDelete(){
  if (!confirm('Delete selected users?')) return
  list.value = list.value.filter(u => !selectedIds.has(u.id))
  selectedIds.clear()
  persist()
  showToast('Selected users deleted')
}

/* ---------- Drawer (create/edit) ---------- */
const drawerOpen = ref(false)
const mode = ref('create') // 'create' | 'edit'
const editingId = ref(null)
const form = reactive({ name:'', email:'', role:'Viewer', active:true })
const touched = reactive({ name:false, email:false })
const inputCls = computed(()=> dark.value ? 'bg-white/5 ring-1 ring-white/15' : 'bg-white ring-1 ring-slate-200')
const ghostBtnCls = computed(()=> dark.value ? 'bg-white/10 ring-1 ring-white/15' : 'bg-white ring-1 ring-slate-200')

function openDrawer(m, u=null){
  mode.value = m
  drawerOpen.value = true
  if (m==='edit' && u){
    editingId.value = u.id
    Object.assign(form, { name:u.name, email:u.email, role:u.role, active:u.active })
  } else {
    editingId.value = null
    Object.assign(form, { name:'', email:'', role:'Viewer', active:true })
  }
  touched.name = false; touched.email = false
}
function closeDrawer(){ drawerOpen.value = false }

function isEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '') }
const canSave = computed(()=> form.name && isEmail(form.email) )

function save(){
  touched.name = true; touched.email = true
  if (!canSave.value) return
  if (mode.value==='create'){
    const id = Date.now()
    list.value.unshift({ id, ...form })
    showToast('User created')
  } else {
    const i = list.value.findIndex(u => u.id === editingId.value)
    if (i >= 0) list.value[i] = { id: editingId.value, ...form }
    showToast('User updated')
  }
  persist()
  closeDrawer()
}

/* ---------- UI helpers ---------- */
function initials(name=''){
  const parts = name.trim().split(/\s+/).slice(0,2)
  return parts.map(p => p[0]?.toUpperCase() || '').join('')
}
function avatarClass(u){
  // small color hash based on id
  const colors = [
    'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
    'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
    'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
    'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200',
  ]
  return colors[u.id % colors.length]
}
function chipClass(role){
  const map = {
    Admin: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200',
    Editor:'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200',
    Viewer:'bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white'
  }
  return map[role] || 'bg-slate-100 text-slate-800'
}
</script>

<style scoped>
/* nicer tables */
table { border-collapse: separate; border-spacing: 0; }
</style>
