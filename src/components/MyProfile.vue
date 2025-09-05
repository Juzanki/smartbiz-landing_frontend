<!-- 📁 src/components/MyProfilePro.vue -->
<template>
  <section
    class="relative rounded-2xl overflow-hidden border border-cyan-700 shadow-xl text-white"
    :style="safeArea"
    aria-label="Profile"
  >
    <!-- Cover (auto gradient from username hash) -->
    <div class="h-28 sm:h-32 w-full" :style="coverStyle"></div>

    <!-- Offline pill -->
    <transition name="fade">
      <div v-if="!online" class="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[11px]
                                  bg-amber-500/25 border border-amber-400/40 text-amber-100">
        ⚠️ Offline — some actions disabled
      </div>
    </transition>

    <!-- Card body -->
    <div class="bg-[#1e293b] px-4 pb-4 -mt-10 pt-12 rounded-t-2xl border-t border-white/10">
      <!-- Header row -->
      <div class="flex items-start gap-3">
        <!-- Avatar -->
        <div class="relative shrink-0">
          <img
            :src="localAvatar || user.avatar || '/user-avatar.png'"
            :alt="user.name || 'User avatar'"
            class="w-20 h-20 rounded-full object-cover ring-2 ring-cyan-500 shadow-lg"
            @error="onImgErr"
          />
          <!-- presence -->
          <span
            v-if="user.online"
            class="absolute bottom-1 right-1 h-3 w-3 rounded-full bg-emerald-400 ring ring-white/80 animate-pulse"
            aria-label="Online"
          />
          <!-- change avatar (owner only) -->
          <button
            v-if="isSelf"
            class="absolute -bottom-2 -right-2 h-8 w-8 grid place-items-center rounded-full bg-black/60 border border-white/30 backdrop-blur"
            @click="pickAvatar"
            title="Change avatar"
            aria-label="Change avatar"
          >📷</button>
          <input ref="fileEl" type="file" accept="image/*" class="hidden" @change="onFile" />
        </div>

        <!-- Name & meta -->
        <div class="min-w-0">
          <div class="flex items-center gap-1">
            <h2 class="text-lg font-extrabold text-cyan-300 truncate">
              {{ user.name || 'SmartBiz User' }}
            </h2>
            <span v-if="user.verified" class="text-yellow-300" aria-label="Verified">✔</span>
            <span v-if="user.role" class="ml-1 px-2 py-[2px] rounded-full text-[10px] bg-white/10 border border-white/15">
              {{ user.role }}
            </span>
          </div>

          <div class="flex items-center gap-2 text-sm">
            <button class="text-cyan-400 hover:underline truncate" @click="copyHandle" :title="handle">
              @{{ handle }}
            </button>
            <span v-if="user.location" class="text-white/60">• 📍 {{ user.location }}</span>
          </div>

          <p v-if="user.bio" class="mt-1 text-[13px] text-gray-200 line-clamp-2">
            {{ user.bio }}
          </p>
        </div>
      </div>

      <!-- Stats -->
      <div class="mt-4 grid grid-cols-4 gap-2 text-center">
        <div class="stat">
          <div class="num">{{ compact(user.followers) }}</div>
          <div class="lbl">Followers</div>
        </div>
        <div class="stat">
          <div class="num">{{ compact(user.following) }}</div>
          <div class="lbl">Following</div>
        </div>
        <div class="stat">
          <div class="num">🪙 {{ compact(user.coins) }}</div>
          <div class="lbl">Coins</div>
        </div>
        <div class="stat">
          <div class="num">Lv {{ user.level || 1 }}</div>
          <div class="lbl">Level</div>
        </div>
      </div>

      <!-- Level progress -->
      <div class="mt-2">
        <div class="h-2 rounded-full bg-white/10 overflow-hidden" role="progressbar"
             :aria-valuenow="levelPct" aria-valuemin="0" aria-valuemax="100">
          <div class="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" :style="{ width: levelPct + '%' }"></div>
        </div>
        <div class="mt-1 text-[11px] text-white/70">Next reward at {{ nextLevelAt }}</div>
      </div>

      <!-- Actions -->
      <div class="mt-3 grid grid-cols-3 gap-2">
        <template v-if="!isSelf">
          <button class="btn-primary" @click="$emit('follow', user)">➕ Follow</button>
          <button class="btn-soft" @click="$emit('message', user)">💬 Message</button>
          <button class="btn-soft" @click="shareProfile">📤 Share</button>
        </template>
        <template v-else>
          <button class="btn-primary" @click="$emit('edit', user)">✏️ Edit</button>
          <button class="btn-soft" @click="$emit('settings')">⚙ Settings</button>
          <button class="btn-soft" @click="shareProfile">📤 Share</button>
        </template>
      </div>

      <!-- Badges -->
      <div v-if="badges.length" class="mt-4">
        <h3 class="text-sm font-bold text-cyan-200 mb-2">🏅 Badges</h3>
        <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            v-for="(b,i) in badges"
            :key="i"
            class="badge"
            @click="$emit('badge', b)"
            :title="b.title || b.name"
          >
            <img v-if="b.icon" :src="b.icon" alt="" class="h-5 w-5 object-contain" />
            <span class="truncate">{{ b.name }}</span>
          </button>
        </div>
      </div>

      <!-- Joined info -->
      <div class="mt-3 text-[11px] text-white/60">
        <span v-if="user.joinedAt">Joined {{ formattedJoined }}</span>
      </div>
    </div>

    <!-- Skeleton (first load) -->
    <div v-if="loading" class="absolute inset-0 skeleton" aria-hidden="true"></div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/* PROPS */
const props = defineProps({
  user: {
    type: Object,
    default: () => ({
      name: 'Smart User',
      username: 'smart_user',
      avatar: '/user-avatar.png',
      bio: 'Welcome to SmartBiz',
      verified: true,
      role: 'Creator',
      followers: 12500,
      following: 86,
      coins: 23890,
      level: 7,
      levelProgress: 0.42, // 0..1
      nextLevelCoins: 1200,
      online: true,
      location: 'Dar es Salaam',
      joinedAt: '2023-05-14T10:00:00Z',
      badges: [{ name:'Top Fan', icon:'/badges/topfan.png' }, { name:'Pioneer', icon:'/badges/pioneer.png' }]
    })
  },
  isSelf: { type: Boolean, default: false }
})

/* EMITS */
defineEmits(['edit','settings','follow','message','badge','avatar','error'])

/* STATE */
const online = ref(navigator.onLine)
const fileEl = ref(null)
const localAvatar = ref('')
function onImgErr(e){ e.target.style.opacity = .7 }

/* NET listeners */
function onNet(){ online.value = navigator.onLine }
onMounted(() => { window.addEventListener('online', onNet); window.addEventListener('offline', onNet) })
onBeforeUnmount(() => { window.removeEventListener('online', onNet); window.removeEventListener('offline', onNet) })

/* Handle */
const handle = computed(() => props.user.username || 'username')

/* Safe-area */
const safeArea = { padding: 'env(safe-area-inset, 0px)' }

/* Cover gradient from username hash (deterministic) */
function hash(s){ let h=0; for (let i=0;i<s.length;i++) h=(h*31 + s.charCodeAt(i))|0; return Math.abs(h) }
const palette = [
  ['#06B6D4','#8B5CF6'],
  ['#22C55E','#14B8A6'],
  ['#F59E0B','#EF4444'],
  ['#0EA5E9','#10B981'],
  ['#A855F7','#F43F5E']
]
const coverStyle = computed(() => {
  const idx = hash(handle.value) % palette.length
  const [a,b] = palette[idx]
  return { background: `linear-gradient(135deg, ${a}, ${b})` }
})

/* Level progress & next target */
const levelPct = computed(() => Math.round(100 * (props.user.levelProgress ?? 0)))
const nextLevelAt = computed(() => `+${props.user.nextLevelCoins ?? 0} coins`)

/* Joined date */
const formattedJoined = computed(() => {
  try { return new Intl.DateTimeFormat(undefined, { year:'numeric', month:'short' }).format(new Date(props.user.joinedAt)) }
  catch { return props.user.joinedAt?.slice(0,10) || '' }
})

/* Badges */
const badges = computed(() => Array.isArray(props.user.badges) ? props.user.badges : [])

/* Copy handle */
async function copyHandle(){
  try { await navigator.clipboard?.writeText(`@${handle.value}`) } catch {}
}

/* Avatar upload (owner) */
function pickAvatar(){ fileEl.value?.click?.() }
function onFile(e){
  const f = e.target.files?.[0]; if (!f) return
  if (!f.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => { localAvatar.value = reader.result; }
  reader.readAsDataURL(f)
  // emit to parent for upload
  const file = f
  // Parent should handle actual upload & saving, then push new avatar URL via props
  // We still show optimistic preview (localAvatar)
  // notify parent:
  // eslint-disable-next-line vue/require-explicit-emits
  const ctx = getCurrentInstance?.()
  // (Not strictly needed; we already declared emits above)
  // Use direct emit:
  // @ts-ignore
  emit('avatar', file)
}

/* Helpers */
function compact(n){ if (n>=1e9) return (n/1e9).toFixed(1)+'B'; if (n>=1e6) return (n/1e6).toFixed(1)+'M'; if (n>=1e3) return (n/1e3).toFixed(1)+'K'; return String(n??0) }
</script>

<style scoped>
/* Stats */
.stat .num { @apply text-sm font-extrabold; }
.stat .lbl { @apply text-[11px] text-white/60; }

/* Buttons */
.btn-primary {
  @apply h-10 rounded-xl font-semibold bg-gradient-to-b from-cyan-600 to-indigo-700
         border border-white/10 shadow active:translate-y-[1px];
}
.btn-soft {
  @apply h-10 rounded-xl border border-white/10 bg-white/10 text-white active:translate-y-[1px];
}

/* Badges */
.badge {
  @apply flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15
         text-xs whitespace-nowrap active:scale-[.98];
}

/* Skeleton */
.skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,.06) 25%, rgba(255,255,255,.12) 37%, rgba(255,255,255,.06) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.2s linear infinite;
}
@keyframes shimmer { 0%{ background-position:100% 0 } 100%{ background-position:0 0 } }

/* Transitions */
.fade-enter-active,.fade-leave-active { transition: opacity .18s ease }
.fade-enter-from,.fade-leave-to { opacity: 0 }

/* Utility */
.scrollbar-hide::-webkit-scrollbar { display: none }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none }
</style>
