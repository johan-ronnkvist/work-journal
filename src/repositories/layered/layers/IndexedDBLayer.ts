import type { WeeklyData, WeekIdentifier } from '@/models/WeeklyData'
import type { SaveWeeklyDataInput } from '@/repositories/RepositoryTypes'
import type { IWeeklyDataLayer } from '../IWeeklyDataLayer'
import { DEFAULT_WEEKLY_DATA_VALUES } from '@/models/WeeklyData.defaults'

const DB_NAME = 'work-notes-db'
const DB_VERSION = 1
const STORE_NAME = 'weekly-data'

/**
 * Local fast storage layer using IndexedDB
 * Direct implementation using IndexedDB API with composite key [weekId.year, weekId.week]
 */
export class IndexedDBLayer implements IWeeklyDataLayer {
  readonly name = 'indexeddb'
  readonly priority = 100 // Highest priority for reads
  readonly canRead = true
  readonly canWrite = true

  private dbPromise: Promise<IDBDatabase> | null = null

  async isAvailable(): Promise<boolean> {
    return 'indexedDB' in window
  }

  /**
   * Initializes the IndexedDB database
   * Creates object store if needed
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object store with composite key [weekId.year, weekId.week]
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: ['weekId.year', 'weekId.week'],
          })

          // Create index for year-based queries
          store.createIndex('year', 'weekId.year', { unique: false })
        }
      }
    })

    return this.dbPromise
  }

  /**
   * Helper to execute a transaction
   */
  private async executeTransaction<T>(
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.initDB()
    const transaction = db.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)
    const request = callback(store)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () =>
        reject(new Error(`IndexedDB transaction failed: ${request.error?.message}`))
    })
  }

  /**
   * Ensures the WeekIdentifier is a plain object (not a Vue Proxy or other wrapper)
   * This is necessary for IndexedDB structured clone compatibility
   */
  private toPlainWeekId(weekId: WeekIdentifier): WeekIdentifier {
    return {
      year: weekId.year,
      week: weekId.week,
    }
  }

  async save(input: SaveWeeklyDataInput): Promise<WeeklyData> {
    // Ensure weekId is a plain object for IndexedDB compatibility
    const identifier = this.toPlainWeekId(input.weekId)

    // Check if data already exists
    const existing = await this.get(identifier)

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

    await this.executeTransaction('readwrite', (store) => store.put(dataToSave))

    return dataToSave
  }

  async get(weekId: WeekIdentifier): Promise<WeeklyData | null> {
    // Use composite key [year, week] for IndexedDB lookup
    const compositeKey = [weekId.year, weekId.week]
    const result = await this.executeTransaction('readonly', (store) => store.get(compositeKey))
    return result || null
  }

  async getRange(start: WeekIdentifier, end: WeekIdentifier): Promise<WeeklyData[]> {
    const db = await this.initDB()
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    // Create an IDBKeyRange for the composite key [year, week]
    // The range will be inclusive on both ends
    const keyRange = IDBKeyRange.bound(
      [start.year, start.week],
      [end.year, end.week],
      false, // lowerOpen = false (inclusive)
      false, // upperOpen = false (inclusive)
    )

    const request = store.getAll(keyRange)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result as WeeklyData[]
        // Data is already sorted by composite key, no need to sort again
        resolve(result)
      }
      request.onerror = () => reject(new Error(`Failed to get range: ${request.error?.message}`))
    })
  }

  async getByYear(year: number): Promise<WeeklyData[]> {
    // Use getRange to efficiently fetch only the specified year's data
    // Week numbers range from 1 to 53 (max possible in ISO week date system)
    return this.getRange({ year, week: 1 }, { year, week: 53 })
  }

  async getWeeksWithData(year: number): Promise<Set<number>> {
    const db = await this.initDB()
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const yearIndex = store.index('year')

    // Use the year index to get only keys for the specified year
    const request = yearIndex.getAllKeys(year)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        // getAllKeys on an index returns the primary keys (composite keys)
        // Format: [[year, week], [year, week], ...]
        const keys = request.result as [number, number][]
        const weeks = new Set(keys.map(([, week]) => week))
        resolve(weeks)
      }
      request.onerror = () =>
        reject(new Error(`Failed to get week numbers: ${request.error?.message}`))
    })
  }

  async delete(weekId: WeekIdentifier): Promise<void> {
    // Use composite key [year, week] for IndexedDB lookup
    const compositeKey = [weekId.year, weekId.week]
    await this.executeTransaction('readwrite', (store) => store.delete(compositeKey))
  }

  /**
   * Clears all data from the store (useful for testing)
   */
  async clear(): Promise<void> {
    await this.executeTransaction('readwrite', (store) => store.clear())
  }

  /**
   * Closes the database connection
   */
  async close(): Promise<void> {
    if (this.dbPromise) {
      const db = await this.dbPromise
      db.close()
      this.dbPromise = null
    }
  }
}
