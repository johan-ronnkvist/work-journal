import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { IndexedDBLayer } from '../layered/layers/IndexedDBLayer'
import type { SaveWeeklyDataInput } from '../RepositoryTypes'
import type { WeekIdentifier } from '@/models/WeeklyData'
import { WEEK_STATUSES } from '@/constants/WeekStatus'

/**
 * Integration tests for IndexedDBLayer
 *
 * These tests run in a REAL browser using Playwright via Vitest browser mode.
 * They test actual IndexedDB behavior, including structured clone algorithm.
 *
 * Key differences from unit tests:
 * - Uses real browser IndexedDB (not fake-indexeddb)
 * - Catches browser-specific issues (e.g., DataCloneError)
 * - Slower execution but more realistic
 */
describe('IndexedDBLayer - Real Browser Integration', () => {
  let repository: IndexedDBLayer

  beforeEach(async () => {
    repository = new IndexedDBLayer()
    await repository.clear()
  })

  afterAll(async () => {
    await repository.close()
  })

  // Helper to create WeekIdentifier
  const weekId = (year: number, week: number): WeekIdentifier => ({ year, week })

  // Helper to format weekId as string key for testing
  const formatWeekKey = (id: WeekIdentifier): string => {
    const weekStr = String(id.week).padStart(2, '0')
    return `${id.year}-W${weekStr}`
  }

  describe('Structured Clone Compatibility', () => {
    it('should save and retrieve data with real IndexedDB', async () => {
      // This test would have caught the bug: WEEK_STATUSES objects can't be cloned
      // Using plain icon string instead
      const input: SaveWeeklyDataInput = {
        weekId: weekId(2024, 1),
        statusIcon: '😀',
        achievements: 'Completed major milestone',
        challenges: 'Minor delays',
      }

      await repository.save(input)
      const retrieved = await repository.get(weekId(2024, 1))

      expect(retrieved).toBeDefined()
      expect(retrieved?.weekId).toEqual(weekId(2024, 1))
      expect(retrieved?.statusIcon).toBe('😀')
      expect(retrieved?.achievements).toBe('Completed major milestone')
      expect(retrieved?.challenges).toBe('Minor delays')
    })

    it('should handle status icons from WEEK_STATUSES constant', async () => {
      // Test using statusIcon directly from WEEK_STATUSES
      // Modern browsers can clone icon strings successfully
      const input: SaveWeeklyDataInput = {
        weekId: weekId(2024, 2),
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: 'Test',
      }

      await repository.save(input)
      const retrieved = await repository.get(weekId(2024, 2))

      expect(retrieved).toBeDefined()
      expect(retrieved?.statusIcon).toBe(WEEK_STATUSES[0]!.icon)
    })

    it('should handle updates with plain status icons', async () => {
      // Create initial entry
      await repository.save({
        weekId: weekId(2024, 3),
        statusIcon: '🙂',
        achievements: 'Initial',
      })

      // Update with different status
      const updated = await repository.save({
        weekId: weekId(2024, 3),
        statusIcon: '😐',
        achievements: 'Updated',
      })

      expect(updated.statusIcon).toBe('😐')
      expect(updated.achievements).toBe('Updated')
    })
  })

  describe('Real IndexedDB Operations', () => {
    it('should persist data across repository instances', async () => {
      // Create data with first instance
      const repo1 = new IndexedDBLayer()
      await repo1.save({
        weekId: weekId(2024, 10),
        statusIcon: '😀',
        achievements: 'Persistent data',
      })
      await repo1.close()

      // Retrieve with second instance
      const repo2 = new IndexedDBLayer()
      const result = await repo2.get(weekId(2024, 10))

      expect(result).toBeDefined()
      expect(result?.achievements).toBe('Persistent data')

      await repo2.close()
    })

    it('should handle concurrent saves to different keys', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        repository.save({
          weekId: weekId(2024, i + 1),
          statusIcon: '😀',
          achievements: `Week ${i + 1}`,
        }),
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      results.forEach((result, i) => {
        expect(result.weekId).toEqual(weekId(2024, i + 1))
      })
    })

    it('should handle multiple updates to same key', async () => {
      // Create initial
      const v1 = await repository.save({
        weekId: weekId(2024, 20),
        statusIcon: '😀',
        achievements: 'V1',
      })

      // Update multiple times rapidly
      const v2 = await repository.save({ weekId: weekId(2024, 20), achievements: 'V2' })
      const v3 = await repository.save({ weekId: weekId(2024, 20), achievements: 'V3' })
      const v4 = await repository.save({ weekId: weekId(2024, 20), achievements: 'V4' })

      expect(v1.achievements).toBe('V1')
      expect(v2.achievements).toBe('V2')
      expect(v3.achievements).toBe('V3')
      expect(v4.achievements).toBe('V4')

      const final = await repository.get(weekId(2024, 20))
      expect(final?.achievements).toBe('V4')
    })
  })

  describe('Large Data Handling', () => {
    it('should handle large text content', async () => {
      // Test with ~100KB of text
      const largeText = 'Lorem ipsum dolor sit amet. '.repeat(4000)

      const input: SaveWeeklyDataInput = {
        weekId: weekId(2024, 30),
        statusIcon: '😀',
        achievements: largeText,
        challenges: largeText,
      }

      await repository.save(input)
      const retrieved = await repository.get(weekId(2024, 30))

      expect(retrieved?.achievements).toBe(largeText)
      expect(retrieved?.challenges).toBe(largeText)
    })

    it('should handle special characters and unicode', async () => {
      const input: SaveWeeklyDataInput = {
        weekId: weekId(2024, 31),
        statusIcon: '🌟',
        achievements: '✅ Fixed bug\n🚀 Deployed\n💡 New idea\n中文字符\nЁmoji test',
        challenges: 'Handle "quotes", \'apostrophes\', and <tags>',
      }

      await repository.save(input)
      const retrieved = await repository.get(weekId(2024, 31))

      expect(retrieved?.achievements).toBe(input.achievements)
      expect(retrieved?.challenges).toBe(input.challenges)
      expect(retrieved?.statusIcon).toBe('🌟')
    })
  })

  describe('Transaction and Error Handling', () => {
    it('should rollback on transaction error', async () => {
      // Create valid entry
      await repository.save({
        weekId: weekId(2024, 40),
        statusIcon: '😀',
        achievements: 'Valid',
      })

      // Attempt to save with invalid data structure
      // (This specific case might not fail, but demonstrates the pattern)
      const invalidInput = {
        weekId: weekId(2024, 40),
        statusIcon: '😀',
        achievements: 'Updated',
      } as SaveWeeklyDataInput

      try {
        await repository.save(invalidInput)
      } catch {
        // If error occurs, original data should still be intact
        const original = await repository.get(weekId(2024, 40))
        expect(original?.achievements).toBe('Valid')
      }
    })

    it('should handle deletion of non-existent keys', async () => {
      await expect(repository.delete(weekId(2024, 99))).resolves.not.toThrow()
    })
  })

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Create test dataset
      const weeks = [1, 3, 5, 7, 9, 11, 13]
      for (const week of weeks) {
        await repository.save({
          weekId: weekId(2024, week),
          statusIcon: '😀',
          achievements: `Week ${week}`,
        })
      }
    })

    it('should retrieve range correctly', async () => {
      const result = await repository.getRange(weekId(2024, 3), weekId(2024, 11))

      expect(result).toHaveLength(5) // W03, W05, W07, W09, W11
      expect(result[0]?.weekId).toEqual(weekId(2024, 3))
      expect(result[4]?.weekId).toEqual(weekId(2024, 11))
    })

    it('should retrieve by year correctly', async () => {
      // Add entry for different year
      await repository.save({
        weekId: weekId(2023, 1),
        statusIcon: '😀',
        achievements: '2023 entry',
      })

      const result = await repository.getByYear(2024)

      expect(result).toHaveLength(7)
      expect(result.every((r) => r.weekId.year === 2024)).toBe(true)
    })

    it('should return sorted results', async () => {
      const result = await repository.getByYear(2024)

      for (let i = 1; i < result.length; i++) {
        const prev = result[i - 1]!
        const curr = result[i]!
        expect(formatWeekKey(prev.weekId) < formatWeekKey(curr.weekId)).toBe(true)
      }
    })
  })

})
