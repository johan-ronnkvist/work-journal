<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { ref } from 'vue'

const items = ref<NavigationMenuItem[][]>([
  [
    {
      label: 'Home',
      icon: 'i-tabler-home',
      to: '/',
    },
    {
      label: 'Notes',
      icon: 'i-lucide-notebook-pen',
      to: '/notes',
    },
    {
      label: 'Review',
      icon: 'i-lucide-calendar',
      to: '/review',
    },
    {
      label: 'Settings',
      icon: 'i-lucide-settings',
      to: '/settings',
    },
  ],
])
</script>

<template>
  <UHeader
    :ui="{
      left: 'md:flex-1 flex items-center gap-1.5',
      center: 'hidden md:flex',
      right: 'flex items-center justify-end md:flex-1 gap-1.5',
      toggle: 'md:hidden',
      content: 'md:hidden',
      overlay: 'md:hidden',
    }"
  >
    <template #title>
      <AppLogo />
    </template>
    <UNavigationMenu color="primary" :items="items" orientation="horizontal" />
    <template #body>
      <UNavigationMenu color="primary" :items="items" orientation="vertical" />
    </template>
    <template #right>
      <UColorModeButton />
    </template>
  </UHeader>
</template>
