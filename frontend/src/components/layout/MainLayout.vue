<template>
  <div class="min-h-screen flex bg-background">
    <Sidebar />
    <div class="flex-1 flex flex-col">
      <TopBar />
      <main class="flex-1 overflow-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import Sidebar from './Sidebar.vue'
import TopBar from './TopBar.vue'
</script>
