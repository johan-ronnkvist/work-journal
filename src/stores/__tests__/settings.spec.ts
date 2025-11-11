import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '../settings'
import { RepositoryFactory } from '@/repositories/RepositoryFactory'

// Mock RepositoryFactory to spy on its methods
vi.mock('@/repositories/RepositoryFactory', async () => {
  const actual = (await vi.importActual('@/repositories/RepositoryFactory')) as any
  return {
    ...actual,
    RepositoryFactory: {
      ...(actual.RepositoryFactory || {}),
      configure: vi.fn(),
      getInstance: vi.fn(() => ({
        get: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
        getRange: vi.fn(),
        getByYear: vi.fn(),
        getWeeksWithData: vi.fn(),
      })),
      reset: vi.fn(),
    },
  }
})

describe('Settings Store', () => {
  beforeEach(() => {
    // Create a fresh pinia instance for each test
    setActivePinia(createPinia())
    // Clear localStorage before each test
    localStorage.clear()
    // Clear mocks
    vi.clearAllMocks()
  })

  describe('Default Settings', () => {
    it('should initialize with default fiscal year start month (January)', () => {
      const store = useSettingsStore()
      expect(store.fiscalYearStartMonth).toBe(1)
      expect(store.fiscalYearSettings.startMonth).toBe(1)
    })

    it('should initialize with file storage disabled by default', () => {
      const store = useSettingsStore()
      expect(store.fileStorageEnabled).toBe(false)
    })

    it('should have correct default app settings', () => {
      const store = useSettingsStore()
      expect(store.appSettings).toEqual({
        fiscalYear: { startMonth: 1 },
        enableFileStorage: false,
      })
    })
  })

  describe('setFiscalYearStartMonth', () => {
    it('should update fiscal year start month', () => {
      const store = useSettingsStore()

      store.setFiscalYearStartMonth(4) // April
      expect(store.fiscalYearStartMonth).toBe(4)
      expect(store.fiscalYearSettings.startMonth).toBe(4)
    })

    it('should persist to localStorage', () => {
      const store = useSettingsStore()

      store.setFiscalYearStartMonth(7) // July

      // Create a new store instance to verify persistence
      const newStore = useSettingsStore()
      expect(newStore.fiscalYearStartMonth).toBe(7)
    })

    it('should accept all valid months (1-12)', () => {
      const store = useSettingsStore()

      for (let month = 1; month <= 12; month++) {
        store.setFiscalYearStartMonth(month)
        expect(store.fiscalYearStartMonth).toBe(month)
      }
    })

    it('should throw error for month < 1', () => {
      const store = useSettingsStore()

      expect(() => store.setFiscalYearStartMonth(0)).toThrow(
        'Invalid start month: 0. Must be between 1 and 12.',
      )
      expect(() => store.setFiscalYearStartMonth(-1)).toThrow(
        'Invalid start month: -1. Must be between 1 and 12.',
      )
    })

    it('should throw error for month > 12', () => {
      const store = useSettingsStore()

      expect(() => store.setFiscalYearStartMonth(13)).toThrow(
        'Invalid start month: 13. Must be between 1 and 12.',
      )
      expect(() => store.setFiscalYearStartMonth(100)).toThrow(
        'Invalid start month: 100. Must be between 1 and 12.',
      )
    })
  })

  describe('resetFiscalYearSettings', () => {
    it('should reset fiscal year start month to default (January)', () => {
      const store = useSettingsStore()

      // Change to April
      store.setFiscalYearStartMonth(4)
      expect(store.fiscalYearStartMonth).toBe(4)

      // Reset to default
      store.resetFiscalYearSettings()
      expect(store.fiscalYearStartMonth).toBe(1)
      expect(store.fiscalYearSettings.startMonth).toBe(1)
    })

    it('should persist reset to localStorage', () => {
      const store = useSettingsStore()

      // Change to July
      store.setFiscalYearStartMonth(7)

      // Reset
      store.resetFiscalYearSettings()

      // Create new store instance to verify persistence
      const newStore = useSettingsStore()
      expect(newStore.fiscalYearStartMonth).toBe(1)
    })
  })

  describe('fiscalYearSettings computed property', () => {
    it('should reactively update when start month changes', () => {
      const store = useSettingsStore()

      expect(store.fiscalYearSettings.startMonth).toBe(1)

      store.setFiscalYearStartMonth(10)
      expect(store.fiscalYearSettings.startMonth).toBe(10)

      store.setFiscalYearStartMonth(4)
      expect(store.fiscalYearSettings.startMonth).toBe(4)
    })
  })

  describe('setFileStorageEnabled', () => {
    it('should enable file storage', () => {
      const store = useSettingsStore()

      store.setFileStorageEnabled(true)
      expect(store.fileStorageEnabled).toBe(true)
      expect(store.appSettings.enableFileStorage).toBe(true)
    })

    it('should disable file storage', () => {
      const store = useSettingsStore()

      store.setFileStorageEnabled(true)
      store.setFileStorageEnabled(false)
      expect(store.fileStorageEnabled).toBe(false)
      expect(store.appSettings.enableFileStorage).toBe(false)
    })

    it('should persist file storage setting to localStorage', () => {
      const store = useSettingsStore()

      store.setFileStorageEnabled(true)

      // Create a new store instance to verify persistence
      const newStore = useSettingsStore()
      expect(newStore.fileStorageEnabled).toBe(true)
    })
  })

  describe('resetAllSettings', () => {
    it('should reset all settings to default', () => {
      const store = useSettingsStore()

      // Change both settings
      store.setFiscalYearStartMonth(7)
      store.setFileStorageEnabled(true)

      expect(store.fiscalYearStartMonth).toBe(7)
      expect(store.fileStorageEnabled).toBe(true)

      // Reset all
      store.resetAllSettings()

      expect(store.fiscalYearStartMonth).toBe(1)
      expect(store.fileStorageEnabled).toBe(false)
    })

    it('should persist reset to localStorage', () => {
      const store = useSettingsStore()

      // Change settings
      store.setFiscalYearStartMonth(4)
      store.setFileStorageEnabled(true)

      // Reset
      store.resetAllSettings()

      // Create new store instance to verify persistence
      const newStore = useSettingsStore()
      expect(newStore.fiscalYearStartMonth).toBe(1)
      expect(newStore.fileStorageEnabled).toBe(false)
    })
  })

  describe('localStorage persistence', () => {
    it('should load settings from localStorage on initialization', () => {
      // Manually set localStorage with new format
      localStorage.setItem(
        'work-notes-settings',
        JSON.stringify({
          fiscalYear: { startMonth: 6 },
          enableFileStorage: true,
        }),
      )

      // Create new store instance
      const store = useSettingsStore()

      expect(store.fiscalYearStartMonth).toBe(6)
      expect(store.fileStorageEnabled).toBe(true)
    })

    it('should handle old localStorage format', () => {
      // Set old format in localStorage (backward compatibility)
      localStorage.setItem('work-notes-settings', JSON.stringify({ startMonth: 6 }))

      // Should fall back to default for new settings
      const store = useSettingsStore()
      expect(store.fiscalYearStartMonth).toBe(1) // Falls back to default since old format
      expect(store.fileStorageEnabled).toBe(false)
    })

    it('should ignore invalid settings in localStorage', () => {
      // Set invalid month in localStorage
      localStorage.setItem(
        'work-notes-settings',
        JSON.stringify({
          fiscalYear: { startMonth: 15 },
          enableFileStorage: true,
        }),
      )

      // Should fall back to default for invalid fiscal year
      const store = useSettingsStore()
      expect(store.fiscalYearStartMonth).toBe(1)
      expect(store.fileStorageEnabled).toBe(true) // This is valid, so it's kept
    })

    it('should handle corrupted localStorage data', () => {
      // Set invalid JSON in localStorage
      localStorage.setItem('work-notes-settings', 'invalid json{')

      // Should fall back to default without crashing
      const store = useSettingsStore()
      expect(store.fiscalYearStartMonth).toBe(1)
      expect(store.fileStorageEnabled).toBe(false)
    })

    it('should handle missing properties', () => {
      // Set localStorage with wrong property
      localStorage.setItem('work-notes-settings', JSON.stringify({ wrongProperty: 5 }))

      // Should fall back to default
      const store = useSettingsStore()
      expect(store.fiscalYearStartMonth).toBe(1)
      expect(store.fileStorageEnabled).toBe(false)
    })

    it('should handle partial settings', () => {
      // Only set file storage, not fiscal year
      localStorage.setItem(
        'work-notes-settings',
        JSON.stringify({ enableFileStorage: true }),
      )

      const store = useSettingsStore()
      expect(store.fiscalYearStartMonth).toBe(1) // Default
      expect(store.fileStorageEnabled).toBe(true) // From localStorage
    })
  })

  describe('Common Fiscal Year Scenarios', () => {
    it('should support UK government fiscal year (April)', () => {
      const store = useSettingsStore()
      store.setFiscalYearStartMonth(4)
      expect(store.fiscalYearSettings.startMonth).toBe(4)
    })

    it('should support US federal fiscal year (October)', () => {
      const store = useSettingsStore()
      store.setFiscalYearStartMonth(10)
      expect(store.fiscalYearSettings.startMonth).toBe(10)
    })

    it('should support Australian fiscal year (July)', () => {
      const store = useSettingsStore()
      store.setFiscalYearStartMonth(7)
      expect(store.fiscalYearSettings.startMonth).toBe(7)
    })

    it('should support calendar year (January)', () => {
      const store = useSettingsStore()
      store.setFiscalYearStartMonth(1)
      expect(store.fiscalYearSettings.startMonth).toBe(1)
    })
  })

  describe('Repository Integration', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should configure repository on store initialization with file storage disabled', () => {
      // Create store (triggers initialization)
      useSettingsStore()

      // Repository should be configured with default settings
      expect(RepositoryFactory.configure).toHaveBeenCalledWith({
        enableFileSystem: false,
        directoryHandle: undefined,
        syncWritesImmediately: false,
        fallbackOnError: true,
      })
    })

    it('should reconfigure repository when file storage is enabled', async () => {
      const store = useSettingsStore()
      vi.clearAllMocks() // Clear the initialization call

      await store.setFileStorageEnabled(true)

      // Repository should be reconfigured with file storage enabled
      expect(RepositoryFactory.configure).toHaveBeenCalledWith({
        enableFileSystem: true,
        directoryHandle: undefined,
        syncWritesImmediately: false,
        fallbackOnError: true,
      })
    })

    it('should reconfigure repository when file storage is disabled', async () => {
      const store = useSettingsStore()
      await store.setFileStorageEnabled(true)
      vi.clearAllMocks()

      await store.setFileStorageEnabled(false)

      // Repository should be reconfigured with file storage disabled
      expect(RepositoryFactory.configure).toHaveBeenCalledWith({
        enableFileSystem: false,
        directoryHandle: undefined,
        syncWritesImmediately: false,
        fallbackOnError: true,
      })
    })

    it('should not reconfigure repository when fiscal year changes', () => {
      const store = useSettingsStore()
      vi.clearAllMocks() // Clear the initialization call

      store.setFiscalYearStartMonth(7)

      // Fiscal year changes should not trigger repository reconfiguration
      expect(RepositoryFactory.configure).not.toHaveBeenCalled()
    })

    it('should configure repository with directory handle when selected', async () => {
      // Note: This test would need DOM mocking for showDirectoryPicker
      // We're testing the logic, not the actual browser API
      const store = useSettingsStore()
      const mockHandle = {} as FileSystemDirectoryHandle

      // Manually set the directory handle (simulating what selectDirectory would do)
      store.directoryHandle = mockHandle
      vi.clearAllMocks()

      // Trigger reconfiguration
      await store.setFileStorageEnabled(true)

      // Repository should be configured with the directory handle
      expect(RepositoryFactory.configure).toHaveBeenCalledWith({
        enableFileSystem: true,
        directoryHandle: mockHandle,
        syncWritesImmediately: false,
        fallbackOnError: true,
      })
    })
  })
})
