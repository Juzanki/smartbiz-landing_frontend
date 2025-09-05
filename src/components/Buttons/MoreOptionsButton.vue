<!-- src/components/MorePanel.vue -->
<template>
  <div class="relative">
    <!-- Floating Trigger (mobile-first) -->
    <button
      :aria-label="aria"
      class="more-fab inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-white
                 shadow-lg transition-[transform,box-shadow] duration-200 active:scale-[0.98]
                 select-none relative overflow-hidden"
      @click="toggle()"
      @pointerdown="addRipple"
    >
      <span class="pointer-events-none absolute -left-8 top-1/2 -translate-y-1/2 h-10 w-24 rounded-full blur-2xl bg-white/10"></span>
      <span class="pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 h-10 w-24 rounded-full blur-2xl bg-white/10"></span>
      <span class="sheen pointer-events-none absolute inset-0"></span>

      <i class="i-tabler-settings text-lg"></i>
      <span class="font-semibold text-sm">More</span>

      <!-- tiny badge hook if needed in future -->
      <span
        v-if="badge && badge>0"
        class="absolute -right-2 -top-2 min-w-[18px] h-[18px] px-1
               rounded-full text-[10px] leading-[18px] text-black
               bg-gradient-to-br from-amber-300 to-yellow-400 font-bold
               border border-black/10 shadow-md"
      >{{ shortBadge }}</span>
    </button>

    <!-- Overlay -->
    <transition name="mp-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50"
        role="dialog"
        aria-modal="true"
        :aria-label="ariaPanel"
      >
        <div class="absolute inset-0 bg-black/70 md:bg-black/60 backdrop-blur-sm" @click="close()" />

        <!-- Bottom sheet (mobile) / centered dialog (md+) -->
        <section
          ref="sheet"
          class="fixed md:static bottom-0 md:bottom-auto inset-x-0 md:inset-auto
                 mx-auto w-full md:max-w-3xl
                 bg-black/80 text-white rounded-t-3xl md:rounded-3xl
                 shadow-2xl backdrop-blur-xl border border-white/10
                 pb-[max(16px,env(safe-area-inset-bottom))]
                 transition-transform duration-200 overflow-hidden"
          :class="['max-h-[88vh] md:max-h-[82vh]', 'md:mt-16']"
          @touchstart.passive="onTouchStart"
          @touchmove.passive="onTouchMove"
          @touchend.passive="onTouchEnd"
          @click.stop
        >
          <!-- Header -->
          <header class="sticky top-0 z-10 bg-black/70 backdrop-blur border-b border-white/10">
            <div class="flex items-center justify-between px-4 pt-3 pb-3 md:px-5">
              <div class="md:hidden absolute left-1/2 -translate-x-1/2 -top-1.5">
                <div class="h-1.5 w-12 rounded-full bg-white/20" />
              </div>
              <h2 class="text-base md:text-lg font-bold tracking-wide flex items-center gap-2">
                <i class="i-tabler-settings"></i>
                <span>More Controls</span>
              </h2>
              <button
                ref="closeBtn"
                @click="close()"
                class="p-2 rounded-full hover:bg-white/10 active:scale-95"
                aria-label="Close"
              >✖</button>
            </div>
          </header>

          <!-- Content -->
          <main class="px-3 md:px-5 py-4 md:py-6 overflow-y-auto max-h-[calc(88vh-64px)] md:max-h-[calc(82vh-72px)]">
            <!-- 🎯 Engagement & Tools -->
            <Section title="🎯 Engagement & Tools" title-class="text-indigo-200">
              <button @click="openModal('poll')" class="option-btn">🗳️ Poll</button>
              <button @click="openModal('goals')" class="option-btn">🎯 Goals</button>
              <button @click="openModal('summary')" class="option-btn">📊 Summary</button>
              <button @click="$emit('toggle-voice')" class="option-btn">🔈 Voice Chat</button>
            </Section>

            <!-- 🎨 Visual Controls -->
            <Section title="🎨 Visual Controls" title-class="text-pink-200">
              <button @click="$emit('open-effects')" class="option-btn">✨ Effects</button>
              <button @click="openModal('background')" class="option-btn">🌅 Background</button>
              <button @click="$emit('toggle-grid')" class="option-btn">📺 Layout/Grid</button>
              <button @click="$emit('toggle-filters')" class="option-btn">🎭 Filters</button>
            </Section>

            <!-- 🛡️ Admin Controls -->
            <Section title="🛡️ Admin Controls" title-class="text-red-200">
              <button @click="openModal('settings')" class="option-btn">⚙️ Stream Settings</button>
              <button @click="$emit('toggle-replay')" class="option-btn">📼 Replay</button>
              <button @click="openModal('moderation')" class="option-btn">🛡️ Moderation</button>
              <button @click="$emit('block-user')" class="option-btn">🚫 Block Viewer</button>
            </Section>

            <!-- 💰 Business Tools -->
            <Section title="💰 Business Tools" title-class="text-yellow-200">
              <button @click="$emit('promote-product')" class="option-btn">🛒 Promote Product</button>
              <button @click="$emit('flash-gift')" class="option-btn">🎁 Flash Gift</button>
              <button @click="$emit('live-auction')" class="option-btn">🔨 Live Auction</button>
              <button @click="$emit('show-analytics')" class="option-btn">📈 Analytics</button>
            </Section>

            <div class="pt-2 text-center">
              <button @click="close()" class="text-xs text-white/70 hover:underline">✖ Close</button>
            </div>
          </main>
        </section>
      </div>
    </transition>

    <!-- Fullscreen modal for deep items -->
    <MoreModal v-if="showModal" :type="modalType" @close="showModal=false" />
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MoreModal from './MoreModal.vue'

/* v-model open state */
const props = withDefaults(defineProps<{
  modelValue?: boolean
  aria?: string
  badge?: number
}>(), {
  modelValue: false,
  aria: 'Open More Controls',
  badge: 0
})
const emit = defineEmits<{
  (e:'update:modelValue', v:boolean): void
  (e:'toggle-voice'): void
  (e:'open-effects'): void
  (e:'toggle-grid'): void
  (e:'toggle-filters'): void
  (e:'toggle-replay'): void
  (e:'block-user'): void
  (e:'promote-product'): void
  (e:'flash-gift'): void
  (e:'live-auction'): void
  (e:'show-analytics'): void
}>()

const showModal = ref(false)
const modalType = ref<'settings'|'summary'|'poll'|'moderation'|'background'|'goals'|'string'>('settings')

const ariaPanel = computed(() => 'More panel')
const shortBadge = computed(() => {
  const n = props.badge || 0
  if (n < 1000) return n
  if (n < 10000) return (n/1000).toFixed(1).replace(/\.0$/,'')+'K'
  if (n < 1_000_000) return Math.round(n/1000)+'K'
  return (n/1_000_000).toFixed(1).replace(/\.0$/,'')+'M'
})

function toggle(){ emit('update:modelValue', !props.modelValue) }
function close(){ emit('update:modelValue', false) }
function openModal(t:any){ modalType.value = t; showModal.value = true }

/* Body scroll lock when open */
const prevOverflow = ref('')
watch(() => props.modelValue, async (open) => {
  if (open) {
    prevOverflow.value = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    await nextTick()
    closeBtn.value?.focus()
  } else {
    document.body.style.overflow = prevOverflow.value || ''
  }
})

/* ESC close */
function onKey(e: KeyboardEvent){ if (e.key === 'Escape') close() }
onMounted(()=> document.addEventListener('keydown', onKey))
onBeforeUnmount(()=> {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = prevOverflow.value || ''
})

/* Swipe-down to close on mobile */
const sheet = ref<HTMLElement|null>(null)
const closeBtn = ref<HTMLButtonElement|null>(null)
let startY = 0, currentY = 0, dragging = false
function onTouchStart(e: TouchEvent){ startY = e.touches[0].clientY; dragging = true }
function onTouchMove(e: TouchEvent){
  if(!dragging || !sheet.value) return
  currentY = e.touches[0].clientY
  const delta = Math.max(0, currentY - startY)
  sheet.value.style.transform = `translateY(${delta}px)`
}
function onTouchEnd(){
  if(!sheet.value) return
  const delta = Math.max(0, currentY - startY)
  sheet.value.style.transform = ''
  dragging = false
  if(delta > 120) close()
}

/* Ripple on FAB */
function addRipple(e: PointerEvent){
  const t = e.currentTarget as HTMLElement
  const span = document.createElement('span')
  const rect = t.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 1.2
  span.className = 'ripple'
  span.style.width = span.style.height = `${size}px`
  span.style.left = `${e.clientX - rect.left - size/2}px`
  span.style.top = `${e.clientY - rect.top - size/2}px`
  t.appendChild(span)
  setTimeout(()=> span.remove(), 600)
}

/* Inline Section subcomponent (mobile-first grid) */
const Section = defineComponent({
  name: 'Section',
  props: {
    title: { type: String, required: true },
    titleClass: { type: String, default: 'text-indigo-200' }
  },
  setup(props, { slots }) {
    return () => (
      <section class="mb-5">
        <h3 class={['text-sm md:text-base font-bold mb-2', props.titleClass]}>{ props.title }</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          { slots.default?.() }
        </div>
      </section>
    )
  }
})
</script>

<style scoped>
/* FAB gradient glass, “tanua wingo” */
.more-fab{
  background: linear-gradient(100deg, rgba(99,102,241,.95), rgba(236,72,153,.95));
  border: 1px solid rgba(255,255,255,.12);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    0 10px 18px rgba(0,0,0,.25),
    0 6px 14px rgba(99,102,241,.28);
  backdrop-filter: blur(10px);
}
.more-fab:hover{
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.10),
    0 12px 22px rgba(0,0,0,.30),
    0 8px 16px rgba(236,72,153,.30);
}
/* animated sheen on FAB */
.sheen::before{
  content:'';
  position:absolute; inset:0;
  background-image: linear-gradient(115deg,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,.18) 35%,
    rgba(255,255,255,0) 70%);
  transform: translateX(-120%);
  animation: sheenMove 2.6s linear infinite;
}
@keyframes sheenMove{
  0%{ transform: translateX(-120%); }
  60%{ transform: translateX(120%); }
  100%{ transform: translateX(120%); }
}

/* Ripple */
.ripple{
  position:absolute; border-radius:9999px; pointer-events:none;
  background: rgba(255,255,255,.25); transform: scale(0);
  animation: ripple .6s ease-out forwards;
}
@keyframes ripple { to { transform: scale(1); opacity: 0; } }

/* Option buttons (mobile-first) */
.option-btn{
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 0.875rem; /* rounded-xl */
  padding: 0.5rem 0.75rem;
  text-align: center;
  font-weight: 700;
  font-size: 0.8rem;
  transition: transform .15s ease, background .15s ease, box-shadow .15s ease;
}
.option-btn:hover{
  background: rgba(255,255,255,.14);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0,0,0,.25);
}

/* Overlay fade */
.mp-fade-enter-active,.mp-fade-leave-active{ transition: opacity .18s ease; }
.mp-fade-enter-from,.mp-fade-leave-to{ opacity:0; }
</style>
