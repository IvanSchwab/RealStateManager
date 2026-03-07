<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import type { AvatarVariants } from "."
import { cn } from "@/lib/utils"
import { avatarVariants } from "."

const props = defineProps<{
  size?: AvatarVariants["size"]
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <span :class="cn(avatarVariants({ size }), props.class)">
    <slot />
  </span>
</template>
