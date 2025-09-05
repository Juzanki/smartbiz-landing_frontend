<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
    <div class="w-full max-w-sm bg-white text-black rounded-2xl shadow-2xl p-6 space-y-4">
      <h3 class="text-lg font-bold text-center">🛍️ Set Product</h3>

      <input
        v-model="product.name"
        type="text"
        placeholder="Product Name"
        class="input"
      />
      <input
        v-model="product.price"
        type="number"
        placeholder="Price (TZS)"
        class="input"
      />
      <input
        type="file"
        @change="handleImageUpload"
        class="input"
      />
      <select v-model="product.position" class="input">
        <option value="top">Top</option>
        <option value="center">Center</option>
        <option value="bottom">Bottom</option>
      </select>

      <div class="flex gap-3">
        <button @click="cancel" class="btn-secondary w-full">Cancel</button>
        <button @click="confirm" class="btn-primary w-full">Set</button>
      </div>
    </div>
  </div>
</template>

