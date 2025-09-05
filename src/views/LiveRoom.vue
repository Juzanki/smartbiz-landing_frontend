<!-- src/views/LiveRoom.vue -->
<template>
  <div
    class="room relative w-full min-h-[100dvh] font-sans text-white overflow-hidden select-none"
    :class="{'freeze': anyPanelOpen}"
    :style="[bgStyle, cssVars]"
    @click="handleTapAnywhere"
    @contextmenu.prevent
  >
    <!-- ===== Top App Bar ===== -->
    <header
      class="safe-top sticky top-0 z-[70] w-full px-3 py-2 bg-black/30 backdrop-blur-md border-b border-white/10"
      aria-label="Live header"
    >
      <div class="flex items-center justify-between gap-2">
        <!-- Host -->
        <div class="flex items-center gap-2 min-w-0">
          <div class="relative shrink-0">
            <img :src="hostAvatar" alt="Host" class="w-9 h-9 rounded-full object-cover ring-2 ring-white/80" />
            <span class="live-dot" aria-hidden="true"></span>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1 text-xs font-semibold truncate">
              <span class="truncate">{{ hostUsername }}</span>
              <span v-if="isVerified" class="text-yellow-300" aria-label="Verified">✔</span>
              <span class="chip chip-pink">LIVE</span>
              <span class="chip chip-heart" :title="likeCount + ' likes'">❤️ {{ compactLikes }}</span>
            </div>
            <div class="text-[11px]" :class="netClass">
              {{ viewerCount.toLocaleString() }} watching • {{ netLabel }}
            </div>
          </div>
        </div>

        <!-- Right controls -->
        <div class="flex items-center gap-1">
          <button class="btn-ghost text-[11px]" @click.stop="toggleCam">{{ camOn ? '📷 On' : '📷 Off' }}</button>
          <button class="btn-ghost text-[11px]" @click.stop="toggleMic">{{ micOn ? '🎙️ On' : '🎙️ Off' }}</button>
          <button class="btn-ghost text-[11px]" @click.stop="toggleMute">{{ muted ? '🔇' : '🔊' }}</button>
          <button class="btn-danger text-[11px]" @click.stop="confirmEndStream">✖ End</button>
        </div>
      </div>

      <!-- Quick chips -->
      <div class="mt-2 flex items-center gap-1 text-[10px] overflow-x-auto no-scrollbar">
        <span class="chip chip-amber">🔥 Ranking</span>
        <span class="chip chip-sky">⭐ Featured</span>
        <span class="chip chip-indigo">🌍 Explore</span>
        <span class="chip chip-stroke">👑 TopFan</span>
      </div>
    </header>

    <!-- ===== Ad Ticker ===== -->
    <div class="ticker-wrap" role="marquee" aria-label="Promoted messages">
      <div class="ticker">
        <div v-for="(ad,i) in ads" :key="i" class="ticker-item" @click.stop="openAd(ad)">
          <span class="opacity-80">•</span><span class="ml-1">{{ ad.text }}</span>
        </div>
        <div v-for="(ad,i) in ads" :key="'d'+i" class="ticker-item" @click.stop="openAd(ad)">
          <span class="opacity-80">•</span><span class="ml-1">{{ ad.text }}</span>
        </div>
      </div>
      <div class="fade fade-left" /><div class="fade fade-right" />
    </div>

    <!-- ===== Topic & Goal ===== -->
    <div class="absolute z-[60] left-1/2 -translate-x-1/2 top-[74px] sm:top-[82px] w-[92vw] max-w-md pointer-events-none">
      <div class="mx-auto text-center">
        <div class="inline-flex px-3 py-1 text-[11px] rounded-full bg-white/10 border border-white/15">🎯 {{ topic }}</div>
        <div v-if="currentGoal" class="mt-1 inline-flex px-3 py-1 text-[11px] font-semibold rounded-full text-white bg-gradient-to-r from-yellow-400 to-pink-500 border border-white/15 animate-pulse">
          Goal: {{ currentGoal }}
        </div>
      </div>
    </div>

    <!-- ===== Offline ===== -->
    <div v-if="!online" class="fixed top-[46px] left-1/2 -translate-x-1/2 z-[80] px-3 py-1 rounded-lg bg-amber-600/90 text-white text-xs shadow" role="alert">
      You are offline. Some features are paused.
    </div>

    <!-- ===== Stage / Video ===== -->
    <div class="absolute inset-0 -z-10">
      <video ref="videoFeed" :muted="muted" autoplay playsinline class="absolute inset-0 w-full h-full object-cover" />
      <div v-if="!effectsOn" class="absolute inset-0 pointer-events-none opacity-40"
           style="background: radial-gradient(420px 240px at 20% 20%, rgba(255,255,255,.12), transparent 70%)"></div>
    </div>

    <!-- ===== Effects (click-through) ===== -->
    <ErrorBoundary class="contents" @error="onChildError('effects')">
      <div class="pointer-events-none absolute inset-0">
        <!-- Persistent FX layers selected from Effects panel -->
        <div
          v-for="id in activeEffects"
          :key="'fx-'+id"
          class="effect-layer"
          :class="layerClass(id)"
          aria-hidden="true"
        />

        <!-- Optional extra effect components -->
        <component :is="FaceFilterLayer"    v-if="FaceFilterLayer && effectsOn && selectedFilter !== 'none'" :filter="selectedFilter" />
        <component :is="FloatingParticles"  v-if="FloatingParticles && effectsOn" />
        <component
          :is="AnimatedGiftEffect"
          v-if="AnimatedGiftEffect && effectsOn && giftEvents.length"
          :gifts="giftEvents"
        />
        <component :is="StageLighting"      v-if="StageLighting && effectsOn" />
      </div>
    </ErrorBoundary>

    <!-- ===== Big Gifts & Flying ===== -->
    <component
      :is="LiveGiftAnimation"
      v-if="LiveGiftAnimation && currentGiftAnimation"
      :gift="currentGiftAnimation"
      class="absolute left-0 right-0 z-50 pointer-events-none"
      :style="{ top: '38%', bottom: `calc(var(--dock-h) + 8px + var(--safe-bottom) + var(--kb))` }"
    />
    <transition-group name="fly" tag="div" class="absolute inset-x-0 z-50 pointer-events-none"
                      :style="{ top: '38%', bottom: `calc(var(--dock-h) + 8px + var(--safe-bottom) + var(--kb))` }">
      <component :is="GiftFly" v-for="(gift, i) in flyingGifts" :key="gift.id || i" :gift="gift" />
    </transition-group>

    <!-- ===== Chat Feed ===== -->
    <ErrorBoundary @error="onChildError('chat')">
      <component
        :is="LiveMessageFeed"
        v-if="LiveMessageFeed"
        :messages="liveMessages"
        class="fixed left-3 z-40 w-[92vw] max-w-md"
        :style="{ bottom: `calc(var(--dock-h) + var(--chat-h) + 16px + var(--safe-bottom) + var(--kb))` }"
      />
    </ErrorBoundary>

    <!-- ===== Chat Input ===== -->
    <ErrorBoundary @error="onChildError('chatInput')">
      <div ref="chatWrap" class="fixed left-3 z-50 w-[92vw] max-w-md"
           :style="{ bottom: `calc(var(--dock-h) + 8px + var(--safe-bottom) + var(--kb))` }">
        <component
          :is="ChatInput"
          v-if="ChatInput"
          v-model="chatMessage"
          :suggestions="smartReplies"
          @send="handleSendMessage"
          @attach="handleAttach"
          @typing="setTyping"
        />
      </div>
    </ErrorBoundary>

    <!-- ===== Like bubble & counter ===== -->
    <div class="absolute right-3 z-40 flex flex-col items-center"
         :style="{ bottom: `calc(var(--dock-h) + 12px + var(--safe-bottom) + var(--kb))` }">
      <button class="btn-like" @click.stop="handleTapAnywhere" aria-label="Send like">❤️</button>
      <span class="text-sm text-pink-200 font-bold mt-1">{{ compactLikes }}</span>
    </div>

    <!-- floating hearts render -->
    <div v-for="h in floatingLikes" :key="h.id" class="floating-like" :style="{ left: h.x + 'px', top: h.y + 'px' }">❤️</div>

    <!-- ===== Bottom Dock ===== -->
    <nav class="safe-bottom fixed left-0 right-0 z-40" :style="{ bottom: '0', paddingBottom: 'calc(var(--safe-bottom))' }" aria-label="Live actions">
      <div class="dock" ref="dockRef">
        <button
          v-for="a in bottomActions"
          :key="a.label"
          type="button"
          :aria-label="a.label"
          @click="a.onClick"
          :class="['dock-btn', a.kind && 'dock-'+a.kind]"
        >
          <i :class="a.icon + ' text-[18px]'" />
          <span class="dock-label text-[11px] mt-0.5">{{ a.label }}</span>
        </button>
      </div>
    </nav>

    <!-- ===== Floating Controls ===== -->
    <div class="fixed right-2 top-[94px] z-[65] flex flex-col gap-2">
      <button class="btn-ghost text-[11px]" @click.stop="togglePip">⧉ PIP</button>
      <button class="btn-ghost text-[11px]" @click.stop="toggleFullscreen">{{ isFull ? '⤢ Exit' : '⤢ Full' }}</button>
    </div>

    <!-- ===== Panels & Modals (ONE-AT-A-TIME) ===== -->
    <transition name="fade">
      <div
        v-if="anyPanelOpen"
        class="overlay"
        role="dialog"
        aria-modal="true"
        @click.self="closeAllPanels"
        @touchstart.self="onOverlayTouchStart"
        @touchmove.self="onOverlayTouchMove"
      >
        <!-- Co-Hosts -->
        <component
          :is="CoHostControlSheet"
          v-if="showHostsPanel && CoHostControlSheet"
          class="panel-mount"
          :hosts="hosts"
          :requests="joinRequests"
          :suggested="suggestedFriends"
          @close="closeAllPanels"
          @invite="onInvite"
          @approve="onApprove"
          @reject="onReject"
          @toggle-mic="onToggleMic"
          @toggle-cam="onToggleCam"
          @remove="onRemoveHost"
          @swap-main="onSwapMain"
          @role-change="onRoleChange"
          @quick-mute="onQuickMute"
          @quick-cam="onQuickCam"
        >
          <template #grid-panel>
            <component
              :is="GridPanel"
              v-if="GridPanel"
              :hosts="hosts"
              @assign="onAssign"
              @expand="onExpand"
              @pin="onPin"
              @reorder="onReorder"
            />
          </template>
          <template #smart-cam>
            <component :is="SmartCam" v-if="SmartCam" :active="camOn" :mic="micOn" @snapshot="onSnapshot" />
          </template>
        </component>

        <!-- Fallback (old HostsPanel) -->
        <component :is="HostsPanel" v-else-if="showHostsPanel && HostsPanel" @close="closeAllPanels" class="panel-mount" />

        <!-- Guests -->
        <component :is="GuestsPanel" v-if="showGuestPanel && GuestsPanel" @close="closeAllPanels" class="panel-mount" />

        <!-- Effects: correct v-model bindings -->
        <component
          :is="EffectsPanel"
          v-if="showEffectsPanel && EffectsPanel"
          v-model="showEffectsPanel"
          v-model:effects="activeEffects"
          @close="closeAllPanels"
          class="panel-mount"
        />

        <!-- Gifts (robust: Drawer -> Panel -> Minimal) -->
        <component
          :is="GiftUI"
          v-if="showGiftDrawer"
          :gifts="giftList"
          @send="g => (handleGiftSend(g), closeAllPanels())"
          @close="closeAllPanels"
          class="panel-mount"
        />

        <!-- Share -->
        <ShareSheet
          v-if="showShareSheet"
          class="panel-mount"
          :url="shareUrl"
          title="Join my Live"
          @close="closeAllPanels"
          @copy="toastRef?.success('Link copied')"
        />

        <!-- Settings / Wallet / Goal -->
        <component :is="SettingsModal"    v-if="showSettings     && SettingsModal"    @close="closeAllPanels" class="panel-mount" />
        <component :is="WalletTopupModal" v-if="showWalletTopup  && WalletTopupModal" @close="closeAllPanels" class="panel-mount" />
        <component :is="SuperChatModal"   v-if="showSuperChatModal && SuperChatModal" @confirm="handleSuperChat" @close="closeAllPanels" class="panel-mount" />
        <component :is="AddGoal"          v-if="showAddGoal && AddGoal"               @set="v => (currentGoal = v, closeAllPanels())" @close="closeAllPanels" class="panel-mount" />
      </div>
    </transition>

    <!-- ===== Toasts ===== -->
    <Toast ref="toastRef" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, defineAsyncComponent, h } from 'vue'
import { nanoid } from 'nanoid'

/* ---------- Lazy component resolver (return NULL if missing) ---------- */
const modules = import.meta.glob('../components/**/*.vue')
function lazyFromGlob(paths){
  const found = paths.find(p => modules[p])
  return found ? defineAsyncComponent({
    loader: modules[found],
    onError(err){ console.warn('Async component failed:', err) }
  }) : null
}

/* ---------- ErrorBoundary (FIX: wraps attrs to root) ---------- */
const ErrorBoundary = {
  name:'ErrorBoundary', emits:['error'], inheritAttrs: false,
  errorCaptured(err,_i,info){ this.$emit('error',{err,info}); return false },
  render(){ return h('div', { ...this.$attrs }, this.$slots.default?.()) }
}

/* ---------- Toast ---------- */
const Toast = {
  name:'Toast',
  data:()=>({items:[]}),
  methods:{
    push(type,text,ttl=4000){ const id=nanoid(); this.items.push({id,type,text}); setTimeout(()=>this.items=this.items.filter(i=>i.id!==id),ttl) },
    success(t,ttl){ this.push('ok',t,ttl) }, warn(t,ttl){ this.push('warn',t,ttl) }, error(t,ttl){ this.push('error',t,ttl) }
  },
  render(){
    return h('div',{class:'fixed right-3 top-3 z-[90] space-y-2'}, this.items.map(t =>
      h('div',{
        key:t.id,
        class:[
          'px-3 py-2 rounded-lg shadow text-sm flex items-center gap-2',
          t.type==='error'?'bg-rose-600':t.type==='warn'?'bg-amber-600':'bg-emerald-600'
        ]
      },[
        h('span',null, t.type==='error'?'⚠':t.type==='warn'?'⚑':'✓'),
        h('span',null, t.text)
      ])
    ))
  }
}

/* ---------- Built-in Gifts fallback (mobile-first) ---------- */
const MinimalGiftSheet = {
  name:'MinimalGiftSheet',
  props:{ gifts: { type: Array, default: ()=>[] } },
  emits:['send','close'],
  data:()=>({ query:'' }),
  computed:{
    filtered(){ const q=this.query.trim().toLowerCase(); return q? this.gifts.filter(g=>g.name.toLowerCase().includes(q)): this.gifts }
  },
  methods:{ send(g){ this.$emit('send', g) } },
  render(){
    return h('div',{class:'sheet'},[
      h('header',{class:'sheet-head'},[
        h('div',{class:'sh-title'},'🎁 Gifts'),
        h('button',{class:'sh-close',ariaLabel:'Close',onClick:()=>this.$emit('close')},'✖')
      ]),
      h('div',{class:'flex items-center gap-2 mb-2'},[
        h('input',{class:'share-input',placeholder:'Search gifts…',value:this.query,onInput:(e)=>this.query=e.target.value}),
        h('button',{class:'btn-ghost',onClick:()=>this.$emit('close')},'Close')
      ]),
      h('div',{class:'gift-grid'},
        this.filtered.map(g => h('button',{
          key:g.id,class:'gift-card',onClick:()=>this.send(g)
        },[
          h('div',{class:'gift-emoji'},g.icon),
          h('div',{class:'gift-name'},g.name),
          h('div',{class:'gift-price'},`${g.price} 💎`)
        ]))
      ),
      h('footer',{class:'sheet-foot'},[
        h('div',null,'Tip: tap a gift to send')
      ])
    ])
  }
}

/* ---------- Share Sheet ---------- */
const ShareSheet = {
  name:'ShareSheet',
  props:{ url:String, title:{type:String,default:'Share'} },
  emits:['close','copy','share'],
  computed:{
    enc(){ return encodeURIComponent(this.url || '') },
    encTitle(){ return encodeURIComponent(this.title) },
    links(){
      return {
        whatsapp: `https://api.whatsapp.com/send?text=${this.encTitle}%20${this.enc}`,
        telegram: `https://t.me/share/url?url=${this.enc}&text=${this.encTitle}`,
        x:        `https://twitter.com/intent/tweet?url=${this.enc}&text=${this.encTitle}`
      }
    }
  },
  methods:{
    async copy(){ try{ await navigator.clipboard.writeText(this.url); this.$emit('copy') }catch{} },
    async nativeShare(){ if(navigator.share){ try{ await navigator.share({ title:this.title, url:this.url }); this.$emit('share') }catch{} } },
    open(link){ window.open(link,'_blank') }
  },
  render(){
    return h('div',{class:'sheet'},[
      h('header',{class:'sheet-head'},[
        h('div',{class:'sh-title'},'🔗 Share'),
        h('button',{class:'sh-close',ariaLabel:'Close',onClick:()=>this.$emit('close')},'✖')
      ]),
      h('div',{class:'share-body'},[
        h('input',{class:'share-input',value:this.url,readOnly:true,onFocus:e=>e.target.select()}),
        h('div',{class:'share-actions'},[
          h('button',{class:'btn-ghost',onClick:this.copy},'Copy Link'),
          h('button',{class:'btn-ghost',onClick:this.nativeShare},'Native Share')
        ]),
        h('div',{class:'share-quick'},[
          h('button',{class:'share-chip',onClick:()=>this.open(this.links.whatsapp)},'🟢 WhatsApp'),
          h('button',{class:'share-chip',onClick:()=>this.open(this.links.telegram)},'🔵 Telegram'),
          h('button',{class:'share-chip',onClick:()=>this.open(this.links.x)},'⚫️ X (Twitter)')
        ])
      ])
    ])
  }
}

/* ---------- Components ---------- */
const LiveMessageFeed   = lazyFromGlob(['../components/Live/LiveMessageFeed.vue','../components/live/LiveMessageFeed.vue'])
const ChatInput         = lazyFromGlob(['../components/Live/ChatInput.vue','../components/ChatInput.vue','../components/live/ChatInput.vue'])
const SettingsModal     = lazyFromGlob(['../components/modals/SettingsModal.vue'])
const WalletTopupModal  = lazyFromGlob(['../components/modals/WalletTopupModal.vue'])
const GiftDrawer        = lazyFromGlob(['../components/modals/GiftDrawer.vue'])
const GiftsPanel        = lazyFromGlob(['../components/modals/GiftsPanel.vue'])
const SuperChatModal    = lazyFromGlob(['../components/modals/SuperChatModal.vue'])
const EffectsPanel      = lazyFromGlob(['../components/modals/EffectsStudioMobile.vue','../components/modals/EffectsPanel.vue'])
const HostsPanel        = lazyFromGlob(['../components/modals/HostsPanel.vue'])
const GuestsPanel       = lazyFromGlob(['../components/modals/GuestsPanel.vue'])
const AddGoal           = lazyFromGlob(['../components/Goals/AddGoal.vue','../components/goals/AddGoal.vue'])

const FloatingParticles = lazyFromGlob(['../components/effects/FloatingParticles.vue'])
const AnimatedGiftEffect= lazyFromGlob(['../components/effects/AnimatedGiftEffect.vue'])
const StageLighting     = lazyFromGlob(['../components/effects/StageLighting.vue'])
const FaceFilterLayer   = lazyFromGlob(['../components/effects/FaceFilterLayer.vue'])

const LiveGiftAnimation = lazyFromGlob(['../components/Live/LiveGiftAnimation.vue','../components/live/LiveGiftAnimation.vue','../components/LiveGiftAnimation.vue'])
const GiftFly           = lazyFromGlob(['../components/Live/GiftFly.vue','../components/live/GiftFly.vue','../components/GiftFly.vue'])

/* NEW: Co-Host + Grid + SmartCam */
const CoHostControlSheet = lazyFromGlob([
  '../components/modals/CoHostControlSheet.vue',
  '../components/Live/CoHostControlSheet.vue',
])
const GridPanel = lazyFromGlob([
  '../components/modals/GridPanel.vue',
  '../components/Common/GridPanel.vue',
  '../components/live/GridPanel.vue',
])
const SmartCam = lazyFromGlob([
  '../components/Common/SmartCam.vue',
  '../components/live/SmartCam.vue',
])

/* ---------- Host / Room ---------- */
const hostUsername = 'Host'
const hostAvatar   = '/avatars/default.png'
const isVerified   = true
const topic        = ref('Boosting Business Engagement')

/* ---------- State ---------- */
const viewerCount  = ref(340)
const likeCount    = ref(40)
const chatMessage  = ref('')
const liveMessages = ref([])
const currentGoal  = ref('')
let   selectedFilter = 'none'              // optional face filter
const currentGiftAnimation = ref(null)
const flyingGifts  = ref([])
const floatingLikes= ref([])
const giftEvents   = ref([])               // feed AnimatedGiftEffect
const smartReplies = ['Welcome!','Where are you watching from?','Follow for more!']
const muted        = ref(false)
const camOn        = ref(true)
const micOn        = ref(true)
const online       = ref(navigator.onLine)

/* Effects from panel (persist layers even after close) */
const activeEffects = ref([])              // e.g. ['sparkles','glow',...]

/* Co-host data */
const hosts = ref([
  { id: 1, name: 'Host A', avatar: '/avatars/host1.png', mic: true,  cam: true,  role: 'cohost', speaking: true  },
  { id: 2, name: 'Host B', avatar: '/avatars/host2.png', mic: false, cam: true,  role: 'guest',  speaking: false },
])
const joinRequests = ref([
  { id: 101, name: 'Stella', avatar: '/avatars/user3.png' },
  { id: 102, name: 'Henry',  avatar: '/avatars/user4.png' },
])
const suggestedFriends = ref([
  { id: 201, name: 'Hope🥰',            avatar: '/avatars/friend1.jpg' },
  { id: 202, name: 'Mission-Tridah 🌹', avatar: '/avatars/friend2.jpg' },
  { id: 203, name: 'Son of vission 💄', avatar: '/avatars/friend3.jpg' }
])

/* Ads */
const ads = ref([
  { text: 'Mama D Gift Shop — 20% off on Diamonds today!', url: '#' },
  { text: '🌟 Sponsor your brand here — DM @SmartBiz', url: '#' },
  { text: 'TopFan Challenge: Win VIP Badge this weekend', url: '#' },
  { text: 'Join multi-guest panel at 9 PM!', url: '#' }
])

/* Compact likes */
const compactLikes = computed(() => formatCompact(likeCount.value))

/* Net / effects */
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
const net = ref({ downlink:null, effectiveType:null })
const netOK   = computed(()=> !/2g|slow-2g/.test(net.value.effectiveType || ''))
const effectsOn = computed(()=> !reducedMotion && netOK.value)
const netLabel = computed(()=> net.value.effectiveType ? `${net.value.effectiveType}${net.value.downlink ? ' • '+net.value.downlink+'Mbps':''}` : 'online')
const netClass = computed(()=> netOK.value ? 'text-emerald-300' : 'text-amber-300')

/* Panels (one-at-a-time) */
const showGiftDrawer     = ref(false)
const showSuperChatModal = ref(false)
const showHostsPanel     = ref(false)
const showGuestPanel     = ref(false)
const showEffectsPanel   = ref(false)
const showSettings       = ref(false)
const showWalletTopup    = ref(false)
const showAddGoal        = ref(false)
const showShareSheet     = ref(false)

const anyPanelOpen = computed(() =>
  showGiftDrawer.value || showSuperChatModal.value || showHostsPanel.value || showGuestPanel.value ||
  showEffectsPanel.value || showSettings.value || showWalletTopup.value || showAddGoal.value || showShareSheet.value
)
function closeAllPanels(){
  showGiftDrawer.value = showSuperChatModal.value = showHostsPanel.value = showGuestPanel.value =
  showEffectsPanel.value = showSettings.value = showWalletTopup.value = showAddGoal.value = showShareSheet.value = false
}
function openOnly(refVar){ closeAllPanels(); refVar.value = true }

/* Video */
const videoFeed = ref(null)
const isFull    = ref(false)

/* Layout Vars */
const dockRef = ref(null)
const chatWrap = ref(null)
const dockH = ref(64)
const chatH = ref(56)
const kbInset = ref(0)
const cssVars = computed(() => ({
  '--dock-h': `${dockH.value}px`,
  '--chat-h': `${chatH.value}px`,
  '--kb': `${kbInset.value}px`,
  '--safe-bottom': 'env(safe-area-inset-bottom,0px)'
}))

/* ---------- Utils ---------- */
const toastRef = ref(null)
function onChildError(area){ toastRef.value?.error(`Unexpected error in ${area}.`) }
function setTyping(_v){}
function readNet(){ const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection; if(!c) return; net.value={downlink:c.downlink,effectiveType:c.effectiveType} }
function formatCompact(n){
  const abs = Math.abs(n)
  if (abs < 1_000) return `${n}`
  if (abs < 1_000_000) return `${(n/1_000).toFixed(abs>=10_000?0:1)}k`
  if (abs < 1_000_000_000) return `${(n/1_000_000).toFixed(abs>=10_000_000?0:1)}M`
  return `${(n/1_000_000_000).toFixed(abs>=10_000_000_000?0:1)}B`
}
function openAd(ad){ if(ad?.url && ad.url !== '#') window.open(ad.url, '_blank') }
const shareUrl = computed(() => location.href)
async function measureChat(){ await nextTick(); const el = chatWrap.value; if(el) chatH.value = Math.max(48, Math.min(84, el.offsetHeight || 56)) }

/* Dock height auto-measure */
let dockRO
function measureDock(){
  const el = dockRef.value
  if (!el) return
  const update = () => (dockH.value = Math.max(56, el.offsetHeight || 64))
  dockRO = new ResizeObserver(update); dockRO.observe(el); update()
}

/* visualViewport keyboard inset */
function attachViewportListener(){
  const vv = window.visualViewport
  if (!vv) return
  const update = () => { kbInset.value = Math.max(0, (window.innerHeight - vv.height - vv.offsetTop)) }
  vv.addEventListener('resize', update); vv.addEventListener('scroll', update); update()
  onBeforeUnmount(()=>{ vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update) })
}

/* ---------- Chat ---------- */
function handleSendMessage(payload){
  const text = typeof payload === 'string' ? payload : payload?.text
  if (!text?.trim()) return
  liveMessages.value.push({ id: nanoid(), sender:'You', type:'chat', text })
  chatMessage.value = ''
  measureChat()
}
function handleAttach(files){
  liveMessages.value.push({ id:nanoid(), sender:'You', type:'attach', files: files.map(f=>f.name).join(', ') })
}

/* ---------- Likes ---------- */
let lastTap = 0
function handleTapAnywhere(ev){
  const now = Date.now(), dbl = now - lastTap < 280; lastTap = now
  likeCount.value += dbl ? 2 : 1
  const x = ev?.clientX ?? (window.innerWidth - 40), y = ev?.clientY ?? (window.innerHeight - 120)
  const id = nanoid(); floatingLikes.value.push({ id, x, y })
  try{ navigator.vibrate?.(dbl ? 16 : 8) }catch{}
  setTimeout(()=>{ const i = floatingLikes.value.findIndex(f=>f.id===id); if(i>=0) floatingLikes.value.splice(i,1) }, 1100)
}

/* ---------- Gifts ---------- */
function handleGiftSend(gift){
  liveMessages.value.push({ id:nanoid(), sender:hostUsername, type:'gift', icon:gift.icon, name:gift.name })
  flyingGifts.value.push({ ...gift, id:nanoid() }); setTimeout(()=>flyingGifts.value.shift(), 2600)
  currentGiftAnimation.value = gift; setTimeout(()=> currentGiftAnimation.value = null, 3600)
  giftEvents.value.push({
    id: nanoid(),
    timestamp: Date.now(),
    icon: gift.icon,
    name: gift.name,
    duration: 2800,
    animation: 'shine',
    tier: 'rare',
    confetti: true
  })
}

/* ---------- SuperChat ---------- */
function handleSuperChat({ amount, message }){
  liveMessages.value.push({ id:nanoid(), sender:hostUsername, type:'chat', text:`🌟 SuperChat (${amount}): ${message}` })
}

/* ---------- Panel triggers ---------- */
function openHostsPanel(){ openOnly(showHostsPanel) }
function openGuestsPanel(){ openOnly(showGuestPanel) }
function openGifts(){ try{ openOnly(showGiftDrawer) } catch { showGiftDrawer.value = true } }
function goToRecharge(){ openOnly(showWalletTopup) }
function openShare(){ openOnly(showShareSheet) }
function quickShare(){
  const url = shareUrl.value
  if (navigator.share) navigator.share({ title:'Join my Live', url }).catch(()=>{})
  else navigator.clipboard?.writeText(url).then(()=>toastRef.value?.success('Link copied'))
}
function toggleMute(){ muted.value = !muted.value }
function toggleCam(){ camOn.value = !camOn.value; toastRef.value?.warn(camOn.value ? 'Camera enabled' : 'Camera disabled') }
function toggleMic(){ micOn.value = !micOn.value; toastRef.value?.warn(micOn.value ? 'Mic unmuted' : 'Mic muted') }

/* ---------- PIP / Full ---------- */
async function togglePip(){
  const el = videoFeed.value; if(!el) return toastRef.value?.warn('Video not ready')
  try{
    if(document.pictureInPictureElement) await document.exitPictureInPicture()
    else if(el.requestPictureInPicture) await el.requestPictureInPicture()
    else toastRef.value?.warn('Picture-in-Picture not supported')
  }catch{ toastRef.value?.error('Failed to toggle PIP') }
}
async function toggleFullscreen(){
  try{
    if(!document.fullscreenElement){ await document.documentElement.requestFullscreen(); isFull.value = true }
    else { await document.exitFullscreen(); isFull.value = false }
  }catch{ toastRef.value?.error('Failed to toggle fullscreen') }
}

/* ---------- Bottom Dock actions ---------- */
const bottomActions = [
  { label: '+Hosts',  icon: 'i-tabler-user-plus', onClick: openHostsPanel },
  { label: '+Guests', icon: 'i-tabler-users',     onClick: openGuestsPanel },
  { label: 'Effects', icon: 'i-tabler-sparkles',  onClick: () => openOnly(showEffectsPanel), kind:'indigo' },
  { label: 'Share',   icon: 'i-tabler-share-3',   onClick: openShare, kind:'red' },
  { label: 'Gifts',   icon: 'i-tabler-gift',      onClick: openGifts, kind:'pink' },
  { label: 'More',    icon: 'i-tabler-dots',      onClick: () => openOnly(showSettings) }
]

/* ---------- Co-host Helpers & Handlers ---------- */
function findHostIndex(id){ return hosts.value.findIndex(h => h.id === id) }
function onInvite({ input, provisional }) { if (provisional) joinRequests.value.unshift(provisional); toastRef.value?.success('Invite sent') }
function onApprove(id){
  const req = joinRequests.value.find(r => r.id === id)
  if (!req) return
  hosts.value.push({ ...req, mic: false, cam: false, role: 'guest', speaking: false })
  joinRequests.value = joinRequests.value.filter(r => r.id !== id)
  toastRef.value?.success(`${req.name} added`)
}
function onReject(id){ joinRequests.value = joinRequests.value.filter(r => r.id !== id) }
function onToggleMic({ id, on }){ const i = findHostIndex(id); if (i < 0) return; hosts.value[i].mic = on }
function onToggleCam({ id, on }){ const i = findHostIndex(id); if (i < 0) return; hosts.value[i].cam = on }
function onRemoveHost(id){ hosts.value = hosts.value.filter(h => h.id !== id) }
function onSwapMain(id){ const i = findHostIndex(id); if (i <= 0) return; const [x] = hosts.value.splice(i,1); hosts.value.unshift(x); toastRef.value?.success('Swapped to main') }
function onRoleChange({ id, role }){ const i = findHostIndex(id); if (i < 0) return; hosts.value[i].role = role }
function onQuickMute(){ hosts.value.forEach(h => h.mic = false) }
function onQuickCam(){ hosts.value.forEach(h => h.cam = false) }

/* GridPanel interactions */
function onReorder({ from, to }){ const arr=[...hosts.value]; const [moved]=arr.splice(from,1); arr.splice(to,0,moved); hosts.value=arr }
function onPin({ from }){ if (from === 0) return; const [x] = hosts.value.splice(from,1); hosts.value.unshift(x) }
function onAssign(){ openOnly(showHostsPanel); toastRef.value?.warn('Pick a guest to assign') }
function onExpand(host){ toastRef.value?.success(`Expanding ${host.name}`) }

/* SmartCam */
function onSnapshot(file){ liveMessages.value.push({ id: nanoid(), sender: 'You', type: 'attach', files: file?.name || 'snapshot' }) }

/* ---------- Overlay swipe close (mobile-friendly) ---------- */
const drag = ref({ startY: 0, dy: 0 })
function onOverlayTouchStart(e){ drag.value.startY = e.touches?.[0]?.clientY ?? 0; drag.value.dy = 0 }
function onOverlayTouchMove(e){
  const y = e.touches?.[0]?.clientY ?? 0
  drag.value.dy = y - drag.value.startY
  if (drag.value.dy > 90) closeAllPanels()
}

/* ---------- Lifecycle ---------- */
let viewersTimer, wakeLock = null
async function enableWakeLock(){ try{ wakeLock = await navigator.wakeLock?.request?.('screen') }catch{} }
function releaseWakeLock(){ try{ wakeLock?.release?.(); wakeLock = null }catch{} }
async function tryLockOrientation(){ try{ await screen.orientation?.lock?.('portrait-primary') }catch{} }
function onOnline(){ online.value = true }
function onOffline(){ online.value = false }
function onKeydown(e){ if (e.key === 'Escape' && anyPanelOpen.value) closeAllPanels() }

onMounted(()=>{
  readNet()
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  c?.addEventListener?.('change', readNet)

  viewersTimer = setInterval(()=>{ viewerCount.value += Math.random() < 0.6 ? 1 : 0 }, 3000)
  enableWakeLock(); tryLockOrientation()

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  window.addEventListener('keydown', onKeydown)

  attachViewportListener()
  measureChat(); measureDock()
  window.addEventListener('resize', measureChat)
})
onBeforeUnmount(()=>{
  clearInterval(viewersTimer)
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  c?.removeEventListener?.('change', readNet)
  releaseWakeLock()
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', measureChat)
  dockRO?.disconnect?.()
})

/* ---------- Demo gifts ---------- */
const giftList = [
  { id:'rose',    name:'Rose',    icon:'🌹', price:1  },
  { id:'heart',   name:'Heart',   icon:'💖', price:5  },
  { id:'rocket',  name:'Rocket',  icon:'🚀', price:10 },
  { id:'diamond', name:'Diamond', icon:'💎', price:20 }
]

/* Gift UI resolver with guaranteed fallback */
const GiftUI = computed(() => GiftDrawer || GiftsPanel || MinimalGiftSheet)

/* ---------- Background ---------- */
const bgStyle = computed(() => ({
  background: 'radial-gradient(1200px 600px at 20% -10%, #0b1220 0%, #171a2a 40%, #0b1220 100%)'
}))

/* ===== FX helpers (classes defined in <style>) ===== */
function layerClass(id){
  return {
    sparkles:'sparkle-layer',
    glow:'glow-layer',
    hearts:'heart-layer',
    stars:'star-layer',
    bokeh:'bokeh-layer',
    neon:'neon-layer',
    confetti:'confetti-layer'
  }[id] || ''
}

/* ===== End controls ===== */
function confirmEndStream(){
  if (confirm('End the live?')) {
    toastRef.value?.warn('Live ended')
    // hapa unaweza kuweka cleanup/redirect
  }
}
</script>

<style scoped>
/* ===== Utilities ===== */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.safe-top { padding-top: max(env(safe-area-inset-top), .25rem); }
.safe-bottom { padding-bottom: max(env(safe-area-inset-bottom), .25rem); }

/* Freeze background when panels open (mobile friendly) */
.freeze { overflow: hidden; touch-action: none; }

/* ===== Chips ===== */
.chip { padding:.15rem .45rem; border-radius:9999px; border:1px solid rgba(255,255,255,.14); white-space:nowrap }
.chip-pink   { background:linear-gradient(90deg, rgba(236,72,153,.25), rgba(236,72,153,.15)); color:#fecdd3; }
.chip-stroke { background:rgba(255,255,255,.06); }
.chip-amber  { background:linear-gradient(90deg, rgba(245,158,11,.25), rgba(245,158,11,.15)); color:#fde68a; }
.chip-sky    { background:linear-gradient(90deg, rgba(14,165,233,.25), rgba(14,165,233,.15)); color:#bae6fd; }
.chip-indigo { background:linear-gradient(90deg, rgba(99,102,241,.25), rgba(99,102,241,.15)); color:#c7d2fe; }
.chip-heart  { background:linear-gradient(90deg, rgba(244,63,94,.32), rgba(236,72,153,.18)); color:#fecdd3; }

/* ===== Buttons ===== */
.btn-ghost{
  background: rgba(255,255,255,.10); border:1px solid rgba(255,255,255,.25);
  padding:.25rem .5rem; border-radius:9999px; color:#fff; text-shadow:0 1px 1px rgba(0,0,0,.35);
}
.btn-ghost:focus-visible{ outline:2px solid #fff; outline-offset:2px }
.btn-danger{
  background: linear-gradient(180deg, rgba(239,68,68,.95), rgba(220,38,38,.88));
  border:1px solid rgba(255,255,255,.25);
  padding:.25rem .5rem; border-radius:9999px; color:#fff; text-shadow:0 1px 1px rgba(0,0,0,.35);
}
.btn-like{
  width:44px; height:44px; display:grid; place-items:center; color:#fff;
  background:linear-gradient(180deg,#f472b6,#ec4899);
  border-radius:9999px; border:1px solid rgba(255,255,255,.25);
  box-shadow:0 10px 24px rgba(236,72,153,.35);
}

/* ===== Dock ===== */
.dock{
  height: var(--dock-h);
  display:grid; grid-template-columns:repeat(6, minmax(0,1fr)); gap:.6rem;
  padding:.35rem .9rem calc(.35rem + var(--safe-bottom));
  background: rgba(12,12,20,.55); backdrop-filter: blur(16px);
  border-top: 1px solid rgba(255,255,255,.18);
  position: relative;
}
@media (max-width: 380px){
  .dock{ grid-template-columns: repeat(3, minmax(0,1fr)); row-gap: .5rem; }
}
.dock-btn{
  position:relative;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  height: calc(var(--dock-h) - .7rem); border-radius:16px; font-size:12px;
  border:1px solid rgba(255,255,255,.22); background:rgba(255,255,255,.10); backdrop-filter: blur(14px);
  color:#fff; text-shadow:0 1px 1px rgba(0,0,0,.45);
  box-shadow:0 8px 22px rgba(0,0,0,.40); transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
}
.dock-btn:active{ transform:scale(.96) }
.dock-btn:focus-visible{ outline:2px solid #fff; outline-offset:2px }
.dock-label{ color:#fff }
.dock-pink{   background:linear-gradient(180deg, rgba(236,72,153,.28), rgba(236,72,153,.14)); }
.dock-red{    background:linear-gradient(180deg, rgba(239,68,68,.30), rgba(239,68,68,.16)); }
.dock-indigo{ background:linear-gradient(180deg, rgba(99,102,241,.32), rgba(99,102,241,.18)); }

/* ===== Live dot ===== */
.live-dot{
  position:absolute; right:-2px; top:-2px; width:10px; height:10px;
  background:#ef4444; border:1px solid white; border-radius:9999px; animation:pulse 1.2s infinite;
}
@keyframes pulse { 0%,100%{ transform:scale(1); opacity:1 } 50%{ transform:scale(.6); opacity:.5 } }

/* ===== Floating hearts ===== */
.floating-like{
  position: fixed; font-size: 18px; animation: floatUp 1.1s ease-out forwards; pointer-events: none;
  text-shadow: 0 4px 18px rgba(236,72,153,.45);
}
@keyframes floatUp {
  0%{ transform:translate(-50%,0) scale(1); opacity:1 }
  100%{ transform:translate(-50%,-100px) scale(1.35); opacity:0 }
}

/* ===== Overlay & Panel mount ===== */
.overlay{
  position: fixed; inset: 0; z-index: 75;
  background: rgba(0,0,0,.28);
  display: grid; place-items: end center; /* bottom-sheet feel; child can override */
  pointer-events: auto;
}
.panel-mount{ pointer-events: auto; }

/* ===== Built-in Sheet styles ===== */
.sheet{
  width: min(640px, 96vw);
  background: rgba(20,20,28,.92);
  backdrop-filter: blur(12px);
  border-top-left-radius: 18px; border-top-right-radius: 18px;
  border: 1px solid rgba(255,255,255,.12);
  padding: 12px;
}
.sheet-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.sh-title{ font-weight:800; }
.sh-close{ background:transparent; border:1px solid rgba(255,255,255,.18); border-radius:10px; padding:.25rem .5rem; color:#fff }

.gift-grid{
  display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:10px; padding:8px 2px;
}
@media (max-width: 420px){
  .gift-grid{ grid-template-columns: repeat(3, minmax(0,1fr)); }
}
.gift-card{
  display:grid; place-items:center; gap:2px; padding:10px 6px; border-radius:14px;
  border:1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.08); color:#fff
}
.gift-emoji{ font-size:22px; }
.gift-name{ font-size:12px; opacity:.92 }
.gift-price{ font-size:11px; opacity:.8 }

.sheet-foot{ display:flex; justify-content:flex-end; gap:8px; margin-top:10px; }

.share-body{ display:flex; flex-direction:column; gap:10px; padding:6px 2px; }
.share-input{
  width:100%; border:1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.06);
  border-radius:10px; padding:.55rem .7rem; color:#fff;
}
.share-actions{ display:flex; gap:8px; }
.share-quick{ display:flex; gap:8px; flex-wrap:wrap; }
.share-chip{
  border:1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.08);
  padding:.45rem .7rem; border-radius:999px; color:#fff
}

/* ===== Ticker ===== */
.ticker-wrap{
  position: sticky; top: 48px; z-index: 68; height: 28px; overflow: hidden;
  margin: 0 8px; border-radius: 9999px; border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06); backdrop-filter: blur(10px);
}
.ticker{
  display: inline-flex; align-items: center; height: 28px; white-space: nowrap;
  will-change: transform; animation: tickerMove 28s linear infinite;
}
.ticker-item{ display: inline-flex; align-items: center; padding: 0 16px; font-size: 12px; opacity: .92; cursor: pointer; }
@keyframes tickerMove{ 0%{ transform: translateX(0) } 100%{ transform: translateX(-50%) } }

/* ===== Persistent FX layers (CSS-only, GPU friendly) ===== */
.effect-layer{ position:absolute; inset:0; pointer-events:none; }

.sparkle-layer{
  background-image:
    radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,.8) 50%, transparent 52%),
    radial-gradient(2px 2px at 70% 60%, rgba(255,255,255,.7) 50%, transparent 52%),
    radial-gradient(1.5px 1.5px at 40% 80%, rgba(255,255,255,.6) 50%, transparent 52%);
  background-repeat: no-repeat;
  animation: sparkleMove 2.6s linear infinite;
  opacity:.28; mix-blend-mode: screen;
}
@keyframes sparkleMove{
  0%{ background-position: 0% 0%, 100% 0%, 50% 100% }
  100%{ background-position: 100% 100%, 0% 100%, 60% 0% }
}

.glow-layer{
  background: radial-gradient(60% 45% at 50% 55%, rgba(255,255,255,.14), transparent 60%);
  animation: pulse 2.2s ease-in-out infinite; mix-blend-mode: screen;
}

.heart-layer::before{
  content:'💖'; position:absolute; left:50%; bottom:-24px; transform: translateX(-50%);
  font-size:3.8rem; filter: drop-shadow(0 0 6px rgba(255,255,255,.45));
  animation: floatUp 3.2s ease-in-out infinite;
}

.star-layer{
  background-image:
    radial-gradient(1.2px 1.2px at 30% 20%, rgba(255,255,255,.84) 50%, transparent 52%),
    radial-gradient(1.2px 1.2px at 80% 70%, rgba(255,255,255,.84) 50%, transparent 52%),
    radial-gradient(1px 1px at 60% 40%, rgba(255,255,255,.7) 50%, transparent 52%);
  background-repeat:no-repeat; opacity:.28; mix-blend-mode: screen;
}

.bokeh-layer{
  background:
    radial-gradient(60px 40px at 20% 70%, rgba(255,255,255,.12), transparent 60%),
    radial-gradient(70px 50px at 70% 30%, rgba(255,255,255,.10), transparent 60%);
  animation: bokehFade 6s infinite alternate; mix-blend-mode: lighten;
}

.neon-layer{
  background:
    repeating-linear-gradient(45deg, rgba(0,255,255,.18) 0 10px, rgba(255,0,255,.18) 10px 20px, transparent 20px 30px);
  mix-blend-mode: lighten; animation: glowPulse 3s ease-in-out infinite; opacity:.25;
}

.confetti-layer{
  background:
    radial-gradient(3px 3px at 10% 90%, rgba(244,63,94,.8), transparent 60%),
    radial-gradient(3px 3px at 40% 20%, rgba(34,197,94,.8), transparent 60%),
    radial-gradient(3px 3px at 80% 60%, rgba(59,130,246,.8), transparent 60%);
  animation: confettiDrift 3.2s linear infinite;
  opacity:.32; mix-blend-mode: lighten;
}
@keyframes confettiDrift{ 0%{ transform: translateY(0) } 100%{ transform: translateY(-12px) } }

/* Animations */
@keyframes pulse{ 0%,100%{opacity:.22} 50%{opacity:.44} }
@keyframes glowPulse{ 0%,100%{ filter:brightness(1.08) } 50%{ filter:brightness(1.4) } }
@keyframes floatUp{ 0%{ transform: translate(-50%,0) scale(1); opacity:1 } 100%{ transform: translate(-50%,-100px) scale(1.08); opacity:0 } }
@keyframes bokehFade{ 0%{ opacity:.12 } 100%{ opacity:.42 } }

/* ===== Transitions ===== */
.fade-enter-active, .fade-leave-active { transition: opacity .25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
