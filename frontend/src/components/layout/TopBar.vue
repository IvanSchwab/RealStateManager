<template>
  <header class="pia-topbar">
    <!-- Mobile hamburger -->
    <button
      class="pia-icon-btn lg:hidden"
      title="Menu"
      @click="sidebarStore.toggle()"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
    </button>

    <!-- Organization badge (left side) -->
    <div v-if="organization" class="pia-org-badge">
      <div
        v-if="organization.logo_url"
        class="pia-org-logo"
        :style="{ backgroundImage: `url(${organization.logo_url})`, backgroundSize: 'cover' }"
      />
      <div v-else class="pia-org-logo">{{ orgInitials }}</div>
    </div>

    <div class="pia-search">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
      </svg>
      <input ref="searchInput" v-model="filterStore.search" placeholder="Buscar propiedad, inquilino, contrato…" />
      <span class="pia-kbd">⌘K</span>
    </div>

    <div class="pia-topbar-right">
      <button class="pia-icon-btn" :title="isDark ? 'Modo claro' : 'Modo oscuro'" @click="toggleTheme">
        <svg v-if="isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
        </svg>
      </button>

      <button class="pia-icon-btn" title="Notificaciones">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>
        </svg>
        <span v-if="unreadCount > 0" class="pia-dot"></span>
      </button>

      <!-- User dropdown -->
      <div class="pia-user-dropdown" ref="userDropdownRef">
        <div class="pia-user-chip" @click="toggleUserDropdown">
          <div
            v-if="authStore.profile?.avatar_url"
            class="pia-user-avatar"
            :style="{ backgroundImage: `url(${authStore.profile.avatar_url})`, backgroundSize: 'cover' }"
          />
          <div v-else class="pia-user-avatar" :style="{ backgroundColor: avatarColor }">{{ initials }}</div>
          <div class="pia-user-chip-text">
            <span class="pia-user-chip-name">{{ displayName }}</span>
            <span class="pia-user-chip-role">{{ authStore.profile?.email }}</span>
          </div>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>

        <div v-if="showUserDropdown" class="pia-dropdown-menu">
          <button class="pia-dropdown-item" @click="goToSettings">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
            </svg>
            <span>Mi Perfil</span>
          </button>
          <button class="pia-dropdown-item" @click="goToSettings">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
            </svg>
            <span>Configuración</span>
          </button>
          <div class="pia-dropdown-divider" />
          <button class="pia-dropdown-item pia-dropdown-item--danger" @click="handleLogout">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { useFilterStore } from '@/stores/useFilterStore'
import { useTheme } from '@/composables/useTheme'
import { useProfile } from '@/composables/useProfile'
import { useOrganization } from '@/composables/useOrganization'
import { useNotifications } from '@/composables/useNotifications'

const router = useRouter()
const authStore = useAuthStore()
const sidebarStore = useSidebarStore()
const filterStore = useFilterStore()
const { isDark, toggleTheme } = useTheme()
const { getInitials, getAvatarColor } = useProfile()
const { organization, getInitials: getOrgInitials, fetchOrganization } = useOrganization()
const { unreadCount, initialize: initNotifications } = useNotifications()

const searchInput = ref<HTMLInputElement | null>(null)

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    searchInput.value?.focus()
  }
}

// User dropdown state
const showUserDropdown = ref(false)
const userDropdownRef = ref<HTMLElement | null>(null)

const displayName = computed(() => {
  if (authStore.profile?.full_name) return authStore.profile.full_name
  if (authStore.profile?.email) return authStore.profile.email.split('@')[0]
  return 'Usuario'
})

const initials = computed(() =>
  getInitials(authStore.profile?.full_name ?? null, authStore.profile?.email)
)

const avatarColor = computed(() =>
  getAvatarColor(authStore.profile?.full_name ?? null, authStore.profile?.email)
)

const orgInitials = computed(() =>
  organization.value?.name ? getOrgInitials(organization.value.name) : null
)

function toggleUserDropdown() {
  showUserDropdown.value = !showUserDropdown.value
}

function handleClickOutside(event: MouseEvent) {
  if (userDropdownRef.value && !userDropdownRef.value.contains(event.target as Node)) {
    showUserDropdown.value = false
  }
}

function goToSettings() {
  showUserDropdown.value = false
  router.push({ name: 'settings' })
}

async function handleLogout() {
  showUserDropdown.value = false
  await authStore.logout()
  router.push({ name: 'login' })
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
  fetchOrganization()
  initNotifications()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>
