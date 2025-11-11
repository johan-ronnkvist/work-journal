/**
 * Layered storage system interfaces
 *
 * This module provides the interface definitions for a layered storage architecture
 * that supports multiple storage backends with background synchronization.
 *
 * Architecture:
 * - Layer 1 (Primary): Fast local storage (IndexedDB) for immediate reads/writes
 * - Layer 2+ (Secondary): Background sync layers (File System, Cloud Storage, etc.)
 *
 * @example
 * ```typescript
 * import { LayeredRepository, IndexedDBLayer, FileSystemLayer } from '@/repositories/layered'
 *
 * const repository = new LayeredRepository({
 *   primaryLayer: new IndexedDBLayer(),
 *   secondaryLayers: [new FileSystemLayer()],
 *   conflictResolution: 'last-write-wins',
 *   syncWritesImmediately: false,
 *   fallbackOnError: true
 * })
 * ```
 */

// Base layer interfaces
export type { IStorageLayer } from './IStorageLayer'
export type { IWeeklyDataLayer } from './IWeeklyDataLayer'

// Sync interfaces
export type {
  SyncStatus,
  SyncEvent,
  SyncEventType,
  SyncResult,
  ConflictInfo,
  ConflictResolution,
} from './SyncTypes'
export type { ISyncCoordinator } from './ISyncCoordinator'

// Configuration
export type { LayeredRepositoryConfig } from './LayeredRepositoryConfig'

// Implementations
export { LayeredRepository } from './LayeredRepository'
export { IndexedDBLayer } from './layers/IndexedDBLayer'
export { FileSystemLayer } from './layers/FileSystemLayer'
