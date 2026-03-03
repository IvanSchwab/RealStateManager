<template>
  <Card>
    <CardHeader class="pb-3">
      <CardTitle class="flex items-center gap-2 text-lg">
        <TrendingUp class="h-5 w-5 text-primary" />
        Ajustes de Alquiler
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Loading state -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-muted animate-pulse" />
          <div class="flex-1">
            <div class="h-4 w-24 bg-muted animate-pulse rounded" />
            <div class="h-3 w-32 bg-muted animate-pulse rounded mt-1" />
          </div>
        </div>
      </div>

      <!-- Content -->
      <div v-else class="space-y-3">
        <!-- Applied adjustments this month -->
        <div v-if="appliedCount > 0" class="flex items-start gap-3">
          <div class="rounded-full bg-green-100 dark:bg-green-900/30 p-2">
            <Check class="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium">
              {{ appliedCount }} {{ appliedCount === 1 ? 'contrato ajustado' : 'contratos ajustados' }}
            </p>
            <p class="text-xs text-muted-foreground">Este mes</p>
          </div>
        </div>

        <!-- Estimated adjustments pending correction -->
        <div v-if="estimatedCount > 0" class="flex items-start gap-3">
          <div class="rounded-full bg-orange-100 dark:bg-orange-900/30 p-2">
            <AlertCircle class="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium">
              {{ estimatedCount }} {{ estimatedCount === 1 ? 'ajuste estimado' : 'ajustes estimados' }}
            </p>
            <p class="text-xs text-muted-foreground">
              Pendiente de corrección con IPC oficial
            </p>
          </div>
        </div>

        <!-- Pending adjustments to process -->
        <div v-if="pendingCount > 0" class="flex items-start gap-3">
          <div class="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
            <Calendar class="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium">
              {{ pendingCount }} {{ pendingCount === 1 ? 'contrato pendiente' : 'contratos pendientes' }}
            </p>
            <p class="text-xs text-muted-foreground">
              Requiere ajuste este mes
            </p>
          </div>
        </div>

        <!-- No adjustments message -->
        <div v-if="appliedCount === 0 && estimatedCount === 0 && pendingCount === 0" class="text-center py-2">
          <p class="text-sm text-muted-foreground">
            No hay ajustes pendientes
          </p>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex flex-wrap gap-2 pt-2 border-t">
        <Button
          v-if="pendingCount > 0"
          size="sm"
          @click="$emit('process-adjustments')"
          :disabled="processing"
        >
          <Play class="h-4 w-4 mr-2" />
          Procesar ajustes
        </Button>

        <Button
          v-if="estimatedCount > 0"
          size="sm"
          variant="outline"
          @click="$emit('view-estimated')"
        >
          <AlertCircle class="h-4 w-4 mr-2" />
          Ver estimados
        </Button>

        <Button
          size="sm"
          variant="ghost"
          @click="$emit('view-history')"
        >
          <History class="h-4 w-4 mr-2" />
          Historial
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  Check,
  AlertCircle,
  Calendar,
  Play,
  History,
} from 'lucide-vue-next'

withDefaults(defineProps<{
  appliedCount: number
  estimatedCount: number
  pendingCount: number
  processing?: boolean
  loading?: boolean
}>(), {
  processing: false,
  loading: false,
})

defineEmits<{
  'process-adjustments': []
  'view-estimated': []
  'view-history': []
}>()
</script>
