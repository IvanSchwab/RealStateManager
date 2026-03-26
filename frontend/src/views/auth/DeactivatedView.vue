<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <Card class="w-full max-w-md">
      <CardHeader class="text-center space-y-1">
        <div class="mx-auto mb-2 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <UserX class="w-6 h-6 text-muted-foreground" />
        </div>
        <CardTitle class="text-2xl">{{ $t('deactivated.title') }}</CardTitle>
        <CardDescription>{{ $t('deactivated.description') }}</CardDescription>
      </CardHeader>

      <CardContent>
        <Button class="w-full" @click="handleSignOut" :disabled="isSigningOut">
          <Loader2 v-if="isSigningOut" class="w-4 h-4 mr-2 animate-spin" />
          {{ $t('deactivated.signOut') }}
        </Button>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { UserX, Loader2 } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const router = useRouter()
const isSigningOut = ref(false)

async function handleSignOut() {
  isSigningOut.value = true
  try {
    await supabase.auth.signOut()
    router.push({ name: 'login' })
  } finally {
    isSigningOut.value = false
  }
}
</script>
