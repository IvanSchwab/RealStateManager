<template>
  <div class="space-y-4">
    <!-- Upload Zone -->
    <div
      class="border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer"
      :class="[
        isOverDropZone
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/30',
      ]"
      @click="openFileDialog"
      @dragenter.prevent="isOverDropZone = true"
      @dragleave.prevent="isOverDropZone = false"
      @dragover.prevent
      @drop.prevent="handleDropEvent"
    >
      <input
        ref="fileInputRef"
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp"
        class="hidden"
        @change="handleFileSelect"
      />

      <div v-if="uploading" class="space-y-3">
        <Loader2 class="w-8 h-8 mx-auto animate-spin text-primary" />
        <p class="text-sm text-muted-foreground">Subiendo imágenes...</p>
        <div class="space-y-2">
          <div
            v-for="progress in uploadProgress"
            :key="progress.fileName"
            class="text-left"
          >
            <div class="flex justify-between text-xs text-muted-foreground mb-1">
              <span class="truncate max-w-[200px]">{{ progress.fileName }}</span>
              <span>{{ progress.percentage }}%</span>
            </div>
            <div class="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                class="h-full bg-primary transition-all duration-300"
                :style="{ width: `${progress.percentage}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <template v-else>
        <Upload class="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p class="text-sm font-medium">
          Arrastre imágenes aquí o haga clic para seleccionar
        </p>
        <p class="text-xs text-muted-foreground mt-1">
          JPG, PNG, WebP. Máximo 5MB por archivo.
        </p>
      </template>
    </div>

    <!-- Error Messages -->
    <div
      v-if="uploadErrors.length > 0"
      class="bg-destructive/10 border border-destructive/20 rounded-lg p-3"
    >
      <p
        v-for="(err, index) in uploadErrors"
        :key="index"
        class="text-sm text-destructive"
      >
        {{ err }}
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-8 text-center text-muted-foreground">
      <Loader2 class="w-6 h-6 mx-auto animate-spin" />
      <p class="text-sm mt-2">Cargando imágenes...</p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="images.length === 0"
      class="py-8 text-center text-muted-foreground"
    >
      <ImageIcon class="w-12 h-12 mx-auto mb-2 opacity-50" />
      <p class="text-sm">No hay fotos de esta propiedad</p>
    </div>

    <!-- Image Grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div
        v-for="(image, index) in images"
        :key="image.path"
        class="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
        @click="openLightbox(index)"
      >
        <img
          :src="image.url"
          :alt="image.name"
          class="w-full h-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
        <div
          class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"
        ></div>

        <!-- Delete Button -->
        <button
          class="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
          @click.stop="confirmDelete(image)"
        >
          <Trash2 class="w-4 h-4" />
        </button>

        <!-- Zoom Icon -->
        <div
          class="absolute bottom-2 right-2 p-1.5 bg-black/50 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ZoomIn class="w-4 h-4" />
        </div>
      </div>
    </div>

    <!-- Lightbox Dialog -->
    <Dialog v-model:open="lightboxOpen">
      <DialogContent
        class="max-w-4xl w-full p-0 bg-black/95 border-none"
        @pointerDownOutside="lightboxOpen = false"
      >
        <DialogTitle class="sr-only">Vista de imagen</DialogTitle>
        <DialogDescription class="sr-only">
          Imagen {{ currentImageIndex + 1 }} de {{ images.length }}
        </DialogDescription>

        <!-- Close Button -->
        <button
          class="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          @click="lightboxOpen = false"
        >
          <X class="w-5 h-5" />
        </button>

        <!-- Navigation Arrows -->
        <button
          v-if="images.length > 1"
          class="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          @click="prevImage"
        >
          <ChevronLeft class="w-6 h-6" />
        </button>

        <button
          v-if="images.length > 1"
          class="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          @click="nextImage"
        >
          <ChevronRight class="w-6 h-6" />
        </button>

        <!-- Image -->
        <div class="flex items-center justify-center min-h-[60vh] p-8">
          <img
            v-if="currentImage"
            :src="currentImage.url"
            :alt="currentImage.name"
            class="max-w-full max-h-[80vh] object-contain"
          />
        </div>

        <!-- Image Counter -->
        <div
          class="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-white/10 rounded-full text-white text-sm"
        >
          {{ currentImageIndex + 1 }} / {{ images.length }}
        </div>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <AlertDialog v-model:open="deleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar imagen</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Está seguro de que desea eliminar esta imagen? Esta acción no se
            puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="handleDelete"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  Upload,
  Loader2,
  Image as ImageIcon,
  Trash2,
  ZoomIn,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  usePropertyImages,
  type PropertyImage,
} from '@/composables/usePropertyImages'

const props = defineProps<{
  propertyId: string
}>()

const {
  images,
  loading,
  uploading,
  uploadProgress,
  fetchImages,
  uploadImages,
  deleteImage,
} = usePropertyImages()

const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadErrors = ref<string[]>([])
const isOverDropZone = ref(false)

// Lightbox state
const lightboxOpen = ref(false)
const currentImageIndex = ref(0)

// Delete confirmation state
const deleteDialogOpen = ref(false)
const imageToDelete = ref<PropertyImage | null>(null)

const currentImage = computed(() => {
  if (currentImageIndex.value >= 0 && currentImageIndex.value < images.value.length) {
    return images.value[currentImageIndex.value]
  }
  return null
})

function openFileDialog() {
  fileInputRef.value?.click()
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    await processFiles(Array.from(input.files))
    input.value = '' // Reset input
  }
}

async function handleDropEvent(event: DragEvent) {
  isOverDropZone.value = false
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    await processFiles(Array.from(files))
  }
}

async function processFiles(files: File[]) {
  uploadErrors.value = []

  const imageFiles = files.filter((f) =>
    ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(f.type)
  )

  if (imageFiles.length === 0) {
    uploadErrors.value = ['No se seleccionaron archivos de imagen válidos.']
    return
  }

  const result = await uploadImages(props.propertyId, imageFiles)

  if (result.failed.length > 0) {
    uploadErrors.value = result.failed
  }
}

function openLightbox(index: number) {
  currentImageIndex.value = index
  lightboxOpen.value = true
}

function prevImage() {
  if (currentImageIndex.value > 0) {
    currentImageIndex.value--
  } else {
    currentImageIndex.value = images.value.length - 1
  }
}

function nextImage() {
  if (currentImageIndex.value < images.value.length - 1) {
    currentImageIndex.value++
  } else {
    currentImageIndex.value = 0
  }
}

function confirmDelete(image: PropertyImage) {
  imageToDelete.value = image
  deleteDialogOpen.value = true
}

async function handleDelete() {
  if (imageToDelete.value) {
    await deleteImage(imageToDelete.value.path)
    imageToDelete.value = null
  }
  deleteDialogOpen.value = false
}

// Handle keyboard navigation in lightbox
function handleKeydown(event: KeyboardEvent) {
  if (!lightboxOpen.value) return

  switch (event.key) {
    case 'ArrowLeft':
      prevImage()
      break
    case 'ArrowRight':
      nextImage()
      break
    case 'Escape':
      lightboxOpen.value = false
      break
  }
}

watch(lightboxOpen, (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
})

onMounted(() => {
  fetchImages(props.propertyId)
})

// Refresh images when propertyId changes
watch(
  () => props.propertyId,
  (newId) => {
    if (newId) {
      fetchImages(newId)
    }
  }
)
</script>
