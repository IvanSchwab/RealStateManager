<template>
  <aside class="w-64 bg-card border-r border-border flex flex-col fixed top-16 left-0 h-[calc(100vh-4rem)] overflow-y-auto">
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
        to="/settings"
        class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors"
        :class="[
          isActive('/settings')
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        ]"
      >
        <Settings class="w-5 h-5" />
        {{ $t('nav.settings') }}
      </RouterLink>
      <div class="flex items-center justify-between">
        <p class="text-xs text-muted-foreground">v0.1.0 - Development</p>
        <button
          @click="toggleTheme"
          class="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          :title="isDark ? $t('settings.themeLight') : $t('settings.themeDark')"
        >
          <Sun v-if="isDark" class="h-4 w-4" />
          <Moon v-else class="h-4 w-4" />
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCircle,
  FileText,
  CreditCard,
  ScrollText,
  Settings,
  Sun,
  Moon
} from 'lucide-vue-next'
import { useTheme } from '@/composables/useTheme'

const { t } = useI18n()
const route = useRoute()
const { isDark, toggleTheme } = useTheme()

const navItems = computed(() => [
  { path: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
  { path: '/owners', label: t('nav.owners'), icon: UserCircle },
  { path: '/tenants', label: t('nav.tenants'), icon: Users },
  { path: '/contracts', label: t('nav.contracts'), icon: FileText },
  { path: '/properties', label: t('nav.properties'), icon: Building2 },
  { path: '/payments', label: t('nav.payments'), icon: CreditCard },
  { path: '/documents', label: 'Documentos', icon: ScrollText }
])

const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>
