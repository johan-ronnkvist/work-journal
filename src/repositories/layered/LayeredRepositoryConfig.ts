import type { IWeeklyDataLayer } from './IWeeklyDataLayer'
import type { ISyncCoordinator } from './ISyncCoordinator'
import type { ConflictResolution } from './SyncTypes'

/**
 * Configuration for the layered repository
 */
export interface LayeredRepositoryConfig {
  /** Primary layer for reads/writes (usually local for fast access) */
  primaryLayer: IWeeklyDataLayer

  /** Secondary layers (e.g., remote sync, cloud storage) */
  secondaryLayers: IWeeklyDataLayer[]

  /** Sync coordinator (optional - enables background sync) */
  syncCoordinator?: ISyncCoordinator

  /** Conflict resolution strategy */
  conflictResolution: ConflictResolution

  /** Whether to sync writes immediately to all layers (true) or in background (false) */
  syncWritesImmediately: boolean

  /** Fallback to secondary layers if primary layer fails */
  fallbackOnError: boolean
}
