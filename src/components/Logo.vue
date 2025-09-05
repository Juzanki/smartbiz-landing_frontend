<template>
  <component
    :is="isLink ? (isRouterLink ? 'RouterLink' : 'a') : 'div'"
    :to="isRouterLink ? linkTo : undefined"
    :href="!isRouterLink && isLink ? linkTo : undefined"
    class="inline-block relative select-none touch-manipulation will-change-transform"
    :class="[sizeClass, shapeClass]"
    :style="[safeArea, transformStyle]"
    @click="$emit('click')"
  >
    <!-- Blur-up LQIP overlay (fades out when loaded) -->
    <div
      v-if="lqip && !loaded && !error"
      class="absolute inset-0 rounded-inherit bg-center bg-cover filter blur-md scale-[1.03] transition-opacity duration-300"
      :style="{ backgroundImage: `url('${lqip}')`, opacity: loaded ? 0 : 1 }"
    ></div>

    <!-- Picture / Image -->
    <picture v-if="sources?.length && !error">
      <source v-for="(s,i) in sources" :key="i" :type="s.type" :srcset="s.srcset" :sizes="s.sizes || sizesAttr" />
      <img
        :src="src"
        :alt="alt"
        class="w-full h-full object-cover rounded-inherit block"
        :class="[ringClass, shadowClass, imgStateClass]"
        :loading="lazy ? 'lazy' : 'eager'"
        :decoding="decoding"
        :fetchpriority="fetchPriority"
        @load="onLoad"
        @error="onError"
        draggable="false"
      />
    </picture>

    <img
      v-else-if="!error"
      :src="src"
      :alt="alt"
      class="w-full h-full object-cover rounded-inherit block"
      :class="[ringClass, shadowClass, imgStateClass]"
      :loading="lazy ? 'lazy' : 'eager'"
      :decoding="decoding"
      :fetchpriority="fetchPriority"
      @load="onLoad"
      @error="onError"
      draggable="false"
    />

    <!-- Fallback: Monogram SVG (gradient) -->
    <svg
      v-else
      class="w-full h-full rounded-inherit"
      viewBox="0 0 100 100"
      role="img"
      :aria-label="alt"
    >
      <defs>
        <linearGradient :id="gradId" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  :stop-color="grad[0]" />
          <stop offset="100%" :stop-color="grad[1]" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" :fill="`url(#${gradId})`" rx="24" />
      <text x="50" y="58" text-anchor="middle" font-weight="800"
            font-size="44" fill="white">{{ initials }}</text>
    </svg>

    <!-- Skeleton shimmer (first mount) -->
    <div
      v-if="!loaded && !error"
      class="absolute inset-0 rounded-inherit overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div class="skeleton w-full h-full"></div>
    </div>

    <!-- Badge (optional) -->
    <div
      v-if="badge"
      class="absolute -bottom-1 -right-1 text-[10px] font-black px-2 py-0.5 rounded-full
             bg-amber-400 text-black border border-black/10 shadow"
    >
      {{ badge }}
    </div>
  </component>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'

/* Props */
const props = defineProps({
  src:        { type: String, default: '@/assets/logo.svg' },
  alt:        { type: String, default: 'SmartBiz Logo' },
  brand:      { type: String, default: 'SmartBiz' },           // kwa monogram
  size:       { type: String, default: 'md' },                 // xs|sm|md|lg|xl|2xl
  shape:      { type: String, default: 'circle' },             // circle|rounded|square
  ring:       { type: Boolean, default: true },
  shadow:     { type: Boolean, default: true },
  lazy:       { type: Boolean, default: true },
  highPriority:{ type: Boolean, default: false },
  decoding:   { type: String,  default: 'async' },
  lqip:       { type: String,  default: '' },                  // blur-up
  sources:    { type: Array,   default: null },                // [{type,srcset,sizes?}]
  sizesAttr:  { type: String,  default: '(max-width:768px) 64px, 96px' },
  interactive:{ type: Boolean, default: true },                // tilt/parallax (desktop)
  linkTo:     { type: String,  default: '' },                  // '/home' or 'https://...'
  badge:      { type: String,  default: '' },                  // 'BETA'|'PRO'|...
})

defineEmits(['load','error','click'])

/* Safe-area */
const safeArea = { padding: 'env(safe-area-inset, 0px)' }

/* State */
const loaded = ref(false)
const error  = ref(false)

/* Sizes */
const sizeClass = computed(()=>{
  const map = {
    xs: 'h-6  w-6 ',  // 24px
    sm: 'h-10 w-10',  // 40px
    md: 'h-16 w-16',  // 64px
    lg: 'h-20 w-20',  // 80px
    xl: 'h-24 w-24',  // 96px
    '2xl': 'h-32 w-32'
  }
  return map[props.size] || map.md
})
const shapeClass = computed(()=>{
  if (props.shape==='circle') return 'rounded-full'
  if (props.shape==='rounded') return 'rounded-2xl'
  return 'rounded-md'
})
const ringClass = computed(()=> props.ring
  ? 'ring-1 ring-black/10 dark:ring-white/15'
  : ''
)
const shadowClass = computed(()=> props.shadow
  ? 'shadow-[0_6px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]'
  : ''
)
const imgStateClass = computed(()=> loaded.value ? 'opacity-100' : 'opacity-95')

/* Loading/Errors */
function onLoad(e){ loaded.value = true; error.value = false; emit('load', e) }
function onError(e){ error.value = true; loaded.value = false; emit('error', e) }

/* Fallback initials + gradient (deterministic by brand) */
const initials = computed(()=>{
  const words = (props.brand || 'S').split(/\s+/).filter(Boolean)
  return (words[0]?.[0] || 'S').toUpperCase() + (words[1]?.[0] || '').toUpperCase()
})
function hash(s){ let h=0; for (let i=0;i<s.length;i++) h=(h*31 + s.charCodeAt(i))|0; return Math.abs(h) }
const palettes = [
  ['#6366F1','#DB2777'], ['#06B6D4','#8B5CF6'], ['#22C55E','#14B8A6'],
  ['#F59E0B','#EF4444'], ['#0EA5E9','#10B981'], ['#A855F7','#F43F5E']
]
const grad = computed(()=> palettes[hash(props.brand)%palettes.length])
const gradId = `g-${Math.random().toString(36).slice(2,7)}`

/* Link handling */
const isLink = computed(()=> !!props.linkTo)
const isRouterLink = computed(()=> isLink.value && props.linkTo.startsWith('/'))

/* Performance */
const fetchPriority = computed(()=> props.highPriority ? 'high' : (props.lazy ? 'low' : 'auto'))

/* Tilt / parallax (desktop only, honors reduced motion) */
const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
const enableTilt = computed(()=> props.interactive && !prefersReduced && matchMedia('(pointer:fine)').matches )
let onMove = null, onLeave = null
const transformStyle = ref({})
onMounted(()=>{
  if (!enableTilt.value) return
  const el = document.querySelector('[data-tilt-id="'+gradId+'"]') || null
})
const root = ref(null)
onMounted(()=>{
  if (!enableTilt.value) return
  const el = rootEl()
  onMove = (e)=>{
    const r = el.getBoundingClientRect()
    const cx = (e.clientX - r.left) / r.width - 0.5
    const cy = (e.clientY - r.top) / r.height - 0.5
    const rx = (-cy * 8).toFixed(2)
    const ry = ( cx * 8).toFixed(2)
    transformStyle.value = { transform: `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.01)` }
  }
  onLeave = ()=> transformStyle.value = { transform: 'perspective(600px) rotateX(0) rotateY(0) scale(1)' }
  el.addEventListener('pointermove', onMove, { passive: true })
  el.addEventListener('pointerleave', onLeave, { passive: true })
})
onBeforeUnmount(()=>{
  if (!enableTilt.value) return
  const el = rootEl()
  el.removeEventListener?.('pointermove', onMove)
  el.removeEventListener?.('pointerleave', onLeave)
})
function rootEl(){ return (root.value?.$el || root.value || document.currentScript)?.parentElement || document.body }

/* Expose root for tilt container */
</script>

<script>
export default { name: 'LogoPro', components: { RouterLink } }
</script>

<style scoped>
/* Skeleton shimmer */
.skeleton {
  background: linear-gradient(90deg, rgba(0,0,0,.06) 25%, rgba(0,0,0,.1) 37%, rgba(0,0,0,.06) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.2s linear infinite;
}
:global(.dark) .skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,.06) 25%, rgba(255,255,255,.12) 37%, rgba(255,255,255,.06) 63%);
}

@keyframes shimmer { 0%{ background-position: 100% 0 } 100%{ background-position: 0 0 } }

/* Rounded-inherit helper (Tailwind doesn't have it by default) */
.rounded-inherit { border-radius: inherit; }
</style>
