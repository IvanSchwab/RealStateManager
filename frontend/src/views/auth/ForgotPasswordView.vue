<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <Card class="w-full max-w-md">
      <CardHeader class="text-center space-y-1">
        <div class="mx-auto mb-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center">
          <KeyRound class="w-6 h-6 text-primary-foreground" />
        </div>
        <CardTitle class="text-2xl">{{ $t('auth.recoverPassword') }}</CardTitle>
        <CardDescription>
          {{ $t('auth.recoverPasswordDescription') }}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <!-- Success State -->
        <div v-if="submitted" class="text-center space-y-4">
          <div class="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle class="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div class="space-y-2">
            <p class="font-medium text-foreground">{{ $t('auth.emailSent') }}</p>
            <p class="text-sm text-muted-foreground">
              {{ $t('auth.emailSentDescription') }}
            </p>
          </div>
          <Button variant="outline" class="mt-4" @click="$router.push({ name: 'login' })">
            <ArrowLeft class="w-4 h-4 mr-2" />
            {{ $t('auth.backToLogin') }}
          </Button>
        </div>

        <!-- Form -->
        <form v-else class="space-y-4" @submit.prevent="handleSubmit">
          <div v-if="errorMessage" class="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {{ errorMessage }}
          </div>

          <div class="space-y-2">
            <Label for="email">{{ $t('auth.email') }}</Label>
            <Input
              id="email"
              v-model="email"
              type="email"
              placeholder="correo@ejemplo.com"
              :disabled="isSubmitting"
              @input="errorMessage = ''"
            />
            <p v-if="emailError" class="text-sm text-destructive">{{ emailError }}</p>
          </div>

          <Button type="submit" class="w-full" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
            {{ isSubmitting ? $t('auth.sending') : $t('auth.sendRecoveryLink') }}
          </Button>
        </form>
      </CardContent>

      <CardFooter v-if="!submitted" class="justify-center">
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
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { KeyRound, Loader2, CheckCircle, ArrowLeft } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const { t } = useI18n()

const email = ref('')
const emailError = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)
const submitted = ref(false)

function validate(): boolean {
  emailError.value = ''

  if (!email.value) {
    emailError.value = t('errors.emailRequired')
    return false
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    emailError.value = t('errors.invalidEmail')
    return false
  }

  return true
}

async function handleSubmit() {
  if (!validate()) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const redirectUrl = `${window.location.origin}/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo: redirectUrl,
    })

    if (error) throw error

    // Always show success to avoid revealing if email exists
    submitted.value = true
  } catch (error: unknown) {
    console.error('Password reset error:', error)

    const message = error instanceof Error ? error.message : ''

    if (message.includes('rate limit') || message.includes('too many requests')) {
      errorMessage.value = t('errors.tooManyRequests')
    } else if (message.includes('network') || message.includes('fetch')) {
      errorMessage.value = t('errors.connectionError')
    } else {
      submitted.value = true
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>
