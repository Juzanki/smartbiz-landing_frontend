<template>
  <div class="p-4 max-w-xl mx-auto space-y-3">
    <h1 class="text-2xl font-bold">SmartBiz – API Connectivity</h1>

    <div class="rounded border p-3">
      <div class="text-sm opacity-70">HEALTH</div>
      <button class="btn" @click="onHealth" :disabled="busy">{{ busy ? 'Checking…' : 'Check /healthz' }}</button>
      <pre v-if="health" class="mt-2 bg-gray-100 p-2 rounded">{{ health }}</pre>
    </div>

    <div class="rounded border p-3">
      <div class="text-sm opacity-70">LOGIN (demo)</div>
      <form @submit.prevent="onLogin" class="space-y-2">
        <input v-model.trim="email" type="email" placeholder="email" class="ipt" />
        <input v-model="password" type="password" placeholder="password" class="ipt" />
        <button class="btn" :disabled="busy">{{ busy ? 'Logging in…' : 'Login' }}</button>
      </form>
      <div v-if="token" class="mt-2 text-xs break-all">
        <strong>token:</strong> {{ token.slice(0, 32) }}…
      </div>
      <pre v-if="loginUser" class="mt-2 bg-gray-100 p-2 rounded">{{ loginUser }}</pre>
    </div>

    <div class="rounded border p-3">
      <div class="text-sm opacity-70">SESSION</div>
      <button class="btn" @click="onMe" :disabled="busy">GET /auth/me</button>
      <button class="btn ml-2" @click="onWhoami" :disabled="busy">GET /auth/_whoami</button>
      <pre v-if="meResp" class="mt-2 bg-gray-100 p-2 rounded">{{ meResp }}</pre>
      <pre v-if="whoamiResp" class="mt-2 bg-gray-100 p-2 rounded">{{ whoamiResp }}</pre>
    </div>

    <div class="rounded border p-3">
      <button class="btn danger" @click="onLogout">Clear token (logout)</button>
    </div>

    <p v-if="error" class="text-red-600 text-sm">❌ {{ error }}</p>
    <p class="text-xs opacity-60">API: {{ apiBase }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { pingHealth, login, me, whoami } from "../services/api";

const email = ref("user@example.com");      // demo creds zako
const password = ref("secret123");
const token = ref<string | null>(localStorage.getItem("sb.token"));
const loginUser = ref<any>(null);
const meResp = ref<any>(null);
const whoamiResp = ref<any>(null);
const health = ref<string>("");
const error = ref<string>("");
const busy = ref(false);

const apiBase = computed(() => import.meta.env.VITE_API_URL || "(missing VITE_API_URL)");

async function wrap<T>(fn: () => Promise<T>) {
  error.value = "";
  busy.value = true;
  try {
    return await fn();
  } catch (e: any) {
    error.value = e?.message || String(e);
  } finally {
    busy.value = false;
  }
}

async function onHealth() {
  await wrap(async () => {
    health.value = await pingHealth();
  });
}

async function onLogin() {
  await wrap(async () => {
    const data = await login(email.value, password.value);
    token.value = data.access_token;
    loginUser.value = JSON.stringify(data.user, null, 2);
  });
}

async function onMe() {
  await wrap(async () => {
    const r = await me();
    meResp.value = JSON.stringify(r, null, 2);
  });
}

async function onWhoami() {
  await wrap(async () => {
    const r = await whoami();
    whoamiResp.value = JSON.stringify(r, null, 2);
  });
}

function onLogout() {
  localStorage.removeItem("sb.token");
  token.value = null;
  loginUser.value = null;
  meResp.value = null;
  whoamiResp.value = null;
}
</script>

<style scoped>
.ipt { display:block; width:100%; border:1px solid #ddd; padding:.5rem .6rem; border-radius:.5rem; }
.btn {
  background:#111827; color:#fff; padding:.45rem .8rem; border-radius:.5rem; border:0; cursor:pointer;
}
.btn:hover { opacity:.9; }
.btn.danger { background:#b91c1c; }
pre { white-space:pre-wrap; word-break:break-word; }
</style>
