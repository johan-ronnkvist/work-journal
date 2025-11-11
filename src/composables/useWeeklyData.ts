import { ref, watch, type Ref } from 'vue'
import { RepositoryFactory } from '@/repositories/RepositoryFactory'
import type { WeekIdentifier, WeeklyData } from '@/models/WeeklyData'

export interface UseWeeklyDataReturn {
  /** The loaded weekly data (null if no data exists) */
  data: Ref<WeeklyData | null>

  /** Whether data is currently being loaded */
  isLoading: Ref<boolean>

  /** Whether a save operation is in progress */
  isSaving: Ref<boolean>

  /** Error from the last operation, if any */
  error: Ref<Error | null>

  /**
   * Manually refresh data from the repository
   */
  refresh: () => Promise<void>

  /**
   * Save changes to the repository
   * @param updates Partial updates to apply (merged with existing data)
   */
  save: (updates: {
    statusIcon?: string
    achievements?: string
    challenges?: string
  }) => Promise<void>

  /**
   * Delete the weekly data entry
   */
  remove: () => Promise<void>
}

/**
 * Composable for managing weekly data with reactive state
 *
 * Automatically loads data on mount and watches for weekId changes.
 *
 * @param weekId - Week identifier ref
 *
 * @example
 * ```ts
 * const weekId = ref({ year: 2024, week: 1 })
 * const { data, isLoading, save, refresh } = useWeeklyData(weekId)
 *
 * // Access data
 * console.log(data.value?.achievements)
 *
 * // Save changes
 * await save({ achievements: 'New achievement' })
 *
 * // Refresh from repository
 * await refresh()
 * ```
 */
export function useWeeklyData(weekId: Ref<WeekIdentifier>): UseWeeklyDataReturn {
  // Get the centralized repository instance
  // The repository is configured by the settings store and handles all layer management
  const repository = RepositoryFactory.getInstance()

  // State
  const data = ref<WeeklyData | null>(null)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Load data from repository
   */
  const loadData = async () => {
    const currentWeekId = weekId.value

    try {
      isLoading.value = true
      error.value = null

      console.log(`[useWeeklyData] Loading data for ${currentWeekId.year}-W${currentWeekId.week}`)

      const existingData = await repository.get(currentWeekId)

      if (existingData) {
        data.value = existingData
        console.log(`[useWeeklyData] Loaded existing data`, existingData)
      } else {
        data.value = null
        console.log(`[useWeeklyData] No existing data found`)
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      console.error(`[useWeeklyData] Failed to load data:`, err)
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

  /**
   * Save changes to repository
   */
  const save = async (updates: {
    statusIcon?: string
    achievements?: string
    challenges?: string
  }) => {
    const currentWeekId = weekId.value

    try {
      isSaving.value = true
      error.value = null

      console.log(
        `[useWeeklyData] Saving changes for ${currentWeekId.year}-W${currentWeekId.week}`,
        updates,
      )

      await repository.save({
        weekId: currentWeekId,
        ...updates,
      })

      // Refresh to get the latest data (including metadata)
      await loadData()

      console.log(`[useWeeklyData] Saved successfully`)
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      console.error(`[useWeeklyData] Failed to save:`, err)
      throw error.value
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Delete the weekly data entry
   */
  const remove = async () => {
    const currentWeekId = weekId.value

    try {
      isLoading.value = true
      error.value = null

      console.log(`[useWeeklyData] Deleting data for ${currentWeekId.year}-W${currentWeekId.week}`)

      await repository.delete(currentWeekId)

      // Clear local data
      data.value = null

      console.log(`[useWeeklyData] Deleted successfully`)
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      console.error(`[useWeeklyData] Failed to delete:`, err)
      throw error.value
    } finally {
      isLoading.value = false
    }
  }

  // Watch for weekId changes and reload data
  // Use immediate: true to load data on mount and whenever weekId changes
  watch(
    () => [weekId.value.year, weekId.value.week],
    async () => {
      await loadData()
    },
    { immediate: true },
  )

  return {
    data,
    isLoading,
    isSaving,
    error,
    refresh,
    save,
    remove,
  }
}
