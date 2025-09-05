<!-- 📁 src/components/SidebarPro.vue -->
<template>
  <!-- Overlay (mobile) -->
  <transition name="fade">
    <div
      v-if="open && mobile"
      class="fixed inset-0 z-[59] bg-black/50 backdrop-blur-sm"
      @click="close()"
    />
  </transition>

  <!-- Drawer / Sidebar -->
  <transition name="slide">
    <aside
      v-if="open || !mobile"
      ref="sidebarRef"
      :style="safeArea"
      class="z-[60] bg-primary text-white
             fixed top-0 left-0 h-full w-[84vw] max-w-[18rem] p-5
             md:static md:w-64 md:h-auto md:rounded-xl md:shadow md:p-4
             shadow-2xl border-r border-white/10
             overflow-y-auto"
      :class="mobile ? (open ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'"
      role="navigation"
      aria-label="App navigation"
      @keydown.esc.prevent="mobile && close()"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend.passive="onTouchEnd"
    >
      <!-- Header / Close (mobile) -->
      <div class="flex items-center justify-between mb-5 md:mb-6">
        <slot name="brand">
          <div class="flex items-center gap-2">
            <div class="h-9 w-9 rounded-lg bg-white/15 grid place-items-center">✨</div>
            <span class="text-lg font-bold text-yellow-400 hidden md:inline">SmartBiz</span>
          </div>
        </slot>

        <button
          v-if="mobile"
          class="h-9 w-9 grid place-items-center rounded-lg bg-white/10 text-xl hover:bg-white/15"
          @click="close()"
          aria-label="Close sidebar"
        >
          &times;
        </button>
      </div>

      <!-- Quick search (optional slot) -->
      <slot name="search" />

      <!-- Nav -->
      <nav ref="navRef">
        <ul class="space-y-1">
          <li v-for="link in navLinks" :key="link.path" class="w-full">
            <router-link :to="link.path" custom v-slot="{ href, navigate, isActive, isExactActive }">
              <a
                :href="href"
                @click="navigateAndMaybeClose(navigate)"
                class="flex items-center gap-3 px-3 py-2 rounded-lg border border-white/0
                       transition-colors duration-150 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                :class="activeMatch(link.path, isActive, isExactActive)
                        ? 'bg-yellow-400 text-black font-semibold shadow'
                        : 'hover:text-yellow-200'"
              >
                <span class="text-xl">{{ link.icon }}</span>
                <span class="capitalize text-sm hidden md:inline">{{ $t?.(link.name) ?? link.name }}</span>
              </a>
            </router-link>
          </li>
        </ul>
      </nav>

      <!-- Footer -->
      <footer class="text-[11px] opacity-70 mt-8 hidden md:block">
        <slot name="footer">
          &copy; {{ year }} SmartBiz
        </slot>
      </footer>
    </aside>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'

/** Props */
const props = defineProps({
  show: { type: Boolean, default: false },          // mobile drawer state (controlled)
  navLinks: { type: Array, default: () => [] },
  isMobile: { type: Boolean, default: null }        // optional; auto-detect if null
})
const emit = defineEmits(['update:show','close','open','navigate'])

/** State */
const route = useRoute()
const open = ref(props.show)
const sidebarRef = ref(null)
const navRef = ref(null)
const year = new Date().getFullYear()

/** Mobile detection (fallback to matchMedia) */
const mq = typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)') : null
const mobile = computed(() => props.isMobile ?? mq?.matches ?? false)
function onMQ(){ if (props.isMobile === null) { /* keep computed live */ } }

/** Safe area for iOS */
const safeArea = { paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }

/** Watch show prop */
watch(() => props.show, v => { open.value = v })
watch(open, v => { emit('update:show', v); v ? emit('open') : emit('close') ; if (v) focusFirstLinkSoon() })

/** Close / Navigate */
function close(){ open.value = false }
function navigateAndMaybeClose(navigate){
  navigate()
  emit('navigate', route.fullPath)
  if (mobile.value) close()
}

/** Active matcher: support nested routes */
function activeMatch(path, isActive, isExactActive){
  if (isExactActive || isActive) return true
  const cur = route.path.endsWith('/') ? route.path : route.path + '/'
  const target = path.endsWith('/') ? path : path + '/'
  return cur.startsWith(target)
}

/** Focus trap (mobile) */
function focusFirstLinkSoon(){
  nextTick(() => {
    const el = navRef.value?.querySelector('a,button,[tabindex]:not([tabindex="-1"])')
    el?.focus?.()
  })
}
function onKeydown(e){
  if (!open.value || !mobile.value) return
  if (e.key !== 'Tab') return
  const focusables = sidebarRef.value?.querySelectorAll('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])')
  if (!focusables?.length) return
  const list = Array.from(focusables)
  const first = list[0], last = list[list.length - 1]
  if (e.shiftKey && document.activeElement === first){ last.focus(); e.preventDefault() }
  else if (!e.shiftKey && document.activeElement === last){ first.focus(); e.preventDefault() }
}

/** Swipe to close (mobile) */
let startX = 0, dx = 0
function onTouchStart(ev){ if (!mobile.value) return; startX = ev.touches[0].clientX; dx = 0 }
function onTouchMove(ev){ if (!mobile.value) return; dx = ev.touches[0].clientX - startX }
function onTouchEnd(){ if (!mobile.value) return; if (dx < -50) close(); startX = 0; dx = 0 }

/** Lifecycle */
onMounted(() => {
  mq?.addEventListener?.('change', onMQ)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  mq?.removeEventListener?.('change', onMQ)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
/* Transitions */
.slide-enter-active,.slide-leave-active { transition: transform .25s ease }
.slide-enter-from,.slide-leave-to { transform: translateX(-100%) }
.fade-enter-active,.fade-leave-active { transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to { opacity: 0 }
</style>
