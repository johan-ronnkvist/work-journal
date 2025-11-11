import type { WeekIdentifier } from './WeeklyData'

/**
 * Calculates ISO week number for a given date
 * ISO 8601: Week 1 is the first week with a Thursday
 * @param date - The date to calculate the week for
 * @returns Week number (1-53)
 */
export function getISOWeek(date: Date): number {
  const target = new Date(date.valueOf())
  const dayNumber = (date.getDay() + 6) % 7 // Monday = 0, Sunday = 6
  target.setDate(target.getDate() - dayNumber + 3) // Thursday of current week
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)

  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7))
  }

  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
}

/**
 * Gets the ISO year for a given date
 * Note: ISO year can differ from calendar year at year boundaries
 * @param date - The date to get the ISO year for
 * @returns ISO year
 */
export function getISOYear(date: Date): number {
  const target = new Date(date.valueOf())
  const dayNumber = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNumber + 3) // Thursday of current week

  return target.getFullYear()
}

/**
 * Gets the number of weeks in a given ISO year
 * A year has 53 weeks if:
 * - It starts on Thursday (Jan 1 is Thursday), OR
 * - It's a leap year and starts on Wednesday (Jan 1 is Wednesday)
 * @param year - Year to check
 * @returns Number of weeks (52 or 53)
 */
export function getWeeksInYear(year: number): number {
  const jan1 = new Date(year, 0, 1)
  const jan1Day = jan1.getDay() // 0 = Sunday, 1 = Monday, ..., 4 = Thursday

  // Check if it's a leap year
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

  // Year has 53 weeks if:
  // 1. It starts on Thursday (day 4), OR
  // 2. It's a leap year AND starts on Wednesday (day 3)
  if (jan1Day === 4 || (isLeapYear && jan1Day === 3)) {
    return 53
  }

  return 52
}

/**
 * Creates a validated WeekIdentifier from year and week components
 * @param year - 4-digit year (1000-9999)
 * @param week - Week number (1-53)
 * @returns WeekIdentifier object
 * @throws Error if year or week is invalid
 */
export function createWeekIdentifier(year: number, week: number): WeekIdentifier {
  if (week < 1 || week > 53) {
    throw new Error(`Invalid week number: ${week}. Must be between 1 and 53.`)
  }

  if (year < 1000 || year > 9999) {
    throw new Error(`Invalid year: ${year}. Must be a 4-digit year.`)
  }

  return { year, week }
}

/**
 * Gets the current week identifier based on the current date
 * @returns WeekIdentifier for the current week
 */
export function getCurrentWeekIdentifier(): WeekIdentifier {
  const now = new Date()
  const year = getISOYear(now)
  const week = getISOWeek(now)

  return { year, week }
}

/**
 * Checks if two week identifiers represent the same week
 * @param a - First week identifier
 * @param b - Second week identifier
 * @returns true if they represent the same week
 */
export function isSameWeek(a: WeekIdentifier, b: WeekIdentifier): boolean {
  return a.year === b.year && a.week === b.week
}

/**
 * Gets the next week identifier
 * @param weekId - Current week identifier
 * @returns Next week identifier
 */
export function getNextWeekIdentifier(weekId: WeekIdentifier): WeekIdentifier {
  const weeksInYear = getWeeksInYear(weekId.year)

  if (weekId.week >= weeksInYear) {
    return { year: weekId.year + 1, week: 1 }
  }

  return { year: weekId.year, week: weekId.week + 1 }
}

/**
 * Gets the previous week identifier
 * @param weekId - Current week identifier
 * @returns Previous week identifier
 */
export function getPreviousWeekIdentifier(weekId: WeekIdentifier): WeekIdentifier {
  if (weekId.week === 1) {
    const weeksInPreviousYear = getWeeksInYear(weekId.year - 1)
    return { year: weekId.year - 1, week: weeksInPreviousYear }
  }

  return { year: weekId.year, week: weekId.week - 1 }
}

/**
 * Gets the Monday (start) of a given ISO week
 * @param weekId - Week identifier
 * @returns Date object set to Monday of that week
 */
export function getWeekStartDate(weekId: WeekIdentifier): Date {
  // Start with January 4th of the ISO year (always in week 1)
  const jan4 = new Date(weekId.year, 0, 4)

  // Get the day of week for Jan 4 (0 = Sunday, 1 = Monday, etc.)
  const jan4Day = jan4.getDay()

  // Calculate Monday of week 1
  const week1Monday = new Date(jan4)
  week1Monday.setDate(jan4.getDate() - ((jan4Day + 6) % 7))

  // Add the number of weeks to get to the target week
  const targetMonday = new Date(week1Monday)
  targetMonday.setDate(week1Monday.getDate() + (weekId.week - 1) * 7)

  return targetMonday
}

/**
 * Gets the Sunday (end) of a given ISO week
 * @param weekId - Week identifier
 * @returns Date object set to Sunday of that week
 */
export function getWeekEndDate(weekId: WeekIdentifier): Date {
  const monday = getWeekStartDate(weekId)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return sunday
}

/**
 * Gets the date range for a single week
 * @param weekId - Week identifier
 * @returns Object with start (Monday) and end (Sunday) dates
 */
export function getWeekDateRange(weekId: WeekIdentifier): { start: Date; end: Date } {
  return {
    start: getWeekStartDate(weekId),
    end: getWeekEndDate(weekId),
  }
}

/**
 * Gets the date range for a week range (multiple weeks)
 * @param startWeek - Starting week identifier
 * @param endWeek - Ending week identifier
 * @returns Object with start date (Monday of first week) and end date (Sunday of last week)
 */
export function getWeekRangeDateRange(
  startWeek: WeekIdentifier,
  endWeek: WeekIdentifier,
): { start: Date; end: Date } {
  return {
    start: getWeekStartDate(startWeek),
    end: getWeekEndDate(endWeek),
  }
}

/**
 * Gets the week range (start and end) for a given CALENDAR quarter
 *
 * Calendar quarters map to fixed week ranges within a calendar year:
 * - Q1: Weeks 1-13 (Jan-Mar)
 * - Q2: Weeks 14-26 (Apr-Jun)
 * - Q3: Weeks 27-39 (Jul-Sep)
 * - Q4: Weeks 40-52/53 (Oct-Dec)
 *
 * Note: Q4 end week adjusts based on whether the year has 52 or 53 weeks.
 * This is different from fiscal quarters, which can start in any month.
 *
 * @param year - The calendar year
 * @param quarter - Quarter number (1-4)
 * @returns Object with start and end WeekIdentifier
 * @throws Error if quarter is invalid
 */
export function getCalendarQuarterWeekRange(
  year: number,
  quarter: number,
): { start: WeekIdentifier; end: WeekIdentifier } {
  if (quarter < 1 || quarter > 4) {
    throw new Error(`Invalid quarter: ${quarter}. Must be between 1 and 4.`)
  }

  const weeksInYear = getWeeksInYear(year)

  const quarterRanges = {
    1: { start: 1, end: 13 },
    2: { start: 14, end: 26 },
    3: { start: 27, end: 39 },
    4: { start: 40, end: weeksInYear }, // Use actual weeks in year (52 or 53)
  }

  const range = quarterRanges[quarter as keyof typeof quarterRanges]

  return {
    start: { year, week: range.start },
    end: { year, week: range.end },
  }
}
