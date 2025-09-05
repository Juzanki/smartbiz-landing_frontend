<template>
  <!-- FAB wrapper (hiari, simu) -->
  <div v-if="fab" class="fixed right-4 bottom-4 z-50" :style="safeArea">
    <button
      ref="btn"
      type="button"
      class="btn base fab"
      :class="pinned ? 'on' : 'off'"
      :aria-pressed="pinned"
      :disabled="disabled"
      :title="tooltip"
      @click="handleClick"
      @pointerdown="onHoldStart"
      @pointerup="onHoldEnd"
      @pointercancel="onHoldEnd"
      @keydown.space.prevent="handleClick"
      @keydown.enter.prevent="handleClick"
    >
      <span class="icon">{{ pinned ? '📍' : '📌' }}</span>
      <span class="label">{{ pinned ? labelUnpin : labelPin }}</span>

      <!-- Badge -->
      <span v-if="showBadge && count>0" class="badge" aria-hidden="true">{{ compact(count) }}</span>

      <!-- Ripple -->
      <span v-for="r in ripples" :key="r.id" class="ripple" :style="r.style" />
      <span class="sr-only">{{ sr }}</span>
    </button>
  </div>

  <!-- Inline button (default) -->
  <button
    v-else
    ref="btn"
    type="button"
    class="btn base inline"
    :class="pinned ? 'on' : 'off'"
    :aria-pressed="pinned"
    :disabled="disabled"
    :title="tooltip"
    @click="handleClick"
    @pointerdown="onHoldStart"
    @pointerup="onHoldEnd"
    @pointercancel="onHoldEnd"
    @keydown.space.prevent="handleClick"
    @keydown.enter.prevent="handleClick"
  >
    <span class="icon">{{ pinned ? '📍' : '📌' }}</span>
    <span class="label">{{ pinned ? labelUnpin : labelPin }}</span>
    <span v-if="showBadge && count>0" class="badge" aria-hidden="true">{{ compact(count) }}</span>
    <span v-for="r in ripples" :key="r.id" class="ripple" :style="r.style" />
    <span class="sr-only">{{ sr }}</span>
  </button>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/** PROPS */
const props = defineProps({
  /** Two-way state (v-model) */
  modelValue: { type: Boolean, default: false },
  /** On long-press: 'open' -> emit('open'), 'pin-latest' -> emit('pin-latest') */
  holdAction: { type: String, default: 'open' }, // 'open' | 'pin-latest'
  /** FAB mode places button fixed bottom-right (mobile-first) */
  fab: { type: Boolean, default: false },
  /** Show badge count (e.g., number of pinned items / new messages) */
  count: { type: Number, default: 0 },
  showBadge: { type: Boolean, default: true },
  /** Disable interactions */
  disabled: { type: Boolean, default: false },
  /** Labels */
  labelPin: { type: String, default: 'Pin' },
  labelUnpin: { type: String, default: 'Unpin' },
  /** Keyboard hotkey; set '' to disable */
  hotkey: { type: String, default: 'p' }
})

/** EMITS */
const emit = defineEmits(['update:modelValue','toggle','open','pin-latest','click'])

/** STATE */
const pinned = ref(!!props.modelValue)
const btn = ref(null)
const holdT = ref(null)
const holding = ref(false)
const ripples = ref([])

const labelPin = computed(()=>props.labelPin)
const labelUnpin = computed(()=>props.labelUnpin)
const tooltip = computed(()=> pinned.value ? 'Unpin (long-press for options)' : 'Pin (long-press for options)')
const sr = computed(()=> (pinned.value ? 'Pinned' : 'Not pinned'))
const count = computed(()=> props.count)

/** Sync v-model in/out */
watch(() => props.modelValue, v => pinned.value = !!v)

/** Click → toggle */
function handleClick(e){
  if (props.disabled) return
  makeRipple(e)
  haptics(8)
  pinned.value = !pinned.value
  emit('update:modelValue', pinned.value)
  emit('toggle', pinned.value)
  emit('click', e)
  // Optional: announce to screen readers (aria-live can be handled by parent toast)
}

/** Long-press → open panel or pin-latest */
function onHoldStart(e){
  if (props.disabled) return
  holding.value = true
  holdT.value = setTimeout(() => {
    if (!holding.value) return
    haptics(15)
    if (props.holdAction === 'pin-latest') emit('pin-latest')
    else emit('open') // default open pinned panel
  }, 500) // 500ms press
}
function onHoldEnd(){
  holding.value = false
  clearTimeout(holdT.value)
}

/** Ripple */
function makeRipple(ev){
  const el = btn.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 1.2
  const x = (ev.clientX ?? (rect.left + rect.width/2)) - rect.left - size/2
  const y = (ev.clientY ?? (rect.top + rect.height/2)) - rect.top - size/2
  const id = Math.random().toString(36).slice(2,8)
  ripples.value.push({ id, style: `width:${size}px;height:${size}px;left:${x}px;top:${y}px;` })
  setTimeout(()=> ripples.value = ripples.value.filter(r => r.id!==id), 450)
}

/** Haptics */
function haptics(ms=10){ try{ navigator.vibrate?.(ms) }catch{} }

/** Hotkey */
function onKey(e){
  if (!props.hotkey) return
  const target = e.target
  // Ignore when typing in inputs
  if (['INPUT','TEXTAREA'].includes(target?.tagName) || target?.isContentEditable) return
  if (e.key.toLowerCase() === props.hotkey.toLowerCase()){
    e.preventDefault()
    handleClick({ clientX: null, clientY: null }) // centered ripple
  }
}

onMounted(()=> window.addEventListener('keydown', onKey))
onBeforeUnmount(()=> window.removeEventListener('keydown', onKey))

/** Utilities */
function compact(n){ if(n>=1e9) return (n/1e9).toFixed(1)+'B'; if(n>=1e6) return (n/1e6).toFixed(1)+'M'; if(n>=1e3) return (n/1e3).toFixed(1)+'K'; return String(n??0) }

/** Safe-area for FAB */
const safeArea = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }
</script>

<style scoped>
/* Base button */
.btn.base {
  @apply inline-flex items-center gap-2 rounded-full font-semibold text-sm
         px-4 py-2 shadow border transition active:scale-[.98] select-none;
}
.btn.inline.on  { @apply bg-purple-600 text-white border-purple-500 hover:bg-purple-500; }
.btn.inline.off { @apply bg-purple-700 text-white border-purple-600 hover:bg-purple-600; }

/* FAB variant (bigger, thumb-friendly) */
.btn.fab       { @apply h-12 px-5 text-base shadow-xl; }
.btn.fab.on    { @apply bg-purple-600 text-white border-purple-500 hover:bg-purple-500; }
.btn.fab.off   { @apply bg-purple-700 text-white border-purple-600 hover:bg-purple-600; }

/* Icon & label */
.icon { @apply text-base; }
.label { @apply uppercase tracking-wide; }

/* Badge */
.badge {
  @apply absolute -top-1 -right-1 h-5 min-w-[20px] px-1 grid place-items-center
         rounded-full bg-red-500 text-white text-[10px] font-black leading-none ring-2 ring-white;
}

/* Ripple */
.ripple {
  position:absolute; border-radius:9999px; background:rgba(255,255,255,.35);
  transform: scale(0); animation: ripple .45s ease-out forwards; pointer-events:none;
}
@keyframes ripple { to { transform: scale(1); opacity: 0; } }

/* SR-only */
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
</style>
