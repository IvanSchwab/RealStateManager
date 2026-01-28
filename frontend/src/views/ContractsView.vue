<template>
  <MainLayout>
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">Contracts</h1>
        <button
          class="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus class="w-4 h-4" />
          New Contract
        </button>
      </div>

      <!-- TODO: Implement filters -->
      <div class="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search contracts..."
          class="flex-1 max-w-sm px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          class="px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="pending">Pending</option>
        </select>
        <select
          class="px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Expiring</option>
          <option value="30">Next 30 days</option>
          <option value="60">Next 60 days</option>
          <option value="90">Next 90 days</option>
        </select>
      </div>

      <!-- TODO: Implement contracts table -->
      <div class="bg-card border border-border rounded-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-muted/50">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Contract #</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Property</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tenant</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Start Date</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">End Date</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="7" class="px-4 py-8 text-center text-muted-foreground">
                No contracts loaded yet. Data fetching not implemented.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- TODO: Implement pagination -->
      <div class="flex items-center justify-between mt-4">
        <p class="text-sm text-muted-foreground">Showing 0 of 0 contracts</p>
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
