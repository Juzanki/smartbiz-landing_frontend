<!-- GuestLiveTile.vue -->
<template>
  <div
    class="relative w-full"
    :class="wrapperClass"
  >
    <!-- Card -->
    <div
      ref="cardRef"
      class="group relative overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10
             bg-white/5 dark:bg-zinc-900/40 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md
             text-white"
      @click="emit('expand', payload)"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
      @keydown.enter.prevent="emit('expand', payload)"
      role="button"
      tabindex="0"
      :aria-label="`Open live guest ${displayName}`"
    >
      <!-- Gradient glow border -->
      <div class="pointer-events-none absolute inset-0 rounded-2xl"
           style="mask: linear-gradient(#000, transparent 65%);">
        <div class="absolute -inset-1 rounded-3xl blur-2xl
                    bg-gradient-to-r from-fuchsia-600/30 via-indigo-500/25 to-cyan-400/30"></div>
      </div>

      <!-- Media / Avatar -->
      <div class="relative aspect-[16/9] sm:aspect-[21/9]">
        <img
          v-if="previewUrl"
          :src="previewUrl"
          alt=""
          class="h-full w-full object-cover"
        />
        <div v-else class="h-full w-full grid place-items-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black">
          <div class="text-3xl font-black tracking-widest opacity-90">{{ initials }}</div>
        </div>

        <!-- LIVE pill -->
        <span class="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                     text-[10px] font-bold bg-rose-600/90">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60"></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
          </span>
          LIVE
        </span>

        <!-- Viewers -->
        <span class="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                     text-[10px] font-semibold bg-black/60 ring-1 ring-white/15">
          👀 {{ formattedViews }}
        </span>

        <!-- Bottom overlay: name + roles -->
        <div class="absolute inset-x-0 bottom-0 p-3 pt-10
                    bg-gradient-to-t from-black/80 via-black/30 to-transparent">
          <div class="flex items-center gap-2">
            <img
              v-if="guest?.avatar"
              :src="guest.avatar"
              alt=""
              class="h-9 w-9 rounded-full object-cover ring-2 ring-indigo-500/60"
            />
            <div v-else class="h-9 w-9 rounded-full grid place-items-center bg-white/10 ring-2 ring-indigo-500/60">
              <span class="text-sm font-bold">{{ initials }}</span>
            </div>

            <div class="min-w-0">
              <p class="text-sm font-semibold truncate">
                {{ displayName }}
                <span v-if="guest?.badge" class="ml-1 text-[10px] align-middle px-1.5 py-0.5 rounded
                             bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30">
                  {{ guest.badge }}
                </span>
              </p>
              <p class="text-[11px] text-white/80">
                {{ timeAgo }} • {{ netQuality.label }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Controls row (mobile-first big touch targets) -->
      <div class="p-3 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <!-- Mic -->
          <button
            class="btn-chip"
            :class="micClass"
            @click.stop="toggleMute()"
            :aria-pressed="muted ? 'true' : 'false'"
            :aria-label="muted ? 'Unmute guest' : 'Mute guest'"
          >
            <span v-if="muted">🔇</span><span v-else>🎙️</span>
            <span class="ml-1 text-[11px] font-semibold">{{ muted ? 'Muted' : 'Mic On' }}</span>
          </button>

          <!-- Audio level meter -->
          <div class="level-wrap" aria-hidden="true">
            <span class="bar" :style="{ '--h': levelBarHeight }"></span>
            <span class="bar delay-1" :style="{ '--h': levelBarHeightAlt }"></span>
            <span class="bar delay-2" :style="{ '--h': levelBarHeight2 }"></span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Follow -->
          <button class="btn-chip bg-white/10 hover:bg-white/15" @click.stop="emit('follow', payload)" aria-label="Follow guest">
            ⭐ <span class="ml-1 text-[11px] font-semibold">Follow</span>
          </button>
          <!-- More -->
          <button class="btn-chip bg-white/10 hover:bg-white/15" @click.stop="emit('more', payload)" aria-label="More actions">
            ⋯ <span class="ml-1 text-[11px] font-semibold">More</span>
          </button>
        </div>
      </div>

      <!-- Network + stats strip -->
      <div class="px-3 pb-3">
        <div class="grid grid-cols-3 gap-2 text-[11px] text-white/80">
          <div class="stat-box">
            <span class="k">Bitrate</span>
            <span class="v">{{ bitrateKbps }} kbps</span>
          </div>
          <div class="stat-box" :class="netQuality.class">
            <span class="k">RTT</span>
            <span class="v">{{ rttMs }} ms</span>
          </div>
          <div class="stat-box">
            <span class="k">Jitter</span>
            <span class="v">{{ jitterMs }} ms</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Safe-area spacer (bottom) for mobile drawers -->
    <div class="h-[max(env(safe-area-inset-bottom),0px)]"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/**
 * Props:
 * guest: { name, avatar?, badge? }
 * stream: { startedAt?: string|number|Date, viewers?: number,
 *           rtt?: number, jitter?: number, bitrate?: number, audioLevel?: 0..1, previewUrl?: string }
 */
const props = defineProps({
  guest: { type: Object, required: true },
  stream: { type: Object, default: () => ({}) },
  dense: { type: Boolean, default: false } // alternate compact spacing if needed
})
const emit = defineEmits(['expand','follow','more','toggle-mute'])

const cardRef = ref(null)
const muted = ref(false)
const holdTimer = ref(null)
const holding = ref(false)

const payload = computed(() => ({ guest: props.guest, stream: props.stream }))

// Media / names
const displayName = computed(() => props.guest?.name || 'Guest')
const initials = computed(() => displayName.value.split(/\s+/).map(x => x[0]).join('').slice(0,2).toUpperCase())
const previewUrl = computed(() => props.stream?.previewUrl || '')

// Time ago
const now = ref(Date.now())
let clock
onMounted(() => { clock = setInterval(() => (now.value = Date.now()), 1000) })
onBeforeUnmount(() => { clearInterval(clock) })

const startedAtMs = computed(() => {
  const s = props.stream?.startedAt
  return s ? new Date(s).getTime() : Date.now()
})
const timeAgo = computed(() => {
  const sec = Math.max(0, Math.floor((now.value - startedAtMs.value) / 1000))
  if (sec < 60) return `${sec}s live`
  const m = Math.floor(sec / 60)
  if (m < 60) return `${m}m live`
  const h = Math.floor(m / 60); return `${h}h live`
})

// Viewers
const formattedViews = computed(() => {
  const v = Number(props.stream?.viewers ?? 0)
  if (v >= 1e6) return (v/1e6).toFixed(1).replace(/\.0$/,'') + 'M'
  if (v >= 1e3) return (v/1e3).toFixed(1).replace(/\.0$/,'') + 'K'
  return v.toString()
})

// Network stats
const rttMs = computed(() => Math.max(0, Math.round(props.stream?.rtt ?? 0)))
const jitterMs = computed(() => Math.max(0, Math.round(props.stream?.jitter ?? 0)))
const bitrateKbps = computed(() => Math.max(0, Math.round((props.stream?.bitrate ?? 0) / 1000)))

const netQuality = computed(() => {
  const r = rttMs.value
  if (r <= 80)  return { label: 'Good', class: 'text-emerald-300' }
  if (r <= 160) return { label: 'Fair', class: 'text-amber-300' }
  return { label: 'Weak', class: 'text-rose-300' }
})

// Audio level meter (CSS-driven heights)
const level = computed(() => {
  let a = Number(props.stream?.audioLevel ?? 0)
  if (muted.value) a = 0
  return Math.max(0, Math.min(1, a))
})
const levelBarHeight     = computed(() => `${8 + level.value * 22}px`)
const levelBarHeightAlt  = computed(() => `${6 + level.value * 18}px`)
const levelBarHeight2    = computed(() => `${10 + level.value * 26}px`)

// Buttons/UX
function toggleMute() {
  muted.value = !muted.value
  try { navigator?.vibrate?.(muted.value ? 18 : 12) } catch {}
  emit('toggle-mute', { ...payload.value, muted: muted.value })
}

// Long-press = open "more"
function onTouchStart(e) {
  if (e.touches?.length !== 1) return
  holding.value = true
  holdTimer.value = setTimeout(() => {
    if (holding.value) emit('more', payload.value)
  }, 550)
}
function onTouchEnd() {
  holding.value = false
  clearTimeout(holdTimer.value)
}

// Layout helpers
const wrapperClass = computed(() => props.dense ? 'px-2' : 'px-3')

const micClass = computed(() =>
  muted.value
    ? 'bg-white/10 hover:bg-white/15'
    : 'bg-emerald-600 hover:bg-emerald-700'
)
</script>

<style scoped>
.btn-chip{
  @apply inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition;
}

/* Audio level wrap */
.level-wrap{
  display:inline-flex; align-items:flex-end; gap:3px;
  height:24px; width:32px; padding:2px 0;
}
.bar{
  width:4px; border-radius:2px; background: rgba(255,255,255,.75);
  height: var(--h, 12px);
  animation: bar-bounce 0.65s ease-in-out infinite;
}
.bar.delay-1{ animation-delay: .1s }
.bar.delay-2{ animation-delay: .2s }

@keyframes bar-bounce{
  0%,100%{ transform: translateY(0) }
  50%{ transform: translateY(-2px) }
}

/* Reduce motion */
@media (prefers-reduced-motion: reduce){
  .bar{ animation: none; }
}
</style>
