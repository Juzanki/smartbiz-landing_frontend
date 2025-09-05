<template>
  <!-- 🧼 Clean wrapper without any top header -->
  <div :class="themeClass">
    <router-view />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

/* 🌓 Detect & Apply Theme (without showing selector) */
const detectSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const theme = ref(localStorage.getItem('theme') || detectSystemTheme())
const themeClass = computed(() => (theme.value === 'dark' ? 'theme-dark' : 'theme-light'))

const applyTheme = () => {
  document.body.className = themeClass.value
  localStorage.setItem('theme', theme.value)
}

onMounted(() => {
  applyTheme()
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      theme.value = e.matches ? 'dark' : 'light'
      applyTheme()
    }
  })
})
</script>

<style scoped>
/* 🌞 & 🌙 Global Theme Variables */
.theme-light {
  --bg-color: #ffffff;
  --text-color: #111827;
}
.theme-dark {
  --bg-color: #0f172a;
  --text-color: #e2e8f0;
}

body {
  background-color: var(--bg-color);
  color: var(--text-color);
  transition: background-color 0.3s ease, color 0.3s ease;
}
</style>
