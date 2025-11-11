import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import type { FiscalYearSettings } from '@/models/FiscalYear.utils'
import {
  loadDirectoryHandle,
  saveDirectoryHandle,
  clearDirectoryHandle,
  hasStoredDirectoryHandle,
} from '@/utils/directoryHandleStorage'
import { RepositoryFactory } from '@/repositories/RepositoryFactory'

const SETTINGS_STORAGE_KEY = 'work-notes-settings'

/**
 * Application settings interface
 */
export interface AppSettings {
  fiscalYear: FiscalYearSettings
  enableFileStorage: boolean
}

/**
 * Default application settings
 */
const DEFAULT_SETTINGS: AppSettings = {
  fiscalYear: { startMonth: 1 }, // January = calendar year
  enableFileStorage: false, // Disabled by default, requires user opt-in
}

/**
 * Application settings store
 * Persists settings to localStorage
 */
export const useSettingsStore = defineStore('settings', () => {
  // Load initial settings from localStorage
  const loadSettings = (): AppSettings => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)

        // Validate and merge with defaults
        const settings: AppSettings = {
          fiscalYear: {
            startMonth:
              typeof parsed.fiscalYear?.startMonth === 'number' &&
              parsed.fiscalYear.startMonth >= 1 &&
              parsed.fiscalYear.startMonth <= 12
                ? parsed.fiscalYear.startMonth
                : DEFAULT_SETTINGS.fiscalYear.startMonth,
          },
          enableFileStorage:
            typeof parsed.enableFileStorage === 'boolean'
              ? parsed.enableFileStorage
              : DEFAULT_SETTINGS.enableFileStorage,
        }

        return settings
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error)
    }
    // Return default settings
    return DEFAULT_SETTINGS
  }

  // Save settings to localStorage
  const saveSettings = (settings: AppSettings): void => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error)
    }
  }

  // Load initial settings
  const initialSettings = loadSettings()

  // Fiscal year start month (1 = January = calendar year)
  const fiscalYearStartMonth = ref<number>(initialSettings.fiscalYear.startMonth)

  // File storage enabled flag
  const fileStorageEnabled = ref<boolean>(initialSettings.enableFileStorage)

  // Directory handle for file storage (loaded asynchronously)
  const directoryHandle = ref<FileSystemDirectoryHandle | null>(null)
  const directoryHandleLoaded = ref<boolean>(false)

  // Computed fiscal year settings object
  const fiscalYearSettings = computed<FiscalYearSettings>(() => ({
    startMonth: fiscalYearStartMonth.value,
  }))

  // Computed full app settings object
  const appSettings = computed<AppSettings>(() => ({
    fiscalYear: fiscalYearSettings.value,
    enableFileStorage: fileStorageEnabled.value,
  }))

  /**
   * Configures the repository based on current settings
   * This is called whenever settings that affect the repository change
   */
  async function configureRepository(): Promise<void> {
    console.log('[SettingsStore] Configuring repository with current settings')

    RepositoryFactory.configure({
      enableFileSystem: fileStorageEnabled.value,
      directoryHandle: directoryHandle.value ?? undefined,
      syncWritesImmediately: false, // Background sync by default
      fallbackOnError: true, // Enable fallback to secondary layers
    })
  }

  /**
   * Sets the fiscal year start month
   * @param month - Month when fiscal year starts (1-12, where 1=January, 12=December)
   * @throws Error if month is out of valid range
   */
  function setFiscalYearStartMonth(month: number): void {
    if (month < 1 || month > 12) {
      throw new Error(`Invalid start month: ${month}. Must be between 1 and 12.`)
    }
    fiscalYearStartMonth.value = month
    saveSettings(appSettings.value)
  }

  /**
   * Enables or disables file storage
   * @param enabled - Whether file storage should be enabled
   */
  async function setFileStorageEnabled(enabled: boolean): Promise<void> {
    fileStorageEnabled.value = enabled
    saveSettings(appSettings.value)

    // If disabling, clear the stored directory handle
    if (!enabled) {
      directoryHandle.value = null
      await clearDirectoryHandle()
    }

    // Reconfigure repository based on new setting
    await configureRepository()
  }

  /**
   * Resets fiscal year settings to default (January = calendar year)
   */
  function resetFiscalYearSettings(): void {
    fiscalYearStartMonth.value = DEFAULT_SETTINGS.fiscalYear.startMonth
    saveSettings(appSettings.value)
  }

  /**
   * Resets all settings to default
   */
  async function resetAllSettings(): Promise<void> {
    fiscalYearStartMonth.value = DEFAULT_SETTINGS.fiscalYear.startMonth
    fileStorageEnabled.value = DEFAULT_SETTINGS.enableFileStorage
    saveSettings(DEFAULT_SETTINGS)

    // Clear directory handle
    directoryHandle.value = null
    await clearDirectoryHandle()
  }

  /**
   * Prompts the user to select a directory for file storage
   * @returns The selected directory handle or null if cancelled
   */
  async function selectDirectory(): Promise<FileSystemDirectoryHandle | null> {
    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      })

      // Save the handle to IndexedDB
      await saveDirectoryHandle(handle)
      directoryHandle.value = handle

      // Reconfigure repository with new directory handle
      await configureRepository()

      return handle
    } catch (error) {
      // User cancelled or error occurred
      console.error('Failed to select directory:', error)
      return null
    }
  }

  /**
   * Loads the persisted directory handle from IndexedDB
   */
  async function loadPersistedDirectoryHandle(): Promise<void> {
    if (!fileStorageEnabled.value) {
      directoryHandleLoaded.value = true
      return
    }

    const handle = await loadDirectoryHandle()
    directoryHandle.value = handle
    directoryHandleLoaded.value = true

    // If file storage is enabled but no handle is available, user needs to select one
    if (!handle && fileStorageEnabled.value) {
      console.warn(
        'File storage is enabled but no directory is selected. User needs to select a directory.',
      )
    }

    // Configure repository with loaded handle
    await configureRepository()
  }

  /**
   * Gets the current directory handle, loading it if necessary
   */
  async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
    if (!fileStorageEnabled.value) {
      return null
    }

    if (!directoryHandleLoaded.value) {
      await loadPersistedDirectoryHandle()
    }

    return directoryHandle.value
  }

  /**
   * Checks if a directory has been selected for file storage
   */
  async function hasDirectory(): Promise<boolean> {
    if (!fileStorageEnabled.value) {
      return false
    }

    if (!directoryHandleLoaded.value) {
      return await hasStoredDirectoryHandle()
    }

    return directoryHandle.value !== null
  }

  // Load the directory handle on store initialization if file storage is enabled
  if (fileStorageEnabled.value) {
    loadPersistedDirectoryHandle()
  } else {
    directoryHandleLoaded.value = true
    // Configure repository with default settings
    configureRepository()
  }

  // Watch for changes to directory handle and reconfigure repository
  watch([fileStorageEnabled, directoryHandle], () => {
    configureRepository()
  })

  return {
    // State
    fiscalYearStartMonth,
    fileStorageEnabled,
    directoryHandle,
    directoryHandleLoaded,

    // Computed
    fiscalYearSettings,
    appSettings,

    // Methods
    setFiscalYearStartMonth,
    setFileStorageEnabled,
    resetFiscalYearSettings,
    resetAllSettings,
    selectDirectory,
    getDirectoryHandle,
    hasDirectory,
  }
})
