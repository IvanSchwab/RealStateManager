import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types'

const user = ref<User | null>(null)
const profile = ref<Profile | null>(null)
const loading = ref(true)

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => profile.value?.role === 'admin')
  const isManager = computed(() => profile.value?.role === 'manager')
  const isEmployee = computed(() => profile.value?.role === 'employee')
  const isAgent = computed(() => profile.value?.role === 'agent')
  const userRole = computed(() => profile.value?.role ?? null)

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    user.value = data.user
    await loadProfile()
    return data
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) throw error

    user.value = data.user
    await loadProfile()
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error

    user.value = null
    profile.value = null
  }

  async function loadProfile() {
    if (!user.value) {
      profile.value = null
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()

    if (error) {
      console.error('Error loading profile:', error)
      return
    }

    profile.value = data
  }

  async function initialize() {
    loading.value = true

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        user.value = session.user
        await loadProfile()
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        user.value = session?.user ?? null

        if (session?.user) {
          await loadProfile()
        } else {
          profile.value = null
        }
      })
    } catch (error) {
      console.error('Auth initialization error:', error)
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    profile,
    loading,
    isAuthenticated,
    isAdmin,
    isManager,
    isEmployee,
    isAgent,
    userRole,
    signIn,
    signUp,
    signOut,
    loadProfile,
    initialize,
  }
}
