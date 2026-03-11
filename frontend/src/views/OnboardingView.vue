<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <Card class="w-full max-w-md">
      <CardHeader class="text-center space-y-1">
        <div class="mx-auto mb-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center">
          <Building2 class="w-6 h-6 text-primary-foreground" />
        </div>
        <CardTitle class="text-2xl">{{ $t('onboarding.title') }}</CardTitle>
        <CardDescription>
          {{ $t('onboarding.description') }}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div v-if="errorMessage" class="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {{ errorMessage }}
          </div>

          <div class="space-y-2">
            <Label for="nombre">{{ $t('onboarding.orgName') }}</Label>
            <Input
              id="nombre"
              v-model="nombre"
              type="text"
              :placeholder="$t('onboarding.orgNamePlaceholder')"
              :disabled="isSubmitting"
              @input="handleNombreInput"
            />
            <p v-if="nombreError" class="text-sm text-destructive">{{ nombreError }}</p>
          </div>

          <div class="space-y-2">
            <Label for="slug">{{ $t('onboarding.slug') }}</Label>
            <div class="flex items-center gap-2">
              <Input
                id="slug"
                v-model="slug"
                type="text"
                :placeholder="$t('onboarding.slugPlaceholder')"
                :disabled="isSubmitting"
                class="flex-1"
                @input="handleSlugInput"
              />
              <div v-if="isCheckingSlug" class="w-5 h-5">
                <Loader2 class="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
              <CheckCircle2 v-else-if="slugAvailable === true" class="w-5 h-5 text-green-500" />
              <XCircle v-else-if="slugAvailable === false" class="w-5 h-5 text-destructive" />
            </div>
            <p class="text-xs text-muted-foreground">
              {{ $t('onboarding.slugHelp') }}
            </p>
            <p v-if="slugError" class="text-sm text-destructive">{{ slugError }}</p>
          </div>

          <Button type="submit" class="w-full" :disabled="isSubmitting || !canSubmit">
            <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
            {{ isSubmitting ? $t('onboarding.creating') : $t('onboarding.createOrg') }}
          </Button>
        </form>
      </CardContent>

      <CardFooter class="flex-col gap-3">
        <p class="text-sm text-muted-foreground text-center">
          {{ $t('onboarding.adminNotice') }}
        </p>
        <button
          type="button"
          class="text-sm text-muted-foreground hover:text-foreground underline"
          :disabled="isSubmitting"
          @click="handleSignOut"
        >
          {{ $t('auth.logout') }}
        </button>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Building2, Loader2, CheckCircle2, XCircle } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const nombre = ref('')
const slug = ref('')
const nombreError = ref('')
const slugError = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)
const isCheckingSlug = ref(false)
const slugAvailable = ref<boolean | null>(null)
const slugManuallyEdited = ref(false)

let slugCheckTimeout: ReturnType<typeof setTimeout> | null = null

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function handleNombreInput() {
  nombreError.value = ''
  errorMessage.value = ''

  if (!slugManuallyEdited.value) {
    slug.value = generateSlug(nombre.value)
    checkSlugAvailability()
  }
}

function handleSlugInput() {
  slugError.value = ''
  errorMessage.value = ''
  slugManuallyEdited.value = true

  slug.value = slug.value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')

  checkSlugAvailability()
}

function checkSlugAvailability() {
  if (slugCheckTimeout) {
    clearTimeout(slugCheckTimeout)
  }

  slugAvailable.value = null

  if (slug.value.length < 3) {
    return
  }

  slugCheckTimeout = setTimeout(async () => {
    isCheckingSlug.value = true
    try {
      const { data, error } = await supabase.rpc('check_slug_available', {
        slug_to_check: slug.value
      })

      if (error) {
        console.error('Error checking slug:', error)
        slugAvailable.value = null
      } else {
        slugAvailable.value = data as boolean
        if (!data) {
          slugError.value = t('onboarding.slugInUse')
        } else {
          slugError.value = ''
        }
      }
    } catch (err) {
      console.error('Error checking slug availability:', err)
      slugAvailable.value = null
    } finally {
      isCheckingSlug.value = false
    }
  }, 300)
}

watch(slug, () => {
  if (slug.value.length >= 3 && !isCheckingSlug.value) {
    checkSlugAvailability()
  }
})

function validate(): boolean {
  nombreError.value = ''
  slugError.value = ''

  let valid = true

  if (!nombre.value.trim()) {
    nombreError.value = t('errors.nameRequired')
    valid = false
  } else if (nombre.value.trim().length < 3) {
    nombreError.value = t('errors.nameMinLength', { min: 3 })
    valid = false
  }

  if (!slug.value.trim()) {
    slugError.value = t('errors.slugRequired')
    valid = false
  } else if (slug.value.trim().length < 3) {
    slugError.value = t('errors.slugMinLength', { min: 3 })
    valid = false
  } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug.value)) {
    slugError.value = t('errors.slugFormat')
    valid = false
  }

  if (slugAvailable.value === false) {
    slugError.value = t('onboarding.slugInUse')
    valid = false
  }

  return valid
}

const canSubmit = computed(() => {
  return (
    nombre.value.trim().length >= 3 &&
    slug.value.trim().length >= 3 &&
    slugAvailable.value === true &&
    !isCheckingSlug.value
  )
})

async function handleSubmit() {
  if (!validate()) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const { error } = await supabase.rpc('create_organization', {
      org_name: nombre.value.trim(),
      org_slug: slug.value.trim()
    })

    if (error) {
      if (error.message.includes('Ya pertenecés')) {
        errorMessage.value = t('errors.alreadyInOrg')
      } else if (error.message.includes('ya está en uso')) {
        errorMessage.value = t('errors.slugInUse')
        slugAvailable.value = false
      } else if (error.message.includes('al menos 3 caracteres')) {
        errorMessage.value = error.message
      } else {
        errorMessage.value = t('errors.errorCreatingOrg')
        console.error('Create organization error:', error)
      }
      return
    }

    await authStore.loadProfile()

    if (!authStore.profile?.organization_id) {
      throw new Error(t('errors.profileUpdateError'))
    }

    await router.push({ name: 'dashboard' })
  } catch (err: unknown) {
    console.error('Unexpected error:', err)
    const message = err instanceof Error ? err.message : t('errors.unknownError')
    errorMessage.value = message
  } finally {
    isSubmitting.value = false
  }
}

async function handleSignOut() {
  try {
    await authStore.signOut()
    router.push({ name: 'login' })
  } catch (err) {
    console.error('Error signing out:', err)
  }
}
</script>
