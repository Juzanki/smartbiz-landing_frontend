<!-- src/components/ui/Toast.vue -->
<template>
  <!-- Container respects safe-area; defaults to bottom on phones -->
  <div
    class="toast-wrap pointer-events-none"
    :class="wrapClass"
    :style="wrapStyle"
    role="region"
    aria-label="Notifications"
  >
    <!-- Screenreader live region -->
    <span class="sr-only" aria-live="polite">{{ srAnnounce }}</span>

    <transition-group name="stack" tag="div" class="space-y-2 sm:space-y-3">
      <div
        v-for="t in items"
        :key="t.id"
        class="toast pointer-events-auto"
        :class="['type-'+t.type, t.action ? 'has-action' : '']"
        :style="toastStyle(t)"
        tabindex="0"
        :role="t.type==='error' ? 'alert' : 'status'"
        @pointerdown="onPointerDown(t, $event)"
        @pointermove="onPointerMove(t, $event)"
        @pointerup="onPointerUp(t, $event)"
        @pointercancel="onPointerUp(t, $event)"
        @mouseenter="pause(t)"
        @mouseleave="resume(t)"
        @focusin="pause(t)"
        @focusout="resume(t)"
      >
        <div class="toast-main">
          <div class="toast-icon" :aria-hidden="true">
            <span v-if="t.type==='success'">✓</span>
            <span v-else-if="t.type==='warn'">⚑</span>
            <span v-else-if="t.type==='info'">ℹ︎</span>
            <span v-else>⚠</span>
          </div>

          <div class="toast-text">
            <p class="toast-title" v-if="t.title">{{ t.title }}</p>
            <p class="toast-body">{{ t.text }}</p>
          </div>

          <button
            v-if="t.action"
            class="toast-action"
            type="button"
            @click.stop="handleAction(t)"
          >
            {{ t.action.label }}
          </button>

          <button
            class="toast-close"
            type="button"
            aria-label="Close"
            @click.stop="dismiss(t.id)"
          >
            ✖
          </button>
        </div>

        <!-- Progress bar -->
        <div v-if="t.ttl > 0 && showProgress" class="toast-progress">
          <div class="bar" :style="{ width: progressPct(t) + '%' }"></div>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/** ✅ Runtime props only (NO withDefaults) */
const props = defineProps({
  /** 'bottom' (mobile default), 'top', 'top-right', 'top-left', 'bottom-right', 'bottom-left' */
  position:    { type: String,  default: 'bottom' },
  /** Max toasts rendered at once (newest replaces oldest) */
  max:         { type: Number,  default: 4 },
  /** Show progress bar */
  showProgress:{ type: Boolean, default: true },
  /** Base TTL fallback (ms) if not provided in push() */
  defaultTtl:  { type: Number,  default: 4000 },
  /** Safe-area padding toggle */
  safeArea:    { type: Boolean, default: true }
})

type ToastType = 'success' | 'warn' | 'error' | 'info'
type ToastAction = { label: string; handler?: (() => void) | null }
type ToastItem = {
  id: string
  type: ToastType
  title: string
  text: string
  ttl: number
  t0: number
  remaining: number
  paused: boolean
  dx: number
  vx: number
  _downX: number
  _lastX: number
  _lastTs: number
  _raf?: number
  _lastTick?: number
  action: ToastAction | null
}

/** State */
const items = ref<ToastItem[]>([])
const srAnnounce = ref('')

/** Container placement */
const wrapClass = computed(() => {
  switch (props.position) {
    case 'top':           return 'place-top'
    case 'top-right':     return 'place-top-right'
    case 'top-left':      return 'place-top-left'
    case 'bottom-right':  return 'place-bottom-right'
    case 'bottom-left':   return 'place-bottom-left'
    case 'bottom':
    default:              return 'place-bottom'
  }
})
const wrapStyle = computed(() => ({
  paddingTop:    props.safeArea ? 'max(env(safe-area-inset-top,0px), 0px)'     : '0px',
  paddingBottom: props.safeArea ? 'max(env(safe-area-inset-bottom,0px), 12px)' : '12px',
  paddingLeft:   props.safeArea ? 'max(env(safe-area-inset-left,0px), 0px)'    : '0px',
  paddingRight:  props.safeArea ? 'max(env(safe-area-inset-right,0px), 0px)'   : '0px'
}))

/** Helpers */
function now() { return (performance as any)?.now ? performance.now() : Date.now() }
function uid() { try { return crypto.randomUUID() } catch { return Math.random().toString(36).slice(2) } }

/** Public API */
function push(type: ToastType, text: string, ttlOrOpts?: number | Partial<ToastItem> & { ttl?: number; title?: string; action?: ToastAction }) {
  const opts = (typeof ttlOrOpts === 'object' && ttlOrOpts !== null) ? ttlOrOpts : { ttl: ttlOrOpts }
  const ttl = Math.max(0, Number(opts.ttl ?? props.defaultTtl))
  const id  = uid()
  const t0  = now()
  const item: ToastItem = {
    id,
    type: (['success','warn','error','info'] as ToastType[]).includes(type) ? type : 'info',
    title: String((opts as any).title || ''),
    text: String(text ?? ''),
    ttl,
    t0,
    remaining: ttl,
    paused: false,
    dx: 0, vx: 0, _downX: 0, _lastX: 0, _lastTs: t0,
    action: (opts as any).action ? { label: String((opts as any).action.label || 'Open'), handler: (opts as any).action.handler || null } : null
  }

  // cap stack
  if (items.value.length >= props.max) items.value.shift()
  items.value.push(item)

  // haptics (subtle)
  try { navigator.vibrate?.(type === 'error' ? 20 : type === 'warn' ? 12 : 6) } catch {}

  // screenreader
  srAnnounce.value = item.text

  // schedule auto-dismiss
  if (ttl > 0) startTimer(item)
  return id
}
function success(text: string, ttl?: number) { return push('success', text, ttl) }
function warn(text: string, ttl?: number)    { return push('warn', text, ttl) }
function error(text: string, ttl?: number)   { return push('error', text, ttl) }
function info(text: string, ttl?: number)    { return push('info', text, ttl) }
function clear() { items.value.splice(0) }
function dismiss(id: string) { items.value = items.value.filter(i => i.id !== id) }
function handleAction(t: ToastItem){ try{ t.action?.handler?.() }finally{ dismiss(t.id) } }

defineExpose({ push, success, warn, error, info, clear, dismiss })

/** Timers (pause/resume with hover/press/focus) */
function startTimer(t: ToastItem) {
  const tick = (ts: number) => {
    if (!items.value.find(i => i.id === t.id)) return // already removed
    if (t.paused) { t._raf = requestAnimationFrame(tick); return }

    const dt = ts - (t._lastTick ?? ts); t._lastTick = ts
    t.remaining -= dt
    if (t.remaining <= 0) { dismiss(t.id); return }
    t._raf = requestAnimationFrame(tick)
  }
  t._lastTick = now()
  t._raf = requestAnimationFrame(tick)
}
function pause(t: ToastItem){ if (!t.paused) t.paused = true }
function resume(t: ToastItem){ if (t.paused){ t.paused = false; t._lastTick = now() } }

/** Progress bar width */
function progressPct(t: ToastItem){
  if (!t.ttl) return 0
  return Math.max(0, Math.min(100, (t.remaining / t.ttl) * 100))
}

/** Swipe-to-dismiss */
const SWIPE_THRESHOLD = 90
function onPointerDown(t: ToastItem, e: PointerEvent){
  t._downX = e.clientX; t._lastX = e.clientX; t._lastTs = now(); t.dx = 0; t.vx = 0
  pause(t)
}
function onPointerMove(t: ToastItem, e: PointerEvent){
  if (!t._downX && t._downX !== 0) return
  const x = e.clientX
  const ts = now()
  t.dx = x - t._downX
  t.vx = (x - t._lastX) / Math.max(1, ts - t._lastTs)
  t._lastX = x; t._lastTs = ts
}
function onPointerUp(t: ToastItem){
  const abs = Math.abs(t.dx)
  if (abs > SWIPE_THRESHOLD || Math.abs(t.vx) > 0.8){ dismiss(t.id) }
  else { t.dx = 0; resume(t) }
}
function toastStyle(t: ToastItem){ return { transform: `translate3d(${t.dx}px,0,0)` } }

/** Clean RAFs on unmount */
onBeforeUnmount(()=> items.value.forEach(t => cancelAnimationFrame(t._raf || 0)))
onMounted(()=> {/* no-op */})
</script>

<style scoped>
/* Container (mobile-first: bottom center) */
.toast-wrap{
  position: fixed;
  inset-inline: 0;
  display: grid;
  justify-items: center;
  pointer-events: none;
  z-index: 9999;
}
.place-bottom      { bottom: 0; }
.place-top         { top: 0; }
.place-top-right   { top: 0; justify-items: end; padding-inline: 12px; }
.place-top-left    { top: 0; justify-items: start; padding-inline: 12px; }
.place-bottom-right{ bottom: 0; justify-items: end; padding-inline: 12px; }
.place-bottom-left { bottom: 0; justify-items: start; padding-inline: 12px; }

/* Toast card */
.toast{
  width: min(92vw, 420px);
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.16);
  background: rgba(17,17,26,.88);
  backdrop-filter: blur(12px);
  color: #fff;
  box-shadow:
    0 10px 24px rgba(0,0,0,.35),
    inset 0 1px 0 rgba(255,255,255,.06);
  padding: 10px 12px 8px;
  touch-action: pan-y;
}

/* Variants */
.type-success { border-color: rgba(16,185,129,.45); box-shadow: 0 8px 24px rgba(16,185,129,.18), inset 0 1px 0 rgba(255,255,255,.06); }
.type-warn    { border-color: rgba(245,158,11,.45); box-shadow: 0 8px 24px rgba(245,158,11,.18), inset 0 1px 0 rgba(255,255,255,.06); }
.type-error   { border-color: rgba(244,63,94,.45); box-shadow: 0 8px 24px rgba(244,63,94,.18), inset 0 1px 0 rgba(255,255,255,.06); }
.type-info    { border-color: rgba(59,130,246,.45); box-shadow: 0 8px 24px rgba(59,130,246,.18), inset 0 1px 0 rgba(255,255,255,.06); }

/* Layout */
.toast-main{
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 10px;
}
.toast-icon{
  width: 26px; height: 26px; display:grid; place-items:center;
  border-radius: 9999px; background: rgba(255,255,255,.12);
  font-weight: 800;
}
.toast-text{ min-width: 0 }
.toast-title{ font-weight: 800; font-size: 13px; line-height: 1.1 }
.toast-body{ font-size: 13px; opacity: .95; line-height: 1.2; white-space: pre-line; overflow-wrap: anywhere }

.toast-action{
  padding: 6px 10px; border-radius: 9999px;
  border: 1px solid rgba(255,255,255,.22);
  background: rgba(255,255,255,.08);
  color: #fff; font-weight: 800; font-size: 12px;
}
.toast-close{
  width: 26px; height: 26px; display:grid; place-items:center;
  border-radius: 9999px; border: 1px solid rgba(255,255,255,.18);
  background: rgba(255,255,255,.06); color:#fff; font-size: 12px;
}

/* Progress bar */
.toast-progress{
  margin-top: 8px; height: 3px; width: 100%;
  background: rgba(255,255,255,.12); border-radius: 999px; overflow: hidden;
}
.toast-progress .bar{
  height: 100%; background: linear-gradient(90deg, #34d399, #22d3ee, #a78bfa);
  transition: width .12s linear;
}

/* Transitions */
.stack-enter-active, .stack-leave-active{ transition: all .18s ease, opacity .18s ease; }
.stack-enter-from{ opacity: 0; transform: translateY(8px) scale(.98); }
.stack-leave-to  { opacity: 0; transform: translateY(-8px) scale(.98); }

/* Reduce motion */
@media (prefers-reduced-motion: reduce){
  .stack-enter-active, .stack-leave-active{ transition: none }
}

/* Light mode */
:root:not(.dark) .toast{
  background: rgba(255,255,255,.98);
  color: #0b1020;
  border-color: rgba(0,0,0,.1);
  box-shadow: 0 10px 24px rgba(0,0,0,.12);
}
:root:not(.dark) .toast-icon{ background: rgba(0,0,0,.06) }
:root:not(.dark) .toast-close{ background: rgba(0,0,0,.06); border-color: rgba(0,0,0,.12); color:#0b1020 }
:root:not(.dark) .toast-action{ background: rgba(0,0,0,.06); border-color: rgba(0,0,0,.12); color:#0b1020 }

/* SR-only */
.sr-only{ position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0 }
</style>
