<template>
  <div class="space-y-2">
    <Label>Propietario</Label>
    <div class="flex items-center gap-2">
      <div class="flex-1">
        <Select v-model="selectedId">
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar propietario" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem
                v-for="owner in owners"
                :key="owner.id"
                :value="owner.id"
              >
                {{ owner.full_name }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <Button type="button" variant="outline" size="sm" @click="openDialog">
        <Plus class="h-4 w-4 mr-1" />
        Nuevo
      </Button>
    </div>
  </div>

  <OwnerDialog
    :open="dialogOpen"
    :inline="true"
    @update:open="dialogOpen = $event"
    @success="handleOwnerCreated"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-vue-next'
import OwnerDialog from './OwnerDialog.vue'
import type { Owner } from '@/types'

const props = defineProps<{
  modelValue: string | null
  owners: Owner[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'owner-created', owner: Owner): void
}>()

const dialogOpen = ref(false)

// Two-way binding for the selected owner
const selectedId = computed({
  get: () => props.modelValue || '',
  set: (value: string) => emit('update:modelValue', value)
})

function openDialog() {
  dialogOpen.value = true
}

function handleOwnerCreated(owner: Owner) {
  // Emit event to parent to refresh owners list
  emit('owner-created', owner)
  // Auto-select the newly created owner
  emit('update:modelValue', owner.id)
}
</script>
