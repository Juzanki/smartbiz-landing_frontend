<template>
  <div
    class="group bg-gradient-to-br from-white to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between hover:scale-[1.03] transition-transform duration-300 relative overflow-hidden"
  >
    <!-- Kichwa cha kifurushi -->
    <div>
      <div class="flex justify-between items-center mb-2">
        <h2 class="text-xl font-bold text-indigo-700 dark:text-indigo-300">
          {{ pkg.name }}
        </h2>
        <span
          class="text-xs px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-700 dark:text-white text-indigo-700 font-medium tracking-wide shadow-sm"
        >
          AI Package
        </span>
      </div>

      <!-- Maelezo -->
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
        {{ pkg.description }}
      </p>

      <!-- Bei -->
      <div class="text-sm text-gray-700 dark:text-gray-200 mb-4 space-y-1">
        <div>
          💸 <span class="font-semibold">Monthly:</span>
          <span class="text-indigo-600 dark:text-indigo-400">{{ formatPrice(pkg.price_monthly) }}</span>
        </div>
        <div>
          📅 <span class="font-semibold">Yearly:</span>
          <span class="text-indigo-600 dark:text-indigo-400">{{ formatPrice(pkg.price_yearly) }}</span>
        </div>
      </div>

      <!-- Vipengele -->
      <ul class="text-sm text-gray-600 dark:text-gray-300 list-disc pl-5 mb-5 leading-relaxed">
        <li v-for="(feature, i) in pkg.features" :key="i" class="hover:text-indigo-500 transition">
          ✅ {{ feature }}
        </li>
      </ul>
    </div>

    <!-- Kitufe cha kuchagua -->
    <button
      class="mt-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-semibold transition-colors w-full shadow-md group-hover:shadow-xl"
      @click="selectPackage"
    >
      🚀 Chagua Package
    </button>

    <!-- Background glow effect -->
    <div
      class="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition duration-500 blur-xl"
    >
      <div class="absolute -inset-2 bg-indigo-400 opacity-10 rounded-2xl"></div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  pkg: {
    type: Object,
    required: true
  }
})

const router = useRouter()

const formatPrice = (amount) => `Tsh ${amount.toLocaleString()}`

const selectPackage = () => {
  router.push({ path: '/bots/create', query: { package: props.pkg.name } })
}
</script>

