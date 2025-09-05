<template>
  <DashboardLayout>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex flex-col items-center">
      <!-- Title -->
      <h2 class="text-2xl font-bold text-center text-gray-800 dark:text-gray-200 mb-2">
        Privacy Center
      </h2>
      <p class="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
        Manage your personal data securely. You can download a copy or permanently delete your account.
      </p>

      <!-- Action Buttons -->
      <div class="w-full max-w-sm flex flex-col gap-4">
        <button
          @click="downloadData"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl shadow-lg active:scale-95 transition"
        >
          📥 Download My Data
        </button>

        <button
          @click="showDeleteModal = true"
          class="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-xl shadow-lg active:scale-95 transition"
        >
          🗑️ Delete My Account
        </button>
      </div>

      <!-- Delete Confirmation Modal -->
      <div
        v-if="showDeleteModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      >
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-11/12 max-w-md text-center">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Confirm Account Deletion
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            This action is permanent. All your data will be erased and cannot be recovered.
          </p>
          <div class="flex gap-3 justify-center">
            <button
              @click="confirmDeletion"
              class="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg shadow"
            >
              Yes, Delete
            </button>
            <button
              @click="showDeleteModal = false"
              class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-5 py-2 rounded-lg shadow"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>

<script>
import axios from 'axios'
import DashboardLayout from '@/layouts/DashboardLayout.vue'

export default {
  components: { DashboardLayout },
  data() {
    return {
      showDeleteModal: false
    }
  },
  methods: {
    async downloadData() {
      try {
        const token = localStorage.getItem('access_token')
        const res = await axios.get('/privacy/data', {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        })
        const url = window.URL.createObjectURL(new Blob([res.data]))
        const link = document.createElement('a')
        link.href = url
        link.download = 'my_data.zip'
        link.click()
      } catch (err) {
        console.error(err)
        alert('Failed to download your data.')
      }
    },
    async confirmDeletion() {
      try {
        const token = localStorage.getItem('access_token')
        await axios.post('/privacy/delete', {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
        localStorage.clear()
        this.$router.push('/signup')
      } catch (err) {
        console.error(err)
        alert('Failed to delete account.')
      }
    }
  }
}
</script>
