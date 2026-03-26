<template>
  <div class="space-y-6">
    <!-- Section Header -->
    <div>
      <h1 class="text-sm font-semibold">{{ $t('settings.team') }}</h1>
      <p class="text-muted-foreground text-xs">
        {{ $t('settings.teamDescription') }}
      </p>
    </div>

    <!-- Active Members Section -->
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle class="text-base">{{ $t('team.activeMembers') }}</CardTitle>
            <CardDescription>{{ $t('team.activeMembersDescription') }}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <!-- Loading -->
        <div v-if="loadingMembers" class="py-8 flex justify-center">
          <Loader2 class="w-6 h-6 animate-spin text-muted-foreground" />
        </div>

        <!-- Members List -->
        <div v-else-if="members.length > 0" class="space-y-3">
          <div
            v-for="member in members"
            :key="member.id"
            class="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
          >
            <div class="flex items-center gap-3">
              <Avatar class="h-10 w-10">
                <AvatarImage v-if="member.avatar_url" :src="member.avatar_url" />
                <AvatarFallback
                  :style="{ backgroundColor: getAvatarColor(member.full_name, member.email), color: 'white' }"
                >
                  {{ getInitials(member.full_name, member.email) }}
                </AvatarFallback>
              </Avatar>
              <div>
                <p class="font-medium text-sm">
                  {{ member.full_name || member.email.split('@')[0] }}
                  <span v-if="member.id === currentUserId" class="text-muted-foreground">({{ $t('team.you') }})</span>
                </p>
                <p class="text-xs text-muted-foreground">{{ member.email }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="member.role === 'admin'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'"
              >
                {{ $t(`roles.${member.role}`) }}
              </span>
              <Button
                v-if="isAdmin && member.id !== currentUserId && member.id !== organizationCreatorId"
                variant="ghost"
                size="sm"
                @click="handleRemoveMember(member)"
                :disabled="removingMemberId === member.id"
                class="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Loader2 v-if="removingMemberId === member.id" class="w-4 h-4 animate-spin" />
                <UserMinus v-else class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="py-8 text-center text-muted-foreground">
          <Users class="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p class="text-sm">{{ $t('team.noMembers') }}</p>
        </div>
      </CardContent>
    </Card>

    <!-- Pending Invitations Section -->
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle class="text-base">{{ $t('team.pendingInvitations') }}</CardTitle>
            <CardDescription>{{ $t('team.pendingInvitationsDescription') }}</CardDescription>
          </div>
          <Button @click="showInviteDialog = true" size="sm">
            <UserPlus class="w-4 h-4 mr-2" />
            {{ $t('invitations.inviteUser') }}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <!-- Loading -->
        <div v-if="loadingInvitations" class="py-8 flex justify-center">
          <Loader2 class="w-6 h-6 animate-spin text-muted-foreground" />
        </div>

        <!-- Invitations List -->
        <div v-else-if="invitations.length > 0" class="space-y-3">
          <div
            v-for="invitation in invitations"
            :key="invitation.id"
            class="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
          >
            <div class="flex items-center gap-3">
              <div class="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Mail class="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p class="font-medium text-sm">{{ invitation.email }}</p>
                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{{ $t(`roles.${invitation.role}`) }}</span>
                  <span class="text-border">|</span>
                  <span :class="isExpiringSoon(invitation.expires_at) ? 'text-amber-600' : ''">
                    {{ $t('invitations.expiresAt') }}: {{ formatRelativeTime(invitation.expires_at) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                @click="handleResendInvitation(invitation)"
                :disabled="resendingId === invitation.id"
              >
                <Loader2 v-if="resendingId === invitation.id" class="w-4 h-4 animate-spin" />
                <RefreshCw v-else class="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                @click="handleCancelInvitation(invitation)"
                :disabled="cancellingId === invitation.id"
              >
                <Loader2 v-if="cancellingId === invitation.id" class="w-4 h-4 animate-spin" />
                <X v-else class="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="py-8 text-center text-muted-foreground">
          <Mail class="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p class="text-sm">{{ $t('invitations.noInvitations') }}</p>
          <p class="text-xs mt-1">{{ $t('team.inviteToGetStarted') }}</p>
        </div>
      </CardContent>
    </Card>

    <!-- Invite User Dialog -->
    <Dialog :open="showInviteDialog" @update:open="showInviteDialog = $event">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{ $t('invitations.inviteUser') }}</DialogTitle>
          <DialogDescription>{{ $t('team.inviteDescription') }}</DialogDescription>
        </DialogHeader>

        <form class="space-y-4" @submit.prevent="handleInvite">
          <div v-if="inviteError" class="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {{ inviteError }}
          </div>

          <div class="space-y-2">
            <Label for="invite-email">{{ $t('common.email') }}</Label>
            <Input
              id="invite-email"
              v-model="inviteEmail"
              type="email"
              placeholder="usuario@ejemplo.com"
              :disabled="isInviting"
            />
          </div>

          <div class="space-y-2">
            <Label>{{ $t('invitations.role') }}</Label>
            <div class="flex gap-2">
              <Button
                type="button"
                :variant="inviteRole === 'collaborator' ? 'default' : 'outline'"
                class="flex-1"
                @click="inviteRole = 'collaborator'"
                :disabled="isInviting"
              >
                {{ $t('roles.collaborator') }}
              </Button>
              <Button
                type="button"
                :variant="inviteRole === 'admin' ? 'default' : 'outline'"
                class="flex-1"
                @click="inviteRole = 'admin'"
                :disabled="isInviting"
              >
                {{ $t('roles.admin') }}
              </Button>
            </div>
            <p class="text-xs text-muted-foreground">
              {{ inviteRole === 'admin' ? $t('team.adminRoleHint') : $t('team.collaboratorRoleHint') }}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" @click="showInviteDialog = false" :disabled="isInviting">
              {{ $t('common.cancel') }}
            </Button>
            <Button type="submit" :disabled="isInviting || !inviteEmail">
              <Loader2 v-if="isInviting" class="w-4 h-4 mr-2 animate-spin" />
              <Send v-else class="w-4 h-4 mr-2" />
              {{ isInviting ? $t('team.sendingInvite') : $t('team.sendInvite') }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Cancel Invitation Confirmation -->
    <AlertDialog :open="showCancelDialog" @update:open="showCancelDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ $t('invitations.cancel') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ $t('invitations.confirmCancel') }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="cancellingId !== null">{{ $t('common.cancel') }}</AlertDialogCancel>
          <AlertDialogAction
            @click="confirmCancelInvitation"
            :disabled="cancellingId !== null"
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Loader2 v-if="cancellingId !== null" class="w-4 h-4 mr-2 animate-spin" />
            {{ $t('common.confirm') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Remove Member Confirmation -->
    <AlertDialog :open="showRemoveDialog" @update:open="showRemoveDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ $t('team.removeMemberConfirmTitle') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ $t('team.removeMemberConfirmDescription') }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="removingMemberId !== null">{{ $t('common.cancel') }}</AlertDialogCancel>
          <AlertDialogAction
            @click="confirmRemoveMember"
            :disabled="removingMemberId !== null"
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Loader2 v-if="removingMemberId !== null" class="w-4 h-4 mr-2 animate-spin" />
            {{ $t('team.removeMember') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Loader2,
  Users,
  UserPlus,
  UserMinus,
  Mail,
  RefreshCw,
  X,
  Send
} from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/composables/useAuth'
import { useInvitations } from '@/composables/useInvitations'
import { useToast } from '@/composables/useToast'
import { useFormatDate } from '@/composables/useFormatDate'
import { useProfile } from '@/composables/useProfile'
import type { Profile, OrganizationInvitation, InvitationRole } from '@/types'

const { t } = useI18n()
const { organizationId, user, isAdmin } = useAuth()
const toast = useToast()
const { invitations, fetchInvitations, createInvitation, cancelInvitation, resendInvitation, checkEmailExists } = useInvitations()
const { formatRelativeTime } = useFormatDate()
const { getInitials, getAvatarColor } = useProfile()

// Members state
const members = ref<Profile[]>([])
const loadingMembers = ref(false)
const currentUserId = ref<string | null>(null)

// Invitations state
const loadingInvitations = ref(false)
const resendingId = ref<string | null>(null)
const cancellingId = ref<string | null>(null)

// Invite dialog state
const showInviteDialog = ref(false)
const inviteEmail = ref('')
const inviteRole = ref<InvitationRole>('collaborator')
const inviteError = ref('')
const isInviting = ref(false)

// Cancel dialog state
const showCancelDialog = ref(false)
const invitationToCancel = ref<OrganizationInvitation | null>(null)

// Remove member dialog state
const showRemoveDialog = ref(false)
const memberToRemove = ref<Profile | null>(null)
const removingMemberId = ref<string | null>(null)

// The organization creator is the first member (sorted by created_at ascending)
const organizationCreatorId = computed(() => members.value[0]?.id ?? null)

onMounted(async () => {
  currentUserId.value = user.value?.id ?? null
  await Promise.all([
    fetchMembers(),
    loadInvitations()
  ])
})

async function fetchMembers() {
  if (!organizationId.value) return

  loadingMembers.value = true

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', organizationId.value)
      .order('created_at', { ascending: true })

    if (error) throw error

    members.value = data as Profile[]
  } catch (e) {
    console.error('Error fetching members:', e)
  } finally {
    loadingMembers.value = false
  }
}

async function loadInvitations() {
  loadingInvitations.value = true
  await fetchInvitations({ status: 'pending' })
  loadingInvitations.value = false
}

function isExpiringSoon(expiresAt: string): boolean {
  const expires = new Date(expiresAt)
  const now = new Date()
  const daysUntilExpiry = (expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return daysUntilExpiry <= 2
}

async function handleInvite() {
  inviteError.value = ''

  // Validate email
  if (!inviteEmail.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.value)) {
    inviteError.value = t('validation.invalidEmail')
    return
  }

  isInviting.value = true

  try {
    // Check if email already exists as a user
    const emailExists = await checkEmailExists(inviteEmail.value)
    if (emailExists) {
      inviteError.value = t('invitations.emailAlreadyExists')
      isInviting.value = false
      return
    }

    // Check if there's already a pending invitation for this email
    const existingInvitation = invitations.value.find(
      inv => inv.email.toLowerCase() === inviteEmail.value.toLowerCase() && inv.status === 'pending'
    )
    if (existingInvitation) {
      inviteError.value = t('invitations.emailAlreadyInvited')
      isInviting.value = false
      return
    }

    await createInvitation(inviteEmail.value, inviteRole.value)

    // Reset form and close dialog
    inviteEmail.value = ''
    inviteRole.value = 'collaborator'
    showInviteDialog.value = false
  } catch (e) {
    inviteError.value = e instanceof Error ? e.message : t('errors.unknownError')
  } finally {
    isInviting.value = false
  }
}

async function handleResendInvitation(invitation: OrganizationInvitation) {
  resendingId.value = invitation.id

  try {
    await resendInvitation(invitation.id)
  } finally {
    resendingId.value = null
  }
}

function handleCancelInvitation(invitation: OrganizationInvitation) {
  invitationToCancel.value = invitation
  showCancelDialog.value = true
}

async function confirmCancelInvitation() {
  if (!invitationToCancel.value) return

  cancellingId.value = invitationToCancel.value.id

  try {
    await cancelInvitation(invitationToCancel.value.id)
    showCancelDialog.value = false
    invitationToCancel.value = null
  } finally {
    cancellingId.value = null
  }
}

function handleRemoveMember(member: Profile) {
  memberToRemove.value = member
  showRemoveDialog.value = true
}

async function confirmRemoveMember() {
  if (!memberToRemove.value) return

  removingMemberId.value = memberToRemove.value.id

  try {
    const { error } = await supabase.rpc('remove_member', {
      p_user_id: memberToRemove.value.id
    })

    if (error) throw error

    // Optimistically remove from local list
    members.value = members.value.filter(m => m.id !== memberToRemove.value!.id)

    toast.success(t('team.memberRemoved'))
    showRemoveDialog.value = false
    memberToRemove.value = null
  } catch (e) {
    console.error('Error removing member:', e)
    toast.error(t('team.removeMemberError'))
  } finally {
    removingMemberId.value = null
  }
}
</script>
