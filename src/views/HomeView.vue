<script setup lang="ts">
import { ref } from 'vue'

const links = ref([
  {
    label: 'Get started',
    to: '/notes',
    icon: 'i-lucide-notebook-pen',
  },
])
</script>

<template>
  <UPageHero
    title="Your Work Journal"
    description="Keep track of your highs, lows, and everything that makes you better at what you do"
    :links="links"
  />
</template>
