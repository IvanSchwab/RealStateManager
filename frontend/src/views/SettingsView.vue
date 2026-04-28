<template>
  <div>
    <!-- Page header -->
    <div style="border-bottom:1px solid var(--pia-border)">
      <div class="settings-page-header">
        <h1 style="font-size:22px;font-weight:700;color:var(--pia-text);line-height:1.2">{{ $t('settings.title') }}</h1>
        <p style="font-size:13px;color:var(--pia-text-3);margin-top:4px">{{ $t('settings.subtitle') }}</p>
      </div>
    </div>

    <div style="display:flex;align-items:flex-start">

      <!-- Desktop Sidebar -->
      <aside class="hidden md:flex" style="width:248px;flex-shrink:0;border-right:1px solid var(--pia-border);min-height:calc(100vh - 121px);padding:16px 12px;flex-direction:column">
        <nav style="display:flex;flex-direction:column;gap:2px">
          <button
            v-for="item in navItems" :key="item.section"
            v-show="!item.adminOnly || isAdmin"
            @click="setSection(item.section)"
            style="display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border-radius:8px;border:none;cursor:pointer;transition:background .15s;text-align:left"
            :style="activeSection === item.section
              ? 'background:var(--brand-50);color:var(--brand-700)'
              : 'background:transparent;color:var(--pia-text-2)'"
          >
            <component :is="item.icon" style="width:16px;height:16px;flex-shrink:0" />
            <div>
              <div style="font-size:13px;font-weight:600;line-height:1.3">{{ item.label }}</div>
              <div style="font-size:11px;margin-top:1px;opacity:.7;line-height:1.3">{{ item.sublabel }}</div>
            </div>
          </button>
        </nav>
      </aside>

      <!-- Content column (mobile tab bar + content stacked) -->
      <div style="flex:1;min-width:0;display:flex;flex-direction:column">

        <!-- Mobile: sticky horizontal tab bar -->
        <div class="md:hidden" style="position:sticky;top:0;z-index:10;background:var(--pia-bg);border-bottom:1px solid var(--pia-border)">
          <div style="display:flex;overflow-x:auto;padding:8px 12px;gap:6px;scrollbar-width:none;-webkit-overflow-scrolling:touch">
            <button
              v-for="item in navItems" :key="item.section"
              v-show="!item.adminOnly || isAdmin"
              @click="setSection(item.section)"
              class="mobile-tab-btn"
              :class="activeSection === item.section ? 'mobile-tab-active' : 'mobile-tab-inactive'"
            >
              <component :is="item.icon" style="width:14px;height:14px;flex-shrink:0" />
              <span>{{ item.label }}</span>
            </button>
          </div>
        </div>

        <!-- Content -->
        <main style="max-width:760px;width:100%">
          <div class="settings-content-inner">

        <!-- ===== Mi perfil ===== -->
        <template v-if="activeSection === 'profile'">
          <h2 class="settings-section-title">{{ $t('settings.profile') }}</h2>
          <p class="settings-section-subtitle">{{ $t('settings.profileSubtitle') }}</p>
          <div class="settings-divider"></div>

          <!-- Avatar -->
          <div style="display:flex;align-items:center;gap:20px;padding:20px 0;border-bottom:1px solid var(--pia-border)">
            <Avatar style="width:64px;height:64px;flex-shrink:0">
              <AvatarImage v-if="avatarPreview || profile?.avatar_url" :src="avatarPreview || profile?.avatar_url || ''" alt="Avatar" />
              <AvatarFallback :style="{ backgroundColor: profileAvatarColor, color: 'white', fontSize: '20px', fontWeight: 600 }">
                {{ profileInitials }}
              </AvatarFallback>
            </Avatar>
            <div>
              <p style="font-weight:600;font-size:15px;color:var(--pia-text)">{{ fullName || profile?.full_name || profile?.email?.split('@')[0] }}</p>
              <p style="font-size:13px;color:var(--pia-text-3);margin-top:2px">{{ profile?.email }}</p>
              <div style="display:flex;gap:8px;margin-top:10px">
                <Button variant="outline" size="sm" @click="triggerAvatarFileInput" :disabled="savingProfile">{{ $t('settings.changeAvatar') }}</Button>
                <Button v-if="profile?.avatar_url || avatarPreview" variant="ghost" size="sm" @click="handleRemoveAvatar" :disabled="savingProfile" class="text-destructive">{{ $t('settings.removeAvatar') }}</Button>
              </div>
              <input ref="avatarFileInputRef" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" class="hidden" @change="handleAvatarFileSelect" />
            </div>
          </div>

          <!-- Nombre completo -->
          <div class="settings-field-row">
            <div class="settings-field-label">{{ $t('settings.fullName') }}</div>
            <div class="settings-field-control">
              <Input v-model="fullName" :placeholder="$t('settings.fullNamePlaceholder')" :disabled="savingProfile" />
            </div>
          </div>

          <!-- Email -->
          <div class="settings-field-row">
            <div class="settings-field-label">
              <div>{{ $t('common.email') }}</div>
              <div class="settings-field-desc">{{ $t('settings.emailDesc') }}</div>
            </div>
            <div class="settings-field-control">
              <Input :value="profile?.email || ''" disabled style="background:var(--pia-muted)" />
            </div>
          </div>

          <!-- Teléfono (stub) -->
          <div class="settings-field-row">
            <div class="settings-field-label">{{ $t('settings.phone') }}</div>
            <div class="settings-field-control">
              <Input v-model="phoneStub" :placeholder="$t('settings.phonePlaceholder')" />
            </div>
          </div>

          <!-- Contraseña -->
          <div class="settings-field-row" style="align-items:flex-start">
            <div class="settings-field-label" style="padding-top:6px">
              <div>{{ $t('settings.passwordField') }}</div>
              <div class="settings-field-desc">{{ $t('settings.passwordDesc') }}</div>
            </div>
            <div class="settings-field-control">
              <Button variant="outline" size="sm" @click="showPasswordForm = !showPasswordForm">{{ $t('settings.changePassword') }}</Button>
              <div v-if="showPasswordForm" style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
                <Input v-model="newPassword" type="password" :placeholder="$t('auth.minCharacters', { min: 8 })" :disabled="changingPassword" />
                <Input v-model="confirmPassword" type="password" :placeholder="$t('auth.repeatPassword')" :disabled="changingPassword" />
                <div v-if="passwordMessage" class="p-2 rounded text-xs" :class="passwordSuccess ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'">
                  {{ passwordMessage }}
                </div>
                <div style="display:flex;gap:8px">
                  <Button size="sm" variant="outline" @click="showPasswordForm = false; newPassword = ''; confirmPassword = ''">{{ $t('common.cancel') }}</Button>
                  <Button size="sm" @click="handleChangePassword" :disabled="!canChangePassword || changingPassword">
                    <Loader2 v-if="changingPassword" class="w-3 h-3 mr-1 animate-spin" />
                    {{ $t('settings.savePassword') }}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <!-- Autenticación 2 pasos (stub) -->
          <div class="settings-field-row">
            <div class="settings-field-label">
              <div>{{ $t('settings.twoFactor') }}</div>
              <div class="settings-field-desc">{{ $t('settings.twoFactorDesc') }}</div>
            </div>
            <div class="settings-field-control" style="display:flex;align-items:center;gap:10px">
              <span style="padding:3px 10px;border-radius:9999px;font-size:11px;font-weight:500;background:#fff3cd;color:#856404;border:1px solid #ffc107">{{ $t('settings.twoFactorNotConfigured') }}</span>
              <Button size="sm" @click="showComingSoonToast">{{ $t('settings.activate') }}</Button>
            </div>
          </div>

          <!-- Profile message -->
          <div v-if="profileMessage" class="p-3 rounded-lg text-sm mt-4" :class="profileSuccess ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'">
            <div class="flex items-center gap-2">
              <CheckCircle v-if="profileSuccess" class="w-4 h-4" />
              <AlertCircle v-else class="w-4 h-4" />
              {{ profileMessage }}
            </div>
          </div>

          <!-- Actions -->
          <div class="settings-actions">
            <Button variant="outline" @click="cancelProfile">{{ $t('common.cancel') }}</Button>
            <Button @click="handleSaveProfile" :disabled="savingProfile || !hasProfileChanges">
              <Loader2 v-if="savingProfile" class="w-4 h-4 mr-2 animate-spin" />
              <Check v-else class="w-4 h-4 mr-2" />
              {{ $t('settings.saveChanges') }}
            </Button>
          </div>
        </template>

        <!-- ===== Organización ===== -->
        <template v-if="activeSection === 'organization' && isAdmin">
          <h2 class="settings-section-title">{{ $t('settings.organization') }}</h2>
          <p class="settings-section-subtitle">{{ $t('settings.organizationSubtitle') }}</p>
          <div class="settings-divider"></div>

          <div class="settings-field-row">
            <div class="settings-field-label">{{ $t('settings.commercialName') }}</div>
            <div class="settings-field-control">
              <Input v-model="orgName" :placeholder="$t('settings.orgNamePlaceholder')" :disabled="savingOrg" />
            </div>
          </div>

          <div class="settings-field-row">
            <div class="settings-field-label">{{ $t('settings.legalName') }}</div>
            <div class="settings-field-control">
              <Input v-model="razonSocial" placeholder="Pepito SRL" />
            </div>
          </div>

          <div class="settings-field-row">
            <div class="settings-field-label">{{ $t('settings.cuit') }}</div>
            <div class="settings-field-control">
              <Input v-model="cuit" placeholder="30-78123456-2" />
            </div>
          </div>

          <div class="settings-field-row">
            <div class="settings-field-label">{{ $t('settings.vatCondition') }}</div>
            <div class="settings-field-control">
              <select v-model="condicionIVA" class="settings-select">
                <option value="">{{ $t('settings.vatSelect') }}</option>
                <option value="responsable_inscripto">{{ $t('settings.vatResponsable') }}</option>
                <option value="monotributista">{{ $t('settings.vatMonotributista') }}</option>
                <option value="exento">{{ $t('settings.vatExento') }}</option>
                <option value="consumidor_final">{{ $t('settings.vatConsumidorFinal') }}</option>
              </select>
            </div>
          </div>

          <div class="settings-field-row">
            <div class="settings-field-label">{{ $t('settings.address') }}</div>
            <div class="settings-field-control">
              <Input v-model="direccion" placeholder="Av. Santa Fe 1234, Piso 5, CABA" />
            </div>
          </div>

          <!-- Logo -->
          <div class="settings-field-row" style="align-items:flex-start">
            <div class="settings-field-label" style="padding-top:6px">
              <div>{{ $t('settings.logo') }}</div>
              <div class="settings-field-desc">{{ $t('settings.logoDesc') }}</div>
            </div>
            <div class="settings-field-control" style="display:flex;align-items:center;gap:12px">
              <div style="width:48px;height:48px;border-radius:8px;border:1px solid var(--pia-border);overflow:hidden;background:var(--pia-muted);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <img v-if="logoPreview || organization?.logo_url" :src="logoPreview || organization?.logo_url || ''" style="width:100%;height:100%;object-fit:contain" alt="Logo" />
                <span v-else style="font-size:14px;font-weight:600;color:var(--pia-text-3)">{{ initials }}</span>
              </div>
              <Button variant="outline" size="sm" @click="triggerFileInput" :disabled="savingOrg">{{ $t('settings.uploadNewLogo') }}</Button>
              <Button v-if="organization?.logo_url || logoPreview" variant="ghost" size="sm" @click="handleRemoveLogo" :disabled="savingOrg" class="text-destructive">{{ $t('settings.removeLogo') }}</Button>
            </div>
            <input ref="fileInputRef" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" class="hidden" @change="handleFileSelect" />
          </div>

          <!-- Org message -->
          <div v-if="orgMessage" class="p-3 rounded-lg text-sm mt-4" :class="orgSuccess ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'">
            <div class="flex items-center gap-2">
              <CheckCircle v-if="orgSuccess" class="w-4 h-4" />
              <AlertCircle v-else class="w-4 h-4" />
              {{ orgMessage }}
            </div>
          </div>

          <div class="settings-actions">
            <Button variant="outline" @click="cancelOrganization">{{ $t('common.cancel') }}</Button>
            <Button @click="handleSaveOrganization" :disabled="savingOrg || !hasOrgChanges">
              <Loader2 v-if="savingOrg" class="w-4 h-4 mr-2 animate-spin" />
              <Check v-else class="w-4 h-4 mr-2" />
              {{ $t('settings.saveChanges') }}
            </Button>
          </div>
        </template>

        <!-- ===== Apariencia ===== -->
        <template v-if="activeSection === 'appearance'">
          <h2 class="settings-section-title">{{ $t('settings.appearance') }}</h2>
          <p class="settings-section-subtitle">{{ $t('settings.appearanceSubtitle') }}</p>
          <div class="settings-divider"></div>

          <!-- Tema -->
          <div class="settings-field-row" style="align-items:flex-start">
            <div class="settings-field-label" style="padding-top:4px">
              <div>{{ $t('settings.theme') }}</div>
              <div class="settings-field-desc">{{ $t('settings.themeHelp') }}</div>
            </div>
            <div class="settings-field-control" style="display:flex;gap:8px">
              <button
                v-for="opt in themeOptions" :key="opt.value"
                @click="setTheme(opt.value)"
                style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 12px;border-radius:8px;cursor:pointer;transition:border-color .15s,background .15s;font-size:13px;font-weight:500"
                :style="theme === opt.value
                  ? 'border:2px solid var(--brand-700);background:var(--brand-50);color:var(--brand-700)'
                  : 'border:1px solid var(--pia-border);background:var(--pia-bg);color:var(--pia-text-2)'"
              >
                <component :is="opt.icon" style="width:20px;height:20px" />
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Densidad (stub) -->
          <div class="settings-field-row">
            <div class="settings-field-label">
              <div>{{ $t('settings.density') }}</div>
              <div class="settings-field-desc">{{ $t('settings.densityDesc') }}</div>
            </div>
            <div class="settings-field-control">
              <div style="display:inline-flex;border:1px solid var(--pia-border);border-radius:6px;overflow:hidden">
                <button @click="density = 'comfortable'; showComingSoonToast()" style="padding:7px 16px;font-size:13px;font-weight:500;border:none;cursor:pointer;transition:background .15s" :style="density === 'comfortable' ? 'background:var(--pia-text);color:white' : 'background:var(--pia-bg);color:var(--pia-text-2)'">{{ $t('settings.densityComfortable') }}</button>
                <button @click="density = 'compact'; showComingSoonToast()" style="padding:7px 16px;font-size:13px;font-weight:500;border:none;cursor:pointer;transition:background .15s" :style="density === 'compact' ? 'background:var(--pia-text);color:white' : 'background:var(--pia-bg);color:var(--pia-text-2)'">{{ $t('settings.densityCompact') }}</button>
              </div>
            </div>
          </div>

          <!-- Color de acento (stub) -->
          <div class="settings-field-row">
            <div class="settings-field-label">
              <div>{{ $t('settings.accentColor') }}</div>
              <div class="settings-field-desc">{{ $t('settings.accentColorDesc') }}</div>
            </div>
            <div class="settings-field-control" style="display:flex;gap:10px;align-items:center">
              <button v-for="color in accentColors" :key="color" @click="accentColor = color; showComingSoonToast()" :style="`width:28px;height:28px;border-radius:50%;background:${color};cursor:pointer;transition:box-shadow .15s;${accentColor === color ? 'box-shadow:0 0 0 3px white,0 0 0 5px var(--pia-text)' : ''}`"></button>
            </div>
          </div>

          <!-- Idioma -->
          <div class="settings-field-row">
            <div class="settings-field-label">{{ $t('settings.language') }}</div>
            <div class="settings-field-control" style="display:flex;gap:8px">
              <Button :variant="currentLocale === 'es' ? 'default' : 'outline'" size="sm" @click="handleSetLocale('es')">
                🇦🇷 {{ $t('settings.localeES') }}
              </Button>
              <Button :variant="currentLocale === 'en' ? 'default' : 'outline'" size="sm" @click="handleSetLocale('en')">
                🇺🇸 {{ $t('settings.localeEN') }}
              </Button>
            </div>
          </div>
        </template>

        <!-- ===== Equipo ===== -->
        <template v-if="activeSection === 'team' && isAdmin">
          <TeamSettings />
        </template>

        <!-- ===== Notificaciones ===== -->
        <template v-if="activeSection === 'notifications'">
          <h2 class="settings-section-title">{{ $t('settings.notifications') }}</h2>
          <p class="settings-section-subtitle">{{ $t('settings.notificationsSubtitle') }}</p>
          <div class="settings-divider"></div>

          <div class="settings-field-row" style="align-items:flex-start">
            <div class="settings-field-label" style="padding-top:4px">
              <div>{{ $t('settings.testNotifications') }}</div>
              <div class="settings-field-desc">{{ $t('settings.notificationsTestDesc') }}</div>
            </div>
            <div class="settings-field-control">
              <Button variant="outline" @click="handleTestNotification" :disabled="testingNotification">
                <Loader2 v-if="testingNotification" class="w-4 h-4 mr-2 animate-spin" />
                <Send v-else class="w-4 h-4 mr-2" />
                {{ $t('settings.sendTest') }}
              </Button>
              <div v-if="testMessage" class="p-2 rounded text-xs mt-2" :class="testSuccess ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'">
                {{ testMessage }}
              </div>
            </div>
          </div>

          <div style="margin-top:32px;padding:40px 24px;border:1px dashed var(--pia-border);border-radius:12px;text-align:center;color:var(--pia-text-3)">
            <Bell style="width:32px;height:32px;margin:0 auto 12px;opacity:.35" />
            <p style="font-size:14px;font-weight:500">{{ $t('settings.notificationsComingSoon') }}</p>
            <p style="font-size:12px;margin-top:4px;max-width:280px;margin-left:auto;margin-right:auto">{{ $t('settings.notificationsComingSoonDesc') }}</p>
          </div>
        </template>

        <!-- ===== Regional ===== -->
        <template v-if="activeSection === 'regional' && isAdmin">
          <h2 class="settings-section-title">{{ $t('settings.regionalPreferences') }}</h2>
          <p class="settings-section-subtitle">{{ $t('settings.regionalSubtitle') }}</p>
          <div class="settings-divider"></div>

          <div class="settings-field-row">
            <div class="settings-field-label">{{ $t('settings.mainCurrency') }}</div>
            <div class="settings-field-control">
              <select v-model="selectedCurrency" :disabled="savingPreferences" class="settings-select">
                <option value="ARS">{{ $t('settings.currencyARSFull') }}</option>
                <option value="USD">{{ $t('settings.currencyUSDFull') }}</option>
              </select>
            </div>
          </div>

          <div class="settings-field-row">
            <div class="settings-field-label">{{ $t('settings.dateFormat') }}</div>
            <div class="settings-field-control">
              <div style="display:inline-flex;border:1px solid var(--pia-border);border-radius:6px;overflow:hidden">
                <button @click="selectedDateFormat = 'DD/MM/YYYY'" :disabled="savingPreferences" style="padding:7px 14px;font-size:12px;font-weight:500;border:none;cursor:pointer;transition:background .15s" :style="selectedDateFormat === 'DD/MM/YYYY' ? 'background:var(--pia-text);color:white' : 'background:var(--pia-bg);color:var(--pia-text-2)'">{{ $t('settings.dateFormatDMY') }}</button>
                <button @click="selectedDateFormat = 'MM/DD/YYYY'" :disabled="savingPreferences" style="padding:7px 14px;font-size:12px;font-weight:500;border:none;cursor:pointer;transition:background .15s" :style="selectedDateFormat === 'MM/DD/YYYY' ? 'background:var(--pia-text);color:white' : 'background:var(--pia-bg);color:var(--pia-text-2)'">{{ $t('settings.dateFormatMDY') }}</button>
                <button @click="showComingSoonToast()" :disabled="savingPreferences" style="padding:7px 14px;font-size:12px;font-weight:500;border:none;cursor:pointer;transition:background .15s;background:var(--pia-bg);color:var(--pia-text-2)">{{ $t('settings.dateFormatISO') }}</button>
              </div>
            </div>
          </div>

          <div class="settings-field-row">
            <div class="settings-field-label">{{ $t('settings.timezone') }}</div>
            <div class="settings-field-control">
              <Input v-model="timezone" />
            </div>
          </div>

          <div class="settings-field-row">
            <div class="settings-field-label">{{ $t('settings.firstDayOfWeek') }}</div>
            <div class="settings-field-control">
              <div style="display:inline-flex;border:1px solid var(--pia-border);border-radius:6px;overflow:hidden">
                <button @click="firstDayOfWeek = 'monday'; showComingSoonToast()" style="padding:7px 16px;font-size:13px;font-weight:500;border:none;cursor:pointer;transition:background .15s" :style="firstDayOfWeek === 'monday' ? 'background:var(--pia-text);color:white' : 'background:var(--pia-bg);color:var(--pia-text-2)'">{{ $t('settings.monday') }}</button>
                <button @click="firstDayOfWeek = 'sunday'; showComingSoonToast()" style="padding:7px 16px;font-size:13px;font-weight:500;border:none;cursor:pointer;transition:background .15s" :style="firstDayOfWeek === 'sunday' ? 'background:var(--pia-text);color:white' : 'background:var(--pia-bg);color:var(--pia-text-2)'">{{ $t('settings.sunday') }}</button>
              </div>
            </div>
          </div>

          <p v-if="selectedCurrency === 'USD'" style="font-size:12px;color:#b45309;padding:12px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-top:4px">
            {{ $t('settings.currencyConversionNote') }}
          </p>

          <div class="settings-actions">
            <Button variant="outline" @click="cancelRegional">{{ $t('common.cancel') }}</Button>
            <Button @click="handleSavePreferences" :disabled="savingPreferences || !hasPreferencesChanges">
              <Loader2 v-if="savingPreferences" class="w-4 h-4 mr-2 animate-spin" />
              <Check v-else class="w-4 h-4 mr-2" />
              {{ $t('settings.saveChanges') }}
            </Button>
          </div>
        </template>

        <!-- ===== Integraciones (stub) ===== -->
        <template v-if="activeSection === 'integrations'">
          <h2 class="settings-section-title">{{ $t('settings.integrations') }}</h2>
          <p class="settings-section-subtitle">{{ $t('settings.integrationsSubtitle') }}</p>
          <div class="settings-divider"></div>
          <div style="padding:60px 24px;text-align:center;color:var(--pia-text-3)">
            <Grid3X3 style="width:40px;height:40px;margin:0 auto 16px;opacity:.3" />
            <p style="font-size:15px;font-weight:500;color:var(--pia-text-2)">{{ $t('settings.comingSoon') }}</p>
            <p style="font-size:13px;margin-top:6px;max-width:300px;margin-left:auto;margin-right:auto">{{ $t('settings.integrationsComingSoonDesc') }}</p>
          </div>
        </template>

        <!-- ===== Facturación (stub) ===== -->
        <template v-if="activeSection === 'billing'">
          <h2 class="settings-section-title">{{ $t('settings.billing') }}</h2>
          <p class="settings-section-subtitle">{{ $t('settings.billingSubtitle') }}</p>
          <div class="settings-divider"></div>
          <div style="padding:60px 24px;text-align:center;color:var(--pia-text-3)">
            <DollarSign style="width:40px;height:40px;margin:0 auto 16px;opacity:.3" />
            <p style="font-size:15px;font-weight:500;color:var(--pia-text-2)">{{ $t('settings.comingSoon') }}</p>
            <p style="font-size:13px;margin-top:6px;max-width:300px;margin-left:auto;margin-right:auto">{{ $t('settings.billingComingSoonDesc') }}</p>
          </div>
        </template>

        </div><!-- /settings-content-inner -->
        </main>
      </div><!-- /content column -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, markRaw } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Bell,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  Check,
  Sun,
  Moon,
  Monitor,
  User,
  Home,
  Settings,
  Users,
  MapPin,
  Grid3X3,
  DollarSign,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

// Section type
type Section = 'profile' | 'organization' | 'appearance' | 'team' | 'notifications' | 'regional' | 'integrations' | 'billing'
const activeSection = ref<Section>('profile')


// Nav items
const navItems = computed(() => [
  { section: 'profile' as Section, label: t('settings.profile'), sublabel: t('settings.navProfileSub'), icon: markRaw(User), adminOnly: false },
  { section: 'organization' as Section, label: t('settings.organization'), sublabel: t('settings.navOrgSub'), icon: markRaw(Home), adminOnly: true },
  { section: 'appearance' as Section, label: t('settings.appearance'), sublabel: t('settings.navAppearanceSub'), icon: markRaw(Settings), adminOnly: false },
  { section: 'team' as Section, label: t('settings.team'), sublabel: t('settings.navTeamSub'), icon: markRaw(Users), adminOnly: true },
  { section: 'notifications' as Section, label: t('settings.notifications'), sublabel: t('settings.navNotificationsSub'), icon: markRaw(Bell), adminOnly: false },
  { section: 'regional' as Section, label: t('settings.regionalPreferences'), sublabel: t('settings.navRegionalSub'), icon: markRaw(MapPin), adminOnly: true },
  { section: 'integrations' as Section, label: t('settings.integrations'), sublabel: t('settings.navIntegrationsSub'), icon: markRaw(Grid3X3), adminOnly: true },
  { section: 'billing' as Section, label: t('settings.billing'), sublabel: t('settings.navBillingSub'), icon: markRaw(DollarSign), adminOnly: true },
])

const themeOptions = computed(() => [
  { value: 'light' as Theme, label: t('settings.themeLight'), icon: markRaw(Sun) },
  { value: 'dark' as Theme, label: t('settings.themeDark'), icon: markRaw(Moon) },
  { value: 'system' as Theme, label: t('settings.themeSystem'), icon: markRaw(Monitor) },
])

// Accent colors
const accentColors = ['#2d5a3d', '#2563eb', '#7c3aed', '#ea580c', '#0d9488', '#4b5563']
const accentColor = ref('#2d5a3d')

// Density (stub)
const density = ref<'comfortable' | 'compact'>('comfortable')

// Timezone & first day (stubs)
const timezone = ref('America/Argentina/Buenos_Aires (GMT-3)')
const firstDayOfWeek = ref<'monday' | 'sunday'>('monday')

// Stub org fields
const razonSocial = ref('')
const cuit = ref('')
const condicionIVA = ref('')
const direccion = ref('')

// Stub profile fields
const phoneStub = ref('')

// ---- Regional ----
const selectedDateFormat = ref<DateFormat>('DD/MM/YYYY')
const selectedCurrency = ref<CurrencyCode>('ARS')
const savingPreferences = ref(false)

const hasPreferencesChanges = computed(() =>
  selectedDateFormat.value !== dateFormat.value || selectedCurrency.value !== defaultCurrency.value
)

// ---- Profile ----
const fullName = ref('')
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const savingProfile = ref(false)
const profileMessage = ref('')
const profileSuccess = ref(false)
let profileMessageTimeout: ReturnType<typeof setTimeout> | null = null
const avatarFileInputRef = ref<HTMLInputElement | null>(null)

// Password
const showPasswordForm = ref(false)
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
  return fullName.value !== (profile.value.full_name || '') || avatarFile.value !== null
})

const canChangePassword = computed(() =>
  newPassword.value.length >= 8 && newPassword.value === confirmPassword.value
)

// Notification test
const testingNotification = ref(false)
const testMessage = ref('')
const testSuccess = ref(false)
let testMessageTimeout: ReturnType<typeof setTimeout> | null = null

// ---- Organization ----
const orgName = ref('')
const logoFile = ref<File | null>(null)
const logoPreview = ref<string | null>(null)
const savingOrg = ref(false)
const orgMessage = ref('')
const orgSuccess = ref(false)
let orgMessageTimeout: ReturnType<typeof setTimeout> | null = null
const fileInputRef = ref<HTMLInputElement | null>(null)

const initials = computed(() => getInitials(orgName.value || organization.value?.name || ''))

const hasOrgChanges = computed(() => {
  if (!organization.value) return false
  return orgName.value !== organization.value.name || logoFile.value !== null
})

// ---- Watchers ----
watch(profile, (p) => {
  if (p && !fullName.value) fullName.value = p.full_name || ''
}, { immediate: true })

watch(organization, (org) => {
  if (org) {
    if (!orgName.value) orgName.value = org.name
    selectedDateFormat.value = org.settings?.date_format ?? 'DD/MM/YYYY'
    selectedCurrency.value = org.settings?.default_currency ?? 'ARS'
  }
}, { immediate: true })

watch(() => route.hash, (hash) => {
  const map: Record<string, Section> = {
    '#profile': 'profile',
    '#organization': 'organization',
    '#appearance': 'appearance',
    '#team': 'team',
    '#notifications': 'notifications',
    '#regional': 'regional',
    '#integrations': 'integrations',
    '#billing': 'billing',
  }
  const section = map[hash]
  if (!section) return
  const item = navItems.value.find(i => i.section === section)
  if (!item) return
  if (item.adminOnly && !isAdmin.value) return
  activeSection.value = section
}, { immediate: true })

watch(isAdmin, (admin) => {
  const adminOnly: Section[] = ['organization', 'team', 'regional', 'integrations', 'billing']
  if (!admin && adminOnly.includes(activeSection.value)) {
    activeSection.value = 'profile'
  }
}, { immediate: true })

// ---- Methods ----
function setSection(section: Section) {
  activeSection.value = section
}

function showComingSoonToast() {
  toast.info(t('settings.comingSoonToast'))
}

function handleSetLocale(locale: Locale) {
  setLocale(locale)
}

// Avatar
function triggerAvatarFileInput() {
  avatarFileInputRef.value?.click()
}

function handleAvatarFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!allowed.includes(file.type)) {
    profileMessage.value = t('errors.fileTypeNotAllowed')
    profileSuccess.value = false
    clearProfileMessageAfterDelay()
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    profileMessage.value = t('errors.fileTooLarge')
    profileSuccess.value = false
    clearProfileMessageAfterDelay()
    return
  }

  avatarFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => { avatarPreview.value = e.target?.result as string }
  reader.readAsDataURL(file)
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
    if (avatarFile.value) newAvatarUrl = await uploadAvatar(avatarFile.value)

    const updates: { full_name?: string; avatar_url?: string } = {}
    if (fullName.value !== (profile.value?.full_name || '')) updates.full_name = fullName.value
    if (newAvatarUrl) updates.avatar_url = newAvatarUrl

    if (Object.keys(updates).length > 0) await updateProfile(updates)

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

function cancelProfile() {
  fullName.value = profile.value?.full_name || ''
  avatarFile.value = null
  avatarPreview.value = null
  showPasswordForm.value = false
  newPassword.value = ''
  confirmPassword.value = ''
  profileMessage.value = ''
}

function clearProfileMessageAfterDelay() {
  if (profileMessageTimeout) clearTimeout(profileMessageTimeout)
  profileMessageTimeout = setTimeout(() => { profileMessage.value = '' }, 5000)
}

async function handleChangePassword() {
  if (!canChangePassword.value) return
  changingPassword.value = true
  passwordMessage.value = ''

  try {
    await changePassword(newPassword.value)
    passwordMessage.value = t('auth.passwordUpdated')
    passwordSuccess.value = true
    setTimeout(() => {
      newPassword.value = ''
      confirmPassword.value = ''
      showPasswordForm.value = false
      passwordMessage.value = ''
    }, 2000)
  } catch (e) {
    passwordMessage.value = e instanceof Error ? e.message : t('errors.errorUpdatingPassword')
    passwordSuccess.value = false
    clearPasswordMessageAfterDelay()
  } finally {
    console.log('[SettingsView] handleChangePassword finally — ANTES de changingPassword = false')
    changingPassword.value = false
    console.log('[SettingsView] handleChangePassword finally — DESPUÉS de changingPassword = false')
  }
}

function clearPasswordMessageAfterDelay() {
  if (passwordMessageTimeout) clearTimeout(passwordMessageTimeout)
  passwordMessageTimeout = setTimeout(() => { passwordMessage.value = '' }, 5000)
}

// Notification test
async function handleTestNotification() {
  testingNotification.value = true
  testMessage.value = ''
  const result = await sendTestNotification()
  testingNotification.value = false
  testSuccess.value = result.success
  testMessage.value = result.success ? t('settings.testSent') : (result.error || t('errors.unknownError'))
  if (testMessageTimeout) clearTimeout(testMessageTimeout)
  testMessageTimeout = setTimeout(() => { testMessage.value = '' }, 5000)
}

// Logo
function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!allowed.includes(file.type)) {
    orgMessage.value = t('errors.fileTypeNotAllowed')
    orgSuccess.value = false
    clearOrgMessageAfterDelay()
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    orgMessage.value = t('errors.fileTooLarge')
    orgSuccess.value = false
    clearOrgMessageAfterDelay()
    return
  }

  logoFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => { logoPreview.value = e.target?.result as string }
  reader.readAsDataURL(file)
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
    if (logoFile.value) newLogoUrl = await uploadLogo(logoFile.value)

    const updates: { name?: string; logo_url?: string } = {}
    if (orgName.value !== organization.value?.name) updates.name = orgName.value
    if (newLogoUrl) updates.logo_url = newLogoUrl

    if (Object.keys(updates).length > 0) await updateOrganization(updates)

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

function cancelOrganization() {
  orgName.value = organization.value?.name || ''
  logoFile.value = null
  logoPreview.value = null
  razonSocial.value = ''
  cuit.value = ''
  condicionIVA.value = ''
  direccion.value = ''
  orgMessage.value = ''
}

function clearOrgMessageAfterDelay() {
  if (orgMessageTimeout) clearTimeout(orgMessageTimeout)
  orgMessageTimeout = setTimeout(() => { orgMessage.value = '' }, 5000)
}

// Regional
async function handleSavePreferences() {
  if (!hasPreferencesChanges.value) return
  savingPreferences.value = true

  const previousCurrency = defaultCurrency.value
  const switchingToUsd = selectedCurrency.value === 'USD' && previousCurrency !== 'USD'

  try {
    if (switchingToUsd) {
      try {
        await fetchRate()
      } catch {
        selectedCurrency.value = previousCurrency
        toast.error(t('settings.exchangeRateFetchError'))
        savingPreferences.value = false
        return
      }
    }
    await updateSettings({ date_format: selectedDateFormat.value, default_currency: selectedCurrency.value })
    toast.success(t('settings.preferencesSaved'))
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('errors.unknownError'))
  } finally {
    savingPreferences.value = false
  }
}

function cancelRegional() {
  if (organization.value) {
    selectedDateFormat.value = organization.value.settings?.date_format ?? 'DD/MM/YYYY'
    selectedCurrency.value = organization.value.settings?.default_currency ?? 'ARS'
  }
  timezone.value = 'America/Argentina/Buenos_Aires (GMT-3)'
  firstDayOfWeek.value = 'monday'
}

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
  console.log('[SettingsView] onUnmounted — componente desmontado')
  ;[testMessageTimeout, orgMessageTimeout, profileMessageTimeout, passwordMessageTimeout].forEach(t => t && clearTimeout(t))
})
</script>

<style scoped>
.settings-section-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--pia-text);
}

.settings-section-subtitle {
  font-size: 13px;
  color: var(--brand-700);
  margin-top: 4px;
}

.settings-divider {
  border-bottom: 1px solid var(--pia-border);
  margin: 20px 0 0;
}

.settings-field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid var(--pia-border);
  gap: 24px;
}

.settings-field-label {
  flex-shrink: 0;
  width: 200px;
  font-size: 14px;
  font-weight: 600;
  color: var(--pia-text);
}

.settings-field-desc {
  font-size: 11px;
  color: var(--brand-600, var(--brand-700));
  margin-top: 2px;
  font-weight: 400;
}

.settings-field-control {
  flex: 1;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 24px;
  margin-top: 4px;
}

.settings-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--pia-border);
  border-radius: 6px;
  background: var(--pia-bg);
  color: var(--pia-text);
  font-size: 14px;
  outline: none;
  transition: border-color .15s;
}

.settings-select:focus {
  border-color: var(--brand-700);
}

/* Responsive content padding.
   pia-content gives padding-top: 32px (desktop) / 16px (mobile).
   Topbar is fixed at 64px. We compensate the gap here. */
.settings-page-header {
  padding: 52px 20px 16px; /* 16 (pia-content mobile) + 52 = 68px > 64px topbar */
}

.settings-content-inner {
  padding: 20px 20px 32px;
}

@media (min-width: 768px) {
  .settings-page-header {
    padding: 36px 40px 20px; /* 32 (pia-content desktop) + 36 = 68px > 64px topbar */
  }
  .settings-content-inner {
    padding: 32px 40px;
  }
}

/* Mobile tab bar buttons */
.mobile-tab-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  transition: background .15s, color .15s;
}

.mobile-tab-active {
  background: var(--brand-700);
  color: white;
}

.mobile-tab-inactive {
  background: var(--pia-muted);
  color: var(--pia-text-2);
}

/* Stack form rows on mobile */
@media (max-width: 767px) {
  .settings-field-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 14px 0;
  }
  .settings-field-label {
    width: auto;
  }
  .settings-field-control {
    width: 100%;
  }
  /* Stack theme cards vertically on mobile */
  .settings-theme-cards {
    flex-direction: row;
  }
  /* Actions full-width on mobile */
  .settings-actions {
    flex-direction: column-reverse;
    gap: 8px;
  }
  .settings-actions > * {
    width: 100%;
    justify-content: center;
  }
}
</style>
