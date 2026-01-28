import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

export function useAuth() {
  const authStore = useAuthStore()

  // Computed properties
  const user = computed(() => authStore.user)
  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const isLoading = computed(() => authStore.isLoading)

  // TODO: Implement auth methods
  async function login(email: string, password: string) {
    return authStore.login(email, password)
  }

  async function logout() {
    return authStore.logout()
  }

  async function checkAuth() {
    return authStore.checkAuth()
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth
  }
}
