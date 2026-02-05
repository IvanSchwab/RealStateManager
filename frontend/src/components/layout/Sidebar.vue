<template>
  <aside class="w-64 bg-card border-r border-border flex flex-col">
    <div class="p-6 border-b border-border">
      <h1 class="text-xl font-bold text-foreground">Real Estate</h1>
      <p class="text-sm text-muted-foreground">Management System</p>
    </div>

    <nav class="flex-1 p-4">
      <ul class="space-y-2">
        <li v-for="item in navItems" :key="item.path">
          <RouterLink
            :to="item.path"
            class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="[
              isActive(item.path)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            ]"
          >
            <component :is="item.icon" class="w-5 h-5" />
            {{ item.label }}
          </RouterLink>
        </li>
      </ul>
    </nav>

    <div class="p-4 border-t border-border">
      <p class="text-xs text-muted-foreground">v0.1.0 - Development</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCircle,
  FileText,
  CreditCard
} from 'lucide-vue-next'

const route = useRoute()

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/properties', label: 'Propiedades', icon: Building2 },
  { path: '/owners', label: 'Propietarios', icon: UserCircle },
  { path: '/tenants', label: 'Inquilinos', icon: Users },
  { path: '/contracts', label: 'Contratos', icon: FileText },
  { path: '/payments', label: 'Pagos', icon: CreditCard }
]

const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>
