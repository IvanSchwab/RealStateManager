<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <Card class="w-full max-w-md">
      <!-- Loading State -->
      <template v-if="state === 'loading'">
        <CardHeader class="text-center space-y-1">
          <div class="mx-auto mb-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center">
            <Loader2 class="w-6 h-6 text-primary-foreground animate-spin" />
          </div>
          <CardTitle class="text-2xl">{{ $t('authCallback.verifying') }}</CardTitle>
          <CardDescription>{{ $t('authCallback.verifyingDescription') }}</CardDescription>
        </CardHeader>
      </template>

      <!-- Error State -->
      <template v-else-if="state === 'error'">
        <CardHeader class="text-center space-y-1">
          <div class="mx-auto mb-2 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle class="w-6 h-6 text-destructive" />
          </div>
          <CardTitle class="text-2xl">{{ $t('authCallback.errorTitle') }}</CardTitle>
          <CardDescription>{{ errorMessage }}</CardDescription>
        </CardHeader>
        <CardContent class="text-center">
          <Button @click="router.push({ name: 'login' })">
            <ArrowLeft class="w-4 h-4 mr-2" />
            {{ $t('auth.backToLogin') }}
          </Button>
        </CardContent>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Loader2, XCircle, ArrowLeft } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type ViewState = 'loading' | 'error'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const state = ref<ViewState>('loading')
const errorMessage = ref('')

onMounted(async () => {
  // Supabase automatically handles the token from the URL hash
  // Wait for the session to be established
  const { data: { session }, error } = await supabase.auth.getSession()

  const inviteToken = route.query.invite_token as string | undefined

  if (error || !session) {
    // Redirect to login with error
    state.value = 'error'
    errorMessage.value = t('authCallback.confirmationFailed')
    return
  }

  if (inviteToken) {
    try {
      // Accept the invitation now that we have a valid session
      const { data, error: rpcError } = await supabase.rpc('accept_invitation', {
        p_token: inviteToken,
      })

      if (rpcError) throw rpcError

      // Check if the RPC returned an error in the response
      const result = data as { success: boolean; error?: string } | null
      if (result && !result.success && result.error) {
        throw new Error(result.error)
      }

      // Reload profile to get updated organization_id and role
      const { loadProfile } = useAuth()
      await loadProfile()

      // Redirect to dashboard
      router.push('/')
    } catch (e) {
      console.error('Failed to accept invitation:', e)
      // Redirect back to invite page with error
      router.push(`/invite/${inviteToken}?error=acceptance_failed`)
    }
  } else {
    // Normal email confirmation — go to dashboard
    router.push('/')
  }
})
</script>
