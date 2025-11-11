import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RepositoryFactory } from '../RepositoryFactory'
import type { RepositoryConfig } from '../RepositoryFactory'
import { LayeredRepository } from '../layered/LayeredRepository'
import { IndexedDBLayer } from '../layered/layers/IndexedDBLayer'
import { FileSystemLayer } from '../layered/layers/FileSystemLayer'

// Mock the layers and repository
vi.mock('../layered/LayeredRepository')
vi.mock('../layered/layers/IndexedDBLayer')
vi.mock('../layered/layers/FileSystemLayer')

describe('RepositoryFactory', () => {
  beforeEach(() => {
    // Reset factory state before each test
    RepositoryFactory.reset()
    vi.clearAllMocks()
  })

  afterEach(() => {
    RepositoryFactory.reset()
  })

  describe('getInstance', () => {
    it('should create a default IndexedDB-only repository when not configured', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const instance = RepositoryFactory.getInstance()

      expect(instance).toBeDefined()
      expect(consoleSpy).toHaveBeenCalledWith(
        '[RepositoryFactory] No configured instance, creating default IndexedDB-only repository',
      )
      expect(LayeredRepository).toHaveBeenCalledWith({
        primaryLayer: expect.any(IndexedDBLayer),
        secondaryLayers: [],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: false,
        fallbackOnError: true,
      })

      consoleSpy.mockRestore()
    })

    it('should return the same instance on subsequent calls', () => {
      const instance1 = RepositoryFactory.getInstance()
      const instance2 = RepositoryFactory.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should return configured instance after configure is called', () => {
      const config: RepositoryConfig = {
        enableFileSystem: false,
      }

      RepositoryFactory.configure(config)
      const instance = RepositoryFactory.getInstance()

      expect(instance).toBeDefined()
      expect(LayeredRepository).toHaveBeenCalledTimes(1)
    })
  })

  describe('configure', () => {
    it('should create repository with IndexedDB only when file system is disabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const config: RepositoryConfig = {
        enableFileSystem: false,
        syncWritesImmediately: false,
        fallbackOnError: true,
      }

      RepositoryFactory.configure(config)

      expect(consoleSpy).toHaveBeenCalledWith('[RepositoryFactory] Configuring repository with:', {
        enableFileSystem: false,
        hasDirectoryHandle: false,
      })
      expect(LayeredRepository).toHaveBeenCalledWith({
        primaryLayer: expect.any(IndexedDBLayer),
        secondaryLayers: [],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: false,
        fallbackOnError: true,
      })
      expect(FileSystemLayer).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should create repository with FileSystemLayer when file system is enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const mockDirectoryHandle = {} as FileSystemDirectoryHandle

      const config: RepositoryConfig = {
        enableFileSystem: true,
        directoryHandle: mockDirectoryHandle,
        syncWritesImmediately: false,
        fallbackOnError: true,
      }

      RepositoryFactory.configure(config)

      expect(consoleSpy).toHaveBeenCalledWith('[RepositoryFactory] Configuring repository with:', {
        enableFileSystem: true,
        hasDirectoryHandle: true,
      })
      expect(FileSystemLayer).toHaveBeenCalledWith(mockDirectoryHandle)
      expect(consoleSpy).toHaveBeenCalledWith(
        '[RepositoryFactory] FileSystemLayer added to repository',
      )
      expect(LayeredRepository).toHaveBeenCalledWith({
        primaryLayer: expect.any(IndexedDBLayer),
        secondaryLayers: [expect.any(FileSystemLayer)],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: false,
        fallbackOnError: true,
      })

      consoleSpy.mockRestore()
    })

    it('should enable FileSystemLayer even without directory handle', () => {
      const config: RepositoryConfig = {
        enableFileSystem: true,
        // No directory handle provided
      }

      RepositoryFactory.configure(config)

      expect(FileSystemLayer).toHaveBeenCalledWith(undefined)
      expect(LayeredRepository).toHaveBeenCalledWith({
        primaryLayer: expect.any(IndexedDBLayer),
        secondaryLayers: [expect.any(FileSystemLayer)],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: false,
        fallbackOnError: true,
      })
    })

    it('should use default options when not specified', () => {
      const config: RepositoryConfig = {
        enableFileSystem: false,
        // syncWritesImmediately and fallbackOnError not specified
      }

      RepositoryFactory.configure(config)

      expect(LayeredRepository).toHaveBeenCalledWith({
        primaryLayer: expect.any(IndexedDBLayer),
        secondaryLayers: [],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: false,
        fallbackOnError: true,
      })
    })

    it('should respect custom sync and fallback options', () => {
      const config: RepositoryConfig = {
        enableFileSystem: false,
        syncWritesImmediately: true,
        fallbackOnError: false,
      }

      RepositoryFactory.configure(config)

      expect(LayeredRepository).toHaveBeenCalledWith({
        primaryLayer: expect.any(IndexedDBLayer),
        secondaryLayers: [],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: true,
        fallbackOnError: false,
      })
    })

    it('should not reconfigure if config is the same', () => {
      const config: RepositoryConfig = {
        enableFileSystem: false,
      }

      RepositoryFactory.configure(config)
      const callCount1 = vi.mocked(LayeredRepository).mock.calls.length

      // Configure again with same config
      RepositoryFactory.configure(config)
      const callCount2 = vi.mocked(LayeredRepository).mock.calls.length

      expect(callCount2).toBe(callCount1) // Should not create new instance
    })

    it('should reconfigure when enableFileSystem changes', () => {
      const config1: RepositoryConfig = {
        enableFileSystem: false,
      }

      RepositoryFactory.configure(config1)
      const callCount1 = vi.mocked(LayeredRepository).mock.calls.length

      // Change file system setting
      const config2: RepositoryConfig = {
        enableFileSystem: true,
      }

      RepositoryFactory.configure(config2)
      const callCount2 = vi.mocked(LayeredRepository).mock.calls.length

      expect(callCount2).toBeGreaterThan(callCount1)
    })

    it('should reconfigure when directoryHandle changes', () => {
      const handle1 = {} as FileSystemDirectoryHandle
      const handle2 = {} as FileSystemDirectoryHandle

      const config1: RepositoryConfig = {
        enableFileSystem: true,
        directoryHandle: handle1,
      }

      RepositoryFactory.configure(config1)
      const callCount1 = vi.mocked(LayeredRepository).mock.calls.length

      // Change directory handle
      const config2: RepositoryConfig = {
        enableFileSystem: true,
        directoryHandle: handle2,
      }

      RepositoryFactory.configure(config2)
      const callCount2 = vi.mocked(LayeredRepository).mock.calls.length

      expect(callCount2).toBeGreaterThan(callCount1)
    })
  })

  describe('reset', () => {
    it('should reset the instance and config', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Configure and get instance
      RepositoryFactory.configure({ enableFileSystem: false })
      const instance1 = RepositoryFactory.getInstance()

      // Reset
      RepositoryFactory.reset()

      expect(consoleSpy).toHaveBeenCalledWith('[RepositoryFactory] Resetting repository instance')

      // Get new instance should create a new one
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const instance2 = RepositoryFactory.getInstance()

      expect(instance2).not.toBe(instance1)
      expect(consoleWarnSpy).toHaveBeenCalled() // Warning about no configured instance

      consoleSpy.mockRestore()
      consoleWarnSpy.mockRestore()
    })
  })

  describe('legacy methods', () => {
    it('create() should call getInstance()', () => {
      const instance = RepositoryFactory.create()

      expect(instance).toBeDefined()
      expect(LayeredRepository).toHaveBeenCalled()
    })

    it('createWithFileSystem() should configure and return instance', () => {
      const mockDirectoryHandle = {} as FileSystemDirectoryHandle

      const instance = RepositoryFactory.createWithFileSystem(mockDirectoryHandle, {
        syncWritesImmediately: true,
        fallbackOnError: false,
      })

      expect(instance).toBeDefined()
      expect(FileSystemLayer).toHaveBeenCalledWith(mockDirectoryHandle)
      expect(LayeredRepository).toHaveBeenCalledWith({
        primaryLayer: expect.any(IndexedDBLayer),
        secondaryLayers: [expect.any(FileSystemLayer)],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: true,
        fallbackOnError: false,
      })
    })

    it('createWithFileSystem() should work without directory handle', () => {
      const instance = RepositoryFactory.createWithFileSystem()

      expect(instance).toBeDefined()
      expect(FileSystemLayer).toHaveBeenCalledWith(undefined)
    })

    it('createWithFileSystem() should use default options when not specified', () => {
      const instance = RepositoryFactory.createWithFileSystem(undefined, {})

      expect(instance).toBeDefined()
      expect(LayeredRepository).toHaveBeenCalledWith(
        expect.objectContaining({
          syncWritesImmediately: false, // Defaults to false
          fallbackOnError: true, // Defaults to true
        }),
      )
    })
  })
})
