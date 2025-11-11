import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useWeeklyData } from '../useWeeklyData'
import { RepositoryFactory } from '@/repositories/RepositoryFactory'
import type { WeekIdentifier, WeeklyData } from '@/models/WeeklyData'

// Mock the RepositoryFactory
vi.mock('@/repositories/RepositoryFactory')

describe('useWeeklyData', () => {
  const mockWeekId: WeekIdentifier = { year: 2024, week: 1 }
  const mockWeeklyData: WeeklyData = {
    weekId: mockWeekId,
    statusIcon: '🎉',
    achievements: 'Test achievement',
    challenges: 'Test challenge',
  }

  let mockRepository: {
    get: ReturnType<typeof vi.fn>
    save: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    // Setup Pinia
    setActivePinia(createPinia())

    // Create mock repository methods
    mockRepository = {
      get: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    }

    // Mock RepositoryFactory.getInstance to return our mock repository
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(RepositoryFactory.getInstance).mockReturnValue(mockRepository as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should load data immediately by default', async () => {
      mockRepository.get.mockResolvedValue(mockWeeklyData)

      const weekIdRef = ref(mockWeekId)
      const { data, isLoading } = useWeeklyData(weekIdRef)

      // Should start loading
      expect(isLoading.value).toBe(true)

      await nextTick()
      await vi.waitFor(() => expect(mockRepository.get).toHaveBeenCalledWith(mockWeekId))

      // Should finish loading
      expect(data.value).toEqual(mockWeeklyData)
      expect(isLoading.value).toBe(false)
    })


    it('should handle null data when no data exists', async () => {
      mockRepository.get.mockResolvedValue(null)

      const weekIdRef = ref(mockWeekId)
      const { data, isLoading } = useWeeklyData(weekIdRef)

      await vi.waitFor(() => expect(isLoading.value).toBe(false))

      expect(data.value).toBeNull()
    })

    it('should handle errors during initial load', async () => {
      const testError = new Error('Load failed')
      mockRepository.get.mockRejectedValue(testError)

      const weekIdRef = ref(mockWeekId)
      const { error, isLoading } = useWeeklyData(weekIdRef)

      await vi.waitFor(() => expect(isLoading.value).toBe(false))

      expect(error.value).toEqual(testError)
    })
  })

  describe('weekId reactivity', () => {
    it('should reload data when weekId ref changes', async () => {
      const weekIdRef = ref<WeekIdentifier>(mockWeekId)
      mockRepository.get.mockResolvedValue(mockWeeklyData)

      const { data } = useWeeklyData(weekIdRef)

      await vi.waitFor(() => expect(mockRepository.get).toHaveBeenCalledWith(mockWeekId))
      expect(data.value).toEqual(mockWeeklyData)

      // Change weekId
      const newWeekId: WeekIdentifier = { year: 2024, week: 2 }
      const newWeeklyData: WeeklyData = { ...mockWeeklyData, weekId: newWeekId }
      mockRepository.get.mockResolvedValue(newWeeklyData)

      weekIdRef.value = newWeekId
      await nextTick()

      await vi.waitFor(() => expect(mockRepository.get).toHaveBeenCalledWith(newWeekId))
      expect(data.value).toEqual(newWeeklyData)
    })


  })

  describe('refresh', () => {
    it('should reload data from repository', async () => {
      mockRepository.get.mockResolvedValue(mockWeeklyData)

      const weekIdRef = ref(mockWeekId)
      const { refresh, data } = useWeeklyData(weekIdRef)

      await vi.waitFor(() => expect(mockRepository.get).toHaveBeenCalledTimes(1))

      // Refresh again
      await refresh()

      expect(mockRepository.get).toHaveBeenCalledTimes(2)
      expect(data.value).toEqual(mockWeeklyData)
    })

    it('should update loading state during refresh', async () => {
      mockRepository.get.mockResolvedValue(mockWeeklyData)

      const weekIdRef = ref(mockWeekId)
      const { refresh, isLoading } = useWeeklyData(weekIdRef)

      // Wait for initial load to complete
      await vi.waitFor(() => expect(isLoading.value).toBe(false))

      // Mock a slow refresh
      mockRepository.get.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(mockWeeklyData), 100)))

      const refreshPromise = refresh()
      await nextTick()

      expect(isLoading.value).toBe(true)

      await refreshPromise

      expect(isLoading.value).toBe(false)
    })
  })

  describe('save', () => {
    it('should save updates to repository', async () => {
      mockRepository.get.mockResolvedValue(mockWeeklyData)
      mockRepository.save.mockResolvedValue(undefined)

      const weekIdRef = ref(mockWeekId)
      const { save } = useWeeklyData(weekIdRef)

      await vi.waitFor(() => expect(mockRepository.get).toHaveBeenCalledTimes(1))

      const updates = { achievements: 'Updated achievement' }
      await save(updates)

      expect(mockRepository.save).toHaveBeenCalledWith({
        weekId: mockWeekId,
        ...updates,
      })

      // Should reload after save
      expect(mockRepository.get).toHaveBeenCalledTimes(2)
    })

    it('should update saving state during save', async () => {
      mockRepository.get.mockResolvedValue(mockWeeklyData)
      mockRepository.save.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))

      const weekIdRef = ref(mockWeekId)
      const { save, isSaving } = useWeeklyData(weekIdRef)

      await vi.waitFor(() => expect(mockRepository.get).toHaveBeenCalled())

      expect(isSaving.value).toBe(false)

      const savePromise = save({ statusIcon: '🚀' })
      await nextTick()

      expect(isSaving.value).toBe(true)

      await savePromise

      expect(isSaving.value).toBe(false)
    })

    it('should handle save errors', async () => {
      mockRepository.get.mockResolvedValue(mockWeeklyData)
      const testError = new Error('Save failed')
      mockRepository.save.mockRejectedValue(testError)

      const weekIdRef = ref(mockWeekId)
      const { save, error } = useWeeklyData(weekIdRef)

      await vi.waitFor(() => expect(mockRepository.get).toHaveBeenCalled())

      await expect(save({ achievements: 'Test' })).rejects.toThrow('Save failed')
      expect(error.value).toEqual(testError)
    })

    it('should save only specified fields', async () => {
      mockRepository.get.mockResolvedValue(mockWeeklyData)
      mockRepository.save.mockResolvedValue(undefined)

      const weekIdRef = ref(mockWeekId)
      const { save } = useWeeklyData(weekIdRef)

      await vi.waitFor(() => expect(mockRepository.get).toHaveBeenCalled())

      await save({ statusIcon: '✨' })

      expect(mockRepository.save).toHaveBeenCalledWith({
        weekId: mockWeekId,
        statusIcon: '✨',
      })
    })
  })

  describe('remove', () => {
    it('should delete data from repository', async () => {
      mockRepository.get.mockResolvedValue(mockWeeklyData)
      mockRepository.delete.mockResolvedValue(undefined)

      const weekIdRef = ref(mockWeekId)
      const { remove, data } = useWeeklyData(weekIdRef)

      await vi.waitFor(() => expect(data.value).toEqual(mockWeeklyData))

      await remove()

      expect(mockRepository.delete).toHaveBeenCalledWith(mockWeekId)
      expect(data.value).toBeNull()
    })

    it('should update loading state during delete', async () => {
      mockRepository.get.mockResolvedValue(mockWeeklyData)
      mockRepository.delete.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      )

      const weekIdRef = ref(mockWeekId)
      const { remove, isLoading } = useWeeklyData(weekIdRef)

      await vi.waitFor(() => expect(mockRepository.get).toHaveBeenCalled())

      expect(isLoading.value).toBe(false)

      const removePromise = remove()
      await nextTick()

      expect(isLoading.value).toBe(true)

      await removePromise

      expect(isLoading.value).toBe(false)
    })

    it('should handle delete errors', async () => {
      mockRepository.get.mockResolvedValue(mockWeeklyData)
      const testError = new Error('Delete failed')
      mockRepository.delete.mockRejectedValue(testError)

      const weekIdRef = ref(mockWeekId)
      const { remove, error } = useWeeklyData(weekIdRef)

      await vi.waitFor(() => expect(mockRepository.get).toHaveBeenCalled())

      await expect(remove()).rejects.toThrow('Delete failed')
      expect(error.value).toEqual(testError)
    })
  })

  describe('error handling', () => {
    it('should clear previous errors on new operations', async () => {
      const testError = new Error('Initial error')
      mockRepository.get.mockRejectedValueOnce(testError).mockResolvedValueOnce(mockWeeklyData)

      const weekIdRef = ref(mockWeekId)
      const { refresh, error } = useWeeklyData(weekIdRef)

      await vi.waitFor(() => expect(error.value).toEqual(testError))

      // Refresh again - should clear error
      await refresh()

      expect(error.value).toBeNull()
    })
  })
})
