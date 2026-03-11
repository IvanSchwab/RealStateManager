<template>
  <MainLayout v-if="showMainLayout">
    <RouterView />
  </MainLayout>
  <RouterView v-else />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import MainLayout from '@/components/layout/MainLayout.vue'
import { useTheme } from '@/composables/useTheme'
import { useLocale } from '@/composables/useLocale'

const authStore = useAuthStore()
const route = useRoute()
const { initTheme } = useTheme()
const { initLocale } = useLocale()

authStore.initialize()

onMounted(() => {
  initTheme()
  initLocale()
})

// Show MainLayout only for authenticated users who have completed onboarding
// Exclude: login, forgot-password, reset-password, onboarding
const showMainLayout = computed(() => {
  const publicRoutes = ['login', 'forgot-password', 'reset-password', 'onboarding']
  return (
    authStore.isAuthenticated &&
    !publicRoutes.includes(route.name as string) &&
    !!authStore.profile?.organization_id
  )
})
</script>
