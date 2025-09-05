<!-- 📁 src/components/ToastBannerPro.vue -->
<template>
  <!-- Container: bottom on mobile, top-right on md+ -->
  <div
    class="fixed inset-x-0 bottom-0 px-3 pb-3 z-50 pointer-events-none
           md:inset-auto md:right-4 md:top-4 md:left-auto md:bottom-auto md:px-0 md:pb-0"
    :style="safeArea"
  >
    <transition-group name="toast" tag="div" class="space-y-2 md:space-y-2 md:w-96 mx-auto md:mx-0">
      <div
        v-for="t in visibleToasts"
        :key="t.id"
        class="relative pointer-events-auto rounded-xl border shadow-2xl text-white overflow-hidden select-none
               backdrop-blur-md touch-pan-y"
        :class="variantMap[t.variant || 'info'].wrap"
        :role="isAssertive(t) ? 'alert' : 'status'"
        :aria-live="isAssertive(t) ? 'assertive' : 'polite'"
        :style="t.style"
        @mouseenter="pause(t.id)"
        @mouseleave="resume(t.id)"
        @touchstart.passive="pause(t.id)"
        @touchend.passive="resume(t.id)"
        @pointerdown.passive="onDragStart($event, t.id)"
        @pointermove.passive="onDragMove($event, t.id)"
        @pointerup.passive="onDragEnd($event, t.id)"
        @pointercancel.passive="onDragEnd($event, t.id)"
      >
        <!-- Content row -->
        <div class="flex items-start gap-3 p-3 pr-10">
          <div class="text-xl leading-none" :class="variantMap[t.variant || 'info'].iconColor">
            {{ variantMap[t.variant || 'info'].icon }}
          </div>

          <div class="min-w-0 flex-1">
            <div class="text-[13px] font-bold leading-tight truncate">
              {{ t.title || defaultTitle(t.variant) }}
            </div>
            <div class="mt-0.5 text-[12px] leading-snug text-white/90 break-words">
              {{ t.text }}
            </div>

            <div v-if="t.actionText" class="mt-2">
              <button
                class="text-[12px] font-semibold px-2 py-1 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 active:translate-y-[1px]"
                @click="$emit('action', t)"
              >
                {{ t.actionText }}
              </button>
            </div>
          </div>

          <!-- Close -->
          <button
            v-if="t.closable !== false"
            class="absolute top-2 right-2 h-7 w-7 grid place-items-center rounded-full hover:bg-white/10"
            @click="dismiss(t.id)"
            aria-label="Close"
          >✖</button>
        </div>

        <!-- Progress -->
        <div class="absolute bottom-0 inset-x-0 h-0.5 bg-white/15">
          <div class="h-full" :class="variantMap[t.variant || 'info'].bar" :style="{ width: t.progress + '%' }"></div>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'

/* ✅ Props (backward compatible) */
const props = defineProps({
  /** Single quick message (backward compatible) */
  message: { type: String, default: '' },
  /** Advanced list mode */
  items: {
    type: Array,
    default: () => [] // [{ id, text, title?, variant?, duration?, actionText?, closable? }]
  },
  /** Defaults for single mode */
  variant: { type: String, default: 'info' }, // info | success | warning | error
  duration: { type: Number, default: 3000 },  // ms
  max: { type: Number, default: 3 }           // max visible toasts
})

const emit = defineEmits(['dismiss', 'action', 'show'])

/* Safe-area for bottom sheet on phones */
const safeArea = { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }

/* 🎨 Variant styles */
const variantMap = {
  info:    { wrap: 'bg-slate-900/90 border-white/10', icon: 'ℹ️', iconColor: 'text-sky-300',   bar: 'bg-sky-400' },
  success: { wrap: 'bg-emerald-700/90 border-white/10', icon: '✅', iconColor: 'text-emerald-200', bar: 'bg-emerald-300' },
  warning: { wrap: 'bg-amber-600/90 border-white/10', icon: '⚠️', iconColor: 'text-amber-100',  bar: 'bg-amber-200' },
  error:   { wrap: 'bg-rose-700/90 border-white/10', icon: '⛔', iconColor: 'text-rose-100',    bar: 'bg-rose-200' }
}

/* Internal state */
const toasts = ref([])   // normalized list
const timers = new Map() // id -> { end, remain, interval, raf, dragging }

/* Normalize input */
watch(
  () => [props.items, props.message],
  () => {
    const base = Array.isArray(props.items) && props.items.length
      ? props.items
      : (props.message ? [{ id: 'single', text: props.message, variant: props.variant, duration: props.duration }] : [])

    // keep existing progress for same ids
    const existing = new Map(toasts.value.map(t => [t.id, t]))
    toasts.value = base.map((t, i) => ({
      id: t.id || `${Date.now()}-${i}`,
      text: t.text ?? t.message ?? '',
      title: t.title,
      variant: t.variant || props.variant || 'info',
      duration: Number.isFinite(t.duration) ? t.duration : props.duration,
      actionText: t.actionText,
      closable: t.closable,
      progress: existing.get(t.id)?.progress ?? 0,
      style: ''
    }))

    // start timers for any new ones
    nextTickStart()
  },
  { immediate: true, deep: true }
)

/* Limit visible count (FIFO) */
const visibleToasts = computed(() => toasts.value.slice(0, props.max))

/* Helpers */
function haptics() { try { navigator.vibrate?.(10) } catch {} }
function isAssertive(t){ return t.variant === 'error' || t.variant === 'warning' }
function defaultTitle(v){
  return v === 'success' ? 'Success' : v === 'warning' ? 'Warning' : v === 'error' ? 'Error' : 'Notice'
}

/* Timers */
function startTimer(id){
  const t = toasts.value.find(x => x.id === id); if (!t) return
  clearTimer(id)
  const start = Date.now()
  const total = t.duration || 3000
  const state = { remain: total, end: start + total, interval: null, raf: null, dragging: false, dx: 0 }
  timers.set(id, state)

  // progress updater
  state.interval = setInterval(() => {
    const now = Date.now()
    const left = Math.max(0, state.end - now)
    t.progress = Math.min(100, 100 * (1 - left / total))
    if (left === 0 && !state.dragging) dismiss(id)
  }, 50)

  emit('show', t)
  haptics()
}

function pause(id){
  const state = timers.get(id); if (!state) return
  const now = Date.now()
  state.remain = Math.max(0, state.end - now)
  clearInterval(state.interval); state.interval = null
}

function resume(id){
  const state = timers.get(id); if (!state || state.remain <= 0) return
  state.end = Date.now() + state.remain
  if (!state.interval) {
    state.interval = setInterval(() => {
      const now = Date.now()
      const left = Math.max(0, state.end - now)
      const t = toasts.value.find(x => x.id === id); if (!t) return
      t.progress = Math.min(100, 100 * (1 - left / (t.duration || 3000)))
      if (left === 0 && !state.dragging) dismiss(id)
    }, 50)
  }
}

function clearTimer(id){
  const st = timers.get(id)
  if (!st) return
  clearInterval(st.interval)
  cancelAnimationFrame(st.raf)
  timers.delete(id)
}

function dismiss(id){
  clearTimer(id)
  const idx = toasts.value.findIndex(x => x.id === id)
  if (idx >= 0) {
    const t = toasts.value[idx]
    toasts.value.splice(idx, 1)
    emit('dismiss', t)
  }
}

/* Drag-to-dismiss (X swipe) */
function onDragStart(e, id){
  const st = timers.get(id); if (!st) return
  st.dragging = true
  st.startX = e.clientX || (e.touches?.[0]?.clientX)
}
function onDragMove(e, id){
  const st = timers.get(id); if (!st || !st.dragging) return
  const x = e.clientX || (e.touches?.[0]?.clientX)
  const dx = x - st.startX
  st.dx = dx
  const t = toasts.value.find(x => x.id === id); if (!t) return
  const opacity = Math.max(0.3, 1 - Math.abs(dx)/160)
  t.style = `transform: translateX(${dx}px); opacity:${opacity};`
}
function onDragEnd(_e, id){
  const st = timers.get(id); if (!st) return
  st.dragging = false
  const t = toasts.value.find(x => x.id === id); if (!t) return
  const dx = st.dx || 0
  t.style = ''
  if (Math.abs(dx) > 60) dismiss(id)  // threshold
  else resume(id)
  st.dx = 0
}

/* Start timers for new toasts */
function nextTickStart(){
  // start only for visible new items
  visibleToasts.value.forEach(t => {
    if (!timers.get(t.id)) startTimer(t.id)
  })
}

/* Lifecycle */
onMounted(() => nextTickStart())
onBeforeUnmount(() => { toasts.value.forEach(t => clearTimer(t.id)) })
</script>

<style scoped>
/* Enter/leave animations */
.toast-enter-active, .toast-leave-active { transition: all .22s ease }
.toast-enter-from { transform: translateY(8px); opacity: 0 }
.toast-leave-to   { transform: translateY(-8px); opacity: 0 }
</style>
