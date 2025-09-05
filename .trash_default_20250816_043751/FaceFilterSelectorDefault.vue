<template>
  <section
    class="ffp w-[min(94vw,28rem)] md:w-[90vw] md:max-w-md mx-auto bg-black/70 backdrop-blur-md rounded-2xl p-3 md:p-4 text-white border border-white/10 shadow-2xl"
    role="region" aria-label="Face Filter Picker"
    :style="{ paddingBottom: 'max(.5rem, env(safe-area-inset-bottom))' }"
  >
    <!-- Header -->
    <header class="flex items-center justify-between mb-2">
      <h3 class="text-sm font-bold">{{ title }}</h3>
      <div class="flex items-center gap-2">
        <button class="ffp-btn ghost text-xs" @click="reset()">Reset</button>
        <button class="ffp-btn outline text-xs" @click="showFavs=!showFavs">{{ showFavs ? 'All' : '★ Favs' }}</button>
      </div>
    </header>

    <!-- Mobile: horizontal snap carousel -->
    <ul
      ref="rail"
      class="md:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory px-1 pb-1 -mx-1 hide-scroll"
      role="listbox" aria-label="Filters"
      @keydown.left.prevent="focusPrev" @keydown.right.prevent="focusNext"
    >
      <li v-for="(f, i) in visibleFilters" :key="f.id" role="option" :aria-selected="f.id===selected">
        <button
          class="ffp-item snap-start"
          :class="{ 'ring-2 ring-pink-400': f.id === selected }"
          @click="onSelect(f.id, $event)"
          @dblclick.prevent="onSelect(f.id, $event, true)"
          @pointerdown="pressStart(f.id)" @pointerup="pressEnd" @pointercancel="pressEnd" @pointerleave="pressEnd"
          :data-idx="i" :aria-label="`Filter ${f.name}`"
        >
          <div class="thumb">
            <div v-if="!loaded[f.id]" class="skeleton"></div>
            <img v-else :src="f.preview" :alt="`${f.name} preview`" loading="lazy" decoding="async" />
            <button class="fav" :aria-pressed="isFav(f.id)" @click.stop="toggleFav(f.id)">{{ isFav(f.id) ? '★' : '☆' }}</button>
          </div>
          <div class="label">{{ f.name }}</div>
        </button>
      </li>
    </ul>

    <!-- Desktop: grid -->
    <div class="hidden md:grid grid-cols-4 gap-3">
      <button
        v-for="f in visibleFilters" :key="f.id"
        class="ffp-item"
        :class="{ 'ring-2 ring-pink-400': f.id === selected }"
        @click="onSelect(f.id, $event)"
        @dblclick.prevent="onSelect(f.id, $event, true)"
        @pointerdown="pressStart(f.id)" @pointerup="pressEnd" @pointercancel="pressEnd" @pointerleave="pressEnd"
        :aria-label="`Filter ${f.name}`"
      >
        <div class="thumb">
          <div v-if="!loaded[f.id]" class="skeleton"></div>
          <img v-else :src="f.preview" :alt="`${f.name} preview`" loading="lazy" decoding="async" />
          <button class="fav" :aria-pressed="isFav(f.id)" @click.stop="toggleFav(f.id)">{{ isFav(f.id) ? '★' : '☆' }}</button>
        </div>
        <div class="label">{{ f.name }}</div>
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  selected: { type: String, default: 'none' },
  filters: {
    type: Array,
    default: () => ([
      { id:'none',   name:'None',          preview:'/filters/none.png' },
      { id:'beauty', name:'Beauty',        preview:'/filters/beauty.png' },
      { id:'cool',   name:'Cool Tone',     preview:'/filters/cool.png' },
      { id:'warm',   name:'Warm Tone',     preview:'/filters/warm.png' },
      { id:'bw',     name:'Black & White', preview:'/filters/bw.png' },
      { id:'retro',  name:'Retro',         preview:'/filters/retro.png' },
      { id:'dreamy', name:'Dreamy',        preview:'/filters/dreamy.png' },
      { id:'neon',   name:'Neon Glow',     preview:'/filters/neon.png' },
    ])
  },
  title: { type: String, default: '🎭 Choose a Face Filter' },
  storageKey: { type: String, default: 'facefilter:favs:v1' }   // save ★
})
const emit = defineEmits(['select','preview','favorite'])

/* State */
const rail = ref(null)
const showFavs = ref(false)
const loaded = reactive({})
const favs = ref(new Set())

/* Load images lazily (mark loaded) */
onMounted(() => {
  // mark images as loaded after first tick if cached
  requestAnimationFrame(() => {
    for (const f of props.filters) {
      const img = new Image()
      img.src = f.preview
      img.decode?.().then(() => (loaded[f.id] = true)).catch(()=>{}) // browser may already have it
    }
  })
  // load favorites
  try { const raw = localStorage.getItem(props.storageKey); if (raw) favs.value = new Set(JSON.parse(raw)) } catch {}
})
function persistFavs(){ try { localStorage.setItem(props.storageKey, JSON.stringify([...favs.value])) } catch {} }

/* Computed lists */
const allFilters = computed(() => props.filters)
const visibleFilters = computed(() => showFavs.value
  ? allFilters.value.filter(f => favs.value.has(f.id) || f.id === 'none')
  : allFilters.value
)

/* Actions */
function reset(){ select('none'); vibrate(6) }
function select(id){ emit('select', id); snapTo(id) }
function onSelect(id, e, burst=false){ vibrate(burst?10:6); select(id) }

/* Favorites */
function isFav(id){ return favs.value.has(id) }
function toggleFav(id){
  if (id === 'none') return
  favs.value.has(id) ? favs.value.delete(id) : favs.value.add(id)
  persistFavs()
  emit('favorite', { id, favorite: favs.value.has(id) })
  vibrate(4)
}

/* Long-press preview */
let pressTimer = null
function pressStart(id){
  clearTimeout(pressTimer)
  pressTimer = setTimeout(()=> { emit('preview', id); vibrate(8) }, 280)
}
function pressEnd(){ clearTimeout(pressTimer); pressTimer = null; emit('preview', null) }
onBeforeUnmount(()=> clearTimeout(pressTimer))

/* Keyboard nav (external keyboards / desktop) */
function focusPrev(){
  const nodes = [...(rail.value?.querySelectorAll('[data-idx]') || [])]
  const i = nodes.indexOf(document.activeElement)
  const next = i > 0 ? nodes[i-1] : nodes.at(-1)
  next?.focus()
}
function focusNext(){
  const nodes = [...(rail.value?.querySelectorAll('[data-idx]') || [])]
  const i = nodes.indexOf(document.activeElement)
  const next = i >= 0 && i < nodes.length-1 ? nodes[i+1] : nodes[0]
  next?.focus()
}

/* Snap selected into view (mobile) */
function snapTo(id){
  const idx = visibleFilters.value.findIndex(x => x.id === id)
  if (idx < 0) return
  const el = rail.value?.querySelector(`[data-idx="${idx}"]`)
  el?.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' })
}

/* Haptics */
function vibrate(ms){ if (navigator.vibrate) try{ navigator.vibrate(ms) }catch{} }

/* Keep snapping if parent changes `selected` */
watch(() => props.selected, (id) => snapTo(id))
</script>

<style scoped>
/* Hide mobile scrollbars */
.hide-scroll { scrollbar-width: none; }
.hide-scroll::-webkit-scrollbar { display: none; }

/* Item */
.ffp-item{
  position: relative;
  width: 5.25rem; padding: .35rem;
  border-radius: 1rem; border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  transition: background .2s ease, transform .12s ease, border-color .2s ease;
}
.ffp-item:hover{ background: rgba(255,255,255,.12) }
.ffp-item:active{ transform: scale(.98) }

/* Thumb + skeleton */
.thumb{ position: relative; width: 4.5rem; height: 4.5rem; margin: 0 auto; border-radius: .75rem; overflow: hidden; }
.thumb img{ width:100%; height:100%; object-fit: cover; }
.skeleton{
  width:100%; height:100%;
  background: linear-gradient(110deg, rgba(255,255,255,.08) 8%, rgba(255,255,255,.02) 18%, rgba(255,255,255,.08) 33%);
  background-size: 200% 100%;
  animation: shimmer 1.2s linear infinite;
}
@keyframes shimmer { to { background-position-x: -200% } }

/* Label */
.label{ font-size: 11px; text-align:center; margin-top:.35rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* Favorite star */
.fav{
  position:absolute; right:.25rem; top:.25rem;
  font-size:.9rem; line-height:1; color:#ffd166;
  background: rgba(0,0,0,.35); border:1px solid rgba(255,255,255,.2);
  border-radius:.5rem; padding:0 .25rem;
}

/* Buttons */
.ffp-btn{ padding:.25rem .5rem; border-radius:.5rem; }
.ffp-btn.ghost{ background:transparent; border:1px solid transparent; color:#fff; }
.ffp-btn.ghost:hover{ background:rgba(255,255,255,.08) }
.ffp-btn.outline{ background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); }
.ffp-btn.outline:hover{ background:rgba(255,255,255,.12) }

/* Container font */
.ffp{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Inter', sans-serif; }

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce){
  .ffp-item{ transition: none }
  .skeleton{ animation: none }
}
</style>
