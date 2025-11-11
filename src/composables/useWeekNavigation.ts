import { useRouter } from 'vue-router'
import type { WeekIdentifier } from '@/models/WeeklyData'

/**
 * Composable for week-based navigation
 *
 * This composable encapsulates the logic for navigating to specific weeks
 * in the application. It provides a consistent way to route to the NotesView
 * for any given week identifier.
 *
 * @returns {Object} Navigation utilities
 * @returns {Function} navigateToWeek - Navigate to a specific week's notes page
 */
export function useWeekNavigation() {
  const router = useRouter()

  /**
   * Navigate to the notes page for a specific week
   *
   * Constructs the URL path using the week's year and week number,
   * then uses Vue Router to navigate to that page.
   *
   * URL Format: /notes/:year/:week
   * Example: /notes/2025/01
   *
   * @param weekId - The week identifier containing year and week number
   */
  const navigateToWeek = (weekId: WeekIdentifier) => {
    // Pad week number with leading zero for consistent URLs (e.g., "01" instead of "1")
    const paddedWeek = weekId.week.toString().padStart(2, '0')

    // Use router.push to navigate (adds to browser history, allows back button)
    router.push(`/notes/${weekId.year}/${paddedWeek}`)
  }

  return {
    navigateToWeek,
  }
}
