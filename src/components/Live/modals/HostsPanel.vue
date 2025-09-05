<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black/60 md:bg-black/55 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4"
    @keydown.esc.prevent="$emit('close')"
  >
    <!-- Sheet (mobile) / Modal (desktop) -->
    <div
      class="w-full md:max-w-3xl bg-gradient-to-b from-white to-white/95 md:bg-white rounded-t-3xl md:rounded-2xl shadow-2xl text-black relative overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Manage Hosts"
      :style="sheetStyle"
      @click.self="$emit('close')"
    >
      <!-- Aura ya “roho” (ethereal background) -->
      <div class="absolute -inset-24 pointer-events-none opacity-60 md:opacity-35">
        <div class="absolute w-80 h-80 rounded-full blur-3xl aura a1"></div>
        <div class="absolute right-0 bottom-0 w-72 h-72 rounded-full blur-3xl aura a2"></div>
      </div>

      <!-- Drag handle (mobile) -->
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
            <span>👤</span> Manage Hosts
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
        <nav class="mt-3 md:mt-4" role="tablist" aria-label="Host tabs">
          <div class="flex md:grid md:grid-cols-3 gap-2 overflow-x-auto no-scrollbar px-1 py-1">
            <button
              v-for="tabOption in tabs"
              :key="tabOption"
              @click="currentTab = tabOption"
              class="tab-btn"
              :class="currentTab === tabOption ? 'tab-active' : ''"
              :aria-selected="currentTab === tabOption"
              role="tab"
            >
              <span class="truncate">{{ tabIcons[tabOption] }} {{ tabOption }}</span>
              <span v-if="badgeCount(tabOption) > 0" class="badge">{{ badgeCount(tabOption) }}</span>
            </button>
          </div>
        </nav>
      </header>

      <!-- Tab: Invite -->
      <section
        v-if="currentTab === 'Invite'"
        role="tabpanel"
        aria-label="Invite"
        class="px-4 md:px-6 pb-6 space-y-4"
      >
        <div class="flex gap-2">
          <input
            v-model="inviteEmail"
            type="email"
            inputmode="email"
            autocomplete="email"
            placeholder="Enter host email..."
            class="flex-1 px-3 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            :aria-invalid="emailError ? 'true' : 'false'"
          />
          <button
            @click="sendInvite"
            class="bg-indigo-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-indigo-700 active:scale-95 transition disabled:opacity-60"
            :disabled="loading"
            aria-label="Invite host"
          >
            <span v-if="!loading">Invite</span>
            <span v-else>Sending...</span>
          </button>
        </div>
        <p v-if="emailError" class="text-sm text-red-600">{{ emailError }}</p>

        <!-- Quick tips / Spirit vibe -->
        <div class="text-xs text-gray-600 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
          ✨ Tip: Unaweza kualika hadi <b>3</b> co-hosts kwa sasa. Tumia barua pepe yao ya SmartBiz au ya kawaida.
        </div>
      </section>

      <!-- Tab: Host List -->
      <section
        v-else-if="currentTab === 'Host List'"
        role="tabpanel"
        aria-label="Host List"
        class="px-4 md:px-6 pb-6"
      >
        <div :class="hostGridClasses" :style="hostGridStyle" class="gap-4">
          <div
            v-for="host in hosts"
            :key="host.id"
            class="bg-white/80 rounded-xl p-4 text-center shadow relative ring-1 ring-black/5"
          >
            <img :src="host.avatar" class="w-16 h-16 mx-auto rounded-full mb-2 border border-white shadow" loading="lazy" alt="" />
            <div class="font-semibold truncate max-w-[9rem] mx-auto">{{ host.name }}</div>

            <!-- Toggle mic/cam -->
            <div class="flex justify-center mt-2 gap-3 text-gray-700 text-lg">
              <button
                @click="host.mic = !host.mic"
                :class="host.mic ? 'text-green-600' : 'text-red-400'"
                :aria-label="host.mic ? 'Mute mic' : 'Unmute mic'"
              >🎙</button>
              <button
                @click="host.cam = !host.cam"
                :class="host.cam ? 'text-blue-600' : 'text-gray-400'"
                :aria-label="host.cam ? 'Turn camera off' : 'Turn camera on'"
              >📷</button>
            </div>

            <!-- Controls -->
            <div class="mt-3 flex items-center justify-center gap-3 text-xs">
              <button @click="swapWithMainHost(host.id)" class="text-blue-600 hover:underline" aria-label="Swap with main host">
                🔁 Swap
              </button>
              <button @click="removeHost(host.id)" class="text-red-500 hover:underline" aria-label="Remove host">
                🗑 Remove
              </button>
            </div>

            <!-- Main host badge -->
            <div v-if="isMainHost(host.id)" class="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white shadow">
              ⭐ Main
            </div>
          </div>
        </div>
      </section>

      <!-- Tab: Pending -->
      <section
        v-else
        role="tabpanel"
        aria-label="Pending"
        class="px-4 md:px-6 pb-8"
      >
        <p class="text-gray-500 text-center">📄 No pending invites.</p>
      </section>

      <!-- Footer (mobile actions) -->
      <footer class="md:hidden px-4 pb-safe pb-4 pt-2 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t border-black/5">
        <div class="flex items-center justify-between gap-2 text-sm">
          <button @click="currentTab = 'Invite'" class="btn ghost">➕ Quick Invite</button>
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/* Tabs */
const tabs = ['Invite', 'Host List', 'Pending']
const currentTab = ref('Invite')
const tabIcons = { Invite: '📨', 'Host List': '👥', Pending: '⏳' }

/* Invite state */
const inviteEmail = ref('')
const loading = ref(false)
const emailError = ref('')

/* Hosts */
const hosts = ref([
  { id: 1, name: 'Host A', avatar: '/avatars/host1.png', mic: true, cam: true },
  { id: 2, name: 'Host B', avatar: '/avatars/host2.png', mic: false, cam: true }
])

/* Badges (simulate) */
const counts = ref({ Pending: 0 })
const badgeCount = (tab) => counts.value[tab] || 0

/* Main host logic */
const isMainHost = (id) => hosts.value.length && hosts.value[0].id === id

/* Grid (mobile-first): columns via inline style → safe dhidi ya purge */
const hostGridClasses = computed(() => 'grid')
const vw = ref(typeof window !== 'undefined' ? window.innerWidth : 360)
const onResize = () => { vw.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

const colsFor = (width) => width < 380 ? 1 : (width < 640 ? 2 : (width < 920 ? 3 : 4))
const hostGridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${colsFor(vw.value)}, minmax(0, 1fr))`
}))

/* Validation */
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

/* Actions (names preserved) */
const sendInvite = async () => {
  emailError.value = ''
  const email = inviteEmail.value.trim()
  if (!email) { emailError.value = 'Enter an email first.'; return }
  if (!isValidEmail(email)) { emailError.value = 'Invalid email format.'; return }

  const name = email.split('@')[0]
  loading.value = true
  try {
    const res = await fetch('/api/invite-host', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    if (!res.ok) throw new Error('Failed to invite')

    hosts.value.push({
      id: Date.now(),
      name,
      avatar: '/avatars/default.png',
      mic: true,
      cam: true
    })
    counts.value.Pending = Math.max(0, counts.value.Pending - 1)
    inviteEmail.value = ''
    try { navigator.vibrate?.(8) } catch {}
  } catch (err) {
    alert(`❌ Failed to invite host: ${err.message}`)
  } finally {
    loading.value = false
  }
}

const swapWithMainHost = (id) => {
  const index = hosts.value.findIndex(h => h.id === id)
  if (index > -1) {
    const [host] = hosts.value.splice(index, 1)
    hosts.value.unshift(host)
    alert(`🔁 ${host.name} is now the main host`)
  }
}

const removeHost = (id) => {
  hosts.value = hosts.value.filter(h => h.id !== id)
}

/* Footer quick toggles */
const autoAccept = ref(false)
function toggleAutoAccept(){ autoAccept.value = !autoAccept.value }

/* Mobile sheet drag-to-close */
const sheetY = ref(0), startY = ref(0), dragging = ref(false)
function onDragStart(e){ dragging.value = true; startY.value = e.touches?.[0]?.clientY ?? 0 }
function onDragMove(e){ if (!dragging.value) return; const y = e.touches?.[0]?.clientY ?? 0; sheetY.value = Math.max(0, y - startY.value) }
function onDragEnd(){
  dragging.value = false
  if (sheetY.value > 120) {
    try { navigator.vibrate?.(10) } catch {}
    // funga
    // eslint-disable-next-line no-undef
    emit('close')
  } else sheetY.value = 0
}
const sheetStyle = computed(() => ({
  transform: `translate3d(0, ${sheetY.value}px, 0)`,
  transition: dragging.value ? 'none' : 'transform .25s ease'
}))
</script>

<style scoped>
/* ====== Aura (ethereal) ====== */
.aura.a1{
  background:
    radial-gradient(circle at 30% 20%, rgba(99,102,241,.22), transparent 60%),
    radial-gradient(circle at 68% 66%, rgba(236,72,153,.16), transparent 70%);
}
.aura.a2{
  background:
    radial-gradient(circle at 70% 80%, rgba(34,211,238,.18), transparent 60%),
    radial-gradient(circle at 20% 38%, rgba(168,85,247,.16), transparent 70%);
}

/* ===== Tabs ===== */
.tab-btn{
  @apply relative whitespace-nowrap px-3 py-2 rounded-full text-xs md:text-sm font-semibold bg-black/5 text-gray-700 hover:bg-black/10 focus:outline-none;
}
.tab-btn:focus-visible{ box-shadow: 0 0 0 2px rgba(99,102,241,.3); }
.tab-active{ @apply bg-indigo-600 text-white shadow; }
.badge{
  @apply ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] bg-pink-500 text-white;
}

/* ===== Buttons ===== */
.btn{ @apply px-3 py-2 rounded-full font-semibold text-xs; }
.btn.ghost{ @apply bg-black/5 text-gray-800 hover:bg-black/10; }
.btn.solid{ @apply bg-indigo-600 text-white hover:bg-indigo-700; }

/* ===== Utilities ===== */
.no-scrollbar::-webkit-scrollbar{ display: none; }
.no-scrollbar{ -ms-overflow-style: none; scrollbar-width: none; }
.pb-safe{ padding-bottom: max(env(safe-area-inset-bottom), .75rem); }

/* ===== Animations & perf ===== */
@media (prefers-reduced-motion: reduce){
  *, .transition, .transition-all{ transition-duration: 1ms !important; animation-duration: 1ms !important; }
}
</style>
