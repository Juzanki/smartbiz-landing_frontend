<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 py-12">
    <div class="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-6">
      
      <!-- Logo -->
      <div class="flex justify-center">
        <img src="@/assets/logo.svg" alt="SmartBiz Logo" class="h-16 w-16 rounded-full shadow border dark:border-gray-600" />
      </div>

      <!-- Title -->
      <h2 class="text-2xl font-bold text-center text-blue-900 dark:text-white">Welcome Back 👋</h2>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <input
          v-model="form.identifier"
          type="text"
          placeholder="👤 Email / Phone / Username"
          class="input-field"
          required
        />
        <input
          v-model="form.password"
          type="password"
          placeholder="🔒 Password"
          class="input-field"
          required
        />
        <input
          v-model="form.confirmPassword"
          type="password"
          placeholder="🔒 Confirm Password"
          class="input-field"
          required
        />

        <!-- Forgot Password -->
        <div class="text-right text-sm">
          <router-link to="/forgot-password" class="text-blue-600 hover:underline dark:text-blue-400">
            Forgot Password?
          </router-link>
        </div>

        <button
          type="submit"
          class="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition"
        >
          Login
        </button>
      </form>

      <!-- Signup Prompt -->
      <p class="text-center text-sm text-gray-600 dark:text-gray-300">
        Don't have an account?
        <router-link to="/signup" class="text-blue-700 dark:text-blue-400 font-semibold hover:underline">
          Sign Up
        </router-link>
      </p>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'LoginForm',
  data() {
    return {
      form: {
        identifier: '',
        password: '',
        confirmPassword: ''
      }
    }
  },
  methods: {
    async handleLogin() {
      if (this.form.password !== this.form.confirmPassword) {
        return alert('❌ Passwords do not match!')
      }

      try {
        const res = await axios.post('/auth/login', {
          identifier: this.form.identifier,
          password: this.form.password
        })

        const user = res.data.user
        localStorage.setItem('access_token', res.data.access_token)
        localStorage.setItem('user_role', user.role)
        localStorage.setItem('user_lang', user.language || 'en')
        this.$i18n.locale = user.language || 'en'

        // Redirect user based on role
        if (user.role === 'admin') this.$router.push('/dashboard/admin')
        else if (user.role === 'owner') this.$router.push('/dashboard/owner')
        else this.$router.push('/dashboard')

      } catch (error) {
        alert(error.response?.data?.detail || 'Login failed. Try again.')
        console.error(error)
      }
    }
  }
}
</script>

<style scoped>
.input-field {
  @apply w-full px-4 py-3 border border-gray-300 rounded-lg 
    focus:outline-none focus:ring-2 focus:ring-blue-500 
    dark:bg-gray-700 dark:text-white dark:border-gray-600 text-sm;
}
</style>

