<!-- MobileSelectField.vue -->
<template>
  <div class="w-full">
    <!-- Label -->
    <label
      v-if="label"
      :for="nativeId"
      class="block text-sm font-semibold mb-1 text-zinc-800 dark:text-zinc-100"
    >
      {{ label }}
      <span v-if="required" class="text-rose-600">*</span>
    </label>

    <!-- Field (press to open sheet on mobile) -->
    <button
      v-if="mode==='sheet'"
      type="button"
      class="w-full flex items-center justify-between gap-3 rounded-2xl px-3 py-3
             bg-white dark:bg-zinc-900 border
             transition focus:outline-none focus:ring-2
             min-h-[44px]"
      :class="[
        error ? 'border-rose-400 ring-rose-300'
              : 'border-zinc-300 dark:border-zinc-700 focus:ring-indigo-400 dark:focus:ring-indigo-500',
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      ]"
      :aria-haspopup="'listbox'"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-labelledby="label ? undefined : nativeId"
      @click="!disabled && !readonly && openSheet()"
    >
      <div class="flex items-center gap-2 min-w-0">
        <!-- Prefix icon/slot -->
        <div v-if="$slots.prefix || icon" class="shrink-0 text-zinc-500 dark:text-zinc-400">
          <slot name="prefix">
            <span class="text-lg leading-none">{{ icon }}</span>
          </slot>
        </div>

        <!-- Value / Placeholder -->
        <div class="flex-1 text-left min-w-0">
          <div
            class="truncate text-[15px]"
            :class="selectedOption ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'"
          >
            {{ selectedOption ? selectedOption.label : (placeholder || 'Select…') }}
          </div>
          <div v-if="selectedOption?.hint" class="text-[11px] text-zinc-500 truncate">
            {{ selectedOption.hint }}
          </div>
        </div>
      </div>

      <!-- Right side actions -->
      <div class="flex items-center gap-1 shrink-0">
        <button
          v-if="clearable && selectedOption && !disabled && !readonly"
          type="button"
          class="h-8 w-8 grid place-items-center rounded-full text-zinc-600 hover:text-zinc-900
                 dark:text-zinc-300 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60"
          aria-label="Clear selection"
          @click.stop="clear"
        >
          ×
        </button>
        <span class="text-zinc-600 dark:text-zinc-300">▾</span>
      </div>
    </button>

    <!-- Native select (fallback or if mode==='native') -->
    <div v-else class="relative">
      <select
        :id="nativeId"
        class="w-full rounded-2xl px-3 py-3 bg-white dark:bg-zinc-900 border
               text-[15px] text-zinc-900 dark:text-zinc-100
               border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2
               focus:ring-indigo-400 dark:focus:ring-indigo-500 min-h-[44px]"
        :disabled="disabled"
        :required="required"
        :name="name || nativeId"
        :value="modelValue"
        @change="onNative($event)"
        v-bind="$attrs"
      >
        <option v-if="placeholder" disabled value="">{{ placeholder }}</option>
        <template v-for="opt in flatOptions" :key="`n-${opt.value}`">
          <option :value="opt.value" :disabled="!!opt.disabled">{{ opt.label }}</option>
        </template>
      </select>
    </div>

    <!-- Helper row -->
    <div class="mt-1 flex items-center justify-between gap-2">
      <p v-if="hint && !error" class="text-[12px] text-zinc-500">{{ hint }}</p>
      <p v-if="error" class="text-[12px] text-rose-600">{{ error }}</p>
    </div>

    <!-- Bottom Sheet (listbox) -->
    <div
      v-if="open && mode==='sheet'"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      role="dialog" aria-modal="true" aria-labelledby="msf-title"
      @click.self="close('backdrop')" @keydown.esc.prevent="close('esc')"
    >
      <section
        class="w-full sm:w-[92%] max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-2xl overflow-hidden
               bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 ring-1 ring-black/10 dark:ring-white/10
               shadow-2xl animate-in flex flex-col"
      >
        <!-- Handle -->
        <div class="sm:hidden pt-2 grid place-items-center">
          <div class="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
        </div>

        <!-- Header + search -->
        <header class="px-5 pt-2 pb-3 sm:p-5 border-b border-black/10 dark:border-white/10">
          <div class="flex items-center justify-between">
            <h2 id="msf-title" class="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {{ label || 'Select an option' }}
            </h2>
            <button class="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full
                           hover:bg-black/5 dark:hover:bg-white/10"
                    aria-label="Close" @click="close('x')">✕</button>
          </div>

          <div v-if="searchable" class="mt-3">
            <div class="relative">
              <input
                ref="searchRef"
                v-model.trim="query"
                type="text"
                inputmode="search"
                class="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm outline-none
                       focus:ring-2 ring-indigo-400 dark:ring-indigo-500"
                placeholder="Search…"
                @keydown.enter.prevent="selectFirstVisible"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">⏎</span>
            </div>
          </div>
        </header>

        <!-- Options -->
        <div class="px-2 sm:px-5 py-3 space-y-2 overflow-y-auto" role="listbox" :aria-activedescendant="activeId">
          <template v-for="(group, gi) in groupedFiltered" :key="`g-${gi}`">
            <div v-if="group.label" class="px-3 pt-3 text-[11px] uppercase tracking-wide text-zinc-500">
              {{ group.label }}
            </div>
            <button
              v-for="opt in group.items" :key="opt.value"
              :id="`opt-${opt.value}`"
              :role="'option'"
              :aria-selected="modelValue === opt.value ? 'true' : 'false'"
              class="w-full flex items-center justify-between gap-2 px-3 py-3 rounded-xl border
                     text-left transition"
              :class="[
                opt.disabled ? 'opacity-50 cursor-not-allowed' :
                modelValue===opt.value
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
                  : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              ]"
              :disabled="!!opt.disabled"
              @click="choose(opt)"
            >
              <div class="min-w-0">
                <div class="truncate text-[15px]">{{ opt.label }}</div>
                <div v-if="opt.hint" class="text-[12px] text-zinc-500 truncate">{{ opt.hint }}</div>
              </div>
              <span v-if="modelValue===opt.value" class="text-indigo-600">✔</span>
            </button>
          </template>

          <div v-if="!groupedFiltered.length || !groupedFiltered.some(g => g.items.length)" class="px-3 py-6 text-center text-sm text-zinc-500">
            No results
          </div>
        </div>

        <!-- Footer -->
        <footer class="px-5 py-3 border-t border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/70 backdrop-blur
                       flex items-center justify-between">
          <button class="rounded-full px-3 py-2 text-xs font-semibold bg-zinc-200 dark:bg-zinc-800"
                  @click="close('cancel')">Cancel</button>
          <button v-if="clearable && selectedOption"
                  class="rounded-full px-3 py-2 text-xs font-semibold bg-amber-200 text-zinc-900"
                  @click="clear">Clear</button>
        </footer>

        <!-- Safe area -->
        <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'

/* Props */
const props = defineProps({
  modelValue: [String, Number, null],
  options: { type: Array, default: () => [] }, // supports strings or {label,value,disabled,hint,group}
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  icon: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  clearable: { type: Boolean, default: true },
  searchable: { type: Boolean, default: true },
  mode: { type: String, default: 'sheet' }, // 'sheet' | 'native'
  name: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  id: { type: String, default: '' }
})

/* Emits */
const emit = defineEmits(['update:modelValue','open','close','change','clear','select'])

/* IDs */
const uid = Math.random().toString(36).slice(2,8)
const nativeId = props.id || `msf-${uid}`

/* Normalization */
function normalizeOption(o){
  if (o == null) return null
  if (typeof o === 'string' || typeof o === 'number') return { label: String(o), value: o }
  return { label: o.label ?? String(o.value), value: o.value, disabled: !!o.disabled, hint: o.hint || '', group: o.group || '' }
}
const flatOptions = computed(() => props.options.map(normalizeOption).filter(Boolean))

/* Grouped for sheet mode */
const grouped = computed(() => {
  const groups = {}
  flatOptions.value.forEach(o => {
    const g = o.group || ''
    if (!groups[g]) groups[g] = []
    groups[g].push(o)
  })
  return Object.entries(groups).map(([label, items]) => ({ label, items }))
})

/* State */
const open = ref(false)
const query = ref('')
const searchRef = ref(null)

/* Filters */
const groupedFiltered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return grouped.value
  const filtered = grouped.value.map(g => ({
    label: g.label,
    items: g.items.filter(o => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q))
  }))
  return filtered.filter(g => g.items.length)
})

/* Selected */
const selectedOption = computed(() => flatOptions.value.find(o => o.value === props.modelValue) || null)
const activeId = computed(() => selectedOption.value ? `opt-${selectedOption.value.value}` : undefined)

/* Actions */
function openSheet(){
  open.value = true
  buzz(8)
  emit('open')
  nextTick(() => searchRef.value?.focus?.())
}
function close(reason){
  open.value = false
  emit('close', { reason })
}

function choose(opt){
  if (opt.disabled) return
  emit('update:modelValue', opt.value)
  emit('select', opt)
  emit('change', opt.value)
  buzz(12)
  close('select')
}

function clear(){
  emit('update:modelValue', null)
  emit('clear')
  emit('change', null)
  buzz(10)
  if (open.value) close('clear')
}

function onNative(e){
  const val = e.target.value
  emit('update:modelValue', val)
  emit('change', val)
}

function selectFirstVisible(){
  const g = groupedFiltered.value[0]
  if (g && g.items && g.items[0]) choose(g.items[0])
}

/* Haptics */
function buzz(ms=10){ try{ navigator?.vibrate?.(ms) }catch{} }

/* Autofill: close sheet if disabled/read-only toggles while open */
watch(() => [props.disabled, props.readonly], ([d,r]) => {
  if ((d || r) && open.value) close('disabled')
})

/* Focus ring on mount if native mode */
onMounted(async ()=>{
  if (props.mode === 'native') await nextTick()
})
</script>

<style scoped>
/* Entrance */
@keyframes in{ from{ opacity:0; transform: translateY(40px) scale(.98) } to{ opacity:1; transform:none } }
.animate-in{ animation: in .28s cubic-bezier(.22,1,.36,1) both; will-change: opacity, transform }

/* Improve touch */
:host, button, select { -webkit-tap-highlight-color: transparent; }

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .backdrop-blur-sm{ backdrop-filter: none !important; }
}
</style>
