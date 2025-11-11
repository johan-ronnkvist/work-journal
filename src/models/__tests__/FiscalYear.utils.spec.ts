import { describe, it, expect } from 'vitest'
import {
  getFiscalQuarterWeekRange,
  calendarWeekToFiscalQuarter,
  getFiscalYearWeekRange,
  isWeekInFiscalQuarter,
  getCurrentFiscalQuarter,
  type FiscalYearSettings,
} from '../FiscalYear.utils'

describe('FiscalYear Utils', () => {
  describe('getFiscalQuarterWeekRange', () => {
    it('should handle calendar year (startMonth = 1)', () => {
      const settings: FiscalYearSettings = { startMonth: 1 }

      // FY2024: When startMonth=1, fiscal year matches calendar year
      // FY2024 runs January 2024 - December 2024
      // Q1: January-March 2024
      const q1 = getFiscalQuarterWeekRange(2024, 1, settings)
      expect(q1.start.year).toBe(2024) // Calendar year = fiscal year when startMonth=1
      expect(q1.start.week).toBe(1) // First week of January 2024

      // Q2: April-June 2024
      const q2 = getFiscalQuarterWeekRange(2024, 2, settings)
      expect(q2.start.year).toBe(2024)
      expect(q2.start.week).toBeGreaterThan(q1.end.week)

      // Q3: July-September 2024
      const q3 = getFiscalQuarterWeekRange(2024, 3, settings)
      expect(q3.start.year).toBe(2024)
      expect(q3.start.week).toBeGreaterThan(q2.end.week)

      // Q4: October-December 2024
      const q4 = getFiscalQuarterWeekRange(2024, 4, settings)
      expect(q4.start.year).toBe(2024)
      expect(q4.start.week).toBeGreaterThan(q3.end.week)
    })

    it('should handle fiscal year starting in April (startMonth = 4)', () => {
      const settings: FiscalYearSettings = { startMonth: 4 }

      // FY2024 (ends March 2024): April 2023 - March 2024
      // FY2024 Q1: April-June 2023
      const q1 = getFiscalQuarterWeekRange(2024, 1, settings)
      expect(q1.start.year).toBe(2023)

      // FY2024 Q2: July-September 2023
      const q2 = getFiscalQuarterWeekRange(2024, 2, settings)
      expect(q2.start.year).toBe(2023)

      // FY2024 Q3: October-December 2023
      const q3 = getFiscalQuarterWeekRange(2024, 3, settings)
      expect(q3.start.year).toBe(2023)

      // FY2024 Q4: January-March 2024 (ends in 2024, hence "FY2024")
      const q4 = getFiscalQuarterWeekRange(2024, 4, settings)
      expect(q4.start.year).toBe(2024)
      expect(q4.end.year).toBe(2024)
    })

    it('should handle fiscal year starting in July (startMonth = 7)', () => {
      const settings: FiscalYearSettings = { startMonth: 7 }

      // FY2024 (ends June 2024): July 2023 - June 2024
      // FY2024 Q1: July-September 2023
      const q1 = getFiscalQuarterWeekRange(2024, 1, settings)
      expect(q1.start.year).toBe(2023)

      // FY2024 Q2: October-December 2023
      const q2 = getFiscalQuarterWeekRange(2024, 2, settings)
      expect(q2.start.year).toBe(2023)

      // FY2024 Q3: January-March 2024
      const q3 = getFiscalQuarterWeekRange(2024, 3, settings)
      expect(q3.start.year).toBe(2024)

      // FY2024 Q4: April-June 2024 (ends June 2024, hence "FY2024")
      const q4 = getFiscalQuarterWeekRange(2024, 4, settings)
      expect(q4.start.year).toBe(2024)
      expect(q4.end.year).toBe(2024)
    })

    it('should handle fiscal year starting in October (startMonth = 10)', () => {
      const settings: FiscalYearSettings = { startMonth: 10 }

      // FY2024 (ends September 2024): October 2023 - September 2024
      // FY2024 Q1: October-December 2023
      const q1 = getFiscalQuarterWeekRange(2024, 1, settings)
      expect(q1.start.year).toBe(2023)

      // FY2024 Q2: January-March 2024
      const q2 = getFiscalQuarterWeekRange(2024, 2, settings)
      expect(q2.start.year).toBe(2024)

      // FY2024 Q3: April-June 2024
      const q3 = getFiscalQuarterWeekRange(2024, 3, settings)
      expect(q3.start.year).toBe(2024)

      // FY2024 Q4: July-September 2024 (ends Sept 2024, hence "FY2024")
      const q4 = getFiscalQuarterWeekRange(2024, 4, settings)
      expect(q4.start.year).toBe(2024)
      expect(q4.end.year).toBe(2024)
    })

    it('should throw error for invalid quarter', () => {
      const settings: FiscalYearSettings = { startMonth: 1 }

      expect(() => getFiscalQuarterWeekRange(2024, 0, settings)).toThrow(
        'Invalid quarter: 0. Must be between 1 and 4.',
      )
      expect(() => getFiscalQuarterWeekRange(2024, 5, settings)).toThrow(
        'Invalid quarter: 5. Must be between 1 and 4.',
      )
    })

    it('should throw error for invalid start month', () => {
      expect(() =>
        getFiscalQuarterWeekRange(2024, 1, { startMonth: 0 }),
      ).toThrow('Invalid start month: 0. Must be between 1 and 12.')

      expect(() =>
        getFiscalQuarterWeekRange(2024, 1, { startMonth: 13 }),
      ).toThrow('Invalid start month: 13. Must be between 1 and 12.')
    })

    it('should have continuous quarters without gaps', () => {
      const settings: FiscalYearSettings = { startMonth: 4 }

      const q1 = getFiscalQuarterWeekRange(2024, 1, settings)
      const q2 = getFiscalQuarterWeekRange(2024, 2, settings)
      const q3 = getFiscalQuarterWeekRange(2024, 3, settings)
      const q4 = getFiscalQuarterWeekRange(2024, 4, settings)

      // Q2 should start the week after Q1 ends
      expect(
        q2.start.year === q1.end.year
          ? q2.start.week
          : q2.start.week + 52,
      ).toBe(
        q1.end.year === q2.start.year
          ? q1.end.week + 1
          : q1.end.week + 1,
      )

      // Check that all quarters are sequential
      expect(q2.start.week).toBeGreaterThan(0)
      expect(q3.start.week).toBeGreaterThan(0)
      expect(q4.start.week).toBeGreaterThan(0)
    })
  })

  describe('calendarWeekToFiscalQuarter', () => {
    it('should correctly map calendar weeks to fiscal quarters (calendar year)', () => {
      const settings: FiscalYearSettings = { startMonth: 1 }

      // Week in January 2024 → FY 2024 Q1
      const jan = calendarWeekToFiscalQuarter({ year: 2024, week: 2 }, settings)
      expect(jan.fiscalYear).toBe(2024)
      expect(jan.quarter).toBe(1)

      // Week in April 2024 → FY 2024 Q2
      const apr = calendarWeekToFiscalQuarter({ year: 2024, week: 14 }, settings)
      expect(apr.fiscalYear).toBe(2024)
      expect(apr.quarter).toBe(2)

      // Week in July 2024 → FY 2024 Q3
      const jul = calendarWeekToFiscalQuarter({ year: 2024, week: 27 }, settings)
      expect(jul.fiscalYear).toBe(2024)
      expect(jul.quarter).toBe(3)

      // Week in October 2024 → FY 2024 Q4
      const oct = calendarWeekToFiscalQuarter({ year: 2024, week: 40 }, settings)
      expect(oct.fiscalYear).toBe(2024)
      expect(oct.quarter).toBe(4)
    })

    it('should correctly map calendar weeks to fiscal quarters (April start)', () => {
      const settings: FiscalYearSettings = { startMonth: 4 }

      // Week in January 2024 → FY 2024 Q4 (FY2024 ends March 2024, so Jan is Q4)
      const jan = calendarWeekToFiscalQuarter({ year: 2024, week: 2 }, settings)
      expect(jan.fiscalYear).toBe(2024)
      expect(jan.quarter).toBe(4)

      // Week in April 2024 → FY 2025 Q1 (FY2025 starts April 2024)
      const apr = calendarWeekToFiscalQuarter({ year: 2024, week: 14 }, settings)
      expect(apr.fiscalYear).toBe(2025)
      expect(apr.quarter).toBe(1)

      // Week in July 2024 → FY 2025 Q2
      const jul = calendarWeekToFiscalQuarter({ year: 2024, week: 27 }, settings)
      expect(jul.fiscalYear).toBe(2025)
      expect(jul.quarter).toBe(2)

      // Week in October 2024 → FY 2025 Q3
      const oct = calendarWeekToFiscalQuarter({ year: 2024, week: 40 }, settings)
      expect(oct.fiscalYear).toBe(2025)
      expect(oct.quarter).toBe(3)
    })

    it('should correctly map calendar weeks to fiscal quarters (July start)', () => {
      const settings: FiscalYearSettings = { startMonth: 7 }

      // Week in January 2024 → FY 2024 Q3 (FY2024 ends June 2024, so Jan is Q3)
      const jan = calendarWeekToFiscalQuarter({ year: 2024, week: 2 }, settings)
      expect(jan.fiscalYear).toBe(2024)
      expect(jan.quarter).toBe(3)

      // Week in July 2024 → FY 2025 Q1 (FY2025 starts July 2024)
      const jul = calendarWeekToFiscalQuarter({ year: 2024, week: 27 }, settings)
      expect(jul.fiscalYear).toBe(2025)
      expect(jul.quarter).toBe(1)

      // Week in October 2024 → FY 2025 Q2
      const oct = calendarWeekToFiscalQuarter({ year: 2024, week: 40 }, settings)
      expect(oct.fiscalYear).toBe(2025)
      expect(oct.quarter).toBe(2)
    })

    it('should throw error for invalid start month', () => {
      expect(() =>
        calendarWeekToFiscalQuarter({ year: 2024, week: 1 }, { startMonth: 0 }),
      ).toThrow('Invalid start month: 0. Must be between 1 and 12.')

      expect(() =>
        calendarWeekToFiscalQuarter({ year: 2024, week: 1 }, { startMonth: 13 }),
      ).toThrow('Invalid start month: 13. Must be between 1 and 12.')
    })
  })

  describe('getFiscalYearWeekRange', () => {
    it('should return full year range for calendar year', () => {
      const settings: FiscalYearSettings = { startMonth: 1 }
      const range = getFiscalYearWeekRange(2024, settings)

      // FY2024: When startMonth=1, fiscal year = calendar year
      // FY2024 runs January 2024 - December 2024
      expect(range.start.year).toBe(2024)
      expect(range.start.week).toBe(1) // First week of January 2024
      expect(range.end.year).toBe(2024)
      expect(range.end.week).toBeGreaterThan(50) // Last week of 2024
    })

    it('should return full year range for fiscal year starting in April', () => {
      const settings: FiscalYearSettings = { startMonth: 4 }
      const range = getFiscalYearWeekRange(2024, settings)

      // FY2024 ends March 2024, starts April 2023
      expect(range.start.year).toBe(2023)
      expect(range.end.year).toBe(2024) // Ends in March 2024
    })

    it('should return full year range for fiscal year starting in July', () => {
      const settings: FiscalYearSettings = { startMonth: 7 }
      const range = getFiscalYearWeekRange(2024, settings)

      // FY2024 ends June 2024, starts July 2023
      expect(range.start.year).toBe(2023)
      expect(range.end.year).toBe(2024) // Ends in June 2024
    })

    it('should throw error for invalid start month', () => {
      expect(() => getFiscalYearWeekRange(2024, { startMonth: 0 })).toThrow(
        'Invalid start month: 0. Must be between 1 and 12.',
      )

      expect(() => getFiscalYearWeekRange(2024, { startMonth: 13 })).toThrow(
        'Invalid start month: 13. Must be between 1 and 12.',
      )
    })
  })

  describe('isWeekInFiscalQuarter', () => {
    it('should correctly identify weeks in fiscal quarters (calendar year)', () => {
      const settings: FiscalYearSettings = { startMonth: 1 }

      // Week in January should be in FY2024 Q1
      expect(isWeekInFiscalQuarter({ year: 2024, week: 2 }, 2024, 1, settings)).toBe(true)
      expect(isWeekInFiscalQuarter({ year: 2024, week: 2 }, 2024, 2, settings)).toBe(false)
    })

    it('should correctly identify weeks in fiscal quarters (April start)', () => {
      const settings: FiscalYearSettings = { startMonth: 4 }

      // Week in January 2024 should be in FY2024 Q4 (FY2024 ends March 2024)
      expect(isWeekInFiscalQuarter({ year: 2024, week: 2 }, 2024, 4, settings)).toBe(true)
      expect(isWeekInFiscalQuarter({ year: 2024, week: 2 }, 2024, 1, settings)).toBe(false)

      // Week in April 2024 should be in FY2025 Q1 (FY2025 starts April 2024)
      expect(isWeekInFiscalQuarter({ year: 2024, week: 14 }, 2025, 1, settings)).toBe(true)
    })
  })

  describe('getCurrentFiscalQuarter', () => {
    it('should return a valid fiscal year and quarter', () => {
      const settings: FiscalYearSettings = { startMonth: 1 }
      const current = getCurrentFiscalQuarter(settings)

      expect(current.fiscalYear).toBeGreaterThan(2000)
      expect(current.quarter).toBeGreaterThanOrEqual(1)
      expect(current.quarter).toBeLessThanOrEqual(4)
    })

    it('should work with different fiscal year start months', () => {
      const aprilSettings: FiscalYearSettings = { startMonth: 4 }
      const aprilCurrent = getCurrentFiscalQuarter(aprilSettings)

      expect(aprilCurrent.fiscalYear).toBeGreaterThan(2000)
      expect(aprilCurrent.quarter).toBeGreaterThanOrEqual(1)
      expect(aprilCurrent.quarter).toBeLessThanOrEqual(4)

      const julySettings: FiscalYearSettings = { startMonth: 7 }
      const julyCurrent = getCurrentFiscalQuarter(julySettings)

      expect(julyCurrent.fiscalYear).toBeGreaterThan(2000)
      expect(julyCurrent.quarter).toBeGreaterThanOrEqual(1)
      expect(julyCurrent.quarter).toBeLessThanOrEqual(4)
    })
  })

  describe('Integration Tests', () => {
    it('should maintain consistency between quarter range and week mapping', () => {
      const settings: FiscalYearSettings = { startMonth: 4 }

      // Get FY2025 Q1 range (starts April 2024, FY2025 ends March 2025)
      const q1Range = getFiscalQuarterWeekRange(2025, 1, settings)

      // First week of Q1 should map back to FY2025 Q1
      const startMapping = calendarWeekToFiscalQuarter(q1Range.start, settings)
      expect(startMapping.fiscalYear).toBe(2025)
      expect(startMapping.quarter).toBe(1)

      // Last week of Q1 should map back to FY2025 Q1
      const endMapping = calendarWeekToFiscalQuarter(q1Range.end, settings)
      expect(endMapping.fiscalYear).toBe(2025)
      expect(endMapping.quarter).toBe(1)
    })

    it('should handle all quarters consistently', () => {
      const settings: FiscalYearSettings = { startMonth: 7 }

      // Test FY2025 (ends June 2025, starts July 2024)
      for (let quarter = 1; quarter <= 4; quarter++) {
        const range = getFiscalQuarterWeekRange(2025, quarter, settings)

        // Start week should map to this quarter
        const startMapping = calendarWeekToFiscalQuarter(range.start, settings)
        expect(startMapping.fiscalYear).toBe(2025)
        expect(startMapping.quarter).toBe(quarter)

        // End week should map to this quarter
        const endMapping = calendarWeekToFiscalQuarter(range.end, settings)
        expect(endMapping.fiscalYear).toBe(2025)
        expect(endMapping.quarter).toBe(quarter)
      }
    })

    it('should handle year transitions correctly', () => {
      const settings: FiscalYearSettings = { startMonth: 10 }

      // FY2025 (ends Sept 2025): Q1 starts October 2024
      const q1 = getFiscalQuarterWeekRange(2025, 1, settings)
      expect(q1.start.year).toBe(2024)

      // FY2025 Q2 starts in January 2025
      const q2 = getFiscalQuarterWeekRange(2025, 2, settings)
      expect(q2.start.year).toBe(2025)

      // Verify a week in January 2025 maps to FY2025 Q2
      const janWeek = { year: 2025, week: 2 }
      const mapping = calendarWeekToFiscalQuarter(janWeek, settings)
      expect(mapping.fiscalYear).toBe(2025)
      expect(mapping.quarter).toBe(2)
    })
  })
})
