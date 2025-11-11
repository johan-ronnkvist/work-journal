import type { WeekIdentifier } from './WeeklyData'
import { getISOWeek, getISOYear, getWeeksInYear } from './WeekKey.utils'

/**
 * FISCAL YEAR UTILITIES
 *
 * This module handles conversions between fiscal years/quarters and calendar weeks.
 *
 * IMPORTANT - FISCAL YEAR NAMING CONVENTION:
 * ------------------------------------------
 * Fiscal years are named after the calendar year in which they END, not start.
 *
 * Example with startMonth = 7 (July):
 * - Fiscal Year 2026 runs from July 1, 2025 to June 30, 2026
 *   - FY 2026 Q1: July 2025 - September 2025
 *   - FY 2026 Q2: October 2025 - December 2025
 *   - FY 2026 Q3: January 2026 - March 2026
 *   - FY 2026 Q4: April 2026 - June 2026
 *
 * Example with startMonth = 4 (April):
 * - Fiscal Year 2026 runs from April 1, 2025 to March 31, 2026
 *   - FY 2026 Q1: April 2025 - June 2025
 *   - FY 2026 Q2: July 2025 - September 2025
 *   - FY 2026 Q3: October 2025 - December 2025
 *   - FY 2026 Q4: January 2026 - March 2026
 *
 * When startMonth = 1 (January), the fiscal year matches the calendar year.
 */

/**
 * Fiscal year settings interface
 */
export interface FiscalYearSettings {
  /**
   * Month when the fiscal year starts (1-12)
   * 1 = January (fiscal year = calendar year)
   * 4 = April (common for many businesses)
   * 7 = July (common for government fiscal years)
   * Range: 1 to 12
   */
  startMonth: number
}

/**
 * Gets the ISO week number for the first week of a given month and year
 *
 * @param year - Calendar year
 * @param month - Month (1-12)
 * @returns WeekIdentifier for the first week that contains days from this month
 */
function getFirstWeekOfMonth(year: number, month: number): WeekIdentifier {
  // Get the first day of the month
  const firstDay = new Date(year, month - 1, 1)
  const isoYear = getISOYear(firstDay)
  const isoWeek = getISOWeek(firstDay)
  return { year: isoYear, week: isoWeek }
}

/**
 * Converts a fiscal year and quarter to calendar week range
 *
 * Fiscal year is named after the calendar year in which it ENDS.
 *
 * Example: If startMonth is 7 (July):
 * - Fiscal year 2026 Q1 would start at the first week of July 2025
 * - Fiscal year 2026 Q2 would start at the first week of October 2025
 * - Fiscal year 2026 Q3 would start at the first week of January 2026
 * - Fiscal year 2026 Q4 would start at the first week of April 2026
 *
 * @param fiscalYear - The fiscal year (year in which it ends)
 * @param quarter - Quarter number (1-4)
 * @param settings - Fiscal year settings containing start month
 * @returns Object with start and end WeekIdentifier in calendar weeks
 * @throws Error if quarter or settings are invalid
 */
export function getFiscalQuarterWeekRange(
  fiscalYear: number,
  quarter: number,
  settings: FiscalYearSettings,
): { start: WeekIdentifier; end: WeekIdentifier } {
  if (quarter < 1 || quarter > 4) {
    throw new Error(`Invalid quarter: ${quarter}. Must be between 1 and 4.`)
  }

  if (settings.startMonth < 1 || settings.startMonth > 12) {
    throw new Error(`Invalid start month: ${settings.startMonth}. Must be between 1 and 12.`)
  }

  // Calculate the calendar month for the start of this quarter
  // Fiscal year is named after the year it ENDS
  // Special case: when startMonth=1, fiscal year matches calendar year
  // Otherwise: Q1 starts at startMonth in the previous calendar year
  const monthOffset = (quarter - 1) * 3
  let startMonth = settings.startMonth + monthOffset
  let startYear = settings.startMonth === 1 ? fiscalYear : fiscalYear - 1

  // Handle month overflow (e.g., if startMonth is 10 and we're in Q2, we get month 13 → 1 of next year)
  while (startMonth > 12) {
    startMonth -= 12
    startYear++
  }

  // Get the first week of the quarter start month
  const startWeek = getFirstWeekOfMonth(startYear, startMonth)

  // Calculate end month (3 months later, minus 1 day to stay in the quarter)
  let endMonth = startMonth + 3
  let endYear = startYear
  while (endMonth > 12) {
    endMonth -= 12
    endYear++
  }

  // End week is the week before the start of the next quarter
  // Get the first week of the next quarter, then go back one week
  const nextQuarterStart = getFirstWeekOfMonth(endYear, endMonth)

  // Go back one week to get the last week of this quarter
  let endWeek: WeekIdentifier
  if (nextQuarterStart.week === 1) {
    const weeksInPreviousYear = getWeeksInYear(nextQuarterStart.year - 1)
    endWeek = { year: nextQuarterStart.year - 1, week: weeksInPreviousYear }
  } else {
    endWeek = { year: nextQuarterStart.year, week: nextQuarterStart.week - 1 }
  }

  return {
    start: startWeek,
    end: endWeek,
  }
}

/**
 * Converts a calendar week to its fiscal year and quarter
 *
 * Fiscal year is named after the calendar year in which it ENDS.
 *
 * Example: If startMonth is 7 (July):
 * - A week in July 2025 → FY 2026 Q1 (FY ends June 2026)
 * - A week in January 2026 → FY 2026 Q3
 * - A week in July 2026 → FY 2027 Q1 (FY ends June 2027)
 *
 * @param calendarWeek - The calendar week identifier
 * @param settings - Fiscal year settings containing start month
 * @returns Object with fiscalYear (year in which it ends) and quarter (1-4)
 */
export function calendarWeekToFiscalQuarter(
  calendarWeek: WeekIdentifier,
  settings: FiscalYearSettings,
): { fiscalYear: number; quarter: number } {
  if (settings.startMonth < 1 || settings.startMonth > 12) {
    throw new Error(`Invalid start month: ${settings.startMonth}. Must be between 1 and 12.`)
  }

  // Get a date from this week (use Thursday, which is the defining day of ISO week)
  const year = calendarWeek.year
  const week = calendarWeek.week

  // Calculate the date of Thursday in this ISO week
  const jan4 = new Date(year, 0, 4)
  const jan4Day = jan4.getDay()
  const jan4WeekStart = new Date(jan4)
  jan4WeekStart.setDate(jan4.getDate() - ((jan4Day + 6) % 7))

  const weekStartDate = new Date(jan4WeekStart)
  weekStartDate.setDate(weekStartDate.getDate() + (week - 1) * 7)

  const thursdayDate = new Date(weekStartDate)
  thursdayDate.setDate(thursdayDate.getDate() + 3)

  const calendarMonth = thursdayDate.getMonth() + 1 // JavaScript months are 0-indexed
  const calendarYear = thursdayDate.getFullYear()

  // Determine which fiscal year this week belongs to
  // Fiscal year is named after the calendar year in which it ENDS
  // Special case: when startMonth=1, fiscal year matches calendar year
  let fiscalYear: number
  let monthsIntoFiscalYear: number

  if (settings.startMonth === 1) {
    // Special case: fiscal year = calendar year
    fiscalYear = calendarYear
    monthsIntoFiscalYear = calendarMonth - 1
  } else if (calendarMonth >= settings.startMonth) {
    // We're in or after the fiscal year start month of this calendar year
    // The fiscal year ends in the next calendar year
    fiscalYear = calendarYear + 1
    monthsIntoFiscalYear = calendarMonth - settings.startMonth
  } else {
    // We're before the fiscal year start month, so we're still in the fiscal year
    // that ends this calendar year
    fiscalYear = calendarYear
    monthsIntoFiscalYear = 12 - settings.startMonth + calendarMonth
  }

  // Determine the quarter (0-2 months = Q1, 3-5 = Q2, 6-8 = Q3, 9-11 = Q4)
  const quarter = Math.floor(monthsIntoFiscalYear / 3) + 1

  return {
    fiscalYear,
    quarter: Math.min(quarter, 4), // Ensure we don't exceed Q4
  }
}

/**
 * Gets the calendar week range for an entire fiscal year
 *
 * @param fiscalYear - The fiscal year
 * @param settings - Fiscal year settings containing start month
 * @returns Object with start and end WeekIdentifier in calendar weeks
 */
export function getFiscalYearWeekRange(
  fiscalYear: number,
  settings: FiscalYearSettings,
): { start: WeekIdentifier; end: WeekIdentifier } {
  if (settings.startMonth < 1 || settings.startMonth > 12) {
    throw new Error(`Invalid start month: ${settings.startMonth}. Must be between 1 and 12.`)
  }

  // Get the first week of Q1
  const q1Range = getFiscalQuarterWeekRange(fiscalYear, 1, settings)

  // Get the last week of Q4
  const q4Range = getFiscalQuarterWeekRange(fiscalYear, 4, settings)

  return {
    start: q1Range.start,
    end: q4Range.end,
  }
}

/**
 * Determines if a calendar week falls within a specific fiscal quarter
 *
 * @param calendarWeek - The calendar week to check
 * @param fiscalYear - The fiscal year
 * @param quarter - The quarter (1-4)
 * @param settings - Fiscal year settings containing start month
 * @returns true if the calendar week is in the specified fiscal quarter
 */
export function isWeekInFiscalQuarter(
  calendarWeek: WeekIdentifier,
  fiscalYear: number,
  quarter: number,
  settings: FiscalYearSettings,
): boolean {
  const fiscalInfo = calendarWeekToFiscalQuarter(calendarWeek, settings)
  return fiscalInfo.fiscalYear === fiscalYear && fiscalInfo.quarter === quarter
}

/**
 * Gets the current fiscal year and quarter based on today's date
 *
 * @param settings - Fiscal year settings containing start month
 * @returns Object with fiscalYear and quarter (1-4)
 */
export function getCurrentFiscalQuarter(settings: FiscalYearSettings): {
  fiscalYear: number
  quarter: number
} {
  const today = new Date()
  const currentWeek = {
    year: getISOYear(today),
    week: getISOWeek(today),
  }
  return calendarWeekToFiscalQuarter(currentWeek, settings)
}

/**
 * Formats a fiscal quarter as a month range string
 *
 * Returns the abbreviated month names for the start and end of the quarter.
 *
 * Example: If startMonth is 7 (July):
 * - Quarter 1 → "Jul-Sep"
 * - Quarter 2 → "Oct-Dec"
 * - Quarter 3 → "Jan-Mar"
 * - Quarter 4 → "Apr-Jun"
 *
 * @param quarter - The quarter number (1-4)
 * @param startMonth - The fiscal year start month (1-12)
 * @returns Month range string (e.g., "Jul-Sep")
 */
export function getQuarterMonthRange(quarter: number, startMonth: number): string {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Calculate the starting month for this quarter
  const quarterStartMonth = ((startMonth - 1 + (quarter - 1) * 3) % 12) + 1
  const quarterEndMonth = ((startMonth - 1 + quarter * 3 - 1) % 12) + 1

  return `${monthNames[quarterStartMonth - 1]}-${monthNames[quarterEndMonth - 1]}`
}

/**
 * Quarter range interface
 */
export interface QuarterRange {
  fiscalYear: number
  startQuarter: number
  endQuarter: number
}

/**
 * Converts a fiscal quarter range to calendar week range
 *
 * Gets the first week of the start quarter and the last week of the end quarter,
 * returning the combined range.
 *
 * @param quarterRange - The quarter range to convert
 * @param settings - Fiscal year settings containing start month
 * @returns Object with start and end WeekIdentifier
 */
export function getQuarterRangeWeeks(
  quarterRange: QuarterRange,
  settings: FiscalYearSettings,
): { start: WeekIdentifier; end: WeekIdentifier } {
  const { fiscalYear, startQuarter, endQuarter } = quarterRange

  // Get the start week of the first quarter in range
  const startRange = getFiscalQuarterWeekRange(fiscalYear, startQuarter, settings)

  // Get the end week of the last quarter in range
  const endRange = getFiscalQuarterWeekRange(fiscalYear, endQuarter, settings)

  return {
    start: startRange.start,
    end: endRange.end,
  }
}
