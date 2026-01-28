<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <Card class="w-full max-w-md">
      <CardHeader class="text-center space-y-1">
        <div class="mx-auto mb-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center">
          <Building2 class="w-6 h-6 text-primary-foreground" />
        </div>
        <CardTitle class="text-2xl">Real Estate Management</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>

      <CardContent>
        <form class="space-y-4" @submit.prevent="handleLogin">
          <div v-if="errorMessage" class="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {{ errorMessage }}
          </div>

          <div class="space-y-2">
            <Label for="email">Email</Label>
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
            <Label for="password">Password</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              placeholder="Enter your password"
              :disabled="isSubmitting"
              @input="errorMessage = ''"
            />
            <p v-if="passwordError" class="text-sm text-destructive">{{ passwordError }}</p>
          </div>

          <Button type="submit" class="w-full" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
            {{ isSubmitting ? 'Signing in...' : 'Sign In' }}
          </Button>
        </form>
      </CardContent>

      <CardFooter class="justify-center">
        <p class="text-sm text-muted-foreground">
          Don't have an account?
          <span class="text-primary">Contact administrator</span>
        </p>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Building2, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

function validate(): boolean {
  emailError.value = ''
  passwordError.value = ''

  let valid = true

  if (!email.value) {
    emailError.value = 'Email is required'
    valid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    emailError.value = 'Enter a valid email address'
    valid = false
  }

  if (!password.value) {
    passwordError.value = 'Password is required'
    valid = false
  } else if (password.value.length < 6) {
    passwordError.value = 'Password must be at least 6 characters'
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
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'

    if (message.includes('Invalid login credentials')) {
      errorMessage.value = 'Invalid email or password'
    } else if (message.includes('Email not confirmed')) {
      errorMessage.value = 'Please confirm your email before signing in'
    } else {
      errorMessage.value = message
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>
