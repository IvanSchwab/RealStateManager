<template>
  <header class="h-16 bg-card border-b border-border flex items-center justify-between px-6">
    <div>
      <!-- TODO: Add breadcrumbs or page title -->
    </div>

    <div class="flex items-center gap-4">
      <!-- TODO: Implement notifications -->
      <button
        class="relative p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Bell class="w-5 h-5" />
        <span class="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
      </button>

      <!-- TODO: Implement user menu -->
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User class="w-4 h-4 text-primary-foreground" />
        </div>
        <div class="hidden sm:block">
          <p class="text-sm font-medium text-foreground">User Name</p>
          <p class="text-xs text-muted-foreground">user@example.com</p>
        </div>
      </div>

      <!-- TODO: Implement logout -->
      <button
        class="p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <LogOut class="w-5 h-5" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Bell, User, LogOut } from 'lucide-vue-next'
// TODO: Import auth composable when implemented
</script>
