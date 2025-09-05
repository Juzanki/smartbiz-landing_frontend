<template>
  <transition name="fade">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 bg-black/60 md:bg-black/50"
      @click.self="close"
    >
      <!-- Bottom sheet (mobile) / Centered dialog (md+) -->
      <section
        ref="sheet"
        class="fixed md:static bottom-0 md:bottom-auto inset-x-0 md:inset-auto
               mx-auto w-full md:max-w-3xl
               bg-white text-black rounded-t-3xl md:rounded-2xl
               shadow-2xl overflow-hidden
               md:mt-16"
        :class="[
          'max-h-[88vh] md:max-h-[80vh]',
          'transition-transform duration-200',
        ]"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd"
      >
        <!-- Handle / header -->
        <header class="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5">
          <div class="flex items-center justify-between px-4 pt-3 pb-2">
            <div class="mx-auto md:mx-0 h-1.5 w-14 rounded-full bg-black/10 md:hidden" />
            <h2 class="hidden md:block text-base font-bold">👥 Manage Guests</h2>
            <button
              @click="close"
              class="p-2 rounded-full hover:bg-black/5 active:scale-95"
              aria-label="Close"
            >
              ✖
            </button>
          </div>

          <!-- Tabs (scrollable on mobile) -->
          <nav class="px-3 pb-3 md:pb-4">
            <div class="flex gap-2 overflow-x-auto no-scrollbar">
              <button
                v-for="t in tabs"
                :key="t"
                @click="currentTab = t"
                class="px-3 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition"
                :class="currentTab === t
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'"
              >
                {{ t }}
                <span
                  v-if="t==='Requests' && requestsCount>0"
                  class="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] leading-[18px] bg-amber-300 text-black font-bold"
                >{{ requestsCount }}</span>
              </button>
            </div>
          </nav>
        </header>

        <!-- Content -->
        <main class="px-3 md:px-6 py-3 md:py-6 overflow-y-auto max-h-[calc(88vh-96px)] md:max-h-[calc(80vh-112px)]">
          <GuestInvitePopup v-if="currentTab === 'Invite'" />
          <GuestRequestList v-else-if="currentTab === 'Requests'" />
          <GuestLiveSlot v-else-if="currentTab === 'Live Guests'" :guest="demoGuest" :stream="demoStream" />
          <RequestToJoin v-else-if="currentTab === 'Request To Join'" />
          <GuestJoinNotification v-else-if="currentTab === 'Notifications'" :guest="demoGuest" :stream="demoStream" />
        </main>
      </section>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

import GuestInvitePopup from './GuestInvitePopup.vue'
import GuestRequestList from './GuestRequestList.vue'
import GuestLiveSlot from './GuestLiveSlot.vue'
import RequestToJoin from './RequestToJoin.vue'
import GuestJoinNotification from './GuestJoinNotification.vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  requestsCount?: number
}>(), {
  requestsCount: 0
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const tabs = ['Invite', 'Requests', 'Live Guests', 'Request To Join', 'Notifications']
const currentTab = ref('Invite')

const demoGuest = ref({ name: 'Guest A' })
const demoStream = ref({ title: 'Engagement Talk' })

function close() { emit('update:modelValue', false) }

/* ESC to close (desktop) */
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))

/* Swipe-down to close (mobile) */
const sheet = ref<HTMLElement | null>(null)
let startY = 0, currentY = 0, dragging = false
function onTouchStart(e: TouchEvent) {
  startY = e.touches[0].clientY; dragging = true
}
function onTouchMove(e: TouchEvent) {
  if (!dragging || !sheet.value) return
  currentY = e.touches[0].clientY
  const delta = Math.max(0, currentY - startY)
  sheet.value.style.transform = `translateY(${delta}px)`
}
function onTouchEnd() {
  if (!sheet.value) return
  const delta = Math.max(0, currentY - startY)
  sheet.value.style.transform = ''
  dragging = false
  if (delta > 120) close()
}

/* reset tab when opened */
watch(() => props.modelValue, v => { if (v) currentTab.value = 'Invite' })
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.fade-enter-active, .fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
