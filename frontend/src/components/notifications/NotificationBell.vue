<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        class="relative p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Bell class="w-5 h-5" />
        <span
          v-if="unreadCount > 0"
          class="absolute top-1 right-1 min-w-4 h-4 px-1 text-[10px] font-medium bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
        >
          {{ unreadCount > 9 ? '9+' : unreadCount }}
        </span>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-80">
      <div class="flex items-center justify-between px-3 py-2 border-b border-border">
        <span class="text-sm font-medium">Notificaciones</span>
        <button
          v-if="unreadCount > 0"
          class="text-xs text-primary hover:underline"
          @click="handleMarkAllAsRead"
        >
          Marcar todo como leído
        </button>
      </div>

      <div v-if="loading" class="py-8 text-center text-muted-foreground">
        <Loader2 class="w-5 h-5 mx-auto animate-spin" />
      </div>

      <div v-else-if="notifications.length === 0" class="py-8 text-center text-muted-foreground">
        <BellOff class="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p class="text-sm">No hay notificaciones</p>
      </div>

      <div v-else class="max-h-80 overflow-y-auto">
        <button
          v-for="notification in notifications"
          :key="notification.id"
          class="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b border-border last:border-b-0"
          :class="{ 'bg-accent/50': notification.status === 'no_leida' }"
          @click="handleNotificationClick(notification)"
        >
          <div class="flex items-start gap-2">
            <component
              :is="getNotificationIcon(notification.type)"
              class="w-4 h-4 mt-0.5 flex-shrink-0"
              :class="notification.status === 'no_leida' ? 'text-primary' : 'text-muted-foreground'"
            />
            <div class="flex-1 min-w-0">
              <p
                class="text-sm font-medium truncate"
                :class="notification.status === 'no_leida' ? 'text-foreground' : 'text-muted-foreground'"
              >
                {{ notification.title }}
              </p>
              <p class="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {{ notification.message }}
              </p>
              <p class="text-[10px] text-muted-foreground mt-1">
                {{ formatRelativeTime(notification.created_at) }}
              </p>
            </div>
            <span
              v-if="notification.status === 'no_leida'"
              class="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5"
            ></span>
          </div>
        </button>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Bell,
  BellOff,
  Loader2,
  FileText,
  Clock,
  AlertTriangle,
  TrendingUp,
  Info,
} from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotifications, type NotificationTypeDB, type Notification } from '@/composables/useNotifications'

const { notifications, loading, unreadCount, initialize, markAsRead, markAllAsRead } =
  useNotifications()

onMounted(() => {
  initialize()
})

function getNotificationIcon(type: NotificationTypeDB) {
  switch (type) {
    case 'vencimiento_contrato':
      return FileText
    case 'pago_proximo':
      return Clock
    case 'pago_vencido':
      return AlertTriangle
    case 'contrato_nuevo':
      return FileText
    case 'ajuste_aplicado':
      return TrendingUp
    case 'general':
    default:
      return Info
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return formatDistanceToNow(date, { addSuffix: true, locale: es })
  } catch {
    return ''
  }
}

async function handleNotificationClick(notification: Notification) {
  if (notification.status === 'no_leida') {
    await markAsRead(notification.id)
  }
}

async function handleMarkAllAsRead() {
  await markAllAsRead()
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
