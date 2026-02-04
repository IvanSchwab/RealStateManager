<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {{ isEditMode ? 'Edit Tenant' : 'Add New Tenant' }}
        </DialogTitle>
        <DialogDescription>
          {{ isEditMode
            ? 'Update the tenant information below.'
            : 'Fill in the tenant details to create a new record.'
          }}
        </DialogDescription>
      </DialogHeader>

      <!-- Loading state for edit mode -->
      <div v-if="isEditMode && loadingTenant" class="py-12 text-center">
        <Loader2 class="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
        <p class="mt-2 text-sm text-muted-foreground">Loading tenant...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="loadError" class="py-8 text-center">
        <p class="text-destructive font-medium">{{ loadError }}</p>
        <Button variant="outline" class="mt-4" @click="loadTenantData">
          Retry
        </Button>
      </div>

      <!-- Form -->
      <TenantForm
        v-else
        :initial-data="tenantData"
        :is-edit="isEditMode"
        @submit="handleSubmit"
        @cancel="$emit('update:open', false)"
      />
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-vue-next'
import TenantForm from './TenantForm.vue'
import { useTenants } from '@/composables/useTenants'
import type { Tenant, TenantFormData } from '@/types'

const props = defineProps<{
  open: boolean
  tenantId?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

const { fetchTenantById, createTenant, updateTenant } = useTenants()

const tenantData = ref<Partial<Tenant> | undefined>(undefined)
const loadingTenant = ref(false)
const loadError = ref<string | null>(null)
const isSubmitting = ref(false)

const isEditMode = computed(() => !!props.tenantId)

// Load tenant data when dialog opens in edit mode
watch([() => props.open, () => props.tenantId], async ([open, id]) => {
  if (open && id) {
    await loadTenantData()
  } else if (!open) {
    // Reset state when dialog closes
    tenantData.value = undefined
    loadError.value = null
  }
}, { immediate: true })

async function loadTenantData() {
  if (!props.tenantId) return

  loadingTenant.value = true
  loadError.value = null

  try {
    const data = await fetchTenantById(props.tenantId)
    if (data) {
      tenantData.value = data
    } else {
      loadError.value = 'Tenant not found'
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load tenant'
  } finally {
    loadingTenant.value = false
  }
}

async function handleSubmit(formData: TenantFormData) {
  isSubmitting.value = true

  try {
    if (isEditMode.value && props.tenantId) {
      await updateTenant(props.tenantId, formData)
      alert('Tenant updated successfully!')
    } else {
      await createTenant(formData)
      alert('Tenant created successfully!')
    }

    emit('success')
    emit('update:open', false)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Operation failed'
    alert(`Error: ${message}`)
  } finally {
    isSubmitting.value = false
  }
}
</script>
