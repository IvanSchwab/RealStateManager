<template>
  <AlertDialog :open="open" @update:open="$emit('update:open', $event)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Eliminar Propietario</AlertDialogTitle>
        <AlertDialogDescription>
          ¿Está seguro que desea eliminar a <strong>"{{ ownerName }}"</strong>?
          <span class="block mt-2 text-muted-foreground">
            Esta acción no se puede deshacer.
          </span>
          <span
            v-if="propertyCount > 0"
            class="block mt-2 text-amber-600 dark:text-amber-500 font-medium"
          >
            ⚠️ Este propietario tiene {{ propertyCount }}
            {{ propertyCount === 1 ? 'propiedad asociada' : 'propiedades asociadas' }}.
          </span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="$emit('cancel')">
          Cancelar
        </AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          @click="handleConfirm"
        >
          <Loader2 v-if="isDeleting" class="w-4 h-4 mr-2 animate-spin" />
          Eliminar
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
import { useOwners } from '@/composables/useOwners'

const props = defineProps<{
  open: boolean
  ownerId: string
  ownerName: string
  propertyCount: number
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const { deleteOwner } = useOwners()
const isDeleting = ref(false)

async function handleConfirm() {
  isDeleting.value = true

  try {
    await deleteOwner(props.ownerId)
    alert('Propietario eliminado correctamente')
    emit('confirm')
    emit('update:open', false)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al eliminar propietario'
    alert(`Error: ${message}`)
  } finally {
    isDeleting.value = false
  }
}
</script>
