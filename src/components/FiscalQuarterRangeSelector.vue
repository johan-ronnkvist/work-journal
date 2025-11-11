<script setup lang="ts">
import { ref, watch } from 'vue'
import { getCurrentFiscalQuarter, getQuarterMonthRange } from '@/models/FiscalYear.utils'
import type { FiscalYearSettings } from '@/models/FiscalYear.utils'
import { useMediaQuery } from '@vueuse/core'

interface QuarterRange {
  fiscalYear: number
  startQuarter: number
  endQuarter: number
}

interface Props {
  modelValue?: QuarterRange
  fiscalYearSettings: FiscalYearSettings
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => {
    const current = getCurrentFiscalQuarter({ startMonth: 1 })
    return {
      fiscalYear: current.fiscalYear,
      startQuarter: current.quarter,
      endQuarter: current.quarter,
    }
  },
})

const emit = defineEmits<{
  'update:modelValue': [value: QuarterRange]
}>()

// Detect if user is on a mobile device (touch-capable)
const isMobile = useMediaQuery('(pointer: coarse)')

// Local state
const selectedYear = ref(props.modelValue.fiscalYear)
const selectedStartQuarter = ref<number>(props.modelValue.startQuarter)
const selectedEndQuarter = ref<number>(props.modelValue.endQuarter)

// Check if a quarter is in the selected range
const isQuarterInRange = (quarter: number): boolean => {
  return quarter >= selectedStartQuarter.value && quarter <= selectedEndQuarter.value
}

// Emit update to parent
const emitUpdate = () => {
  emit('update:modelValue', {
    fiscalYear: selectedYear.value,
    startQuarter: Math.min(selectedStartQuarter.value, selectedEndQuarter.value),
    endQuarter: Math.max(selectedStartQuarter.value, selectedEndQuarter.value),
  })
}

// Handle quarter click - normal click selects single quarter, shift+click expands range
const handleQuarterClick = (quarter: number, event: MouseEvent) => {
  if (event.shiftKey) {
    // Shift+click: Expand the range to include the clicked quarter
    // This extends the range in whichever direction is needed
    selectedStartQuarter.value = Math.min(
      selectedStartQuarter.value,
      selectedEndQuarter.value,
      quarter,
    )
    selectedEndQuarter.value = Math.max(
      selectedStartQuarter.value,
      selectedEndQuarter.value,
      quarter,
    )
  } else {
    // Normal click: Select single quarter
    selectedStartQuarter.value = quarter
    selectedEndQuarter.value = quarter
  }
  emitUpdate()
}

// Navigate fiscal year
const changeFiscalYear = (delta: number) => {
  selectedYear.value += delta
  emitUpdate()
}

// Get date range for a quarter using utility function
const getQuarterDateRange = (quarter: number): string => {
  const monthRange = getQuarterMonthRange(quarter, props.fiscalYearSettings.startMonth)
  // Replace hyphen with space-hyphen-space for display
  return monthRange.replace('-', ' - ')
}

// Watch for prop changes
watch(
  () => props.modelValue,
  (newValue) => {
    selectedYear.value = newValue.fiscalYear
    selectedStartQuarter.value = newValue.startQuarter
    selectedEndQuarter.value = newValue.endQuarter
  },
  { deep: true },
)
</script>

<template>
  <div class="space-y-4">
    <!-- Fiscal Year Selector -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-chevron-left"
          size="sm"
          variant="ghost"
          color="neutral"
          @click="changeFiscalYear(-1)"
        />
        <span class="text-lg font-semibold min-w-32 text-center">
          Fiscal Year {{ selectedYear }}
        </span>
        <UButton
          icon="i-lucide-chevron-right"
          size="sm"
          variant="ghost"
          color="neutral"
          @click="changeFiscalYear(1)"
        />
      </div>
    </div>

    <!-- Custom Quarter Timeline -->
    <div class="flex justify-center">
      <div class="flex items-center gap-1 max-w-2xl w-full">
        <template v-for="quarter in [1, 2, 3, 4]" :key="quarter">
          <!-- Quarter Node -->
          <div class="flex flex-col items-center gap-1">
            <UButton
              :label="`Q${quarter}`"
              :color="isQuarterInRange(quarter) ? 'primary' : 'neutral'"
              :variant="isQuarterInRange(quarter) ? 'solid' : 'soft'"
              size="xl"
              square
              class="w-12! h-12! p-0! rounded-full justify-center! focus-visible:ring-0! cursor-pointer select-none"
              @click="handleQuarterClick(quarter, $event)"
            />
            <span class="text-xs text-muted mt-1">
              {{ getQuarterDateRange(quarter) }}
            </span>
          </div>

          <!-- Connecting Line (not after last quarter) -->
          <div
            v-if="quarter < 4"
            :class="[
              'flex-1 h-0.5 transition-all',
              isQuarterInRange(quarter) && isQuarterInRange(quarter + 1)
                ? 'bg-primary-500'
                : 'bg-stone-200 dark:bg-stone-700',
            ]"
          ></div>
        </template>
      </div>
    </div>

    <!-- Range Display (desktop only) -->
    <div v-if="!isMobile" class="flex items-center justify-around text-sm text-muted mt-8">
      <div class="flex flex-row items-center">
        <UIcon name="i-lucide-info" class="mr-1 size-4" />
        <p>Select a range with</p>
        <UKbd class="mx-1" color="primary" variant="subtle">shift</UKbd>
      </div>
    </div>
  </div>
</template>
