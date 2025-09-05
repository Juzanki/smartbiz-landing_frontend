<template>
  <transition name="fade">
    <div v-if="product" :class="['absolute z-20', positionClass]">
      <div class="bg-white text-black bg-opacity-90 rounded shadow p-3 animate-bounce w-40">
        <img :src="product.image" class="w-full h-24 object-cover rounded mb-2" />
        <div class="text-sm font-semibold truncate">{{ product.name }}</div>
        <div class="text-green-600 font-bold text-sm">TZS {{ product.price }}</div>
        <button @click="onBuy" class="btn-primary text-xs mt-1 w-full">Buy Now</button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  product: Object
})
const emit = defineEmits(['buy'])

const positionClass = computed(() => {
  switch (props.product?.position) {
    case 'top':
      return 'top-10 left-1/2 transform -translate-x-1/2'
    case 'center':
      return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
    case 'bottom':
    default:
      return 'bottom-16 left-1/2 transform -translate-x-1/2'
  }
})

function onBuy() {
  emit('buy', props.product)
}
</script>

