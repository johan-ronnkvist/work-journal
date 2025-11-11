import type { WeeklyData, WeekIdentifier } from '@/models/WeeklyData'

/**
 * Sync status for a specific data item
 */
export interface SyncStatus {
  /** Last time this item was synced */
  lastSyncedAt: Date | null

  /** Whether this item has unsaved local changes */
  isDirty: boolean

  /** Which layer has the most recent version */
  authoritative: string

  /** Conflict state if versions differ */
  hasConflict: boolean
}

/**
 * Sync event types
 */
export type SyncEventType =
  | 'sync-started'
  | 'sync-completed'
  | 'sync-failed'
  | 'conflict-detected'
  | 'item-synced'

/**
 * Event emitted during sync operations
 */
export interface SyncEvent {
  /** Type of sync event */
  type: SyncEventType

  /** When the event occurred */
  timestamp: Date

  /** Which layer triggered the event */
  layerName: string

  /** Week identifier if applicable */
  weekId?: WeekIdentifier

  /** Error if the event represents a failure */
  error?: Error

  /** Data that was synced (if applicable) */
  data?: WeeklyData
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  /** Week identifier that was synced */
  weekId: WeekIdentifier

  /** Whether the sync succeeded */
  success: boolean

  /** Conflict information if a conflict was detected */
  conflict?: ConflictInfo

  /** Error if the sync failed */
  error?: Error
}

/**
 * Information about a sync conflict
 */
export interface ConflictInfo {
  /** Version from local storage */
  localVersion: WeeklyData

  /** Version from remote storage */
  remoteVersion: WeeklyData

  /** When local version was last modified */
  localModifiedAt: Date

  /** When remote version was last modified */
  remoteModifiedAt: Date
}

/**
 * Strategy for resolving conflicts
 */
export type ConflictResolution =
  | 'local-wins' // Always prefer local version
  | 'remote-wins' // Always prefer remote version
  | 'last-write-wins' // Use timestamp to decide
  | 'manual' // Require user intervention
