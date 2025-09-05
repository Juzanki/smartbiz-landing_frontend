<template>
  <div class="min-h-screen px-4 py-8 md:px-10 bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white relative overflow-hidden">
    
    <!-- ✨ Floating Glimmer Layer -->
    <div class="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle,_rgba(255,255,255,0.2)_1px,_transparent_1px)] [background-size:20px_20px] animate-glide"></div>

    <div class="max-w-6xl mx-auto space-y-16 relative z-10">
      <!-- Header -->
      <div class="text-center animate-fadeInDown">
        <h1 class="text-4xl font-extrabold text-cyan-400 tracking-wide animate-glow">
          👤 My Account
        </h1>
        <p class="text-sm text-gray-300 mt-2">Manage your profile, tools, and wallet from one smart place.</p>
      </div>

      <!-- Sections -->
      <section v-for="section in accountSections" :key="section.title" class="animate-fadeInUp">
        <h2 class="text-2xl font-bold text-cyan-300 mb-5 border-b border-cyan-800 pb-2">
          {{ section.title }}
        </h2>

        <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          <RouterLink
            v-for="item in section.items"
            :key="item.path"
            :to="item.path"
            class="card-link-glow"
          >
            <div class="text-2xl group-hover:scale-110 transform transition duration-300 ease-in-out">
              {{ item.icon }}
            </div>
            <div>
              <h4 class="text-base font-semibold">
                {{ item.label }}
              </h4>
            </div>
          </RouterLink>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const token = localStorage.getItem('access_token')
onMounted(() => {
  if (!token) router.replace('/login')
})

const accountSections = ref([
  {
    title: '💰 Wallet & Transactions',
    items: [
      { icon: '💼', label: 'SmartCoin Wallet', path: '/wallet' },
      { icon: '➕', label: 'Recharge Wallet', path: '/wallet/recharge' },
      { icon: '📤', label: 'Withdraw Request', path: '/wallet/withdraw' },
      { icon: '🏆', label: 'Loyalty Rewards', path: '/loyalty' }
    ]
  },
  {
    title: '👤 Profile & Identity',
    items: [
      { icon: '🧍', label: 'View Profile', path: '/profile' },
      { icon: '🧬', label: 'My Profile', path: '/profile/my' }, // ✅ Correct path
      { icon: '⚙️', label: 'Profile Settings', path: '/profile/settings' },
      { icon: '✅', label: 'Verify Account', path: '/verify' }
    ]
  },
  {
    title: '🆘 Support Center',
    items: [
      { icon: '📨', label: 'Support Inbox', path: '/support/inbox' },
      { icon: '📄', label: 'Support Requests', path: '/support/requests' }
    ]
  },
  {
    title: '🧠 Tools & Features',
    items: [
      { icon: '🤖', label: 'AI Assistant', path: '/assistant' },
      { icon: '🎁', label: 'Gift Shop', path: '/gift-shop' },
      { icon: '🎨', label: 'Promo Materials', path: '/promo-material' },
      { icon: '🧑‍🤝‍🧑', label: 'Referral Campaign', path: '/referral-builder' }
    ]
  },
  {
    title: '📜 Activity & Logs',
    items: [
      { icon: '📒', label: 'My Logs', path: '/my-logs' },
      { icon: '📊', label: 'Activity Log', path: '/activity-log' }
    ]
  }
])
</script>

<style scoped>
/* 🔮 Neon Glow Animation */
@keyframes glowPulse {
  0% { box-shadow: 0 0 10px #0ff; }
  50% { box-shadow: 0 0 20px #22d3ee, 0 0 30px #22d3ee; }
  100% { box-shadow: 0 0 10px #0ff; }
}

@keyframes rotateRing {
  0% { transform: rotate(0deg) translateY(0); }
  100% { transform: rotate(360deg) translateY(0); }
}

@keyframes glide {
  0% { background-position: 0 0; }
  100% { background-position: 40px 40px; }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-glow {
  animation: glowPulse 3s infinite ease-in-out;
}
.animate-fadeInUp {
  animation: fadeInUp 1s ease forwards;
}
.animate-fadeInDown {
  animation: fadeInDown 1s ease forwards;
}
.animate-glide {
  animation: glide 20s linear infinite;
}

.card-link-glow {
  @apply bg-[#1e293b] border border-gray-700 rounded-xl p-5 flex items-start gap-3
         text-white transition-all duration-300 ease-in-out hover:scale-105;
  text-decoration: none;
  position: relative;
  overflow: hidden;
}
.card-link-glow:hover {
  background-color: rgba(14, 165, 233, 0.1);
  border-color: #22d3ee;
  color: #22d3ee;
  animation: glowPulse 2s infinite ease-in-out;
}
.card-link-glow:hover h4 {
  color: #22d3ee;
}

.card-link-glow::before {
  content: "";
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%);
  transform: rotate(25deg);
  animation: rotateRing 10s linear infinite;
  pointer-events: none;
  z-index: 0;
}
</style>

