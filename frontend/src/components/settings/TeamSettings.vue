<template>
  <div>
    <h2 class="settings-section-title">{{ $t('settings.team') }}</h2>
    <p class="settings-section-subtitle">{{ $t('settings.teamSubtitle') }}</p>
    <div class="settings-divider"></div>

    <!-- Header bar -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 0 12px">
      <p style="font-size:13px;color:var(--pia-text-3)">
        <span v-if="!loadingMembers">
          {{ members.length }} {{ members.length === 1 ? $t('team.userSingular') : $t('team.usersPlural') }}
          <template v-if="pendingCount > 0"> · {{ pendingCount }} {{ pendingCount === 1 ? $t('team.invitationSingular') : $t('team.invitationsPlural') }}</template>
        </span>
      </p>
      <Button size="sm" @click="showInviteDialog = true">
        <UserPlus class="w-4 h-4 mr-2" />
        {{ $t('invitations.inviteUser') }}
      </Button>
    </div>

    <!-- Members table -->
    <div style="border:1px solid var(--pia-border);border-radius:8px;overflow:hidden">
      <!-- Table header -->
      <div class="team-table-row team-table-header">
        <span class="team-col-label">{{ $t('team.colUser') }}</span>
        <span class="team-col-label">{{ $t('team.colRole') }}</span>
        <span class="team-col-label team-col-access">{{ $t('team.colLastAccess') }}</span>
        <span></span>
      </div>

      <!-- Loading -->
      <div v-if="loadingMembers" style="padding:32px;display:flex;justify-content:center">
        <Loader2 class="w-5 h-5 animate-spin" style="color:var(--pia-text-3)" />
      </div>

      <!-- Members rows -->
      <template v-else-if="members.length > 0">
        <div
          v-for="(member, idx) in members"
          :key="member.id"
          class="team-table-row"
          :style="idx < members.length - 1 ? 'border-bottom:1px solid var(--pia-border)' : ''"
        >
          <!-- User -->
          <div style="display:flex;align-items:center;gap:10px;min-width:0">
            <Avatar style="width:32px;height:32px;flex-shrink:0">
              <AvatarImage v-if="member.avatar_url" :src="member.avatar_url" />
              <AvatarFallback
                :style="{ backgroundColor: getAvatarColor(member.full_name, member.email), color: 'white', fontSize: '12px', fontWeight: 600 }"
              >
                {{ getInitials(member.full_name, member.email) }}
              </AvatarFallback>
            </Avatar>
            <div style="min-width:0">
              <p style="font-size:13px;font-weight:600;color:var(--pia-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                {{ member.full_name || member.email.split('@')[0] }}
                <span v-if="member.id === currentUserId" style="font-size:11px;color:var(--pia-text-3);font-weight:400"> ({{ $t('team.you') }})</span>
              </p>
              <p style="font-size:11px;color:var(--pia-text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ member.email }}</p>
            </div>
          </div>

          <!-- Role -->
          <div>
            <span
              style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:9999px;font-size:11px;font-weight:600"
              :style="roleStyle(member.role)"
            >
              {{ $t(`roles.${member.role}`) }}
            </span>
          </div>

          <!-- Last access (stub, hidden on mobile) -->
          <p class="team-col-access" style="font-size:12px;color:var(--pia-text-3)">—</p>

          <!-- Actions -->
          <div style="display:flex;justify-content:flex-end">
            <div style="position:relative">
              <button
                v-if="isAdmin && member.id !== currentUserId && member.id !== organizationCreatorId"
                @click="handleRemoveMember(member)"
                :disabled="removingMemberId === member.id"
                style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;border:none;cursor:pointer;background:transparent;color:var(--pia-text-3);transition:background .15s"
                :title="$t('team.removeMemberTooltip')"
                class="hover:bg-muted"
              >
                <Loader2 v-if="removingMemberId === member.id" class="w-4 h-4 animate-spin" />
                <UserMinus v-else class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <div v-else style="padding:40px;text-align:center;color:var(--pia-text-3)">
        <Users class="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p style="font-size:13px">{{ $t('team.noMembers') }}</p>
      </div>
    </div>

    <!-- Pending invitations -->
    <template v-if="invitations.length > 0 || loadingInvitations">
      <div style="margin-top:24px">
        <p style="font-size:13px;font-weight:600;color:var(--pia-text);margin-bottom:12px">{{ $t('team.pendingInvitationsSection') }}</p>

        <div v-if="loadingInvitations" style="padding:16px;display:flex;justify-content:center">
          <Loader2 class="w-5 h-5 animate-spin" style="color:var(--pia-text-3)" />
        </div>

        <div v-else style="border:1px solid var(--pia-border);border-radius:8px;overflow:hidden">
          <div
            v-for="(inv, idx) in invitations"
            :key="inv.id"
            style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;gap:12px"
            :style="idx < invitations.length - 1 ? 'border-bottom:1px solid var(--pia-border)' : ''"
          >
            <div style="display:flex;align-items:center;gap:10px;min-width:0">
              <div style="width:32px;height:32px;border-radius:50%;background:var(--pia-muted);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <Mail class="w-4 h-4" style="color:var(--pia-text-3)" />
              </div>
              <div style="min-width:0">
                <p style="font-size:13px;font-weight:500;color:var(--pia-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ inv.email }}</p>
                <p style="font-size:11px;color:var(--pia-text-3)">
                  {{ $t(`roles.${inv.role}`) }} ·
                  <span :class="isExpiringSoon(inv.expires_at) ? 'text-amber-600' : ''">
                    {{ $t('team.expires') }} {{ formatRelativeTime(inv.expires_at) }}
                  </span>
                </p>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
              <Button variant="ghost" size="sm" @click="handleResendInvitation(inv)" :disabled="resendingId === inv.id" :title="$t('team.sendInvite')">
                <Loader2 v-if="resendingId === inv.id" class="w-4 h-4 animate-spin" />
                <RefreshCw v-else class="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" @click="handleCancelInvitation(inv)" :disabled="cancellingId === inv.id" :title="$t('common.cancel')" class="text-destructive">
                <Loader2 v-if="cancellingId === inv.id" class="w-4 h-4 animate-spin" />
                <X v-else class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </template>

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
            <Input id="invite-email" v-model="inviteEmail" type="email" placeholder="usuario@ejemplo.com" :disabled="isInviting" />
          </div>

          <div class="space-y-2">
            <Label>{{ $t('invitations.role') }}</Label>
            <div class="flex gap-2">
              <Button type="button" :variant="inviteRole === 'collaborator' ? 'default' : 'outline'" class="flex-1" @click="inviteRole = 'collaborator'" :disabled="isInviting">
                {{ $t('roles.collaborator') }}
              </Button>
              <Button type="button" :variant="inviteRole === 'admin' ? 'default' : 'outline'" class="flex-1" @click="inviteRole = 'admin'" :disabled="isInviting">
                {{ $t('roles.admin') }}
              </Button>
            </div>
            <p class="text-xs text-muted-foreground">
              {{ inviteRole === 'admin' ? $t('team.adminRoleHint') : $t('team.collaboratorRoleHint') }}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" @click="showInviteDialog = false" :disabled="isInviting">{{ $t('common.cancel') }}</Button>
            <Button type="submit" :disabled="isInviting || !inviteEmail">
              <Loader2 v-if="isInviting" class="w-4 h-4 mr-2 animate-spin" />
              <Send v-else class="w-4 h-4 mr-2" />
              {{ isInviting ? $t('team.sendingInvite') : $t('team.sendInvite') }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Cancel Invitation -->
    <AlertDialog :open="showCancelDialog" @update:open="showCancelDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ $t('invitations.cancel') }}</AlertDialogTitle>
          <AlertDialogDescription>{{ $t('invitations.confirmCancel') }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="cancellingId !== null">{{ $t('common.cancel') }}</AlertDialogCancel>
          <AlertDialogAction @click="confirmCancelInvitation" :disabled="cancellingId !== null" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            <Loader2 v-if="cancellingId !== null" class="w-4 h-4 mr-2 animate-spin" />
            {{ $t('common.confirm') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Remove Member -->
    <AlertDialog :open="showRemoveDialog" @update:open="showRemoveDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ $t('team.removeMemberConfirmTitle') }}</AlertDialogTitle>
          <AlertDialogDescription>{{ $t('team.removeMemberConfirmDescription') }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="removingMemberId !== null">{{ $t('common.cancel') }}</AlertDialogCancel>
          <AlertDialogAction @click="confirmRemoveMember" :disabled="removingMemberId !== null" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
import { Loader2, Users, UserPlus, UserMinus, Mail, RefreshCw, X, Send } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
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

const members = ref<Profile[]>([])
const loadingMembers = ref(false)
const currentUserId = ref<string | null>(null)

const loadingInvitations = ref(false)
const resendingId = ref<string | null>(null)
const cancellingId = ref<string | null>(null)

const showInviteDialog = ref(false)
const inviteEmail = ref('')
const inviteRole = ref<InvitationRole>('collaborator')
const inviteError = ref('')
const isInviting = ref(false)

const showCancelDialog = ref(false)
const invitationToCancel = ref<OrganizationInvitation | null>(null)

const showRemoveDialog = ref(false)
const memberToRemove = ref<Profile | null>(null)
const removingMemberId = ref<string | null>(null)

const organizationCreatorId = computed(() => members.value[0]?.id ?? null)
const pendingCount = computed(() => invitations.value.length)

function roleStyle(role: string): string {
  if (role === 'admin') return 'background:var(--brand-100,#d1fae5);color:var(--brand-700)'
  if (role === 'owner') return 'background:var(--brand-100,#d1fae5);color:var(--brand-700)'
  return 'background:var(--pia-muted);color:var(--pia-text-3)'
}

onMounted(async () => {
  currentUserId.value = user.value?.id ?? null
  await Promise.all([fetchMembers(), loadInvitations()])
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
  return (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 2
}

async function handleInvite() {
  inviteError.value = ''
  if (!inviteEmail.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.value)) {
    inviteError.value = t('validation.invalidEmail')
    return
  }
  isInviting.value = true
  try {
    const emailExists = await checkEmailExists(inviteEmail.value)
    if (emailExists) { inviteError.value = t('invitations.emailAlreadyExists'); isInviting.value = false; return }
    const existing = invitations.value.find(inv => inv.email.toLowerCase() === inviteEmail.value.toLowerCase() && inv.status === 'pending')
    if (existing) { inviteError.value = t('invitations.emailAlreadyInvited'); isInviting.value = false; return }
    await createInvitation(inviteEmail.value, inviteRole.value)
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
  try { await resendInvitation(invitation.id) } finally { resendingId.value = null }
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
    const { error } = await supabase.rpc('remove_member', { p_user_id: memberToRemove.value.id })
    if (error) throw error
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

<style scoped>
.settings-section-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--pia-text);
}
.settings-section-subtitle {
  font-size: 13px;
  color: var(--brand-700);
  margin-top: 4px;
}
.settings-divider {
  border-bottom: 1px solid var(--pia-border);
  margin: 20px 0 0;
}

/* Table grid — mobile: user + role + action */
.team-table-row {
  display: grid;
  grid-template-columns: 1fr auto 40px;
  padding: 12px 16px;
  align-items: center;
}

.team-table-header {
  background: var(--pia-muted);
  border-bottom: 1px solid var(--pia-border);
  padding: 8px 16px;
}

.team-col-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--pia-text-3);
}

/* Hide "Último acceso" column on mobile */
.team-col-access {
  display: none;
}

/* Desktop: 4-column grid with last-access visible */
@media (min-width: 640px) {
  .team-table-row {
    grid-template-columns: 1fr 120px 160px 48px;
  }
  .team-col-access {
    display: block;
  }
}
</style>
