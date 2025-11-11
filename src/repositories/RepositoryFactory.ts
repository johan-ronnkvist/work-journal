import type { IWeeklyDataRepository } from './IWeeklyDataRepository'
import { LayeredRepository } from './layered/LayeredRepository'
import { IndexedDBLayer } from './layered/layers/IndexedDBLayer'
import { FileSystemLayer } from './layered/layers/FileSystemLayer'

/**
 * Configuration for the repository
 */
export interface RepositoryConfig {
  /** Whether file system storage is enabled */
  enableFileSystem: boolean
  /** Directory handle for file system access (if file system is enabled) */
  directoryHandle?: FileSystemDirectoryHandle
  /** Whether to sync writes to secondary layers immediately (blocking) or in background */
  syncWritesImmediately?: boolean
  /** Whether to fallback to secondary layers if primary fails */
  fallbackOnError?: boolean
}

/**
 * Factory for creating and managing WeeklyDataRepository instances
 *
 * Provides centralized repository access with singleton pattern.
 * The repository is configured based on application settings and can be
 * reconfigured when settings change (e.g., when file storage is enabled/disabled).
 *
 * Usage:
 * - Call `configure()` with settings when app starts or settings change
 * - Call `getInstance()` to get the current repository instance
 * - All consumers use the same repository instance
 */
export class RepositoryFactory {
  private static instance: IWeeklyDataRepository | null = null
  private static currentConfig: RepositoryConfig | null = null

  /**
   * Configures and initializes the repository based on application settings
   * If a repository already exists with different config, it will be recreated
   *
   * @param config - Repository configuration
   */
  static configure(config: RepositoryConfig): void {
    // Check if reconfiguration is needed
    const needsReconfiguration =
      !this.currentConfig ||
      this.currentConfig.enableFileSystem !== config.enableFileSystem ||
      this.currentConfig.directoryHandle !== config.directoryHandle

    if (needsReconfiguration) {
      console.log('[RepositoryFactory] Configuring repository with:', {
        enableFileSystem: config.enableFileSystem,
        hasDirectoryHandle: !!config.directoryHandle,
      })

      this.currentConfig = config
      this.instance = this.createRepository(config)
    }
  }

  /**
   * Gets the current repository instance
   * If not configured, returns a basic IndexedDB-only repository
   *
   * @returns Repository instance
   */
  static getInstance(): IWeeklyDataRepository {
    if (!this.instance) {
      console.warn(
        '[RepositoryFactory] No configured instance, creating default IndexedDB-only repository',
      )
      // Create default repository if not configured
      this.instance = this.createRepository({ enableFileSystem: false })
      this.currentConfig = { enableFileSystem: false }
    }

    return this.instance
  }

  /**
   * Creates a new repository instance based on configuration
   * @private
   */
  private static createRepository(config: RepositoryConfig): IWeeklyDataRepository {
    const primaryLayer = new IndexedDBLayer()
    const secondaryLayers = []

    // Add FileSystemLayer if enabled and directory handle is available
    if (config.enableFileSystem) {
      const fileSystemLayer = new FileSystemLayer(config.directoryHandle)
      secondaryLayers.push(fileSystemLayer)
      console.log('[RepositoryFactory] FileSystemLayer added to repository')
    }

    return new LayeredRepository({
      primaryLayer,
      secondaryLayers,
      conflictResolution: 'last-write-wins',
      syncWritesImmediately: config.syncWritesImmediately ?? false,
      fallbackOnError: config.fallbackOnError ?? true,
    })
  }

  /**
   * Resets the cached instance
   * Useful for testing or when re-initialization is needed
   */
  static reset(): void {
    console.log('[RepositoryFactory] Resetting repository instance')
    this.instance = null
    this.currentConfig = null
  }

  // Legacy methods for backward compatibility - deprecated
  /**
   * @deprecated Use configure() and getInstance() instead
   */
  static create(): IWeeklyDataRepository {
    return this.getInstance()
  }

  /**
   * @deprecated Use configure() with enableFileSystem: true instead
   */
  static createWithFileSystem(
    directoryHandle?: FileSystemDirectoryHandle,
    options: {
      syncWritesImmediately?: boolean
      fallbackOnError?: boolean
    } = {},
  ): IWeeklyDataRepository {
    this.configure({
      enableFileSystem: true,
      directoryHandle,
      syncWritesImmediately: options.syncWritesImmediately,
      fallbackOnError: options.fallbackOnError,
    })
    return this.getInstance()
  }
}
