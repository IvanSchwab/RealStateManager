<template>
  <MainLayout>
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">Tenants</h1>
        <button
          class="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus class="w-4 h-4" />
          Add Tenant
        </button>
      </div>

      <!-- TODO: Implement filters -->
      <div class="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search tenants..."
          class="flex-1 max-w-sm px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          class="px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <!-- TODO: Implement tenants table -->
      <div class="bg-card border border-border rounded-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-muted/50">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tenant</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Phone</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Property</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="6" class="px-4 py-8 text-center text-muted-foreground">
                No tenants loaded yet. Data fetching not implemented.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- TODO: Implement pagination -->
      <div class="flex items-center justify-between mt-4">
        <p class="text-sm text-muted-foreground">Showing 0 of 0 tenants</p>
        <div class="flex gap-2">
          <button
            disabled
            class="px-3 py-1 border border-input rounded-md text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <button
            disabled
            class="px-3 py-1 border border-input rounded-md text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import MainLayout from '@/components/layout/MainLayout.vue'
import { Plus } from 'lucide-vue-next'
// TODO: Import composables when implemented
</script>
