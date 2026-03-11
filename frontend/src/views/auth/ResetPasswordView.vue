<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <Card class="w-full max-w-md">
      <CardHeader class="text-center space-y-1">
        <div class="mx-auto mb-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center">
          <Lock class="w-6 h-6 text-primary-foreground" />
        </div>
        <CardTitle class="text-2xl">{{ $t('auth.newPasswordTitle') }}</CardTitle>
        <CardDescription>
          {{ $t('auth.newPasswordDescription') }}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <!-- Token Error State -->
        <div v-if="tokenError" class="text-center space-y-4">
          <div class="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle class="w-6 h-6 text-destructive" />
          </div>
          <div class="space-y-2">
            <p class="font-medium text-foreground">{{ $t('auth.invalidLink') }}</p>
            <p class="text-sm text-muted-foreground">
              {{ $t('auth.invalidLinkDescription') }}
            </p>
          </div>
          <Button variant="outline" class="mt-4" @click="$router.push({ name: 'forgot-password' })">
            {{ $t('auth.requestNewLink') }}
          </Button>
        </div>

        <!-- Success State -->
        <div v-else-if="success" class="text-center space-y-4">
          <div class="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle class="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div class="space-y-2">
            <p class="font-medium text-foreground">{{ $t('auth.passwordUpdated') }}</p>
            <p class="text-sm text-muted-foreground">
              {{ $t('auth.passwordUpdatedDescription', { seconds: redirectCountdown }) }}
            </p>
          </div>
          <Button class="mt-4" @click="router.push({ name: 'login' })">
            {{ $t('auth.goToLogin') }}
          </Button>
        </div>

        <!-- Loading State -->
        <div v-else-if="loading" class="py-8 text-center text-muted-foreground">
          <Loader2 class="w-8 h-8 mx-auto animate-spin" />
          <p class="mt-2">{{ $t('auth.verifyingLink') }}</p>
        </div>

        <!-- Form -->
        <form v-else class="space-y-4" @submit.prevent="handleSubmit">
          <div v-if="errorMessage" class="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {{ errorMessage }}
          </div>

          <div class="space-y-2">
            <Label for="password">{{ $t('auth.newPassword') }}</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              :placeholder="$t('auth.minCharacters', { min: 8 })"
              :disabled="isSubmitting"
              @input="clearErrors"
            />
            <p v-if="passwordError" class="text-sm text-destructive">{{ passwordError }}</p>
          </div>

          <div class="space-y-2">
            <Label for="confirmPassword">{{ $t('auth.confirmPassword') }}</Label>
            <Input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              :placeholder="$t('auth.repeatPassword')"
              :disabled="isSubmitting"
              @input="clearErrors"
            />
            <p v-if="confirmPasswordError" class="text-sm text-destructive">{{ confirmPasswordError }}</p>
          </div>

          <Button type="submit" class="w-full" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
            {{ isSubmitting ? $t('auth.updating') : $t('auth.updatePassword') }}
          </Button>
        </form>
      </CardContent>

      <CardFooter v-if="!success && !tokenError && !loading" class="justify-center">
        <router-link
          :to="{ name: 'login' }"
          class="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft class="w-4 h-4 inline mr-1" />
          {{ $t('auth.backToLogin') }}
        </router-link>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Lock, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const { t } = useI18n()
const router = useRouter()

const password = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)
const loading = ref(true)
const success = ref(false)
const tokenError = ref(false)
const redirectCountdown = ref(3)

function clearErrors() {
  passwordError.value = ''
  confirmPasswordError.value = ''
  errorMessage.value = ''
}

function validate(): boolean {
  clearErrors()
  let valid = true

  if (!password.value) {
    passwordError.value = t('errors.passwordRequired')
    valid = false
  } else if (password.value.length < 8) {
    passwordError.value = t('errors.passwordMinLength', { min: 8 })
    valid = false
  }

  if (!confirmPassword.value) {
    confirmPasswordError.value = t('errors.passwordRequired')
    valid = false
  } else if (password.value !== confirmPassword.value) {
    confirmPasswordError.value = t('errors.passwordMismatch')
    valid = false
  }

  return valid
}

async function handleSubmit() {
  if (!validate()) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const { error } = await supabase.auth.updateUser({
      password: password.value,
    })

    if (error) throw error

    try {
      await supabase.auth.signOut()
    } catch {
      // Ignore sign out errors
    }

    success.value = true
    isSubmitting.value = false

    const countdownInterval = setInterval(() => {
      redirectCountdown.value--
      if (redirectCountdown.value <= 0) {
        clearInterval(countdownInterval)
        router.push({ name: 'login' })
      }
    }, 1000)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : t('errors.unknownError')

    if (message.includes('same as')) {
      errorMessage.value = t('errors.passwordMustBeDifferent')
    } else if (message.includes('weak') || message.includes('password')) {
      errorMessage.value = t('errors.weakPassword')
    } else if (message.includes('session') || message.includes('token') || message.includes('expired')) {
      tokenError.value = true
    } else {
      errorMessage.value = t('errors.errorUpdatingPassword') + ': ' + message
    }
    isSubmitting.value = false
  }
}

onMounted(async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const type = hashParams.get('type')

      if (type === 'recovery' && accessToken) {
        await new Promise(resolve => setTimeout(resolve, 500))

        try {
          const { data: { session: newSession } } = await supabase.auth.getSession()

          if (!newSession) {
            tokenError.value = true
          }
        } catch {
          tokenError.value = true
        }
      } else if (!session) {
        tokenError.value = true
      }
    }
  } catch {
    tokenError.value = true
  } finally {
    loading.value = false
  }
})
</script>
