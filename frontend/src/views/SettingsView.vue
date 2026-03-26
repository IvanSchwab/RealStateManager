<template>
  <div class="flex flex-col md:flex-row h-full min-h-[calc(100vh-4rem)]">
    <!-- Desktop Sidebar -->
    <aside class="hidden md:flex w-52 flex-shrink-0 flex-col border-r border-border bg-muted/30 p-4">
      <nav class="space-y-1">
        <button
          v-if="isAdmin"
          @click="activeSection = 'organization'"
          class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="activeSection === 'organization'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
        >
          <Building2 class="w-4 h-4" />
          {{ $t('settings.organization') }}
        </button>
        <button
          @click="activeSection = 'profile'"
          class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="activeSection === 'profile'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
        >
          <UserCircle class="w-4 h-4" />
          {{ $t('settings.profile') }}
        </button>
        <button
          v-if="isAdmin"
          @click="activeSection = 'team'"
          class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="activeSection === 'team'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
        >
          <Users class="w-4 h-4" />
          {{ $t('settings.team') }}
        </button>
        <button
          v-if="isAdmin"
          @click="activeSection = 'regional'"
          class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="activeSection === 'regional'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
        >
          <Globe class="w-4 h-4" />
          {{ $t('settings.regionalPreferences') }}
        </button>
      </nav>
    </aside>

    <!-- Mobile Tab Bar -->
    <div class="md:hidden sticky top-0 z-10 bg-background border-b border-border flex-shrink-0">
      <div class="flex overflow-x-auto px-2 py-2 gap-1">
        <button
          v-if="isAdmin"
          @click="activeSection = 'organization'"
          class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
          :class="activeSection === 'organization'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'"
        >
          <Building2 class="w-4 h-4" />
          {{ $t('settings.organization') }}
        </button>
        <button
          @click="activeSection = 'profile'"
          class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
          :class="activeSection === 'profile'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'"
        >
          <UserCircle class="w-4 h-4" />
          {{ $t('settings.profile') }}
        </button>
        <button
          v-if="isAdmin"
          @click="activeSection = 'team'"
          class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
          :class="activeSection === 'team'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'"
        >
          <Users class="w-4 h-4" />
          {{ $t('settings.team') }}
        </button>
        <button
          v-if="isAdmin"
          @click="activeSection = 'regional'"
          class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
          :class="activeSection === 'regional'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'"
        >
          <Globe class="w-4 h-4" />
          {{ $t('settings.regionalPreferences') }}
        </button>
      </div>
    </div>

    <!-- Content Pane -->
    <main class="flex-1 overflow-y-auto">
      <div class="max-w-3xl p-6 space-y-6">

        <!-- Organization Section -->
        <template v-if="activeSection === 'organization' && isAdmin">
          <div>
            <h1 class="text-sm font-semibold">{{ $t('settings.organization') }}</h1>
            <p class="text-muted-foreground text-xs">
              {{ $t('settings.organizationDescription') }}
            </p>
          </div>

          <Card>
            <CardContent class="pt-6 space-y-6">
              <!-- Logo Upload -->
              <div class="space-y-4">
                <Label>{{ $t('settings.orgLogo') }}</Label>

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

                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  class="hidden"
                  @change="handleFileSelect"
                />
              </div>

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
            </CardContent>
          </Card>

          <!-- Save Button -->
          <div class="flex justify-end">
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
        </template>

        <!-- Profile Section -->
        <template v-if="activeSection === 'profile'">
          <div>
            <h1 class="text-sm font-semibold">{{ $t('settings.profile') }}</h1>
            <p class="text-muted-foreground text-xs">
              {{ $t('settings.profileDescription') }}
            </p>
          </div>

          <!-- Two-column grid layout -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Left column: Avatar card -->
            <Card class="flex flex-col">
              <CardContent class="pt-6 flex flex-col items-center text-center flex-1">
                <!-- Large Avatar -->
                <Avatar class="h-16 w-16 mb-3">
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

                <!-- User name -->
                <p class="font-medium text-foreground">
                  {{ fullName || profile?.full_name || profile?.email?.split('@')[0] || 'User' }}
                </p>

                <!-- User email -->
                <p class="text-sm text-muted-foreground">
                  {{ profile?.email }}
                </p>

                <!-- Role badge -->
                <span
                  class="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                >
                  {{ $t(`roles.${userRole}`) }}
                </span>

                <!-- Spacer to push button to bottom -->
                <div class="flex-1 min-h-4"></div>

                <!-- Change avatar button -->
                <Button
                  variant="outline"
                  class="w-full mt-4"
                  @click="triggerAvatarFileInput"
                  :disabled="savingProfile"
                >
                  <Upload class="w-4 h-4 mr-2" />
                  {{ profile?.avatar_url ? $t('settings.changeAvatar') : $t('settings.uploadAvatar') }}
                </Button>

                <!-- Remove avatar button (only if avatar exists) -->
                <Button
                  v-if="profile?.avatar_url || avatarPreview"
                  variant="ghost"
                  size="sm"
                  class="w-full mt-2 text-muted-foreground"
                  @click="handleRemoveAvatar"
                  :disabled="savingProfile"
                >
                  <Trash2 class="w-4 h-4 mr-2" />
                  {{ $t('settings.removeAvatar') }}
                </Button>

                <input
                  ref="avatarFileInputRef"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  class="hidden"
                  @change="handleAvatarFileSelect"
                />
              </CardContent>
            </Card>

            <!-- Right column: Two stacked cards -->
            <div class="flex flex-col gap-4">
              <!-- Personal Information Card -->
              <Card>
                <CardHeader class="pb-3">
                  <CardTitle class="text-sm font-medium">{{ $t('settings.personalInfo') }}</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4 pt-0">
                  <!-- Full Name -->
                  <div class="space-y-1.5">
                    <Label for="full-name" class="text-xs text-muted-foreground">{{ $t('settings.fullName') }}</Label>
                    <Input
                      id="full-name"
                      v-model="fullName"
                      :placeholder="$t('settings.fullNamePlaceholder')"
                      :disabled="savingProfile"
                    />
                  </div>

                  <!-- Email (read-only) -->
                  <div class="space-y-1.5">
                    <Label for="email" class="text-xs text-muted-foreground">{{ $t('common.email') }}</Label>
                    <Input
                      id="email"
                      :value="profile?.email || ''"
                      disabled
                      class="bg-muted"
                    />
                  </div>
                </CardContent>
              </Card>

              <!-- Change Password Card -->
              <Card>
                <CardHeader class="pb-3">
                  <CardTitle class="text-sm font-medium">{{ $t('settings.changePasswordCard') }}</CardTitle>
                  <CardDescription class="text-xs">
                    {{ $t('settings.changePasswordHint') }}
                  </CardDescription>
                </CardHeader>
                <CardContent class="space-y-4 pt-0">
                  <!-- New Password -->
                  <div class="space-y-1.5">
                    <Label for="new-password" class="text-xs text-muted-foreground">{{ $t('auth.newPassword') }}</Label>
                    <Input
                      id="new-password"
                      v-model="newPassword"
                      type="password"
                      :placeholder="$t('auth.minCharacters', { min: 8 })"
                      :disabled="changingPassword"
                    />
                  </div>

                  <!-- Confirm Password -->
                  <div class="space-y-1.5">
                    <Label for="confirm-password" class="text-xs text-muted-foreground">{{ $t('auth.confirmPassword') }}</Label>
                    <Input
                      id="confirm-password"
                      v-model="confirmPassword"
                      type="password"
                      :placeholder="$t('auth.repeatPassword')"
                      :disabled="changingPassword"
                    />
                  </div>

                  <!-- Password change message -->
                  <div
                    v-if="passwordMessage"
                    class="p-2 rounded-lg text-xs"
                    :class="passwordSuccess ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'"
                  >
                    <div class="flex items-center gap-2">
                      <CheckCircle v-if="passwordSuccess" class="w-3 h-3" />
                      <AlertCircle v-else class="w-3 h-3" />
                      {{ passwordMessage }}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <!-- Save Button -->
          <div class="flex justify-end">
            <Button
              @click="handleSaveProfileAndPassword"
              :disabled="savingProfile || changingPassword || (!hasProfileChanges && !canChangePassword)"
            >
              <Loader2 v-if="savingProfile || changingPassword" class="w-4 h-4 mr-2 animate-spin" />
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

          <!-- Appearance Card -->
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

          <!-- Notifications Card -->
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
        </template>

        <!-- Team Section -->
        <template v-if="activeSection === 'team' && isAdmin">
          <TeamSettings />
        </template>

        <!-- Regional Preferences Section -->
        <template v-if="activeSection === 'regional' && isAdmin">
          <div>
            <h1 class="text-sm font-semibold">{{ $t('settings.regionalPreferences') }}</h1>
            <p class="text-muted-foreground text-xs">
              {{ $t('settings.regionalPreferencesDescription') }}
            </p>
          </div>

          <Card>
            <CardContent class="pt-6 space-y-6">
              <!-- Date Format -->
              <div class="flex items-center justify-between">
                <div class="space-y-1">
                  <Label>{{ $t('settings.dateFormat') }}</Label>
                  <p class="text-xs text-muted-foreground">
                    {{ $t('settings.dateFormatHelp') }}
                  </p>
                </div>
                <!-- Segmented Control -->
                <div class="inline-flex rounded-lg border border-border p-1 bg-muted/50">
                  <button
                    @click="selectedDateFormat = 'DD/MM/YYYY'"
                    :disabled="savingPreferences"
                    class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                    :class="selectedDateFormat === 'DD/MM/YYYY'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'"
                  >
                    {{ $t('settings.dateFormatDMY') }}
                  </button>
                  <button
                    @click="selectedDateFormat = 'MM/DD/YYYY'"
                    :disabled="savingPreferences"
                    class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                    :class="selectedDateFormat === 'MM/DD/YYYY'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'"
                  >
                    {{ $t('settings.dateFormatMDY') }}
                  </button>
                </div>
              </div>

              <!-- Divider -->
              <div class="border-t border-border"></div>

              <!-- Currency -->
              <div class="flex items-center justify-between">
                <div class="space-y-1">
                  <Label>{{ $t('settings.currency') }}</Label>
                  <p class="text-xs text-muted-foreground">
                    {{ $t('settings.currencyHelp') }}
                  </p>
                </div>
                <!-- Segmented Control -->
                <div class="inline-flex rounded-lg border border-border p-1 bg-muted/50">
                  <button
                    @click="selectedCurrency = 'ARS'"
                    :disabled="savingPreferences"
                    class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                    :class="selectedCurrency === 'ARS'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'"
                  >
                    {{ $t('settings.currencyARS') }}
                  </button>
                  <button
                    @click="selectedCurrency = 'USD'"
                    :disabled="savingPreferences"
                    class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                    :class="selectedCurrency === 'USD'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'"
                  >
                    {{ $t('settings.currencyUSD') }}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- USD conversion note -->
          <p
            v-if="selectedCurrency === 'USD'"
            class="text-xs text-amber-600 dark:text-amber-500 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800"
          >
            {{ $t('settings.currencyConversionNote') }}
          </p>

          <!-- Save Button -->
          <div class="flex justify-end">
            <Button
              @click="handleSavePreferences"
              :disabled="savingPreferences || !hasPreferencesChanges"
            >
              <Loader2 v-if="savingPreferences" class="w-4 h-4 mr-2 animate-spin" />
              <Save v-else class="w-4 h-4 mr-2" />
              {{ $t('settings.saveChanges') }}
            </Button>
          </div>
        </template>

      </div>
    </main>
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
  Globe,
  Users
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
import TeamSettings from '@/components/settings/TeamSettings.vue'
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
const { isAdmin, userRole } = useAuth()
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

// Active section state
type Section = 'organization' | 'profile' | 'team' | 'regional'
const activeSection = ref<Section>('profile')

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
const newPassword = ref('')
const confirmPassword = ref('')
const changingPassword = ref(false)
const passwordMessage = ref('')
const passwordSuccess = ref(false)
let passwordMessageTimeout: ReturnType<typeof setTimeout> | null = null

// Profile computed
const profileInitials = computed(() => getProfileInitials(fullName.value || (profile.value?.full_name ?? null), profile.value?.email ?? null))
const profileAvatarColor = computed(() => getProfileAvatarColor(fullName.value || (profile.value?.full_name ?? null), profile.value?.email ?? null))

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

// Handle section from URL hash
watch(() => route.hash, (hash) => {
  if (hash === '#organization' && isAdmin.value) {
    activeSection.value = 'organization'
  } else if (hash === '#profile') {
    activeSection.value = 'profile'
  } else if (hash === '#team' && isAdmin.value) {
    activeSection.value = 'team'
  } else if (hash === '#regional' && isAdmin.value) {
    activeSection.value = 'regional'
  }
}, { immediate: true })

// Set default section based on admin status
watch(isAdmin, (admin) => {
  // If not admin and on admin-only section, switch to profile
  if (!admin && (activeSection.value === 'organization' || activeSection.value === 'team' || activeSection.value === 'regional')) {
    activeSection.value = 'profile'
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

async function handleSaveProfileAndPassword() {
  // Handle profile changes
  if (hasProfileChanges.value) {
    await handleSaveProfile()
  }

  // Handle password change
  if (canChangePassword.value) {
    await handleChangePassword()
    // Clear password fields on success
    if (passwordSuccess.value) {
      newPassword.value = ''
      confirmPassword.value = ''
    }
  }
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
    const org = await fetchOrganization()
    if (org) {
      orgName.value = org.name
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
