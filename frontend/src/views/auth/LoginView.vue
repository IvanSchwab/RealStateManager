<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <Card class="w-full max-w-md">
      <CardHeader class="text-center space-y-1">
<div class="flex items-center justify-center w-full py-6">
  <img 
    src="/logo.svg" 
    alt="Logo" 
    class="h-16 w-auto max-w-[80%] object-contain transition-all duration-300" 
  />
</div>
        <CardTitle class="text-2xl">PIA Gestión</CardTitle>
        <CardDescription>{{ $t('auth.signInToAccount') }}</CardDescription>
      </CardHeader>

      <CardContent>
        <form class="space-y-4" @submit.prevent="handleLogin">
          <!-- Invite Token Banner -->
          <div v-if="hasInviteToken" class="p-3 rounded-md bg-primary/10 text-primary text-sm flex items-center gap-2">
            <UserPlus class="w-4 h-4 flex-shrink-0" />
            {{ $t('invite.loginToAccept') }}
          </div>

          <div v-if="errorMessage" class="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {{ errorMessage }}
          </div>

          <div class="space-y-2">
            <Label for="email">{{ $t('auth.email') }}</Label>
            <Input
              id="email"
              v-model="email"
              type="email"
              placeholder="you@example.com"
              :disabled="isSubmitting"
              @input="errorMessage = ''"
            />
            <p v-if="emailError" class="text-sm text-destructive">{{ emailError }}</p>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label for="password">{{ $t('auth.password') }}</Label>
              <router-link
                :to="{ name: 'forgot-password' }"
                class="text-sm text-primary hover:underline"
              >
                {{ $t('auth.forgotPassword') }}
              </router-link>
            </div>
            <Input
              id="password"
              v-model="password"
              type="password"
              :placeholder="$t('auth.password')"
              :disabled="isSubmitting"
              @input="errorMessage = ''"
            />
            <p v-if="passwordError" class="text-sm text-destructive">{{ passwordError }}</p>
          </div>

          <Button type="submit" class="w-full" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
            {{ isSubmitting ? $t('auth.signingIn') : $t('auth.signIn') }}
          </Button>
        </form>
      </CardContent>

      <CardFooter class="justify-center">
        <p class="text-sm text-muted-foreground">
          {{ $t('auth.dontHaveAccount') }}
          <span class="text-primary">{{ $t('auth.contactAdmin') }}</span>
        </p>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Building2, Loader2, UserPlus } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

const hasInviteToken = computed(() => !!route.query.invite_token)

function validate(): boolean {
  emailError.value = ''
  passwordError.value = ''

  let valid = true

  if (!email.value) {
    emailError.value = t('errors.emailRequired')
    valid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    emailError.value = t('errors.invalidEmail')
    valid = false
  }

  if (!password.value) {
    passwordError.value = t('errors.passwordRequired')
    valid = false
  } else if (password.value.length < 6) {
    passwordError.value = t('errors.passwordMinLength', { min: 6 })
    valid = false
  }

  return valid
}

async function handleLogin() {
  if (!validate()) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    await authStore.signIn(email.value, password.value)

    // Check if there's an invite_token to process
    const inviteToken = route.query.invite_token as string
    if (inviteToken) {
      router.push({ name: 'accept-invite', params: { token: inviteToken } })
      return
    }

    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : t('errors.unknownError')

    if (message.includes('Invalid login credentials')) {
      errorMessage.value = t('errors.invalidCredentials')
    } else if (message.includes('Email not confirmed')) {
      errorMessage.value = t('errors.emailNotConfirmed')
    } else {
      errorMessage.value = message
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>
