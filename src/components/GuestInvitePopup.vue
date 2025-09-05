<template>
  <transition name="fade">
    <div
      class="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="ids.title"
      :aria-describedby="ids.desc"
    >
      <!-- Sheet-style card (mobile-first) -->
      <transition name="pop">
        <div
          class="w-[96vw] max-w-sm rounded-2xl shadow-2xl overflow-hidden
                 bg-white text-slate-900 dark:bg-slate-900 dark:text-white
                 border border-white/20 dark:border-white/10"
        >
          <!-- Top countdown bar -->
          <div class="h-1 bg-slate-200 dark:bg-slate-800">
            <div
              class="h-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-[width] duration-300 ease-linear"
              :style="{ width: progress + '%' }"
            />
          </div>

          <!-- Body -->
          <div class="px-5 pt-4 pb-3 text-center">
            <!-- Host -->
            <div class="flex items-center justify-center gap-3 mb-3">
              <div class="relative">
                <img
                  v-if="from?.avatar"
                  :src="from.avatar"
                  alt=""
                  class="h-12 w-12 rounded-full object-cover ring-2 ring-indigo-500/30"
                />
                <div
                  v-else
                  class="h-12 w-12 rounded-full grid place-items-center bg-indigo-600 text-white text-lg"
                >
                  🎥
                </div>
                <span class="pointer-events-none absolute -inset-1 rounded-full animate-ping bg-indigo-500/20"></span>
              </div>

              <div class="text-left">
                <h3 :id="ids.title" class="text-base font-semibold">
                  🎤 Live Invitation
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  Host <span class="font-bold text-indigo-600 dark:text-indigo-400">{{ from.name }}</span>
                  amekualika ujiunge na Live!
                </p>
              </div>
            </div>

            <!-- AI Suggestion -->
            <p
              v-if="trendHint"
              class="text-xs text-pink-600 dark:text-pink-400 mb-2 italic"
            >
              💡 Tunashauri ukubali — kipindi hiki kina-trend 🔥
            </p>

            <!-- Countdown -->
            <p
              v-if="countdown > 0 && !connecting"
              :id="ids.desc"
              class="text-[11px] text-slate-500 dark:text-slate-400"
            >
              Auto-decline baada ya <span class="font-semibold">{{ countdown }}</span>s…
            </p>

            <!-- Join options -->
            <div v-if="showOptions && !connecting" class="mt-3 flex items-center justify-center gap-3">
              <label class="flex items-center gap-2 text-xs">
                <input type="checkbox" v-model="muteMic" class="h-4 w-4 rounded" />
                Mute mic
              </label>
              <label class="flex items-center gap-2 text-xs">
                <input type="checkbox" v-model="disableCam" class="h-4 w-4 rounded" />
                Camera off
              </label>
            </div>

            <!-- Connecting state -->
            <div v-if="connecting" class="mt-4 flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400">
              <span class="spinner h-4 w-4"></span>
              <span class="text-sm font-medium">Connecting…</span>
            </div>

            <!-- Actions -->
            <div
              v-else
              class="mt-4 grid grid-cols-1 gap-2"
              :style="{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }"
            >
              <button
                type="button"
                class="h-11 rounded-full font-semibold text-white
                       bg-gradient-to-b from-green-500 to-green-600
                       active:from-green-600 active:to-green-700
                       shadow-lg shadow-green-900/20"
                @click="acceptInvite"
              >
                ✅ Accept
              </button>
              <button
                type="button"
                class="h-11 rounded-full font-semibold
                       bg-red-50 text-red-600 border border-red-200
                       dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40
                       active:bg-red-100 dark:active:bg-red-900/30"
                @click="declineInvite"
              >
                ❌ Decline
              </button>
            </div>

            <!-- Tiny shortcuts -->
            <div class="mt-2 text-[10px] text-slate-400">
              Bonyeza <kbd class="kbd">Enter</kbd> kukubali, <kbd class="kbd">Esc</kbd> kukataa
            </div>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'

const props = defineProps({
  from: { type: Object, required: true },              // { name, avatar? }
  seconds: { type: Number, default: 10 },              // countdown length
  trendHint: { type: Boolean, default: true },
  showOptions: { type: Boolean, default: true },
})

const emit = defineEmits(['respond'])

const countdown = ref(props.seconds)
const connecting = ref(false)
const muteMic = ref(false)
const disableCam = ref(false)

let timer = null
const ids = {
  title: 'live-invite-title',
  desc: 'live-invite-desc',
}

const progress = computed(() => Math.max(0, Math.min(100, (countdown.value / props.seconds) * 100)))

function haptic(ms = 15) {
  try { navigator.vibrate?.(ms) } catch (_) {}
}

function acceptInvite() {
  clearInterval(timer)
  haptic(20)
  connecting.value = true
  setTimeout(() => {
    emit('respond', {
      accepted: true,
      options: { muteMic: !!muteMic.value, disableCam: !!disableCam.value },
    })
  }, 1200) // simulate connect
}

function declineInvite() {
  clearInterval(timer)
  haptic(10)
  emit('respond', { accepted: false })
}

// Countdown auto-decline
onMounted(() => {
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      emit('respond', { accepted: false })
    }
  }, 1000)

  // Keyboard shortcuts
  const onKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); acceptInvite() }
    if (e.key === 'Escape') { e.preventDefault(); declineInvite() }
  }
  window.addEventListener('keydown', onKey)
  // store handler on instance for cleanup
  window.__liveInviteOnKey = onKey
})

onBeforeUnmount(() => {
  clearInterval(timer)
  if (window.__liveInviteOnKey) {
    window.removeEventListener('keydown', window.__liveInviteOnKey)
    delete window.__liveInviteOnKey
  }
})
</script>

<style scoped>
/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.pop-enter-active, .pop-leave-active { transition: transform .18s ease, opacity .18s ease; }
.pop-enter-from, .pop-leave-to { transform: translateY(12px) scale(.98); opacity: 0; }

/* Spinner (no external libs) */
.spinner {
  box-sizing: border-box;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-right-color: currentColor;
  border-radius: 9999px;
  animation: spin .75s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }

/* Keyboard hint style */
.kbd {
  padding: 2px 6px;
  border-radius: 6px;
  border: 1px solid rgba(100,116,139,.35);
  background: rgba(148,163,184,.08);
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .pop-enter-active, .pop-leave-active, .fade-enter-active, .fade-leave-active { transition: none; }
  .spinner { animation-duration: 1.2s; }
}
</style>
