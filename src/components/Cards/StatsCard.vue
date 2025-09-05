<template>
  <div
    class="stat-card relative w-full rounded-2xl p-5 flex flex-col items-center justify-center text-center
           bg-gradient-to-br from-white via-white to-gray-50 shadow-sm
           active:scale-[0.98] select-none"
    @click="onTap"
    @pointerdown="ripple"
  >
    <!-- Glow background -->
    <span class="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-50 via-transparent to-purple-50 pointer-events-none"></span>
    <!-- Sheen -->
    <span class="sheen pointer-events-none absolute inset-0 rounded-2xl"></span>

    <!-- Icon -->
    <div class="text-4xl mb-2 drop-shadow-sm">{{ icon }}</div>

    <!-- Value -->
    <div class="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1">
      {{ value }}
    </div>

    <!-- Title -->
    <div class="text-gray-500 text-[11px] font-semibold uppercase tracking-widest">
      {{ title }}
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  title: String,
  value: [String, Number],
  icon: String
})

function onTap() {
  // Hapa unaweza kuweka logic ya tap, au emit event
  console.log(`Tapped on ${props.title}`)
}

function ripple(e) {
  const target = e.currentTarget
  const circle = document.createElement('span')
  const diameter = Math.max(target.clientWidth, target.clientHeight)
  const radius = diameter / 2
  circle.style.width = circle.style.height = `${diameter}px`
  circle.style.left = `${e.clientX - target.offsetLeft - radius}px`
  circle.style.top = `${e.clientY - target.offsetTop - radius}px`
  circle.classList.add('ripple')
  target.appendChild(circle)
  setTimeout(() => circle.remove(), 600)
}
</script>

<style scoped>
/* Sheen animation */
.sheen::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent, rgba(255,255,255,0.3), transparent);
  transform: translateX(-100%);
  animation: sheenMove 3s infinite;
}
@keyframes sheenMove {
  0% { transform: translateX(-100%); }
  60% { transform: translateX(100%); }
  100% { transform: translateX(100%); }
}

/* Ripple effect */
.ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(0, 149, 255, 0.15);
  transform: scale(0);
  animation: ripple 0.6s linear;
  pointer-events: none;
}
@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

/* Mobile-first adjustments */
.stat-card {
  min-height: 120px;
  transition: all 0.2s ease;
}
@media (min-width: 640px) {
  .stat-card {
    min-height: 140px;
    padding: 1.75rem;
  }
}
</style>
