<!-- src/components/SacredMessageFeed.vue -->
<template>
  <!-- Fixed, bottom-left (mobile-first) -->
  <div
    class="sacred-feed fixed z-40 pointer-events-none"
    :class="placementClass"
    :style="placementStyle"
    role="log"
    aria-live="polite"
    aria-relevant="additions text"
  >
    <!-- optional particles -->
    <div v-if="spiritualMode && !reducedMotion" class="absolute inset-0 -z-10 overflow-hidden">
      <span v-for="n in 12" :key="n" class="star"></span>
    </div>

    <!-- newest at the BOTTOM, old slide up and vanish -->
    <transition-group name="msg-fade" tag="div" class="feed-col">
      <div
        v-for="(msg, i) in visibleMessages"
        :key="`${msg.id}-${msg.timestamp || i}`"
        class="msg shell pointer-events-auto"
        :class="msgClass(msg)"
        @click="handleTap(msg)"
      >
        <!-- avatar + name -->
        <div class="sender">
          <img v-if="msg.avatar" :src="msg.avatar" alt="" class="avatar" />
          <div v-else class="avatar fallback">{{ initials(msg.sender) }}</div>
          <span class="name" :title="msg.sender">{{ msg.sender }}:</span>
        </div>

        <!-- types -->
        <template v-if="msg.type === 'chat'">
          <span class="body">{{ truncate(msg.text, 160) }}</span>
          <span v-if="spiritualMode" class="aura"></span>
        </template>

        <template v-else-if="msg.type === 'gift'">
          <span class="gift-emoji">🎁</span>
          <span class="gift-text">sent <span class="gift-name">{{ msg.name }}</span></span>
          <span v-if="spiritualMode" class="aura gold"></span>
        </template>

        <template v-else-if="msg.type === 'blessing'">
          <span class="bless-emoji">🕊️</span>
          <span class="body italic">{{ truncate(msg.text || 'Blessings upon this live!', 200) }}</span>
          <span v-if="msg.ref" class="ref">— {{ msg.ref }}</span>
          <span v-if="spiritualMode" class="aura holy"></span>
        </template>

        <template v-else>
          <span class="system-dot"></span>
          <span class="body">{{ truncate(msg.text || 'Update', 180) }}</span>
        </template>
      </div>
    </transition-group>

    <p class="sr-only">{{ srText }}</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/**
 * messages: [{ id, sender, text?, type: 'chat'|'gift'|'blessing'|'system', avatar?, name?, timestamp? }]
 */
const props = defineProps({
  messages: { type: Array, required: true },
  maxVisible: { type: Number, default: 8 },          // on-screen bubbles
  maxHeightPct: { type: Number, default: 0.33 },     // of viewport height (mobile-first)
  maxAgeMs: { type: Number, default: 5 * 60 * 1000 },// auto-prune chat/blessing
  giftTtlMs: { type: Number, default: 10 * 1000 },   // auto-remove gifts
  bottomOffset: { type: Number, default: 8 },        // extra px (besides CSS vars)
  leftOffset: { type: Number, default: 12 },
  spiritualMode: { type: Boolean, default: true },
  placement: { type: String, default: 'bottom-left' } // 'bottom-left' | 'bottom-center'
})

/* state */
const displayed = ref([])
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
let cleanupTimer = null

/* placement + sizing (respects LiveRoom CSS vars) */
const maxH = ref(220)
function recalcMaxH(){ maxH.value = Math.max(140, Math.round(window.innerHeight * props.maxHeightPct)) }

const placementClass = computed(() =>
  props.placement === 'bottom-center' ? 'inset-x-0 flex justify-center' : 'left-4'
)
const placementStyle = computed(() => {
  const bottomCalc =
    `calc(var(--dock-h,0px) + var(--chat-h,0px) + 16px + var(--kb,0px) + env(safe-area-inset-bottom,0px) + ${props.bottomOffset}px)`
  return {
    bottom: bottomCalc,
    left: props.placement === 'bottom-center' ? undefined : `${props.leftOffset}px`,
    maxWidth: '92vw',
    maxHeight: `${maxH.value}px`
  }
})

/* feed: keep only newest on-screen; newest rendered at bottom */
const visibleMessages = computed(() => displayed.value.slice(-props.maxVisible))

/* add with de-dup + TTL for gifts; cap memory with small buffer */
function addMessage(msg) {
  if (!msg || !msg.id) return
  const ts = msg.timestamp || Date.now()
  if (displayed.value.some(m => m.id === msg.id && (m.timestamp || 0) === (msg.timestamp || 0))) return

  displayed.value.push({ ...msg, timestamp: ts })

  // gift TTL
  if (msg.type === 'gift') {
    setTimeout(() => {
      displayed.value = displayed.value.filter(m => !(m.id === msg.id && m.timestamp === ts))
    }, props.giftTtlMs)
  }

  // soft cap (keep last N + buffer)
  const cap = props.maxVisible + 10
  if (displayed.value.length > cap) {
    displayed.value = displayed.value.slice(-cap)
  }
}

/* prune old (non-gift) */
function cleanOld() {
  const now = Date.now()
  displayed.value = displayed.value.filter(m => m.type === 'gift' || (now - (m.timestamp || 0) < props.maxAgeMs))
}

/* watch incoming */
watch(() => props.messages, (list) => { list.forEach(addMessage) }, { immediate: true, deep: true })

/* lifecycle */
onMounted(() => {
  recalcMaxH()
  window.addEventListener('resize', recalcMaxH, { passive: true })
  cleanupTimer = setInterval(cleanOld, 60 * 1000)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', recalcMaxH)
  if (cleanupTimer) clearInterval(cleanupTimer)
})

/* a11y + helpers */
const srText = computed(() => `${displayed.value.length} messages on screen`)
function initials(name=''){ return (name.trim().split(/\s+/).map(p=>p[0]).join('').slice(0,2) || 'U').toUpperCase() }
function truncate(t='', n=160){ return t.length > n ? t.slice(0, n - 1) + '…' : t }
function handleTap(_msg){ try{ navigator.vibrate?.(6) }catch{} }
function msgClass(msg){
  switch (msg.type) { case 'gift': return 'gift'; case 'blessing': return 'blessing'; case 'system': return 'system'; default: return 'chat' }
}
</script>

<style scoped>
/* container: stays in one pocket, never climbs; no scrollbars on overlay */
.sacred-feed{
  width: min(92vw, 24rem);
  display: flex; flex-direction: column-reverse;
  overflow: hidden;          /* old messages vanish outside view */
  pointer-events: none;
}

/* column with newest at the bottom */
.feed-col{
  display: flex; flex-direction: column-reverse;
  gap: 6px; padding-right: 2px;
}

/* bubble */
.msg.shell{
  display: flex; align-items: center; gap: .5rem;
  padding: .5rem .875rem;
  border-radius: 1rem; color:#fff;
  border: 1px solid rgba(255,255,255,.09);
  backdrop-filter: blur(12px);
  background: rgba(255,255,255,.06);
  box-shadow: 0 3px 10px rgba(0,0,0,.25);
  max-width: 92vw;
}

/* types */
.gift{
  background: linear-gradient(90deg, rgba(32,116,210,.20), rgba(255,215,64,.25));
  box-shadow: 0 0 10px rgba(255,215,64,.2), 0 0 16px rgba(32,116,210,.18);
}
.blessing{
  background: linear-gradient(90deg, rgba(76,29,149,.24), rgba(236,72,153,.22), rgba(34,197,94,.22));
  box-shadow: 0 0 14px rgba(99,102,241,.28), 0 0 18px rgba(236,72,153,.24);
}
.system{ background: rgba(255,255,255,.08); border-style: dashed }

/* sender */
.sender{ display:flex; align-items:center; gap:.4rem; min-width:0 }
.avatar{ width:20px; height:20px; border-radius:9999px; object-fit:cover; border:1px solid rgba(255,255,255,.6); }
.avatar.fallback{ width:20px; height:20px; display:grid; place-items:center; border-radius:9999px; background: rgba(255,255,255,.12); font-size:.65rem; font-weight:700; }
.name{ font-weight:600; opacity:.9; max-width:30%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }

/* content */
.body{ font-size:.9rem; opacity:.97; max-width:60%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.gift-emoji{ margin-right:4px }
.gift-text{ font-weight:700; color:#ffe27a }
.gift-name{ color:#a3d8ff }
.bless-emoji{ margin-right:4px; font-size:1rem }
.ref{ margin-left:.35rem; font-size:.75rem; opacity:.9 }

/* aura */
.aura{ position:absolute; inset:-2px; border-radius:1rem; z-index:-1;
  background: radial-gradient(60% 60% at 50% 50%, rgba(255,255,255,.22), transparent 60%);
  filter: blur(8px); pointer-events:none;
}
.aura.gold{ background: radial-gradient(60% 60% at 50% 50%, rgba(255,223,120,.35), transparent 62%) }
.aura.holy{ background: radial-gradient(60% 60% at 50% 50%, rgba(168,255,214,.32), transparent 62%) }

/* stars */
.star{ position:absolute; width:2px; height:2px; background:#fff; border-radius:9999px; opacity:.8; animation: starFloat 8s linear infinite }
.star:nth-child(3n){ width:3px; height:3px; opacity:.6 }
.star:nth-child(4n){ opacity:.45 }
.star:nth-child(odd){ animation-duration:11s }
/* rough positions */
.star:nth-child(1){ left:6%; top:8% } .star:nth-child(2){ left:18%; top:22% } .star:nth-child(3){ left:30%; top:14% }
.star:nth-child(4){ left:44%; top:30% } .star:nth-child(5){ left:56%; top:10% } .star:nth-child(6){ left:68%; top:26% }
.star:nth-child(7){ left:12%; top:36% } .star:nth-child(8){ left:24%; top:42% } .star:nth-child(9){ left:48%; top:38% }
.star:nth-child(10){ left:72%; top:34% } .star:nth-child(11){ left:84%; top:18% } .star:nth-child(12){ left:90%; top:44% }

/* transitions */
.msg-fade-enter-active, .msg-fade-leave-active{ transition: opacity .24s ease, transform .24s ease }
.msg-fade-enter-from{ opacity:0; transform: translateY(8px) scale(.98) }
.msg-fade-leave-to{ opacity:0; transform: translateY(-8px) scale(.98) }

/* reduced motion */
@media (prefers-reduced-motion: reduce){
  .star{ animation:none !important }
}
</style>
