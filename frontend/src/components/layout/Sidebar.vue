<template>
  <!-- Mobile overlay -->
  <div
    v-if="sidebarStore.isOpen"
    class="fixed inset-0 bg-black/50 z-50 lg:hidden"
    @click="sidebarStore.close()"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  />

  <!-- Sidebar -->
  <aside
    :class="[
      'w-64 bg-card border-r border-border flex flex-col fixed left-0 overflow-y-auto transition-transform duration-300',
      'top-0 h-screen z-50',
      'lg:top-16 lg:h-[calc(100vh-4rem)] lg:z-30',
      'lg:translate-x-0',
      sidebarStore.isOpen ? 'translate-x-0' : '-translate-x-full'
    ]"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <!-- Mobile header with close button and logo -->
    <div class="lg:hidden flex items-center justify-between h-16 px-4 border-b border-border shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
          <Building2 class="w-5 h-5 text-primary-foreground" />
        </div>
        <span class="font-semibold text-foreground">PropManager</span>
      </div>
      <button
        class="p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        @click="sidebarStore.close()"
      >
        <X class="w-5 h-5" />
      </button>
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
            @click="handleNavClick"
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
        @click="handleNavClick"
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
  Moon,
  X
} from 'lucide-vue-next'
import { useTheme } from '@/composables/useTheme'
import { useSidebarStore } from '@/stores/useSidebarStore'

const { t } = useI18n()
const route = useRoute()
const { isDark, toggleTheme } = useTheme()
const sidebarStore = useSidebarStore()

// Swipe gesture handling
let touchStartX = 0
let touchStartY = 0

function handleTouchStart(e: TouchEvent) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}

function handleTouchEnd(e: TouchEvent) {
  const touchEndX = e.changedTouches[0].clientX
  const touchEndY = e.changedTouches[0].clientY
  const deltaX = touchEndX - touchStartX
  const deltaY = touchEndY - touchStartY

  // Only trigger if horizontal swipe is dominant (not scrolling)
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
    if (deltaX < 0) {
      // Swipe left - close sidebar
      sidebarStore.close()
    }
  }
}

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

function handleNavClick() {
  // Close sidebar on mobile after navigation
  if (window.innerWidth < 1024) {
    sidebarStore.close()
  }
}
</script>
