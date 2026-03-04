<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <Card class="w-full max-w-md">
      <CardHeader class="text-center space-y-1">
        <div class="mx-auto mb-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center">
          <Lock class="w-6 h-6 text-primary-foreground" />
        </div>
        <CardTitle class="text-2xl">Nueva Contraseña</CardTitle>
        <CardDescription>
          Ingrese su nueva contraseña para restablecer el acceso a su cuenta.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <!-- Token Error State -->
        <div v-if="tokenError" class="text-center space-y-4">
          <div class="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle class="w-6 h-6 text-destructive" />
          </div>
          <div class="space-y-2">
            <p class="font-medium text-foreground">Enlace inválido o expirado</p>
            <p class="text-sm text-muted-foreground">
              El enlace de recuperación ha expirado o no es válido. Por favor solicite uno nuevo.
            </p>
          </div>
          <Button variant="outline" class="mt-4" @click="$router.push({ name: 'forgot-password' })">
            Solicitar nuevo enlace
          </Button>
        </div>

        <!-- Success State -->
        <div v-else-if="success" class="text-center space-y-4">
          <div class="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle class="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div class="space-y-2">
            <p class="font-medium text-foreground">Contraseña actualizada</p>
            <p class="text-sm text-muted-foreground">
              Su contraseña ha sido restablecida exitosamente. Redirigiendo al inicio de sesión en {{ redirectCountdown }}...
            </p>
          </div>
          <Button class="mt-4" @click="router.push({ name: 'login' })">
            Ir a iniciar sesión ahora
          </Button>
        </div>

        <!-- Loading State -->
        <div v-else-if="loading" class="py-8 text-center text-muted-foreground">
          <Loader2 class="w-8 h-8 mx-auto animate-spin" />
          <p class="mt-2">Verificando enlace...</p>
        </div>

        <!-- Form -->
        <form v-else class="space-y-4" @submit.prevent="handleSubmit">
          <div v-if="errorMessage" class="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {{ errorMessage }}
          </div>

          <div class="space-y-2">
            <Label for="password">Nueva contraseña</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              :disabled="isSubmitting"
              @input="clearErrors"
            />
            <p v-if="passwordError" class="text-sm text-destructive">{{ passwordError }}</p>
          </div>

          <div class="space-y-2">
            <Label for="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              placeholder="Repita la contraseña"
              :disabled="isSubmitting"
              @input="clearErrors"
            />
            <p v-if="confirmPasswordError" class="text-sm text-destructive">{{ confirmPasswordError }}</p>
          </div>

          <Button type="submit" class="w-full" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
            {{ isSubmitting ? 'Actualizando...' : 'Actualizar contraseña' }}
          </Button>
        </form>
      </CardContent>

      <CardFooter v-if="!success && !tokenError && !loading" class="justify-center">
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Lock, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

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
    passwordError.value = 'La contraseña es requerida'
    valid = false
  } else if (password.value.length < 8) {
    passwordError.value = 'La contraseña debe tener al menos 8 caracteres'
    valid = false
  }

  if (!confirmPassword.value) {
    confirmPasswordError.value = 'Debe confirmar la contraseña'
    valid = false
  } else if (password.value !== confirmPassword.value) {
    confirmPasswordError.value = 'Las contraseñas no coinciden'
    valid = false
  }

  return valid
}

async function handleSubmit() {
  if (!validate()) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const { data, error } = await supabase.auth.updateUser({
      password: password.value,
    })

    if (error) throw error

    // Password updated successfully
    // Sign out to clear the recovery session - user will login with new password
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignore sign out errors - session might already be invalid
    }

    // Set success state after signOut to prevent auth state changes from interfering
    success.value = true
    isSubmitting.value = false

    // Auto-redirect to login after a brief countdown
    const countdownInterval = setInterval(() => {
      redirectCountdown.value--
      if (redirectCountdown.value <= 0) {
        clearInterval(countdownInterval)
        router.push({ name: 'login' })
      }
    }, 1000)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'

    if (message.includes('same as')) {
      errorMessage.value = 'La nueva contraseña debe ser diferente a la anterior'
    } else if (message.includes('weak') || message.includes('password')) {
      errorMessage.value = 'La contraseña es muy débil. Use una combinación de letras, números y símbolos.'
    } else if (message.includes('session') || message.includes('token') || message.includes('expired')) {
      tokenError.value = true
    } else {
      errorMessage.value = `Error al actualizar la contraseña: ${message}`
    }
    isSubmitting.value = false
  }
}

onMounted(async () => {
  // Check if we have a valid session from the recovery link
  // Supabase automatically handles the token from the URL hash
  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      // Try to exchange the recovery token if present in URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const type = hashParams.get('type')

      if (type === 'recovery' && accessToken) {
        // The session should already be set by Supabase from the URL hash
        // Give it a moment to process
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
