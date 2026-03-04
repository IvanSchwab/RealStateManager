<template>
  <MainLayout v-if="showMainLayout">
    <RouterView />
  </MainLayout>
  <RouterView v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import MainLayout from '@/components/layout/MainLayout.vue'

const authStore = useAuthStore()
const route = useRoute()

authStore.initialize()

// Show MainLayout only for authenticated routes (not login, forgot-password, reset-password)
const showMainLayout = computed(() => {
  return authStore.isAuthenticated && route.meta.requiresAuth !== false
})
</script>
