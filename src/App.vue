<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { useColorMode } from '@vueuse/core'
import { computed } from 'vue'
import AppHeader from './components/AppHeader.vue'

const colorMode = useColorMode()

// Dynamic theme color based on color mode
const themeColor = computed(() => {
  return colorMode.value === 'dark' ? '#1c1917' : '#ffffff'
})

// Update theme-color meta tag dynamically
useHead({
  meta: [
    {
      name: 'theme-color',
      content: themeColor,
    },
  ],
})
</script>

<template>
  <UApp>
    <UMain>
      <AppHeader />
      <UContainer>
        <RouterView />
      </UContainer>
    </UMain>
  </UApp>
</template>

<style scoped></style>
