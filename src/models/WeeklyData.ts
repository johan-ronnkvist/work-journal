/**
 * Represents a week identifier with separate year and week components.
 * This is the primary way to identify weeks in the application.
 */
export interface WeekIdentifier {
  /** ISO year (1000-9999) */
  readonly year: number
  /** ISO week number (1-53) */
  readonly week: number
}

/**
 * Core weekly data structure.
 * Components typically access this through the useWeeklyData composable.
 */
export interface WeeklyData {
  /** Week identifier (primary key) */
  readonly weekId: WeekIdentifier

  /** Week sentiment/status icon (emoji used as key) */
  statusIcon: string

  /** Achievements in markdown format */
  achievements: string

  /** Challenges in markdown format */
  challenges: string
}
