<template>
  <AlertDialog :open="open" @update:open="$emit('update:open', $event)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t('owners.deleteConfirmTitle') }}</AlertDialogTitle>
        <AlertDialogDescription class="space-y-3">
          <!-- Message when owner has NO properties -->
          <template v-if="propertyCount === 0">
            <p>{{ $t('owners.deleteConfirmNoProperties', { name: ownerName }) }}</p>
          </template>

          <!-- Message when owner HAS properties -->
          <template v-else>
            <p class="font-medium text-destructive">
              {{ $t('owners.deleteConfirmWithProperties', { name: ownerName, count: propertyCount }) }}
            </p>
            <p class="text-muted-foreground">
              {{ $t('owners.deletePropertiesWarning') }}
            </p>
            <p class="text-muted-foreground">
              {{ $t('owners.deleteContractsWarning') }}
            </p>
          </template>

          <p class="text-sm text-muted-foreground italic">
            {{ $t('owners.deleteIrreversible') }}
          </p>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="$emit('cancel')">
          {{ $t('common.cancel') }}
        </AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          @click="handleConfirm"
          :disabled="isDeleting"
        >
          <Loader2 v-if="isDeleting" class="w-4 h-4 mr-2 animate-spin" />
          {{ $t('common.delete') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
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
import { useToast } from '@/composables/useToast'

const toast = useToast()

const props = defineProps<{
  open: boolean
  ownerId: string
  ownerName: string
  propertyCount: number
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm', deletedPropertiesCount: number): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()
const { deleteOwner } = useOwners()
const isDeleting = ref(false)

async function handleConfirm() {
  isDeleting.value = true

  try {
    const result = await deleteOwner(props.ownerId)
    if (result.deletedPropertiesCount > 0) {
      toast.success(t('toast.ownerDeletedWithProperties', { count: result.deletedPropertiesCount }))
    } else {
      toast.success(t('toast.ownerDeleted'))
    }
    emit('confirm', result.deletedPropertiesCount)
    emit('update:open', false)
  } catch (e) {
    const message = e instanceof Error ? e.message : t('owners.deleteError')
    toast.error(`${t('common.error')}: ${message}`)
  } finally {
    isDeleting.value = false
  }
}
</script>
