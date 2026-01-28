<template>
  <MainLayout>
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">Properties</h1>
        <button
          class="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus class="w-4 h-4" />
          Add Property
        </button>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="py-12 text-center text-muted-foreground">
        Loading properties...
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="py-12 text-center">
        <p class="text-destructive font-medium mb-2">Error loading properties</p>
        <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
        <button
          @click="fetchProperties"
          class="px-4 py-2 border border-input rounded-md text-sm hover:bg-accent transition-colors"
        >
          Retry
        </button>
      </div>

      <!-- Data loaded -->
      <template v-else>
        <div class="bg-card border border-border rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="bg-muted/50">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Property</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Type</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Address</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="properties.length === 0">
                <td colspan="4" class="px-4 py-8 text-center text-muted-foreground">
                  No properties found.
                </td>
              </tr>
              <tr
                v-for="property in properties"
                :key="property.id"
                class="border-t border-border hover:bg-muted/30 transition-colors"
              >
                <td class="px-4 py-3 text-sm font-medium text-foreground">
                  {{ property.name }}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground capitalize">
                  {{ property.property_type }}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ property.address_street }}{{ property.address_number ? ' ' + property.address_number : '' }}
                </td>
                <td class="px-4 py-3">
                  <span
                    class="inline-block px-2 py-1 text-xs font-medium rounded-full capitalize"
                    :class="statusClass(property.status)"
                  >
                    {{ property.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="mt-4 text-sm text-muted-foreground">
          Showing {{ properties.length }} {{ properties.length === 1 ? 'property' : 'properties' }}
        </p>
      </template>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import { Plus } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import type { Property } from '@/types'

const properties = ref<Property[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

function statusClass(status: string) {
  switch (status) {
    case 'disponible':
      return 'bg-green-100 text-green-800'
    case 'alquilada':
      return 'bg-blue-100 text-blue-800'
    case 'mantenimiento':
      return 'bg-yellow-100 text-yellow-800'
    case 'reservada':
      return 'bg-purple-100 text-purple-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

async function fetchProperties() {
  loading.value = true
  error.value = null

  const { data, error: err } = await supabase
    .from('properties')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (err) {
    error.value = err.message
  } else {
    properties.value = data ?? []
  }

  loading.value = false
}

onMounted(fetchProperties)
</script>
