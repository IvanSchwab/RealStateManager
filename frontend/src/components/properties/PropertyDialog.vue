<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {{ isEditMode ? 'Edit Property' : 'Add New Property' }}
        </DialogTitle>
        <DialogDescription>
          {{ isEditMode 
            ? 'Update the property information below.' 
            : 'Fill in the property details to create a new listing.' 
          }}
        </DialogDescription>
      </DialogHeader>

      <!-- Loading state for edit mode -->
      <div v-if="isEditMode && loadingProperty" class="py-12 text-center">
        <Loader2 class="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
        <p class="mt-2 text-sm text-muted-foreground">Loading property...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="loadError" class="py-8 text-center">
        <p class="text-destructive font-medium">{{ loadError }}</p>
        <Button variant="outline" class="mt-4" @click="loadPropertyData">
          Retry
        </Button>
      </div>

      <!-- Form -->
      <PropertyForm
        v-else
        :initial-data="propertyData"
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
import PropertyForm from './PropertyForm.vue'
import { useProperties } from '@/composables/useProperties'
import type { Property } from '@/types'

const props = defineProps<{
  open: boolean
  propertyId?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

const { fetchPropertyById, createProperty, updateProperty } = useProperties()

const propertyData = ref<Partial<Property> | undefined>(undefined)
const loadingProperty = ref(false)
const loadError = ref<string | null>(null)
const isSubmitting = ref(false)

const isEditMode = computed(() => !!props.propertyId)

// Load property data when dialog opens in edit mode
watch([() => props.open, () => props.propertyId], async ([open, id]) => {
  if (open && id) {
    await loadPropertyData()
  } else if (!open) {
    // Reset state when dialog closes
    propertyData.value = undefined
    loadError.value = null
  }
}, { immediate: true })

async function loadPropertyData() {
  if (!props.propertyId) return

  loadingProperty.value = true
  loadError.value = null

  try {
    const data = await fetchPropertyById(props.propertyId)
    if (data) {
      propertyData.value = data
    } else {
      loadError.value = 'Property not found'
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load property'
  } finally {
    loadingProperty.value = false
  }
}

async function handleSubmit(formData: Partial<Property>) {
  isSubmitting.value = true

  try {
    if (isEditMode.value && props.propertyId) {
      await updateProperty(props.propertyId, formData)
      alert('Property updated successfully!')
    } else {
      await createProperty(formData)
      alert('Property created successfully!')
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
