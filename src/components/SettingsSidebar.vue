<template>
  <!-- Mobile: trigger -->
  <button
    class="md:hidden fixed top-3 left-3 z-[70] h-10 px-3 rounded-xl bg-blue-900 text-white shadow active:translate-y-[1px] flex items-center gap-2"
    @click="open = true"
    aria-controls="settings-drawer"
    aria-expanded="true"
  >
    <i class="i-tabler-settings text-lg"></i>
    <span class="text-sm font-semibold">Settings</span>
  </button>

  <!-- Overlay (mobile) -->
  <transition name="fade">
    <div
      v-if="open"
      class="md:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
      @click.self="close"
    />
  </transition>

  <!-- Drawer (mobile) / Sidebar (md+) -->
  <aside
    id="settings-drawer"
    :style="safeArea"
    class="fixed md:static z-[65] md:z-auto inset-y-0 left-0
           w-[86vw] max-w-sm md:w-64
           translate-x-[-100%] md:translate-x-0
           bg-blue-900 text-white
           shadow-2xl md:shadow-none
           rounded-r-2xl md:rounded-xl
           p-5
           transition-transform duration-200 ease-out"
    :class="open ? 'translate-x-0' : ''"
    role="navigation"
    aria-label="Settings navigation"
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-white/10 grid place-items-center">
          <i class="i-tabler-sliders text-xl"></i>
        </div>
        <h2 class="text-lg font-extrabold tracking-wide">Settings</h2>
      </div>
      <button class="md:hidden h-9 w-9 grid place-items-center rounded-lg bg-white/10" @click="close" aria-label="Close">
        ✖
      </button>
    </div>

    <!-- Quick search -->
    <div class="mb-4">
      <div class="relative">
        <input
          v-model.trim="q"
          type="search"
          placeholder="Search…"
          class="w-full h-10 pl-9 pr-3 rounded-lg bg-white/10 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <span class="absolute left-2 top-1/2 -translate-y-1/2 text-white/70">🔎</span>
      </div>
    </div>

    <!-- Links -->
    <nav class="space-y-1 overflow-y-auto max-h-[70vh] md:max-h-none pr-1">
      <router-link
        v-for="item in filtered"
        :key="item.path"
        :to="item.path"
        custom
        v-slot="{ href, navigate, isActive }"
      >
        <a
          :href="href"
          @click="navigate; mdKeepOpen()"
          class="group flex items-center justify-between gap-3 p-3 rounded-lg border border-white/5 hover:bg-white/10"
          :class="isActive ? 'bg-gold-500 text-blue-900 font-semibold' : 'bg-white/0'"
          :aria-current="isActive ? 'page' : undefined"
        >
          <span class="flex items-center gap-3 min-w-0">
            <i :class="(item.icon || 'i-tabler-circle-dot') + ' text-lg'"></i>
            <span class="truncate">{{ item.name }}</span>
          </span>
          <span v-if="item.badge" class="text-xs px-2 py-0.5 rounded-full bg-white/20">
            {{ item.badge }}
          </span>
        </a>
      </router-link>
      <p v-if="!filtered.length" class="text-white/70 text-sm px-1 py-2">No matches.</p>
    </nav>

    <!-- Footer -->
    <div class="mt-6 pt-4 border-t border-white/10 text-xs text-white/70 flex items-center justify-between">
      <button class="px-3 py-1 rounded bg-white/10 hover:bg-white/15" @click="$emit('support')">Help & Support</button>
      <span>v{{ version }}</span>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

defineOptions({ name: 'SettingsSidebarPro' })

/** Props */
const props = defineProps({
  links: {
    type: Array,
    default: () => ([
      { name: 'Profile',       path: '/settings/profile',       icon: 'i-tabler-user' },
      { name: 'Security',      path: '/settings/security',      icon: 'i-tabler-lock' },
      { name: 'Notifications', path: '/settings/notifications', icon: 'i-tabler-bell', badge: '3' },
      { name: 'Billing',       path: '/settings/billing',       icon: 'i-tabler-credit-card' },
      { name: 'Integrations',  path: '/settings/integrations',  icon: 'i-tabler-plug' },
    ])
  },
  modelValue: { type: Boolean, default: false }, // control drawer (mobile)
  version:    { type: String,  default: '1.0.0' }
})
const emit = defineEmits(['update:modelValue','support'])

/** State */
const open = ref(!!props.modelValue)
const q = ref('')

/** Computed */
const filtered = computed(() => {
  const term = q.value.toLowerCase()
  if (!term) return props.links
  return props.links.filter(l => l.name.toLowerCase().includes(term))
})

/** v-model sync */
watchEffect(() => emit('update:modelValue', open.value))
watchEffect(() => { if (props.modelValue !== open.value) open.value = props.modelValue })

/** Close handlers */
function close(){ open.value = false }
function mdKeepOpen(){ if (window.matchMedia('(min-width: 768px)').matches) return; close() }

/** Keyboard: ESC to close (mobile) */
function onKey(e){ if (e.key === 'Escape') close() }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

/** Safe-area for iOS */
const safeArea = { paddingTop: 'env(safe-area-inset-top, 0px)' }
</script>

<style scoped>
/* Custom gold */
.bg-gold-500 { background-color: #d4af37; }
/* Transitions */
.fade-enter-active,.fade-leave-active { transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to { opacity: 0 }
</style>
