<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
    <!-- App Bar -->
    <header class="sticky top-0 z-20 backdrop-blur bg-slate-900/70 border-b border-white/10">
      <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-2xl bg-emerald-500/20 grid place-items-center ring-1 ring-emerald-400/30">
            <span class="text-lg">🏆</span>
          </div>
          <div>
            <h1 class="text-base sm:text-lg font-semibold leading-tight">Promoter Leaderboard</h1>
            <p class="text-xs text-white/60">Kugusa jamii kupitia ushawishi na uwajibikaji</p>
          </div>
        </div>

        <div class="hidden sm:flex items-center gap-2">
          <span class="px-2.5 py-1 rounded-full text-xs bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">Top Earners</span>
          <span class="px-2.5 py-1 rounded-full text-xs bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/30">Community Impact</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="max-w-6xl mx-auto px-4 pb-3">
        <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <!-- Range chips -->
          <div class="flex gap-2 overflow-x-auto no-scrollbar">
            <button
              v-for="opt in ranges"
              :key="opt.value"
              @click="setRange(opt.value)"
              :class="[
                'px-3 py-1.5 rounded-full text-xs whitespace-nowrap ring-1',
                range === opt.value
                  ? 'bg-white text-slate-900 ring-white'
                  : 'bg-white/5 text-white/80 ring-white/15 hover:bg-white/10'
              ]"
            >
              {{ opt.label }}
            </button>
          </div>

          <!-- Search & Sort -->
          <div class="flex gap-2">
            <div class="flex-1 min-w-0 relative">
              <input
                v-model.trim="q"
                type="search"
                inputmode="search"
                placeholder="Search username…"
                class="w-full bg-white/5 ring-1 ring-white/15 focus:ring-white/30 outline-none rounded-xl px-9 py-2 text-sm placeholder:text-white/40"
                aria-label="Search username"
              />
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">🔎</span>
              <button v-if="q" @click="q=''" class="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">✕</button>
            </div>

            <select
              v-model="sortBy"
              class="bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2 text-sm"
              aria-label="Sort results"
            >
              <option value="earned">Sort: Earnings</option>
              <option value="referrals">Sort: Referrals</option>
              <option value="impact">Sort: Impact</option>
            </select>
          </div>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-6xl mx-auto px-4 py-4">
      <!-- Mobile list (cards) -->
      <section class="grid gap-3 sm:hidden">
        <template v-if="loading">
          <LeaderboardCardSkeleton v-for="i in 6" :key="i" />
        </template>

        <template v-else-if="error">
          <div class="p-4 rounded-2xl bg-red-500/10 ring-1 ring-red-500/30 text-red-200">
            {{ error }} — <button class="underline" @click="fetchData">Retry</button>
          </div>
        </template>

        <template v-else-if="filtered.length === 0">
          <div class="p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 text-white/70 text-center">
            No promoters found for this filter.
          </div>
        </template>

        <article
          v-for="(u, i) in paged"
          :key="u.username + i"
          class="rounded-2xl p-4 bg-white/5 ring-1 ring-white/10 backdrop-blur"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="relative">
                <img
                  :src="u.avatar || defaultAvatar(u.username)"
                  :alt="`${u.username} avatar`"
                  class="h-12 w-12 rounded-2xl object-cover ring-1 ring-white/15"
                  loading="lazy"
                />
                <span
                  class="absolute -top-1 -right-1 h-6 w-6 grid place-items-center rounded-full text-xs font-bold"
                  :class="rankColor(i + 1)"
                >
                  {{ i + 1 }}
                </span>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold">{{ u.username }}</h3>
                  <span v-if="i < 3" class="text-amber-300 text-sm">⭐</span>
                </div>
                <p class="text-xs text-white/60">
                  Referrals: <strong class="text-white/90">{{ u.total_referrals }}</strong>
                  • Impact: <strong class="text-white/90">{{ u.impact_score ?? impactFrom(u) }}</strong>
                </p>
              </div>
            </div>

            <div class="text-right">
              <p class="text-xs text-white/60">Total Earned</p>
              <p class="text-base font-semibold">{{ fmtTZS(u.earned) }}</p>
            </div>
          </div>

          <div class="mt-3 flex items-center justify-between">
            <div class="text-xs text-white/60">
              {{ u.region || '—' }}
            </div>
            <div class="flex items-center gap-2">
              <button @click="share(u)" class="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs ring-1 ring-white/15">
                Share
              </button>
              <button @click="viewProfile(u)" class="px-3 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/25 text-emerald-200 text-xs ring-1 ring-emerald-400/30">
                View
              </button>
            </div>
          </div>
        </article>

        <!-- Load more -->
        <button
          v-if="hasMore"
          @click="page++"
          class="mt-2 w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15 text-sm"
        >
          Load more
        </button>
      </section>

      <!-- Desktop table -->
      <section class="hidden sm:block">
        <div class="overflow-hidden rounded-2xl ring-1 ring-white/10 bg-white/5">
          <table class="min-w-full text-sm">
            <thead class="bg-white/5 text-white/70">
              <tr>
                <th class="text-left px-4 py-3">Rank</th>
                <th class="text-left px-4 py-3">Username</th>
                <th class="text-right px-4 py-3">Total Earned</th>
                <th class="text-right px-4 py-3">Referrals</th>
                <th class="text-right px-4 py-3">Impact</th>
                <th class="text-right px-4 py-3">Region</th>
                <th class="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="7" class="px-4 py-5">
                  <TableSkeleton />
                </td>
              </tr>
              <tr v-else-if="error">
                <td colspan="7" class="px-4 py-5 text-red-200">{{ error }}</td>
              </tr>
              <tr v-else-if="filtered.length === 0">
                <td colspan="7" class="px-4 py-5 text-white/70">No promoters found.</td>
              </tr>
              <tr
                v-for="(u, i) in paged"
                :key="u.username + '-desktop'"
                class="border-t border-white/10 hover:bg-white/5"
              >
                <td class="px-4 py-3">
                  <span :class="['px-2 py-1 rounded-md text-xs font-bold', rankColor(i + 1)]">{{ i + 1 }}</span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <img
                      :src="u.avatar || defaultAvatar(u.username)"
                      class="h-9 w-9 rounded-xl object-cover ring-1 ring-white/15"
                      :alt="`${u.username} avatar`"
                      loading="lazy"
                    />
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{{ u.username }}</span>
                      <span v-if="i < 3" class="text-amber-300">⭐</span>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-right font-semibold">{{ fmtTZS(u.earned) }}</td>
                <td class="px-4 py-3 text-right">{{ u.total_referrals }}</td>
                <td class="px-4 py-3 text-right">{{ u.impact_score ?? impactFrom(u) }}</td>
                <td class="px-4 py-3 text-right">{{ u.region || '—' }}</td>
                <td class="px-4 py-3 text-right">
                  <button @click="share(u)" class="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs ring-1 ring-white/15 mr-2">
                    Share
                  </button>
                  <button @click="viewProfile(u)" class="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/25 text-emerald-200 text-xs ring-1 ring-emerald-400/30">
                    View
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="hasMore && !loading" class="p-3 border-t border-white/10 flex justify-center">
            <button
              @click="page++"
              class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15 text-sm"
            >
              Load more
            </button>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="mt-6">
        <div class="rounded-2xl p-4 sm:p-6 bg-emerald-500/10 ring-1 ring-emerald-400/30">
          <h3 class="text-lg font-semibold mb-1">Panua uwindo wa kufikia jamii</h3>
          <p class="text-sm text-white/70">
            Jiunge na mpango wa uenezi: ongeza mauzo, ongeza ajira, na ulete athari chanya katika maeneo yako.
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button class="px-4 py-2 rounded-xl bg-emerald-400 text-slate-900 font-semibold">
              Become a Promoter
            </button>
            <button class="px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15">
              Learn More
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

/** ---------- UI State ---------- */
const loading = ref(true)
const error = ref('')
const q = ref('')
const range = ref('30d')
const sortBy = ref('earned')
const page = ref(1)
const pageSize = 20

/** ---------- Data ---------- */
const leaderboard = ref([])

/** ---------- Filters ---------- */
const ranges = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
  { label: 'All time', value: 'all' }
]

function setRange(v) {
  if (range.value !== v) {
    range.value = v
    page.value = 1
    fetchData()
  }
}

/** ---------- Fetch ---------- */
async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get('/api/affiliate/leaderboard', {
      params: { range: range.value }
    })
    // Expecting items with: username, earned, total_referrals, (optional) impact_score, region, avatar
    leaderboard.value = Array.isArray(res.data) ? res.data : []
  } catch (e) {
    error.value = 'Failed to load leaderboard'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

/** ---------- Derived ---------- */
const filtered = computed(() => {
  let arr = leaderboard.value

  if (q.value) {
    const term = q.value.toLowerCase()
    arr = arr.filter((x) => x.username?.toLowerCase().includes(term))
  }

  arr = [...arr].sort((a, b) => {
    if (sortBy.value === 'earned') return (b.earned ?? 0) - (a.earned ?? 0)
    if (sortBy.value === 'referrals') return (b.total_referrals ?? 0) - (a.total_referrals ?? 0)
    if (sortBy.value === 'impact') return (impactFrom(b)) - (impactFrom(a))
    return 0
  })

  return arr
})

const paged = computed(() => filtered.value.slice(0, page.value * pageSize))
const hasMore = computed(() => filtered.value.length > paged.value.length)

/** ---------- Helpers ---------- */
function fmtTZS(n) {
  const num = Number(n || 0)
  // Compact for mobile: e.g., 1.2M TZS
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1)}M TZS`
  if (num >= 1_000) return `${(num / 1_000).toFixed(num >= 10_000 ? 0 : 1)}K TZS`
  return `${num.toLocaleString('en-US')} TZS`
}

function impactFrom(u) {
  // Community impact: weighted combo (tweak as needed)
  const r = Number(u.total_referrals || 0)
  const e = Number(u.earned || 0)
  return Math.round(r * 2 + e / 50000) // 50k TZS ≈ +1 impact
}

function defaultAvatar(name = '') {
  const initial = name?.[0]?.toUpperCase() || 'U'
  // Simple SVG data URI avatar for consistency
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'>
      <rect width='100%' height='100%' rx='16' fill='#0ea5a5'/>
      <text x='50%' y='54%' font-size='44' text-anchor='middle' fill='white' font-family='Inter,Arial' dy='.1em'>${initial}</text>
    </svg>`
  )}`
}

function rankColor(rank) {
  if (rank === 1) return 'bg-yellow-400 text-slate-900'
  if (rank === 2) return 'bg-slate-300 text-slate-900'
  if (rank === 3) return 'bg-amber-600 text-white'
  return 'bg-white/10 text-white ring-1 ring-white/15'
}

async function share(u) {
  const text = `🏆 ${u.username} just ranked on the Leaderboard — Earnings: ${fmtTZS(u.earned)}, Referrals: ${u.total_referrals}. Join and make an impact!`
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Promoter Leaderboard', text, url: location.href })
    } else {
      await navigator.clipboard.writeText(`${text} ${location.href}`)
      alert('Copied to clipboard')
    }
  } catch (_) {
    /* no-op */
  }
}

function viewProfile(u) {
  // Route as needed in your app:
  // router.push({ name: 'promoter-profile', params: { username: u.username } })
  console.log('view profile', u.username)
}
</script>

<!-- Skeletons as local subcomponents -->
<script>
export default {
  components: {
    LeaderboardCardSkeleton: {
      template: `
        <div class="rounded-2xl p-4 bg-white/5 ring-1 ring-white/10 animate-pulse">
          <div class="flex items-center gap-3">
            <div class="h-12 w-12 rounded-2xl bg-white/10"></div>
            <div class="flex-1">
              <div class="h-3 w-32 bg-white/10 rounded mb-2"></div>
              <div class="h-3 w-48 bg-white/10 rounded"></div>
            </div>
            <div class="h-5 w-20 bg-white/10 rounded"></div>
          </div>
        </div>
      `
    },
    TableSkeleton: {
      template: `
        <div class="w-full">
          <div v-for="i in 5" :key="i" class="h-5 my-2 bg-white/10 rounded animate-pulse"></div>
        </div>
      `
    }
  }
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
