<template>
  <div class="min-h-screen bg-background">
    <!-- Full-width header with border spanning 100% -->
    <TopBar class="fixed top-0 left-0 right-0 z-20" />
    <!-- Sidebar starts below header -->
    <Sidebar />
    <!-- Content area with proper offsets -->
    <div class="lg:ml-64 pt-16 min-h-screen">
      <main>
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import Sidebar from './Sidebar.vue'
import TopBar from './TopBar.vue'
</script>
