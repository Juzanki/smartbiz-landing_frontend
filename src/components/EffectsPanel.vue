<template>
  <transition name="fx-fade">
    <section
      v-if="modelValue"
      class="fixed z-50 left-1/2 -translate-x-1/2 bottom-4 w-[min(92vw,28rem)] px-4 py-3 rounded-2xl
             bg-white/10 backdrop-blur-md text-white border border-cyan-600/50 shadow-2xl"
      role="region"
      aria-label="Effects Panel"
      :style="{ paddingBottom: `max(.75rem, env(safe-area-inset-bottom))` }"
    >
      <!-- Header -->
      <header class="flex items-center justify-between gap-2 mb-2">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-bold">✨ Effects</h3>
          <label class="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input type="checkbox" v-model="enabled" class="accent-cyan-400" />
            <span>Enable</span>
          </label>
        </div>

        <div class="flex items-center gap-2">
          <button class="btn-ghost text-xs" @click="doImport" title="Import JSON">Import</button>
          <button class="btn-ghost text-xs" @click="doExport" title="Export JSON">Export</button>
          <button class="btn-ghost text-xs" @click="copyCss" :disabled="copied">{{ copied ? 'Copied' : 'Copy CSS' }}</button>
          <button class="btn-outline text-xs" @click="resetAll" :disabled="!changed">Reset</button>
          <button class="btn-ghost text-xs" @click="$emit('update:modelValue', false)" aria-label="Close">✖</button>
        </div>
      </header>

      <!-- Quick toggles -->
      <div class="flex flex-wrap gap-2 mb-2">
        <button :class="['btn-chip', fx.grayscale && 'chip-on']" @click="fx.grayscale = !fx.grayscale">Grayscale</button>
        <button :class="['btn-chip', fx.sepia && 'chip-on']" @click="fx.sepia = !fx.sepia">Sepia</button>
        <button :class="['btn-chip', fx.invert && 'chip-on']" @click="fx.invert = !fx.invert">Invert</button>
        <button :class="['btn-chip', fx.mirror && 'chip-on']" @click="fx.mirror = !fx.mirror">Mirror</button>
        <button :class="['btn-chip', fx.flip && 'chip-on']" @click="fx.flip = !fx.flip">Flip</button>
      </div>

      <!-- Sliders -->
      <div class="grid grid-cols-1 gap-2">
        <FxSlider label="Brightness" v-model="fx.brightness" :min="0" :max="2" :step="0.01" />
        <FxSlider label="Contrast"   v-model="fx.contrast"   :min="0" :max="2" :step="0.01" />
        <FxSlider label="Saturation" v-model="fx.saturate"   :min="0" :max="2" :step="0.01" />
        <FxSlider label="Hue"        v-model="fx.hue"        :min="0" :max="360" :step="1" unit="°" />
        <FxSlider label="Blur"       v-model="fx.blur"       :min="0" :max="10" :step="0.1" unit="px" />
      </div>

      <!-- Presets -->
      <div class="mt-3">
        <p class="text-[11px] text-white/70 mb-1">Presets</p>
        <div class="flex flex-wrap gap-2">
          <button class="btn-secondary text-xs" @click="applyPreset('cinematic')">Cinematic</button>
          <button class="btn-secondary text-xs" @click="applyPreset('warm')">Warm</button>
          <button class="btn-secondary text-xs" @click="applyPreset('cool')">Cool</button>
          <button class="btn-secondary text-xs" @click="applyPreset('pop')">Pop</button>
          <button class="btn-secondary text-xs" @click="applyPreset('bw')">B&amp;W</button>
        </div>
      </div>

      <!-- Tiny toast -->
      <transition name="fx-pop">
        <div
          v-if="toast"
          class="fixed left-1/2 -translate-x-1/2 bottom-20 bg-black/80 text-white text-xs px-3 py-2 rounded-full shadow-lg"
          role="status" aria-live="polite"
        >{{ toast }}</div>
      </transition>
    </section>
  </transition>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch, onMounted, onBeforeUnmount, defineComponent, h, nextTick } from 'vue'

/** Props */
const props = withDefaults(defineProps<{
  /** v-model control to show/hide panel */
  modelValue?: boolean
  /** CSS selector | Element | Element[] | Vue ref(.value/$el) */
  target?: string | Element | Element[] | Record<string, any> | null
  /** localStorage key */
  storageKey?: string
}>(), {
  modelValue: true,
  target: '.fx-target',
  storageKey: 'fx-panel-pro:v2'
})

const emit = defineEmits<{
  (e:'update:modelValue', v:boolean): void
  (e:'update:css', css: { filter:string; transform:string }): void
}>()

/** ---------- State ---------- */
const enabled = ref(true)
const fx = reactive({
  grayscale: false, sepia: false, invert: false, mirror: false, flip: false,
  brightness: 1, contrast: 1, saturate: 1, hue: 0, blur: 0
})
const initialJSON = ref('')
const changed = computed(() => JSON.stringify(fx) !== initialJSON.value)
const copied = ref(false)
const toast = ref('')

/** ---------- Derived CSS ---------- */
const filterCss = computed(() => {
  if (!enabled.value) return 'none'
  const parts: string[] = []
  if (fx.grayscale) parts.push('grayscale(1)')
  if (fx.sepia)     parts.push('sepia(1)')
  if (fx.invert)    parts.push('invert(1)')
  if (fx.brightness !== 1) parts.push(`brightness(${fx.brightness})`)
  if (fx.contrast   !== 1) parts.push(`contrast(${fx.contrast})`)
  if (fx.saturate   !== 1) parts.push(`saturate(${fx.saturate})`)
  if (fx.hue)               parts.push(`hue-rotate(${Math.round(fx.hue)}deg)`)
  if (fx.blur)              parts.push(`blur(${fx.blur}px)`)
  return parts.join(' ') || 'none'
})
const transformCss = computed(() => {
  if (!enabled.value) return 'none'
  const segs: string[] = []
  if (fx.mirror) segs.push('scaleX(-1)')
  if (fx.flip)   segs.push('scaleY(-1)')
  return segs.join(' ') || 'none'
})

/** ---------- Target resolution & style apply ---------- */
function resolveTargets(): Element[] {
  if (typeof window === 'undefined') return []
  const t: any = props.target
  if (!t) return []
  if (typeof t === 'string') return Array.from(document.querySelectorAll(t))
  if (t instanceof Element) return [t]
  if (Array.isArray(t)) return t.filter((el): el is Element => el instanceof Element)
  if (t?.$el instanceof Element) return [t.$el]
  if (t?.value instanceof Element) return [t.value]
  return []
}

type Saved = { filter: string; webkitFilter: string; transform: string }
const original = new WeakMap<Element, Saved>()
let applyTimer: number | null = null

function applyNow() {
  const nodes = resolveTargets()
  for (const el of nodes) {
    if (!original.has(el)) {
      original.set(el, {
        filter: (el as any).style?.filter ?? '',
        webkitFilter: (el as any).style?.webkitFilter ?? '',
        transform: (el as any).style?.transform ?? ''
      })
    }
    ;(el as any).style.filter = filterCss.value
    ;(el as any).style.webkitFilter = filterCss.value // Safari
    ;(el as any).style.transform = transformCss.value
    ;(el as any).style.transformOrigin = 'center'
    ;(el as any).style.backfaceVisibility = 'hidden'
    ;(el as any).style.willChange = enabled.value ? 'filter, transform' : 'auto'
  }
  emit('update:css', { filter: filterCss.value, transform: transformCss.value })
}

function scheduleApply() {
  if (applyTimer) window.clearTimeout(applyTimer)
  applyTimer = window.setTimeout(applyNow, 16) // ~1 frame
}

function restoreOriginal() {
  const nodes = resolveTargets()
  for (const el of nodes) {
    const prev = original.get(el)
    if (prev) {
      ;(el as any).style.filter = prev.filter
      ;(el as any).style.webkitFilter = prev.webkitFilter
      ;(el as any).style.transform = prev.transform
      ;(el as any).style.willChange = 'auto'
      original.delete(el)
    } else {
      ;(el as any).style.filter = ''
      ;(el as any).style.webkitFilter = ''
      ;(el as any).style.transform = ''
      ;(el as any).style.willChange = 'auto'
    }
  }
}

/** ---------- Persistence ---------- */
function saveLocal() {
  try { localStorage.setItem(props.storageKey!, JSON.stringify({ enabled: enabled.value, ...fx })) } catch {}
}
function loadLocal() {
  try {
    const raw = localStorage.getItem(props.storageKey!)
    if (!raw) { initialJSON.value = JSON.stringify(fx); return }
    const obj = JSON.parse(raw)
    if (typeof obj === 'object' && obj) {
      enabled.value = !!obj.enabled
      Object.assign(fx, {
        grayscale: !!obj.grayscale, sepia: !!obj.sepia, invert: !!obj.invert,
        mirror: !!obj.mirror, flip: !!obj.flip,
        brightness: +obj.brightness || 1,
        contrast: +obj.contrast || 1,
        saturate: +obj.saturate || 1,
        hue: +obj.hue || 0,
        blur: +obj.blur || 0
      })
    }
    initialJSON.value = JSON.stringify(fx)
  } catch {
    initialJSON.value = JSON.stringify(fx)
  }
}

/** ---------- Actions ---------- */
function resetAll() {
  Object.assign(fx, {
    grayscale:false, sepia:false, invert:false, mirror:false, flip:false,
    brightness:1, contrast:1, saturate:1, hue:0, blur:0
  })
  enabled.value = true
  toastOnce('Reset ✓')
}

async function copyCss() {
  try {
    const css = `filter: ${filterCss.value}; transform: ${transformCss.value};`
    await navigator.clipboard.writeText(css)
    copied.value = true
    toastOnce('CSS copied')
    window.setTimeout(() => (copied.value = false), 1200)
  } catch {}
}

async function doExport() {
  const data = JSON.stringify({ enabled: enabled.value, ...fx }, null, 2)
  try { await navigator.clipboard.writeText(data); toastOnce('JSON copied') }
  catch { download('fx-settings.json', data) }
}
async function doImport() {
  try {
    const text = await navigator.clipboard.readText()
    const obj = JSON.parse(text)
    if (!obj || typeof obj !== 'object') throw new Error('Invalid')
    enabled.value = !!obj.enabled
    Object.assign(fx, {
      grayscale: !!obj.grayscale, sepia: !!obj.sepia, invert: !!obj.invert,
      mirror: !!obj.mirror, flip: !!obj.flip,
      brightness: +obj.brightness || 1,
      contrast: +obj.contrast || 1,
      saturate: +obj.saturate || 1,
      hue: +obj.hue || 0,
      blur: +obj.blur || 0
    })
    toastOnce('Imported ✓')
  } catch {
    toastOnce('Paste JSON to clipboard then Import')
  }
}

function download(name: string, text: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

function applyPreset(name: 'cinematic'|'warm'|'cool'|'pop'|'bw') {
  const p: Record<string, any> = {
    cinematic: { grayscale:false, sepia:false, invert:false, brightness:1.05, contrast:1.15, saturate:1.1, hue:-10,  blur:0 },
    warm:      { grayscale:false, sepia:true,  invert:false, brightness:1.06, contrast:1.05, saturate:1.15, hue:10,   blur:0 },
    cool:      { grayscale:false, sepia:false, invert:false, brightness:1.04, contrast:1.08, saturate:1.05, hue:190,  blur:0 },
    pop:       { grayscale:false, sepia:false, invert:false, brightness:1.08, contrast:1.2,  saturate:1.25, hue:0,    blur:0 },
    bw:        { grayscale:true,  sepia:false, invert:false, brightness:1.0,  contrast:1.1,  saturate:1.0,  hue:0,    blur:0 }
  }[name]
  if (!p) return
  Object.assign(fx, { mirror:fx.mirror, flip:fx.flip, ...p })
  toastOnce(`Preset: ${name}`)
}

/** ---------- Watchers ---------- */
watch([fx, enabled], () => { scheduleApply(); saveLocal() }, { deep: true })

/** ---------- Lifecycle ---------- */
onMounted(async () => {
  loadLocal()
  await nextTick()
  applyNow()
})
onBeforeUnmount(() => {
  restoreOriginal()
})

/** ---------- Tiny toast ---------- */
let toastTimer: number | null = null
function toastOnce(msg: string) {
  toast.value = msg
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toast.value = ''), 1400)
}

/** ---------- Inline FxSlider (no JSX) ---------- */
const FxSlider = defineComponent({
  name: 'FxSlider',
  props: {
    modelValue: { type: Number, default: 0 },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 1 },
    step: { type: Number, default: 0.01 },
    label: { type: String, default: '' },
    unit: { type: String, default: '' }
  },
  emits: ['update:modelValue'],
  setup(p, { emit }) {
    const onInput = (e: Event) => {
      const v = parseFloat((e.target as HTMLInputElement).value)
      emit('update:modelValue', isNaN(v) ? 0 : v)
    }
    return () =>
      h('div', { class: 'w-full' }, [
        h('div', { class: 'flex items-center justify-between text-[12px] mb-1' }, [
          h('span', { class: 'text-white/80' }, p.label),
          h('span', { class: 'font-mono text-white/70' },
            `${(p.modelValue ?? 0).toFixed(p.step >= 1 ? 0 : 2)}${p.unit}`)
        ]),
        h('input', {
          type: 'range',
          min: p.min, max: p.max, step: p.step, value: p.modelValue,
          onInput,
          class: 'w-full fx-range'
        })
      ])
  }
})
</script>

<style scoped>
/* Buttons */
.btn-secondary{
  background: rgba(255,255,255,.10);
  color: #fff;
  padding: .25rem .75rem;
  border-radius: .5rem;
  border: 1px solid rgba(255,255,255,.10);
  transition: background .15s ease, border-color .15s ease;
}
.btn-secondary:hover{ background: rgba(255,255,255,.20); }

.btn-outline{
  background: transparent;
  color: #fff;
  padding: .25rem .75rem;
  border-radius: .5rem;
  border: 1px solid rgba(255,255,255,.35);
  transition: background .15s ease, border-color .15s ease;
}
.btn-outline:hover{ background: rgba(255,255,255,.10); }

.btn-ghost{
  background: transparent;
  color: #fff;
  padding: .25rem .75rem;
  border-radius: .5rem;
  border: 1px solid transparent;
  transition: background .15s ease, border-color .15s ease;
}
.btn-ghost:hover{ background: rgba(255,255,255,.10); }

.btn-chip{
  font-size: .75rem;
  padding: .25rem .75rem;
  border-radius: 9999px;
  background: rgba(255,255,255,.10);
  color: #fff;
  border: 1px solid rgba(255,255,255,.10);
  transition: background .15s ease, border-color .15s ease, transform .15s ease;
}
.btn-chip:hover{ background: rgba(255,255,255,.18); transform: translateY(-1px); }
.chip-on{ background: #22d3ee; color: #0b1324; border-color: #22d3ee; }

/* Range styling */
.fx-range {
  -webkit-appearance: none; width: 100%; height: 6px; border-radius: 9999px;
  background: linear-gradient(90deg, rgba(34,211,238,.8), rgba(59,130,246,.8));
  outline: none;
}
.fx-range::-webkit-slider-thumb{
  -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 9999px;
  background: #fff; border: 2px solid #22d3ee; cursor: pointer;
}
.fx-range::-moz-range-thumb{
  width: 18px; height: 18px; border-radius: 9999px; background: #fff; border: 2px solid #22d3ee; cursor: pointer;
}

/* Transitions */
.fx-fade-enter-active,.fx-fade-leave-active{ transition: opacity .18s ease; }
.fx-fade-enter-from,.fx-fade-leave-to{ opacity: 0; }
.fx-pop-enter-active,.fx-pop-leave-active{ transition: opacity .15s ease, transform .15s ease }
.fx-pop-enter-from,.fx-pop-leave-to{ opacity:0; transform: translateY(6px) }
</style>
