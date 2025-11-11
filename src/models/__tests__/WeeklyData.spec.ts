import { describe, it, expect } from 'vitest'
import type { WeeklyData } from '../WeeklyData'
import type { SaveWeeklyDataInput } from '@/repositories/RepositoryTypes'
import { WEEK_STATUSES } from '@/constants/WeekStatus'

describe('WeeklyData', () => {
  describe('Type Structure', () => {
    it('should accept valid WeeklyData object', () => {
      const weeklyData: WeeklyData = {
        weekId: { year: 2024, week: 1 },
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: '# Achievements\n- Did something great',
        challenges: '# Challenges\n- Faced some issues',
      }

      expect(weeklyData.weekId).toEqual({ year: 2024, week: 1 })
      expect(weeklyData.statusIcon).toBe(WEEK_STATUSES[0]!.icon)
      expect(weeklyData.achievements).toContain('Did something great')
      expect(weeklyData.challenges).toContain('Faced some issues')
    })

    it('should prevent modification of readonly weekId', () => {
      const weeklyData: WeeklyData = {
        weekId: { year: 2024, week: 1 },
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: '',
        challenges: '',
      }

      // TypeScript compile-time check: the following line should cause a type error
      // @ts-expect-error - weekId is readonly
      weeklyData.weekId = { year: 2024, week: 2 }

      // Note: readonly is only enforced by TypeScript at compile time,
      // not at runtime in JavaScript. The @ts-expect-error above confirms
      // that TypeScript correctly prevents the assignment.
      expect(weeklyData).toBeDefined()
    })
  })

  describe('SaveWeeklyDataInput', () => {
    it('should accept required fields only', () => {
      const input: SaveWeeklyDataInput = {
        weekId: { year: 2024, week: 1 },
      }

      expect(input.weekId).toEqual({ year: 2024, week: 1 })
      expect(input.statusIcon).toBeUndefined()
      expect(input.achievements).toBeUndefined()
      expect(input.challenges).toBeUndefined()
    })

    it('should accept all fields', () => {
      const input: SaveWeeklyDataInput = {
        weekId: { year: 2024, week: 1 },
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: 'Great work!',
        challenges: 'Some difficulties',
      }

      expect(input.statusIcon).toBe(WEEK_STATUSES[0]!.icon)
      expect(input.achievements).toBe('Great work!')
      expect(input.challenges).toBe('Some difficulties')
    })

    it('should accept empty strings for optional fields', () => {
      const input: SaveWeeklyDataInput = {
        weekId: { year: 2024, week: 1 },
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: '',
        challenges: '',
      }

      expect(input.statusIcon).toBe(WEEK_STATUSES[0]!.icon)
      expect(input.achievements).toBe('')
      expect(input.challenges).toBe('')
    })
  })

  describe('SaveWeeklyDataInput - Partial Updates', () => {
    it('should accept partial updates - statusIcon only', () => {
      const input: SaveWeeklyDataInput = {
        weekId: { year: 2024, week: 1 },
        statusIcon: WEEK_STATUSES[1]!.icon,
      }

      expect(input.weekId).toEqual({ year: 2024, week: 1 })
      expect(input.statusIcon).toBe(WEEK_STATUSES[1]!.icon)
      expect(input.achievements).toBeUndefined()
      expect(input.challenges).toBeUndefined()
    })

    it('should accept partial updates - achievements only', () => {
      const input: SaveWeeklyDataInput = {
        weekId: { year: 2024, week: 1 },
        achievements: 'Updated achievements',
      }

      expect(input.achievements).toBe('Updated achievements')
      expect(input.statusIcon).toBeUndefined()
    })

    it('should accept partial updates - challenges only', () => {
      const input: SaveWeeklyDataInput = {
        weekId: { year: 2024, week: 1 },
        challenges: 'Updated challenges',
      }

      expect(input.challenges).toBe('Updated challenges')
      expect(input.statusIcon).toBeUndefined()
    })

    it('should accept all optional fields', () => {
      const input: SaveWeeklyDataInput = {
        weekId: { year: 2024, week: 1 },
        statusIcon: WEEK_STATUSES[2]!.icon,
        achievements: 'Updated achievements',
        challenges: 'Updated challenges',
      }

      expect(input.statusIcon).toBe(WEEK_STATUSES[2]!.icon)
      expect(input.achievements).toBe('Updated achievements')
      expect(input.challenges).toBe('Updated challenges')
    })

    it('should accept only required weekId field', () => {
      const input: SaveWeeklyDataInput = {
        weekId: { year: 2024, week: 1 },
      }

      expect(input.weekId).toEqual({ year: 2024, week: 1 })
      expect(input.statusIcon).toBeUndefined()
      expect(input.achievements).toBeUndefined()
      expect(input.challenges).toBeUndefined()
    })
  })

  describe('Markdown Support', () => {
    it('should support markdown in achievements', () => {
      const markdown = `# Major Achievements

## Technical
- Implemented new feature **X**
- Fixed critical bug in \`module.ts\`

## Team
- Mentored 2 junior developers
- Led design review meeting`

      const weeklyData: WeeklyData = {
        weekId: { year: 2024, week: 1 },
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: markdown,
        challenges: '',
      }

      expect(weeklyData.achievements).toContain('# Major Achievements')
      expect(weeklyData.achievements).toContain('**X**')
      expect(weeklyData.achievements).toContain('`module.ts`')
    })

    it('should support markdown in challenges', () => {
      const markdown = `# Challenges Faced

1. **Technical debt** in legacy code
2. Time management with *multiple priorities*
3. [Documentation](https://example.com) was outdated`

      const weeklyData: WeeklyData = {
        weekId: { year: 2024, week: 1 },
        statusIcon: WEEK_STATUSES[3]!.icon,
        achievements: '',
        challenges: markdown,
      }

      expect(weeklyData.challenges).toContain('# Challenges Faced')
      expect(weeklyData.challenges).toContain('**Technical debt**')
      expect(weeklyData.challenges).toContain('[Documentation]')
    })
  })

  describe('WeekStatus Integration', () => {
    it('should accept all week status icon values', () => {
      WEEK_STATUSES.forEach((status, index) => {
        const weeklyData: WeeklyData = {
          weekId: { year: 2024, week: index + 1 },
          statusIcon: status.icon,
          achievements: '',
          challenges: '',
        }

        expect(weeklyData.statusIcon).toBe(status.icon)
        expect(weeklyData.statusIcon).toBeDefined()
      })
    })
  })

  describe('Real-world Scenarios', () => {
    it('should represent a complete productive week', () => {
      const productiveWeek: WeeklyData = {
        weekId: { year: 2024, week: 15 },
        statusIcon: WEEK_STATUSES[0]!.icon, // Great
        achievements: `- Launched new authentication system
- Reduced API response time by 40%
- Completed code review for 5 PRs
- Mentored junior developer on testing practices`,
        challenges: `- Initial deployment had minor issues
- Required overtime on Thursday to meet deadline`,
      }

      expect(productiveWeek.weekId).toEqual({ year: 2024, week: 15 })
      expect(productiveWeek.statusIcon).toBe(WEEK_STATUSES[0]!.icon)
      expect(productiveWeek.achievements).toContain('Launched new authentication')
      expect(productiveWeek.challenges).toContain('deployment had minor issues')
    })

    it('should represent a challenging week', () => {
      const challengingWeek: WeeklyData = {
        weekId: { year: 2024, week: 20 },
        statusIcon: WEEK_STATUSES[3]!.icon, // Rough
        achievements: `- Identified root cause of production bug
- Learned about new debugging techniques`,
        challenges: `- Production incident took 2 days to resolve
- Fell behind on sprint commitments
- Team member was out sick, increased workload`,
      }

      expect(challengingWeek.weekId).toEqual({ year: 2024, week: 20 })
      expect(challengingWeek.statusIcon).toBe(WEEK_STATUSES[3]!.icon)
      expect(challengingWeek.challenges).toContain('Production incident')
    })
  })
})
