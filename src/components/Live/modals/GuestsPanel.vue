<!-- src/components/Live/modals/GuestsPanel.vue -->
<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black/60 md:bg-black/55 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4"
    @keydown.esc.prevent="emit('close')"
  >
    <!-- Sheet / Modal -->
    <div
      class="w-full md:max-w-3xl bg-gradient-to-b from-white to-white/95 md:bg-white rounded-t-3xl md:rounded-2xl shadow-2xl text-black relative overflow-hidden"
      role="dialog" aria-modal="true" aria-label="Manage Guests"
      :style="sheetStyle" @click.self="emit('close')"
    >
      <!-- Aura -->
      <div class="absolute -inset-20 pointer-events-none opacity-60 md:opacity-40">
        <div class="absolute w-72 h-72 md:w-96 md:h-96 rounded-full blur-3xl aura a1"></div>
        <div class="absolute right-0 bottom-0 w-64 h-64 md:w-80 md:h-80 rounded-full blur-3xl aura a2"></div>
      </div>

      <!-- Handle (mobile drag to close) -->
      <div class="md:hidden w-full flex items-center justify-center pt-3"
           @touchstart.passive="onDragStart" @touchmove.passive="onDragMove" @touchend.passive="onDragEnd">
        <div class="h-1.5 w-12 rounded-full bg-black/20"></div>
      </div>

      <!-- Header -->
      <header class="sticky top-0 z-10 px-4 md:px-6 pt-3 md:pt-5 pb-3 md:pb-4 bg-gradient-to-b from-white/90 to-transparent backdrop-blur-sm">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-base md:text-lg font-extrabold tracking-wide flex items-center gap-2 text-indigo-700">
            <span>👥</span> Manage Guests
          </h2>
          <button @click="emit('close')" class="shrink-0 text-red-500 hover:text-red-600 text-xl md:text-2xl rounded-full focus:outline-none focus:ring-2 focus:ring-red-300 px-1" aria-label="Close">✖</button>
        </div>

        <!-- Tabs -->
        <nav class="mt-3 md:mt-4">
          <div class="flex md:grid md:grid-cols-5 gap-2 overflow-x-auto no-scrollbar px-1 py-1">
            <button v-for="t in tabs" :key="t" @click="setTab(t)"
                    class="tab-btn" :class="currentTab===t ? 'tab-active':''"
                    :aria-selected="currentTab===t" role="tab">
              <span class="truncate">{{ tabLabel(t) }}</span>
              <span v-if="badgeCount(t)>0" class="badge">{{ badgeCount(t) }}</span>
            </button>
          </div>
        </nav>
      </header>

      <!-- Body -->
      <section class="px-4 md:px-6 pb-6 pt-2 space-y-4" role="tabpanel" :aria-label="currentTab">
        <transition name="fade-slide" mode="out-in">
          <component :is="componentMap[currentTab]" :key="currentTab" v-bind="tabProps" />
        </transition>
      </section>

      <!-- Footer (mobile) -->
      <footer class="md:hidden px-4 pb-safe pb-4 pt-2 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t border-black/5">
        <div class="flex items-center justify-between gap-2 text-sm">
          <button @click="quickInvite" class="btn ghost">➕ Quick Invite</button>
          <button @click="autoAccept=!autoAccept" class="btn ghost" :class="{ 'text-green-700': autoAccept }">
            {{ autoAccept ? '✅ Auto-Accept On' : '⏳ Auto-Accept Off' }}
          </button>
          <button @click="emit('close')" class="btn solid">Done</button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
/**
 * FIX: Hakuna tena imports zisizopatikana (GuestInvitePopup.vue, n.k).
 * Vipengele vya tab vimeandikwa hapa ndani kama components ndogo,
 * hivyo build haitashindwa na “Could not resolve …”.
 */
import { ref, computed, onMounted, defineComponent, h } from 'vue'
const emit = defineEmits(['close'])

/* ---------- Tiny inline components (placeholders) ---------- */
const Box = (title) => defineComponent({
  name: `${title}Box`,
  props: { guest: Object, stream: Object },
  setup(props){ return () => h('div', { class: 'rounded-xl border border-black/10 p-4 bg-white/70' }, [
    h('div', { class:'font-semibold mb-1' }, title),
    h('div', { class:'text-sm text-gray-600' },
      `Guest: ${props.guest?.name ?? '—'} • Stream: ${props.stream?.title ?? '—'}`)
  ])}
})
const GuestInvitePopup      = Box('📨 Invite Guests')
const GuestRequestList      = Box('📥 Join Requests')
const GuestLiveSlot         = Box('🎥 Live Guests')
const RequestToJoin         = Box('✋ Request To Join')
const GuestJoinNotification = Box('🔔 Notifications')
/* ---------------------------------------------------------- */

/* Tabs & state */
const tabs = ['Invite', 'Requests', 'Live Guests', 'Request To Join', 'Notifications']
const currentTab = ref('Invite')
const demoGuest  = ref({ name: 'Guest A' })
const demoStream = ref({ title: 'Engagement Talk' })
const tabProps = computed(() =>
  (currentTab.value==='Live Guests' || currentTab.value==='Notifications')
    ? { guest: demoGuest.value, stream: demoStream.value } : {})

const componentMap = {
  'Invite':           GuestInvitePopup,
  'Requests':         GuestRequestList,
  'Live Guests':      GuestLiveSlot,
  'Request To Join':  RequestToJoin,
  'Notifications':    GuestJoinNotification
}

const counts = ref({ Requests: 3, Notifications: 1 })
onMounted(() => { setTimeout(()=>counts.value.Requests+=1,1800); setTimeout(()=>counts.value.Notifications+=2,2600) })
const badgeCount = (t) => counts.value[t] || 0

const setTab = (t) => { currentTab.value = t; try{ navigator.vibrate?.(5) }catch{} }
const tabLabel = (t) => ({ Invite:'📨 Invite', Requests:'📥 Requests', 'Live Guests':'🎥 Live', 'Request To Join':'✋ Join', Notifications:'🔔 Alerts' }[t]||t)

/* Drag to close (mobile) */
const sheetY = ref(0), startY = ref(0), dragging = ref(false)
const onDragStart = e => { dragging.value=true; startY.value=e.touches?.[0]?.clientY ?? 0 }
const onDragMove  = e => { if(!dragging.value) return; sheetY.value=Math.max(0,(e.touches?.[0]?.clientY ?? 0)-startY.value) }
const onDragEnd   = () => { dragging.value=false; if(sheetY.value>120){ try{navigator.vibrate?.(8)}catch{}; emit('close') } else sheetY.value=0 }
const sheetStyle = computed(() => ({ transform:`translate3d(0,${sheetY.value}px,0)`, transition: dragging.value?'none':'transform .25s ease' }))

/* Footer helpers */
const autoAccept = ref(false)
const quickInvite = () => { currentTab.value = 'Invite' }
</script>

<style scoped>
/* Aura */
.aura.a1{ background:
  radial-gradient(circle at 30% 20%, rgba(99,102,241,.25), transparent 60%),
  radial-gradient(circle at 70% 60%, rgba(236,72,153,.18), transparent 70%); }
.aura.a2{ background:
  radial-gradient(circle at 70% 80%, rgba(34,211,238,.2), transparent 60%),
  radial-gradient(circle at 20% 40%, rgba(168,85,247,.18), transparent 70%); }

/* Tabs */
.tab-btn{ @apply relative whitespace-nowrap px-3 py-2 rounded-full text-xs md:text-sm font-semibold bg-black/5 text-gray-700 hover:bg-black/10 focus:outline-none; }
.tab-active{ @apply bg-indigo-600 text-white shadow; }
.badge{ @apply ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] bg-pink-500 text-white; }

/* Buttons */
.btn{ @apply px-3 py-2 rounded-full font-semibold text-xs; }
.btn.ghost{ @apply bg-black/5 text-gray-800 hover:bg-black/10; }
.btn.solid{ @apply bg-indigo-600 text-white hover:bg-indigo-700; }

/* Transition */
.fade-slide-enter-active,.fade-slide-leave-active{ transition: all .24s ease }
.fade-slide-enter-from{ opacity:0; transform: translateY(8px) }
.fade-slide-leave-to  { opacity:0; transform: translateY(-8px) }

/* Misc */
.no-scrollbar::-webkit-scrollbar{ display:none } .no-scrollbar{ -ms-overflow-style:none; scrollbar-width:none }
.pb-safe{ padding-bottom: max(env(safe-area-inset-bottom), .75rem) }

@media (prefers-reduced-motion: reduce){
  .fade-slide-enter-active,.fade-slide-leave-active{ transition-duration:1ms !important }
}
</style>
