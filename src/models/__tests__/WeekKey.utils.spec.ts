import { describe, it, expect } from 'vitest'
import {
  getISOWeek,
  getISOYear,
  getWeeksInYear,
  createWeekIdentifier,
  getCurrentWeekIdentifier,
  isSameWeek,
  getNextWeekIdentifier,
  getPreviousWeekIdentifier,
  getWeekStartDate,
  getWeekEndDate,
  getWeekDateRange,
  getWeekRangeDateRange,
} from '../WeekKey.utils'

describe('WeekIdentifier Utils', () => {
  describe('getISOWeek', () => {
    it('should calculate correct ISO week for known dates', () => {
      // January 1, 2024 is a Monday and in Week 1
      expect(getISOWeek(new Date('2024-01-01'))).toBe(1)

      // December 31, 2024 is a Tuesday and in Week 1 of 2025
      expect(getISOWeek(new Date('2024-12-31'))).toBe(1)

      // July 4, 2024 should be in week 27
      expect(getISOWeek(new Date('2024-07-04'))).toBe(27)
    })

    it('should handle year boundaries correctly', () => {
      // December 29, 2019 is a Sunday and in Week 52 of 2019
      expect(getISOWeek(new Date('2019-12-29'))).toBe(52)

      // December 30, 2019 is a Monday and in Week 1 of 2020
      expect(getISOWeek(new Date('2019-12-30'))).toBe(1)
    })

    it('should handle leap years', () => {
      // February 29, 2024 (leap year)
      expect(getISOWeek(new Date('2024-02-29'))).toBe(9)
    })
  })

  describe('getISOYear', () => {
    it('should return correct ISO year for mid-year dates', () => {
      expect(getISOYear(new Date('2024-07-15'))).toBe(2024)
    })

    it('should handle ISO year different from calendar year', () => {
      // December 31, 2024 is in ISO week 1 of 2025
      expect(getISOYear(new Date('2024-12-31'))).toBe(2025)

      // January 1, 2024 is in ISO week 1 of 2024
      expect(getISOYear(new Date('2024-01-01'))).toBe(2024)
    })
  })

  describe('getWeeksInYear', () => {
    it('should return 52 for typical years', () => {
      expect(getWeeksInYear(2023)).toBe(52)
      expect(getWeeksInYear(2024)).toBe(52)
      expect(getWeeksInYear(2025)).toBe(52)
    })

    it('should return 53 for years with 53 weeks', () => {
      expect(getWeeksInYear(2020)).toBe(53)
      expect(getWeeksInYear(2015)).toBe(53)
      expect(getWeeksInYear(2026)).toBe(53)
    })
  })

  describe('createWeekIdentifier', () => {
    it('should create a valid week identifier', () => {
      expect(createWeekIdentifier(2024, 1)).toEqual({ year: 2024, week: 1 })
      expect(createWeekIdentifier(2024, 10)).toEqual({ year: 2024, week: 10 })
      expect(createWeekIdentifier(2024, 52)).toEqual({ year: 2024, week: 52 })
    })

    it('should throw error for invalid week number (too low)', () => {
      expect(() => createWeekIdentifier(2024, 0)).toThrow('Invalid week number: 0')
      expect(() => createWeekIdentifier(2024, -1)).toThrow('Invalid week number: -1')
    })

    it('should throw error for invalid week number (too high)', () => {
      expect(() => createWeekIdentifier(2024, 54)).toThrow('Invalid week number: 54')
      expect(() => createWeekIdentifier(2024, 100)).toThrow('Invalid week number: 100')
    })

    it('should throw error for invalid year (too short)', () => {
      expect(() => createWeekIdentifier(999, 1)).toThrow('Invalid year: 999')
      expect(() => createWeekIdentifier(99, 1)).toThrow('Invalid year: 99')
    })

    it('should throw error for invalid year (too long)', () => {
      expect(() => createWeekIdentifier(10000, 1)).toThrow('Invalid year: 10000')
    })

    it('should accept week 53 for valid years', () => {
      expect(createWeekIdentifier(2020, 53)).toEqual({ year: 2020, week: 53 })
    })
  })

  describe('getCurrentWeekIdentifier', () => {
    it('should return a valid week identifier', () => {
      const weekId = getCurrentWeekIdentifier()
      expect(weekId).toHaveProperty('year')
      expect(weekId).toHaveProperty('week')
      expect(weekId.year).toBeGreaterThan(2000)
      expect(weekId.week).toBeGreaterThanOrEqual(1)
      expect(weekId.week).toBeLessThanOrEqual(53)
    })
  })

  describe('isSameWeek', () => {
    it('should return true for same week', () => {
      expect(isSameWeek({ year: 2024, week: 1 }, { year: 2024, week: 1 })).toBe(true)
      expect(isSameWeek({ year: 2024, week: 52 }, { year: 2024, week: 52 })).toBe(true)
    })

    it('should return false for different weeks', () => {
      expect(isSameWeek({ year: 2024, week: 1 }, { year: 2024, week: 2 })).toBe(false)
      expect(isSameWeek({ year: 2024, week: 1 }, { year: 2023, week: 1 })).toBe(false)
    })
  })

  describe('getNextWeekIdentifier', () => {
    it('should get next week in same year', () => {
      expect(getNextWeekIdentifier({ year: 2024, week: 1 })).toEqual({ year: 2024, week: 2 })
      expect(getNextWeekIdentifier({ year: 2024, week: 10 })).toEqual({ year: 2024, week: 11 })
      expect(getNextWeekIdentifier({ year: 2024, week: 51 })).toEqual({ year: 2024, week: 52 })
    })

    it('should roll over to next year for week 52', () => {
      expect(getNextWeekIdentifier({ year: 2023, week: 52 })).toEqual({ year: 2024, week: 1 })
    })

    it('should handle years with 53 weeks', () => {
      expect(getNextWeekIdentifier({ year: 2020, week: 52 })).toEqual({ year: 2020, week: 53 })
      expect(getNextWeekIdentifier({ year: 2020, week: 53 })).toEqual({ year: 2021, week: 1 })
    })
  })

  describe('getPreviousWeekIdentifier', () => {
    it('should get previous week in same year', () => {
      expect(getPreviousWeekIdentifier({ year: 2024, week: 2 })).toEqual({ year: 2024, week: 1 })
      expect(getPreviousWeekIdentifier({ year: 2024, week: 10 })).toEqual({ year: 2024, week: 9 })
      expect(getPreviousWeekIdentifier({ year: 2024, week: 52 })).toEqual({ year: 2024, week: 51 })
    })

    it('should roll back to previous year for week 1', () => {
      expect(getPreviousWeekIdentifier({ year: 2024, week: 1 })).toEqual({ year: 2023, week: 52 })
    })

    it('should handle years with 53 weeks when rolling back', () => {
      expect(getPreviousWeekIdentifier({ year: 2021, week: 1 })).toEqual({ year: 2020, week: 53 })
    })
  })

  describe('Integration Tests', () => {
    it('should navigate through weeks correctly', () => {
      let current = { year: 2024, week: 1 }

      // Go forward 5 weeks
      for (let i = 0; i < 5; i++) {
        current = getNextWeekIdentifier(current)
      }
      expect(current).toEqual({ year: 2024, week: 6 })

      // Go back 3 weeks
      for (let i = 0; i < 3; i++) {
        current = getPreviousWeekIdentifier(current)
      }
      expect(current).toEqual({ year: 2024, week: 3 })
    })

    it('should handle year transitions both ways', () => {
      let current = { year: 2024, week: 1 }

      // Go back one week (should be last week of 2023)
      current = getPreviousWeekIdentifier(current)
      expect(current).toEqual({ year: 2023, week: 52 })

      // Go forward one week (should be back to first week of 2024)
      current = getNextWeekIdentifier(current)
      expect(current).toEqual({ year: 2024, week: 1 })
    })
  })

  describe('getWeekStartDate', () => {
    it('should return Monday for week 1 of 2024', () => {
      const monday = getWeekStartDate({ year: 2024, week: 1 })
      // 2024 Week 1 starts on Monday, January 1, 2024
      expect(monday.getFullYear()).toBe(2024)
      expect(monday.getMonth()).toBe(0) // January
      expect(monday.getDate()).toBe(1)
      expect(monday.getDay()).toBe(1) // Monday
    })

    it('should return Monday for any week', () => {
      const monday = getWeekStartDate({ year: 2024, week: 10 })
      expect(monday.getDay()).toBe(1) // Should always be Monday
    })

    it('should handle week 53 correctly', () => {
      // 2020 has 53 weeks
      const monday = getWeekStartDate({ year: 2020, week: 53 })
      expect(monday.getDay()).toBe(1) // Should be Monday
      expect(monday.getFullYear()).toBe(2020)
      expect(monday.getMonth()).toBe(11) // December
    })

    it('should calculate correct dates for mid-year weeks', () => {
      // Week 27 of 2024 (early July)
      const monday = getWeekStartDate({ year: 2024, week: 27 })
      expect(monday.getDay()).toBe(1) // Monday
      expect(monday.getMonth()).toBe(6) // July (0-indexed)
    })
  })

  describe('getWeekEndDate', () => {
    it('should return Sunday for week 1 of 2024', () => {
      const sunday = getWeekEndDate({ year: 2024, week: 1 })
      expect(sunday.getDay()).toBe(0) // Sunday
      expect(sunday.getFullYear()).toBe(2024)
      expect(sunday.getMonth()).toBe(0) // January
      expect(sunday.getDate()).toBe(7)
    })

    it('should return Sunday for any week', () => {
      const sunday = getWeekEndDate({ year: 2024, week: 10 })
      expect(sunday.getDay()).toBe(0) // Should always be Sunday
    })

    it('should be 6 days after start date', () => {
      const start = getWeekStartDate({ year: 2024, week: 15 })
      const end = getWeekEndDate({ year: 2024, week: 15 })
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBe(6)
    })
  })

  describe('getWeekDateRange', () => {
    it('should return start and end dates for a week', () => {
      const range = getWeekDateRange({ year: 2024, week: 1 })
      expect(range.start.getDay()).toBe(1) // Monday
      expect(range.end.getDay()).toBe(0) // Sunday
      expect(range.start.getFullYear()).toBe(2024)
      expect(range.end.getFullYear()).toBe(2024)
    })

    it('should span exactly 7 days', () => {
      const range = getWeekDateRange({ year: 2024, week: 20 })
      const diffDays = (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBe(6) // 6 days difference (Monday to Sunday inclusive)
    })

    it('should handle year boundary weeks', () => {
      // Week that might span year boundary
      const range = getWeekDateRange({ year: 2023, week: 52 })
      expect(range.start.getDay()).toBe(1) // Monday
      expect(range.end.getDay()).toBe(0) // Sunday
    })
  })

  describe('getWeekRangeDateRange', () => {
    it('should return start of first week and end of last week', () => {
      const startWeek = { year: 2024, week: 1 }
      const endWeek = { year: 2024, week: 4 }
      const range = getWeekRangeDateRange(startWeek, endWeek)

      expect(range.start.getDay()).toBe(1) // Monday of week 1
      expect(range.end.getDay()).toBe(0) // Sunday of week 4
      expect(range.start).toEqual(getWeekStartDate(startWeek))
      expect(range.end).toEqual(getWeekEndDate(endWeek))
    })

    it('should handle single week range', () => {
      const week = { year: 2024, week: 10 }
      const range = getWeekRangeDateRange(week, week)
      const singleWeekRange = getWeekDateRange(week)

      expect(range.start).toEqual(singleWeekRange.start)
      expect(range.end).toEqual(singleWeekRange.end)
    })

    it('should handle quarter-length ranges (13 weeks)', () => {
      const startWeek = { year: 2024, week: 1 }
      const endWeek = { year: 2024, week: 13 }
      const range = getWeekRangeDateRange(startWeek, endWeek)

      expect(range.start.getDay()).toBe(1) // Monday
      expect(range.end.getDay()).toBe(0) // Sunday

      // Should span approximately 3 months (13 weeks = 91 days)
      const diffDays = (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBe(12 * 7 + 6) // 12 full weeks plus 6 days = 90 days
    })

    it('should handle year-crossing ranges', () => {
      const startWeek = { year: 2023, week: 50 }
      const endWeek = { year: 2024, week: 2 }
      const range = getWeekRangeDateRange(startWeek, endWeek)

      expect(range.start.getDay()).toBe(1) // Monday
      expect(range.end.getDay()).toBe(0) // Sunday
      expect(range.start.getFullYear()).toBe(2023)
      expect(range.end.getFullYear()).toBe(2024)
    })

    it('should work with full year range', () => {
      const startWeek = { year: 2024, week: 1 }
      const endWeek = { year: 2024, week: 52 }
      const range = getWeekRangeDateRange(startWeek, endWeek)

      expect(range.start.getDay()).toBe(1) // Monday
      expect(range.end.getDay()).toBe(0) // Sunday
      expect(range.start.getFullYear()).toBe(2024)
    })
  })

  describe('Date Range Integration Tests', () => {
    it('should round-trip from week to date and back', () => {
      const originalWeek = { year: 2024, week: 15 }
      const startDate = getWeekStartDate(originalWeek)

      // The start date should produce the same week
      const calculatedWeek = getISOWeek(startDate)
      const calculatedYear = getISOYear(startDate)

      expect(calculatedWeek).toBe(originalWeek.week)
      expect(calculatedYear).toBe(originalWeek.year)
    })

    it('should correctly span multiple weeks', () => {
      const week1 = { year: 2024, week: 10 }
      const week3 = { year: 2024, week: 12 }

      const range = getWeekRangeDateRange(week1, week3)

      // Should span 3 weeks = 20 days (2 full weeks + 6 days)
      const diffDays = (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBe(2 * 7 + 6) // 20 days
    })
  })
})
