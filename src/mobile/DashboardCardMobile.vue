<template>
  <div
    class="bg-white p-4 md:p-6 rounded-xl shadow hover:shadow-md transition-all duration-300 text-center flex flex-col items-center justify-center"
  >
    <!-- Icon -->
    <div class="text-4xl md:text-5xl mb-2">{{ icon }}</div>

    <!-- Title -->
    <h4 class="text-sm md:text-base font-semibold text-gray-800">{{ title }}</h4>

    <!-- Value -->
    <p class="text-primary text-base md:text-xl font-bold mt-1">{{ value }}</p>
  </div>
</template>

<script setup>
defineProps({
  icon: String,
  title: String,
  value: String
})
</script>

