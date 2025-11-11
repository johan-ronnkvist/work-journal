import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { LayeredRepository } from '../LayeredRepository'
import { IndexedDBLayer } from '../layers/IndexedDBLayer'
import { FileSystemLayer } from '../layers/FileSystemLayer'
import type { IWeeklyDataLayer } from '../IWeeklyDataLayer'
import type { WeekIdentifier, WeeklyData } from '@/models/WeeklyData'
import type { SaveWeeklyDataInput } from '@/repositories/RepositoryTypes'
import type { ISyncCoordinator } from '../ISyncCoordinator'
import { WEEK_STATUSES } from '@/constants/WeekStatus'
import 'fake-indexeddb/auto'

describe('LayeredRepository', () => {
  let primaryLayer: IndexedDBLayer
  let repository: LayeredRepository

  // Helper to create WeekIdentifier
  const weekId = (year: number, week: number): WeekIdentifier => ({ year, week })

  beforeEach(async () => {
    primaryLayer = new IndexedDBLayer()
    await primaryLayer.clear()
  })

  afterEach(async () => {
    await primaryLayer.clear()
    await primaryLayer.close()
  })

  describe('Single Layer (IndexedDB only)', () => {
    beforeEach(() => {
      repository = new LayeredRepository({
        primaryLayer,
        secondaryLayers: [],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: false,
        fallbackOnError: false,
      })
    })

    it('should save and retrieve data from primary layer', async () => {
      const input: SaveWeeklyDataInput = {
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: 'Great work',
        challenges: 'Some issues',
      }

      const saved = await repository.save(input)
      const retrieved = await repository.get(weekId(2024, 1))

      expect(saved.weekId).toEqual(weekId(2024, 1))
      expect(retrieved).toEqual(saved)
    })

    it('should return null for non-existent data', async () => {
      const result = await repository.get(weekId(2024, 99))
      expect(result).toBeNull()
    })

    it('should retrieve range of data', async () => {
      await repository.save({ weekId: weekId(2024, 10), statusIcon: WEEK_STATUSES[0]!.icon })
      await repository.save({ weekId: weekId(2024, 11), statusIcon: WEEK_STATUSES[0]!.icon })
      await repository.save({ weekId: weekId(2024, 12), statusIcon: WEEK_STATUSES[0]!.icon })

      const result = await repository.getRange(weekId(2024, 10), weekId(2024, 12))

      expect(result).toHaveLength(3)
      expect(result[0]!.weekId.week).toBe(10)
      expect(result[2]!.weekId.week).toBe(12)
    })

    it('should retrieve data by year', async () => {
      await repository.save({ weekId: weekId(2024, 1), statusIcon: WEEK_STATUSES[0]!.icon })
      await repository.save({ weekId: weekId(2024, 15), statusIcon: WEEK_STATUSES[0]!.icon })
      await repository.save({ weekId: weekId(2025, 1), statusIcon: WEEK_STATUSES[0]!.icon })

      const result = await repository.getByYear(2024)

      expect(result).toHaveLength(2)
      expect(result.every((d) => d.weekId.year === 2024)).toBe(true)
    })

    it('should get weeks with data', async () => {
      await repository.save({ weekId: weekId(2024, 1), statusIcon: WEEK_STATUSES[0]!.icon })
      await repository.save({ weekId: weekId(2024, 5), statusIcon: WEEK_STATUSES[0]!.icon })
      await repository.save({ weekId: weekId(2024, 10), statusIcon: WEEK_STATUSES[0]!.icon })

      const result = await repository.getWeeksWithData(2024)

      expect(result.size).toBe(3)
      expect(result.has(1)).toBe(true)
      expect(result.has(5)).toBe(true)
      expect(result.has(10)).toBe(true)
    })

    it('should delete data', async () => {
      await repository.save({ weekId: weekId(2024, 1), statusIcon: WEEK_STATUSES[0]!.icon })

      await repository.delete(weekId(2024, 1))

      const result = await repository.get(weekId(2024, 1))
      expect(result).toBeNull()
    })
  })

  describe('Multiple Layers', () => {
    let secondaryLayer: IWeeklyDataLayer

    beforeEach(() => {
      // Create a mock secondary layer
      secondaryLayer = {
        name: 'secondary',
        priority: 50,
        canRead: true,
        canWrite: true,
        isAvailable: vi.fn().mockResolvedValue(true),
        save: vi.fn().mockImplementation((input: SaveWeeklyDataInput) =>
          Promise.resolve({
            weekId: input.weekId,
            statusIcon: input.statusIcon ?? '❓',
            achievements: input.achievements ?? '',
            challenges: input.challenges ?? '',
          } as WeeklyData),
        ),
        get: vi.fn().mockResolvedValue(null),
        getRange: vi.fn().mockResolvedValue([]),
        getByYear: vi.fn().mockResolvedValue([]),
        getWeeksWithData: vi.fn().mockResolvedValue(new Set()),
        delete: vi.fn().mockResolvedValue(undefined),
      }
    })

    it('should not block on secondary layer sync when syncWritesImmediately is false', async () => {
      // Create a slow secondary layer
      const slowSecondaryLayer = {
        ...secondaryLayer,
        save: vi.fn().mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    weekId: weekId(2024, 1),
                    statusIcon: WEEK_STATUSES[0]!.icon,
                    achievements: '',
                    challenges: '',
                  }),
                100,
              ),
            ),
        ),
      }

      repository = new LayeredRepository({
        primaryLayer,
        secondaryLayers: [slowSecondaryLayer],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: false,
        fallbackOnError: false,
      })

      const input: SaveWeeklyDataInput = {
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[0]!.icon,
      }

      // Should return immediately without waiting for secondary layer
      const startTime = Date.now()
      await repository.save(input)
      const duration = Date.now() - startTime

      // Should complete in less than 50ms (not wait for the 100ms secondary layer)
      expect(duration).toBeLessThan(50)
    })

    it('should sync to secondary layers immediately when syncWritesImmediately is true', async () => {
      const secondaryLayerSaveSpy = vi.spyOn(secondaryLayer, 'save')

      repository = new LayeredRepository({
        primaryLayer,
        secondaryLayers: [secondaryLayer],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: true,
        fallbackOnError: false,
      })

      const input: SaveWeeklyDataInput = {
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: 'Test',
      }

      await repository.save(input)

      expect(secondaryLayerSaveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          weekId: weekId(2024, 1),
          statusIcon: WEEK_STATUSES[0]!.icon,
          achievements: 'Test',
        }),
      )
    })

    it('should delete from secondary layers when syncWritesImmediately is true', async () => {
      const deleteSpy = vi.spyOn(secondaryLayer, 'delete')

      repository = new LayeredRepository({
        primaryLayer,
        secondaryLayers: [secondaryLayer],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: true,
        fallbackOnError: false,
      })

      await repository.delete(weekId(2024, 1))

      expect(deleteSpy).toHaveBeenCalledWith(weekId(2024, 1))
    })
  })

  describe('Fallback Behavior', () => {
    let secondaryLayer: IWeeklyDataLayer
    let failingPrimaryLayer: IWeeklyDataLayer

    beforeEach(() => {
      // Create a primary layer that fails
      failingPrimaryLayer = {
        name: 'failing-primary',
        priority: 100,
        canRead: true,
        canWrite: true,
        isAvailable: vi.fn().mockResolvedValue(true),
        save: vi.fn().mockRejectedValue(new Error('Primary layer failed')),
        get: vi.fn().mockRejectedValue(new Error('Primary layer failed')),
        getRange: vi.fn().mockRejectedValue(new Error('Primary layer failed')),
        getByYear: vi.fn().mockRejectedValue(new Error('Primary layer failed')),
        getWeeksWithData: vi.fn().mockRejectedValue(new Error('Primary layer failed')),
        delete: vi.fn().mockRejectedValue(new Error('Primary layer failed')),
      }

      // Create a working secondary layer
      secondaryLayer = {
        name: 'secondary',
        priority: 50,
        canRead: true,
        canWrite: true,
        isAvailable: vi.fn().mockResolvedValue(true),
        save: vi.fn().mockImplementation((input: SaveWeeklyDataInput) =>
          Promise.resolve({
            weekId: input.weekId,
            statusIcon: input.statusIcon ?? '❓',
            achievements: input.achievements ?? '',
            challenges: input.challenges ?? '',
          } as WeeklyData),
        ),
        get: vi.fn().mockResolvedValue({
          weekId: weekId(2024, 1),
          statusIcon: WEEK_STATUSES[0]!.icon,
          achievements: 'From secondary',
          challenges: '',
        } as WeeklyData),
        getRange: vi.fn().mockResolvedValue([
          {
            weekId: weekId(2024, 1),
            statusIcon: WEEK_STATUSES[0]!.icon,
            achievements: '',
            challenges: '',
          } as WeeklyData,
        ]),
        getByYear: vi.fn().mockResolvedValue([
          {
            weekId: weekId(2024, 1),
            statusIcon: WEEK_STATUSES[0]!.icon,
            achievements: '',
            challenges: '',
          } as WeeklyData,
        ]),
        getWeeksWithData: vi.fn().mockResolvedValue(new Set([1, 2, 3])),
        delete: vi.fn().mockResolvedValue(undefined),
      }
    })

    it('should fallback to secondary layer on get when primary fails', async () => {
      repository = new LayeredRepository({
        primaryLayer: failingPrimaryLayer,
        secondaryLayers: [secondaryLayer],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: false,
        fallbackOnError: true,
      })

      const result = await repository.get(weekId(2024, 1))

      expect(result).not.toBeNull()
      expect(result!.achievements).toBe('From secondary')
      expect(secondaryLayer.get).toHaveBeenCalledWith(weekId(2024, 1))
    })

    it('should fallback to secondary layer on getRange when primary fails', async () => {
      repository = new LayeredRepository({
        primaryLayer: failingPrimaryLayer,
        secondaryLayers: [secondaryLayer],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: false,
        fallbackOnError: true,
      })

      const result = await repository.getRange(weekId(2024, 1), weekId(2024, 10))

      expect(result).toHaveLength(1)
      expect(secondaryLayer.getRange).toHaveBeenCalled()
    })

    it('should throw error when fallbackOnError is false', async () => {
      repository = new LayeredRepository({
        primaryLayer: failingPrimaryLayer,
        secondaryLayers: [secondaryLayer],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: false,
        fallbackOnError: false,
      })

      await expect(repository.get(weekId(2024, 1))).rejects.toThrow('Primary layer failed')
    })
  })

  describe('Sync Coordinator Integration', () => {
    let syncCoordinator: ISyncCoordinator

    beforeEach(() => {
      syncCoordinator = {
        syncItem: vi.fn().mockResolvedValue({ success: true }),
        syncRange: vi.fn().mockResolvedValue([]),
        startBackgroundSync: vi.fn(),
        stopBackgroundSync: vi.fn(),
        getSyncStatus: vi.fn().mockResolvedValue({
          lastSyncedAt: null,
          isDirty: false,
          authoritative: 'indexeddb',
          hasConflict: false,
        }),
        onSyncEvent: vi.fn().mockReturnValue(() => {}),
        syncAll: vi.fn().mockResolvedValue([]),
      }
    })

    it('should trigger background sync on get when sync coordinator is provided', async () => {
      const syncItemSpy = vi.spyOn(syncCoordinator, 'syncItem')

      repository = new LayeredRepository({
        primaryLayer,
        secondaryLayers: [],
        syncCoordinator,
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: false,
        fallbackOnError: false,
      })

      await repository.save({ weekId: weekId(2024, 1), statusIcon: WEEK_STATUSES[0]!.icon })
      await repository.get(weekId(2024, 1))

      // Give time for background sync to be triggered
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(syncItemSpy).toHaveBeenCalledWith(weekId(2024, 1))
    })

    it('should not fail get operation if background sync fails', async () => {
      syncCoordinator.syncItem = vi.fn().mockRejectedValue(new Error('Sync failed'))

      repository = new LayeredRepository({
        primaryLayer,
        secondaryLayers: [],
        syncCoordinator,
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: false,
        fallbackOnError: false,
      })

      await repository.save({ weekId: weekId(2024, 1), statusIcon: WEEK_STATUSES[0]!.icon })

      // Should not throw even if sync fails
      await expect(repository.get(weekId(2024, 1))).resolves.not.toThrow()
    })
  })

  describe('FileSystemLayer Integration', () => {
    let fileSystemLayer: FileSystemLayer
    let mockDirectory: FileSystemDirectoryHandle

    beforeEach(() => {
      // Create a mock FileSystemDirectoryHandle
      const files = new Map<string, string>()

      mockDirectory = {
        kind: 'directory',
        name: 'test-directory',
        queryPermission: vi.fn().mockResolvedValue('granted'),
        requestPermission: vi.fn().mockResolvedValue('granted'),
        getFileHandle: vi.fn().mockImplementation((name: string) => {
          return {
            kind: 'file',
            name,
            getFile: async () => {
              const content = files.get(name)
              if (!content) {
                const error = new Error('File not found')
                error.name = 'NotFoundError'
                throw error
              }
              const file = new File([content], name, { type: 'application/json' })
              // Ensure text() method exists (needed for test environment)
              if (!file.text) {
                (file as File & { text: () => Promise<string> }).text = async () => content
              }
              return file
            },
            createWritable: async () => {
              let content = ''
              return {
                write: async (chunk: string) => {
                  content += chunk
                },
                close: async () => {
                  files.set(name, content)
                },
              }
            },
          }
        }),
        removeEntry: vi.fn().mockImplementation((name: string) => {
          if (!files.has(name)) {
            const error = new Error('File not found')
            error.name = 'NotFoundError'
            throw error
          }
          files.delete(name)
        }),
        values: async function* () {
          for (const [name] of files) {
            yield { kind: 'file', name } as FileSystemHandle
          }
        },
      } as unknown as FileSystemDirectoryHandle

      fileSystemLayer = new FileSystemLayer(mockDirectory)

      // Mock showDirectoryPicker
      type WindowWithFS = Window & { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }
      ;(window as unknown as WindowWithFS).showDirectoryPicker = vi
        .fn()
        .mockResolvedValue(mockDirectory)
    })

    afterEach(() => {
      fileSystemLayer.reset()
    })

    it('should sync writes to FileSystemLayer as secondary layer', async () => {
      repository = new LayeredRepository({
        primaryLayer,
        secondaryLayers: [fileSystemLayer],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: true,
        fallbackOnError: false,
      })

      const input: SaveWeeklyDataInput = {
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: 'Test achievements',
        challenges: 'Test challenges',
      }

      await repository.save(input)

      // Verify data is in both layers
      const fromPrimary = await primaryLayer.get(weekId(2024, 1))
      const fromSecondary = await fileSystemLayer.get(weekId(2024, 1))

      expect(fromPrimary).not.toBeNull()
      expect(fromSecondary).not.toBeNull()
      expect(fromSecondary!.achievements).toBe('Test achievements')
    })

    it('should read from IndexedDB (primary) even when FileSystemLayer has data', async () => {
      repository = new LayeredRepository({
        primaryLayer,
        secondaryLayers: [fileSystemLayer],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: true,
        fallbackOnError: false,
      })

      // Populate both layers with different data
      await primaryLayer.save({
        weekId: weekId(2024, 1),
        statusIcon: '✅',
        achievements: 'From IndexedDB',
      })

      await fileSystemLayer.save({
        weekId: weekId(2024, 1),
        statusIcon: '❌',
        achievements: 'From FileSystem',
      })

      // Should read from primary layer (IndexedDB)
      const result = await repository.get(weekId(2024, 1))

      expect(result?.achievements).toBe('From IndexedDB')
      expect(result?.statusIcon).toBe('✅')
    })

    it('should fallback to FileSystemLayer when IndexedDB fails', async () => {
      const failingPrimaryLayer: IWeeklyDataLayer = {
        name: 'failing-indexeddb',
        priority: 100,
        canRead: true,
        canWrite: true,
        isAvailable: vi.fn().mockResolvedValue(true),
        save: vi.fn().mockRejectedValue(new Error('IndexedDB failed')),
        get: vi.fn().mockRejectedValue(new Error('IndexedDB failed')),
        getRange: vi.fn().mockRejectedValue(new Error('IndexedDB failed')),
        getByYear: vi.fn().mockRejectedValue(new Error('IndexedDB failed')),
        getWeeksWithData: vi.fn().mockRejectedValue(new Error('IndexedDB failed')),
        delete: vi.fn().mockRejectedValue(new Error('IndexedDB failed')),
      }

      // Pre-populate FileSystemLayer with data
      await fileSystemLayer.save({
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: 'From FileSystem',
      })

      repository = new LayeredRepository({
        primaryLayer: failingPrimaryLayer,
        secondaryLayers: [fileSystemLayer],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: false,
        fallbackOnError: true,
      })

      const result = await repository.get(weekId(2024, 1))

      expect(result).not.toBeNull()
      expect(result!.achievements).toBe('From FileSystem')
    })

    it('should sync delete operations to FileSystemLayer', async () => {
      repository = new LayeredRepository({
        primaryLayer,
        secondaryLayers: [fileSystemLayer],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: true,
        fallbackOnError: false,
      })

      // Save to both layers
      await repository.save({
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[0]!.icon,
      })

      // Verify data exists in both
      expect(await primaryLayer.get(weekId(2024, 1))).not.toBeNull()
      expect(await fileSystemLayer.get(weekId(2024, 1))).not.toBeNull()

      // Delete from repository
      await repository.delete(weekId(2024, 1))

      // Verify data is deleted from both layers
      expect(await primaryLayer.get(weekId(2024, 1))).toBeNull()
      expect(await fileSystemLayer.get(weekId(2024, 1))).toBeNull()
    })

    it('should handle multiple secondary layers with different priorities', async () => {
      const mockLayer2 = {
        name: 'mock-layer-2',
        priority: 40,
        canRead: true,
        canWrite: true,
        isAvailable: vi.fn().mockResolvedValue(true),
        save: vi.fn().mockImplementation((input: SaveWeeklyDataInput) =>
          Promise.resolve({
            weekId: input.weekId,
            statusIcon: input.statusIcon ?? '❓',
            achievements: input.achievements ?? '',
            challenges: input.challenges ?? '',
          } as WeeklyData),
        ),
        get: vi.fn().mockResolvedValue(null),
        getRange: vi.fn().mockResolvedValue([]),
        getByYear: vi.fn().mockResolvedValue([]),
        getWeeksWithData: vi.fn().mockResolvedValue(new Set()),
        delete: vi.fn().mockResolvedValue(undefined),
      }

      repository = new LayeredRepository({
        primaryLayer,
        secondaryLayers: [fileSystemLayer, mockLayer2],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: true,
        fallbackOnError: false,
      })

      await repository.save({
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[0]!.icon,
      })

      // Both secondary layers should have been called
      expect(await fileSystemLayer.get(weekId(2024, 1))).not.toBeNull()
      expect(mockLayer2.save).toHaveBeenCalled()
    })

    it('should handle non-blocking sync with FileSystemLayer', async () => {
      repository = new LayeredRepository({
        primaryLayer,
        secondaryLayers: [fileSystemLayer],
        conflictResolution: 'last-write-wins',
        syncWritesImmediately: false, // Background sync
        fallbackOnError: false,
      })

      const startTime = Date.now()
      await repository.save({
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[0]!.icon,
      })
      const duration = Date.now() - startTime

      // Should complete quickly without waiting for filesystem sync
      expect(duration).toBeLessThan(100)

      // Data should be in primary immediately
      expect(await primaryLayer.get(weekId(2024, 1))).not.toBeNull()
    })
  })
})
