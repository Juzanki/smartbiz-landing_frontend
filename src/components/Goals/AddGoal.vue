<template>
  <div
    class="relative backdrop-blur-lg bg-white/10 border border-white/20 rounded-3xl p-5 w-full max-w-md mx-auto shadow-2xl text-white space-y-5 animate-fade-in"
  >
    <!-- Animated Border Glow -->
    <div class="absolute inset-0 rounded-3xl border-2 border-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-border-glow -z-10"></div>

    <!-- Title -->
    <h2 class="text-xl font-bold flex items-center gap-2 text-pink-200">
      🎯 Add Live Goal
    </h2>

    <!-- Goal Type -->
    <div>
      <label class="block text-sm text-white/80 mb-1">Goal Type</label>
      <select
        v-model="goal.type"
        class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
      >
        <option value="coins">🏅 Coin Target</option>
        <option value="sales">🛍 Product Sales</option>
        <option value="likes">❤️ Viewer Likes</option>
        <option value="comments">💬 Comment Milestone</option>
        <option value="gifts">🎁 Gift Quantity</option>
      </select>
    </div>

    <!-- Target -->
    <div>
      <label class="block text-sm text-white/80 mb-1">Target Amount</label>
      <input
        type="number"
        v-model.number="goal.target"
        min="1"
        placeholder="Enter target value..."
        class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-pink-400"
      />
    </div>

    <!-- Description -->
    <div>
      <label class="block text-sm text-white/80 mb-1">Short Description (Optional)</label>
      <input
        v-model="goal.description"
        placeholder="E.g. Let's reach 1000 coins together!"
        class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-pink-400"
      />
    </div>

    <!-- Set Goal Button -->
    <div class="text-center">
      <button
        @click="submitGoal"
        class="bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 px-8 py-3 rounded-full font-semibold hover:scale-105 active:scale-95 transition-transform duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
      >
        ✅ Set Goal
      </button>
    </div>

    <!-- 🎉 Preview -->
    <transition name="fade">
      <div v-if="goalSet" class="space-y-4">
        <div class="bg-green-100/10 border border-green-400 text-green-300 p-3 rounded-xl shadow-inner">
          🎉 Goal Set: <strong>{{ previewText }}</strong>
        </div>

        <!-- 📊 Progress Bar -->
        <div class="w-full bg-white/10 rounded-full h-4 overflow-hidden">
          <div
            :style="{ width: progressPercent + '%' }"
            class="h-full transition-all duration-500 bg-gradient-to-r from-green-400 via-lime-400 to-emerald-500 animate-progress-glow"
          ></div>
        </div>

        <!-- 💖 Contributors -->
        <div>
          <p class="text-sm font-semibold mb-1">🌟 Top Supporters</p>
          <ul class="text-xs space-y-1">
            <li v-for="user in supporters" :key="user.name" class="flex justify-between">
              <span>- {{ user.name }}</span>
              <span class="text-green-300">{{ user.amount }}</span>
            </li>
          </ul>
        </div>

        <!-- 🏆 Leaderboard -->
        <div>
          <p class="text-sm font-semibold mb-1">🏆 Leaderboard</p>
          <ol class="text-xs list-decimal pl-4 space-y-1">
            <li v-for="(user, index) in leaderboard" :key="index">
              {{ user.name }} — {{ user.amount }} {{ goal.type }}
            </li>
          </ol>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const emit = defineEmits(['close'])

const goal = reactive({
  type: 'coins',
  target: 0,
  description: ''
})

const goalSet = ref(false)
const progress = ref(0)
const supporters = ref([
  { name: 'Alice', amount: 250 },
  { name: 'Bob', amount: 120 },
  { name: 'Zaki', amount: 80 }
])
const leaderboard = computed(() =>
  supporters.value.sort((a, b) => b.amount - a.amount)
)

const submitGoal = () => {
  if (!goal.target || goal.target <= 0) {
    alert('⚠️ Please set a valid target!')
    return
  }
  goalSet.value = true
  progress.value = Math.floor(Math.random() * goal.target) // simulate

  setTimeout(() => {
    emit('close')
  }, 2000)
}

const previewText = computed(() => {
  const desc = goal.description ? ` (${goal.description})` : ''
  switch (goal.type) {
    case 'coins':
      return `Get ${goal.target} coins${desc}`
    case 'sales':
      return `Sell ${goal.target} products${desc}`
    case 'likes':
      return `Get ${goal.target} likes${desc}`
    case 'comments':
      return `Reach ${goal.target} comments${desc}`
    case 'gifts':
      return `Receive ${goal.target} gifts${desc}`
    default:
      return `Set target: ${goal.target}${desc}`
  }
})

const progressPercent = computed(() => {
  return Math.min((progress.value / goal.target) * 100, 100).toFixed(1)
})
</script>

<style scoped>
/* Fade In Up Animation */
.animate-fade-in {
  animation: fadeInUp 0.6s ease-out;
}
@keyframes fadeInUp {
  0% {
    transform: translateY(12px);
    opacity: 0;
  }
  100% {
    transform: translateY(0px);
    opacity: 1;
  }
}

/* Animated border glow */
@keyframes borderGlow {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 200% 50%;
  }
}
.animate-border-glow {
  background-size: 200% 200%;
  animation: borderGlow 4s linear infinite;
  filter: drop-shadow(0 0 10px rgba(255,255,255,0.2));
}

/* Progress glow */
@keyframes progressGlow {
  0%, 100% {
    filter: drop-shadow(0 0 5px rgba(34,197,94,0.6));
  }
  50% {
    filter: drop-shadow(0 0 15px rgba(34,197,94,0.8));
  }
}
.animate-progress-glow {
  animation: progressGlow 2s ease-in-out infinite;
}

/* Fade transition for preview */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
