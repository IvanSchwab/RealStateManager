<template>
  <AlertDialog :open="open" @update:open="$emit('update:open', $event)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete Property</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to delete <strong>"{{ propertyName }}"</strong>?
          This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="$emit('cancel')">
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          @click="handleConfirm"
        >
          <Loader2 v-if="isDeleting" class="w-4 h-4 mr-2 animate-spin" />
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-vue-next'
import { useProperties } from '@/composables/useProperties'

const props = defineProps<{
  open: boolean
  propertyId: string
  propertyName: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const { deleteProperty } = useProperties()
const isDeleting = ref(false)

async function handleConfirm() {
  isDeleting.value = true

  try {
    await deleteProperty(props.propertyId)
    alert('Property deleted successfully!')
    emit('confirm')
    emit('update:open', false)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete property'
    alert(`Error: ${message}`)
  } finally {
    isDeleting.value = false
  }
}
</script>
