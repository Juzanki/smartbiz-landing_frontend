kwanza naomba boresha kwa maana qr code isikaye kwa dakika 5 badala yake ikaye angalau 30sekunde tu maana dk tano nyingi sana sasa kama ni hii code boresha hilo tu <template>
  <div>
    <!-- 🔘 Trigger Button -->
    <button
      @click="show = true"
      class="bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg shadow hover:bg-yellow-300 transition"
    >
      📱 Show QR Preview
    </button>

    <!-- 🪟 Modal -->
    <div
      v-if="show"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
    >
      <div
        class="bg-white p-6 rounded-xl shadow-xl border border-yellow-300 max-w-sm w-full relative animate-fade-in"
      >
        <!-- ❌ Close Button -->
        <button
          @click="show = false"
          class="absolute top-2 right-3 text-gray-500 hover:text-red-600 text-xl font-bold"
        >
          &times;
        </button>

        <!-- 📷 QR Code Display -->
        <div class="flex flex-col items-center justify-center">
          <div class="relative">
            <qrcode-vue
              :value="ngrokUrl"
              :size="200"
              class="transition-transform hover:scale-105 hover:drop-shadow-lg duration-300"
            />
            <div class="absolute -top-2 -right-2 bg-yellow-300 text-xs text-black font-bold px-2 py-0.5 rounded shadow">
              LIVE
            </div>
          </div>

          <p class="mt-4 text-sm text-gray-700 text-center">
            📱 Scan to preview <span class="text-primary font-semibold">SmartBiz</span> on your device
          </p>
          <a :href="ngrokUrl" target="_blank" class="text-xs text-blue-600 underline mt-2 hover:text-blue-800 break-all">
            🔗 {{ ngrokUrl }}
          </a>
          <p class="text-xs text-gray-400 mt-1 italic">Secure via Ngrok Tunnel</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import QrcodeVue from 'qrcode.vue'

// ✅ Force override fallback to prevent expired links
const show = ref(false)
const fallback = 'https://cca84ce5c2a6.ngrok-free.app'  // 👈 override here with current ngrok
const envUrl = import.meta.env.VITE_NGROK_URL
const ngrokUrl = envUrl && envUrl.includes('ngrok') ? envUrl : fallback
</script>

<style scoped>
@keyframes fade-in {
  0% {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}
</style>

