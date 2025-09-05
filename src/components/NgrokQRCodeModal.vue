<template>
  <div class="relative">
    <!-- 🔘 Trigger -->
    <button
      @click="open = true"
      class="bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg shadow hover:bg-yellow-300 active:scale-[.98]"
    >
      📱 {{ t.show }}
    </button>

    <!-- 🪟 Overlay -->
    <transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50"
        @keydown.esc.prevent="close"
        @click.self="close"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="ids.title"
      >
        <!-- 📱 Bottom sheet (mobile) / 📺 Modal (md+) -->
        <div
          class="w-full md:max-w-sm bg-white rounded-t-2xl md:rounded-2xl shadow-xl border border-yellow-300 p-4 md:p-6 relative animate-in"
          :style="sheetStyle"
          ref="panel"
          tabindex="0"
        >
          <!-- ❌ Close -->
          <button
            @click="close"
            class="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl font-bold"
            aria-label="Close"
          >&times;</button>

          <!-- 🔖 Title + Live -->
          <div class="flex items-center justify-between">
            <h3 :id="ids.title" class="text-base md:text-lg font-extrabold text-slate-900">
              {{ t.title }}
            </h3>
            <span class="px-2 py-0.5 rounded bg-yellow-300 text-[10px] font-black text-black shadow animate-pulse">LIVE</span>
          </div>

          <!-- 🌐 URL + actions -->
          <div class="mt-2 grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
            <input
              v-model="url"
              spellcheck="false"
              class="col-start-1 col-end-2 h-10 px-3 rounded-lg bg-white border border-slate-200 text-xs md:text-[13px] truncate focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button class="btn-ghost" @click="copy">{{ t.copy }}</button>
            <a class="btn-ghost" :href="url" target="_blank" rel="noopener">{{ t.open }}</a>
            <button class="btn-ghost" @click="share">{{ t.share }}</button>
          </div>

          <!-- 📶 Reachability -->
          <div class="mt-2 flex items-center gap-2 text-[11px]">
            <span v-if="pinging" class="spinner"></span>
            <span v-else :class="reachable ? 'text-emerald-600' : 'text-rose-600'">
              {{ reachable ? t.online : t.offline }}
            </span>
            <button class="link text-[11px]" @click="ping">{{ t.recheck }}</button>
            <span class="text-slate-400">•</span>
            <button class="link text-[11px]" @click="resetToEnv">{{ t.reset }}</button>
          </div>

          <!-- 🎛 Controls -->
          <div class="mt-3 grid grid-cols-2 gap-2">
            <label class="flex items-center gap-2 text-xs">
              <span>{{ t.size }}</span>
              <input type="range" min="160" max="320" step="10" v-model.number="size" class="w-full">
            </label>
            <label class="flex items-center justify-end gap-2 text-xs">
              <span>{{ t.theme }}</span>
              <button class="chip" :class="theme==='dark' ? 'chip-active' : ''" @click="theme='dark'">Dark</button>
              <button class="chip" :class="theme==='light' ? 'chip-active' : ''" @click="theme='light'">Light</button>
            </label>
          </div>

          <!-- 📷 QR -->
          <div class="mt-4 flex flex-col items-center justify-center">
            <div class="relative" :style="{ width: size+'px', height: size+'px' }">
              <qrcode-vue
                ref="qrRef"
                :value="url"
                :size="size"
                :level="level"
                :margin="1"
                :render-as="'svg'"
                :foreground="qrFg"
                :background="qrBg"
                class="transition-transform hover:scale-[1.02] duration-300 rounded-lg"
              />
              <!-- Center logo (optional) -->
              <img
                v-if="logo"
                :src="logo"
                alt=""
                class="absolute inset-0 m-auto h-10 w-10 rounded-md ring-2 ring-white/80 object-cover pointer-events-none"
                style="clip-path: inset(0 round 8px)"
              />
            </div>

            <p class="mt-3 text-[12px] text-gray-600 text-center">
              📱 {{ t.scan }}
              <span class="font-semibold text-indigo-600">SmartBiz</span>
            </p>
            <a :href="url" target="_blank" class="text-[11px] text-blue-600 underline mt-1 hover:text-blue-800 break-all">
              🔗 {{ url }}
            </a>
            <p class="text-[11px] text-gray-400 mt-1 italic">{{ t.secure }}</p>
          </div>

          <!-- ⬇️ Exports -->
          <div class="mt-4 grid grid-cols-2 gap-2">
            <button class="btn-soft" @click="downloadSVG">⬇️ SVG</button>
            <button class="btn-soft" @click="downloadPNG">⬇️ PNG</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import QrcodeVue from 'qrcode.vue'

/* 🧩 Local i18n */
const t = {
  show: 'Show QR Preview',
  title: 'QR Preview',
  copy: 'Copy',
  open: 'Open',
  share: 'Share',
  online: 'Link reachable',
  offline: 'Link not reachable',
  recheck: 'Re-check',
  reset: 'Reset',
  size: 'Size',
  theme: 'Theme',
  scan: 'Scan to preview',
  secure: 'Secure via Ngrok Tunnel',
}

/* ⚙️ State */
const open = ref(false)
const url = ref('')
const size = ref(220)
const theme = ref('light')
const level = ref('M')
const logo = ref('/favicon.png') // badilisha logo yako au toa kabisa

/* 🔒 Env fallback strategy */
const envUrl = import.meta.env.VITE_NGROK_URL
const fallback = 'https://cca84ce5c2a6.ngrok-free.app' // override hapa
function pickUrl(){
  const c = envUrl && /ngrok/.test(envUrl) ? envUrl : fallback
  return c || window.location.origin
}
function resetToEnv(){ url.value = pickUrl(); ping() }

/* 🎨 Colors */
const qrFg = computed(() => theme.value === 'dark' ? '#ffffff' : '#111827')
const qrBg = computed(() => theme.value === 'dark' ? '#111827' : '#ffffff')

/* 📶 Reachability ping (best-effort; CORS inaweza kuzuia status) */
const reachable = ref(true)
const pinging = ref(false)
async function ping(){
  pinging.value = true
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 3500)
    // `no-cors` → hatupati status, lakini tukipata response hatujapata error
    await fetch(url.value, { mode: 'no-cors', signal: ctrl.signal, cache: 'no-cache' })
    clearTimeout(t)
    reachable.value = true
  } catch {
    reachable.value = false
  } finally {
    pinging.value = false
  }
}

/* 📋 Copy & Share */
async function copy(){
  try { await navigator.clipboard.writeText(url.value) } catch {}
}
async function share(){
  if (navigator.share) {
    try { await navigator.share({ title: 'SmartBiz Preview', url: url.value }) } catch {}
  } else { await copy() }
}

/* ⌨️ Close + focus trap lite */
function close(){ open.value = false }
const panel = ref(null)

/* ⬇️ Exports */
const qrRef = ref(null)
function downloadSVG(){
  const svg = panel.value?.querySelector('svg')
  if (!svg) return
  const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' })
  const urlObj = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = urlObj
  a.download = 'smartbiz-qr.svg'
  a.click()
  URL.revokeObjectURL(urlObj)
}
function downloadPNG(){
  const svg = panel.value?.querySelector('svg')
  if (!svg) return
  const xml = new XMLSerializer().serializeToString(svg)
  const svg64 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    const pad = 0
    canvas.width = size.value + pad
    canvas.height = size.value + pad
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = qrBg.value
    ctx.fillRect(0,0,canvas.width,canvas.height)
    ctx.drawImage(img, 0, 0)
    const png = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = png
    a.download = 'smartbiz-qr.png'
    a.click()
  }
  img.crossOrigin = 'anonymous'
  img.src = svg64
}

/* 🆔 ids for a11y */
const ids = { title: 'qr-title-' + Math.random().toString(36).slice(2,7) }

/* 🧭 Safe-area bottom for sheet */
const sheetStyle = { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }

/* 🧠 Lifecycle */
onMounted(async () => {
  url.value = pickUrl()
  await nextTick()
  ping()
})
</script>

<style scoped>
/* Animations */
@keyframes fade-in { 0% {opacity:0; transform:translateY(12px) scale(.98)} 100% {opacity:1; transform:translateY(0) scale(1)} }
.animate-in { animation: fade-in .35s ease-out both }

/* Buttons */
.btn-ghost {
  @apply h-10 px-3 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 active:translate-y-[1px];
}
.btn-soft {
  @apply h-10 px-3 rounded-lg text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 active:translate-y-[1px];
}
.link { @apply text-blue-600 hover:underline }

/* Chips */
.chip { @apply h-7 px-3 rounded-full border border-slate-300 text-xs bg-white; }
.chip-active { @apply bg-slate-900 text-white border-slate-900 }

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease }
.fade-enter-from, .fade-leave-to { opacity: 0 }

/* Spinner */
.spinner{ width:14px;height:14px;border-radius:9999px;border:2px solid rgba(0,0,0,.25);border-top-color:#111;animation:spin 1s linear infinite }
@keyframes spin { to { transform: rotate(360deg) } }
</style>
