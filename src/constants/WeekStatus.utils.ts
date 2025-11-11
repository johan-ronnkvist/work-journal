import { WEEK_STATUSES } from './WeekStatus'
import type { WeekStatus } from './WeekStatus'

/**
 * Retrieves a WeekStatus object by its icon (emoji)
 *
 * This utility function performs a lookup in the WEEK_STATUSES array
 * to find a status matching the provided icon.
 *
 * @param icon - The emoji icon to search for (e.g., '😀', '🙂')
 * @returns The matching WeekStatus object, or undefined if not found
 *
 * @example
 * const status = getWeekStatusByIcon('😀')
 * console.log(status?.title) // "Great"
 * console.log(status?.description) // "Had an awesome week!"
 */
export function getWeekStatusByIcon(icon: string): WeekStatus | undefined {
  return WEEK_STATUSES.find((status) => status.icon === icon)
}
