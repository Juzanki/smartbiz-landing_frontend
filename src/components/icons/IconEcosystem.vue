<template>
  <div class="relative flex items-center justify-center w-16 h-16">
    <!-- Glowing Aura Background -->
    <div class="absolute inset-0 rounded-full animate-pulse-slow bg-gradient-to-tr from-purple-500 via-pink-400 to-yellow-300 opacity-60 blur-xl"></div>

    <!-- Floating Particles -->
    <div class="absolute inset-0 overflow-visible">
      <span v-for="n in 8" :key="n"
        class="absolute w-1 h-1 bg-white rounded-full animate-particle"
        :style="particleStyle(n)">
      </span>
    </div>

    <!-- Main Icon -->
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="relative z-10 animate-breath"
      width="36"
      height="36"
      viewBox="0 0 20 20"
      fill="url(#spiritualGradient)"
    >
      <defs>
        <linearGradient id="spiritualGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFD700" />
          <stop offset="50%" stop-color="#9b5de5" />
          <stop offset="100%" stop-color="#00f5d4" />
        </linearGradient>
      </defs>
      <path
        d="M11.447 8.894a1 1 0 1 0-.894-1.789l.894 1.789zm-2.894-.789a1 1 0 1 0 .894 1.789l-.894-1.789zm0 1.789a1 1 0 1 0 .894-1.789l-.894 1.789zM7.447 7.106a1 1 0 1 0-.894 1.789l.894-1.789zM10 9a1 1 0 1 0-2 0h2zm-2 2.5a1 1 0 1 0 2 0H8zm9.447-5.606a1 1 0 1 0-.894-1.789l.894 1.789zM0 5v2.5h2V5H0z"
      />
    </svg>
  </div>
</template>

<script setup>
const particleStyle = (n) => {
  const angle = (n / 8) * Math.PI * 2
  const radius = 18
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius
  const delay = `${n * 0.2}s`
  return {
    transform: `translate(${x}px, ${y}px)`,
    animationDelay: delay
  }
}
</script>

<style scoped>
@keyframes particleMove {
  0%, 100% { transform: scale(0.8) translateY(0); opacity: 0.6; }
  50% { transform: scale(1.2) translateY(-4px); opacity: 1; }
}
@keyframes breath {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
.animate-particle {
  animation: particleMove 2.5s infinite ease-in-out;
}
.animate-breath {
  animation: breath 3s infinite ease-in-out;
}
.animate-pulse-slow {
  animation: pulse 4s infinite ease-in-out;
}
@keyframes pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.2); }
}
</style>
