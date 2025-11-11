import type { WeeklyData, WeekIdentifier } from '@/models/WeeklyData'
import type { SaveWeeklyDataInput } from '../RepositoryTypes'
import type { IWeeklyDataRepository } from '../IWeeklyDataRepository'
import type { IWeeklyDataLayer } from './IWeeklyDataLayer'
import type { LayeredRepositoryConfig } from './LayeredRepositoryConfig'

/**
 * Orchestrates multiple storage layers
 * Implements IWeeklyDataRepository so it's a drop-in replacement for existing code
 *
 * Design principles:
 * - Reads always come from primary layer (fast local cache)
 * - Writes go to primary layer immediately, then optionally sync to secondary layers
 * - Background sync ensures secondary layers stay up to date
 * - Fallback to secondary layers if primary fails (when configured)
 */
export class LayeredRepository implements IWeeklyDataRepository {
  private primaryLayer: IWeeklyDataLayer
  private secondaryLayers: IWeeklyDataLayer[]
  private config: LayeredRepositoryConfig

  constructor(config: LayeredRepositoryConfig) {
    this.config = config
    this.primaryLayer = config.primaryLayer
    this.secondaryLayers = config.secondaryLayers
  }

  /**
   * Reads always come from primary layer (fast local cache)
   * Background sync ensures it stays up to date
   */
  async get(weekId: WeekIdentifier): Promise<WeeklyData | null> {
    try {
      const result = await this.primaryLayer.get(weekId)

      // Optionally trigger background sync for this item
      if (this.config.syncCoordinator) {
        this.config.syncCoordinator.syncItem(weekId).catch((err) => {
          console.warn('Background sync failed for item:', weekId, err)
        })
      }

      return result
    } catch (error) {
      // Fallback to secondary layers if configured
      if (this.config.fallbackOnError) {
        return this.fallbackGet(weekId)
      }
      throw error
    }
  }

  /**
   * Writes go to primary layer immediately
   * Then optionally sync to secondary layers (blocking or non-blocking)
   */
  async save(input: SaveWeeklyDataInput): Promise<WeeklyData> {
    // Save to primary layer first (fast)
    const result = await this.primaryLayer.save(input)

    // Sync to secondary layers
    if (this.config.syncWritesImmediately) {
      // Blocking - wait for all layers to complete
      await this.syncToSecondaryLayers(result)
    } else if (this.secondaryLayers.length > 0) {
      // Non-blocking - fire and forget
      this.syncToSecondaryLayers(result).catch((err) => {
        console.warn('Secondary layer sync failed:', err)
      })
    }

    return result
  }

  /**
   * Retrieves a range of weekly data
   * Always from primary layer for consistency
   */
  async getRange(start: WeekIdentifier, end: WeekIdentifier): Promise<WeeklyData[]> {
    try {
      return await this.primaryLayer.getRange(start, end)
    } catch (error) {
      if (this.config.fallbackOnError) {
        return this.fallbackGetRange(start, end)
      }
      throw error
    }
  }

  /**
   * Retrieves all weekly data for a given year
   * Always from primary layer for consistency
   */
  async getByYear(year: number): Promise<WeeklyData[]> {
    try {
      return await this.primaryLayer.getByYear(year)
    } catch (error) {
      if (this.config.fallbackOnError) {
        return this.fallbackGetByYear(year)
      }
      throw error
    }
  }

  /**
   * Gets all week numbers that have data for a given year
   * Always from primary layer for consistency
   */
  async getWeeksWithData(year: number): Promise<Set<number>> {
    try {
      return await this.primaryLayer.getWeeksWithData(year)
    } catch (error) {
      if (this.config.fallbackOnError) {
        return this.fallbackGetWeeksWithData(year)
      }
      throw error
    }
  }

  /**
   * Deletes weekly data
   * Removes from all layers to maintain consistency
   */
  async delete(weekId: WeekIdentifier): Promise<void> {
    // Delete from primary layer
    await this.primaryLayer.delete(weekId)

    // Delete from secondary layers
    if (this.config.syncWritesImmediately) {
      // Blocking - wait for all layers
      await Promise.allSettled(this.secondaryLayers.map((layer) => layer.delete(weekId)))
    } else if (this.secondaryLayers.length > 0) {
      // Non-blocking - fire and forget
      Promise.allSettled(this.secondaryLayers.map((layer) => layer.delete(weekId))).catch((err) => {
        console.warn('Secondary layer delete failed:', err)
      })
    }
  }

  /**
   * Syncs data to all secondary layers
   * @private
   */
  private async syncToSecondaryLayers(data: WeeklyData): Promise<void> {
    if (this.secondaryLayers.length === 0) {
      return
    }

    const input: SaveWeeklyDataInput = {
      weekId: data.weekId,
      statusIcon: data.statusIcon,
      achievements: data.achievements,
      challenges: data.challenges,
    }

    await Promise.allSettled(this.secondaryLayers.map((layer) => layer.save(input)))
  }

  /**
   * Fallback get - tries secondary layers in priority order
   * @private
   */
  private async fallbackGet(weekId: WeekIdentifier): Promise<WeeklyData | null> {
    // Sort by priority (descending)
    const sortedLayers = [...this.secondaryLayers].sort((a, b) => b.priority - a.priority)

    for (const layer of sortedLayers) {
      try {
        const result = await layer.get(weekId)
        if (result) {
          // Try to cache in primary layer for next time (best effort)
          try {
            await this.primaryLayer.save({
              weekId: result.weekId,
              statusIcon: result.statusIcon,
              achievements: result.achievements,
              challenges: result.challenges,
            })
          } catch (cacheErr) {
            // Ignore caching errors - we still have the data from secondary layer
            console.warn('Failed to cache fallback data in primary layer:', cacheErr)
          }
          return result
        }
      } catch (err) {
        console.warn(`Fallback get failed for layer ${layer.name}:`, err)
        continue // Try next layer
      }
    }
    return null
  }

  /**
   * Fallback getRange - tries secondary layers in priority order
   * @private
   */
  private async fallbackGetRange(
    start: WeekIdentifier,
    end: WeekIdentifier,
  ): Promise<WeeklyData[]> {
    const sortedLayers = [...this.secondaryLayers].sort((a, b) => b.priority - a.priority)

    for (const layer of sortedLayers) {
      try {
        return await layer.getRange(start, end)
      } catch (err) {
        console.warn(`Fallback getRange failed for layer ${layer.name}:`, err)
        continue
      }
    }
    return []
  }

  /**
   * Fallback getByYear - tries secondary layers in priority order
   * @private
   */
  private async fallbackGetByYear(year: number): Promise<WeeklyData[]> {
    const sortedLayers = [...this.secondaryLayers].sort((a, b) => b.priority - a.priority)

    for (const layer of sortedLayers) {
      try {
        return await layer.getByYear(year)
      } catch (err) {
        console.warn(`Fallback getByYear failed for layer ${layer.name}:`, err)
        continue
      }
    }
    return []
  }

  /**
   * Fallback getWeeksWithData - tries secondary layers in priority order
   * @private
   */
  private async fallbackGetWeeksWithData(year: number): Promise<Set<number>> {
    const sortedLayers = [...this.secondaryLayers].sort((a, b) => b.priority - a.priority)

    for (const layer of sortedLayers) {
      try {
        return await layer.getWeeksWithData(year)
      } catch (err) {
        console.warn(`Fallback getWeeksWithData failed for layer ${layer.name}:`, err)
        continue
      }
    }
    return new Set()
  }
}
