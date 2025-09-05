<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
    <!-- App Bar -->
    <header class="sticky top-0 z-20 backdrop-blur bg-slate-900/70 border-b border-white/10">
      <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <h1 class="text-base sm:text-lg font-semibold">🏢 My Business</h1>
        <div class="flex items-center gap-2">
          <button @click="openModal('create')" class="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-400/30 text-xs">
            ➕ Add Business
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="max-w-6xl mx-auto px-4 pb-3 grid gap-2 sm:grid-cols-3">
        <div class="relative">
          <input v-model.trim="q" type="search" inputmode="search"
                 placeholder="🔍 Search name, type, website…"
                 class="w-full bg-white/5 ring-1 ring-white/15 focus:ring-white/30 rounded-xl pl-9 pr-8 py-2 text-sm placeholder:text-white/40" />
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">🔎</span>
          <button v-if="q" @click="q=''" class="absolute right-2 top-1/2 -translate-y-1/2 text-white/50">✕</button>
        </div>
        <select v-model="sortBy" class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm">
          <option value="recent">Recently Added</option>
          <option value="nameAsc">Name A–Z</option>
          <option value="typeAsc">Type A–Z</option>
        </select>
        <div class="flex gap-2 overflow-x-auto no-scrollbar">
          <button v-for="t in typeChips" :key="t"
                  @click="toggleType(t)"
                  :class="['px-3 py-1.5 rounded-full text-xs ring-1 whitespace-nowrap',
                           activeTypes.includes(t) ? 'bg-white text-slate-900 ring-white' : 'bg-white/5 ring-white/15']">
            {{ t }}
          </button>
          <button v-if="activeTypes.length" @click="activeTypes=[]"
                  class="px-3 py-1.5 rounded-full text-xs bg-white/5 ring-1 ring-white/15">
            Reset
          </button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-6xl mx-auto px-4 py-4">
      <!-- Empty state -->
      <section v-if="!filtered.length" class="text-center p-8 rounded-2xl bg-white/5 ring-1 ring-white/10">
        <h3 class="font-semibold mb-1">No businesses linked yet</h3>
        <p class="text-sm text-white/70">Add your first business to get started.</p>
        <button @click="openModal('create')" class="mt-3 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm">
          ➕ Link a Business
        </button>
      </section>

      <!-- Cards -->
      <section v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article v-for="b in paged" :key="b.id"
                 class="rounded-2xl ring-1 ring-white/10 bg-white/5 p-4 flex flex-col">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <img :src="b.logo || fallbackLogo(b.name)" alt="" class="h-12 w-12 rounded-xl object-cover ring-1 ring-white/15 bg-white/5" />
              <div class="min-w-0">
                <h3 class="font-semibold truncate">{{ b.name }}</h3>
                <p class="text-xs text-white/60 truncate">{{ b.type || '—' }}</p>
              </div>
            </div>
            <span v-if="String(activeId)===String(b.id)"
                  class="px-2 py-1 rounded text-[11px] bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30 whitespace-nowrap">
              Active
            </span>
          </div>

          <div class="mt-2 text-xs text-white/70 truncate">
            <a v-if="b.website" :href="safeUrl(b.website)" target="_blank" class="underline break-all">{{ b.website }}</a>
            <span v-else class="opacity-60">No website</span>
          </div>

          <!-- Actions -->
          <div class="mt-3 grid grid-cols-2 gap-2">
            <button @click="setActive(b.id)"
                    class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 ring-1 ring-white/15 text-xs">
              Set Active
            </button>
            <button @click="goProfile(b.id)"
                    class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 ring-1 ring-white/15 text-xs">
              View Profile
            </button>
            <button @click="openModal('edit', b)"
                    class="px-3 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/25 ring-1 ring-cyan-400/30 text-cyan-100 text-xs">
              Edit
            </button>
            <button @click="removeBiz(b.id)"
                    class="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/25 ring-1 ring-red-400/30 text-red-100 text-xs">
              Delete
            </button>
          </div>
        </article>
      </section>

      <div v-if="hasMore" class="mt-3 flex justify-center">
        <button @click="page++" class="px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-sm">Load more</button>
      </div>
    </main>

    <!-- Modal (Create/Edit) -->
    <div v-if="showModal" class="fixed inset-0 z-30 bg-black/60 grid place-items-center p-4">
      <div class="w-full max-w-md rounded-2xl bg-slate-900 ring-1 ring-white/10 p-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-semibold">{{ modalMode==='create' ? 'Add New Business' : 'Edit Business' }}</h3>
          <button @click="closeModal" class="text-white/70">✕</button>
        </div>

        <div class="grid gap-3">
          <div>
            <label class="text-xs text-white/60 block mb-1">Business Name</label>
            <input v-model.trim="form.name" class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm"
                   :aria-invalid="!!errors.name" @blur="touch.name=true" placeholder="e.g., SmartBiz Co." />
            <p v-if="touch.name && errors.name" class="text-[11px] text-red-300 mt-1">{{ errors.name }}</p>
          </div>

          <div>
            <label class="text-xs text-white/60 block mb-1">Business Type</label>
            <input v-model.trim="form.type" class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm"
                   placeholder="Retail / Services / SaaS…" />
          </div>

          <div>
            <label class="text-xs text-white/60 block mb-1">Website</label>
            <input v-model.trim="form.website" type="url"
                   class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm"
                   placeholder="https://example.com" />
          </div>

          <div>
            <label class="text-xs text-white/60 block mb-1">Logo</label>
            <div class="grid grid-cols-2 gap-2">
              <input v-model.trim="form.logo" type="url"
                     class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm"
                     placeholder="Logo URL (optional)" />
              <label class="px-3 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-sm text-center cursor-pointer">
                Upload
                <input type="file" accept="image/*" class="hidden" @change="onFile" />
              </label>
            </div>
            <div class="mt-2 flex items-center gap-2">
              <img :src="form.logo || fallbackLogo(form.name)" class="h-10 w-10 rounded-lg object-cover ring-1 ring-white/15 bg-white/5" alt="">
              <p class="text-xs text-white/60">Preview</p>
            </div>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-2">
          <button @click="closeModal" class="px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-sm">Cancel</button>
          <button :disabled="!canSave" @click="save"
                  class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm disabled:opacity-50">
            {{ modalMode==='create' ? 'Save Business' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast" class="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-sm">
      {{ toast }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

/** -------- State -------- */
const all = ref([])
const q = ref('')
const sortBy = ref('recent')
const activeTypes = ref([])
const typeChips = ['Retail','Services','SaaS','Agency','Other']

const page = ref(1)
const pageSize = 9

const activeId = ref(localStorage.getItem('business_id') || null)

const showModal = ref(false)
const modalMode = ref('create') // 'create' | 'edit'
const editingId = ref(null)
const form = reactive({ name:'', type:'', website:'', logo:'' })
const touch = reactive({ name:false })
const toast = ref('')

/** -------- Lifecycle -------- */
onMounted(() => {
  load()
})

/** -------- Load/Save helpers -------- */
function load() {
  const fromLS = JSON.parse(localStorage.getItem('my_businesses') || '[]')
  all.value = Array.isArray(fromLS) ? fromLS : []
}
function persist() {
  localStorage.setItem('my_businesses', JSON.stringify(all.value))
}

/** -------- Filters/Sorting -------- */
function toggleType(t) {
  const i = activeTypes.value.indexOf(t)
  if (i>=0) activeTypes.value.splice(i,1)
  else activeTypes.value.push(t)
  page.value = 1
}

const filtered = computed(() => {
  let arr = [...all.value]
  if (q.value) {
    const term = q.value.toLowerCase()
    arr = arr.filter(b =>
      (b.name||'').toLowerCase().includes(term) ||
      (b.type||'').toLowerCase().includes(term) ||
      (b.website||'').toLowerCase().includes(term)
    )
  }
  if (activeTypes.value.length) {
    arr = arr.filter(b => activeTypes.value.includes(b.type))
  }
  arr.sort((a,b) => {
    if (sortBy.value==='nameAsc') return (a.name||'').localeCompare(b.name||'')
    if (sortBy.value==='typeAsc') return (a.type||'').localeCompare(b.type||'')
    // recent
    return (b.id||0) - (a.id||0)
  })
  return arr
})
const paged = computed(() => filtered.value.slice(0, page.value * pageSize))
const hasMore = computed(() => filtered.value.length > paged.value.length)

/** -------- Actions -------- */
function setActive(id) {
  activeId.value = id
  localStorage.setItem('business_id', id)
  showToast('Switched to new business')
}
function goProfile(id) {
  router.push(`/business-profile/${id}`)
}
function removeBiz(id) {
  if (!confirm('Delete this business?')) return
  all.value = all.value.filter(b => String(b.id) !== String(id))
  if (String(activeId.value) === String(id)) {
    activeId.value = null
    localStorage.removeItem('business_id')
  }
  persist()
  showToast('Business deleted')
}

/** -------- Modal -------- */
function openModal(mode, biz=null) {
  modalMode.value = mode
  editingId.value = biz?.id || null
  Object.assign(form, biz ? { ...biz } : { name:'', type:'', website:'', logo:'' })
  touch.name = false
  showModal.value = true
}
function closeModal() {
  showModal.value = false
}

/** -------- Save/Create -------- */
const errors = computed(() => {
  const e = {}
  if (!form.name || form.name.length < 2) e.name = 'Name is required (min 2 chars).'
  return e
})
const canSave = computed(() => Object.keys(errors.value).length === 0)

function save() {
  touch.name = true
  if (!canSave.value) return
  if (modalMode.value==='create') {
    const rec = { id: genId(), ...form }
    all.value.unshift(rec)
    persist()
    showToast('Business added')
  } else {
    const idx = all.value.findIndex(b => String(b.id) === String(editingId.value))
    if (idx >= 0) {
      all.value[idx] = { ...all.value[idx], ...form }
      persist()
      showToast('Business updated')
    }
  }
  closeModal()
}

/** -------- File upload -> preview URL -------- */
function onFile(e) {
  const f = e.target.files?.[0]
  if (!f) return
  form.logo = URL.createObjectURL(f)
}

/** -------- Utils -------- */
function genId(){ return Date.now() }
function safeUrl(u=''){ try { return new URL(u).toString() } catch { return '#' } }
function fallbackLogo(name='') {
  const letter = (name?.[0] || 'B').toUpperCase()
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'>
    <rect width='100%' height='100%' rx='16' fill='#0ea5a5'/>
    <text x='50%' y='54%' font-size='48' text-anchor='middle' fill='white' font-family='Inter,Arial'>${letter}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
function showToast(msg){ toast.value = msg; setTimeout(()=> toast.value='', 1400) }
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar{ display:none; }
.no-scrollbar{ -ms-overflow-style:none; scrollbar-width:none; }
</style>
