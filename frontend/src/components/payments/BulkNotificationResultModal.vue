<template>
  <Dialog :open="open" @update:open="$emit('close')">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Bell class="w-5 h-5" />
          Resultado de notificaciones
        </DialogTitle>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <!-- Sent -->
        <div v-if="result.sent > 0" class="flex items-center gap-3">
          <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
            <CheckCircle2 class="w-4 h-4 text-green-600" />
          </div>
          <span class="text-sm">
            {{ result.sent }} {{ result.sent === 1 ? 'inquilino notificado' : 'inquilinos notificados' }} por email
          </span>
        </div>

        <!-- Skipped -->
        <div v-if="result.skipped > 0" class="flex items-center gap-3">
          <div class="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
            <SkipForward class="w-4 h-4 text-yellow-600" />
          </div>
          <span class="text-sm">
            {{ result.skipped }} {{ result.skipped === 1 ? 'omitido' : 'omitidos' }} (notificados recientemente)
          </span>
        </div>

        <!-- Failed -->
        <div v-if="result.failed > 0" class="flex items-center gap-3">
          <div class="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
            <XCircle class="w-4 h-4 text-red-600" />
          </div>
          <span class="text-sm">
            {{ result.failed }} {{ result.failed === 1 ? 'fallido' : 'fallidos' }}
          </span>
        </div>

        <!-- WhatsApp Pending Section -->
        <div v-if="result.whatsappPending.length > 0" class="pt-2 border-t">
          <div class="flex items-center gap-2 mb-3">
            <Smartphone class="w-4 h-4 text-green-600" />
            <span class="text-sm font-medium">
              Pendientes de notificar por WhatsApp
            </span>
          </div>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            <div
              v-for="item in result.whatsappPending"
              :key="item.paymentId"
              class="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-lg"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ item.tenantName }}</p>
                <p class="text-xs text-muted-foreground truncate">{{ item.propertyAddress }}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                class="shrink-0"
                @click="openWhatsApp(item.whatsappUrl)"
              >
                <MessageCircle class="w-4 h-4 mr-1" />
                WhatsApp
              </Button>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="result.sent === 0 && result.skipped === 0 && result.failed === 0 && result.whatsappPending.length === 0"
          class="text-center py-4 text-muted-foreground"
        >
          No hay resultados para mostrar
        </div>
      </div>

      <DialogFooter>
        <Button @click="$emit('close')">
          Cerrar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Bell,
  CheckCircle2,
  SkipForward,
  XCircle,
  Smartphone,
  MessageCircle,
} from 'lucide-vue-next'
import type { BulkNotificationResult } from '@/composables/useBulkNotification'

defineProps<{
  result: BulkNotificationResult
  open: boolean
}>()

defineEmits<{
  (e: 'close'): void
}>()

function openWhatsApp(url: string): void {
  window.open(url, '_blank')
}
</script>
