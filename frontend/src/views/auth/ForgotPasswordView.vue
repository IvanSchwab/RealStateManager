<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <Card class="w-full max-w-md">
      <CardHeader class="text-center space-y-1">
        <div class="mx-auto mb-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center">
          <KeyRound class="w-6 h-6 text-primary-foreground" />
        </div>
        <CardTitle class="text-2xl">Recuperar Contraseña</CardTitle>
        <CardDescription>
          Ingrese su correo electrónico y le enviaremos un enlace para restablecer su contraseña.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <!-- Success State -->
        <div v-if="submitted" class="text-center space-y-4">
          <div class="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle class="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div class="space-y-2">
            <p class="font-medium text-foreground">Correo enviado</p>
            <p class="text-sm text-muted-foreground">
              Si existe una cuenta con el correo ingresado, recibirá un enlace para restablecer su contraseña.
            </p>
          </div>
          <Button variant="outline" class="mt-4" @click="$router.push({ name: 'login' })">
            <ArrowLeft class="w-4 h-4 mr-2" />
            Volver al inicio de sesión
          </Button>
        </div>

        <!-- Form -->
        <form v-else class="space-y-4" @submit.prevent="handleSubmit">
          <div v-if="errorMessage" class="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {{ errorMessage }}
          </div>

          <div class="space-y-2">
            <Label for="email">Correo electrónico</Label>
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
            {{ isSubmitting ? 'Enviando...' : 'Enviar enlace de recuperación' }}
          </Button>
        </form>
      </CardContent>

      <CardFooter v-if="!submitted" class="justify-center">
        <router-link
          :to="{ name: 'login' }"
          class="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft class="w-4 h-4 inline mr-1" />
          Volver al inicio de sesión
        </router-link>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { KeyRound, Loader2, CheckCircle, ArrowLeft } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const email = ref('')
const emailError = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)
const submitted = ref(false)

function validate(): boolean {
  emailError.value = ''

  if (!email.value) {
    emailError.value = 'El correo electrónico es requerido'
    return false
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    emailError.value = 'Ingrese un correo electrónico válido'
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
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

    console.log('=== Password Reset Debug ===')
    console.log('Supabase URL:', supabaseUrl)
    console.log('Redirect URL:', redirectUrl)
    console.log('Email:', email.value)

    const { data, error } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo: redirectUrl,
    })

    console.log('Full response - data:', data)
    console.log('Full response - error:', error)

    if (error) throw error

    // Always show success to avoid revealing if email exists
    submitted.value = true
  } catch (error: unknown) {
    // Log for debugging (but don't expose to user for security)
    console.error('Password reset error:', error)

    // Only show actual error for rate limiting or network issues
    const message = error instanceof Error ? error.message : ''

    if (message.includes('rate limit') || message.includes('too many requests')) {
      errorMessage.value = 'Demasiados intentos. Por favor espere unos minutos antes de intentar nuevamente.'
    } else if (message.includes('network') || message.includes('fetch')) {
      errorMessage.value = 'Error de conexión. Por favor verifique su conexión a internet.'
    } else {
      // For any other error, still show success for security
      // (don't reveal whether email exists in the system)
      submitted.value = true
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>
