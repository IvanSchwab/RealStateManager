import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User, Subscription } from '@supabase/supabase-js'
import type { Profile } from '@/types'
import { useNotifications } from './useNotifications'

const user = ref<User | null>(null)
const profile = ref<Profile | null>(null)
const loading = ref(true)
const isInitialized = ref(false)
let authSubscription: Subscription | null = null
let initializePromise: Promise<void> | null = null

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => profile.value?.role === 'admin')
  const isManager = computed(() => profile.value?.role === 'manager')
  const isEmployee = computed(() => profile.value?.role === 'employee')
  const isAgent = computed(() => profile.value?.role === 'agent')
  const userRole = computed(() => profile.value?.role ?? null)
  const organizationId = computed(() => profile.value?.organization_id ?? null)

  async function signIn(email: string, password: string) {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      user.value = data.user
      await loadProfile()
      return data
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function signUp(email: string, password: string, fullName: string) {
    loading.value = true
    try {
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
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    loading.value = true
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      user.value = null
      profile.value = null
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function loadProfile() {
    if (!user.value) {
      profile.value = null
      return
    }

    try {
      // Use maybeSingle() instead of single() to handle case where profile doesn't exist yet
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .maybeSingle()

      if (error) {
        // Log but don't throw - profile might not exist during password recovery
        console.warn('Error loading profile:', error.message)
        profile.value = null
        return
      }

      profile.value = data
    } catch (error) {
      console.error('Unexpected error loading profile:', error)
      profile.value = null
    }
  }

  async function initialize(): Promise<void> {
    // If already initialized, return immediately
    if (isInitialized.value) {
      return
    }

    // If initialization is in progress, return the existing promise
    if (initializePromise) {
      return initializePromise
    }

    // Start initialization
    initializePromise = doInitialize()
    return initializePromise
  }

  async function doInitialize(): Promise<void> {
    loading.value = true

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        user.value = session.user
        await loadProfile() // MUST complete before isInitialized = true
      } else {
        // Explicitly clear state when no session
        user.value = null
        profile.value = null
      }

      // Clean up previous subscription if exists
      if (authSubscription) {
        authSubscription.unsubscribe()
        authSubscription = null
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        user.value = session?.user ?? null

        // Skip profile loading for password recovery - user just needs to reset password
        if (event === 'PASSWORD_RECOVERY') {
          return
        }

        if (session?.user) {
          await loadProfile()
        } else {
          profile.value = null
          // Clean up realtime subscriptions when user signs out
          if (event === 'SIGNED_OUT') {
            const { unsubscribeFromRealtime } = useNotifications()
            unsubscribeFromRealtime()
          }
        }
      })
      authSubscription = subscription
    } catch (error) {
      console.error('Auth initialization error:', error)
    } finally {
      loading.value = false
      isInitialized.value = true // Only set AFTER profile is fully loaded
    }
  }

  return {
    user,
    profile,
    loading,
    isInitialized,
    isAuthenticated,
    isAdmin,
    isManager,
    isEmployee,
    isAgent,
    userRole,
    organizationId,
    signIn,
    signUp,
    signOut,
    loadProfile,
    initialize,
  }
}
