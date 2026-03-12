<template>
  <AlertDialog :open="open" @update:open="$emit('update:open', $event)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t('contracts.cancelContract') }}</AlertDialogTitle>
        <AlertDialogDescription class="space-y-4">
          <p>
            {{ $t('contracts.cancelConfirmDescription', { property: propertyAddress }) }}
          </p>

          <div v-if="tenantName" class="p-3 bg-muted rounded-lg">
            <p class="text-sm">
              <span class="text-muted-foreground">{{ $t('contracts.tenant') }}:</span>
              <span class="font-medium ml-2">{{ tenantName }}</span>
            </p>
          </div>

          <div class="flex items-start space-x-2 p-3 border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 rounded-lg">
            <AlertTriangle class="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
            <div class="text-sm text-yellow-700 dark:text-yellow-400">
              <p class="font-medium">{{ $t('common.warning') }}</p>
              <p>{{ $t('contracts.cancelWarning') }}</p>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <Checkbox
              id="update_property"
              :checked="updatePropertyStatus"
              @update:checked="updatePropertyStatus = $event"
            />
            <Label for="update_property" class="font-normal cursor-pointer text-sm">
              {{ $t('contracts.markPropertyAvailable') }}
            </Label>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="$emit('cancel')">
          {{ $t('contracts.keepContract') }}
        </AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          :disabled="isCancelling"
          @click="handleConfirm"
        >
          <Loader2 v-if="isCancelling" class="w-4 h-4 mr-2 animate-spin" />
          {{ $t('contracts.cancelContract') }}
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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Loader2, AlertTriangle } from 'lucide-vue-next'
import { useContracts } from '@/composables/useContracts'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const props = defineProps<{
  open: boolean
  contractId: string
  propertyAddress: string
  tenantName?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()
const { cancelContract } = useContracts()

const isCancelling = ref(false)
const updatePropertyStatus = ref(true)

async function handleConfirm() {
  isCancelling.value = true

  try {
    await cancelContract(props.contractId, updatePropertyStatus.value)
    toast.success(t('toast.contractCancelled'))
    emit('confirm')
    emit('update:open', false)
  } catch (e) {
    const message = e instanceof Error ? e.message : t('contracts.cancelError')
    toast.error(`${t('common.error')}: ${message}`)
  } finally {
    isCancelling.value = false
  }
}
</script>
