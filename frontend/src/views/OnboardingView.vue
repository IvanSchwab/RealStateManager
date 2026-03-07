<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <Card class="w-full max-w-md">
      <CardHeader class="text-center space-y-1">
        <div class="mx-auto mb-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center">
          <Building2 class="w-6 h-6 text-primary-foreground" />
        </div>
        <CardTitle class="text-2xl">Crear tu inmobiliaria</CardTitle>
        <CardDescription>
          Configurá tu inmobiliaria para comenzar a usar el sistema
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div v-if="errorMessage" class="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {{ errorMessage }}
          </div>

          <div class="space-y-2">
            <Label for="nombre">Nombre de la inmobiliaria</Label>
            <Input
              id="nombre"
              v-model="nombre"
              type="text"
              placeholder="Ej: Inmobiliaria Rodríguez"
              :disabled="isSubmitting"
              @input="handleNombreInput"
            />
            <p v-if="nombreError" class="text-sm text-destructive">{{ nombreError }}</p>
          </div>

          <div class="space-y-2">
            <Label for="slug">Identificador único</Label>
            <div class="flex items-center gap-2">
              <Input
                id="slug"
                v-model="slug"
                type="text"
                placeholder="inmobiliaria-rodriguez"
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
              Este identificador se usará internamente. Solo letras minúsculas, números y guiones.
            </p>
            <p v-if="slugError" class="text-sm text-destructive">{{ slugError }}</p>
          </div>

          <Button type="submit" class="w-full" :disabled="isSubmitting || !canSubmit">
            <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
            {{ isSubmitting ? 'Creando...' : 'Crear mi inmobiliaria' }}
          </Button>
        </form>
      </CardContent>

      <CardFooter class="flex-col gap-3">
        <p class="text-sm text-muted-foreground text-center">
          Serás administrador de esta organización
        </p>
        <button
          type="button"
          class="text-sm text-muted-foreground hover:text-foreground underline"
          :disabled="isSubmitting"
          @click="handleSignOut"
        >
          Cerrar sesión
        </button>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Building2, Loader2, CheckCircle2, XCircle } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

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
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-|-$/g, '') // remove leading/trailing hyphens
}

function handleNombreInput() {
  nombreError.value = ''
  errorMessage.value = ''

  // Auto-generate slug only if user hasn't manually edited it
  if (!slugManuallyEdited.value) {
    slug.value = generateSlug(nombre.value)
    checkSlugAvailability()
  }
}

function handleSlugInput() {
  slugError.value = ''
  errorMessage.value = ''
  slugManuallyEdited.value = true

  // Sanitize slug as user types
  slug.value = slug.value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')

  checkSlugAvailability()
}

function checkSlugAvailability() {
  // Clear previous timeout
  if (slugCheckTimeout) {
    clearTimeout(slugCheckTimeout)
  }

  // Reset state
  slugAvailable.value = null

  // Don't check if slug is too short
  if (slug.value.length < 3) {
    return
  }

  // Debounce the check
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
          slugError.value = 'Este identificador ya está en uso'
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

// Watch for slug changes from auto-generation
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
    nombreError.value = 'El nombre es requerido'
    valid = false
  } else if (nombre.value.trim().length < 3) {
    nombreError.value = 'El nombre debe tener al menos 3 caracteres'
    valid = false
  }

  if (!slug.value.trim()) {
    slugError.value = 'El identificador es requerido'
    valid = false
  } else if (slug.value.trim().length < 3) {
    slugError.value = 'El identificador debe tener al menos 3 caracteres'
    valid = false
  } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug.value)) {
    slugError.value = 'El identificador solo puede contener letras minúsculas, números y guiones'
    valid = false
  }

  if (slugAvailable.value === false) {
    slugError.value = 'Este identificador ya está en uso'
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
      // Extract the actual error message from Postgres error
      if (error.message.includes('Ya pertenecés')) {
        errorMessage.value = 'Ya pertenecés a una organización'
      } else if (error.message.includes('ya está en uso')) {
        errorMessage.value = 'Este identificador ya está en uso. Por favor elegí otro.'
        slugAvailable.value = false
      } else if (error.message.includes('al menos 3 caracteres')) {
        errorMessage.value = error.message
      } else {
        errorMessage.value = 'Ocurrió un error al crear la organización. Por favor intentá de nuevo.'
        console.error('Create organization error:', error)
      }
      return
    }

    // CRITICAL: Reload the profile and wait for it to complete
    await authStore.loadProfile()

    // Verify that organization_id is now set
    if (!authStore.profile?.organization_id) {
      throw new Error('La organización fue creada pero no se pudo actualizar el perfil. Por favor recargá la página.')
    }

    // Now safe to redirect to dashboard
    await router.push({ name: 'dashboard' })
  } catch (err: unknown) {
    console.error('Unexpected error:', err)
    const message = err instanceof Error ? err.message : 'Ocurrió un error inesperado. Por favor intentá de nuevo.'
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
