import type { WeeklyData, WeekIdentifier } from '@/models/WeeklyData'
import type { SaveWeeklyDataInput } from '../RepositoryTypes'
import type { IStorageLayer } from './IStorageLayer'

/**
 * Data layer that can store and retrieve WeeklyData
 * Extends IStorageLayer with WeeklyData-specific operations
 */
export interface IWeeklyDataLayer extends IStorageLayer {
  /**
   * Saves weekly data (creates new or updates existing)
   * @param input - Data to save
   * @returns Saved WeeklyData
   */
  save(input: SaveWeeklyDataInput): Promise<WeeklyData>

  /**
   * Retrieves weekly data by week identifier
   * @param weekId - Week identifier
   * @returns WeeklyData or null if not found
   */
  get(weekId: WeekIdentifier): Promise<WeeklyData | null>

  /**
   * Retrieves a range of weekly data (inclusive)
   * @param start - Start week identifier
   * @param end - End week identifier
   * @returns Array of WeeklyData sorted by week (ascending)
   */
  getRange(start: WeekIdentifier, end: WeekIdentifier): Promise<WeeklyData[]>

  /**
   * Retrieves all weekly data for a given year
   * @param year - Year to retrieve
   * @returns Array of WeeklyData sorted by week (ascending)
   */
  getByYear(year: number): Promise<WeeklyData[]>

  /**
   * Gets all week numbers that have data for a given year
   * @param year - Year to retrieve week numbers for
   * @returns Set of week numbers that have data
   */
  getWeeksWithData(year: number): Promise<Set<number>>

  /**
   * Deletes weekly data by week identifier
   * @param weekId - Week identifier to delete
   */
  delete(weekId: WeekIdentifier): Promise<void>
}
