<template>
  <div class="p-6 space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold">Configuracion</h1>
        <p class="text-muted-foreground text-sm">
          Administra las preferencias de tu cuenta
        </p>
      </div>

      <!-- Notifications Section -->
      <Card>
        <CardHeader>
          <div class="flex items-center gap-2">
            <Bell class="w-5 h-5 text-muted-foreground" />
            <CardTitle>Notificaciones</CardTitle>
          </div>
          <CardDescription>
            Configura y prueba el sistema de notificaciones
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
            <div class="space-y-1">
              <p class="text-sm font-medium">Probar notificaciones</p>
              <p class="text-xs text-muted-foreground">
                Envia una notificacion de prueba para verificar que el sistema funciona correctamente
              </p>
            </div>
            <Button
              @click="handleTestNotification"
              :disabled="testingNotification"
              variant="outline"
            >
              <Loader2 v-if="testingNotification" class="w-4 h-4 mr-2 animate-spin" />
              <Send v-else class="w-4 h-4 mr-2" />
              Enviar prueba
            </Button>
          </div>

          <!-- Success/Error message -->
          <div
            v-if="testMessage"
            class="p-3 rounded-lg text-sm"
            :class="testSuccess ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'"
          >
            <div class="flex items-center gap-2">
              <CheckCircle v-if="testSuccess" class="w-4 h-4" />
              <AlertCircle v-else class="w-4 h-4" />
              {{ testMessage }}
            </div>
          </div>
        </CardContent>
      </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { Bell, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-vue-next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/composables/useNotifications'

const { sendTestNotification } = useNotifications()

const testingNotification = ref(false)
const testMessage = ref('')
const testSuccess = ref(false)
let messageTimeout: ReturnType<typeof setTimeout> | null = null

async function handleTestNotification() {
  testingNotification.value = true
  testMessage.value = ''

  const result = await sendTestNotification()

  testingNotification.value = false
  testSuccess.value = result.success

  if (result.success) {
    testMessage.value = 'Notificacion enviada. Revisa el icono de la campana en la barra superior.'
  } else {
    testMessage.value = result.error || 'Error al enviar la notificacion de prueba'
  }

  // Clear any existing timeout before setting a new one
  if (messageTimeout) {
    clearTimeout(messageTimeout)
  }
  // Clear message after 5 seconds
  messageTimeout = setTimeout(() => {
    testMessage.value = ''
  }, 5000)
}

onUnmounted(() => {
  // Clean up any pending timeout to prevent memory leaks
  if (messageTimeout) {
    clearTimeout(messageTimeout)
  }
})
</script>
