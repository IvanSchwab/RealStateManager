<template>
  <header class="h-16 bg-card border-b border-border flex items-center justify-between shrink-0">
    <!-- Organization Branding (left side, same width as sidebar) -->
    <RouterLink
      to="/settings#organization"
      class="w-64 h-full px-4 flex items-center gap-3 hover:bg-accent/50 transition-colors cursor-pointer border-r border-border shrink-0"
    >
      <Avatar size="default">
        <AvatarImage
          v-if="organization?.logo_url"
          :src="organization.logo_url"
          :alt="organization?.name || 'Logo'"
        />
        <AvatarFallback
          v-else
          :style="{ backgroundColor: orgAvatarColor, color: 'white' }"
        >
          {{ orgInitials }}
        </AvatarFallback>
      </Avatar>
      <div class="flex-1 min-w-0">
        <h1 class="text-sm font-semibold text-foreground truncate">
          {{ organization?.name || $t('common.loading') }}
        </h1>
        <p class="text-xs text-muted-foreground">{{ $t('nav.managementSystem') }}</p>
      </div>
    </RouterLink>

    <div class="flex-1"></div>

    <div class="flex items-center gap-4 px-6">
      <NotificationBell />

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button class="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors">
            <Avatar class="w-8 h-8">
              <AvatarImage
                v-if="authStore.profile?.avatar_url"
                :src="authStore.profile.avatar_url"
                alt="User avatar"
              />
              <AvatarFallback
                :style="{ backgroundColor: avatarColor, color: 'white' }"
                class="text-sm font-medium"
              >
                {{ initials }}
              </AvatarFallback>
            </Avatar>
            <div class="hidden sm:block text-left">
              <p class="text-sm font-medium text-foreground">
                {{ displayName }}
              </p>
              <p v-if="authStore.profile?.full_name" class="text-xs text-muted-foreground">
                {{ authStore.profile?.email }}
              </p>
            </div>
            <Badge v-if="authStore.userRole" variant="secondary" class="hidden sm:inline-flex">
              {{ authStore.userRole }}
            </Badge>
            <ChevronDown class="w-4 h-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuLabel>
            <div class="flex items-center gap-3">
              <Avatar class="w-10 h-10">
                <AvatarImage
                  v-if="authStore.profile?.avatar_url"
                  :src="authStore.profile.avatar_url"
                  alt="User avatar"
                />
                <AvatarFallback
                  :style="{ backgroundColor: avatarColor, color: 'white' }"
                  class="text-sm font-medium"
                >
                  {{ initials }}
                </AvatarFallback>
              </Avatar>
              <div>
                <p class="font-medium">{{ displayName }}</p>
                <p class="text-xs text-muted-foreground font-normal">{{ authStore.profile?.email }}</p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="goToProfileSettings">
            <Settings class="w-4 h-4 mr-2" />
            {{ $t('settings.profile') }}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="handleLogout">
            <LogOut class="w-4 h-4 mr-2" />
            {{ $t('auth.signOut') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { LogOut, ChevronDown, Settings } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useProfile } from '@/composables/useProfile'
import { useOrganization } from '@/composables/useOrganization'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import NotificationBell from '@/components/notifications/NotificationBell.vue'

const router = useRouter()
const authStore = useAuthStore()
const { getInitials, getAvatarColor } = useProfile()
const {
  organization,
  fetchOrganization,
  getInitials: getOrgInitials,
  getAvatarColor: getOrgAvatarColor
} = useOrganization()

// Organization branding
const orgInitials = computed(() => getOrgInitials(organization.value?.name || ''))
const orgAvatarColor = computed(() => getOrgAvatarColor(organization.value?.name || ''))

// Display name: full_name if available, otherwise email prefix
const displayName = computed(() => {
  if (authStore.profile?.full_name) {
    return authStore.profile.full_name
  }
  if (authStore.profile?.email) {
    return authStore.profile.email.split('@')[0]
  }
  return 'User'
})

// Initials for avatar fallback
const initials = computed(() =>
  getInitials(authStore.profile?.full_name ?? null, authStore.profile?.email)
)

// Avatar background color
const avatarColor = computed(() =>
  getAvatarColor(authStore.profile?.full_name ?? null, authStore.profile?.email)
)

function goToProfileSettings() {
  router.push({ name: 'settings', hash: '#profile' })
}

async function handleLogout() {
  try {
    await authStore.signOut()
    router.push({ name: 'login' })
  } catch (error) {
    console.error('Logout error:', error)
  }
}

onMounted(() => {
  if (!organization.value) {
    fetchOrganization()
  }
})
</script>
