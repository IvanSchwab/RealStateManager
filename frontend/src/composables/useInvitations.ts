import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { OrganizationInvitation, InvitationRole } from '@/types'
import { useAuth } from './useAuth'
import { useOrganization } from './useOrganization'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'

export interface InvitationFilters {
  search?: string
  status?: 'all' | 'pending' | 'accepted' | 'expired' | 'cancelled'
}

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface FetchInvitationsResult {
  data: OrganizationInvitation[]
  totalCount: number
}

// Extended type to include the joined profile data
interface InvitationWithInviter extends OrganizationInvitation {
  invited_by_profile?: {
    full_name: string | null
  }
}

export function useInvitations() {
  const invitations = ref<OrganizationInvitation[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const { organizationId, user, profile } = useAuth()
  const { organization, fetchOrganization } = useOrganization()
  const toast = useToast()
  const { t } = useI18n()

  /**
   * Fetch invitations with optional filters and pagination
   */
  async function fetchInvitations(
    filters?: InvitationFilters,
    pagination?: PaginationParams
  ): Promise<FetchInvitationsResult | null> {
    if (!organizationId.value) {
      console.warn('No organization_id available, skipping fetch')
      return null
    }

    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('organization_invitations')
        .select('*, invited_by_profile:profiles!invited_by(full_name)', { count: 'exact' })
        .eq('organization_id', organizationId.value)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      // Apply status filter
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      // Apply search filter (search by email)
      if (filters?.search) {
        query = query.ilike('email', `%${filters.search}%`)
      }

      // Apply pagination
      if (pagination) {
        const from = (pagination.page - 1) * pagination.pageSize
        const to = from + pagination.pageSize - 1
        query = query.range(from, to)
      }

      const { data, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      // Map the data to include inviter info
      const mappedData: OrganizationInvitation[] = (data ?? []).map((item: InvitationWithInviter) => ({
        ...item,
        inviter: item.invited_by_profile ? { full_name: item.invited_by_profile.full_name } as OrganizationInvitation['inviter'] : undefined,
      }))

      invitations.value = mappedData
      return {
        data: mappedData,
        totalCount: count ?? 0,
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error loading invitations'
      console.error('Error fetching invitations:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new invitation and send email
   */
  async function createInvitation(email: string, role: InvitationRole): Promise<OrganizationInvitation> {
    if (!organizationId.value) {
      throw new Error('No organization_id available')
    }

    if (!user.value?.id) {
      throw new Error('User not authenticated')
    }

    loading.value = true
    error.value = null

    try {
      // Ensure we have organization data
      let orgData = organization.value
      if (!orgData) {
        orgData = await fetchOrganization()
      }

      if (!orgData) {
        throw new Error('Could not fetch organization data')
      }

      // Insert the invitation
      const { data, error: insertError } = await supabase
        .from('organization_invitations')
        .insert([{
          organization_id: organizationId.value,
          email: email.toLowerCase().trim(),
          role,
          invited_by: user.value.id,
        }])
        .select('*')
        .single()

      if (insertError) throw insertError

      const invitation = data as OrganizationInvitation

      // Call Edge Function to send email
      const { error: fnError } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          invitation_id: invitation.id,
          token: invitation.token,
          email: invitation.email,
          role: invitation.role,
          organization_name: orgData.name,
          invited_by_name: profile.value?.full_name ?? profile.value?.email ?? 'Admin',
          action: 'new',
        },
      })

      if (fnError) {
        console.error('Failed to send invitation email:', fnError)
        // Don't throw - invitation was created, email just failed
        // The user can resend later
      }

      // Add inviter info for display
      invitation.inviter = { full_name: profile.value?.full_name ?? null } as OrganizationInvitation['inviter']

      // Optimistic update
      invitations.value.unshift(invitation)

      toast.success(t('invitations.invitationSent'))
      return invitation
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error creating invitation'
      console.error('Error creating invitation:', e)
      toast.error(`${t('common.error')}: ${error.value}`)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Cancel an invitation (soft delete)
   */
  async function cancelInvitation(id: string): Promise<void> {
    if (!organizationId.value) {
      throw new Error('No organization_id available')
    }

    error.value = null

    try {
      const { error: rpcError } = await supabase
        .rpc('cancel_invitation', { p_invitation_id: id })

      if (rpcError) throw rpcError

      // Optimistic update - remove from local array
      invitations.value = invitations.value.filter(inv => inv.id !== id)

      toast.success(t('invitations.invitationCancelled'))
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error cancelling invitation'
      console.error('Error cancelling invitation:', e)
      toast.error(`${t('common.error')}: ${error.value}`)
      throw e
    }
  }

  /**
   * Resend an invitation with a new token
   */
  async function resendInvitation(id: string): Promise<void> {
    if (!organizationId.value) {
      throw new Error('No organization_id available')
    }

    loading.value = true
    error.value = null

    try {
      // Ensure we have organization data
      let orgData = organization.value
      if (!orgData) {
        orgData = await fetchOrganization()
      }

      if (!orgData) {
        throw new Error('Could not fetch organization data')
      }

      // Call RPC to regenerate token
      const { data: result, error: rpcError } = await supabase
        .rpc('regenerate_invitation_token', { p_invitation_id: id })

      if (rpcError) throw rpcError

      if (!result || !result.new_token) {
        throw new Error('Failed to regenerate token')
      }

      // Find the invitation to get email and role
      const invitation = invitations.value.find(inv => inv.id === id)
      if (!invitation) {
        throw new Error('Invitation not found')
      }

      // Call Edge Function to send email
      const { error: fnError } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          invitation_id: id,
          token: result.new_token,
          email: invitation.email,
          role: invitation.role,
          organization_name: orgData.name,
          invited_by_name: profile.value?.full_name ?? profile.value?.email ?? 'Admin',
          action: 'resend',
        },
      })

      if (fnError) {
        console.error('Failed to send invitation email:', fnError)
        throw new Error('Failed to send email')
      }

      // Update local state
      const idx = invitations.value.findIndex(inv => inv.id === id)
      if (idx !== -1) {
        invitations.value[idx] = {
          ...invitations.value[idx],
          token: result.new_token,
          expires_at: result.new_expires_at,
          status: 'pending',
        }
      }

      toast.success(t('invitations.invitationResent'))
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error resending invitation'
      console.error('Error resending invitation:', e)
      toast.error(`${t('common.error')}: ${error.value}`)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Check if an email already exists as a user
   */
  async function checkEmailExists(email: string): Promise<boolean> {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('check_email_exists', { p_email: email.toLowerCase().trim() })

      if (rpcError) throw rpcError

      return data === true
    } catch (e) {
      console.error('Error checking email:', e)
      // Default to false on error - will be caught on invite creation if duplicate
      return false
    }
  }

  return {
    invitations,
    loading,
    error,
    fetchInvitations,
    createInvitation,
    cancelInvitation,
    resendInvitation,
    checkEmailExists,
  }
}
