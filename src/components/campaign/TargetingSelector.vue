<template>
  <div class="relative">
    <!-- Container: bottom-sheet (mobile) / centered card (md+) -->
    <section
      class="fixed md:static bottom-0 inset-x-0 md:inset-auto
             mx-auto w-full md:max-w-2xl bg-white md:rounded-3xl
             rounded-t-3xl shadow-2xl md:shadow-xl border border-black/5
             pb-[max(16px,env(safe-area-inset-bottom))] overflow-hidden"
    >
      <!-- Header -->
      <header class="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5 px-4 md:px-6 pt-3 pb-3">
        <div class="flex items-center justify-between">
          <h2 class="text-base md:text-lg font-bold flex items-center gap-2 text-indigo-700">
            <span class="relative inline-flex">
              <span class="absolute inset-0 rounded-full bg-pink-400/30 blur-md"></span>
              <span class="relative">🎯</span>
            </span>
            Target Audience
          </h2>
          <button class="px-3 py-1.5 rounded-full text-xs font-semibold bg-black/5 hover:bg-black/10"
                  @click="$emit('close')">Close</button>
        </div>
      </header>

      <!-- Content -->
      <main class="px-4 md:px-6 py-4 space-y-5 max-h-[80vh] md:max-h-[70vh] overflow-y-auto">

        <!-- Summary chips -->
        <div v-if="hasAnyFilter" class="flex flex-wrap gap-2">
          <span class="chip" v-for="c in summaryChips" :key="c">
            {{ c }}
          </span>
          <button class="chip chip-clear" @click="clearAll">Clear All</button>
        </div>

        <!-- Region Filter -->
        <div>
          <label class="label">Select Regions</label>
          <button
            class="selector"
            @click="regionsOpen = !regionsOpen"
            :aria-expanded="regionsOpen ? 'true' : 'false'"
          >
            <div class="flex items-center gap-2 flex-wrap">
              <span v-if="form.regions.length === 0" class="placeholder">Choose regions…</span>
              <span v-for="r in form.regions" :key="r" class="badge">{{ r }}</span>
            </div>
            <i class="i-tabler-chevron-down"></i>
          </button>

          <!-- Regions dropdown -->
          <transition name="fade">
            <div v-if="regionsOpen"
                 class="dropdown">
              <div class="grid grid-cols-2 gap-2">
                <label v-for="r in regions" :key="r" class="opt">
                  <input type="checkbox" class="mr-2" :value="r" v-model="form.regions" />
                  <span>{{ r }}</span>
                </label>
              </div>
              <div class="mt-3 flex justify-end">
                <button class="btn-secondary" @click="regionsOpen=false">Done</button>
              </div>
            </div>
          </transition>
        </div>

        <!-- Tag Filter (searchable) -->
        <div>
          <label class="label">Customer Tags</label>
          <div class="relative">
            <div class="selector">
              <div class="flex items-center gap-2 flex-wrap min-w-0">
                <span v-if="form.tags.length === 0" class="placeholder">Search & select tags…</span>
                <span v-for="t in form.tags" :key="t" class="badge">
                  {{ t }}
                  <button class="ml-1 text-[10px]" @click.stop="removeTag(t)">✕</button>
                </span>
                <input
                  v-model="tagQuery"
                  @focus="tagsOpen = true"
                  type="text"
                  class="flex-1 min-w-[80px] bg-transparent outline-none text-sm"
                  placeholder="Type to search…"
                />
              </div>
              <i class="i-tabler-tag"></i>
            </div>

            <transition name="fade">
              <div v-if="tagsOpen" class="dropdown">
                <div v-if="filteredTags.length" class="max-h-40 overflow-y-auto">
                  <button v-for="t in filteredTags"
                          :key="t"
                          class="opt w-full text-left"
                          @click="toggleTag(t)">
                    <i class="i-tabler-check mr-2" v-if="form.tags.includes(t)"></i>
                    {{ t }}
                  </button>
                </div>
                <div v-else class="text-xs text-gray-500 p-2">No tags found.</div>
                <div class="mt-2 flex justify-between">
                  <button class="btn-secondary" @click="tagsOpen=false">Done</button>
                  <button class="btn-secondary" @click="form.tags=[]">Clear</button>
                </div>
              </div>
            </transition>
          </div>
        </div>

        <!-- Last Purchase Date -->
        <div>
          <label class="label">Last Purchase After</label>
          <input type="date" v-model="form.last_purchase_after" class="input" />
        </div>

        <!-- Has Replied (segmented) -->
        <div>
          <label class="label">Has Replied</label>
          <div class="segmented">
            <button :class="segClass(null)"  @click="form.has_replied = null">Any</button>
            <button :class="segClass(true)"  @click="form.has_replied = true">Yes</button>
            <button :class="segClass(false)" @click="form.has_replied = false">No</button>
          </div>
        </div>

        <!-- Live tips -->
        <p class="text-[11px] text-gray-500">
          Pro tip: ukichagua **Regions + Tags**, utaongeza relevance ya kampeni na kupunguza gharama.
        </p>

        <!-- Preview Results -->
        <section v-if="previewing || results.length" class="mt-2">
          <h3 class="text-sm font-bold mb-2 flex items-center gap-2">
            <i class="i-tabler-users"></i> Audience Preview
            <span v-if="results.length" class="ml-1 text-xs text-gray-500">({{ results.length }})</span>
          </h3>

          <!-- Skeleton -->
          <div v-if="previewing" class="space-y-2">
            <div v-for="i in 6" :key="i" class="sk-row"></div>
          </div>

          <!-- Empty -->
          <div v-else-if="results.length === 0" class="empty">
            <div class="text-2xl mb-1">🤔</div>
            <p class="text-sm text-gray-600">No customers match your filters yet.</p>
          </div>

          <!-- List -->
          <ul v-else class="divide-y bg-white rounded-xl border border-black/5">
            <li v-for="c in results" :key="c.id" class="p-3">
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-semibold truncate">{{ c.full_name }}</p>
                  <p class="text-xs text-gray-500 truncate">{{ c.phone_number }} • {{ c.region }}</p>
                </div>
                <span class="tag-soft" v-if="c.last_purchase_at">Last: {{ formatDate(c.last_purchase_at) }}</span>
              </div>
            </li>
          </ul>
        </section>
      </main>

      <!-- Sticky bottom action (safe-area) -->
      <footer class="sticky bottom-0 bg-white/90 backdrop-blur border-t border-black/5 px-4 md:px-6 py-3">
        <div class="flex items-center justify-between">
          <div class="text-xs">
            <span class="text-gray-500">Filters:</span>
            <span class="font-semibold">{{ summaryChips.length }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn-secondary" @click="clearAll">Reset</button>
            <button
              class="btn-primary"
              :disabled="previewing"
              @click="preview"
            >
              <svg v-if="previewing" class="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="9" class="opacity-25" />
                <path d="M21 12a9 9 0 0 1-9 9" class="opacity-90" />
              </svg>
              Preview Audience
            </button>
          </div>
        </div>
      </footer>
    </section>

    <!-- Toast -->
    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from '@/utils/axios'

const emit = defineEmits(['close'])

/* Form state */
const form = ref({
  regions: [] as string[],
  tags: [] as string[],
  last_purchase_after: null as string | null,
  has_replied: null as boolean | null
})

/* UI state */
const regionsOpen = ref(false)
const tagsOpen = ref(false)
const tagQuery = ref('')

/* Data */
const regions = ref(["Dar es Salaam", "Arusha", "Mwanza", "Dodoma"])
const tags = ref<string[]>([])
const results = ref<any[]>([])
const previewing = ref(false)
const toast = ref('')

onMounted(async () => {
  try {
    const res = await axios.get('/tags')
    tags.value = (res.data || []).map((t: any) => t.name)
  } catch (e) {
    showToast('Failed to load tags')
  }
})

/* Derived */
const hasAnyFilter = computed(() =>
  form.value.regions.length || form.value.tags.length || form.value.last_purchase_after || form.value.has_replied !== null
)

const summaryChips = computed(() => {
  const arr: string[] = []
  if (form.value.regions.length) arr.push(`Regions: ${form.value.regions.length}`)
  if (form.value.tags.length) arr.push(`Tags: ${form.value.tags.length}`)
  if (form.value.last_purchase_after) arr.push(`After: ${formatDate(form.value.last_purchase_after)}`)
  if (form.value.has_replied === true) arr.push('Replied: Yes')
  if (form.value.has_replied === false) arr.push('Replied: No')
  return arr
})

const filteredTags = computed(() => {
  const q = tagQuery.value.trim().toLowerCase()
  if (!q) return tags.value
  return tags.value.filter(t => t.toLowerCase().includes(q))
})

/* Actions */
function clearAll() {
  form.value = { regions: [], tags: [], last_purchase_after: null, has_replied: null }
  tagQuery.value = ''
}

function removeTag(t: string) {
  form.value.tags = form.value.tags.filter(x => x !== t)
}

function toggleTag(t: string) {
  const set = new Set(form.value.tags)
  if (set.has(t)) set.delete(t); else set.add(t)
  form.value.tags = Array.from(set)
}

/* Preview (debounced in practice; here click triggers) */
async function preview() {
  try {
    previewing.value = true
    const res = await axios.post('/campaign/target-preview', form.value)
    results.value = res.data || []
    if (!results.value.length) showToast('No matches for selected filters')
  } catch (e) {
    showToast('Failed to fetch preview')
  } finally {
    previewing.value = false
  }
}

/* Utils */
function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => (toast.value = ''), 1400)
}
function segClass(val: boolean | null) {
  return [
    'px-3 py-1.5 rounded-full text-sm font-semibold transition',
    form.value.has_replied === val
      ? 'bg-indigo-600 text-white'
      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
  ]
}
function formatDate(d: string) {
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString()
}
</script>

<style scoped>
/* Shared tokens */
.label{ @apply block text-sm font-semibold mb-1 text-gray-800; }
.input{ @apply w-full border rounded-xl px-3 py-2 text-sm border-black/10 bg-white; }
.selector{
  @apply w-full border rounded-xl px-3 py-2 text-sm border-black/10 bg-white flex items-center justify-between;
}
.placeholder{ @apply text-gray-400; }
.badge{
  @apply inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200;
}
.chip{
  @apply inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-black/5;
}
.chip-clear{
  @apply bg-rose-50 text-rose-700 border border-rose-200;
}
.btn-primary{
  @apply inline-flex items-center justify-center px-4 py-2 rounded-2xl text-white text-sm font-semibold bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-700 hover:to-sky-600 shadow;
}
.btn-secondary{
  @apply px-3 py-2 rounded-2xl text-sm font-semibold bg-black/5 hover:bg-black/10;
}
.segmented{ @apply inline-flex gap-2; }
.opt{
  @apply px-3 py-2 rounded-xl bg-white hover:bg-black/5 border border-black/10 text-sm font-medium transition;
}
.dropdown{
  @apply mt-2 rounded-2xl border border-black/10 bg-white shadow-xl p-3;
}
.tag-soft{
  @apply inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200;
}
.empty{
  @apply text-center py-8 border border-dashed border-black/10 rounded-xl;
}

/* Skeleton row */
.sk-row{
  background: linear-gradient(100deg, #f1f5f9 20%, #e2e8f0 40%, #f1f5f9 60%);
  background-size: 200% 100%;
  animation: shimmer 1.2s linear infinite;
  height: 46px; border-radius: 12px;
}
@keyframes shimmer{
  0%{ background-position: 200% 0; }
  100%{ background-position: -200% 0; }
}

/* Toast */
.toast{
  @apply fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-auto md:top-6 z-[60]
         bg-black/80 text-white text-xs px-3 py-2 rounded-full shadow-lg;
}

/* Fade */
.fade-enter-active,.fade-leave-active{ transition: opacity .18s ease; }
.fade-enter-from,.fade-leave-to{ opacity: 0; }
</style>
