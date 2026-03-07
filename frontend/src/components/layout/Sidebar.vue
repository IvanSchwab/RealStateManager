<template>
  <aside class="w-64 bg-card border-r border-border flex flex-col fixed top-0 left-0 h-screen overflow-y-auto">
    <!-- Organization Branding -->
    <RouterLink
      to="/settings#organization"
      class="p-4 border-b border-border flex items-center gap-3 hover:bg-accent/50 transition-colors cursor-pointer"
    >
      <Avatar size="default">
        <AvatarImage
          v-if="organization?.logo_url"
          :src="organization.logo_url"
          :alt="organization?.name || 'Logo'"
        />
        <AvatarFallback
          v-else
          :style="{ backgroundColor: avatarColor, color: 'white' }"
        >
          {{ initials }}
        </AvatarFallback>
      </Avatar>
      <div class="flex-1 min-w-0">
        <h1 class="text-sm font-semibold text-foreground truncate">
          {{ organization?.name || 'Cargando...' }}
        </h1>
        <p class="text-xs text-muted-foreground">Sistema de Gestion</p>
      </div>
    </RouterLink>

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

    <div class="p-4 border-t border-border space-y-2">
      <RouterLink
        :to="settingsItem.path"
        class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors"
        :class="[
          isActive(settingsItem.path)
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        ]"
      >
        <component :is="settingsItem.icon" class="w-5 h-5" />
        {{ settingsItem.label }}
      </RouterLink>
      <div class="flex items-center justify-between">
        <p class="text-xs text-muted-foreground">v0.1.0 - Development</p>
        <button
          @click="toggleTheme"
          class="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          :title="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        >
          <Sun v-if="isDark" class="h-4 w-4" />
          <Moon v-else class="h-4 w-4" />
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCircle,
  FileText,
  CreditCard,
  Settings,
  Sun,
  Moon
} from 'lucide-vue-next'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useOrganization } from '@/composables/useOrganization'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const { organization, fetchOrganization, getInitials, getAvatarColor } = useOrganization()
const { isDark, toggleTheme } = useTheme()

const initials = computed(() => getInitials(organization.value?.name || ''))
const avatarColor = computed(() => getAvatarColor(organization.value?.name || ''))

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/properties', label: 'Propiedades', icon: Building2 },
  { path: '/owners', label: 'Propietarios', icon: UserCircle },
  { path: '/tenants', label: 'Inquilinos', icon: Users },
  { path: '/contracts', label: 'Contratos', icon: FileText },
  { path: '/payments', label: 'Pagos', icon: CreditCard }
]

const settingsItem = { path: '/settings', label: 'Configuracion', icon: Settings }

const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

onMounted(() => {
  if (!organization.value) {
    fetchOrganization()
  }
})
</script>
