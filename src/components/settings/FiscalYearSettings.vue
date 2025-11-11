<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'
import { computed } from 'vue'

const settingsStore = useSettingsStore()

// Month options for the select dropdown - using label as display value
const monthOptions = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// Computed property for two-way binding with the select
// Converts between month index (1-12) and month name
const selectedMonth = computed({
  get: () => monthOptions[settingsStore.fiscalYearStartMonth - 1],
  set: (value: string) => {
    const monthIndex = monthOptions.indexOf(value) + 1
    settingsStore.setFiscalYearStartMonth(monthIndex)
  },
})

// Handle reset to default
const handleReset = () => {
  settingsStore.resetFiscalYearSettings()
}
</script>

<template>
  <UCard variant="subtle">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">Fiscal Year</h3>
        <UButton
          variant="ghost"
          size="sm"
          @click="handleReset"
          :disabled="selectedMonth === 'January'"
        >
          Reset to Default
        </UButton>
      </div>
    </template>

    <div class="space-y-4">
      <div>
        <div class="mb-4 flex flex-row items-center gap-4">
          <label for="fiscal-year-start" class=""> Fiscal Year Start Month </label>
          <USelect
            id="fiscal-year-start"
            v-model="selectedMonth"
            :items="monthOptions"
            size="sm"
            placeholder="Select month"
            :ui="{ content: 'min-w-fit' }"
          />
        </div>
        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-info"
          description="
          A fiscal year is a 12-month accounting period used for budgeting and reporting. It can
          start in any month, depending on how your organization tracks finances. In order to
          show the corresponding ranges correctly in the Review View, please set your fiscal
          year start month accordingly."
        >
        </UAlert>
      </div>
    </div>
  </UCard>
</template>
