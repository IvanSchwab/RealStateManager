<template>
  <MainLayout>
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-6">Dashboard</h1>

      <!-- TODO: Implement KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="p-4 bg-card border border-border rounded-lg">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-primary/10 rounded-md">
              <Building2 class="w-5 h-5 text-primary" />
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Total Properties</p>
              <p class="text-2xl font-bold">--</p>
            </div>
          </div>
        </div>

        <div class="p-4 bg-card border border-border rounded-lg">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-green-500/10 rounded-md">
              <Users class="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Active Tenants</p>
              <p class="text-2xl font-bold">--</p>
            </div>
          </div>
        </div>

        <div class="p-4 bg-card border border-border rounded-lg">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-500/10 rounded-md">
              <FileText class="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Active Contracts</p>
              <p class="text-2xl font-bold">--</p>
            </div>
          </div>
        </div>

        <div class="p-4 bg-card border border-border rounded-lg">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-yellow-500/10 rounded-md">
              <CreditCard class="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p class="text-sm text-muted-foreground">Monthly Revenue</p>
              <p class="text-2xl font-bold">$--</p>
            </div>
          </div>
        </div>
      </div>

      <!-- TODO: Implement alerts section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="p-4 bg-card border border-border rounded-lg">
          <h2 class="font-semibold mb-4">Recent Alerts</h2>
          <div class="space-y-3">
            <p class="text-muted-foreground text-sm">No alerts implemented yet</p>
          </div>
        </div>

        <!-- TODO: Implement upcoming payments -->
        <div class="p-4 bg-card border border-border rounded-lg">
          <h2 class="font-semibold mb-4">Upcoming Payments</h2>
          <div class="space-y-3">
            <p class="text-muted-foreground text-sm">No upcoming payments implemented yet</p>
          </div>
        </div>
      </div>

      <!-- TODO: Implement expiring contracts -->
      <div class="mt-6 p-4 bg-card border border-border rounded-lg">
        <h2 class="font-semibold mb-4">Contracts Expiring Soon</h2>
        <div class="space-y-3">
          <p class="text-muted-foreground text-sm">No expiring contracts implemented yet</p>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import MainLayout from '@/components/layout/MainLayout.vue'
import { Building2, Users, FileText, CreditCard } from 'lucide-vue-next'
// TODO: Import composables when implemented
</script>
