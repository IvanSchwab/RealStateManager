<template>
  <div class="pia-app">
    <PiaSidebar />
    <div class="pia-main lg:ml-64">
      <PiaTopBar class="fixed top-0 left-0 right-0 z-30 lg:left-64" />
      <div class="pia-content pt-16">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PiaSidebar from './Sidebar.vue'
import PiaTopBar from './TopBar.vue'
</script>
