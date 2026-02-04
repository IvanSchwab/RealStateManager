<template>
  <AlertDialog :open="open" @update:open="$emit('update:open', $event)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to delete <strong>"{{ tenantName }}"</strong>?
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
import { useTenants } from '@/composables/useTenants'

const props = defineProps<{
  open: boolean
  tenantId: string
  tenantName: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const { deleteTenant } = useTenants()
const isDeleting = ref(false)

async function handleConfirm() {
  isDeleting.value = true

  try {
    await deleteTenant(props.tenantId)
    alert('Tenant deleted successfully!')
    emit('confirm')
    emit('update:open', false)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete tenant'
    alert(`Error: ${message}`)
  } finally {
    isDeleting.value = false
  }
}
</script>
