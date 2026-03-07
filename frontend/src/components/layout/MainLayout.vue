<template>
  <div class="min-h-screen bg-background">
    <Sidebar />
    <div class="ml-64 h-screen flex flex-col overflow-y-auto">
      <TopBar />
      <main class="flex-1">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import Sidebar from './Sidebar.vue'
import TopBar from './TopBar.vue'
</script>
