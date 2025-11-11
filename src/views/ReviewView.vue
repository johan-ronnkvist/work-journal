<script setup lang="ts">
import { computed, ref } from 'vue'

import FiscalQuarterRangeSelector from '@/components/FiscalQuarterRangeSelector.vue'
import NotesDeleteButton from '@/components/NotesDeleteButton.vue'
import {
  getCurrentFiscalQuarter,
  getQuarterRangeWeeks,
  type QuarterRange,
} from '@/models/FiscalYear.utils'
import WeekRangeData from '@/components/WeekRangeData.vue'
import { useSettingsStore } from '@/stores/settings'

// Get fiscal year settings from store
const settingsStore = useSettingsStore()

// Initialize with current fiscal quarter
const currentFiscalInfo = getCurrentFiscalQuarter(settingsStore.fiscalYearSettings)
const selectedQuarterRange = ref<QuarterRange>({
  fiscalYear: currentFiscalInfo.fiscalYear,
  startQuarter: currentFiscalInfo.quarter,
  endQuarter: currentFiscalInfo.quarter,
})

// Convert quarter range to week range reactively
const weekRange = computed(() =>
  getQuarterRangeWeeks(selectedQuarterRange.value, settingsStore.fiscalYearSettings),
)

// Key to force re-render of WeekRangeData after deletion
const dataKey = ref(0)

// Handle deletion - refresh the data view
const handleDeleteComplete = () => {
  dataKey.value++
}
</script>

<template>
  <UPage>
    <UPageBody>
      <!-- Fiscal Quarter Range Selector -->
      <div class="mb-4">
        <FiscalQuarterRangeSelector
          v-model="selectedQuarterRange"
          :fiscal-year-settings="settingsStore.fiscalYearSettings"
        />
      </div>

      <!-- Week Range Data Display -->
      <WeekRangeData :key="dataKey" :start-week="weekRange.start" :end-week="weekRange.end">
        <template #actions>
          <NotesDeleteButton
            variant="outline"
            :start-week="weekRange.start"
            :end-week="weekRange.end"
            @delete="handleDeleteComplete"
          />
        </template>
      </WeekRangeData>
    </UPageBody>
  </UPage>
</template>
