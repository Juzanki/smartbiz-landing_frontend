<template>
  <div class="relative inline-block text-left" @click="toggleMenu">
    <!-- Profile Display -->
    <div
      :class="[
        'flex items-center gap-3 cursor-pointer transition duration-200 ease-in-out',
        small ? 'text-sm' : 'text-base'
      ]"
    >
      <img
        :src="avatar"
        alt="User Avatar"
        :class="[
          'rounded-full border-2 shadow-md object-cover transition-all duration-300',
          small ? 'w-8 h-8 border-gray-300' : 'w-10 h-10 border-white',
          'hover:shadow-xl hover:scale-105'
        ]"
      />
      <div class="flex items-center gap-2">
        <span :class="['font-semibold', darkMode ? 'text-white' : 'text-gray-900']">
          {{ displayName }}
        </span>
        <i
          v-if="isVerified"
          class="i-tabler-badge-check text-blue-500"
          :class="[small ? 'text-sm' : 'text-base']"
          title="Verified User"
        />
        <!-- 🏅 Role Badge -->
        <span
          v-if="roleBadge"
          :class="[
            'px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1',
            badgeClass
          ]"
        >
          <span>{{ roleEmoji }}</span>
          {{ roleBadge }}
        </span>
      </div>
    </div>

    <!-- Dropdown Menu -->
    <div
      v-if="showMenu"
      class="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-xl z-50 animate-fade-in"
    >
      <ul class="py-2">
        <li>
          <router-link
            to="/profile"
            class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            👤 View Profile
          </router-link>
        </li>
        <li>
          <router-link
            to="/profile/settings"
            class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ⚙️ Settings
          </router-link>
        </li>
        <li>
          <button
            @click="logout"
            class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-800"
          >
            🚪 Logout
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  small: Boolean
})

const router = useRouter()
const userStore = useUserStore()

const displayName = computed(() => userStore.displayName)
const avatar = computed(() => userStore.avatar)
const isVerified = computed(() => userStore.isVerified)
const role = computed(() => localStorage.getItem('user_role') || '')

const darkMode = computed(() =>
  window.matchMedia('(prefers-color-scheme: dark)').matches
)

const showMenu = ref(false)
const toggleMenu = () => (showMenu.value = !showMenu.value)

const handleClickOutside = (e) => {
  if (!e.target.closest('.inline-block')) showMenu.value = false
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

const logout = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('user_role')
  userStore.clearUser()
  router.push('/login')
}

// Role Badge Name
const roleBadge = computed(() => {
  switch (role.value) {
    case 'owner':
      return 'Owner'
    case 'admin':
      return 'Admin'
    case 'vip':
      return 'VIP'
    case 'user':
      return 'User'
    default:
      return ''
  }
})

// Role Badge Style Class
const badgeClass = computed(() => {
  switch (role.value) {
    case 'owner':
      return 'bg-purple-600 text-white'
    case 'admin':
      return 'bg-blue-600 text-white'
    case 'vip':
      return 'bg-yellow-400 text-black'
    case 'user':
      return 'bg-gray-400 text-white'
    default:
      return 'bg-gray-300 text-black'
  }
})

// Role Emoji
const roleEmoji = computed(() => {
  switch (role.value) {
    case 'owner':
      return '👑'
    case 'admin':
      return '🛠️'
    case 'vip':
      return '💎'
    case 'user':
      return '🙋‍♂️'
    default:
      return ''
  }
})
</script>

<style scoped>
@keyframes fade-in {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
</style>

