<!-- src/components/LiveStage.vue -->
<template>
  <div
    class="relative w-screen h-screen overflow-hidden font-sans text-white bg-black"
    :style="backgroundStyle"
    @click="tapLikeAnywhere"
  >
    <!-- ===== Top bar ===== -->
    <div
      class="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-2
             bg-black/60 backdrop-blur border-b border-white/10"
      :style="{ paddingTop: 'env(safe-area-inset-top,0px)' }"
    >
      <div class="flex items-center gap-2 min-w-0">
        <div class="relative shrink-0">
          <img :src="hostAvatar" alt="Host" class="w-9 h-9 rounded-full object-cover border-2 border-white" />
          <span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-white animate-ping"></span>
        </div>

        <div class="text-[11px] leading-tight min-w-0">
          <div class="flex items-center gap-1 font-bold truncate">
            <span class="truncate">{{ hostUsername }}</span>
            <span v-if="isVerified" class="text-yellow-300">✔</span>
            <span class="bg-white/10 text-pink-300 px-2 rounded-full text-[10px] shrink-0">LIVE Host</span>
          </div>
          <div class="text-pink-300/90 text-[10px]">
            {{ compact(viewerCount) }} Watching • <span :class="netClass">{{ netLabel }}</span>
          </div>
        </div>

        <!-- live likes counter -->
        <div class="ml-1 flex items-center gap-1 px-2 py-1 bg-white/10 rounded-full text-pink-300 text-[11px] font-bold shrink-0">
          💖 <span>{{ compact(likeCounter) }}</span>
        </div>

        <button class="ml-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-200 rounded-full text-[10px] shrink-0" @click.stop="emit('open-ranking')">🔥 Daily Ranking</button>
        <button class="ml-1 px-2 py-0.5 bg-pink-600 text-white rounded-full text-[10px] hover:bg-pink-700 shrink-0" @click.stop="showAddGoal = true">➕ Add Goal</button>
      </div>

      <div class="flex items-center gap-1 text-[10px]">
        <button class="px-2 py-1 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 hover:brightness-110" @click.stop="emit('featured')">⭐ Featured</button>
        <button class="px-2 py-1 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 hover:brightness-110" @click.stop="emit('explore')">🌍 Explore</button>
        <span class="bg-white/10 text-blue-200 px-2 py-1 rounded-full">👑 TopFan</span>
        <span class="text-red-500 animate-pulse">● LIVE</span>
        <button class="ml-1 px-2 py-1 bg-red-600 rounded-full hover:bg-red-700" @click.stop="confirmEndStream">✖ End</button>
      </div>
    </div>

    <!-- Promo ticker -->
    <div class="absolute top-12 left-0 right-0 z-40 bg-black/80 text-white text-[11px]">
      <div class="px-4 py-1 overflow-hidden">
        <div class="whitespace-nowrap animate-marquee">
          🚀 Promotion: Boost your live visibility now and earn double coins! • 🌐 Invite friends to join and get rewards. • ✨ New filters unlocked today!
        </div>
      </div>
    </div>

    <!-- Topic + Goal -->
    <div class="absolute top-20 left-1/2 -translate-x-1/2 z-40 text-center">
      <div class="bg-white/10 text-[11px] px-3 py-1 rounded-full shadow backdrop-blur border border-white/20">
        🎯 Topic: {{ topic }}
      </div>
      <div v-if="currentGoal" class="mt-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-white text-[11px] px-3 py-1 rounded-full shadow backdrop-blur border border-white/20 animate-pulse">
        🎯 Goal: {{ currentGoal }}
      </div>
    </div>

    <!-- AI Host badge -->
    <transition name="fade">
      <div v-if="showAiHostAvatar" class="absolute bottom-[160px] right-3 z-50 bg-white/10 border border-white/20 p-2.5 rounded-xl backdrop-blur text-center">
        <img :src="aiHostAvatar" class="w-12 h-12 rounded-full mx-auto" alt="AI host"/>
        <div class="text-[11px] mt-1 text-white/80">Smart Host</div>
        <div class="text-[10px] text-sky-300">"Need help? Ask me anything."</div>
      </div>
    </transition>

    <!-- Video feed -->
    <video ref="videoEl" autoplay playsinline muted class="absolute inset-0 w-full h-full object-cover z-0">
      Your browser does not support video playback.
    </video>

    <!-- Optional FX layers -->
    <component :is="FaceFilterLayer"   v-if="FaceFilterLayer && showFaceFilters" :filter="selectedFilter" />
    <component :is="FloatingParticles" v-if="FloatingParticles && showFx" />
    <component :is="StageLighting"     v-if="StageLighting && showFx" />

    <!-- Gift animation (lazy) -->
    <component
      :is="LiveGiftAnimation"
      v-if="LiveGiftAnimation && currentGiftAnimation"
      :gift="currentGiftAnimation"
      class="absolute bottom-[120px] top-[40%] left-0 right-0 pointer-events-none z-50"
    />

    <!-- Flying gifts -->
    <transition-group name="fly" tag="div" class="absolute inset-x-0 bottom-[120px] top-[40%] z-50 pointer-events-none">
      <component :is="GiftFly" v-for="(gift, i) in flyingGifts" :key="gift.id || i" :gift="gift" />
    </transition-group>

    <!-- Chat -->
    <component :is="LiveMessageFeed" v-if="LiveMessageFeed"
               :messages="liveMessages"
               class="fixed bottom-[120px] left-3 z-40 max-w-md w-[92vw] pointer-events-none flex flex-col-reverse space-y-1 space-y-reverse" />
    <component :is="ChatInput" v-if="ChatInput"
               v-model="chatMessage"
               @send="handleSendMessage"
               placeholder="Type a message…"
               class="fixed bottom-3 left-3 z-50 max-w-md w-[92vw]" />

    <!-- Hearts -->
    <transition-group name="float" tag="div" class="absolute inset-0 pointer-events-none z-50">
      <div v-for="like in floatingLikes" :key="like.id" class="absolute text-2xl"
           :style="{ left: like.x+'px', top: like.y+'px', animation: 'floatUp 1.1s ease-out forwards' }">💖</div>
    </transition-group>

    <!-- AI tips -->
    <transition name="fade">
      <div v-if="aiSuggestions.length" class="fixed bottom-[180px] left-3 z-40 bg-white/10 backdrop-blur rounded-xl p-3 text-[12px] text-white w-[92vw] max-w-md">
        <div class="font-bold mb-1">🧠 Smart Tips</div>
        <ul class="list-disc list-inside">
          <li v-for="(s, i) in aiSuggestions" :key="i">{{ s }}</li>
        </ul>
      </div>
    </transition>

    <!-- Announcement -->
    <transition name="fade">
      <div v-if="streamAnnouncement" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-black/80 px-3 py-3 rounded-xl text-sm font-bold text-white shadow-xl">
        {{ streamAnnouncement }}
      </div>
    </transition>

    <!-- Like bubble -->
    <div class="absolute bottom-40 right-3 z-50 flex flex-col items-center gap-1">
      <button @click.stop="tapLikeAnywhere" class="w-12 h-12 bg-pink-600 rounded-full grid place-items-center hover:bg-pink-700 shadow-lg active:scale-95">💗</button>
      <span class="text-[13px] font-semibold text-pink-300">{{ compact(likeCounter) }}</span>
    </div>

    <!-- Bottom dock -->
    <div class="absolute left-0 right-0 z-40" :style="{ bottom: 'calc(env(safe-area-inset-bottom,0px) + 56px)' }">
      <div class="px-4">
        <div class="flex items-center justify-between">
          <button v-for="action in bottomActions" :key="action.label"
                  class="relative w-14 h-14 rounded-full text-[12px] grid place-items-center gap-0.5
                         text-white shadow-lg border border-white/10 backdrop-blur-xl transition active:scale-95"
                  :class="action.bg"
                  @click.stop="action.onClick()"
                  @pointerdown.passive="vibrate(8)">
            <div class="text-xl" aria-hidden="true">{{ action.icon }}</div>
            <div class="mt-0.5">{{ action.label }}</div>
            <span v-if="action.hasNotification" class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
            <span v-if="action.hasNotification" class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- Panels -->
    <transition name="fade">
      <div v-if="showFaceFilterSelector" class="absolute bottom-28 left-1/2 -translate-x-1/2 z-50">
        <component :is="FaceFilterSelector" v-if="FaceFilterSelector" :selected="selectedFilter" @select="onSelectFilter" />
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showMoreOptions" class="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 px-3 py-3 rounded-xl text-sm text-white bg-black/50 backdrop-blur-md shadow-lg">
        <div class="flex flex-wrap gap-4 justify-center">
          <button @click="toggleMic" class="hover:text-sky-400">{{ micMuted ? '🔇 Mic Off' : '🎙️ Mic On' }}</button>
          <button @click="toggleReplay" class="hover:text-sky-400">📼 Replay</button>
          <button @click="openEffects" class="hover:text-sky-400">✨ Effects</button>
          <button @click="openSummary" class="hover:text-sky-400">📊 Summary</button>
          <button @click="toggleSettings" class="hover:text-sky-400">⚙ Settings</button>
          <button @click="showFaceFilterSelector = true" class="hover:text-sky-400">🎭 Filters</button>
          <button @click="toggleDataSaver" class="hover:text-sky-400">{{ dataSaver ? '🟢 Data Saver On' : '⚪ Data Saver Off' }}</button>
        </div>
      </div>
    </transition>

    <!-- Modal -->
    <AddGoal v-if="showAddGoal" @close="showAddGoal = false" @set-goal="goal => currentGoal = goal" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, defineAsyncComponent } from 'vue'

/* ---- Safe async helper ---- */
const Noop = { name:'Noop', render(){ return null } }
const SafeAsync = (loader) => defineAsyncComponent({ loader, timeout: 2000, suspensible: false, onError:() => {} })

/* ---- EXACT casing + RELATIVE paths ---- */
const FaceFilterLayer    = SafeAsync(() => import('./effects/FaceFilterLayer.vue').catch(()=>Noop))
const FloatingParticles  = SafeAsync(() => import('./effects/FloatingParticles.vue').catch(()=>Noop))
const StageLighting      = SafeAsync(() => import('./effects/StageLighting.vue').catch(()=>Noop))

/* Live widgets */
const LiveGiftAnimation  = SafeAsync(() => import('./Live/LiveGiftAnimation.vue').catch(()=>Noop))
const GiftFly            = SafeAsync(() => import('./Live/GiftFly.vue').catch(()=>Noop))
const LiveMessageFeed    = SafeAsync(() => import('./Live/LiveMessageFeed.vue').catch(()=>Noop))
const ChatInput          = SafeAsync(() => import('./Live/ChatInput.vue').catch(()=>Noop))
const FaceFilterSelector = SafeAsync(() => import('./Live/FaceFilterSelector.vue').catch(()=>Noop))

/* ✅ FIX: correct AddGoal path (case-sensitive) */
const AddGoal            = SafeAsync(() => import('./Goals/AddGoal.vue').catch(()=>Noop))

/* ---- Props ---- */
const props = defineProps({
  hostAvatar:   { type: String, default: '/avatars/host.png' },
  hostUsername: { type: String, default: '@host' },
  isVerified:   { type: Boolean, default: true },
  viewerCount:  { type: Number, default: 1280 },
  likeCount:    { type: Number, default: 0 },
  topic:        { type: String, default: 'Boosting Business Engagement 🔥' },
  aiHostAvatar: { type: String, default: '/avatars/ai.png' },
  backgroundStyle: { type: Object, default: () => ({ background: 'linear-gradient(180deg,#0f172a,#020617)' }) },
})

/* ---- Emits ---- */
const emit = defineEmits(['open-ranking','featured','explore','end',
  'open-gifts','share','open-guests','open-hosts','open-more',
  'send-message','open-effects','open-summary','open-settings','superchat','recharge'])

/* ---- State ---- */
const showAiHostAvatar = ref(true)
const likeCounter = ref(props.likeCount)
const floatingLikes = ref([])
const liveMessages = ref([])
const chatMessage = ref('')
const currentGiftAnimation = ref(null)
const flyingGifts = ref([])
const aiSuggestions = ref(['Ask viewers to tap like twice for combo!','Pin the best comment every 2 minutes.'])
const streamAnnouncement = ref('')
const showMoreOptions = ref(false)
const showFaceFilterSelector = ref(false)
const selectedFilter = ref(null)
const showFaceFilters = ref(true)
const showFx = ref(true)
const dataSaver = ref(false)
const micMuted = ref(false)
const videoEl = ref(null)
let wakeLock = null
const showAddGoal = ref(false)
const currentGoal = ref('')

/* ---- Net status ---- */
const net = ref({ downlink: null, effectiveType: null })
function readNet(){
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (!c) return
  net.value = { downlink: c.downlink, effectiveType: c.effectiveType }
}
onMounted(() => {
  readNet()
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  c?.addEventListener?.('change', readNet)
})
onBeforeUnmount(() => {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  c?.removeEventListener?.('change', readNet)
})
const netLabel = computed(() => net.value.effectiveType ? `${net.value.effectiveType}${net.value.downlink ? ' • '+net.value.downlink+'Mbps' : ''}` : 'online')
const netClass = computed(() => /2g|slow-2g/.test(net.value.effectiveType||'') ? 'text-amber-300' : 'text-emerald-300')

/* ---- Actions ---- */
const bottomActions = [
  { label:'Gifts',  icon:'🎁', bg:'bg-gradient-to-br from-pink-500 to-pink-700',  hasNotification:false, onClick:() => emit('open-gifts') },
  { label:'Share',  icon:'📤', bg:'bg-gradient-to-br from-rose-500 to-red-600',   hasNotification:false, onClick:shareLive },
  { label:'+Guests',icon:'👥', bg:'bg-gradient-to-br from-purple-600 to-indigo-700', hasNotification:true, onClick:() => emit('open-guests') },
  { label:'+Hosts', icon:'🤝', bg:'bg-gradient-to-br from-indigo-600 to-blue-700', hasNotification:false, onClick:() => emit('open-hosts') },
  { label:'More',   icon:'⋯',  bg:'bg-gradient-to-br from-slate-700 to-black',   hasNotification:false, onClick:() => { showMoreOptions.value = !showMoreOptions.value; vibrate(10) } },
]

/* ---- Likes ---- */
let lastTap = 0
function tapLikeAnywhere(e){
  const now = Date.now()
  const dbl = (now - lastTap) < 300
  lastTap = now
  addHeart(e?.clientX, e?.clientY, dbl)
  likeCounter.value++
  if (dbl) { for (let i = 0; i < 3; i++) addHeart(e?.clientX + rand(-20,20), (e?.clientY || 0) + rand(-20,20), false, 0.05*i) }
  vibrate(dbl ? 16 : 8)
}
function addHeart(x = window.innerWidth - 40, y = window.innerHeight - 120, big=false, delay=0){
  const id = Math.random().toString(36).slice(2,7)
  floatingLikes.value.push({ id, x, y, big })
  setTimeout(() => { floatingLikes.value = floatingLikes.value.filter(h => h.id !== id) }, 1100 + delay*1000)
}

/* ---- Chat ---- */
function handleSendMessage(msg){
  if (!msg) return
  emit('send-message', msg)
  liveMessages.value.unshift({ user:'You', text: msg, at: Date.now() })
  chatMessage.value = ''
}

/* ---- Face filters ---- */
function onSelectFilter(f){ selectedFilter.value = f; showFaceFilterSelector.value = false }

/* ---- Utils ---- */
function vibrate(ms=12){ try { navigator.vibrate?.(ms) } catch(_){} }
function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min }
function compact(n){
  const num = Number(n ?? 0)
  if (num >= 1e9) return (num/1e9).toFixed(1)+'B'
  if (num >= 1e6) return (num/1e6).toFixed(1)+'M'
  if (num >= 1e3) return (num/1e3).toFixed(1)+'K'
  return String(num)
}

/* ---- System niceties ---- */
async function enableWakeLock(){ try { wakeLock = await navigator.wakeLock?.request?.('screen') } catch {} }
function releaseWakeLock(){ try { wakeLock?.release?.(); wakeLock = null } catch {} }
async function tryPip(){ try { if ('requestPictureInPicture' in videoEl.value) await videoEl.value.requestPictureInPicture() } catch {} }
function toggleDataSaver(){ dataSaver.value = !dataSaver.value; streamAnnouncement.value = dataSaver.value ? 'Data Saver ON' : 'Data Saver OFF'; setTimeout(()=> streamAnnouncement.value = '', 1200) }
function toggleMic(){ micMuted.value = !micMuted.value }
function openEffects(){ emit('open-effects') }
function openSummary(){ emit('open-summary') }
function toggleSettings(){ emit('open-settings') }
function toggleReplay(){ emit('open-summary') }
function shareLive(){
  const shareData = { title:'Join my LIVE', text:'Haya, ingia kwenye LIVE yangu sasa!', url: location.href }
  if (navigator.share) navigator.share(shareData).catch(()=>{})
  else { navigator.clipboard?.writeText(shareData.url); streamAnnouncement.value = 'Link copied ✓'; setTimeout(()=> streamAnnouncement.value = '', 1200) }
}
function confirmEndStream(){ if (confirm('End the LIVE?')) emit('end') }

/* ---- Lifecycle ---- */
onMounted(() => { enableWakeLock(); orientationHint() })
onBeforeUnmount(() => { releaseWakeLock() })
function orientationHint(){
  const isPortrait = window.matchMedia('(orientation: portrait)').matches
  if (isPortrait) { streamAnnouncement.value = 'Rotate for wider view ↻'; setTimeout(()=> streamAnnouncement.value = '', 2000) }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@keyframes marquee { 0%{ transform: translateX(100%)} 100%{ transform: translateX(-100%)} }
.animate-marquee { display:inline-block; min-width: 200%; animation: marquee 18s linear infinite; }

@keyframes floatUp { 0%{ transform: translateY(0) scale(.9); opacity: .9 } 100%{ transform: translateY(-120px) scale(1.2); opacity: 0 } }
@keyframes flyGift { to { transform: translateY(-80px); opacity: 0 } }
.float-enter-active, .float-leave-active { transition: opacity .2s ease, transform .2s ease; }
.float-enter-from, .float-leave-to { opacity: 0; transform: translateY(4px) }

:root { --dock-bottom: calc(env(safe-area-inset-bottom,0px) + 56px) }
</style>
