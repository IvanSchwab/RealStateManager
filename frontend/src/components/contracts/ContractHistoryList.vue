<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="ch-list">
      <div v-for="i in 3" :key="i" class="ch-row ch-skeleton">
        <div class="ch-skeleton-line" style="width: 60%; height: 12px; border-radius: 4px" />
        <div class="ch-skeleton-line" style="width: 40%; height: 11px; border-radius: 4px; margin-top: 6px" />
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="ch-empty">
      <p style="color: var(--terra); font-size: 13px; font-weight: 500">{{ $t('contractHistory.errorLoading') }}</p>
      <p style="font-size: 11.5px; color: var(--pia-text-4); margin-top: 4px">{{ error }}</p>
      <button class="pia-btn pia-btn-ghost pia-btn-sm" style="margin-top: 10px" @click="loadContracts">
        {{ $t('common.retry') }}
      </button>
    </div>

    <!-- Empty state -->
    <div v-else-if="contracts.length === 0" class="ch-empty">
      <p style="font-size: 13px; color: var(--pia-text-4)">{{ $t('contractHistory.noContracts') }}</p>
    </div>

    <!-- Contract list -->
    <div v-else class="ch-list">
      <div
        v-for="contract in visibleContracts"
        :key="contract.id"
        class="ch-row"
        @click="navigateToContract(contract.id)"
      >
        <div class="ch-row-left">
          <span class="ch-address">{{ contract.propertyAddress }}</span>
          <span class="ch-dates">
            {{ formatDate(contract.startDate) }} → {{ formatDate(contract.endDate) }}
          </span>
        </div>
        <div class="ch-row-right">
          <span class="ch-status" :class="getStatusClass(contract.status)">
            <span class="ch-dot" />
            {{ $t(`contractHistory.status.${contract.status}`) }}
          </span>
          <span class="ch-rent">{{ formatCompactRent(contract.monthlyRent) }}</span>
        </div>
      </div>

      <!-- Show more button -->
      <button v-if="contracts.length > PREVIEW_COUNT && !showAll" class="ch-show-more" @click.stop="showAll = true">
        Mostrar más ({{ contracts.length - PREVIEW_COUNT }})
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useContractHistory, type ContractHistoryEntityType } from '@/composables/useContractHistory'
import { useFormatDate } from '@/composables/useFormatDate'
import type { ContractDisplayStatus } from '@/types'

const props = defineProps<{
  entityType: ContractHistoryEntityType
  entityId: string
}>()

const router = useRouter()
const { contracts, loading, error, fetchContractHistory } = useContractHistory()
const { formatDate } = useFormatDate()

const PREVIEW_COUNT = 3
const showAll = ref(false)

const visibleContracts = computed(() =>
  showAll.value ? contracts.value : contracts.value.slice(0, PREVIEW_COUNT)
)

function getStatusClass(status: ContractDisplayStatus): string {
  switch (status) {
    case 'active': return 'ch-status--active'
    case 'expiring_soon': return 'ch-status--warning'
    case 'expired': return 'ch-status--muted'
    case 'cancelled': return 'ch-status--danger'
    case 'renewed': return 'ch-status--active'
    default: return 'ch-status--muted'
  }
}

function formatCompactRent(amount: number): string {
  if (amount >= 1_000_000) return `$ ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$ ${Math.round(amount / 1_000)}k`
  return `$ ${amount}`
}

function navigateToContract(contractId: string) {
  router.push({ name: 'contract-details', params: { id: contractId } })
}

async function loadContracts() {
  await fetchContractHistory(props.entityType, props.entityId)
}

onMounted(() => loadContracts())
watch(() => props.entityId, () => loadContracts())
</script>

<style scoped>
.ch-list {
  display: flex;
  flex-direction: column;
}

.ch-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--pia-border);
  cursor: pointer;
  transition: background 0.12s;
}

.ch-row:last-child {
  border-bottom: none;
}

.ch-row:hover {
  background: var(--pia-surface-2);
}

/* Skeleton */
.ch-skeleton {
  cursor: default;
}

.ch-skeleton:hover {
  background: none;
}

.ch-skeleton-line {
  background: var(--pia-border);
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Left column */
.ch-row-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.ch-address {
  font-size: 13px;
  font-weight: 500;
  color: var(--pia-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ch-dates {
  font-size: 11.5px;
  color: var(--pia-text-4);
  font-family: var(--font-mono);
  white-space: nowrap;
}

/* Right column */
.ch-row-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  flex-shrink: 0;
}

.ch-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 500;
  white-space: nowrap;
}

.ch-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ch-status--active .ch-dot { background: var(--brand-600); }
.ch-status--active { color: var(--brand-700); }

.ch-status--warning .ch-dot { background: var(--amber-500); }
.ch-status--warning { color: var(--amber-700); }

.ch-status--danger .ch-dot { background: var(--terra); }
.ch-status--danger { color: var(--terra); }

.ch-status--muted .ch-dot { background: var(--pia-text-4); }
.ch-status--muted { color: var(--pia-text-3); }

.ch-rent {
  font-size: 11.5px;
  color: var(--pia-text-3);
  font-family: var(--font-mono);
}

/* Show more */
.ch-show-more {
  display: block;
  width: 100%;
  padding: 10px 18px;
  text-align: center;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--brand-700);
  background: none;
  border: none;
  border-top: 1px solid var(--pia-border);
  cursor: pointer;
  font-family: var(--font-sans);
  transition: background 0.12s;
}

.ch-show-more:hover {
  background: var(--brand-50);
}

/* Empty state */
.ch-empty {
  padding: 24px 18px;
  text-align: center;
}
</style>
