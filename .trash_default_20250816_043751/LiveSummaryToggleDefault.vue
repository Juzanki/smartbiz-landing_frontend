<template>
  <button @click="toggleSummary" class="icon-btn">
    📝 Summary
  </button>
</template>

<script setup>
import { inject } from 'vue'

const showLiveSummary = inject('showLiveSummary')
const toggleSummary = () => {
  showLiveSummary.value = !showLiveSummary.value
}
</script>

