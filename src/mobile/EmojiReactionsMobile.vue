<template>
  <div class="fixed bottom-20 right-4 z-30 flex gap-2">
    <span
      v-for="emoji in emojis"
      :key="emoji"
      @click="react(emoji)"
      class="cursor-pointer text-2xl hover:scale-125 transition"
    >
      {{ emoji }}
    </span>
  </div>
</template>

<script setup>
const emojis = ['😂', '🔥', '❤️', '👏', '😮']
const emit = defineEmits(['reaction'])

function react(emoji) {
  emit('reaction', emoji)
  // TODO: Ongeza animation ya emoji kuruka (fly up)
}
</script>

