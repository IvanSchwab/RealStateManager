<template>
  <header class="h-16 bg-card border-b border-border flex items-center justify-between px-6">
    <div></div>

    <div class="flex items-center gap-4">
      <button
        class="relative p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Bell class="w-5 h-5" />
        <span class="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button class="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors">
            <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <UserIcon class="w-4 h-4 text-primary-foreground" />
            </div>
            <div class="hidden sm:block text-left">
              <p class="text-sm font-medium text-foreground">
                {{ authStore.profile?.full_name || authStore.profile?.email || 'User' }}
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
            <div>
              <p class="font-medium">{{ authStore.profile?.full_name || 'User' }}</p>
              <p class="text-xs text-muted-foreground font-normal">{{ authStore.profile?.email }}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="handleLogout">
            <LogOut class="w-4 h-4 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Bell, User as UserIcon, LogOut, ChevronDown } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const router = useRouter()
const authStore = useAuthStore()

async function handleLogout() {
  try {
    await authStore.signOut()
    router.push({ name: 'login' })
  } catch (error) {
    console.error('Logout error:', error)
  }
}
</script>
