<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] px-4">
    <div class="backdrop-blur-md bg-white/5 border border-cyan-700/30 shadow-xl rounded-2xl p-8 w-full max-w-2xl text-white space-y-6 animate-fadeInUp">

      <!-- Tabs -->
      <div class="flex items-center border-b border-cyan-700/30 mb-6">
        <button
          @click="activeTab = 'profile'"
          :class="activeTab === 'profile' ? 'tab-active' : 'tab-inactive'"
        >
          🧑 Edit Info
        </button>
        <button
          @click="activeTab = 'security'"
          :class="activeTab === 'security' ? 'tab-active' : 'tab-inactive'"
        >
          🔒 Security
        </button>
      </div>

      <!-- Tab Content -->
      <form v-if="activeTab === 'profile'" class="space-y-6" @submit.prevent="saveSettings">
        <!-- Name -->
        <div>
          <label class="text-sm text-cyan-300 font-semibold">Full Name</label>
          <input v-model="name" type="text" class="input-style" placeholder="Enter your name" />
        </div>

        <!-- Bio -->
        <div>
          <label class="text-sm text-cyan-300 font-semibold">Bio</label>
          <textarea v-model="bio" rows="3" class="input-style resize-none" placeholder="Short bio..."></textarea>
        </div>

        <!-- Avatar -->
        <div>
          <label class="text-sm text-cyan-300 font-semibold">Upload Avatar</label>
          <input type="file" @change="uploadAvatar" class="file-input-style" />
          <div v-if="preview" class="mt-4 flex items-center gap-4">
            <img :src="preview" class="w-24 h-24 rounded-full ring-4 ring-cyan-500/40 shadow-xl transition-all duration-300" />
            <p class="text-sm text-gray-400 italic">Preview</p>
          </div>
        </div>

        <!-- Save Button -->
        <div class="pt-2">
          <button type="submit" class="btn-style">💾 Save Changes</button>
        </div>
      </form>

      <!-- Security Tab -->
      <div v-else class="space-y-4">
        <p class="text-sm text-gray-400">Security settings coming soon...</p>
      </div>

      <!-- Success Alert -->
      <div v-if="success" class="bg-green-600/10 text-green-300 p-3 rounded-lg border border-green-600 text-sm text-center animate-bounceIn">
        ✅ Changes saved successfully!
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const name = ref('')
const bio = ref('')
const avatar = ref(null)
const preview = ref(null)
const activeTab = ref('profile')
const success = ref(false)

function uploadAvatar(e) {
  const file = e.target.files[0]
  if (file) {
    avatar.value = file
    preview.value = URL.createObjectURL(file)
  }
}

function saveSettings() {
  // Simulate save
  success.value = true
  setTimeout(() => (success.value = false), 3000)
}
</script>

<style scoped>
.input-style {
  @apply w-full px-4 py-2 rounded-md bg-[#1e293b] border border-cyan-700 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition;
}
.file-input-style {
  @apply w-full text-sm text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-cyan-600 file:text-white hover:file:bg-cyan-700;
}
.btn-style {
  @apply px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 text-white font-bold tracking-wide shadow-lg transition-all duration-300;
}
.tab-active {
  @apply px-4 py-2 text-cyan-400 border-b-2 border-cyan-400 font-semibold transition;
}
.tab-inactive {
  @apply px-4 py-2 text-gray-400 hover:text-cyan-300 transition;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeInUp {
  animation: fadeInUp 0.6s ease-out;
}
@keyframes bounceIn {
  0% { transform: scale(0.95); opacity: 0; }
  60% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); }
}
.animate-bounceIn {
  animation: bounceIn 0.4s ease;
}
</style>

