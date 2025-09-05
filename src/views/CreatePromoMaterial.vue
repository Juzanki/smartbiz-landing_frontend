<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
    <!-- App Bar -->
    <header class="sticky top-0 z-20 backdrop-blur bg-slate-900/70 border-b border-white/10">
      <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <h1 class="text-base sm:text-lg font-semibold">🎯 Create Promo Material</h1>
        <div class="hidden sm:flex items-center gap-2">
          <span class="px-2.5 py-1 rounded-full text-xs bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
            Mobile First
          </span>
          <span class="px-2.5 py-1 rounded-full text-xs bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/30">
            Community Reach
          </span>
        </div>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 py-4 space-y-4">
      <!-- Campaign Picker -->
      <section class="rounded-2xl p-4 sm:p-6 bg-white/5 ring-1 ring-white/10">
        <h2 class="text-sm font-semibold text-white/80 mb-3">Choose Campaign</h2>

        <div class="grid gap-3">
          <!-- Search -->
          <div class="relative">
            <input
              v-model.trim="search"
              type="search"
              inputmode="search"
              placeholder="Search campaigns…"
              class="w-full bg-white/5 ring-1 ring-white/15 focus:ring-white/30 outline-none rounded-xl px-9 py-2 text-sm placeholder:text-white/40"
              aria-label="Search campaigns"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">🔎</span>
            <button v-if="search" @click="search=''" class="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">✕</button>
          </div>

          <!-- Selector -->
          <div class="relative">
            <select
              v-model="selectedCampaignId"
              class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm"
              aria-label="Campaign selector"
            >
              <option value="" disabled>Select a campaign</option>
              <option v-for="c in filteredCampaigns" :key="c.id" :value="c.id">
                {{ c.title }} — {{ c.product?.name || 'Product' }}
              </option>
            </select>
          </div>

          <!-- Mini meta -->
          <div v-if="selectedCampaign" class="text-xs text-white/70">
            <span class="mr-2">Category: <b class="text-white/90">{{ selectedCampaign.category || '—' }}</b></span>
            <span class="mr-2">Payout: <b class="text-white/90">{{ selectedCampaign.payout ? fmtTZS(selectedCampaign.payout) : '—' }}</b></span>
            <span>Validity: <b class="text-white/90">{{ selectedCampaign.valid_until || '—' }}</b></span>
          </div>
        </div>
      </section>

      <!-- Link + QR + Share -->
      <section v-if="selectedCampaign" class="rounded-2xl p-4 sm:p-6 bg-white/5 ring-1 ring-white/10">
        <h2 class="text-sm font-semibold text-white/80 mb-3">Your Promo Link</h2>

        <!-- UTM Builder (collapsible for mobile) -->
        <details class="mb-3 rounded-xl overflow-hidden">
          <summary class="cursor-pointer bg-white/5 ring-1 ring-white/10 px-3 py-2 rounded-xl text-sm select-none">
            🔗 Add UTM tracking (optional)
          </summary>
          <div class="grid sm:grid-cols-3 gap-2 mt-2">
            <input v-model.trim="utm.source" class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" placeholder="utm_source (e.g., tiktok)" />
            <input v-model.trim="utm.medium" class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" placeholder="utm_medium (e.g., cpc)" />
            <input v-model.trim="utm.campaign" class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" :placeholder="`utm_campaign (${selectedCampaign.title})`" />
          </div>
        </details>

        <div class="grid gap-3 sm:grid-cols-5">
          <!-- Link + copy -->
          <div class="sm:col-span-3">
            <div class="flex gap-2">
              <input :value="finalLink" readonly class="flex-1 bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" />
              <button @click="copy(finalLink)" class="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15 text-sm">Copy</button>
            </div>
            <div class="mt-2 flex items-center gap-2 text-xs text-white/60">
              <label class="inline-flex items-center gap-2">
                <input type="checkbox" v-model="shorten" />
                <span>Use short link format</span>
              </label>
              <span v-if="shorten" class="text-white/40">(/r/{{ username }}/{{ selectedCampaignId }})</span>
            </div>

            <!-- Quick share -->
            <div class="mt-3 flex flex-wrap gap-2">
              <button @click="share(finalLink)" class="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-400/30 text-sm">Share</button>
              <button @click="copy(captionForShare)" class="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15 text-sm">Copy Caption</button>
            </div>
          </div>

          <!-- QR -->
          <div class="sm:col-span-2">
            <div class="rounded-xl p-3 bg-slate-950/50 ring-1 ring-white/10 grid place-items-center">
              <div id="qr-wrap" class="p-2 rounded-xl bg-white">
                <QrcodeVue ref="qrRef" :value="finalLink" :size="qrSize" render-as="canvas" level="M" />
              </div>
            </div>
            <div class="mt-2 flex items-center justify-between gap-2">
              <input type="range" min="120" max="320" step="20" v-model.number="qrSize" class="w-full" />
              <button @click="downloadQR" class="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15 text-sm">Download</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Banner Builder + Live Preview -->
      <section v-if="selectedCampaign" class="rounded-2xl p-4 sm:p-6 bg-white/5 ring-1 ring-white/10">
        <div class="flex items-center justify-between gap-3 mb-3">
          <h2 class="text-sm font-semibold text-white/80">Banner & Embed</h2>
          <div class="flex items-center gap-2 text-xs">
            <label class="inline-flex items-center gap-2">
              <input type="checkbox" v-model="openInNewTab" />
              <span>Open in new tab</span>
            </label>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <!-- Controls -->
          <div class="grid gap-3">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-xs text-white/60 block mb-1">Width (px)</label>
                <input type="range" min="240" max="640" step="10" v-model.number="banner.width" class="w-full" />
                <div class="text-xs text-white/60 mt-1">{{ banner.width }}px</div>
              </div>
              <div>
                <label class="text-xs text-white/60 block mb-1">Radius</label>
                <input type="range" min="0" max="24" step="2" v-model.number="banner.radius" class="w-full" />
                <div class="text-xs text-white/60 mt-1">{{ banner.radius }}px</div>
              </div>
            </div>

            <div>
              <label class="text-xs text-white/60 block mb-1">Theme</label>
              <div class="flex gap-2">
                <button v-for="t in themes" :key="t.value" @click="banner.theme = t.value"
                        :class="['px-3 py-1.5 rounded-xl text-xs ring-1',
                                 banner.theme===t.value ? 'bg-white text-slate-900 ring-white' : 'bg-white/5 ring-white/15']">
                  {{ t.label }}
                </button>
              </div>
            </div>

            <div>
              <label class="text-xs text-white/60 block mb-1">CTA Text</label>
              <input v-model.trim="banner.cta" class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm" placeholder="Shop Now / Learn More" />
            </div>

            <div>
              <label class="text-xs text-white/60 block mb-1">Banner Image</label>
              <select v-model="banner.src" class="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm">
                <option :value="defaultBanner">Default</option>
                <option v-for="(b, i) in (selectedCampaign.banners || [])" :key="i" :value="b">{{ fileName(b) }}</option>
              </select>
            </div>
          </div>

          <!-- Preview -->
          <div class="grid gap-3">
            <div class="rounded-2xl ring-1 ring-white/10 overflow-hidden bg-slate-950/40 p-4">
              <a :href="finalLink" :target="openInNewTab ? '_blank' : '_self'" class="block group">
                <img
                  :src="banner.src || defaultBanner"
                  :alt="`Promote ${selectedCampaign.title}`"
                  class="mx-auto shadow-sm"
                  :style="{ width: banner.width + 'px', borderRadius: banner.radius + 'px' }"
                  loading="lazy"
                />
                <div class="text-center mt-3">
                  <button
                    class="px-4 py-2 rounded-xl text-sm font-semibold"
                    :class="ctaClass"
                  >
                    {{ banner.cta || 'Learn More' }}
                  </button>
                </div>
              </a>
              <p class="mt-2 text-center text-xs text-white/60">Preview of what others will see.</p>
            </div>

            <!-- Embed tabs -->
            <div>
              <div class="flex gap-2 mb-2">
                <button v-for="m in embedModes" :key="m"
                        @click="embedMode=m"
                        :class="['px-3 py-1.5 rounded-xl text-xs ring-1',
                                 embedMode===m ? 'bg-white text-slate-900 ring-white' : 'bg-white/5 ring-white/15']">
                  {{ m }}
                </button>
                <button @click="copy(embedCode)" class="ml-auto px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15 text-xs">
                  Copy Code
                </button>
              </div>
              <pre class="bg-slate-950/60 ring-1 ring-white/10 p-3 rounded-xl text-xs whitespace-pre-wrap break-words select-all">{{ embedCode }}</pre>
            </div>
          </div>
        </div>
      </section>

      <!-- Empty/Loading states -->
      <section v-if="loading" class="grid gap-3">
        <div class="h-24 rounded-2xl bg-white/5 ring-1 ring-white/10 animate-pulse"></div>
        <div class="h-40 rounded-2xl bg-white/5 ring-1 ring-white/10 animate-pulse"></div>
      </section>

      <section v-if="!loading && !campaigns.length" class="rounded-2xl p-6 text-center bg-white/5 ring-1 ring-white/10">
        <p class="text-white/80">No campaigns available yet.</p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import QrcodeVue from 'qrcode.vue'

/** ---------- State ---------- */
const campaigns = ref([])
const loading = ref(true)
const search = ref('')
const selectedCampaignId = ref('')
const username = (localStorage.getItem('user_name') || 'affiliate').trim() || 'affiliate'

/** ---------- Fetch ---------- */
onMounted(async () => {
  try {
    const res = await axios.get('/api/campaigns/my')
    campaigns.value = Array.isArray(res.data) ? res.data : []
  } catch (e) {
    campaigns.value = []
  } finally {
    loading.value = false
  }
})

/** ---------- Derived ---------- */
const filteredCampaigns = computed(() => {
  if (!search.value) return campaigns.value
  const q = search.value.toLowerCase()
  return campaigns.value.filter(c =>
    (c.title || '').toLowerCase().includes(q) ||
    (c.product?.name || '').toLowerCase().includes(q)
  )
})

const selectedCampaign = computed(() =>
  campaigns.value.find(c => String(c.id) === String(selectedCampaignId.value))
)

const baseLink = computed(() => {
  // Use your domain (aligns with your project): smartbiz.site
  return `https://smartbiz.site/ref/${encodeURIComponent(username)}?campaign=${encodeURIComponent(selectedCampaignId.value || '')}`
})

/** UTM Builder */
const utm = ref({
  source: '',
  medium: '',
  campaign: ''
})
const utmQuery = computed(() => {
  const params = []
  if (utm.value.source) params.push(`utm_source=${encodeURIComponent(utm.value.source)}`)
  if (utm.value.medium) params.push(`utm_medium=${encodeURIComponent(utm.value.medium)}`)
  if (utm.value.campaign) params.push(`utm_campaign=${encodeURIComponent(utm.value.campaign)}`)
  return params.length ? `&${params.join('&')}` : ''
})

/** Link options */
const shorten = ref(false)
const finalLink = computed(() => {
  if (!selectedCampaignId.value) return ''
  const long = baseLink.value + utmQuery.value
  if (!shorten.value) return long
  // Simple deterministic short form for UI (map to your real shortener in backend)
  return `https://smartbiz.site/r/${encodeURIComponent(username)}/${encodeURIComponent(selectedCampaignId.value)}`
})

/** QR */
const qrRef = ref(null)
const qrSize = ref(200)
function downloadQR() {
  try {
    const wrap = document.querySelector('#qr-wrap canvas')
    const url = wrap.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `smartbiz-qr-${selectedCampaignId.value}.png`
    a.click()
  } catch { /* no-op */ }
}

/** Banner */
const defaultBanner = '/banners/default-banner.jpg'
const banner = ref({
  width: 320,
  radius: 12,
  theme: 'emerald',
  cta: 'Learn More',
  src: ''
})

const themes = [
  { label: 'Emerald', value: 'emerald' },
  { label: 'Indigo', value: 'indigo' },
  { label: 'Amber', value: 'amber' },
  { label: 'Slate', value: 'slate' }
]

const openInNewTab = ref(true)

const ctaClass = computed(() => {
  const t = banner.value.theme
  if (t === 'emerald') return 'bg-emerald-500/90 hover:bg-emerald-400 text-slate-900'
  if (t === 'indigo') return 'bg-indigo-500/90 hover:bg-indigo-400 text-white'
  if (t === 'amber') return 'bg-amber-400/90 hover:bg-amber-300 text-slate-900'
  return 'bg-slate-200/90 hover:bg-slate-100 text-slate-900'
})

/** Embed generator */
const embedMode = ref('HTML') // HTML | Markdown | BBCode
const targetAttr = computed(() => openInNewTab.value ? ' target="_blank" rel="noopener"' : '')
const embedCode = computed(() => {
  const img = `<img src="${(banner.value.src || defaultBanner)}" alt="Promote ${selectedCampaign.value?.title || ''}" style="width:${banner.value.width}px; border-radius:${banner.value.radius}px;" />`
  const link = `<a href="${finalLink.value}"${targetAttr.value}>${img}</a>`

  if (embedMode.value === 'HTML') return link

  if (embedMode.value === 'Markdown') {
    const alt = `Promote ${selectedCampaign.value?.title || ''}`
    return `[![${alt}](${banner.value.src || defaultBanner})](${finalLink.value})`
  }

  if (embedMode.value === 'BBCode') {
    return `[url=${finalLink.value}][img]${banner.value.src || defaultBanner}[/img][/url]`
  }

  return link
})

/** Share */
const captionForShare = computed(() => {
  const t = selectedCampaign.value?.title || 'Great offer'
  return `🔥 ${t}\n👉 ${finalLink.value}\n#SmartBiz #Deals #SupportLocal`
})

async function copy(text) {
  try { await navigator.clipboard.writeText(text); alert('Copied!') } catch { /* no-op */ }
}

async function share(url) {
  try {
    if (navigator.share) {
      await navigator.share({ title: selectedCampaign.value?.title || 'SmartBiz', text: captionForShare.value, url })
    } else {
      await copy(`${captionForShare.value}\n${url}`)
    }
  } catch { /* no-op */ }
}

/** Utils */
function fileName(path='') {
  const idx = path.lastIndexOf('/')
  return idx >= 0 ? path.slice(idx+1) : path
}
function fmtTZS(n) {
  const num = Number(n || 0)
  if (num >= 1_000_000) return `${(num/1_000_000).toFixed(num >= 10_000_000 ? 0 : 1)}M TZS`
  if (num >= 1_000) return `${(num/1_000).toFixed(num >= 10_000 ? 0 : 1)}K TZS`
  return `${num.toLocaleString('en-US')} TZS`
}
</script>

<style scoped>
/* mobile niceties */
::-webkit-scrollbar{width:0;height:0}
pre { white-space: pre-wrap; word-break: break-word; font-size: .875rem; }
</style>
