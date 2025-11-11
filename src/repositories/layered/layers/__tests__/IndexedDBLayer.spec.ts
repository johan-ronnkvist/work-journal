import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { IndexedDBLayer } from '../IndexedDBLayer'
import type { WeekIdentifier } from '@/models/WeeklyData'
import type { SaveWeeklyDataInput } from '@/repositories/RepositoryTypes'
import { WEEK_STATUSES } from '@/constants/WeekStatus'
import 'fake-indexeddb/auto'

describe('IndexedDBLayer', () => {
  let layer: IndexedDBLayer

  // Helper to create WeekIdentifier
  const weekId = (year: number, week: number): WeekIdentifier => ({ year, week })

  beforeEach(async () => {
    layer = new IndexedDBLayer()
    await layer.clear()
  })

  afterEach(async () => {
    await layer.clear()
    await layer.close()
  })

  describe('Layer Properties', () => {
    it('should have correct layer metadata', () => {
      expect(layer.name).toBe('indexeddb')
      expect(layer.priority).toBe(100)
      expect(layer.canRead).toBe(true)
      expect(layer.canWrite).toBe(true)
    })

    it('should report availability when indexedDB is present', async () => {
      const isAvailable = await layer.isAvailable()
      expect(isAvailable).toBe(true)
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

    it('should return empty array for range with no data', async () => {
      const result = await layer.getRange(weekId(2025, 1), weekId(2025, 10))
      expect(result).toEqual([])
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
  })

  describe('delete', () => {
    it('should delete existing weekly data', async () => {
      await layer.save({
        weekId: weekId(2024, 10),
        statusIcon: WEEK_STATUSES[0]!.icon,
      })

      await layer.delete(weekId(2024, 10))

      const result = await layer.get(weekId(2024, 10))
      expect(result).toBeNull()
    })

    it('should not throw when deleting non-existent data', async () => {
      await expect(layer.delete(weekId(2024, 99))).resolves.not.toThrow()
    })
  })

  describe('clear', () => {
    it('should remove all data', async () => {
      await layer.save({ weekId: weekId(2024, 1), statusIcon: WEEK_STATUSES[0]!.icon })
      await layer.save({ weekId: weekId(2024, 2), statusIcon: WEEK_STATUSES[0]!.icon })
      await layer.save({ weekId: weekId(2024, 3), statusIcon: WEEK_STATUSES[0]!.icon })

      await layer.clear()

      const result = await layer.getByYear(2024)
      expect(result).toEqual([])
    })
  })
})
