<template>
  <div class="p-6 space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold">{{ $t('settings.title') }}</h1>
        <p class="text-muted-foreground text-sm">
          {{ $t('settings.subtitle') }}
        </p>
      </div>

      <!-- My Profile Section -->
      <Card id="profile">
        <CardHeader>
          <div class="flex items-center gap-2">
            <UserCircle class="w-5 h-5 text-muted-foreground" />
            <CardTitle>{{ $t('settings.profile') }}</CardTitle>
          </div>
          <CardDescription>
            {{ $t('settings.profileDescription') }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <!-- Avatar Upload -->
          <div class="space-y-4">
            <Label>{{ $t('settings.profileAvatar') }}</Label>

            <div class="flex items-center gap-4">
              <Avatar size="lg" class="h-16 w-16">
                <AvatarImage
                  v-if="avatarPreview || profile?.avatar_url"
                  :src="avatarPreview || profile?.avatar_url || ''"
                  alt="Avatar preview"
                />
                <AvatarFallback
                  v-else
                  :style="{ backgroundColor: profileAvatarColor, color: 'white' }"
                  class="text-xl"
                >
                  {{ profileInitials }}
                </AvatarFallback>
              </Avatar>

              <div class="flex flex-col gap-2">
                <div class="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    @click="triggerAvatarFileInput"
                    :disabled="savingProfile"
                  >
                    <Upload class="w-4 h-4 mr-2" />
                    {{ profile?.avatar_url ? $t('settings.changeAvatar') : $t('settings.uploadAvatar') }}
                  </Button>
                  <Button
                    v-if="profile?.avatar_url || avatarPreview"
                    variant="outline"
                    size="sm"
                    @click="handleRemoveAvatar"
                    :disabled="savingProfile"
                  >
                    <Trash2 class="w-4 h-4 mr-2" />
                    {{ $t('settings.removeAvatar') }}
                  </Button>
                </div>
                <p class="text-xs text-muted-foreground">
                  {{ $t('settings.avatarHelp') }}
                </p>
              </div>
            </div>

            <!-- Hidden File Input for Avatar -->
            <input
              ref="avatarFileInputRef"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              class="hidden"
              @change="handleAvatarFileSelect"
            />
          </div>

          <!-- Full Name -->
          <div class="space-y-2">
            <Label for="full-name">{{ $t('settings.fullName') }}</Label>
            <Input
              id="full-name"
              v-model="fullName"
              :placeholder="$t('settings.fullNamePlaceholder')"
              :disabled="savingProfile"
            />
          </div>

          <!-- Email (read-only) -->
          <div class="space-y-2">
            <Label for="email">{{ $t('common.email') }}</Label>
            <Input
              id="email"
              :value="profile?.email || ''"
              disabled
              class="bg-muted"
            />
            <p class="text-xs text-muted-foreground">
              {{ $t('settings.emailReadOnly') }}
            </p>
          </div>

          <!-- Save Profile Button -->
          <div class="flex items-center gap-4">
            <Button
              @click="handleSaveProfile"
              :disabled="savingProfile || !hasProfileChanges"
            >
              <Loader2 v-if="savingProfile" class="w-4 h-4 mr-2 animate-spin" />
              <Save v-else class="w-4 h-4 mr-2" />
              {{ $t('settings.saveChanges') }}
            </Button>
          </div>

          <!-- Profile Success/Error message -->
          <div
            v-if="profileMessage"
            class="p-3 rounded-lg text-sm"
            :class="profileSuccess ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'"
          >
            <div class="flex items-center gap-2">
              <CheckCircle v-if="profileSuccess" class="w-4 h-4" />
              <AlertCircle v-else class="w-4 h-4" />
              {{ profileMessage }}
            </div>
          </div>

          <!-- Divider -->
          <div class="border-t border-border my-4"></div>

          <!-- Change Password Section -->
          <div class="space-y-4">
            <div>
              <Label>{{ $t('settings.changePassword') }}</Label>
              <p class="text-xs text-muted-foreground mt-1">
                {{ $t('settings.changePasswordDescription') }}
              </p>
            </div>

            <div v-if="!showPasswordForm" class="flex">
              <Button
                variant="outline"
                @click="showPasswordForm = true"
              >
                <Key class="w-4 h-4 mr-2" />
                {{ $t('settings.changePassword') }}
              </Button>
            </div>

            <div v-else class="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
              <div class="space-y-2">
                <Label for="new-password">{{ $t('auth.newPassword') }}</Label>
                <Input
                  id="new-password"
                  v-model="newPassword"
                  type="password"
                  :placeholder="$t('auth.minCharacters', { min: 8 })"
                  :disabled="changingPassword"
                />
              </div>

              <div class="space-y-2">
                <Label for="confirm-password">{{ $t('auth.confirmPassword') }}</Label>
                <Input
                  id="confirm-password"
                  v-model="confirmPassword"
                  type="password"
                  :placeholder="$t('auth.repeatPassword')"
                  :disabled="changingPassword"
                />
              </div>

              <div class="flex gap-2">
                <Button
                  @click="handleChangePassword"
                  :disabled="changingPassword || !canChangePassword"
                >
                  <Loader2 v-if="changingPassword" class="w-4 h-4 mr-2 animate-spin" />
                  {{ $t('auth.updatePassword') }}
                </Button>
                <Button
                  variant="ghost"
                  @click="cancelPasswordChange"
                  :disabled="changingPassword"
                >
                  {{ $t('common.cancel') }}
                </Button>
              </div>

              <div
                v-if="passwordMessage"
                class="p-3 rounded-lg text-sm"
                :class="passwordSuccess ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'"
              >
                <div class="flex items-center gap-2">
                  <CheckCircle v-if="passwordSuccess" class="w-4 h-4" />
                  <AlertCircle v-else class="w-4 h-4" />
                  {{ passwordMessage }}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Organization Section (Admin only) -->
      <Card v-if="isAdmin" id="organization">
        <CardHeader>
          <div class="flex items-center gap-2">
            <Building2 class="w-5 h-5 text-muted-foreground" />
            <CardTitle>{{ $t('settings.organization') }}</CardTitle>
          </div>
          <CardDescription>
            {{ $t('settings.organizationDescription') }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <!-- Organization Name -->
          <div class="space-y-2">
            <Label for="org-name">{{ $t('settings.orgName') }}</Label>
            <Input
              id="org-name"
              v-model="orgName"
              :placeholder="$t('settings.orgNamePlaceholder')"
              :disabled="savingOrg"
            />
          </div>

          <!-- Logo Upload -->
          <div class="space-y-4">
            <Label>{{ $t('settings.orgLogo') }}</Label>

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
                    {{ organization?.logo_url ? $t('settings.changeLogo') : $t('settings.uploadLogo') }}
                  </Button>
                  <Button
                    v-if="organization?.logo_url || logoPreview"
                    variant="outline"
                    size="sm"
                    @click="handleRemoveLogo"
                    :disabled="savingOrg"
                  >
                    <Trash2 class="w-4 h-4 mr-2" />
                    {{ $t('settings.removeLogo') }}
                  </Button>
                </div>
                <p class="text-xs text-muted-foreground">
                  {{ $t('settings.logoHelp') }}
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
              {{ $t('settings.saveChanges') }}
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

      <!-- Regional Preferences Section (Admin only) -->
      <Card v-if="isAdmin" id="regional-preferences">
        <CardHeader>
          <div class="flex items-center gap-2">
            <Globe class="w-5 h-5 text-muted-foreground" />
            <CardTitle>{{ $t('settings.regionalPreferences') }}</CardTitle>
          </div>
          <CardDescription>
            {{ $t('settings.regionalPreferencesDescription') }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <!-- Date Format -->
          <div class="space-y-2">
            <Label>{{ $t('settings.dateFormat') }}</Label>
            <div class="flex gap-2">
              <Button
                :variant="selectedDateFormat === 'DD/MM/YYYY' ? 'default' : 'outline'"
                size="sm"
                @click="selectedDateFormat = 'DD/MM/YYYY'"
                :disabled="savingPreferences"
                class="flex-1"
              >
                {{ $t('settings.dateFormatDMY') }}
              </Button>
              <Button
                :variant="selectedDateFormat === 'MM/DD/YYYY' ? 'default' : 'outline'"
                size="sm"
                @click="selectedDateFormat = 'MM/DD/YYYY'"
                :disabled="savingPreferences"
                class="flex-1"
              >
                {{ $t('settings.dateFormatMDY') }}
              </Button>
            </div>
            <p class="text-xs text-muted-foreground mt-2">
              {{ $t('settings.dateFormatHelp') }}
            </p>
          </div>

          <!-- Currency -->
          <div class="space-y-2">
            <Label>{{ $t('settings.currency') }}</Label>
            <div class="flex gap-2">
              <Button
                :variant="selectedCurrency === 'ARS' ? 'default' : 'outline'"
                size="sm"
                @click="selectedCurrency = 'ARS'"
                :disabled="savingPreferences"
                class="flex-1"
              >
                {{ $t('settings.currencyARS') }}
              </Button>
              <Button
                :variant="selectedCurrency === 'USD' ? 'default' : 'outline'"
                size="sm"
                @click="selectedCurrency = 'USD'"
                :disabled="savingPreferences"
                class="flex-1"
              >
                {{ $t('settings.currencyUSD') }}
              </Button>
            </div>
            <p class="text-xs text-muted-foreground mt-2">
              {{ $t('settings.currencyHelp') }}
            </p>
            <!-- Conversion note for USD -->
            <p
              v-if="selectedCurrency === 'USD'"
              class="text-xs text-amber-600 dark:text-amber-500 mt-1 p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800"
            >
              {{ $t('settings.currencyConversionNote') }}
            </p>
          </div>

          <!-- Save Button -->
          <div class="flex items-center gap-4">
            <Button
              @click="handleSavePreferences"
              :disabled="savingPreferences || !hasPreferencesChanges"
            >
              <Loader2 v-if="savingPreferences" class="w-4 h-4 mr-2 animate-spin" />
              <Save v-else class="w-4 h-4 mr-2" />
              {{ $t('settings.saveChanges') }}
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Notifications Section -->
      <Card>
        <CardHeader>
          <div class="flex items-center gap-2">
            <Bell class="w-5 h-5 text-muted-foreground" />
            <CardTitle>{{ $t('settings.notifications') }}</CardTitle>
          </div>
          <CardDescription>
            {{ $t('settings.notificationsDescription') }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
            <div class="space-y-1">
              <p class="text-sm font-medium">{{ $t('settings.testNotifications') }}</p>
              <p class="text-xs text-muted-foreground">
                {{ $t('settings.testNotificationsHelp') }}
              </p>
            </div>
            <Button
              @click="handleTestNotification"
              :disabled="testingNotification"
              variant="outline"
            >
              <Loader2 v-if="testingNotification" class="w-4 h-4 mr-2 animate-spin" />
              <Send v-else class="w-4 h-4 mr-2" />
              {{ $t('settings.sendTest') }}
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
            <CardTitle>{{ $t('settings.appearance') }}</CardTitle>
          </div>
          <CardDescription>
            {{ $t('settings.appearanceDescription') }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <!-- Theme -->
          <div class="space-y-2">
            <Label>{{ $t('settings.theme') }}</Label>
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
              {{ $t('settings.themeHelp') }}
            </p>
          </div>

          <!-- Language -->
          <div class="space-y-2">
            <Label>{{ $t('settings.language') }}</Label>
            <div class="flex gap-2">
              <Button
                :variant="currentLocale === 'es' ? 'default' : 'outline'"
                size="sm"
                @click="handleSetLocale('es')"
                class="flex-1"
              >
                🇦🇷 Español
              </Button>
              <Button
                :variant="currentLocale === 'en' ? 'default' : 'outline'"
                size="sm"
                @click="handleSetLocale('en')"
                class="flex-1"
              >
                🇺🇸 English
              </Button>
            </div>
            <p class="text-xs text-muted-foreground mt-2">
              {{ $t('settings.languageHelp') }}
            </p>
          </div>
        </CardContent>
      </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
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
  Monitor,
  UserCircle,
  Key,
  Globe
} from 'lucide-vue-next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useNotifications } from '@/composables/useNotifications'
import { useOrganization } from '@/composables/useOrganization'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import { useTheme, type Theme } from '@/composables/useTheme'
import { useLocale, type Locale } from '@/composables/useLocale'
import { useToast } from '@/composables/useToast'
import { useExchangeRate } from '@/composables/useExchangeRate'
import type { DateFormat, CurrencyCode } from '@/types'

const { t } = useI18n()
const route = useRoute()
const { sendTestNotification } = useNotifications()
const {
  organization,
  fetchOrganization,
  updateOrganization,
  updateSettings,
  uploadLogo,
  removeLogo,
  getInitials,
  getAvatarColor,
  dateFormat,
  defaultCurrency
} = useOrganization()
const { isAdmin } = useAuth()
const {
  profile,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  changePassword,
  getInitials: getProfileInitials,
  getAvatarColor: getProfileAvatarColor
} = useProfile()
const { theme, setTheme } = useTheme()
const { currentLocale, setLocale } = useLocale()
const toast = useToast()
const { fetchRate } = useExchangeRate()

const themeOptions = computed(() => [
  { value: 'light' as Theme, label: t('settings.themeLight'), icon: Sun },
  { value: 'dark' as Theme, label: t('settings.themeDark'), icon: Moon },
  { value: 'system' as Theme, label: t('settings.themeSystem'), icon: Monitor }
])

// Regional preferences state
const selectedDateFormat = ref<DateFormat>('DD/MM/YYYY')
const selectedCurrency = ref<CurrencyCode>('ARS')
const savingPreferences = ref(false)

const hasPreferencesChanges = computed(() => {
  return selectedDateFormat.value !== dateFormat.value ||
         selectedCurrency.value !== defaultCurrency.value
})

// Profile edit state
const fullName = ref('')
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const savingProfile = ref(false)
const profileMessage = ref('')
const profileSuccess = ref(false)
let profileMessageTimeout: ReturnType<typeof setTimeout> | null = null
const avatarFileInputRef = ref<HTMLInputElement | null>(null)

// Password change state
const showPasswordForm = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const changingPassword = ref(false)
const passwordMessage = ref('')
const passwordSuccess = ref(false)
let passwordMessageTimeout: ReturnType<typeof setTimeout> | null = null

// Profile computed
const profileInitials = computed(() => getProfileInitials(fullName.value || profile.value?.full_name, profile.value?.email))
const profileAvatarColor = computed(() => getProfileAvatarColor(fullName.value || profile.value?.full_name, profile.value?.email))

const hasProfileChanges = computed(() => {
  if (!profile.value) return false
  const nameChanged = fullName.value !== (profile.value.full_name || '')
  return nameChanged || avatarFile.value !== null
})

const canChangePassword = computed(() => {
  return newPassword.value.length >= 8 && newPassword.value === confirmPassword.value
})

// Watch profile changes to sync local state
watch(profile, (newProfile) => {
  if (newProfile && !fullName.value) {
    fullName.value = newProfile.full_name || ''
  }
}, { immediate: true })

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
  // Also sync preferences when organization loads/changes
  if (newOrg) {
    selectedDateFormat.value = newOrg.settings?.date_format ?? 'DD/MM/YYYY'
    selectedCurrency.value = newOrg.settings?.default_currency ?? 'ARS'
  }
}, { immediate: true })

// Scroll to section if hash is present
watch(() => route.hash, (hash) => {
  if (hash === '#organization' || hash === '#profile') {
    setTimeout(() => {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }
}, { immediate: true })

function handleSetLocale(locale: Locale) {
  setLocale(locale)
}

// Profile methods
function triggerAvatarFileInput() {
  avatarFileInputRef.value?.click()
}

function handleAvatarFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!allowedTypes.includes(file.type)) {
    profileMessage.value = t('errors.fileTypeNotAllowed')
    profileSuccess.value = false
    clearProfileMessageAfterDelay()
    return
  }

  // Validate file size (max 2MB)
  const maxSize = 2 * 1024 * 1024
  if (file.size > maxSize) {
    profileMessage.value = t('errors.fileTooLarge')
    profileSuccess.value = false
    clearProfileMessageAfterDelay()
    return
  }

  avatarFile.value = file

  // Create preview
  const reader = new FileReader()
  reader.onload = (e) => {
    avatarPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)

  // Reset file input
  input.value = ''
}

async function handleRemoveAvatar() {
  avatarFile.value = null
  avatarPreview.value = null

  if (profile.value?.avatar_url) {
    savingProfile.value = true
    try {
      await removeAvatar()
      profileMessage.value = t('settings.avatarRemoved')
      profileSuccess.value = true
    } catch (e) {
      profileMessage.value = e instanceof Error ? e.message : t('errors.deleteError')
      profileSuccess.value = false
    } finally {
      savingProfile.value = false
      clearProfileMessageAfterDelay()
    }
  }
}

async function handleSaveProfile() {
  if (!hasProfileChanges.value) return

  savingProfile.value = true
  profileMessage.value = ''

  try {
    let newAvatarUrl: string | undefined

    // Upload avatar if selected
    if (avatarFile.value) {
      newAvatarUrl = await uploadAvatar(avatarFile.value)
    }

    // Update profile
    const updates: { full_name?: string; avatar_url?: string } = {}

    if (fullName.value !== (profile.value?.full_name || '')) {
      updates.full_name = fullName.value
    }

    if (newAvatarUrl) {
      updates.avatar_url = newAvatarUrl
    }

    if (Object.keys(updates).length > 0) {
      await updateProfile(updates)
    }

    // Clear local file state
    avatarFile.value = null
    avatarPreview.value = null

    profileMessage.value = t('settings.changesSaved')
    profileSuccess.value = true
  } catch (e) {
    profileMessage.value = e instanceof Error ? e.message : t('errors.unknownError')
    profileSuccess.value = false
  } finally {
    savingProfile.value = false
    clearProfileMessageAfterDelay()
  }
}

function clearProfileMessageAfterDelay() {
  if (profileMessageTimeout) {
    clearTimeout(profileMessageTimeout)
  }
  profileMessageTimeout = setTimeout(() => {
    profileMessage.value = ''
  }, 5000)
}

async function handleChangePassword() {
  if (!canChangePassword.value) return

  changingPassword.value = true
  passwordMessage.value = ''

  try {
    await changePassword(newPassword.value)
    passwordMessage.value = t('auth.passwordUpdated')
    passwordSuccess.value = true

    // Reset form after success
    setTimeout(() => {
      showPasswordForm.value = false
      newPassword.value = ''
      confirmPassword.value = ''
      passwordMessage.value = ''
    }, 2000)
  } catch (e) {
    passwordMessage.value = e instanceof Error ? e.message : t('errors.errorUpdatingPassword')
    passwordSuccess.value = false
    clearPasswordMessageAfterDelay()
  } finally {
    changingPassword.value = false
  }
}

function cancelPasswordChange() {
  showPasswordForm.value = false
  newPassword.value = ''
  confirmPassword.value = ''
  passwordMessage.value = ''
}

function clearPasswordMessageAfterDelay() {
  if (passwordMessageTimeout) {
    clearTimeout(passwordMessageTimeout)
  }
  passwordMessageTimeout = setTimeout(() => {
    passwordMessage.value = ''
  }, 5000)
}

async function handleTestNotification() {
  testingNotification.value = true
  testMessage.value = ''

  const result = await sendTestNotification()

  testingNotification.value = false
  testSuccess.value = result.success

  if (result.success) {
    testMessage.value = t('settings.testSent')
  } else {
    testMessage.value = result.error || t('errors.unknownError')
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
    orgMessage.value = t('errors.fileTypeNotAllowed')
    orgSuccess.value = false
    clearOrgMessageAfterDelay()
    return
  }

  // Validate file size (max 2MB)
  const maxSize = 2 * 1024 * 1024
  if (file.size > maxSize) {
    orgMessage.value = t('errors.fileTooLarge')
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
      orgMessage.value = t('settings.logoRemoved')
      orgSuccess.value = true
    } catch (e) {
      orgMessage.value = e instanceof Error ? e.message : t('errors.deleteError')
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

    orgMessage.value = t('settings.changesSaved')
    orgSuccess.value = true
  } catch (e) {
    orgMessage.value = e instanceof Error ? e.message : t('errors.unknownError')
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

async function handleSavePreferences() {
  if (!hasPreferencesChanges.value) return

  savingPreferences.value = true

  // Store previous currency in case we need to revert
  const previousCurrency = defaultCurrency.value
  const switchingToUsd = selectedCurrency.value === 'USD' && previousCurrency !== 'USD'

  try {
    // If switching to USD, fetch exchange rate first
    if (switchingToUsd) {
      try {
        await fetchRate()
      } catch (rateError) {
        // Revert the currency selection
        selectedCurrency.value = previousCurrency
        toast.error(t('settings.exchangeRateFetchError'))
        savingPreferences.value = false
        return
      }
    }

    await updateSettings({
      date_format: selectedDateFormat.value,
      default_currency: selectedCurrency.value,
    })
    toast.success(t('settings.preferencesSaved'))
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('errors.unknownError'))
  } finally {
    savingPreferences.value = false
  }
}

// Initialize preferences from organization settings
function initPreferences() {
  selectedDateFormat.value = dateFormat.value
  selectedCurrency.value = defaultCurrency.value
}

onMounted(async () => {
  if (isAdmin.value && !organization.value) {
    await fetchOrganization()
    if (organization.value) {
      orgName.value = organization.value.name
      initPreferences()
    }
  } else if (organization.value) {
    initPreferences()
  }
})

onUnmounted(() => {
  if (testMessageTimeout) {
    clearTimeout(testMessageTimeout)
  }
  if (orgMessageTimeout) {
    clearTimeout(orgMessageTimeout)
  }
  if (profileMessageTimeout) {
    clearTimeout(profileMessageTimeout)
  }
  if (passwordMessageTimeout) {
    clearTimeout(passwordMessageTimeout)
  }
})
</script>
