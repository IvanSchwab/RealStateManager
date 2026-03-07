<template>
  <div class="p-6 space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold">Configuracion</h1>
        <p class="text-muted-foreground text-sm">
          Administra las preferencias de tu cuenta
        </p>
      </div>

      <!-- Organization Section (Admin only) -->
      <Card v-if="isAdmin" id="organization">
        <CardHeader>
          <div class="flex items-center gap-2">
            <Building2 class="w-5 h-5 text-muted-foreground" />
            <CardTitle>Mi Organizacion</CardTitle>
          </div>
          <CardDescription>
            Configura el nombre y logo de tu organizacion
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <!-- Organization Name -->
          <div class="space-y-2">
            <Label for="org-name">Nombre de la organizacion</Label>
            <Input
              id="org-name"
              v-model="orgName"
              placeholder="Nombre de tu organizacion"
              :disabled="savingOrg"
            />
          </div>

          <!-- Logo Upload -->
          <div class="space-y-4">
            <Label>Logo de la organizacion</Label>

            <!-- Current Logo Preview -->
            <div class="flex items-center gap-4">
              <Avatar size="lg" class="h-16 w-16">
                <AvatarImage
                  v-if="logoPreview || organization?.logo_url"
                  :src="logoPreview || organization?.logo_url || ''"
                  alt="Logo preview"
                />
                <AvatarFallback
                  v-else
                  :style="{ backgroundColor: avatarColor, color: 'white' }"
                  class="text-xl"
                >
                  {{ initials }}
                </AvatarFallback>
              </Avatar>

              <div class="flex flex-col gap-2">
                <div class="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    @click="triggerFileInput"
                    :disabled="savingOrg"
                  >
                    <Upload class="w-4 h-4 mr-2" />
                    {{ organization?.logo_url ? 'Cambiar logo' : 'Subir logo' }}
                  </Button>
                  <Button
                    v-if="organization?.logo_url || logoPreview"
                    variant="outline"
                    size="sm"
                    @click="handleRemoveLogo"
                    :disabled="savingOrg"
                  >
                    <Trash2 class="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                </div>
                <p class="text-xs text-muted-foreground">
                  JPG, PNG, WebP o SVG. Maximo 2MB.
                </p>
              </div>
            </div>

            <!-- Hidden File Input -->
            <input
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              class="hidden"
              @change="handleFileSelect"
            />
          </div>

          <!-- Save Button -->
          <div class="flex items-center gap-4">
            <Button
              @click="handleSaveOrganization"
              :disabled="savingOrg || !hasOrgChanges"
            >
              <Loader2 v-if="savingOrg" class="w-4 h-4 mr-2 animate-spin" />
              <Save v-else class="w-4 h-4 mr-2" />
              Guardar cambios
            </Button>
          </div>

          <!-- Success/Error message -->
          <div
            v-if="orgMessage"
            class="p-3 rounded-lg text-sm"
            :class="orgSuccess ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'"
          >
            <div class="flex items-center gap-2">
              <CheckCircle v-if="orgSuccess" class="w-4 h-4" />
              <AlertCircle v-else class="w-4 h-4" />
              {{ orgMessage }}
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Notifications Section -->
      <Card>
        <CardHeader>
          <div class="flex items-center gap-2">
            <Bell class="w-5 h-5 text-muted-foreground" />
            <CardTitle>Notificaciones</CardTitle>
          </div>
          <CardDescription>
            Configura y prueba el sistema de notificaciones
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
            <div class="space-y-1">
              <p class="text-sm font-medium">Probar notificaciones</p>
              <p class="text-xs text-muted-foreground">
                Envia una notificacion de prueba para verificar que el sistema funciona correctamente
              </p>
            </div>
            <Button
              @click="handleTestNotification"
              :disabled="testingNotification"
              variant="outline"
            >
              <Loader2 v-if="testingNotification" class="w-4 h-4 mr-2 animate-spin" />
              <Send v-else class="w-4 h-4 mr-2" />
              Enviar prueba
            </Button>
          </div>

          <!-- Success/Error message -->
          <div
            v-if="testMessage"
            class="p-3 rounded-lg text-sm"
            :class="testSuccess ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'"
          >
            <div class="flex items-center gap-2">
              <CheckCircle v-if="testSuccess" class="w-4 h-4" />
              <AlertCircle v-else class="w-4 h-4" />
              {{ testMessage }}
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Appearance Section -->
      <Card>
        <CardHeader>
          <div class="flex items-center gap-2">
            <Sun class="w-5 h-5 text-muted-foreground" />
            <CardTitle>Apariencia</CardTitle>
          </div>
          <CardDescription>
            Personaliza el aspecto visual de la aplicacion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-2">
            <Label>Tema</Label>
            <div class="flex gap-2">
              <Button
                v-for="option in themeOptions"
                :key="option.value"
                :variant="theme === option.value ? 'default' : 'outline'"
                size="sm"
                @click="setTheme(option.value)"
                class="flex-1"
              >
                <component :is="option.icon" class="w-4 h-4 mr-2" />
                {{ option.label }}
              </Button>
            </div>
            <p class="text-xs text-muted-foreground mt-2">
              El modo "Sistema" sigue la preferencia de tu sistema operativo
            </p>
          </div>
        </CardContent>
      </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  Bell,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  Building2,
  Upload,
  Trash2,
  Save,
  Sun,
  Moon,
  Monitor
} from 'lucide-vue-next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useNotifications } from '@/composables/useNotifications'
import { useOrganization } from '@/composables/useOrganization'
import { useAuth } from '@/composables/useAuth'
import { useTheme, type Theme } from '@/composables/useTheme'

const route = useRoute()
const { sendTestNotification } = useNotifications()
const {
  organization,
  fetchOrganization,
  updateOrganization,
  uploadLogo,
  removeLogo,
  getInitials,
  getAvatarColor
} = useOrganization()
const { isAdmin } = useAuth()
const { theme, setTheme } = useTheme()

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor }
]

// Notification test state
const testingNotification = ref(false)
const testMessage = ref('')
const testSuccess = ref(false)
let testMessageTimeout: ReturnType<typeof setTimeout> | null = null

// Organization edit state
const orgName = ref('')
const logoFile = ref<File | null>(null)
const logoPreview = ref<string | null>(null)
const savingOrg = ref(false)
const orgMessage = ref('')
const orgSuccess = ref(false)
let orgMessageTimeout: ReturnType<typeof setTimeout> | null = null
const fileInputRef = ref<HTMLInputElement | null>(null)

// Computed
const initials = computed(() => getInitials(orgName.value || organization.value?.name || ''))
const avatarColor = computed(() => getAvatarColor(orgName.value || organization.value?.name || ''))

const hasOrgChanges = computed(() => {
  if (!organization.value) return false
  return orgName.value !== organization.value.name || logoFile.value !== null
})

// Watch organization changes to sync local state
watch(organization, (newOrg) => {
  if (newOrg && !orgName.value) {
    orgName.value = newOrg.name
  }
}, { immediate: true })

// Scroll to organization section if hash is present
watch(() => route.hash, (hash) => {
  if (hash === '#organization') {
    setTimeout(() => {
      const el = document.getElementById('organization')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }
}, { immediate: true })

async function handleTestNotification() {
  testingNotification.value = true
  testMessage.value = ''

  const result = await sendTestNotification()

  testingNotification.value = false
  testSuccess.value = result.success

  if (result.success) {
    testMessage.value = 'Notificacion enviada. Revisa el icono de la campana en la barra superior.'
  } else {
    testMessage.value = result.error || 'Error al enviar la notificacion de prueba'
  }

  if (testMessageTimeout) {
    clearTimeout(testMessageTimeout)
  }
  testMessageTimeout = setTimeout(() => {
    testMessage.value = ''
  }, 5000)
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!allowedTypes.includes(file.type)) {
    orgMessage.value = 'Tipo de archivo no permitido. Use JPG, PNG, WebP o SVG.'
    orgSuccess.value = false
    clearOrgMessageAfterDelay()
    return
  }

  // Validate file size (max 2MB)
  const maxSize = 2 * 1024 * 1024
  if (file.size > maxSize) {
    orgMessage.value = 'El archivo es demasiado grande. Maximo 2MB.'
    orgSuccess.value = false
    clearOrgMessageAfterDelay()
    return
  }

  logoFile.value = file

  // Create preview
  const reader = new FileReader()
  reader.onload = (e) => {
    logoPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)

  // Reset file input
  input.value = ''
}

async function handleRemoveLogo() {
  logoFile.value = null
  logoPreview.value = null

  if (organization.value?.logo_url) {
    savingOrg.value = true
    try {
      await removeLogo()
      orgMessage.value = 'Logo eliminado correctamente'
      orgSuccess.value = true
    } catch (e) {
      orgMessage.value = e instanceof Error ? e.message : 'Error al eliminar el logo'
      orgSuccess.value = false
    } finally {
      savingOrg.value = false
      clearOrgMessageAfterDelay()
    }
  }
}

async function handleSaveOrganization() {
  if (!hasOrgChanges.value) return

  savingOrg.value = true
  orgMessage.value = ''

  try {
    let newLogoUrl: string | undefined

    // Upload logo if selected
    if (logoFile.value) {
      newLogoUrl = await uploadLogo(logoFile.value)
    }

    // Update organization
    const updates: { name?: string; logo_url?: string } = {}

    if (orgName.value !== organization.value?.name) {
      updates.name = orgName.value
    }

    if (newLogoUrl) {
      updates.logo_url = newLogoUrl
    }

    if (Object.keys(updates).length > 0) {
      await updateOrganization(updates)
    }

    // Clear local file state
    logoFile.value = null
    logoPreview.value = null

    orgMessage.value = 'Cambios guardados correctamente'
    orgSuccess.value = true
  } catch (e) {
    orgMessage.value = e instanceof Error ? e.message : 'Error al guardar los cambios'
    orgSuccess.value = false
  } finally {
    savingOrg.value = false
    clearOrgMessageAfterDelay()
  }
}

function clearOrgMessageAfterDelay() {
  if (orgMessageTimeout) {
    clearTimeout(orgMessageTimeout)
  }
  orgMessageTimeout = setTimeout(() => {
    orgMessage.value = ''
  }, 5000)
}

onMounted(async () => {
  if (isAdmin.value && !organization.value) {
    await fetchOrganization()
    if (organization.value) {
      orgName.value = organization.value.name
    }
  }
})

onUnmounted(() => {
  if (testMessageTimeout) {
    clearTimeout(testMessageTimeout)
  }
  if (orgMessageTimeout) {
    clearTimeout(orgMessageTimeout)
  }
})
</script>
