<template>
  <!-- FAB (mobile) -->
  <button
    class="md:hidden fixed top-3 right-3 z-40 h-10 px-3 rounded-xl bg-white/20 text-white backdrop-blur
           shadow border border-white/20 active:translate-y-[1px] flex items-center gap-2"
    :style="safeAreaTop"
    @click="open = !open"
    :aria-expanded="open ? 'true' : 'false'"
    aria-controls="share-panel"
    title="Share"
  >
    <span>📤</span>
    <span class="text-sm font-semibold">Share</span>
  </button>

  <!-- Overlay (mobile) -->
  <transition name="fade">
    <div
      v-if="open"
      class="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
      @click="close"
    />
  </transition>

  <!-- Panel -->
  <transition name="fade">
    <aside
      v-if="open"
      id="share-panel"
      class="fixed md:absolute top-14 md:top-4 right-3 md:right-4 z-40
             w-[92vw] max-w-sm md:w-72 rounded-2xl bg-white/20 text-white backdrop-blur-md
             border border-white/25 shadow-xl p-4"
      role="dialog"
      aria-label="Share Live"
      :style="safeAreaTop"
    >
      <header class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-extrabold tracking-wide">📤 Share Live</h3>
        <button class="h-8 w-8 grid place-items-center rounded-lg bg-white/10" @click="close" aria-label="Close">✖</button>
      </header>

      <!-- Primary (Web Share) -->
      <button
        v-if="canWebShare"
        @click="shareSystem"
        class="btn-primary w-full mb-3"
        :disabled="pending"
      >
        {{ pending ? 'Opening…' : 'Share via System' }}
      </button>

      <!-- Fallback platforms (order honors last used) -->
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="ch in orderedChannels"
          :key="ch"
          class="btn-secondary text-xs"
          @click="shareTo(ch)"
        >
          {{ labelFor(ch) }}
        </button>
      </div>

      <!-- Copy + QR -->
      <div class="mt-3 grid grid-cols-1 gap-2">
        <button class="btn-soft w-full text-xs" @click="copyLink">Copy Invite Link</button>
        <button class="btn-soft w-full text-xs" @click="toggleQR">Show QR</button>
      </div>

      <!-- QR (lazy import) -->
      <transition name="fade">
        <div v-if="showQR" class="mt-3 rounded-xl bg-black/30 p-3 grid place-items-center">
          <component
            v-if="QRCodeVue"
            :is="QRCodeVue"
            :value="shareUrl"
            :size="160"
            class="bg-white p-2 rounded"
          />
          <p v-else class="text-xs opacity-80">Loading QR…</p>
        </div>
      </transition>

      <footer class="mt-3 text-[11px] text-white/80 flex items-center justify-between">
        <span>Link includes <span class="font-mono">utm</span> & <span class="font-mono">ref</span>.</span>
        <span v-if="shareCount" class="opacity-80">Shared: {{ shareCount }}</span>
      </footer>
    </aside>
  </transition>

  <!-- Toast -->
  <transition name="fade">
    <div
      v-if="toast"
      class="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 bg-black/80 text-white text-xs px-3 py-2 rounded-xl shadow"
      :style="safeAreaBottom"
      aria-live="polite"
    >
      {{ toast }}
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/** Props */
const props = defineProps({
  title:        { type: String, default: 'Join this live' },
  liveId:       { type: [String, Number], default: null },
  refCode:      { type: String, default: '' }, // e.g. user referral
  utm:          { type: Object, default: () => ({ source: 'share', medium: 'live', campaign: 'live_invite' }) },
  channels:     { type: Array,  default: () => (['whatsapp','telegram','x','facebook']) },
  defaultOpen:  { type: Boolean, default: false },
  autoCloseOnShare: { type: Boolean, default: true },
  baseUrl:      { type: String, default: '' }  // fallback for SSR
})

/** State */
const open = ref(props.defaultOpen)
const pending = ref(false)
const toast = ref('')
const showQR = ref(false)
const QRCodeVue = ref(null)
const shareCount = ref(0)

/** Safe-area (iOS notches) */
const safeAreaTop = { paddingTop: 'env(safe-area-inset-top, 0px)' }
const safeAreaBottom = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }

/** Env & helpers */
const isBrowser = typeof window !== 'undefined'
const isIOS = isBrowser && /iP(hone|ad|od)/.test(navigator.userAgent)
const isAndroid = isBrowser && /Android/.test(navigator.userAgent)

/** Build share URL with UTM/ref (SSR-safe) */
const shareUrl = computed(() => {
  const base = isBrowser ? window.location.href : (props.baseUrl || 'https://example.com/live')
  const u = new URL(base)
  if (props.liveId) u.searchParams.set('live', String(props.liveId))
  if (props.refCode) u.searchParams.set('ref', props.refCode)
  const { source, medium, campaign, term, content } = props.utm || {}
  if (source)   u.searchParams.set('utm_source', source)
  if (medium)   u.searchParams.set('utm_medium', medium)
  if (campaign) u.searchParams.set('utm_campaign', campaign)
  if (term)     u.searchParams.set('utm_term', term)
  if (content)  u.searchParams.set('utm_content', content)
  return u.toString()
})

/** Web Share */
const canWebShare = isBrowser && !!navigator.share

async function shareSystem(){
  if (!canWebShare) return shareTo('whatsapp')
  try {
    pending.value = true
    await navigator.share({ title: document.title || 'Live', text: props.title, url: shareUrl.value })
    afterShare('system')
  } catch (e) {
    // user cancelled → silent
  } finally {
    pending.value = false
  }
}

/** Channel order (persist last used) */
const LAST_KEY = 'sb_last_share_channel'
const last = isBrowser ? localStorage.getItem(LAST_KEY) : null
const orderedChannels = computed(() => {
  if (!last || !props.channels.includes(last)) return props.channels
  return [last, ...props.channels.filter(c => c !== last)]
})

function labelFor(ch){
  return ({
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    x: 'X (Twitter)',
    facebook: 'Facebook'
  })[ch] || ch
}

/** Deep links + fallbacks */
function shareTo(channel){
  const url = encodeURIComponent(shareUrl.value)
  const text = encodeURIComponent(props.title)
  let link = ''
  // Prefer app scheme on mobile where safe, else web.
  if (channel === 'whatsapp'){
    link = (isIOS || isAndroid)
      ? `whatsapp://send?text=${encodeURIComponent(`${props.title} — ${shareUrl.value}`)}`
      : `https://wa.me/?text=${encodeURIComponent(`${props.title} — ${shareUrl.value}`)}`
  } else if (channel === 'telegram'){
    link = `https://t.me/share/url?url=${url}&text=${text}`
  } else if (channel === 'x'){
    // x.com fallback still accepts /intent/tweet
    link = `https://x.com/intent/tweet?text=${text}&url=${url}`
  } else if (channel === 'facebook'){
    link = `https://www.facebook.com/sharer/sharer.php?u=${url}`
  } else {
    link = shareUrl.value
  }
  window.open(link, '_blank', 'noopener,noreferrer')
  if (isBrowser) localStorage.setItem(LAST_KEY, channel)
  afterShare(channel)
}

/** Common post-share actions */
function afterShare(channel){
  try { navigator.vibrate?.(8) } catch {}
  shareCount.value++
  emit('share', { channel, url: shareUrl.value })
  if (props.autoCloseOnShare) close()
}

/** Copy (with legacy fallback for http/old iOS) */
async function copyLink(){
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareUrl.value)
    } else {
      legacyCopy(shareUrl.value)
    }
    toastOk('✅ Link copied')
    afterShare('copy')
  } catch {
    toastFail('Copy failed')
  }
}
function legacyCopy(text){
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly','')
  ta.style.position = 'absolute'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

/** QR */
async function toggleQR(){
  try {
    if (!QRCodeVue.value) QRCodeVue.value = (await import('qrcode.vue')).default
    showQR.value = !showQR.value
  } catch {
    toastFail('QR module not available')
  }
}

/** Open/close + ESC */
function close(){ open.value = false }
function onKey(e){ if (e.key === 'Escape') close() }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

/** Toasts */
function toastOk(m){ toast.value = m; setTimeout(()=>toast.value='', 1600) }
function toastFail(m){ toast.value = m; setTimeout(()=>toast.value='', 1800) }

/** Emits */
const emit = defineEmits(['share'])
</script>

<style scoped>
.btn-primary { @apply h-10 px-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 active:translate-y-[1px]; }
.btn-secondary { @apply h-9 px-3 rounded-xl bg-white/15 text-white font-semibold hover:bg-white/25 active:translate-y-[1px]; }
.btn-soft { @apply h-9 px-3 rounded-xl bg-white/10 text-white hover:bg-white/15 active:translate-y-[1px]; }
.fade-enter-active,.fade-leave-active { transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to { opacity: 0 }
</style>
