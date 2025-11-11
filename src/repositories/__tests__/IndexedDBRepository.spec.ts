import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { IndexedDBLayer } from '../layered/layers/IndexedDBLayer'
import type { WeekIdentifier } from '@/models/WeeklyData'
import type { SaveWeeklyDataInput } from '../RepositoryTypes'
import { WEEK_STATUSES } from '@/constants/WeekStatus'
import 'fake-indexeddb/auto'

describe('IndexedDBLayer', () => {
  let repository: IndexedDBLayer

  // Helper to create WeekIdentifier
  const weekId = (year: number, week: number): WeekIdentifier => ({ year, week })

  // Helper to format weekId as string key for testing
  const formatWeekKey = (id: WeekIdentifier): string => {
    const weekStr = String(id.week).padStart(2, '0')
    return `${id.year}-W${weekStr}`
  }

  beforeEach(async () => {
    repository = new IndexedDBLayer()
    await repository.clear()
  })

  afterEach(async () => {
    await repository.clear()
    await repository.close()
  })

  describe('save - Create Operations', () => {
    it('should create a new weekly data entry', async () => {
      const input: SaveWeeklyDataInput = {
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: 'Great work',
        challenges: 'Some issues',
      }

      const result = await repository.save(input)

      expect(result.weekId).toEqual(weekId(2024, 1))
      expect(result.statusIcon).toBe(WEEK_STATUSES[0]!.icon)
      expect(result.achievements).toBe('Great work')
      expect(result.challenges).toBe('Some issues')
    })

    it('should return WeeklyData without extra properties like metadata', async () => {
      const input: SaveWeeklyDataInput = {
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: 'Test',
        challenges: 'Test',
      }

      const result = await repository.save(input)

      // Check that the result only has the expected WeeklyData properties
      const keys = Object.keys(result)
      expect(keys).toEqual(['weekId', 'statusIcon', 'achievements', 'challenges'])

      // Explicitly check that metadata doesn't exist
      expect(result).not.toHaveProperty('metadata')
    })

    it('should create entry with empty achievements and challenges', async () => {
      const input: SaveWeeklyDataInput = {
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[2]!.icon,
      }

      const result = await repository.save(input)

      expect(result.weekId).toEqual(weekId(2024, 1))
      expect(result.achievements).toBe('')
      expect(result.challenges).toBe('')
    })

    it('should create entry with Unknown statusIcon when not provided', async () => {
      const input: SaveWeeklyDataInput = {
        weekId: weekId(2024, 1),
        achievements: 'Some achievements',
      }

      const result = await repository.save(input)

      expect(result.weekId).toEqual(weekId(2024, 1))
      expect(result.statusIcon).toBe('❔') // Unknown status
      expect(result.achievements).toBe('Some achievements')
      expect(result.challenges).toBe('')
    })
  })

  describe('save - Update Operations', () => {
    it('should update existing entry with SaveWeeklyDataInput', async () => {
      // Create initial entry
      const createInput: SaveWeeklyDataInput = {
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: 'Initial',
        challenges: 'Initial',
      }

      await repository.save(createInput)

      // Wait to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Update with new SaveWeeklyDataInput
      const updateInput: SaveWeeklyDataInput = {
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[1]!.icon,
        achievements: 'Updated',
        challenges: 'Updated',
      }

      const updated = await repository.save(updateInput)

      expect(updated.weekId).toEqual(weekId(2024, 1))
      expect(updated.statusIcon).toBe(WEEK_STATUSES[1]!.icon)
      expect(updated.achievements).toBe('Updated')
      expect(updated.challenges).toBe('Updated')
    })

    it('should partially update existing entry', async () => {
      // Create initial entry
      const createInput: SaveWeeklyDataInput = {
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: 'Initial',
        challenges: 'Initial',
      }

      await repository.save(createInput)

      // Partial update - only achievements
      const updated = await repository.save({
        weekId: weekId(2024, 1),
        achievements: 'Updated achievements only',
      })

      expect(updated.achievements).toBe('Updated achievements only')
      expect(updated.challenges).toBe('Initial') // Should remain unchanged
      expect(updated.statusIcon).toBe(WEEK_STATUSES[0]!.icon) // Should remain unchanged
    })

    it('should update only status', async () => {
      // Create initial entry
      const createInput: SaveWeeklyDataInput = {
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: 'Initial',
        challenges: 'Initial',
      }

      await repository.save(createInput)

      // Update only status
      const updated = await repository.save({
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[3]!.icon,
      })

      expect(updated.statusIcon).toBe(WEEK_STATUSES[3]!.icon)
      expect(updated.achievements).toBe('Initial')
      expect(updated.challenges).toBe('Initial')
    })

  })

  describe('get', () => {
    it('should retrieve existing weekly data', async () => {
      const input: SaveWeeklyDataInput = {
        weekId: weekId(2024, 10),
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: 'Test',
        challenges: 'Test',
      }

      await repository.save(input)

      const result = await repository.get(weekId(2024, 10))

      expect(result).not.toBeNull()
      expect(result?.weekId).toEqual(weekId(2024, 10))
      expect(result?.achievements).toBe('Test')
    })

    it('should retrieve data without extra properties like metadata', async () => {
      const input: SaveWeeklyDataInput = {
        weekId: weekId(2024, 10),
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: 'Test',
        challenges: 'Test',
      }

      await repository.save(input)
      const result = await repository.get(weekId(2024, 10))

      expect(result).not.toBeNull()

      // Check that the result only has the expected WeeklyData properties
      const keys = Object.keys(result!)
      expect(keys).toEqual(['weekId', 'statusIcon', 'achievements', 'challenges'])

      // Explicitly check that metadata doesn't exist
      expect(result).not.toHaveProperty('metadata')
    })

    it('should return null for non-existent key', async () => {
      const result = await repository.get(weekId(2024, 99))

      expect(result).toBeNull()
    })
  })

  describe('getRange', () => {
    beforeEach(async () => {
      // Create test data
      const weeks = [1, 2, 3, 5, 8, 10]
      for (const week of weeks) {
        await repository.save({
          weekId: weekId(2024, week),
          statusIcon: WEEK_STATUSES[0]!.icon,
          achievements: `Week ${week}`,
        })
      }
    })

    it('should retrieve data within range', async () => {
      const result = await repository.getRange(weekId(2024, 2), weekId(2024, 5))

      expect(result).toHaveLength(3)
      expect(result[0]?.weekId).toEqual(weekId(2024, 2))
      expect(result[1]?.weekId).toEqual(weekId(2024, 3))
      expect(result[2]?.weekId).toEqual(weekId(2024, 5))
    })

    it('should return sorted results', async () => {
      const result = await repository.getRange(weekId(2024, 1), weekId(2024, 10))

      expect(result).toHaveLength(6)
      expect(result[0]?.weekId).toEqual(weekId(2024, 1))
      expect(result[5]?.weekId).toEqual(weekId(2024, 10))
    })

    it('should return empty array for range with no data', async () => {
      const result = await repository.getRange(weekId(2024, 20), weekId(2024, 30))

      expect(result).toHaveLength(0)
    })

    it('should work across year boundaries', async () => {
      await repository.save({ weekId: weekId(2023, 52), statusIcon: WEEK_STATUSES[0]!.icon })
      await repository.save({ weekId: weekId(2025, 1), statusIcon: WEEK_STATUSES[0]!.icon })

      const result = await repository.getRange(weekId(2023, 52), weekId(2025, 1))

      expect(result.length).toBeGreaterThan(0)
      expect(result[0]?.weekId).toEqual(weekId(2023, 52))
    })
  })

  describe('getByYear', () => {
    beforeEach(async () => {
      // Create test data for multiple years
      await repository.save({ weekId: weekId(2023, 1), statusIcon: WEEK_STATUSES[0]!.icon })
      await repository.save({ weekId: weekId(2023, 52), statusIcon: WEEK_STATUSES[0]!.icon })
      await repository.save({ weekId: weekId(2024, 1), statusIcon: WEEK_STATUSES[0]!.icon })
      await repository.save({ weekId: weekId(2024, 10), statusIcon: WEEK_STATUSES[0]!.icon })
      await repository.save({ weekId: weekId(2024, 52), statusIcon: WEEK_STATUSES[0]!.icon })
      await repository.save({ weekId: weekId(2025, 1), statusIcon: WEEK_STATUSES[0]!.icon })
    })

    it('should retrieve all data for a specific year', async () => {
      const result = await repository.getByYear(2024)

      expect(result).toHaveLength(3)
      expect(result[0]?.weekId).toEqual(weekId(2024, 1))
      expect(result[1]?.weekId).toEqual(weekId(2024, 10))
      expect(result[2]?.weekId).toEqual(weekId(2024, 52))
    })

    it('should return sorted results', async () => {
      const result = await repository.getByYear(2024)

      for (let i = 1; i < result.length; i++) {
        const prev = result[i - 1]!
        const curr = result[i]!
        expect(formatWeekKey(prev.weekId) < formatWeekKey(curr.weekId)).toBe(true)
      }
    })

    it('should return empty array for year with no data', async () => {
      const result = await repository.getByYear(2022)

      expect(result).toHaveLength(0)
    })

    it('should not include data from other years', async () => {
      const result = await repository.getByYear(2023)

      expect(result).toHaveLength(2)
      expect(result.every((d) => d.weekId.year === 2023)).toBe(true)
    })
  })

  describe('delete', () => {
    it('should delete existing entry', async () => {
      await repository.save({
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[0]!.icon,
      })

      await repository.delete(weekId(2024, 1))

      const result = await repository.get(weekId(2024, 1))
      expect(result).toBeNull()
    })

    it('should not throw error when deleting non-existent entry', async () => {
      await expect(repository.delete(weekId(2024, 99))).resolves.not.toThrow()
    })
  })

  describe('clear', () => {
    it('should clear all data', async () => {
      // Add multiple entries
      await repository.save({ weekId: weekId(2024, 1), statusIcon: WEEK_STATUSES[0]!.icon })
      await repository.save({ weekId: weekId(2024, 2), statusIcon: WEEK_STATUSES[0]!.icon })
      await repository.save({ weekId: weekId(2024, 3), statusIcon: WEEK_STATUSES[0]!.icon })

      await repository.clear()

      const result = await repository.getByYear(2024)
      expect(result).toHaveLength(0)
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle typical weekly note-taking workflow', async () => {
      // Monday: Create entry
      const monday = await repository.save({
        weekId: weekId(2024, 15),
        statusIcon: WEEK_STATUSES[2]!.icon, // Okay
        achievements: 'Started new project',
      })

      expect(monday.statusIcon).toBe(WEEK_STATUSES[2]!.icon)

      // Wednesday: Update with challenges
      const wednesday = await repository.save({
        weekId: weekId(2024, 15),
        challenges: 'Ran into dependency issues',
      })

      expect(wednesday.achievements).toBe('Started new project')
      expect(wednesday.challenges).toBe('Ran into dependency issues')

      // Friday: Update status and add more achievements
      const friday = await repository.save({
        weekId: weekId(2024, 15),
        statusIcon: WEEK_STATUSES[1]!.icon, // Good
        achievements: 'Started new project\nResolved dependency issues\nCompleted 5 tasks',
      })

      expect(friday.statusIcon).toBe(WEEK_STATUSES[1]!.icon)

      // Verify final state
      const final = await repository.get(weekId(2024, 15))
      expect(final?.statusIcon).toBe(WEEK_STATUSES[1]!.icon)
      expect(final?.achievements).toContain('Completed 5 tasks')
      expect(final?.challenges).toContain('dependency issues')
    })

    it('should support quarterly review workflow', async () => {
      // Create data for Q1 2024 (weeks 1-13)
      for (let week = 1; week <= 13; week++) {
        await repository.save({
          weekId: weekId(2024, week),
          statusIcon: WEEK_STATUSES[week % 5]!.icon,
          achievements: `Week ${week} achievements`,
          challenges: `Week ${week} challenges`,
        })
      }

      // Retrieve Q1 data
      const q1Data = await repository.getRange(weekId(2024, 1), weekId(2024, 13))

      expect(q1Data).toHaveLength(13)
      expect(q1Data[0]?.weekId).toEqual(weekId(2024, 1))
      expect(q1Data[12]?.weekId).toEqual(weekId(2024, 13))
    })
  })
})
