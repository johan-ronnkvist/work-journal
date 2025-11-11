<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCurrentWeekIdentifier, createWeekIdentifier } from '@/models/WeekKey.utils'
import type { WeekIdentifier } from '@/models/WeeklyData'
import WeekPagination from '@/components/WeekPagination.vue'
import NotesDeleteButton from '@/components/NotesDeleteButton.vue'

const route = useRoute()
const router = useRouter()

// Compute the current week identifier from route params or default to current week
const weekId = computed<WeekIdentifier>(() => {
  const yearParam = route.params.year
  const weekParam = route.params.week

  // If both params exist, try to construct week identifier
  if (yearParam && weekParam) {
    try {
      const year = parseInt(yearParam as string, 10)
      const week = parseInt(weekParam as string, 10)
      return createWeekIdentifier(year, week)
    } catch (error) {
      // Invalid params, redirect to current week
      console.error('Invalid week parameters:', error)
      router.replace('/notes')
      return getCurrentWeekIdentifier()
    }
  }

  // Default to current week
  return getCurrentWeekIdentifier()
})

// Handle deletion - navigate to current week after delete
const handleDeleteComplete = () => {
  const current = getCurrentWeekIdentifier()
  router.push(`/notes/${current.year}/${current.week}`)
}
</script>

<template>
  <UPage>
    <div class="flex justify-center my-4">
      <div class="w-full max-w-[500px]">
        <WeekNotesCard :week-id="weekId" :editable="true">
          <template #header-actions>
            <NotesDeleteButton :week-id="weekId" @delete="handleDeleteComplete" variant="ghost" />
          </template>
        </WeekNotesCard>
      </div>
    </div>

    <div class="flex justify-center">
      <WeekPagination :week-id="weekId" />
    </div>
  </UPage>
</template>
