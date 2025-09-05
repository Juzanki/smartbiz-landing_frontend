<template>
  <div class="p-6">
    <h2 class="text-xl font-bold mb-4">📊 Campaign Analytics</h2>

    <!-- Filter -->
    <div class="mb-4">
      <select v-model="filter" class="border rounded px-3 py-1">
        <option value="7">Last 7 Days</option>
        <option value="30">Last 30 Days</option>
      </select>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="p-4 bg-white rounded shadow">
        <h3 class="text-sm text-gray-500">Messages Sent</h3>
        <p class="text-2xl font-bold">{{ summary.messages_sent }}</p>
      </div>
      <div class="p-4 bg-white rounded shadow">
        <h3 class="text-sm text-gray-500">SmartCoins Used</h3>
        <p class="text-2xl font-bold">{{ summary.smartcoins_used }}</p>
      </div>
      <div class="p-4 bg-white rounded shadow">
        <h3 class="text-sm text-gray-500">SmartCoins Earned</h3>
        <p class="text-2xl font-bold">{{ summary.smartcoins_earned }}</p>
      </div>
      <div class="p-4 bg-white rounded shadow">
        <h3 class="text-sm text-gray-500">Replies</h3>
        <p class="text-2xl font-bold">{{ summary.replies }}</p>
      </div>
    </div>

    <!-- Chart -->
    <ResponsiveContainer width="100%" height="300">
      <LineChart :data="chartData">
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="messages_sent" stroke="#8884d8" />
        <Line type="monotone" dataKey="smartcoins_used" stroke="#82ca9d" />
      </LineChart>
    </ResponsiveContainer>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from '@/utils/axios'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

const summary = ref({})
const chartData = ref([])
const filter = ref("7") // default: 7 days

const fetchData = async () => {
  const res = await axios.get(`/analytics/campaign-summary?days=${filter.value}`)
  summary.value = res.data.summary
  chartData.value = res.data.trend
}

watch(filter, fetchData)
onMounted(fetchData)
</script>

