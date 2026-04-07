<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import type { TabsTriggerProps } from "reka-ui"
import { TabsTrigger } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<TabsTriggerProps & { class?: HTMLAttributes["class"] }>()
</script>

<template>
  <TabsTrigger
    v-bind="props"
    :class="cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium cursor-pointer',
      'text-gray-600 dark:text-gray-400',
      'hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100',
      'ring-offset-background transition-colors duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm',
      'dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-white dark:data-[state=active]:shadow-none dark:data-[state=active]:ring-1 dark:data-[state=active]:ring-gray-700',
      props.class,
    )"
  >
    <slot />
  </TabsTrigger>
</template>
