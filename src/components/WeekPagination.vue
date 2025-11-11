<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getWeeksInYear } from '@/models/WeekKey.utils'
import type { WeekIdentifier } from '@/models/WeeklyData'
import { useWeekNavigation } from '@/composables/useWeekNavigation'
import { useMediaQuery } from '@vueuse/core'

interface Props {
  weekId: WeekIdentifier
}

const props = defineProps<Props>()

const { navigateToWeek } = useWeekNavigation()

// Current page for UPagination (1-indexed, corresponds to week number)
const week = ref(props.weekId.week)

// Calculate total weeks in the current year
const totalWeeks = computed(() => getWeeksInYear(props.weekId.year))

// Responsive sibling count based on screen size
const isLargeScreen = useMediaQuery('(min-width: 1024px)')
const siblingCount = computed(() => (isLargeScreen.value ? 4 : 2))

// Watch for external weekId changes (e.g., from WeekPicker or route changes)
watch(
  () => props.weekId,
  (newWeekId) => {
    week.value = newWeekId.week
  },
  { deep: true },
)

// Watch page changes and navigate to the selected week
watch(week, (newWeek) => {
  if (newWeek !== props.weekId.week) {
    navigateToWeek({ year: props.weekId.year, week: newWeek })
  }
})
</script>

<template>
  <UPagination
    v-model:page="week"
    :items-per-page="1"
    :total="totalWeeks"
    :sibling-count="siblingCount"
    variant="soft"
    active-variant="solid"
  >
  </UPagination>
</template>

<style scoped></style>
