<template>
  <!-- Mobile overlay -->
  <div
    v-if="sidebarStore.isOpen"
    class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
    @click="sidebarStore.close()"
  />

  <aside
    class="pia-sidebar"
    :class="[sidebarStore.isOpen ? 'translate-x-0' : '-translate-x-full', 'lg:translate-x-0']"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <!-- Mobile close button -->
    <button
      class="absolute top-4 right-4 p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 lg:hidden"
      @click="sidebarStore.close()"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
    <!-- Brand -->
    <div class="pia-brand">
      <div class="pia-brand-mark">
       <img
  v-if="organization?.logo_url"
  :src="organization.logo_url"
  alt="Logo"
  style="width: 100%; height: 100%; object-fit: cover;"
/>
        <svg v-else viewBox="0 0 40 40" width="24" height="24" fill="none">
          <ellipse cx="20" cy="20" rx="13" ry="10.5" stroke="white" stroke-width="2" fill="none" opacity="0.45" />
          <ellipse cx="22.5" cy="18" rx="5.5" ry="4.3" fill="white" />
          <path d="M16.5 15.5 Q 14.8 21.5, 17.2 25" stroke="white" stroke-width="1.9" fill="none" stroke-linecap="round" />
        </svg>
      </div>
      <div class="pia-brand-text">
        <span class="pia-brand-name">{{ organization?.name || 'Pia' }}</span>
        <span class="pia-brand-sub">PIA Gestión</span>
      </div>
    </div>

    <!-- General -->
    <div class="pia-nav-section">
      <span class="pia-nav-label">General</span>
      <RouterLink
        to="/"
        class="pia-nav-item"
        :class="{ active: isActive('/') }"
        @click="handleNavClick('/')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/>
          <rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>
        </svg>
        <span>{{ t('nav.dashboard') }}</span>
      </RouterLink>
    </div>

    <!-- Gestión -->
    <div class="pia-nav-section">
      <span class="pia-nav-label">Gestión</span>
      <RouterLink
        to="/properties"
        class="pia-nav-item"
        :class="{ active: isActive('/properties') }"
        @click="handleNavClick('/properties')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>
        </svg>
        <span>{{ t('nav.properties') }}</span>
      </RouterLink>
      <RouterLink
        to="/owners"
        class="pia-nav-item"
        :class="{ active: isActive('/owners') }"
        @click="handleNavClick('/owners')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5"/>
          <circle cx="17" cy="6" r="2.5"/><path d="M16 13.5c2.5 0 4.5 1.5 5.5 4"/>
        </svg>
        <span>{{ t('nav.owners') }}</span>
      </RouterLink>
      <RouterLink
        to="/tenants"
        class="pia-nav-item"
        :class="{ active: isActive('/tenants') }"
        @click="handleNavClick('/tenants')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="3.5"/><path d="M5 20c.5-4 3.5-6 7-6s6.5 2 7 6"/>
        </svg>
        <span>{{ t('nav.tenants') }}</span>
      </RouterLink>
      <RouterLink
        to="/contracts"
        class="pia-nav-item"
        :class="{ active: isActive('/contracts') }"
        @click="handleNavClick('/contracts')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
          <path d="M14 3v5h5"/><path d="M9 13h7M9 17h5"/>
        </svg>
        <span>{{ t('nav.contracts') }}</span>
      </RouterLink>
      <RouterLink
        to="/payments"
        class="pia-nav-item"
        :class="{ active: isActive('/payments') }"
        @click="handleNavClick('/payments')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h3"/>
        </svg>
        <span>{{ t('nav.payments') }}</span>
      </RouterLink>
    </div>

    <!-- Archivos -->
    <div class="pia-nav-section">
      <span class="pia-nav-label">Archivos</span>
      <RouterLink
        to="/documents"
        class="pia-nav-item"
        :class="{ active: isActive('/documents') }"
        @click="handleNavClick('/documents')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
          <path d="M14 3v5h5"/><circle cx="12" cy="14" r="3"/>
        </svg>
        <span>{{ t('nav.documents') }}</span>
      </RouterLink>
    </div>

    <!-- Watermark spacer -->
    <div class="pia-sidebar-spacer" aria-hidden="true">
      <svg viewBox="0 0 1368 809.65" width="140" style="height:auto;display:block">
        <path d="M1206.65,567.47c-102.71,97.65-289.55,180.13-508.61,219.97C345.35,851.58,34.3,765.35,3.29,594.86-27.7,424.36,260.11,172.67,612.79,108.54c29.71-5.4,58.98-9.2,87.72-11.48-249.23,79.26-389.63,216.84-363.91,358.29,31.01,170.51,323.41,282.06,670.82,199.41,73.45-17.48,140.18-48.2,199.22-87.3Z" fill="currentColor"/>
        <path d="M832.88,582.14c-39.8,4.8-79.03,6.92-117.19,6.78,222.91-75.83,339.25-248.61,317.52-374.28C1007.93,68.45,716.46,4.72,437.35,96.65c81.88-37.43,184.67-63.56,302.12-81.14,312.19-46.71,599.53,21.52,625.61,172.39,26.08,150.87-216.11,356.1-532.19,394.23Z" fill="currentColor"/>
        <ellipse cx="690.5" cy="344.93" rx="194.82" ry="158.56" fill="currentColor"/>
      </svg>
    </div>

    <!-- Footer -->
    <div class="pia-sidebar-footer">
      <RouterLink
        to="/settings"
        class="pia-nav-item"
        :class="{ active: isActive('/settings') }"
        @click="handleNavClick('/settings')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
        </svg>
        <span>{{ t('nav.settings') }}</span>
      </RouterLink>
      <div class="pia-version">
        <span>v3.1.0 · Development</span>
        
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { useOrganization } from '@/composables/useOrganization'
import { useNavResetStore } from '@/stores/useNavResetStore'

const { t } = useI18n()
const route = useRoute()
const sidebarStore = useSidebarStore()
const navResetStore = useNavResetStore()
const { organization, fetchOrganization } = useOrganization()

onMounted(() => {
  fetchOrganization()
})

// Touch handling for swipe-to-close
const touchStartX = ref(0)

function handleTouchStart(e: TouchEvent) {
  touchStartX.value = e.touches[0].clientX
}

function handleTouchEnd(e: TouchEvent) {
  const touchEndX = e.changedTouches[0].clientX
  const diff = touchStartX.value - touchEndX
  // Swipe left to close (threshold: 50px)
  if (diff > 50) {
    sidebarStore.close()
  }
}

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function handleNavClick(path: string) {
  if (route.path === path) {
    navResetStore.trigger(path)
  }
  if (window.innerWidth < 1024) {
    sidebarStore.close()
  }
}
</script>
