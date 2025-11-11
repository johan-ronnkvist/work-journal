<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue?: string
  field: 'achievements' | 'challenges'
  rows?: number
  editable?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  rows: 10,
  editable: true,
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Computed property for two-way binding
const content = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})
</script>

<template>
  <UTextarea v-if="props.editable" v-model="content" :rows="rows" autoresize />
  <p v-else class="text-sm whitespace-pre-wrap">{{ content }}</p>
</template>
