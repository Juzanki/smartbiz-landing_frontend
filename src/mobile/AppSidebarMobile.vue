<template>
  <aside class="fixed inset-y-0 left-0 w-20 bg-gradient-to-b from-blue-900 to-blue-800 text-white p-4 shadow-lg z-50 flex flex-col items-center">
    <!-- Logo -->
    <div class="mb-8">
      <img
        src="@/assets/logo-circle.png"
        alt="SmartBiz Logo"
        class="w-12 h-12 rounded-full shadow border-2 border-yellow-400 bg-white object-contain"
      />
    </div>

    <!-- Navigation Icons Only -->
    <nav class="flex flex-col items-center space-y-6">
      <router-link
        v-for="link in navLinks"
        :key="link.name"
        :to="link.path"
        class="text-2xl hover:text-yellow-400 transition duration-200"
        active-class="text-yellow-400"
      >
        <span>{{ link.icon }}</span>
      </router-link>
    </nav>

    <!-- Optional: Back Button Icon at Bottom -->
    <div class="mt-auto pt-6">
      <button class="text-2xl hover:text-yellow-400 transition duration-200" @click="$router.back()">
        ‹
      </button>
    </div>
  </aside>
</template>

<script setup>
const navLinks = [
  { name: "Workspace", path: "/dashboard", icon: "🏠" },
  { name: "Autoresponder", path: "/autoresponder", icon: "🤖" },
  { name: "Analytics", path: "/analytics", icon: "📊" },
  { name: "Billing", path: "/billing", icon: "💳" },
  { name: "Settings", path: "/settings", icon: "⚙️" }
];
</script>

