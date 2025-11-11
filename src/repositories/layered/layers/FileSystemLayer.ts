import type { WeeklyData, WeekIdentifier } from '@/models/WeeklyData'
import type { SaveWeeklyDataInput } from '@/repositories/RepositoryTypes'
import type { IWeeklyDataLayer } from '../IWeeklyDataLayer'
import { DEFAULT_WEEKLY_DATA_VALUES } from '@/models/WeeklyData.defaults'
import {
  loadDirectoryHandle,
  saveDirectoryHandle,
} from '@/utils/directoryHandleStorage'

// Type augmentations for File System Access API
declare global {
  interface Window {
    showDirectoryPicker(options?: {
      mode?: 'read' | 'readwrite'
      startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
    }): Promise<FileSystemDirectoryHandle>
  }

  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemHandle>
    queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
    requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
  }
}

/**
 * Represents the structure of a year's journal file
 */
interface YearJournalData {
  year: number
  weeks: Record<number, WeeklyData>
}

/**
 * File system storage layer using File System Access API
 * Stores all weeks for a year in a single JSON file (work-journal-YYYY.json)
 * Suitable as a secondary layer for persistence and backup
 */
export class FileSystemLayer implements IWeeklyDataLayer {
  readonly name = 'filesystem'
  readonly priority = 50 // Lower than IndexedDB (fallback/secondary layer)
  readonly canRead = true
  readonly canWrite = true

  private directoryHandle: FileSystemDirectoryHandle | null = null
  private initPromise: Promise<void> | null = null

  /**
   * Creates a FileSystemLayer
   * @param directoryHandle - Optional pre-authorized directory handle
   */
  constructor(directoryHandle?: FileSystemDirectoryHandle) {
    this.directoryHandle = directoryHandle ?? null
  }

  async isAvailable(): Promise<boolean> {
    // Check if File System Access API is available
    if (!('showDirectoryPicker' in window)) {
      return false
    }

    // If we have a directory handle, verify we still have permission
    if (this.directoryHandle) {
      try {
        const permission = await this.directoryHandle.queryPermission({ mode: 'readwrite' })
        return permission === 'granted'
      } catch {
        return false
      }
    }

    // No directory handle yet, but API is available
    return true
  }

  /**
   * Initialize the layer by requesting directory access if needed
   * This will prompt the user to select a directory if not already set
   * Automatically loads persisted directory handle from IndexedDB
   */
  private async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = (async () => {
      if (!this.directoryHandle) {
        // Try to load persisted directory handle first
        const persistedHandle = await loadDirectoryHandle()
        if (persistedHandle) {
          this.directoryHandle = persistedHandle
          console.log('[FileSystemLayer] Loaded persisted directory handle')
        } else {
          // No persisted handle, request directory access from user
          try {
            this.directoryHandle = await window.showDirectoryPicker({
              mode: 'readwrite',
              startIn: 'documents',
            })
            // Persist the newly selected handle
            await saveDirectoryHandle(this.directoryHandle)
            console.log('[FileSystemLayer] Saved new directory handle')
          } catch (error) {
            throw new Error(`Failed to get directory access: ${error}`)
          }
        }
      }

      // Verify we have write permission
      const permission = await this.directoryHandle.queryPermission({ mode: 'readwrite' })
      if (permission !== 'granted') {
        const requestedPermission = await this.directoryHandle.requestPermission({
          mode: 'readwrite',
        })
        if (requestedPermission !== 'granted') {
          throw new Error('Write permission denied for directory')
        }
      }
    })()

    return this.initPromise
  }

  /**
   * Gets the directory handle, ensuring initialization
   */
  private async getDirectoryHandle(): Promise<FileSystemDirectoryHandle> {
    await this.init()
    if (!this.directoryHandle) {
      throw new Error('Directory handle not initialized')
    }
    return this.directoryHandle
  }

  /**
   * Generates filename for a year (e.g., "work-journal-2024.json")
   */
  private getFileName(year: number): string {
    return `work-journal-${year}.json`
  }

  /**
   * Parses a filename back to year
   * Returns null if filename doesn't match expected format
   */
  private parseFileName(fileName: string): number | null {
    const match = fileName.match(/^work-journal-(\d{4})\.json$/)
    if (!match || !match[1]) {
      return null
    }
    return parseInt(match[1], 10)
  }

  /**
   * Ensures the WeekIdentifier is a plain object
   */
  private toPlainWeekId(weekId: WeekIdentifier): WeekIdentifier {
    return {
      year: weekId.year,
      week: weekId.week,
    }
  }

  /**
   * Reads and parses a year's journal file
   */
  private async readYearFile(year: number): Promise<YearJournalData | null> {
    try {
      const dirHandle = await this.getDirectoryHandle()
      const fileName = this.getFileName(year)
      const fileHandle = await dirHandle.getFileHandle(fileName)
      const file = await fileHandle.getFile()
      const text = await file.text()
      const data = JSON.parse(text) as YearJournalData
      return data
    } catch (error) {
      // File not found or parse error
      if (error instanceof Error && error.name === 'NotFoundError') {
        return null
      }
      throw error
    }
  }

  /**
   * Writes a year's journal file
   * Note: The File System Access API's createWritable() provides atomic writes by default
   * as it writes to a temporary file and swaps it on close()
   */
  private async writeYearFile(year: number, data: YearJournalData): Promise<void> {
    const fileName = this.getFileName(year)
    try {
      const dirHandle = await this.getDirectoryHandle()
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(JSON.stringify(data, null, 2))
      await writable.close()
    } catch (error) {
      throw new Error(`Failed to write file ${fileName}: ${error}`)
    }
  }

  async save(input: SaveWeeklyDataInput): Promise<WeeklyData> {
    const identifier = this.toPlainWeekId(input.weekId)
    const year = identifier.year
    const weekNumber = identifier.week

    // Read existing year file or create new structure
    let yearData = await this.readYearFile(year)
    if (!yearData) {
      yearData = {
        year,
        weeks: {},
      }
    }

    // Get existing week data if any
    const existing = yearData.weeks[weekNumber]

    // Build data to save, merging with existing data if present
    const dataToSave: WeeklyData = {
      weekId: identifier,
      statusIcon:
        input.statusIcon ?? existing?.statusIcon ?? DEFAULT_WEEKLY_DATA_VALUES.statusIcon,
      achievements:
        input.achievements ?? existing?.achievements ?? DEFAULT_WEEKLY_DATA_VALUES.achievements,
      challenges:
        input.challenges ?? existing?.challenges ?? DEFAULT_WEEKLY_DATA_VALUES.challenges,
    }

    // Update the week data in the year structure
    yearData.weeks[weekNumber] = dataToSave

    // Write the entire year file back
    await this.writeYearFile(year, yearData)

    return dataToSave
  }

  async get(weekId: WeekIdentifier): Promise<WeeklyData | null> {
    const yearData = await this.readYearFile(weekId.year)
    if (!yearData) {
      return null
    }
    return yearData.weeks[weekId.week] ?? null
  }

  async getRange(start: WeekIdentifier, end: WeekIdentifier): Promise<WeeklyData[]> {
    const dirHandle = await this.getDirectoryHandle()
    const results: WeeklyData[] = []

    // Determine which years are in the range
    const startYear = start.year
    const endYear = end.year

    // Iterate through all year files in the directory
    for await (const entry of dirHandle.values()) {
      if (entry.kind !== 'file' || !entry.name.endsWith('.json')) {
        continue
      }

      const year = this.parseFileName(entry.name)
      if (!year || year < startYear || year > endYear) {
        continue
      }

      // Read the year file
      const yearData = await this.readYearFile(year)
      if (!yearData) {
        continue
      }

      // Extract weeks that are in range
      for (const [weekNum, weekData] of Object.entries(yearData.weeks)) {
        const weekNumber = parseInt(weekNum, 10)
        const weekId = { year, week: weekNumber }

        // Check if week is in range
        const isInRange =
          (weekId.year > start.year || (weekId.year === start.year && weekId.week >= start.week)) &&
          (weekId.year < end.year || (weekId.year === end.year && weekId.week <= end.week))

        if (isInRange) {
          results.push(weekData)
        }
      }
    }

    // Sort by year and week
    results.sort((a, b) => {
      if (a.weekId.year !== b.weekId.year) {
        return a.weekId.year - b.weekId.year
      }
      return a.weekId.week - b.weekId.week
    })

    return results
  }

  async getByYear(year: number): Promise<WeeklyData[]> {
    const yearData = await this.readYearFile(year)
    if (!yearData) {
      return []
    }

    // Convert the weeks object to an array and sort
    const weeks = Object.values(yearData.weeks)
    weeks.sort((a, b) => a.weekId.week - b.weekId.week)

    return weeks
  }

  async getWeeksWithData(year: number): Promise<Set<number>> {
    const yearData = await this.readYearFile(year)
    if (!yearData) {
      return new Set()
    }

    // Return all week numbers that have data
    return new Set(Object.keys(yearData.weeks).map((w) => parseInt(w, 10)))
  }

  async delete(weekId: WeekIdentifier): Promise<void> {
    const year = weekId.year
    const weekNumber = weekId.week

    // Read the year file
    const yearData = await this.readYearFile(year)
    if (!yearData) {
      // Year file doesn't exist, nothing to delete
      return
    }

    // Remove the week from the year data
    delete yearData.weeks[weekNumber]

    // If no more weeks in the year, delete the entire file
    if (Object.keys(yearData.weeks).length === 0) {
      const dirHandle = await this.getDirectoryHandle()
      const fileName = this.getFileName(year)
      try {
        await dirHandle.removeEntry(fileName)
      } catch (error) {
        // If file doesn't exist, consider it successfully deleted
        if (error instanceof Error && error.name === 'NotFoundError') {
          return
        }
        throw error
      }
    } else {
      // Write back the updated year file
      await this.writeYearFile(year, yearData)
    }
  }

  /**
   * Clears all journal files from the directory (useful for testing)
   */
  async clear(): Promise<void> {
    const dirHandle = await this.getDirectoryHandle()

    // Collect all journal files
    const filesToDelete: string[] = []
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json')) {
        const year = this.parseFileName(entry.name)
        if (year) {
          filesToDelete.push(entry.name)
        }
      }
    }

    // Delete all collected files
    for (const fileName of filesToDelete) {
      try {
        await dirHandle.removeEntry(fileName)
      } catch {
        // Ignore deletion errors during clear
      }
    }
  }

  /**
   * Resets the layer by clearing the directory handle
   * Useful for testing or changing directories
   */
  reset(): void {
    this.directoryHandle = null
    this.initPromise = null
  }

  /**
   * Sets a new directory handle
   * Useful for testing or programmatic directory selection
   */
  setDirectoryHandle(handle: FileSystemDirectoryHandle): void {
    this.directoryHandle = handle
    this.initPromise = null
  }

  /**
   * Gets the current directory handle (if set)
   * Useful for persisting the handle for later use
   */
  getDirectoryHandleSync(): FileSystemDirectoryHandle | null {
    return this.directoryHandle
  }
}
