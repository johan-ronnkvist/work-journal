import type { WeeklyData, WeekIdentifier } from './WeeklyData'
import { DEFAULT_WEEK_STATUS } from '@/constants/WeekStatus'

/**
 * Default values for WeeklyData fields
 * Centralized to ensure consistency across repository and UI
 */
export const DEFAULT_WEEKLY_DATA_VALUES = {
  statusIcon: DEFAULT_WEEK_STATUS.icon, // '❔' (Unknown)
  achievements: '',
  challenges: '',
} as const

/**
 * Creates a WeeklyData object with default values
 * Useful for initializing new weekly records
 *
 * @param weekId - The week identifier for the data
 * @returns A new WeeklyData object with default values
 */
export function createDefaultWeeklyData(weekId: WeekIdentifier): WeeklyData {
  return {
    weekId,
    ...DEFAULT_WEEKLY_DATA_VALUES,
  }
}
