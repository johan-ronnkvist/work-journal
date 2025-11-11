import { ref, watch, type Ref } from 'vue'
import { RepositoryFactory } from '@/repositories/RepositoryFactory'
import type { WeeklyData, WeekIdentifier } from '@/models/WeeklyData'

export interface UseWeekRangeDataReturn {
  /** Array of weekly data for the range (empty if no data exists) */
  weeks: Ref<WeeklyData[]>

  /** Whether data is currently being loaded */
  isLoading: Ref<boolean>

  /** Error from the last operation, if any */
  error: Ref<Error | null>

  /**
   * Manually refresh data from the repository
   */
  refresh: () => Promise<void>
}

/**
 * Composable for loading a custom range of weekly data
 *
 * Automatically loads data on mount and watches for start/end changes.
 * Returns all weeks that have data within the specified range.
 *
 * @param start - Reactive start week identifier reference
 * @param end - Reactive end week identifier reference
 *
 * @example
 * ```ts
 * const start = ref({ year: 2025, week: 1 })
 * const end = ref({ year: 2025, week: 13 })
 * const { weeks, isLoading } = useWeekRangeData(start, end)
 *
 * // Access all weeks in the range
 * console.log(weeks.value) // Array of WeeklyData
 *
 * // Change range dynamically
 * start.value = { year: 2025, week: 14 }
 * end.value = { year: 2025, week: 26 }
 * // Data will automatically reload
 * ```
 */
export function useWeekRangeData(
  start: Ref<WeekIdentifier>,
  end: Ref<WeekIdentifier>,
): UseWeekRangeDataReturn {
  // Get the centralized repository instance
  // The repository is configured by the settings store and handles all layer management
  const repository = RepositoryFactory.getInstance()

  // State
  const weeks = ref<WeeklyData[]>([])
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Load data from repository for the current range
   */
  const loadData = async () => {
    const currentStart = start.value
    const currentEnd = end.value

    try {
      isLoading.value = true
      error.value = null

      console.log(
        `[useWeekRangeData] Loading data from ${currentStart.year}-W${currentStart.week} to ${currentEnd.year}-W${currentEnd.week}`,
      )

      // Load all weeks in the range from repository
      const data = await repository.getRange(currentStart, currentEnd)

      weeks.value = data
      console.log(`[useWeekRangeData] Loaded ${data.length} weeks with data`)
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      console.error(`[useWeekRangeData] Failed to load data:`, err)
      throw error.value
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Refresh data from repository
   */
  const refresh = async () => {
    await loadData()
  }

  // Watch for start/end changes and reload data
  // Use immediate: true to load data on mount
  watch(
    () => [start.value.year, start.value.week, end.value.year, end.value.week],
    async () => {
      await loadData()
    },
    { immediate: true },
  )

  return {
    weeks,
    isLoading,
    error,
    refresh,
  }
}
