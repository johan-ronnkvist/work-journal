import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { ref } from 'vue'
import { IndexedDBLayer } from '../layered/layers/IndexedDBLayer'
import { RepositoryFactory } from '../RepositoryFactory'
import type { WeeklyData, WeekIdentifier } from '@/models/WeeklyData'
import { WEEK_STATUSES } from '@/constants/WeekStatus'

/**
 * Integration tests that reproduce the exact NotesView workflow
 *
 * This test file specifically tests the scenario that causes the DataCloneError:
 * 1. Load data from IndexedDB
 * 2. Store it in a Vue ref
 * 3. Try to save it back
 */
describe('NotesView Workflow - Real Browser Integration', () => {
  let repository: IndexedDBLayer

  // Helper to create WeekIdentifier
  const weekId = (year: number, week: number): WeekIdentifier => ({ year, week })

  beforeEach(async () => {
    repository = new IndexedDBLayer()
    await repository.clear()
  })

  afterAll(async () => {
    await repository.close()
  })

  describe('Load-Modify-Save Workflow', () => {
    it('should reproduce the DataCloneError scenario', async () => {
      // Step 1: Create initial data (simulating first visit)
      const initialData = await repository.save({
        weekId: weekId(2024, 1),
        statusIcon: WEEK_STATUSES[2]!.icon, // "Okay"
        achievements: 'Initial achievement',
        challenges: 'Initial challenge',
      })

      // Step 2: Load data into a Vue ref (simulating onMounted)
      const weeklyData = ref<WeeklyData>(initialData)

      // Step 3: Modify the data (simulating user typing)
      weeklyData.value.achievements = 'Updated achievement'

      // Step 4: Try to save back (simulating auto-save)
      // This is the exact pattern that composables use
      const saved = await repository.save({
        weekId: weeklyData.value.weekId,
        statusIcon: weeklyData.value.statusIcon, // This might be a Vue proxy!
        achievements: weeklyData.value.achievements,
        challenges: weeklyData.value.challenges,
      })

      expect(saved).toBeDefined()
      expect(saved.achievements).toBe('Updated achievement')
    })

    it('should handle status from loaded data', async () => {
      // Create and load data
      await repository.save({
        weekId: weekId(2024, 2),
        statusIcon: '😀',
        achievements: 'Test',
      })

      const loaded = await repository.get(weekId(2024, 2))
      expect(loaded).toBeDefined()

      // Store in Vue ref
      const weeklyData = ref<WeeklyData>(loaded!)

      // Try to save with the loaded status
      const updated = await repository.save({
        weekId: weeklyData.value.weekId,
        statusIcon: weeklyData.value.statusIcon, // Loaded status icon
        achievements: 'Updated',
      })

      expect(updated.achievements).toBe('Updated')
    })

    it('should handle multiple load-save cycles', async () => {
      // First save
      await repository.save({
        weekId: weekId(2024, 3),
        statusIcon: WEEK_STATUSES[0]!.icon,
        achievements: 'V1',
      })

      // Load and modify multiple times
      for (let i = 2; i <= 5; i++) {
        const loaded = await repository.get(weekId(2024, 3))
        const weeklyData = ref<WeeklyData>(loaded!)

        weeklyData.value.achievements = `V${i}`

        await repository.save({
          weekId: weeklyData.value.weekId,
          statusIcon: weeklyData.value.statusIcon,
          achievements: weeklyData.value.achievements,
          challenges: weeklyData.value.challenges,
        })
      }

      const final = await repository.get(weekId(2024, 3))
      expect(final?.achievements).toBe('V5')
    })
  })

  describe('RepositoryFactory Integration', () => {
    it('should work with RepositoryFactory', async () => {
      // Use factory like NotesView does
      const repo = RepositoryFactory.create()

      // Save data
      await repo.save({
        weekId: weekId(2024, 10),
        statusIcon: WEEK_STATUSES[1]!.icon,
        achievements: 'Factory test',
      })

      // Load into ref
      const loaded = await repo.get(weekId(2024, 10))
      const weeklyData = ref<WeeklyData>(loaded!)

      // Modify and save back
      weeklyData.value.challenges = 'New challenge'

      const updated = await repo.save({
        weekId: weeklyData.value.weekId,
        statusIcon: weeklyData.value.statusIcon,
        achievements: weeklyData.value.achievements,
        challenges: weeklyData.value.challenges,
      })

      expect(updated.challenges).toBe('New challenge')
    })
  })

  describe('Status Change Workflow', () => {
    it('should handle status changes from WeekHeader', async () => {
      // Create initial data
      await repository.save({
        weekId: weekId(2024, 20),
        statusIcon: WEEK_STATUSES[2]!.icon, // "Okay"
        achievements: '',
        challenges: '',
      })

      // Load into ref (simulating component state)
      const loaded = await repository.get(weekId(2024, 20))
      const weeklyData = ref<WeeklyData>(loaded!)

      // User types
      weeklyData.value.achievements = 'Great progress today'

      // First save (update)
      await repository.save({
        weekId: weeklyData.value.weekId,
        statusIcon: weeklyData.value.statusIcon,
        achievements: weeklyData.value.achievements,
        challenges: weeklyData.value.challenges,
      })

      // User changes status (simulating WeekHeader @status-change)
      weeklyData.value.statusIcon = WEEK_STATUSES[0]!.icon // Change to "Great"

      // Auto-save after status change
      const updated = await repository.save({
        weekId: weeklyData.value.weekId,
        statusIcon: weeklyData.value.statusIcon,
        achievements: weeklyData.value.achievements,
        challenges: weeklyData.value.challenges,
      })

      expect(updated.statusIcon).toBe(WEEK_STATUSES[0]!.icon)
    })
  })

  describe('Edge Cases from Actual Usage', () => {
    it('should handle saving immediately after loading', async () => {
      // Create initial data
      await repository.save({
        weekId: weekId(2024, 30),
        statusIcon: WEEK_STATUSES[2]!.icon,
        achievements: 'Initial',
      })

      // Load and immediately save without modification
      const loaded = await repository.get(weekId(2024, 30))
      const weeklyData = ref<WeeklyData>(loaded!)

      const saved = await repository.save({
        weekId: weeklyData.value.weekId,
        statusIcon: weeklyData.value.statusIcon, // Unchanged loaded status
        achievements: weeklyData.value.achievements,
        challenges: weeklyData.value.challenges,
      })

      expect(saved).toBeDefined()
    })

    it('should handle partial updates with loaded status', async () => {
      // Initial save
      await repository.save({
        weekId: weekId(2024, 40),
        statusIcon: WEEK_STATUSES[1]!.icon,
        achievements: 'Achievement',
        challenges: 'Challenge',
      })

      // Load
      const loaded = await repository.get(weekId(2024, 40))
      const weeklyData = ref<WeeklyData>(loaded!)

      // Only update achievements (challenges unchanged)
      weeklyData.value.achievements = 'Updated achievement'

      // Save with partial update pattern
      const updated = await repository.save({
        weekId: weeklyData.value.weekId,
        statusIcon: weeklyData.value.statusIcon, // From loaded data
        achievements: weeklyData.value.achievements,
      })

      expect(updated.achievements).toBe('Updated achievement')
      expect(updated.challenges).toBe('Challenge') // Should preserve original
    })
  })
})
