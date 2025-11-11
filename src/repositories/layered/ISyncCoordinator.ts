import type { WeekIdentifier } from '@/models/WeeklyData'
import type { SyncEvent, SyncResult, SyncStatus } from './SyncTypes'

/**
 * Sync coordinator manages synchronization between storage layers
 */
export interface ISyncCoordinator {
  /**
   * Sync a specific item across all layers
   * @param weekId - Item to sync
   * @returns Sync result with any conflicts
   */
  syncItem(weekId: WeekIdentifier): Promise<SyncResult>

  /**
   * Sync a range of items
   * @param start - Start week
   * @param end - End week
   * @returns Array of sync results
   */
  syncRange(start: WeekIdentifier, end: WeekIdentifier): Promise<SyncResult[]>

  /**
   * Start background sync process
   * @param intervalMs - How often to sync in milliseconds (default: 30000)
   */
  startBackgroundSync(intervalMs?: number): void

  /**
   * Stop background sync
   */
  stopBackgroundSync(): void

  /**
   * Get sync status for an item
   * @param weekId - Week identifier to check
   * @returns Current sync status
   */
  getSyncStatus(weekId: WeekIdentifier): Promise<SyncStatus>

  /**
   * Subscribe to sync events
   * @param callback - Function to call when sync events occur
   * @returns Unsubscribe function
   */
  onSyncEvent(callback: (event: SyncEvent) => void): () => void

  /**
   * Force a full sync of all data across all layers
   * @returns Array of sync results for all items
   */
  syncAll(): Promise<SyncResult[]>
}
