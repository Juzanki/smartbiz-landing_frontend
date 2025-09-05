<template>
  <div class="bg-[#0f172a] p-6 rounded-xl border border-cyan-700">
    <h2 class="text-xl font-bold text-cyan-200 mb-4">❤️ Likes</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-sm text-gray-300">
      <div
        class="like-card"
        v-for="like in likedUsers"
        :key="like.username"
      >
        <div class="bg-[#1e293b] rounded-lg p-3 flex items-center gap-3 hover:bg-cyan-900/10 transition">
          <img
            :src="like.avatar"
            alt="user"
            class="w-10 h-10 rounded-full border border-cyan-500 object-cover"
          />
          <div>
            <p class="text-white font-medium">{{ like.username }}</p>
            <span class="text-xs text-gray-400">{{ like.reaction }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const likedUsers = [
  {
    username: '@esther_art',
    avatar: '/avatars/esther.png',
    reaction: '🔥 Loved your AI Course',
  },
  {
    username: '@alpha_marketer',
    avatar: '/avatars/alpha.png',
    reaction: '❤️ Great Livestream!'
  },
  {
    username: '@nash_tech',
    avatar: '/avatars/nash.png',
    reaction: '👏 Business tips were gold!'
  }
]
</script>

<style scoped>
.like-card img {
  box-shadow: 0 0 8px rgba(34, 211, 238, 0.3);
}
.like-card:hover {
  transform: translateY(-2px);
}
</style>

