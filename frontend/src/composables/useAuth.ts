import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User, Subscription } from '@supabase/supabase-js'
import type { Profile } from '@/types'
import { useNotifications } from './useNotifications'

interface Organization {
  id: string
  name: string
  slug: string
  settings: Record<string, unknown>
}

const user = ref<User | null>(null)
const profile = ref<Profile | null>(null)
const organization = ref<Organization | null>(null)
const loading = ref(true)
const isInitialized = ref(false)
let authSubscription: Subscription | null = null
let initializePromise: Promise<void> | null = null

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => profile.value?.role === 'admin')
  const isCollaborator = computed(() => profile.value?.role === 'collaborator')
  const isOwnerRole = computed(() => profile.value?.role === 'owner') // for future use
  const userRole = computed(() => profile.value?.role ?? null)
  const organizationId = computed(() => profile.value?.organization_id ?? null)
  const organizationName = computed(() => organization.value?.name ?? null)

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
      organization.value = null
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
      organization.value = null
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
        organization.value = null
        return
      }

      profile.value = data

      // Fetch organization data if profile has organization_id
      if (data?.organization_id) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, slug, settings')
          .eq('id', data.organization_id)
          .maybeSingle()

        if (orgError) {
          console.warn('Error loading organization:', orgError.message)
          organization.value = null
        } else {
          organization.value = orgData
        }
      } else {
        organization.value = null
      }
    } catch (error) {
      console.error('Unexpected error loading profile:', error)
      profile.value = null
      organization.value = null
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
        organization.value = null
      }

      // Clean up previous subscription if exists
      if (authSubscription) {
        authSubscription.unsubscribe()
        authSubscription = null
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && user.value?.id === session?.user?.id) {
          return
        }

        user.value = session?.user ?? null

        if (event === 'PASSWORD_RECOVERY') {
          return
        }

        try {
          if (session?.user) {
            await loadProfile()
          } else {
            profile.value = null
            organization.value = null
            if (event === 'SIGNED_OUT') {
              const { unsubscribeFromRealtime } = useNotifications()
              unsubscribeFromRealtime()
            }
          }
        } catch (error) {
          console.error('Auth state change error:', error)
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
    organization,
    loading,
    isInitialized,
    isAuthenticated,
    isAdmin,
    isCollaborator,
    isOwnerRole,
    userRole,
    organizationId,
    organizationName,
    signIn,
    signUp,
    signOut,
    loadProfile,
    initialize,
  }
}
