<!-- src/components/modals/GuestManagementSheet.vue -->
<template>
  <div
    v-if="isOpen"
    ref="overlay"
    class="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
    role="dialog" aria-modal="true" aria-labelledby="gm-title" tabindex="-1"
    @click.self="close('backdrop')" @keydown="onKeydown"
  >
    <!-- Bottom Sheet -->
    <section
      ref="sheet"
      class="w-full max-w-xl max-h-[88vh] rounded-t-3xl sm:rounded-2xl overflow-hidden
             text-white shadow-2xl ring-1 ring-white/10 animate-in flex flex-col will-change-transform
             bg-gradient-to-br from-[#0b1020]/95 via-[#111827]/95 to-[#1f2937]/90"
      :style="dragStyle"
      @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend.passive="onTouchEnd"
    >
      <!-- Handle -->
      <div class="sm:hidden pt-2 grid place-items-center">
        <div class="h-1.5 w-12 rounded-full bg-white/20"></div>
      </div>

      <!-- Header -->
      <header
        class="px-5 pt-2 pb-3 sm:p-5 border-b border-white/10 bg-white/10 backdrop-blur
               flex items-center justify-between gap-2"
      >
        <div class="min-w-0">
          <h2 id="gm-title" class="text-base sm:text-lg font-extrabold flex items-center gap-2">
            🎥 Guest Management
            <span class="px-2 py-[2px] text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30">
              Live
            </span>
          </h2>
          <p class="text-[11px] text-white/70 mt-0.5">
            Seats: <b>{{ seatsUsed }}</b>/<b>{{ maxSeats }}</b> •
            Requests: <b>{{ filteredRequests.length }}</b> • Guests: <b>{{ filteredHosts.length }}</b>
          </p>
        </div>

        <button
          class="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full
                 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          aria-label="Close" @click="close('x')">✕</button>
      </header>

      <!-- Tabs + Search -->
      <div class="px-5 pb-2 sm:pb-0">
        <div class="flex items-center justify-between gap-2">
          <nav class="flex gap-2 overflow-x-auto no-scrollbar text-[12px] font-semibold">
            <button v-for="t in tabs" :key="t.key"
                    class="px-3 py-1 rounded-full border transition"
                    :class="selectedTab===t.key
                      ? 'bg-pink-600 text-white border-pink-600 shadow'
                      : 'bg-white/10 border-white/20 hover:bg-white/15'"
                    @click="selectedTab=t.key">
              {{ t.label }}
              <span v-if="t.key==='requests' && filteredRequests.length"
                    class="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 ring-1 ring-white/15">
                {{ filteredRequests.length }}
              </span>
              <span v-if="t.key==='live' && filteredHosts.length"
                    class="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 ring-1 ring-white/15">
                {{ filteredHosts.length }}
              </span>
            </button>
          </nav>

          <div class="relative hidden sm:block">
            <input v-model="q" type="search" inputmode="search" placeholder="Search…"
                   class="w-[160px] rounded-full bg-white/10 border border-white/20 px-3 py-1.5 text-xs outline-none
                          focus:ring-2 ring-pink-400 placeholder-white/70"/>
            <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-white/70">⌕</span>
          </div>
        </div>

        <!-- Mobile search -->
        <div class="sm:hidden mt-2">
          <input v-model="q" type="search" inputmode="search" placeholder="Search…"
                 class="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm outline-none
                        focus:ring-2 ring-pink-400 placeholder-white/70"/>
          <!-- Quick filters -->
          <div class="mt-2 flex gap-2 overflow-x-auto no-scrollbar text-[11px]">
            <button class="chip" :class="{active: filt.muted}" @click="filt.muted=!filt.muted">Mic off</button>
            <button class="chip" :class="{active: filt.camOff}" @click="filt.camOff=!filt.camOff">Cam off</button>
            <button class="chip" :class="{active: filt.cohost}" @click="filt.cohost=!filt.cohost">Cohosts</button>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div ref="scrollArea" class="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        <!-- Invite -->
        <section v-if="selectedTab==='invite'" aria-label="Invite section" class="space-y-3">
          <div class="rounded-xl p-4 bg-white/5 ring-1 ring-white/10">
            <div class="flex gap-2">
              <input v-model.trim="inviteInput" :placeholder="placeholder"
                     class="flex-1 rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm outline-none
                            focus:ring-2 ring-pink-400 placeholder-white/70"/>
              <button @click="sendInvite"
                      class="px-3 py-2 text-sm font-semibold rounded-lg text-white bg-pink-600 hover:bg-pink-700
                             disabled:opacity-60 disabled:cursor-not-allowed"
                      :disabled="!inviteInput">
                Invite
              </button>
            </div>
            <p v-if="inviteError" class="mt-2 text-[12px] text-rose-300">{{ inviteError }}</p>
            <div class="mt-3 flex items-center gap-2 text-[12px]">
              <button @click="copyLink" class="rounded-full px-3 py-1 bg-white/10 border border-white/20">Copy link</button>
              <span class="opacity-80">Send a link or invite by name/email.</span>
            </div>
          </div>
        </section>

        <!-- Requests -->
        <section v-else-if="selectedTab==='requests'" aria-label="Requests section">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold">📥 Join Requests</h3>
            <div class="flex gap-2">
              <button v-if="filteredRequests.length"
                      @click="acceptAll"
                      class="rounded-full px-3 py-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white">Accept All</button>
              <button v-if="filteredRequests.length"
                      @click="clearRequests"
                      class="rounded-full px-3 py-1 text-xs font-semibold bg-white/10 border border-white/20">Clear</button>
            </div>
          </div>

          <div v-if="!filteredRequests.length" class="text-sm opacity-80">No requests.</div>

          <div v-else class="space-y-3">
            <div v-for="g in filteredRequests" :key="g.id"
                 class="flex items-center justify-between p-3 rounded-xl bg-white/5 ring-1 ring-white/10">
              <div class="flex items-center gap-3 min-w-0">
                <img :src="g.avatar" @error="onImgErr" class="w-10 h-10 rounded-full border object-cover"/>
                <div class="truncate">
                  <div class="font-semibold text-sm truncate">{{ g.name }}</div>
                  <div class="text-[11px] opacity-80 truncate">{{ g.note || 'wants to join' }}</div>
                </div>
              </div>
              <div class="flex gap-2 shrink-0">
                <button @click="approveGuest(g.id)"
                        class="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1 rounded-full font-semibold">Accept</button>
                <button @click="rejectGuest(g.id)"
                        class="bg-rose-500 hover:bg-rose-600 text-white text-xs px-3 py-1 rounded-full font-semibold">Decline</button>
              </div>
            </div>
          </div>
        </section>

        <!-- Live -->
        <section v-else aria-label="Live guests section">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold">🎙️ Live Guests / Co-Hosts</h3>
            <div class="flex gap-2">
              <button @click="quickMute" class="rounded-full px-3 py-1 text-xs font-semibold bg-white/10 border border-white/20">Mute All</button>
              <button @click="quickCam" class="rounded-full px-3 py-1 text-xs font-semibold bg-white/10 border border-white/20">Stop Video</button>
            </div>
          </div>

          <div v-if="!filteredHosts.length" class="text-sm opacity-80">No live guests.</div>

          <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div v-for="h in filteredHosts" :key="h.id"
                 class="p-4 rounded-xl ring-1 ring-white/10 bg-white/5 text-center relative overflow-hidden">
              <!-- status glow -->
              <div class="absolute inset-0 pointer-events-none opacity-30"
                   :style="{ background: h.micOn ? glowGreen : glowGray }"></div>

              <img :src="h.avatar" @error="onImgErr"
                   class="w-16 h-16 rounded-full mx-auto mb-2 border object-cover ring-2"
                   :class="h.camOn ? 'ring-emerald-400/60' : 'ring-white/20'"/>

              <div class="font-semibold text-sm truncate">{{ h.name }}</div>

              <div class="mt-2">
                <select v-model="h.role" @change="emit('role-change', { id:h.id, role:h.role })"
                        class="w-full rounded-lg bg-white/10 border border-white/20 text-xs px-2 py-1 outline-none">
                  <option value="guest">Guest</option>
                  <option value="cohost">Cohost</option>
                  <option value="mod">Moderator</option>
                </select>
              </div>

              <div class="flex justify-center gap-3 mt-3 text-xl">
                <button @click="toggleMic(h)" :class="h.micOn ? 'text-emerald-400' : 'text-white/50'"
                        class="focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded">
                  <i :class="h.micOn ? 'i-tabler-microphone' : 'i-tabler-microphone-off'" /> <span class="sr-only">Mic</span>
                </button>
                <button @click="toggleCam(h)" :class="h.camOn ? 'text-emerald-400' : 'text-white/50'"
                        class="focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded">
                  <i :class="h.camOn ? 'i-tabler-camera' : 'i-tabler-camera-off'" /> <span class="sr-only">Camera</span>
                </button>
                <button @click="removeHost(h.id)" class="text-rose-400 text-sm hover:text-rose-300 focus-visible:ring-2 focus-visible:ring-pink-500 rounded" title="Remove">🗑</button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Footer -->
      <footer class="px-5 py-3 border-t border-white/10 bg-white/10 backdrop-blur flex items-center justify-between">
        <small class="text-[11px] opacity-80">Swipe down or tap ✕ to close.</small>
        <button class="rounded-full px-4 py-2 text-xs font-bold bg-white/10 border border-white/20 hover:bg-white/15"
                @click="close('done')">Done</button>
      </footer>

      <!-- Safe-area spacer -->
      <div class="h-[max(env(safe-area-inset-bottom),0px)] sm:hidden"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

/* ---------- Props: support v-model na legacy open ---------- */
const props = defineProps({
  modelValue: { type: Boolean, default: undefined }, // v-model
  open:       { type: Boolean, default: undefined }, // legacy
  hosts: {
    type: Array,
    default: () => ([
      { id: 1, name: 'Host A', avatar: '/avatars/host1.png', micOn: true,  camOn: true,  role:'cohost' },
      { id: 2, name: 'Host B', avatar: '/avatars/host2.png', micOn: false, camOn: true,  role:'guest' }
    ])
  },
  requests: {
    type: Array,
    default: () => ([
      { id: 3, name: 'Stella', avatar: '/avatars/user3.png' },
      { id: 4, name: 'Henry',  avatar: '/avatars/user4.png' }
    ])
  },
  maxSeats: { type: Number, default: 6 } // visible guests you allow
})

/* ---------- Emits ---------- */
const emit = defineEmits([
  'update:modelValue','update:open','close','invite','approve','reject',
  'toggle-mic','toggle-cam','remove','role-change','quick-mute','quick-cam'
])

/* ---------- Open state ---------- */
const isOpen = computed({
  get(){ return props.modelValue ?? props.open ?? true },
  set(v){
    emit('update:modelValue', v)
    emit('update:open', v)
    if (!v) emit('close', { reason:'program' })
  }
})

/* ---------- State ---------- */
const selectedTab = ref('requests') // invite | requests | live
const inviteInput = ref('')
const inviteError = ref('')
const q = ref('')
const filt = ref({ muted:false, camOff:false, cohost:false })

/* Local working copies (editable) */
const hosts = ref(structuredClone(props.hosts))
const joinRequests = ref(structuredClone(props.requests))
watch(() => props.hosts, v => hosts.value = structuredClone(v || []))
watch(() => props.requests, v => joinRequests.value = structuredClone(v || []))

/* Meta */
const tabs = [
  { key:'invite',   label:'Invite' },
  { key:'requests', label:'Requests' },
  { key:'live',     label:'Live' },
]

/* Filters */
const filteredHosts = computed(()=>{
  const s = q.value.trim().toLowerCase()
  let arr = s ? hosts.value.filter(h => h.name.toLowerCase().includes(s)) : hosts.value
  if (filt.value.muted)  arr = arr.filter(h => !h.micOn)
  if (filt.value.camOff) arr = arr.filter(h => !h.camOn)
  if (filt.value.cohost) arr = arr.filter(h => h.role === 'cohost')
  return arr
})
const filteredRequests = computed(()=>{
  const s = q.value.trim().toLowerCase()
  return s ? joinRequests.value.filter(g => g.name.toLowerCase().includes(s)) : joinRequests.value
})

/* Seats */
const maxSeats = computed(()=> props.maxSeats)
const seatsUsed = computed(()=> Math.min(maxSeats.value, filteredHosts.value.length))

/* Invite */
const placeholder = 'Invite by name or email'
const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function sendInvite(){
  inviteError.value=''
  const v = inviteInput.value.trim()
  if (!v) return
  const isEmail = emailRx.test(v)
  if (v.length < 2) { inviteError.value = 'Name or email looks invalid.'; return }
  const payload = { id: Date.now(), name: v, avatar: '/avatars/default.png', via: isEmail?'email':'name' }
  emit('invite', payload)
  joinRequests.value.unshift(payload) // optimistic
  inviteInput.value=''
  buzz(14)
}
async function copyLink(){
  try{ await navigator.clipboard.writeText(location.origin + '/live/join'); buzz(10) }catch{}
}

/* Requests */
function approveGuest(id){
  const g = joinRequests.value.find(x=>x.id===id)
  if(!g) return
  hosts.value.push({ ...g, micOn:false, camOn:false, role:'guest' })
  joinRequests.value = joinRequests.value.filter(x=>x.id!==id)
  emit('approve', id)
  buzz(14)
}
function rejectGuest(id){
  joinRequests.value = joinRequests.value.filter(x=>x.id!==id)
  emit('reject', id)
}
function acceptAll(){ [...joinRequests.value].forEach(g=>approveGuest(g.id)) }
function clearRequests(){ joinRequests.value = [] }

/* Live controls */
function toggleMic(h){ h.micOn=!h.micOn; emit('toggle-mic', { id:h.id, on:h.micOn }) }
function toggleCam(h){ h.camOn=!h.camOn; emit('toggle-cam', { id:h.id, on:h.camOn }) }
function removeHost(id){ hosts.value = hosts.value.filter(x=>x.id!==id); emit('remove', id) }
function quickMute(){ hosts.value.forEach(h=>h.micOn=false); emit('quick-mute') }
function quickCam(){ hosts.value.forEach(h=>h.camOn=false); emit('quick-cam') }

/* Image fallback */
function onImgErr(ev){ ev.target.src='/avatars/default.png'; ev.target.classList.add('opacity-80') }

/* Haptics */
function buzz(ms=12){ try{ navigator?.vibrate?.(ms) }catch{} }

/* Close */
function close(reason){ isOpen.value = false; emit('close', { reason }) }

/* Swipe-to-close (only when scroll top) + focus trap */
const startY = ref(0), dY = ref(0), dragging = ref(false)
const dragStyle = computed(()=> dragging.value ? ({
  transform:`translateY(${Math.max(0,dY.value)}px)`,
  opacity: Math.max(1 - Math.max(0,dY.value)/240, .5)
}) : ({}))

const overlay = ref(null), sheet = ref(null), scrollArea = ref(null)
function onTouchStart(e){
  if(e.touches?.length!==1) return
  if (scrollArea.value && scrollArea.value.scrollTop > 2) return
  dragging.value=true; startY.value=e.touches[0].clientY; dY.value=0
}
function onTouchMove(e){ if(!dragging.value) return; dY.value = e.touches[0].clientY - startY.value }
function onTouchEnd(){ if(!dragging.value) return; dragging.value=false; if(dY.value>120) close('swipe'); dY.value=0 }

function onKeydown(e){
  if (e.key === 'Escape'){ e.preventDefault(); close('esc'); return }
  if (e.key !== 'Tab') return
  // Focus trap
  const focusEls = overlay.value?.querySelectorAll?.('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
  if (!focusEls?.length) return
  const list = Array.from(focusEls).filter(el => el.offsetParent !== null)
  const first = list[0], last = list[list.length-1]
  if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus() }
}

/* Scroll-lock while open */
let lastActive=null
watch(isOpen, async v => {
  if (v){
    await nextTick()
    lastActive = document.activeElement
    overlay.value?.focus?.()
    sheet.value?.querySelector?.('input,button,select')?.focus?.()
    document.body.style.overflow='hidden'
  } else {
    document.body.style.overflow=''
    try{ lastActive?.focus?.() }catch{}
  }
})
onMounted(()=>{ if(isOpen.value){ overlay.value?.focus?.(); document.body.style.overflow='hidden' } })
onBeforeUnmount(()=>{ document.body.style.overflow='' })

/* Visual helpers */
const glowGreen = 'radial-gradient(80% 60% at 50% 40%, rgba(16,185,129,.25), transparent 70%)'
const glowGray  = 'radial-gradient(80% 60% at 50% 40%, rgba(148,163,184,.16), transparent 70%)'
</script>

<style scoped>
/* Entrance animation */
@keyframes in { from{ opacity:0; transform: translateY(60px) scale(.98) } to{ opacity:1; transform:none } }
.animate-in{ animation: in .38s cubic-bezier(.22,1,.36,1) both }

/* Chips */
.chip{
  padding:.3rem .6rem; border-radius:9999px; border:1px solid rgba(255,255,255,.18);
  background: rgba(255,255,255,.08); color:#fff; white-space:nowrap;
}
.chip.active{ background:linear-gradient(90deg, rgba(236,72,153,.3), rgba(236,72,153,.15)); border-color: rgba(236,72,153,.6) }

/* No scrollbar util */
.no-scrollbar::-webkit-scrollbar{ display:none }

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  .backdrop-blur-sm{ backdrop-filter:none !important }
}
</style>
