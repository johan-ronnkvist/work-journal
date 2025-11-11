export interface WeekStatus {
  icon: string
  title: string
  description: string
}

export const WEEK_STATUSES: WeekStatus[] = [
  { icon: '😀', title: 'Great', description: 'Had an awesome week!' },
  { icon: '🙂', title: 'Good', description: 'Had a pretty good week' },
  { icon: '😐', title: 'Okay', description: 'It was an okay week' },
  { icon: '🙁', title: 'Rough', description: 'This week was a bit rough' },
  { icon: '😖', title: 'Awful', description: 'This week was awful' },
  { icon: '🤒', title: 'Unwell', description: 'Wasn’t feeling great this week' },
  { icon: '😎', title: 'Vacation', description: 'Was on vacation this week!' },
  { icon: '🫥', title: 'Other', description: 'This week was a bit different' },
  { icon: '❔', title: 'Unknown', description: 'How was this week?' },
] as const

/**
 * Default status used when creating new weekly records
 * Uses 'Unknown' to indicate the user hasn't set a status yet
 */
export const DEFAULT_WEEK_STATUS: WeekStatus = WEEK_STATUSES[8]! // 'Unknown'
