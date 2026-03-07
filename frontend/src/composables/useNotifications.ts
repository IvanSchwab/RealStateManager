import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useAuth } from './useAuth'

// Database notification types (Spanish, matching the DB schema)
export type NotificationTypeDB =
  | 'vencimiento_contrato'
  | 'pago_proximo'
  | 'pago_vencido'
  | 'contrato_nuevo'
  | 'ajuste_aplicado'
  | 'general'

export type NotificationStatus = 'no_leida' | 'leida' | 'archivada'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationTypeDB
  status: NotificationStatus
  is_archived: boolean
  contract_id: string | null
  payment_id: string | null
  expires_at: string | null
  created_at: string
}

// Module-level singleton state (shared across all component instances)
const notifications = ref<Notification[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
let channel: RealtimeChannel | null = null
let currentUserId: string | null = null
let currentOrganizationId: string | null = null
let isSubscribed = false
let isInitialized = false

export function useNotifications() {
  const { organizationId } = useAuth()

  const unreadCount = computed(() =>
    notifications.value.filter((n) => n.status === 'no_leida').length
  )

  async function fetchNotifications(limit = 10) {
    loading.value = true
    error.value = null

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        notifications.value = []
        return
      }

      currentUserId = user.id
      currentOrganizationId = organizationId.value

      if (!currentOrganizationId) {
        console.warn('No organization_id available, skipping fetch')
        notifications.value = []
        return
      }

      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', currentOrganizationId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError

      notifications.value = data ?? []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch notifications'
      console.error('Error fetching notifications:', e)
    } finally {
      loading.value = false
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ status: 'leida' })
        .eq('id', notificationId)

      if (updateError) throw updateError

      // Update local state
      const notification = notifications.value.find((n) => n.id === notificationId)
      if (notification) {
        notification.status = 'leida'
      }
    } catch (e) {
      console.error('Error marking notification as read:', e)
      throw e
    }
  }

  async function markAllAsRead() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || !currentOrganizationId) return

      const { error: updateError } = await supabase
        .from('notifications')
        .update({ status: 'leida' })
        .eq('user_id', user.id)
        .eq('organization_id', currentOrganizationId)
        .eq('status', 'no_leida')

      if (updateError) throw updateError

      // Update local state
      notifications.value.forEach((n) => {
        if (n.status === 'no_leida') {
          n.status = 'leida'
        }
      })
    } catch (e) {
      console.error('Error marking all notifications as read:', e)
      throw e
    }
  }

  function subscribeToRealtime() {
    // Prevent duplicate subscriptions
    if (isSubscribed || !currentUserId || !currentOrganizationId) {
      console.log('Realtime subscription skipped:', { isSubscribed, currentUserId, currentOrganizationId })
      return
    }

    // Clean up any existing channel first
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }

    console.log('Setting up realtime subscription for user:', currentUserId, 'org:', currentOrganizationId)

    // Note: Supabase Realtime filter only supports one filter per subscription
    // We filter by user_id here and the RLS policy handles organization_id filtering
    channel = supabase
      .channel(`notifications-${currentUserId}-${currentOrganizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log('Realtime INSERT received:', payload)
          const newNotification = payload.new as Notification
          // Add to the beginning of the list
          notifications.value.unshift(newNotification)
          // Keep only the last 10
          if (notifications.value.length > 10) {
            notifications.value.pop()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log('Realtime UPDATE received:', payload)
          const updatedNotification = payload.new as Notification
          const index = notifications.value.findIndex(
            (n) => n.id === updatedNotification.id
          )
          if (index !== -1) {
            notifications.value[index] = updatedNotification
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
        isSubscribed = status === 'SUBSCRIBED'
      })
  }

  function unsubscribeFromRealtime() {
    if (channel) {
      console.log('Unsubscribing from realtime')
      supabase.removeChannel(channel)
      channel = null
      isSubscribed = false
    }
    // Reset initialization flag so next login will re-initialize
    isInitialized = false
    currentUserId = null
    currentOrganizationId = null
    notifications.value = []
  }

  // Initialize: fetch notifications and subscribe to realtime
  // This should only run once per session - subsequent calls are no-ops
  async function initialize() {
    if (isInitialized) {
      return
    }
    isInitialized = true
    await fetchNotifications()
    subscribeToRealtime()
  }

  // Note: We intentionally do NOT use onUnmounted here because:
  // 1. State is module-level (singleton pattern)
  // 2. The NotificationBell may remount on navigation
  // 3. We want to keep the subscription alive while the app is running
  // The subscription will be cleaned up when the user logs out or closes the app

  async function sendTestNotification(): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return { success: false, error: 'Usuario no autenticado' }
      }

      if (!organizationId.value) {
        return { success: false, error: 'No organization_id available' }
      }

      const { error: insertError } = await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Notificación de prueba',
        message: 'Esta es una notificación de prueba para verificar que el sistema funciona correctamente.',
        type: 'general',
        status: 'no_leida',
        is_archived: false,
        organization_id: organizationId.value,
      })

      if (insertError) throw insertError

      return { success: true }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Error al enviar notificación de prueba'
      console.error('Error sending test notification:', e)
      return { success: false, error: errorMessage }
    }
  }

  return {
    notifications,
    loading,
    error,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    initialize,
    subscribeToRealtime,
    unsubscribeFromRealtime,
    sendTestNotification,
  }
}
