import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FileSystemLayer } from '../FileSystemLayer'
import type { WeekIdentifier } from '@/models/WeeklyData'
import type { SaveWeeklyDataInput } from '@/repositories/RepositoryTypes'
import { WEEK_STATUSES } from '@/constants/WeekStatus'

/**
 * Mock FileSystemDirectoryHandle for testing
 * Simulates File System Access API in memory
 */
class MockFileSystemDirectoryHandle implements FileSystemDirectoryHandle {
  readonly kind = 'directory' as const
  readonly name: string
  private files = new Map<string, string>()

  constructor(name = 'test-directory') {
    this.name = name
  }

  async queryPermission(): Promise<PermissionState> {
    return 'granted'
  }

  async requestPermission(): Promise<PermissionState> {
    return 'granted'
  }

  async getFileHandle(name: string): Promise<FileSystemFileHandle> {
    return new MockFileSystemFileHandle(name, this)
  }

  async getDirectoryHandle(): Promise<FileSystemDirectoryHandle> {
    throw new Error('Subdirectories not supported in mock')
  }

  async removeEntry(name: string): Promise<void> {
    if (!this.files.has(name)) {
      const error = new Error('File not found')
      error.name = 'NotFoundError'
      throw error
    }
    this.files.delete(name)
  }

  async resolve(): Promise<string[] | null> {
    return null
  }

  async isSameEntry(other: FileSystemHandle): Promise<boolean> {
    return other === this
  }

  async *entries(): AsyncIterableIterator<[string, FileSystemHandle]> {
    for (const [name] of this.files) {
      yield [name, new MockFileSystemFileHandle(name, this)]
    }
  }

  async *keys(): AsyncIterableIterator<string> {
    for (const name of this.files.keys()) {
      yield name
    }
  }

  async *values(): AsyncIterableIterator<FileSystemHandle> {
    for (const [name] of this.files) {
      yield new MockFileSystemFileHandle(name, this)
    }
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<[string, FileSystemHandle]> {
    return this.entries()
  }

  // Helper methods for testing
  _setFileContent(name: string, content: string): void {
    this.files.set(name, content)
  }

  _getFileContent(name: string): string | undefined {
    return this.files.get(name)
  }

  _hasFile(name: string): boolean {
    return this.files.has(name)
  }

  _clear(): void {
    this.files.clear()
  }
}

/**
 * Mock FileSystemFileHandle for testing
 */
class MockFileSystemFileHandle implements FileSystemFileHandle {
  readonly kind = 'file' as const
  readonly name: string
  private directory: MockFileSystemDirectoryHandle

  constructor(name: string, directory: MockFileSystemDirectoryHandle) {
    this.name = name
    this.directory = directory
  }

  async queryPermission(): Promise<PermissionState> {
    return 'granted'
  }

  async requestPermission(): Promise<PermissionState> {
    return 'granted'
  }

  async getFile(): Promise<File> {
    const content = this.directory._getFileContent(this.name)
    if (content === undefined) {
      const error = new Error('File not found')
      error.name = 'NotFoundError'
      throw error
    }
    const file = new File([content], this.name, { type: 'application/json' })
    // Ensure text() method exists (needed for test environment)
    if (!file.text) {
      (file as File & { text: () => Promise<string> }).text = async () => content
    }
    return file
  }

  async createWritable(): Promise<FileSystemWritableFileStream> {
    return new MockFileSystemWritableFileStream(this.name, this.directory) as unknown as FileSystemWritableFileStream
  }

  async isSameEntry(other: FileSystemHandle): Promise<boolean> {
    return other === this
  }
}

/**
 * Mock FileSystemWritableFileStream for testing
 * Note: File System Access API's FileSystemWritableFileStream has write/close methods
 * not just the WritableStream interface
 */
class MockFileSystemWritableFileStream {
  private content = ''
  private name: string
  private directory: MockFileSystemDirectoryHandle

  constructor(name: string, directory: MockFileSystemDirectoryHandle) {
    this.name = name
    this.directory = directory
  }

  async write(chunk: string | ArrayBuffer | ArrayBufferView): Promise<void> {
    if (typeof chunk === 'string') {
      this.content += chunk
    } else if (chunk instanceof ArrayBuffer || ArrayBuffer.isView(chunk)) {
      const decoder = new TextDecoder()
      this.content += decoder.decode(chunk)
    }
  }

  async close(): Promise<void> {
    this.directory._setFileContent(this.name, this.content)
  }
}

describe('FileSystemLayer', () => {
  let layer: FileSystemLayer
  let mockDirectory: MockFileSystemDirectoryHandle

  // Helper to create WeekIdentifier
  const weekId = (year: number, week: number): WeekIdentifier => ({ year, week })

  beforeEach(() => {
    mockDirectory = new MockFileSystemDirectoryHandle()
    layer = new FileSystemLayer(mockDirectory)

    // Mock the File System Access API
    type WindowWithFS = Window & { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }
    ;(window as unknown as WindowWithFS).showDirectoryPicker = vi
      .fn()
      .mockResolvedValue(mockDirectory)
  })

  afterEach(() => {
    mockDirectory._clear()
    layer.reset()
  })

  describe('Layer Properties', () => {
    it('should have correct layer metadata', () => {
      expect(layer.name).toBe('filesystem')
      expect(layer.priority).toBe(50)
      expect(layer.canRead).toBe(true)
      expect(layer.canWrite).toBe(true)
    })

    it('should report availability when File System Access API is present', async () => {
      const isAvailable = await layer.isAvailable()
      expect(isAvailable).toBe(true)
    })

    it('should report unavailable when File System Access API is missing', async () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'showDirectoryPicker')

      // Delete the property from window
      delete (window as Partial<Window>).showDirectoryPicker

      const layerWithoutAPI = new FileSystemLayer()
      const isAvailable = await layerWithoutAPI.isAvailable()
      expect(isAvailable).toBe(false)

      // Restore the API
      if (originalDescriptor) {
        Object.defineProperty(window, 'showDirectoryPicker', originalDescriptor)
      }
    })
  })

  describe('save - Create Operations', () => {
    it('should create a new weekly data entry', async () => {
      const input: SaveWeeklyDataInput = {
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: 'Great work',
        challenges: 'Some issues',
      }

      const result = await layer.save(input)

      expect(result.weekId).toEqual(weekId(2024, 1))
      expect(result.statusIcon).toBe(WEEK_STATUSES[0]!.icon)
      expect(result.achievements).toBe('Great work')
      expect(result.challenges).toBe('Some issues')

      // Verify file was created
      expect(mockDirectory._hasFile('work-journal-2024.json')).toBe(true)
    })

    it('should create entry with default values when optional fields not provided', async () => {
      const input: SaveWeeklyDataInput = {
        weekId: weekId(2024, 1),
      }

      const result = await layer.save(input)

      expect(result.weekId).toEqual(weekId(2024, 1))
      expect(result.statusIcon).toBe('❔') // Unknown status
      expect(result.achievements).toBe('')
      expect(result.challenges).toBe('')
    })

    it('should use correct filename format', async () => {
      await layer.save({ weekId: weekId(2024, 5) })
      expect(mockDirectory._hasFile('work-journal-2024.json')).toBe(true)

      await layer.save({ weekId: weekId(2025, 15) })
      expect(mockDirectory._hasFile('work-journal-2025.json')).toBe(true)
    })
  })

  describe('save - Update Operations', () => {
    it('should update existing entry', async () => {
      // Create initial entry
      await layer.save({
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: 'Initial achievements',
        challenges: 'Initial challenges',
      })

      // Update the entry
      const updated = await layer.save({
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[1]!.icon,
        achievements: 'Updated achievements',
      })

      expect(updated.statusIcon).toBe(WEEK_STATUSES[1]!.icon)
      expect(updated.achievements).toBe('Updated achievements')
      expect(updated.challenges).toBe('Initial challenges') // Should be preserved
    })

    it('should preserve unspecified fields during update', async () => {
      await layer.save({
        weekId: weekId(2024, 10),
        statusIcon: '✅',
        achievements: 'Original achievements',
        challenges: 'Original challenges',
      })

      await layer.save({
        weekId: weekId(2024, 10),
        achievements: 'New achievements',
      })

      const result = await layer.get(weekId(2024, 10))
      expect(result?.statusIcon).toBe('✅')
      expect(result?.achievements).toBe('New achievements')
      expect(result?.challenges).toBe('Original challenges')
    })
  })

  describe('get', () => {
    it('should retrieve existing weekly data', async () => {
      const input: SaveWeeklyDataInput = {
        weekId: weekId(2024, 15),
        statusIcon: WEEK_STATUSES[2]!.icon,
        achievements: 'Test achievements',
        challenges: 'Test challenges',
      }

      await layer.save(input)
      const result = await layer.get(weekId(2024, 15))

      expect(result).not.toBeNull()
      expect(result!.weekId).toEqual(weekId(2024, 15))
      expect(result!.statusIcon).toBe(WEEK_STATUSES[2]!.icon)
      expect(result!.achievements).toBe('Test achievements')
    })

    it('should return null for non-existent weekly data', async () => {
      const result = await layer.get(weekId(2024, 99))
      expect(result).toBeNull()
    })

    it('should parse JSON correctly', async () => {
      await layer.save({
        weekId: weekId(2024, 20),
        achievements: 'Multi\nline\ntext',
        challenges: 'With "quotes" and special chars',
      })

      const result = await layer.get(weekId(2024, 20))
      expect(result?.achievements).toBe('Multi\nline\ntext')
      expect(result?.challenges).toBe('With "quotes" and special chars')
    })
  })

  describe('getRange', () => {
    beforeEach(async () => {
      // Create test data for weeks 10-15 of 2024
      for (let week = 10; week <= 15; week++) {
        await layer.save({
          weekId: weekId(2024, week),
          statusIcon: WEEK_STATUSES[0]!.icon,
          achievements: `Week ${week} achievements`,
        })
      }
    })

    it('should retrieve a range of weekly data', async () => {
      const result = await layer.getRange(weekId(2024, 12), weekId(2024, 14))

      expect(result).toHaveLength(3)
      expect(result[0]!.weekId).toEqual(weekId(2024, 12))
      expect(result[1]!.weekId).toEqual(weekId(2024, 13))
      expect(result[2]!.weekId).toEqual(weekId(2024, 14))
    })

    it('should return results sorted by date', async () => {
      const result = await layer.getRange(weekId(2024, 10), weekId(2024, 15))

      expect(result).toHaveLength(6)
      for (let i = 0; i < result.length - 1; i++) {
        const current = result[i]!.weekId
        const next = result[i + 1]!.weekId
        expect(
          current.year < next.year || (current.year === next.year && current.week < next.week),
        ).toBe(true)
      }
    })

    it('should return empty array for range with no data', async () => {
      const result = await layer.getRange(weekId(2025, 1), weekId(2025, 10))
      expect(result).toEqual([])
    })

    it('should handle cross-year ranges', async () => {
      await layer.save({ weekId: weekId(2023, 52), statusIcon: '✅' })
      await layer.save({ weekId: weekId(2024, 1), statusIcon: '✅' })

      const result = await layer.getRange(weekId(2023, 52), weekId(2024, 1))

      expect(result).toHaveLength(2)
      expect(result[0]!.weekId.year).toBe(2023)
      expect(result[1]!.weekId.year).toBe(2024)
    })
  })

  describe('getByYear', () => {
    beforeEach(async () => {
      // Create test data for 2024
      await layer.save({ weekId: weekId(2024, 1), statusIcon: WEEK_STATUSES[0]!.icon })
      await layer.save({ weekId: weekId(2024, 15), statusIcon: WEEK_STATUSES[1]!.icon })
      await layer.save({ weekId: weekId(2024, 52), statusIcon: WEEK_STATUSES[2]!.icon })

      // Create test data for 2025
      await layer.save({ weekId: weekId(2025, 1), statusIcon: WEEK_STATUSES[0]!.icon })
    })

    it('should retrieve all weekly data for a given year', async () => {
      const result = await layer.getByYear(2024)

      expect(result).toHaveLength(3)
      expect(result[0]!.weekId.year).toBe(2024)
      expect(result[1]!.weekId.year).toBe(2024)
      expect(result[2]!.weekId.year).toBe(2024)
    })

    it('should not include data from other years', async () => {
      const result = await layer.getByYear(2024)

      for (const data of result) {
        expect(data.weekId.year).toBe(2024)
      }
    })

    it('should return empty array for year with no data', async () => {
      const result = await layer.getByYear(2023)
      expect(result).toEqual([])
    })
  })

  describe('getWeeksWithData', () => {
    beforeEach(async () => {
      // Create sparse data
      await layer.save({ weekId: weekId(2024, 1), statusIcon: WEEK_STATUSES[0]!.icon })
      await layer.save({ weekId: weekId(2024, 5), statusIcon: WEEK_STATUSES[0]!.icon })
      await layer.save({ weekId: weekId(2024, 15), statusIcon: WEEK_STATUSES[0]!.icon })
      await layer.save({ weekId: weekId(2024, 52), statusIcon: WEEK_STATUSES[0]!.icon })
    })

    it('should return set of week numbers with data', async () => {
      const result = await layer.getWeeksWithData(2024)

      expect(result).toBeInstanceOf(Set)
      expect(result.size).toBe(4)
      expect(result.has(1)).toBe(true)
      expect(result.has(5)).toBe(true)
      expect(result.has(15)).toBe(true)
      expect(result.has(52)).toBe(true)
    })

    it('should return empty set for year with no data', async () => {
      const result = await layer.getWeeksWithData(2025)

      expect(result).toBeInstanceOf(Set)
      expect(result.size).toBe(0)
    })

    it('should only include weeks for specified year', async () => {
      await layer.save({ weekId: weekId(2025, 1), statusIcon: '✅' })

      const result = await layer.getWeeksWithData(2024)

      expect(result.has(1)).toBe(true) // 2024-W01
      expect(result.size).toBe(4) // Should not include 2025-W01
    })
  })

  describe('delete', () => {
    it('should delete existing weekly data from year file', async () => {
      await layer.save({
        weekId: weekId(2024, 10),
        statusIcon: WEEK_STATUSES[0]!.icon,
      })

      expect(mockDirectory._hasFile('work-journal-2024.json')).toBe(true)

      await layer.delete(weekId(2024, 10))

      // Week should be removed but year file might still exist if there are other weeks
      const result = await layer.get(weekId(2024, 10))
      expect(result).toBeNull()
    })

    it('should delete entire year file when last week is deleted', async () => {
      await layer.save({
        weekId: weekId(2024, 10),
        statusIcon: WEEK_STATUSES[0]!.icon,
      })

      expect(mockDirectory._hasFile('work-journal-2024.json')).toBe(true)

      await layer.delete(weekId(2024, 10))

      // Year file should be deleted since it was the only week
      expect(mockDirectory._hasFile('work-journal-2024.json')).toBe(false)
    })

    it('should keep year file when deleting one of multiple weeks', async () => {
      await layer.save({ weekId: weekId(2024, 10), statusIcon: WEEK_STATUSES[0]!.icon })
      await layer.save({ weekId: weekId(2024, 20), statusIcon: WEEK_STATUSES[1]!.icon })

      await layer.delete(weekId(2024, 10))

      // Year file should still exist
      expect(mockDirectory._hasFile('work-journal-2024.json')).toBe(true)
      // Week 10 should be gone
      expect(await layer.get(weekId(2024, 10))).toBeNull()
      // Week 20 should still be there
      expect(await layer.get(weekId(2024, 20))).not.toBeNull()
    })

    it('should not throw when deleting non-existent data', async () => {
      await expect(layer.delete(weekId(2024, 99))).resolves.not.toThrow()
    })
  })

  describe('clear', () => {
    it('should remove all data', async () => {
      await layer.save({ weekId: weekId(2024, 1), statusIcon: WEEK_STATUSES[0]!.icon })
      await layer.save({ weekId: weekId(2024, 2), statusIcon: WEEK_STATUSES[0]!.icon })
      await layer.save({ weekId: weekId(2025, 3), statusIcon: WEEK_STATUSES[0]!.icon })

      expect(mockDirectory._hasFile('work-journal-2024.json')).toBe(true)
      expect(mockDirectory._hasFile('work-journal-2025.json')).toBe(true)

      await layer.clear()

      expect(mockDirectory._hasFile('work-journal-2024.json')).toBe(false)
      expect(mockDirectory._hasFile('work-journal-2025.json')).toBe(false)

      const result = await layer.getByYear(2024)
      expect(result).toEqual([])
    })

    it('should only remove journal files', async () => {
      await layer.save({ weekId: weekId(2024, 1), statusIcon: '✅' })
      mockDirectory._setFileContent('other-file.txt', 'some content')

      await layer.clear()

      expect(mockDirectory._hasFile('work-journal-2024.json')).toBe(false)
      expect(mockDirectory._hasFile('other-file.txt')).toBe(true)
    })
  })

  describe('reset and directory handle management', () => {
    it('should reset directory handle', () => {
      layer.reset()
      expect(layer.getDirectoryHandleSync()).toBeNull()
    })

    it('should set new directory handle', () => {
      const newDirectory = new MockFileSystemDirectoryHandle('new-dir')
      layer.setDirectoryHandle(newDirectory)
      expect(layer.getDirectoryHandleSync()).toBe(newDirectory)
    })

    it('should get directory handle synchronously', () => {
      const handle = layer.getDirectoryHandleSync()
      expect(handle).toBe(mockDirectory)
    })
  })

  describe('filename parsing', () => {
    it('should correctly format year filenames', async () => {
      await layer.save({ weekId: weekId(2024, 1) })
      expect(mockDirectory._hasFile('work-journal-2024.json')).toBe(true)

      await layer.save({ weekId: weekId(2025, 1) })
      expect(mockDirectory._hasFile('work-journal-2025.json')).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle invalid JSON gracefully', async () => {
      // Manually create invalid JSON file
      mockDirectory._setFileContent('work-journal-2024.json', 'invalid json {{{')

      // Should throw on invalid JSON
      await expect(layer.get(weekId(2024, 1))).rejects.toThrow()
    })
  })
})
