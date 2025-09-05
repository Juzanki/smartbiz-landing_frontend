<!-- FaceFilterPickerPro.vue -->
<template>
  <section
    class="ffp fixed left-1/2 -translate-x-1/2 bottom-4 w-[min(94vw,28rem)] md:static md:translate-x-0 md:w-full
           bg-black/70 backdrop-blur-md rounded-2xl p-3 md:p-4 text-white border border-white/10 shadow-2xl"
    role="region" aria-label="Face Filter Picker"
    :style="{ paddingBottom: 'max(.5rem, env(safe-area-inset-bottom))' }"
  >
    <!-- Header -->
    <header class="flex items-center justify-between mb-2">
      <h3 class="text-sm font-bold">{{ title }}</h3>
      <div class="flex items-center gap-2">
        <button class="ffp-btn ghost text-xs" @click="onReset" aria-label="Reset filter">Reset</button>
        <button class="ffp-btn outline text-xs" @click="toggleFavView" :aria-pressed="showFavs">
          {{ showFavs ? 'All' : '★ Favs' }}
        </button>
      </div>
    </header>

    <!-- Mobile: horizontal snap carousel -->
    <ul
      ref="rail"
      class="md:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory px-1 pb-1 -mx-1 hide-scroll"
      role="listbox"
      aria-label="Filters"
      @keydown.left.prevent="focusPrev"
      @keydown.right.prevent="focusNext"
    >
      <li v-for="(f, i) in visibleFilters" :key="f.id" role="option" :aria-selected="f.id === selected">
        <button
          class="ffp-item snap-start"
          :class="{ 'ring-2 ring-pink-400': f.id === selected }"
          @click="onSelect(f.id, $event)"
          @dblclick.prevent="onSelect(f.id, $event, true)"
          @pointerdown="pressStart(f.id, $event)"
          @pointerup="pressEnd"
          @pointercancel="pressEnd"
          @pointerleave="pressEnd"
          :data-idx="i"
          :aria-label="`Filter ${f.name}`"
        >
          <div class="thumb">
            <img
              v-if="f.preview"
              :src="f.preview" :alt="`${f.name} preview`"
              loading="lazy" decoding="async" @load="markLoaded(f.id)"
              :class="{ 'loaded': loaded[f.id] }"
            />
            <div v-else class="fallback">{{ f.emoji || '🎭' }}</div>
            <button
              class="fav" :aria-pressed="isFav(f.id)" :title="isFav(f.id) ? 'Unfavorite' : 'Favorite'"
              @click.stop="toggleFav(f.id)"
            >{{ isFav(f.id) ? '★' : '☆' }}</button>
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
        @pointerdown="pressStart(f.id, $event)"
        @pointerup="pressEnd" @pointercancel="pressEnd" @pointerleave="pressEnd"
        :aria-label="`Filter ${f.name}`"
      >
        <div class="thumb">
          <img
            v-if="f.preview"
            :src="f.preview" :alt="`${f.name} preview`"
            loading="lazy" decoding="async" @load="markLoaded(f.id)"
            :class="{ 'loaded': loaded[f.id] }"
          />
          <div v-else class="fallback">{{ f.emoji || '🎭' }}</div>
          <button class="fav" :aria-pressed="isFav(f.id)" @click.stop="toggleFav(f.id)">
            {{ isFav(f.id) ? '★' : '☆' }}
          </button>
        </div>
        <div class="label">{{ f.name }}</div>
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted, onBeforeUnmount } from 'vue'

/* Props & Emits */
const props = defineProps({
  selected: { type: String, default: 'none' },
  filters:  {
    type: Array,
    default: () => ([
      { id:'none',   name:'None',          preview:'/filters/none.png',   emoji:'🚫' },
      { id:'beauty', name:'Beauty',        preview:'/filters/beauty.png', emoji:'✨' },
      { id:'cool',   name:'Cool Tone',     preview:'/filters/cool.png',   emoji:'❄️' },
      { id:'warm',   name:'Warm Tone',     preview:'/filters/warm.png',   emoji:'🔥' },
      { id:'bw',     name:'Black & White', preview:'/filters/bw.png',     emoji:'⚫️' },
      { id:'retro',  name:'Retro',         preview:'/filters/retro.png',  emoji:'📼' },
      { id:'dreamy', name:'Dreamy',        preview:'/filters/dreamy.png', emoji:'🌫️' },
      { id:'neon',   name:'Neon Glow',     preview:'/filters/neon.png',   emoji:'🌈' },
    ])
  },
  title: { type: String, default: '🎭 Choose a Face Filter' },
  storageKey: { type: String, default: 'facefilter:favs:v1' } // localStorage favs
})
const emit = defineEmits(['select','preview','favorite'])

/* State */
const rail = ref(null)
const loaded = reactive({})
const showFavs = ref(false)
const favs = ref(new Set())

/* Load favorites */
onMounted(() => {
  try {
    const raw = localStorage.getItem(props.storageKey)
    if (raw) favs.value = new Set(JSON.parse(raw))
  } catch {}
})
function persistFavs(){
  try { localStorage.setItem(props.storageKey, JSON.stringify([...favs.value])) } catch {}
}

/* Filters view */
const allFilters = computed(() => props.filters)
const visibleFilters = computed(() => showFavs.value
  ? allFilters.value.filter(f => favs.value.has(f.id) || f.id === 'none')
  : allFilters.value
)

/* Actions */
function onReset(){ select('none'); vibrate(6) }
function toggleFavView(){ showFavs.value = !showFavs.value }

function isFav(id){ return favs.value.has(id) }
function toggleFav(id){
  if (id === 'none') return
  if (favs.value.has(id)) favs.value.delete(id); else favs.value.add(id)
  persistFavs()
  emit('favorite', { id, favorite: favs.value.has(id) })
  vibrate(4)
}

function select(id){
  emit('select', id)
  // optional: autosnap to selected on mobile
  snapTo(id)
}

function onSelect(id, e, burst=false){
  if (burst) vibrate(10); else vibrate(6)
  select(id)
}

/* Long-press preview */
let pressTimer = null
function pressStart(id, e){
  clearTimeout(pressTimer)
  pressTimer = setTimeout(()=> {
    emit('preview', id)    // parent anaweza ku-apply preview ya muda
    vibrate(8)
  }, 280)
}
function pressEnd(){
  clearTimeout(pressTimer); pressTimer = null
  emit('preview', null)     // ondoa preview
}

/* Lazy helpers */
function markLoaded(id){ loaded[id] = true }

/* Keyboard nav (mobile ext kb + desktop) */
function idxById(id){ return visibleFilters.value.findIndex(x => x.id === id) }
function focusPrev(){
  const nodes = [...(rail.value?.querySelectorAll('[data-idx]') || [])]
  const active = document.activeElement
  const i = nodes.indexOf(active)
  const next = i > 0 ? nodes[i-1] : nodes.at(-1)
  next?.focus()
}
function focusNext(){
  const nodes = [...(rail.value?.querySelectorAll('[data-idx]') || [])]
  const active = document.activeElement
  const i = nodes.indexOf(active)
  const next = i >= 0 && i < nodes.length-1 ? nodes[i+1] : nodes[0]
  next?.focus()
}

/* Auto-snap selected into view on small screens */
function snapTo(id){
  const i = idxById(id); if (i < 0) return
  const el = rail.value?.querySelector(`[data-idx="${i}"]`)
  el?.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' })
}

/* Haptics */
function vibrate(ms){ if (navigator.vibrate) try{ navigator.vibrate(ms) }catch{} }

/* Cleanup */
onBeforeUnmount(()=> clearTimeout(pressTimer))

/* Sync snap when selected prop changes from parent */
watch(() => props.selected, (id) => snapTo(id))
</script>

<style scoped>
/* Hide scrollbars (mobile rails) */
.hide-scroll { scrollbar-width: none; }
.hide-scroll::-webkit-scrollbar { display: none; }

/* Item */
.ffp-item{
  position: relative;
  width: 5.25rem; /* 84px */
  padding: .35rem;
  border-radius: 1rem;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  transition: background .2s ease, transform .12s ease, border-color .2s ease;
}
.ffp-item:active{ transform: scale(.98) }
.ffp-item:hover{ background: rgba(255,255,255,.12) }

/* Thumb */
.thumb{
  position: relative; width: 4.5rem; height: 4.5rem; margin: 0 auto;
  border-radius: .75rem; overflow: hidden;
  background: linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.02));
}
.thumb img{
  width: 100%; height: 100%; object-fit: cover;
  opacity: 0; filter: blur(8px);
  transition: opacity .25s ease, filter .35s ease;
}
.thumb img.loaded{ opacity: 1; filter: blur(0) }
.fallback{
  width: 100%; height: 100%; display:grid; place-items:center; font-size: 1.5rem;
}

/* Label */
.label{
  font-size: 11px; text-align:center; margin-top:.35rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}

/* Favorite button */
.fav{
  position:absolute; right:.25rem; top:.25rem;
  font-size: .9rem; line-height:1; background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.2);
  border-radius: .5rem; padding: 0 .25rem; color: #ffd166;
}

/* Buttons */
.fff {}
.ffp-btn{ padding: .25rem .5rem; border-radius: .5rem; }
.ffp-btn.ghost{ background: transparent; border: 1px solid transparent; color: #fff; }
.ffp-btn.ghost:hover{ background: rgba(255,255,255,.08) }
.ffp-btn.outline{ background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); }
.ffp-btn.outline:hover{ background: rgba(255,255,255,.12) }

/* Container */
.ffp{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Inter', sans-serif; }

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce){
  .thumb img{ transition: none }
  .ffp-item{ transition: none }
}
</style>
