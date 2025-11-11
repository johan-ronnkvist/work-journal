<script setup lang="ts">
import { ref, computed } from 'vue'
import { WEEK_STATUSES, DEFAULT_WEEK_STATUS } from '@/constants/WeekStatus'
import { getWeekStatusByIcon } from '@/constants/WeekStatus.utils'
import type { WeekStatus } from '@/constants/WeekStatus'
import { useMediaQuery } from '@vueuse/core'

interface Props {
  statusIcon?: string
  loading?: boolean
  editable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  statusIcon: DEFAULT_WEEK_STATUS.icon,
  loading: false,
  editable: true,
})

const emit = defineEmits<{
  'update:statusIcon': [icon: string]
}>()

// Detect mobile device (touch-capable devices)
const isMobile = useMediaQuery('(pointer: coarse)')

// Computed property to get the full WeekStatus object from the icon
const currentStatus = computed(() => {
  return getWeekStatusByIcon(props.statusIcon) || DEFAULT_WEEK_STATUS
})

// Use click mode on mobile, hover mode on desktop
const popoverMode = computed(() => (isMobile.value ? 'click' : 'hover'))

const isPopoverOpen = ref(false)

const handleStatusClick = (status: WeekStatus) => {
  emit('update:statusIcon', status.icon)
  isPopoverOpen.value = false
}
</script>

<template>
  <UPopover
    v-if="props.editable"
    v-model:open="isPopoverOpen"
    :mode="popoverMode"
    :content="{ side: 'top' }"
  >
    <div
      class="flex items-center gap-2 text-2xl text-muted"
      :class="{ 'cursor-pointer hover:opacity-80 transition-opacity': !loading }"
    >
      <template v-if="loading">
        <USkeleton class="inline-block h-10 w-10 aspect-square rounded-full" />
        <USkeleton class="inline-block w-80" />
      </template>
      <template v-else>
        <span>{{ currentStatus.icon }}</span>
        <span class="whitespace-nowrap">{{ currentStatus.description }}</span>
      </template>
    </div>
    <template #content>
      <div class="flex flex-col gap-1">
        <UButton
          v-for="item in WEEK_STATUSES.slice(0, 5)"
          :key="item.title"
          variant="ghost"
          class="text-2xl font-light w-full justify-start"
          color="neutral"
          @click="handleStatusClick(item)"
        >
          <span class="mr-2">{{ item.icon }}</span>
          <span class="text-sm">{{ item.title }}</span>
        </UButton>
        <USeparator class="my-1" color="neutral" />
        <UButton
          v-for="item in WEEK_STATUSES.slice(5)"
          :key="item.title"
          variant="ghost"
          class="text-2xl font-light w-full justify-start"
          color="neutral"
          @click="handleStatusClick(item)"
        >
          <span class="mr-2">{{ item.icon }}</span>
          <span class="text-sm">{{ item.title }}</span>
        </UButton>
      </div>
    </template>
  </UPopover>
  <div v-else class="flex items-center gap-2 text-2xl text-muted">
    <template v-if="loading">
      <USkeleton class="inline-block h-10 w-10 aspect-square rounded-full" />
      <USkeleton class="inline-block w-80" />
    </template>
    <template v-else>
      <span>{{ currentStatus.icon }}</span>
      <span class="whitespace-nowrap">{{ currentStatus.description }}</span>
    </template>
  </div>
</template>

<style scoped></style>
