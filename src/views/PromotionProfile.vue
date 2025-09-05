<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
    <!-- Sticky AppBar -->
    <header class="sticky top-0 z-20 backdrop-blur bg-slate-900/70 border-b border-white/10">
      <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <button @click="goBack" class="px-3 py-1.5 rounded-xl ring-1 ring-white/15 bg-white/5 hover:bg-white/10 text-sm">
          ⬅️ Back
        </button>
        <div class="text-center flex-1">
          <h1 class="text-base sm:text-lg font-semibold leading-tight">Promotion Details</h1>
          <p class="text-xs text-white/60 truncate">Empower outreach • Touch communities</p>
        </div>
        <div class="hidden sm:flex items-center gap-2">
          <span class="px-2.5 py-1 rounded-full text-xs bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
            Community Impact
          </span>
        </div>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 py-4">
      <!-- Loading -->
      <section v-if="loading" class="grid gap-3">
        <div class="h-28 rounded-2xl bg-white/5 ring-1 ring-white/10 animate-pulse"></div>
        <div class="h-40 rounded-2xl bg-white/5 ring-1 ring-white/10 animate-pulse"></div>
        <div class="h-24 rounded-2xl bg-white/5 ring-1 ring-white/10 animate-pulse"></div>
      </section>

      <!-- Not Found -->
      <section v-else-if="!promotion" class="text-center py-16">
        <h2 class="text-xl font-semibold text-red-300 mb-2">Promotion not found</h2>
        <p class="text-white/70 mb-4">Please go back and try again.</p>
        <button @click="goBack" class="px-4 py-2 rounded-xl bg-indigo-500 text-white hover:bg-indigo-400">
          ⬅️ Back to Scheduled Promotions
        </button>
      </section>

      <!-- Details -->
      <section v-else class="grid gap-4">
        <!-- Top meta card -->
        <div class="rounded-2xl p-4 sm:p-6 bg-white/5 ring-1 ring-white/10">
          <div class="flex flex-col sm:flex-row sm:items-start gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-2xl">{{ channelIcon }}</span>
                <h2 class="text-lg sm:text-xl font-semibold truncate">{{ promotion.title }}</h2>
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                <span class="px-2.5 py-1 rounded-full text-xs ring-1"
                      :class="statusChip.class">
                  {{ normalizedStatus }}
                </span>
                <span class="px-2.5 py-1 rounded-full text-xs bg-white/5 ring-1 ring-white/15">
                  {{ promotion.channel || '—' }}
                </span>
                <span class="px-2.5 py-1 rounded-full text-xs bg-white/5 ring-1 ring-white/15">
                  {{ scheduledLabel }}
                </span>
                <span v-if="isPast" class="px-2.5 py-1 rounded-full text-xs bg-amber-500/15 ring-1 ring-amber-400/30 text-amber-200">
                  Past schedule
                </span>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 w-full sm:w-auto">
              <button @click="copyMessage"
                class="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15 text-sm">Copy</button>
              <button @click="sharePromotion"
                class="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15 text-sm">Share</button>
              <button @click="editPromotion"
                class="px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/25 ring-1 ring-cyan-400/30 text-cyan-100 text-sm">Edit</button>
              <button @click="reschedulePromotion"
                class="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/25 ring-1 ring-emerald-400/30 text-emerald-100 text-sm">Reschedule</button>
              <button v-if="normalizedStatus==='Scheduled'" @click="sendNow"
                class="col-span-2 sm:col-span-1 px-3 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm">Send Now</button>
            </div>
          </div>

          <!-- Quick stats -->
          <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="rounded-xl p-3 bg-white/5 ring-1 ring-white/10">
              <p class="text-xs text-white/60">Scheduled</p>
              <p class="font-semibold">{{ promotion.date }} {{ promotion.time }}</p>
            </div>
            <div class="rounded-xl p-3 bg-white/5 ring-1 ring-white/10">
              <p class="text-xs text-white/60">Audience</p>
              <p class="font-semibold">{{ promotion.audience_size ?? '—' }}</p>
            </div>
            <div class="rounded-xl p-3 bg-white/5 ring-1 ring-white/10">
              <p class="text-xs text-white/60">Created by</p>
              <p class="font-semibold">{{ promotion.created_by ?? '—' }}</p>
            </div>
            <div class="rounded-xl p-3 bg-white/5 ring-1 ring-white/10">
              <p class="text-xs text-white/60">Timezone</p>
              <p class="font-semibold">{{ promotion.timezone ?? 'Local' }}</p>
            </div>
          </div>
        </div>

        <!-- Message Preview (channel-aware) -->
        <div class="rounded-2xl p-4 sm:p-6 bg-white/5 ring-1 ring-white/10">
          <h3 class="text-sm font-semibold text-white/80 mb-3">✉️ Message Content</h3>

          <div v-if="channel=='Email'" class="grid gap-3">
            <div class="rounded-xl overflow-hidden ring-1 ring-white/10">
              <div class="px-3 py-2 bg-white/5 text-xs text-white/60">Subject</div>
              <div class="px-3 py-2">{{ promotion.subject || '(no subject)' }}</div>
            </div>
            <div class="rounded-xl bg-white/5 ring-1 ring-white/10 p-3 leading-relaxed">
              <div class="prose prose-invert max-w-none" v-html="renderedEmail"></div>
            </div>
          </div>

          <div v-else class="rounded-xl bg-slate-950/40 ring-1 ring-white/10 p-3">
            <pre class="whitespace-pre-wrap break-words font-mono text-sm text-white/90">{{ promotion.message }}</pre>
          </div>

          <!-- Attachments / Media -->
          <div v-if="hasMedia" class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div v-for="(m, i) in mediaList" :key="i" class="rounded-xl overflow-hidden ring-1 ring-white/10 bg-white/5">
              <img v-if="isImg(m)" :src="m" alt="media" class="w-full h-28 object-cover" loading="lazy" />
              <video v-else controls class="w-full h-28 object-cover">
                <source :src="m" />
              </video>
            </div>
          </div>
        </div>

        <!-- Timeline & health -->
        <div class="rounded-2xl p-4 sm:p-6 bg-white/5 ring-1 ring-white/10">
          <h3 class="text-sm font-semibold text-white/80 mb-3">📅 Timeline</h3>
          <ol class="relative pl-5">
            <li class="mb-3">
              <span class="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-cyan-400"></span>
              <span class="text-sm">Created: <strong>{{ promotion.created_at ?? '—' }}</strong></span>
            </li>
            <li class="mb-3">
              <span class="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-amber-400"></span>
              <span class="text-sm">Scheduled: <strong>{{ promotion.date }} {{ promotion.time }}</strong></span>
            </li>
            <li v-if="promotion.sent_at" class="mb-1">
              <span class="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-emerald-400"></span>
              <span class="text-sm">Sent: <strong>{{ promotion.sent_at }}</strong></span>
            </li>
          </ol>

          <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="rounded-xl p-3 bg-white/5 ring-1 ring-white/10">
              <p class="text-xs text-white/60">Status</p>
              <p class="font-semibold">{{ normalizedStatus }}</p>
            </div>
            <div class="rounded-xl p-3 bg-white/5 ring-1 ring-white/10">
              <p class="text-xs text-white/60">Deliveries</p>
              <p class="font-semibold">{{ promotion.delivered ?? '—' }}</p>
            </div>
            <div class="rounded-xl p-3 bg-white/5 ring-1 ring-white/10">
              <p class="text-xs text-white/60">Failures</p>
              <p class="font-semibold">{{ promotion.failed ?? '—' }}</p>
            </div>
            <div class="rounded-xl p-3 bg-white/5 ring-1 ring-white/10">
              <p class="text-xs text-white/60">Clicks/Replies</p>
              <p class="font-semibold">{{ promotion.engagement ?? '—' }}</p>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button @click="goBack" class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15">
            ⬅️ Back
          </button>
          <button @click="duplicatePromotion" class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15">
            Duplicate
          </button>
          <button @click="deletePromotion" class="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 ring-1 ring-red-400/30 text-red-100">
            Delete
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const promotion = ref(null)

onMounted(() => {
  const id = route.params.id
  const promotions = JSON.parse(localStorage.getItem('my_promotions')) || []
  const found = promotions.find(promo => String(promo.id) === String(id))
  promotion.value = found || null
  loading.value = false
})

function goBack() {
  router.push('/scheduled-promotions')
}

/** --------- Normalizations & derived --------- */
const normalizedStatus = computed(() => {
  const s = (promotion.value?.status || '').toLowerCase()
  if (s.includes('sent')) return 'Sent'
  if (s.includes('fail')) return 'Failed'
  if (s.includes('sched')) return 'Scheduled'
  return promotion.value?.status || '—'
})

const statusChip = computed(() => {
  const s = normalizedStatus.value
  if (s === 'Sent') return { class: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30' }
  if (s === 'Failed') return { class: 'bg-red-500/15 text-red-200 ring-red-400/30' }
  if (s === 'Scheduled') return { class: 'bg-sky-500/15 text-sky-200 ring-sky-400/30' }
  return { class: 'bg-white/10 text-white/80 ring-white/15' }
})

const channel = computed(() => (promotion.value?.channel || '').toLowerCase())
const channelIcon = computed(() => {
  if (channel.value.includes('whats')) return '🟢💬'
  if (channel.value.includes('sms')) return '📱'
  if (channel.value.includes('email')) return '✉️'
  if (channel.value.includes('push')) return '📳'
  return '📢'
})

const scheduledLabel = computed(() => {
  const d = promotion.value?.date || ''
  const t = promotion.value?.time || ''
  return `${d} ${t}`.trim() || '—'
})

const isPast = computed(() => {
  const d = promotion.value?.date
  const t = promotion.value?.time || '00:00'
  if (!d) return false
  const when = new Date(`${d}T${t}`)
  return !isNaN(when) && when.getTime() < Date.now()
})

/** --------- Channel-aware preview --------- */
const renderedEmail = computed(() => {
  if (channel.value !== 'email') return ''
  const body = promotion.value?.message || ''
  // very basic newlines-><br> rendering for preview
  return body.replace(/\n/g, '<br>')
})

/** --------- Media (optional) --------- */
const mediaList = computed(() => {
  const m = promotion.value?.media
  if (!m) return []
  return Array.isArray(m) ? m : [m]
})
const hasMedia = computed(() => mediaList.value.length > 0)
function isImg(url) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(url || '')
}

/** --------- Actions --------- */
async function copyMessage() {
  try {
    await navigator.clipboard.writeText(promotion.value?.message || '')
    alert('Message copied')
  } catch { /* no-op */ }
}

async function sharePromotion() {
  const text = `Promotion: ${promotion.value?.title || ''} • ${scheduledLabel.value}`
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Promotion', text, url: location.href })
    } else {
      await navigator.clipboard.writeText(`${text} ${location.href}`)
      alert('Copied link to clipboard')
    }
  } catch { /* no-op */ }
}

function editPromotion() {
  // Adapt route name/path to your app
  router.push({ name: 'promotion-edit', params: { id: route.params.id } })
}

function reschedulePromotion() {
  router.push({ name: 'promotion-reschedule', params: { id: route.params.id } })
}

function sendNow() {
  // Hook to your API if needed
  alert('Send Now triggered (connect to backend action)')
}

function duplicatePromotion() {
  const list = JSON.parse(localStorage.getItem('my_promotions')) || []
  if (!promotion.value) return
  const copy = { ...promotion.value, id: cryptoRandom(), title: promotion.value.title + ' (Copy)' }
  localStorage.setItem('my_promotions', JSON.stringify([copy, ...list]))
  router.push({ name: 'promotion-details', params: { id: copy.id } })
}

function deletePromotion() {
  if (!confirm('Delete this promotion?')) return
  const list = JSON.parse(localStorage.getItem('my_promotions')) || []
  const next = list.filter(p => String(p.id) !== String(route.params.id))
  localStorage.setItem('my_promotions', JSON.stringify(next))
  goBack()
}

function cryptoRandom() {
  // simple unique-ish id for local use
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
</script>

<style scoped>
/* optional: hide scrollbars on chips/containers if needed */
::-webkit-scrollbar { width: 0; height: 0; }
</style>
