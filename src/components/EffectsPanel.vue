<template>
  <!-- Floating card (mobile-first, bottom center) -->
  <section
    class="fixed z-50 left-1/2 -translate-x-1/2 bottom-4 w-[min(92vw,28rem)] px-4 py-3 rounded-2xl
           bg-white/10 backdrop-blur-md text-white border border-cyan-600/50 shadow-2xl"
    role="region" aria-label="Effects Panel"
    :style="{ paddingBottom: `max(.75rem, env(safe-area-inset-bottom))` }"
  >
    <header class="flex items-center justify-between gap-2 mb-2">
      <h3 class="text-sm font-bold">✨ Effects</h3>
      <div class="flex items-center gap-2">
        <button class="btn-ghost text-xs" @click="copyCss" :disabled="copied">{{ copied ? 'Copied' : 'Copy CSS' }}</button>
        <button class="btn-outline text-xs" @click="resetAll" :disabled="!changed">Reset</button>
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
  </section>
</template>

<script setup>
import { reactive, computed, watch, onMounted } from 'vue'

/**
 * Props
 * - target: CSS selector au Element au Array<Element>
 * - storageKey: ufunguo wa autosave
 */
const props = defineProps({
  target: { type: [String, Object, Array], default: '.fx-target' },
  storageKey: { type: String, default: 'fx-panel-pro:v1' }
})

/* ======= State ======= */
const fx = reactive({
  // toggles
  grayscale: false, sepia: false, invert: false, mirror: false, flip: false,
  // sliders
  brightness: 1, contrast: 1, saturate: 1, hue: 0, blur: 0
})
const baseline = JSON.stringify(fx)
const changed = computed(() => JSON.stringify(fx) !== baseline)
const copied = reactive({ v: false })
Object.defineProperty(copied, 'value', { // helper for simple binding
  get(){ return this.v }, set(v){ this.v = v }
})

/* ======= Derived CSS ======= */
const filterCss = computed(() => {
  const parts = []
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
  const segs = []
  if (fx.mirror) segs.push('scaleX(-1)')
  if (fx.flip)   segs.push('scaleY(-1)')
  return segs.join(' ') || 'none'
})

/* ======= Apply to targets ======= */
function resolveTargets(){
  if (typeof window === 'undefined') return []
  const t = props.target
  if (!t) return []
  if (typeof t === 'string') return [...document.querySelectorAll(t)]
  if (t instanceof Element)  return [t]
  if (Array.isArray(t))      return t.filter(el => el instanceof Element)
  // Vue ref?
  if (t && t.$el instanceof Element) return [t.$el]
  return []
}
let applyTimer
function applyNow(){
  const nodes = resolveTargets()
  for (const el of nodes){
    el.style.filter = filterCss.value
    el.style.webkitFilter = filterCss.value // Safari
    el.style.transform = transformCss.value
    el.style.transformOrigin = 'center'
    el.style.backfaceVisibility = 'hidden'
    el.style.willChange = 'filter, transform'
  }
}
function scheduleApply(){
  clearTimeout(applyTimer)
  applyTimer = setTimeout(applyNow, 16) // ~1 frame debounce
}

/* ======= Watchers & Autosave ======= */
watch(fx, () => { scheduleApply(); saveLocal() }, { deep: true })

function saveLocal(){
  try { localStorage.setItem(props.storageKey, JSON.stringify(fx)) } catch{}
}
function loadLocal(){
  try {
    const raw = localStorage.getItem(props.storageKey)
    if (!raw) return
    const obj = JSON.parse(raw)
    Object.assign(fx, obj)
  } catch {}
}

/* ======= Presets ======= */
function applyPreset(name){
  const p = {
    cinematic: { grayscale:false, sepia:false, invert:false, brightness:1.05, contrast:1.15, saturate:1.1, hue: -10, blur:0 },
    warm:      { grayscale:false, sepia:true,  invert:false, brightness:1.06, contrast:1.05, saturate:1.15, hue: 10,  blur:0 },
    cool:      { grayscale:false, sepia:false, invert:false, brightness:1.04, contrast:1.08, saturate:1.05, hue: 190, blur:0 },
    pop:       { grayscale:false, sepia:false, invert:false, brightness:1.08, contrast:1.2,  saturate:1.25, hue: 0,   blur:0 },
    bw:        { grayscale:true,  sepia:false, invert:false, brightness:1.0,  contrast:1.1,  saturate:1.0,  hue: 0,   blur:0 }
  }[name]
  if (!p) return
  Object.assign(fx, { mirror:fx.mirror, flip:fx.flip, ...p })
}

/* ======= Actions ======= */
function resetAll(){
  Object.assign(fx, { grayscale:false, sepia:false, invert:false, mirror:false, flip:false,
    brightness:1, contrast:1, saturate:1, hue:0, blur:0 })
}
async function copyCss(){
  try{
    const css = `filter: ${filterCss.value}; transform: ${transformCss.value};`
    await navigator.clipboard.writeText(css)
    copied.value = true
    setTimeout(()=> copied.value = false, 1200)
  }catch{}
}

/* ======= Init ======= */
onMounted(() => { loadLocal(); applyNow() })
</script>

<!-- Small slider subcomponent -->
<script>
/* Inline registration of FxSlider for convenience */
export default {}
</script>

<script setup>
import { defineComponent, ref, watch } from 'vue'
const FxSlider = defineComponent({
  name: 'FxSlider',
  props: { modelValue: Number, min: Number, max: Number, step: Number, label: String, unit: { type: String, default: '' } },
  emits: ['update:modelValue'],
  setup(props, { emit }){
    const v = ref(props.modelValue ?? 0)
    watch(() => props.modelValue, (nv)=> v.value = nv)
    function onInput(e){ emit('update:modelValue', Number(e.target.value)) }
    return () => (
      <div class="w-full">
        <div class="flex items-center justify-between text-[12px] mb-1">
          <span class="text-white/80">{ props.label }</span>
          <span class="font-mono text-white/70">{ (props.modelValue ?? 0).toFixed(props.step>=1?0:2) }{props.unit}</span>
        </div>
        <input type="range"
               min={props.min} max={props.max} step={props.step} value={props.modelValue}
               onInput={onInput}
               class="w-full fx-range"/>
      </div>
    )
  }
})
</script>

<style scoped>
/* Buttons */
.btn-secondary{ @apply bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-md border border-white/10 transition; }
.btn-outline  { @apply bg-transparent hover:bg-white/10 text-white px-3 py-1 rounded-md border border-white/30 transition; }
.btn-ghost    { @apply bg-transparent hover:bg-white/10 text-white px-3 py-1 rounded-md border border-transparent transition; }
.btn-chip     { @apply text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition; }
.chip-on      { @apply bg-cyan-500 text-[#0b1324] border-cyan-400; }

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
</style>
