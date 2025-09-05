// src/effects/registry.ts
import { defineAsyncComponent } from 'vue'

/* ---------- Feature detection (mobile-first heuristics) ---------- */
const support = {
  webgl: (() => {
    try { return !!document.createElement('canvas').getContext('webgl') } catch { return false }
  })(),
  backdropFilter: typeof CSS !== 'undefined' && !!CSS.supports?.('backdrop-filter', 'blur(1px)'),
  reducedMotion: typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  saveData: (navigator as any)?.connection?.saveData === true,
  effectiveType: (navigator as any)?.connection?.effectiveType || '4g',
  deviceMemory: (navigator as any)?.deviceMemory || 4, // rough hint (GB)
}

type Weight = 'light' | 'medium' | 'heavy'
type Need = 'webgl' | 'backdropFilter'
type Category = 'movement' | 'lighting' | 'energy' | 'symbolic' | 'live' | 'filter'

/* ---------- Effect metadata + dynamic import map ---------- */
type Loader = () => Promise<any>
interface EffectMeta {
  loader: Loader
  category: Category
  weight: Weight
  needs?: Need[]
  /** Optional fallback key for low-tier or reduced-motion devices */
  fallback?: EffectKey
  /** Prefer on touch/mobile? (used in warm-up decisions) */
  mobileFriendly?: boolean
}

export const effects: Record<string, EffectMeta> = {
  // 🌫️ Movement / Trail Effects
  smokeTrail:     { loader: () => import('@/components/effects/SmokeTrail.vue'),     category: 'movement', weight: 'medium', mobileFriendly: true },
  shockWave:      { loader: () => import('@/components/effects/ShockWave.vue'),      category: 'movement', weight: 'heavy',  needs:['webgl'], fallback: 'sparkleBurst' },
  sparkleBurst:   { loader: () => import('@/components/effects/SparkleBurst.vue'),   category: 'movement', weight: 'light',  mobileFriendly: true },

  // 🔦 Lighting & Glow
  spotlight:      { loader: () => import('@/components/effects/SpotlightGlow.vue'),  category: 'lighting', weight: 'medium', needs:['backdropFilter'], fallback: 'neonFrame' },
  neonFrame:      { loader: () => import('@/components/effects/NeonFrame.vue'),      category: 'lighting', weight: 'light',  mobileFriendly: true },
  stageLighting:  { loader: () => import('@/components/effects/StageLighting.vue'),  category: 'lighting', weight: 'heavy',  needs:['webgl'], fallback: 'neonFrame' },

  // ⚡ Energy / Impact
  energyPulse:    { loader: () => import('@/components/effects/EnergyPulse.vue'),    category: 'energy',   weight: 'medium', mobileFriendly: true },
  fireworksBurst: { loader: () => import('@/components/effects/FireworksBurst.vue'), category: 'energy',   weight: 'heavy',  needs:['webgl'], fallback: 'sparkleBurst' },

  // 🚩 Symbolic / Thematic
  flagPlant:      { loader: () => import('@/components/effects/FlagPlantEffect.vue'),category: 'symbolic', weight: 'light',  mobileFriendly: true },
  express:        { loader: () => import('@/components/effects/ExpressEffect.vue'),  category: 'symbolic', weight: 'light',  mobileFriendly: true },

  // 💬 Enhanced Live Effects
  floatingComments:{ loader: () => import('@/components/effects/FloatingComments.vue'), category: 'live', weight: 'light', mobileFriendly: true },
  floatingParticles:{ loader: () => import('@/components/effects/FloatingParticles.vue'), category: 'live', weight: 'medium', mobileFriendly: true },

  // 😎 Fun Layered Filters
  facefilter:     { loader: () => import('@/components/effects/FacefilterLayer.vue'),category: 'filter',  weight: 'medium', needs:['webgl'], fallback: 'neonFrame' },
} as const

export type EffectKey = keyof typeof effects

/* ---------- Low-tier device classifier ---------- */
function isLowTier(): boolean {
  const slowNet = ['2g', 'slow-2g', '3g'].includes(support.effectiveType)
  return support.reducedMotion || support.saveData || slowNet || support.deviceMemory < 3
}

/* ---------- Choose best effect (fallback if needed) ---------- */
export function pickEffect(key: EffectKey): EffectKey {
  const meta = effects[key]
  if (!meta) return key

  // Requirements not met? fall back
  if (meta.needs?.includes('webgl') && !support.webgl && meta.fallback) return meta.fallback
  if (meta.needs?.includes('backdropFilter') && !support.backdropFilter && meta.fallback) return meta.fallback

  // Low-tier devices avoid heavy
  if (isLowTier() && meta.weight === 'heavy' && meta.fallback) return meta.fallback

  return key
}

/* ---------- Async component loader with tiny built-ins ---------- */
const FxLoading = {
  name: 'FxLoading',
  template: `<div class="fx-skel" aria-busy="true" style="width:100%;height:48px;border-radius:12px;background:
  linear-gradient(90deg, rgba(0,0,0,.06), rgba(0,0,0,.03), rgba(0,0,0,.06));background-size:200% 100%;
  animation:fxsh 1.1s linear infinite"></div>`
}
const FxError = {
  name: 'FxError',
  props: { msg: { type: String, default: 'Failed to load effect' } },
  template: `<div role="alert" style="padding:10px;border-radius:10px;background:#fee2e2;color:#991b1b">
    ⚠️ {{ msg }} — tap to retry
  </div>`
}

export function loadEffect(key: EffectKey, options?: {
  /** Disable Suspense for simpler mobile templates (default false = Suspense ok) */
  suspensible?: boolean
  /** ms before timing out (default 12s) */
  timeout?: number
}) {
  const chosen = pickEffect(key)
  const meta = effects[chosen]

  return defineAsyncComponent({
    loader: meta.loader,
    suspensible: options?.suspensible ?? false,
    timeout: options?.timeout ?? 12_000,
    loadingComponent: FxLoading,
    errorComponent: FxError,
    onError(err, retry, fail, attempts) {
      // One auto-retry, then surface error
      if (attempts <= 1) retry()
      else fail(err)
    }
  })
}

/* ---------- Preload helpers (mobile-first friendly) ---------- */
const cache = new Map<EffectKey, Promise<any>>()

export function preloadEffect(key: EffectKey): Promise<any> {
  const chosen = pickEffect(key)
  if (!cache.has(chosen)) cache.set(chosen, effects[chosen].loader())
  return cache.get(chosen)!
}

/** Warm up several effects during browser idle time (won’t block UI) */
export function warmEffectsOnIdle(keys: EffectKey[], { onlyMobileFriendly = true } = {}) {
  const list = keys
    .map(k => pickEffect(k))
    .filter(k => (onlyMobileFriendly ? (effects[k].mobileFriendly ?? true) : true))

  const rIC = (window as any).requestIdleCallback || ((cb: Function) => setTimeout(() => cb({ timeRemaining: () => 50 }), 300))
  rIC(() => list.forEach(k => preloadEffect(k).catch(() => {})))
}

/* ---------- Tiny utils for consumers ---------- */
export function isEffectSupported(key: EffectKey): boolean {
  const meta = effects[key]
  if (!meta) return false
  if (meta.needs?.includes('webgl') && !support.webgl) return false
  if (meta.needs?.includes('backdropFilter') && !support.backdropFilter) return false
  return true
}
export function listEffects(filter?: Partial<{ category: Category; weight: Weight }>): EffectKey[] {
  return (Object.keys(effects) as EffectKey[]).filter(k => {
    const m = effects[k]
    return (!filter?.category || m.category === filter.category) &&
           (!filter?.weight || m.weight === filter.weight)
  })
}
