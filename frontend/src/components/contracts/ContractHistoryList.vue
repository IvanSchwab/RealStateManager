<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="flex items-center gap-4 p-3 border border-border rounded-lg animate-pulse">
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-muted rounded w-3/4"></div>
          <div class="h-3 bg-muted rounded w-1/2"></div>
        </div>
        <div class="h-6 w-16 bg-muted rounded"></div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="py-6 text-center">
      <AlertCircle class="w-8 h-8 mx-auto text-destructive mb-2" />
      <p class="text-sm text-destructive mb-2">{{ $t('contractHistory.errorLoading') }}</p>
      <p class="text-xs text-muted-foreground mb-3">{{ error }}</p>
      <Button variant="outline" size="sm" @click="loadContracts">
        {{ $t('common.retry') }}
      </Button>
    </div>

    <!-- Empty state -->
    <div v-else-if="contracts.length === 0" class="py-8 text-center">
      <FileText class="w-10 h-10 mx-auto text-muted-foreground mb-3" />
      <p class="text-sm text-muted-foreground">{{ $t('contractHistory.noContracts') }}</p>
    </div>

    <!-- Contract list -->
    <div v-else class="space-y-2">
      <div
        v-for="contract in contracts"
        :key="contract.id"
        class="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
        @click="navigateToContract(contract.id)"
      >
        <div class="flex-1 min-w-0">
          <!-- Property address -->
          <p class="font-medium text-sm truncate">
            {{ contract.propertyAddress }}
          </p>
          <!-- Contract details row -->
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
            <!-- Tenant info (hide for property view since it's redundant context) -->
            <span v-if="entityType !== 'tenant'" class="flex items-center gap-1">
              <User class="w-3 h-3" />
              <span v-if="contract.tenantCount > 1">
                {{ contract.tenantNames }} {{ $t('contractHistory.multipleTenants', { count: contract.tenantCount - 1 }) }}
              </span>
              <span v-else>{{ contract.tenantNames }}</span>
            </span>
            <!-- Date range -->
            <span class="flex items-center gap-1">
              <Calendar class="w-3 h-3" />
              {{ formatDate(contract.startDate) }} - {{ formatDate(contract.endDate) }}
            </span>
            <!-- Monthly rent -->
            <span class="flex items-center gap-1">
              <DollarSign class="w-3 h-3" />
              {{ formatCurrency(contract.monthlyRent) }}
            </span>
          </div>
        </div>
        <!-- Status badge -->
        <Badge :variant="getStatusVariant(contract.status)" class="ml-2 shrink-0">
          {{ $t(`contractHistory.status.${contract.status}`) }}
        </Badge>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, FileText, User, Calendar, DollarSign } from 'lucide-vue-next'
import { useContractHistory, type ContractHistoryEntityType } from '@/composables/useContractHistory'
import { useFormatDate } from '@/composables/useFormatDate'
import { useFormatCurrency } from '@/composables/useFormatCurrency'
import type { ContractDisplayStatus } from '@/types'

const props = defineProps<{
  entityType: ContractHistoryEntityType
  entityId: string
}>()

const router = useRouter()
const { contracts, loading, error, fetchContractHistory } = useContractHistory()
const { formatDate } = useFormatDate()
const { formatCurrency } = useFormatCurrency()

function getStatusVariant(status: ContractDisplayStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default'
    case 'expiring_soon':
      return 'outline'
    case 'expired':
      return 'secondary'
    case 'cancelled':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function navigateToContract(contractId: string) {
  router.push({ name: 'contract-details', params: { id: contractId } })
}

async function loadContracts() {
  await fetchContractHistory(props.entityType, props.entityId)
}

// Load contracts on mount
onMounted(() => {
  loadContracts()
})

// Reload when entityId changes
watch(() => props.entityId, () => {
  loadContracts()
})
</script>
