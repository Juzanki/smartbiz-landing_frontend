<template>
  <div class="wrap">
    <!-- Header -->
    <div class="head">
      <h2 class="ttl">👤 User Profile Settings</h2>
    </div>

    <!-- Card -->
    <div class="card">
      <ProfileForm :profile="profile" @submit="saveProfile" />
    </div>

    <!-- Alerts -->
    <transition name="fade">
      <div v-if="successMessage" class="alert ok">
        ✅ {{ successMessage }}
        <button class="close" @click="successMessage = ''">✕</button>
      </div>
    </transition>
    <transition name="fade">
      <div v-if="errorMessage" class="alert warn">
        ⚠️ {{ errorMessage }}
        <button class="close" @click="errorMessage = ''">✕</button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ProfileForm from '@/components/ProfileForm.vue'

const successMessage = ref('')
const errorMessage   = ref('')

const profile = ref({
  fullName: '',
  email: '',
  phone: '',
  password: '',
  location: '',
  bio: '',
  avatar: '',
  notificationPreference: ''
})

onMounted(() => {
  const saved = localStorage.getItem('user_profile')
  if (saved) profile.value = { ...JSON.parse(saved), password: '' }
})

function saveProfile(data) {
  // quick guard from child (just in case)
  if (!data.fullName || !data.email) {
    errorMessage.value = 'Full name and email are required.'
    successMessage.value = ''
    return
  }
  const toSave = { ...data }
  if (!toSave.password) delete toSave.password
  localStorage.setItem('user_profile', JSON.stringify(toSave))
  successMessage.value = 'Profile updated successfully!'
  errorMessage.value   = ''
}
</script>

<style scoped>
:root{
  --bg:#fff; --fg:#0f172a; --muted:#64748b;
  --line:#e5e7eb; --shadow:0 10px 25px rgba(0,0,0,.06);
  --brand:#2563eb; --ok:#059669; --warn:#e11d48;
}
.wrap{ max-width:900px; margin-inline:auto; padding:16px; color:var(--fg); }
.head{ display:flex; align-items:center; justify-content:space-between; margin:6px 0 14px; }
.ttl{ font-weight:800; font-size:1.25rem; margin:0; }
.card{ background:#fff; border:1px solid var(--line); border-radius:16px; box-shadow:var(--shadow); padding:16px; }
.alert{ margin-top:12px; padding:10px 12px; border-radius:12px; position:relative; border:1px solid transparent; }
.alert.ok{ background:#ecfdf5; color:#065f46; border-color:#a7f3d0; }
.alert.warn{ background:#fef2f2; color:#7f1d1d; border-color:#fecaca; }
.close{ position:absolute; right:10px; top:8px; background:transparent; border:none; cursor:pointer; }
.fade-enter-active,.fade-leave-active{ transition:opacity .2s ease }
.fade-enter-from,.fade-leave-to{ opacity:0 }
</style>
