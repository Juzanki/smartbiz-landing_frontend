<template>
  <section class="w-full">
    <!-- Header -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">Trending</h3>
        <span v-if="selectedCount" class="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">
          {{ selectedCount }} selected
        </span>
      </div>

      <div class="flex items-center gap-1">
        <button
          v-if="selectedCount"
          @click="clearAll"
          class="px-2 py-1 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15"
        >
          Clear
        </button>
        <button
          @click="reload"
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10"
          aria-label="Refresh"
          :title="loading ? 'Refreshing…' : 'Refresh'"
        >
          <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" :class="loading && 'animate-spin'">
            <path d="M3.3 10a6.7 6.7 0 1 1 2 4.74l1.4-1.4A4.7 4.7 0 1 0 5.3 10H3.3zM10 16.7c-1.8 0-3.45-.73-4.64-1.92l-1.41 1.41A8.7 8.7 0 1 0 10 1.3v2a6.7 6.7 0 1 1 0 13.4z"/>
          </svg>
        </button>
        <button
          @click="openSheet"
          class="px-3 py-1.5 text-xs rounded-lg bg-purple-600 text-white shadow active:scale-95"
        >
          See all
        </button>
      </div>
    </div>

    <!-- Horizontal chips (mobile-first) -->
    <div
      class="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-1 px-1 pb-1"
      role="listbox"
      :aria-multiselectable="selectable==='multiple'"
      ref="rail"
      @keydown.left.prevent="nudge(-1)"
      @keydown.right.prevent="nudge(1)"
      tabindex="0"
    >
      <!-- Loading skeletons -->
      <template v-if="loading && !displayTags.length">
        <div v-for="i in 6" :key="'sk'+i"
             class="h-9 min-w-[88px] rounded-full bg-gray-200 dark:bg-white/10 animate-pulse" />
      </template>

      <!-- Chips -->
      <button
        v-for="t in displayTags"
        :key="t.key"
        class="chip snap-start"
        :class="chipClass(t)"
        role="option"
        :aria-selected="isSelected(t)"
        @click="onSelect(t)"
      >
        <span v-if="t.emoji" class="text-lg leading-none">{{ t.emoji }}</span>
        <span v-else class="inline-block w-2.5 h-2.5 rounded-full" :style="dotStyle(t)" />
        <span class="truncate">{{ t.label }}</span>
        <span v-if="typeof t.count==='number'" class="opacity-80 text-[11px]">
          • {{ shortNum(t.count) }}
        </span>
        <span v-if="t.trend" :class="trendClass(t.trend)" aria-hidden="true">
          {{ t.trend === 'up' ? '▲' : t.trend === 'down' ? '▼' : '▪' }}
        </span>
      </button>
    </div>

    <!-- Backdrop -->
    <div v-if="sheetOpen" class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" @click="closeSheet" />

    <!-- Bottom sheet -->
    <div v-if="sheetOpen" class="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white dark:bg-[#0b0b10] shadow-2xl">
      <div class="mx-auto w-full max-w-2xl p-4">
        <div class="flex items-center gap-2 mb-3">
          <button @click="closeSheet" class="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10" aria-label="Close">✖</button>
          <h4 class="text-sm font-semibold text-gray-900 dark:text-white">All trending tags</h4>
        </div>

        <div class="relative mb-3">
          <input
            v-model="q"
            type="search"
            placeholder="Search tags…"
            class="w-full rounded-xl bg-gray-100 dark:bg-white/10 px-10 py-2 text-sm outline-none focus:ring-2 ring-purple-500"
          />
          <svg class="w-4 h-4 absolute left-3 top-2.5 opacity-60" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M13.78 12.72a6 6 0 1 0-1.06 1.06l3.25 3.25a.75.75 0 1 0 1.06-1.06l-3.25-3.25zM12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" clip-rule="evenodd"/>
          </svg>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[45vh] overflow-y-auto pr-1">
          <label
            v-for="t in filteredAll"
            :key="'all-'+t.key"
            class="flex items-center gap-2 rounded-xl px-3 py-2 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <input
              type="checkbox"
              class="accent-purple-600"
              :checked="isSelected(t)"
              :disabled="selectable==='single' && !isSelected(t)"
              @change="onSelect(t)"
            />
            <span class="text-sm truncate">{{ t.label }}</span>
            <span class="ml-auto text-[11px] opacity-70">{{ typeof t.count==='number' ? shortNum(t.count) : '' }}</span>
          </label>
        </div>

        <div class="flex justify-between items-center mt-3">
          <button @click="clearAll" class="px-3 py-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15">
            Clear all
          </button>
          <button @click="applySheet" class="px-4 py-2 text-xs rounded-lg bg-purple-600 text-white shadow active:scale-95">
            Done
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

type Trend = 'up' | 'down' | 'flat'
export type TrendingTag = {
  key?: string
  label: string
  count?: number
  trend?: Trend
  color?: string     // hex or css color for dot
  emoji?: string
}

const props = defineProps<{
  modelValue?: string[] | string
  tags?: TrendingTag[]
  maxVisible?: number
  selectable?: 'single' | 'multiple'
  fetchUrl?: string
  persistKey?: string
  showSearch?: boolean
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: string[] | string): void
  (e: 'select', payload: { tag: TrendingTag; selected: boolean; value: string[] | string }): void
  (e: 'loaded', tags: TrendingTag[]): void
  (e: 'error', error: unknown): void
}>()

// Defaults
const selectable = computed(() => props.selectable ?? 'multiple')
const persistKey = computed(() => props.persistKey ?? 'trending_tags_recent')
const maxVisible = computed(() => props.maxVisible ?? 12)

const loading = ref(false)
const allTags = ref<TrendingTag[]>(props.tags?.map(normalize) ?? [])
const rail = ref<HTMLElement | null>(null)

const internal = ref<string[]>(toArray(props.modelValue))
const q = ref('')
const sheetOpen = ref(false)

watch(() => props.modelValue, (v) => { internal.value = toArray(v) })
watch(() => props.tags, (t) => { if (t?.length) allTags.value = t.map(normalize) }, { deep: true })

onMounted(async () => {
  // restore persisted recents (optional)
  try {
    const saved = JSON.parse(localStorage.getItem(persistKey.value) || '[]')
    if (Array.isArray(saved) && !props.modelValue) internal.value = saved.slice(0, 10)
  } catch {}

  if (props.fetchUrl) await fetchTags()
})

function normalize(t: TrendingTag): TrendingTag {
  return { key: t.key ?? slugify(t.label), ...t }
}

async function fetchTags() {
  loading.value = true
  try {
    const res = await fetch(props.fetchUrl as string)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as TrendingTag[]
    allTags.value = (data || []).map(normalize)
    emit('loaded', allTags.value)
  } catch (e) {
    emit('error', e)
  } finally {
    loading.value = false
  }
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function toArray(v?: string[] | string): string[] {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

const displayTags = computed(() => {
  const base = q.value
    ? allTags.value.filter(t => t.label.toLowerCase().includes(q.value.toLowerCase()))
    : allTags.value
  return base.slice(0, maxVisible.value)
})

const filteredAll = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return allTags.value
  return allTags.value.filter(t => t.label.toLowerCase().includes(term))
})

const selectedCount = computed(() => internal.value.length)

function isSelected(t: TrendingTag) {
  const id = t.key ?? slugify(t.label)
  return internal.value.includes(id)
}

function onSelect(t: TrendingTag) {
  const id = t.key ?? slugify(t.label)
  if (selectable.value === 'single') {
    const next = isSelected(t) ? [] : [id]
    internal.value = next
  } else {
    if (isSelected(t)) {
      internal.value = internal.value.filter(x => x !== id)
    } else {
      internal.value = [...internal.value, id]
    }
  }
  vibrate(12)
  persist()
  pushUpdate()
  emit('select', { tag: t, selected: isSelected(t), value: outValue() })
}

function clearAll() {
  internal.value = []
  persist()
  pushUpdate()
}

function outValue(): string[] | string {
  return selectable.value === 'single' ? (internal.value[0] ?? '') : internal.value
}

function pushUpdate() {
  emit('update:modelValue', outValue())
}

function persist() {
  try { localStorage.setItem(persistKey.value, JSON.stringify(internal.value)) } catch {}
}

function openSheet() { sheetOpen.value = true }
function closeSheet() { sheetOpen.value = false }
function applySheet() { closeSheet(); pushUpdate() }

function nudge(dir: number) {
  if (!rail.value) return
  rail.value.scrollBy({ left: dir * 120, behavior: 'smooth' })
}

function vibrate(ms: number) {
  try { navigator.vibrate?.(ms) } catch {}
}

function shortNum(n: number) {
  if (n < 1000) return String(n)
  if (n < 1e6) return (n / 1e3).toFixed(n % 1000 === 0 ? 0 : 1) + 'K'
  if (n < 1e9) return (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M'
  return (n / 1e9).toFixed(n % 1e9 === 0 ? 0 : 1) + 'B'
}

function chipClass(t: TrendingTag) {
  const active = isSelected(t)
  return [
    "px-3 h-9 min-w-[88px] rounded-full text-sm flex items-center gap-1.5",
    "bg-gray-100 hover:bg-gray-200 text-gray-900",
    "dark:bg-white/10 dark:hover:bg-white/15 dark:text-white",
    active && "bg-purple-600 text-white dark:bg-purple-600 hover:bg-purple-600"
  ]
}

function dotStyle(t: TrendingTag) {
  return `background:${t.color || 'currentColor'};`
}

function trendClass(trend?: Trend) {
  return [
    "text-[11px] ml-0.5",
    trend === 'up' && "text-green-600",
    trend === 'down' && "text-red-600",
    trend === 'flat' && "opacity-60"
  ]
}

function reload() {
  if (props.fetchUrl) fetchTags()
}
</script>

<style scoped>
.no-scrollbar {
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.chip { transition: transform .08s ease, background-color .15s ease; }
.chip:active { transform: scale(.97); }
</style>
