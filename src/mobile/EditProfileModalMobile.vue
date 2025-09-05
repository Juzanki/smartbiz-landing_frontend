<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div class="bg-[#0f172a] w-full max-w-md mx-auto p-6 rounded-xl border border-cyan-700 shadow-2xl animate-fadeInUp">
      <h2 class="text-xl font-bold text-cyan-300 mb-5">✏️ Edit Your Profile</h2>
      <form @submit.prevent="saveChanges" class="space-y-5">

        <!-- Select Preferred Name Display -->
        <div>
          <label class="block text-sm text-gray-300 mb-1">Display Name Type</label>
          <select v-model="useUsername" class="input bg-[#1e293b]">
            <option :value="false">Full Name</option>
            <option :value="true">Username</option>
          </select>
        </div>

        <!-- Full Name -->
        <div>
          <label class="block text-sm text-gray-300 mb-1">Full Name</label>
          <input v-model="form.name" type="text" class="input" placeholder="Enter your full name" />
        </div>

        <!-- Username -->
        <div>
          <label class="block text-sm text-gray-300 mb-1">Username (e.g. @yourname)</label>
          <input v-model="form.username" type="text" class="input" placeholder="@username" />
        </div>

        <!-- Bio -->
        <div>
          <label class="block text-sm text-gray-300 mb-1">Short Bio</label>
          <textarea v-model="form.bio" rows="3" class="input" placeholder="Tell us about yourself..."></textarea>
        </div>

        <!-- Avatar Upload -->
        <div>
          <label class="block text-sm text-gray-300 mb-1">Profile Photo</label>
          <input type="file" accept="image/*" @change="handleAvatarUpload" class="file-input" />
          <div v-if="previewUrl" class="mt-3 flex items-center gap-3">
            <img :src="previewUrl" class="w-16 h-16 rounded-full border-2 border-cyan-500 object-cover shadow" />
            <span class="text-sm text-cyan-400 animate-pulse" v-if="form.avatar">📸 New avatar selected</span>
          </div>
        </div>

        <!-- Buttons -->
        <div class="flex justify-between items-center mt-6">
          <button type="button" @click="close" class="btn-dark">❌ Cancel</button>
          <button type="submit" class="btn-cyan flex items-center gap-2">
            <span v-if="loading" class="loader"></span>
            <span>{{ loading ? 'Saving...' : '✅ Save' }}</span>
          </button>
        </div>

      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: Boolean,
  user: Object
})
const emit = defineEmits(['update', 'close'])

const form = ref({
  name: '',
  username: '',
  bio: '',
  avatar: null
})
const useUsername = ref(false)
const previewUrl = ref(null)
const loading = ref(false)

watch(() => props.user, (newUser) => {
  if (newUser) {
    form.value.name = newUser.name || ''
    form.value.username = newUser.username || ''
    form.value.bio = newUser.bio || ''
    previewUrl.value = newUser.avatar || '/user-avatar.png'
    form.value.avatar = null
  }
}, { immediate: true })

function handleAvatarUpload(event) {
  const file = event.target.files[0]
  if (file) {
    form.value.avatar = file
    previewUrl.value = URL.createObjectURL(file)
  }
}

function close() {
  emit('close')
}

async function saveChanges() {
  loading.value = true
  setTimeout(() => {
    const finalName = useUsername.value ? form.value.username : form.value.name
    emit('update', {
      ...form.value,
      displayName: finalName
    })
    loading.value = false
    alert('✅ Profile updated successfully!')
    close()
  }, 1200)
}
</script>

<style scoped>
.input {
  @apply w-full px-3 py-2 rounded-md bg-[#1e293b] border border-cyan-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-gray-400;
}
.file-input {
  @apply w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-cyan-700 file:text-white hover:file:bg-cyan-600;
}
.loader {
  border: 2px solid #0f172a;
  border-top: 2px solid #22d3ee;
  border-radius: 9999px;
  width: 1rem;
  height: 1rem;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeInUp {
  animation: fadeInUp 0.5s ease-out;
}
</style>

