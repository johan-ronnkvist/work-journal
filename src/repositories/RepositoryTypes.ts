import type { WeekIdentifier } from '@/models/WeeklyData'

/**
 * Legacy string-based week identifier in ISO 8601 format (YYYY-Wnn)
 * Examples: "2024-W01", "2024-W52"
 *
 * Used internally by the repository layer for IndexedDB primary keys.
 * Components should use WeekIdentifier instead.
 *
 * @internal
 */
export type WeekKey = string

/**
 * Unified input for saving (creating or updating) weekly data entries.
 * All fields except weekId are optional - missing fields will be set to defaults
 * for new entries or preserved from existing data for updates.
 *
 * Used internally by repository layer.
 *
 * @internal
 */
export interface SaveWeeklyDataInput {
  /** Week identifier (required) */
  weekId: WeekIdentifier
  /** Week status icon (optional - defaults to 'Unknown' for new entries) */
  statusIcon?: string
  /** Achievements text (optional - defaults to '' for new entries) */
  achievements?: string
  /** Challenges text (optional - defaults to '' for new entries) */
  challenges?: string
}
