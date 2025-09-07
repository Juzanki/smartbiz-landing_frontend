<!-- src/components/Live/FaceFilterSelector.vue -->
<template>
  <div
    class="selector pointer-events-auto bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-2 shadow-xl"
    role="radiogroup"
    :aria-label="ariaLabel"
  >
    <div
      ref="rowRef"
      class="row"
      @keydown="onRowKeydown"
    >
      <button
        v-for="(f, i) in filters"
        :key="f.key"
        ref="setItemRef"
        class="chip"
        :class="[{ active: f.key === modelValue }, sizeClass]"
        type="button"
        role="radio"
        :aria-checked="f.key === modelValue"
        :tabindex="i === focusedIndex ? 0 : -1"
        @click="selectByIndex(i)"
      >
        <span class="emoji" v-if="f.icon">{{ f.icon }}</span>
        <span class="label">{{ f.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

/** Types */
type FilterOpt = { key: string; label: string; icon?: string }

/** Props */
const props = withDefaults(defineProps<{
  modelValue?: string
  options?: FilterOpt[]
  ariaLabel?: string
  size?: 'sm' | 'md' | 'lg'
}>(), {
  modelValue: '',
  ariaLabel: 'Face filters',
  size: 'md',
  options: () => ([
    { key: 'none',   label: 'None',   icon: '🚫' },
    { key: 'beauty', label: 'Beauty', icon: '✨' },
    { key: 'studio', label: 'Studio', icon: '🎛️' },
    { key: 'bw',     label: 'B/W',    icon: '⚫⚪' },
    { key: 'warm',   label: 'Warm',   icon: '🌤️' },
    { key: 'cool',   label: 'Cool',   icon: '❄️' },
    { key: 'neon',   label: 'Neon',   icon: '🟣' },
  ]),
})

/** Emits (supports v-model) */
const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'select', v: string): void
}>()

/** State / refs */
const filters = computed(() => props.options)
const sizeClass = computed(() => `chip-${props.size}`)
const rowRef = ref<HTMLDivElement | null>(null)
const itemRefs = ref<HTMLButtonElement[]>([])
const setItemRef = (el: HTMLButtonElement | null) => { if (el) itemRefs.value.push(el) }

/** Focused index follows current value (roving tabindex) */
const focusedIndex = ref(0)
const valueIndex = computed(() => filters.value.findIndex(f => f.key === props.modelValue))
watch(valueIndex, (idx) => { if (idx >= 0) focusedIndex.value = idx })

/** Actions */
function selectByIndex(i: number) {
  const item = filters.value[i]
  if (!item) return
  emit('update:modelValue', item.key)
  emit('select', item.key)
  focusedIndex.value = i
  nextTick(() => scrollIntoView(i))
}

function onRowKeydown(e: KeyboardEvent) {
  const max = filters.value.length - 1
  let next = focusedIndex.value
  if (e.key === 'ArrowRight') next = Math.min(max, focusedIndex.value + 1)
  else if (e.key === 'ArrowLeft') next = Math.max(0, focusedIndex.value - 1)
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = max
  else if (e.key === ' ' || e.key === 'Enter') {
    selectByIndex(focusedIndex.value)
    e.preventDefault()
    return
  } else {
    return
  }
  e.preventDefault()
  focusIndex(next)
}

function focusIndex(i: number) {
  focusedIndex.value = i
  const el = itemRefs.value[i]
  el?.focus()
  scrollIntoView(i)
}

function scrollIntoView(i: number) {
  const row = rowRef.value
  const el = itemRefs.value[i]
  if (!row || !el) return
  const left = el.offsetLeft
  const right = left + el.offsetWidth
  const viewL = row.scrollLeft
  const viewR = viewL + row.clientWidth
  if (left < viewL) row.scrollTo({ left, behavior: 'smooth' })
  else if (right > viewR) row.scrollTo({ left: right - row.clientWidth, behavior: 'smooth' })
}
</script>

<style scoped>
/* Container */
.selector { max-width: 92vw; }

/* Horizontal scroller row */
.row {
  --gap: .5rem;
  display: flex;
  gap: var(--gap);
  overflow-x: auto;
  padding: .25rem;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}
.row::-webkit-scrollbar { height: 6px; }
.row::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 999px; }

/* Chip button */
.chip {
  --pad-y: .45rem;
  --pad-x: .7rem;
  --font: 12px;

  display: inline-flex;
  align-items: center;
  gap: .35rem;
  padding: var(--pad-y) var(--pad-x);
  border-radius: 999px;
  font-size: var(--font);
  color: #fff;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  cursor: pointer;
  transition: transform .12s ease, background .12s ease, border-color .12s ease, box-shadow .12s ease;
  white-space: nowrap;
}
.chip:hover { transform: translateY(-1px); background: rgba(255,255,255,.12) }
.chip:focus { outline: none; box-shadow: 0 0 0 2px rgba(59,130,246,.6); }

/* Active state with gradient */
.chip.active {
  background: linear-gradient(135deg, #06b6d4, #a855f7);
  border-color: rgba(255,255,255,.25);
}

/* Sizes via class */
.chip-sm { --pad-y: .35rem; --pad-x: .6rem; --font: 11px; }
.chip-md { --pad-y: .45rem; --pad-x: .7rem;  --font: 12px; }
.chip-lg { --pad-y: .55rem; --pad-x: .9rem;  --font: 13px; }

.emoji { font-size: 14px; line-height: 1; }
.label { white-space: nowrap; }
</style>
