<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>Nuevo Documento Legal</DialogTitle>
        <DialogDescription>
          Selecciona el tipo de documento que deseas generar
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <!-- Corretaje Card -->
        <button
          type="button"
          class="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/50 transition-colors text-left"
          @click="selectType('corretaje')"
        >
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <FileSignature class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-medium text-foreground">Autorización de Corretaje</h3>
            <p class="text-sm text-muted-foreground mt-1">
              Autorización del propietario para intermediar en la venta o alquiler de un inmueble
            </p>
          </div>
        </button>

        <!-- Boleto Card -->
        <button
          type="button"
          class="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/50 transition-colors text-left"
          @click="selectType('boleto_compraventa')"
        >
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <FileCheck class="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-medium text-foreground">Boleto de Compraventa</h3>
            <p class="text-sm text-muted-foreground mt-1">
              Acuerdo preliminar de compraventa entre vendedor y comprador
            </p>
          </div>
        </button>

        <!-- Entrega Llaves Card -->
        <button
          type="button"
          class="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/50 transition-colors text-left"
          @click="selectType('entrega_llaves')"
        >
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Key class="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-medium text-foreground">Acta de Entrega de Llaves</h3>
            <p class="text-sm text-muted-foreground mt-1">
              Acta de entrega formal de llaves y posesión del inmueble
            </p>
          </div>
        </button>
      </div>

      <div class="flex justify-end pt-2">
        <Button variant="outline" @click="$emit('update:open', false)">
          Cancelar
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileSignature, FileCheck, Key } from 'lucide-vue-next'
import type { LegalDocumentType } from '@/composables/useLegalDocuments'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'select', type: LegalDocumentType): void
}>()

function selectType(type: LegalDocumentType) {
  emit('select', type)
}
</script>
