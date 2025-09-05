<template>
  <div class="relative inline-block">
    <!-- Trigger -->
    <button
      :aria-label="aria"
      class="share-fab inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-white
                 shadow-lg transition-[transform,box-shadow] duration-200 active:scale-[0.98]
                 select-none relative overflow-hidden"
      @click="onShareTap"
      @pointerdown="addRipple"
    >
      <!-- wings -->
      <span class="pointer-events-none absolute -left-8 top-1/2 -translate-y-1/2 h-10 w-24 rounded-full blur-2xl bg-white/10"></span>
      <span class="pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 h-10 w-24 rounded-full blur-2xl bg-white/10"></span>
      <!-- sheen -->
      <span class="sheen pointer-events-none absolute inset-0"></span>

      <span class="text-lg">🔗</span>
      <span class="font-semibold text-sm">Share</span>

      <span
        v-if="badge && badge>0"
        class="absolute -right-2 -top-2 min-w-[18px] h-[18px] px-1
               rounded-full text-[10px] leading-[18px] text-black
               bg-gradient-to-br from-amber-300 to-yellow-400 font-bold
               border border-black/10 shadow-md"
      >{{ shortBadge }}</span>
    </button>

    <!-- Overlay + Panel -->
    <transition name="sp-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50"
        role="dialog" aria-modal="true" :aria-label="ariaPanel"
        @keydown.esc.prevent="close"
      >
        <div class="absolute inset-0 bg-black/70 md:bg-black/50 backdrop-blur-sm" @click="close" />

        <!-- Bottom sheet (mobile) -->
        <section
          ref="sheet"
          class="fixed md:hidden bottom-0 inset-x-0
                 bg-white text-black rounded-t-3xl shadow-2xl
                 max-h-[88vh] pb-[max(16px,env(safe-area-inset-bottom))]
                 transition-transform duration-200 overflow-hidden"
          @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend.passive="onTouchEnd"
          @click.stop
        >
          <header class="sticky top-0 bg-white/90 backdrop-blur border-b border-black/5">
            <div class="flex items-center justify-between px-4 pt-3 pb-3">
              <div class="absolute left-1/2 -translate-x-1/2 -top-1.5 md:hidden">
                <div class="h-1.5 w-12 rounded-full bg-black/15" />
              </div>
              <h3 class="text-base font-bold">Share this stream</h3>
              <button class="p-2 rounded-full hover:bg-black/5" @click="close" aria-label="Close">✖</button>
            </div>
          </header>

          <main class="px-4 py-4 overflow-y-auto">
            <ShareGrid :link="shareUrl" :title="title" :text="text" @copied="toast('Link copied')" @invite="emit('invite')" />
          </main>
        </section>

        <!-- Popover (desktop) -->
        <div
          class="hidden md:block absolute bottom-full mb-3 right-0 w-80 bg-white rounded-2xl shadow-2xl p-4 z-50 text-sm"
          @click.stop
        >
          <h3 class="font-bold text-gray-800 mb-3">Share this Stream</h3>
          <ShareGrid :link="shareUrl" :title="title" :text="text" layout="desktop" @copied="toast('Link copied')" @invite="emit('invite')" />
        </div>
      </div>
    </transition>

    <!-- Tiny Toast -->
    <transition name="toast">
      <div
        v-if="toastMsg"
        class="fixed left-1/2 -translate-x-1/2 bottom-20 md:bottom-auto md:top-6 z-[60]
               bg-black/80 text-white text-xs px-3 py-2 rounded-full shadow-lg"
      >
        {{ toastMsg }}
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  link?: string
  title?: string
  text?: string
  aria?: string
  badge?: number
}>(), {
  link: typeof window !== 'undefined' ? window.location.href : '',
  title: 'Check out this live stream',
  text: 'Join me live on SmartBiz Assistance!',
  aria: 'Share this stream',
  badge: 0
})

const emit = defineEmits<{ (e:'invite'): void }>()

const shareUrl = computed(() => props.link || (typeof window !== 'undefined' ? window.location.href : ''))
const ariaPanel = computed(() => 'Share panel')
const shortBadge = computed(() => {
  const n = props.badge || 0
  if (n < 1000) return n
  if (n < 10000) return (n/1000).toFixed(1).replace(/\.0$/,'')+'K'
  if (n < 1_000_000) return Math.round(n/1000)+'K'
  return (n/1_000_000).toFixed(1).replace(/\.0$/,'')+'M'
})

const open = ref(false)
const prevOverflow = ref('')

async function onShareTap(){
  // Try native Web Share first (best on mobile)
  if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
    try {
      await navigator.share({ title: props.title, text: props.text, url: shareUrl.value })
      toast('Shared!')
      return
    } catch {
      // user canceled or share not available → fallback to sheet
    }
  }
  open.value = true
  await nextTick()
  document.body.style.overflow = 'hidden'
}

function close(){
  open.value = false
  document.body.style.overflow = prevOverflow.value || ''
}

/* body scroll lock restore */
onMounted(()=> { prevOverflow.value = document.body.style.overflow })
onBeforeUnmount(()=> { document.body.style.overflow = prevOverflow.value || '' })

/* Swipe-down to close (mobile sheet) */
const sheet = ref<HTMLElement|null>(null)
let startY = 0, currentY = 0, dragging = false
function onTouchStart(e: TouchEvent){ startY = e.touches[0].clientY; dragging = true }
function onTouchMove(e: TouchEvent){
  if(!dragging || !sheet.value) return
  currentY = e.touches[0].clientY
  const delta = Math.max(0, currentY - startY)
  sheet.value.style.transform = `translateY(${delta}px)`
}
function onTouchEnd(){
  if(!sheet.value) return
  const delta = Math.max(0, currentY - startY)
  sheet.value.style.transform = ''
  dragging = false
  if(delta > 120) close()
}

/* ripple on FAB */
function addRipple(e: PointerEvent){
  const t = e.currentTarget as HTMLElement
  const span = document.createElement('span')
  const rect = t.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 1.2
  span.className = 'ripple'
  span.style.width = span.style.height = `${size}px`
  span.style.left = `${e.clientX - rect.left - size/2}px`
  span.style.top = `${e.clientY - rect.top - size/2}px`
  t.appendChild(span)
  setTimeout(()=> span.remove(), 600)
}

/* tiny toast */
const toastMsg = ref('')
let toastTimer: number | null = null
function toast(msg: string){
  toastMsg.value = msg
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(()=> toastMsg.value = '', 1400)
}

/* Inline ShareGrid subcomponent */
const ShareGrid = defineComponent({
  name: 'ShareGrid',
  props: {
    link: { type: String, required: true },
    title: { type: String, default: '' },
    text: { type: String, default: '' },
    layout: { type: String, default: 'mobile' } // mobile|desktop
  },
  emits: ['copied', 'invite'],
  setup(p, { emit }) {
    const encoded = computed(()=> encodeURIComponent(p.link))
    const encText = computed(()=> encodeURIComponent(p.text || ''))
    const encTitle = computed(()=> encodeURIComponent(p.title || ''))

    function copy(){
      navigator.clipboard.writeText(p.link).then(()=> emit('copied'))
    }
    function open(url:string){ window.open(url, '_blank') }

    const items = computed(()=> [
      { key: 'copy', label:'Copy', icon:'i-tabler-link', action: copy },
      { key: 'whatsapp', label:'WhatsApp', icon:'i-fa6-brands-whatsapp', color:'text-green-600', action:()=> open(`https://wa.me/?text=${encText.value}%20${encoded.value}`) },
      { key: 'facebook', label:'Facebook', icon:'i-fa6-brands-facebook', color:'text-blue-600', action:()=> open(`https://www.facebook.com/sharer/sharer.php?u=${encoded.value}`) },
      { key: 'messenger', label:'Messenger', icon:'i-fa6-brands-facebook-messenger', color:'text-indigo-600', action:()=> open(`fb-messenger://share/?link=${encoded.value}`) },
      { key: 'x', label:'X', icon:'i-simple-icons-x', color:'text-gray-800', action:()=> open(`https://twitter.com/intent/tweet?text=${encText.value}&url=${encoded.value}`) },
      { key: 'telegram', label:'Telegram', icon:'i-fa6-brands-telegram', color:'text-sky-600', action:()=> open(`https://t.me/share/url?url=${encoded.value}&text=${encText.value}`) },
      { key: 'reddit', label:'Reddit', icon:'i-fa6-brands-reddit', color:'text-orange-600', action:()=> open(`https://www.reddit.com/submit?url=${encoded.value}&title=${encTitle.value}`) },
      { key: 'email', label:'Email', icon:'i-tabler-mail', color:'text-rose-600', action:()=> open(`mailto:?subject=${encTitle.value}&body=${encText.value}%20${encoded.value}`) },
      { key: 'invite', label:'Invite in App', icon:'i-tabler-users', color:'text-indigo-600', action:()=> emit('invite') },
    ])

    return () => (
      <div>
        <div class={['grid gap-3', p.layout === 'desktop' ? 'grid-cols-4' : 'grid-cols-4']}>
          {items.value.map(i => (
            <button
              key={i.key}
              class="flex flex-col items-center justify-center p-2 rounded-xl
                     bg-black/5 hover:bg-black/10 md:bg-white/80 md:hover:bg-white
                     transition"
              onClick={i.action}
              title={i.label}
            >
              <i class={[i.icon, 'text-xl', i.color || '']}></i>
              <span class="text-xs mt-1 text-gray-700">{i.label}</span>
            </button>
          ))}
        </div>
        <div class="mt-4">
          <input
            readonly
            :value="p.link"
            class="w-full text-xs px-3 py-2 rounded-xl bg-black/5 md:bg-white/80 border border-black/10 text-gray-700"
            @focus="(e:any)=> e.target.select()"
          />
        </div>
      </div>
    )
  }
})
</script>

<style scoped>
/* FAB gradient glass + wings */
.share-fab{
  background: linear-gradient(100deg, rgba(236,72,153,.95), rgba(99,102,241,.95));
  border: 1px solid rgba(255,255,255,.12);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.08),
    0 10px 18px rgba(0,0,0,.25),
    0 6px 14px rgba(99,102,241,.28);
  backdrop-filter: blur(10px);
}
.share-fab:hover{
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.10),
    0 12px 22px rgba(0,0,0,.30),
    0 8px 16px rgba(236,72,153,.30);
}
/* sheen */
.sheen::before{
  content:'';
  position:absolute; inset:0;
  background-image: linear-gradient(115deg,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,.18) 35%,
    rgba(255,255,255,0) 70%);
  transform: translateX(-120%);
  animation: sheenMove 2.6s linear infinite;
}
@keyframes sheenMove{
  0%{ transform: translateX(-120%); }
  60%{ transform: translateX(120%); }
  100%{ transform: translateX(120%); }
}

/* ripple */
.ripple{
  position:absolute; border-radius:9999px; pointer-events:none;
  background: rgba(255,255,255,.25); transform: scale(0);
  animation: ripple .6s ease-out forwards;
}
@keyframes ripple { to { transform: scale(1); opacity: 0; } }

/* transitions */
.sp-fade-enter-active,.sp-fade-leave-active{ transition: opacity .18s ease; }
.sp-fade-enter-from,.sp-fade-leave-to{ opacity: 0; }

.toast-enter-active,.toast-leave-active{ transition: opacity .15s ease, transform .15s ease }
.toast-enter-from,.toast-leave-to{ opacity:0; transform: translateY(6px) }
</style>
