<template>
  <div
    class="min-h-screen w-full bg-white text-slate-900 dark:bg-[#0b0f1a] dark:text-white
           pb-[calc(16px+env(safe-area-inset-bottom,0px))]"
    role="main"
    aria-label="Help Center"
  >
    <!-- Top hero -->
    <header
      class="relative px-5 pt-10 pb-6 text-center overflow-hidden"
    >
      <!-- soft gradient aura -->
      <div class="pointer-events-none absolute inset-0 -z-10">
        <div class="absolute -top-24 left-1/2 -translate-x-1/2 w-[120vw] h-72 rounded-full
                    bg-gradient-to-b from-amber-300/20 via-indigo-300/15 to-transparent blur-3xl" />
      </div>

      <h1 class="text-2xl font-extrabold tracking-tight">
        HelpCenter
      </h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-300">
        Find answers, learn features, or contact us—fast.
      </p>

      <!-- Online / Offline badge -->
      <div class="mt-3 inline-flex items-center gap-2 text-xs rounded-full px-3 py-1
                  bg-black/5 dark:bg-white/10 backdrop-blur border border-black/10 dark:border-white/10">
        <span
          class="inline-block h-2 w-2 rounded-full"
          :class="online ? 'bg-emerald-500' : 'bg-red-500'"
          aria-hidden="true"
        />
        <span>{{ online ? 'Support status: Online' : 'You are offline — some actions disabled' }}</span>
      </div>
    </header>

    <!-- Search -->
    <section class="px-5">
      <div class="relative">
        <input
          v-model.trim="query"
          :placeholder="placeholderText"
          type="search"
          inputmode="search"
          class="w-full h-12 rounded-2xl px-11 text-sm outline-none
                 bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10
                 focus:border-indigo-400 dark:focus:border-indigo-400"
          aria-label="Search help"
          @focus="onFocus"
        />
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔎</span>
        <button
          v-if="query"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-full
                 bg-black/10 dark:bg-white/10"
          @click="clearQuery"
        >Clear</button>
      </div>

      <!-- Quick chips -->
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          v-for="chip in chips"
          :key="chip"
          class="h-8 px-3 rounded-full text-xs font-medium bg-black/5 dark:bg-white/10
                 border border-black/10 dark:border-white/10 active:bg-black/10 dark:active:bg-white/20"
          @click="applyChip(chip)"
        >
          {{ chip }}
        </button>
      </div>
    </section>

    <!-- Quick categories -->
    <section class="px-5 mt-5">
      <h2 class="text-sm font-semibold mb-2">Browse topics</h2>
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="cat in categories"
          :key="cat.key"
          class="group rounded-2xl p-4 text-left bg-white dark:bg-white/5 border
                 border-black/5 dark:border-white/10 shadow-sm active:scale-[.99] transition"
          @click="openCategory(cat.key)"
        >
          <div class="text-2xl mb-1">{{ cat.icon }}</div>
          <div class="text-sm font-semibold">{{ cat.title }}</div>
          <div class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
            {{ cat.desc }}
          </div>
          <div class="mt-2 text-[10px] text-indigo-600 dark:text-indigo-300 opacity-0 group-active:opacity-100">
            Open →
          </div>
        </button>
      </div>
    </section>

    <!-- Results / FAQs -->
    <section class="px-5 mt-6">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-sm font-semibold">FAQs</h2>
        <span class="text-[11px] text-slate-500 dark:text-slate-400">{{ filteredFaqs.length }} results</span>
      </div>

      <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="animate-pulse h-14 rounded-xl bg-black/5 dark:bg-white/10" />
      </div>

      <div v-else-if="!filteredFaqs.length" class="text-xs text-slate-500 dark:text-slate-400 italic">
        No results. Try a different keyword or contact us below.
      </div>

      <ul v-else class="space-y-2">
        <li
          v-for="item in filteredFaqs"
          :key="item.id"
          class="rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden"
        >
          <button
            class="w-full px-4 py-3 text-left flex items-start justify-between gap-3"
            @click="toggle(item.id)"
            :aria-expanded="openIds.has(item.id)"
          >
            <div class="text-sm font-medium">
              <span v-html="highlight(item.q)"></span>
            </div>
            <span class="text-slate-500 dark:text-slate-400">{{ openIds.has(item.id) ? '–' : '+' }}</span>
          </button>

          <transition name="acc">
            <div v-show="openIds.has(item.id)" class="px-4 pb-4 text-[13px] text-slate-700 dark:text-slate-300">
              <div v-html="item.a"></div>

              <!-- Was this helpful? -->
              <div class="mt-3 flex items-center gap-2 text-[11px]">
                <span>Helpful?</span>
                <button class="tag" @click="feedback(item.id, true)">👍 Yes</button>
                <button class="tag" @click="feedback(item.id, false)">👎 No</button>
                <span v-if="fbThanks.has(item.id)" class="text-emerald-500">Thanks!</span>
              </div>
            </div>
          </transition>
        </li>
      </ul>
    </section>

    <!-- Still need help -->
    <section class="px-5 mt-8">
      <h2 class="text-sm font-semibold mb-2">Still need help?</h2>
      <div class="grid grid-cols-2 gap-3">
        <button
          class="cta"
          :disabled="!online"
          @click="emit('chat')"
          title="Live chat"
        >💬 Chat Now</button>

        <button class="cta" @click="emit('whatsapp')">🟢 WhatsApp</button>
        <a class="cta" :href="mailtoHref">✉️ Email</a>
        <a class="cta" :href="telHref">📞 Call</a>

        <button class="cta col-span-2" @click="emit('ticket')">🧾 Submit Ticket</button>
      </div>

      <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
        Response times vary with volume. For urgent issues, use Chat or WhatsApp.
      </p>
    </section>

    <!-- Bottom spacer -->
    <div class="h-8" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/** Emits so unaweza kuunganisha na backend au routers */
const emit = defineEmits(['chat','whatsapp','ticket','open-category'])

/** Props za optional customization (zote zina default nzuri) */
const props = defineProps({
  email: { type: String, default: 'support@smartbiz.site' },
  phone: { type: String, default: '+255700000000' },
  initialQuery: { type: String, default: '' },
})

/* --------------------------------------------------------
   State
-------------------------------------------------------- */
const online = ref(navigator.onLine)
const query = ref(props.initialQuery)
const loading = ref(false)
const openIds = ref(new Set())
const fbThanks = ref(new Set())

/* Chips za haraka (zitaweka neno kwenye search) */
const chips = ['Recharge / Coins', 'Withdraw', 'Go LIVE', 'Video Gifts', 'AI Host', 'Orders']

/* Kategoria (grid) */
const categories = [
  { key: 'account',  title: 'Account',       icon: '👤', desc: 'Sign in, profile, security & privacy.' },
  { key: 'payments', title: 'Payments',      icon: '💳', desc: 'Recharge, withdraw, receipts, refunds.' },
  { key: 'live',     title: 'Live Streaming',icon: '🎥', desc: 'Go LIVE, guests, gifts, superchat.' },
  { key: 'ai',       title: 'AI Assistant',  icon: '🤖', desc: 'Smart prompts, summaries, auto host.' },
]

/* FAQ (unaweza kubadilisha / kuchota kutoka API) */
const faqs = ref([
  { id: 1, q: 'How do I recharge SmartCoins?', a: 'Open <b>Wallet → Recharge</b>, choose amount, then complete via M-Pesa/TigoPesa/AirtelMoney. Your balance updates instantly.' },
  { id: 2, q: 'Why can’t I go LIVE?', a: 'Ensure camera/mic permissions are granted, network is stable, and your account is verified. Try <b>More → Diagnostics</b> to test devices.' },
  { id: 3, q: 'How to invite a guest to my stream?', a: 'Tap <b>+Guests</b>, approve requests from the panel, or send invites via link. Use <b>Grid</b> to position guests.' },
  { id: 4, q: 'Where can I see my orders & receipts?', a: 'Go to <b>My Orders</b> in Dashboard. You can filter by date/status and download PDF receipts.' },
  { id: 5, q: 'AI Host speaks too fast—how to adjust?', a: 'Open <b>AI Host → Voice</b> and reduce <b>Rate</b> to 0.8–0.9. You can also choose a calmer style preset.' },
])

/* --------------------------------------------------------
   Derived
-------------------------------------------------------- */
const placeholderText = computed(() =>
  'Search: recharge, withdraw, go live…'
)

const filteredFaqs = computed(() => {
  if (!query.value) return faqs.value
  const q = norm(query.value)
  return faqs.value.filter(f =>
    norm(f.q).includes(q) || norm(stripHtml(f.a)).includes(q)
  )
})

/* --------------------------------------------------------
   Methods
-------------------------------------------------------- */
function onFocus(){ /* future: analytics ping */ }
function clearQuery(){ query.value = '' }
function applyChip(t){ query.value = t; haptic(8) }
function openCategory(key){ emit('open-category', key); haptic(8) }

function toggle(id){
  const s = new Set(openIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  openIds.value = s
  haptic(6)
}

function feedback(id, good){
  // future: send to API
  const s = new Set(fbThanks.value); s.add(id); fbThanks.value = s
  haptic(good ? 12 : 6)
}

/* Helpers */
function norm(s){ return (s||'').toString().toLowerCase().trim() }
function stripHtml(s){ return s.replace(/<[^>]+>/g,'') }
function haptic(ms=12){ try { navigator.vibrate?.(ms) } catch(_){} }

/* Contact links */
const mailtoHref = computed(() => `mailto:${props.email}?subject=SmartBiz%20Support`)
const telHref    = computed(() => `tel:${props.phone.replace(/\s+/g,'')}`)

/* Online status listeners */
function onNet(){ online.value = navigator.onLine }
onMounted(() => {
  // fake delay to show skeleton the first time
  loading.value = true
  setTimeout(() => (loading.value = false), 420)

  window.addEventListener('online', onNet)
  window.addEventListener('offline', onNet)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', onNet)
  window.removeEventListener('offline', onNet)
})

/* Highlight search matches in questions */
function highlight(text){
  if (!query.value) return escapeHtml(text)
  const q = escapeRegExp(query.value)
  return escapeHtml(text).replace(new RegExp(q, 'ig'), (m) => `<mark class="hl">${m}</mark>`)
}
function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
function escapeHtml(s){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) }
</script>

<style scoped>
/* Accordion transition */
.acc-enter-active, .acc-leave-active { transition: max-height .2s ease, opacity .2s ease; }
.acc-enter-from, .acc-leave-to { max-height: 0; opacity: 0; }

/* Highlight mark */
.hl {
  background: linear-gradient(90deg, rgba(250,204,21,.35), rgba(167,139,250,.35));
  padding: 0 .15em; border-radius: .25em;
}

/* Reusable CTA button */
.cta {
  display: inline-flex; align-items: center; justify-content: center;
  height: 44px; border-radius: 14px; font-weight: 700; font-size: 13px;
  background: linear-gradient(to bottom, rgba(241,245,249,.6), rgba(226,232,240,.6));
  border: 1px solid rgba(15,23,42,.06);
}
.dark .cta {
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
}
.cta:active { transform: translateY(1px); }

/* Nice text clamping for category desc */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}
</style>
