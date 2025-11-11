<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useWeeklyData } from '@/composables/useWeeklyData'
import WeekStatusField from './WeekStatusField.vue'
import WeekTextField from './WeekTextField.vue'
import type { WeekIdentifier } from '@/models/WeeklyData'
import { getWeekDateRange } from '@/models/WeekKey.utils'

interface Props {
  weekId: WeekIdentifier
  editable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  editable: true,
})

// Convert the prop to a ref so it's reactive
const weekIdRef = toRef(props, 'weekId')
const { data, isLoading, isSaving, save } = useWeeklyData(weekIdRef)

const dateRange = computed(() => {
  return getWeekDateRange(props.weekId)
})

// Debounced save handlers for each field (1 second delay)
const saveStatusIcon = (icon: string) => save({ statusIcon: icon })
const saveAchievements = useDebounceFn((text: string) => save({ achievements: text }), 1000)
const saveChallenges = useDebounceFn((text: string) => save({ challenges: text }), 1000)
</script>

<template>
  <UCard
    variant="subtle"
    class="w-full h-full"
    :ui="{
      root: 'flex flex-col',
      body: 'flex-1',
    }"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-lg font-semibold">
            {{ props.weekId.year }} • Week {{ props.weekId.week }}
          </p>
          <p class="text-sm text-muted">
            {{ dateRange.start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }} -
            {{ dateRange.end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }}
          </p>
        </div>
        <div v-if="$slots['header-actions']" class="flex items-center gap-2">
          <slot name="header-actions" :is-loading="isLoading" :is-saving="isSaving" />
        </div>
      </div>
    </template>

    <div v-if="props.editable || data?.achievements">
      <p class="text-xl font-bold text-muted mb-1">Achievements</p>
      <WeekTextField
        :model-value="data?.achievements"
        field="achievements"
        placeholder="What felt like a win this week?"
        :loading="isLoading || isSaving"
        class="w-full"
        @update:model-value="saveAchievements"
        :editable="props.editable"
      />
    </div>

    <div
      v-if="(props.editable || data?.achievements) && (props.editable || data?.challenges)"
      class="my-4"
    ></div>

    <div v-if="props.editable || data?.challenges">
      <p class="text-xl font-bold text-muted mb-1">Challenges</p>
      <WeekTextField
        :model-value="data?.challenges"
        field="challenges"
        placeholder="What challenges did you face this week?"
        :loading="isLoading || isSaving"
        class="w-full"
        @update:model-value="saveChallenges"
        :editable="props.editable"
      />
    </div>

    <template #footer>
      <div class="flex justify-center">
        <WeekStatusField
          :status-icon="data?.statusIcon"
          :loading="isLoading"
          :editable="props.editable"
          @update:status-icon="saveStatusIcon"
        />
      </div>
    </template>
  </UCard>
</template>
