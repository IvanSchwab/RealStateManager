<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Recent Payments -->
    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-lg flex items-center gap-2">
          <Banknote class="w-5 h-5 text-green-500" />
          Pagos Recientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <!-- Loading state -->
        <div v-if="loading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="flex items-center gap-3">
            <div class="w-10 h-10 bg-muted animate-pulse rounded-full"></div>
            <div class="flex-1">
              <div class="h-4 w-32 bg-muted animate-pulse rounded mb-1"></div>
              <div class="h-3 w-24 bg-muted animate-pulse rounded"></div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="payments.length === 0" class="py-6 text-center">
          <p class="text-muted-foreground text-sm">No hay pagos recientes</p>
        </div>

        <!-- Payments list -->
        <div v-else class="space-y-3">
          <RouterLink
            v-for="payment in payments"
            :key="payment.id"
            :to="`/payments`"
            class="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <div class="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Check class="w-5 h-5 text-green-500" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ payment.tenantName }}</p>
              <p class="text-xs text-muted-foreground truncate">{{ payment.propertyAddress }}</p>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-sm font-medium text-green-600">{{ formatCurrency(payment.amount) }}</p>
              <p class="text-xs text-muted-foreground">{{ formatDate(payment.paymentDate) }}</p>
            </div>
          </RouterLink>
        </div>
      </CardContent>
    </Card>

    <!-- Expiring Contracts -->
    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-lg flex items-center gap-2">
          <Calendar class="w-5 h-5 text-orange-500" />
          Contratos por Vencer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <!-- Loading state -->
        <div v-if="loading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="flex items-center gap-3">
            <div class="w-10 h-10 bg-muted animate-pulse rounded-full"></div>
            <div class="flex-1">
              <div class="h-4 w-32 bg-muted animate-pulse rounded mb-1"></div>
              <div class="h-3 w-24 bg-muted animate-pulse rounded"></div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="contracts.length === 0" class="py-6 text-center">
          <p class="text-muted-foreground text-sm">No hay contratos por vencer</p>
        </div>

        <!-- Contracts list -->
        <div v-else class="space-y-3">
          <RouterLink
            v-for="contract in contracts"
            :key="contract.id"
            :to="`/contracts/${contract.id}`"
            class="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              :class="getUrgencyClass(contract.daysRemaining)"
            >
              <AlertTriangle v-if="contract.daysRemaining <= 15" class="w-5 h-5" />
              <Clock v-else class="w-5 h-5" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ contract.propertyAddress }}</p>
              <p class="text-xs text-muted-foreground truncate">{{ contract.tenantName }}</p>
            </div>
            <div class="text-right flex-shrink-0">
              <p
                class="text-sm font-medium"
                :class="contract.daysRemaining <= 15 ? 'text-red-600' : 'text-orange-600'"
              >
                {{ contract.daysRemaining }} días
              </p>
              <p class="text-xs text-muted-foreground">{{ formatDate(contract.endDate) }}</p>
            </div>
          </RouterLink>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Banknote, Calendar, Check, Clock, AlertTriangle } from 'lucide-vue-next'
import type { RecentPayment, ExpiringContract } from '@/composables/useDashboard'

withDefaults(defineProps<{
  payments: RecentPayment[]
  contracts: ExpiringContract[]
  loading?: boolean
}>(), {
  loading: false,
})

// Format currency in Argentine style
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format date in DD/MM/YYYY format
function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Get urgency styling based on days remaining
function getUrgencyClass(daysRemaining: number): string {
  if (daysRemaining <= 15) {
    return 'bg-red-500/10 text-red-500'
  }
  return 'bg-orange-500/10 text-orange-500'
}
</script>
