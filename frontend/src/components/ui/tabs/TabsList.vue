<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import type { TabsListProps } from "reka-ui"
import { TabsList } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<TabsListProps & { class?: HTMLAttributes["class"] }>()
</script>

<template>
  <TabsList
    :class="cn(
      'inline-flex h-11 items-center justify-center gap-1 rounded-lg bg-gray-100 p-1.5 dark:bg-gray-800',
      props.class,
    )"
  >
    <slot />
  </TabsList>
</template>
