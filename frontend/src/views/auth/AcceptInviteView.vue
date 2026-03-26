<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <Card class="w-full max-w-md">
      <!-- Loading State -->
      <template v-if="state === 'loading'">
        <CardHeader class="text-center space-y-1">
          <div class="mx-auto mb-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center">
            <Loader2 class="w-6 h-6 text-primary-foreground animate-spin" />
          </div>
          <CardTitle class="text-2xl">{{ $t('invite.verifying') }}</CardTitle>
          <CardDescription>{{ $t('invite.verifyingDescription') }}</CardDescription>
        </CardHeader>
      </template>

      <!-- Invalid/Expired State -->
      <template v-else-if="state === 'invalid'">
        <CardHeader class="text-center space-y-1">
          <div class="mx-auto mb-2 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle class="w-6 h-6 text-destructive" />
          </div>
          <CardTitle class="text-2xl">{{ $t('invite.invalidTitle') }}</CardTitle>
          <CardDescription>{{ errorMessage || $t('invite.invalidDescription') }}</CardDescription>
        </CardHeader>
        <CardContent class="text-center">
          <Button @click="router.push({ name: 'login' })">
            <ArrowLeft class="w-4 h-4 mr-2" />
            {{ $t('auth.backToLogin') }}
          </Button>
        </CardContent>
      </template>

      <!-- Valid Invitation - Not Logged In -->
      <template v-else-if="state === 'register'">
        <CardHeader class="text-center space-y-1">
          <div class="mx-auto mb-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center">
            <UserPlus class="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle class="text-2xl">{{ $t('invite.joinOrganization') }}</CardTitle>
          <CardDescription>
            {{ $t('invite.invitedTo', { organization: invitation?.organization_name }) }}
          </CardDescription>
        </CardHeader>

        <CardContent class="space-y-6">
          <!-- Invitation Details -->
          <div class="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">{{ $t('common.email') }}:</span>
              <span class="font-medium">{{ invitation?.email }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">{{ $t('invitations.role') }}:</span>
              <span class="font-medium">{{ $t(`roles.${invitation?.role}`) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">{{ $t('invitations.invitedBy') }}:</span>
              <span class="font-medium">{{ invitation?.invited_by_name }}</span>
            </div>
          </div>

          <!-- Register Form -->
          <form class="space-y-4" @submit.prevent="handleRegister">
            <div v-if="formError" class="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {{ formError }}
            </div>

            <div class="space-y-2">
              <Label for="full-name">{{ $t('settings.fullName') }}</Label>
              <Input
                id="full-name"
                v-model="fullName"
                type="text"
                :placeholder="$t('settings.fullNamePlaceholder')"
                :disabled="isSubmitting"
              />
            </div>

            <div class="space-y-2">
              <Label for="password">{{ $t('auth.password') }}</Label>
              <Input
                id="password"
                v-model="password"
                type="password"
                :placeholder="$t('auth.minCharacters', { min: 8 })"
                :disabled="isSubmitting"
              />
            </div>

            <div class="space-y-2">
              <Label for="confirm-password">{{ $t('auth.confirmPassword') }}</Label>
              <Input
                id="confirm-password"
                v-model="confirmPassword"
                type="password"
                :placeholder="$t('auth.repeatPassword')"
                :disabled="isSubmitting"
              />
            </div>

            <Button type="submit" class="w-full" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
              <UserPlus v-else class="w-4 h-4 mr-2" />
              {{ isSubmitting ? $t('invite.creating') : $t('invite.createAccount') }}
            </Button>
          </form>

          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <span class="w-full border-t border-border" />
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-background px-2 text-muted-foreground">{{ $t('invite.or') }}</span>
            </div>
          </div>

          <Button
            variant="outline"
            class="w-full"
            @click="redirectToLogin"
          >
            {{ $t('invite.alreadyHaveAccount') }}
          </Button>
        </CardContent>
      </template>

      <!-- Valid Invitation - Logged In, Accepting -->
      <template v-else-if="state === 'accepting'">
        <CardHeader class="text-center space-y-1">
          <div class="mx-auto mb-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center">
            <Loader2 class="w-6 h-6 text-primary-foreground animate-spin" />
          </div>
          <CardTitle class="text-2xl">{{ $t('invite.accepting') }}</CardTitle>
          <CardDescription>{{ $t('invite.acceptingDescription') }}</CardDescription>
        </CardHeader>
      </template>

      <!-- Success State -->
      <template v-else-if="state === 'success'">
        <CardHeader class="text-center space-y-1">
          <div class="mx-auto mb-2 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle class="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle class="text-2xl">{{ $t('invite.successTitle') }}</CardTitle>
          <CardDescription>
            {{ $t('invite.successDescription', { organization: invitation?.organization_name }) }}
          </CardDescription>
        </CardHeader>
        <CardContent class="text-center">
          <p class="text-sm text-muted-foreground mb-4">
            {{ $t('invite.redirecting', { seconds: redirectCountdown }) }}
          </p>
          <Button @click="router.push({ name: 'dashboard' })">
            {{ $t('invite.goToDashboard') }}
          </Button>
        </CardContent>
      </template>

      <!-- Email Mismatch State -->
      <template v-else-if="state === 'email-mismatch'">
        <CardHeader class="text-center space-y-1">
          <div class="mx-auto mb-2 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle class="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle class="text-2xl">{{ $t('invite.emailMismatchTitle') }}</CardTitle>
          <CardDescription>
            {{ $t('invite.emailMismatchDescription', { expected: expectedEmail }) }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <Button variant="outline" class="w-full" @click="handleLogoutAndRegister">
            <LogOut class="w-4 h-4 mr-2" />
            {{ $t('invite.logoutAndRegister') }}
          </Button>
          <Button variant="ghost" class="w-full" @click="router.push({ name: 'dashboard' })">
            {{ $t('invite.goToDashboard') }}
          </Button>
        </CardContent>
      </template>

      <!-- Email Confirmation Pending State -->
      <template v-else-if="state === 'email-confirmation-pending'">
        <CardHeader class="text-center space-y-1">
          <div class="mx-auto mb-2 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Mail class="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle class="text-2xl">{{ $t('invite.confirmEmailTitle') }}</CardTitle>
          <CardDescription>
            {{ $t('invite.confirmEmailDescription') }}
          </CardDescription>
        </CardHeader>
        <CardContent class="text-center">
          <p class="text-sm text-muted-foreground">
            {{ $t('invite.confirmEmailHint', { email: invitation?.email }) }}
          </p>
        </CardContent>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Loader2,
  XCircle,
  CheckCircle,
  UserPlus,
  ArrowLeft,
  AlertTriangle,
  LogOut,
  Mail
} from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type ViewState = 'loading' | 'invalid' | 'register' | 'accepting' | 'success' | 'email-mismatch' | 'email-confirmation-pending'

interface InvitationData {
  id: string
  organization_id: string
  organization_name: string
  email: string
  role: string
  status: string
  expires_at: string
  invited_by_name: string
}

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()

const state = ref<ViewState>('loading')
const invitation = ref<InvitationData | null>(null)
const errorMessage = ref('')
const expectedEmail = ref('')

// Registration form state
const fullName = ref('')
const password = ref('')
const confirmPassword = ref('')
const formError = ref('')
const isSubmitting = ref(false)

// Redirect countdown
const redirectCountdown = ref(5)
let countdownInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  const token = route.params.token as string

  if (!token) {
    state.value = 'invalid'
    errorMessage.value = t('invite.noToken')
    return
  }

  await fetchInvitation(token)
})

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})

async function fetchInvitation(token: string) {
  try {
    const { data, error } = await supabase.rpc('get_invitation_by_token', { p_token: token })

    if (error) throw error

    if (!data || data.length === 0) {
      state.value = 'invalid'
      return
    }

    invitation.value = data[0] as InvitationData

    // Check if user is authenticated
    await authStore.initialize()

    if (authStore.isAuthenticated) {
      // User is logged in - try to accept automatically
      await acceptInvitation(token)
    } else {
      // User needs to register or login
      state.value = 'register'
    }
  } catch (e) {
    console.error('Error fetching invitation:', e)
    state.value = 'invalid'
    errorMessage.value = e instanceof Error ? e.message : t('errors.unknownError')
  }
}

async function acceptInvitation(token: string) {
  state.value = 'accepting'

  try {
    const { data, error } = await supabase.rpc('accept_invitation', { p_token: token })

    if (error) throw error

    const result = data as { success: boolean; error?: string; expected_email?: string }

    if (!result.success) {
      if (result.error === 'Email mismatch' && result.expected_email) {
        expectedEmail.value = result.expected_email
        state.value = 'email-mismatch'
        return
      }

      if (result.error === 'User already belongs to an organization') {
        // User is already in an org, just redirect to dashboard
        router.push({ name: 'dashboard' })
        return
      }

      state.value = 'invalid'
      errorMessage.value = result.error || t('errors.unknownError')
      return
    }

    // Success - refresh auth state and start redirect
    await authStore.refreshProfile()
    state.value = 'success'
    startRedirectCountdown()
  } catch (e) {
    console.error('Error accepting invitation:', e)
    state.value = 'invalid'
    errorMessage.value = e instanceof Error ? e.message : t('errors.unknownError')
  }
}

function startRedirectCountdown() {
  countdownInterval = setInterval(() => {
    redirectCountdown.value--
    if (redirectCountdown.value <= 0) {
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }
      router.push({ name: 'dashboard' })
    }
  }, 1000)
}

async function handleRegister() {
  formError.value = ''

  // Validation
  if (!fullName.value || fullName.value.length < 2) {
    formError.value = t('validation.fullNameRequired')
    return
  }

  if (!password.value || password.value.length < 8) {
    formError.value = t('errors.passwordMinLength', { min: 8 })
    return
  }

  if (password.value !== confirmPassword.value) {
    formError.value = t('errors.passwordsMustMatch')
    return
  }

  if (!invitation.value) {
    formError.value = t('errors.unknownError')
    return
  }

  isSubmitting.value = true
  const token = route.params.token as string

  try {
    // Register with Supabase Auth - include redirectTo for email confirmation callback
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invitation.value.email,
      password: password.value,
      options: {
        data: {
          full_name: fullName.value,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?invite_token=${token}`,
      },
    })

    if (authError) throw authError

    if (!authData.user) {
      throw new Error(t('errors.unknownError'))
    }

    // Show email confirmation pending state
    state.value = 'email-confirmation-pending'
  } catch (e) {
    console.error('Error registering:', e)
    formError.value = e instanceof Error ? e.message : t('errors.unknownError')

    // Handle specific errors
    const message = e instanceof Error ? e.message : ''
    if (message.includes('already registered')) {
      formError.value = t('invite.emailAlreadyRegistered')
    }
  } finally {
    isSubmitting.value = false
  }
}

function redirectToLogin() {
  const token = route.params.token as string
  router.push({ name: 'login', query: { invite_token: token } })
}

async function handleLogoutAndRegister() {
  await authStore.signOut()
  state.value = 'register'
}
</script>
