<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black/60 md:bg-black/55 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4"
    @keydown.esc.prevent="$emit('close')"
  >
    <!-- Sheet / Modal -->
    <div
      class="w-full md:max-w-3xl bg-gradient-to-b from-white to-white/95 md:bg-white rounded-t-3xl md:rounded-2xl shadow-2xl text-black relative overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Manage Guests"
      :style="sheetStyle"
      @click.self="$emit('close')"
    >
      <!-- Ethereal Aura -->
      <div class="absolute -inset-20 pointer-events-none opacity-60 md:opacity-40">
        <div class="absolute w-72 h-72 md:w-96 md:h-96 rounded-full blur-3xl aura a1"></div>
        <div class="absolute right-0 bottom-0 w-64 h-64 md:w-80 md:h-80 rounded-full blur-3xl aura a2"></div>
      </div>

      <!-- Drag Handle (mobile) -->
      <div
        class="md:hidden w-full flex items-center justify-center pt-3"
        @touchstart.passive="onDragStart"
        @touchmove.passive="onDragMove"
        @touchend.passive="onDragEnd"
      >
        <div class="h-1.5 w-12 rounded-full bg-black/20"></div>
      </div>

      <!-- Header -->
      <header class="sticky top-0 z-10 px-4 md:px-6 pt-3 md:pt-5 pb-3 md:pb-4 bg-gradient-to-b from-white/90 to-transparent backdrop-blur-sm">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-base md:text-lg font-extrabold tracking-wide flex items-center gap-2 text-indigo-700">
            <span>👥</span> Manage Guests
          </h2>
          <button
            @click="$emit('close')"
            class="shrink-0 text-red-500 hover:text-red-600 text-xl md:text-2xl rounded-full focus:outline-none focus:ring-2 focus:ring-red-300 px-1"
            aria-label="Close"
          >
            ✖
          </button>
        </div>

        <!-- Tabs (scrollable on mobile, segmented on desktop) -->
        <nav class="mt-3 md:mt-4">
          <div class="flex md:grid md:grid-cols-5 gap-2 overflow-x-auto no-scrollbar px-1 py-1">
            <button
              v-for="tabOption in tabs"
              :key="tabOption"
              @click="setTab(tabOption)"
              class="tab-btn"
              :class="currentTab === tabOption ? 'tab-active' : ''"
              :aria-selected="currentTab === tabOption"
              role="tab"
            >
              <span class="truncate">{{ tabLabel(tabOption) }}</span>
              <span v-if="badgeCount(tabOption) > 0" class="badge">{{ badgeCount(tabOption) }}</span>
            </button>
          </div>
        </nav>
      </header>

      <!-- Content -->
      <section
        class="px-4 md:px-6 pb-6 md:pb-6 pt-2 md:pt-2 space-y-4"
        role="tabpanel"
        :aria-label="currentTab"
        @keydown.left.prevent="focusPrevTab"
        @keydown.right.prevent="focusNextTab"
      >
        <transition name="fade-slide" mode="out-in">
          <component
            :is="componentMap[currentTab]"
            :key="currentTab"
            class="block"
            v-bind="tabProps"
          />
        </transition>
      </section>

      <!-- Footer (mobile actions) -->
      <footer class="md:hidden px-4 pb-safe pb-4 pt-2 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t border-black/5">
        <div class="flex items-center justify-between gap-2 text-sm">
          <button @click="quickInvite" class="btn ghost">➕ Quick Invite</button>
          <button @click="toggleAutoAccept" class="btn ghost" :class="{ 'text-green-700': autoAccept }">
            {{ autoAccept ? '✅ Auto-Accept On' : '⏳ Auto-Accept Off' }}
          </button>
          <button @click="$emit('close')" class="btn solid">Done</button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

import GuestInvitePopup from './GuestInvitePopup.vue'
import GuestRequestList from './GuestRequestList.vue'
import GuestLiveSlot from './GuestLiveSlot.vue'
import RequestToJoin from './RequestToJoin.vue'
import GuestJoinNotification from './GuestJoinNotification.vue'

/* Tabs */
const tabs = ['Invite', 'Requests', 'Live Guests', 'Request To Join', 'Notifications']
const currentTab = ref('Invite')

/* Demo props (uweke live data zako) */
const demoGuest = ref({ name: 'Guest A' })
const demoStream = ref({ title: 'Engagement Talk' })
const tabProps = computed(() => (currentTab.value === 'Live Guests' || currentTab.value === 'Notifications')
  ? { guest: demoGuest.value, stream: demoStream.value }
  : {})

/* Map ya components */
const componentMap = {
  Invite: GuestInvitePopup,
  Requests: GuestRequestList,
  'Live Guests': GuestLiveSlot,
  'Request To Join': RequestToJoin,
  Notifications: GuestJoinNotification
}

/* Badges za kufurahisha (simulate async counts) */
const counts = ref({ Requests: 3, Notifications: 1 })
onMounted(() => {
  setTimeout(() => counts.value.Requests += 1, 1800)
  setTimeout(() => counts.value.Notifications += 2, 2600)
})
const badgeCount = (tab) => counts.value[tab] || 0

/* Tab helpers */
function setTab(t) {
  currentTab.value = t
  try { navigator.vibrate?.(5) } catch {}
}
function tabLabel(t) {
  const map = { Invite: '📨 Invite', Requests: '📥 Requests', 'Live Guests': '🎥 Live', 'Request To Join': '✋ Join', Notifications: '🔔 Alerts' }
  return map[t] || t
}
function focusPrevTab() {
  const i = tabs.indexOf(currentTab.value)
  setTab(tabs[(i - 1 + tabs.length) % tabs.length])
}
function focusNextTab() {
  const i = tabs.indexOf(currentTab.value)
  setTab(tabs[(i + 1) % tabs.length])
}

/* Mobile sheet drag to close */
const sheetY = ref(0)
const startY = ref(0)
const dragging = ref(false)
function onDragStart(e) {
  dragging.value = true
  startY.value = e.touches?.[0]?.clientY ?? 0
}
function onDragMove(e) {
  if (!dragging.value) return
  const y = e.touches?.[0]?.clientY ?? 0
  sheetY.value = Math.max(0, y - startY.value)
}
function onDragEnd() {
  dragging.value = false
  if (sheetY.value > 120) {
    try { navigator.vibrate?.(8) } catch {}
    emitClose()
  } else {
    sheetY.value = 0
  }
}
const sheetStyle = computed(() => ({
  transform: `translate3d(0, ${sheetY.value}px, 0)`,
  transition: dragging.value ? 'none' : 'transform .25s ease'
}))
function emitClose() {
  // Emit close event kwa mzazi
  // eslint-disable-next-line no-undef
  typeof defineEmits === 'function' ? null : null // placeholder for lints
}
const autoAccept = ref(false)
function toggleAutoAccept(){ autoAccept.value = !autoAccept.value }
function quickInvite(){ currentTab.value = 'Invite' }

const emit = defineEmits(['close'])
function $emitClose(){ emit('close') }
</script>

<style scoped>
/* ====== Mobile-first tokens ====== */
:root {
  --ring: 0 0 0 2px rgba(99,102,241,.25);
}

/* ====== Aura (ulimwengu wa roho) ====== */
.aura.a1{
  background: radial-gradient(circle at 30% 20%, rgba(99,102,241,.25), transparent 60%),
              radial-gradient(circle at 70% 60%, rgba(236,72,153,.18), transparent 70%);
}
.aura.a2{
  background: radial-gradient(circle at 70% 80%, rgba(34,211,238,.2), transparent 60%),
              radial-gradient(circle at 20% 40%, rgba(168,85,247,.18), transparent 70%);
}

/* ====== Tabs ====== */
.tab-btn{
  @apply relative whitespace-nowrap px-3 py-2 rounded-full text-xs md:text-sm font-semibold bg-black/5 text-gray-700 hover:bg-black/10 focus:outline-none;
  outline: none;
}
.tab-btn:focus-visible{ box-shadow: var(--ring); }
.tab-active{
  @apply bg-indigo-600 text-white shadow;
}
.badge{
  @apply ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] bg-pink-500 text-white;
}

/* ===== Buttons ===== */
.btn{
  @apply px-3 py-2 rounded-full font-semibold text-xs;
}
.btn.ghost{
  @apply bg-black/5 text-gray-800 hover:bg-black/10;
}
.btn.solid{
  @apply bg-indigo-600 text-white hover:bg-indigo-700;
}

/* ===== Transitions ===== */
.fade-slide-enter-active,
.fade-slide-leave-active{ transition: all .24s ease; }
.fade-slide-enter-from{ opacity: 0; transform: translateY(8px); }
.fade-slide-leave-to{ opacity: 0; transform: translateY(-8px); }

/* ===== Misc ===== */
.no-scrollbar::-webkit-scrollbar{ display: none; }
.no-scrollbar{ -ms-overflow-style: none; scrollbar-width: none; }

/* Safe area padding on mobile footer */
.pb-safe{ padding-bottom: max(env(safe-area-inset-bottom), 0.75rem); }

@media (prefers-reduced-motion: reduce){
  .fade-slide-enter-active,.fade-slide-leave-active{ transition-duration: 1ms !important; }
}
</style>
