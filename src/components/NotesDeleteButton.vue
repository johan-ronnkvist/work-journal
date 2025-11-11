<script setup lang="ts">
import { ref, computed, toRef } from 'vue'
import type { Ref } from 'vue'
import { useWeeklyData } from '@/composables/useWeeklyData'
import { RepositoryFactory } from '@/repositories/RepositoryFactory'
import type { WeekIdentifier } from '@/models/WeeklyData'

interface Props {
  weekId?: WeekIdentifier
  startWeek?: WeekIdentifier
  endWeek?: WeekIdentifier
  // Button styling props
  variant?: 'solid' | 'outline' | 'soft' | 'ghost' | 'link' | 'subtle'
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'subtle',
  color: 'neutral',
  size: 'sm',
})

const emit = defineEmits<{
  delete: []
}>()

// Determine if this is a single week or range deletion
const isRange = computed(() => {
  return props.startWeek !== undefined && props.endWeek !== undefined
})

// For single week deletion, use the composable (only if weekId is provided)
const weekIdRef = toRef(props, 'weekId')
const { remove } = props.weekId
  ? useWeeklyData(weekIdRef as Ref<WeekIdentifier>)
  : { remove: async () => {} }

// State for delete confirmation popover
const isDeletePopoverOpen = ref(false)
const isDeleting = ref(false)

// Display formatted week or range
const displayText = computed(() => {
  if (isRange.value && props.startWeek && props.endWeek) {
    const start = `${props.startWeek.year} W${props.startWeek.week.toString().padStart(2, '0')}`
    const end = `${props.endWeek.year} W${props.endWeek.week.toString().padStart(2, '0')}`
    return `${start} - ${end}`
  } else if (props.weekId) {
    return `${props.weekId.year} Week ${props.weekId.week.toString().padStart(2, '0')}`
  }
  return ''
})

// Warning text based on deletion type
const warningText = computed(() => {
  if (isRange.value) {
    return 'This will delete all week notes in this range. This action cannot be undone.'
  }
  return 'This action cannot be undone.'
})

// Tooltip text
const tooltipText = computed(() => {
  return isRange.value ? 'Delete Range Data' : 'Delete Week Data'
})

// Handle delete action
const handleDelete = async () => {
  try {
    isDeleting.value = true

    if (isRange.value && props.startWeek && props.endWeek) {
      // Range deletion
      const repository = RepositoryFactory.getInstance()
      const weeksToDelete = await repository.getRange(props.startWeek, props.endWeek)

      for (const week of weeksToDelete) {
        await repository.delete(week.weekId)
      }
    } else if (props.weekId) {
      // Single week deletion
      await remove()
    }

    emit('delete')
    isDeletePopoverOpen.value = false
  } catch (error) {
    console.error('Failed to delete:', error)
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <UPopover v-model:open="isDeletePopoverOpen" :ui="{ content: 'z-100' }">
    <UTooltip :text="tooltipText">
      <UButton icon="i-lucide-trash-2" :color="color" :variant="variant" :size="size" />
    </UTooltip>

    <template #content>
      <div class="p-4 w-80">
        <h3 class="text-lg font-semibold mb-1">Delete data for {{ displayText }}</h3>

        <div class="mb-4">
          <p class="text-xs text-muted">{{ warningText }}</p>
        </div>

        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            variant="subtle"
            color="neutral"
            size="sm"
            @click="isDeletePopoverOpen = false"
            :disabled="isDeleting"
          />
          <UButton
            label="Delete"
            color="error"
            variant="subtle"
            size="sm"
            @click="handleDelete"
            :loading="isDeleting"
            :disabled="isDeleting"
          />
        </div>
      </div>
    </template>
  </UPopover>
</template>
