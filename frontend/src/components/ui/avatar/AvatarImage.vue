<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { ref } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  src?: string
  alt?: string
  class?: HTMLAttributes["class"]
}>()

const emit = defineEmits<{
  (e: "loadingStatusChange", status: "loading" | "loaded" | "error"): void
}>()

const hasLoaded = ref(false)
const hasError = ref(false)

function onLoad() {
  hasLoaded.value = true
  hasError.value = false
  emit("loadingStatusChange", "loaded")
}

function onError() {
  hasError.value = true
  hasLoaded.value = false
  emit("loadingStatusChange", "error")
}
</script>

<template>
  <img
    v-if="src && !hasError"
    :src="src"
    :alt="alt"
    :class="cn('aspect-square h-full w-full object-cover', props.class)"
    @load="onLoad"
    @error="onError"
  />
</template>
