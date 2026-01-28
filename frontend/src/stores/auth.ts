import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const isAuthenticated = ref(false)

  // TODO: Implement actions
  async function login(email: string, password: string) {
    // TODO: Implement login logic with Supabase
    console.log('Login not implemented', email, password)
  }

  async function logout() {
    // TODO: Implement logout logic with Supabase
    console.log('Logout not implemented')
  }

  async function checkAuth() {
    // TODO: Implement auth check with Supabase session
    console.log('Auth check not implemented')
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAuth
  }
})
