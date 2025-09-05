<!-- src/components/Sidebar.vue -->
<template>
  <transition name="slide">
    <aside
      v-if="show || !isMobile"
      :class="[
        'bg-primary text-white z-50',
        isMobile
          ? 'fixed top-0 left-0 h-full w-64 p-5 transform transition-transform duration-300 ease-in-out shadow-lg'
          : 'w-64 p-4 shadow-md',
        show ? 'translate-x-0' : '-translate-x-full',
        'md:relative md:translate-x-0'
      ]"
    >
      <!-- ❌ Close Button for Mobile -->
      <div v-if="isMobile" class="flex justify-end mb-4">
        <button @click="$emit('close')" class="text-white text-2xl hover:text-yellow-400">
          &times;
        </button>
      </div>

      <!-- 🔘 Brand -->
      <div class="flex items-center mb-6">
        
        <span class="text-xl font-bold text-yellow-400 hidden md:inline">SmartBiz</span>
      </div>

      <!-- 🔗 Navigation -->
      <nav>
        <ul class="space-y-2">
          <li
            v-for="link in navLinks"
            :key="link.name"
            class="w-full"
          >
            <router-link
              :to="link.path"
              class="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-white hover:text-primary"
              :class="{
                'bg-yellow-400 text-black font-semibold shadow': $route.path === link.path
              }"
            >
              <span class="text-xl">{{ link.icon }}</span>
              <span class="capitalize text-sm hidden md:inline">{{ $t(link.name) }}</span>
            </router-link>
          </li>
        </ul>
      </nav>

      <!-- 📅 Footer -->
      <footer class="text-xs text-center opacity-70 mt-10 hidden md:block">
        &copy; {{ new Date().getFullYear() }} SmartBiz
      </footer>
    </aside>
  </transition>
</template>

<script setup>
import { useRoute } from 'vue-router'

defineProps({
  show: Boolean,
  navLinks: Array,
  isMobile: Boolean
})

const route = useRoute()
</script>

<style scoped>
/* 🌀 Slide Transition */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease-in-out;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>

