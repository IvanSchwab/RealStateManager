<template>
  <component :is="iconComponent" :class="iconClass" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FileText, Image, File } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    mimeType?: string
    class?: string
  }>(),
  {
    mimeType: 'application/octet-stream',
    class: '',
  }
)

const iconComponent = computed(() => {
  if (!props.mimeType) return File

  if (props.mimeType === 'application/pdf') {
    return FileText
  }

  if (props.mimeType.startsWith('image/')) {
    return Image
  }

  return File
})

const iconClass = computed(() => {
  const baseClass = 'text-muted-foreground'

  if (!props.mimeType) return `${baseClass} ${props.class}`

  if (props.mimeType === 'application/pdf') {
    return `text-red-500 ${props.class}`
  }

  if (props.mimeType.startsWith('image/')) {
    return `text-blue-500 ${props.class}`
  }

  return `${baseClass} ${props.class}`
})
</script>
